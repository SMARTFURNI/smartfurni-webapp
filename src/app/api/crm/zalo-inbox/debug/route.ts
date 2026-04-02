/**
 * GET /api/crm/zalo-inbox/debug — kiểm tra auth status (không cần auth)
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map(c => c.trim().split("=")[0]).filter(Boolean);
  
  const session = await getCrmSession();
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    auth: {
      hasSession: !!session,
      session: session,
    },
    cookies: {
      count: cookies.length,
      names: cookies,
      hasCrmStaff: cookieHeader.includes("sf_crm_staff_session"),
      hasAdmin: cookieHeader.includes("sf_admin_session"),
    },
    headers: {
      host: req.headers.get("host"),
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
    }
  });
}
