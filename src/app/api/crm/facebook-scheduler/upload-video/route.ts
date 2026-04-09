import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getFacebookPages, loadFacebookSchedulerFromDb } from "@/lib/crm-facebook-scheduler-store";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

// Tăng giới hạn body size cho route này
export const maxDuration = 300; // 5 phút timeout

/**
 * POST /api/crm/facebook-scheduler/upload-video
 * Upload video từ máy tính lên Facebook sử dụng Resumable Upload API
 * 
 * Body: FormData với:
 *   - file: File (video MP4/MOV, tối đa 200MB)
 *   - pageId: string (ID của FacebookPage trong DB)
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
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const pageId = formData.get("pageId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Không có file video" }, { status: 400 });
    }

    if (!pageId) {
      return NextResponse.json({ error: "Thiếu pageId" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/mpeg", "video/webm"];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|mpeg|webm)$/i)) {
      return NextResponse.json({ error: "Chỉ hỗ trợ video MP4, MOV, AVI, MPEG, WebM" }, { status: 400 });
    }

    // Validate file size (tối đa 200MB)
    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: "Video quá lớn. Tối đa 200MB" }, { status: 400 });
    }

    // Tìm page access token
    const pages = getFacebookPages();
    const page = pages.find(p => p.id === pageId || p.pageId === pageId);
    if (!page) {
      return NextResponse.json({ error: "Không tìm thấy Fanpage" }, { status: 404 });
    }

    const accessToken = page.pageAccessToken;
    const fbPageId = page.pageId;
    const fileSize = file.size;

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
      console.error("FB video upload init error:", initData);
      return NextResponse.json(
        { error: `Không thể khởi tạo upload: ${initData.error?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    const { upload_session_id, start_offset, end_offset } = initData;

    // ─── Bước 2: Upload video theo chunks ────────────────────────────────────
    const videoBytes = await file.arrayBuffer();
    let currentStart = parseInt(start_offset);
    let currentEnd = parseInt(end_offset);

    while (currentStart < fileSize) {
      const chunk = videoBytes.slice(currentStart, currentEnd);
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

      // Nếu start_offset = end_offset = file_size thì đã upload xong
      if (currentStart >= fileSize) break;
    }

    // ─── Bước 3: Hoàn tất upload (finish phase) ──────────────────────────────
    const finishRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_phase: "finish",
        upload_session_id,
        access_token: accessToken,
        // Không publish ngay, chỉ upload để lấy video_id
        published: false,
        title: file.name.replace(/\.[^.]+$/, ""),
      }),
    });

    const finishData = await finishRes.json();
    if (finishData.error) {
      console.error("FB video upload finish error:", finishData);
      return NextResponse.json(
        { error: `Hoàn tất upload thất bại: ${finishData.error?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    const videoId = finishData.video_id || finishData.id;
    if (!videoId) {
      return NextResponse.json({ error: "Không nhận được video ID từ Facebook" }, { status: 500 });
    }

    return NextResponse.json({
      videoId,
      pageId: fbPageId,
      fileName: file.name,
      fileSizeMB: (fileSize / 1024 / 1024).toFixed(1),
    });

  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      { error: `Lỗi upload: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
