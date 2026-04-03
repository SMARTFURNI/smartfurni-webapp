/**
 * GET /api/crm/sse
 * Server-Sent Events endpoint — client CRM kết nối để nhận thông báo real-time.
 * Yêu cầu đăng nhập CRM (staff hoặc admin).
 *
 * Cơ chế: Database polling mỗi 3 giây
 * - Mỗi client ghi nhớ timestamp kết nối (sinceTs)
 * - Mỗi 3s query DB lấy raw leads mới hơn sinceTs
 * - Nếu có lead mới → emit SSE event → cập nhật sinceTs
 *
 * Lý do dùng polling thay vì in-process pub/sub:
 * Railway có thể chạy nhiều process/instance, in-process pub/sub không hoạt động cross-process.
 * Database là shared state duy nhất đáng tin cậy.
 */
import { NextRequest } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Poll interval (ms)
const POLL_INTERVAL = 3000;
// Heartbeat interval (ms) — giữ kết nối Railway không timeout
const HEARTBEAT_INTERVAL = 20000;

export async function GET(req: NextRequest) {
  // Xác thực session
  const session = await getCrmSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();

  // Timestamp bắt đầu lắng nghe — chỉ lấy lead mới hơn thời điểm kết nối
  // Trừ 5 giây để tránh miss lead vừa tạo ngay trước khi kết nối
  let sinceTs = new Date(Date.now() - 5000).toISOString();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      // Gửi comment connected ngay khi kết nối
      send(": connected\n\n");

      // Cleanup khi client disconnect
      req.signal.addEventListener("abort", () => {
        closed = true;
        try { controller.close(); } catch { /* already closed */ }
      });

      // Heartbeat để giữ kết nối
      const heartbeatTimer = setInterval(() => {
        if (closed) {
          clearInterval(heartbeatTimer);
          return;
        }
        send(": heartbeat\n\n");
      }, HEARTBEAT_INTERVAL);

      // Poll database để tìm lead mới
      const pollTimer = setInterval(async () => {
        if (closed) {
          clearInterval(pollTimer);
          clearInterval(heartbeatTimer);
          return;
        }
        try {
          // Query raw leads mới hơn sinceTs
          const result = await query<{
            id: string;
            full_name: string;
            phone: string;
            source: string;
            created_at: string;
            campaign_name: string | null;
            ad_name: string | null;
          }>(
            `SELECT id, full_name, phone, source, created_at, campaign_name, ad_name
             FROM crm_raw_leads
             WHERE created_at > $1
             ORDER BY created_at ASC
             LIMIT 10`,
            [sinceTs]
          );
          const rows = result;

          if (rows && rows.length > 0) {
            for (const row of rows) {
              const payload = {
                type: "new_raw_lead",
                payload: {
                  id: row.id,
                  fullName: row.full_name,
                  phone: row.phone,
                  source: row.source,
                  createdAt: row.created_at,
                  campaignName: row.campaign_name ?? null,
                  adName: row.ad_name ?? null,
                },
              };
              send(`event: new_raw_lead\ndata: ${JSON.stringify(payload)}\n\n`);
            }
            // Cập nhật sinceTs để không emit lại lead cũ
            sinceTs = rows[rows.length - 1].created_at as string;
          }
        } catch {
          // DB error — bỏ qua, tiếp tục poll
        }
      }, POLL_INTERVAL);

      // Cleanup khi stream cancel
      req.signal.addEventListener("abort", () => {
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
