const { Pool } = require('/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg');

const local = new Pool({ connectionString: process.env.DATABASE_URL });
const neon  = new Pool({ connectionString: process.env.NEON_DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run(sql, vals) {
  try {
    await local.query(sql, vals || []);
  } catch(e) {
    // Swallow duplicate key errors — data already exists
    if (e.code !== '23505') throw e;
  }
}

async function importTable(table, rows, conflictExpr, updateCols) {
  if (!rows.length) { console.log('  ' + table + ': 0 rows (skipped)'); return; }
  const cols = Object.keys(rows[0]);
  const colNames = cols.map(function(c){ return '"' + c + '"'; }).join(', ');
  const updateSet = (updateCols || cols.filter(function(c){ return c !== 'id'; }))
    .map(function(c){ return '"' + c + '" = EXCLUDED."' + c + '"'; }).join(', ');
  let ok = 0, skip = 0;
  for (const row of rows) {
    const vals = cols.map(function(c){
      const v = row[c];
      return (v !== null && typeof v === 'object') ? JSON.stringify(v) : v;
    });
    const ph = cols.map(function(_, i){ return '$' + (i+1); }).join(', ');
    const sql = 'INSERT INTO "' + table + '" (' + colNames + ') VALUES (' + ph + ')' +
      ' ON CONFLICT (' + conflictExpr + ') DO UPDATE SET ' + updateSet;
    try {
      await local.query(sql, vals);
      ok++;
    } catch(e) {
      if (e.code === '23505') { skip++; } else { throw e; }
    }
  }
  console.log('  ' + table + ': ' + ok + ' upserted, ' + skip + ' skipped');
}

async function main() {
  console.log('Fetching from Neon...');
  const [users, shops, products, orders, admins, categories, shopTypes, coupons, heroBanners, commRules, deliveryRules] = await Promise.all([
    neon.query('SELECT * FROM users'),
    neon.query('SELECT * FROM shops'),
    neon.query('SELECT * FROM products'),
    neon.query('SELECT * FROM orders'),
    neon.query('SELECT * FROM admins'),
    neon.query('SELECT * FROM categories'),
    neon.query('SELECT * FROM shop_types'),
    neon.query('SELECT * FROM coupons'),
    neon.query('SELECT * FROM hero_banners'),
    neon.query('SELECT * FROM commission_rules'),
    neon.query('SELECT * FROM delivery_charge_rules'),
  ]);

  console.log('Neon: users=' + users.rows.length + ' shops=' + shops.rows.length + ' products=' + products.rows.length + ' orders=' + orders.rows.length);
  console.log('\nImporting...');

  // users: unique on id AND phone — upsert by id, ignore phone conflicts
  await importTable('users',      users.rows,     '"id"');
  // admins: unique on id AND phone
  await importTable('admins',     admins.rows,    '"id"');
  // categories: unique on name
  await importTable('categories', categories.rows,'"name"', ['slug','is_active','commission_rate','emoji','color','updated_at']);
  // shop_types: unique on slug
  await importTable('shop_types', shopTypes.rows, '"slug"', ['name','is_active','commission_rate','updated_at']);
  // shops, products, orders: just id
  await importTable('shops',      shops.rows,     '"id"');
  await importTable('products',   products.rows,  '"id"');
  await importTable('orders',     orders.rows,    '"id"');
  await importTable('coupons',    coupons.rows,   '"id"');
  await importTable('hero_banners',   heroBanners.rows,  '"id"');
  await importTable('commission_rules',    commRules.rows,    '"id"');
  await importTable('delivery_charge_rules', deliveryRules.rows, '"id"');

  // Final verify
  const r = await local.query('SELECT (SELECT COUNT(*) FROM users) u,(SELECT COUNT(*) FROM shops) s,(SELECT COUNT(*) FROM products) p,(SELECT COUNT(*) FROM orders) o');
  console.log('\nLocal DB now: users=' + r.rows[0].u + ' shops=' + r.rows[0].s + ' products=' + r.rows[0].p + ' orders=' + r.rows[0].o);
  await Promise.all([local.end(), neon.end()]);
}

main().catch(function(e){ console.error('FATAL:', e.message); process.exit(1); });
