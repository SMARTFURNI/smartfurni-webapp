/**
 * Database connection layer - PostgreSQL (Railway, Neon, Supabase, etc.)
 * Uses pg Pool with PostgreSQL syntax.
 */

import type { Pool as PgPool } from "pg";

let pgPool: PgPool | null = null;

function getPgPool(): PgPool {
  if (!pgPool) {
    const connectionString = process.env.POSTGRESQL_URL || process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg");
    const sslConfig =
      connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false };
    pgPool = new Pool({
      connectionString,
      ssl: sslConfig,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pgPool!;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getPgPool();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/**
 * Returns the underlying pg Pool (for legacy code that calls getDb()).
 */
export function getDb(): PgPool {
  return getPgPool();
}

/**
 * Initialize the database schema (create tables if not exists).
 */
export async function initDb(): Promise<void> {
  // Products table
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Orders table
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Contacts table
  await query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log("[db] Schema initialized");
}
