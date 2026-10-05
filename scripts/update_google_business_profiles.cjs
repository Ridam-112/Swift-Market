/**
 * update_google_business_profiles.cjs
 * 
 * Sets Google Business Profile URLs for all verified shops in Balurghat across all 5 databases.
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

const SHOP_UPDATES = [
  {
    id: "f253ea1f-ef1c-4e91-aa11-b8e649e32c8f",
    name: "Ghosh Enterprice",
    url: "https://share.google/EJkonqvohIz6wZvil",
  },
  {
    id: "ebc0194e-454d-4062-9eb8-895204d9d144",
    name: "SHAWARMA PALACE ",
    url: "https://share.google/h0pF3oW0QPDckFClw",
  },
  {
    id: "3effec69-bde3-4fac-8cad-c11ef5bd3576",
    name: "Sudeshna's Cake House",
    url: "https://share.google/o88wucL1Ph8tMqJVM",
  },
  {
    id: "11ce6b12-479f-4882-ab42-44357f38228d",
    name: "UPHAR ELECTRONICS LAB",
    url: "https://share.google/52X755dYHyvukMXcb",
  },
  {
    id: "1a828c48-5fb9-47f3-b87e-c3588d888fed",
    name: "SwiftMart Shop",
    url: "https://share.google/7uxIQizF0XLUe9TgX",
  },
  {
    id: "f43edc9d-aec1-497c-9aa8-0b1d87312621",
    name: "Maa Laxmi Online Centre",
    url: "https://share.google/aYTLKn6tudhljhc9s",
  },
  {
    id: "97f91296-d060-425a-a990-68f2ca3421a6",
    name: "Online Center & Khatapatra",
    url: "https://share.google/5IQYP6cceuvNg7GlG",
  },
  {
    id: "82561910-deac-4432-8b31-7974d8f26ae2",
    name: "Rock N Rolls",
    url: "https://share.google/DKtbmndZm6OouLKZ0",
  },
  {
    id: "49e80c07-0594-45bd-ac3b-dc1680de3f59",
    name: "Maa Anandamayee Dresses",
    url: "https://share.google/B95d6YKnjlDSNSYbk",
  },
  {
    id: "dfd4bed1-fad6-4be3-a85b-0c8259be69c9",
    name: "Shikha bichatra",
    url: "https://share.google/cJ4FmeU726oiX9I5N",
  },
  {
    id: "597432ef-f11e-4034-bcfa-2a0c2c06d326",
    name: "Sandy's Fast Food",
    url: "https://share.google/E8Yucxt2kVgYaVegT",
  },
];

async function run() {
  console.log(`🔗 Updating Google Business Profile URLs across ${DB_URLS.length} databases...\n`);

  for (let i = 0; i < DB_URLS.length; i++) {
    const pool = new Pool({ connectionString: DB_URLS[i], ssl: { rejectUnauthorized: false } });
    try {
      // 1. Ensure columns exist
      await pool.query(`
        ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_business_url text;
        ALTER TABLE shops ADD COLUMN IF NOT EXISTS google_place_id text;
      `);

      // 2. Update shops
      for (const item of SHOP_UPDATES) {
        const res = await pool.query(`
          UPDATE shops 
          SET google_business_url = $1, updated_at = NOW() 
          WHERE id = $2 OR shop_name ILIKE $3
        `, [item.url, item.id, item.name]);
        console.log(`[DB ${i + 1}] Updated "${item.name}": ${res.rowCount} row(s) updated`);
      }
      console.log(`✅ DB ${i + 1} Google Business Profiles updated successfully!\n`);
    } catch (err) {
      console.error(`❌ DB ${i + 1} Error:`, err.message);
    } finally {
      await pool.end();
    }
  }

  console.log("🎉 All databases updated with Google Business Profile URLs!");
}

run();
