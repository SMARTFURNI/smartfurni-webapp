/**
 * POST /api/crm/zalo-inbox/send
 * Gửi tin nhắn qua Pancake API
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { sendPancakeMessage } from "@/lib/pancake-service";

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

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creds = await getActivePancakeCredentials();
  if (!creds) {
    return NextResponse.json({ error: "Chưa cấu hình Pancake API" }, { status: 400 });
  }

  const body = await req.json();
  const { conversationId, message } = body;

  if (!conversationId || !message) {
    return NextResponse.json({ error: "Thiếu conversationId hoặc message" }, { status: 400 });
  }

  try {
    const result = await sendPancakeMessage(
      creds.page_id,
      conversationId,
      creds.page_access_token,
      message
    );

    return NextResponse.json({
      success: true,
      message: "Đã gửi tin nhắn",
      data: result,
    });
  } catch (error: any) {
    console.error('Pancake send error:', error);
    return NextResponse.json({
      error: error.message || 'Lỗi gửi tin nhắn',
    }, { status: 500 });
  }
}
