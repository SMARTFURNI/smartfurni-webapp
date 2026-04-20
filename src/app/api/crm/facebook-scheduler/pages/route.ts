import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getCrmSession } from "@/lib/admin-auth";
import {
  getPages, addPage, updatePage, deletePage,
  loadFacebookSchedulerFromDb,
} from "@/lib/crm-facebook-scheduler-store";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) { await loadFacebookSchedulerFromDb(); loaded = true; }
}

// GET /api/crm/facebook-scheduler/pages
// Cho phép cả admin và nhân viên đọc danh sách Fanpage (dùng chung)
export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureLoaded();
  return NextResponse.json(getPages());
}

// POST /api/crm/facebook-scheduler/pages — Thêm page mới (chỉ admin)
export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureLoaded();
  const body = await req.json();
  const { pageId, pageName, pageAccessToken, category, followerCount } = body;
  if (!pageId || !pageName || !pageAccessToken) {
    return NextResponse.json({ error: "Thiếu thông tin page" }, { status: 400 });
  }
  const page = await addPage({
    pageId,
    pageName,
    pageAccessToken,
    category,
    followerCount,
    isActive: true,
  });
  return NextResponse.json(page);
}

// PUT /api/crm/facebook-scheduler/pages — Cập nhật page (chỉ admin)
export async function PUT(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureLoaded();
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "Thiếu ID" }, { status: 400 });
  const updated = await updatePage(id, updates);
  if (!updated) return NextResponse.json({ error: "Không tìm thấy page" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/crm/facebook-scheduler/pages?id=xxx (chỉ admin)
export async function DELETE(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureLoaded();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu ID" }, { status: 400 });
  const ok = await deletePage(id);
  if (!ok) return NextResponse.json({ error: "Không tìm thấy page" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
