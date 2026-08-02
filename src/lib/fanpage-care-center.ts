import { createHash, randomUUID } from "crypto";
import OpenAI from "openai";
import { getDb, query, queryOne } from "@/lib/db";
import {
  getPages,
  loadFacebookSchedulerFromDb,
  type FacebookPage,
} from "@/lib/crm-facebook-scheduler-store";
import { getAllStaff, getStaffById } from "@/lib/crm-staff-store";
import { initConversationLearningSchema } from "@/lib/conversation-learning-store";
import { countPushSubscriptions, sendPushNotification } from "@/lib/pwa-server";
import {
  getFanpageCareSettings,
  resolveFanpageCareAiModel,
  type FanpageCareAiProvider,
  type FanpageCareSettings,
} from "@/lib/fanpage-care-settings";
import {
  assessFanpageConversation,
  alignDraftMessageAddressing,
  buildFallbackCarePlan,
  detectConversationAddressing,
  hasNewMessagesSinceAnalysis,
  type ConversationForAnalysis,
  type DeterministicConversationAssessment,
  type GeneratedCarePlan,
} from "@/lib/fanpage-care-center-rules";
import type {
  FanpageCareCenterOverview,
  FanpageCarePlan,
  FanpageCarePlanStatus,
  FanpageCarePlanStep,
  FanpageCareRun,
  FanpageCareStaffOption,
  FanpageLeadTemperature,
} from "@/types/fanpage-care-center";

const DAILY_LOCK_ID = 2_607_290_126;
const DEFAULT_DAILY_HOUR = 7;
const DEFAULT_LOOKBACK_DAYS = 30;
const DEFAULT_CONVERSATIONS_PER_PAGE = 100;
const DEFAULT_MESSAGES_PER_CONVERSATION = 60;

type DbRow = Record<string, unknown>;

interface FacebookConversationPayload {
  id: string;
  snippet?: string;
  updated_time?: string;
  message_count?: number;
  unread_count?: number;
  can_reply?: boolean;
  participants?: { data?: Array<{ id: string; name?: string }> };
}

interface FacebookMessagePayload {
  id: string;
  message?: string;
  from?: { id: string; name?: string };
  created_time?: string;
  attachments?: { data?: Array<Record<string, unknown>> };
}

let schemaPromise: Promise<void> | null = null;

function asJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function stableId(prefix: string, ...parts: string[]) {
  return `${prefix}_${createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32)}`;
}

function vietnamDate(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function vietnamHour(value = new Date()) {
  return Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    hour12: false,
  }).format(value));
}

function safeDate(value: unknown) {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function mapRun(row: DbRow): FanpageCareRun {
  return {
    id: String(row.id),
    runDate: String(row.run_date),
    runType: String(row.run_type) as FanpageCareRun["runType"],
    status: String(row.status) as FanpageCareRun["status"],
    startedAt: new Date(String(row.started_at)).toISOString(),
    finishedAt: safeDate(row.finished_at),
    pagesTotal: Number(row.pages_total || 0),
    pagesSynced: Number(row.pages_synced || 0),
    conversationsScanned: Number(row.conversations_scanned || 0),
    messagesSaved: Number(row.messages_saved || 0),
    leadsQualified: Number(row.leads_qualified || 0),
    plansGenerated: Number(row.plans_generated || 0),
    pushSent: Number(row.push_sent || 0),
    model: row.model ? String(row.model) : undefined,
    error: row.error ? String(row.error) : undefined,
    details: asJson<Record<string, unknown>>(row.details, {}),
  };
}

function normalizePlanSteps(value: unknown): FanpageCarePlanStep[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item, index) => {
    const step = (item || {}) as Record<string, unknown>;
    const rawChannel = String(step.channel || "CRM");
    const channel: FanpageCarePlanStep["channel"] =
      rawChannel === "Messenger" || rawChannel === "Điện thoại" || rawChannel === "Zalo"
        ? rawChannel
        : "CRM";
    return {
      dayOffset: Math.max(0, Math.min(30, Number(step.dayOffset ?? index) || 0)),
      when: String(step.when || (index === 0 ? "Trong hôm nay" : `Sau ${index} ngày`)).slice(0, 120),
      channel,
      goal: String(step.goal || "Chăm sóc khách hàng").slice(0, 240),
      action: String(step.action || "Nhân viên kiểm tra và liên hệ phù hợp.").slice(0, 1000),
      draftMessage: step.draftMessage ? String(step.draftMessage).slice(0, 1200) : undefined,
      requiresHumanApproval: true,
    };
  });
}

