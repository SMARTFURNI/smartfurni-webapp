import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, createSessionToken, SESSION_COOKIE } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!verifyCredentials(username, password)) {
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }

    const token = createSessionToken();
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 });
  }
}
