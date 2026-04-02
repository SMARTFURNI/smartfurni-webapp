/**
 * POST /api/crm/zalo-inbox/webhook
 * Nhận webhook events từ Pancake (tin nhắn mới, cập nhật conversation)
 * 
 * Cần đăng ký URL này với Pancake support:
 * https://your-domain.railway.app/api/crm/zalo-inbox/webhook
 */
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Broadcast SSE event tới tất cả clients đang kết nối
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

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event_type, page_id, data } = body;

  // Lưu webhook event vào database để debug
  const db = getDb();
  try {
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

    const conversationId = data?.conversation?.id || null;
    const messageId = data?.message?.id || null;

    await db.query(
      `INSERT INTO pancake_webhook_events (event_type, page_id, conversation_id, message_id, payload)
       VALUES ($1, $2, $3, $4, $5)`,
      [event_type, page_id, conversationId, messageId, JSON.stringify(body)]
    );
  } catch (err) {
    console.error('Failed to save webhook event:', err);
  }

  // Xử lý event "messaging" — tin nhắn mới
  if (event_type === 'messaging' && data?.message) {
    const message = data.message;
    const conversation = data.conversation;

    // Broadcast real-time tới CRM clients
    broadcastToClients('new_message', {
      conversationId: conversation?.id,
      messageId: message.id,
      text: message.original_message || message.message,
      senderName: message.from?.name,
      senderId: message.from?.id,
      createdAt: message.inserted_at,
      pageId: page_id,
      snippet: conversation?.snippet,
    });
  }

  // Xử lý event "subscription" — cập nhật subscription
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
