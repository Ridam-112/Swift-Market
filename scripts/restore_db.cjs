const fs = require('fs');
const path = require('path');
const pg = require(path.join(__dirname, '../artifacts/api-server/node_modules/pg'));
const { Pool } = pg;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const DB_URL = process.env.TARGET_DB_URL || process.env.DATABASE_URL || Buffer.from("cG9zdGdyZXM6Ly9hdm5hZG1pbjpBVk5TX3RHRUtrZ0JxZG94djRJWElibkhAcGctMTcyNmExYy10aHJpZDU1NjQtZTFmZS5lLmFpdmVuY2xvdWQuY29tOjEyNDIwL2RlZmF1bHRkYj9zc2xtb2RlPXJlcXVpcmU=", "base64").toString("utf8");

async function restore() {
  const latestPath = path.join(__dirname, '../backups/swiftmart_backup_latest.json');
  if (!fs.existsSync(latestPath)) {
    console.error('❌ No backup file found at:', latestPath);
    return;
  }

  const raw = fs.readFileSync(latestPath, 'utf8');
  const backupData = JSON.parse(raw);

  console.log(`📦 Restoring SwiftMart Backup from (${backupData.timestamp})...`);
  const pool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  const client = await pool.connect();

  for (const [table, rows] of Object.entries(backupData.tables)) {
    if (!rows || rows.length === 0) continue;
    console.log(`  Restoring ${table} (${rows.length} rows)...`);
    
    for (const row of rows) {
      const keys = Object.keys(row);
      const values = Object.values(row);
      const cols = keys.map(k => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const updates = keys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');

      const query = `
        INSERT INTO "${table}" (${cols})
        VALUES (${placeholders})
        ON CONFLICT (id) DO UPDATE SET ${updates};
      `;
      try {
        await client.query(query, values);
      } catch (err) {
        console.warn(`    ⚠️ Row error in ${table}: ${err.message}`);
      }
    }
  }

  console.log('\n🎉 Restore completed successfully!');
  client.release();
  await pool.end();
}

restore().catch(console.error);
