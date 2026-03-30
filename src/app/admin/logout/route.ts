import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/admin-auth";

/**
 * Route handler: xóa session cookie admin và redirect về trang đăng nhập.
 * Được gọi khi admin nhấn "Đăng xuất" từ CRM sidebar.
 */
export async function GET() {
  // Redirect to login page
  const response = NextResponse.redirect(new URL("/admin/login", process.env.NEXTAUTH_URL || "http://localhost:3000"), {
    status: 302,
  });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
