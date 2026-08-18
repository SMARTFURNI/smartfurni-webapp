import "server-only";

import { query } from "@/lib/db";
import type { Lead } from "@/lib/crm-types";
import {
  buildJourneyContext,
  journeyDefinitionWithOverrides,
  missingRequiredContext,
  renderJourneyTemplate,
} from "@/lib/crm-b2b-sofa-journey";
import {
  B2C_ERGONOMIC_BED_JOURNEY_CODE,
  b2cErgonomicJourneyDefinitionWithOverrides,
  buildB2CErgonomicJourneyContext,
} from "@/lib/crm-b2c-ergonomic-bed-journey";
import {
  getB2BSofaJourneySettings,
  initB2BSofaJourneySchema,
} from "@/lib/crm-b2b-sofa-journey-store";
import { getB2CErgonomicBedJourneySettings } from "@/lib/crm-b2c-ergonomic-bed-journey-store";
import { initAutomationExecutionSchema } from "@/lib/crm-automation-execution-store";
import type {
  UpcomingAutomationChannel,
  UpcomingAutomationDailyRow,
  UpcomingAutomationFilters,
  UpcomingAutomationItem,
  UpcomingAutomationOption,
  UpcomingAutomationReadiness,
  UpcomingAutomationReport,
  UpcomingAutomationSummary,
} from "@/lib/crm-upcoming-automation-types";

const TIMEZONE = "Asia/Ho_Chi_Minh";
const MAX_RANGE_DAYS = 366;

const CHANNEL_OPTIONS: UpcomingAutomationOption[] = [
  { value: "zalo_personal", label: "Zalo cá nhân" },
  { value: "zalo_oa", label: "Zalo OA" },
  { value: "email", label: "Email" },
];

const READINESS_OPTIONS: UpcomingAutomationOption[] = [
  { value: "ready", label: "Sẵn sàng" },
  { value: "deferred", label: "Đã dời lịch" },
  { value: "retrying", label: "Đang thử lại" },
  { value: "processing", label: "Đang xử lý" },
  { value: "waiting_content", label: "Thiếu nội dung" },
  { value: "paused", label: "Workflow tạm dừng" },
  { value: "missing_recipient", label: "Thiếu người nhận" },
];

type JourneyRow = {
  id: string;
  lead_id: string;
  step_id: string;
  day_offset: number;
  scheduled_at: string;
  next_attempt_at: string | null;
  status: string;
  primary_channel: string;
  fallback_channels: unknown;
  attempts: unknown;
  error: string;
  updated_at: string;
  journey_code: string;
  enrollment_status: string;
  enrollment_context: unknown;
  lead_data: unknown;
};

type QueueRow = {
  id: string;
  rule_id: string;
  rule_name: string;
  lead_id: string;
  lead_name: string;
  recipient: string;
  subject?: string;
  body?: string;
  message?: string;
  media_asset_ids: unknown;
  scheduled_at: string;
  status: string;
  attempts: number;
  last_error: string | null;
  updated_at: string;
  lead_data: unknown;
};

function dateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00+07:00`);
  return Number.isFinite(parsed.getTime()) && dateKey(parsed) === value;
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T12:00:00+07:00`).getTime() - new Date(`${from}T12:00:00+07:00`).getTime()) / 86_400_000,
  );
}

export function normalizeUpcomingAutomationFilters(
  input: Partial<UpcomingAutomationFilters> = {},
  now = new Date(),
): UpcomingAutomationFilters {
  const today = dateKey(now);
  let from = isDateKey(input.from || "") ? String(input.from) : today;
  let to = isDateKey(input.to || "") ? String(input.to) : from;
  if (to < from) [from, to] = [to, from];
  if (daysBetween(from, to) > MAX_RANGE_DAYS) to = addDays(from, MAX_RANGE_DAYS);
  return {
    from,
    to,
    journeyCode: String(input.journeyCode || "").trim(),
    channel: String(input.channel || "").trim(),
    readiness: String(input.readiness || "").trim(),
    source: String(input.source || "").trim(),
    assignedTo: String(input.assignedTo || "").trim(),
    search: String(input.search || "").trim().slice(0, 200),
  };
}

function jsonRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function stringRecord(value: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries(jsonRecord(value)).map(([key, item]) => [key, item == null ? "" : String(item)]),
  );
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toIso(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : "";
}

function channel(value: string): UpcomingAutomationChannel {
  return value === "email" || value === "zalo_oa" ? value : "zalo_personal";
}

