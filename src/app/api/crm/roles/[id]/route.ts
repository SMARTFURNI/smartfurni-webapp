import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import { updateRole, deleteRole } from "@/lib/crm-roles-store";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  const staff = await getStaffSession();
  if (!admin && !staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!admin && staff?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const updated = await updateRole(params.id, body);
  if (!updated) return NextResponse.json({ error: "Không tìm thấy vai trò" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await getAdminSession();
  const staff = await getStaffSession();
  if (!admin && !staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!admin && staff?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await deleteRole(params.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
