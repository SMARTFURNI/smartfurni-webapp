import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

if (!process.argv.includes("--confirm-production")) {
  throw new Error("Thêm --confirm-production để xác nhận chạy migration production.");
}

const connectionString = process.env.DATABASE_PUBLIC_URL
  || process.env.POSTGRESQL_URL
  || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL chưa được cấu hình.");

const migrationName = "006_add_facebook_group_soft_delete.sql";
const migration = await readFile(path.join(process.cwd(), "migrations", migrationName), "utf8");
const pool = new pg.Pool({
  connectionString,
  ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
    ? false : { rejectUnauthorized: false },
  max: 1,
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [migrationName]);
  await client.query(migration);
  await client.query(`
    CREATE TABLE IF NOT EXISTS facebook_group_schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(
    `INSERT INTO facebook_group_schema_migrations (name)
     VALUES ($1) ON CONFLICT (name) DO UPDATE SET applied_at = NOW()`,
    [migrationName],
  );
  await client.query("COMMIT");
  console.log(`Applied ${migrationName}.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
