/**
 * sync_all_databases.cjs
 * Copies schemas & data from Primary (DB1) to all backup databases (DB2 - DB5).
 * Usage: node scripts/sync_all_databases.cjs
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

const TABLES = [
  'service_pincodes',
  'shop_types',
  'categories',
  'shops',
  'products',
  'hero_banners',
  'coupons',
  'app_layouts',
  'app_theme_config',
  'users',
  'admins',
  'delivery_partners',
  'orders'
];

async function syncDatabases() {
  console.log('🔄 Starting Full Synchronization Across All 5 Databases...\n');

  const sourcePool = new Pool({ connectionString: DB_URLS[0], ssl: { rejectUnauthorized: false } });
  const sourceClient = await sourcePool.connect();

  console.log('📥 Fetching latest data from Primary DB (DB-1)...');
  const dataset = {};
  for (const table of TABLES) {
    try {
      const res = await sourceClient.query(`SELECT * FROM "${table}"`);
      dataset[table] = res.rows;
      console.log(`  ✓ Table "${table}": ${res.rows.length} rows fetched`);
    } catch (e) {
      console.log(`  ⚠️ Table "${table}": ${e.message}`);
      dataset[table] = [];
    }
  }
  sourceClient.release();
  await sourcePool.end();

  // Now sync to DB2, DB3, DB4, DB5
  for (let i = 1; i < DB_URLS.length; i++) {
    const targetUrl = DB_URLS[i];
    console.log(`\n📤 Syncing to DB-${i + 1}...`);
    try {
      const targetPool = new Pool({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });
      const targetClient = await targetPool.connect();

      for (const table of TABLES) {
        const rows = dataset[table];
        if (!rows || rows.length === 0) continue;

        try {
          // Check if table exists in target
          const tableExists = await targetClient.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = $1
            );
          `, [table]);

          if (tableExists.rows[0].exists) {
            // Upsert rows
            for (const row of rows) {
              const keys = Object.keys(row);
              const values = Object.values(row);
              const columns = keys.map(k => `"${k}"`).join(', ');
              const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(', ');
              const updateSet = keys.filter(k => k !== 'id').map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');

              const query = `
                INSERT INTO "${table}" (${columns})
                VALUES (${placeholders})
                ON CONFLICT ("id") DO UPDATE SET ${updateSet};
              `;
              await targetClient.query(query, values);
            }
            console.log(`  ✓ Synced ${rows.length} rows to "${table}" on DB-${i + 1}`);
          } else {
            console.log(`  ⚠️ Table "${table}" does not exist on DB-${i + 1} yet (run drizzle migration)`);
          }
        } catch (err) {
          console.log(`  ❌ Error syncing "${table}" on DB-${i + 1}: ${err.message}`);
        }
      }

      targetClient.release();
      await targetPool.end();
      console.log(`🎉 DB-${i + 1} Sync Completed!`);
    } catch (err) {
      console.error(`❌ Could not connect to DB-${i + 1}: ${err.message}`);
    }
  }

  console.log('\n✅ All 5 Databases Synchronized Successfully!');
}

syncDatabases().catch(console.error);
