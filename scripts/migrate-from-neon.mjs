import pg from '/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js';
const { Client, types } = pg;

// Prevent pg from auto-parsing JSON — keep them as raw strings so we can
// pass them straight through to the destination without double-serialisation.
types.setTypeParser(114,  v => v);  // json
types.setTypeParser(3802, v => v);  // jsonb

const SSL_OPTS = { ssl: { rejectUnauthorized: false } };

const src = new Client({ connectionString: process.env.NEON_DATABASE_URL, ...SSL_OPTS });
const dst = new Client({ connectionString: process.env.DATABASE_URL });

const TABLE_ORDER = [
  'shop_types',
  'categories',
  'delivery_settings',
  'users',
  'admins',
  'delivery_partners',
  'shops',
  'products',
  'coupons',
  'delivery_charge_rules',
  'commission_rules',
  'hero_banners',
  'otp_sessions',
  'push_subscriptions',
  'notifications',
  'support_tickets',
  'admin_broadcasts',
  'reports',
  'payouts',
  'orders',
];

async function getColumns(client, table) {
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  );
  return res.rows.map(r => r.column_name);
}

async function migrateTable(table) {
  const cols = await getColumns(src, table);
  if (cols.length === 0) {
    console.log(`  ⚠️  ${table}: no columns found, skipping`);
    return 0;
  }

  const { rows } = await src.query(`SELECT * FROM "${table}"`);
  if (rows.length === 0) {
    console.log(`  ⏭️  ${table}: empty`);
    return 0;
  }

  const colList = cols.map(c => `"${c}"`).join(', ');
  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  const BATCH = 100;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const placeholders = batch.map((_, bi) =>
      `(${cols.map((_, ci) => `$${bi * cols.length + ci + 1}`).join(', ')})`
    ).join(', ');

    // Normalise each value: stringify objects/arrays so pg doesn't choke on them
    const values = batch.flatMap(row =>
      cols.map(c => {
        const v = row[c];
        if (v === null || v === undefined) return null;
        if (typeof v === 'object' && !Buffer.isBuffer(v) && !(v instanceof Date)) {
          return JSON.stringify(v);
        }
        return v;
      })
    );

    try {
      const result = await dst.query(
        `INSERT INTO "${table}" (${colList}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
        values
      );
      inserted += result.rowCount ?? 0;
      skipped  += batch.length - (result.rowCount ?? 0);
    } catch (err) {
      errors += batch.length;
      console.error(`\n  ❌ ${table} batch ${i}–${i + batch.length - 1}: ${err.message}`);
    }
  }

  const errNote = errors ? `  ⚠️  ${errors} rows errored` : '';
  console.log(`  ✅ ${table}: ${rows.length} src rows → +${inserted} inserted, =${skipped} already existed${errNote}`);
  return inserted;
}

async function resetSequences() {
  const seqRes = await dst.query(`
    SELECT s.sequence_name, t.table_name, c.column_name
    FROM information_schema.sequences s
    JOIN information_schema.columns c
      ON c.column_default LIKE '%' || s.sequence_name || '%'
    JOIN information_schema.tables t
      ON t.table_name = c.table_name AND t.table_schema = 'public'
    WHERE s.sequence_schema = 'public'
  `);

  for (const { sequence_name, table_name, column_name } of seqRes.rows) {
    try {
      await dst.query(
        `SELECT setval($1, COALESCE((SELECT MAX("${column_name}") FROM "${table_name}"), 1))`,
        [sequence_name]
      );
      console.log(`  ↺  ${sequence_name} → synced to max(${table_name}.${column_name})`);
    } catch {
      // skip if column isn't numeric
    }
  }
}

async function main() {
  console.log('🔗 Connecting to source (Neon) and destination (Replit PG)…');
  await src.connect();
  await dst.connect();
  console.log('✅ Both DBs connected\n');

  await dst.query('SET session_replication_role = replica;');

  let total = 0;
  for (const table of TABLE_ORDER) {
    process.stdout.write(`📦 ${table}… `);
    try {
      total += await migrateTable(table);
    } catch (err) {
      console.error(`FATAL for ${table}: ${err.message}`);
    }
  }

  await dst.query('SET session_replication_role = DEFAULT;');

  console.log('\n🔄 Resetting sequences…');
  await resetSequences();

  console.log(`\n🎉 Done! Total rows newly inserted: ${total}`);
  await src.end();
  await dst.end();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
