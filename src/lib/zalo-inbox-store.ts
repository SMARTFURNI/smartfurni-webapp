/**
 * zalo-inbox-store.ts
 * Database layer cho Zalo Personal Shared Inbox
 */
import { getDb } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZaloConversation {
  id: string;                    // thread_id từ Zalo API
  phone: string;                 // số điện thoại người nhắn
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
      phone TEXT NOT NULL,
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

  // Index để tìm conversation theo số điện thoại
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_zalo_conversations_phone 
    ON zalo_conversations(phone)
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
  id: string;
  phone: string;
  displayName: string;
  avatarUrl?: string | null;
  lastMessage?: string | null;
  leadId?: string | null;
}): Promise<void> {
  const db = getDb();
  await ensureZaloInboxTables();
  await db.query(
    `INSERT INTO zalo_conversations 
     (id, phone, display_name, avatar_url, last_message, last_message_at, lead_id, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6, NOW())
     ON CONFLICT (id) DO UPDATE SET
       display_name = $3, avatar_url = $4, last_message = $5, 
       last_message_at = NOW(), lead_id = $6, updated_at = NOW()`,
    [conv.id, conv.phone, conv.displayName, conv.avatarUrl || null, conv.lastMessage || null, conv.leadId || null]
  );
}

export async function getConversations(limit = 50, offset = 0): Promise<ZaloConversation[]> {
  const db = getDb();
  await ensureZaloInboxTables();
  const res = await db.query(
    `SELECT * FROM zalo_conversations 
     ORDER BY last_message_at DESC 
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return res.rows.map(mapZaloConversation);
}

export async function getConversationById(id: string): Promise<ZaloConversation | null> {
  const db = getDb();
  await ensureZaloInboxTables();
  const res = await db.query(`SELECT * FROM zalo_conversations WHERE id = $1`, [id]);
  if (res.rows.length === 0) return null;
  return mapZaloConversation(res.rows[0]);
}

export async function markConversationAsRead(id: string): Promise<void> {
  const db = getDb();
  await db.query(`UPDATE zalo_conversations SET unread_count = 0 WHERE id = $1`, [id]);
}

export async function incrementUnreadCount(conversationId: string): Promise<void> {
  const db = getDb();
  await db.query(
    `UPDATE zalo_conversations SET unread_count = unread_count + 1 WHERE id = $1`,
    [conversationId]
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
    `SELECT * FROM zalo_messages 
     WHERE conversation_id = $1 
     ORDER BY created_at ASC 
     LIMIT $2 OFFSET $3`,
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
    id: row.id,
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

function mapZaloMessage(row: any): ZaloMessage {
  // Parse attachments từ JSON string thành array
  let attachments: string | null = row.attachments;
  // Giữ nguyên string để client parse (tương thích với ZaloInboxClient)
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderName: row.sender_name,
    content: row.content,
    contentType: row.content_type,
    attachments,
    isSelf: row.is_self,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}
