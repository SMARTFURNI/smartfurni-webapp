import "server-only";

import { Resend } from "resend";
import { query, queryOne } from "@/lib/db";
import { createTask } from "@/lib/crm-store";
import { logNotification } from "@/lib/crm-notifications-store";
import { listZaloAccounts } from "@/lib/zalo-account-store";
import { findZaloUserByPhone, initZaloGateway, sendZaloAttachment as sendPersonalAttachment, sendZaloMessage } from "@/lib/zalo-gateway";
import { getZaloConversation, initZaloOASchema, sendZaloAttachment as sendOaAttachment, sendZaloConsultation } from "@/lib/zalo-oa-store";
import { getMediaObject } from "@/lib/media-storage";
import { getZaloMediaAssets, incrementZaloMediaUsage, type ZaloMediaAsset } from "@/lib/zalo-media-library-store";
import {
  B2B_SOFA_JOURNEY,
  buildJourneyContext,
  channelSequence,
  journeyDefinitionWithOverrides,
  missingRequiredContext,
  nextJourneyBusinessWindow,
  renderJourneyTemplate,
  type B2BSofaJourneySettings,
  type JourneyChannel,
} from "@/lib/crm-b2b-sofa-journey";
import {
  autoEnrollEligibleB2BSofaLeads,
  cancelJourneyEnrollment,
  claimDueJourneyActions,
  countJourneyMessagesInLastSevenDays,
  deferJourneyAction,
  getB2BSofaJourneySettings,
  getJourneyEnrollment,
  getEnrollmentById,
  getLeadForJourneyAction,
  markJourneyActionOutcome,
  markJourneyActionSent,
  markJourneyActionWaitingContent,
  pauseJourneyEnrollment,
  type JourneyActionRecord,
  type JourneyChannelAttempt,
  type JourneyEnrollmentRecord,
} from "@/lib/crm-b2b-sofa-journey-store";
import type { Lead } from "@/lib/crm-types";
import {
  buildAutomationTestContext,
  missingAutomationTestVariables,
  renderAutomationTestTemplate,
} from "@/lib/crm-automation-test";

export interface SendAttemptResult {
  outcome: "sent" | "definitive_failure" | "delivery_unknown";
  error?: string;
  providerMessageId?: string;
  recipient: string;
  preview: string;
}

interface PreparedMedia {
  asset: ZaloMediaAsset;
  buffer: Buffer;
}

export interface B2BSofaJourneyRunResult {
  startedAt: string;
  finishedAt: string;
  enabled: boolean;
  autoEnrollment: { checked: number; enrolled: number; skipped: number };
  claimed: number;
  sent: number;
  failed: number;
  deliveryUnknown: number;
  waitingContent: number;
  paused: number;
  logs: Array<{
    actionId: string;
    leadId: string;
    stepId: string;
    status: string;
    channel?: JourneyChannel;
    message: string;
  }>;
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("84")) return `0${digits.slice(2)}`;
  return digits;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function plainTextToHtml(value: string): string {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function looksAmbiguous(error: string): boolean {
  const text = error.toLocaleLowerCase("vi");
  return [
    "timeout", "timed out", "network", "fetch failed", "econn", "socket", "connection reset",
    "http 500", "http 502", "http 503", "http 504", "không gọi được", "unknown",
  ].some(token => text.includes(token));
}

function nonEmptyContext(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => String(value || "").trim()));
}

async function prepareMedia(assetIds: string[]): Promise<PreparedMedia[]> {
  const requestedIds = [...new Set(assetIds)].slice(0, 10);
  const assets = await getZaloMediaAssets(requestedIds);
  if (assets.length !== requestedIds.length) throw new Error("Một hoặc nhiều media của mẫu không còn trong thư viện.");
  return Promise.all(assets.map(async asset => {
    const object = await getMediaObject(asset.objectKey);
    if (!object.Body) throw new Error(`File ${asset.name} không còn trong thư viện.`);
    return { asset, buffer: Buffer.from(await object.Body.transformToByteArray()) };
  }));
}

