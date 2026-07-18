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

export interface SmartBedAdminCustomer extends SmartBedUserSession {
  createdAt: string;
  updatedAt: string;
  installedAt: string | null;
  installPlatform: string;
  deviceCount: number;
  lastDeviceSeenAt: string | null;
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
    await query(`ALTER TABLE smart_bed_users ADD COLUMN IF NOT EXISTS installed_at TIMESTAMPTZ`);
    await query(`ALTER TABLE smart_bed_users ADD COLUMN IF NOT EXISTS install_platform TEXT NOT NULL DEFAULT ''`);
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

export async function updateSmartBedUserProfile(
  userId: string,
  input: { fullName: string; email: string; phone: string },
): Promise<SmartBedUserSession> {
  await ensureSmartBedAccountTables();
  const fullName = input.fullName.trim().slice(0, 100);
  const email = normalizeEmail(input.email).slice(0, 160);
  const phone = input.phone.trim().replace(/[\s().-]+/g, "").slice(0, 20);

  if (fullName.length < 2) throw new Error("Họ tên cần có ít nhất 2 ký tự.");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Email chưa hợp lệ.");
  if (phone && !/^\+?\d{8,15}$/.test(phone)) throw new Error("Số điện thoại chưa hợp lệ.");

  const duplicateEmail = await queryOne<{ id: string }>(
    "SELECT id FROM smart_bed_users WHERE email = $1 AND id <> $2",
    [email, userId],
  );
  if (duplicateEmail) throw new Error("Email này đang được sử dụng bởi tài khoản khác.");

  const updated = await queryOne<SmartBedUserSession>(
    `UPDATE smart_bed_users
     SET full_name = $1, email = $2, phone = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING id, full_name AS "fullName", email, phone`,
    [fullName, email, phone, userId],
  );
  if (!updated) throw new Error("Không tìm thấy tài khoản khách hàng.");
  return updated;
}

export async function markSmartBedAppInstalled(userId: string, platform: string) {
  await ensureSmartBedAccountTables();
  const safePlatform = platform.trim().slice(0, 40) || "pwa";
  await query(
    `UPDATE smart_bed_users
     SET installed_at = COALESCE(installed_at, NOW()), install_platform = $1, updated_at = NOW()
     WHERE id = $2`,
    [safePlatform, userId],
  );
}

export async function getSmartBedAdminCustomers(): Promise<SmartBedAdminCustomer[]> {
  await ensureSmartBedAccountTables();
  return query<SmartBedAdminCustomer>(
    `SELECT u.id,
            u.full_name AS "fullName",
            u.email,
            u.phone,
            u.created_at::text AS "createdAt",
            u.updated_at::text AS "updatedAt",
            u.installed_at::text AS "installedAt",
            u.install_platform AS "installPlatform",
            COUNT(d.id)::int AS "deviceCount",
            MAX(d.last_seen_at)::text AS "lastDeviceSeenAt"
     FROM smart_bed_users u
     LEFT JOIN smart_bed_devices d ON d.user_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC`,
  );
}

export async function resetSmartBedUserPassword(userId: string) {
  await ensureSmartBedAccountTables();
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  const temporaryPassword = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  const updated = await queryOne<{ id: string }>(
    `UPDATE smart_bed_users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
    [hashPassword(temporaryPassword), userId],
  );
  if (!updated) throw new Error("Không tìm thấy tài khoản khách hàng.");
  await query("DELETE FROM smart_bed_sessions WHERE user_id = $1", [userId]);
  return temporaryPassword;
}

export async function deleteSmartBedUserAccount(userId: string) {
  await ensureSmartBedAccountTables();
  // Sessions and paired-device records are removed by the database cascade.
  await query("DELETE FROM smart_bed_users WHERE id = $1", [userId]);
}
