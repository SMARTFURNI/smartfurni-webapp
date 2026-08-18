import "server-only";

import { query, queryOne } from "@/lib/db";
import { createActivityOnce, createTask, getLead } from "@/lib/crm-store";
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
  stageStopsJourney,
  type B2BSofaJourneySettings,
  type B2BSofaJourneyDefinition,
  type JourneyChannel,
} from "@/lib/crm-b2b-sofa-journey";
import {
  autoEnrollEligibleB2BSofaLeads,
  cancelJourneyEnrollment,
  claimDueJourneyActions,
  countJourneyMessagesInLastSevenDays,
  createJourneyReplyReview,
  deferJourneyAction,
  getB2BSofaJourneySettings,
  getJourneyEnrollment,
  getEnrollmentById,
  getJourneyEnrollmentsForReplyScan,
  getJourneySentActivityBackfillCandidates,
  getLeadForJourneyAction,
  markJourneyActionOutcome,
  markJourneyActionSent,
  markJourneyActionWaitingContent,
  pauseJourneyEnrollment,
  resolveJourneyReplyReview,
  type JourneyActionRecord,
  type JourneyChannelAttempt,
  type JourneyEnrollmentRecord,
} from "@/lib/crm-b2b-sofa-journey-store";
import {
  buildJourneySentActivity,
  journeySentActivityId,
} from "@/lib/crm-journey-activity";
import { analyzeJourneyReply } from "@/lib/crm-journey-reply-ai";
import type { Lead } from "@/lib/crm-types";
import {
  buildAutomationTestContext,
  missingRequiredAutomationTestVariables,
  renderAutomationTestTemplate,
} from "@/lib/crm-automation-test";
import { sendAutomationEmail } from "@/lib/crm-automation-email";
import { evaluateAutomationContact } from "@/lib/crm-automation-policy";
import {
  B2C_ERGONOMIC_BED_JOURNEY_CODE,
  buildB2CErgonomicJourneyContext,
  type B2CErgonomicBedJourneySettings,
} from "@/lib/crm-b2c-ergonomic-bed-journey";
import {
  getB2CErgonomicBedJourneyEnrollment,
  getB2CErgonomicBedJourneySettings,
} from "@/lib/crm-b2c-ergonomic-bed-journey-store";
import {
  B2C_SOFA_BED_JOURNEY_CODE,
  buildB2CSofaBedJourneyContext,
  type B2CSofaBedJourneySettings,
} from "@/lib/crm-b2c-sofa-bed-journey";
import {
  getB2CSofaBedJourneyEnrollment,
  getB2CSofaBedJourneySettings,
} from "@/lib/crm-b2c-sofa-bed-journey-store";
import {
  attachJourneyEmailProviderId,
  createJourneyEmailTracking,
  recordJourneyEvent,
  recordJourneyReply,
  rewriteJourneyTrackedLinks,
  type JourneyEmailTrackingLinks,
} from "@/lib/crm-journey-reporting";

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
  replyRecommendations: number;
  logs: Array<{
    actionId: string;
    leadId: string;
    stepId: string;
    status: string;
    channel?: JourneyChannel;
    message: string;
  }>;
}

