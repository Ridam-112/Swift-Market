/**
 * migrate-supabase-to-imagekit.mjs
 *
 * One-time migration: downloads every Supabase-hosted image/file from the
 * database and re-uploads it to ImageKit, then updates each DB row in-place.
 *
 * Usage (from repo root):
 *   node artifacts/api-server/scripts/migrate-supabase-to-imagekit.mjs
 *
 * Safe to re-run — skips URLs that are already ImageKit URLs.
 * Set DRY_RUN=1 to preview without making any changes.
 *
 * Prerequisites:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT
 *   NEON_DATABASE_URL (or DATABASE_URL as fallback)
 */

import { StorageClient } from "@supabase/storage-js";
import { createRequire } from "module";
import path              from "path";
import crypto            from "crypto";
import https             from "https";
import http              from "http";

const require = createRequire(import.meta.url);
const ImageKit = require("imagekit");
const { Client: PgClient } = require("pg");

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET        = process.env.SUPABASE_STORAGE_BUCKET ?? "swiftmart";
const DATABASE_URL  = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
const IK_PUBLIC     = process.env.IMAGEKIT_PUBLIC_KEY;
const IK_PRIVATE    = process.env.IMAGEKIT_PRIVATE_KEY;
const IK_ENDPOINT   = process.env.IMAGEKIT_URL_ENDPOINT;
const DRY_RUN       = process.env.DRY_RUN === "1";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set"); process.exit(1);
}
if (!IK_PUBLIC || !IK_PRIVATE || !IK_ENDPOINT) {
  console.error("❌  IMAGEKIT_PUBLIC_KEY / IMAGEKIT_PRIVATE_KEY / IMAGEKIT_URL_ENDPOINT not set"); process.exit(1);
}
if (!DATABASE_URL) {
  console.error("❌  NEON_DATABASE_URL or DATABASE_URL not set"); process.exit(1);
}

if (DRY_RUN) console.log("⚠️  DRY RUN — no changes will be saved\n");

// ── Clients ───────────────────────────────────────────────────────────────────
const supabase = new StorageClient(`${SUPABASE_URL}/storage/v1`, {
  apikey:        SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
});

const ik = new ImageKit({ publicKey: IK_PUBLIC, privateKey: IK_PRIVATE, urlEndpoint: IK_ENDPOINT });

const pgClient = new PgClient({ connectionString: DATABASE_URL });
await pgClient.connect();

const q = (text, vals) => pgClient.query(text, vals).then(r => r.rows);

// ── Helpers ───────────────────────────────────────────────────────────────────
function isSupabaseUrl(url) {
  return typeof url === "string" && (url.includes("supabase.co") || url.includes("supabase.in"));
}

function isImageKitUrl(url) {
  return typeof url === "string" && (url.includes("imagekit.io") || (IK_ENDPOINT && url.startsWith(IK_ENDPOINT)));
}

