/**
 * GET /api/crm/zalo-inbox/status
 * Kiểm tra trạng thái kết nối Zalo cá nhân
 */
import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";
import { getGatewayStatus, getAllGatewayStatuses, initZaloGateway } from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let initialized = false;

export async function GET(req: Request) {
  const session = await getCrmSession();
  if (!await canAccessZaloInbox(session)) {
    return NextResponse.json({ error: "Không có quyền truy cập Zalo Inbox" }, { status: session ? 403 : 401 });
  }

  // Khởi tạo gateway khi cần (auto-reconnect từ DB)
  if (!initialized) {
    initialized = true;
    initZaloGateway().catch((err) => {
      console.error("[status] initZaloGateway error:", err);
    });
  }

  const accountId = new URL(req.url).searchParams.get("accountId") || undefined;
  const status = getGatewayStatus(accountId);
  const accounts = await getAllGatewayStatuses();
  const connected = accountId ? status.isConnected : accounts.some(account => account.isConnected);

  return NextResponse.json({
    connected,
    userId: status.userId,
    // phone field: hiển thị tên thật nếu có, fallback về userId
    phone: status.displayName || status.userId,
    displayName: status.displayName,
    status: status.status,
    accountId: status.accountId,
    accounts,
  });
}