export interface JourneyRuntime<TSettings extends B2BSofaJourneySettings> {
  journeyCode: string;
  journeyName: string;
  getSettings: () => Promise<TSettings>;
  definitionWithOverrides: (settings: TSettings) => B2BSofaJourneyDefinition;
  buildContext: (lead: Lead, settings: TSettings, extra?: Record<string, string>) => Record<string, string>;
  autoEnroll: (settings: TSettings) => Promise<{ checked: number; enrolled: number; skipped: number }>;
  claimDueActions: (limit: number, allowedLeadIds?: string[] | null) => Promise<JourneyActionRecord[]>;
  emailFromName?: string;
  requireAcceptedZaloFriendship?: boolean;
  replyChannels?: JourneyChannel[];
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("84")) return `0${digits.slice(2)}`;
  return digits;
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
  requiredVariables?: string[];
  journeyCode?: string;
}): Promise<SendAttemptResult & { renderedSubject: string; renderedBody: string }> {
  const isErgonomicB2C = input.journeyCode === B2C_ERGONOMIC_BED_JOURNEY_CODE;
  const isSofaB2C = input.journeyCode === B2C_SOFA_BED_JOURNEY_CODE;
  const settings = isErgonomicB2C
    ? await getB2CErgonomicBedJourneySettings()
    : isSofaB2C ? await getB2CSofaBedJourneySettings() : await getB2BSofaJourneySettings();
  const enrollment = isErgonomicB2C
    ? await getB2CErgonomicBedJourneyEnrollment(input.lead.id).catch(() => null)
    : isSofaB2C ? await getB2CSofaBedJourneyEnrollment(input.lead.id).catch(() => null) : await getJourneyEnrollment(input.lead.id).catch(() => null);
  const journeyContext = isErgonomicB2C
    ? buildB2CErgonomicJourneyContext(input.lead, settings as B2CErgonomicBedJourneySettings)
    : isSofaB2C ? buildB2CSofaBedJourneyContext(input.lead, settings as B2CSofaBedJourneySettings) : buildJourneyContext(input.lead, settings);
  const context = {
    ...buildAutomationTestContext(input.lead, settings),
    ...journeyContext,
    ...nonEmptyContext(enrollment?.context || {}),
  };
  if (settings.surveyFormUrl) context.survey_form_url = settings.surveyFormUrl;
  if (settings.surveyFormUrl) context.survey_form_line = `Điền nhanh tại: ${settings.surveyFormUrl}`;
  if (settings.approvedDemoVideoUrl) context.approved_demo_video_url = settings.approvedDemoVideoUrl;
  if (settings.projectBriefUrl) context.project_brief_url = settings.projectBriefUrl;
  if (settings.comparisonPackUrl) context.comparison_pack_url = settings.comparisonPackUrl;
  const media = await prepareMedia(input.mediaAssetIds || []);
  const hasAttachedVideo = media.some(item =>
    item.asset.mediaKind === "video" || item.asset.contentType.startsWith("video/"),
  );
  if (hasAttachedVideo && !context.approved_demo_video_url) {
    context.approved_demo_video_url = "xem video đính kèm trong tin nhắn này";
  }
  const requiredVariables = (input.requiredVariables || []).filter(variable =>
    !(variable === "approved_demo_video_url" && hasAttachedVideo),
  );
  const missingVariables = missingRequiredAutomationTestVariables(requiredVariables, context);
  if (missingVariables.length > 0) {
    throw new Error(`Thiếu dữ liệu CRM để thay biến: ${missingVariables.join(", ")}.`);
  }
  const renderedSubject = renderAutomationTestTemplate(input.subject || "", context);
  const renderedBody = renderAutomationTestTemplate(input.body, context);
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
  tracking?: JourneyEmailTrackingLinks,
): Promise<SendAttemptResult> {
  const recipient = lead.email?.trim() || "";
  if (!recipient || !/^\S+@\S+\.\S+$/.test(recipient)) {
    return { outcome: "definitive_failure", error: "Lead chưa có email hợp lệ.", recipient, preview: subject };
  }
  const result = await sendAutomationEmail({ to: recipient, subject, body, media, fromName, tracking });
  if (result.outcome === "sent") {
    await incrementZaloMediaUsage(media.map(item => item.asset.id));
    return { outcome: "sent", providerMessageId: result.providerMessageId, recipient, preview: subject };
  }
  return { outcome: result.outcome, error: result.error, recipient, preview: subject };
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
  emailTracking?: JourneyEmailTrackingLinks,
): Promise<SendAttemptResult> {
  const trackedZaloBody = emailTracking ? rewriteJourneyTrackedLinks(zaloBody, emailTracking.clickBaseUrl) : zaloBody;
  if (channel === "zalo_personal") return sendPersonalZalo(lead, trackedZaloBody, accountId, media);
  if (channel === "zalo_oa") return sendOaZalo(lead, trackedZaloBody, media);
  return sendEmail(lead, subject, emailBody, media, emailFromName, emailTracking);
}

