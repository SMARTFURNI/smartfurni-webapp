import type { RunResult, RunToolApprovalItem } from "@openai/agents";
import { logAudit } from "@/lib/audit-helper";
import { addMessage, createApproval, getSnapshot, updateRun, updateThreadResponseContext } from "./store";
import { getApprovalPresentation } from "./tools";
import type { AiCommandActor, AiCommandMode, AiCommandSnapshot } from "./types";

function getToolCallId(item: RunToolApprovalItem) {
  const raw = item.rawItem as { callId?: string; id?: string };
  return raw.callId || raw.id || item.name || "unknown";
}

function parseArguments(item: RunToolApprovalItem) {
  try {
    return JSON.parse(item.arguments || "{}") as Record<string, unknown>;
  } catch {
    return { raw: item.arguments || "" };
  }
}

function usageToJson(result: RunResult<any, any>) {
  return JSON.parse(JSON.stringify(result.state.usage || {})) as Record<string, unknown>;
}

export async function persistAgentResult(params: {
  result: RunResult<any, any>;
  runId: string;
  threadId: string;
  actor: AiCommandActor;
  mode: AiCommandMode;
  model: string;
}): Promise<AiCommandSnapshot> {
  const { result, runId, threadId, actor, mode, model } = params;
  if (result.interruptions.length > 0) {
    const approvals = [];
    for (const interruption of result.interruptions) {
      const toolName = interruption.name || interruption.toolName || "unknown_tool";
      const presentation = getApprovalPresentation(toolName);
      const approval = await createApproval({
        runId, threadId, toolName, toolCallId: getToolCallId(interruption),
        title: presentation.title, description: presentation.description,
        arguments: parseArguments(interruption), riskLevel: presentation.riskLevel,
      });
      approvals.push(approval);
      await logAudit({
        action: "ai.approval_requested", entityType: "ai_approval", entityId: approval.id,
        entityName: presentation.title, actorId: actor.id, actorName: actor.name,
        metadata: { runId, threadId, toolName, riskLevel: presentation.riskLevel },
      });
    }
    await updateRun(runId, {
      status: "awaiting_approval", stateJson: result.state.toString(), usage: usageToJson(result),
    });
    await addMessage(
      threadId,
      "assistant",
      approvals.length === 1
        ? `Tôi đã chuẩn bị tác vụ “${approvals[0].title}”. Vui lòng kiểm tra nội dung và phê duyệt trước khi thực hiện.`
        : `Tôi đã chuẩn bị ${approvals.length} tác vụ. Vui lòng kiểm tra và phê duyệt từng tác vụ trước khi thực hiện.`,
      { status: "awaiting_approval", runId, approvalIds: approvals.map(item => item.id), mode, model },
    );
  } else {
    const output = String(result.finalOutput || "Tác vụ đã hoàn tất nhưng không có nội dung trả về.");
    await updateRun(runId, { status: "completed", output, stateJson: null, usage: usageToJson(result) });
    await addMessage(threadId, "assistant", output, { status: "completed", runId, mode, model });
    await updateThreadResponseContext(threadId, result.state._previousResponseId);
    await logAudit({
      action: "ai.run_completed", entityType: "ai_run", entityId: runId,
      entityName: "Trợ lý Điều hành AI", actorId: actor.id, actorName: actor.name,
      metadata: { threadId },
    });
  }
  return (await getSnapshot(threadId, actor))!;
}
