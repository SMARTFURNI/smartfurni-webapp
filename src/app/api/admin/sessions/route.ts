import { NextRequest, NextResponse } from "next/server";
import { getSessions, getSessionDetail, getActiveSessionCount, ensureSessionTables } from "@/lib/session-store";

let tablesReady = false;
async function ensureTables() {
  if (!tablesReady) {
    await ensureSessionTables();
    tablesReady = true;
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureTables();
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const filter = (searchParams.get("filter") || "all") as "all" | "active" | "today" | "week";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (sessionId) {
      const detail = await getSessionDetail(sessionId);
      if (!detail) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      return NextResponse.json(detail);
    }

    const [result, activeNow] = await Promise.all([
      getSessions({ limit, offset, filter }),
      getActiveSessionCount(),
    ]);

    return NextResponse.json({ ...result, activeNow });
  } catch (err) {
    console.error("[admin/sessions] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
