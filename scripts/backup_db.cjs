/**
 * backup_db.cjs — Multi-Database Backup & Archive Tool for SwiftMart
 * 
 * Backs up all PostgreSQL tables to compressed JSON snapshots.
 * Automatically saves locally in `backups/` and outputs file paths ready for
 * Google Drive / GitHub Actions sync.
 *
 * Usage:
 *   node scripts/backup_db.cjs
 *   DB_INDEX=1 node scripts/backup_db.cjs  (Back up from DB 1, 2, 3, 4 or 5)
 */

const fs = require('fs');
const path = require('path');
const pg = require(path.join(__dirname, '../artifacts/api-server/node_modules/pg'));
const { Pool } = pg;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const DB_URLS = [
  process.env.DATABASE_URL || "postgresql://neondb_owner:npg_wyr4mq0sbZvV@ep-calm-glitter-aoeraspe-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  process.env.DATABASE2_URL || "postgresql://neondb_owner:npg_U38WKbfcFLwB@ep-lucky-shape-azpdcnzz-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  process.env.DATABASE3_URL || "postgresql://neondb_owner:npg_5xQCT9dNgqRS@ep-small-violet-azvsq53k-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  process.env.DATABASE4_URL || "postgresql://neondb_owner:npg_4enZGx0fHDIv@ep-dawn-unit-azzrimbp-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  process.env.DATABASE5_URL || "postgresql://neondb_owner:npg_tFHT9NoO5Cvy@ep-dark-tooth-az6x4682-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
];

const selectedIndex = parseInt(process.env.DB_INDEX || "1", 10) - 1;
const DB_URL = DB_URLS[selectedIndex] || DB_URLS[0];

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
  'orders',
  'custom_cakes',
  'support_tickets',
  'notifications'
];

async function backup() {
  console.log(`📦 Starting SwiftMart Database Backup from DB-${selectedIndex + 1}...`);
  const pool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  const backupData = {
    timestamp: new Date().toISOString(),
    databaseIndex: selectedIndex + 1,
    tables: {}
  };

  let totalRows = 0;
  for (const table of TABLES) {
    try {
      const res = await client.query(`SELECT * FROM "${table}"`);
      backupData.tables[table] = res.rows;
      totalRows += res.rows.length;
      console.log(`  ✓ ${table}: ${res.rows.length} rows backed up`);
    } catch (e) {
      console.log(`  ⚠️ ${table}: skipped (${e.message})`);
    }
  }

  const backupsDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filePath = path.join(backupsDir, `swiftmart_backup_db${selectedIndex + 1}_${dateStr}.json`);
  const latestPath = path.join(backupsDir, `swiftmart_backup_latest.json`);

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
  fs.writeFileSync(latestPath, JSON.stringify(backupData, null, 2));

  console.log(`\n🎉 Backup Completed! Total rows: ${totalRows}`);
  console.log(`  📂 Archive: ${filePath}`);
  console.log(`  📂 Latest:  ${latestPath}`);

  client.release();
  await pool.end();
}

backup().catch(console.error);
