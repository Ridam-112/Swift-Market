const fs = require('fs');
const path = require('path');
const pg = require(path.join(__dirname, '../artifacts/api-server/node_modules/pg'));
const { Pool } = pg;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const DB_URL = process.env.DATABASE_URL || Buffer.from("cG9zdGdyZXM6Ly9hdm5hZG1pbjpBVk5TX3RHRUtrZ0JxZG94djRJWElibkhAcGctMTcyNmExYy10aHJpZDU1NjQtZTFmZS5lLmFpdmVuY2xvdWQuY29tOjEyNDIwL2RlZmF1bHRkYj9zc2xtb2RlPXJlcXVpcmU=", "base64").toString("utf8");

async function backup() {
  console.log('📦 Starting SwiftMart Database Backup...');
  const pool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();
  const backupData = {
    timestamp: new Date().toISOString(),
    tables: {}
  };

  const tables = [
    'users',
    'admins',
    'service_pincodes',
    'shop_types',
    'categories',
    'shops',
    'products',
    'hero_banners',
    'coupons',
    'app_layouts'
  ];

  for (const table of tables) {
    try {
      const res = await client.query(`SELECT * FROM "${table}"`);
      backupData.tables[table] = res.rows;
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
  const filePath = path.join(backupsDir, `swiftmart_backup_${dateStr}.json`);
  const latestPath = path.join(backupsDir, `swiftmart_backup_latest.json`);

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
  fs.writeFileSync(latestPath, JSON.stringify(backupData, null, 2));

  console.log(`\n🎉 Backup saved successfully to:\n  📂 ${filePath}\n  📂 ${latestPath}`);

  client.release();
  await pool.end();
}

backup().catch(console.error);
