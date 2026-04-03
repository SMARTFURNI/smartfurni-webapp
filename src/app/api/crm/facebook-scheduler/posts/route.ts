import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import {
  getScheduledPosts, createPost, loadFacebookSchedulerFromDb,
} from "@/lib/crm-facebook-scheduler-store";
import type { PostStatus } from "@/lib/crm-facebook-scheduler-store";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

async function getSession() {
  const admin = await getAdminSession();
  if (admin) return { id: "admin", name: (admin as unknown as { username?: string }).username || "Admin", isAdmin: true };
  const staff = await getStaffSession();
  if (staff) return { id: staff.staffId, name: staff.staffId, isAdmin: false };
  return null;
}

// GET /api/crm/facebook-scheduler/posts?status=scheduled&pageId=xxx
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureLoaded();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as PostStatus | null;
  const pageId = searchParams.get("pageId") ?? undefined;
  const posts = getScheduledPosts({ status: status ?? undefined, pageId });
  return NextResponse.json(posts);
}

// POST /api/crm/facebook-scheduler/posts — Tạo bài mới
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureLoaded();
  const body = await req.json();
  const {
    title, content, imageUrls = [], linkUrl, pageIds,
    scheduledAt, repeatType = "none", repeatDays, repeatEndDate,
    tags = [], hashtags = [],
  } = body;

  if (!title || !content || !pageIds?.length || !scheduledAt) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc: title, content, pageIds, scheduledAt" }, { status: 400 });
  }

  const post = await createPost({
    title,
    content,
    imageUrls,
    linkUrl,
    pageIds,
    scheduledAt,
    repeatType,
    repeatDays,
    repeatEndDate,
    status: "scheduled",
    createdBy: session.id,
    createdByName: session.name,
    tags,
    hashtags,
  });
  return NextResponse.json(post);
}
