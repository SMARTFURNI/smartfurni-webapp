import { NextRequest, NextResponse } from "next/server";
import {
  identifyZaloGmfVisit,
  markZaloGmfVisitOpened,
  recordZaloGmfSourceVisit,
} from "@/lib/zalo-gmf-attribution-store";
import { initZaloGmfSchema } from "@/lib/zalo-gmf-store";

export const dynamic = "force-dynamic";

function publicError(error: unknown, status = 400) {
  return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Link tham gia nhóm không hợp lệ." }, { status });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await initZaloGmfSchema();
    const { slug } = await params;
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const queryParams = body.queryParams && typeof body.queryParams === "object" && !Array.isArray(body.queryParams)
      ? Object.fromEntries(Object.entries(body.queryParams as Record<string, unknown>).slice(0, 20).map(([key, value]) => [key.slice(0, 80), String(value).slice(0, 300)]))
      : {};
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "";
    const result = await recordZaloGmfSourceVisit(slug, {
      visitorKey: req.cookies.get("sf_gmf_visitor")?.value,
      ip: forwarded,
      userAgent: req.headers.get("user-agent") || "",
      referrer: String(body.referrer || ""),
      queryParams,
    });
    const response = NextResponse.json({ ok: true, visitId: result.visitId, link: result.link });
    if (!req.cookies.get("sf_gmf_visitor")?.value) {
      response.cookies.set("sf_gmf_visitor", result.visitorKey, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 365 * 24 * 60 * 60, path: "/" });
    }
    return response;
  } catch (error) {
    return publicError(error, 404);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await initZaloGmfSchema();
    const { slug } = await params;
    const body = await req.json() as Record<string, unknown>;
    const action = String(body.action || "");
    if (action === "identify") {
      await identifyZaloGmfVisit(slug, String(body.visitId || ""), String(body.userId || ""));
      return NextResponse.json({ ok: true });
    }
    if (action === "open") {
      await markZaloGmfVisitOpened(slug, String(body.visitId || ""));
      return NextResponse.json({ ok: true });
    }
    return publicError(new Error("Hành động không hợp lệ."));
  } catch (error) {
    return publicError(error);
  }
}