async function sendPersonalMedia(accountId: string, conversationId: string, media: PreparedMedia[]): Promise<string[]> {
  const sentIds: string[] = [];
  for (const item of media) {
    const result = await sendPersonalAttachment({
      accountId,
      conversationId,
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
    if (!result.success) throw new Error(result.error || `Không gửi được ${item.asset.name}`);
    sentIds.push(item.asset.id);
  }
  await incrementZaloMediaUsage(sentIds);
  return sentIds;
}

async function sendOaMedia(userId: string, media: PreparedMedia[]): Promise<string[]> {
  const sentIds: string[] = [];
  for (const item of media) {
    const result = await sendOaAttachment({
      userId,
      file: new Blob([Uint8Array.from(item.buffer)], { type: item.asset.contentType }),
      filename: item.asset.name,
      mimeType: item.asset.contentType,
      kind: item.asset.mediaKind === "image" ? "image" : "file",
      source: "automation",
    });
    if (!result.ok) throw new Error(result.error || `Không gửi được ${item.asset.name}`);
    sentIds.push(item.asset.id);
  }
  await incrementZaloMediaUsage(sentIds);
  return sentIds;
}

async function resolveAutomationAccountId(
  settings: B2BSofaJourneySettings,
  enrollment?: Pick<JourneyEnrollmentRecord, "automationAccountId">,
): Promise<string> {
  const requested = enrollment?.automationAccountId || settings.automationAccountId;
  const accounts = (await listZaloAccounts()).filter(account => account.isActive);
  if (requested && accounts.some(account => account.id === requested)) return requested;
  const smartFurni = accounts.find(account =>
    `${account.label} ${account.displayName}`.toLocaleLowerCase("vi").includes("smartfurni"),
  );
  return smartFurni?.id || accounts[0]?.id || "";
}

export async function sendAutomationTemplateToLead(input: {
  lead: Lead;
  channel: JourneyChannel;
  subject?: string;
  body: string;
  mediaAssetIds?: string[];
  emailFromName?: string;
}): Promise<SendAttemptResult & { renderedSubject: string; renderedBody: string }> {
  const settings = await getB2BSofaJourneySettings();
  const enrollment = await getJourneyEnrollment(input.lead.id).catch(() => null);
  const context = {
    ...buildAutomationTestContext(input.lead, settings),
    ...nonEmptyContext(enrollment?.context || {}),
  };
  if (settings.surveyFormUrl) context.survey_form_url = settings.surveyFormUrl;
  if (settings.surveyFormUrl) context.survey_form_line = `Điền nhanh tại: ${settings.surveyFormUrl}`;
  if (settings.approvedDemoVideoUrl) context.approved_demo_video_url = settings.approvedDemoVideoUrl;
  if (settings.projectBriefUrl) context.project_brief_url = settings.projectBriefUrl;
  if (settings.comparisonPackUrl) context.comparison_pack_url = settings.comparisonPackUrl;
  const missingVariables = missingAutomationTestVariables([input.subject || "", input.body], context);
  if (missingVariables.length > 0) {
    throw new Error(`Thiếu dữ liệu CRM để thay biến: ${missingVariables.join(", ")}.`);
  }
  const renderedSubject = renderAutomationTestTemplate(input.subject || "", context);
  const renderedBody = renderAutomationTestTemplate(input.body, context);
  const media = await prepareMedia(input.mediaAssetIds || []);
  const accountId = input.channel === "zalo_personal"
    ? await resolveAutomationAccountId(settings)
    : "";

  if (input.channel === "zalo_personal") {
    await initZaloGateway().catch(() => undefined);
  }

  const result = await executeChannel(
    input.channel,
    input.lead,
    accountId,
    renderedSubject,
    renderedBody,
    renderedBody,
    media,
    input.emailFromName,
  );

  await logNotification({
    ruleId: "automation_real_test",
    ruleName: "Gửi test thật từ CRM Automation",
    channel: input.channel === "email" ? "email" : "zalo",
    actionType: `automation_test_${input.channel}`,
    recipient: result.recipient,
    leadId: input.lead.id,
    leadName: input.lead.name,
    message: (input.channel === "email" ? renderedSubject : renderedBody).slice(0, 500),
    status: result.outcome === "sent" ? "sent" : "failed",
    error: result.error,
  });

  return { ...result, renderedSubject, renderedBody };
}

async function findOaUserId(lead: Lead): Promise<string> {
  await initZaloOASchema();
  if (lead.zaloId) {
    const conversation = await getZaloConversation(lead.zaloId).catch(() => null);
    if (conversation) return conversation.userId;
  }
  const phone = normalizePhone(lead.zaloPhone || lead.phone || "");
  if (!phone) return "";
  const phone84 = phone.startsWith("0") ? `84${phone.slice(1)}` : phone;
  const row = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM crm_zalo_conversations
     WHERE regexp_replace(COALESCE(phone,''),'[^0-9]','','g') IN ($1,$2)
     ORDER BY COALESCE(last_user_interaction,updated_at) DESC LIMIT 1`,
    [phone, phone84],
  ).catch(() => null);
  return row?.user_id || "";
}

async function sendPersonalZalo(
  lead: Lead,
  content: string,
  accountId: string,
  media: PreparedMedia[],
): Promise<SendAttemptResult> {
  if (!accountId) {
    return { outcome: "definitive_failure", error: "Không có tài khoản Zalo Personal SmartFurni đang hoạt động.", recipient: lead.phone || "", preview: content };
  }
  const phone = normalizePhone(lead.zaloPhone || lead.phone || "");
  const linkedConversation = await queryOne<{ user_id: string }>(
    `SELECT COALESCE(NULLIF(zalo_user_id,''),thread_id) AS user_id
     FROM zalo_conversations_v2
     WHERE account_id=$1 AND lead_id=$2
     ORDER BY last_message_at DESC LIMIT 1`,
    [accountId, lead.id],
  ).catch(() => null);
  let userId = linkedConversation?.user_id || "";
  if (phone) {
    const found = await findZaloUserByPhone(phone, accountId);
    if (found.success && found.user?.uid) userId = found.user.uid;
    else if (!userId) {
      return { outcome: "definitive_failure", error: found.error || "Không tìm thấy tài khoản Zalo theo số điện thoại.", recipient: phone, preview: content };
    }
  }
  if (!userId) {
    return { outcome: "definitive_failure", error: "Lead chưa có Zalo UID hoặc số điện thoại hợp lệ.", recipient: phone, preview: content };
  }
  const result = await sendZaloMessage({ accountId, conversationId: userId, content });
  if (result.success) {
    try {
      await sendPersonalMedia(accountId, userId, media);
    } catch (error) {
      return {
        outcome: "delivery_unknown",
        error: `Tin chữ đã gửi nhưng media chưa gửi đủ: ${error instanceof Error ? error.message : "unknown"}`,
        providerMessageId: result.messageId,
        recipient: userId,
        preview: content,
      };
    }
    return { outcome: "sent", providerMessageId: result.messageId, recipient: userId, preview: content };
  }
  const error = result.error || "unknown";
  return { outcome: looksAmbiguous(error) ? "delivery_unknown" : "definitive_failure", error, recipient: userId, preview: content };
}

async function sendOaZalo(lead: Lead, content: string, media: PreparedMedia[]): Promise<SendAttemptResult> {
  const userId = await findOaUserId(lead);
  if (!userId) {
    return { outcome: "definitive_failure", error: "Không tìm thấy hội thoại Zalo OA khớp với lead.", recipient: lead.phone || "", preview: content };
  }
  const result = await sendZaloConsultation({ userId, content, source: "automation" });
  if (result.ok) {
    try {
      await sendOaMedia(userId, media);
    } catch (error) {
      return { outcome: "delivery_unknown", error: `Tin chữ đã gửi nhưng media chưa gửi đủ: ${error instanceof Error ? error.message : "unknown"}`, recipient: userId, preview: content };
    }
    return { outcome: "sent", recipient: userId, preview: content };
  }
  const error = result.error || "unknown";
  return { outcome: looksAmbiguous(error) ? "delivery_unknown" : "definitive_failure", error, recipient: userId, preview: content };
}

async function sendEmail(
  lead: Lead,
  subject: string,
  body: string,
  media: PreparedMedia[],
  fromName = "SmartFurni B2B",
): Promise<SendAttemptResult> {
  const recipient = lead.email?.trim() || "";
  if (!recipient || !/^\S+@\S+\.\S+$/.test(recipient)) {
    return { outcome: "definitive_failure", error: "Lead chưa có email hợp lệ.", recipient, preview: subject };
  }
  const apiKey = process.env.RESEND_API_KEY || "";
  if (!apiKey) {
    return { outcome: "definitive_failure", error: "RESEND_API_KEY chưa được cấu hình.", recipient, preview: subject };
  }
  try {
    const resend = new Resend(apiKey);
    const fromEmail = process.env.RESEND_FROM_EMAIL || "b2b@smartfurni.com.vn";
    const result = await resend.emails.send({
      from: `${fromName.trim() || "SmartFurni B2B"} <${fromEmail}>`,
      to: [recipient],
      subject,
      text: body,
      html: plainTextToHtml(body),
      attachments: media.map(item => ({ filename: item.asset.name, content: item.buffer })),
    });
    if (result.error) {
      return { outcome: "definitive_failure", error: result.error.message || "Resend từ chối email.", recipient, preview: subject };
    }
    await incrementZaloMediaUsage(media.map(item => item.asset.id));
    return { outcome: "sent", providerMessageId: result.data?.id, recipient, preview: subject };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    return { outcome: "delivery_unknown", error: message, recipient, preview: subject };
  }
}

async function executeChannel(
  channel: JourneyChannel,
  lead: Lead,
  accountId: string,
  subject: string,
  emailBody: string,
  zaloBody: string,
  media: PreparedMedia[],
  emailFromName?: string,
): Promise<SendAttemptResult> {
  if (channel === "zalo_personal") return sendPersonalZalo(lead, zaloBody, accountId, media);
  if (channel === "zalo_oa") return sendOaZalo(lead, zaloBody, media);
  return sendEmail(lead, subject, emailBody, media, emailFromName);
}

async function logChannelAttempt(
  action: JourneyActionRecord,
  lead: Lead,
  channel: JourneyChannel,
  result: SendAttemptResult,
): Promise<void> {
  const notificationChannel = channel === "email" ? "email" : "zalo";
  await logNotification({
    ruleId: action.stepId,
    ruleName: B2B_SOFA_JOURNEY.name,
    channel: notificationChannel,
    actionType: channel,
    recipient: result.recipient,
    leadId: lead.id,
    leadName: lead.name,
    message: result.preview.slice(0, 500),
    status: result.outcome === "sent" ? "sent" : "failed",
    error: result.error,
  });
}

async function hasInboundOrHumanActivity(
  lead: Lead,
  enrollment: JourneyEnrollmentRecord,
): Promise<string | null> {
  const baselineMs = Math.max(
    new Date(enrollment.enrolledAt).getTime(),
    new Date(enrollment.baselineContactAt).getTime(),
  );
  const lastContactMs = new Date(lead.lastContactAt || 0).getTime();
  if (Number.isFinite(lastContactMs) && lastContactMs > baselineMs + 30_000) {
    return "Lead đã có tương tác hoặc được nhân viên cập nhật trong CRM.";
  }

  const activity = await queryOne<{ id: string; activity_type: string }>(
    `SELECT id,COALESCE(data->>'type','activity') AS activity_type
     FROM crm_activities WHERE lead_id=$1 AND created_at>$2 ORDER BY created_at DESC LIMIT 1`,
    [lead.id, enrollment.enrolledAt],
  ).catch(() => null);
  if (activity) return `CRM đã ghi nhận hoạt động ${activity.activity_type}; chuyển nhân viên xử lý.`;

  const personalInbound = await queryOne<{ msg_id: string }>(
    `SELECT m.msg_id
     FROM zalo_inbox_messages_v2 m
     JOIN zalo_conversations_v2 c ON c.account_id=m.account_id AND c.thread_id=m.thread_id
     WHERE c.lead_id=$1 AND m.is_self=FALSE AND m.timestamp>$2
     ORDER BY m.timestamp DESC LIMIT 1`,
    [lead.id, new Date(enrollment.enrolledAt).getTime()],
  ).catch(() => null);
  if (personalInbound) return "Khách đã phản hồi qua Zalo cá nhân; chuyển nhân viên xử lý.";

  const phone = normalizePhone(lead.zaloPhone || lead.phone || "");
  if (phone) {
    const phone84 = phone.startsWith("0") ? `84${phone.slice(1)}` : phone;
    const oaInbound = await queryOne<{ id: string }>(
      `SELECT m.id FROM crm_zalo_messages m
       JOIN crm_zalo_conversations c ON c.user_id=m.conversation_user_id
       WHERE regexp_replace(COALESCE(c.phone,''),'[^0-9]','','g') IN ($1,$2)
         AND m.direction='inbound' AND m.created_at>$3
       ORDER BY m.created_at DESC LIMIT 1`,
      [phone, phone84, enrollment.enrolledAt],
    ).catch(() => null);
    if (oaInbound) return "Khách đã phản hồi qua Zalo OA; chuyển nhân viên xử lý.";
  }
  return null;
}

function stopReason(lead: Lead, settings: B2BSofaJourneySettings): { cancel?: string; pause?: string } {
  if (["won", "lost"].includes(lead.stage)) return { cancel: `Lead đã chuyển sang giai đoạn ${lead.stage}.` };
  if (["quoted", "negotiating"].includes(lead.stage)) return { pause: "Lead đã vào giai đoạn báo giá/thương thảo; dừng chuỗi nuôi dưỡng chung." };
  const tags = new Set((lead.tags || []).map(tag => tag.trim().toLocaleLowerCase("vi")));
  const dnc = settings.doNotContactTags.find(tag => tags.has(tag.trim().toLocaleLowerCase("vi")));
  if (dnc) return { cancel: `Lead có nhãn không liên hệ: ${dnc}.` };
  if (["hot lead", "human takeover", "nhân viên xử lý"].some(tag => tags.has(tag))) {
    return { pause: "Lead đã được đánh dấu ưu tiên/nhân viên tiếp quản." };
  }
  return {};
}

async function processAction(
  action: JourneyActionRecord,
  settings: B2BSofaJourneySettings,
): Promise<{ status: string; channel?: JourneyChannel; message: string }> {
  const [lead, enrollment] = await Promise.all([
    getLeadForJourneyAction(action),
    getEnrollmentById(action.enrollmentId),
  ]);
  if (!lead || !enrollment) {
    await markJourneyActionOutcome(action, "skipped", action.attempts, "Không tìm thấy lead hoặc enrollment.");
    return { status: "skipped", message: "Không tìm thấy lead hoặc enrollment." };
  }

  const stopping = stopReason(lead, settings);
  if (stopping.cancel) {
    await cancelJourneyEnrollment(enrollment.id, stopping.cancel);
    return { status: "cancelled", message: stopping.cancel };
  }
  if (stopping.pause) {
    await pauseJourneyEnrollment(enrollment.id, stopping.pause);
    await deferJourneyAction(action.id, new Date(Date.now() + 24 * 60 * 60 * 1000), stopping.pause);
    return { status: "paused", message: stopping.pause };
  }

  const inboundReason = await hasInboundOrHumanActivity(lead, enrollment);
  if (inboundReason) {
    await pauseJourneyEnrollment(enrollment.id, inboundReason);
    await deferJourneyAction(action.id, new Date(Date.now() + 24 * 60 * 60 * 1000), inboundReason);
    return { status: "paused", message: inboundReason };
  }

  const nextBusinessWindow = nextJourneyBusinessWindow(new Date(), settings);
  if (nextBusinessWindow) {
    await deferJourneyAction(action.id, nextBusinessWindow, "Hoãn đến khung giờ làm việc kế tiếp.");
    return { status: "deferred", message: `Hoãn đến ${nextBusinessWindow.toISOString()} theo giờ làm việc.` };
  }

  const sentLastSevenDays = await countJourneyMessagesInLastSevenDays(lead.id);
  if (sentLastSevenDays >= settings.maxMessagesPerSevenDays) {
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await deferJourneyAction(action.id, until, "Hoãn theo giới hạn tần suất 7 ngày.");
    return { status: "deferred", message: `Hoãn đến ${until.toISOString()} theo giới hạn tần suất.` };
  }

  const step = journeyDefinitionWithOverrides(settings).steps.find(item => item.id === action.stepId);
  if (!step) {
    await markJourneyActionOutcome(action, "skipped", action.attempts, "Không tìm thấy định nghĩa bước journey.");
    return { status: "skipped", message: "Không tìm thấy định nghĩa bước journey." };
  }

  const latestBase = buildJourneyContext(lead, settings);
  const context = { ...latestBase, ...nonEmptyContext(enrollment.context) };
  // Các URL quản trị mới nhất luôn được ưu tiên hơn snapshot khi enrollment.
  if (settings.surveyFormUrl) context.survey_form_url = settings.surveyFormUrl;
  if (settings.surveyFormUrl) context.survey_form_line = `Điền nhanh tại: ${settings.surveyFormUrl}`;
  if (settings.approvedDemoVideoUrl) context.approved_demo_video_url = settings.approvedDemoVideoUrl;
  if (settings.projectBriefUrl) context.project_brief_url = settings.projectBriefUrl;
  if (settings.comparisonPackUrl) context.comparison_pack_url = settings.comparisonPackUrl;

  const missing = missingRequiredContext(step, context);
  if (missing.length) {
    const alreadyCreatedTask = action.attempts.some(item => item.channel === "system" && item.outcome === "blocked");
    if (!alreadyCreatedTask) {
      await createTask({
        leadId: lead.id,
        leadName: lead.name,
        title: `[Journey] Bổ sung dữ liệu cho bước ${step.day}: ${missing.join(", ")}`,
        dueDate: new Date().toISOString().slice(0, 10),
        priority: "high",
        done: false,
        assignedTo: lead.assignedTo || "",
      }).catch(() => undefined);
    }
    await markJourneyActionWaitingContent(action, missing);
    return { status: "waiting_content", message: `Chờ dữ liệu: ${missing.join(", ")}` };
  }

  const subject = renderJourneyTemplate(step.emailSubject, context);
  const emailBody = renderJourneyTemplate(step.emailBody, context);
  const zaloBody = renderJourneyTemplate(step.zaloBody, context);
  let media: PreparedMedia[] = [];
  try {
    media = await prepareMedia(step.mediaAssetIds || []);
  } catch (error) {
    await markJourneyActionWaitingContent(action, ["media_library"]);
    return { status: "waiting_content", message: error instanceof Error ? error.message : "Không tải được media từ thư viện." };
  }
  const accountId = await resolveAutomationAccountId(settings, enrollment);
  await initZaloGateway().catch(() => undefined);

  const attempts = [...action.attempts];
  for (const channel of channelSequence(step)) {
    const result = await executeChannel(channel, lead, accountId, subject, emailBody, zaloBody, media);
    attempts.push({
      channel,
      at: new Date().toISOString(),
      outcome: result.outcome,
      error: result.error,
      providerMessageId: result.providerMessageId,
    });
    await logChannelAttempt(action, lead, channel, result);

    if (result.outcome === "sent") {
      await markJourneyActionSent(action, channel, attempts);
      return { status: "sent", channel, message: `Đã gửi qua ${channel}.` };
    }
    if (result.outcome === "delivery_unknown") {
      await markJourneyActionOutcome(action, "delivery_unknown", attempts, result.error || "Kết quả gửi chưa rõ.");
      return { status: "delivery_unknown", channel, message: "Dừng fallback để đối soát kết quả chưa rõ." };
    }
  }

  const error = attempts.slice(-3).map(item => `${item.channel}: ${item.error || item.outcome}`).join(" | ");
  await markJourneyActionOutcome(action, "failed", attempts, error || "Tất cả kênh đều không gửi được.");
  return { status: "failed", message: error || "Tất cả kênh đều không gửi được." };
}

export async function runB2BSofaJourney(limit = 20): Promise<B2BSofaJourneyRunResult> {
  const startedAt = new Date().toISOString();
  const settings = await getB2BSofaJourneySettings();
  const emptyEnrollment = { checked: 0, enrolled: 0, skipped: 0 };
  if (!settings.enabled) {
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      enabled: false,
      autoEnrollment: emptyEnrollment,
      claimed: 0, sent: 0, failed: 0, deliveryUnknown: 0, waitingContent: 0, paused: 0, logs: [],
    };
  }

  const autoEnrollment = await autoEnrollEligibleB2BSofaLeads(settings);
  const actions = await claimDueJourneyActions(limit);
  const result: B2BSofaJourneyRunResult = {
    startedAt,
    finishedAt: "",
    enabled: true,
    autoEnrollment,
    claimed: actions.length,
    sent: 0,
    failed: 0,
    deliveryUnknown: 0,
    waitingContent: 0,
    paused: 0,
    logs: [],
  };

  for (const action of actions) {
    try {
      const outcome = await processAction(action, settings);
      if (outcome.status === "sent") result.sent += 1;
      if (outcome.status === "failed") result.failed += 1;
      if (outcome.status === "delivery_unknown") result.deliveryUnknown += 1;
      if (outcome.status === "waiting_content") result.waitingContent += 1;
      if (outcome.status === "paused") result.paused += 1;
      result.logs.push({ actionId: action.id, leadId: action.leadId, stepId: action.stepId, ...outcome });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      await markJourneyActionOutcome(action, "delivery_unknown", action.attempts, message).catch(() => undefined);
      result.deliveryUnknown += 1;
      result.logs.push({ actionId: action.id, leadId: action.leadId, stepId: action.stepId, status: "delivery_unknown", message });
    }
  }

  result.finishedAt = new Date().toISOString();
  return result;
}
