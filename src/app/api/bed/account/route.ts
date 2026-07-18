import { NextResponse } from "next/server";
import {
  SMART_BED_SESSION_COOKIE,
  deleteSmartBedUserAccount,
  getSmartBedSession,
} from "@/lib/smart-bed-auth";

export async function DELETE() {
  const user = await getSmartBedSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  await deleteSmartBedUserAccount(user.id);
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SMART_BED_SESSION_COOKIE);
  return response;
}
