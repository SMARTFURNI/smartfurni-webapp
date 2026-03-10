import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Simple admin credentials - in production, use environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "smartfurni2026";
const SESSION_SECRET = process.env.SESSION_SECRET || "smartfurni-secret-key-2026";
const SESSION_COOKIE = "sf_admin_session";

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

export { SESSION_COOKIE };
