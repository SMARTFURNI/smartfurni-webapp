import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getPages, loadFacebookSchedulerFromDb } from "@/lib/crm-facebook-scheduler-store";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

// 10 phút timeout cho upload video lớn
export const maxDuration = 600;

/**
 * POST /api/crm/facebook-scheduler/upload-video
 * Upload video từ máy tính lên Cloudinary, rồi đăng lên Facebook qua file_url
 *
 * Body: raw binary video bytes (không dùng FormData để tránh giới hạn body size của Next.js)
 * Query params:
 *   - pageId: string (ID của FacebookPage trong DB)
 *   - fileName: string (tên file gốc)
 *
 * Response: { videoId: string, videoUrl: string, pageId: string }
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

    // Đọc raw binary từ request body (không bị giới hạn 4MB như FormData)
    const videoArrayBuffer = await request.arrayBuffer();
    if (!videoArrayBuffer || videoArrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: "Không nhận được dữ liệu video" }, { status: 400 });
    }

    // Validate file size (tối đa 200MB)
    const maxSize = 200 * 1024 * 1024;
    if (videoArrayBuffer.byteLength > maxSize) {
      return NextResponse.json({ error: "Video quá lớn. Tối đa 200MB" }, { status: 400 });
    }

    // ─── Bước 1: Upload lên Cloudinary ────────────────────────────────────────
    const buffer = Buffer.from(videoArrayBuffer);

    const uploadResult = await new Promise<{ secure_url: string; public_id: string; duration?: number }>(
      (resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "smartfurni/facebook-videos",
            resource_type: "video",
            // Không transform, giữ nguyên chất lượng
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string; public_id: string; duration?: number });
          }
        );
        uploadStream.end(buffer);
      }
    );

    const videoUrl = uploadResult.secure_url;

    // ─── Bước 2: Đăng video lên Facebook qua file_url ────────────────────────
    // Giống hệt cách đăng ảnh: Facebook tải video từ URL Cloudinary
    const fbRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url: videoUrl,
        published: false, // Không publish ngay, chờ đến giờ đăng
        access_token: accessToken,
      }),
    });

    const fbData = await fbRes.json();
    if (fbData.error || !fbData.id) {
      console.error("FB video upload via URL error:", fbData);
      return NextResponse.json(
        { error: `Không thể upload video lên Facebook: ${fbData.error?.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    const videoId = fbData.id;

    return NextResponse.json({
      videoId,
      videoUrl, // URL Cloudinary (để hiển thị preview)
      pageId: fbPageId,
      fileName,
      fileSizeMB: (videoArrayBuffer.byteLength / 1024 / 1024).toFixed(1),
    });

  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json(
      { error: `Lỗi upload: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
