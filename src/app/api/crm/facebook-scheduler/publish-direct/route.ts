import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { loadFacebookSchedulerFromDb, getPages, addPostLog, createPost, updatePost } from "@/lib/crm-facebook-scheduler-store";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

/**
 * POST /api/crm/facebook-scheduler/publish-direct
 * Đăng bài lên Facebook ngay lập tức
 *
 * Nhận FormData:
 * - content: string
 * - hashtags: string
 * - pageIds: string (JSON array)
 * - linkUrl?: string
 * - videoIds?: string (JSON object: { pageId -> videoId } - video đã upload từ browser)
 * - photoIds?: string (JSON object: { pageId -> photoId[] } - ảnh đã upload từ browser)
 * - imageUrls?: string[] (URL ảnh đính kèm trực tiếp)
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

    // videoIds: { pageId -> videoId } - video đã upload từ browser
    const videoIdsRaw = (formData.get("videoIds") as string) || "{}";
    let videoIds: Record<string, string> = {};
    try { videoIds = JSON.parse(videoIdsRaw); } catch { videoIds = {}; }
    const hasVideo = Object.keys(videoIds).length > 0;

    // photoIds: { pageId -> photoId[] } - ảnh đã upload từ browser trực tiếp lên Facebook
    const photoIdsRaw = (formData.get("photoIds") as string) || "{}";
    let photoIds: Record<string, string[]> = {};
    try { photoIds = JSON.parse(photoIdsRaw); } catch { photoIds = {}; }

    // imageUrls: URL ảnh trực tiếp (không phải file)
    const clientImageUrls = formData.getAll("imageUrls") as string[];
    const imageUrls: string[] = clientImageUrls.filter(u => u && u.startsWith("http"));

    let pageIds: string[] = [];
    try { pageIds = JSON.parse(pageIdsRaw); } catch { pageIds = []; }

    if (!content.trim()) {
      return NextResponse.json({ error: "Thiếu nội dung bài đăng" }, { status: 400 });
    }
    if (pageIds.length === 0) {
      return NextResponse.json({ error: "Vui lòng chọn ít nhất 1 Fanpage" }, { status: 400 });
    }

    const pages = getPages();
    const hashtagList = hashtags.split(/\s+/).filter(h => h.trim()).map(h => h.startsWith("#") ? h : `#${h}`);
    const fullMessage = [content.trim(), hashtagList.join(" ")].filter(Boolean).join("\n\n");

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
        const { pageAccessToken, fbPageId } = page;
        let fbPostId: string | undefined;

        if (hasVideo && videoIds[pageId]) {
          // Video đã được upload từ browser - chỉ lưu log
          fbPostId = videoIds[pageId];
          results.push({ pageId, pageName: page.pageName, success: true, fbPostId });

        } else if (photoIds[pageId] && photoIds[pageId].length > 0) {
          // Ảnh đã upload từ browser - đăng bài với attached_media
          const pagePhotoIds = photoIds[pageId];
          if (pagePhotoIds.length === 1) {
            // 1 ảnh: đăng trực tiếp lên /photos với published=true
            const postBody: Record<string, string> = {
              caption: fullMessage,
              published: "true",
              access_token: pageAccessToken,
            };
            // Cần re-publish photo đã upload (unpublished) thành post
            // Dùng /feed với attached_media
            const feedBody: Record<string, unknown> = {
              message: fullMessage,
              attached_media: [{ media_fbid: pagePhotoIds[0] }],
              access_token: pageAccessToken,
            };
            if (linkUrl) feedBody.link = linkUrl;
            const feedRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/feed`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(feedBody),
            });
            const feedData = await feedRes.json();
            if (feedData.error) throw new Error(feedData.error.message);
            fbPostId = feedData.id;
          } else {
            // Nhiều ảnh: attached_media
            const feedBody: Record<string, unknown> = {
              message: fullMessage,
              attached_media: pagePhotoIds.map(pid => ({ media_fbid: pid })),
              access_token: pageAccessToken,
            };
            if (linkUrl) feedBody.link = linkUrl;
            const feedRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/feed`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(feedBody),
            });
            const feedData = await feedRes.json();
            if (feedData.error) throw new Error(feedData.error.message);
            fbPostId = feedData.id;
          }
          results.push({ pageId, pageName: page.pageName, success: true, fbPostId });

        } else if (imageUrls.length > 0) {
          // Ảnh từ URL - upload từng ảnh lên Facebook rồi attach
          const uploadedPhotoIds: string[] = [];
          for (const imgUrl of imageUrls) {
            const photoRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/photos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: imgUrl,
                published: false,
                access_token: pageAccessToken,
              }),
            });
            const photoData = await photoRes.json();
            if (!photoData.error && photoData.id) {
              uploadedPhotoIds.push(photoData.id);
            }
          }
          if (uploadedPhotoIds.length > 0) {
            const feedBody: Record<string, unknown> = {
              message: fullMessage,
              attached_media: uploadedPhotoIds.map(pid => ({ media_fbid: pid })),
              access_token: pageAccessToken,
            };
            if (linkUrl) feedBody.link = linkUrl;
            const feedRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/feed`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(feedBody),
            });
            const feedData = await feedRes.json();
            if (feedData.error) throw new Error(feedData.error.message);
            fbPostId = feedData.id;
          } else {
            // Không upload được ảnh nào, đăng text thuần
            const postBody: Record<string, unknown> = {
              message: fullMessage,
              access_token: pageAccessToken,
            };
            if (linkUrl) postBody.link = linkUrl;
            const feedRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/feed`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(postBody),
            });
            const feedData = await feedRes.json();
            if (feedData.error) throw new Error(feedData.error.message);
            fbPostId = feedData.id;
          }
          results.push({ pageId, pageName: page.pageName, success: true, fbPostId });

        } else {
          // Chỉ có text
          const postBody: Record<string, unknown> = {
            message: fullMessage,
            access_token: pageAccessToken,
          };
          if (linkUrl) postBody.link = linkUrl;
          const feedRes = await fetch(`https://graph.facebook.com/v19.0/${fbPageId}/feed`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(postBody),
          });
          const feedData = await feedRes.json();
          if (feedData.error) throw new Error(feedData.error.message);
          fbPostId = feedData.id;
          results.push({ pageId, pageName: page.pageName, success: true, fbPostId });
        }

      } catch (err) {
        results.push({ pageId, pageName: page.pageName, success: false, error: (err as Error).message });
      }
    }

    // Lưu vào DB
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
