/**
 * GET /api/crm/zalo-inbox/status
 * Kiểm tra trạng thái kết nối Zalo cá nhân
 */
import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { isZaloConnected, getZaloUserId, getZaloUserDisplayName, initZaloGateway } from "@/lib/zalo-gateway";

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
  const displayName = getZaloUserDisplayName();

  return NextResponse.json({
    connected,
    userId: userId || null,
    // phone field: hiển thị tên thật nếu có, fallback về userId
    phone: displayName || userId || null,
    displayName: displayName || null,
    status: connected ? "connected" : "disconnected",
  });
}
