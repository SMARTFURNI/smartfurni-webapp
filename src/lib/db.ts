/**
 * Database connection layer - supports both MySQL (TiDB) and PostgreSQL.
 * Detects the protocol from DATABASE_URL and uses the appropriate driver.
 * - mysql:// → mysql2 (TiDB Cloud, PlanetScale, etc.)
 * - postgres:// or postgresql:// → pg Pool (Railway, Neon, Supabase, etc.)
 */

import type { Pool as PgPool } from "pg";
import type { Pool as MysqlPool } from "mysql2/promise";

let pgPool: PgPool | null = null;
let mysqlPool: MysqlPool | null = null;

function isMysqlUrl(url: string): boolean {
  return url.startsWith("mysql://") || url.startsWith("mysql2://");
}

// ── MySQL helpers ─────────────────────────────────────────────────────────────
function getMysqlPool(): MysqlPool {
  if (!mysqlPool) {
    const connectionString = process.env.POSTGRESQL_URL || process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mysql = require("mysql2/promise");
    const url = new URL(connectionString);
    mysqlPool = mysql.createPool({
      host: url.hostname,
      port: parseInt(url.port) || 4000,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.slice(1).split("?")[0],
      ssl: { rejectUnauthorized: true },
      waitForConnections: true,
      connectionLimit: 10,
      idleTimeout: 30000,
      connectTimeout: 5000,
    });
  }
  return mysqlPool!;
}

// ── PostgreSQL helpers ────────────────────────────────────────────────────────
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
    pgPool = new Pool({ connectionString, ssl: sslConfig, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
  }
  return pgPool!;
}

// ── Unified query API ─────────────────────────────────────────────────────────

/**
 * Convert PostgreSQL-style $1, $2 placeholders to MySQL ? placeholders.
 */
function toMysqlSql(sql: string): string {
  return sql.replace(/\$\d+/g, "?");
}

/**
 * Convert PostgreSQL JSONB operators / types to MySQL equivalents.
 * - data->>'key' → JSON_UNQUOTE(JSON_EXTRACT(data, '$.key'))
 * - data->'key'  → JSON_EXTRACT(data, '$.key')
 * - JSONB        → JSON
 * - TIMESTAMPTZ  → DATETIME(3)
 * - ILIKE        → LIKE (MySQL is case-insensitive by default)
 * - TEXT PRIMARY KEY → VARCHAR(255) PRIMARY KEY
 */
function toMysqlDdl(sql: string): string {
  return sql
    .replace(/\bJSONB\b/g, "JSON")
    .replace(/\bTIMESTAMPTZ\b/g, "DATETIME(3)")
    .replace(/\bTEXT\s+PRIMARY\s+KEY\b/gi, "VARCHAR(255) PRIMARY KEY")
    .replace(/\bTEXT\b/g, "TEXT")
    .replace(/\bILIKE\b/g, "LIKE")
    .replace(/data->>'([^']+)'/g, "JSON_UNQUOTE(JSON_EXTRACT(data, '$.$1'))")
    .replace(/data->'([^']+)'/g, "JSON_EXTRACT(data, '$.$1')")
    .replace(/DEFAULT NOW\(\)/gi, "DEFAULT CURRENT_TIMESTAMP(3)")
    .replace(/TIMESTAMPTZ DEFAULT NOW\(\)/gi, "DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)")
    .replace(/CREATE INDEX IF NOT EXISTS (\w+) ON (\w+)\((\w+)\)/gi,
      "CREATE INDEX IF NOT EXISTS $1 ON $2($3)")
    .replace(/BOOLEAN DEFAULT FALSE/gi, "TINYINT(1) DEFAULT 0")
    .replace(/\bBOOLEAN\b/g, "TINYINT(1)")
    .replace(/\bDATE\b/g, "DATE");
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const connectionString = process.env.POSTGRESQL_URL || process.env.DATABASE_URL || "";
  if (isMysqlUrl(connectionString)) {
    const pool = getMysqlPool();
    const mysqlSql = toMysqlDdl(toMysqlSql(sql));
    const [rows] = await pool.query(mysqlSql, params || []);
    return rows as T[];
  } else {
    const pool = getPgPool();
    const result = await pool.query(sql, params);
    return result.rows as T[];
  }
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
 * For MySQL, throws an error suggesting to use query() instead.
 */
export function getDb(): PgPool {
  const connectionString = process.env.POSTGRESQL_URL || process.env.DATABASE_URL || "";
  if (isMysqlUrl(connectionString)) {
    // Return a proxy object that wraps mysql pool with pg-like interface
    const pool = getMysqlPool();
    return {
      query: async (sql: string, params?: unknown[]) => {
        const mysqlSql = toMysqlDdl(toMysqlSql(sql));
        const [rows] = await pool.query(mysqlSql, params || []);
        return { rows: rows as Record<string, unknown>[] };
      },
    } as unknown as PgPool;
  }
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
      data JSON NOT NULL,
      updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
    )
  `);
  // Orders table
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      data JSON NOT NULL,
      updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
    )
  `);
  // Contacts table
  await query(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      data JSON NOT NULL,
      updated_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3)
    )
  `);
  console.log("[db] Schema initialized");
}
