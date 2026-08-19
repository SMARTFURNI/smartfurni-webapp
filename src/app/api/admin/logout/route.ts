import { NextResponse } from "next/server";
import { SESSION_COOKIE, STAFF_SESSION_COOKIE } from "@/lib/admin-auth";

export async function POST() {
  // Just clear the cookie and return 200; client handles the redirect
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(STAFF_SESSION_COOKIE);
  return response;
}
