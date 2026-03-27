import { NextResponse } from "next/server";
import { STAFF_SESSION_COOKIE } from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(STAFF_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
