/**
 * GET    /api/crm/zalo-inbox/access         — danh sách nhân viên có quyền
 * POST   /api/crm/zalo-inbox/access         — cấp quyền cho nhân viên
 * DELETE /api/crm/zalo-inbox/access?staffId — thu hồi quyền
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { grantInboxAccess, revokeInboxAccess, getInboxAccessList } from "@/lib/zalo-inbox-store";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getCrmSession() as any;
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Chỉ Admin mới có thể xem phân quyền" }, { status: 403 });
  }

  const accessList = await getInboxAccessList();

  // Enrich với thông tin nhân viên
  const enriched = await Promise.all(
    accessList.map(async (access) => {
      try {
        const res = await query(
          `SELECT id, full_name, email, role FROM crm_staff WHERE id = $1`,
          [access.staffId]
        );
        return {
          ...access,
          staff: res.rows[0] || null,
        };
      } catch {
        return { ...access, staff: null };
      }
    })
  );

  return NextResponse.json({ accessList: enriched });
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession() as any;
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Chỉ Admin mới có thể phân quyền" }, { status: 403 });
  }

  const body = await req.json();
  const { staffId } = body;

  if (!staffId) {
    return NextResponse.json({ error: "Thiếu staffId" }, { status: 400 });
  }

  // Kiểm tra nhân viên tồn tại
  const staffRes = await query(`SELECT id, full_name FROM crm_staff WHERE id = $1`, [staffId]);
  if (staffRes.rows.length === 0) {
    return NextResponse.json({ error: "Nhân viên không tồn tại" }, { status: 404 });
  }

  await grantInboxAccess(staffId, session.staffId || "admin");

  return NextResponse.json({
    success: true,
    message: `Đã cấp quyền cho ${staffRes.rows[0].full_name}`,
  });
}

export async function DELETE(req: NextRequest) {
  const session = await getCrmSession() as any;
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Chỉ Admin mới có thể thu hồi quyền" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staffId");

  if (!staffId) {
    return NextResponse.json({ error: "Thiếu staffId" }, { status: 400 });
  }

  await revokeInboxAccess(staffId);
  return NextResponse.json({ success: true, message: "Đã thu hồi quyền truy cập" });
}
