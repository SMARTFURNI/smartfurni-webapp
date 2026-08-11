import { NextRequest, NextResponse } from "next/server";
import {
  recordZaloFollowVisit,
  recordZaloFollowVisitAction,
  type ZaloFollowEventAction,
} from "@/lib/zalo-follow-campaign-store";

export const dynamic = "force-dynamic";

function publicError(error: unknown, status = 400) {
  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : "Chiến dịch Zalo OA không hợp lệ." },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function safeQueryParams(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 30)
      .map(([key, item]) => [key.slice(0, 80), String(item).slice(0, 300)]),
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "";
    const result = await recordZaloFollowVisit(slug, {
      visitorKey: req.cookies.get("sf_zalo_follow_visitor")?.value,
      sessionId: String(body.sessionId || ""),
      ip: forwarded,
      userAgent: req.headers.get("user-agent") || "",
      referrer: String(body.referrer || ""),
      queryParams: safeQueryParams(body.queryParams),
    });
    const response = NextResponse.json(
      { ok: true, visitId: result.visitId, campaign: result.campaign },
      { headers: { "Cache-Control": "no-store" } },
    );
    if (!req.cookies.get("sf_zalo_follow_visitor")?.value) {
      response.cookies.set("sf_zalo_follow_visitor", result.visitorKey, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 365 * 24 * 60 * 60,
        path: "/",
      });
    }
    return response;
  } catch (error) {
    return publicError(error, 404);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json() as Record<string, unknown>;
    const allowed = new Set<ZaloFollowEventAction>([
      "sdk_loaded", "follow_success", "chat_open", "fallback_open", "dismiss", "error", "identify",
    ]);
    const action = String(body.action || "") as ZaloFollowEventAction;
    if (!allowed.has(action)) throw new Error("Hành động theo dõi không hợp lệ.");
    const visitId = String(body.visitId || "").trim();
    if (!visitId) throw new Error("Thiếu mã lượt truy cập.");
    await recordZaloFollowVisitAction(slug, visitId, action, {
      userId: String(body.userId || ""),
      error: String(body.error || ""),
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return publicError(error);
  }
}
