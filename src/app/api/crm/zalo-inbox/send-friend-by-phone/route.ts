import { NextRequest, NextResponse } from "next/server";
import { findZaloUserByPhone, sendZaloFriendRequest, getGatewayStatus } from "@/lib/zalo-gateway";

/**
 * POST /api/crm/zalo-inbox/send-friend-by-phone
 * Body: { phone: string, message?: string, leadName?: string }
 *
 * Luồng:
 * 1. Kiểm tra Zalo Personal đã kết nối chưa
 * 2. Tìm userId Zalo từ số điện thoại
 * 3. Gửi lời mời kết bạn
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { phone: string; message?: string; leadName?: string };
    const { phone, leadName } = body;
    const message = body.message || `Xin chào${leadName ? ` ${leadName}` : ""}! Tôi là nhân viên SmartFurni, muốn kết nối với bạn qua Zalo.`;

    if (!phone) {
      return NextResponse.json({ success: false, error: "Thiếu số điện thoại" }, { status: 400 });
    }

    // 1. Kiểm tra Zalo Personal đã kết nối chưa
    const gatewayStatus = getGatewayStatus();
    if (!gatewayStatus.connected) {
      return NextResponse.json(
        { success: false, error: "Zalo Personal chưa được kết nối. Vui lòng đăng nhập tại mục Zalo Inbox." },
        { status: 503 }
      );
    }

    // 2. Chuẩn hóa số điện thoại
    const normalizedPhone = phone.replace(/\s+/g, "").replace(/^\+84/, "0").replace(/^84/, "0");

    // 3. Tìm userId từ số điện thoại
    const findResult = await findZaloUserByPhone(normalizedPhone);
    if (!findResult.success || !findResult.user?.uid) {
      return NextResponse.json(
        {
          success: false,
          error: findResult.error || "Không tìm thấy tài khoản Zalo với số điện thoại này",
          phone: normalizedPhone,
        },
        { status: 404 }
      );
    }

    const { uid, displayName, avatar } = findResult.user;

    // 4. Gửi lời mời kết bạn
    const sendResult = await sendZaloFriendRequest({ userId: uid, message });

    return NextResponse.json({
      success: sendResult.success,
      error: sendResult.success ? undefined : sendResult.error,
      user: { uid, displayName, avatar },
      phone: normalizedPhone,
    });
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
