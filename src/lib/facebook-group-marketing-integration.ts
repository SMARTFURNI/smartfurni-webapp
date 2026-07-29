import "server-only";

import { randomUUID } from "crypto";
import { query, queryOne } from "./db";
import {
  linkFacebookGroupLead,
  resolveFacebookGroupSourceCode,
} from "./facebook-group-marketing-store";

const systemActor = { id: "system:facebook-messenger", name: "Facebook Messenger" };

export interface FacebookMessengerSourceInput {
  pageFacebookId: string;
  conversationId: string;
  messageId: string;
  participantId?: string;
  participantName?: string;
  message: string;
  createdAt?: string;
}

type MessengerEventResult = {
  matched: boolean;
  sourceCode: string | null;
  status: string;
  leadId?: string | null;
  attributionId?: string | null;
  groupName?: string | null;
  campaignName?: string | null;
};

export async function captureFacebookGroupMessengerSource(
  input: FacebookMessengerSourceInput,
): Promise<MessengerEventResult> {
  const resolved = await resolveFacebookGroupSourceCode(input.message);
  if (!resolved.sourceCode) return { matched: false, sourceCode: null, status: "no_source_code" };

  const existing = await queryOne<{
    status: string;
    source_code: string;
    lead_id: string | null;
    attribution_id: string | null;
    data: Record<string, unknown> | string;
  }>(
    `SELECT status, source_code, lead_id, attribution_id, data
     FROM facebook_group_messenger_events
     WHERE message_id = $1`,
    [input.messageId],
  );
  if (existing) {
    const data = typeof existing.data === "string" ? JSON.parse(existing.data) : existing.data;
    return {
      matched: existing.status === "linked",
      sourceCode: existing.source_code,
      status: existing.status,
      leadId: existing.lead_id,
      attributionId: existing.attribution_id,
      groupName: String(data.groupName || "") || null,
      campaignName: String(data.campaignName || "") || null,
    };
  }

  const eventId = `fbgme_${randomUUID()}`;
  const reserved = await queryOne<{ id: string }>(
    `INSERT INTO facebook_group_messenger_events
     (id,message_id,conversation_id,participant_id,participant_name,page_facebook_id,
      message_text,source_code,status,message_created_at,data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'processing',$9,$10::jsonb)
     ON CONFLICT (message_id) DO NOTHING
     RETURNING id`,
    [eventId, input.messageId, input.conversationId, input.participantId || null,
      input.participantName || null, input.pageFacebookId, input.message,
      resolved.sourceCode, input.createdAt || null, JSON.stringify({})],
  );
  if (!reserved) return captureFacebookGroupMessengerSource(input);

  const attribution = resolved.attribution as Record<string, unknown> | null;
  if (!resolved.matched || !attribution) {
    await query(
      `UPDATE facebook_group_messenger_events
       SET status = 'source_not_found', error = $1, updated_at = NOW()
       WHERE id = $2`,
      ["Mã nguồn chưa gắn với bài đăng hợp lệ.", eventId],
    );
    return { matched: false, sourceCode: resolved.sourceCode, status: "source_not_found" };
  }

  const configuredPageId = String(attribution.facebookPageId || "");
  if (!configuredPageId || configuredPageId !== input.pageFacebookId) {
    await query(
      `UPDATE facebook_group_messenger_events
       SET status = 'page_mismatch', error = $1,
           data = $2::jsonb, updated_at = NOW()
       WHERE id = $3`,
      ["Mã nguồn không thuộc Fanpage nhận tin nhắn.",
        JSON.stringify({
          expectedPageFacebookId: configuredPageId,
          groupName: attribution.groupName || null,
          campaignName: attribution.campaignName || null,
        }), eventId],
    );
    return {
      matched: false,
      sourceCode: resolved.sourceCode,
      status: "page_mismatch",
      groupName: String(attribution.groupName || "") || null,
      campaignName: String(attribution.campaignName || "") || null,
    };
  }

  try {
    const participantKey = input.participantId || `conversation:${input.conversationId}`;
    let lead = await queryOne<{ id: string; data: Record<string, unknown> | string }>(
      `SELECT id, data FROM crm_leads
       WHERE data->'facebookMessenger'->>'psid' = $1
          OR data->'facebookMessenger'->>'conversationId' = $2
       ORDER BY updated_at DESC
       LIMIT 1`,
      [participantKey, input.conversationId],
    );

    if (!lead) {
      const crm = await import("./crm-store");
      const now = input.createdAt || new Date().toISOString();
      const created = await crm.createLead({
        name: input.participantName?.trim() || `Khách Facebook ${participantKey.slice(-6)}`,
        company: "",
        phone: "",
        email: "",
        type: "dealer",
        stage: "new",
        district: "",
        expectedValue: 0,
        source: "Facebook Group",
        assignedTo: String(attribution.postingEmployeeName || ""),
        notes: `Tin nhắn Facebook đầu tiên có mã nguồn ${resolved.sourceCode}.`,
        lastContactAt: now,
        tags: ["Facebook Group", resolved.sourceCode],
        projectName: "",
        projectAddress: "",
        unitCount: 0,
      });
      lead = { id: created.id, data: created as unknown as Record<string, unknown> };
      await crm.createActivity({
        leadId: created.id,
        type: "note",
        title: "Nhận khách từ Facebook Group",
        content: `${String(attribution.groupName || "Facebook Group")} • ${resolved.sourceCode}`,
        createdBy: "Facebook Messenger",
        attachments: [],
      });
      await crm.createTask({
        leadId: created.id,
        leadName: created.name,
        title: `Tư vấn khách từ ${String(attribution.groupName || "Facebook Group")}`,
        dueDate: new Date().toISOString().slice(0, 10),
        priority: "high",
        done: false,
        assignedTo: created.assignedTo,
      });
    }

    const leadData = typeof lead.data === "string" ? JSON.parse(lead.data) : lead.data;
    await query(
      `UPDATE crm_leads
       SET data = $1::jsonb, last_contact_at = $2, updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify({
        ...leadData,
        name: leadData.name || input.participantName || "Khách Facebook",
        source: "Facebook Group",
        lastContactAt: input.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        facebookMessenger: {
          ...((leadData.facebookMessenger && typeof leadData.facebookMessenger === "object")
            ? leadData.facebookMessenger as Record<string, unknown> : {}),
          psid: participantKey,
          conversationId: input.conversationId,
          pageFacebookId: input.pageFacebookId,
          participantName: input.participantName || null,
          lastMessageId: input.messageId,
        },
      }), input.createdAt || new Date().toISOString(), lead.id],
    );

    const linked = await linkFacebookGroupLead({
      leadId: lead.id,
      sourceCode: resolved.sourceCode,
      firstMessengerAt: input.createdAt || new Date().toISOString(),
      conversationId: input.conversationId,
      messageId: input.messageId,
      participantId: participantKey,
      participantName: input.participantName || null,
      message: input.message,
    }, systemActor);
    const attributionId = String((linked as { id?: string })?.id || "");
    if (input.participantName) {
      await query(
        `UPDATE facebook_group_comments
         SET entered_messenger = TRUE, lead_id = $1, updated_by = $2, updated_at = NOW()
         WHERE post_id = $3
           AND deleted_at IS NULL
           AND LOWER(facebook_name) = LOWER($4)
           AND (lead_id IS NULL OR lead_id = $1)`,
        [lead.id, systemActor.id, String(attribution.postId), input.participantName],
      );
    }

    await query(
      `UPDATE facebook_group_messenger_events
       SET status = 'linked', lead_id = $1, attribution_id = $2,
           data = $3::jsonb, processed_at = NOW(), updated_at = NOW()
       WHERE id = $4`,
      [lead.id, attributionId || null, JSON.stringify({
        groupName: attribution.groupName || null,
        campaignName: attribution.campaignName || null,
        postUrl: attribution.postUrl || null,
      }), eventId],
    );
    return {
      matched: true,
      sourceCode: resolved.sourceCode,
      status: "linked",
      leadId: lead.id,
      attributionId,
      groupName: String(attribution.groupName || "") || null,
      campaignName: String(attribution.campaignName || "") || null,
    };
  } catch (error) {
    await query(
      `UPDATE facebook_group_messenger_events
       SET status = 'error', error = $1, updated_at = NOW()
       WHERE id = $2`,
      [error instanceof Error ? error.message : "Không thể gắn nguồn.", eventId],
    );
    throw error;
  }
}

async function canonicalAttributionForLead(leadId: string) {
  return queryOne<{ id: string; group_id: string }>(
    `SELECT id, group_id
     FROM facebook_group_lead_attributions
     WHERE lead_id = $1
     ORDER BY first_messenger_at ASC NULLS LAST, created_at ASC
     LIMIT 1`,
    [leadId],
  );
}

export async function syncFacebookGroupQuoteAttribution(input: {
  leadId: string;
  quoteId: string;
}) {
  const attribution = await canonicalAttributionForLead(input.leadId);
  if (!attribution) return { linked: false };
  await query(
    `UPDATE facebook_group_lead_attributions
     SET quote_id = $1,
         data = data || jsonb_build_object('latestQuoteId', $1::text),
         updated_by = 'system:crm-quote', updated_at = NOW()
     WHERE id = $2`,
    [input.quoteId, attribution.id],
  );
  return { linked: true, attributionId: attribution.id };
}

export async function syncFacebookGroupOrderAttribution(input: {
  leadId: string;
  orderId: string;
  paymentStatus: string;
  status: string;
  total: number;
}) {
  const attribution = await canonicalAttributionForLead(input.leadId);
  if (!attribution) return { linked: false };
  const recognized = input.paymentStatus === "paid"
    && !["cancelled", "refunded"].includes(input.status)
    ? Math.max(0, Number(input.total) || 0) : 0;
  const eventKey = `order:${input.orderId}`;
  await query(
    `INSERT INTO facebook_group_revenue_events
     (id,attribution_id,event_key,event_type,order_id,revenue,data)
     VALUES ($1,$2,$3,'order',$4,$5,$6::jsonb)
     ON CONFLICT (order_id) WHERE order_id IS NOT NULL DO UPDATE SET
       attribution_id = EXCLUDED.attribution_id,
       event_key = EXCLUDED.event_key,
       revenue = EXCLUDED.revenue,
       data = EXCLUDED.data,
       updated_at = NOW()`,
    [`fbgre_${randomUUID()}`, attribution.id, eventKey, input.orderId, recognized,
      JSON.stringify({ paymentStatus: input.paymentStatus, orderStatus: input.status })],
  );
  await query(
    `UPDATE facebook_group_lead_attributions a SET
       order_id = COALESCE(a.order_id, $1),
       revenue = (
         SELECT COALESCE(SUM(e.revenue), 0)
         FROM facebook_group_revenue_events e
         WHERE e.attribution_id = a.id
       ),
       updated_by = 'system:order', updated_at = NOW()
     WHERE a.id = $2`,
    [input.orderId, attribution.id],
  );
  await query(
    `UPDATE facebook_groups g SET
       total_orders = (
         SELECT COUNT(DISTINCT e.order_id)
         FROM facebook_group_revenue_events e
         JOIN facebook_group_lead_attributions a ON a.id = e.attribution_id
         WHERE a.group_id = g.id AND e.order_id IS NOT NULL
       ),
       total_revenue = (
         SELECT COALESCE(SUM(e.revenue), 0)
         FROM facebook_group_revenue_events e
         JOIN facebook_group_lead_attributions a ON a.id = e.attribution_id
         WHERE a.group_id = g.id
       ),
       updated_at = NOW()
     WHERE g.id = $1`,
    [attribution.group_id],
  );
  return { linked: true, attributionId: attribution.id, revenue: recognized };
}
