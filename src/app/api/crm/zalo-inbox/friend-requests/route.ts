import { NextResponse } from "next/server";
import { getIncomingFriendRequests } from "@/lib/zalo-gateway";
import { getAuthorizedZaloInboxSession } from "@/lib/zalo-inbox-access";

/**
 * GET /api/crm/zalo-inbox/friend-requests
 * Lấy danh sách yêu cầu kết bạn đến (incoming friend requests)
 */
export async function GET() {
  if (!await getAuthorizedZaloInboxSession()) return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: 403 });
  try {
    const requests = getIncomingFriendRequests();
    return NextResponse.json({ success: true, requests });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
