import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getPages, loadFacebookSchedulerFromDb } from "@/lib/crm-facebook-scheduler-store";

export const dynamic = "force-dynamic";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

/**
 * Thử take thread control để giành quyền kiểm soát thread từ app khác (ManyChat, v.v.)
 * Lỗi này xảy ra khi một app khác (như ManyChat, Chatfuel) đang giữ thread control.
 * Giải pháp: gọi take_thread_control trước khi gửi tin nhắn.
 */
async function takeThreadControl(fbPageId: string, recipientId: string, accessToken: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://graph.facebook.com/v19.0/${fbPageId}/take_thread_control`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        metadata: "SmartFurni CRM agent taking control",
        access_token: accessToken,
      }),
    });
    const data = await res.json();
    if (data.error) {
      // Lỗi take_thread_control không phải lỗi nghiêm trọng — vẫn thử gửi
      console.warn("[facebook-inbox] take_thread_control warning:", data.error.message);
      return { success: false, error: data.error.message };
    }
    return { success: true };
  } catch (err) {
    console.warn("[facebook-inbox] take_thread_control exception:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * POST /api/crm/facebook-inbox/send
 * Body: { pageId, recipientId, message, imageUrl? }
 * Gửi tin nhắn qua Facebook Send API.
 * Tự động take thread control nếu bị lỗi #10 (app khác đang kiểm soát thread).
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

  const sendUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${page.pageAccessToken}`;

  let messagePayload: Record<string, unknown>;
  if (imageUrl) {
    messagePayload = {
      attachment: {
        type: "image",
        payload: { url: imageUrl, is_reusable: true },
      },
    };
  } else {
    messagePayload = { text: message };
  }

  const sendBody = {
    recipient: { id: recipientId },
    message: messagePayload,
    messaging_type: "RESPONSE",
  };

  // ── Lần gửi đầu tiên ────────────────────────────────────────────────────────
  try {
    const res = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sendBody),
    });
    const data = await res.json();

    // Thành công ngay
    if (!data.error) {
      return NextResponse.json({
        success: true,
        messageId: data.message_id,
        recipientId: data.recipient_id,
      });
    }

    // Lỗi #10 — app khác đang kiểm soát thread → take thread control rồi thử lại
    if (data.error?.code === 10 || data.error?.error_subcode === 2018336 || data.error?.error_subcode === 2018171) {
      console.log("[facebook-inbox] Error #10 detected — attempting take_thread_control for recipient:", recipientId);

      // Thử take thread control
      await takeThreadControl(page.pageId, recipientId, page.pageAccessToken);

      // Chờ 500ms để Facebook xử lý
      await new Promise(resolve => setTimeout(resolve, 500));

      // Thử gửi lại
      const retryRes = await fetch(sendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendBody),
      });
      const retryData = await retryRes.json();

      if (retryData.error) {
        // Vẫn lỗi — trả về thông báo rõ ràng hơn
        const errMsg = retryData.error.code === 10
          ? `Không thể gửi tin nhắn: Một ứng dụng khác (ManyChat/Chatfuel) đang kiểm soát thread này. Vui lòng tắt bot đó hoặc đặt app SmartFurni làm Primary Receiver trong Facebook Page Settings.`
          : retryData.error.message;
        return NextResponse.json({ error: errMsg, code: retryData.error.code }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        messageId: retryData.message_id,
        recipientId: retryData.recipient_id,
        note: "Đã lấy lại quyền kiểm soát thread và gửi thành công",
      });
    }

    // Lỗi khác
    return NextResponse.json({ error: data.error.message, code: data.error.code }, { status: 400 });

  } catch (err) {
    console.error("[facebook-inbox] send error:", err);
    return NextResponse.json({ error: "Lỗi kết nối khi gửi tin nhắn" }, { status: 500 });
  }
}
