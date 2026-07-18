import "server-only";

import { cookies } from "next/headers";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { query, queryOne } from "./db";

export const SMART_BED_SESSION_COOKIE = "sf_bed_session";
const SESSION_DAYS = 30;

export interface SmartBedUserSession {
  id: string;
  fullName: string;
  email: string;
  phone: string;
}

let accountTablesPromise: Promise<void> | null = null;

function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase("vi");
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}

function verifyPassword(password: string, stored: string) {
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function ensureSmartBedAccountTables() {
  if (accountTablesPromise) return accountTablesPromise;
  accountTablesPromise = (async () => {
    await query(`
    CREATE TABLE IF NOT EXISTS smart_bed_users (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await query(`
    CREATE TABLE IF NOT EXISTS smart_bed_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES smart_bed_users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
    await query(`
    CREATE TABLE IF NOT EXISTS smart_bed_devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES smart_bed_users(id) ON DELETE CASCADE,
      hardware_id TEXT NOT NULL,
      name TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      transport TEXT NOT NULL,
      firmware TEXT NOT NULL DEFAULT '',
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, hardware_id)
    )
  `);
    await query(`CREATE INDEX IF NOT EXISTS idx_smart_bed_devices_user ON smart_bed_devices(user_id, last_seen_at DESC)`);
    await query(`DELETE FROM smart_bed_sessions WHERE expires_at < NOW()`);
  })().catch((error) => {
    accountTablesPromise = null;
    throw error;
  });
  return accountTablesPromise;
}

export async function registerSmartBedUser(input: { fullName: string; email: string; phone: string; password: string }) {
  await ensureSmartBedAccountTables();
  const fullName = input.fullName.trim().slice(0, 100);
  const email = normalizeEmail(input.email);
  const phone = input.phone.replace(/\s+/g, "").slice(0, 20);
  if (fullName.length < 2) throw new Error("Họ tên chưa hợp lệ.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Email chưa hợp lệ.");
  if (input.password.length < 8) throw new Error("Mật khẩu cần ít nhất 8 ký tự.");
  const existing = await queryOne<{ id: string }>("SELECT id FROM smart_bed_users WHERE email = $1", [email]);
  if (existing) throw new Error("Email này đã được đăng ký.");
  const id = `sbu_${randomUUID()}`;
  await query(
    `INSERT INTO smart_bed_users (id, full_name, email, phone, password_hash) VALUES ($1, $2, $3, $4, $5)`,
    [id, fullName, email, phone, hashPassword(input.password)],
  );
  return createSmartBedSession(id);
}

export async function loginSmartBedUser(emailInput: string, password: string) {
  await ensureSmartBedAccountTables();
  const user = await queryOne<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM smart_bed_users WHERE email = $1",
    [normalizeEmail(emailInput)],
  );
  if (!user || !verifyPassword(password, user.password_hash)) throw new Error("Email hoặc mật khẩu không đúng.");
  return createSmartBedSession(user.id);
}

async function createSmartBedSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query(
    "INSERT INTO smart_bed_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
    [hashSessionToken(token), userId, expiresAt],
  );
  return { token, expiresAt };
}

export async function getSmartBedSession(): Promise<SmartBedUserSession | null> {
  try {
    await ensureSmartBedAccountTables();
    const cookieStore = await cookies();
    const token = cookieStore.get(SMART_BED_SESSION_COOKIE)?.value;
    if (!token) return null;
    return queryOne<SmartBedUserSession>(
      `SELECT u.id, u.full_name AS "fullName", u.email, u.phone
       FROM smart_bed_sessions s
       JOIN smart_bed_users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
      [hashSessionToken(token)],
    );
  } catch {
    return null;
  }
}

export async function revokeSmartBedSession(token: string | undefined) {
  if (!token) return;
  await ensureSmartBedAccountTables();
  await query("DELETE FROM smart_bed_sessions WHERE token_hash = $1", [hashSessionToken(token)]);
}

export async function deleteSmartBedUserAccount(userId: string) {
  await ensureSmartBedAccountTables();
  // Sessions and paired-device records are removed by the database cascade.
  await query("DELETE FROM smart_bed_users WHERE id = $1", [userId]);
}
