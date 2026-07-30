import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

if (process.env.NODE_ENV === "production") {
  throw new Error("Từ chối chạy seed Facebook Group Marketing trên production.");
}
if (!process.argv.includes("--confirm-development")) {
  throw new Error("Thêm --confirm-development để xác nhận đây là database development.");
}
const connectionString = process.env.POSTGRESQL_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL chưa được cấu hình.");

const root = process.cwd();
const migrationNames = [
  "004_create_facebook_group_marketing.sql",
  "005_upgrade_facebook_group_marketing_operations.sql",
  "006_add_facebook_group_soft_delete.sql",
  "007_add_facebook_group_ai_operations.sql",
  "009_add_ai_group_growth_foundation.sql",
];
const migrations = await Promise.all(
  migrationNames.map(name => readFile(path.join(root, "migrations", name), "utf8")),
);
const seed = await readFile(path.join(root, "data/facebook-group-marketing-seed.sql"), "utf8");
const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
    ? false : { rejectUnauthorized: false },
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (const migration of migrations) await client.query(migration);
  await client.query(seed);
  await client.query("COMMIT");
  console.log("Facebook Group Marketing development seed completed.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
