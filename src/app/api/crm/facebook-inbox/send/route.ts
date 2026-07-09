import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getPages, loadFacebookSchedulerFromDb } from "@/lib/crm-facebook-scheduler-store";

export const dynamic = "force-dynamic";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

/**
 * POST /api/crm/facebook-inbox/send
 * Body: { pageId, recipientId, message, imageUrl? }
 * Gửi tin nhắn qua Facebook Send API
 */
export async function POST(request: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureLoaded();

  const body = await request.json();
  const { pageId, recipientId, message, imageUrl } = body;

  if (!pageId || !recipientId) {
    return NextResponse.json({ error: "Thiếu pageId hoặc recipientId" }, { status: 400 });
  }
  if (!message && !imageUrl) {
    return NextResponse.json({ error: "Thiếu nội dung tin nhắn" }, { status: 400 });
  }

  const pages = getPages();
  const page = pages.find(p => p.id === pageId);
  if (!page) {
    return NextResponse.json({ error: "Không tìm thấy Fanpage" }, { status: 404 });
  }

  try {
    const sendUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${page.pageAccessToken}`;

    let messagePayload: Record<string, unknown>;

    if (imageUrl) {
      // Gửi ảnh
      messagePayload = {
        attachment: {
          type: "image",
          payload: {
            url: imageUrl,
            is_reusable: true,
          },
        },
      };
    } else {
      // Gửi text
      messagePayload = { text: message };
    }

    const res = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: messagePayload,
        messaging_type: "RESPONSE",
      }),
    });

    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message, code: data.error.code }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      messageId: data.message_id,
      recipientId: data.recipient_id,
    });
  } catch (err) {
    console.error("[facebook-inbox] send error:", err);
    return NextResponse.json({ error: "Lỗi gửi tin nhắn" }, { status: 500 });
  }
}
