import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logAudit } from "@/lib/audit-helper";
import { AiCommandAccessError, requireAiCommandAccess } from "@/lib/ai-command/access";
import { AI_COMMAND_MODEL, runCommand } from "@/lib/ai-command/orchestrator";
import { persistAgentResult } from "@/lib/ai-command/runtime";
import { assertTrustedJsonRequest, enforceAiCommandRateLimit } from "@/lib/ai-command/security";
import { addMessage, createRun, createThread, getOwnedThread, hasActiveRun, listMessages, updateRun } from "@/lib/ai-command/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BodySchema = z.object({
  threadId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(4000),
  surface: z.enum(["crm", "admin"]).default("crm"),
});

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/api.?key|OPENAI_API_KEY|401/i.test(message)) return "OpenAI chưa được cấu hình hợp lệ trên máy chủ.";
  if (/rate|429|quota/i.test(message)) return "Hệ thống AI đang bận hoặc đã chạm giới hạn. Vui lòng thử lại sau.";
  return "Trợ lý chưa xử lý được yêu cầu này. Vui lòng thử lại.";
}

export async function POST(req: NextRequest) {
  let runId: string | undefined;
  let threadId: string | undefined;
  try {
    assertTrustedJsonRequest(req);
    const access = await requireAiCommandAccess();
    await enforceAiCommandRateLimit(access.actor);
    const body = BodySchema.parse(await req.json());
    if (body.surface === "admin" && access.actor.kind !== "admin") {
      throw new AiCommandAccessError("Chỉ quản trị viên được sử dụng bề mặt Admin.");
    }

    let thread = body.threadId ? await getOwnedThread(body.threadId, access.actor) : null;
    if (body.threadId && !thread) return NextResponse.json({ error: "Không tìm thấy cuộc hội thoại." }, { status: 404 });
    if (!thread) {
      thread = await createThread(access.actor, body.surface, body.message);
      await logAudit({
        action: "ai.thread_created", entityType: "ai_thread", entityId: thread.id, entityName: thread.title,
        actorId: access.actor.id, actorName: access.actor.name, metadata: { surface: body.surface },
      });
    }
    threadId = thread.id;
    if (await hasActiveRun(thread.id)) {
      return NextResponse.json({ error: "Cuộc hội thoại đang có tác vụ chờ xử lý hoặc phê duyệt." }, { status: 409 });
    }
    await addMessage(thread.id, "user", body.message);
    const history = await listMessages(thread.id, 16);
    const transcript = history.map(item => `${item.role === "user" ? "Người dùng" : "Trợ lý"}: ${item.content}`).join("\n\n");
    const run = await createRun({ threadId: thread.id, actor: access.actor, model: AI_COMMAND_MODEL, input: body.message });
    runId = run.id;
    await logAudit({
      action: "ai.run_started", entityType: "ai_run", entityId: run.id, entityName: "Trợ lý Điều hành AI",
      actorId: access.actor.id, actorName: access.actor.name, metadata: { threadId: thread.id, model: AI_COMMAND_MODEL },
    });

    const result = await runCommand(
      `Đây là lịch sử gần nhất của cuộc hội thoại nội bộ. Hãy xử lý yêu cầu cuối cùng.\n\n${transcript}`,
      { actor: access.actor, threadId: thread.id, runId: run.id },
    );
    const snapshot = await persistAgentResult({ result, runId: run.id, threadId: thread.id, actor: access.actor });
    return NextResponse.json({ snapshot, access: { canApprove: access.canApprove, actor: access.actor } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Nội dung yêu cầu chưa hợp lệ.", details: error.flatten() }, { status: 400 });
    if (error instanceof AiCommandAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
    const message = safeError(error);
    if (runId) await updateRun(runId, { status: "failed", error: message, stateJson: null });
    if (threadId) await addMessage(threadId, "assistant", message, { status: "failed", runId });
    console.error("[ai-command] Run failed", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
