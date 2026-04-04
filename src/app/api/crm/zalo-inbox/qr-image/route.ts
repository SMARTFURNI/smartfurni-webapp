/**
 * QR Image API - Polling approach để tránh SSE buffering issues
 *
 * POST /api/crm/zalo-inbox/qr-image  → Trigger QR login (non-blocking)
 * GET  /api/crm/zalo-inbox/qr-image  → Lấy QR image hiện tại + trạng thái
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { startQRLogin, getCurrentQRImage, getGatewayStatus } from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST: Trigger QR login (non-blocking, trả về ngay)
export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Trigger QR login non-blocking (không await)
  startQRLogin((qrBase64: string) => {
    // QR đã được lưu vào currentQRImage trong gateway
    console.log("[qr-image] QR generated, length:", qrBase64.length);
  }).catch((err: Error) => {
    console.error("[qr-image] QR login error:", err.message);
  });

  return NextResponse.json({ status: "started", message: "QR login đang khởi tạo..." });
}

// GET: Lấy QR image hiện tại + trạng thái kết nối
export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = getGatewayStatus();
  const qrImage = getCurrentQRImage();

  return NextResponse.json({
    connected: status.isConnected,
    connecting: status.isConnecting,
    // phone: hiển thị tên thật nếu có, fallback về userId
    phone: status.displayName || status.phone || null,
    displayName: status.displayName || null,
    qrImage: qrImage || null,
    status: status.status,
  });
}
