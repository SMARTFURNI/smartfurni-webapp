import { NextRequest, NextResponse } from "next/server";
import { updateSessionHeartbeat, markSessionOffline } from "@/lib/session-store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, currentPath, currentTitle, action } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    if (action === "offline" || action === "unload") {
      // Khách thoát web — đánh dấu offline ngay lập tức
      await markSessionOffline(sessionId);
      return NextResponse.json({ ok: true, status: "offline" });
    }

    // Heartbeat bình thường — cập nhật last_seen và trang hiện tại
    await updateSessionHeartbeat(sessionId, currentPath || "/", currentTitle || "");
    return NextResponse.json({ ok: true, status: "online" });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
