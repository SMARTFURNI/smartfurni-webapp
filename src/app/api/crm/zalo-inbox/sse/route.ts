/**
 * GET /api/crm/zalo-inbox/sse
 * Server-Sent Events cho Zalo Inbox real-time
 * Nhận: new_message, status events từ ZaloGateway
 */
import { NextRequest } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { hasInboxAccess } from "@/lib/zalo-inbox-store";
import { registerZaloSSEListener, unregisterZaloSSEListener } from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getCrmSession() as any;
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Kiểm tra quyền truy cập
  const hasAccess = session.isAdmin || (session.staffId && await hasInboxAccess(session.staffId));
  if (!hasAccess) {
    return new Response("Forbidden", { status: 403 });
  }

  const clientId = `zalo_sse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // Gửi connected event
      send(": connected\n\n");
      send(`data: ${JSON.stringify({ type: "connected", clientId })}\n\n`);

      // Đăng ký listener với ZaloGateway
      registerZaloSSEListener(clientId, (event, data) => {
        send(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      });

      // Heartbeat mỗi 20 giây
      const heartbeat = setInterval(() => {
        send(": heartbeat\n\n");
      }, 20000);

      // Cleanup khi client disconnect
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        unregisterZaloSSEListener(clientId);
        try { controller.close(); } catch { /* already closed */ }
      });
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
