import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit-helper";
import { AiCommandAccessError, requireAiCommandAccess } from "@/lib/ai-command/access";
import { persistAgentResult } from "@/lib/ai-command/runtime";
import { resumeCommand } from "@/lib/ai-command/orchestrator";
import { assertTrustedJsonRequest } from "@/lib/ai-command/security";
import { decideApproval, getApproval, getOwnedThread, getRunWithState, updateRun } from "@/lib/ai-command/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BodySchema = z.object({ decision: z.enum(["approve", "reject"]) });

function callId(item: { rawItem: unknown; name?: string }) {
  const raw = item.rawItem as { callId?: string; id?: string };
  return raw.callId || raw.id || item.name || "unknown";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let activeRunId: string | null = null;
  try {
    assertTrustedJsonRequest(req);
    const access = await requireAiCommandAccess(true);
    const { id } = await params;
    const { decision } = BodySchema.parse(await req.json());
    const approval = await getApproval(id);
    if (!approval) return NextResponse.json({ error: "Không tìm thấy yêu cầu phê duyệt." }, { status: 404 });
    activeRunId = approval.runId;
    const thread = await getOwnedThread(approval.threadId, access.actor);
    if (!thread) return NextResponse.json({ error: "Bạn không có quyền với cuộc hội thoại này." }, { status: 403 });
    if (approval.status !== "pending") return NextResponse.json({ error: "Yêu cầu này đã được xử lý." }, { status: 409 });
    if (new Date(approval.expiresAt).getTime() < Date.now()) {
      await decideApproval(id, "expired", access.actor.id);
      return NextResponse.json({ error: "Yêu cầu phê duyệt đã hết hạn. Hãy yêu cầu AI lập lại tác vụ." }, { status: 410 });
    }
    const runRow = await getRunWithState(approval.runId);
    const stateJson = runRow?.state_json ? String(runRow.state_json) : "";
    if (!stateJson) return NextResponse.json({ error: "Phiên AI không còn trạng thái để tiếp tục." }, { status: 409 });

    const context = { actor: access.actor, threadId: approval.threadId, runId: approval.runId };
    const { agent, state, runner } = await resumeCommand(stateJson, context);
    const interruption = state.getInterruptions().find((item: any) => callId(item) === approval.toolCallId);
    if (!interruption) return NextResponse.json({ error: "Không khớp được tác vụ đang chờ duyệt." }, { status: 409 });
    if (decision === "approve") state.approve(interruption);
    else state.reject(interruption);
    const decided = await decideApproval(id, decision === "approve" ? "approved" : "rejected", access.actor.id);
    if (!decided) return NextResponse.json({ error: "Yêu cầu vừa được xử lý ở một phiên khác." }, { status: 409 });
    await logAudit({
      action: "ai.approval_decided", entityType: "ai_approval", entityId: approval.id, entityName: approval.title,
      actorId: access.actor.id, actorName: access.actor.name,
      metadata: { decision, runId: approval.runId, threadId: approval.threadId, toolName: approval.toolName },
    });
    await updateRun(approval.runId, { status: "running", stateJson: state.toString() });
    const result = await runner.run(agent, state, { maxTurns: 10 });
    const snapshot = await persistAgentResult({ result, runId: approval.runId, threadId: approval.threadId, actor: access.actor });
    return NextResponse.json({ snapshot, access: { canApprove: access.canApprove, actor: access.actor } });
  } catch (error) {
    if (activeRunId) {
      await updateRun(activeRunId, {
        status: "failed",
        error: "Không thể tiếp tục tác vụ sau phê duyệt.",
      }).catch(() => undefined);
    }
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Quyết định chưa hợp lệ." }, { status: 400 });
    if (error instanceof AiCommandAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[ai-command] Approval failed", error);
    return NextResponse.json({ error: "Không thể tiếp tục tác vụ sau phê duyệt." }, { status: 500 });
  }
}
