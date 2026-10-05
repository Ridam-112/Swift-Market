/**
 * migrate_shops_seo.cjs
 *
 * Adds slug, claim_status, eta columns to shops table across all 5 Neon DBs,
 * populates unique slugs, dynamic ETAs, and verification fields for all merchants.
 */

require('./load_env.cjs');
const path = require('path');
const pg = require(path.join(__dirname, '../artifacts/api-server/node_modules/pg'));
const { Pool } = pg;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DB_URLS = [
  process.env.DATABASE_URL || process.env.DATABASE1_URL,
  process.env.DATABASE2_URL,
  process.env.DATABASE3_URL,
  process.env.DATABASE4_URL,
  process.env.DATABASE5_URL,
].filter(Boolean);

function toShopSlug(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/gu, "");
}

function getDefaultEta(shop) {
  const cat = (shop.category || "").toLowerCase();
  const type = (shop.shop_type || "").toLowerCase();
  const name = (shop.shop_name || "").toLowerCase();

  if (cat.includes("electronic") || type.includes("electronic") || cat.includes("service") || name.includes("electronics lab")) {
    return "On-site visit & inspection";
  }
  if (cat.includes("cake") || cat.includes("bakery") || name.includes("cake")) {
    return "Same-day delivery & pre-order";
  }
  if (cat.includes("fast-food") || cat.includes("restaurant") || name.includes("shawarma") || name.includes("roll")) {
    return "20-30 min";
  }
  if (cat.includes("clothing") || cat.includes("fashion") || cat.includes("dress")) {
    return "Same-day express delivery";
  }
  if (cat.includes("book") || name.includes("centre") || name.includes("khatapatra")) {
    return "Express local delivery";
  }
  return "15-25 min";
}

async function migrateDb(url, index) {
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    console.log(`\n--- DB #${index + 1} Migrating ---`);
    await pool.query(`
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS slug text;
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS claim_status text DEFAULT 'claimed';
      ALTER TABLE shops ADD COLUMN IF NOT EXISTS eta text;
      CREATE INDEX IF NOT EXISTS shops_slug_idx ON shops(slug);
    `);

    const res = await pool.query(`SELECT id, shop_name, category, shop_type, slug, eta, claim_status, verification_status FROM shops;`);
    console.log(`Found ${res.rows.length} shops in DB #${index + 1}`);

    const usedSlugs = new Set();
    for (const shop of res.rows) {
      let slug = shop.slug || toShopSlug(shop.shop_name);
      if (!slug) slug = `shop-${shop.id.slice(0, 8)}`;

      let baseSlug = slug;
      let counter = 1;
      while (usedSlugs.has(slug)) {
        counter++;
        slug = `${baseSlug}-${counter}`;
      }
      usedSlugs.add(slug);

      const eta = shop.eta || getDefaultEta(shop);
      const claimStatus = shop.claim_status || "claimed";
      const verificationStatus = shop.verification_status || "verified";

      await pool.query(
        `UPDATE shops SET slug = $1, eta = $2, claim_status = $3, verification_status = $4 WHERE id = $5`,
        [slug, eta, claimStatus, verificationStatus, shop.id]
      );
      console.log(`Updated shop: ${shop.shop_name} -> slug: ${slug}, eta: ${eta}`);
    }
  } catch (err) {
    console.error(`DB #${index + 1} Error:`, err.message);
  } finally {
    await pool.end();
  }
}

async function run() {
  for (let i = 0; i < DB_URLS.length; i++) {
    await migrateDb(DB_URLS[i], i);
  }
  console.log("\nAll DB migrations complete!");
}

run().catch(console.error);
