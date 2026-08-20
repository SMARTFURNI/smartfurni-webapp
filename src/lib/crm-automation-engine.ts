/**
 * crm-automation-engine.ts
 * Engine thực thi tự động hoá chăm sóc khách hàng SmartFurni CRM
 *
 * Nhóm 1: Nhắc nhở & Follow-up tự động
 * Nhóm 2: Automation theo giai đoạn
 * Nhóm 3: Phân loại & ưu tiên thông minh (Hot lead, auto-assign)
 * Nhóm 4: Thông báo đa kênh (Zalo/Email theo template)
 */
import { getLead, getLeads, createTask, updateLead } from "./crm-store";
import { getAutomationRules, getAutoAssignConfig, getSlaConfig, saveAutomationRules } from "./crm-automation-store";
import { getNotificationRules, logNotification } from "./crm-notifications-store";
import type { Lead } from "./crm-types";
import type { AutomationRule, AutomationAction } from "./crm-automation-store";
import { findZaloUserByPhone, sendZaloAttachment, sendZaloMessage, isZaloConnected, initZaloGateway, sendZaloFriendRequest } from "./zalo-gateway";
import { getMediaObject } from "./media-storage";
import { getZaloMediaAssets, incrementZaloMediaUsage } from "./zalo-media-library-store";
import { sendAutomationEmail } from "./crm-automation-email";
import {
  claimAutomationExecution,
  claimDueAutomationEmails,
  claimDueAutomationZalo,
  completeAutomationExecution,
  enqueueAutomationEmail,
  enqueueAutomationZalo,
  failAutomationExecution,
  markAutomationEmailFailed,
  markAutomationEmailSent,
  markAutomationZaloFailed,
  markAutomationZaloSent,
} from "./crm-automation-execution-store";
import { automationTriggerKey, isAutomationTriggerStageAllowed } from "./crm-automation-trigger";
import { evaluateAutomationContact } from "./crm-automation-policy";
import { getAllStaff } from "./crm-staff-store";
import { queryOne } from "./db";
import { prepareAutomationTrackedMessage } from "./crm-automation-link-tracking";

// Module-level init flag cho Zalo gateway
let zaloGatewayInitialized = false;
async function ensureZaloGateway(): Promise<boolean> {
  if (!zaloGatewayInitialized) {
    zaloGatewayInitialized = true;
    await initZaloGateway().catch(() => {});
  }
  let waited = 0;
  while (!isZaloConnected() && waited < 5000) {
    await new Promise((r) => setTimeout(r, 300));
    waited += 300;
  }
  return isZaloConnected();
}

const STAGE_LABELS_VI: Record<string, string> = {
  new: "Kh\u00e1ch h\u00e0ng m\u1edbi",
  profile_sent: "\u0110\u00e3 g\u1eedi Profile",
  surveyed: "\u0110\u00e3 kh\u1ea3o s\u00e1t",
  quoted: "\u0110\u00e3 b\u00e1o gi\u00e1",
  negotiating: "Th\u01b0\u01a1ng th\u1ea3o",
  won: "\u0110\u00e3 ch\u1ed1t",
  lost: "Th\u1ea5t b\u1ea1i",
};

// ─── Run log entry ─────────────────────────────────────────────────────────────
export interface AutomationRunLog {
  ruleId: string;
  ruleName: string;
  leadId: string;
  leadName: string;
  actionsExecuted: string[];
  triggeredAt: string;
  success: boolean;
  error?: string;
}

export interface AutomationRunResult {
  startedAt: string;
  finishedAt: string;
  totalLeads: number;
  totalRulesChecked: number;
  totalTriggered: number;
  logs: AutomationRunLog[];
}

export interface AutomationPreviewResult {
  totalLeads: number;
  enabledRules: number;
  matchedActions: number;
  matches: Array<{ leadId: string; leadName: string; ruleId: string; ruleName: string; actionCount: number }>;
  generatedAt: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

async function getStageEnteredAt(lead: Lead): Promise<string> {
  const row = await queryOne<{ occurred_at: string }>(
    `SELECT occurred_at FROM crm_lead_stage_history
     WHERE lead_id=$1 AND to_stage=$2 ORDER BY occurred_at DESC LIMIT 1`,
    [lead.id, lead.stage],
  ).catch(() => null);
  return row?.occurred_at ? new Date(row.occurred_at).toISOString() : lead.createdAt;
}

function hoursSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 9999;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60));
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function renderActionTemplate(template: string, lead: Lead): string {
  return template
    .replace(/\{\{name\}\}/g, lead.name)
    .replace(/\{\{company\}\}/g, lead.company ?? "")
    .replace(/\{\{stage\}\}/g, STAGE_LABELS_VI[lead.stage] ?? lead.stage)
    .replace(/\{\{phone\}\}/g, lead.phone ?? "")
    .replace(/\{\{email\}\}/g, lead.email ?? "")
    .replace(/\{\{assignedTo\}\}/g, lead.assignedTo ?? "")
    .replace(/\{\{value\}\}/g, lead.expectedValue?.toLocaleString("vi-VN") ?? "0");
}

async function loadAutomationMedia(assetIds: string[]) {
  const requestedIds = [...new Set(assetIds)].slice(0, 10);
  const assets = await getZaloMediaAssets(requestedIds);
  if (assets.length !== requestedIds.length) throw new Error("Một hoặc nhiều media của mẫu không còn trong thư viện");
  return Promise.all(assets.map(async asset => {
    const object = await getMediaObject(asset.objectKey);
    if (!object.Body) throw new Error(`File ${asset.name} không còn trong thư viện`);
    return { asset, buffer: Buffer.from(await object.Body.transformToByteArray()) };
  }));
}

