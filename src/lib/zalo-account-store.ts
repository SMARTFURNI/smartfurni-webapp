import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { query, queryOne } from "./db";

export interface StoredZaloCredentials {
  cookie: unknown;
  imei: string;
  userAgent: string;
}

export interface ZaloAccountRecord {
  id: string;
  userId: string;
  displayName: string;
  avatar: string;
  label: string;
  isActive: boolean;
  lastConnected: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ZaloAccountRow {
  account_id: string;
  user_id: string;
  display_name: string | null;
  avatar: string | null;
  label: string | null;
  encrypted_credentials: string;
  is_active: boolean;
  last_connected: string | null;
  created_at: string;
  updated_at: string;
}

let schemaPromise: Promise<void> | null = null;

function encryptionKey(): Buffer {
  const secret = process.env.ZALO_CREDENTIALS_ENCRYPTION_KEY
    || process.env.ENCRYPTION_KEY
    || process.env.SESSION_SECRET
    || "";
  if (secret.length < 32) {
    throw new Error("Cần cấu hình SESSION_SECRET hoặc ZALO_CREDENTIALS_ENCRYPTION_KEY tối thiểu 32 ký tự");
  }
  return createHash("sha256").update(secret).digest();
}

function encryptCredentials(credentials: StoredZaloCredentials): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(credentials), "utf8"),
    cipher.final(),
  ]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

function decryptCredentials(payload: string): StoredZaloCredentials {
  const [version, ivValue, tagValue, ciphertextValue] = payload.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Dữ liệu đăng nhập Zalo không hợp lệ");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as StoredZaloCredentials;
}

async function createSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS zalo_personal_accounts (
      account_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      display_name TEXT,
      avatar TEXT,
      label TEXT,
      encrypted_credentials TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      last_connected TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_zalo_personal_accounts_active ON zalo_personal_accounts(is_active, updated_at DESC)`);

  // Migration một lần: đưa phiên đơn tài khoản hiện tại vào registry mới.
  const legacy = await queryOne<{
    cookie: string;
    imei: string;
    user_agent: string;
    user_id: string | null;
    display_name: string | null;
    avatar: string | null;
  }>(`
    SELECT cookie, imei, user_agent, user_id, display_name, avatar
    FROM zalo_inbox_credentials
    WHERE COALESCE(user_id, '') <> ''
    LIMIT 1
  `).catch(() => null);
  if (legacy?.user_id) {
    let cookie: unknown = legacy.cookie;
    try { cookie = JSON.parse(legacy.cookie); } catch { /* legacy có thể đã là chuỗi */ }
    const encrypted = encryptCredentials({ cookie, imei: legacy.imei, userAgent: legacy.user_agent });
    await query(
      `INSERT INTO zalo_personal_accounts
         (account_id, user_id, display_name, avatar, label, encrypted_credentials, is_active, last_connected)
       VALUES ($1, $1, $2, $3, $2, $4, TRUE, NOW())
       ON CONFLICT (account_id) DO NOTHING`,
      [legacy.user_id, legacy.display_name || legacy.user_id, legacy.avatar || null, encrypted],
    );
    // Cookie Zalo không được lưu song song dưới dạng văn bản thuần sau khi
    // registry mã hóa đã ghi thành công.
    await query(`DELETE FROM zalo_inbox_credentials WHERE user_id = $1`, [legacy.user_id]);
  }
}

export async function ensureZaloAccountSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = createSchema().catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

function mapAccount(row: ZaloAccountRow): ZaloAccountRecord {
  return {
    id: row.account_id,
    userId: row.user_id,
    displayName: row.display_name || row.user_id,
    avatar: row.avatar || "",
    label: row.label || row.display_name || row.user_id,
    isActive: row.is_active,
    lastConnected: row.last_connected,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listZaloAccounts(): Promise<ZaloAccountRecord[]> {
  await ensureZaloAccountSchema();
  const rows = await query<ZaloAccountRow>(`
    SELECT * FROM zalo_personal_accounts
    ORDER BY is_active DESC, COALESCE(last_connected, created_at) DESC, created_at ASC
  `);
  return rows.map(mapAccount);
}

export async function getZaloAccount(accountId: string): Promise<ZaloAccountRecord | null> {
  await ensureZaloAccountSchema();
  const row = await queryOne<ZaloAccountRow>(`SELECT * FROM zalo_personal_accounts WHERE account_id = $1`, [accountId]);
  return row ? mapAccount(row) : null;
}

export async function loadZaloAccountCredentials(accountId: string): Promise<StoredZaloCredentials | null> {
  await ensureZaloAccountSchema();
  const row = await queryOne<{ encrypted_credentials: string }>(
    `SELECT encrypted_credentials FROM zalo_personal_accounts WHERE account_id = $1 AND is_active = TRUE`,
    [accountId],
  );
  return row ? decryptCredentials(row.encrypted_credentials) : null;
}

export async function saveZaloAccount(input: {
  userId: string;
  displayName?: string;
  avatar?: string;
  label?: string;
  credentials: StoredZaloCredentials;
}): Promise<ZaloAccountRecord> {
  await ensureZaloAccountSchema();
  const encrypted = encryptCredentials(input.credentials);
  const row = await queryOne<ZaloAccountRow>(
    `INSERT INTO zalo_personal_accounts
       (account_id, user_id, display_name, avatar, label, encrypted_credentials, is_active, last_connected, updated_at)
     VALUES ($1, $1, $2, $3, $4, $5, TRUE, NOW(), NOW())
     ON CONFLICT (account_id) DO UPDATE SET
       user_id = EXCLUDED.user_id,
       display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), zalo_personal_accounts.display_name),
       avatar = COALESCE(NULLIF(EXCLUDED.avatar, ''), zalo_personal_accounts.avatar),
       label = COALESCE(NULLIF(EXCLUDED.label, ''), zalo_personal_accounts.label),
       encrypted_credentials = EXCLUDED.encrypted_credentials,
       is_active = TRUE,
       last_connected = NOW(),
       updated_at = NOW()
     RETURNING *`,
    [input.userId, input.displayName || input.userId, input.avatar || null, input.label || input.displayName || input.userId, encrypted],
  );
  if (!row) throw new Error("Không thể lưu tài khoản Zalo");
  return mapAccount(row);
}

export async function updateZaloAccountMetadata(accountId: string, input: { label?: string; isActive?: boolean }): Promise<void> {
  await ensureZaloAccountSchema();
  await query(
    `UPDATE zalo_personal_accounts
     SET label = COALESCE(NULLIF($2, ''), label),
         is_active = COALESCE($3, is_active),
         updated_at = NOW()
     WHERE account_id = $1`,
    [accountId, input.label || null, input.isActive ?? null],
  );
}

export async function touchZaloAccountConnected(accountId: string): Promise<void> {
  await ensureZaloAccountSchema();
  await query(`UPDATE zalo_personal_accounts SET last_connected = NOW(), updated_at = NOW() WHERE account_id = $1`, [accountId]);
}

export async function deleteZaloAccount(accountId: string): Promise<void> {
  await ensureZaloAccountSchema();
  // Giữ lịch sử hội thoại/tin nhắn để audit; "xóa" chỉ vô hiệu hóa phiên.
  await query(`UPDATE zalo_personal_accounts SET is_active = FALSE, updated_at = NOW() WHERE account_id = $1`, [accountId]);
}
