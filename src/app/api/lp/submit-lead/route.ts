import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createRawLead } from "@/lib/crm-raw-lead-store";
import { getCrmSettings } from "@/lib/crm-settings-store";
import { query } from "@/lib/db";

const NOTIFY_EMAIL = "phamtuat0820@gmail.com";

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
        'tracking_order_google_sheet_url'
       )`,
      [slug]
    );
    const result: Record<string, string> = {};
    for (const row of rows || []) result[row.block_key] = row.content;
    return {
      notifyEmail: result.tracking_order_notify_email?.trim() || NOTIFY_EMAIL,
      googleSheetUrl: result.tracking_order_google_sheet_url?.trim() || "",
    };
  } catch (e) {
    console.error("[submit-lead] get delivery settings failed:", e);
    return { notifyEmail: NOTIFY_EMAIL, googleSheetUrl: "" };
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

async function sendLeadNotification(data: LeadNotificationData & { notifyEmail?: string }) {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@smartfurni.vn";
  if (!resendKey) return;

  const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const addressParts = [data.ward, data.district, data.province].filter(Boolean).join(", ");
  const fullAddress = [data.address, addressParts].filter(Boolean).join(", ");

  const configRows = data.configStr
    ? data.configStr.split("|").map(s => s.trim()).filter(Boolean).map(s =>
        `<tr><td colspan="2" style="padding: 4px 0; font-size: 13px; color: #444;">• ${s}</td></tr>`
      ).join("")
    : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 580px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1a1200 0%, #3d2c00 100%); padding: 28px 32px; text-align: center;">
      <div style="color: #C9A84C; font-size: 22px; font-weight: 700; letter-spacing: 1px;">🛋️ SMARTFURNI</div>
      <div style="color: #fff; font-size: 16px; margin-top: 8px; font-weight: 600;">Đơn đặt hàng mới từ Landing Page</div>
      <div style="color: #C9A84C; font-size: 13px; margin-top: 4px;">${now}</div>
    </div>
    <div style="padding: 28px 32px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #888; font-size: 13px; width: 130px;">Họ và tên</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: 700; font-size: 16px; color: #1a1a1a;">${data.fullName}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #888; font-size: 13px;">Số điện thoại</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-weight: 700; font-size: 16px;">
            <a href="tel:${data.phone}" style="color: #C9A84C; text-decoration: none;">${data.phone}</a>
          </td>
        </tr>
        ${data.email ? `<tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #888; font-size: 13px;">Email</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${data.email}</td>
        </tr>` : ""}
        ${fullAddress ? `<tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #888; font-size: 13px;">Địa chỉ</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px;">${fullAddress}</td>
        </tr>` : ""}
        ${data.configStr ? `<tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #888; font-size: 13px; vertical-align: top;">Cấu hình</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
            <table style="width: 100%; border-collapse: collapse;">${configRows}</table>
          </td>
        </tr>` : ""}
        ${data.totalPrice ? `<tr>
          <td style="padding: 12px 0 4px; color: #888; font-size: 13px;">Giá tham khảo</td>
          <td style="padding: 12px 0 4px; font-weight: 700; font-size: 20px; color: #C9A84C;">${data.totalPrice}</td>
        </tr>` : ""}
        ${data.note ? `<tr>
          <td style="padding: 10px 0; color: #888; font-size: 13px; vertical-align: top;">Ghi chú</td>
          <td style="padding: 10px 0; font-size: 13px; color: #555;">${data.note}</td>
        </tr>` : ""}
      </table>
      <div style="margin-top: 28px; text-align: center;">
        <a href="https://smartfurni.com.vn/admin/crm" style="display: inline-block; background: linear-gradient(135deg, #C9A84C, #e8c96a); color: #1a1200; font-weight: 700; font-size: 14px; padding: 12px 32px; border-radius: 50px; text-decoration: none;">
          📋 Xem trong CRM →
        </a>
      </div>
    </div>
    <div style="background: #f9f9f9; padding: 14px 32px; text-align: center; color: #aaa; font-size: 12px; border-top: 1px solid #eee;">
      SmartFurni — Sofa Giường Thông Minh | smartfurni.com.vn
    </div>
  </div>
</body>
</html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `SmartFurni <${fromEmail}>`,
      to: [data.notifyEmail || NOTIFY_EMAIL],
      subject: `🛋️ Đơn mới: ${data.fullName} — ${data.phone}`,
      html,
    }),
  });
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
        notifyEmail: deliverySettings.notifyEmail,
        googleSheetUrl: deliverySettings.googleSheetUrl,
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
      notifyEmail: deliverySettings.notifyEmail,
    }).catch(err => console.error("[submit-lead] email notification failed:", err));

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
