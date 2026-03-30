import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/admin-auth";

export function middleware(request: NextRequest) {
  // Handle /admin/logout
  if (request.nextUrl.pathname.startsWith("/admin/logout")) {
    const response = NextResponse.redirect(new URL("/admin/login", request.url), {
      status: 302,
    });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
