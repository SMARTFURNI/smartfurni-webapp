/**
 * Email Automation Service
 * Quản lý cron job và tự động hoá gửi email hàng ngày
 */

import nodemailer from 'nodemailer';

export interface EmailAutomationConfig {
  enabled: boolean;
  scheduleTime: string; // HH:MM format
  timezone: string;
  emailTemplate: string;
  retryCount: number;
  retryDelay: number; // milliseconds
}

export interface EmailAutomationLog {
  timestamp: Date;
  totalLeads: number;
  successful: number;
  failed: number;
  results: Array<{
    leadId: string;
    leadName: string;
    email: string;
    status: 'success' | 'failed';
    messageId?: string;
    error?: string;
  }>;
}

// Cấu hình mặc định
const DEFAULT_CONFIG: EmailAutomationConfig = {
  enabled: true,
  scheduleTime: '09:00',
  timezone: 'Asia/Ho_Chi_Minh',
  emailTemplate: 'default',
  retryCount: 3,
  retryDelay: 5000,
};

// Lưu trữ cấu hình (trong production, lưu vào database)
let automationConfig: EmailAutomationConfig = DEFAULT_CONFIG;
let automationLogs: EmailAutomationLog[] = [];

/**
 * Lấy cấu hình tự động hoá hiện tại
 */
export function getAutomationConfig(): EmailAutomationConfig {
  return { ...automationConfig };
}

/**
 * Cập nhật cấu hình tự động hoá
 */
export function updateAutomationConfig(config: Partial<EmailAutomationConfig>) {
  automationConfig = {
    ...automationConfig,
    ...config,
  };
  console.log('[EMAIL-AUTOMATION] Cấu hình đã cập nhật:', automationConfig);
  return automationConfig;
}

/**
 * Lấy lịch sử tự động hoá
 */
export function getAutomationLogs(limit: number = 10): EmailAutomationLog[] {
  return automationLogs.slice(-limit).reverse();
}

/**
 * Gửi email cho lead
 */
