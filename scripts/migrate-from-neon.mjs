/**
 * migrate-from-neon.mjs
 * Migrates data from old Neon DB → new Replit DB
 * Replaces Cloudinary URLs with empty arrays (images need re-upload)
 * Preserves ImageKit URLs as-is
 *
 * Usage: node scripts/migrate-from-neon.mjs <OLD_NEON_URL>
 */

import pg from "pg";
const { Pool } = pg;

const OLD_URL = process.argv[2];
const NEW_URL = process.env.DATABASE_URL;

if (!OLD_URL) {
  console.error("Usage: node scripts/migrate-from-neon.mjs <OLD_NEON_URL>");
  process.exit(1);
}
if (!NEW_URL) {
  console.error("DATABASE_URL env var not set");
  process.exit(1);
}

const oldDb = new Pool({ connectionString: OLD_URL, ssl: { rejectUnauthorized: false }, max: 3 });
const newDb = new Pool({ connectionString: NEW_URL, ssl: { rejectUnauthorized: false }, max: 3 });

function isCloudinaryUrl(url) {
  return typeof url === "string" && url.includes("cloudinary.com");
}

function cleanImages(imagesJson) {
  if (!imagesJson) return [];
  const arr = Array.isArray(imagesJson) ? imagesJson : JSON.parse(imagesJson);
  // Keep ImageKit URLs, clear Cloudinary URLs
  return arr.filter(u => !isCloudinaryUrl(u));
}

async function copyTable(tableName, transform) {
  const { rows } = await oldDb.query(`SELECT * FROM ${tableName}`);
  if (rows.length === 0) {
    console.log(`  [${tableName}] 0 rows — skipped`);
    return { total: 0, inserted: 0, skipped: 0 };
  }

  let inserted = 0, skipped = 0;
  for (const row of rows) {
    const r = transform ? transform(row) : row;
    if (!r) { skipped++; continue; }

    const keys = Object.keys(r);
    const cols = keys.map(k => `"${k}"`).join(", ");
    const vals = keys.map((_, i) => `$${i + 1}`).join(", ");
    const updateCols = keys
      .filter(k => k !== "id")
      .map(k => `"${k}" = EXCLUDED."${k}"`)
      .join(", ");

    try {
      await newDb.query(
        `INSERT INTO ${tableName} (${cols}) VALUES (${vals})
         ON CONFLICT (id) DO UPDATE SET ${updateCols}`,
        keys.map(k => {
          const v = r[k];
          if (v !== null && typeof v === "object" && !Array.isArray(v)) return JSON.stringify(v);
          if (Array.isArray(v)) return JSON.stringify(v);
          return v;
        })
      );
      inserted++;
    } catch (err) {
      console.warn(`  [${tableName}] row ${r.id} error: ${err.message}`);
      skipped++;
    }
  }
  console.log(`  [${tableName}] ${rows.length} rows → ${inserted} inserted/updated, ${skipped} skipped`);
  return { total: rows.length, inserted, skipped };
}