function recipientFor(lead: Lead, selectedChannel: UpcomingAutomationChannel): string {
  if (selectedChannel === "email") return lead.email || "";
  if (selectedChannel === "zalo_oa") return lead.zaloId || lead.zaloPhone || lead.phone || "";
  return lead.zaloPhone || lead.phone || "";
}

function classifyJourney(input: {
  status: string;
  enrollmentStatus: string;
  recipient: string;
  missing: string[];
  scheduledAt: string;
  nextAttemptAt: string | null;
  error: string;
}): { readiness: UpcomingAutomationReadiness; reason: string } {
  if (input.enrollmentStatus === "paused") return { readiness: "paused", reason: "Workflow của khách hàng đang tạm dừng." };
  if (!input.recipient) return { readiness: "missing_recipient", reason: "Chưa có thông tin người nhận cho kênh chính." };
  if (input.status === "waiting_content" || input.missing.length) {
    const detail = input.missing.length ? `Thiếu dữ liệu: ${input.missing.join(", ")}.` : input.error;
    return { readiness: "waiting_content", reason: detail || "Nội dung chưa đủ điều kiện để gửi." };
  }
  if (input.status === "sending") return { readiness: "processing", reason: "Worker đang xử lý lượt gửi này." };
  if (input.nextAttemptAt && new Date(input.nextAttemptAt).getTime() > new Date(input.scheduledAt).getTime()) {
    return { readiness: "deferred", reason: input.error || "Lịch gửi đã được dời sang lần thử tiếp theo." };
  }
  return { readiness: "ready", reason: "Đủ người nhận, nội dung và đang chờ đến lịch gửi." };
}

function classifyQueue(row: QueueRow): { readiness: UpcomingAutomationReadiness; reason: string } {
  if (!row.recipient) return { readiness: "missing_recipient", reason: "Hàng đợi chưa có người nhận." };
  if (row.status === "processing") return { readiness: "processing", reason: "Worker đang xử lý lượt gửi này." };
  if (Number(row.attempts) > 0 || row.last_error) {
    return { readiness: "retrying", reason: row.last_error || `Đang thử lại lần ${row.attempts + 1}.` };
  }
  return { readiness: "ready", reason: "Nội dung đã vào hàng đợi và đang chờ đến lịch gửi." };
}

function baseLead(value: unknown, fallback: { id: string; name: string }): Lead {
  const raw = jsonRecord(value);
  return {
    ...(raw as Partial<Lead>),
    id: String(raw.id || fallback.id),
    name: String(raw.name || fallback.name || "Khách hàng"),
    company: String(raw.company || ""),
    phone: String(raw.phone || ""),
    zaloPhone: String(raw.zaloPhone || ""),
    zaloId: String(raw.zaloId || ""),
    email: String(raw.email || ""),
    type: (raw.type || "retail") as Lead["type"],
    stage: (raw.stage || "new") as Lead["stage"],
    district: String(raw.district || ""),
    expectedValue: Number(raw.expectedValue || 0),
    source: String(raw.source || ""),
    assignedTo: String(raw.assignedTo || ""),
    notes: String(raw.notes || ""),
    lastContactAt: String(raw.lastContactAt || ""),
    createdAt: String(raw.createdAt || ""),
    updatedAt: String(raw.updatedAt || ""),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    projectName: String(raw.projectName || ""),
    projectAddress: String(raw.projectAddress || ""),
    unitCount: Number(raw.unitCount || 0),
  } as Lead;
}

export function summarizeUpcomingAutomationItems(items: UpcomingAutomationItem[]): UpcomingAutomationSummary {
  const channels: Record<UpcomingAutomationChannel, number> = { zalo_personal: 0, zalo_oa: 0, email: 0 };
  let ready = 0;
  for (const item of items) {
    channels[item.channel] += 1;
    if (item.readiness === "ready") ready += 1;
  }
  return {
    total: items.length,
    uniqueLeads: new Set(items.map(item => item.leadId).filter(Boolean)).size,
    ready,
    attention: items.length - ready,
    channels,
  };
}

function dailyRows(items: UpcomingAutomationItem[], from: string, to: string): UpcomingAutomationDailyRow[] {
  const rows = new Map<string, UpcomingAutomationDailyRow>();
  for (let current = from; current <= to; current = addDays(current, 1)) {
    rows.set(current, {
      date: current,
      total: 0,
      ready: 0,
      attention: 0,
      channels: { zalo_personal: 0, zalo_oa: 0, email: 0 },
    });
  }
  for (const item of items) {
    const key = dateKey(new Date(item.effectiveSendAt));
    const row = rows.get(key);
    if (!row) continue;
    row.total += 1;
    row.channels[item.channel] += 1;
    if (item.readiness === "ready") row.ready += 1;
    else row.attention += 1;
  }
  return [...rows.values()];
}

