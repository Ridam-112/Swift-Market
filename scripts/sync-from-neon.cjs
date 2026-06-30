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
  await neon.query("SET search_path = public");
  console.log("✅ Connected to Neon (source)");
  await replit.connect();
  console.log("✅ Connected to Replit PostgreSQL (destination)");

  let totalInserted = 0;

  for (const table of TABLES_IN_ORDER) {
    try {
      const { rows } = await neon.query(`SELECT * FROM "${table}"`);
      if (rows.length === 0) {
        console.log(`   ${table}: 0 rows — skipping`);
        continue;
      }

      const cols = Object.keys(rows[0]);
      const colList = cols.map((c) => `"${c}"`).join(", ");
      let inserted = 0;
      let skipped = 0;

      for (const row of rows) {
        const values = cols.map((c) => row[c]);
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
        `   ${table}: ${inserted} inserted, ${skipped} skipped/conflict (${rows.length} total from Neon)`
      );
      totalInserted += inserted;
    } catch (err) {
      console.error(`   ❌ ${table}: ${err.message.split("\n")[0]}`);
    }
  }

  // Reset all sequences so future inserts don't get PK conflicts
  console.log("\nResetting sequences...");
  const { rows: seqs } = await replit.query(
    `SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'`
  );
  for (const { sequence_name } of seqs) {
    const tbl = sequence_name.replace(/_id_seq$/, "");
    try {
      await replit.query(
        `SELECT setval('${sequence_name}', COALESCE((SELECT MAX(id) FROM "${tbl}"), 1), true)`
      );
    } catch (_) {}
  }
  console.log(`Sequences reset for ${seqs.length} sequences.`);

  await neon.end();
  await replit.end();
  console.log(`\n🎉 Done — ${totalInserted} total rows synced from Neon.`);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
