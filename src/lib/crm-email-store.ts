/**
 * crm-email-store.ts — SmartFurni CRM Email Marketing
 * Quản lý email campaigns, templates, gửi hàng loạt theo segment
 */

import { query, queryOne } from "./db";
import { randomUUID } from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmailCampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
export type EmailTemplateCategory = "intro" | "quote" | "followup" | "promo" | "event" | "custom";
export type EmailSegment = "all" | "architect" | "investor" | "dealer" | "new" | "negotiating" | "won" | "lost";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: EmailTemplateCategory;
  htmlContent: string;
  previewText: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  templateId: string | null;
  htmlContent: string;
  segment: EmailSegment;
  status: EmailCampaignStatus;
  scheduledAt: string | null;
  sentAt: string | null;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  campaignId: string;
  leadId: string;
  leadName: string;
  email: string;
  status: "pending" | "sent" | "failed" | "opened" | "clicked";
  sentAt: string | null;
  openedAt: string | null;
  error: string | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const SEGMENT_LABELS: Record<EmailSegment, string> = {
  all:         "Tất cả khách hàng",
  architect:   "Kiến trúc sư",
  investor:    "Chủ đầu tư CHDV",
  dealer:      "Đại lý",
  new:         "Khách hàng mới",
  negotiating: "Đang thương thảo",
  won:         "Đã chốt",
  lost:        "Thất bại",
};

export const TEMPLATE_CATEGORY_LABELS: Record<EmailTemplateCategory, string> = {
  intro:    "Giới thiệu sản phẩm",
  quote:    "Báo giá",
  followup: "Theo dõi / Follow-up",
  promo:    "Khuyến mãi",
  event:    "Sự kiện / Triển lãm",
  custom:   "Tùy chỉnh",
};

// ─── DB Init ──────────────────────────────────────────────────────────────────