async function sendAutomationZaloNow(input: {
  lead: Lead;
  ruleId: string;
  ruleName: string;
  recipient: string;
  message: string;
  fallbackToAddFriend: boolean;
  mediaAssetIds: string[];
}): Promise<string> {
  const connected = await ensureZaloGateway();
  if (!connected) throw new Error("Zalo Personal chưa kết nối.");
  const normalizedPhone = input.recipient.replace(/\s+/g, "").replace(/^\+84/, "0").replace(/^84/, "0");
  const findResult = await findZaloUserByPhone(normalizedPhone);
  if (!findResult.success || !findResult.user?.uid) {
    if (input.fallbackToAddFriend) {
      const request = await sendZaloFriendRequest({
        userId: normalizedPhone,
        message: `Xin chào ${input.lead.name}! Tôi là nhân viên SmartFurni.`,
      }).catch(error => ({ success: false, error: error instanceof Error ? error.message : "unknown" }));
      if (request.success) return `Đã gửi lời mời kết bạn Zalo đến ${normalizedPhone}`;
      throw new Error(`Không tìm thấy tài khoản Zalo và không gửi được lời mời kết bạn: ${request.error || "unknown"}`);
    }
    throw new Error(`Không tìm thấy tài khoản Zalo với số ${normalizedPhone}.`);
  }

  const { uid } = findResult.user;
  const trackedMessage = await prepareAutomationTrackedMessage({
    message: input.message,
    ruleId: input.ruleId,
    ruleName: input.ruleName,
    leadId: input.lead.id,
    leadName: input.lead.name,
    channel: "zalo_personal",
  }).catch(error => {
    console.error("[Automation Zalo tracking]", error);
    return input.message;
  });
  const sendResult = await sendZaloMessage({ conversationId: uid, content: trackedMessage });
  if (!sendResult.success) {
    throw new Error(`Không gửi được Zalo: ${sendResult.error || "unknown"}`);
  }

  const media = await loadAutomationMedia(input.mediaAssetIds);
  const sentMediaIds: string[] = [];
  for (const item of media) {
    const attachment = await sendZaloAttachment({
      conversationId: uid,
      fileBuffer: item.buffer,
      fileName: item.asset.name,
      mimeType: item.asset.contentType,
      fileSize: item.asset.sizeBytes || item.buffer.byteLength,
      width: item.asset.width || undefined,
      height: item.asset.height || undefined,
      duration: item.asset.durationMs ? item.asset.durationMs / 1000 : undefined,
      stableUrl: item.asset.url,
      stableThumb: item.asset.url,
      skipMirror: true,
    });
    if (!attachment.success) throw new Error(`Tin chữ đã gửi nhưng không gửi được ${item.asset.name}: ${attachment.error || "unknown"}`);
    sentMediaIds.push(item.asset.id);
  }
  await incrementZaloMediaUsage(sentMediaIds);
  await logNotification({
    ruleId: input.ruleId, ruleName: input.ruleName, channel: "zalo", actionType: "zalo_personal",
    recipient: normalizedPhone, leadId: input.lead.id, leadName: input.lead.name,
    message: input.message.slice(0, 500), status: "sent",
  });
  return `Đã gửi Zalo đến ${input.lead.name} (${normalizedPhone})`;
}

// ─── Check if a rule's trigger matches a lead ─────────────────────────────────
function checkTrigger(rule: AutomationRule, lead: Lead): boolean {
  const { trigger } = rule;
  // Chỉ xử lý leads đang active (không phải won/lost)
  const activeStages = ["new", "profile_sent", "surveyed", "quoted", "negotiating"];
  if (!activeStages.includes(lead.stage)) return false;
  if (!isAutomationTriggerStageAllowed(trigger, lead.stage)) return false;

  switch (trigger.type) {
    case "no_activity_days": {
      const days = trigger.days ?? 3;
      return daysSince(lead.lastContactAt || lead.createdAt) >= days;
    }
    case "lead_created": {
      // Cho phép scheduler bắt bù trong 7 ngày; execution claim vẫn đảm bảo chỉ chạy một lần.
      return hoursSince(lead.createdAt) < 24 * 7;
    }
    case "value_threshold": {
      const min = trigger.minValue ?? 0;
      return lead.expectedValue >= min;
    }
    case "stage_duration": {
      // Mốc vào stage được kiểm tra bất đồng bộ trước khi chạy rule.
      return !trigger.fromStage || trigger.fromStage === lead.stage;
    }
    case "lead_type_match": {
      return !trigger.leadType || lead.type === trigger.leadType;
    }
    case "stage_changed": {
      // stage_changed chỉ trigger khi có event, không check định kỳ
      return false;
    }
    default:
      return false;
  }
}

