import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { initAnalyticsTables, trackBlogProductClick } from "@/lib/analytics-store";

let tablesInitialized = false;

function cleanSlug(value: unknown): string {
  return typeof value === "string" && /^[a-z0-9-]{1,160}$/.test(value) ? value : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const postSlug = cleanSlug(body.postSlug);
    const productSlug = cleanSlug(body.productSlug);
    const targetPath = typeof body.targetPath === "string" ? body.targetPath.slice(0, 300) : "";
    if (!postSlug || !productSlug || !targetPath.startsWith(`/products/${productSlug}`)) {
      return NextResponse.json({ error: "Invalid tracking payload" }, { status: 400 });
    }

    if (!tablesInitialized) {
      await initAnalyticsTables();
      tablesInitialized = true;
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const salt = process.env.DATABASE_URL?.slice(-8) || "smartfurni";
    const ipHash = crypto.createHash("sha256").update(ip + salt).digest("hex").slice(0, 16);

    await trackBlogProductClick({
      postSlug,
      productSlug,
      productName: typeof body.productName === "string" ? body.productName.slice(0, 220) : "",
      targetPath,
      sessionId: typeof body.sessionId === "string" ? body.sessionId.slice(0, 180) : "",
      ipHash,
      ua: req.headers.get("user-agent") || "",
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
