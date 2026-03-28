import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const ok = await getAdminSession();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { to, subject, htmlContent, senderName, sourceType, sourceName } = body;

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

    const resendApiKey = process.env.RESEND_API_KEY || "";

    if (!resendApiKey) {
      // Return mock success when Resend not configured
      return NextResponse.json({
        success: true,
        mock: true,
        message: `[CHẾ ĐỘ XEM TRƯỚC] Email test đã được ghi nhận. Để gửi email thực, vui lòng cấu hình RESEND_API_KEY trong Cài đặt.`,
        to,
        subject,
        sourceType: sourceType || "unknown",
        sourceName: sourceName || "",
        sentAt: new Date().toISOString(),
      });
    }

    // Build source label for banner
    const sourceLabel =
      sourceType === "campaign" ? "CHIẾN DỊCH" :
      sourceType === "template" ? "MẪU EMAIL" :
      sourceType === "workflow" ? "WORKFLOW" : "EMAIL BUILDER";

    // Test banner at top of email
    const testBanner = `
      <div style="background:#fef3c7;border:2px dashed #f59e0b;padding:12px 20px;font-family:Arial,sans-serif;text-align:center">
        <span style="font-size:12px;font-weight:700;color:#92400e;letter-spacing:1px">
          🧪 EMAIL TEST — ${sourceLabel}: ${sourceName || ""}
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

    // Send via Resend (HTTPS API — not blocked by Railway)
    const { Resend } = await import("resend");
    const resend = new Resend(resendApiKey);

    const fromName = senderName || "SmartFurni CRM";
    // Resend requires a verified domain; use onboarding@resend.dev for testing
    // or a verified sender like noreply@yourdomain.com
    const fromAddress = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromAddress}>`,
      to: [to],
      subject: `[TEST] ${subject}`,
      html: finalHtml,
    });

    if (error) {
      console.error("[send-test] Resend error:", error);
      return NextResponse.json(
        { error: `Gửi email thất bại: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mock: false,
      message: `Email test đã được gửi thành công tới ${to}`,
      messageId: data?.id,
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
