/**
 * zalo-inbox-store.ts
 * Database layer cho Zalo Personal Shared Inbox
 */
import { getDb } from "./db";
import { ensureZaloAccountSchema, listZaloAccounts } from "./zalo-account-store";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZaloConversation {
  accountId: string;
  id: string;                    // thread_id từ Zalo API
  zaloUserId: string;            // UID Zalo, không được dùng thay số điện thoại CRM
  phone: string | null;          // số điện thoại thật nếu đã đối soát được
  displayName: string;           // tên hiển thị
  avatarUrl: string | null;      // ảnh đại diện
  lastMessage: string | null;    // tin nhắn cuối
  lastMessageAt: string;         // thời gian tin nhắn cuối
  unreadCount: number;           // số tin chưa đọc
  leadId: string | null;         // ID lead trong CRM (nếu có)
  createdAt: string;
  updatedAt: string;
}

export interface ZaloMessage {
  id: string;                    // message_id từ Zalo API
  conversationId: string;        // thread_id
  senderId: string;              // user_id người gửi
  senderName: string;            // tên người gửi
  content: string;               // nội dung tin nhắn
  contentType: "text" | "image" | "sticker" | "file" | "link";
  attachments: string | null;    // JSON array URLs
  isSelf: boolean;               // tin nhắn từ tài khoản Zalo của mình
  isRead: boolean;               // đã đọc chưa
  createdAt: string;
}

export interface ZaloInboxAccess {
  staffId: string;               // ID nhân viên được phép truy cập
  createdBy: string;             // admin tạo quyền
  createdAt: string;
}

export interface ZaloCredentials {
  id: string;
  phone: string;                 // số điện thoại Zalo cá nhân
  imei: string;                  // IMEI từ Zalo Web
  cookies: string;               // cookies JSON
  userAgent: string;             // user agent
  isActive: boolean;             // đang kích hoạt không
  lastConnected: string | null;  // lần kết nối cuối
  createdAt: string;
  updatedAt: string;
}

// ─── Database Schema ──────────────────────────────────────────────────────────

