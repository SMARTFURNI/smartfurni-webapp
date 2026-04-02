import { NextRequest, NextResponse } from "next/server";
import { authenticateStaff } from "@/lib/crm-staff-store";
import { createStaffJwt, STAFF_SESSION_COOKIE } from "@/lib/admin-auth";
import { logAudit, getClientIp } from "@/lib/audit-helper";

const ADMIN_SESSION_COOKIE = "sf_admin_session";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên đăng nhập và mật khẩu" },
        { status: 400 }
      );
    }

    const staff = await authenticateStaff(username, password);
    if (!staff) {
      // Ghi log đăng nhập thất bại
      await logAudit({
        action: "auth.failed",
        entityType: "auth",
        entityId: null,
        entityName: username,
        actorId: null,
        actorName: username,
        ipAddress: getClientIp(req),
        metadata: { reason: "Sai mật khẩu hoặc tài khoản bị khóa" },
      });
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa" },
        { status: 401 }
      );
    }

    // Tạo JWT token (stateless — không cần DB)
    const token = createStaffJwt(staff.id, staff.role);

    // Ghi log đăng nhập thành công
    await logAudit({
      action: "auth.login",
      entityType: "auth",
      entityId: staff.id,
      entityName: staff.fullName,
      actorId: staff.id,
      actorName: staff.fullName,
      ipAddress: getClientIp(req),
      metadata: { role: staff.role, username: staff.username },
    });

    const response = NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        fullName: staff.fullName,
        role: staff.role,
        username: staff.username,
      },
    });

    // Set JWT cookie
    response.cookies.set(STAFF_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 giờ
      path: "/",
    });

    // Xóa admin session cookie để tránh xung đột
    response.cookies.set(ADMIN_SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Staff login error:", err);
    return NextResponse.json({ error: "Lỗi server, vui lòng thử lại" }, { status: 500 });
  }
}
