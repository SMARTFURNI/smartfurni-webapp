import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createRawLead } from "@/lib/crm-raw-lead-store";
import { getCrmSettings } from "@/lib/crm-settings-store";
import { query } from "@/lib/db";
import { findZaloUserByPhone, sendZaloMessage } from "@/lib/zalo-gateway";

const NOTIFY_EMAIL = "phamtuat0820@gmail.com";
const MAX_ORDER_NOTIFY_EMAILS = 5;

function parseOrderNotifyEmails(value?: string | null) {
  const emails = (value || "")
    .split(/[\s,;]+/)
    .map(email => email.trim())
    .filter(Boolean)
    .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  return Array.from(new Set(emails)).slice(0, MAX_ORDER_NOTIFY_EMAILS);
}

async function ensureLpContentTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS lp_content (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(255) NOT NULL,
      block_key VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (slug, block_key)
    )
  `);
}

async function getLandingDeliverySettings(slug: string) {
  try {
    await ensureLpContentTable();
    const rows = await query<{ block_key: string; content: string }>(
      `SELECT block_key, content FROM lp_content
       WHERE slug = $1 AND block_key IN (
        'tracking_order_notify_email',
        'tracking_order_google_sheet_url',
        'tracking_contact_zalo'
       )`,
      [slug]
    );
    const result: Record<string, string> = {};
    for (const row of rows || []) result[row.block_key] = row.content;
    const notifyEmails = parseOrderNotifyEmails(result.tracking_order_notify_email);
    return {
      notifyEmails: notifyEmails.length ? notifyEmails : [NOTIFY_EMAIL],
      googleSheetUrl: result.tracking_order_google_sheet_url?.trim() || "",
      zaloNotifyPhone: result.tracking_contact_zalo?.trim() || "",
    };
  } catch (e) {
    console.error("[submit-lead] get delivery settings failed:", e);
    return { notifyEmails: [NOTIFY_EMAIL], googleSheetUrl: "", zaloNotifyPhone: "" };
  }
}

function extractSpreadsheetId(urlOrId: string) {
  const raw = (urlOrId || "").trim();
  if (!raw) return "";
  const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || (/^[a-zA-Z0-9-_]{20,}$/.test(raw) ? raw : "");
}

type SheetAppendResult =
  | { ok: true; mode: "google_sheet" | "apps_script"; detail: string }
  | { ok: false; mode: "google_sheet" | "apps_script" | "none"; reason: string; detail?: string };

function maskIdentifier(value: string) {
  if (!value) return "";
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

async function appendLeadToConfiguredSheet(data: LeadNotificationData & { googleSheetUrl: string }): Promise<SheetAppendResult> {
  const url = data.googleSheetUrl.trim();
  if (!url) {
    return { ok: false, mode: "none", reason: "missing_landing_google_sheet_url" };
  }

  const nowIso = new Date().toISOString();
  const addressParts = [data.ward, data.district, data.province].filter(Boolean).join(", ");
  const fullAddress = [data.address, addressParts].filter(Boolean).join(", ");
  const row = [
    nowIso,
    data.slug,
    data.fullName,
    data.phone,
    data.email || "",
    data.province || "",
    data.district || "",
    data.ward || "",
    fullAddress,
    data.configStr || "",
    data.totalPrice || "",
    data.note || "",
  ];

  if (/script\.google\.com\/macros\/s\//.test(url)) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submittedAt: nowIso,
        landingPage: data.slug,
        fullName: data.fullName,
        phone: data.phone,
        email: data.email || "",
        province: data.province || "",
        district: data.district || "",
        ward: data.ward || "",
        address: fullAddress,
        configStr: data.configStr || "",
        totalPrice: data.totalPrice || "",
        note: data.note || "",
        row,
      }),
    });

    if (!response.ok) {
      return { ok: false, mode: "apps_script", reason: "apps_script_http_error", detail: `${response.status} ${response.statusText}` };
    }

    return { ok: true, mode: "apps_script", detail: `HTTP ${response.status}` };
  }

  const spreadsheetId = extractSpreadsheetId(url);
  if (!spreadsheetId) {
    return { ok: false, mode: "google_sheet", reason: "invalid_google_sheet_url" };
  }

  const settings = await getCrmSettings();
  const serviceAccountKey = settings.googleSheet?.serviceAccountKey;
  if (!serviceAccountKey) {
    return {
      ok: false,
      mode: "google_sheet",
      reason: "missing_service_account_key",
      detail: `spreadsheetId=${maskIdentifier(spreadsheetId)}`,
    };
  }

  let credentials: { client_email?: string };
  try {
    credentials = JSON.parse(serviceAccountKey);
  } catch {
    return { ok: false, mode: "google_sheet", reason: "invalid_service_account_json" };
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "A:L",
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [row] },
  });

  return {
    ok: true,
    mode: "google_sheet",
    detail: `spreadsheetId=${maskIdentifier(spreadsheetId)}, serviceAccount=${credentials.client_email || "unknown"}`,
  };
}

type LeadNotificationData = {
  fullName: string;
  phone: string;
  email?: string;
  province?: string;
  district?: string;
  ward?: string;
  address?: string;
  note?: string;
  configStr?: string;
  totalPrice?: string;
  slug: string;
};

function normalizeVietnamPhone(value?: string | null) {
  const compact = (value || "").replace(/[\s.()-]/g, "").trim();
  if (!compact) return "";
  if (compact.startsWith("+84")) return `0${compact.slice(3)}`;
  if (compact.startsWith("84") && compact.length >= 10) return `0${compact.slice(2)}`;
  return compact;
}

function buildZaloLeadMessage(data: LeadNotificationData & { leadId?: number | string }) {
  const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const addressParts = [data.ward, data.district, data.province].filter(Boolean).join(", ");
  const fullAddress = [data.address, addressParts].filter(Boolean).join(", ");
  const configLines = data.configStr
    ? data.configStr.split("|").map(s => s.trim()).filter(Boolean).map(s => `- ${s}`)
    : [];

  return [
    "SMARTFURNI - ĐƠN HÀNG MỚI",
    data.leadId ? `Mã lead: #${data.leadId}` : null,
    `Thời gian: ${now}`,
    `Landing page: ${data.slug}`,
    "",
    `Khách hàng: ${data.fullName}`,
    `Số điện thoại: ${data.phone}`,
    data.email ? `Email: ${data.email}` : null,
    fullAddress ? `Địa chỉ: ${fullAddress}` : null,
    data.totalPrice ? `Giá tham khảo: ${data.totalPrice}` : null,
    configLines.length ? `Cấu hình:
${configLines.join("\n")}` : null,
    data.note ? `Ghi chú: ${data.note}` : null,
    "",
    "Vui lòng kiểm tra và chăm sóc khách trong CRM."
  ].filter(Boolean).join("\n");
}