function mapPlan(row: DbRow): FanpageCarePlan {
  return {
    id: String(row.id),
    analysisDate: String(row.analysis_date),
    runId: row.run_id ? String(row.run_id) : undefined,
    pageInternalId: String(row.page_internal_id),
    pageFacebookId: String(row.page_facebook_id),
    pageName: String(row.page_name),
    conversationId: String(row.conversation_id),
    participantId: row.participant_id ? String(row.participant_id) : undefined,
    customerId: row.customer_id ? String(row.customer_id) : undefined,
    customerName: String(row.customer_name || "Khách Facebook"),
    assignedStaffId: row.assigned_staff_id ? String(row.assigned_staff_id) : undefined,
    assignedStaffName: row.assigned_staff_name ? String(row.assigned_staff_name) : undefined,
    leadScore: Number(row.lead_score || 0),
    leadTemperature: String(row.lead_temperature || "cold") as FanpageLeadTemperature,
    funnelStage: String(row.funnel_stage || "new"),
    confidence: Number(row.confidence || 0),
    summary: String(row.summary || ""),
    customerNeed: String(row.customer_need || ""),
    productInterest: stringArray(row.product_interest),
    objections: stringArray(row.objections),
    buyingSignals: stringArray(row.buying_signals),
    nextBestAction: String(row.next_best_action || ""),
    dueAt: safeDate(row.due_at),
    planSteps: normalizePlanSteps(asJson(row.plan_steps, [])),
    status: String(row.status || "pending") as FanpageCarePlanStatus,
    engine: String(row.engine || "rules") === "openai"
      ? "openai"
      : String(row.engine || "rules") === "gemini" ? "gemini" : "rules",
    model: row.model ? String(row.model) : undefined,
    sourceMessageCount: Number(row.source_message_count || 0),
    sourceLatestMessageAt: safeDate(row.source_latest_message_at),
    notificationOwnerScope: row.notification_owner_scope ? String(row.notification_owner_scope) : undefined,
    notificationOwnerId: row.notification_owner_id ? String(row.notification_owner_id) : undefined,
    notificationSentAt: safeDate(row.notification_sent_at),
    notificationResult: asJson<Record<string, unknown>>(row.notification_result, {}),
    metadata: asJson<Record<string, unknown>>(row.metadata, {}),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function ensureFanpageCareCenterSchema() {
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    await query(`
      CREATE TABLE IF NOT EXISTS fanpage_ai_sync_runs (
        id TEXT PRIMARY KEY, run_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
        run_type TEXT NOT NULL DEFAULT 'scheduled', status TEXT NOT NULL DEFAULT 'running',
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), finished_at TIMESTAMPTZ,
        pages_total INTEGER NOT NULL DEFAULT 0, pages_synced INTEGER NOT NULL DEFAULT 0,
        conversations_scanned INTEGER NOT NULL DEFAULT 0, messages_saved INTEGER NOT NULL DEFAULT 0,
        leads_qualified INTEGER NOT NULL DEFAULT 0, plans_generated INTEGER NOT NULL DEFAULT 0,
        push_sent INTEGER NOT NULL DEFAULT 0, model TEXT, error TEXT,
        details JSONB NOT NULL DEFAULT '{}'::jsonb
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS fanpage_conversation_snapshots (
        id TEXT PRIMARY KEY, page_internal_id TEXT NOT NULL, page_facebook_id TEXT NOT NULL,
        page_name TEXT NOT NULL, conversation_id TEXT NOT NULL, participant_id TEXT,
        participant_name TEXT, snippet TEXT NOT NULL DEFAULT '', updated_time TIMESTAMPTZ,
        message_count INTEGER NOT NULL DEFAULT 0, unread_count INTEGER NOT NULL DEFAULT 0,
        can_reply BOOLEAN NOT NULL DEFAULT TRUE, assigned_staff_id TEXT, assigned_staff_name TEXT,
        analyzed_message_count INTEGER NOT NULL DEFAULT 0, analyzed_latest_message_id TEXT,
        analyzed_latest_message_at TIMESTAMPTZ, last_analyzed_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb, last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(page_internal_id, conversation_id)
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS fanpage_conversation_messages (
        id TEXT PRIMARY KEY, page_internal_id TEXT NOT NULL, conversation_id TEXT NOT NULL,
        sender_id TEXT, sender_name TEXT, direction TEXT NOT NULL, content TEXT NOT NULL DEFAULT '',
        attachments JSONB NOT NULL DEFAULT '[]'::jsonb, message_created_at TIMESTAMPTZ,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb, synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS fanpage_ai_care_plans (
        id TEXT PRIMARY KEY, analysis_date DATE NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
        run_id TEXT, page_internal_id TEXT NOT NULL, page_facebook_id TEXT NOT NULL, page_name TEXT NOT NULL,
        conversation_id TEXT NOT NULL, participant_id TEXT, customer_id TEXT,
        customer_name TEXT NOT NULL DEFAULT 'Khách Facebook', assigned_staff_id TEXT, assigned_staff_name TEXT,
        lead_score INTEGER NOT NULL DEFAULT 0, lead_temperature TEXT NOT NULL DEFAULT 'cold',
        funnel_stage TEXT NOT NULL DEFAULT 'new', confidence NUMERIC(5,4) NOT NULL DEFAULT 0,
        summary TEXT NOT NULL DEFAULT '', customer_need TEXT NOT NULL DEFAULT '',
        product_interest TEXT[] NOT NULL DEFAULT '{}', objections TEXT[] NOT NULL DEFAULT '{}',
        buying_signals TEXT[] NOT NULL DEFAULT '{}', next_best_action TEXT NOT NULL DEFAULT '',
        due_at TIMESTAMPTZ, plan_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'pending', engine TEXT NOT NULL DEFAULT 'rules', model TEXT,
        source_message_count INTEGER NOT NULL DEFAULT 0, source_latest_message_at TIMESTAMPTZ,
        notification_owner_scope TEXT, notification_owner_id TEXT, notification_sent_at TIMESTAMPTZ,
        notification_result JSONB NOT NULL DEFAULT '{}'::jsonb, reviewed_by TEXT, reviewed_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ, metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(page_internal_id, conversation_id)
      )
    `);
    await query(`ALTER TABLE fanpage_conversation_snapshots ADD COLUMN IF NOT EXISTS analyzed_message_count INTEGER NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE fanpage_conversation_snapshots ADD COLUMN IF NOT EXISTS analyzed_latest_message_id TEXT`);
    await query(`ALTER TABLE fanpage_conversation_snapshots ADD COLUMN IF NOT EXISTS analyzed_latest_message_at TIMESTAMPTZ`);
    await query(`ALTER TABLE fanpage_conversation_snapshots ADD COLUMN IF NOT EXISTS last_analyzed_at TIMESTAMPTZ`);
    await query(`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY page_internal_id, conversation_id
                 ORDER BY
                   CASE status
                     WHEN 'in_progress' THEN 5
                     WHEN 'approved' THEN 4
                     WHEN 'pending' THEN 3
                     WHEN 'completed' THEN 2
                     ELSE 1
                   END DESC,
                   updated_at DESC,
                   analysis_date DESC,
                   created_at DESC
               ) AS duplicate_rank
        FROM fanpage_ai_care_plans
      )
      DELETE FROM fanpage_ai_care_plans AS plan
      USING ranked
      WHERE plan.id = ranked.id AND ranked.duplicate_rank > 1
    `);
    await query(`
      DO $$
      DECLARE old_constraint TEXT;
      BEGIN
        SELECT constraint_row.conname
        INTO old_constraint
        FROM pg_constraint AS constraint_row
        WHERE constraint_row.conrelid = 'fanpage_ai_care_plans'::regclass
          AND constraint_row.contype = 'u'
          AND pg_get_constraintdef(constraint_row.oid)
            = 'UNIQUE (analysis_date, page_internal_id, conversation_id)'
        LIMIT 1;
        IF old_constraint IS NOT NULL THEN
          EXECUTE format('ALTER TABLE fanpage_ai_care_plans DROP CONSTRAINT %I', old_constraint);
        END IF;
      END $$
    `);
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_fanpage_ai_care_plans_conversation ON fanpage_ai_care_plans(page_internal_id, conversation_id)`);
    await query(`
      UPDATE fanpage_conversation_snapshots AS snapshot
      SET analyzed_message_count = plan.source_message_count,
          analyzed_latest_message_at = plan.source_latest_message_at,
          last_analyzed_at = COALESCE(plan.updated_at, NOW())
      FROM fanpage_ai_care_plans AS plan
      WHERE snapshot.page_internal_id = plan.page_internal_id
        AND snapshot.conversation_id = plan.conversation_id
        AND snapshot.last_analyzed_at IS NULL
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_fanpage_ai_care_plans_queue ON fanpage_ai_care_plans(status, lead_score DESC, due_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_fanpage_messages_conversation ON fanpage_conversation_messages(page_internal_id, conversation_id, message_created_at)`);
  })().catch(error => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

async function facebookGet<T>(url: URL, accessToken: string): Promise<T> {
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json().catch(() => ({})) as T & { error?: { message?: string; code?: number } };
  if (!response.ok || payload.error) {
    throw new Error(payload.error?.message || `Facebook API lỗi ${response.status}`);
  }
  return payload;
}

async function upsertConversationSnapshot(page: FacebookPage, conversation: FacebookConversationPayload) {
  const participants = conversation.participants?.data || [];
  const participant = participants.find(item => item.id !== page.pageId) || participants[0];
  const id = stableId("fbc", page.id, conversation.id);
  await query(
    `INSERT INTO fanpage_conversation_snapshots
      (id, page_internal_id, page_facebook_id, page_name, conversation_id, participant_id,
       participant_name, snippet, updated_time, message_count, unread_count, can_reply, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     ON CONFLICT (page_internal_id, conversation_id) DO UPDATE SET
       page_facebook_id = EXCLUDED.page_facebook_id,
       page_name = EXCLUDED.page_name,
       participant_id = EXCLUDED.participant_id,
       participant_name = EXCLUDED.participant_name,
       snippet = EXCLUDED.snippet,
       updated_time = EXCLUDED.updated_time,
       message_count = EXCLUDED.message_count,
       unread_count = EXCLUDED.unread_count,
       can_reply = EXCLUDED.can_reply,
       metadata = fanpage_conversation_snapshots.metadata || EXCLUDED.metadata,
       last_synced_at = NOW(),
       updated_at = NOW()`,
    [
      id,
      page.id,
      page.pageId,
      page.pageName,
      conversation.id,
      participant?.id || null,
      participant?.name || "Khách Facebook",
      conversation.snippet || "",
      conversation.updated_time || null,
      Number(conversation.message_count || 0),
      Number(conversation.unread_count || 0),
      conversation.can_reply !== false,
      JSON.stringify({ source: "facebook-graph", category: page.category || null }),
    ],
  );
  return participant;
}

async function syncConversationMessages(page: FacebookPage, conversationId: string) {
  const apiVersion = process.env.FACEBOOK_GRAPH_API_VERSION || "v19.0";
  const limit = Math.max(10, Math.min(100, Number(process.env.FANPAGE_AI_MESSAGES_PER_CONVERSATION || DEFAULT_MESSAGES_PER_CONVERSATION)));
  const url = new URL(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(conversationId)}/messages`);
  url.searchParams.set("fields", "id,message,from,created_time,attachments");
  url.searchParams.set("limit", String(limit));
  const payload = await facebookGet<{ data?: FacebookMessagePayload[] }>(url, page.pageAccessToken);
  let processed = 0;
  for (const message of payload.data || []) {
    await query(
      `INSERT INTO fanpage_conversation_messages
        (id, page_internal_id, conversation_id, sender_id, sender_name, direction,
         content, attachments, message_created_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO UPDATE SET
         content = EXCLUDED.content,
         attachments = EXCLUDED.attachments,
         message_created_at = EXCLUDED.message_created_at,
         synced_at = NOW()`,
      [
        stableId("fbm", page.id, message.id),
        page.id,
        conversationId,
        message.from?.id || null,
        message.from?.name || null,
        message.from?.id === page.pageId ? "outbound" : "inbound",
        message.message || "",
        JSON.stringify(message.attachments?.data || []),
        message.created_time || null,
        JSON.stringify({ facebookMessageId: message.id }),
      ],
    );
    processed += 1;
  }
  return processed;
}

async function syncOneFanpage(page: FacebookPage) {
  const apiVersion = process.env.FACEBOOK_GRAPH_API_VERSION || "v19.0";
  const maxConversations = Math.max(10, Math.min(500, Number(
    process.env.FANPAGE_AI_CONVERSATION_LIMIT_PER_PAGE || DEFAULT_CONVERSATIONS_PER_PAGE,
  )));
  let after = "";
  let scanned = 0;
  let messagesSaved = 0;
  let pageCount = 0;

  while (scanned < maxConversations && pageCount < 5) {
    const url = new URL(`https://graph.facebook.com/${apiVersion}/${encodeURIComponent(page.pageId)}/conversations`);
    url.searchParams.set("fields", "id,snippet,updated_time,message_count,unread_count,participants,can_reply");
    url.searchParams.set("limit", String(Math.min(100, maxConversations - scanned)));
    if (after) url.searchParams.set("after", after);
    const payload = await facebookGet<{
      data?: FacebookConversationPayload[];
      paging?: { cursors?: { after?: string } };
    }>(url, page.pageAccessToken);
    const conversations = payload.data || [];
    for (let offset = 0; offset < conversations.length; offset += 4) {
      const batch = conversations.slice(offset, offset + 4);
      const results = await Promise.all(batch.map(async conversation => {
        await upsertConversationSnapshot(page, conversation);
        return syncConversationMessages(page, conversation.id);
      }));
      messagesSaved += results.reduce((sum, count) => sum + count, 0);
    }
    scanned += conversations.length;
    pageCount += 1;
    after = payload.paging?.cursors?.after || "";
    if (!after || conversations.length === 0) break;
  }
  return { conversations: scanned, messagesSaved };
}

async function resolveCustomerAndOwner(participantId?: string) {
  if (!participantId) return {};
  const row = await queryOne<{
    id: string;
    name: string;
    owner_id: string | null;
    owner_name: string | null;
  }>(
    `SELECT id, name, owner_id, owner_name
     FROM customers
     WHERE metadata->>'facebookUserId' = $1
        OR metadata->>'facebook_user_id' = $1
        OR metadata->>'user_id' = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [participantId],
  ).catch(() => null);
  return row
    ? {
        customerId: row.id,
        customerName: row.name || undefined,
        assignedStaffId: row.owner_id || undefined,
        assignedStaffName: row.owner_name || undefined,
      }
    : {};
}

async function loadConversationsForAnalysis(lookbackDays = DEFAULT_LOOKBACK_DAYS) {
  const snapshots = await query<DbRow>(
    `SELECT *
     FROM fanpage_conversation_snapshots
     WHERE updated_time >= NOW() - ($1::text || ' days')::interval
     ORDER BY updated_time DESC`,
    [Math.max(1, Math.min(90, lookbackDays))],
  );
  const output: ConversationForAnalysis[] = [];
  for (const snapshot of snapshots) {
    const messages = await query<DbRow>(
      `WITH recent_messages AS (
         SELECT id, direction, content, message_created_at,
                COUNT(*) OVER ()::int AS total_message_count
         FROM fanpage_conversation_messages
         WHERE page_internal_id = $1 AND conversation_id = $2
         ORDER BY message_created_at DESC NULLS LAST, id DESC
         LIMIT 120
       )
       SELECT * FROM recent_messages
       ORDER BY message_created_at ASC NULLS LAST, id ASC`,
      [snapshot.page_internal_id, snapshot.conversation_id],
    );
    const latestMessage = messages[messages.length - 1];
    const storedMessageCount = Number(messages[0]?.total_message_count || 0);
    const sourceMessageCount = Math.max(Number(snapshot.message_count || 0), storedMessageCount);
    const identity = await resolveCustomerAndOwner(snapshot.participant_id ? String(snapshot.participant_id) : undefined);
    output.push({
      pageInternalId: String(snapshot.page_internal_id),
      pageFacebookId: String(snapshot.page_facebook_id),
      pageName: String(snapshot.page_name),
      conversationId: String(snapshot.conversation_id),
      participantId: snapshot.participant_id ? String(snapshot.participant_id) : undefined,
      participantName: identity.customerName || String(snapshot.participant_name || "Khách Facebook"),
      unreadCount: Number(snapshot.unread_count || 0),
      canReply: snapshot.can_reply !== false,
      sourceMessageCount,
      latestMessageId: latestMessage ? String(latestMessage.id) : undefined,
      latestMessageAt: safeDate(latestMessage?.message_created_at) || safeDate(snapshot.updated_time),
      analyzedMessageCount: Number(snapshot.analyzed_message_count || 0),
      analyzedLatestMessageId: snapshot.analyzed_latest_message_id
        ? String(snapshot.analyzed_latest_message_id)
        : undefined,
      analyzedLatestMessageAt: safeDate(snapshot.analyzed_latest_message_at),
      lastAnalyzedAt: safeDate(snapshot.last_analyzed_at),
      customerId: identity.customerId,
      assignedStaffId: identity.assignedStaffId || (snapshot.assigned_staff_id ? String(snapshot.assigned_staff_id) : undefined),
      assignedStaffName: identity.assignedStaffName || (snapshot.assigned_staff_name ? String(snapshot.assigned_staff_name) : undefined),
      messages: messages.map(message => ({
        id: String(message.id),
        direction: String(message.direction) === "outbound" ? "outbound" : "inbound",
        content: String(message.content || ""),
        createdAt: safeDate(message.message_created_at),
      })),
    });
  }
  return output;
}

async function markConversationsAnalyzed(conversations: ConversationForAnalysis[]) {
  if (!conversations.length) return 0;
  const checkpoints = conversations.map(conversation => ({
    page_internal_id: conversation.pageInternalId,
    conversation_id: conversation.conversationId,
    message_count: conversation.sourceMessageCount ?? conversation.messages.length,
    latest_message_id: conversation.latestMessageId || null,
    latest_message_at: conversation.latestMessageAt || null,
  }));
  const rows = await query<{ id: string }>(
    `UPDATE fanpage_conversation_snapshots AS snapshot
     SET analyzed_message_count = checkpoint.message_count,
         analyzed_latest_message_id = checkpoint.latest_message_id,
         analyzed_latest_message_at = checkpoint.latest_message_at,
         last_analyzed_at = NOW(),
         updated_at = NOW()
     FROM jsonb_to_recordset($1::jsonb) AS checkpoint(
       page_internal_id text,
       conversation_id text,
       message_count integer,
       latest_message_id text,
       latest_message_at timestamptz
     )
     WHERE snapshot.page_internal_id = checkpoint.page_internal_id
       AND snapshot.conversation_id = checkpoint.conversation_id
     RETURNING snapshot.id`,
    [JSON.stringify(checkpoints)],
  );
  return rows.length;
}

function parseAiJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(cleaned) as unknown;
}

async function generateAiPlans(
  inputs: Array<{ conversation: ConversationForAnalysis; assessment: DeterministicConversationAssessment }>,
  settings: FanpageCareSettings,
) {
  const selection = resolveFanpageCareAiModel(settings);
  const provider: FanpageCareAiProvider = selection.provider;
  const model = selection.model;
  const plans = new Map<string, GeneratedCarePlan>();
  const errors: string[] = [];
  if (!inputs.length) return { plans, provider, model, errors };

  const apiKey = provider === "openai"
    ? process.env.OPENAI_API_KEY?.trim()
    : process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    errors.push(provider === "openai"
      ? "OPENAI_API_KEY chưa được cấu hình trên Railway."
      : "GEMINI_API_KEY chưa được cấu hình trên Railway.");
    return { plans, provider, model, errors };
  }

  const openai = provider === "openai"
    ? new OpenAI({ apiKey, timeout: 75_000, maxRetries: 2 })
    : null;
  const batchSize = Math.max(2, Math.min(8, Number(
    process.env.FANPAGE_AI_BATCH_SIZE || process.env.FANPAGE_AI_GEMINI_BATCH_SIZE || 3,
  )));
  const concurrency = Math.max(1, Math.min(4, Number(
    process.env.FANPAGE_AI_CONCURRENCY || process.env.FANPAGE_AI_GEMINI_CONCURRENCY || 1,
  )));
  const batches: typeof inputs[] = [];
  for (let offset = 0; offset < inputs.length; offset += batchSize) {
    batches.push(inputs.slice(offset, offset + batchSize));
  }
  let nextBatch = 0;
  const workers = Array.from({ length: Math.min(concurrency, batches.length) }, async () => {
    while (nextBatch < batches.length) {
      const batchIndex = nextBatch;
      nextBatch += 1;
      const batch = batches[batchIndex];
      try {
        const safePayload = batch.map(({ conversation, assessment }) => ({
          id: conversation.conversationId,
          page: conversation.pageName,
          customerLabel: conversation.participantName.slice(0, 80),
          baseline: {
            score: assessment.leadScore,
            temperature: assessment.leadTemperature,
            stage: assessment.funnelStage,
            need: assessment.customerNeed,
            products: assessment.productInterest,
            objections: assessment.objections,
            signals: assessment.buyingSignals,
            priceGate: {
              status: assessment.priceGateStatus,
              pricePresented: assessment.pricePresented,
              pricePassed: assessment.pricePassed,
              postPriceQuestionCount: assessment.postPriceQuestionCount,
              postPriceQuestionTopics: assessment.postPriceQuestionTopics,
            },
          },
          addressing: detectConversationAddressing(conversation),
          messages: conversation.messages.slice(-14).map(message => ({
            direction: message.direction,
            content: message.content.slice(0, 500),
            at: message.createdAt,
          })),
        }));
        const prompt = [
          settings.prompts.system,
          settings.prompts.planning,
          "Không bịa giá, chính sách, số điện thoại, khuyến mãi hoặc thông tin sản phẩm.",
          "Không tự gửi tin. Mọi bước liên hệ phải requiresHumanApproval=true.",
          "CỔNG GIÁ BẮT BUỘC: không gọi lead nóng nếu priceGate.pricePassed=false. Nếu khách đã được báo giá nhưng im lặng hoặc chỉ nói ok/dạ/cảm ơn thì không tạo kế hoạch bám đuổi. Chỉ ưu tiên cao khi khách tiếp tục hỏi nhiều chủ đề sau báo giá hoặc thể hiện ý định mua rõ ràng.",
          "XƯNG HÔ BẮT BUỘC: mỗi hội thoại có trường addressing. Tin nhắn nháp phải dùng đúng staffPronoun để Fanpage tự xưng và customerAddress để gọi khách. Giữ cách xưng hô xuyên suốt, không tự đổi sang 'bạn', 'quý khách', 'anh/chị' hoặc gọi thẳng tên khi addressing đã xác định cách khác.",
          "Ưu tiên đúng ngữ cảnh hội thoại hơn văn mẫu; câu mở đầu phải tự nhiên như lời nhân viên đang tiếp tục cuộc trò chuyện, không giới thiệu lại thương hiệu nếu không cần.",
          "Tránh spam: tối đa một liên hệ/ngày, dừng nếu khách từ chối, ưu tiên trả lời tin chưa phản hồi.",
          "Trả về JSON thuần dạng {\"plans\":[...]} với mỗi phần tử gồm:",
          "conversationId, summary, customerNeed, productInterest[], objections[], buyingSignals[],",
          "nextBestAction, confidence (0..1), planSteps[] gồm dayOffset, when, channel (Messenger|Điện thoại|Zalo|CRM), goal, action, draftMessage, requiresHumanApproval.",
          `Mỗi hội thoại cần 3-4 bước trong tối đa ${settings.timing.maxPlanDays} ngày. Viết tiếng Việt tự nhiên, ngắn gọn.`,
          JSON.stringify(safePayload),
        ].join("\n");
        let text = "";
        let truncated = false;
        if (provider === "openai") {
          if (!openai) throw new Error("OpenAI client chưa sẵn sàng");
          const response = await openai.chat.completions.create({
            model,
            response_format: { type: "json_object" },
            max_completion_tokens: 8192,
            ...(model.startsWith("gpt-5") ? {} : { temperature: 0.2 }),
            messages: [
              {
                role: "system",
                content: "Bạn là AI phân tích hội thoại của CRM SmartFurni. Chỉ trả về một JSON object hợp lệ, không markdown.",
              },
              { role: "user", content: prompt },
            ],
          });
          text = response.choices[0]?.message?.content || "";
          truncated = response.choices[0]?.finish_reason === "length";
        } else {
          let response: Response | undefined;
          for (let attempt = 0; attempt < 3; attempt += 1) {
            response = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: {
                    temperature: 0.2,
                    responseMimeType: "application/json",
                    maxOutputTokens: 8192,
                  },
                }),
                signal: AbortSignal.timeout(50_000),
              },
            );
            if (response.status !== 429 || attempt === 2) break;
            await new Promise(resolve => setTimeout(resolve, 1_500 * (attempt + 1)));
          }
          if (!response) throw new Error("không nhận được phản hồi");
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const payload = await response.json() as {
            candidates?: Array<{
              finishReason?: string;
              content?: { parts?: Array<{ text?: string }> };
            }>;
          };
          const candidate = payload.candidates?.[0];
          text = candidate?.content?.parts?.map(part => part.text || "").join("") || "";
          truncated = candidate?.finishReason === "MAX_TOKENS";
        }
        if (truncated) {
          if (batch.length > 1) {
            const middle = Math.ceil(batch.length / 2);
            batches.push(batch.slice(0, middle), batch.slice(middle));
            continue;
          }
          throw new Error("phản hồi vượt giới hạn token");
        }
        if (!text) throw new Error("phản hồi trống");
        const parsed = parseAiJson(text) as { plans?: Array<Record<string, unknown>> };
        const allowedIds = new Set(batch.map(item => item.conversation.conversationId));
        for (const raw of parsed.plans || []) {
          const conversationId = String(raw.conversationId || "");
          if (!allowedIds.has(conversationId)) continue;
          const sourceConversation = batch.find(item => item.conversation.conversationId === conversationId)?.conversation;
          const addressing = sourceConversation ? detectConversationAddressing(sourceConversation) : undefined;
          const planSteps = normalizePlanSteps(raw.planSteps).map(step => ({
            ...step,
            draftMessage: step.draftMessage && addressing
              ? alignDraftMessageAddressing(step.draftMessage, addressing, sourceConversation?.participantName)
              : step.draftMessage,
          }));
          plans.set(conversationId, {
            conversationId,
            summary: String(raw.summary || "").slice(0, 1500),
            customerNeed: String(raw.customerNeed || "").slice(0, 1000),
            productInterest: stringArray(raw.productInterest).slice(0, 12),
            objections: stringArray(raw.objections).slice(0, 12),
            buyingSignals: stringArray(raw.buyingSignals).slice(0, 12),
            nextBestAction: String(raw.nextBestAction || "").slice(0, 1000),
            confidence: Math.max(0, Math.min(1, Number(raw.confidence || 0.75))),
            planSteps,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "lỗi không xác định";
        if (batch.length > 1 && /JSON|Unterminated|Unexpected end/i.test(message)) {
          const middle = Math.ceil(batch.length / 2);
          batches.push(batch.slice(0, middle), batch.slice(middle));
          continue;
        }
        errors.push(`Lô ${batchIndex + 1}/${batches.length}: ${message}`);
      }
    }
  });
  await Promise.all(workers);
  return { plans, provider, model, errors };
}

async function upsertCarePlan(input: {
  runId: string;
  conversation: ConversationForAnalysis;
  assessment: DeterministicConversationAssessment;
  generated: GeneratedCarePlan;
  engine: "openai" | "gemini" | "rules";
  model?: string;
}) {
  const { conversation, assessment, generated } = input;
  const rows = await query<DbRow>(
    `INSERT INTO fanpage_ai_care_plans
      (id, analysis_date, run_id, page_internal_id, page_facebook_id, page_name, conversation_id,
       participant_id, customer_id, customer_name, assigned_staff_id, assigned_staff_name,
       lead_score, lead_temperature, funnel_stage, confidence, summary, customer_need,
       product_interest, objections, buying_signals, next_best_action, due_at, plan_steps,
       engine, model, source_message_count, source_latest_message_at, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
     ON CONFLICT (page_internal_id, conversation_id) DO UPDATE SET
       analysis_date = EXCLUDED.analysis_date,
       run_id = EXCLUDED.run_id,
       participant_id = EXCLUDED.participant_id,
       customer_id = COALESCE(EXCLUDED.customer_id, fanpage_ai_care_plans.customer_id),
       customer_name = EXCLUDED.customer_name,
       assigned_staff_id = COALESCE(fanpage_ai_care_plans.assigned_staff_id, EXCLUDED.assigned_staff_id),
       assigned_staff_name = COALESCE(fanpage_ai_care_plans.assigned_staff_name, EXCLUDED.assigned_staff_name),
       lead_score = EXCLUDED.lead_score,
       lead_temperature = EXCLUDED.lead_temperature,
       funnel_stage = EXCLUDED.funnel_stage,
       confidence = EXCLUDED.confidence,
       summary = EXCLUDED.summary,
       customer_need = EXCLUDED.customer_need,
       product_interest = EXCLUDED.product_interest,
       objections = EXCLUDED.objections,
       buying_signals = EXCLUDED.buying_signals,
       next_best_action = EXCLUDED.next_best_action,
       due_at = EXCLUDED.due_at,
       plan_steps = EXCLUDED.plan_steps,
       engine = EXCLUDED.engine,
       model = EXCLUDED.model,
       source_message_count = EXCLUDED.source_message_count,
       source_latest_message_at = EXCLUDED.source_latest_message_at,
       metadata = fanpage_ai_care_plans.metadata || EXCLUDED.metadata,
       status = CASE
         WHEN fanpage_ai_care_plans.status = 'dismissed'
           AND fanpage_ai_care_plans.metadata->>'priceGateDismissal' = 'true'
         THEN 'pending'
         WHEN fanpage_ai_care_plans.status = 'completed' THEN 'pending'
         ELSE fanpage_ai_care_plans.status
       END,
       notification_owner_scope = NULL,
       notification_owner_id = NULL,
       notification_sent_at = NULL,
       notification_result = '{}'::jsonb,
       updated_at = NOW()
     RETURNING *`,
    [
      `fcp_${randomUUID()}`,
      vietnamDate(),
      input.runId,
      conversation.pageInternalId,
      conversation.pageFacebookId,
      conversation.pageName,
      conversation.conversationId,
      conversation.participantId || null,
      conversation.customerId || null,
      conversation.participantName || "Khách Facebook",
      conversation.assignedStaffId || null,
      conversation.assignedStaffName || null,
      assessment.leadScore,
      assessment.leadTemperature,
      assessment.funnelStage,
      generated.confidence,
      generated.summary,
      generated.customerNeed || assessment.customerNeed,
      generated.productInterest.length ? generated.productInterest : assessment.productInterest,
      generated.objections.length ? generated.objections : assessment.objections,
      generated.buyingSignals.length ? generated.buyingSignals : assessment.buyingSignals,
      generated.nextBestAction || assessment.nextBestAction,
      assessment.dueAt,
      JSON.stringify(generated.planSteps),
      input.engine,
      input.model || null,
      conversation.sourceMessageCount ?? conversation.messages.length,
      conversation.latestMessageAt || null,
      JSON.stringify({
        canReply: conversation.canReply,
        unreadCount: conversation.unreadCount,
        latestInboundUnanswered: assessment.latestInboundUnanswered,
        priceGateStatus: assessment.priceGateStatus,
        pricePresented: assessment.pricePresented,
        pricePassed: assessment.pricePassed,
        postPriceQuestionCount: assessment.postPriceQuestionCount,
        postPriceQuestionTopics: assessment.postPriceQuestionTopics,
        priceGateDismissal: false,
        addressing: detectConversationAddressing(conversation),
        safety: "human-approval-required",
      }),
    ],
  );
  return mapPlan(rows[0]);
}

async function dismissPlansExcludedByPriceGate(
  items: Array<{ conversation: ConversationForAnalysis; assessment: DeterministicConversationAssessment }>,
) {
  const excluded = items
    .filter(item => item.assessment.excludedFromCare)
    .map(item => ({
      pageInternalId: item.conversation.pageInternalId,
      conversationId: item.conversation.conversationId,
      status: item.assessment.priceGateStatus,
      reason: item.assessment.exclusionReason || "Không vượt qua cổng giá.",
    }));
  if (!excluded.length) return 0;
  const rows = await query<{ id: string }>(
    `UPDATE fanpage_ai_care_plans AS plan
     SET status = 'dismissed',
         metadata = plan.metadata || jsonb_build_object(
           'priceGateDismissal', true,
           'priceGateStatus', excluded.status,
           'priceGateReason', excluded.reason,
           'priceGateDismissedAt', NOW()::text
         ),
         updated_at = NOW()
     FROM jsonb_to_recordset($1::jsonb) AS excluded(
       page_internal_id text,
       conversation_id text,
       status text,
       reason text
     )
     WHERE plan.page_internal_id = excluded.page_internal_id
       AND plan.conversation_id = excluded.conversation_id
       AND plan.status IN ('pending', 'approved', 'in_progress')
     RETURNING plan.id`,
    [JSON.stringify(excluded.map(item => ({
      page_internal_id: item.pageInternalId,
      conversation_id: item.conversationId,
      status: item.status,
      reason: item.reason,
    })))],
  );
  return rows.length;
}

async function notifyNewPlans(runId: string, settings: FanpageCareSettings) {
  if (!settings.notifications.enabled) return 0;
  const rows = await query<DbRow>(
    `SELECT * FROM fanpage_ai_care_plans
     WHERE run_id = $1 AND notification_sent_at IS NULL AND status = 'pending'
       AND lead_score >= $2
     ORDER BY lead_score DESC`,
    [runId, settings.notifications.minimumScore],
  );
  const grouped = new Map<string, DbRow[]>();
  for (const row of rows) {
    const key = row.assigned_staff_id ? `crm:${String(row.assigned_staff_id)}` : "admin:admin";
    grouped.set(key, [...(grouped.get(key) || []), row]);
  }
  let pushSent = 0;
  for (const [key, plans] of grouped) {
    const [ownerScope, ownerId] = key.split(":") as ["crm" | "admin", string];
    const hotCount = plans.filter(plan => String(plan.lead_temperature) === "hot").length;
    const topPlanId = String(plans[0].id);
    const result = await sendPushNotification({
      ownerScope,
      ownerId,
      title: hotCount ? `🔥 ${hotCount} lead nóng cần chăm sóc` : "Kế hoạch chăm sóc Fanpage mới",
      body: `${plans.length} khách tiềm năng đã có kế hoạch hôm nay. Mở CRM để xem và xác nhận người phụ trách.`,
      url: `/crm/conversation-learning?tab=care-plans&plan=${encodeURIComponent(topPlanId)}`,
      tag: `fanpage-care-${vietnamDate()}-${ownerId}`,
      urgency: hotCount ? "high" : "normal",
      data: { type: "fanpage-care-plan", planId: topPlanId, count: plans.length, hotCount },
    });
    pushSent += result.sent;
    await query(
      `UPDATE fanpage_ai_care_plans
       SET notification_owner_scope = $1, notification_owner_id = $2,
           notification_sent_at = NOW(), notification_result = $3::jsonb, updated_at = NOW()
       WHERE id = ANY($4::text[])`,
      [ownerScope, ownerId, JSON.stringify(result), plans.map(plan => String(plan.id))],
    );
  }
  return pushSent;
}

export async function syncCarePlanNotificationsForActor(input: {
  ownerScope: "crm" | "admin";
  ownerId: string;
}) {
  await ensureFanpageCareCenterSchema();
  const { settings } = await getFanpageCareSettings();
  if (!settings.notifications.enabled) {
    return { matchedPlans: 0, matched: 0, sent: 0, removed: 0, failed: 0, errors: [] };
  }
  const rows = await query<DbRow>(
    `SELECT *
     FROM fanpage_ai_care_plans
     WHERE status IN ('pending', 'approved', 'in_progress')
       AND (
         ($1 = 'crm' AND assigned_staff_id = $2)
         OR ($1 = 'admin' AND assigned_staff_id IS NULL)
       )
       AND (
         notification_sent_at IS NULL
         OR COALESCE(NULLIF(notification_result->>'matched', '')::int, 0) = 0
       )
       AND lead_score >= $3
     ORDER BY lead_score DESC, due_at ASC
     LIMIT 30`,
    [input.ownerScope, input.ownerId, settings.notifications.minimumScore],
  );
  if (!rows.length) return { matchedPlans: 0, matched: 0, sent: 0, removed: 0, failed: 0, errors: [] };
  const hotCount = rows.filter(row => String(row.lead_temperature) === "hot").length;
  const topPlanId = String(rows[0].id);
  const result = await sendPushNotification({
    ownerScope: input.ownerScope,
    ownerId: input.ownerId,
    title: hotCount ? `🔥 ${hotCount} lead nóng cần chăm sóc` : "Kế hoạch chăm sóc Fanpage",
    body: `${rows.length} khách tiềm năng đang chờ xử lý. Mở CRM để xem kế hoạch chi tiết.`,
    url: `/crm/conversation-learning?tab=care-plans&plan=${encodeURIComponent(topPlanId)}`,
    tag: `fanpage-care-sync-${vietnamDate()}-${input.ownerId}`,
    urgency: hotCount ? "high" : "normal",
    data: { type: "fanpage-care-plan", planId: topPlanId, count: rows.length, hotCount },
  });
  await query(
    `UPDATE fanpage_ai_care_plans
     SET notification_owner_scope = $1, notification_owner_id = $2,
         notification_sent_at = NOW(), notification_result = $3::jsonb, updated_at = NOW()
     WHERE id = ANY($4::text[])`,
    [input.ownerScope, input.ownerId, JSON.stringify(result), rows.map(row => String(row.id))],
  );
  return { matchedPlans: rows.length, ...result };
}

export async function runDailyFanpageCareCenter(input: {
  force?: boolean;
  actorId?: string;
  runType?: "scheduled" | "manual";
} = {}) {
  await ensureFanpageCareCenterSchema();
  await initConversationLearningSchema();
  const { settings, version: settingsVersion } = await getFanpageCareSettings();
  const runType = input.runType || (input.force ? "manual" : "scheduled");
  const configuredHour = Math.max(0, Math.min(23, Number(process.env.FANPAGE_AI_DAILY_HOUR || DEFAULT_DAILY_HOUR)));
  if (!input.force && vietnamHour() < configuredHour) {
    return { skipped: "before-daily-hour", dailyHour: configuredHour, ranAt: new Date().toISOString() };
  }

  const client = await getDb().connect();
  let locked = false;
  let activeRunId: string | null = null;
  let retryFailedAi = false;
  try {
    const lock = await client.query<{ locked: boolean }>(`SELECT pg_try_advisory_lock($1) AS locked`, [DAILY_LOCK_ID]);
    locked = lock.rows[0]?.locked === true;
    if (!locked) return { skipped: "already-running", ranAt: new Date().toISOString() };

    if (!input.force) {
      const existingRuns = await query<{ id: string; ai_error: string | null }>(
        `SELECT id, NULLIF(COALESCE(details->>'aiError', details->>'geminiError'), '') AS ai_error
         FROM fanpage_ai_sync_runs
         WHERE run_date = $1 AND status IN ('success', 'partial')
         ORDER BY started_at DESC LIMIT 2`,
        [vietnamDate()],
      );
      if (existingRuns.length) {
        const latest = existingRuns[0];
        retryFailedAi = Boolean(latest.ai_error) && existingRuns.length < 2;
        if (!retryFailedAi) {
          return { skipped: "already-ran-today", runId: latest.id, ranAt: new Date().toISOString() };
        }
      }
    }

    await loadFacebookSchedulerFromDb();
    const pages = getPages().filter(page => page.isActive && page.pageId && page.pageAccessToken);
    const runId = `fpair_${randomUUID()}`;
    activeRunId = runId;
    await query(
      `INSERT INTO fanpage_ai_sync_runs
        (id, run_date, run_type, status, pages_total, details)
       VALUES ($1,$2,$3,'running',$4,$5::jsonb)`,
      [runId, vietnamDate(), runType, pages.length, JSON.stringify({ actorId: input.actorId || "system" })],
    );

    let pagesSynced = 0;
    let conversationsScanned = 0;
    let messagesSaved = 0;
    const pageErrors: Array<{ pageId: string; pageName: string; error: string }> = [];
    for (const page of pages) {
      try {
        const result = await syncOneFanpage(page);
        pagesSynced += 1;
        conversationsScanned += result.conversations;
        messagesSaved += result.messagesSaved;
      } catch (error) {
        pageErrors.push({
          pageId: page.id,
          pageName: page.pageName,
          error: error instanceof Error ? error.message : "Lỗi đồng bộ không xác định",
        });
      }
    }

    const conversations = await loadConversationsForAnalysis(
      Number(process.env.FANPAGE_AI_LOOKBACK_DAYS || DEFAULT_LOOKBACK_DAYS),
    );
    const conversationsWithNewMessages = conversations.filter(hasNewMessagesSinceAnalysis);
    const skippedUnchangedConversations = conversations.length - conversationsWithNewMessages.length;
    const allAssessed = conversationsWithNewMessages
      .map(conversation => ({ conversation, assessment: assessFanpageConversation(conversation, settings) }));
    const priceGateDismissedPlans = await dismissPlansExcludedByPriceGate(allAssessed);
    const assessed = allAssessed.filter(item => item.assessment.qualifies);
    const maxPlansPerRun = Math.max(10, Math.min(100, Number(process.env.FANPAGE_AI_MAX_PLANS_PER_RUN || 50)));
    const qualified = assessed.slice(0, maxPlansPerRun);
    const deferredQualified = assessed.slice(maxPlansPerRun);

    let generatedByAi = new Map<string, GeneratedCarePlan>();
    let aiProvider: FanpageCareAiProvider | undefined;
    let model: string | undefined;
    let aiError: string | undefined;
    try {
      const result = await generateAiPlans(qualified, settings);
      generatedByAi = result.plans;
      aiProvider = result.provider;
      model = result.plans.size ? result.model : undefined;
      if (result.errors.length) aiError = result.errors.join("; ").slice(0, 2000);
    } catch (error) {
      aiError = error instanceof Error ? error.message : "AI lỗi không xác định";
    }

    const plans: FanpageCarePlan[] = [];
    for (const item of qualified) {
      const aiPlan = generatedByAi.get(item.conversation.conversationId);
      if (retryFailedAi && !aiPlan) continue;
      plans.push(await upsertCarePlan({
        runId,
        conversation: item.conversation,
        assessment: item.assessment,
        generated: aiPlan || buildFallbackCarePlan(item.conversation, item.assessment),
        engine: aiPlan ? aiProvider || "rules" : "rules",
        model: aiPlan ? model : undefined,
      }));
    }
    const processedConversationKeys = new Set(qualified.map(item =>
      `${item.conversation.pageInternalId}:${item.conversation.conversationId}`,
    ));
    const conversationsCheckpointed = await markConversationsAnalyzed(
      allAssessed
        .filter(item => !item.assessment.qualifies || processedConversationKeys.has(
          `${item.conversation.pageInternalId}:${item.conversation.conversationId}`,
        ))
        .map(item => item.conversation),
    );
    const pushSent = await notifyNewPlans(runId, settings);
    const status: FanpageCareRun["status"] = pageErrors.length && pagesSynced === 0 ? "failed" : pageErrors.length ? "partial" : "success";
    const details = {
      actorId: input.actorId || "system",
      pageErrors,
      aiProvider,
      aiModelSelection: settings.ai.defaultModel,
      aiError,
      aiPlans: generatedByAi.size,
      rulesPlans: plans.length - generatedByAi.size,
      priceGateExcluded: allAssessed.filter(item => item.assessment.excludedFromCare).length,
      priceGateDismissedPlans,
      conversationsWithNewMessages: conversationsWithNewMessages.length,
      skippedUnchangedConversations,
      deferredQualifiedConversations: deferredQualified.length,
      conversationsCheckpointed,
      retryFailedAi,
      settingsVersion,
      safety: "AI only proposes; customer contact requires human approval",
    };
    const updated = await query<DbRow>(
      `UPDATE fanpage_ai_sync_runs SET
         status = $2, finished_at = NOW(), pages_synced = $3, conversations_scanned = $4,
         messages_saved = $5, leads_qualified = $6, plans_generated = $7, push_sent = $8,
         model = $9, error = $10, details = details || $11::jsonb
       WHERE id = $1 RETURNING *`,
      [
        runId,
        status,
        pagesSynced,
        conversationsScanned,
        messagesSaved,
        qualified.length,
        plans.length,
        pushSent,
        model || null,
        status === "failed" ? pageErrors.map(item => item.error).join("; ").slice(0, 2000) : null,
        JSON.stringify(details),
      ],
    );
    return { run: mapRun(updated[0]), plans };
  } catch (error) {
    if (activeRunId) {
      await query(
        `UPDATE fanpage_ai_sync_runs
         SET status = 'failed', finished_at = NOW(), error = $2
         WHERE id = $1`,
        [activeRunId, (error instanceof Error ? error.message : "Lỗi không xác định").slice(0, 2000)],
      ).catch(() => undefined);
    }
    throw error;
  } finally {
    if (locked) await client.query(`SELECT pg_advisory_unlock($1)`, [DAILY_LOCK_ID]).catch(() => undefined);
    client.release();
  }
}

export async function listFanpageCarePlans(input: {
  status?: FanpageCarePlanStatus;
  assignedStaffId?: string;
  pageInternalId?: string;
  limit?: number;
} = {}) {
  await ensureFanpageCareCenterSchema();
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (input.status) {
    params.push(input.status);
    conditions.push(`status = $${params.length}`);
  }
  if (input.assignedStaffId) {
    params.push(input.assignedStaffId);
    conditions.push(`assigned_staff_id = $${params.length}`);
  }
  if (input.pageInternalId) {
    params.push(input.pageInternalId);
    conditions.push(`page_internal_id = $${params.length}`);
  }
  params.push(Math.max(1, Math.min(500, input.limit || 150)));
  const rows = await query<DbRow>(
    `SELECT * FROM fanpage_ai_care_plans
     ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
     ORDER BY analysis_date DESC, lead_score DESC, due_at ASC
     LIMIT $${params.length}`,
    params,
  );
  return rows.map(mapPlan);
}

export async function listFanpageCareRuns(limit = 20) {
  await ensureFanpageCareCenterSchema();
  const rows = await query<DbRow>(
    `SELECT * FROM fanpage_ai_sync_runs ORDER BY started_at DESC LIMIT $1`,
    [Math.max(1, Math.min(100, limit))],
  );
  return rows.map(mapRun);
}

export async function listFanpageCareStaff(): Promise<FanpageCareStaffOption[]> {
  const staff = (await getAllStaff()).filter(item => item.status === "active");
  return Promise.all(staff.map(async item => ({
    id: item.id,
    fullName: item.fullName,
    role: item.role,
    pushSubscriptions: await countPushSubscriptions("crm", item.id),
  })));
}

export async function getFanpageCareOverview(): Promise<FanpageCareCenterOverview> {
  await ensureFanpageCareCenterSchema();
  await loadFacebookSchedulerFromDb();
  const today = vietnamDate();
  const [metrics, lastRunRows, pages] = await Promise.all([
    queryOne<{
      conversations_today: number;
      qualified_today: number;
      hot_today: number;
      pending: number;
      approved: number;
      completed: number;
      push_today: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM fanpage_conversation_snapshots WHERE last_synced_at::date = $1) AS conversations_today,
         COUNT(*) FILTER (WHERE analysis_date = $1)::int AS qualified_today,
         COUNT(*) FILTER (WHERE analysis_date = $1 AND lead_temperature = 'hot')::int AS hot_today,
         COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
         COUNT(*) FILTER (WHERE status IN ('approved','in_progress'))::int AS approved,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE analysis_date = $1 AND notification_sent_at IS NOT NULL)::int AS push_today
       FROM fanpage_ai_care_plans`,
      [today],
    ),
    query<DbRow>(`SELECT * FROM fanpage_ai_sync_runs ORDER BY started_at DESC LIMIT 1`),
    query<{
      page_internal_id: string;
      page_name: string;
      conversation_count: number;
      qualified_leads: number;
      hot_leads: number;
      pending_plans: number;
      last_synced_at: string | null;
    }>(
      `SELECT s.page_internal_id, MAX(s.page_name) AS page_name,
              COUNT(DISTINCT s.conversation_id)::int AS conversation_count,
              COUNT(DISTINCT p.id) FILTER (WHERE p.analysis_date = $1)::int AS qualified_leads,
              COUNT(DISTINCT p.id) FILTER (WHERE p.analysis_date = $1 AND p.lead_temperature = 'hot')::int AS hot_leads,
              COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'pending')::int AS pending_plans,
              MAX(s.last_synced_at)::text AS last_synced_at
       FROM fanpage_conversation_snapshots s
       LEFT JOIN fanpage_ai_care_plans p
         ON p.page_internal_id = s.page_internal_id AND p.conversation_id = s.conversation_id
       GROUP BY s.page_internal_id
       ORDER BY MAX(s.page_name)`,
      [today],
    ),
  ]);
  const activePages = getPages().filter(page => page.isActive).length;
  return {
    totalPages: Math.max(activePages, pages.length),
    conversationsToday: Number(metrics?.conversations_today || 0),
    qualifiedLeadsToday: Number(metrics?.qualified_today || 0),
    hotLeadsToday: Number(metrics?.hot_today || 0),
    pendingPlans: Number(metrics?.pending || 0),
    approvedPlans: Number(metrics?.approved || 0),
    completedPlans: Number(metrics?.completed || 0),
    pushSentToday: Number(metrics?.push_today || 0),
    lastRun: lastRunRows[0] ? mapRun(lastRunRows[0]) : undefined,
    pages: pages.map(page => ({
      pageInternalId: page.page_internal_id,
      pageName: page.page_name,
      conversationCount: Number(page.conversation_count || 0),
      qualifiedLeads: Number(page.qualified_leads || 0),
      hotLeads: Number(page.hot_leads || 0),
      pendingPlans: Number(page.pending_plans || 0),
      lastSyncedAt: safeDate(page.last_synced_at),
    })),
  };
}

export async function updateFanpageCarePlan(input: {
  id: string;
  status?: FanpageCarePlanStatus;
  assignedStaffId?: string | null;
  actorId: string;
}) {
  await ensureFanpageCareCenterSchema();
  const existing = await queryOne<DbRow>(`SELECT * FROM fanpage_ai_care_plans WHERE id = $1`, [input.id]);
  if (!existing) return null;
  let assignedStaffName: string | null | undefined;
  if (input.assignedStaffId !== undefined) {
    assignedStaffName = input.assignedStaffId ? (await getStaffById(input.assignedStaffId))?.fullName || null : null;
  }
  const rows = await query<DbRow>(
    `UPDATE fanpage_ai_care_plans SET
       status = COALESCE($2, status),
       assigned_staff_id = CASE WHEN $3::boolean THEN $4 ELSE assigned_staff_id END,
       assigned_staff_name = CASE WHEN $3::boolean THEN $5 ELSE assigned_staff_name END,
       reviewed_by = CASE WHEN $2 IS NOT NULL THEN $6 ELSE reviewed_by END,
       reviewed_at = CASE WHEN $2 IS NOT NULL THEN NOW() ELSE reviewed_at END,
       completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END,
       notification_sent_at = CASE
         WHEN $3::boolean AND $4 IS DISTINCT FROM assigned_staff_id THEN NULL
         ELSE notification_sent_at
       END,
       updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      input.id,
      input.status || null,
      input.assignedStaffId !== undefined,
      input.assignedStaffId || null,
      assignedStaffName ?? null,
      input.actorId,
    ],
  );
  const plan = mapPlan(rows[0]);
  if (
    input.assignedStaffId &&
    input.assignedStaffId !== (existing.assigned_staff_id ? String(existing.assigned_staff_id) : undefined)
  ) {
    const result = await sendPushNotification({
      ownerScope: "crm",
      ownerId: input.assignedStaffId,
      title: plan.leadTemperature === "hot" ? "🔥 Bạn được giao một lead nóng" : "Bạn có kế hoạch chăm sóc mới",
      body: `${plan.pageName}: mở CRM để xem kế hoạch và lịch chăm sóc khách.`,
      url: `/crm/conversation-learning?tab=care-plans&plan=${encodeURIComponent(plan.id)}`,
      tag: `fanpage-care-assignment-${plan.id}`,
      urgency: plan.leadTemperature === "hot" ? "high" : "normal",
      data: { type: "fanpage-care-assignment", planId: plan.id },
    });
    await query(
      `UPDATE fanpage_ai_care_plans SET
         notification_owner_scope = 'crm', notification_owner_id = $2,
         notification_sent_at = NOW(), notification_result = $3::jsonb, updated_at = NOW()
       WHERE id = $1`,
      [plan.id, input.assignedStaffId, JSON.stringify(result)],
    );
    return { ...plan, notificationOwnerScope: "crm", notificationOwnerId: input.assignedStaffId, notificationResult: result };
  }
  return plan;
}
