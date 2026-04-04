import { NextRequest, NextResponse } from "next/server";
import {
  findZaloUserByPhone,
  sendZaloFriendRequest,
  isZaloConnected,
  initZaloGateway,
} from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Module-level init flag (giống status/route.ts)
let initialized = false;

/**
 * POST /api/crm/zalo-inbox/send-friend-by-phone
 * Body: { phone: string, message?: string, leadName?: string }
 *
 * Luồng:
 * 1. initZaloGateway() nếu chưa init (auto-reconnect từ DB)
 * 2. Chờ tối đa 5s để connected
 * 3. Tìm userId Zalo từ số điện thoại
 * 4. Gửi lời mời kết bạn
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { phone: string; message?: string; leadName?: string };
    const { phone, leadName } = body;
    const message =
      body.message ||
      `Xin chào${leadName ? ` ${leadName}` : ""}! Tôi là nhân viên SmartFurni, muốn kết nối với bạn qua Zalo.`;

    if (!phone) {
      return NextResponse.json({ success: false, error: "Thiếu số điện thoại" }, { status: 400 });
    }

    // 1. Khởi tạo gateway nếu chưa init (auto-reconnect từ DB credentials)
    if (!initialized) {
      initialized = true;
      await initZaloGateway().catch((err) => {
        console.error("[send-friend-by-phone] initZaloGateway error:", err);
      });
    }

    // 2. Chờ tối đa 5s để connected (gateway cần thời gian reconnect)
    let waited = 0;
    while (!isZaloConnected() && waited < 5000) {
      await new Promise((r) => setTimeout(r, 300));
      waited += 300;
    }

    if (!isZaloConnected()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Zalo Personal chưa được kết nối. Vui lòng đăng nhập tại mục Zalo Inbox.",
        },
        { status: 503 }
      );
    }

    // 3. Chuẩn hóa số điện thoại
    const normalizedPhone = phone
      .replace(/\s+/g, "")
      .replace(/^\+84/, "0")
      .replace(/^84/, "0");

    // 4. Tìm userId từ số điện thoại
    const findResult = await findZaloUserByPhone(normalizedPhone);
    if (!findResult.success || !findResult.user?.uid) {
      return NextResponse.json(
        {
          success: false,
          error:
            findResult.error ||
            "Không tìm thấy tài khoản Zalo với số điện thoại này",
          phone: normalizedPhone,
        },
        { status: 404 }
      );
    }

    const { uid, displayName, avatar } = findResult.user;

    // 5. Gửi lời mời kết bạn
    const sendResult = await sendZaloFriendRequest({ userId: uid, message });

    return NextResponse.json({
      success: sendResult.success,
      error: sendResult.success ? undefined : sendResult.error,
      user: { uid, displayName, avatar },
      phone: normalizedPhone,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
