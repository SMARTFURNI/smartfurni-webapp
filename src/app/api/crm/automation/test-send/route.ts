import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { query, queryOne } from "@/lib/db";
import { createActivity, getLead, getLeads } from "@/lib/crm-store";
import { isDoNotContactLead } from "@/lib/crm-automation-test";
import {
  sendAutomationTemplateToLead,
} from "@/lib/crm-b2b-sofa-journey-engine";
import type { JourneyChannel } from "@/lib/crm-b2b-sofa-journey";

export const dynamic = "force-dynamic";

const CHANNELS = new Set<JourneyChannel>(["zalo_personal", "zalo_oa", "email"]);
const REQUEST_ID_PATTERN = /^[a-zA-Z0-9_-]{12,100}$/;

async function requireAdmin() {
  if (!(await getAdminSession())) throw new Error("UNAUTHORIZED");
}

async function initTestSendSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_automation_test_sends (
      request_id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      lead_name TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'processing',
      recipient TEXT,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);
}

function hasRequiredContact(channel: JourneyChannel, lead: Awaited<ReturnType<typeof getLead>>): boolean {
  if (!lead) return false;
  if (channel === "email") return /^\S+@\S+\.\S+$/.test(lead.email?.trim() || "");
  return Boolean(lead.zaloId || lead.zaloPhone || lead.phone);
}

function publicLead(lead: NonNullable<Awaited<ReturnType<typeof getLead>>>, channel?: JourneyChannel) {
  return {
    id: lead.id,
    name: lead.name,
    company: lead.company,
    phone: lead.zaloPhone || lead.phone,
    email: lead.email,
    stage: lead.stage,
    assignedTo: lead.assignedTo,
    blocked: isDoNotContactLead(lead),
    canSend: channel ? hasRequiredContact(channel, lead) && !isDoNotContactLead(lead) : true,
  };
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim().slice(0, 100);
    const rawChannel = searchParams.get("channel") || "";
    const channel = CHANNELS.has(rawChannel as JourneyChannel)
      ? rawChannel as JourneyChannel
      : undefined;
    const leads = await getLeads({ search: search || undefined });
    return NextResponse.json({
      leads: leads.slice(0, 20).map(lead => publicLead(lead, channel)),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Không tải được danh sách khách hàng CRM." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let requestId = "";
  try {
    await requireAdmin();
    const body = await req.json() as {
      requestId?: string;
      confirmed?: boolean;
      leadId?: string;
      channel?: JourneyChannel;
      subject?: string;
      body?: string;
      mediaAssetIds?: string[];
      emailFromName?: string;
      requiredVariables?: string[];
      journeyCode?: string;
    };

    requestId = String(body.requestId || "");
    const leadId = String(body.leadId || "");
    const channel = body.channel;
    const subject = String(body.subject || "");
    const messageBody = String(body.body || "");
    const emailFromName = String(body.emailFromName || "SmartFurni B2B").slice(0, 120);
    const mediaAssetIds = [...new Set(Array.isArray(body.mediaAssetIds)
      ? body.mediaAssetIds.map(String).filter(Boolean)
      : [])].slice(0, 10);
    const requiredVariables = [...new Set(Array.isArray(body.requiredVariables)
      ? body.requiredVariables.map(String).filter(value => /^[a-zA-Z0-9_]+$/.test(value))
      : [])].slice(0, 20);

    if (body.confirmed !== true) {
      return NextResponse.json({ error: "Bạn chưa xác nhận gửi thật tới khách hàng." }, { status: 400 });
    }
    if (!REQUEST_ID_PATTERN.test(requestId) || !leadId || !channel || !CHANNELS.has(channel)) {
      return NextResponse.json({ error: "Yêu cầu gửi test không hợp lệ." }, { status: 400 });
    }
    if (!messageBody.trim() || messageBody.length > 20_000 || subject.length > 500) {
      return NextResponse.json({ error: "Nội dung gửi test không hợp lệ hoặc vượt giới hạn." }, { status: 400 });
    }

    const lead = await getLead(leadId);
    if (!lead) return NextResponse.json({ error: "Không tìm thấy khách hàng CRM." }, { status: 404 });
    if (isDoNotContactLead(lead)) {
      return NextResponse.json({ error: "Khách hàng có nhãn không liên hệ; hệ thống đã chặn gửi thật." }, { status: 409 });
    }
    if (!hasRequiredContact(channel, lead)) {
      const missing = channel === "email" ? "email hợp lệ" : "số điện thoại/Zalo";
      return NextResponse.json({ error: `Khách hàng chưa có ${missing}.` }, { status: 422 });
    }

    await initTestSendSchema();
    const claimed = await queryOne<{ request_id: string }>(
      `INSERT INTO crm_automation_test_sends
        (request_id, lead_id, lead_name, channel, status)
       VALUES ($1, $2, $3, $4, 'processing')
       ON CONFLICT (request_id) DO NOTHING
       RETURNING request_id`,
      [requestId, lead.id, lead.name, channel],
    );
    if (!claimed) {
      return NextResponse.json({ error: "Yêu cầu này đã được xử lý; hệ thống không gửi lặp." }, { status: 409 });
    }

    const result = await sendAutomationTemplateToLead({
      lead,
      channel,
      subject,
      body: messageBody,
      mediaAssetIds,
      emailFromName,
      requiredVariables,
      journeyCode: String(body.journeyCode || ""),
    });
    const status = result.outcome === "sent" ? "sent" : result.outcome;
    await query(
      `UPDATE crm_automation_test_sends
       SET status=$2, recipient=$3, error=$4, completed_at=NOW()
       WHERE request_id=$1`,
      [requestId, status, result.recipient, result.error || null],
    );

    if (result.outcome === "sent") {
      await createActivity({
        leadId: lead.id,
        type: channel === "email" ? "email" : "note",
        title: `[Test thật] Đã gửi qua ${channel === "email" ? "Email" : channel === "zalo_oa" ? "Zalo OA" : "Zalo cá nhân"}`,
        content: (channel === "email" ? result.renderedSubject : result.renderedBody).slice(0, 2_000),
        createdBy: "CRM Automation",
        scheduledAt: undefined,
        attachments: [],
      }).catch(() => undefined);
      return NextResponse.json({
        ok: true,
        outcome: result.outcome,
        recipient: result.recipient,
        providerMessageId: result.providerMessageId,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        outcome: result.outcome,
        recipient: result.recipient,
        error: result.error || "Không gửi được tin test.",
        doNotRetry: result.outcome === "delivery_unknown",
      },
      { status: result.outcome === "delivery_unknown" ? 202 : 422 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Không gửi được tin test.";
    if (requestId && REQUEST_ID_PATTERN.test(requestId)) {
      await query(
        `UPDATE crm_automation_test_sends
         SET status='failed', error=$2, completed_at=NOW()
         WHERE request_id=$1`,
        [requestId, message],
      ).catch(() => undefined);
    }
    const status = message.startsWith("Thiếu dữ liệu CRM để thay biến:") ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
