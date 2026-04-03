/**
 * GET /api/crm/zalo-inbox/qr-login
 * SSE stream để login Zalo cá nhân qua QR code
 *
 * Flow:
 * 1. Admin mở Settings → gọi endpoint này
 * 2. Server dùng zca-js loginQR → generate QR code
 * 3. SSE stream QR image (base64) về client để hiển thị
 * 4. Admin quét QR bằng Zalo app
 * 5. zca-js nhận cookies → lưu vào DB → kết nối gateway
 * 6. SSE stream "success" event
 *
 * Fix: startQRLogin(onQR: (qrBase64: string) => void) — nhận 1 callback, không phải object
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { startQRLogin, getGatewayStatus } from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized - chỉ admin mới có thể đăng nhập Zalo" },
      { status: 401 }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          closed = true;
        }
      };

      // Cleanup on client disconnect
      req.signal.addEventListener("abort", () => {
        closed = true;
        try { controller.close(); } catch { /* ignore */ }
      });

      try {
        send("status", { message: "Đang khởi tạo QR code..." });

        // ✅ Fix: startQRLogin nhận 1 callback (onQR: string => void)
        // Callback được gọi mỗi khi QR mới được tạo
        await startQRLogin((qrBase64: string) => {
          // Thêm prefix data URI nếu chưa có
          const image = qrBase64.startsWith("data:")
            ? qrBase64
            : `data:image/png;base64,${qrBase64}`;
          send("qr", { image, token: "" });
        });

        // startQRLogin resolve khi đăng nhập thành công
        const status = getGatewayStatus();
        send("success", {
          phone: status.phone || status.userId || "Đã kết nối",
          displayName: status.phone || status.userId || "Zalo User",
          message: "Đăng nhập thành công!",
        });

        if (!closed) {
          try { controller.close(); } catch { /* ignore */ }
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error("[qr-login] Error:", error);
        send("error", { message: error?.message || "Lỗi không xác định khi tạo QR" });
        if (!closed) {
          try { controller.close(); } catch { /* ignore */ }
        }
      }
    },
    cancel() {
      // Client disconnected
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
