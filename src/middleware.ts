import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Define SESSION_COOKIE directly here to avoid importing Node.js-only modules
// (admin-auth imports 'crypto' which is not available in Edge Runtime)
const SESSION_COOKIE = "sf_admin_session";

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
