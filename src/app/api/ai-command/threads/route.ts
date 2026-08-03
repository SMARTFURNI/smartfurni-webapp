import { NextRequest, NextResponse } from "next/server";
import { AiCommandAccessError, requireAiCommandAccess } from "@/lib/ai-command/access";
import { getSnapshot, listThreads } from "@/lib/ai-command/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const access = await requireAiCommandAccess();
    const threadId = req.nextUrl.searchParams.get("threadId");
    if (threadId) {
      const snapshot = await getSnapshot(threadId, access.actor);
      if (!snapshot) return NextResponse.json({ error: "Không tìm thấy cuộc hội thoại." }, { status: 404 });
      return NextResponse.json({ snapshot, access: { canApprove: access.canApprove, actor: access.actor } });
    }
    const threads = await listThreads(access.actor);
    return NextResponse.json({ threads, access: { canApprove: access.canApprove, actor: access.actor } });
  } catch (error) {
    if (error instanceof AiCommandAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[ai-command] Cannot load threads", error);
    return NextResponse.json({ error: "Không thể tải Trợ lý Điều hành AI." }, { status: 500 });
  }
}
