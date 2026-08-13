import "server-only";

import { query, queryOne } from "./db";

export interface CanonicalZaloMessageInput {
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
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE zalo_inbox_messages ADD COLUMN IF NOT EXISTS sender_name TEXT`);
  await query(`ALTER TABLE zalo_inbox_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await query(`CREATE INDEX IF NOT EXISTS idx_zalo_inbox_messages_thread_time ON zalo_inbox_messages(thread_id, timestamp DESC, msg_id DESC)`);

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
  const row = await queryOne<CanonicalZaloMessageRow>(
    `INSERT INTO zalo_inbox_messages
       (msg_id, thread_id, from_id, to_id, sender_name, content, attachments, msg_type, is_self, timestamp, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
     ON CONFLICT (msg_id) DO UPDATE SET
       thread_id = EXCLUDED.thread_id,
       from_id = COALESCE(NULLIF(EXCLUDED.from_id, ''), zalo_inbox_messages.from_id),
       to_id = COALESCE(NULLIF(EXCLUDED.to_id, ''), zalo_inbox_messages.to_id),
       sender_name = COALESCE(NULLIF(EXCLUDED.sender_name, ''), zalo_inbox_messages.sender_name),
       content = CASE WHEN EXCLUDED.content <> '' THEN EXCLUDED.content ELSE zalo_inbox_messages.content END,
       attachments = CASE WHEN EXCLUDED.attachments <> '[]' THEN EXCLUDED.attachments ELSE zalo_inbox_messages.attachments END,
       msg_type = CASE WHEN EXCLUDED.msg_type <> 'other' THEN EXCLUDED.msg_type ELSE zalo_inbox_messages.msg_type END,
       is_self = EXCLUDED.is_self,
       timestamp = EXCLUDED.timestamp,
       updated_at = NOW()
     RETURNING msg_id, thread_id, from_id, to_id, sender_name, content, attachments,
               msg_type, is_self, timestamp, created_at, updated_at`,
    [
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

export async function getRecentCanonicalZaloMessages(
  threadId: string,
  limit = 100,
  offset = 0,
): Promise<CanonicalZaloMessageRow[]> {
  await ensureCanonicalZaloMessageSchema();
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const safeOffset = Math.max(offset, 0);
  return query<CanonicalZaloMessageRow>(
    `SELECT msg_id, thread_id, from_id, to_id, sender_name, content, attachments,
            msg_type, is_self, timestamp, created_at, updated_at
     FROM (
       SELECT msg_id, thread_id, from_id, to_id, sender_name, content, attachments,
              msg_type, is_self, timestamp, created_at, updated_at
       FROM zalo_inbox_messages
       WHERE thread_id = $1
       ORDER BY timestamp DESC, msg_id DESC
       LIMIT $2 OFFSET $3
     ) recent
     ORDER BY timestamp ASC, msg_id ASC`,
    [threadId, safeLimit, safeOffset],
  );
}
