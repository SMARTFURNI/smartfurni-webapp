import { NextRequest, NextResponse } from "next/server";
import {
  SMART_BED_SESSION_COOKIE,
  getSmartBedSession,
  loginSmartBedUser,
  registerSmartBedUser,
  revokeSmartBedSession,
} from "@/lib/smart-bed-auth";

const attempts = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SMART_BED_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function GET() {
  const user = await getSmartBedSession();
  return NextResponse.json({ authenticated: Boolean(user), user });
}

export async function POST(request: NextRequest) {
  const key = clientKey(request);
  const now = Date.now();
  const current = attempts.get(key);
  if (current && current.resetAt > now && current.count >= 8) {
    return NextResponse.json({ error: "Bạn đã thử quá nhiều lần. Vui lòng chờ 15 phút." }, { status: 429 });
  }
  try {
    const body = await request.json() as { mode?: string; fullName?: string; email?: string; phone?: string; password?: string };
    const session = body.mode === "register"
      ? await registerSmartBedUser({
        fullName: body.fullName || "",
        email: body.email || "",
        phone: body.phone || "",
        password: body.password || "",
      })
      : await loginSmartBedUser(body.email || "", body.password || "");
    attempts.delete(key);
    const response = NextResponse.json({ success: true });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    attempts.set(key, { count: (current?.count || 0) + 1, resetAt: current?.resetAt || now + 15 * 60 * 1000 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể đăng nhập." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  await revokeSmartBedSession(request.cookies.get(SMART_BED_SESSION_COOKIE)?.value);
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SMART_BED_SESSION_COOKIE);
  return response;
}
