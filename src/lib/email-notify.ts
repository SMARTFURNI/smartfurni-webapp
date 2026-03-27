/**
 * Email notification module for SmartFurni Admin
 *
 * Uses SMTP via nodemailer (if available) or logs to console.
 * Configure via environment variables:
 *   SMTP_HOST     - SMTP server host (e.g., smtp.gmail.com)
 *   SMTP_PORT     - SMTP port (default: 587)
 *   SMTP_USER     - SMTP username / email
 *   SMTP_PASS     - SMTP password or app password
 *   ADMIN_EMAIL   - Admin email to receive notifications (default: same as SMTP_USER)
 */

import type { ContactMessage } from "./admin-store";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // No SMTP configured — log to console instead
    console.log(`[Email Notify] Would send email to ${payload.to}`);
    console.log(`[Email Notify] Subject: ${payload.subject}`);
    return;
  }

  try {
    // Dynamic import to avoid build errors if nodemailer is not installed
    const nodemailer = await import("nodemailer").catch(() => null);
    if (!nodemailer) {
      console.warn("[Email Notify] nodemailer not installed. Run: npm install nodemailer");
      return;
    }

    const transporter = nodemailer.default.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"SmartFurni Admin" <${user}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    console.log(`[Email Notify] Sent to ${payload.to}: ${payload.subject}`);
  } catch (err) {
    console.error("[Email Notify] Send failed:", err);
    throw err;
  }
}

export async function sendContactNotification(msg: ContactMessage): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return;

  const formattedDate = new Date(msg.createdAt).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "full",
    timeStyle: "short",
  });

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #0D0B00; padding: 24px 32px; }
    .header h1 { color: #C9A84C; margin: 0; font-size: 20px; }
    .header p { color: #9CA3AF; margin: 4px 0 0; font-size: 13px; }
    .body { padding: 32px; }
    .badge { display: inline-block; background: #FEF3C7; color: #92400E; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
    .field { margin-bottom: 16px; }
    .field label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9CA3AF; margin-bottom: 4px; }
    .field p { margin: 0; color: #111827; font-size: 15px; }
    .message-box { background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-top: 20px; }
    .message-box p { margin: 0; color: #374151; line-height: 1.6; }
    .footer { background: #F9FAFB; padding: 16px 32px; border-top: 1px solid #E5E7EB; }
    .footer p { margin: 0; font-size: 12px; color: #9CA3AF; }
    .btn { display: inline-block; background: #C9A84C; color: #0D0B00; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 Tin nhắn liên hệ mới</h1>
      <p>SmartFurni Admin Panel · ${formattedDate}</p>
    </div>
    <div class="body">
      <span class="badge">${msg.subject}</span>
      <div class="field">
        <label>Họ tên</label>
        <p>${msg.name}</p>
      </div>
      <div class="field">
        <label>Email</label>
        <p><a href="mailto:${msg.email}" style="color:#C9A84C;">${msg.email}</a></p>
      </div>
      ${msg.phone ? `<div class="field"><label>Số điện thoại</label><p>${msg.phone}</p></div>` : ""}
      <div class="message-box">
        <label style="display:block;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9CA3AF;margin-bottom:8px;">Nội dung tin nhắn</label>
        <p>${msg.message.replace(/\n/g, "<br>")}</p>
      </div>
      <a href="${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"}/admin/contacts" class="btn">
        Xem trong Admin Panel →
      </a>
    </div>
    <div class="footer">
      <p>Email này được gửi tự động từ SmartFurni Admin Panel. Vui lòng không trả lời email này.</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  await sendEmail({
    to: adminEmail,
    subject: `[SmartFurni] Tin nhắn mới từ ${msg.name}: ${msg.subject}`,
    html,
  });
}
