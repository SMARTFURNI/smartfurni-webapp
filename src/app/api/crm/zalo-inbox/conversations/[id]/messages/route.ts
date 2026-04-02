/**
 * GET /api/crm/zalo-inbox/conversations/[id]/messages
 * Lấy tin nhắn của conversation từ Pancake API
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { getPancakeMessages } from "@/lib/pancake-service";

async function getActivePancakeCredentials() {
  const db = getDb();
  try {
    const result = await db.query(
      `SELECT page_id, page_access_token FROM pancake_credentials WHERE is_active = TRUE LIMIT 1`
    );
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getCrmSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creds = await getActivePancakeCredentials();
  if (!creds) {
    return NextResponse.json({ error: "Chưa cấu hình Pancake API" }, { status: 400 });
  }

  const conversationId = params.id;

  try {
    const messages = await getPancakeMessages(
      creds.page_id,
      conversationId,
      creds.page_access_token
    );

    // Transform to frontend format
    const transformed = messages.map((msg) => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      content: msg.original_message || msg.message,
      senderId: msg.from.id,
      senderName: msg.from.name,
      isSelf: msg.from.id === creds.page_id,
      createdAt: msg.inserted_at,
      attachments: msg.attachments || [],
      type: msg.type,
    }));

    return NextResponse.json({
      messages: transformed,
      total: transformed.length,
    });
  } catch (error: any) {
    console.error('Pancake API error:', error);
    return NextResponse.json({
      error: error.message || 'Lỗi lấy tin nhắn',
    }, { status: 500 });
  }
}
