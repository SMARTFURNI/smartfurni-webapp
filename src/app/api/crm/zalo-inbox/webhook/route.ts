/**
 * POST /api/crm/zalo-inbox/webhook
 * Nhận webhook events từ Pancake (tin nhắn mới, cập nhật conversation)
 * 
 * Đăng ký URL này trong Pancake:
 * https://smartfurni-webapp-production.up.railway.app/api/crm/zalo-inbox/webhook
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// ─── DB Schema ────────────────────────────────────────────────────────────────

async function ensurePancakeTables() {
  const db = getDb();
  await db.query(`
    CREATE TABLE IF NOT EXISTS pancake_conversations (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      customer_avatar TEXT,
      customer_id TEXT,
      snippet TEXT,
      unread_count INTEGER DEFAULT 0,
      tags TEXT[],
      raw_data JSONB,
      last_message_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_pancake_conversations_page_id 
    ON pancake_conversations(page_id, last_message_at DESC)
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS pancake_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      page_id TEXT NOT NULL,
      sender_id TEXT,
      sender_name TEXT,
      content TEXT,
      is_self BOOLEAN DEFAULT FALSE,
      attachments JSONB,
      raw_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_pancake_messages_conv_id 
    ON pancake_messages(conversation_id, created_at ASC)
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS pancake_webhook_events (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      event_type TEXT,
      page_id TEXT,
      conversation_id TEXT,
      message_id TEXT,
      payload JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// ─── SSE Broadcast ────────────────────────────────────────────────────────────

const sseClients = new Set<(data: string) => void>();

export function addSseClient(send: (data: string) => void) {
  sseClients.add(send);
  return () => sseClients.delete(send);
}

function broadcastToClients(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((send) => {
    try {
      send(payload);
    } catch {
      sseClients.delete(send);
    }
  });
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event_type, page_id, data } = body;
  const db = getDb();

  try { await ensurePancakeTables(); } catch (err) {
    console.error('[webhook] Failed to ensure tables:', err);
  }

  // Log webhook event
  try {
    const conversationId = data?.conversation?.id || null;
    const messageId = data?.message?.id || null;
    await db.query(
      `INSERT INTO pancake_webhook_events (event_type, page_id, conversation_id, message_id, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [event_type, page_id, conversationId, messageId, JSON.stringify(body)]
    );
  } catch (err) {
    console.error('[webhook] Failed to log event:', err);
  }

  // Xử lý event "messaging" — tin nhắn mới
  if (event_type === 'messaging' && data?.message) {
    const message = data.message;
    const conversation = data.conversation;
    const convId = conversation?.id || message.conversation_id;

    // Lưu/cập nhật conversation
    if (convId) {
      try {
        const customerName = conversation?.from?.name
          || conversation?.customers?.[0]?.name
          || message.from?.name
          || 'Khách hàng';
        const customerPhone = conversation?.from?.phone_number
          || conversation?.customers?.[0]?.phone || '';
        const customerAvatar = conversation?.from?.avatar_url
          || conversation?.customers?.[0]?.avatar_url || '';
        const customerId = conversation?.from?.id
          || conversation?.customers?.[0]?.id
          || message.from?.id || '';
        const snippet = message.original_message || message.message || message.text || '';

        await db.query(
          `INSERT INTO pancake_conversations 
           (id, page_id, customer_name, customer_phone, customer_avatar, customer_id, snippet, raw_data, last_message_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET
             customer_name = EXCLUDED.customer_name,
             customer_phone = EXCLUDED.customer_phone,
             customer_avatar = EXCLUDED.customer_avatar,
             snippet = EXCLUDED.snippet,
             raw_data = EXCLUDED.raw_data,
             last_message_at = NOW(),
             updated_at = NOW()`,
          [convId, page_id, customerName, customerPhone, customerAvatar, customerId, snippet, JSON.stringify(conversation || {})]
        );
      } catch (err) {
        console.error('[webhook] Failed to upsert conversation:', err);
      }
    }

    // Lưu message
    if (convId) {
      try {
        const msgId = message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const content = message.original_message || message.message || message.text || '';
        const senderName = message.from?.name || 'Khách hàng';
        const senderId = message.from?.id || '';
        const isSelf = message.from?.id === page_id || message.is_echo === true || message.sender_type === 'page';
        const attachments = message.attachments || [];

        await db.query(
          `INSERT INTO pancake_messages 
           (id, conversation_id, page_id, sender_id, sender_name, content, is_self, attachments, raw_data, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, NOW()))
           ON CONFLICT (id) DO NOTHING`,
          [
            msgId, convId, page_id, senderId, senderName, content,
            isSelf, JSON.stringify(attachments), JSON.stringify(message),
            message.inserted_at || message.created_at || null
          ]
        );
      } catch (err) {
        console.error('[webhook] Failed to save message:', err);
      }
    }

    // Broadcast real-time tới CRM clients
    broadcastToClients('new_message', {
      conversationId: convId,
      messageId: message.id,
      text: message.original_message || message.message || message.text,
      senderName: message.from?.name,
      senderId: message.from?.id,
      createdAt: message.inserted_at || new Date().toISOString(),
      pageId: page_id,
      snippet: message.original_message || message.message,
    });
  }

  // Xử lý event "subscription"
  if (event_type === 'subscription') {
    broadcastToClients('subscription_update', { page_id, data });
  }

  return NextResponse.json({ success: true });
}

// GET — verify webhook (Pancake gửi GET để xác nhận URL)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('hub.challenge');

  if (challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({
    status: 'ok',
    message: 'Pancake Webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
