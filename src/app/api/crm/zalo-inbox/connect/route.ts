/**
 * POST /api/crm/zalo-inbox/connect  — kết nối Zalo
 * DELETE /api/crm/zalo-inbox/connect — ngắt kết nối
 * GET /api/crm/zalo-inbox/connect    — lấy trạng thái kết nối
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { connectZaloGateway, disconnectZaloGateway, getGatewayStatus } from "@/lib/zalo-gateway";

export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(getGatewayStatus());
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession() as any;
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Chỉ Admin mới có thể kết nối Zalo" }, { status: 403 });
  }

  const result = await connectZaloGateway();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}

export async function DELETE() {
  const session = await getCrmSession() as any;
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "Chỉ Admin mới có thể ngắt kết nối Zalo" }, { status: 403 });
  }

  await disconnectZaloGateway();
  return NextResponse.json({ success: true, message: "Đã ngắt kết nối Zalo" });
}
