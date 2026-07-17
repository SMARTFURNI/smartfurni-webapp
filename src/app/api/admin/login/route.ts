import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, createSessionToken, SESSION_COOKIE } from "@/lib/admin-auth";
import { logAudit, getClientIp } from "@/lib/audit-helper";

const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const ipAddress = getClientIp(req);
    const now = Date.now();
    const attempt = loginAttempts.get(ipAddress);
    if (attempt && attempt.resetAt > now && attempt.count >= MAX_LOGIN_ATTEMPTS) {
      return NextResponse.json({ error: "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút." }, { status: 429 });
    }
    if (attempt && attempt.resetAt <= now) loginAttempts.delete(ipAddress);
    const { username, password } = await req.json();
    const isValid = await verifyCredentials(username, password);
    if (!isValid) {
      const current = loginAttempts.get(ipAddress);
      loginAttempts.set(ipAddress, { count: (current?.count || 0) + 1, resetAt: current?.resetAt || now + LOGIN_WINDOW_MS });
      await logAudit({
        action: "auth.failed",
        entityType: "auth",
        entityId: null,
        entityName: username,
        actorId: null,
        actorName: username,
        ipAddress,
        metadata: { type: "admin" },
      });
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }
    loginAttempts.delete(ipAddress);
    const token = createSessionToken();
    await logAudit({
      action: "auth.login",
      entityType: "auth",
      entityId: "admin",
      entityName: "Admin",
      actorId: "admin",
      actorName: "Admin",
      ipAddress,
      metadata: { type: "admin" },
    });
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
