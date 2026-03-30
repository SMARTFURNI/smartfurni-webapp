import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/admin-auth";

/**
 * Server component: xóa session cookie admin và redirect về trang đăng nhập.
 * Được gọi khi admin nhấn "Đăng xuất" từ CRM sidebar.
 */
export default async function AdminLogoutPage() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE);
  } catch (error) {
    console.error("Error deleting session cookie:", error);
  }
  
  // Return a redirect response instead of using redirect()
  return NextResponse.redirect(new URL("/admin/login", process.env.NEXTAUTH_URL || "http://localhost:3000"), {
    status: 302,
  });
}
