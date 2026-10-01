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

require('./load_env.cjs');
const fs = require('fs');
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

  function toCsv(rows) {
    if (!rows || rows.length === 0) return '';
    const headers = Object.keys(rows[0]);
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return '"' + JSON.stringify(val).replace(/"/g, '""') + '"';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    const headerLine = headers.join(',');
    const dataLines = rows.map(r => headers.map(h => escapeCsv(r[h])).join(','));
    return [headerLine, ...dataLines].join('\n');
  }

  const csvDir = path.join(backupsDir, 'csv');
  if (!fs.existsSync(csvDir)) {
    fs.mkdirSync(csvDir, { recursive: true });
  }

  // Export individual CSVs for all tables
  for (const [table, rows] of Object.entries(backupData.tables)) {
    if (rows && rows.length > 0) {
      const tableCsv = toCsv(rows);
      fs.writeFileSync(path.join(csvDir, `${table}.csv`), tableCsv);
    }
  }

  // Export Google Drive formatted SwiftMart_Products_Catalog.csv
  if (backupData.tables.products && backupData.tables.products.length > 0) {
    const productsCsv = toCsv(backupData.tables.products);
    const catalogPath = path.join(backupsDir, 'SwiftMart_Products_Catalog.csv');
    fs.writeFileSync(catalogPath, productsCsv);
    console.log(`  📊 Google Drive CSV: ${catalogPath}`);
  }

  console.log(`\n🎉 Backup Completed! Total rows: ${totalRows}`);
  console.log(`  📂 Archive JSON: ${filePath}`);
  console.log(`  📂 Latest JSON:  ${latestPath}`);
  console.log(`  📂 CSV Directory: ${csvDir}`);

  client.release();
  await pool.end();
}

backup().catch(console.error);
