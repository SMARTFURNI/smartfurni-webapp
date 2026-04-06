import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import {
  getContentVideoById,
  updateContentVideo,
  deleteContentVideo,
  loadContentMarketingFromDb,
} from "@/lib/crm-content-store";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) {
    await loadContentMarketingFromDb();
    loaded = true;
  }
}

async function getSession() {
  const admin = await getAdminSession();
  if (admin) {
    return {
      id: "admin",
      name: (admin as unknown as { username?: string }).username || "Admin",
      isAdmin: true,
    };
  }
  const staff = await getStaffSession();
  if (staff) {
    return { id: staff.staffId, name: staff.staffId, isAdmin: false };
  }
  return null;
}

// GET /api/crm/content/videos/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureLoaded();

  const video = getContentVideoById(params.id);
  if (!video) return NextResponse.json({ error: "Không tìm thấy video" }, { status: 404 });

  return NextResponse.json(video);
}

// PATCH /api/crm/content/videos/[id] — Cập nhật video
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureLoaded();

  const body = await req.json();
  const updated = await updateContentVideo(params.id, body);

  if (!updated) {
    return NextResponse.json({ error: "Không tìm thấy video" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

// DELETE /api/crm/content/videos/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Chỉ admin mới được xóa
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Chỉ admin mới có quyền xóa" }, { status: 403 });
  }

  await ensureLoaded();

  await deleteContentVideo(params.id);
  return NextResponse.json({ success: true });
}
