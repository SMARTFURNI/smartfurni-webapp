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
  if (!origin || fetchSite === "same-origin") return;

  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    throw new AiCommandAccessError("Nguồn gửi yêu cầu không hợp lệ.", 403);
  }

  const trustedHosts = new Set<string>();
  const addHost = (value: string | null) => {
    const host = value?.split(",")[0]?.trim().toLowerCase();
    if (host) trustedHosts.add(host);
  };
  addHost(req.nextUrl.host);
  addHost(req.headers.get("host"));
  addHost(req.headers.get("x-forwarded-host"));

  for (const configuredUrl of [process.env.NEXT_PUBLIC_BASE_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    if (!configuredUrl) continue;
    try {
      trustedHosts.add(new URL(configuredUrl).host.toLowerCase());
    } catch {
      // Ignore malformed optional deployment configuration.
    }
  }

  if (!trustedHosts.has(originHost)) {
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
