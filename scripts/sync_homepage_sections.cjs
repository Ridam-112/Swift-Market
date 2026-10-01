require('./load_env.cjs');
const pg = require('../artifacts/api-server/node_modules/pg');
const urls = [
  process.env.DATABASE_URL || process.env.DATABASE1_URL,
  process.env.DATABASE2_URL,
  process.env.DATABASE3_URL,
  process.env.DATABASE4_URL,
  process.env.DATABASE5_URL,
].filter(Boolean);

async function syncHomepageSections() {
  const p1 = new pg.Pool({ connectionString: urls[0], ssl: { rejectUnauthorized: false } });
  const { rows } = await p1.query('SELECT * FROM homepage_sections');
  console.log('Fetched ' + rows.length + ' rows from DB1');
  await p1.end();

  for (let i = 1; i < urls.length; i++) {
    const p = new pg.Pool({ connectionString: urls[i], ssl: { rejectUnauthorized: false } });
    try {
      await p.query('DROP TABLE IF EXISTS homepage_sections CASCADE');
      await p.query(`
        CREATE TABLE homepage_sections (
          id text PRIMARY KEY,
          title text NOT NULL,
          type text NOT NULL DEFAULT 'trending',
          enabled boolean NOT NULL DEFAULT true,
          sort_order integer NOT NULL DEFAULT 0,
          config jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now()
        );
      `);
      for (const row of rows) {
        await p.query(
          'INSERT INTO homepage_sections (id, title, type, enabled, sort_order, config, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
          [row.id, row.title, row.type, row.enabled, row.sort_order, JSON.stringify(row.config), row.created_at, row.updated_at]
        );
      }
      const countRes = await p.query('SELECT count(*)::int as c FROM homepage_sections');
      console.log('DB ' + (i+1) + ': synced successfully, total = ' + countRes.rows[0].c);
    } catch(err) {
      console.log('DB ' + (i+1) + ': Error - ' + err.message);
    } finally {
      await p.end();
    }
  }
}
syncHomepageSections();
