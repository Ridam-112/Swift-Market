const path = require('path');
const pg = require(path.join(__dirname, '../artifacts/api-server/node_modules/pg'));
const urls = [
  'postgresql://neondb_owner:npg_wyr4mq0sbZvV@ep-calm-glitter-aoeraspe-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  'postgresql://neondb_owner:npg_U38WKbfcFLwB@ep-lucky-shape-azpdcnzz-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  'postgresql://neondb_owner:npg_5xQCT9dNgqRS@ep-small-violet-azvsq53k-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  'postgresql://neondb_owner:npg_4enZGx0fHDIv@ep-dawn-unit-azzrimbp-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  'postgresql://neondb_owner:npg_tFHT9NoO5Cvy@ep-dark-tooth-az6x4682-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
];

async function check() {
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
