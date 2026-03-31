/**
 * GET /api/crm/sse
 * Server-Sent Events endpoint — client CRM kết nối để nhận thông báo real-time.
 * Yêu cầu đăng nhập CRM (staff hoặc admin).
 */
import { NextRequest } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { subscribeSSE, type SSEEvent } from "@/lib/sse-emitter";

export const dynamic = "force-dynamic";
// Không dùng Edge runtime vì cần in-process state
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Xác thực session
  const session = await getCrmSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Gửi comment heartbeat ngay khi kết nối để tránh timeout
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Subscribe nhận events
      const unsubscribe = subscribeSSE((event: SSEEvent) => {
        try {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`event: ${event.type}\ndata: ${data}\n\n`));
        } catch {
          // Stream đã đóng
        }
      });

      // Heartbeat mỗi 25 giây để giữ kết nối (Railway timeout ~30s)
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 25000);

      // Cleanup khi client disconnect
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try { controller.close(); } catch { /* already closed */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no", // Tắt buffering trên Nginx/Railway
    },
  });
}
