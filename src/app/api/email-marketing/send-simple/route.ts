import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

/**
 * API endpoint đơn giản để gửi email test
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to_email, subject, variables, product } = body;

    // Validate
    if (!to_email) {
      return NextResponse.json(
        { success: false, error: "Thiếu email nhận" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to_email)) {
      return NextResponse.json(
        { success: false, error: "Email không hợp lệ" },
        { status: 400 }
      );
    }

    // Tạo nội dung email
    const customerName = variables?.name || "Anh/Chị";
    const company = variables?.company || "";
    const productName = product || variables?.product || "Giường công thái học";
    const emailSubject = subject || "Giải pháp Giường Công Thái Học - SmartFurni";

    const emailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 8px; }
            .header { background-color: #C9A84C; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 20px; }
            .footer { background-color: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666; }
            .cta { background-color: #C9A84C; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SmartFurni</h1>
              <p>Giải Pháp Nội Thất Thông Minh</p>
            </div>
            
            <div class="content">
              <h2>Chào ${customerName},</h2>
              
              <p>SmartFurni gửi ${customerName} giải pháp <strong>${productName}</strong> chuyên nghiệp dành cho ${company ? `công ty ${company}` : "doanh nghiệp của bạn"}.</p>
              
              <h3>Tại Sao Chọn SmartFurni?</h3>
              <ul>
                <li>✅ Công nghệ IoT hiện đại</li>
                <li>✅ Điều khiển thông minh qua ứng dụng</li>
                <li>✅ Theo dõi giấc ngủ và sức khỏe</li>
                <li>✅ Bảo hành 5 năm</li>
                <li>✅ Hỗ trợ tư vấn miễn phí</li>
              </ul>
              
              <p><strong>Ưu Đãi Đặc Biệt:</strong> Giảm 15% cho đơn hàng đầu tiên + Tặng gói bảo trì 1 năm</p>
              
              <center>
                <a href="https://smartfurni.com/quote" class="cta">Xem Báo Giá & Catalog</a>
              </center>
              
              <p>Nếu có bất kỳ câu hỏi nào, vui lòng liên hệ:</p>
              <ul>
                <li>📞 Hotline: 1900-xxxx</li>
                <li>📧 Email: sales@smartfurni.com</li>
                <li>💬 Zalo: SmartFurni Official</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>© 2026 SmartFurni. Tất cả quyền được bảo lưu.</p>
              <p><a href="#">Hủy đăng ký</a> | <a href="#">Chính sách bảo mật</a></p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Setup Gmail transporter
    const gmailUser = process.env.GMAIL_USER || "smartfurni.crm@gmail.com";
    const gmailPassword = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD;
    
    if (!gmailUser || !gmailPassword) {
      console.error("[send-simple] Missing Gmail credentials");
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
      to: to_email,
      subject: emailSubject,
      html: emailContent,
    });
    
    console.log("[send-simple] Email sent successfully:");
    console.log(`  Message ID: ${info.messageId}`);
    console.log(`  To: ${to_email}`);
    console.log(`  Subject: ${emailSubject}`);

    return NextResponse.json({
      success: true,
      message: `Email đã được gửi thành công đến ${to_email}`,
      data: {
        to_email,
        subject: emailSubject,
        messageId: info.messageId,
        timestamp: new Date().toISOString(),
        status: "sent",
      },
    });
  } catch (error) {
    console.error("[send-simple] Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Lỗi gửi email: " + (error instanceof Error ? error.message : String(error))
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Send Simple Email endpoint is ready",
    documentation: "POST với body: { to_email, subject, variables: { name, company, product } }",
  });
}
