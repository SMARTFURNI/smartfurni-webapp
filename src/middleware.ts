import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// Define SESSION_COOKIE directly to avoid importing admin-auth (which uses Node.js APIs
// incompatible with Edge Runtime)
const SESSION_COOKIE = "admin_session";

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
