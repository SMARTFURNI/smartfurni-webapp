import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import {
  updatePost, deletePost, loadFacebookSchedulerFromDb,
  getPages, addPostLog, publishToFacebook, getScheduledPosts,
} from "@/lib/crm-facebook-scheduler-store";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

async function getSession() {
  const admin = await getAdminSession();
  if (admin) return { id: "admin", name: "Admin", isAdmin: true };
  const staff = await getStaffSession();
  if (staff) return { id: staff.staffId, name: staff.staffId, isAdmin: false };
  return null;
}

// PUT /api/crm/facebook-scheduler/posts/[id] — Cập nhật bài
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureLoaded();
  const { id } = await params;
  const body = await req.json();
  const updated = await updatePost(id, body);
  if (!updated) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/crm/facebook-scheduler/posts/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureLoaded();
  const { id } = await params;
  const ok = await deletePost(id);
  if (!ok) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// POST /api/crm/facebook-scheduler/posts/[id] — Đăng ngay (publish now)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureLoaded();
  const { id } = await params;

  const posts = getScheduledPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return NextResponse.json({ error: "Không tìm thấy bài" }, { status: 404 });

  const pages = getPages();
  const results: Array<{ pageId: string; pageName: string; success: boolean; fbPostId?: string; error?: string }> = [];

  for (const pageId of post.pageIds) {
    const page = pages.find(p => p.id === pageId);
    if (!page) {
      results.push({ pageId, pageName: "Unknown", success: false, error: "Page không tồn tại" });
      continue;
    }

    const result = await publishToFacebook(post, page);
    results.push({
      pageId,
      pageName: page.pageName,
      success: result.success,
      fbPostId: result.postId,
      error: result.error,
    });

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

  const allSuccess = results.every(r => r.success);
  const anySuccess = results.some(r => r.success);

  await updatePost(id, {
    status: allSuccess ? "published" : anySuccess ? "published" : "failed",
    publishedAt: new Date().toISOString(),
    facebookPostIds: Object.fromEntries(
      results.filter(r => r.fbPostId).map(r => [r.pageId, r.fbPostId!])
    ),
    errorMessage: results.filter(r => r.error).map(r => `${r.pageName}: ${r.error}`).join("; ") || undefined,
  });

  return NextResponse.json({ ok: true, results });
}
