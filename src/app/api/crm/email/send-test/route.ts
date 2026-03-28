import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { to, subject, htmlContent, senderName, senderEmail, sourceType, sourceName } = body;

    if (!to || !subject || !htmlContent) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc: to, subject, htmlContent" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "Địa chỉ email không hợp lệ" },
        { status: 400 }
      );
    }

    // Check SMTP configuration
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpHost || !smtpUser || !smtpPass) {
      // Return mock success when SMTP not configured (for preview/demo)
      return NextResponse.json({
        success: true,
        mock: true,
        message: `[CHẾ ĐỘ XEM TRƯỚC] Email test đã được ghi nhận. Để gửi email thực, vui lòng cấu hình SMTP trong Cài đặt.`,
        to,
        subject,
        sourceType: sourceType || "unknown",
        sourceName: sourceName || "",
        sentAt: new Date().toISOString(),
      });
    }

    // Build test email HTML with test banner
    const testBanner = `
      <div style="background:#fef3c7;border:2px dashed #f59e0b;padding:12px 20px;margin-bottom:0;font-family:Arial,sans-serif;text-align:center">
        <span style="font-size:12px;font-weight:700;color:#92400e;letter-spacing:1px">
          🧪 EMAIL TEST — ${sourceType === "campaign" ? "CHIẾN DỊCH" : sourceType === "template" ? "MẪU EMAIL" : sourceType === "workflow" ? "WORKFLOW" : "EMAIL BUILDER"}: ${sourceName || ""}
        </span>
        <span style="display:block;font-size:11px;color:#b45309;margin-top:2px">
          Gửi lúc ${new Date().toLocaleString("vi-VN")} · Đây là email test, không phải email thật
        </span>
      </div>
    `;

    // Replace template variables with sample data
    const processedHtml = htmlContent
      .replace(/\{\{name\}\}/g, "Nguyễn Văn A")
      .replace(/\{\{contact_name\}\}/g, "Nguyễn Văn A")
      .replace(/\{\{company\}\}/g, "Công ty TNHH Mẫu")
      .replace(/\{\{company_name\}\}/g, "Công ty TNHH Mẫu")
      .replace(/\{\{phone\}\}/g, "0901 234 567")
      .replace(/\{\{email\}\}/g, to)
      .replace(/\{\{stage\}\}/g, "Đã liên hệ")
      .replace(/\{\{assignedTo\}\}/g, "Sales Team")
      .replace(/\{\{cta_url\}\}/g, "https://smartfurni.com")
      .replace(/\{\{unsubscribe_url\}\}/g, "#unsubscribe");

    const finalHtml = testBanner + processedHtml;

    // Send via nodemailer
    const nodemailer = await import("nodemailer").catch(() => null);
    if (!nodemailer) {
      return NextResponse.json(
        { error: "nodemailer chưa được cài đặt" },
        { status: 500 }
      );
    }

    const smtpPort = parseInt(process.env.SMTP_PORT || "587");
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const fromName = senderName || "SmartFurni CRM";
    const fromEmail = senderEmail || smtpUser;

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: `[TEST] ${subject}`,
      html: finalHtml,
    });

    return NextResponse.json({
      success: true,
      mock: false,
      message: `Email test đã được gửi thành công tới ${to}`,
      to,
      subject: `[TEST] ${subject}`,
      sourceType: sourceType || "unknown",
      sourceName: sourceName || "",
      sentAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[send-test] Error:", message);
    return NextResponse.json(
      { error: `Gửi email thất bại: ${message}` },
      { status: 500 }
    );
  }
}
