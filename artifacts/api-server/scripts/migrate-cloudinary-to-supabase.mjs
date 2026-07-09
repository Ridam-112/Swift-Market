/**
 * migrate-cloudinary-to-supabase.mjs
 *
 * One-time migration script: copies every Cloudinary image/file stored in the
 * database over to Supabase Storage and updates each DB row to point at the
 * new Supabase URL.
 *
 * Usage:
 *   node artifacts/api-server/scripts/migrate-cloudinary-to-supabase.mjs
 *
 * Safe to re-run — skips URLs that are already Supabase URLs.
 * Exits with code 1 if any individual file fails (but continues the rest).
 *
 * Prerequisites:
 *   • SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET must be set.
 *   • NEON_DATABASE_URL must be set (same as used by the API server).
 *   • Run from the repo root: node artifacts/api-server/scripts/migrate-cloudinary-to-supabase.mjs
 */

import { StorageClient } from "@supabase/storage-js";
import { neon } from "@neondatabase/serverless";
import path from "path";
import crypto from "crypto";
import https from "https";
import http from "http";

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL    = process.env.SUPABASE_URL;
const SUPABASE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET          = process.env.SUPABASE_STORAGE_BUCKET ?? "swiftmart";
const DATABASE_URL    = process.env.NEON_DATABASE_URL;

if (!SUPABASE_URL || !SUPABASE_KEY || !DATABASE_URL) {
  console.error("❌  Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEON_DATABASE_URL");
  process.exit(1);
}

const storageUrl = `${SUPABASE_URL}/storage/v1`;
const supabase = new StorageClient(storageUrl, {
  apikey:        SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
});
const sql = neon(DATABASE_URL);

// ── Helpers ───────────────────────────────────────────────────────────────────
function isCloudinaryUrl(url) {
  return typeof url === "string" && url.includes("cloudinary.com");
}

function isSupabaseUrl(url) {
  return typeof url === "string" && (url.includes("supabase.co") || url.includes("supabase.in"));
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on("data", chunk => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

function guessContentType(url) {
  const ext = path.extname(new URL(url).pathname).toLowerCase();
  const map = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".png": "image/png", ".webp": "image/webp",
    ".gif": "image/gif", ".pdf": "application/pdf",
  };
  return map[ext] ?? "application/octet-stream";
}

function guessFolderFromUrl(cloudinaryUrl) {
  // Cloudinary URLs contain the folder: .../upload/v123/swiftmart/products/xyz.jpg
  if (cloudinaryUrl.includes("/swiftmart/products/"))   return "swiftmart/products";
  if (cloudinaryUrl.includes("/swiftmart/banners/"))    return "swiftmart/banners";
  if (cloudinaryUrl.includes("/swiftmart/shops/"))      return "swiftmart/shops";
  if (cloudinaryUrl.includes("/swiftmart/certificates/")) return "swiftmart/certificates";
  return "swiftmart/misc";
}

async function migrateOne(cloudinaryUrl) {
  if (!isCloudinaryUrl(cloudinaryUrl)) return cloudinaryUrl; // not Cloudinary, keep as-is
  if (isSupabaseUrl(cloudinaryUrl))    return cloudinaryUrl; // already migrated

  const folder      = guessFolderFromUrl(cloudinaryUrl);
  const ext         = path.extname(new URL(cloudinaryUrl).pathname).toLowerCase() || ".jpg";
  const storagePath = `${folder}/${crypto.randomUUID()}${ext}`;
  const contentType = guessContentType(cloudinaryUrl);

  const buffer = await downloadBuffer(cloudinaryUrl);

  const { error } = await supabase.from(BUCKET).upload(storagePath, buffer, { contentType, upsert: false });
  if (error) throw new Error(`Supabase upload failed: ${error?.message ?? String(error)}`);

  const { data } = supabase.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

// ── Migration tasks ───────────────────────────────────────────────────────────
let totalMigrated = 0;
let totalFailed   = 0;
let hasErrors     = false;

async function safe(label, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`  ❌  ${label}: ${err.message}`);
    hasErrors = true;
    totalFailed++;
  }
}

// 1. products.images  (JSONB array of URLs)
async function migrateProductImages() {
  console.log("\n📦  products.images …");
  const rows = await sql`SELECT id, images FROM products WHERE images IS NOT NULL AND images != '[]'::jsonb`;
  for (const row of rows) {
    const imgs = Array.isArray(row.images) ? row.images : [];
    const cloudinaryOnes = imgs.filter(isCloudinaryUrl);
    if (cloudinaryOnes.length === 0) continue;

    await safe(`product ${row.id}`, async () => {
      const newImgs = await Promise.all(imgs.map(migrateOne));
      await sql`UPDATE products SET images = ${JSON.stringify(newImgs)}::jsonb WHERE id = ${row.id}`;
      console.log(`  ✅  product ${row.id} — ${cloudinaryOnes.length} image(s) migrated`);
      totalMigrated += cloudinaryOnes.length;
    });
  }
}

