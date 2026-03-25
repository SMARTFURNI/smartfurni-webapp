import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getStaffById, updateStaff, deleteStaff, updateStaffPassword } from "@/lib/crm-staff-store";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;
  const staff = await getStaffById(id);
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(staff);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;
  const body = await req.json();

  // Nếu có newPassword thì đổi mật khẩu
  if (body.newPassword) {
    await updateStaffPassword(id, body.newPassword);
    delete body.newPassword;
  }

  const updated = await updateStaff(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;
  await deleteStaff(id);
  return NextResponse.json({ success: true });
}
