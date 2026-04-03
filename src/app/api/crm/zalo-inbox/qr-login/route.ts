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
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { startQRLogin } from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized - chỉ admin mới có thể đăng nhập Zalo" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch { /* client disconnected */ }
      };

      try {
        send("status", { message: "Đang khởi tạo QR code..." });
        
        await startQRLogin({
          onQRCode: (image: string, token: string) => {
            send("qr", { image, token });
          },
          onQRExpired: () => {
            send("qr_expired", { message: "QR code đã hết hạn, đang tạo mới..." });
          },
          onScanned: (displayName: string, avatar: string) => {
            send("scanned", { displayName, avatar, message: `Đã quét! Đang xác nhận đăng nhập cho ${displayName}...` });
          },
          onSuccess: (phone: string, displayName: string) => {
            send("success", { phone, displayName, message: `Đã đăng nhập thành công: ${displayName}` });
            try { controller.close(); } catch { /* ignore */ }
          },
          onError: (error: string) => {
            send("error", { message: error });
            try { controller.close(); } catch { /* ignore */ }
          },
        });
      } catch (err: any) {
        send("error", { message: err?.message || "Lỗi không xác định" });
        try { controller.close(); } catch { /* ignore */ }
      }
    },
    cancel() {
      // Client disconnected
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