export async function ensureZaloInboxTables(): Promise<void> {
  const db = getDb();
  await ensureZaloAccountSchema();
  
  // Bảng credentials — lưu thông tin đăng nhập Zalo
  await db.query(`
    CREATE TABLE IF NOT EXISTS zalo_credentials (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL UNIQUE,
      imei TEXT NOT NULL,
      cookies TEXT NOT NULL,
      user_agent TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      last_connected TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Bảng conversations — danh sách hội thoại
  await db.query(`
    CREATE TABLE IF NOT EXISTS zalo_conversations (
      id TEXT PRIMARY KEY,
      zalo_user_id TEXT,
      phone TEXT,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      last_message TEXT,
      last_message_at TIMESTAMPTZ DEFAULT NOW(),
      unread_count INTEGER DEFAULT 0,
      lead_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Schema đa tài khoản. Giữ bảng cũ nguyên vẹn để rollback an toàn.
  await db.query(`
    CREATE TABLE IF NOT EXISTS zalo_conversations_v2 (
      account_id TEXT NOT NULL REFERENCES zalo_personal_accounts(account_id) ON DELETE CASCADE,
      thread_id TEXT NOT NULL,
      zalo_user_id TEXT,
      phone TEXT,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      last_message TEXT,
      last_message_at TIMESTAMPTZ DEFAULT NOW(),
      unread_count INTEGER DEFAULT 0,
      lead_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (account_id, thread_id)
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_zalo_conversations_v2_time ON zalo_conversations_v2(account_id, last_message_at DESC)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_zalo_conversations_v2_phone ON zalo_conversations_v2(phone)`);

  // Chuẩn hóa bảng đơn tài khoản trước khi đọc nó để migrate. Một số bản cũ
  // chưa có zalo_user_id và cho phép phone là NOT NULL.
  await db.query(`ALTER TABLE zalo_conversations ADD COLUMN IF NOT EXISTS zalo_user_id TEXT`);
  await db.query(`ALTER TABLE zalo_conversations ALTER COLUMN phone DROP NOT NULL`);
  await db.query(`
    UPDATE zalo_conversations
    SET zalo_user_id = COALESCE(zalo_user_id, id),
        phone = CASE WHEN phone = id THEN NULL ELSE phone END
    WHERE zalo_user_id IS NULL OR phone = id
  `);

  // Gắn lịch sử đơn tài khoản vào tài khoản legacy đầu tiên đúng một lần.
  await db.query(`
    INSERT INTO zalo_conversations_v2
      (account_id, thread_id, zalo_user_id, phone, display_name, avatar_url, last_message,
       last_message_at, unread_count, lead_id, created_at, updated_at)
    SELECT a.account_id, c.id, COALESCE(c.zalo_user_id, c.id), c.phone, c.display_name,
           c.avatar_url, c.last_message, c.last_message_at, c.unread_count, c.lead_id,
           c.created_at, c.updated_at
    FROM zalo_conversations c
    CROSS JOIN LATERAL (
      SELECT account_id FROM zalo_personal_accounts ORDER BY created_at ASC LIMIT 1
    ) a
    ON CONFLICT (account_id, thread_id) DO NOTHING
  `);

  // Index để tìm conversation theo số điện thoại
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_zalo_conversations_phone 
    ON zalo_conversations(phone)
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_zalo_conversations_zalo_user_id
    ON zalo_conversations(zalo_user_id)
  `);

  // Index để join với leads
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_zalo_conversations_lead_id 
    ON zalo_conversations(lead_id)
  `);

  // Bảng messages — lưu tin nhắn
  await db.query(`
    CREATE TABLE IF NOT EXISTS zalo_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES zalo_conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      content TEXT NOT NULL,
      content_type TEXT DEFAULT 'text',
      attachments TEXT,
      is_self BOOLEAN DEFAULT FALSE,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Index để query tin nhắn theo conversation
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_zalo_messages_conversation_id 
    ON zalo_messages(conversation_id, created_at DESC)
  `);

  // Bảng phân quyền — nhân viên nào được truy cập inbox
  await db.query(`
    CREATE TABLE IF NOT EXISTS zalo_inbox_access (
      staff_id TEXT PRIMARY KEY,
      created_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// ─── Credentials CRUD ─────────────────────────────────────────────────────────

export async function saveZaloCredentials(creds: {
  phone: string;
  imei: string;
  cookies: string;
  userAgent: string;
}): Promise<ZaloCredentials> {
  const db = getDb();
  await ensureZaloInboxTables();
  const id = `zcred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.query(
    `INSERT INTO zalo_credentials (id, phone, imei, cookies, user_agent)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (phone) DO UPDATE SET
       imei = $3, cookies = $4, user_agent = $5, updated_at = NOW()`,
    [id, creds.phone, creds.imei, creds.cookies, creds.userAgent]
  );
  const res = await db.query(`SELECT * FROM zalo_credentials WHERE phone = $1`, [creds.phone]);
  return mapZaloCredentials(res.rows[0]);
}

export async function getActiveZaloCredentials(): Promise<ZaloCredentials | null> {
  const db = getDb();
  await ensureZaloInboxTables();
  const res = await db.query(`SELECT * FROM zalo_credentials WHERE is_active = TRUE LIMIT 1`);
  if (res.rows.length === 0) return null;
  return mapZaloCredentials(res.rows[0]);
}

export async function updateZaloLastConnected(phone: string): Promise<void> {
  const db = getDb();
  await db.query(
    `UPDATE zalo_credentials SET last_connected = NOW() WHERE phone = $1`,
    [phone]
  );
}

// ─── Conversations CRUD ───────────────────────────────────────────────────────

export async function upsertConversation(conv: {
  accountId?: string;
  id: string;
  zaloUserId?: string | null;
  phone?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string | number | Date | null;
  leadId?: string | null;
}): Promise<void> {
  const db = getDb();
  await ensureZaloInboxTables();
  const accountId = conv.accountId || await getDefaultAccountId();
  if (!accountId) throw new Error("Chưa có tài khoản Zalo để lưu hội thoại");
  await db.query(
    `INSERT INTO zalo_conversations_v2
     (account_id, thread_id, zalo_user_id, phone, display_name, avatar_url, last_message, last_message_at, lead_id, updated_at)
     VALUES ($1, $2, COALESCE(NULLIF($3, ''), $2), NULLIF($4, ''), $5, $6, $7, COALESCE($9::timestamptz, NOW()), $8, NOW())
     ON CONFLICT (account_id, thread_id) DO UPDATE SET
       zalo_user_id = COALESCE(NULLIF($3, ''), zalo_conversations_v2.zalo_user_id, $2),
       phone = COALESCE(NULLIF($4, ''), zalo_conversations_v2.phone),
       display_name = CASE
         WHEN $5 ~ '^[0-9]{8,}$' AND zalo_conversations_v2.display_name !~ '^[0-9]{8,}$'
           THEN zalo_conversations_v2.display_name
         ELSE $5
       END,
       avatar_url = COALESCE($6, zalo_conversations_v2.avatar_url),
       last_message = CASE
         WHEN COALESCE($9::timestamptz, NOW()) >= zalo_conversations_v2.last_message_at
           THEN COALESCE($7, zalo_conversations_v2.last_message)
         ELSE zalo_conversations_v2.last_message
       END,
       last_message_at = GREATEST(zalo_conversations_v2.last_message_at, COALESCE($9::timestamptz, NOW())),
       lead_id = COALESCE($8, zalo_conversations_v2.lead_id),
       updated_at = NOW()`,
    [
      accountId,
      conv.id,
      conv.zaloUserId || conv.id,
      conv.phone || null,
      conv.displayName,
      conv.avatarUrl || null,
      conv.lastMessage ?? null,
      conv.leadId || null,
      conv.lastMessageAt == null ? null : new Date(conv.lastMessageAt).toISOString(),
    ]
  );
}

export async function getConversationCount(accountId?: string | null): Promise<number> {
  const db = getDb();
  await ensureZaloInboxTables();
  const res = await db.query(
    `SELECT COUNT(*)::int AS count FROM zalo_conversations_v2 WHERE ($1::text IS NULL OR account_id = $1)`,
    [accountId || null],
  );
  return Number(res.rows[0]?.count || 0);
}

export async function getConversations(limit = 50, offset = 0, accountId?: string | null): Promise<ZaloConversation[]> {
  const db = getDb();
  await ensureZaloInboxTables();
  const res = await db.query(
    `SELECT * FROM zalo_conversations_v2
     WHERE ($3::text IS NULL OR account_id = $3)
     ORDER BY last_message_at DESC 
     LIMIT $1 OFFSET $2`,
    [limit, offset, accountId || null]
  );
  return res.rows.map(mapZaloConversation);
}

export async function getConversationById(id: string, accountId?: string): Promise<ZaloConversation | null> {
  const db = getDb();
  await ensureZaloInboxTables();
  const resolvedAccountId = accountId || await getDefaultAccountId();
  const res = await db.query(`SELECT * FROM zalo_conversations_v2 WHERE account_id = $1 AND thread_id = $2`, [resolvedAccountId, id]);
  if (res.rows.length === 0) return null;
  return mapZaloConversation(res.rows[0]);
}

export async function markConversationAsRead(id: string, accountId?: string): Promise<void> {
  const db = getDb();
  await db.query(`UPDATE zalo_conversations_v2 SET unread_count = 0 WHERE account_id = $1 AND thread_id = $2`, [accountId || await getDefaultAccountId(), id]);
}

export async function markConversationAsUnread(id: string, accountId?: string): Promise<void> {
  const db = getDb();
  await ensureZaloInboxTables();
  await db.query(
    `UPDATE zalo_conversations_v2
     SET unread_count = GREATEST(unread_count, 1), updated_at = NOW()
     WHERE account_id = $1 AND thread_id = $2`,
    [accountId || await getDefaultAccountId(), id]
  );
}

export async function incrementUnreadCount(conversationId: string, accountId?: string): Promise<void> {
  const db = getDb();
  await db.query(
    `UPDATE zalo_conversations_v2 SET unread_count = unread_count + 1 WHERE account_id = $1 AND thread_id = $2`,
    [accountId || await getDefaultAccountId(), conversationId]
  );
}

export async function linkConversationToLead(
  conversationId: string,
  leadId: string | null,
  phone?: string | null,
  accountId?: string,
): Promise<void> {
  const db = getDb();
  await ensureZaloInboxTables();
  await db.query(
    `UPDATE zalo_conversations_v2
     SET lead_id = $2,
         phone = CASE WHEN $2::text IS NULL THEN phone ELSE COALESCE($3, phone) END,
         updated_at = NOW()
     WHERE account_id = $4 AND thread_id = $1`,
    [conversationId, leadId, phone || null, accountId || await getDefaultAccountId()]
  );
}

// ─── Messages CRUD ────────────────────────────────────────────────────────────

export async function saveMessage(msg: {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  contentType?: string;
  attachments?: string | null;
  isSelf?: boolean;
}): Promise<void> {
  const db = getDb();
  await ensureZaloInboxTables();
  await db.query(
    `INSERT INTO zalo_messages 
     (id, conversation_id, sender_id, sender_name, content, content_type, attachments, is_self)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [
      msg.id,
      msg.conversationId,
      msg.senderId,
      msg.senderName,
      msg.content,
      msg.contentType || "text",
      msg.attachments || null,
      msg.isSelf || false,
    ]
  );
}

export async function getMessages(conversationId: string, limit = 100, offset = 0): Promise<ZaloMessage[]> {
  const db = getDb();
  await ensureZaloInboxTables();
  const res = await db.query(
    `SELECT * FROM (
       SELECT * FROM zalo_messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT $2 OFFSET $3
     ) recent
     ORDER BY created_at ASC, id ASC`,
    [conversationId, limit, offset]
  );
  return res.rows.map(mapZaloMessage);
}

export async function markMessagesAsRead(conversationId: string): Promise<void> {
  const db = getDb();
  await db.query(
    `UPDATE zalo_messages SET is_read = TRUE 
     WHERE conversation_id = $1 AND is_read = FALSE`,
    [conversationId]
  );
}

// ─── Access Control ───────────────────────────────────────────────────────────

export async function grantInboxAccess(staffId: string, createdBy: string): Promise<void> {
  const db = getDb();
  await ensureZaloInboxTables();
  await db.query(
    `INSERT INTO zalo_inbox_access (staff_id, created_by) 
     VALUES ($1, $2) 
     ON CONFLICT (staff_id) DO NOTHING`,
    [staffId, createdBy]
  );
}

export async function revokeInboxAccess(staffId: string): Promise<void> {
  const db = getDb();
  await db.query(`DELETE FROM zalo_inbox_access WHERE staff_id = $1`, [staffId]);
}

export async function getInboxAccessList(): Promise<ZaloInboxAccess[]> {
  const db = getDb();
  await ensureZaloInboxTables();
  const res = await db.query(`SELECT * FROM zalo_inbox_access ORDER BY created_at DESC`);
  return res.rows.map((r) => ({
    staffId: r.staff_id,
    createdBy: r.created_by,
    createdAt: r.created_at,
  }));
}

export async function hasInboxAccess(staffId: string): Promise<boolean> {
  const db = getDb();
  await ensureZaloInboxTables();
  const res = await db.query(`SELECT 1 FROM zalo_inbox_access WHERE staff_id = $1`, [staffId]);
  return res.rows.length > 0;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapZaloCredentials(row: any): ZaloCredentials {
  return {
    id: row.id,
    phone: row.phone,
    imei: row.imei,
    cookies: row.cookies,
    userAgent: row.user_agent,
    isActive: row.is_active,
    lastConnected: row.last_connected,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapZaloConversation(row: any): ZaloConversation {
  return {
    accountId: row.account_id,
    id: row.thread_id,
    zaloUserId: row.zalo_user_id || row.thread_id,
    phone: row.phone,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    unreadCount: row.unread_count,
    leadId: row.lead_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getDefaultAccountId(): Promise<string | null> {
  const accounts = await listZaloAccounts();
  return accounts.find(account => account.isActive)?.id || accounts[0]?.id || null;
}

function mapZaloMessage(row: any): ZaloMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    content: row.content,
    contentType: row.content_type,
    attachments: row.attachments,
    isSelf: row.is_self,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}
