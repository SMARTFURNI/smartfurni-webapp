import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getStaffById, updateStaff, deleteStaff, updateStaffPassword } from "@/lib/crm-staff-store";
import { logAudit, getClientIp } from "@/lib/audit-helper";

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

  const hasPasswordChange = !!body.newPassword;
  // Nếu có newPassword thì đổi mật khẩu
  if (body.newPassword) {
    await updateStaffPassword(id, body.newPassword);
    delete body.newPassword;
  }

  const updated = await updateStaff(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await logAudit({
    action: "staff.updated",
    entityType: "staff",
    entityId: id,
    entityName: updated.fullName,
    actorId: "admin",
    actorName: "Admin",
    ipAddress: getClientIp(req),
    metadata: { role: updated.role, passwordChanged: hasPasswordChange },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const { id } = await params;
  const existing = await getStaffById(id);
  await deleteStaff(id);
  await logAudit({
    action: "staff.deleted",
    entityType: "staff",
    entityId: id,
    entityName: existing?.fullName || id,
    actorId: "admin",
    actorName: "Admin",
    ipAddress: getClientIp(req),
    metadata: { role: existing?.role },
  });
  return NextResponse.json({ success: true });
}
