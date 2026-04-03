/**
 * GET /api/crm/zalo-inbox/connect — lấy trạng thái kết nối Zalo cá nhân
 * POST /api/crm/zalo-inbox/connect — kết nối Zalo (dùng credentials đã lưu)
 * DELETE /api/crm/zalo-inbox/connect — ngắt kết nối
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getGatewayStatus, connectZaloGateway, disconnectZaloGateway } from "@/lib/zalo-gateway";
import { getActiveZaloCredentials } from "@/lib/zalo-inbox-store";

export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = getGatewayStatus();
  const creds = await getActiveZaloCredentials();

  return NextResponse.json({
    connected: status.isConnected,
    status: status.status,
    phone: status.phone,
    hasCredentials: !!creds,
    message: status.isConnected
      ? `Đã kết nối Zalo: ${status.phone}`
      : creds
      ? "Có thông tin đăng nhập nhưng chưa kết nối"
      : "Chưa đăng nhập Zalo. Vui lòng quét QR trong Cài đặt.",
  });
}

export async function POST() {
  const session = await getCrmSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await connectZaloGateway();
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}

export async function DELETE() {
  const session = await getCrmSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await disconnectZaloGateway();
  return NextResponse.json({ success: true, message: "Đã ngắt kết nối Zalo" });
}
