import "server-only";

import { query, queryOne } from "./db";
import { ensureZaloAccountSchema } from "./zalo-account-store";

export interface CanonicalZaloMessageInput {
  accountId?: string;
  msgId: string;
  threadId: string;
  fromId: string;
  toId: string;
  senderName?: string | null;
  content?: string;
  attachments?: unknown[];
  msgType?: string;
  isSelf?: boolean;
  timestamp: number;
}

export interface CanonicalZaloMessageRow {
  account_id: string;
  msg_id: string;
  thread_id: string;
  from_id: string;
  to_id: string;
  sender_name: string | null;
  content: string;
  attachments: string;
  msg_type: string;
  is_self: boolean;
  timestamp: string;
  created_at: string;
  updated_at: string;
}

let schemaPromise: Promise<void> | null = null;

async function createSchema(): Promise<void> {
  await ensureZaloAccountSchema();
  await query(`
    CREATE TABLE IF NOT EXISTS zalo_inbox_messages (
      id BIGSERIAL PRIMARY KEY,
      msg_id TEXT UNIQUE NOT NULL,
      thread_id TEXT NOT NULL,
      from_id TEXT NOT NULL DEFAULT '',
      to_id TEXT NOT NULL DEFAULT '',
      sender_name TEXT,
      content TEXT NOT NULL DEFAULT '',
      attachments TEXT NOT NULL DEFAULT '[]',
      msg_type TEXT NOT NULL DEFAULT 'text',
      is_self BOOLEAN NOT NULL DEFAULT FALSE,
      timestamp BIGINT NOT NULL,
      pwa_notified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE zalo_inbox_messages ADD COLUMN IF NOT EXISTS sender_name TEXT`);
  await query(`ALTER TABLE zalo_inbox_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await query(`ALTER TABLE zalo_inbox_messages ADD COLUMN IF NOT EXISTS pwa_notified_at TIMESTAMPTZ`);
  await query(`CREATE INDEX IF NOT EXISTS idx_zalo_inbox_messages_thread_time ON zalo_inbox_messages(thread_id, timestamp DESC, msg_id DESC)`);

  await query(`
    CREATE TABLE IF NOT EXISTS zalo_inbox_messages_v2 (
      id BIGSERIAL PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES zalo_personal_accounts(account_id) ON DELETE CASCADE,
      msg_id TEXT NOT NULL,
      thread_id TEXT NOT NULL,
      from_id TEXT NOT NULL DEFAULT '',
      to_id TEXT NOT NULL DEFAULT '',
      sender_name TEXT,
      content TEXT NOT NULL DEFAULT '',
      attachments TEXT NOT NULL DEFAULT '[]',
      msg_type TEXT NOT NULL DEFAULT 'text',
      is_self BOOLEAN NOT NULL DEFAULT FALSE,
      timestamp BIGINT NOT NULL,
      pwa_notified_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (account_id, msg_id)
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_zalo_inbox_messages_v2_thread_time ON zalo_inbox_messages_v2(account_id, thread_id, timestamp DESC, msg_id DESC)`);
  await query(`
    INSERT INTO zalo_inbox_messages_v2
      (account_id, msg_id, thread_id, from_id, to_id, sender_name, content, attachments,
       msg_type, is_self, timestamp, pwa_notified_at, created_at, updated_at)
    SELECT a.account_id, m.msg_id, m.thread_id, m.from_id, m.to_id, m.sender_name,
           m.content, m.attachments, m.msg_type, m.is_self, m.timestamp,
           m.pwa_notified_at, m.created_at, m.updated_at
    FROM zalo_inbox_messages m
    CROSS JOIN LATERAL (
      SELECT account_id FROM zalo_personal_accounts ORDER BY created_at ASC LIMIT 1
    ) a
    ON CONFLICT (account_id, msg_id) DO NOTHING
  `);

  // Một số bản triển khai cũ ghi vào zalo_messages. Chuyển dữ liệu cũ sang
  // bảng chuẩn theo kiểu cộng dồn, không xóa bảng cũ và không ghi đè tin mới.
  const legacy = await queryOne<{ table_name: string | null }>(
    `SELECT to_regclass('public.zalo_messages')::text AS table_name`
  );
  if (legacy?.table_name) {
    // Các deployment cũ có thể mới chỉ tạo một phần schema legacy. Bổ sung
    // theo kiểu additive trước khi migrate để startup không thất bại.
    await query(`ALTER TABLE zalo_messages ADD COLUMN IF NOT EXISTS sender_name TEXT NOT NULL DEFAULT ''`);
    await query(`ALTER TABLE zalo_messages ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'text'`);
    await query(`ALTER TABLE zalo_messages ADD COLUMN IF NOT EXISTS attachments TEXT NOT NULL DEFAULT '[]'`);
    await query(`ALTER TABLE zalo_messages ADD COLUMN IF NOT EXISTS is_self BOOLEAN NOT NULL DEFAULT FALSE`);
    await query(`ALTER TABLE zalo_messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    await query(`
      INSERT INTO zalo_inbox_messages
        (msg_id, thread_id, from_id, to_id, sender_name, content, attachments, msg_type, is_self, timestamp, created_at, updated_at)
      SELECT
        id,
        conversation_id,
        sender_id,
        CASE WHEN is_self THEN conversation_id ELSE '' END,
        NULLIF(sender_name, ''),
        COALESCE(content, ''),
        COALESCE(NULLIF(attachments, ''), '[]'),
        COALESCE(NULLIF(content_type, ''), 'text'),
        COALESCE(is_self, FALSE),
        (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT,
        created_at,
        created_at
      FROM zalo_messages
      ON CONFLICT (msg_id) DO NOTHING
    `);
  }

  // Chạy sau cả bước nhập bảng legacy để các bản triển khai cũ không bị
  // thiếu tin nhắn trong kho dữ liệu tách theo tài khoản.
  await query(`
    INSERT INTO zalo_inbox_messages_v2
      (account_id, msg_id, thread_id, from_id, to_id, sender_name, content, attachments,
       msg_type, is_self, timestamp, pwa_notified_at, created_at, updated_at)
    SELECT a.account_id, m.msg_id, m.thread_id, m.from_id, m.to_id, m.sender_name,
           m.content, m.attachments, m.msg_type, m.is_self, m.timestamp,
           m.pwa_notified_at, m.created_at, m.updated_at
    FROM zalo_inbox_messages m
    CROSS JOIN LATERAL (
      SELECT account_id FROM zalo_personal_accounts ORDER BY created_at ASC LIMIT 1
    ) a
    ON CONFLICT (account_id, msg_id) DO NOTHING
  `);
}

/**
 * Atomic claim used by the realtime listener so reconnects and repeated Zalo
 * events cannot produce duplicate PWA notifications for the same message.
 */
export async function claimCanonicalZaloMessagePush(msgId: string, accountId?: string): Promise<boolean> {
  await ensureCanonicalZaloMessageSchema();
  const claimed = await queryOne<{ msg_id: string }>(
    `UPDATE zalo_inbox_messages_v2
     SET pwa_notified_at = NOW()
     WHERE msg_id = $1 AND ($2::text IS NULL OR account_id = $2)
       AND is_self = FALSE
       AND pwa_notified_at IS NULL
     RETURNING msg_id`,
    [msgId, accountId || null],
  );
  return Boolean(claimed);
}

export async function releaseCanonicalZaloMessagePush(msgId: string, accountId?: string): Promise<void> {
  await ensureCanonicalZaloMessageSchema();
  await query(
    `UPDATE zalo_inbox_messages_v2 SET pwa_notified_at = NULL WHERE msg_id = $1 AND ($2::text IS NULL OR account_id = $2)`,
    [msgId, accountId || null],
  );
}

export async function ensureCanonicalZaloMessageSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = createSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export async function upsertCanonicalZaloMessage(
  message: CanonicalZaloMessageInput,
): Promise<CanonicalZaloMessageRow> {
  await ensureCanonicalZaloMessageSchema();
  if (!message.accountId) throw new Error("Thiếu accountId khi lưu tin nhắn Zalo");
  const row = await queryOne<CanonicalZaloMessageRow>(
    `INSERT INTO zalo_inbox_messages_v2
       (account_id, msg_id, thread_id, from_id, to_id, sender_name, content, attachments, msg_type, is_self, timestamp, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
     ON CONFLICT (account_id, msg_id) DO UPDATE SET
       thread_id = EXCLUDED.thread_id,
       from_id = COALESCE(NULLIF(EXCLUDED.from_id, ''), zalo_inbox_messages_v2.from_id),
       to_id = COALESCE(NULLIF(EXCLUDED.to_id, ''), zalo_inbox_messages_v2.to_id),
       sender_name = COALESCE(NULLIF(EXCLUDED.sender_name, ''), zalo_inbox_messages_v2.sender_name),
       content = CASE WHEN EXCLUDED.content <> '' THEN EXCLUDED.content ELSE zalo_inbox_messages_v2.content END,
       attachments = CASE WHEN EXCLUDED.attachments <> '[]' THEN EXCLUDED.attachments ELSE zalo_inbox_messages_v2.attachments END,
       msg_type = CASE WHEN EXCLUDED.msg_type <> 'other' THEN EXCLUDED.msg_type ELSE zalo_inbox_messages_v2.msg_type END,
       is_self = EXCLUDED.is_self,
       timestamp = EXCLUDED.timestamp,
       updated_at = NOW()
     RETURNING account_id, msg_id, thread_id, from_id, to_id, sender_name, content, attachments,
               msg_type, is_self, timestamp, created_at, updated_at`,
    [
      message.accountId,
      message.msgId,
      message.threadId,
      message.fromId || "",
      message.toId || "",
      message.senderName || null,
      message.content || "",
      JSON.stringify(message.attachments || []),
      message.msgType || "text",
      Boolean(message.isSelf),
      message.timestamp,
    ],
  );
  if (!row) throw new Error("Không thể lưu tin nhắn Zalo vào PostgreSQL");
  return row;
}

export async function getCanonicalZaloMessage(
  msgId: string,
  accountId: string,
): Promise<CanonicalZaloMessageRow | null> {
  await ensureCanonicalZaloMessageSchema();
  return queryOne<CanonicalZaloMessageRow>(
    `SELECT account_id, msg_id, thread_id, from_id, to_id, sender_name, content, attachments,
            msg_type, is_self, timestamp, created_at, updated_at
     FROM zalo_inbox_messages_v2
     WHERE account_id = $1 AND msg_id = $2`,
    [accountId, msgId],
  );
}

export async function getRecentCanonicalZaloMessages(
  threadId: string,
  limit = 100,
  offset = 0,
  accountId?: string | null,
): Promise<CanonicalZaloMessageRow[]> {
  await ensureCanonicalZaloMessageSchema();
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const safeOffset = Math.max(offset, 0);
  return query<CanonicalZaloMessageRow>(
    `SELECT account_id, msg_id, thread_id, from_id, to_id, sender_name, content, attachments,
            msg_type, is_self, timestamp, created_at, updated_at
     FROM (
       SELECT account_id, msg_id, thread_id, from_id, to_id, sender_name, content, attachments,
              msg_type, is_self, timestamp, created_at, updated_at
       FROM zalo_inbox_messages_v2
       WHERE thread_id = $1 AND ($4::text IS NULL OR account_id = $4)
       ORDER BY timestamp DESC, msg_id DESC
       LIMIT $2 OFFSET $3
     ) recent
     ORDER BY timestamp ASC, msg_id ASC`,
    [threadId, safeLimit, safeOffset, accountId || null],
  );
}
