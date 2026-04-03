/**
 * POST /api/crm/zalo-inbox/conversations/[id]/read
 * Đánh dấu conversation đã đọc qua Pancake API
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { markConversationAsRead } from "@/lib/pancake-service";

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

export async function POST(
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
    await markConversationAsRead(
      creds.page_id,
      conversationId,
      creds.page_access_token
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Pancake API error:', error);
    return NextResponse.json({
      error: error.message || 'Lỗi đánh dấu đã đọc',
    }, { status: 500 });
  }
}