async function main() {
  console.log("SwiftMart Neon → Replit migration\n");

  // Disable FK checks during import
  await newDb.query("SET session_replication_role = replica");

  // ── Core config tables (no dependencies) ──────────────────────
  console.log("Phase 1: Config tables");
  await copyTable("shop_types");
  await copyTable("categories");
  await copyTable("delivery_settings");
  await copyTable("delivery_charge_rules");
  await copyTable("service_pincodes");
  await copyTable("commission_rules");
  await copyTable("coupons");
  await copyTable("homepage_sections");
  await copyTable("admin_broadcasts");

  // ── Admins ────────────────────────────────────────────────────
  console.log("\nPhase 2: Admins");
  await copyTable("admins");

  // ── Users ────────────────────────────────────────────────────
  console.log("\nPhase 3: Users");
  await copyTable("users");

  // ── Shops (clean Cloudinary image/banner/certificate) ─────────
  console.log("\nPhase 4: Shops");
  let shopCloudinaryCount = 0;
  await copyTable("shops", (row) => {
    let changed = false;
    const r = { ...row };
    if (isCloudinaryUrl(r.image)) { r.image = null; changed = true; }
    if (isCloudinaryUrl(r.banner)) { r.banner = null; changed = true; }
    if (isCloudinaryUrl(r.certificate_file)) { r.certificate_file = null; changed = true; }
    if (changed) shopCloudinaryCount++;
    return r;
  });
  console.log(`  → ${shopCloudinaryCount} shops had Cloudinary images cleared`);

  // ── Hero banners ──────────────────────────────────────────────
  console.log("\nPhase 5: Hero banners");
  let bannerCloudinary = 0;
  await copyTable("hero_banners", (row) => {
    const r = { ...row };
    if (isCloudinaryUrl(r.image_url)) { r.image_url = ""; bannerCloudinary++; }
    return r;
  });
  if (bannerCloudinary) console.log(`  → ${bannerCloudinary} banners had Cloudinary URLs cleared`);

  // ── Buckets ───────────────────────────────────────────────────
  console.log("\nPhase 6: Buckets");
  await copyTable("buckets", (row) => {
    const r = { ...row };
    if (isCloudinaryUrl(r.image_url)) r.image_url = null;
    return r;
  });

  // ── Delivery partners ─────────────────────────────────────────
  console.log("\nPhase 7: Delivery partners");
  await copyTable("delivery_partners");

  // ── Products (clean Cloudinary, keep ImageKit) ────────────────
  console.log("\nPhase 8: Products");
  let prodTotal = 0, prodCloudinaryCleared = 0, prodImageKit = 0, prodEmpty = 0;
  await copyTable("products", (row) => {
    const r = { ...row };
    const original = Array.isArray(r.images) ? r.images : [];
    const cleaned = cleanImages(r.images);
    const hadCloudinary = original.some(u => isCloudinaryUrl(u));
    const hadImageKit = original.some(u => u && u.includes("imagekit"));

    r.images = cleaned;
    if (r.color_images) {
      try {
        const ci = typeof r.color_images === "object" ? r.color_images : JSON.parse(r.color_images);
        for (const color of Object.keys(ci)) {
          if (Array.isArray(ci[color])) {
            ci[color] = ci[color].filter(u => !isCloudinaryUrl(u));
          }
        }
        r.color_images = ci;
      } catch {}
    }

    if (hadCloudinary) prodCloudinaryCleared++;
    if (hadImageKit) prodImageKit++;
    if (cleaned.length === 0) prodEmpty++;
    prodTotal++;
    return r;
  });
  console.log(`  → ${prodCloudinaryCleared} products had Cloudinary URLs cleared`);
  console.log(`  → ${prodImageKit} products already had ImageKit URLs (kept)`);
  console.log(`  → ${prodEmpty} products now have no images (need re-upload)`);

  // ── Orders ────────────────────────────────────────────────────
  console.log("\nPhase 9: Orders");
  await copyTable("orders");

  // ── Payouts / reports ─────────────────────────────────────────
  console.log("\nPhase 10: Payouts & reports");
  await copyTable("payouts");
  await copyTable("reports");

  // ── Support tickets ───────────────────────────────────────────
  console.log("\nPhase 11: Support tickets");
  await copyTable("support_tickets");

  // Re-enable FK checks
  await newDb.query("SET session_replication_role = DEFAULT");

  // ── Final count ───────────────────────────────────────────────
  console.log("\n─────────────────────────────────────");
  console.log("Migration complete. Final counts in new DB:");
  const tables = ["categories","shop_types","shops","products","users","admins","orders","hero_banners","delivery_partners","coupons","service_pincodes"];
  for (const t of tables) {
    const { rows } = await newDb.query(`SELECT COUNT(*) FROM ${t}`);
    console.log(`  ${t}: ${rows[0].count}`);
  }

  await oldDb.end();
  await newDb.end();
  console.log("\nDone ✅");
}

main().catch(err => { console.error("Fatal:", err.message); process.exit(1); });
