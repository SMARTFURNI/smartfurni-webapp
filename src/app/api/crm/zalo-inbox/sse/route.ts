/**
 * GET /api/crm/zalo-inbox/sse
 * Server-Sent Events cho Zalo Inbox real-time
 * Nhận events từ zalo-gateway (zca-js listener)
 *
 * Fix: Bỏ import từ ../webhook/route (đã xóa) → dùng addSSEClient từ zalo-gateway
 */
import { NextRequest } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { addSSEClient, removeSSEClient, SSEClient } from "@/lib/zalo-gateway";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function checkAccess(session: { isAdmin?: boolean; staffId?: string } | null): Promise<boolean> {
  if (!session) return false;
  if (session.isAdmin) return true;
  if (session.staffId) {
    const db = getDb();
    try {
      const tableCheck = await db.query(
        `SELECT 1 FROM information_schema.tables WHERE table_name = 'zalo_inbox_access' LIMIT 1`
      );
      if (tableCheck.rows.length === 0) return true;
      const countRes = await db.query(`SELECT COUNT(*) as cnt FROM zalo_inbox_access`);
      const count = parseInt(countRes.rows[0]?.cnt || "0");
      if (count === 0) return true;
      const result = await db.query(
        `SELECT 1 FROM zalo_inbox_access WHERE staff_id = $1 LIMIT 1`,
        [session.staffId]
      );
      return result.rows.length > 0;
    } catch {
      return true;
    }
  }
  return false;
}

export async function GET(req: NextRequest) {
  const session = await getCrmSession() as { isAdmin?: boolean; staffId?: string } | null;
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const hasAccess = await checkAccess(session);
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
