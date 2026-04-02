/**
 * GET /api/crm/zalo-inbox/conversations/[id]/messages
 * Lấy tin nhắn của conversation từ Pancake API (hoặc mock data)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { getPancakeMessages } from "@/lib/pancake-service";
import { getMessagesMock } from "@/lib/pancake-service-mock";

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

  const conversationId = params.id;
  const creds = await getActivePancakeCredentials();

  // Dùng mock data nếu chưa có credentials
  if (!creds) {
    const mockMessages = await getMessagesMock(conversationId);
    const transformed = mockMessages.map((msg) => ({
      id: msg.id,
      conversationId,
      content: msg.text,
      senderName: msg.sender === 'page' ? 'Nội Thất SmartFurni' : msg.sender,
      isSelf: msg.sender === 'page',
      createdAt: msg.created_at,
      attachments: msg.attachments || [],
    }));

    return NextResponse.json({
      messages: transformed,
      total: transformed.length,
      isMock: true,
    });
  }

  try {
    const messages = await getPancakeMessages(
      creds.page_id,
      conversationId,
      creds.page_access_token
    );

    // Transform to frontend format
    const transformed = messages.map((msg: any) => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      content: msg.original_message || msg.message || msg.text || '',
      senderName: msg.from?.name || msg.sender || 'Khách hàng',
      isSelf: msg.from?.id === creds.page_id || msg.sender === 'page',
      createdAt: msg.inserted_at || msg.created_at,
      attachments: msg.attachments || [],
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
