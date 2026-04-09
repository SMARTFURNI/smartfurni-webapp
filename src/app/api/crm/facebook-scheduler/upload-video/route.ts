import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getPages, loadFacebookSchedulerFromDb } from "@/lib/crm-facebook-scheduler-store";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

// 10 phút timeout cho upload video lớn
export const maxDuration = 600;

/**
 * POST /api/crm/facebook-scheduler/upload-video
 * Upload video từ máy tính trực tiếp lên Facebook bằng Resumable Upload API
 * Video được publish ngay lập tức (published=true trong finish phase)
 *
 * Body: raw binary video bytes
 * Query params:
 *   - pageId: string (ID của FacebookPage trong DB)
 *   - fileName: string (tên file gốc)
 *   - description: string (nội dung bài đăng)
 *
 * Response: { videoId: string, pageId: string }
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
    const description = searchParams.get("description") || "";

    if (!pageId) {
      return NextResponse.json({ error: "Thiếu pageId" }, { status: 400 });
    }

    // Tìm page access token
    const pages = getPages();
    const page = pages.find(p => p.id === pageId || p.pageId === pageId);
    if (!page) {
      return NextResponse.json({ error: "Không tìm thấy Fanpage" }, { status: 404 });
    }

    const accessToken = page.pageAccessToken;
    const fbPageId = page.pageId;

    // Đọc raw binary từ request body
    const videoArrayBuffer = await request.arrayBuffer();
    if (!videoArrayBuffer || videoArrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: "Không nhận được dữ liệu video" }, { status: 400 });
    }

    const fileSize = videoArrayBuffer.byteLength;

    // Validate file size (tối đa 200MB)
    const maxSize = 200 * 1024 * 1024;
    if (fileSize > maxSize) {
      return NextResponse.json({ error: "Video quá lớn. Tối đa 200MB" }, { status: 400 });
    }

    // ─── Bước 1: Khởi tạo Resumable Upload Session ───────────────────────────
    const initRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_phase: "start",
        file_size: fileSize,
        access_token: accessToken,
      }),
    });

    const initData = await initRes.json();
    if (initData.error || !initData.upload_session_id) {
      return NextResponse.json(
        { error: `Không thể khởi tạo upload: ${initData.error?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    const { upload_session_id, video_id: videoIdFromInit } = initData;
    let currentStart = parseInt(initData.start_offset);
    let currentEnd = parseInt(initData.end_offset);

    // ─── Bước 2: Upload video theo chunks ────────────────────────────────────
    while (currentStart < fileSize) {
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
        return NextResponse.json(
          { error: `Upload chunk thất bại: ${chunkData.error?.message || "Unknown error"}` },
          { status: 500 }
        );
      }

      currentStart = parseInt(chunkData.start_offset);
      currentEnd = parseInt(chunkData.end_offset);
      if (currentStart >= fileSize) break;
    }

    // ─── Bước 3: Finish với published=true và description ────────────────────
    // Đây là cách duy nhất hoạt động: publish ngay trong finish phase
    const finishRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_phase: "finish",
        upload_session_id,
        access_token: accessToken,
        published: true,
        description: description || fileName.replace(/\.[^.]+$/, ""),
        title: fileName.replace(/\.[^.]+$/, ""),
      }),
    });

    const finishData = await finishRes.json();
    if (finishData.error) {
      return NextResponse.json(
        { error: `Hoàn tất upload thất bại: ${finishData.error?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // video_id từ init phase, finish trả về { success: true }
    const videoId = finishData.id || finishData.video_id || videoIdFromInit;
    if (!videoId) {
      return NextResponse.json({ error: "Không nhận được video ID từ Facebook" }, { status: 500 });
    }

    return NextResponse.json({
      videoId,
      pageId: fbPageId,
      fileName,
      fileSizeMB: (fileSize / 1024 / 1024).toFixed(1),
      published: true,
    });

  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      { error: `Lỗi upload: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
