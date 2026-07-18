import { NextRequest, NextResponse } from "next/server";
import {
  SMART_BED_SESSION_COOKIE,
  deleteSmartBedUserAccount,
  getSmartBedSession,
  updateSmartBedUserProfile,
} from "@/lib/smart-bed-auth";

export async function GET() {
  const user = await getSmartBedSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  return NextResponse.json({ user });
}

export async function PATCH(request: NextRequest) {
  const user = await getSmartBedSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });

  try {
    const body = await request.json() as { fullName?: string; email?: string; phone?: string };
    const updatedUser = await updateSmartBedUserProfile(user.id, {
      fullName: body.fullName || "",
      email: body.email || "",
      phone: body.phone || "",
    });
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không thể cập nhật thông tin khách hàng." },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const user = await getSmartBedSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  await deleteSmartBedUserAccount(user.id);
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SMART_BED_SESSION_COOKIE);
  return response;
}