// ─── Execute a single action on a lead ────────────────────────────────────────
async function executeAction(
  action: AutomationAction,
  lead: Lead,
  staffList: string[],
  rule?: AutomationRule,
  execution?: { triggerKey: string; actionIndex: number },
): Promise<string> {
  const ruleId = rule?.id ?? "manual";
  const ruleName = rule?.name ?? "Manual";
  switch (action.type) {
    case "create_task": {
      const dueDate = addDays(action.taskDueDays ?? 1);
      await createTask({
        leadId: lead.id,
        leadName: lead.name,
        title: action.taskTitle ?? `Follow-up: ${lead.name}`,
        dueDate,
        priority: action.taskPriority ?? "medium",
        done: false,
        assignedTo: lead.assignedTo ?? "",
      });
      return `Tao task "${action.taskTitle ?? "Follow-up"}" (han: ${dueDate})`;
    }

    case "add_tag": {
      const tag = action.tag ?? "";
      const currentTags = Array.isArray(lead.tags) ? lead.tags : [];
      if (tag && !currentTags.includes(tag)) {
        await updateLead(lead.id, { tags: [...currentTags, tag] });
        return `Gan tag "${tag}"`;
      }
      return `Tag "${tag}" da ton tai`;
    }

    case "assign_staff": {
      const activeStaff = (await getAllStaff()).filter(member => member.status === "active" && member.role !== "intern");
      const availableNames = activeStaff.length ? activeStaff.map(member => member.fullName) : staffList;
      if (!availableNames.length) return "Không có nhân viên đang hoạt động để phân công";
      let targetStaff = action.assignStaffId ? activeStaff.find(member => member.id === action.assignStaffId)?.fullName || "" : "";
      if (action.assignMode === "round_robin" && availableNames.length > 0) {
        const hash = lead.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        targetStaff = availableNames[hash % availableNames.length];
      } else if (action.assignMode === "least_loaded") {
        const load = new Map<string, number>();
        (await getLeads()).forEach(item => { if (item.assignedTo) load.set(item.assignedTo, (load.get(item.assignedTo) || 0) + 1); });
        targetStaff = [...availableNames].sort((a, b) => (load.get(a) || 0) - (load.get(b) || 0))[0];
      }
      if (targetStaff) {
        await updateLead(lead.id, { assignedTo: targetStaff });
        return `Phan cong cho "${targetStaff}"`;
      }
      return "Bo qua phan cong";
    }

    case "move_stage": {
      const target = action.targetStage as Lead["stage"];
      if (target && target !== lead.stage) {
        await updateLead(lead.id, { stage: target });
        return `Chuyen sang giai doan "${target}"`;
      }
      return "Bo qua chuyen giai doan";
    }

    case "notify_manager": {
      const msg = (action.notifyMessage ?? "Can chu y khach hang")
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{stage\}\}/g, lead.stage)
        .replace(/\{\{value\}\}/g, lead.expectedValue.toLocaleString("vi-VN"));
      await logNotification({
        ruleId,
        ruleName,
        channel: "in_app",
        recipient: lead.phone ?? "",
        leadId: lead.id,
        leadName: lead.name,
        message: msg,
        status: "sent",
      });
      return `Thong bao quan ly: "${msg}"`;
    }

    case "send_webhook": {
      if (!action.webhookUrl) throw new Error("Webhook chưa có URL.");
      const payload = (action.webhookPayload ?? JSON.stringify({ leadId: lead.id, leadName: lead.name }))
        .replace(/\{\{leadId\}\}/g, lead.id)
        .replace(/\{\{leadName\}\}/g, lead.name)
        .replace(/\{\{stage\}\}/g, lead.stage);
      const response = await fetch(action.webhookUrl, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: payload,
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new Error(`Webhook trả HTTP ${response.status}.`);
      return `Gửi webhook đến ${action.webhookUrl}`;
    }

    case "send_zalo_personal": {
      const phone = lead.zaloPhone || lead.phone;
      if (!phone) throw new Error("Khách hàng chưa có số điện thoại Zalo.");
      const normalizedPhone = phone.replace(/\s+/g, "").replace(/^\+84/, "0").replace(/^84/, "0");
      const rawMsg = action.zaloMessage || "Xin ch\u00e0o {{name}}! SmartFurni xin c\u1ea3m \u01a1n b\u1ea1n \u0111\u00e3 quan t\u00e2m.";
      const message = rawMsg
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{stage\}\}/g, STAGE_LABELS_VI[lead.stage] ?? lead.stage)
        .replace(/\{\{phone\}\}/g, normalizedPhone)
        .replace(/\{\{assignedTo\}\}/g, lead.assignedTo ?? "")
        .replace(/\{\{value\}\}/g, lead.expectedValue?.toLocaleString("vi-VN") ?? "0");
      const policy = await evaluateAutomationContact({ lead, channel: "zalo_personal", message });
      if (!policy.allowed && policy.code !== "quiet_hours") return `Chặn gửi Zalo: ${policy.reason}`;

      const delayMinutes = Math.max(0, action.zaloDelayMinutes ?? 0);
      if (delayMinutes > 0 || policy.code === "quiet_hours") {
        const scheduledAt = policy.retryAt ? new Date(policy.retryAt) : new Date(Date.now() + delayMinutes * 60_000);
        const queued = await enqueueAutomationZalo({
          dedupeKey: `${ruleId}:${lead.id}:${execution?.triggerKey || "manual"}:${execution?.actionIndex ?? 0}`,
          ruleId, ruleName, leadId: lead.id, leadName: lead.name, recipient: normalizedPhone, message,
          fallbackToAddFriend: Boolean(action.zaloFallbackToAddFriend), mediaAssetIds: action.mediaAssetIds || [], scheduledAt,
        });
        if (queued.queued) await logNotification({
          ruleId, ruleName, channel: "zalo", actionType: "zalo_personal", recipient: normalizedPhone,
          leadId: lead.id, leadName: lead.name, message: message.slice(0, 500), status: "pending",
        });
        return queued.queued ? `Đã xếp lịch Zalo lúc ${scheduledAt.toISOString()}` : "Zalo đã có trong hàng đợi, không tạo lặp";
      }

      try {
        return await sendAutomationZaloNow({ lead, ruleId, ruleName, recipient: normalizedPhone, message,
          fallbackToAddFriend: Boolean(action.zaloFallbackToAddFriend), mediaAssetIds: action.mediaAssetIds || [] });
      } catch (error) {
        const reason = error instanceof Error ? error.message : "unknown";
        await logNotification({ ruleId, ruleName, channel: "zalo", actionType: "zalo_personal", recipient: normalizedPhone,
          leadId: lead.id, leadName: lead.name, message: message.slice(0, 500), status: "failed", error: reason });
        throw error;
      }
    }

    case "send_email":
    case "send_email_workflow": {
      const recipient = lead.email?.trim() || "";
      if (!/^\S+@\S+\.\S+$/.test(recipient)) return "Bỏ qua email: khách hàng chưa có email hợp lệ";

      const subject = renderActionTemplate(
        action.emailSubject ?? "Thông báo từ SmartFurni CRM",
        lead,
      );
      const body = renderActionTemplate(
        action.emailBody ?? `Chào {{name}},\n\nSmartFurni gửi anh/chị thông tin cập nhật từ bộ phận chăm sóc khách hàng.\n\nTrân trọng,\nĐội ngũ SmartFurni`,
        lead,
      );
      const fromName = action.emailFromName ?? "SmartFurni";
      const delayMinutes = Math.max(0, action.emailDelayMinutes ?? 0);
      const policy = await evaluateAutomationContact({ lead, channel: "email", message: subject });
      if (!policy.allowed && policy.code !== "quiet_hours") return `Chặn gửi email: ${policy.reason}`;

      if (delayMinutes > 0 || policy.code === "quiet_hours") {
        const scheduledAt = policy.retryAt ? new Date(policy.retryAt) : new Date(Date.now() + delayMinutes * 60_000);
        const dedupeKey = `${ruleId}:${lead.id}:${execution?.triggerKey || "manual"}:${execution?.actionIndex ?? 0}`;
        const queued = await enqueueAutomationEmail({
          dedupeKey,
          ruleId,
          ruleName,
          leadId: lead.id,
          leadName: lead.name,
          recipient,
          subject,
          body,
          fromName,
          mediaAssetIds: action.mediaAssetIds || [],
          scheduledAt,
        });
        if (queued.queued) {
          await logNotification({
            ruleId, ruleName, channel: "email", recipient,
            leadId: lead.id, leadName: lead.name, message: subject,
            status: "pending", actionType: "send_email",
          });
        }
        return queued.queued
          ? `Đã lên lịch email lúc ${scheduledAt.toISOString()}: "${subject}"`
          : `Email đã có trong hàng đợi, không tạo lặp: "${subject}"`;
      }

      const media = await loadAutomationMedia(action.mediaAssetIds || []);
      const result = await sendAutomationEmail({ to: recipient, subject, body, fromName, media });
      if (result.outcome === "sent") await incrementZaloMediaUsage(media.map(item => item.asset.id));
      await logNotification({
        ruleId, ruleName, channel: "email", recipient,
        leadId: lead.id, leadName: lead.name, message: subject,
        status: result.outcome === "sent" ? "sent" : "failed",
        error: result.error, actionType: "send_email",
      });
      if (result.outcome === "sent") return `Đã gửi email: "${subject}" đến ${recipient}`;
      if (result.outcome === "delivery_unknown") {
        throw new Error(`Kết quả gửi email chưa rõ, không tự gửi lại: ${result.error || "unknown"}`);
      }
      throw new Error(`Không gửi được email: ${result.error || "unknown"}`);
    }

    default:
      return `Bo qua action khong xac dinh`;
  }
}