async function sendEmailToLead(
  leadId: string,
  leadName: string,
  email: string,
  subject: string,
  body: string,
  htmlBody: string,
  retryCount: number = 0
): Promise<{ success: boolean; messageId?: string; error?: string }> {
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

    const info = await transporter.sendMail({
      from: gmailUser,
      to: email,
      subject: subject,
      text: body,
      html: htmlBody,
    });

    console.log(`[EMAIL-AUTOMATION] Email gửi thành công cho ${leadName} (${email})`, {
      messageId: info.messageId,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[EMAIL-AUTOMATION] Lỗi gửi email cho ${leadName}:`, errorMessage);

    // Retry logic
    if (retryCount < automationConfig.retryCount) {
      console.log(`[EMAIL-AUTOMATION] Thử lại lần ${retryCount + 1}/${automationConfig.retryCount}...`);
      await new Promise((resolve) => setTimeout(resolve, automationConfig.retryDelay));
      return sendEmailToLead(leadId, leadName, email, subject, body, htmlBody, retryCount + 1);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Tạo email template
 */
function createEmailTemplate(
  leadName: string,
  quantity: number = 1,
  productName: string = 'Giường Điều Khiển Thông Minh'
): { subject: string; body: string; htmlBody: string } {
  const subject = `Chào mừng ${leadName} - Giải pháp ${productName} cho ${quantity} phòng - SmartFurni`;

  const body = `Xin chào ${leadName},

Cảm ơn bạn đã quan tâm đến ${productName} của SmartFurni!

Chúng tôi rất vui được giới thiệu cho bạn giải pháp hoàn hảo cho ${quantity} phòng của bạn.

Giường Điều Khiển Thông Minh của chúng tôi cung cấp:
✓ Điều khiển từ xa bằng điện thoại
✓ Các chế độ ngủ tự động
✓ Tích hợp với hệ thống nhà thông minh
✓ Bảo hành 5 năm
✓ Dịch vụ lắp đặt miễn phí

Hãy để chúng tôi giúp bạn tạo không gian ngủ hoàn hảo!

Bạn có thể:
1. Xem danh sách sản phẩm: https://smartfurni.com/products
2. Liên hệ tư vấn: 0123-456-789
3. Đặt lịch demo: https://smartfurni.com/demo

Trân trọng,
Đội ngũ SmartFurni`;

  const htmlBody = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Xin chào ${leadName},</h2>
          
          <p>Cảm ơn bạn đã quan tâm đến <strong>${productName}</strong> của SmartFurni!</p>
          
          <p>Chúng tôi rất vui được giới thiệu cho bạn giải pháp hoàn hảo cho <strong>${quantity} phòng</strong> của bạn.</p>
          
          <h3>Giường Điều Khiển Thông Minh cung cấp:</h3>
          <ul>
            <li>✓ Điều khiển từ xa bằng điện thoại</li>
            <li>✓ Các chế độ ngủ tự động</li>
            <li>✓ Tích hợp với hệ thống nhà thông minh</li>
            <li>✓ Bảo hành 5 năm</li>
            <li>✓ Dịch vụ lắp đặt miễn phí</li>
          </ul>
          
          <p>Hãy để chúng tôi giúp bạn tạo không gian ngủ hoàn hảo!</p>
          
          <h3>Bạn có thể:</h3>
          <ol>
            <li><a href="https://smartfurni.com/products">Xem danh sách sản phẩm</a></li>
            <li>Liên hệ tư vấn: <strong>0123-456-789</strong></li>
            <li><a href="https://smartfurni.com/demo">Đặt lịch demo</a></li>
          </ol>
          
          <p style="margin-top: 30px; color: #666;">
            Trân trọng,<br>
            <strong>Đội ngũ SmartFurni</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #ddd; margin-top: 30px;">
          <p style="font-size: 12px; color: #999;">
            SmartFurni - Giải pháp nội thất thông minh<br>
            Email: support@smartfurni.com | Phone: 0123-456-789<br>
            Website: https://smartfurni.com
          </p>
        </div>
      </body>
    </html>
  `;

  return { subject, body, htmlBody };
}

/**
 * Chạy tự động hoá email hàng ngày
 * Gửi email cho tất cả lead mới chưa gửi
 */
export async function runDailyEmailAutomation(): Promise<EmailAutomationLog> {
  const startTime = new Date();
  console.log('[EMAIL-AUTOMATION] Bắt đầu tự động hoá email hàng ngày');

  if (!automationConfig.enabled) {
    console.log('[EMAIL-AUTOMATION] Tự động hoá đã bị vô hiệu hoá');
    return {
      timestamp: startTime,
      totalLeads: 0,
      successful: 0,
      failed: 0,
      results: [],
    };
  }

  // Mock data: Lấy lead mới từ database
  // Trong production, query từ database thực tế
  const newLeads = [
    {
      id: 'lead-001',
      name: 'Phạm Nhất Bá Tuật',
      email: 'contact.foodcom@gmail.com',
      quantity: 2,
      productName: 'Giường Điều Khiển Thông Minh',
      source: 'facebook',
      createdAt: new Date(),
      emailSent: false,
    },
    {
      id: 'lead-002',
      name: 'Lê Thị Hương',
      email: 'lethihuong@gmail.com',
      quantity: 3,
      productName: 'Giường Điều Khiển Thông Minh',
      source: 'facebook',
      createdAt: new Date(Date.now() - 86400000), // 1 ngày trước
      emailSent: false,
    },
  ];

  const results = [];
  let successful = 0;
  let failed = 0;

  for (const lead of newLeads) {
    if (lead.emailSent) {
      console.log(`[EMAIL-AUTOMATION] Lead ${lead.name} đã nhận email, bỏ qua`);
      continue;
    }

    try {
      const { subject, body, htmlBody } = createEmailTemplate(
        lead.name,
        lead.quantity,
        lead.productName
      );

      const result = await sendEmailToLead(
        lead.id,
        lead.name,
        lead.email,
        subject,
        body,
        htmlBody
      );

      if (result.success) {
        successful++;
        results.push({
          leadId: lead.id,
          leadName: lead.name,
          email: lead.email,
          status: 'success',
          messageId: result.messageId,
        });
      } else {
        failed++;
        results.push({
          leadId: lead.id,
          leadName: lead.name,
          email: lead.email,
          status: 'failed',
          error: result.error,
        });
      }
    } catch (error) {
      failed++;
      results.push({
        leadId: lead.id,
        leadName: lead.name,
        email: lead.email,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const log: EmailAutomationLog = {
    timestamp: startTime,
    totalLeads: newLeads.length,
    successful,
    failed,
    results,
  };

  automationLogs.push(log);

  // Giữ tối đa 100 logs
  if (automationLogs.length > 100) {
    automationLogs = automationLogs.slice(-100);
  }

  const endTime = new Date();
  const duration = endTime.getTime() - startTime.getTime();

  console.log('[EMAIL-AUTOMATION] Hoàn thành tự động hoá email', {
    totalLeads: newLeads.length,
    successful,
    failed,
    duration: `${duration}ms`,
  });

  return log;
}

/**
 * Lấy thống kê tự động hoá
 */
export function getAutomationStats() {
  const logs = automationLogs;
  
  if (logs.length === 0) {
    return {
      totalRuns: 0,
      totalLeads: 0,
      totalSent: 0,
      totalFailed: 0,
      successRate: 0,
      lastRun: null,
    };
  }

  const totalLeads = logs.reduce((sum, log) => sum + log.totalLeads, 0);
  const totalSent = logs.reduce((sum, log) => sum + log.successful, 0);
  const totalFailed = logs.reduce((sum, log) => sum + log.failed, 0);

  return {
    totalRuns: logs.length,
    totalLeads,
    totalSent,
    totalFailed,
    successRate: totalLeads > 0 ? (totalSent / totalLeads) * 100 : 0,
    lastRun: logs[logs.length - 1]?.timestamp,
  };
}
