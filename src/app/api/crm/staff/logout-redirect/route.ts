import { NextResponse } from "next/server";
import { STAFF_SESSION_COOKIE } from "@/lib/admin-auth";

export async function GET() {
  const response = NextResponse.redirect(
    new URL("/crm-login", process.env.NEXT_PUBLIC_BASE_URL || "https://smartfurni-webapp-production.up.railway.app")
  );
  response.cookies.set(STAFF_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
