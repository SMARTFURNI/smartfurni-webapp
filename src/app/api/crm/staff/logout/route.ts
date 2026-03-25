import { NextRequest, NextResponse } from "next/server";
import { deleteStaffSession } from "@/lib/crm-staff-store";

const STAFF_SESSION_COOKIE = "sf_crm_staff_session";

export async function POST(req: NextRequest) {
  const token = req.cookies.get(STAFF_SESSION_COOKIE)?.value;
  if (token) {
    await deleteStaffSession(token);
  }
  const response = NextResponse.json({ success: true });
  response.cookies.delete(STAFF_SESSION_COOKIE);
  return response;
}
