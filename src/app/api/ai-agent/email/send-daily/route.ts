import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

/**
 * POST /api/ai-agent/email/send-daily
 * Send greeting emails to all new leads daily
 * 
 * This endpoint is designed to be called by a cron job
 * Example: 0 9 * * * (Every day at 9:00 AM)
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[EMAIL-DAILY] Starting daily email automation...');

    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get new leads from database
    // For demo purposes, we'll use mock data
    const newLeads = [
      {
        id: 'lead-001',
        name: 'Nguyễn Văn A',
        email: 'nguyenvana@example.com',
        phone: '0912345678',
        quantity: 3,
        context: 'Khách hàng mới từ Facebook Lead',
        createdAt: new Date(),
      },
      {
        id: 'lead-002',
        name: 'Trần Thị B',
        email: 'tranthib@example.com',
        phone: '0987654321',
        quantity: 2,
        context: 'Khách hàng mới từ TikTok Lead',
        createdAt: new Date(),
      },
    ];

    console.log(`[EMAIL-DAILY] Found ${newLeads.length} new leads`);

    // Send emails to all new leads
    const results = [];

    for (const lead of newLeads) {
      try {
        const emailResult = await sendGreetingEmail(lead);
        results.push({
          leadId: lead.id,
          leadName: lead.name,
          email: lead.email,
          success: emailResult.success,
          messageId: emailResult.messageId,
          error: emailResult.error,
        });

        console.log(`[EMAIL-DAILY] Email sent to ${lead.email}: ${emailResult.success ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        results.push({
          leadId: lead.id,
          leadName: lead.name,
          email: lead.email,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        console.error(`[EMAIL-DAILY] Error sending email to ${lead.email}:`, error);
      }
    }

    // Calculate statistics
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`[EMAIL-DAILY] Daily email automation completed`);
    console.log(`[EMAIL-DAILY] Successful: ${successful}, Failed: ${failed}`);

    return NextResponse.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        totalLeads: newLeads.length,
        successful,
        failed,
        results,
      },
    });
  } catch (error) {
    console.error('[EMAIL-DAILY] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Daily email automation failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to send greeting email
 */
async function sendGreetingEmail(lead: {
  id: string;
  name: string;
  email: string;
  phone: string;
  quantity: number;
  context: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const gmailUser = process.env.GMAIL_USER || 'phamtuat0820@gmail.com';
    const gmailPassword = process.env.GMAIL_PASSWORD || 'helx uzdy fpxs etgb';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    // Create email content
    const subject = `Giải Pháp Giường Điều Khiển Thông Minh Cho ${lead.quantity} Phòng - SmartFurni`;

    const body = `Xin chào ${lead.name},

Cảm ơn bạn đã quan tâm đến sản phẩm giường điều khiển thông minh của SmartFurni!

Chúng tôi rất vui lòng được giới thiệu các giải pháp tối ưu cho nhu cầu của bạn. Dựa trên thông tin bạn cung cấp, chúng tôi khuyến nghị các sản phẩm sau:

**1. Giường Điều Khiển Thông Minh Premium**
   - Điều khiển bằng remote hoặc ứng dụng điện thoại
   - Tính năng massage toàn thân
   - Cảm biến giấc ngủ thông minh
   - Bảo hành 5 năm
   - Giá: Liên hệ

**2. Hệ Thống Quản Lý Tập Trung**
   - Quản lý tất cả ${lead.quantity} giường từ một ứng dụng
   - Theo dõi sử dụng và bảo trì
   - Báo cáo chi tiết hàng tháng
   - Hỗ trợ kỹ thuật 24/7

**Lợi Ích:**
✓ Tăng trải nghiệm khách hàng
✓ Giảm chi phí bảo trì
✓ Tăng độ hài lòng khách
✓ Tiết kiệm năng lượng lên đến 30%
✓ Quản lý dễ dàng và hiệu quả

**Quy Trình Tiếp Theo:**
1. Chúng tôi sẽ liên hệ để trao đổi chi tiết nhu cầu
2. Cung cấp báo giá chi tiết
3. Lên kế hoạch lắp đặt
4. Hỗ trợ đào tạo nhân viên
5. Bảo hành và hỗ trợ dài hạn

Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi:
- Điện thoại: 0123-456-789
- Email: sales@smartfurni.com
- Website: www.smartfurni.com

Chúng tôi mong được hợp tác cùng bạn!

Trân trọng,
Đội ngũ SmartFurni
Giường Điều Khiển Thông Minh`;

    const html = `
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #C9A84C; color: white; padding: 20px; text-align: center; border-radius: 5px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 20px; border-left: 4px solid #C9A84C; }
            .section { margin-bottom: 20px; }
            .section h2 { color: #C9A84C; font-size: 18px; margin-top: 0; }
            .benefits { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .benefits ul { margin: 0; padding-left: 20px; }
            .benefits li { margin: 8px 0; }
            .footer { font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 20px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛏️ SmartFurni</h1>
              <p>Giường Điều Khiển Thông Minh</p>
            </div>
            <div class="content">
              <p>Xin chào <strong>${lead.name}</strong>,</p>
              <p>Cảm ơn bạn đã quan tâm đến sản phẩm giường điều khiển thông minh của SmartFurni!</p>
              <div class="section">
                <h2>Giải Pháp Được Đề Xuất</h2>
                <p>Dựa trên thông tin bạn cung cấp, chúng tôi khuyến nghị:</p>
                <ul>
                  <li>Giường Điều Khiển Thông Minh Premium</li>
                  <li>Hệ Thống Quản Lý Tập Trung cho ${lead.quantity} giường</li>
                </ul>
              </div>
              <div class="benefits">
                <strong>Lợi Ích:</strong>
                <ul>
                  <li>✓ Tăng trải nghiệm khách hàng</li>
                  <li>✓ Giảm chi phí bảo trì</li>
                  <li>✓ Tiết kiệm năng lượng lên đến 30%</li>
                </ul>
              </div>
              <p>Liên hệ: 0123-456-789 | sales@smartfurni.com</p>
            </div>
            <div class="footer">
              <p><strong>SmartFurni - Giường Điều Khiển Thông Minh</strong></p>
              <p>© 2026 SmartFurni. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const info = await transporter.sendMail({
      from: gmailUser,
      to: lead.email,
      subject: subject,
      text: body,
      html: html,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