export async function initEmailTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_email_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'custom',
      html_content TEXT NOT NULL DEFAULT '',
      preview_text TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS crm_email_campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      template_id TEXT,
      html_content TEXT NOT NULL DEFAULT '',
      segment TEXT NOT NULL DEFAULT 'all',
      status TEXT NOT NULL DEFAULT 'draft',
      scheduled_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      total_recipients INT DEFAULT 0,
      sent_count INT DEFAULT 0,
      open_count INT DEFAULT 0,
      click_count INT DEFAULT 0,
      created_by TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS crm_email_logs (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      lead_id TEXT NOT NULL,
      lead_name TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      sent_at TIMESTAMPTZ,
      opened_at TIMESTAMPTZ,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// ─── Template CRUD ────────────────────────────────────────────────────────────

function rowToTemplate(row: Record<string, unknown>): EmailTemplate {
  return {
    id: row.id as string,
    name: row.name as string,
    subject: row.subject as string,
    category: row.category as EmailTemplateCategory,
    htmlContent: row.html_content as string,
    previewText: row.preview_text as string,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  await initEmailTables();
  const rows = await query("SELECT * FROM crm_email_templates ORDER BY created_at DESC");
  return rows.map(rowToTemplate);
}

export async function createEmailTemplate(data: Omit<EmailTemplate, "id" | "createdAt" | "updatedAt">): Promise<EmailTemplate> {
  await initEmailTables();
  const id = randomUUID();
  const row = await queryOne(
    `INSERT INTO crm_email_templates (id, name, subject, category, html_content, preview_text)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [id, data.name, data.subject, data.category, data.htmlContent, data.previewText]
  );
  return rowToTemplate(row!);
}

export async function updateEmailTemplate(id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (data.name !== undefined)        { fields.push(`name=$${i++}`);         values.push(data.name); }
  if (data.subject !== undefined)     { fields.push(`subject=$${i++}`);      values.push(data.subject); }
  if (data.category !== undefined)    { fields.push(`category=$${i++}`);     values.push(data.category); }
  if (data.htmlContent !== undefined) { fields.push(`html_content=$${i++}`); values.push(data.htmlContent); }
  if (data.previewText !== undefined) { fields.push(`preview_text=$${i++}`); values.push(data.previewText); }
  if (!fields.length) return null;
  fields.push(`updated_at=NOW()`);
  values.push(id);
  const row = await queryOne(
    `UPDATE crm_email_templates SET ${fields.join(", ")} WHERE id=$${i} RETURNING *`,
    values
  );
  return row ? rowToTemplate(row) : null;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await query("DELETE FROM crm_email_templates WHERE id=$1", [id]);
}

// ─── Campaign CRUD ────────────────────────────────────────────────────────────

function rowToCampaign(row: Record<string, unknown>): EmailCampaign {
  return {
    id: row.id as string,
    name: row.name as string,
    subject: row.subject as string,
    templateId: row.template_id as string | null,
    htmlContent: row.html_content as string,
    segment: row.segment as EmailSegment,
    status: row.status as EmailCampaignStatus,
    scheduledAt: row.scheduled_at ? (row.scheduled_at as Date).toISOString() : null,
    sentAt: row.sent_at ? (row.sent_at as Date).toISOString() : null,
    totalRecipients: Number(row.total_recipients),
    sentCount: Number(row.sent_count),
    openCount: Number(row.open_count),
    clickCount: Number(row.click_count),
    createdBy: row.created_by as string,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}

export async function getEmailCampaigns(): Promise<EmailCampaign[]> {
  await initEmailTables();
  const rows = await query("SELECT * FROM crm_email_campaigns ORDER BY created_at DESC");
  return rows.map(rowToCampaign);
}

export async function getEmailCampaign(id: string): Promise<EmailCampaign | null> {
  await initEmailTables();
  const row = await queryOne("SELECT * FROM crm_email_campaigns WHERE id=$1", [id]);
  return row ? rowToCampaign(row) : null;
}

export async function createEmailCampaign(data: {
  name: string; subject: string; templateId?: string; htmlContent: string;
  segment: EmailSegment; scheduledAt?: string; createdBy?: string;
}): Promise<EmailCampaign> {
  await initEmailTables();
  const id = randomUUID();
  const row = await queryOne(
    `INSERT INTO crm_email_campaigns (id, name, subject, template_id, html_content, segment, scheduled_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [id, data.name, data.subject, data.templateId || null, data.htmlContent,
     data.segment, data.scheduledAt || null, data.createdBy || "Admin"]
  );
  return rowToCampaign(row!);
}

export async function updateEmailCampaign(id: string, data: Partial<EmailCampaign>): Promise<EmailCampaign | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const map: Record<string, string> = {
    name: "name", subject: "subject", htmlContent: "html_content",
    segment: "segment", status: "status", scheduledAt: "scheduled_at",
    sentAt: "sent_at", totalRecipients: "total_recipients",
    sentCount: "sent_count", openCount: "open_count", clickCount: "click_count",
  };
  for (const [key, col] of Object.entries(map)) {
    if ((data as Record<string, unknown>)[key] !== undefined) {
      fields.push(`${col}=$${i++}`);
      values.push((data as Record<string, unknown>)[key]);
    }
  }
  if (!fields.length) return null;
  fields.push("updated_at=NOW()");
  values.push(id);
  const row = await queryOne(
    `UPDATE crm_email_campaigns SET ${fields.join(", ")} WHERE id=$${i} RETURNING *`,
    values
  );
  return row ? rowToCampaign(row) : null;
}

export async function deleteEmailCampaign(id: string): Promise<void> {
  await query("DELETE FROM crm_email_campaigns WHERE id=$1", [id]);
  await query("DELETE FROM crm_email_logs WHERE campaign_id=$1", [id]);
}

export async function getEmailLogs(campaignId: string): Promise<EmailLog[]> {
  await initEmailTables();
  const rows = await query(
    "SELECT * FROM crm_email_logs WHERE campaign_id=$1 ORDER BY created_at DESC",
    [campaignId]
  );
  return rows.map(row => ({
    id: row.id as string,
    campaignId: row.campaign_id as string,
    leadId: row.lead_id as string,
    leadName: row.lead_name as string,
    email: row.email as string,
    status: row.status as EmailLog["status"],
    sentAt: row.sent_at ? (row.sent_at as Date).toISOString() : null,
    openedAt: row.opened_at ? (row.opened_at as Date).toISOString() : null,
    error: row.error as string | null,
  }));
}

// ─── Default Templates ────────────────────────────────────────────────────────

export const DEFAULT_TEMPLATES = [
  {
    name: "Giới thiệu SmartFurni B2B",
    subject: "Giải pháp nội thất thông minh cho dự án của bạn — SmartFurni",
    category: "intro" as EmailTemplateCategory,
    previewText: "Khám phá dòng sản phẩm Sofa giường và Giường công thái học cao cấp",
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#1a1a1a,#0d0d0d);padding:40px;text-align:center;border-bottom:1px solid #222">
    <div style="font-size:28px;font-weight:900;color:#C9A84C;letter-spacing:2px">SMARTFURNI</div>
    <div style="font-size:12px;color:#888;margin-top:4px;letter-spacing:4px">NỘI THẤT THÔNG MINH</div>
  </div>
  <div style="padding:40px">
    <h1 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 16px">Kính gửi {{name}},</h1>
    <p style="color:#aaa;line-height:1.7;margin:0 0 24px">SmartFurni xin trân trọng giới thiệu đến quý đối tác dòng sản phẩm <strong style="color:#C9A84C">Sofa giường thông minh</strong> và <strong style="color:#C9A84C">Giường công thái học</strong> — giải pháp nội thất cao cấp dành riêng cho các dự án B2B.</p>
    <div style="background:#111;border:1px solid #222;border-radius:8px;padding:24px;margin:0 0 24px">
      <div style="font-size:14px;font-weight:700;color:#C9A84C;margin-bottom:16px">✦ SẢN PHẨM NỔI BẬT</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:120px;background:#1a1a1a;border-radius:6px;padding:16px">
          <div style="font-weight:700;color:#fff;margin-bottom:4px">Pro Max</div>
          <div style="color:#C9A84C;font-size:13px">28.900.000đ</div>
          <div style="color:#666;font-size:11px;margin-top:4px">Massage 8 vùng · Sưởi</div>
        </div>
        <div style="flex:1;min-width:120px;background:#1a1a1a;border-radius:6px;padding:16px">
          <div style="font-weight:700;color:#fff;margin-bottom:4px">Pro</div>
          <div style="color:#C9A84C;font-size:13px">18.900.000đ</div>
          <div style="color:#666;font-size:11px;margin-top:4px">Massage 5 vùng · App</div>
        </div>
      </div>
    </div>
    <div style="background:#111;border:1px solid #1a3a1a;border-radius:8px;padding:16px;margin:0 0 24px">
      <div style="font-size:13px;color:#4ade80;font-weight:700">🎁 ƯU ĐÃI B2B ĐẶC BIỆT</div>
      <div style="color:#aaa;font-size:13px;margin-top:8px">Chiết khấu <strong style="color:#fff">15–25%</strong> cho đơn hàng từ 10 bộ trở lên</div>
    </div>
    <a href="https://smartfurni.vn/catalogue" style="display:block;background:linear-gradient(135deg,#C9A84C,#E2C97E);color:#000;text-align:center;padding:14px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px">Xem Catalogue B2B 2025 →</a>
  </div>
  <div style="padding:24px 40px;background:#050505;text-align:center;border-top:1px solid #111">
    <div style="color:#555;font-size:12px">SmartFurni · 123 Nguyễn Văn Linh, Q7, TP.HCM</div>
    <div style="color:#555;font-size:12px;margin-top:4px">0901 234 567 · b2b@smartfurni.vn</div>
  </div>
</div>`,
  },
  {
    name: "Follow-up sau khảo sát",
    subject: "SmartFurni — Cảm ơn buổi khảo sát tại dự án {{projectName}}",
    category: "followup" as EmailTemplateCategory,
    previewText: "Chúng tôi đã chuẩn bị báo giá chi tiết cho dự án của bạn",
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#1a1a1a,#0d0d0d);padding:32px 40px;border-bottom:1px solid #222">
    <div style="font-size:22px;font-weight:900;color:#C9A84C">SMARTFURNI</div>
    <div style="font-size:11px;color:#555;letter-spacing:3px;margin-top:2px">FOLLOW-UP</div>
  </div>
  <div style="padding:40px">
    <h1 style="font-size:20px;font-weight:700;color:#fff;margin:0 0 16px">Kính gửi {{name}},</h1>
    <p style="color:#aaa;line-height:1.7;margin:0 0 20px">Cảm ơn bạn đã dành thời gian cho buổi khảo sát tại dự án <strong style="color:#C9A84C">{{projectName}}</strong>. Đội ngũ SmartFurni đã ghi nhận đầy đủ yêu cầu và đang chuẩn bị phương án tốt nhất cho bạn.</p>
    <div style="background:#111;border-left:3px solid #C9A84C;padding:16px 20px;border-radius:0 8px 8px 0;margin:0 0 24px">
      <div style="font-size:13px;color:#C9A84C;font-weight:700;margin-bottom:8px">BƯỚC TIẾP THEO</div>
      <div style="color:#aaa;font-size:13px;line-height:1.8">
        ✓ Báo giá chi tiết sẽ được gửi trong 24h<br>
        ✓ Tư vấn viên sẽ liên hệ để xác nhận thông số<br>
        ✓ Mẫu sản phẩm có thể xem tại showroom Q7
      </div>
    </div>
    <p style="color:#aaa;font-size:13px;line-height:1.7">Nếu có bất kỳ câu hỏi nào, vui lòng liên hệ trực tiếp với Sales phụ trách <strong style="color:#fff">{{assignedTo}}</strong> qua số <strong style="color:#C9A84C">0901 234 567</strong>.</p>
  </div>
  <div style="padding:24px 40px;background:#050505;text-align:center;border-top:1px solid #111">
    <div style="color:#555;font-size:12px">SmartFurni B2B · b2b@smartfurni.vn · 0901 234 567</div>
  </div>
</div>`,
  },
  {
    name: "Khuyến mãi cuối năm",
    subject: "🎊 SmartFurni — Ưu đãi B2B đặc biệt cuối năm, chiết khấu đến 25%",
    category: "promo" as EmailTemplateCategory,
    previewText: "Cơ hội cuối năm — Đặt hàng trước 31/12 để nhận ưu đãi tốt nhất",
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#1a1200,#0d0a00);padding:40px;text-align:center;border-bottom:1px solid #2a1f00">
    <div style="font-size:28px;font-weight:900;color:#C9A84C">SMARTFURNI</div>
    <div style="font-size:32px;font-weight:900;color:#fff;margin:16px 0 8px">ƯU ĐÃI CUỐI NĂM</div>
    <div style="background:linear-gradient(135deg,#C9A84C,#E2C97E);color:#000;font-size:20px;font-weight:900;padding:8px 24px;border-radius:100px;display:inline-block">CHIẾT KHẤU ĐẾN 25%</div>
  </div>
  <div style="padding:40px">
    <p style="color:#aaa;line-height:1.7;margin:0 0 24px">Kính gửi <strong style="color:#fff">{{name}}</strong>, SmartFurni trân trọng gửi đến quý đối tác chương trình ưu đãi đặc biệt cuối năm dành riêng cho khách hàng B2B.</p>
    <div style="display:grid;gap:12px;margin:0 0 24px">
      <div style="background:#111;border:1px solid #2a1f00;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:700;color:#fff">5–9 bộ</div><div style="color:#888;font-size:12px">Đơn hàng nhỏ</div></div>
        <div style="color:#C9A84C;font-size:20px;font-weight:900">-10%</div>
      </div>
      <div style="background:#111;border:1px solid #2a1f00;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:700;color:#fff">10–19 bộ</div><div style="color:#888;font-size:12px">Đơn hàng trung bình</div></div>
        <div style="color:#C9A84C;font-size:20px;font-weight:900">-15%</div>
      </div>
      <div style="background:linear-gradient(135deg,#1a1200,#0d0a00);border:1px solid #C9A84C40;border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-weight:700;color:#C9A84C">50+ bộ</div><div style="color:#888;font-size:12px">Dự án lớn</div></div>
        <div style="color:#C9A84C;font-size:24px;font-weight:900">-25%</div>
      </div>
    </div>
    <div style="background:#1a0a0a;border:1px solid #3a1a1a;border-radius:8px;padding:16px;margin:0 0 24px;text-align:center">
      <div style="color:#f87171;font-weight:700;font-size:13px">⏰ HẠN CUỐI: 31/12/2025</div>
    </div>
    <a href="https://smartfurni.vn/catalogue" style="display:block;background:linear-gradient(135deg,#C9A84C,#E2C97E);color:#000;text-align:center;padding:16px 24px;border-radius:8px;font-weight:900;text-decoration:none;font-size:15px">Đặt hàng ngay →</a>
  </div>
</div>`,
  },
];
