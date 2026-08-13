import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";
import {
  createZaloMediaFolder,
  deleteZaloMediaFolder,
  renameZaloMediaFolder,
} from "@/lib/zalo-media-library-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function sessionWithAccess() {
  const session = await getCrmSession();
  return { session, allowed: await canAccessZaloInbox(session) };
}

export async function POST(req: NextRequest) {
  const { session, allowed } = await sessionWithAccess();
  if (!allowed) return NextResponse.json({ error: "Không có quyền truy cập" }, { status: session ? 403 : 401 });
  const body = await req.json().catch(() => ({})) as { name?: string };
  const name = body.name?.trim() || "";
  if (!name) return NextResponse.json({ error: "Tên thư mục không được để trống" }, { status: 400 });
  const folder = await createZaloMediaFolder(name.slice(0, 80), session?.staffId || (session?.isAdmin ? "admin" : undefined));
  return NextResponse.json({ success: true, folder }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const { session, allowed } = await sessionWithAccess();
  if (!allowed) return NextResponse.json({ error: "Không có quyền truy cập" }, { status: session ? 403 : 401 });
  const body = await req.json().catch(() => ({})) as { id?: string; name?: string };
  if (!body.id || !body.name?.trim()) return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  await renameZaloMediaFolder(body.id, body.name.trim().slice(0, 80));
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { session, allowed } = await sessionWithAccess();
  if (!allowed) return NextResponse.json({ error: "Không có quyền truy cập" }, { status: session ? 403 : 401 });
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "Thiếu thư mục" }, { status: 400 });
  await deleteZaloMediaFolder(id);
  return NextResponse.json({ success: true });
}
