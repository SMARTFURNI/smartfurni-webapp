import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { dbGetSetting } from "@/lib/db-store";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface TikTokSession {
  sessionId: string;
  msToken: string;
  note: string;
  savedAt: string;
}

/**
 * POST /api/crm/tiktok/post
 *
 * action = "init_upload"
 *   Khởi tạo upload session qua TikTok web API (dùng sessionid cookie)
 *   → trả về { uploadId, uploadUrl } để browser upload video trực tiếp
 *
 * action = "confirm_publish"
 *   Xác nhận đăng bài sau khi browser đã upload video xong
 *   → trả về { ok, shareId }
 */
export async function POST(request: NextRequest) {
  try {
    await requireCrmAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await dbGetSetting<TikTokSession>("tiktok_session");
  if (!session || !session.sessionId) {
    return NextResponse.json({ error: "TikTok chưa được kết nối. Vui lòng nhập Session ID." }, { status: 401 });
  }

  const { sessionId, msToken } = session;

  // Cookie header dùng cho mọi request TikTok
  const cookieHeader = `sessionid=${sessionId}${msToken ? `; msToken=${msToken}` : ""}`;

  const body = await request.json();
  const { action } = body;

  // ── Bước 1: Khởi tạo upload session ─────────────────────────────────────────
  if (action === "init_upload") {
    const { fileSize } = body;

    // Lấy upload URL từ TikTok web API
    const res = await fetch("https://www.tiktok.com/api/upload/video/init/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookieHeader,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://www.tiktok.com/upload",
        "Origin": "https://www.tiktok.com",
      },
      body: JSON.stringify({
        file_size: fileSize,
        upload_type: "UPLOAD_TYPE_NORMAL",
      }),
    });

    const data = await res.json();
    console.log("[TikTok init_upload]", JSON.stringify(data));

    if (data.status_code !== 0 && data.status_code !== undefined) {
      return NextResponse.json({
        ok: false,
        error: data.status_msg || `Lỗi TikTok: ${data.status_code}`,
        raw: data,
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      uploadId: data.upload_id || data.data?.upload_id,
      uploadUrl: data.upload_url || data.data?.upload_url,
      raw: data,
    });
  }

  // ── Bước 2: Xác nhận đăng bài ────────────────────────────────────────────────
  if (action === "confirm_publish") {
    const {
      uploadId, title, privacyLevel,
      disableComment, disableDuet, disableStitch,
    } = body;

    const res = await fetch("https://www.tiktok.com/api/upload/video/publish/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookieHeader,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://www.tiktok.com/upload",
        "Origin": "https://www.tiktok.com",
      },
      body: JSON.stringify({
        upload_id: uploadId,
        text: title || "",
        privacy_level: privacyLevel || 0, // 0=public, 1=friends, 2=private
        disable_comment: disableComment ? 1 : 0,
        disable_duet: disableDuet ? 1 : 0,
        disable_stitch: disableStitch ? 1 : 0,
      }),
    });

    const data = await res.json();
    console.log("[TikTok confirm_publish]", JSON.stringify(data));

    if (data.status_code !== 0 && data.status_code !== undefined) {
      return NextResponse.json({
        ok: false,
        error: data.status_msg || `Lỗi TikTok: ${data.status_code}`,
        raw: data,
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      shareId: data.share_id || data.data?.share_id,
    });
  }

  return NextResponse.json({ error: "Action không hợp lệ" }, { status: 400 });
}
