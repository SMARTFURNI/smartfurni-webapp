import { NextRequest, NextResponse } from "next/server";
import { authenticateStaff, createStaffSession } from "@/lib/crm-staff-store";

const STAFF_SESSION_COOKIE = "sf_crm_staff_session";

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
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa" },
        { status: 401 }
      );
    }

    const token = await createStaffSession(staff.id);
    const response = NextResponse.json({
      success: true,
      staff: {
        id: staff.id,
        fullName: staff.fullName,
        role: staff.role,
        username: staff.username,
      },
    });

    response.cookies.set(STAFF_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 giờ
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Staff login error:", err);
    return NextResponse.json({ error: "Lỗi server, vui lòng thử lại" }, { status: 500 });
  }
}
