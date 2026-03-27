import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { leadId, leadName, email, quantity, context } = await request.json();

    if (!leadId || !leadName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId, leadName, email' },
        { status: 400 }
      );
    }

    console.log('Greeting email requested', { leadId, leadName, email });

    // Step 1: Generate email content using Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Bạn là một chuyên gia marketing B2B cho công ty SmartFurni bán giường điều khiển thông minh.

Hãy tạo một email chào hàng chuyên nghiệp cho khách hàng:
- Tên khách hàng: ${leadName}
- Email: ${email}
- Sản phẩm quan tâm: Giường Điều Khiển Thông Minh
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
    const subjectPrompt = `Tạo một subject line email ngắn gọn (dưới 50 ký tự) cho email chào hàng về sản phẩm "Giường Điều Khiển Thông Minh" cho khách hàng "${leadName}". Chỉ trả về subject line, không có gì khác.`;
    const subjectResult = await model.generateContent(subjectPrompt);
    const subject = subjectResult.response.text().trim();

    console.log('Email generated successfully', { leadId, subject });

    // Step 2: Send email using Gmail SMTP
    const gmailUser = process.env.GMAIL_USER || 'phamtuat0820@gmail.com';
    const gmailPassword = process.env.GMAIL_PASSWORD || 'helx uzdy fpxs etgb';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    const mailOptions = {
      from: gmailUser,
      to: email,
      subject: subject,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto;">
              ${emailBody.replace(/\n/g, '<br>')}
              <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
              <footer style="font-size: 12px; color: #666; margin-top: 20px;">
                <p><strong>SmartFurni - Giường Điều Khiển Thông Minh</strong></p>
                <p>Điện thoại: 0123-456-789 | Email: sales@smartfurni.com</p>
                <p>Website: www.smartfurni.com</p>
              </footer>
            </div>
          </body>
        </html>
      `,
      text: emailBody,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('Email sent successfully', {
      leadId,
      email,
      messageId: info.messageId,
    });

    return NextResponse.json({
      success: true,
      data: {
        leadId,
        email,
        messageId: info.messageId,
        subject,
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Greeting email failed', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Greeting email failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