async function sendZaloLeadNotification(data: LeadNotificationData & { leadId?: number | string; zaloNotifyPhone?: string }) {
  const phone = normalizeVietnamPhone(data.zaloNotifyPhone);
  if (!phone) {
    console.warn("[submit-lead] Zalo notification skipped:", { slug: data.slug, reason: "missing_tracking_contact_zalo" });
    return;
  }

  const found = await findZaloUserByPhone(phone);
  if (!found.success || !found.user?.uid) {
    console.warn("[submit-lead] Zalo notification skipped:", {
      slug: data.slug,
      phone,
      reason: "zalo_user_not_found",
      error: found.error,
    });
    return;
  }

  const sent = await sendZaloMessage({
    conversationId: found.user.uid,
    content: buildZaloLeadMessage(data),
    senderName: "SmartFurni CRM",
    senderId: "landing-page-order",
  });

  if (!sent.success) {
    console.error("[submit-lead] Zalo notification failed:", {
      slug: data.slug,
      phone,
      userId: found.user.uid,
      error: sent.error,
    });
    return;
  }

  console.log("[submit-lead] Zalo notification sent:", {
    slug: data.slug,
    phone,
    userId: found.user.uid,
    messageId: sent.messageId,
  });
}

async function sendLeadNotification(data: LeadNotificationData & { notifyEmails?: string[] }) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@smartfurni.vn";
  if (!resendKey) return;

  const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const addressParts = [data.ward, data.district, data.province].filter(Boolean).join(", ");
  const fullAddress = [data.address, addressParts].filter(Boolean).join(", ");

  const escapeHtml = (value?: string | null) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const brandGold = "#C9A84C";
  const brandGoldDark = "#8B6914";
  const brandInk = "#1A1200";
  const brandCream = "#FDFAF5";
  const logoUrl = "https://smartfurni.com.vn/smartfurni-logo-transparent.png";
  const safeName = escapeHtml(data.fullName);
  const safePhone = escapeHtml(data.phone);
  const safeEmail = escapeHtml(data.email);
  const safeAddress = escapeHtml(fullAddress);
  const safeNote = escapeHtml(data.note);
  const safeTotalPrice = escapeHtml(data.totalPrice);
  const safeSlug = escapeHtml(data.slug);
  const configItems = data.configStr
    ? data.configStr.split("|").map(s => s.trim()).filter(Boolean)
    : [];
  const configRows = configItems.map(item => `
        <tr>
          <td style="padding: 10px 0; vertical-align: top; width: 18px; color: ${brandGold}; font-size: 16px; line-height: 20px;">•</td>
          <td style="padding: 10px 0; color: #3F3527; font-size: 14px; line-height: 20px; border-bottom: 1px solid rgba(139,105,20,0.10);">${escapeHtml(item)}</td>
        </tr>`).join("");

  const infoRow = (label: string, value: string, extraValueStyle = "") => value ? `
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid rgba(139,105,20,0.12); color: #7A6A55; font-size: 12px; line-height: 18px; text-transform: uppercase; letter-spacing: 0.08em; width: 150px; vertical-align: top;">${label}</td>
          <td style="padding: 14px 0; border-bottom: 1px solid rgba(139,105,20,0.12); color: ${brandInk}; font-size: 15px; line-height: 22px; font-weight: 700; vertical-align: top; ${extraValueStyle}">${value}</td>
        </tr>` : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartFurni - Đơn đặt hàng mới</title>
