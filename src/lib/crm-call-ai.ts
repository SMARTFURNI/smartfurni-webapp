import OpenAI, { toFile } from "openai";
import { z } from "zod";
import { query, queryOne } from "@/lib/db";
import { createActivity, createTask, getCallLog, getLead, updateCallLog } from "@/lib/crm-store";
import type { CallAiAnalysis, CallLog } from "@/lib/crm-types";

const PROMPT_VERSION = "smartfurni-call-analysis-v1";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
let initialized = false;

const analysisSchema = z.object({
  executiveSummary: z.string().default(""),
  customerContext: z.object({
    role: z.string().default("Chưa xác định"),
    customerType: z.string().default("Chưa xác định"),
    businessModel: z.string().default("Chưa xác định"),
    location: z.string().default("Chưa xác định"),
  }).default({}),
  needs: z.object({
    primaryNeed: z.string().default("Chưa xác định"),
    products: z.array(z.string()).default([]),
    useCases: z.array(z.string()).default([]),
    quantity: z.string().default("Chưa xác định"),
    dimensions: z.string().default("Chưa xác định"),
    budget: z.string().default("Chưa xác định"),
    timeline: z.string().default("Chưa xác định"),
    priorities: z.array(z.string()).default([]),
    painPoints: z.array(z.string()).default([]),
  }).default({}),
  conversation: z.object({
    intent: z.string().default("Chưa xác định"),
    sentiment: z.string().default("Trung tính"),
    interestLevel: z.string().default("Chưa xác định"),
    questions: z.array(z.string()).default([]),
    objections: z.array(z.string()).default([]),
    commitments: z.array(z.string()).default([]),
    buyingSignals: z.array(z.string()).default([]),
    risks: z.array(z.string()).default([]),
    competitors: z.array(z.string()).default([]),
  }).default({}),
  qualification: z.object({
    fitScore: z.coerce.number().min(0).max(100).default(0),
    urgencyScore: z.coerce.number().min(0).max(100).default(0),
    purchaseProbability: z.coerce.number().min(0).max(100).default(0),
    dataGaps: z.array(z.string()).default([]),
    disqualifiers: z.array(z.string()).default([]),
  }).default({}),
  nextBestAction: z.object({
    title: z.string().default("Liên hệ lại khách hàng"),
    objective: z.string().default("Làm rõ nhu cầu còn thiếu"),
    channel: z.enum(["call", "zalo", "email", "meeting"]).default("call"),
    dueInHours: z.coerce.number().min(1).max(720).default(24),
    priority: z.enum(["high", "medium", "low"]).default("medium"),
    rationale: z.string().default(""),
    checklist: z.array(z.string()).default([]),
    draftMessage: z.string().default(""),
    callScript: z.array(z.string()).default([]),
    stageSuggestion: z.string().default("Giữ nguyên"),
    workflowRecommendation: z.enum(["continue", "suggest_pause", "suggest_stop"]).default("continue"),
    workflowReason: z.string().default("Workflow tiếp tục cho đến khi nhân viên chủ động thay đổi."),
  }).default({}),
  evidence: z.array(z.object({
    quote: z.string().default(""),
    reason: z.string().default(""),
    timestamp: z.string().default(""),
  })).default([]),
  warnings: z.array(z.string()).default([]),
  confidence: z.coerce.number().min(0).max(100).default(0),
});

export type CallAiJobResult = { callLogId: string; status: string; error?: string };

export async function initCallAiSchema() {
  if (initialized) return;
  await query(`
    CREATE TABLE IF NOT EXISTS crm_call_ai_jobs (
      call_log_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      claimed_at TIMESTAMPTZ,
      last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_call_ai_jobs_due ON crm_call_ai_jobs(status, next_attempt_at)`);
  initialized = true;
}

export function isCallEligibleForAi(call: Pick<CallLog, "status" | "duration" | "recordingUrl">) {
  const minimumDuration = Math.max(5, Number(process.env.CALL_AI_MIN_DURATION_SECONDS || 10));
  return call.status === "answered" && Boolean(call.recordingUrl) && call.duration >= minimumDuration;
}