// 2. products.colorImages  (JSONB object: { color: [urls] })
async function migrateProductColorImages() {
  console.log("\n🎨  products.colorImages …");
  const rows = await sql`SELECT id, "colorImages" FROM products WHERE "colorImages" IS NOT NULL`;
  for (const row of rows) {
    const colorImages = row.colorImages ?? {};
    const hasCloudinary = Object.values(colorImages).some(arr =>
      Array.isArray(arr) && arr.some(isCloudinaryUrl)
    );
    if (!hasCloudinary) continue;

    await safe(`product colorImages ${row.id}`, async () => {
      const newColorImages = {};
      for (const [color, urls] of Object.entries(colorImages)) {
        newColorImages[color] = Array.isArray(urls) ? await Promise.all(urls.map(migrateOne)) : urls;
      }
      await sql`UPDATE products SET "colorImages" = ${JSON.stringify(newColorImages)}::jsonb WHERE id = ${row.id}`;
      console.log(`  ✅  product colorImages ${row.id} migrated`);
      totalMigrated++;
    });
  }
}

// 3. shops.image, shops.banner, shops.certificateFile
async function migrateShopImages() {
  console.log("\n🏪  shops (image, banner, certificateFile) …");
  const rows = await sql`SELECT id, image, banner, "certificateFile" FROM shops`;
  for (const row of rows) {
    const fields = [
      { col: "image",           val: row.image },
      { col: "banner",          val: row.banner },
      { col: "certificateFile", val: row.certificateFile },
    ].filter(f => isCloudinaryUrl(f.val));

    if (fields.length === 0) continue;

    await safe(`shop ${row.id}`, async () => {
      for (const { col, val } of fields) {
        const newUrl = await migrateOne(val);
        // Use parameterized query via tagged template — col is a known safe value from our fixed list
        if (col === "image")           await sql`UPDATE shops SET image            = ${newUrl} WHERE id = ${row.id}`;
        if (col === "banner")          await sql`UPDATE shops SET banner           = ${newUrl} WHERE id = ${row.id}`;
        if (col === "certificateFile") await sql`UPDATE shops SET "certificateFile" = ${newUrl} WHERE id = ${row.id}`;
        console.log(`  ✅  shop ${row.id} ${col} migrated`);
        totalMigrated++;
      }
    });
  }
}

// 4. users.profilePhoto
async function migrateUserPhotos() {
  console.log("\n👤  users.profilePhoto …");
  const rows = await sql`SELECT id, "profilePhoto" FROM users WHERE "profilePhoto" IS NOT NULL AND "profilePhoto" LIKE '%cloudinary.com%'`;
  for (const row of rows) {
    await safe(`user ${row.id}`, async () => {
      const newUrl = await migrateOne(row.profilePhoto);
      await sql`UPDATE users SET "profilePhoto" = ${newUrl} WHERE id = ${row.id}`;
      console.log(`  ✅  user ${row.id} profilePhoto migrated`);
      totalMigrated++;
    });
  }
}

// 5. hero_banners.imageUrl
async function migrateBannerImages() {
  console.log("\n🖼️   hero_banners.imageUrl …");
  const rows = await sql`SELECT id, "imageUrl" FROM hero_banners WHERE "imageUrl" LIKE '%cloudinary.com%'`;
  for (const row of rows) {
    await safe(`banner ${row.id}`, async () => {
      const newUrl = await migrateOne(row.imageUrl);
      await sql`UPDATE hero_banners SET "imageUrl" = ${newUrl} WHERE id = ${row.id}`;
      console.log(`  ✅  banner ${row.id} migrated`);
      totalMigrated++;
    });
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("🚀  Starting Cloudinary → Supabase Storage migration");
console.log(`    Bucket: ${BUCKET}  |  Supabase: ${SUPABASE_URL}`);

await migrateProductImages();
await migrateProductColorImages();
await migrateShopImages();
await migrateUserPhotos();
await migrateBannerImages();

console.log(`\n${"─".repeat(60)}`);
console.log(`✅  Migrated: ${totalMigrated}  |  ❌  Failed: ${totalFailed}`);

if (hasErrors) {
  console.log("\n⚠️  Some files failed. Re-run the script to retry only the failed ones (Cloudinary URLs are still in the DB for those rows).");
  process.exit(1);
} else {
  console.log("\n🎉  All done! Every Cloudinary URL has been replaced with a Supabase URL.");
}
