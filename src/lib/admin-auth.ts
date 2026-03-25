import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyStaffSession } from "./crm-staff-store";

// Simple admin credentials - in production, use environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "smartfurni2026";
const SESSION_SECRET = process.env.SESSION_SECRET || "smartfurni-secret-key-2026";
const SESSION_COOKIE = "sf_admin_session";
export const STAFF_SESSION_COOKIE = "sf_crm_staff_session";

export function verifyCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

export function createSessionToken(): string {
  const payload = {
    user: ADMIN_USERNAME,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    secret: SESSION_SECRET,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function verifySessionToken(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    return (
      payload.secret === SESSION_SECRET &&
      payload.exp > Date.now()
    );
  } catch {
    return false;
  }
}

export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  return verifySessionToken(token);
}

export async function requireAdmin(): Promise<void> {
  const isAuthenticated = await getAdminSession();
  if (!isAuthenticated) {
    redirect("/admin/login");
  }
}

/**
 * Kiểm tra xem request có phải từ nhân viên CRM hoặc admin không.
 * Dùng cho các trang CRM mà nhân viên có thể truy cập.
 * Nếu không có session hợp lệ → redirect về /crm-login
 */
export async function requireCrmAccess(): Promise<{ isAdmin: boolean; staffId?: string }> {
  // Kiểm tra admin session trước
  const isAdmin = await getAdminSession();
  if (isAdmin) return { isAdmin: true };

  // Kiểm tra staff session
  const cookieStore = await cookies();
  const staffToken = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (staffToken) {
    const staff = await verifyStaffSession(staffToken);
    if (staff) return { isAdmin: false, staffId: staff.id };
  }

  // Không có session hợp lệ → redirect về trang login nhân viên
  redirect("/crm-login");
}

/**
 * Chỉ cho phép admin hệ thống (super_admin) truy cập.
 * Nhân viên CRM sẽ bị redirect về /crm-login.
 */
export async function requireSuperAdminCrm(): Promise<void> {
  const isAdmin = await getAdminSession();
  if (isAdmin) return;
  // Nếu là staff → redirect về /crm-login (không phải /admin/login)
  redirect("/crm-login");
}

export { SESSION_COOKIE };