async function processDueAutomationEmails(): Promise<AutomationRunLog[]> {
  const logs: AutomationRunLog[] = [];
  const jobs = await claimDueAutomationEmails(20);
  for (const job of jobs) {
    let media: Awaited<ReturnType<typeof loadAutomationMedia>> = [];
    try {
      const lead = await getLead(job.leadId);
      if (!lead) throw new Error("Lead không còn tồn tại.");
      const policy = await evaluateAutomationContact({ lead, channel: "email", message: job.subject });
      if (!policy.allowed) {
        const retry = policy.code === "quiet_hours" || policy.code === "frequency_cap";
        await markAutomationEmailFailed({ id: job.id, error: policy.reason, retry, attempts: job.attempts });
        logs.push({
          ruleId: job.ruleId, ruleName: job.ruleName, leadId: job.leadId, leadName: job.leadName,
          actionsExecuted: [`Email bị chính sách liên hệ chặn: ${policy.reason}`],
          triggeredAt: new Date().toISOString(), success: false, error: policy.reason,
        });
        continue;
      }
      media = await loadAutomationMedia(job.mediaAssetIds);
      const result = await sendAutomationEmail({
        to: job.recipient,
        subject: job.subject,
        body: job.body,
        fromName: job.fromName,
        media,
      });
      if (result.outcome === "sent") {
        await incrementZaloMediaUsage(media.map(item => item.asset.id));
        await markAutomationEmailSent(job.id);
        await logNotification({
          ruleId: job.ruleId, ruleName: job.ruleName, channel: "email",
          recipient: job.recipient, leadId: job.leadId, leadName: job.leadName,
          message: job.subject, status: "sent", actionType: "send_email",
        });
        logs.push({
          ruleId: job.ruleId, ruleName: job.ruleName, leadId: job.leadId, leadName: job.leadName,
          actionsExecuted: [`Đã gửi email theo lịch: "${job.subject}"`],
          triggeredAt: new Date().toISOString(), success: true,
        });
        continue;
      }

      const error = result.error || "Không gửi được email trong hàng đợi.";
      // delivery_unknown không được tự gửi lại để tránh khách nhận trùng. Chỉ lỗi
      // cấu hình tạm thời mới được thử lại với backoff.
      const retry = result.outcome === "definitive_failure"
        && /RESEND_API_KEY|chưa được cấu hình/i.test(error);
      await markAutomationEmailFailed({ id: job.id, error, retry, attempts: job.attempts });
      await logNotification({
        ruleId: job.ruleId, ruleName: job.ruleName, channel: "email",
        recipient: job.recipient, leadId: job.leadId, leadName: job.leadName,
        message: job.subject, status: "failed", error, actionType: "send_email",
      });
      logs.push({
        ruleId: job.ruleId, ruleName: job.ruleName, leadId: job.leadId, leadName: job.leadName,
        actionsExecuted: [`Email theo lịch chưa gửi: ${error}`],
        triggeredAt: new Date().toISOString(), success: false, error,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không xử lý được email trong hàng đợi.";
      await markAutomationEmailFailed({ id: job.id, error: message, retry: false, attempts: job.attempts });
      await logNotification({
        ruleId: job.ruleId, ruleName: job.ruleName, channel: "email",
        recipient: job.recipient, leadId: job.leadId, leadName: job.leadName,
        message: job.subject, status: "failed", error: message, actionType: "send_email",
      });
      logs.push({
        ruleId: job.ruleId, ruleName: job.ruleName, leadId: job.leadId, leadName: job.leadName,
        actionsExecuted: [`Email theo lịch lỗi: ${message}`],
        triggeredAt: new Date().toISOString(), success: false, error: message,
      });
    }
  }
  return logs;
}

async function processDueAutomationZalo(): Promise<AutomationRunLog[]> {
  const logs: AutomationRunLog[] = [];
  const jobs = await claimDueAutomationZalo(20);
  for (const job of jobs) {
    try {
      const lead = await getLead(job.leadId);
      if (!lead) throw new Error("Lead không còn tồn tại.");
      const policy = await evaluateAutomationContact({ lead, channel: "zalo_personal", message: job.message });
      if (!policy.allowed) {
        const retry = policy.code === "quiet_hours" || policy.code === "frequency_cap";
        await markAutomationZaloFailed({ id: job.id, error: policy.reason, retry, attempts: job.attempts, retryAt: policy.retryAt });
        logs.push({ ruleId: job.ruleId, ruleName: job.ruleName, leadId: job.leadId, leadName: job.leadName,
          actionsExecuted: [`Zalo bị chính sách liên hệ chặn: ${policy.reason}`], triggeredAt: new Date().toISOString(), success: false, error: policy.reason });
        continue;
      }
      const result = await sendAutomationZaloNow({
        lead, ruleId: job.ruleId, ruleName: job.ruleName, recipient: job.recipient, message: job.message,
        fallbackToAddFriend: job.fallbackToAddFriend, mediaAssetIds: job.mediaAssetIds,
      });
      await markAutomationZaloSent(job.id);
      logs.push({ ruleId: job.ruleId, ruleName: job.ruleName, leadId: job.leadId, leadName: job.leadName,
        actionsExecuted: [result], triggeredAt: new Date().toISOString(), success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không xử lý được Zalo trong hàng đợi.";
      const retry = /chưa kết nối|timeout|temporar|ECONN|gateway/i.test(message);
      await markAutomationZaloFailed({ id: job.id, error: message, retry, attempts: job.attempts });
      await logNotification({ ruleId: job.ruleId, ruleName: job.ruleName, channel: "zalo", actionType: "zalo_personal",
        recipient: job.recipient, leadId: job.leadId, leadName: job.leadName, message: job.message.slice(0, 500), status: "failed", error: message });
      logs.push({ ruleId: job.ruleId, ruleName: job.ruleName, leadId: job.leadId, leadName: job.leadName,
        actionsExecuted: [`Zalo theo lịch lỗi: ${message}`], triggeredAt: new Date().toISOString(), success: false, error: message });
    }
  }
  return logs;
}

// ─── Nhóm 3: Smart tagging & Hot lead detection ────────────────────────────────
async function runSmartTagging(leads: Lead[]): Promise<AutomationRunLog[]> {
  const logs: AutomationRunLog[] = [];

  for (const lead of leads) {
    const activeStages = ["new", "profile_sent", "surveyed", "quoted", "negotiating"];
    if (!activeStages.includes(lead.stage)) continue;

    const actions: string[] = [];
    const newTags = [...(Array.isArray(lead.tags) ? lead.tags : [])];

    // Hot lead: gia tri cao + dang thuong thao
    if (lead.expectedValue >= 500_000_000 && lead.stage === "negotiating") {
      if (!newTags.includes("Hot Lead")) {
        newTags.push("Hot Lead");
        actions.push('Gan tag "Hot Lead" (gia tri >= 500M + Thuong thao)');
      }
    }

    // VIP: gia tri >= 1 ty
    if (lead.expectedValue >= 1_000_000_000) {
      if (!newTags.includes("VIP")) {
        newTags.push("VIP");
        actions.push('Gan tag "VIP" (gia tri >= 1 ty)');
      }
    }

    // Urgent: khong tuong tac > 7 ngay + stage active
    if (daysSince(lead.lastContactAt) >= 7 && !newTags.includes("Can theo doi")) {
      newTags.push("Can theo doi");
      actions.push('Gan tag "Can theo doi" (khong tuong tac > 7 ngay)');
    }

    // New lead chua phan cong
    if (lead.stage === "new" && (!lead.assignedTo || lead.assignedTo === "")) {
      if (!newTags.includes("Chua phan cong")) {
        newTags.push("Chua phan cong");
        actions.push('Gan tag "Chua phan cong"');
      }
    }

    if (actions.length > 0) {
      try {
        await updateLead(lead.id, { tags: newTags });
        logs.push({
          ruleId: "smart_tagging",
          ruleName: "Smart Tagging tu dong",
          leadId: lead.id,
          leadName: lead.name,
          actionsExecuted: actions,
          triggeredAt: new Date().toISOString(),
          success: true,
        });
      } catch (e) {
        logs.push({
          ruleId: "smart_tagging",
          ruleName: "Smart Tagging tu dong",
          leadId: lead.id,
          leadName: lead.name,
          actionsExecuted: actions,
          triggeredAt: new Date().toISOString(),
          success: false,
          error: e instanceof Error ? e.message : "unknown",
        });
      }
    }
  }

  return logs;
}

// ─── Nhóm 3: Auto-assign leads chưa được phân công ────────────────────────────
async function runAutoAssign(leads: Lead[]): Promise<AutomationRunLog[]> {
  const logs: AutomationRunLog[] = [];
  const config = await getAutoAssignConfig();
  if (!config.enabled) return logs;

  const unassigned = leads.filter(
    (l) => (!l.assignedTo || l.assignedTo === "") && l.stage === "new"
  );
  if (!unassigned.length) return logs;

  const staff = (await getAllStaff()).filter(member => member.status === "active" && member.role !== "intern");
  const staffById = new Map(staff.map(member => [member.id, member]));
  const loadByName = new Map<string, number>();
  for (const lead of leads) {
    if (lead.assignedTo) loadByName.set(lead.assignedTo, (loadByName.get(lead.assignedTo) || 0) + 1);
  }
  let roundRobinCursor = 0;

  for (const lead of unassigned) {
    // Tim rule phu hop theo tinh/thanh pho
    const matchingRule = [...config.rules]
      .sort((a, b) => a.priority - b.priority)
      .find((rule) => {
        const location = (lead.district || "").toLowerCase();
        const provinceMatch = !rule.province || location.includes(rule.province.toLowerCase())
          || rule.districts.some(district => location.includes(district.toLowerCase()));
        const typeMatch = !rule.leadTypes.length || rule.leadTypes.includes(lead.type);
        return Boolean(rule.staffId) && provinceMatch && typeMatch;
      });

    let target = matchingRule?.staffId ? staffById.get(matchingRule.staffId) : undefined;
    if (!target && config.fallbackStaffId) target = staffById.get(config.fallbackStaffId);
    if (!target && config.defaultMode === "least_loaded") {
      target = [...staff].sort((a, b) => (loadByName.get(a.fullName) || 0) - (loadByName.get(b.fullName) || 0))[0];
    } else if (!target && config.defaultMode === "round_robin" && staff.length) {
      target = staff[roundRobinCursor++ % staff.length];
    }
    if (!target) continue;

    try {
      await updateLead(lead.id, { assignedTo: target.fullName });
      loadByName.set(target.fullName, (loadByName.get(target.fullName) || 0) + 1);
      logs.push({
        ruleId: "auto_assign",
        ruleName: "Tu dong phan cong",
        leadId: lead.id,
        leadName: lead.name,
        actionsExecuted: [`Phân công cho "${target.fullName}" (rule: ${matchingRule?.id ?? config.defaultMode})`],
        triggeredAt: new Date().toISOString(),
        success: true,
      });
    } catch (e) {
      logs.push({
        ruleId: "auto_assign",
        ruleName: "Tu dong phan cong",
        leadId: lead.id,
        leadName: lead.name,
        actionsExecuted: [],
        triggeredAt: new Date().toISOString(),
        success: false,
        error: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  return logs;
}

// ─── Nhóm 1 & 2: Chạy automation rules định nghĩa sẵn ─────────────────────────
async function runAutomationRules(leads: Lead[]): Promise<AutomationRunLog[]> {
  const logs: AutomationRunLog[] = [];
  const rules = await getAutomationRules();
  const enabledRules = rules.filter((r) => r.enabled);

  // Lay danh sach nhan vien tu leads (don gian: lay unique assignedTo)
  const staffList = [...new Set(leads.map((l) => l.assignedTo).filter(Boolean))];

  const updatedRules = [...rules];

  for (const rule of enabledRules) {
    for (const lead of leads) {
      if (!checkTrigger(rule, lead)) continue;
      if (rule.trigger.type === "stage_duration") {
        const enteredAt = await getStageEnteredAt(lead);
        if (hoursSince(enteredAt) < (rule.trigger.hours ?? 24)) continue;
      }
      const triggerKey = automationTriggerKey(rule, lead);
      const claimed = await claimAutomationExecution({ ruleId: rule.id, leadId: lead.id, triggerKey });
      if (!claimed) continue;

      const actionsExecuted: string[] = [];
      let success = true;
      let error: string | undefined;

      try {
        for (const [actionIndex, action] of rule.actions.entries()) {
          const result = await executeAction(action, lead, staffList, rule, { triggerKey, actionIndex });
          actionsExecuted.push(result);
        }
        await completeAutomationExecution({ ruleId: rule.id, leadId: lead.id, triggerKey, actions: actionsExecuted });
        // Cap nhat runCount
        const ruleIdx = updatedRules.findIndex((r) => r.id === rule.id);
        if (ruleIdx >= 0) {
          updatedRules[ruleIdx] = {
            ...updatedRules[ruleIdx],
            runCount: (updatedRules[ruleIdx].runCount ?? 0) + 1,
            lastRunAt: new Date().toISOString(),
          };
        }
      } catch (e) {
        success = false;
        error = e instanceof Error ? e.message : "unknown";
        await failAutomationExecution({
          ruleId: rule.id,
          leadId: lead.id,
          triggerKey,
          actions: actionsExecuted,
          error,
        }).catch(() => undefined);
      }

      logs.push({
        ruleId: rule.id,
        ruleName: rule.name,
        leadId: lead.id,
        leadName: lead.name,
        actionsExecuted,
        triggeredAt: new Date().toISOString(),
        success,
        error,
      });
    }
  }

  // Luu lai runCount
  try {
    await saveAutomationRules(updatedRules);
  } catch {
    // non-critical
  }

  return logs;
}

export async function previewAutomationEngine(): Promise<AutomationPreviewResult> {
  const [leads, rules] = await Promise.all([getLeads(), getAutomationRules()]);
  const enabledRules = rules.filter(rule => rule.enabled);
  const matches: AutomationPreviewResult["matches"] = [];
  for (const rule of enabledRules) {
    for (const lead of leads) {
      if (!checkTrigger(rule, lead)) continue;
      if (rule.trigger.type === "stage_duration") {
        const enteredAt = await getStageEnteredAt(lead);
        if (hoursSince(enteredAt) < (rule.trigger.hours ?? 24)) continue;
      }
      matches.push({ leadId: lead.id, leadName: lead.name, ruleId: rule.id, ruleName: rule.name, actionCount: rule.actions.length });
    }
  }
  return {
    totalLeads: leads.length,
    enabledRules: enabledRules.length,
    matchedActions: matches.reduce((sum, item) => sum + item.actionCount, 0),
    matches: matches.slice(0, 200),
    generatedAt: new Date().toISOString(),
  };
}

// ─── Nhóm 4: Notification rules (Zalo/Email/SMS/In-app) ───────────────────────
async function runNotificationRules(leads: Lead[]): Promise<AutomationRunLog[]> {
  const logs: AutomationRunLog[] = [];
  let notifRules: Awaited<ReturnType<typeof getNotificationRules>>;
  try {
    notifRules = await getNotificationRules();
  } catch {
    return logs;
  }

  const activeNotifRules = notifRules.filter((r) => r.isActive);

  for (const rule of activeNotifRules) {
    for (const lead of leads) {
      const activeStages = ["new", "profile_sent", "surveyed", "quoted", "negotiating"];
      if (!activeStages.includes(lead.stage)) continue;

      let shouldTrigger = false;

      switch (rule.trigger) {
        case "task_due": {
          // Handled separately by task scheduler
          break;
        }
        case "appointment_remind": {
          // Handled separately
          break;
        }
        default:
          break;
      }

      if (!shouldTrigger) continue;
      const triggerKey = `notification:${rule.trigger}:${lead.stage}:${lead.lastContactAt || lead.createdAt || "never"}`;
      const claimed = await claimAutomationExecution({
        ruleId: `notification:${rule.id}`,
        leadId: lead.id,
        triggerKey,
      });
      if (!claimed) continue;

      const message = (rule.config.messageTemplate ?? "")
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{stage\}\}/g, lead.stage)
        .replace(/\{\{assignedTo\}\}/g, lead.assignedTo ?? "")
        .replace(/\{\{phone\}\}/g, lead.phone ?? "");

      const actionsExecuted: string[] = [];
      let failed = false;

      for (const channel of rule.channels) {
        try {
          if (channel === "zalo") {
            const phone = lead.zaloPhone || lead.phone;
            if (!phone) throw new Error("Lead chưa có số Zalo.");
            const policy = await evaluateAutomationContact({ lead, channel: "zalo_personal", message });
            if (!policy.allowed) throw new Error(policy.reason);
            actionsExecuted.push(await sendAutomationZaloNow({ lead, ruleId: rule.id, ruleName: rule.name, recipient: phone, message, fallbackToAddFriend: false, mediaAssetIds: [] }));
          } else if (channel === "email") {
            const recipient = lead.email?.trim() || "";
            const policy = await evaluateAutomationContact({ lead, channel: "email", message: rule.name });
            if (!policy.allowed) throw new Error(policy.reason);
            const result = await sendAutomationEmail({ to: recipient, subject: rule.name, body: message, fromName: "SmartFurni" });
            if (result.outcome !== "sent") throw new Error(result.error || `Email ${result.outcome}`);
            await logNotification({ ruleId: rule.id, ruleName: rule.name, channel: "email", recipient, leadId: lead.id, leadName: lead.name, message, status: "sent", actionType: "notification_rule" });
            actionsExecuted.push(`Đã gửi Email đến ${recipient}`);
          } else if (channel === "sms") {
            throw new Error("Kênh SMS chưa có nhà cung cấp gửi thật; hệ thống không ghi nhận giả thành công.");
          } else {
            await logNotification({ ruleId: rule.id, ruleName: rule.name, channel: "in_app", recipient: lead.assignedTo || "Quản lý CRM", leadId: lead.id, leadName: lead.name, message, status: "sent", actionType: "notification_rule" });
            actionsExecuted.push("Đã gửi thông báo in-app");
          }
        } catch (e) {
          failed = true;
          const reason = e instanceof Error ? e.message : "unknown";
          await logNotification({ ruleId: rule.id, ruleName: rule.name, channel, recipient: channel === "email" ? (lead.email ?? "") : (lead.phone ?? ""), leadId: lead.id, leadName: lead.name, message, status: "failed", error: reason, actionType: "notification_rule" }).catch(() => undefined);
          actionsExecuted.push(`Lỗi ${channel}: ${reason}`);
        }
      }

      if (actionsExecuted.length > 0) {
        if (failed) await failAutomationExecution({ ruleId: `notification:${rule.id}`, leadId: lead.id, triggerKey, actions: actionsExecuted, error: "Một hoặc nhiều kênh gửi thất bại." });
        else await completeAutomationExecution({ ruleId: `notification:${rule.id}`, leadId: lead.id, triggerKey, actions: actionsExecuted });
        logs.push({
          ruleId: rule.id,
          ruleName: rule.name,
          leadId: lead.id,
          leadName: lead.name,
          actionsExecuted,
          triggeredAt: new Date().toISOString(),
          success: !failed,
          error: failed ? "Một hoặc nhiều kênh gửi thất bại." : undefined,
        });
      }
    }
  }

  return logs;
}

// ─── SLA Check: cảnh báo KH ở giai đoạn quá lâu ──────────────────────────────
async function runSlaCheck(leads: Lead[]): Promise<AutomationRunLog[]> {
  const logs: AutomationRunLog[] = [];
  const sla = await getSlaConfig();
  if (!sla.enabled) return logs;

  const managers = (await getAllStaff()).filter(member => member.status === "active" && ["manager", "super_admin"].includes(member.role));

  const emitSla = async (lead: Lead, input: { key: string; title: string; message: string; priority: "medium" | "high"; escalate: boolean }) => {
    const claimed = await claimAutomationExecution({ ruleId: "sla_check", leadId: lead.id, triggerKey: input.key });
    if (!claimed) return;
    const actions: string[] = [];
    try {
      await createTask({ leadId: lead.id, leadName: lead.name, title: input.title, dueDate: addDays(0),
        priority: input.priority, done: false, assignedTo: lead.assignedTo ?? "" });
      actions.push(`Tạo task SLA ${input.priority === "high" ? "vi phạm" : "cảnh báo"}`);
      if (input.escalate) {
        const recipients = managers.length ? managers.map(manager => manager.fullName) : ["Quản lý CRM"];
        for (const recipient of recipients) {
          await logNotification({ ruleId: "sla_check", ruleName: "Kiểm tra SLA", channel: "in_app", recipient,
            leadId: lead.id, leadName: lead.name, message: input.message, status: "sent", actionType: "sla" });
        }
        actions.push(`Thông báo ${recipients.length} quản lý`);
      }
      await completeAutomationExecution({ ruleId: "sla_check", leadId: lead.id, triggerKey: input.key, actions });
      logs.push({ ruleId: "sla_check", ruleName: "Kiểm tra SLA", leadId: lead.id, leadName: lead.name,
        actionsExecuted: actions, triggeredAt: new Date().toISOString(), success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không xử lý được SLA";
      await failAutomationExecution({ ruleId: "sla_check", leadId: lead.id, triggerKey: input.key, actions, error: message });
      logs.push({ ruleId: "sla_check", ruleName: "Kiểm tra SLA", leadId: lead.id, leadName: lead.name,
        actionsExecuted: actions, triggeredAt: new Date().toISOString(), success: false, error: message });
    }
  };

  for (const lead of leads) {
    const stageConfig = sla.stages.find((s) => s.stageId === lead.stage);
    if (!stageConfig) continue;
    const enteredAt = await getStageEnteredAt(lead);
    const hoursInStage = hoursSince(enteredAt);
    const firstResponseHours = hoursSince(lead.createdAt);

    if (!lead.lastContactAt && firstResponseHours >= sla.firstResponseHours) {
      await emitSla(lead, {
        key: `sla:first-response:breach:${lead.createdAt}:${sla.firstResponseHours}`,
        title: `[SLA] ${lead.name} chưa được liên hệ lần đầu sau ${sla.firstResponseHours} giờ`,
        message: `[SLA] ${lead.name} chưa được liên hệ lần đầu sau ${firstResponseHours} giờ.`, priority: "high", escalate: true,
      });
    }
    if (hoursInStage >= stageConfig.maxHours) {
      await emitSla(lead, {
        key: `sla:${lead.stage}:breach:${enteredAt}:${stageConfig.maxHours}`,
        title: `[SLA] ${lead.name} ở giai đoạn "${stageConfig.stageLabel}" quá ${stageConfig.maxHours} giờ`,
        message: `[SLA] ${lead.name} đã ở giai đoạn "${stageConfig.stageLabel}" ${hoursInStage} giờ.`,
        priority: "high", escalate: stageConfig.escalateToManager,
      });
    } else if (hoursInStage >= stageConfig.warningHours) {
      await emitSla(lead, {
        key: `sla:${lead.stage}:warning:${enteredAt}:${stageConfig.warningHours}`,
        title: `[SLA] ${lead.name} sắp quá hạn giai đoạn "${stageConfig.stageLabel}"`,
        message: `[SLA] ${lead.name} đã ở giai đoạn "${stageConfig.stageLabel}" ${hoursInStage}/${stageConfig.maxHours} giờ.`,
        priority: "medium", escalate: false,
      });
    }
  }

  return logs;
}

// ─── Main engine entry point ───────────────────────────────────────────────────
export async function runAutomationEngine(): Promise<AutomationRunResult> {
  const startedAt = new Date().toISOString();
  const allLogs: AutomationRunLog[] = [];

  // Lay tat ca leads active
  const leads = await getLeads();
  const totalLeads = leads.length;

  // Gửi các email đã đến hạn trước khi đánh giá quy tắc mới. Hàng đợi có khóa
  // nhận việc và dedupe riêng nên an toàn khi cron vô tình chạy song song.
  const queuedZaloLogs = await processDueAutomationZalo();
  allLogs.push(...queuedZaloLogs);
  const queuedEmailLogs = await processDueAutomationEmails();
  allLogs.push(...queuedEmailLogs);

  // Nhom 1 & 2: Automation rules (follow-up, stage-based)
  const ruleLogs = await runAutomationRules(leads);
  allLogs.push(...ruleLogs);

  // Nhom 3: Smart tagging + auto-assign
  const tagLogs = await runSmartTagging(leads);
  allLogs.push(...tagLogs);

  const assignLogs = await runAutoAssign(leads);
  allLogs.push(...assignLogs);

  // Nhom 4: Notification rules (Zalo/Email/SMS)
  const notifLogs = await runNotificationRules(leads);
  allLogs.push(...notifLogs);

  // SLA check
  const slaLogs = await runSlaCheck(leads);
  allLogs.push(...slaLogs);

  const finishedAt = new Date().toISOString();

  return {
    startedAt,
    finishedAt,
    totalLeads,
    totalRulesChecked: totalLeads,
    totalTriggered: allLogs.filter((l) => l.actionsExecuted.length > 0).length,
    logs: allLogs,
  };
}

// ─── Event-based trigger: gọi khi KH chuyển giai đoạn ────────────────────────
export async function triggerStageChangeAutomation(
  lead: Lead,
  fromStage: string,
): Promise<AutomationRunLog[]> {
  const logs: AutomationRunLog[] = [];
  const rules = await getAutomationRules();
  const staffList: string[] = [];

  const stageRules = rules.filter(
    (r) =>
      r.enabled &&
      r.trigger.type === "stage_changed" &&
      (!r.trigger.fromStage || r.trigger.fromStage === fromStage) &&
      (!r.trigger.toStage || r.trigger.toStage === lead.stage)
  );

  for (const rule of stageRules) {
    const triggerKey = `stage-event:${fromStage}->${lead.stage}:${lead.updatedAt || "unknown"}`;
    const claimed = await claimAutomationExecution({ ruleId: rule.id, leadId: lead.id, triggerKey });
    if (!claimed) continue;
    const actionsExecuted: string[] = [];
    let success = true;
    let error: string | undefined;

    try {
      for (const [actionIndex, action] of rule.actions.entries()) {
        const result = await executeAction(action, lead, staffList, rule, { triggerKey, actionIndex });
        actionsExecuted.push(result);
      }
      await completeAutomationExecution({ ruleId: rule.id, leadId: lead.id, triggerKey, actions: actionsExecuted });
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : "unknown";
      await failAutomationExecution({
        ruleId: rule.id, leadId: lead.id, triggerKey, actions: actionsExecuted, error,
      }).catch(() => undefined);
    }

    logs.push({
      ruleId: rule.id,
      ruleName: rule.name,
      leadId: lead.id,
      leadName: lead.name,
      actionsExecuted,
      triggeredAt: new Date().toISOString(),
      success,
      error,
    });
  }

  // Notification rules cho stage_changed
  try {
    const notifRules = await getNotificationRules();
    const stageNotifRules = notifRules.filter(
      (r) => r.isActive && r.trigger === "stage_changed" &&
        (!r.config.stages?.length || r.config.stages.includes(lead.stage))
    );

    for (const rule of stageNotifRules) {
      const triggerKey = `stage-notification:${fromStage}->${lead.stage}:${lead.updatedAt || "unknown"}`;
      const ruleId = `notification:${rule.id}`;
      const claimed = await claimAutomationExecution({ ruleId, leadId: lead.id, triggerKey });
      if (!claimed) continue;
      const message = (rule.config.messageTemplate ?? "")
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{stage\}\}/g, lead.stage)
        .replace(/\{\{assignedTo\}\}/g, lead.assignedTo ?? "")
        .replace(/\{\{phone\}\}/g, lead.phone ?? "");

      const executed: string[] = [];
      for (const [index, channel] of rule.channels.entries()) {
        if (channel === "sms") throw new Error("Kênh SMS chưa có nhà cung cấp gửi thật.");
        const action: AutomationAction = channel === "zalo"
          ? { type: "send_zalo_personal", zaloMessage: message }
          : channel === "email"
            ? { type: "send_email", emailSubject: rule.name, emailBody: message }
            : { type: "notify_manager", notifyMessage: message };
        executed.push(await executeAction(action, lead, staffList, { id: rule.id, name: rule.name } as AutomationRule, { triggerKey, actionIndex: index }));
      }

      await completeAutomationExecution({ ruleId, leadId: lead.id, triggerKey, actions: executed });

      logs.push({
        ruleId: rule.id,
        ruleName: rule.name,
        leadId: lead.id,
        leadName: lead.name,
        actionsExecuted: executed,
        triggeredAt: new Date().toISOString(),
        success: true,
      });
    }
  } catch {
    // non-critical
  }

  return logs;
}
