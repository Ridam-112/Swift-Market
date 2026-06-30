"use strict";
const { Client } = require("pg");

const TABLES_IN_ORDER = [
  "users",
  "admins",
  "shop_types",
  "categories",
  "shops",
  "products",
  "otp_sessions",
  "orders",
  "payouts",
  "coupons",
  "commission_rules",
  "reports",
  "notifications",
  "push_subscriptions",
  "hero_banners",
  "delivery_partners",
  "delivery_charge_rules",
  "delivery_settings",
  "support_tickets",
  "fcm_tokens",
  "homepage_sections",
  "service_pincodes",
  "admin_broadcasts",
];

async function main() {
  const neon = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  const replit = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  await neon.connect();
  // Set search_path via query (not startup param — pooler rejects startup params)
  await neon.query("SET search_path TO public");
  console.log("✅ Connected to Neon (source)");

  await replit.connect();
  console.log("✅ Connected to Replit PostgreSQL (destination)");

  // Truncate all tables in reverse dependency order
  console.log("\nTruncating Replit tables...");
  await replit.query(`
    SET session_replication_role = 'replica';
    TRUNCATE TABLE
      otp_sessions, notifications, push_subscriptions, fcm_tokens, reports,
      payouts, commission_rules, coupons, delivery_charge_rules, delivery_settings,
      delivery_partners, hero_banners, homepage_sections, service_pincodes,
      admin_broadcasts, support_tickets, orders, products, shops,
      categories, shop_types, admins, users
    RESTART IDENTITY CASCADE;
    SET session_replication_role = 'local';
  `);
  console.log("Tables cleared.\n");

  let totalInserted = 0;

  for (const table of TABLES_IN_ORDER) {
    try {
      // Get column names from Neon for this table
      const colRes = await neon.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table]
      );
      const cols = colRes.rows.map((r) => r.column_name);

      // Get column names from Replit for this table
      const colRes2 = await replit.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [table]
      );
      const replitCols = new Set(colRes2.rows.map((r) => r.column_name));

      // Only copy columns that exist in BOTH databases
      const commonCols = cols.filter((c) => replitCols.has(c));
      const colList = commonCols.map((c) => `"${c}"`).join(", ");

      const { rows } = await neon.query(
        `SELECT ${colList} FROM "${table}"`
      );

      if (rows.length === 0) {
        console.log(`   ${table}: 0 rows — skipping`);
        continue;
      }

      let inserted = 0;
      let skipped = 0;

      for (const row of rows) {
        const values = commonCols.map((c) => {
          const v = row[c];
          // Stringify objects/arrays for jsonb columns
          if (v !== null && typeof v === "object" && !Buffer.isBuffer(v)) {
            return JSON.stringify(v);
          }
          return v;
        });
        const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
        const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
        try {
          const res = await replit.query(sql, values);
          if (res.rowCount > 0) inserted++;
          else skipped++;
        } catch (err) {
          console.warn(`   ⚠️  ${table} row error: ${err.message.split("\n")[0]}`);
          skipped++;
        }
      }

      console.log(
        `   ${table}: ${inserted} inserted, ${skipped} skipped (${rows.length} total from Neon)`
      );
      totalInserted += inserted;
    } catch (err) {
      console.error(`   ❌ ${table}: ${err.message.split("\n")[0]}`);
    }
  }

  // Reset all sequences
  console.log("\nResetting sequences...");
  const { rows: seqs } = await replit.query(
    `SELECT s.sequence_name, t.table_name
     FROM information_schema.sequences s
     JOIN information_schema.tables t
       ON t.table_name = replace(s.sequence_name, '_id_seq', '')
     WHERE s.sequence_schema = 'public' AND t.table_schema = 'public'`
  );
  for (const { sequence_name, table_name } of seqs) {
    try {
      await replit.query(
        `SELECT setval('${sequence_name}', COALESCE((SELECT MAX(id) FROM "${table_name}"), 1), true)`
      );
    } catch (_) {}
  }
  console.log(`${seqs.length} sequences reset.`);

  await neon.end();
  await replit.end();
  console.log(`\n🎉 Done — ${totalInserted} total rows synced from Neon.`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
