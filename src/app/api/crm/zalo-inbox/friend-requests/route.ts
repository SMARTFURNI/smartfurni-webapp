import { NextResponse } from "next/server";
import { getIncomingFriendRequests } from "@/lib/zalo-gateway";

/**
 * GET /api/crm/zalo-inbox/friend-requests
 * Lấy danh sách yêu cầu kết bạn đến (incoming friend requests)
 */
export async function GET() {
  try {
    const requests = getIncomingFriendRequests();
    return NextResponse.json({ success: true, requests });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
