import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getPages, loadFacebookSchedulerFromDb } from "@/lib/crm-facebook-scheduler-store";
import { getPancakeConfigForPage, sendViaPancake } from "@/lib/pancake-integration";

export const dynamic = "force-dynamic";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

async function sendViaFacebook(params: {
  accessToken: string;
  recipientId: string;
  message?: string;
  imageUrl?: string;
}): Promise<{ success: boolean; messageId?: string; recipientId?: string; error?: string; code?: number }> {
  const { accessToken, recipientId, message, imageUrl } = params;
  const sendUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`;

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

  try {
    const res = await fetch(sendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sendBody),
    });
    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.error.message, code: data.error.code };
    }
    return { success: true, messageId: data.message_id, recipientId: data.recipient_id };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * POST /api/crm/facebook-inbox/send
 * Body: { pageId, recipientId, message, imageUrl? }
 *
 * Luồng:
 * 1. Thử gửi qua Facebook API trực tiếp
 * 2. Nếu lỗi #10 (Pancake đang giữ thread):
 *    a. Lấy Pancake config cho fanpage này
 *    b. Gửi qua Pancake API (Pancake là thread owner)
 *    c. Nếu chưa cấu hình → trả về lỗi hướng dẫn cấu hình
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

  // ── Bước 1: Thử gửi qua Facebook API ──────────────────────────────────────
  const fbResult = await sendViaFacebook({
    accessToken: page.pageAccessToken,
    recipientId,
    message,
    imageUrl,
  });

  if (fbResult.success) {
    return NextResponse.json({
      success: true,
      messageId: fbResult.messageId,
      recipientId: fbResult.recipientId,
      via: "facebook",
    });
  }

  // ── Bước 2: Xử lý lỗi #10 — Pancake đang kiểm soát thread ────────────────
  const isThreadControlError =
    fbResult.code === 10 ||
    (fbResult.error && (
      fbResult.error.toLowerCase().includes("thread") ||
      fbResult.error.includes("2018336") ||
      fbResult.error.includes("2018171") ||
      fbResult.error.toLowerCase().includes("controlling") ||
      fbResult.error.toLowerCase().includes("another app")
    ));

  if (isThreadControlError) {
    console.log(`[facebook-inbox] Lỗi #10 cho recipient ${recipientId} — thử fallback qua Pancake API`);

    const pancakeConfig = await getPancakeConfigForPage(page.pageId);

    if (pancakeConfig && pancakeConfig.pancakePageId && pancakeConfig.pageAccessToken) {
      const pancakeResult = await sendViaPancake({
        pancakePageId: pancakeConfig.pancakePageId,
        pancakePageAccessToken: pancakeConfig.pageAccessToken,
        recipientPsid: recipientId,
        message: message || "",
      });

      if (pancakeResult.success) {
        return NextResponse.json({
          success: true,
          messageId: pancakeResult.messageId,
          via: "pancake",
          note: "Tin nhắn được gửi qua Pancake API",
        });
      }

      return NextResponse.json({
        error: `Không thể gửi: Facebook lỗi #10 (Pancake đang kiểm soát thread). Pancake cũng thất bại: ${pancakeResult.error}`,
        code: 10,
        via: "pancake_failed",
      }, { status: 400 });
    }

    // Chưa cấu hình Pancake
    return NextResponse.json({
      error: "Pancake đang kiểm soát thread này. Vui lòng cấu hình Pancake API trong ⚙️ Settings để tự động gửi qua Pancake.",
      code: 10,
      needsPancakeConfig: true,
    }, { status: 400 });
  }

  // ── Bước 3: Lỗi khác ──────────────────────────────────────────────────────
  return NextResponse.json({
    error: fbResult.error || "Lỗi không xác định khi gửi tin nhắn",
    code: fbResult.code,
  }, { status: 400 });
}
