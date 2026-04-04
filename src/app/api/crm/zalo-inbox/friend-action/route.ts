import { NextRequest, NextResponse } from "next/server";
import {
  sendZaloFriendRequest,
  acceptZaloFriendRequest,
  rejectZaloFriendRequest,
  getZaloFriendRequestStatus,
} from "@/lib/zalo-gateway";

/**
 * POST /api/crm/zalo-inbox/friend-action
 * Body: { action: "send" | "accept" | "reject" | "status", userId: string, message?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      action: "send" | "accept" | "reject" | "status";
      userId: string;
      message?: string;
    };

    const { action, userId, message } = body;

    if (!action || !userId) {
      return NextResponse.json(
        { success: false, error: "Thiếu tham số action hoặc userId" },
        { status: 400 }
      );
    }

    switch (action) {
      case "send": {
        const result = await sendZaloFriendRequest({ userId, message });
        return NextResponse.json(result);
      }
      case "accept": {
        const result = await acceptZaloFriendRequest(userId);
        return NextResponse.json(result);
      }
      case "reject": {
        const result = await rejectZaloFriendRequest(userId);
        return NextResponse.json(result);
      }
      case "status": {
        const result = await getZaloFriendRequestStatus(userId);
        return NextResponse.json(result);
      }
      default:
        return NextResponse.json(
          { success: false, error: "Action không hợp lệ. Dùng: send | accept | reject | status" },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
