/**
 * GET /api/crm/zalo-inbox/status
 * Kiểm tra trạng thái kết nối Zalo cá nhân
 */
import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { isZaloConnected, getZaloUserId, initZaloGateway } from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let initialized = false;

export async function GET() {
  const session = await getCrmSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Khởi tạo gateway khi cần (auto-reconnect từ DB)
  if (!initialized) {
    initialized = true;
    initZaloGateway().catch((err) => {
      console.error("[status] initZaloGateway error:", err);
    });
  }

  const connected = isZaloConnected();
  const userId = getZaloUserId();

  return NextResponse.json({
    connected,
    userId: userId || null,
    status: connected ? "connected" : "disconnected",
  });
}
