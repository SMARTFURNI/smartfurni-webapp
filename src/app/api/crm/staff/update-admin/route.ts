import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getStaffByUsername, updateStaff } from "@/lib/crm-staff-store";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/crm/staff/update-admin
 * Cập nhật thông tin tài khoản admin (chỉ admin có thể)
 * 
 * Body:
 * {
 *   "fullName": "Phạm Nhất Bá Tuất",
 *   "email": "pham@smartfurni.vn",
 *   "phone": "0901234567"
 * }
 */
export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    // Lấy tài khoản admin
    const admin = await getStaffByUsername("admin");
    if (!admin) {
      return NextResponse.json({ error: "Admin account not found" }, { status: 404 });
    }

    // Cập nhật thông tin
    const updates: Record<string, any> = {};
    if (body.fullName !== undefined) updates.fullName = body.fullName;
    if (body.email !== undefined) updates.email = body.email;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.zaloPhone !== undefined) updates.zaloPhone = body.zaloPhone;

    const updated = await updateStaff(admin.id, updates);
    
    if (!updated) {
      return NextResponse.json({ error: "Failed to update admin" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Admin account updated successfully",
      admin: updated,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
