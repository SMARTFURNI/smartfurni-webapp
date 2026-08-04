import { NextResponse } from "next/server";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{8,80}$/.test(slug)) return new NextResponse("Not found", { status: 404 });
  const origin = new URL(req.url).origin;
  const svg = await QRCode.toString(`${origin}/zalo-group/${encodeURIComponent(slug)}`, {
    type: "svg", margin: 2, width: 480, color: { dark: "#172033", light: "#ffffff" }, errorCorrectionLevel: "H",
  });
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } });
}
