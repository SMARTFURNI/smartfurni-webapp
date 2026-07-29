import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

export async function applyFacebookGroupMigrations({
  connectionString,
  migrationNames,
  cwd = process.cwd(),
}) {
  if (!connectionString) throw new Error("DATABASE_URL chưa được cấu hình.");
  const pool = new pg.Pool({
    connectionString,
    ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
      ? false : { rejectUnauthorized: false },
    max: 1,
  });
  const client = await pool.connect();
  const applied = [];
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS facebook_group_schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    for (const migrationName of migrationNames) {
      const exists = await client.query(
        `SELECT 1 FROM facebook_group_schema_migrations WHERE name = $1`,
        [migrationName],
      );
      if (exists.rowCount) continue;
      const migration = await readFile(path.join(cwd, "migrations", migrationName), "utf8");
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [migrationName]);
        await client.query(migration);
        await client.query(
          `INSERT INTO facebook_group_schema_migrations (name)
           VALUES ($1) ON CONFLICT (name) DO UPDATE SET applied_at = NOW()`,
          [migrationName],
        );
        await client.query("COMMIT");
        applied.push(migrationName);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
    return { applied };
  } finally {
    client.release();
    await pool.end();
  }
}
