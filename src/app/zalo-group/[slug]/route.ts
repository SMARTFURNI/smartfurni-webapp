import { NextRequest, NextResponse } from "next/server";
import {
  markZaloGmfVisitOpened,
  recordZaloGmfSourceVisit,
} from "@/lib/zalo-gmf-attribution-store";
import { initZaloGmfSchema } from "@/lib/zalo-gmf-store";

export const dynamic = "force-dynamic";

function queryParams(req: NextRequest): Record<string, string> {
  return Object.fromEntries(
    Array.from(req.nextUrl.searchParams.entries())
      .slice(0, 20)
      .map(([key, value]) => [key.slice(0, 80), value.slice(0, 300)]),
  );
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await initZaloGmfSchema();
    const { slug } = await params;
    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "";
    const result = await recordZaloGmfSourceVisit(slug, {
      visitorKey: req.cookies.get("sf_gmf_visitor")?.value,
      ip: forwarded,
      userAgent: req.headers.get("user-agent") || "",
      referrer: req.headers.get("referer") || "",
      queryParams: queryParams(req),
    });

    await markZaloGmfVisitOpened(slug, result.visitId);

    const response = NextResponse.redirect(new URL(result.link.targetUrl), 307);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    if (!req.cookies.get("sf_gmf_visitor")?.value) {
      response.cookies.set("sf_gmf_visitor", result.visitorKey, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 365 * 24 * 60 * 60,
        path: "/",
      });
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Link tham gia nhóm không hợp lệ." },
      { status: 404, headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  }
}
