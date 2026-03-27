import { NextRequest, NextResponse } from "next/server";
import { ensureSessionTables, trackSessionPage, updatePageDuration } from "@/lib/session-store";

let tablesReady = false;

async function ensureTables() {
  if (!tablesReady) {
    await ensureSessionTables();
    tablesReady = true;
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTables();
    const body = await req.json();
    const { type, sessionId, path, title, referrer, prevPath, prevDuration, duration } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const ua = req.headers.get("user-agent") || "";

    if (type === "pageview") {
      await trackSessionPage({
        sessionId,
        path: path || "/",
        title: title || path || "/",
        referrer: referrer || "",
        ua,
        prevPath,
        prevDuration,
      });
    } else if (type === "duration") {
      await updatePageDuration({
        sessionId,
        path: path || "/",
        duration: Math.min(duration || 0, 3600), // cap at 1 hour
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[track-session] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
