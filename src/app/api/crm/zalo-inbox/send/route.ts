/**
 * POST /api/crm/zalo-inbox/send
 * Gửi tin nhắn qua Zalo OA API (openapi.zalo.me)
 * 
 * Pancake conversation ID format: pzl_u_{PAGE_ID}_{ZALO_USER_ID}
 * → Extract ZALO_USER_ID từ phần cuối để gửi qua Zalo OA API
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

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

/**
 * Extract Zalo user_id từ Pancake conversation ID
 * Format: pzl_u_{PAGE_ID}_{ZALO_USER_ID}
 * Ví dụ: pzl_u_857693204373519148_5319016649770749467 → 5319016649770749467
 */
function extractZaloUserId(conversationId: string): string | null {
  // Format: pzl_u_{pageId}_{userId}
  // pageId và userId đều là số, split bằng _ nhưng cần lấy phần cuối
  const match = conversationId.match(/^pzl_u_\d+_(\d+)$/);
  if (match) return match[1];
  
  // Fallback: lấy phần sau dấu _ cuối cùng
  const parts = conversationId.split("_");
  const last = parts[parts.length - 1];
  if (last && /^\d+$/.test(last)) return last;
  
  return null;
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { conversationId, message } = body;

  if (!conversationId || !message) {
    return NextResponse.json({ error: "Thiếu conversationId hoặc message" }, { status: 400 });
  }

  // Lấy Zalo access token
  const zaloToken = process.env.ZALO_ACCESS_TOKEN;
  if (!zaloToken) {
    return NextResponse.json(
      { error: "ZALO_ACCESS_TOKEN chưa được cấu hình trong Railway environment" },
      { status: 500 }
    );
  }

  // Extract Zalo user_id từ Pancake conversation ID
  const zaloUserId = extractZaloUserId(conversationId);
  if (!zaloUserId) {
    return NextResponse.json(
      { error: `Không thể extract Zalo user_id từ conversation ID: ${conversationId}` },
      { status: 400 }
    );
  }

  try {
    const zaloRes = await fetch("https://openapi.zalo.me/v2.0/oa/message/cs/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "access_token": zaloToken,
      },
      body: JSON.stringify({
        recipient: { user_id: zaloUserId },
        message: { text: message },
      }),
    });

    const zaloData = await zaloRes.json();

    if (zaloData.error !== 0) {
      console.error("[Zalo Inbox Send] Zalo API error:", zaloData);
      return NextResponse.json(
        { error: `Zalo API lỗi: ${zaloData.message || "Unknown error"} (code: ${zaloData.error})` },
        { status: 500 }
      );
    }

    console.log(`[Zalo Inbox Send] Sent to userId=${zaloUserId}, convId=${conversationId}`);
    return NextResponse.json({
      success: true,
      message: "Đã gửi tin nhắn",
      data: {
        messageId: zaloData.data?.message_id,
        zaloUserId,
      },
    });
  } catch (error: any) {
    console.error("[Zalo Inbox Send] Error:", error);
    return NextResponse.json(
      { error: error.message || "Lỗi kết nối Zalo API" },
      { status: 500 }
    );
  }
}