function guessFolderFromUrl(url) {
  if (url.includes("/swiftmart/products/"))     return "swiftmart/products";
  if (url.includes("/swiftmart/banners/"))      return "swiftmart/banners";
  if (url.includes("/swiftmart/shops/"))        return "swiftmart/shops";
  if (url.includes("/swiftmart/certificates/")) return "swiftmart/certificates";
  return "swiftmart/misc";
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

async function uploadToImageKit(buffer, folder, originalUrl) {
  const ext      = path.extname(new URL(originalUrl).pathname).toLowerCase() || ".jpg";
  const fileName = `${crypto.randomUUID()}${ext}`;
  const result   = await ik.upload({ file: buffer, fileName, folder, useUniqueFileName: false });
  return result.url;
}

async function migrateOne(url) {
  if (!isSupabaseUrl(url)) return url;       // not Supabase — keep as-is
  if (isImageKitUrl(url))  return url;       // already ImageKit

  const folder = guessFolderFromUrl(url);
  const buffer = await downloadBuffer(url);
  return uploadToImageKit(buffer, folder, url);
}

// ── Migration runner ──────────────────────────────────────────────────────────
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

// ── 1. products.images ────────────────────────────────────────────────────────
async function migrateProductImages() {
  console.log("\n📦  products.images …");
  const rows = await q("SELECT id, images FROM products WHERE images::text LIKE '%supabase%'");
  console.log(`   Found ${rows.length} row(s)`);
  for (const row of rows) {
    const imgs = Array.isArray(row.images) ? row.images : [];
    await safe(`product ${row.id}`, async () => {
      const newImgs = await Promise.all(imgs.map(migrateOne));
      if (!DRY_RUN) {
        await q("UPDATE products SET images = $1::jsonb WHERE id = $2", [JSON.stringify(newImgs), row.id]);
      }
      const changed = imgs.filter(isSupabaseUrl).length;
      console.log(`  ✅  product ${row.id} — ${changed} image(s) migrated`);
      totalMigrated += changed;
    });
  }
}

// ── 2. shops.image (logo) ─────────────────────────────────────────────────────
async function migrateShopLogos() {
  console.log("\n🏪  shops.image (logo) …");
  const rows = await q("SELECT id, image FROM shops WHERE image LIKE '%supabase%'");
  console.log(`   Found ${rows.length} row(s)`);
  for (const row of rows) {
    await safe(`shop logo ${row.id}`, async () => {
      const newUrl = await migrateOne(row.image);
      if (!DRY_RUN) await q("UPDATE shops SET image = $1 WHERE id = $2", [newUrl, row.id]);
      console.log(`  ✅  shop ${row.id} logo migrated`);
      totalMigrated++;
    });
  }
}

// ── 3. shops.banner ───────────────────────────────────────────────────────────
async function migrateShopBanners() {
  console.log("\n🏪  shops.banner …");
  const rows = await q("SELECT id, banner FROM shops WHERE banner LIKE '%supabase%'");
  console.log(`   Found ${rows.length} row(s)`);
  for (const row of rows) {
    await safe(`shop banner ${row.id}`, async () => {
      const newUrl = await migrateOne(row.banner);
      if (!DRY_RUN) await q("UPDATE shops SET banner = $1 WHERE id = $2", [newUrl, row.id]);
      console.log(`  ✅  shop ${row.id} banner migrated`);
      totalMigrated++;
    });
  }
}

// ── 4. hero_banners.image_url ─────────────────────────────────────────────────
async function migrateHeroBanners() {
  console.log("\n🖼️   hero_banners.image_url …");
  const rows = await q("SELECT id, image_url FROM hero_banners WHERE image_url LIKE '%supabase%'");
  console.log(`   Found ${rows.length} row(s)`);
  for (const row of rows) {
    await safe(`hero_banner ${row.id}`, async () => {
      const newUrl = await migrateOne(row.image_url);
      if (!DRY_RUN) await q("UPDATE hero_banners SET image_url = $1 WHERE id = $2", [newUrl, row.id]);
      console.log(`  ✅  hero_banner ${row.id} migrated`);
      totalMigrated++;
    });
  }
}

// ── 5. shops.certificate_file ─────────────────────────────────────────────────
async function migrateCertificates() {
  console.log("\n📄  shops.certificate_file …");
  const rows = await q("SELECT id, certificate_file FROM shops WHERE certificate_file LIKE '%supabase%'");
  console.log(`   Found ${rows.length} row(s)`);
  for (const row of rows) {
    await safe(`shop cert ${row.id}`, async () => {
      const newUrl = await migrateOne(row.certificate_file);
      if (!DRY_RUN) await q("UPDATE shops SET certificate_file = $1 WHERE id = $2", [newUrl, row.id]);
      console.log(`  ✅  shop ${row.id} certificate migrated`);
      totalMigrated++;
    });
  }
}

// ── Run all ───────────────────────────────────────────────────────────────────
await migrateProductImages();
await migrateShopLogos();
await migrateShopBanners();
await migrateHeroBanners();
await migrateCertificates();

console.log(`\n${"─".repeat(52)}`);
console.log(`✅  Migrated : ${totalMigrated} file(s)`);
console.log(`❌  Failed   : ${totalFailed}`);
if (DRY_RUN) console.log(`\n⚠️  DRY RUN — no changes were saved to the database`);
console.log("");

await pgClient.end();
process.exit(hasErrors ? 1 : 0);
