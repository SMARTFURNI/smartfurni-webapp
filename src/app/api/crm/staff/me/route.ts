import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById, updateStaff, updateStaffPassword } from "@/lib/crm-staff-store";

/**
 * GET /api/crm/staff/me
 * Trả về thông tin nhân viên đang đăng nhập
 */
export async function GET() {
  let session;
  try {
    session = await requireCrmAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.isAdmin) {
    return NextResponse.json({
      id: "admin",
      username: "admin",
      fullName: "Quản trị viên",
      email: "admin@smartfurni.vn",
      phone: "",
      role: "super_admin",
      status: "active",
      avatarUrl: "",
      isAdmin: true,
    });
  }

  if (!session.staffId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const staff = await getStaffById(session.staffId);
  if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ...staff, isAdmin: false });
}

/**
 * PATCH /api/crm/staff/me
 * Nhân viên tự cập nhật thông tin cá nhân (fullName, email, phone, avatarUrl)
 * Không cho phép đổi role, status, username
 */
export async function PATCH(req: NextRequest) {
  let session;
  try {
    session = await requireCrmAccess();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.isAdmin) {
    return NextResponse.json({ error: "Admin dùng trang /admin để chỉnh sửa" }, { status: 403 });
  }

  if (!session.staffId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();

  // Chỉ cho phép cập nhật các field an toàn
  const allowedFields = ["fullName", "email", "phone", "avatarUrl"];
  const updates: Record<string, string> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updates[field] = String(body[field]).trim();
    }
  }

  // Đổi mật khẩu (cần xác nhận mật khẩu cũ)
  if (body.newPassword) {
    if (!body.currentPassword) {
      return NextResponse.json({ error: "Cần nhập mật khẩu hiện tại" }, { status: 400 });
    }
    // Xác thực mật khẩu cũ
    const { authenticateStaff } = await import("@/lib/crm-staff-store");
    const staff = await getStaffById(session.staffId);
    if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const verified = await authenticateStaff(staff.username, body.currentPassword);
    if (!verified) {
      return NextResponse.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 400 });
    }
    await updateStaffPassword(session.staffId, body.newPassword);
  }

  if (Object.keys(updates).length === 0 && !body.newPassword) {
    return NextResponse.json({ error: "Không có thông tin để cập nhật" }, { status: 400 });
  }

  const updated = await updateStaff(session.staffId, updates);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ...updated, isAdmin: false, success: true });
}