export async function enqueueCallAiAnalysis(callLogId: string, force = false) {
  await initCallAiSchema();
  const call = await getCallLog(callLogId);
  if (!call || !isCallEligibleForAi(call)) return false;
  await query(
    `INSERT INTO crm_call_ai_jobs (call_log_id, status, attempts, next_attempt_at, created_at, updated_at)
     VALUES ($1, 'pending', 0, NOW(), NOW(), NOW())
     ON CONFLICT (call_log_id) DO UPDATE SET
       status = CASE WHEN $2::boolean OR crm_call_ai_jobs.status = 'failed' THEN 'pending' ELSE crm_call_ai_jobs.status END,
       attempts = CASE WHEN $2::boolean THEN 0 ELSE crm_call_ai_jobs.attempts END,
       next_attempt_at = CASE WHEN $2::boolean OR crm_call_ai_jobs.status = 'failed' THEN NOW() ELSE crm_call_ai_jobs.next_attempt_at END,
       last_error = CASE WHEN $2::boolean THEN NULL ELSE crm_call_ai_jobs.last_error END,
       updated_at = NOW()`,
    [callLogId, force],
  );
  await updateCallLog(callLogId, { aiStatus: "pending", aiError: undefined });
  return true;
}

async function claimJob(callLogId?: string) {
  await initCallAiSchema();
  return queryOne<{ call_log_id: string }>(
    `WITH candidate AS (
       SELECT call_log_id FROM crm_call_ai_jobs
       WHERE status IN ('pending','failed') AND next_attempt_at <= NOW() AND attempts < 4
         AND ($1::text IS NULL OR call_log_id = $1)
       ORDER BY next_attempt_at ASC
       FOR UPDATE SKIP LOCKED LIMIT 1
     )
     UPDATE crm_call_ai_jobs j SET status='processing', attempts=j.attempts+1, claimed_at=NOW(), updated_at=NOW()
     FROM candidate c WHERE j.call_log_id=c.call_log_id
     RETURNING j.call_log_id`,
    [callLogId ?? null],
  );
}

function validateRecordingUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  const extraHosts = (process.env.CALL_AI_RECORDING_HOSTS || "")
    .split(",").map(item => item.trim().toLowerCase()).filter(Boolean);
  const allowed = host === "ity.vn" || host.endsWith(".ity.vn") || extraHosts.includes(host);
  if (url.protocol !== "https:" || !allowed) throw new Error("Nguồn bản ghi âm không nằm trong danh sách an toàn");
  return url;
}

function audioMetadata(url: URL, contentType: string | null) {
  const fromPath = url.pathname.split(".").pop()?.toLowerCase();
  const allowed = new Set(["mp3", "mp4", "mpeg", "mpga", "m4a", "wav", "webm"]);
  const ext = fromPath && allowed.has(fromPath) ? fromPath : contentType?.includes("wav") ? "wav" : contentType?.includes("webm") ? "webm" : contentType?.includes("mp4") ? "m4a" : "mp3";
  const mime = contentType?.split(";")[0] || (ext === "wav" ? "audio/wav" : ext === "webm" ? "audio/webm" : "audio/mpeg");
  return { filename: `call-recording.${ext}`, mime };
}

async function downloadRecording(recordingUrl: string) {
  const url = validateRecordingUrl(recordingUrl);
  const response = await fetch(url, { signal: AbortSignal.timeout(60_000), redirect: "follow" });
  if (!response.ok) throw new Error(`Không tải được bản ghi âm (${response.status})`);
  validateRecordingUrl(response.url);
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > MAX_AUDIO_BYTES) throw new Error("Bản ghi âm vượt quá giới hạn 25 MB");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("Bản ghi âm rỗng");
  if (buffer.length > MAX_AUDIO_BYTES) throw new Error("Bản ghi âm vượt quá giới hạn 25 MB");
  return { buffer, ...audioMetadata(url, response.headers.get("content-type")) };
}

