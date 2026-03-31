import { NextRequest, NextResponse } from "next/server";
import {
  loadFacebookSchedulerFromDb,
  getPostsDueNow, getPages,
  updatePost, addPostLog, scheduleNextRepeat,
  publishToFacebook, getSchedulerConfig,
} from "@/lib/crm-facebook-scheduler-store";

/**
 * GET /api/crm/facebook-scheduler/cron
 * Cron endpoint — gọi định kỳ mỗi giờ để đăng bài theo lịch
 *
 * Bảo mật bằng CRON_SECRET env variable.
 * Cấu hình Railway Cron: "0 * * * *" (mỗi giờ)
 *
 * Thêm vào vercel.json:
 * { "crons": [{ "path": "/api/crm/facebook-scheduler/cron", "schedule": "0 * * * *" }] }
 */
export async function GET(req: NextRequest) {
  // Xác thực bằng CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const querySecret = new URL(req.url).searchParams.get("secret");
    if (authHeader !== `Bearer ${cronSecret}` && querySecret !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await loadFacebookSchedulerFromDb();
    const schedulerConfig = getSchedulerConfig();
    console.log(`[FB Scheduler Cron] Starting... isEnabled=${schedulerConfig.isEnabled}`);

    // Vẫn xử lý bài đăng dù isEnabled=false (isEnabled chỉ ảnh hưởng đến auto-cron trên Railway)
    // Khi gọi endpoint này trực tiếp thì luôn xử lý
    const duePosts = getPostsDueNow();
    const pages = getPages();
    console.log(`[FB Scheduler Cron] Found ${duePosts.length} posts due`);

    const results = [];

    for (const post of duePosts) {
      const postResults: Array<{ pageId: string; success: boolean; fbPostId?: string; error?: string }> = [];

      for (const pageId of post.pageIds) {
        const page = pages.find(p => p.id === pageId && p.isActive);
        if (!page) {
          postResults.push({ pageId, success: false, error: "Page không tồn tại hoặc đã tắt" });
          await addPostLog({
            postId: post.id,
            postTitle: post.title,
            pageId,
            pageName: "Unknown",
            action: "failed",
            errorMessage: "Page không tồn tại hoặc đã tắt",
            executedAt: new Date().toISOString(),
          });
          continue;
        }

        const result = await publishToFacebook(post, page);
        postResults.push({ pageId, success: result.success, fbPostId: result.postId, error: result.error });

        await addPostLog({
          postId: post.id,
          postTitle: post.title,
          pageId: page.id,
          pageName: page.pageName,
          action: result.success ? "published" : "failed",
          facebookPostId: result.postId,
          errorMessage: result.error,
          executedAt: new Date().toISOString(),
        });
      }

      const allSuccess = postResults.every(r => r.success);
      const anySuccess = postResults.some(r => r.success);

      await updatePost(post.id, {
        status: allSuccess ? "published" : anySuccess ? "published" : "failed",
        publishedAt: new Date().toISOString(),
        facebookPostIds: Object.fromEntries(
          postResults.filter(r => r.fbPostId).map(r => [r.pageId, r.fbPostId!])
        ),
        errorMessage: postResults.filter(r => r.error).map(r => `${r.pageId}: ${r.error}`).join("; ") || undefined,
      });

      // Tạo bài lặp lại tiếp theo nếu có
      if (anySuccess && post.repeatType !== "none") {
        await scheduleNextRepeat(post);
      }

      results.push({ postId: post.id, title: post.title, pageResults: postResults });
    }

    console.log(`[FB Scheduler Cron] Done. Processed ${results.length} posts`);
    return NextResponse.json({
      ok: true,
      processed: results.length,
      results,
    });
  } catch (e) {
    console.error("[FB Scheduler Cron] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
