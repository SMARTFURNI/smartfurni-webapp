import { NextRequest, NextResponse } from "next/server";
import { verifyCredentials, createSessionToken, SESSION_COOKIE } from "@/lib/admin-auth";
import { logAudit, getClientIp } from "@/lib/audit-helper";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const isValid = await verifyCredentials(username, password);
    if (!isValid) {
      await logAudit({
        action: "auth.failed",
        entityType: "auth",
        entityId: null,
        entityName: username,
        actorId: null,
        actorName: username,
        ipAddress: getClientIp(req),
        metadata: { type: "admin" },
      });
      return NextResponse.json(
        { error: "Tên đăng nhập hoặc mật khẩu không đúng" },
        { status: 401 }
      );
    }
    const token = createSessionToken();
    await logAudit({
      action: "auth.login",
      entityType: "auth",
      entityId: "admin",
      entityName: "Admin",
      actorId: "admin",
      actorName: "Admin",
      ipAddress: getClientIp(req),
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
