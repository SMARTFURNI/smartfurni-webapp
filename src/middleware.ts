import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// Define SESSION_COOKIE directly to avoid importing admin-auth (which uses Node.js APIs
// incompatible with Edge Runtime)
const SESSION_COOKIE = "sf_admin_session";
const STAFF_SESSION_COOKIE = "sf_crm_staff_session";

export function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const pathname = request.nextUrl.pathname;
  if (hostname === "smartfurni.com.vn") {
    const url = request.nextUrl.clone();
    url.hostname = "www.smartfurni.com.vn";
    return NextResponse.redirect(url, 308);
  }

  // Handle /admin/logout
  if (request.nextUrl.pathname.startsWith("/admin/logout")) {
    const response = NextResponse.redirect(new URL("/admin/login", request.url), {
      status: 302,
    });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/login") &&
    pathname !== "/admin-manifest.webmanifest"
  ) {
    const hasAdminSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
    const hasStaffSession = Boolean(request.cookies.get(STAFF_SESSION_COOKIE)?.value);

    // Trang chọn không gian làm việc dùng chung cho quản trị viên và nhân viên CRM.
    // Các trang /admin còn lại vẫn chỉ chấp nhận phiên quản trị viên.
    if (pathname === "/admin/choose-module") {
      if (!hasAdminSession && !hasStaffSession) {
        const loginPath = request.nextUrl.searchParams.get("entry") === "crm"
          ? "/crm-login"
          : "/admin/login";
        return NextResponse.redirect(new URL(loginPath, request.url), { status: 302 });
      }
    } else if (!hasAdminSession) {
      return NextResponse.redirect(new URL("/admin/login", request.url), { status: 302 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