function distinctOptions(items: UpcomingAutomationItem[], key: "journey" | "source" | "assignee"): UpcomingAutomationOption[] {
  const entries = new Map<string, string>();
  for (const item of items) {
    const value = key === "journey" ? item.journeyCode : key === "source" ? item.leadSource : item.assignedTo;
    const label = key === "journey" ? item.journeyName : value;
    if (value) entries.set(value, label || value);
  }
  return [...entries.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));
}

function matchesFilters(item: UpcomingAutomationItem, filters: UpcomingAutomationFilters): boolean {
  if (filters.journeyCode && item.journeyCode !== filters.journeyCode) return false;
  if (filters.channel && item.channel !== filters.channel) return false;
  if (filters.readiness && item.readiness !== filters.readiness) return false;
  if (filters.source && item.leadSource !== filters.source) return false;
  if (filters.assignedTo && item.assignedTo !== filters.assignedTo) return false;
  if (filters.search) {
    const haystack = [
      item.leadName, item.company, item.recipient, item.journeyName, item.stepTitle,
      item.subject, item.message, item.assignedTo, item.leadSource,
    ].join(" ").toLocaleLowerCase("vi");
    if (!haystack.includes(filters.search.toLocaleLowerCase("vi"))) return false;
  }
  return true;
}

