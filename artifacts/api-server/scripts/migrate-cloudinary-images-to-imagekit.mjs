/**
 * Copy every Cloudinary image resource to ImageKit.
 *
 * This is intentionally account-wide: it migrates images even when they are
 * no longer referenced by a database row. Cloudinary is never deleted from.
 *
 * Usage:
 *   node artifacts/api-server/scripts/migrate-cloudinary-images-to-imagekit.mjs
 *   DRY_RUN=1 node artifacts/api-server/scripts/migrate-cloudinary-images-to-imagekit.mjs
 *
 * The migration is idempotent. Cloudinary's public ID and format determine the
 * ImageKit folder and filename, so re-running overwrites the same destination.
 */

import path from "node:path";
import { v2 as cloudinary } from "cloudinary";
import ImageKit from "imagekit";

const dryRun = process.env.DRY_RUN === "1";
const concurrency = Math.max(1, Math.min(8, Number(process.env.MIGRATION_CONCURRENCY ?? 4)));
const maxRetries = Math.max(1, Math.min(5, Number(process.env.MIGRATION_RETRIES ?? 3)));
const batchOffset = Math.max(0, Number(process.env.MIGRATION_OFFSET ?? 0));
const batchLimit = Math.max(0, Number(process.env.MIGRATION_LIMIT ?? 0));

const required = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "IMAGEKIT_PUBLIC_KEY",
  "IMAGEKIT_PRIVATE_KEY",
  "IMAGEKIT_URL_ENDPOINT",
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required secrets: ${missing.join(", ")}`);
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const imageKit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry(label, operation) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await sleep(500 * 2 ** (attempt - 1));
      }
    }
  }
  throw new Error(`${label}: ${lastError?.message ?? String(lastError)}`);
}

async function listCloudinaryImages() {
  const resources = [];
  let nextCursor;

  do {
    const page = await withRetry("Cloudinary inventory", () =>
      cloudinary.api.resources({
        resource_type: "image",
        type: "upload",
        max_results: 500,
        ...(nextCursor ? { next_cursor: nextCursor } : {}),
      }),
    );
    resources.push(...(page.resources ?? []));
    nextCursor = page.next_cursor;
  } while (nextCursor);

  return resources;
}

function imageKitDestination(resource) {
  const publicId = String(resource.public_id);
  const folder = path.posix.dirname(publicId) === "." ? "/" : path.posix.dirname(publicId);
  const baseName = path.posix.basename(publicId);
  const existingExtension = path.posix.extname(baseName);
  const extension = existingExtension || (resource.format ? `.${resource.format}` : ".bin");
  const fileName = existingExtension ? baseName : `${baseName}${extension}`;
  const filePath = `${folder === "/" ? "" : `${folder}/`}${fileName}`;
  return { folder, fileName, filePath };
}

async function uploadImage(resource) {
  const { folder, fileName, filePath } = imageKitDestination(resource);
  const isPdf = String(resource.format).toLowerCase() === "pdf";
  const sourceFile = isPdf
    ? await withRetry(`Download ${resource.public_id}`, async () => {
        const privateUrl = cloudinary.utils.private_download_url(
          resource.public_id,
          "pdf",
          { resource_type: "image", type: "upload", attachment: false },
        );
        const response = await fetch(privateUrl);
        if (!response.ok) {
          throw new Error(`Cloudinary private download returned HTTP ${response.status}`);
        }
        return Buffer.from(await response.arrayBuffer());
      })
    : resource.secure_url;
  const result = await withRetry(`Upload ${resource.public_id}`, () =>
    imageKit.upload({
      // ImageKit downloads the source directly. This avoids holding large
      // account-wide migrations in the agent process. PDFs use a signed
      // Cloudinary download because their public delivery URL is restricted.
      file: sourceFile,
      fileName,
      folder,
      useUniqueFileName: false,
      overwriteFile: true,
      ...(Array.isArray(resource.tags) && resource.tags.length > 0
        ? { tags: resource.tags }
        : {}),
    }),
  );

  if (!result?.url || !result?.fileId) {
    throw new Error("ImageKit returned no URL or file ID");
  }

  return { filePath, url: result.url, fileId: result.fileId };
}

async function listExistingImageKitPaths() {
  const existing = new Set();
  let skip = 0;

  while (true) {
    const page = await withRetry("ImageKit inventory", () =>
      imageKit.listFiles({
        fileType: "all",
        limit: 1000,
        skip,
      }),
    );
    const files = (page ?? []).filter((entry) => entry.type === "file");
    for (const file of files) {
      existing.add(String(file.filePath).replace(/^\/+/, ""));
    }
    if (page.length < 1000) break;
    skip += page.length;
  }

  return existing;
}

async function runPool(resources, existingPaths) {
  let nextIndex = 0;
  let completed = 0;
  let skipped = 0;
  const failures = [];

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= resources.length) return;

      const resource = resources[index];
      try {
        const destinationPath = imageKitDestination(resource).filePath;
        if (existingPaths.has(destinationPath)) {
          skipped += 1;
          console.log(`[skip ${skipped}] ${resource.public_id} already exists at ${destinationPath}`);
          continue;
        }

        const destination = dryRun
          ? { filePath: destinationPath }
          : await uploadImage(resource);
        completed += 1;
        console.log(
          `[${completed}/${resources.length}] OK ${resource.public_id} -> ${destination.filePath}`,
        );
      } catch (error) {
        failures.push({
          publicId: resource.public_id,
          error: error?.message ?? String(error),
        });
        console.error(`FAIL ${resource.public_id}: ${error?.message ?? String(error)}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, resources.length) }, worker));
  return { failures, skipped };
}

console.log(`Cloudinary → ImageKit image migration${dryRun ? " (DRY RUN)" : ""}`);
console.log(`Concurrency: ${concurrency}; retries per operation: ${maxRetries}`);
if (batchLimit > 0) console.log(`Batch: offset ${batchOffset}, limit ${batchLimit}`);

const allResources = await listCloudinaryImages();
const resources = batchLimit > 0
  ? allResources.slice(batchOffset, batchOffset + batchLimit)
  : allResources;
console.log(`Found ${allResources.length} Cloudinary image resources; processing ${resources.length}.`);

const existingPaths = dryRun ? new Set() : await listExistingImageKitPaths();
console.log(`Found ${existingPaths.size} existing ImageKit files.`);

const { failures, skipped } = await runPool(resources, existingPaths);
console.log(`Completed: ${resources.length - failures.length - skipped}/${resources.length}; skipped: ${skipped}`);

if (failures.length > 0) {
  console.error(`Failed: ${failures.length}`);
  for (const failure of failures) {
    console.error(` - ${failure.publicId}: ${failure.error}`);
  }
  process.exit(1);
}

console.log(
  dryRun
    ? "Dry run complete. No files were uploaded and no source files were changed."
    : "Migration complete. Cloudinary source files were preserved.",
);