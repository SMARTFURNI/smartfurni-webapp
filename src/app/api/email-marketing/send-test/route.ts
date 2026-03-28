import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

/**
 * API endpoint để gửi email test
 * Cho phép kiểm tra hiển thị trên mobile trước khi chạy chiến dịch thật
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to_email, testEmail, templateHtml, template_id, subject, variables } = body;

    // Validate - chấp nhận to_email hoặc testEmail
    const emailToSend = to_email || testEmail;
    const emailSubject = subject || "Email Test SmartFurni";
    
    if (!emailToSend) {
      return NextResponse.json(
        { success: false, error: "Thiếu email nhận" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToSend)) {
      return NextResponse.json(
        { success: false, error: "Email không hợp lệ" },
        { status: 400 }
      );
    }

    // Tạo template HTML nếu không có
    let finalHtml = templateHtml || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Chào {{name}},</h2>
        <p>SmartFurni gửi Anh/Chị giải pháp {{product}} chuyên nghiệp.</p>
        <p>Đây là email test để kiểm tra hiển thị trước khi chạy chiến dịch thật.</p>
        <p>Trân trọng,<br/>SmartFurni Team</p>
      </div>
    `;
    
    // Replace variables in template
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        finalHtml = finalHtml.replace(regex, String(value));
      });
    }

    // Create transporter
    const gmailUser = process.env.GMAIL_USER || "smartfurni.crm@gmail.com";
    const gmailPassword = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD;
    
    if (!gmailUser || !gmailPassword) {
      console.error("[send-test] Missing Gmail credentials");
      return NextResponse.json(
        { success: false, error: "Cấu hình Gmail chưa hoàn thành" },
        { status: 500 }
      );
    }
    
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: gmailUser,
      to: emailToSend,
      subject: `[TEST] ${emailSubject}`,
      html: finalHtml,
    });

    console.log("[send-test] Email sent successfully:", info.messageId);
    console.log("[send-test] To:", emailToSend);
    console.log("[send-test] Subject:", emailSubject);

    return NextResponse.json({
      success: true,
      message: `Email test đã được gửi đến ${emailToSend}`,
      data: {
        messageId: info.messageId,
        testEmail: emailToSend,
        subject: `[TEST] ${emailSubject}`,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[send-test] Error:", error);
    return NextResponse.json(
      { success: false, error: "Lỗi gửi email test: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Send Test Email endpoint is ready",
    documentation: "POST với body: { to_email (hoặc testEmail), template_id, subject, variables }",
    example: {
      to_email: "contact.foodcom@gmail.com",
      template_id: "welcome_email",
      subject: "Giải pháp Giường Công Thái Học",
      variables: {
        name: "Phạm Nhất Bá Tuật",
        company: "FoodCom",
        product: "Giường công thái học"
      }
    }
  });
}