function analysisPrompt(call: CallLog, lead: Awaited<ReturnType<typeof getLead>>, transcript: string) {
  return `Bạn là AI sales analyst của SmartFurni. Hãy phân tích cuộc gọi tiếng Việt cực kỳ chi tiết nhưng tuyệt đối không bịa dữ liệu.
SmartFurni bán sofa giường cho homestay/BnB/phòng trọ/căn hộ và giường công thái học hoặc khung nâng hạ cho khách lẻ.

Thông tin CRM hiện có:
- Khách hàng: ${lead?.name || call.leadName || "Chưa xác định"}
- Công ty: ${lead?.company || "Chưa xác định"}
- Phân loại: ${lead?.type || "Chưa xác định"}
- Sản phẩm quan tâm: ${(lead?.interestedProducts || []).join(", ") || "Chưa xác định"}
- Khu vực: ${lead?.district || "Chưa xác định"}
- Giai đoạn: ${lead?.stage || "Chưa xác định"}
- Giá trị dự kiến: ${lead?.expectedValue || "Chưa xác định"}
- Ghi chú CRM: ${lead?.notes || "Không có"}

Bản chép lời:
${transcript}

Trả về đúng JSON với các khóa: executiveSummary; customerContext {role,customerType,businessModel,location}; needs {primaryNeed,products,useCases,quantity,dimensions,budget,timeline,priorities,painPoints}; conversation {intent,sentiment,interestLevel,questions,objections,commitments,buyingSignals,risks,competitors}; qualification {fitScore,urgencyScore,purchaseProbability,dataGaps,disqualifiers}; nextBestAction {title,objective,channel,dueInHours,priority,rationale,checklist,draftMessage,callScript,stageSuggestion,workflowRecommendation,workflowReason}; evidence [{quote,reason,timestamp}]; warnings; confidence.

Quy tắc bắt buộc:
- Nếu không nghe thấy thông tin, ghi "Chưa xác định" hoặc thêm vào dataGaps; không suy diễn.
- quote phải là đoạn rất ngắn có thật trong transcript; timestamp để trống nếu không có.
- Điểm số 0-100 và phải thận trọng.
- Soạn draftMessage/callScript tự nhiên, cụ thể theo chính cuộc gọi, ưu tiên lợi ích thay vì thông số.
- Workflow chỉ là ĐỀ XUẤT: mặc định continue. Chỉ suggest_pause/suggest_stop khi có bằng chứng rõ như khách yêu cầu ngừng, đã mua, không phù hợp hoặc cần nhân viên xử lý. Không tự đổi giai đoạn hay dừng workflow.`;
}

