require('./load_env.cjs');
const path = require('path');
const pg = require(path.join(__dirname, '../artifacts/api-server/node_modules/pg'));

const urls = [
  process.env.DATABASE_URL || process.env.DATABASE1_URL,
  process.env.DATABASE2_URL,
  process.env.DATABASE3_URL,
  process.env.DATABASE4_URL,
  process.env.DATABASE5_URL,
].filter(Boolean);

async function check() {
  if (urls.length === 0) {
    console.log('No DATABASE_URL environment variables configured in .env');
    return;
  }
  for (let i = 0; i < urls.length; i++) {
    const p = new pg.Pool({ connectionString: urls[i], ssl: { rejectUnauthorized: false } });
    try {
      const u = await p.query('SELECT count(*)::int as c FROM users');
      const pr = await p.query('SELECT count(*)::int as c FROM products');
      const sh = await p.query('SELECT count(*)::int as c FROM shops');
      const ord = await p.query('SELECT count(*)::int as c FROM orders');
      console.log(`DB ${i+1}: users=${u.rows[0].c}, products=${pr.rows[0].c}, shops=${sh.rows[0].c}, orders=${ord.rows[0].c}`);
    } catch(err) {
      console.log(`DB ${i+1}: Error - ${err.message}`);
    } finally {
      await p.end();
    }
  }
}
check();
