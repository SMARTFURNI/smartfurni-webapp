import { NextRequest } from "next/server";
import { queryOne } from "@/lib/db";
import { AiCommandAccessError } from "./access";
import { initAiCommandSchema } from "./store";
import type { AiCommandActor } from "./types";

export function assertTrustedJsonRequest(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new AiCommandAccessError("Yêu cầu phải sử dụng JSON.", 415);
  }
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") throw new AiCommandAccessError("Yêu cầu khác nguồn đã bị chặn.", 403);
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.nextUrl.host) {
    throw new AiCommandAccessError("Nguồn gửi yêu cầu không hợp lệ.", 403);
  }
}

export async function enforceAiCommandRateLimit(actor: AiCommandActor) {
  await initAiCommandSchema();
  const recent = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ai_runs
     WHERE actor_id = $1 AND actor_kind = $2 AND created_at > NOW() - INTERVAL '1 minute'`,
    [actor.id, actor.kind],
  );
  if (Number(recent?.count || 0) >= 12) {
    throw new AiCommandAccessError("Bạn đang gửi yêu cầu quá nhanh. Vui lòng chờ một phút rồi thử lại.", 429);
  }
}
