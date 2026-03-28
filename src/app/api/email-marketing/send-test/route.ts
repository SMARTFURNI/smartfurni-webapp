import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

/**
 * API endpoint để gửi email test
 * Cho phép kiểm tra hiển thị trên mobile trước khi chạy chiến dịch thật
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { testEmail, templateHtml, subject, variables } = body;

    // Validate
    if (!testEmail || !templateHtml || !subject) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return NextResponse.json(
        { success: false, error: "Email không hợp lệ" },
        { status: 400 }
      );
    }

    // Replace variables in template
    let finalHtml = templateHtml;
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        finalHtml = finalHtml.replace(regex, String(value));
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: testEmail,
      subject: `[TEST] ${subject}`,
      html: finalHtml,
    });

    console.log("[send-test] Email sent:", info.messageId);

    return NextResponse.json({
      success: true,
      message: `Email test đã được gửi đến ${testEmail}`,
      data: {
        messageId: info.messageId,
        testEmail,
        subject: `[TEST] ${subject}`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[send-test] Error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi gửi email test" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Send Test Email endpoint is ready",
    documentation: "POST với body: { testEmail, templateHtml, subject, variables }",
  });
}
