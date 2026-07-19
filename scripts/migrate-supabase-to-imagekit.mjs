/**
 * Migration script: Supabase Storage → ImageKit
 * 
 * Downloads every image/file that is stored in Supabase and re-uploads it to ImageKit,
 * then updates the database URLs in-place.
 *
 * Run from workspace root:
 *   node --experimental-vm-modules scripts/migrate-supabase-to-imagekit.mjs
 *
 * Set DRY_RUN=1 to preview without making any changes.
 */

import { createRequire } from "module";
import { readFileSync } from "fs";
import path from "path";

// Use api-server's node_modules for all deps
const require = createRequire(
  new URL("../artifacts/api-server/node_modules/", import.meta.url)
);

const { StorageClient } = await import(
  "../artifacts/api-server/node_modules/@supabase/storage-js/dist/module/index.js"
);
const ImageKit = (await import(
  "../node_modules/.pnpm/imagekit@6.0.0/node_modules/imagekit/dist/imagekit.js"
)).default;
const pg = (await import(
  "../artifacts/api-server/node_modules/pg/lib/index.js"
)).default ?? (await import("../artifacts/api-server/node_modules/pg/lib/index.js"));

const DRY_RUN = process.env.DRY_RUN === "1";

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET  = process.env.SUPABASE_STORAGE_BUCKET ?? "swiftmart";

const IK_PUBLIC_KEY    = process.env.IMAGEKIT_PUBLIC_KEY;
const IK_PRIVATE_KEY   = process.env.IMAGEKIT_PRIVATE_KEY;
const IK_URL_ENDPOINT  = process.env.IMAGEKIT_URL_ENDPOINT;

if (!SUPABASE_URL || !SUPABASE_KEY)    { console.error("❌ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set"); process.exit(1); }
if (!IK_PUBLIC_KEY || !IK_PRIVATE_KEY || !IK_URL_ENDPOINT) { console.error("❌ IMAGEKIT_* secrets not set"); process.exit(1); }

const storage = new StorageClient(`${SUPABASE_URL}/storage/v1`, {
  apikey:        SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
});

const ik = new ImageKit({ publicKey: IK_PUBLIC_KEY, privateKey: IK_PRIVATE_KEY, urlEndpoint: IK_URL_ENDPOINT });

const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

// ── Helpers ─────────────────────────────────────────────────────────────────
function isSupabaseUrl(url) {
  if (!url || typeof url !== "string") return false;
  try { return new URL(url).hostname.includes("supabase"); } catch { return false; }
}

async function downloadSupabase(publicUrl) {
  const res = await fetch(publicUrl);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${publicUrl}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadToIK(buffer, folder, originalName) {
  const ext  = path.extname(originalName || "file").toLowerCase() || ".bin";
  const name = `${crypto.randomUUID()}${ext}`;
  const result = await ik.upload({ file: buffer, fileName: name, folder, useUniqueFileName: false });
  return result.url;
}

// Polyfill crypto.randomUUID if needed
import crypto from "crypto";

let migrated = 0;
let skipped  = 0;
let errors   = 0;

async function migrateUrl(publicUrl, folder) {
  if (!isSupabaseUrl(publicUrl)) { skipped++; return publicUrl; }
  try {
    console.log(`  ↓ ${publicUrl.slice(0, 80)}...`);
    if (DRY_RUN) { migrated++; return `DRY_RUN_IMAGEKIT_URL`; }
    const buf  = await downloadSupabase(publicUrl);
    const ext  = path.extname(new URL(publicUrl).pathname) || ".jpg";
    const newUrl = await uploadToIK(buf, folder, `image${ext}`);
    console.log(`  ✅ → ${newUrl}`);
    migrated++;
    return newUrl;
  } catch (e) {
    console.error(`  ❌ ${e.message}`);
    errors++;
    return publicUrl; // keep original on error
  }
}

// ── Products ─────────────────────────────────────────────────────────────────
console.log("\n📦 Products");
const products = await db.query(
  "SELECT id, images FROM products WHERE images::text LIKE '%supabase%'"
);
console.log(`Found ${products.rows.length} products with Supabase images`);
for (const row of products.rows) {
  const imgs = Array.isArray(row.images) ? row.images : [];
  const newImgs = await Promise.all(imgs.map(u => migrateUrl(u, "swiftmart/products")));
  if (!DRY_RUN) {
    await db.query("UPDATE products SET images = $1 WHERE id = $2", [JSON.stringify(newImgs), row.id]);
  }
}

// ── Shops ────────────────────────────────────────────────────────────────────
console.log("\n🏪 Shops (logo)");
const shopLogos = await db.query(
  "SELECT id, image FROM shops WHERE image LIKE '%supabase%'"
);
console.log(`Found ${shopLogos.rows.length} shops with Supabase logo`);
for (const row of shopLogos.rows) {
  const newUrl = await migrateUrl(row.image, "swiftmart/shops");
  if (!DRY_RUN) {
    await db.query("UPDATE shops SET image = $1 WHERE id = $2", [newUrl, row.id]);
  }
}

console.log("\n🏪 Shops (banner)");
const shopBanners = await db.query(
  "SELECT id, banner FROM shops WHERE banner LIKE '%supabase%'"
);
console.log(`Found ${shopBanners.rows.length} shops with Supabase banner`);
for (const row of shopBanners.rows) {
  const newUrl = await migrateUrl(row.banner, "swiftmart/banners");
  if (!DRY_RUN) {
    await db.query("UPDATE shops SET banner = $1 WHERE id = $2", [newUrl, row.id]);
  }
}

// ── Hero banners ─────────────────────────────────────────────────────────────
console.log("\n🖼️  Hero banners");
const banners = await db.query(
  "SELECT id, image_url FROM hero_banners WHERE image_url LIKE '%supabase%'"
);
console.log(`Found ${banners.rows.length} hero banners with Supabase images`);
for (const row of banners.rows) {
  const newUrl = await migrateUrl(row.image_url, "swiftmart/banners");
  if (!DRY_RUN) {
    await db.query("UPDATE hero_banners SET image_url = $1 WHERE id = $2", [newUrl, row.id]);
  }
}

// ── Vendor compliance certificates ──────────────────────────────────────────
console.log("\n📄 Vendor certificates");
const certs = await db.query(
  "SELECT id, fssai_doc_url, drug_license_url, other_cert_url FROM shops WHERE fssai_doc_url LIKE '%supabase%' OR drug_license_url LIKE '%supabase%' OR other_cert_url LIKE '%supabase%'"
);
console.log(`Found ${certs.rows.length} shops with Supabase certificates`);
for (const row of certs.rows) {
  const [fssai, drug, other] = await Promise.all([
    migrateUrl(row.fssai_doc_url,    "swiftmart/certificates"),
    migrateUrl(row.drug_license_url, "swiftmart/certificates"),
    migrateUrl(row.other_cert_url,   "swiftmart/certificates"),
  ]);
  if (!DRY_RUN) {
    await db.query(
      "UPDATE shops SET fssai_doc_url=$1, drug_license_url=$2, other_cert_url=$3 WHERE id=$4",
      [fssai, drug, other, row.id]
    );
  }
}

await db.end();

console.log(`\n${"─".repeat(50)}`);
console.log(`✅ Migrated : ${migrated}`);
console.log(`⏭️  Skipped  : ${skipped} (not Supabase URLs)`);
console.log(`❌ Errors   : ${errors}`);
if (DRY_RUN) console.log("\n⚠️  DRY RUN — no changes were saved");
console.log("");
