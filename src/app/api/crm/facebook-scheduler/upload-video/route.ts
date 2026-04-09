import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getPages, loadFacebookSchedulerFromDb } from "@/lib/crm-facebook-scheduler-store";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

// 5 phút timeout cho upload video lớn
export const maxDuration = 300;

/**
 * POST /api/crm/facebook-scheduler/upload-video?pageId=xxx&fileName=xxx&fileSize=xxx
 * Upload video từ máy tính lên Facebook sử dụng Resumable Upload API
 *
 * Body: raw binary video bytes (không dùng FormData để tránh giới hạn 4MB của Next.js)
 * Query params:
 *   - pageId: string (ID của FacebookPage trong DB)
 *   - fileName: string (tên file gốc)
 *   - fileSize: number (kích thước file bytes)
 *   - publishNow: "true" | "false" (có publish ngay không, mặc định false)
 *   - description: string (nội dung bài đăng, dùng khi publishNow=true)
 *
 * Response: { videoId: string, pageId: string, published: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    await requireCrmAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureLoaded();

  try {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get("pageId");
    const fileName = searchParams.get("fileName") || "video.mp4";
    const fileSizeParam = searchParams.get("fileSize");
    const publishNow = searchParams.get("publishNow") === "true";
    const description = searchParams.get("description") || "";

    if (!pageId) {
      return NextResponse.json({ error: "Thiếu pageId" }, { status: 400 });
    }

    if (!fileSizeParam) {
      return NextResponse.json({ error: "Thiếu fileSize" }, { status: 400 });
    }

    const fileSize = parseInt(fileSizeParam);
    if (isNaN(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "fileSize không hợp lệ" }, { status: 400 });
    }

    // Validate file size (tối đa 200MB)
    const maxSize = 200 * 1024 * 1024;
    if (fileSize > maxSize) {
      return NextResponse.json({ error: "Video quá lớn. Tối đa 200MB" }, { status: 400 });
    }

    // Tìm page access token
    const pages = getPages();
    const page = pages.find(p => p.id === pageId || p.pageId === pageId);
    if (!page) {
      return NextResponse.json({ error: "Không tìm thấy Fanpage" }, { status: 404 });
    }

    const accessToken = page.pageAccessToken;
    const fbPageId = page.pageId;

    // Đọc raw binary từ request body (không bị giới hạn 4MB như FormData)
    const videoArrayBuffer = await request.arrayBuffer();
    if (!videoArrayBuffer || videoArrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: "Không nhận được dữ liệu video" }, { status: 400 });
    }

    const actualSize = videoArrayBuffer.byteLength;

    // ─── Bước 1: Khởi tạo Resumable Upload Session ───────────────────────────
    const initRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_phase: "start",
        file_size: actualSize,
        access_token: accessToken,
      }),
    });

    const initData = await initRes.json();
    if (initData.error || !initData.upload_session_id) {
      console.error("FB video upload init error:", initData);
      return NextResponse.json(
        { error: `Không thể khởi tạo upload: ${initData.error?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    const { upload_session_id, start_offset, end_offset } = initData;
    // video_id được trả về từ init phase
    const videoIdFromInit = initData.video_id as string;

    // ─── Bước 2: Upload video theo chunks ────────────────────────────────────
    let currentStart = parseInt(start_offset);
    let currentEnd = parseInt(end_offset);

    while (currentStart < actualSize) {
      const chunk = videoArrayBuffer.slice(currentStart, currentEnd);
      const chunkBlob = new Blob([chunk], { type: "application/octet-stream" });

      const chunkFormData = new FormData();
      chunkFormData.append("upload_phase", "transfer");
      chunkFormData.append("upload_session_id", upload_session_id);
      chunkFormData.append("start_offset", currentStart.toString());
      chunkFormData.append("video_file_chunk", chunkBlob, "chunk");
      chunkFormData.append("access_token", accessToken);

      const chunkRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/videos`, {
        method: "POST",
        body: chunkFormData,
      });

      const chunkData = await chunkRes.json();
      if (chunkData.error) {
        console.error("FB video chunk upload error:", chunkData);
        return NextResponse.json(
          { error: `Upload chunk thất bại: ${chunkData.error?.message || "Unknown error"}` },
          { status: 500 }
        );
      }

      // Cập nhật offset cho chunk tiếp theo
      currentStart = parseInt(chunkData.start_offset);
      currentEnd = parseInt(chunkData.end_offset);

      if (currentStart >= actualSize) break;
    }

    // ─── Bước 3: Hoàn tất upload (finish phase) ──────────────────────────────
    // Nếu publishNow=true: publish ngay với description trong finish phase
    // Nếu publishNow=false: chỉ upload, không publish (dùng cho đăng lịch)
    const finishBody: Record<string, unknown> = {
      upload_phase: "finish",
      upload_session_id,
      access_token: accessToken,
      published: publishNow,
      title: fileName.replace(/\.[^.]+$/, ""),
    };

    if (publishNow && description) {
      finishBody.description = description;
    }

    const finishRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finishBody),
    });

    const finishData = await finishRes.json();
    if (finishData.error) {
      console.error("FB video upload finish error:", finishData);
      return NextResponse.json(
        { error: `Hoàn tất upload thất bại: ${finishData.error?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // Facebook trả về { success: true } ở finish phase
    // video_id đã có từ init phase
    const videoId = finishData.video_id || finishData.id || videoIdFromInit;
    if (!videoId) {
      return NextResponse.json({ error: "Không nhận được video ID từ Facebook" }, { status: 500 });
    }

    return NextResponse.json({
      videoId,
      uploadSessionId: publishNow ? undefined : upload_session_id, // trả về session_id để dùng khi publish lịch
      pageId: fbPageId,
      fileName,
      fileSizeMB: (actualSize / 1024 / 1024).toFixed(1),
      published: publishNow,
    });

  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      { error: `Lỗi upload: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
