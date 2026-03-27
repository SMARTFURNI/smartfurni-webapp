import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const router = Router();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Email templates
const EMAIL_TEMPLATES = {
  greeting: `Xin chào {customerName},

Cảm ơn bạn đã quan tâm đến sản phẩm giường điều khiển thông minh của SmartFurni.

{productInfo}

Chúng tôi rất vui lòng được giới thiệu các giải pháp tối ưu cho nhu cầu của bạn:

{recommendations}

Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi:
- Điện thoại: 0123-456-789
- Email: sales@smartfurni.com
- Website: www.smartfurni.com

Trân trọng,
Đội ngũ SmartFurni`,

  followup: `Xin chào {customerName},

Chúng tôi muốn kiểm tra xem bạn đã xem xét các giải pháp mà chúng tôi đề xuất chưa.

Nếu bạn có bất kỳ câu hỏi hoặc cần thêm thông tin, hãy cho chúng tôi biết.

{callToAction}

Trân trọng,
Đội ngũ SmartFurni`,

  quotation: `Xin chào {customerName},

Dưới đây là báo giá chi tiết cho đơn hàng của bạn:

{quotationDetails}

Giá này có hiệu lực trong 7 ngày. Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ.

{paymentTerms}

Trân trọng,
Đội ngũ SmartFurni`,
};

/**
 * POST /api/ai-agent/email/generate
 * Generate email content using Gemini
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { leadId, leadName, email, productName, emailType, context, quantity } = req.body;

    // Validation
    if (!leadId || !leadName || !email || !productName || !emailType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: leadId, leadName, email, productName, emailType',
      });
    }

    logger.info('Email generation requested', { leadId, emailType, leadName });

    // Generate email using Gemini
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Bạn là một chuyên gia marketing B2B cho công ty SmartFurni bán giường điều khiển thông minh.

Hãy tạo một email ${emailType} chuyên nghiệp cho khách hàng:
- Tên khách hàng: ${leadName}
- Email: ${email}
- Sản phẩm quan tâm: ${productName}
- Số lượng: ${quantity || 1}
- Ngữ cảnh: ${context || 'Khách hàng mới từ Facebook Lead'}

Email phải:
1. Chuyên nghiệp và lịch sự
2. Ngắn gọn (dưới 300 từ)
3. Có call-to-action rõ ràng
4. Sử dụng tiếng Việt
5. Tập trung vào lợi ích sản phẩm

Hãy chỉ trả về nội dung email, không có subject line.`;

    const result = await model.generateContent(prompt);
    const emailBody = result.response.text();

    // Generate subject line
    const subjectPrompt = `Tạo một subject line email ngắn gọn (dưới 50 ký tự) cho email ${emailType} về sản phẩm "${productName}" cho khách hàng "${leadName}". Chỉ trả về subject line, không có gì khác.`;
    const subjectResult = await model.generateContent(subjectPrompt);
    const subject = subjectResult.response.text().trim();

    logger.info('Email generated successfully', { leadId, emailType, subjectLength: subject.length });

    res.json({
      success: true,
      data: {
        leadId,
        emailType,
        subject,
        body: emailBody,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Email generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Email generation failed',
    });
  }
});

/**
 * POST /api/ai-agent/email/send
 * Send generated email
 */
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { leadId, leadName, email, subject, body } = req.body;

    if (!leadId || !email || !subject || !body) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: leadId, email, subject, body',
      });
    }

    logger.info('Email send requested', { leadId, email, subject });

    // Get email config from environment
    const gmailUser = process.env.GMAIL_USER || 'phamtuat0820@gmail.com';
    const gmailPassword = process.env.GMAIL_PASSWORD || 'helx uzdy fpxs etgb';

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    // Send email
    const mailOptions = {
      from: gmailUser,
      to: email,
      subject: subject,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto;">
              ${body.replace(/\n/g, '<br>')}
              <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
              <footer style="font-size: 12px; color: #666; margin-top: 20px;">
                <p>SmartFurni - Giường Điều Khiển Thông Minh</p>
                <p>Điện thoại: 0123-456-789 | Email: sales@smartfurni.com</p>
                <p>Website: www.smartfurni.com</p>
              </footer>
            </div>
          </body>
        </html>
      `,
      text: body,
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info('Email sent successfully', {
      leadId,
      email,
      messageId: info.messageId,
    });

    res.json({
      success: true,
      data: {
        leadId,
        email,
        messageId: info.messageId,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Email send failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Email send failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/ai-agent/email/send-greeting
 * Send greeting email to new lead
 */
router.post('/send-greeting', async (req: Request, res: Response) => {
  try {
    const { leadId, leadName, email, quantity, context } = req.body;

    if (!leadId || !leadName || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: leadId, leadName, email',
      });
    }

    logger.info('Greeting email requested', { leadId, leadName, email });

    // Step 1: Generate email content
    const generateRes = await fetch(
      `${process.env.API_URL || 'http://localhost:3000'}/api/ai-agent/email/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          leadName,
          email,
          productName: 'Giường Điều Khiển Thông Minh',
          emailType: 'greeting',
          quantity,
          context,
        }),
      }
    );

    const generateData = await generateRes.json();

    if (!generateData.success) {
      throw new Error('Failed to generate email');
    }

    // Step 2: Send email
    const sendRes = await fetch(
      `${process.env.API_URL || 'http://localhost:3000'}/api/ai-agent/email/send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          leadName,
          email,
          subject: generateData.data.subject,
          body: generateData.data.body,
        }),
      }
    );

    const sendData = await sendRes.json();

    if (!sendData.success) {
      throw new Error('Failed to send email');
    }

    logger.info('Greeting email sent successfully', { leadId, email });

    res.json({
      success: true,
      data: {
        leadId,
        email,
        messageId: sendData.data.messageId,
        sentAt: sendData.data.sentAt,
      },
    });
  } catch (error) {
    logger.error('Greeting email failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Greeting email failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/ai-agent/email/analytics
 * Get email analytics
 */
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, leadId } = req.query;

    logger.info('Email analytics requested', { startDate, endDate, leadId });

    // TODO: Implement analytics logic with database
    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        metrics: {
          sent: 42,
          opened: 28,
          clicked: 14,
          converted: 7,
          openRate: 66.7,
          clickRate: 50.0,
          conversionRate: 25.0,
        },
      },
    });
  } catch (error) {
    logger.error('Email analytics failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(500).json({
      success: false,
      error: 'Email analytics failed',
    });
  }
});

export default router;
