import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/admin-auth";

/**
 * Server component: xóa session cookie admin và redirect về trang đăng nhập.
 * Được gọi khi admin nhấn "Đăng xuất" từ CRM sidebar.
 */
export default async function AdminLogoutPage() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
