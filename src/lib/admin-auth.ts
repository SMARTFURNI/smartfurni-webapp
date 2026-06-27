import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac } from "crypto";

// ─── Admin Auth ───────────────────────────────────────────────────────────────
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD_DEFAULT = process.env.ADMIN_PASSWORD || "smartfurni2026";
const SESSION_SECRET = process.env.SESSION_SECRET || "smartfurni-secret-key-2026";
const SESSION_COOKIE = "sf_admin_session";

// ─── Staff Auth (JWT stateless — no DB session needed) ───────────────────────
export const STAFF_SESSION_COOKIE = "sf_crm_staff_session";
const STAFF_JWT_SECRET = process.env.SESSION_SECRET || "smartfurni-secret-key-2026";

export interface StaffJwtPayload {
  staffId: string;
  role: string;
  exp: number;
}

/** Tạo JWT token cho staff (stateless, không cần DB) */
export function createStaffJwt(staffId: string, role: string): string {
  const payload: StaffJwtPayload = {
    staffId,
    role,
    exp: Date.now() + 8 * 60 * 60 * 1000, // 8 giờ
  };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", STAFF_JWT_SECRET).update(data).digest("hex");
  return `${data}.${sig}`;
}

/** Verify JWT token cho staff — trả về payload hoặc null */
export function verifyStaffJwt(token: string): StaffJwtPayload | null {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx < 0) return null;
    const data = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    const expectedSig = createHmac("sha256", STAFF_JWT_SECRET).update(data).digest("hex");
    if (sig !== expectedSig) return null;
    const payload: StaffJwtPayload = JSON.parse(
      Buffer.from(data, "base64url").toString("utf-8")
    );
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Admin helpers ────────────────────────────────────────────────────────────

/** Lấy mật khẩu admin từ DB (nếu đã đổi) hoặc fallback về env var */
async function getAdminPassword(): Promise<string> {
  try {
    const { query } = await import("./db");
    const rows = await query<{ value: string }>(
      "SELECT value FROM admin_profile WHERE key = 'password' LIMIT 1"
    );
    if (rows[0]?.value) return rows[0].value;
  } catch {
    // DB chưa sẵn sàng, dùng env var
  }
  return ADMIN_PASSWORD_DEFAULT;
}

/** Lấy tên hiển thị admin từ DB hoặc fallback */
export async function getAdminDisplayName(): Promise<string> {
  try {
    const { query } = await import("./db");
    const rows = await query<{ value: string }>(
      "SELECT value FROM admin_profile WHERE key = 'display_name' LIMIT 1"
    );
    if (rows[0]?.value) return rows[0].value;
  } catch {
    // ignore
  }
  return process.env.ADMIN_DISPLAY_NAME || "Admin";
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const storedPassword = await getAdminPassword();
  return username === ADMIN_USERNAME && password === storedPassword;
}

export function createSessionToken(): string {
  const payload = {
    user: ADMIN_USERNAME,
    exp: Date.now() + 24 * 60 * 60 * 1000,
    secret: SESSION_SECRET,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function verifySessionToken(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    return payload.secret === SESSION_SECRET && payload.exp > Date.now();
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
  if (!isAuthenticated) redirect("/admin/login");
}

// ─── CRM Auth helpers ─────────────────────────────────────────────────────────
/** Lấy staff payload từ cookie JWT (stateless — không query DB) */
export async function getStaffSession(): Promise<StaffJwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyStaffJwt(token);
}

/**
 * Kiểm tra quyền truy cập CRM (staff hoặc admin).
 * Redirect về /crm-login nếu không hợp lệ.
 */
export async function requireCrmAccess(): Promise<{ isAdmin: boolean; staffId?: string; staffRole?: string }> {
  const staffPayload = await getStaffSession();
  if (staffPayload) {
    return { isAdmin: false, staffId: staffPayload.staffId, staffRole: staffPayload.role };
  }
  const isAdmin = await getAdminSession();
  if (isAdmin) return { isAdmin: true };
  redirect("/crm-login");
}

/**
 * Chỉ cho phép super admin (admin hệ thống) truy cập.
 */
export async function requireSuperAdminCrm(): Promise<void> {
  const isAdmin = await getAdminSession();
  if (isAdmin) return;
  redirect("/crm-login");
}

/**
 * Dùng trong API routes — trả về session hoặc null (không redirect).
 */
export async function getCrmSession(): Promise<{ isAdmin: boolean; staffId?: string; staffRole?: string } | null> {
  const staffPayload = await getStaffSession();
  if (staffPayload) return { isAdmin: false, staffId: staffPayload.staffId, staffRole: staffPayload.role };
  const isAdmin = await getAdminSession();
  if (isAdmin) return { isAdmin: true };
  return null;
}

export { SESSION_COOKIE };
