/**
 * GET /api/crm/zalo-inbox/sse
 * Server-Sent Events cho Zalo Inbox real-time
 * Nhận events từ zalo-gateway (zca-js listener)
 *
 * Fix: Bỏ import từ ../webhook/route (đã xóa) → dùng addSSEClient từ zalo-gateway
 */
import { NextRequest } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { canAccessZaloInbox } from "@/lib/zalo-inbox-access";
import { addSSEClient, removeSSEClient, SSEClient, ensureZaloConnected } from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const hasAccess = await canAccessZaloInbox(session);
  if (!hasAccess) {
    return new Response("Forbidden", { status: 403 });
  }

  // Tự động kết nối lại Zalo nếu server vừa restart (Railway deploy)
  ensureZaloConnected().catch((e) => console.error("[SSE] ensureZaloConnected error:", e));

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

      // Đăng ký nhận events từ zalo-gateway
      const sseClient: SSEClient = { id: clientId, controller };
      addSSEClient(sseClient);

      // Heartbeat mỗi 20 giây
      const heartbeat = setInterval(() => {
        send(": heartbeat\n\n");
      }, 20000);

      // Cleanup khi client disconnect
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        removeSSEClient(clientId);
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
