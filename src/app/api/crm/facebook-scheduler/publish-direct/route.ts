import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { loadFacebookSchedulerFromDb, getPages, addPostLog, createPost, updatePost } from "@/lib/crm-facebook-scheduler-store";
import { v2 as cloudinary } from "cloudinary";

// Tăng timeout cho upload ảnh lớn (600 giây = 10 phút)
export const maxDuration = 600;
export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

/**
 * POST /api/crm/facebook-scheduler/publish-direct
 * Đăng bài lên Facebook ngay lập tức (không cần lên lịch)
 *
 * Nhận FormData:
 * - content: string (nội dung bài đăng)
 * - hashtags: string (hashtags cách nhau bằng dấu cách)
 * - pageIds: string (JSON array các page ID)
 * - linkUrl?: string
 * - images?: File[] (ảnh đính kèm từ file - upload lên Cloudinary)
 * - imageUrls?: string[] (URL ảnh đính kèm trực tiếp)
 * - videoIds?: string (JSON object: { pageId -> videoId } - video đã upload qua upload-video route)
 *
 * Luồng:
 * 1. Nếu có videoIds → video đã upload trước, chỉ cần lưu log
 * 2. Nếu có ảnh file → upload lên Cloudinary → lấy URL → đăng lên /photos
 * 3. Nếu chỉ có text → đăng lên /feed
 * 4. Lưu log vào DB
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
    const content = (formData.get("content") as string) || "";
    const hashtags = (formData.get("hashtags") as string) || "";
    const pageIdsRaw = (formData.get("pageIds") as string) || "[]";
    const linkUrl = (formData.get("linkUrl") as string) || "";
    const title = (formData.get("title") as string) || content.slice(0, 50) || "Bài đăng";

    // Parse videoIds (video đã được upload trước qua upload-video route)
    const videoIdsRaw = (formData.get("videoIds") as string) || "{}";
    let videoIds: Record<string, string> = {};
    try { videoIds = JSON.parse(videoIdsRaw); } catch { videoIds = {}; }
    const hasVideo = Object.keys(videoIds).length > 0;

    let pageIds: string[] = [];
    try { pageIds = JSON.parse(pageIdsRaw); } catch { pageIds = []; }

    if (!content.trim()) {
      return NextResponse.json({ error: "Thiếu nội dung bài đăng" }, { status: 400 });
    }
    if (pageIds.length === 0) {
      return NextResponse.json({ error: "Vui lòng chọn ít nhất 1 Fanpage" }, { status: 400 });
    }

    const pages = getPages();

    // Xây dựng message đầy đủ
    const hashtagList = hashtags.split(/\s+/).filter(h => h.trim()).map(h => h.startsWith("#") ? h : `#${h}`);
    const fullMessage = [content.trim(), hashtagList.join(" ")].filter(Boolean).join("\n\n");

    // ─── Xử lý ảnh (nếu có) ───────────────────────────────────────────────
    const imageFiles = formData.getAll("images") as File[];
    const clientImageUrls = formData.getAll("imageUrls") as string[];
    const imageUrls: string[] = [...clientImageUrls.filter(u => u && u.startsWith("http"))];

    for (const imageFile of imageFiles) {
      if (!imageFile || !imageFile.size) continue;
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "smartfurni/facebook-posts", resource_type: "image" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string });
          }
        );
        stream.end(buffer);
      });
      imageUrls.push(uploadResult.secure_url);
    }

    // ─── Kết quả đăng từng page ───────────────────────────────────────────
    const results: Array<{
      pageId: string;
      pageName: string;
      success: boolean;
      fbPostId?: string;
      error?: string;
    }> = [];

    for (const pageId of pageIds) {
      const page = pages.find(p => p.id === pageId && p.isActive);
      if (!page) {
        results.push({ pageId, pageName: "Unknown", success: false, error: "Page không tồn tại hoặc đã tắt" });
        continue;
      }

      try {
        if (hasVideo) {
          // ─── Video đã được upload trước qua upload-video route ────────────
          // Chỉ cần lưu log, không cần upload lại
          const videoId = videoIds[pageId];
          if (!videoId) {
            results.push({ pageId, pageName: page.pageName, success: false, error: "Không tìm thấy videoId cho page này" });
            continue;
          }
          results.push({ pageId, pageName: page.pageName, success: true, fbPostId: videoId });

        } else if (imageUrls.length === 0) {
          // ─── Chỉ text → đăng lên /feed ────────────────────────────────
          const body: Record<string, string> = {
            message: fullMessage,
            access_token: page.pageAccessToken,
          };
          if (linkUrl.trim()) body.link = linkUrl.trim();

          const res = await fetch(`https://graph.facebook.com/v19.0/${page.pageId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            results.push({ pageId, pageName: page.pageName, success: false, error: data.error?.message || `HTTP ${res.status}` });
          } else {
            results.push({ pageId, pageName: page.pageName, success: true, fbPostId: data.id });
          }

        } else if (imageUrls.length === 1) {
          // ─── 1 ảnh → đăng lên /photos ─────────────────────────────────
          const body: Record<string, unknown> = {
            url: imageUrls[0],
            message: fullMessage,
            published: true,
            access_token: page.pageAccessToken,
          };
          if (linkUrl.trim()) body.link = linkUrl.trim();

          const res = await fetch(`https://graph.facebook.com/v19.0/${page.pageId}/photos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (!res.ok || data.error) {
            results.push({ pageId, pageName: page.pageName, success: false, error: data.error?.message || `HTTP ${res.status}` });
          } else {
            results.push({ pageId, pageName: page.pageName, success: true, fbPostId: data.post_id || data.id });
          }

        } else {
          // ─── Nhiều ảnh → upload unpublished rồi post feed ─────────────
          const photoIds: string[] = [];
          let photoError: string | null = null;

          for (const imgUrl of imageUrls) {
            const photoRes = await fetch(`https://graph.facebook.com/v19.0/${page.pageId}/photos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: imgUrl,
                published: false,
                access_token: page.pageAccessToken,
              }),
            });
            const photoData = await photoRes.json();
            if (photoData.error || !photoData.id) {
              photoError = `Upload ảnh thất bại: ${photoData.error?.message || "unknown"}`;
              break;
            }
            photoIds.push(photoData.id);
          }

          if (photoError) {
            results.push({ pageId, pageName: page.pageName, success: false, error: photoError });
            continue;
          }

          const feedBody: Record<string, unknown> = {
            message: fullMessage,
            attached_media: photoIds.map(id => ({ media_fbid: id })),
            access_token: page.pageAccessToken,
          };
          if (linkUrl.trim()) feedBody.link = linkUrl.trim();

          const feedRes = await fetch(`https://graph.facebook.com/v19.0/${page.pageId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(feedBody),
          });
          const feedData = await feedRes.json();
          if (!feedRes.ok || feedData.error) {
            results.push({ pageId, pageName: page.pageName, success: false, error: feedData.error?.message || `HTTP ${feedRes.status}` });
          } else {
            results.push({ pageId, pageName: page.pageName, success: true, fbPostId: feedData.id });
          }
        }
      } catch (err) {
        results.push({ pageId, pageName: page.pageName, success: false, error: (err as Error).message });
      }
    }

    // ─── Lưu vào DB để tracking ───────────────────────────────────────────
    const anySuccess = results.some(r => r.success);
    const allSuccess = results.every(r => r.success);

    const post = await createPost({
      title,
      content: content.trim(),
      imageUrls,
      linkUrl: linkUrl.trim() || undefined,
      pageIds,
      scheduledAt: new Date().toISOString(),
      repeatType: "none",
      status: allSuccess ? "published" : anySuccess ? "published" : "failed",
      createdBy: "admin",
      createdByName: "Admin",
      tags: [],
      hashtags: hashtagList,
    });

    await updatePost(post.id, {
      status: allSuccess ? "published" : anySuccess ? "published" : "failed",
      publishedAt: new Date().toISOString(),
      facebookPostIds: Object.fromEntries(
        results.filter(r => r.fbPostId).map(r => [r.pageId, r.fbPostId!])
      ),
      errorMessage: results.filter(r => r.error).map(r => `${r.pageName}: ${r.error}`).join("; ") || undefined,
    });

    for (const result of results) {
      await addPostLog({
        postId: post.id,
        postTitle: title,
        pageId: result.pageId,
        pageName: result.pageName,
        action: result.success ? "published" : "failed",
        facebookPostId: result.fbPostId,
        errorMessage: result.error,
        executedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      ok: true,
      results,
      postId: post.id,
      successCount: results.filter(r => r.success).length,
      failCount: results.filter(r => !r.success).length,
    });

  } catch (error) {
    console.error("Publish direct error:", error);
    return NextResponse.json(
      { error: `Lỗi đăng bài: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
