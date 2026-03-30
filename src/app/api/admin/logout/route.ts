import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/admin-auth";

export async function POST() {
  // Redirect to login page
  const response = NextResponse.redirect(new URL("/admin/login", process.env.NEXTAUTH_URL || "http://localhost:3000"), {
    status: 302,
  });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