export async function getUpcomingAutomationReport(
  input: Partial<UpcomingAutomationFilters> = {},
): Promise<UpcomingAutomationReport> {
  const filters = normalizeUpcomingAutomationFilters(input);
  const fromIso = new Date(`${filters.from}T00:00:00+07:00`).toISOString();
  const untilIso = new Date(`${addDays(filters.to, 1)}T00:00:00+07:00`).toISOString();

  await Promise.all([initB2BSofaJourneySchema(), initAutomationExecutionSchema()]);
  const [journeyRows, emailRows, zaloRows, b2bSettings, b2cSettings] = await Promise.all([
    query<JourneyRow>(
      `SELECT a.id,a.lead_id,a.step_id,a.day_offset,a.scheduled_at,a.next_attempt_at,
              a.status,a.primary_channel,a.fallback_channels,a.attempts,a.error,a.updated_at,
              e.journey_code,e.status AS enrollment_status,e.context AS enrollment_context,
              l.data AS lead_data
       FROM crm_journey_actions a
       JOIN crm_journey_enrollments e ON e.id=a.enrollment_id
       LEFT JOIN crm_leads l ON l.id=a.lead_id
       WHERE a.status IN ('pending','waiting_content','sending')
         AND e.status IN ('active','paused')
         AND COALESCE(a.next_attempt_at,a.scheduled_at)>=$1
         AND COALESCE(a.next_attempt_at,a.scheduled_at)<$2
       ORDER BY COALESCE(a.next_attempt_at,a.scheduled_at),a.day_offset
       LIMIT 5000`,
      [fromIso, untilIso],
    ),
    query<QueueRow>(
      `SELECT q.*,l.data AS lead_data FROM crm_automation_email_queue q
       LEFT JOIN crm_leads l ON l.id=q.lead_id
       WHERE q.status IN ('pending','processing') AND q.scheduled_at>=$1 AND q.scheduled_at<$2
       ORDER BY q.scheduled_at LIMIT 5000`,
      [fromIso, untilIso],
    ),
    query<QueueRow>(
      `SELECT q.*,l.data AS lead_data FROM crm_automation_zalo_queue q
       LEFT JOIN crm_leads l ON l.id=q.lead_id
       WHERE q.status IN ('pending','processing') AND q.scheduled_at>=$1 AND q.scheduled_at<$2
       ORDER BY q.scheduled_at LIMIT 5000`,
      [fromIso, untilIso],
    ),
    getB2BSofaJourneySettings(),
    getB2CErgonomicBedJourneySettings(),
  ]);

  const b2bDefinition = journeyDefinitionWithOverrides(b2bSettings);
  const b2cDefinition = b2cErgonomicJourneyDefinitionWithOverrides(b2cSettings);
  const journeyItems: UpcomingAutomationItem[] = journeyRows.map(row => {
    const lead = baseLead(row.lead_data, { id: row.lead_id, name: "Khách hàng" });
    const isB2c = row.journey_code === B2C_ERGONOMIC_BED_JOURNEY_CODE;
    const definition = isB2c ? b2cDefinition : b2bDefinition;
    const step = definition.steps.find(item => item.id === row.step_id);
    const extra = stringRecord(row.enrollment_context);
    const context = isB2c
      ? buildB2CErgonomicJourneyContext(lead, b2cSettings, extra)
      : buildJourneyContext(lead, b2bSettings, extra);
    const selectedChannel = channel(row.primary_channel);
    const recipient = recipientFor(lead, selectedChannel);
    const missing = step ? missingRequiredContext(step, context) : ["step_definition"];
    const scheduledAt = toIso(row.scheduled_at);
    const nextAttemptAt = row.next_attempt_at ? toIso(row.next_attempt_at) : null;
    const state = classifyJourney({
      status: row.status,
      enrollmentStatus: row.enrollment_status,
      recipient,
      missing,
      scheduledAt,
      nextAttemptAt,
      error: row.error,
    });
    return {
      id: `journey:${row.id}`,
      origin: "journey",
      leadId: lead.id || row.lead_id,
      leadName: lead.name || "Khách hàng",
      company: lead.company || "",
      recipient,
      leadSource: lead.source || "",
      assignedTo: lead.assignedTo || "",
      effectiveSendAt: nextAttemptAt || scheduledAt,
      scheduledAt,
      nextAttemptAt,
      channel: selectedChannel,
      fallbackChannels: stringArray(row.fallback_channels).map(channel),
      journeyCode: row.journey_code,
      journeyName: definition.name || row.journey_code,
      stepId: row.step_id,
      stepTitle: step?.title || row.step_id,
      dayOffset: Number(row.day_offset),
      subject: step ? renderJourneyTemplate(step.emailSubject, context) : "",
      message: step ? renderJourneyTemplate(selectedChannel === "email" ? step.emailBody : step.zaloBody, context) : "",
      rawStatus: row.status,
      readiness: state.readiness,
      readinessReason: state.reason,
      attempts: stringArray(row.attempts).length,
      mediaCount: step?.mediaAssetIds?.length || 0,
      updatedAt: toIso(row.updated_at),
    };
  });

  const queueItems = (rows: QueueRow[], selectedChannel: UpcomingAutomationChannel, origin: "email_queue" | "zalo_queue") =>
    rows.map<UpcomingAutomationItem>(row => {
      const lead = baseLead(row.lead_data, { id: row.lead_id, name: row.lead_name });
      const state = classifyQueue(row);
      return {
        id: `${origin}:${row.id}`,
        origin,
        leadId: row.lead_id,
        leadName: row.lead_name || lead.name || "Khách hàng",
        company: lead.company || "",
        recipient: row.recipient || "",
        leadSource: lead.source || "",
        assignedTo: lead.assignedTo || "",
        effectiveSendAt: toIso(row.scheduled_at),
        scheduledAt: toIso(row.scheduled_at),
        nextAttemptAt: null,
        channel: selectedChannel,
        fallbackChannels: [],
        journeyCode: `RULE:${row.rule_id}`,
        journeyName: row.rule_name || "Quy tắc tự động",
        stepId: row.rule_id,
        stepTitle: selectedChannel === "email" ? "Email tự động" : "Zalo cá nhân tự động",
        dayOffset: null,
        subject: row.subject || "",
        message: row.body || row.message || "",
        rawStatus: row.status,
        readiness: state.readiness,
        readinessReason: state.reason,
        attempts: Number(row.attempts || 0),
        mediaCount: stringArray(row.media_asset_ids).length,
        updatedAt: toIso(row.updated_at),
      };
    });

  const allItems = [
    ...journeyItems,
    ...queueItems(emailRows, "email", "email_queue"),
    ...queueItems(zaloRows, "zalo_personal", "zalo_queue"),
  ].sort((a, b) => a.effectiveSendAt.localeCompare(b.effectiveSendAt));
  const items = allItems.filter(item => matchesFilters(item, filters));
  const lastUpdatedAt = allItems.reduce<string | null>(
    (latest, item) => !latest || item.updatedAt > latest ? item.updatedAt : latest,
    null,
  );

  return {
    generatedAt: new Date().toISOString(),
    filters,
    summary: summarizeUpcomingAutomationItems(items),
    daily: dailyRows(items, filters.from, filters.to),
    items,
    options: {
      workflows: distinctOptions(allItems, "journey"),
      sources: distinctOptions(allItems, "source"),
      assignees: distinctOptions(allItems, "assignee"),
      channels: CHANNEL_OPTIONS,
      readiness: READINESS_OPTIONS,
    },
    dataFreshness: {
      lastUpdatedAt,
      note: `Lịch được tổng hợp theo giờ Việt Nam từ workflow hành trình, hàng đợi Email và Zalo. Tối đa ${MAX_RANGE_DAYS} ngày mỗi lần xem.`,
    },
  };
}
