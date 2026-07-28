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
const migration = await readFile(path.join(root, "migrations/004_create_facebook_group_marketing.sql"), "utf8");
const seed = await readFile(path.join(root, "data/facebook-group-marketing-seed.sql"), "utf8");
const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
    ? false : { rejectUnauthorized: false },
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(migration);
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