async function logChannelAttempt(
  action: JourneyActionRecord,
  lead: Lead,
  channel: JourneyChannel,
  result: SendAttemptResult,
  journeyName: string,
): Promise<void> {
  const notificationChannel = channel === "email" ? "email" : "zalo";
  await logNotification({
    ruleId: action.stepId,
    ruleName: journeyName,
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

async function recordJourneySentActivity(input: {
  actionId: string;
  leadId: string;
  channel: JourneyChannel;
  stepTitle: string;
  subject: string;
  emailBody: string;
  zaloBody: string;
  media: PreparedMedia[];
  createdAt?: string;
}): Promise<boolean> {
  const activity = await createActivityOnce(
    journeySentActivityId(input.actionId),
    buildJourneySentActivity({
      leadId: input.leadId,
      channel: input.channel,
      stepTitle: input.stepTitle,
      emailSubject: input.subject,
      emailBody: input.emailBody,
      zaloBody: input.zaloBody,
      media: input.media.map(item => ({
        name: item.asset.name,
        url: item.asset.url,
        contentType: item.asset.contentType,
        sizeBytes: item.asset.sizeBytes,
      })),
    }),
    input.createdAt,
  );
  return activity !== null;
}

async function backfillJourneySentActivities<TSettings extends B2BSofaJourneySettings>(
  runtime: JourneyRuntime<TSettings>,
  settings: TSettings,
): Promise<number> {
  const candidates = await getJourneySentActivityBackfillCandidates(runtime.journeyCode, 100);
  if (candidates.length === 0) return 0;
  const steps = new Map(
    runtime.definitionWithOverrides(settings).steps.map(step => [step.id, step] as const),
  );
  let inserted = 0;
  for (const candidate of candidates) {
    const step = steps.get(candidate.stepId);
    const created = await recordJourneySentActivity({
      actionId: candidate.actionId,
      leadId: candidate.leadId,
      channel: candidate.sentChannel,
      stepTitle: step?.title || candidate.stepId,
      subject: candidate.sentChannel === "email" ? candidate.message : "",
      emailBody: "",
      zaloBody: candidate.sentChannel === "email" ? "" : candidate.message,
      media: [],
      createdAt: candidate.sentAt,
    });
    if (created) inserted += 1;
  }
  return inserted;
}

interface InboundSignal {
  reason: string;
  channel: string;
  sourceId?: string;
  message: string;
  occurredAt: string;
}

async function findLatestUnreviewedInbound(
  lead: Lead,
  enrollment: JourneyEnrollmentRecord,
  allowedChannels: JourneyChannel[] = ["zalo_personal", "zalo_oa"],
): Promise<InboundSignal | null> {
  const reviewed = await queryOne<{ last_inbound_at: string | null }>(
    `SELECT MAX(inbound_at) AS last_inbound_at FROM crm_journey_reply_reviews WHERE enrollment_id=$1`,
    [enrollment.id],
  ).catch(() => null);
  const baselineAt = new Date(Math.max(
    new Date(enrollment.enrolledAt).getTime(),
    new Date(enrollment.baselineContactAt).getTime(),
    new Date(reviewed?.last_inbound_at || 0).getTime(),
  ));
  const baselineMs = baselineAt.getTime();
  const personalInbound = allowedChannels.includes("zalo_personal") ? await queryOne<{ msg_id: string; content: string; timestamp: string }>(
    `SELECT m.msg_id,m.content,m.timestamp
     FROM zalo_inbox_messages_v2 m
     JOIN zalo_conversations_v2 c ON c.account_id=m.account_id AND c.thread_id=m.thread_id
     WHERE c.lead_id=$1 AND m.is_self=FALSE AND m.timestamp>$2
     ORDER BY m.timestamp DESC LIMIT 1`,
    [lead.id, baselineMs],
  ).catch(() => null) : null;

  const phone = normalizePhone(lead.zaloPhone || lead.phone || "");
  let oaInbound: { id: string; content: string; created_at: string } | null = null;
  if (phone && allowedChannels.includes("zalo_oa")) {
    const phone84 = phone.startsWith("0") ? `84${phone.slice(1)}` : phone;
    oaInbound = await queryOne<{ id: string; content: string; created_at: string }>(
      `SELECT m.id,m.content,m.created_at FROM crm_zalo_messages m
       JOIN crm_zalo_conversations c ON c.user_id=m.conversation_user_id
       WHERE regexp_replace(COALESCE(c.phone,''),'[^0-9]','','g') IN ($1,$2)
         AND m.direction='inbound' AND m.created_at>$3
       ORDER BY m.created_at DESC LIMIT 1`,
      [phone, phone84, baselineAt.toISOString()],
    ).catch(() => null);
  }
  const personalAt = personalInbound ? Number(personalInbound.timestamp) : 0;
  const oaAt = oaInbound ? new Date(oaInbound.created_at).getTime() : 0;
  if (!personalInbound && !oaInbound) return null;
  if (personalInbound && personalAt >= oaAt) return {
    reason: "Khách đã phản hồi qua Zalo cá nhân; AI đã tạo đề xuất để nhân viên duyệt.",
    channel: "zalo_personal", sourceId: personalInbound.msg_id,
    message: personalInbound.content || "[Tin nhắn không có nội dung chữ]",
    occurredAt: new Date(personalAt).toISOString(),
  };
  return {
    reason: "Khách đã phản hồi qua Zalo OA; AI đã tạo đề xuất để nhân viên duyệt.",
    channel: "zalo_oa", sourceId: oaInbound!.id,
    message: oaInbound!.content || "[Tin nhắn không có nội dung chữ]",
    occurredAt: new Date(oaAt).toISOString(),
  };
}

async function scanJourneyReplies<TSettings extends B2BSofaJourneySettings>(
  runtime: JourneyRuntime<TSettings>,
): Promise<number> {
  const enrollments = await getJourneyEnrollmentsForReplyScan(runtime.journeyCode, 100);
  let created = 0;
  // Chỉ những enrollment thật sự có tin mới mới gọi AI; quét toàn bộ tập giới
  // hạn để lead cũ không bị bỏ đói bởi các lead vừa cập nhật.
  for (const enrollment of enrollments) {
    const lead = await getLead(enrollment.leadId);
    if (!lead) continue;
    const inbound = await findLatestUnreviewedInbound(lead, enrollment, runtime.replyChannels);
    if (!inbound?.sourceId) continue;
    const analysis = await analyzeJourneyReply({
      message: inbound.message,
      leadName: lead.name,
      journeyName: runtime.journeyName,
    });
    const suggestedPauseUntil = analysis.suggestedPauseHours
      ? new Date(Date.now() + analysis.suggestedPauseHours * 60 * 60 * 1000).toISOString()
      : null;
    const result = await createJourneyReplyReview({
      journeyCode: enrollment.journeyCode,
      enrollmentId: enrollment.id,
      leadId: lead.id,
      channel: inbound.channel,
      sourceId: inbound.sourceId,
      inboundAt: inbound.occurredAt,
      message: inbound.message,
      intent: analysis.intent,
      recommendation: analysis.recommendation,
      reason: analysis.reason,
      confidence: analysis.confidence,
      suggestedPauseUntil,
    });
    if (!result.created) continue;
    created += 1;
    await recordJourneyReply({
      journeyCode: enrollment.journeyCode,
      enrollmentId: enrollment.id,
      leadId: lead.id,
      channel: inbound.channel,
      sourceId: inbound.sourceId,
      reason: inbound.reason,
      occurredAt: inbound.occurredAt,
    }).catch(error => console.error("[Journey report] Không ghi được phản hồi:", error));
    await createTask({
      leadId: lead.id,
      leadName: lead.name,
      title: `[AI đề xuất] ${analysis.reason}`.slice(0, 240),
      dueDate: new Date().toISOString().slice(0, 10),
      priority: analysis.recommendation === "continue" ? "medium" : "high",
      done: false,
      assignedTo: lead.assignedTo || "",
    }).catch(() => undefined);
    // Ngoại lệ tuân thủ duy nhất: yêu cầu không liên hệ rõ ràng được áp dụng ngay.
    if (analysis.hardStop) {
      await cancelJourneyEnrollment(enrollment.id, "Khách yêu cầu không liên hệ qua tin nhắn đến.");
      if (result.review) await resolveJourneyReplyReview(result.review.id, "accepted", "system:dnc");
    }
  }
  return created;
}

function stopReason(lead: Lead, settings: B2BSofaJourneySettings): { cancel?: string; pause?: string } {
  if (stageStopsJourney(lead.stage)) return { cancel: `Lead đã chuyển sang giai đoạn ${lead.stage}.` };
  const tags = new Set((lead.tags || []).map(tag => tag.trim().toLocaleLowerCase("vi")));
  const dnc = settings.doNotContactTags.find(tag => tags.has(tag.trim().toLocaleLowerCase("vi")));
  if (dnc) return { cancel: `Lead có nhãn không liên hệ: ${dnc}.` };
  if (["hot lead", "human takeover", "nhân viên xử lý"].some(tag => tags.has(tag))) {
    return { pause: "Lead đã được đánh dấu ưu tiên/nhân viên tiếp quản." };
  }
  return {};
}

async function processAction<TSettings extends B2BSofaJourneySettings>(
  action: JourneyActionRecord,
  settings: TSettings,
  runtime: JourneyRuntime<TSettings>,
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

  if (runtime.requireAcceptedZaloFriendship && lead.zaloFriendship?.status !== "accepted") {
    const reason = "Tạm dừng – mất kết nối Zalo";
    await pauseJourneyEnrollment(enrollment.id, reason);
    await deferJourneyAction(action.id, new Date(Date.now() + 24 * 60 * 60 * 1000), reason);
    return { status: "paused", message: reason };
  }

  const nextBusinessWindow = nextJourneyBusinessWindow(new Date(), settings);
  if (nextBusinessWindow) {
    await deferJourneyAction(action.id, nextBusinessWindow, "Hoãn đến khung giờ làm việc kế tiếp.");
    return { status: "deferred", message: `Hoãn đến ${nextBusinessWindow.toISOString()} theo giờ làm việc.` };
  }

  // Tránh hai bước dồn vào cùng một ngày khi một lịch Chủ nhật được chuyển sang
  // thứ Hai, đồng thời giữ tần suất nhất quán giữa nhiều journey của cùng lead.
  if (enrollment.lastOutboundAt) {
    const lastOutboundAt = new Date(enrollment.lastOutboundAt).getTime();
    const earliestNextSendAt = lastOutboundAt + 24 * 60 * 60 * 1000;
    if (Number.isFinite(lastOutboundAt) && Date.now() < earliestNextSendAt) {
      const until = new Date(earliestNextSendAt);
      await deferJourneyAction(action.id, until, "Hoãn để bảo đảm tối đa một nội dung tự động trong 24 giờ.");
      return { status: "deferred", message: `Hoãn đến ${until.toISOString()} theo giới hạn 24 giờ.` };
    }
  }

  const sentLastSevenDays = await countJourneyMessagesInLastSevenDays(lead.id);
  if (sentLastSevenDays >= settings.maxMessagesPerSevenDays) {
    const until = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await deferJourneyAction(action.id, until, "Hoãn theo giới hạn tần suất 7 ngày.");
    return { status: "deferred", message: `Hoãn đến ${until.toISOString()} theo giới hạn tần suất.` };
  }

  const step = runtime.definitionWithOverrides(settings).steps.find(item => item.id === action.stepId);
  if (!step) {
    await markJourneyActionOutcome(action, "skipped", action.attempts, "Không tìm thấy định nghĩa bước journey.");
    return { status: "skipped", message: "Không tìm thấy định nghĩa bước journey." };
  }
  if (step.enabled === false) {
    await markJourneyActionOutcome(action, "skipped", action.attempts, "Bước đã được tắt trong cấu hình workflow.");
    return { status: "skipped", message: "Bước đã được tắt trong cấu hình workflow." };
  }

  const latestBase = runtime.buildContext(lead, settings);
  const context = { ...latestBase, ...nonEmptyContext(enrollment.context) };
  // Các URL quản trị mới nhất luôn được ưu tiên hơn snapshot khi enrollment.
  if (settings.surveyFormUrl) context.survey_form_url = settings.surveyFormUrl;
  if (settings.surveyFormUrl) context.survey_form_line = `Điền nhanh tại: ${settings.surveyFormUrl}`;
  if (settings.approvedDemoVideoUrl) context.approved_demo_video_url = settings.approvedDemoVideoUrl;
  if (settings.projectBriefUrl) context.project_brief_url = settings.projectBriefUrl;
  if (settings.comparisonPackUrl) context.comparison_pack_url = settings.comparisonPackUrl;

  let media: PreparedMedia[] = [];
  try {
    media = await prepareMedia(step.mediaAssetIds || []);
  } catch (error) {
    await markJourneyActionWaitingContent(action, ["media_library"]);
    return { status: "waiting_content", message: error instanceof Error ? error.message : "Không tải được media từ thư viện." };
  }
  const hasAttachedVideo = media.some(item =>
    item.asset.mediaKind === "video" || item.asset.contentType.startsWith("video/"),
  );
  if (hasAttachedVideo && !context.approved_demo_video_url) {
    context.approved_demo_video_url = "xem video đính kèm trong tin nhắn này";
  }
  const missing = missingRequiredContext(step, context).filter(variable =>
    !(variable === "approved_demo_video_url" && hasAttachedVideo),
  );
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
    await recordJourneyEvent({
      journeyCode: enrollment.journeyCode,
      enrollmentId: enrollment.id,
      actionId: action.id,
      leadId: lead.id,
      stepId: action.stepId,
      eventType: "waiting_content",
      metadata: { missing },
      idempotencyKey: `waiting:${action.id}:${missing.sort().join(",")}`,
    }).catch(error => console.error("[Journey report] Không ghi được trạng thái chờ:", error));
    await markJourneyActionWaitingContent(action, missing);
    return { status: "waiting_content", message: `Chờ dữ liệu: ${missing.join(", ")}` };
  }

  const subject = renderJourneyTemplate(step.emailSubject, context);
  const emailBody = renderJourneyTemplate(step.emailBody, context);
  const zaloBody = renderJourneyTemplate(step.zaloBody, context);
  const accountId = await resolveAutomationAccountId(settings, enrollment);
  await initZaloGateway().catch(() => undefined);

  const attempts = [...action.attempts];
  for (const channel of channelSequence(step)) {
    const policy = await evaluateAutomationContact({ lead, channel, message: channel === "email" ? subject : zaloBody });
    if (!policy.allowed) {
      attempts.push({ channel, at: new Date().toISOString(), outcome: "blocked", error: policy.reason });
      await recordJourneyEvent({ journeyCode: enrollment.journeyCode, enrollmentId: enrollment.id, actionId: action.id,
        leadId: lead.id, stepId: action.stepId, eventType: "send_attempted", channel,
        metadata: { outcome: "blocked", policyCode: policy.code, error: policy.reason },
        idempotencyKey: `attempt:${action.id}:${channel}:policy:${policy.code}` }).catch(() => undefined);
      if (policy.code === "do_not_contact") {
        await cancelJourneyEnrollment(enrollment.id, policy.reason);
        return { status: "cancelled", message: policy.reason };
      }
      if (policy.code === "quiet_hours" || policy.code === "frequency_cap") {
        const retryAt = policy.retryAt ? new Date(policy.retryAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);
        await deferJourneyAction(action.id, retryAt, policy.reason);
        return { status: "deferred", message: policy.reason };
      }
      continue;
    }
    const emailTracking = await createJourneyEmailTracking({
        journeyCode: enrollment.journeyCode,
        enrollmentId: enrollment.id,
        actionId: action.id,
        leadId: lead.id,
        stepId: action.stepId,
        channel,
      }).catch(error => {
        console.error("[Journey report] Không tạo được tracking link, vẫn tiếp tục gửi:", error);
        return undefined;
      });
    const result = await executeChannel(
      channel,
      lead,
      accountId,
      subject,
      emailBody,
      zaloBody,
      media,
      runtime.emailFromName,
      emailTracking,
    );
    attempts.push({
      channel,
      at: new Date().toISOString(),
      outcome: result.outcome,
      error: result.error,
      providerMessageId: result.providerMessageId,
    });
    await logChannelAttempt(action, lead, channel, result, runtime.journeyName);
    await recordJourneyEvent({
      journeyCode: enrollment.journeyCode,
      enrollmentId: enrollment.id,
      actionId: action.id,
      leadId: lead.id,
      stepId: action.stepId,
      eventType: "send_attempted",
      channel,
      providerMessageId: result.providerMessageId,
      metadata: { outcome: result.outcome, error: result.error || "" },
      idempotencyKey: `attempt:${action.id}:${channel}`,
    }).catch(error => console.error("[Journey report] Không ghi được lần thử gửi:", error));

    if (result.outcome === "sent") {
      if (emailTracking?.token && result.providerMessageId) {
        await attachJourneyEmailProviderId(emailTracking.token, result.providerMessageId)
          .catch(error => console.error("[Journey report] Không gắn được provider email:", error));
      }
      await recordJourneyEvent({
        journeyCode: enrollment.journeyCode,
        enrollmentId: enrollment.id,
        actionId: action.id,
        leadId: lead.id,
        stepId: action.stepId,
        eventType: "sent",
        channel,
        providerMessageId: result.providerMessageId,
        metadata: { fallback: channel !== step.primaryChannel },
        idempotencyKey: `sent:${action.id}`,
      }).catch(error => console.error("[Journey report] Không ghi được gửi thành công:", error));
      if (channel !== step.primaryChannel) {
        await recordJourneyEvent({
          journeyCode: enrollment.journeyCode,
          enrollmentId: enrollment.id,
          actionId: action.id,
          leadId: lead.id,
          stepId: action.stepId,
          eventType: "fallback_used",
          channel,
          metadata: { primaryChannel: step.primaryChannel },
          idempotencyKey: `fallback:${action.id}`,
        }).catch(error => console.error("[Journey report] Không ghi được fallback:", error));
      }
      await recordJourneySentActivity({
        actionId: action.id,
        leadId: lead.id,
        channel,
        stepTitle: step.title,
        subject,
        emailBody,
        zaloBody,
        media,
      }).catch(error => console.error("[Journey activity] Không ghi được lịch sử gửi:", error));
      await markJourneyActionSent(action, channel, attempts);
      return { status: "sent", channel, message: `Đã gửi qua ${channel}.` };
    }
    if (result.outcome === "delivery_unknown") {
      await recordJourneyEvent({
        journeyCode: enrollment.journeyCode,
        enrollmentId: enrollment.id,
        actionId: action.id,
        leadId: lead.id,
        stepId: action.stepId,
        eventType: "delivery_unknown",
        channel,
        metadata: { error: result.error || "" },
        idempotencyKey: `delivery-unknown:${action.id}`,
      }).catch(error => console.error("[Journey report] Không ghi được delivery unknown:", error));
      await markJourneyActionOutcome(action, "delivery_unknown", attempts, result.error || "Kết quả gửi chưa rõ.");
      return { status: "delivery_unknown", channel, message: "Dừng fallback để đối soát kết quả chưa rõ." };
    }
  }

  const error = attempts.slice(-3).map(item => `${item.channel}: ${item.error || item.outcome}`).join(" | ");
  await recordJourneyEvent({
    journeyCode: enrollment.journeyCode,
    enrollmentId: enrollment.id,
    actionId: action.id,
    leadId: lead.id,
    stepId: action.stepId,
    eventType: "failed",
    metadata: { error },
    idempotencyKey: `failed:${action.id}`,
  }).catch(reportError => console.error("[Journey report] Không ghi được thất bại:", reportError));
  await markJourneyActionOutcome(action, "failed", attempts, error || "Tất cả kênh đều không gửi được.");
  return { status: "failed", message: error || "Tất cả kênh đều không gửi được." };
}

export async function runJourneyRuntime<TSettings extends B2BSofaJourneySettings>(
  runtime: JourneyRuntime<TSettings>,
  limit = 20,
): Promise<B2BSofaJourneyRunResult> {
  const startedAt = new Date().toISOString();
  const settings = await runtime.getSettings();
  const emptyEnrollment = { checked: 0, enrolled: 0, skipped: 0 };
  if (!settings.enabled) {
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      enabled: false,
      autoEnrollment: emptyEnrollment,
      claimed: 0, sent: 0, failed: 0, deliveryUnknown: 0, waitingContent: 0, paused: 0, logs: [],
      replyRecommendations: 0,
    };
  }

  await backfillJourneySentActivities(runtime, settings)
    .catch(error => console.error("[Journey activity] Không đối soát được lịch sử gửi:", error));

  const autoEnrollment = await runtime.autoEnroll(settings);
  const replyRecommendations = await scanJourneyReplies(runtime);
  const allowedLeadIds = settings.canaryMode ? settings.canaryLeadIds : null;
  const actions = await runtime.claimDueActions(limit, allowedLeadIds);
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
    replyRecommendations,
    logs: [],
  };

  for (const action of actions) {
    try {
      const outcome = await processAction(action, settings, runtime);
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

export async function runB2BSofaJourney(limit = 20): Promise<B2BSofaJourneyRunResult> {
  return runJourneyRuntime({
    journeyCode: B2B_SOFA_JOURNEY.code,
    journeyName: B2B_SOFA_JOURNEY.name,
    getSettings: getB2BSofaJourneySettings,
    definitionWithOverrides: journeyDefinitionWithOverrides,
    buildContext: buildJourneyContext,
    autoEnroll: autoEnrollEligibleB2BSofaLeads,
    claimDueActions: claimDueJourneyActions,
    emailFromName: "SmartFurni B2B",
  }, limit);
}