async function analyzeCall(call: CallLog): Promise<CallAiAnalysis> {
  if (!call.recordingUrl) throw new Error("Cuộc gọi chưa có bản ghi âm");
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY chưa được cấu hình");
  const client = new OpenAI({ apiKey });
  const transcriptionModel = process.env.CALL_AI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe-diarize";
  const analysisModel = process.env.CALL_AI_ANALYSIS_MODEL || "gpt-4o-mini";
  const audio = await downloadRecording(call.recordingUrl);
  const file = await toFile(audio.buffer, audio.filename, { type: audio.mime });
  const useDiarization = transcriptionModel.includes("diarize");
  const transcription = await client.audio.transcriptions.create(useDiarization ? {
    file,
    model: transcriptionModel,
    language: "vi",
    response_format: "diarized_json",
    chunking_strategy: "auto",
  } : {
    file,
    model: transcriptionModel,
    language: "vi",
    prompt: "SmartFurni, sofa giường, giường công thái học, khung nâng hạ, homestay, BnB, phòng trọ, báo giá, mặt bằng, kích thước",
  });
  const diarizedSegments = "segments" in transcription && Array.isArray(transcription.segments)
    ? transcription.segments as Array<{ speaker: string; start: number; end: number; text: string }>
    : [];
  const transcript = (diarizedSegments.length > 0
    ? diarizedSegments.map(segment => {
      const timestamp = new Date(Math.max(0, segment.start) * 1000).toISOString().slice(14, 19);
      return `[${timestamp}] Người nói ${segment.speaker}: ${segment.text.trim()}`;
    }).join("\n")
    : transcription.text)?.trim();
  if (!transcript) throw new Error("Không nhận diện được lời thoại trong bản ghi âm");
  const lead = call.leadId ? await getLead(call.leadId) : null;
  const completion = await client.chat.completions.create({
    model: analysisModel,
    temperature: 0.15,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Bạn phân tích cuộc gọi bán hàng SmartFurni bằng tiếng Việt, dựa hoàn toàn trên bằng chứng và trả về JSON hợp lệ." },
      { role: "user", content: analysisPrompt(call, lead, transcript) },
    ],
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("AI không trả về kết quả phân tích");
  const parsed = analysisSchema.parse(JSON.parse(raw));
  return {
    transcript,
    ...parsed,
    analyzedAt: new Date().toISOString(),
    transcriptionModel,
    analysisModel,
    promptVersion: PROMPT_VERSION,
    reviewStatus: "pending",
  };
}

async function processClaimedJob(callLogId: string): Promise<CallAiJobResult> {
  const call = await getCallLog(callLogId);
  if (!call || !isCallEligibleForAi(call)) {
    await query(`UPDATE crm_call_ai_jobs SET status='skipped', updated_at=NOW() WHERE call_log_id=$1`, [callLogId]);
    if (call) await updateCallLog(callLogId, { aiStatus: "insufficient", aiError: "Cuộc gọi chưa đủ thời lượng hoặc chưa có bản ghi âm" });
    return { callLogId, status: "insufficient" };
  }
  await updateCallLog(callLogId, { aiStatus: "processing", aiError: undefined });
  try {
    const analysis = await analyzeCall(call);
    await updateCallLog(callLogId, { aiStatus: "completed", aiSummary: analysis.executiveSummary, aiAnalysis: analysis, aiError: undefined });
    await query(`UPDATE crm_call_ai_jobs SET status='completed', last_error=NULL, updated_at=NOW() WHERE call_log_id=$1`, [callLogId]);
    return { callLogId, status: "completed" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi phân tích cuộc gọi";
    const retryDelayMinutes = 5;
    await updateCallLog(callLogId, { aiStatus: "failed", aiError: message });
    await query(`UPDATE crm_call_ai_jobs SET status='failed', last_error=$2, next_attempt_at=NOW()+($3 || ' minutes')::interval, updated_at=NOW() WHERE call_log_id=$1`, [callLogId, message, retryDelayMinutes]);
    return { callLogId, status: "failed", error: message };
  }
}

export async function processCallAiJob(callLogId: string) {
  const claimed = await claimJob(callLogId);
  if (!claimed) return { callLogId, status: "not_claimed" };
  return processClaimedJob(claimed.call_log_id);
}

export async function processDueCallAiJobs(limit = 1) {
  const results: CallAiJobResult[] = [];
  for (let index = 0; index < Math.max(1, Math.min(limit, 3)); index += 1) {
    const claimed = await claimJob();
    if (!claimed) break;
    results.push(await processClaimedJob(claimed.call_log_id));
  }
  return results;
}

function addHoursIso(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export async function approveCallAiNextAction(callLogId: string, reviewedBy: string) {
  const call = await getCallLog(callLogId);
  if (!call?.aiAnalysis || !call.leadId) throw new Error("Chưa có phân tích AI hoặc cuộc gọi chưa liên kết khách hàng");
  if (call.aiAnalysis.createdTaskId) return { call, task: null, duplicate: true };
  const action = call.aiAnalysis.nextBestAction;
  const task = await createTask({
    leadId: call.leadId,
    leadName: call.leadName || "Khách hàng",
    title: action.title,
    dueDate: addHoursIso(action.dueInHours),
    priority: action.priority,
    done: false,
    assignedTo: call.staffName || reviewedBy,
  });
  const analysis: CallAiAnalysis = {
    ...call.aiAnalysis,
    reviewStatus: "approved",
    reviewedAt: new Date().toISOString(),
    reviewedBy,
    createdTaskId: task.id,
  };
  const updated = await updateCallLog(callLogId, { aiAnalysis: analysis });
  await createActivity({
    leadId: call.leadId,
    type: "note",
    title: "Đã duyệt đề xuất AI sau cuộc gọi",
    content: `${action.title}. Mục tiêu: ${action.objective}. Lý do: ${action.rationale}`,
    createdBy: reviewedBy,
    attachments: [],
  });
  return { call: updated, task, duplicate: false };
}