</head>
<body style="margin: 0; padding: 0; background: #F4F0E7; font-family: Arial, Helvetica, sans-serif; color: ${brandInk};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; background: #F4F0E7; padding: 0; margin: 0;">
    <tr>
      <td align="center" style="padding: 28px 12px;">
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 640px; border-collapse: collapse; border-radius: 22px; overflow: hidden; background: ${brandCream}; box-shadow: 0 18px 48px rgba(26,18,0,0.16); border: 1px solid rgba(139,105,20,0.18);">
          <tr>
            <td style="background: linear-gradient(135deg, rgba(26,18,0,0.98), rgba(61,44,0,0.96)); padding: 30px 34px 26px; text-align: center; border-bottom: 3px solid ${brandGold};">
              <img src="${logoUrl}" alt="SmartFurni" width="170" style="display: block; width: 170px; max-width: 70%; height: auto; margin: 0 auto 18px; object-fit: contain;">
              <div style="font-family: Georgia, 'Times New Roman', serif; color: #FFFFFF; font-size: 30px; line-height: 36px; font-style: italic; font-weight: 400; letter-spacing: -0.02em; margin: 0;">Đơn đặt hàng mới</div>
              <div style="height: 1px; width: 72px; background: ${brandGold}; margin: 16px auto 14px;"></div>
              <div style="color: #E9D18A; font-size: 13px; line-height: 20px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700;">Landing Page ${safeSlug}</div>
              <div style="color: rgba(253,250,245,0.76); font-size: 13px; line-height: 20px; margin-top: 4px;">${now}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 34px 10px; background: ${brandCream};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 18px 20px; background: #FFFFFF; border: 1px solid rgba(139,105,20,0.15); border-radius: 16px;">
                    <div style="color: #7A6A55; font-size: 12px; line-height: 18px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; margin-bottom: 6px;">Khách hàng cần chăm sóc</div>
                    <div style="font-size: 24px; line-height: 31px; font-weight: 800; color: ${brandInk}; margin-bottom: 8px;">${safeName}</div>
                    <a href="tel:${safePhone}" style="display: inline-block; color: ${brandGoldDark}; font-size: 20px; line-height: 26px; font-weight: 800; text-decoration: none;">${safePhone}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 34px 4px; background: ${brandCream};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                ${infoRow("Email", safeEmail)}
                ${infoRow("Địa chỉ", safeAddress, "font-weight: 600;")}
                ${infoRow("Giá tham khảo", safeTotalPrice, `font-size: 22px; line-height: 28px; color: ${brandGoldDark};`)}
                ${safeNote ? infoRow("Ghi chú", safeNote, "font-weight: 600;") : ""}
              </table>
            </td>
          </tr>
          ${configRows ? `<tr>
            <td style="padding: 18px 34px 4px; background: ${brandCream};">
              <div style="background: #FFFFFF; border: 1px solid rgba(139,105,20,0.15); border-radius: 16px; padding: 18px 20px;">
                <div style="color: ${brandGoldDark}; font-size: 13px; line-height: 19px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 800; margin-bottom: 4px;">Cấu hình khách chọn</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">${configRows}</table>
              </div>
            </td>
          </tr>` : ""}
          <tr>
            <td align="center" style="padding: 26px 34px 32px; background: ${brandCream};">
              <a href="https://smartfurni.com.vn/admin/crm" style="display: inline-block; background: linear-gradient(135deg, #B8922A, #E8C96A); color: ${brandInk}; font-weight: 800; font-size: 14px; line-height: 18px; padding: 14px 30px; border-radius: 999px; text-decoration: none; box-shadow: 0 10px 24px rgba(139,105,20,0.24); letter-spacing: 0.02em;">Xem đơn trong CRM</a>
              <div style="color: #7A6A55; font-size: 12px; line-height: 18px; margin-top: 14px;">Email này được gửi tự động từ hệ thống landing page SmartFurni.</div>
            </td>
          </tr>
          <tr>
            <td style="background: #1A1200; padding: 18px 30px; text-align: center; border-top: 1px solid rgba(201,168,76,0.24);">
              <div style="color: ${brandGold}; font-size: 13px; line-height: 20px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase;">SmartFurni</div>
              <div style="color: rgba(253,250,245,0.72); font-size: 12px; line-height: 18px; margin-top: 4px;">Sofa Giường Thông Minh | smartfurni.com.vn</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const recipients = (data.notifyEmails?.length ? data.notifyEmails : [NOTIFY_EMAIL]).slice(0, MAX_ORDER_NOTIFY_EMAILS);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `SmartFurni <${fromEmail}>`,
      to: recipients,
      subject: `Đơn mới SmartFurni: ${data.fullName} — ${data.phone}`,
      html,
    }),
  });

  if (!response.ok) {
    console.error("[submit-lead] Resend notification failed:", { status: response.status, recipients });
  } else {
    console.log("[submit-lead] email notification sent:", { recipients });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName: fullNameRaw,
      name: nameRaw,
      phone,
      email,
      businessType,
      province,
      district,
      ward,
      address,
      showroomName,
      message,
      note,
      configStr,
      totalPrice,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      landingPage,
      landingPageSlug,
    } = body;

    // Support both 'fullName' (B2B form) and 'name' (quiz form)
    const fullName = fullNameRaw || nameRaw;
    if (!fullName || !phone) {
      return NextResponse.json({ error: "Thiếu họ tên hoặc số điện thoại" }, { status: 400 });
    }

    // Xác định source dựa trên UTM
    let source: "facebook_lead" | "tiktok_lead" | "manual" | "other" = "other";
    if (utmSource?.toLowerCase().includes("facebook") || utmSource?.toLowerCase().includes("fb")) {
      source = "facebook_lead";
    } else if (utmSource?.toLowerCase().includes("tiktok")) {
      source = "tiktok_lead";
    }

    const slug = landingPageSlug || landingPage || "sofa-giuong";
    const addressParts = [ward, district, province].filter(Boolean).join(", ");
    const fullAddress = [address, addressParts].filter(Boolean).join(", ");

    const deliverySettings = await getLandingDeliverySettings(slug);

    const lead = await createRawLead({
      fullName,
      phone,
      email: email || "",
      source,
      adName: utmContent || slug || "LP Sofa Giường",
      campaignName: utmCampaign || slug || "sofa-giuong",
      formName: `Landing Page - ${slug}`,
      customerRole: businessType || "Khách hàng",
      message: [
        showroomName ? `Showroom: ${showroomName}` : null,
        fullAddress ? `Địa chỉ: ${fullAddress}` : null,
        configStr ? `Cấu hình: ${configStr}` : null,
        totalPrice ? `Giá: ${totalPrice}` : null,
        note ? `Ghi chú: ${note}` : null,
        message ? `Ghi chú: ${message}` : null,
      ].filter(Boolean).join(" | ") || undefined,
      rawData: {
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        landingPage: slug,
        businessType,
        province,
        district,
        ward,
        address,
        showroomName,
        configStr,
        totalPrice,
        notifyEmails: deliverySettings.notifyEmails,
        googleSheetUrl: deliverySettings.googleSheetUrl,
        zaloNotifyPhone: deliverySettings.zaloNotifyPhone,
        submittedAt: new Date().toISOString(),
      },
    });

    // Gửi email thông báo (không block response)
    sendLeadNotification({
      fullName,
      phone,
      email,
      province,
      district,
      ward,
      address,
      note: note || message,
      configStr,
      totalPrice,
      slug,
      notifyEmails: deliverySettings.notifyEmails,
    }).catch(err => console.error("[submit-lead] email notification failed:", err));

    sendZaloLeadNotification({
      fullName,
      phone,
      email,
      province,
      district,
      ward,
      address,
      note: note || message,
      configStr,
      totalPrice,
      slug,
      leadId: lead.id,
      zaloNotifyPhone: deliverySettings.zaloNotifyPhone,
    }).catch(err => console.error("[submit-lead] Zalo notification unexpected failure:", { slug, error: err }));

    appendLeadToConfiguredSheet({
      fullName,
      phone,
      email,
      province,
      district,
      ward,
      address,
      note: note || message,
      configStr,
      totalPrice,
      slug,
      googleSheetUrl: deliverySettings.googleSheetUrl,
    })
      .then(result => {
        if (result.ok) {
          console.log("[submit-lead] Google Sheet append success:", { slug, mode: result.mode, detail: result.detail });
        } else {
          console.warn("[submit-lead] Google Sheet append skipped:", { slug, mode: result.mode, reason: result.reason, detail: result.detail });
        }
      })
      .catch(err => console.error("[submit-lead] Google Sheet append failed:", { slug, error: err }));

    return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
  } catch (e) {
    console.error("[lp/submit-lead]", e);
    return NextResponse.json({ error: "Có lỗi xảy ra, vui lòng thử lại" }, { status: 500 });
  }
}
