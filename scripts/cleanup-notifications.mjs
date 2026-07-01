/**
 * One-time cleanup: trims every user's notifications to the 10-item cap.
 * Deletes oldest READ notifications first, then oldest overall if still over cap.
 *
 * Usage (from workspace root):
 *   NODE_PATH=/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules \
 *     node scripts/cleanup-notifications.mjs
 *
 * Requires DATABASE_URL in environment (already set in Replit Secrets).
 */

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const LIMIT = 10;

// Use pg directly via the db package's node_modules
const { Pool } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌  DATABASE_URL env var is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log(`\nFetching users with more than ${LIMIT} notifications…`);

    const { rows: overCapUsers } = await client.query(
      `SELECT user_id, COUNT(*) AS total
       FROM notifications
       GROUP BY user_id
       HAVING COUNT(*) > $1
       ORDER BY total DESC`,
      [LIMIT]
    );

    if (overCapUsers.length === 0) {
      console.log("✅  All users are within the 10-notification limit. Nothing to clean up.");
      return;
    }

    console.log(`Found ${overCapUsers.length} user(s) over the limit. Starting cleanup…\n`);

    let totalDeleted = 0;

    for (const { user_id, total } of overCapUsers) {
      let stillNeed = Number(total) - LIMIT;
      const toDeleteIds = [];

      // Pass 1: oldest READ notifications
      if (stillNeed > 0) {
        const { rows } = await client.query(
          `SELECT id FROM notifications
           WHERE user_id = $1 AND is_read = true
           ORDER BY created_at ASC LIMIT $2`,
          [user_id, stillNeed]
        );
        for (const r of rows) toDeleteIds.push(r.id);
        stillNeed -= rows.length;
      }

      // Pass 2: oldest overall (unread) if still over cap
      if (stillNeed > 0) {
        const placeholders = toDeleteIds.map((_, i) => `$${i + 3}`).join(",");
        const excludeClause = toDeleteIds.length > 0 ? `AND id NOT IN (${placeholders})` : "";
        const { rows } = await client.query(
          `SELECT id FROM notifications
           WHERE user_id = $1 ${excludeClause}
           ORDER BY created_at ASC LIMIT $2`,
          [user_id, stillNeed, ...toDeleteIds]
        );
        for (const r of rows) toDeleteIds.push(r.id);
      }

      if (toDeleteIds.length > 0) {
        await client.query(`DELETE FROM notifications WHERE id = ANY($1)`, [toDeleteIds]);
        totalDeleted += toDeleteIds.length;
        console.log(
          `  user ${user_id}: had ${total}, deleted ${toDeleteIds.length}, kept ${LIMIT}`
        );
      }
    }

    console.log(`\n✅  Cleanup complete. Total notifications deleted: ${totalDeleted}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("❌  Cleanup failed:", err);
  process.exit(1);
});
