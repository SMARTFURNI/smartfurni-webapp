/**
 * Shared PostgreSQL persistence layer.
 *
 * Strategy: Write-through cache
 * - On server startup: load all data from PostgreSQL into memory
 * - On mutation: update memory immediately + fire async DB write (no await needed in callers)
 * - This keeps all store functions synchronous while ensuring persistence
 *
 * Tables used (JSONB storage for flexibility):
 *   products(id TEXT PK, data JSONB, updated_at TIMESTAMPTZ)
 *   orders(id TEXT PK, data JSONB, updated_at TIMESTAMPTZ)
 *   contacts(id TEXT PK, data JSONB, updated_at TIMESTAMPTZ)
 */

import { Pool } from "pg";

let _pool: Pool | null = null;

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) return null;
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    _pool.on("error", (err) => {
      console.error("[db-store] Pool error:", err.message);
    });
  }
  return _pool;
}

async function ensureTable(table: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${table} (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

/**
 * Load all rows from a table as an array of T.
 * Returns null if DATABASE_URL is not set (fall back to default data).
 */
export async function dbLoadAll<T>(table: string): Promise<T[] | null> {
  const pool = getPool();
  if (!pool) return null;
  try {
    await ensureTable(table);
    const result = await pool.query(`SELECT data FROM ${table} ORDER BY updated_at ASC`);
    if (result.rows.length === 0) return null; // No data yet, use defaults
    return result.rows.map((r) => r.data as T);
  } catch (err) {
    console.error(`[db-store] dbLoadAll(${table}) error:`, (err as Error).message);
    return null;
  }
}

/**
 * Save a single item to the database (upsert by id).
 * Fire-and-forget — does not block the caller.
 */
export function dbSaveOne<T extends { id: string }>(table: string, item: T): void {
  const pool = getPool();
  if (!pool) return;
  pool
    .query(
      `INSERT INTO ${table} (id, data, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()`,
      [item.id, JSON.stringify(item)]
    )
    .catch((err) => {
      console.error(`[db-store] dbSaveOne(${table}, ${item.id}) error:`, (err as Error).message);
    });
}

/**
 * Delete a single item from the database by id.
 * Fire-and-forget.
 */
export function dbDeleteOne(table: string, id: string): void {
  const pool = getPool();
  if (!pool) return;
  pool
    .query(`DELETE FROM ${table} WHERE id = $1`, [id])
    .catch((err) => {
      console.error(`[db-store] dbDeleteOne(${table}, ${id}) error:`, (err as Error).message);
    });
}

/**
 * Bulk save all items (used for initial seed).
 * Fire-and-forget.
 */
export function dbSaveAll<T extends { id: string }>(table: string, items: T[]): void {
  const pool = getPool();
  if (!pool) return;
  const saveAll = async () => {
    await ensureTable(table);
    for (const item of items) {
      await pool.query(
        `INSERT INTO ${table} (id, data, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [item.id, JSON.stringify(item)]
      );
    }
  };
  saveAll().catch((err) => {
    console.error(`[db-store] dbSaveAll(${table}) error:`, (err as Error).message);
  });
}

/**
 * Initialize all tables (called once at startup).
 */
export async function initAllTables(): Promise<void> {
  const pool = getPool();
  if (!pool) {
    console.log("[db-store] No DATABASE_URL — using in-memory storage only");
    return;
  }
  await Promise.all([
    ensureTable("products"),
    ensureTable("orders"),
    ensureTable("contacts"),
  ]);
  console.log("[db-store] All tables initialized");
}
