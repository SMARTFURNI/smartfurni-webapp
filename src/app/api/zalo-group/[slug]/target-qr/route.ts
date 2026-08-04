import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getPublicZaloGmfSourceLink } from "@/lib/zalo-gmf-attribution-store";
import { initZaloGmfSchema } from "@/lib/zalo-gmf-store";
import { getPublicRequestOrigin } from "@/lib/public-origin";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{8,80}$/.test(slug)) return new NextResponse("Not found", { status: 404 });

  await initZaloGmfSchema();
  const link = await getPublicZaloGmfSourceLink(slug);
  if (!link) return new NextResponse("Not found", { status: 404 });

  const origin = getPublicRequestOrigin(req);
  const openUrl = `${origin}/api/zalo-group/${encodeURIComponent(slug)}/open?via=qr`;
  const svg = await QRCode.toString(openUrl, {
    type: "svg",
    margin: 2,
    width: 480,
    color: { dark: "#050b12", light: "#ffffff" },
    errorCorrectionLevel: "H",
  });
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
    },
  });
}
