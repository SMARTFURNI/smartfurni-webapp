import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getSmartBedAdminCustomers, resetSmartBedUserPassword } from "@/lib/smart-bed-auth";

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const customers = await getSmartBedAdminCustomers();
  return NextResponse.json({ customers });
}

export async function POST(request: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as { action?: string; userId?: string };
    if (body.action !== "reset_password" || !body.userId) {
      return NextResponse.json({ error: "Yêu cầu không hợp lệ" }, { status: 400 });
    }
    const temporaryPassword = await resetSmartBedUserPassword(body.userId);
    return NextResponse.json({ success: true, temporaryPassword });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể cấp lại mật khẩu." },
      { status: 400 },
    );
  }
}
