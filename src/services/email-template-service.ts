/**
 * Email Template Service
 * Quản lý các mẫu email cho hệ thống tự động hoá
 */

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: 'welcome' | 'followup' | 'special_offer' | 'reminder' | 'feedback';
  subject: string;
  bodyText: string;
  bodyHtml: string;
  variables: string[]; // Ví dụ: ['leadName', 'quantity', 'productName']
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Các mẫu email mặc định
const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome-default',
    name: 'Chào Mừng - Mẫu Mặc Định',
    description: 'Email chào mừng chuẩn cho lead mới từ Facebook',
    category: 'welcome',
    subject: 'Chào mừng {{leadName}} - Giải pháp {{productName}} - SmartFurni',
    bodyText: `Xin chào {{leadName}},

Cảm ơn bạn đã quan tâm đến {{productName}} của SmartFurni!

Chúng tôi rất vui được giới thiệu cho bạn giải pháp hoàn hảo cho {{quantity}} phòng của bạn.

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
Đội ngũ SmartFurni`,
    bodyHtml: `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Xin chào {{leadName}},</h2>
            <p>Cảm ơn bạn đã quan tâm đến <strong>{{productName}}</strong> của SmartFurni!</p>
            <p>Chúng tôi rất vui được giới thiệu cho bạn giải pháp hoàn hảo cho <strong>{{quantity}} phòng</strong> của bạn.</p>
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
          </div>
        </body>
      </html>
    `,
    variables: ['leadName', 'productName', 'quantity'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  },
  {
    id: 'followup-24h',
    name: 'Follow-up - 24 Giờ',
    description: 'Email follow-up sau 24 giờ không có phản hồi',
    category: 'followup',
    subject: 'Bạn có thắc mắc gì về {{productName}} không, {{leadName}}?',
    bodyText: `Xin chào {{leadName}},

Chúng tôi nhận thấy bạn chưa có phản hồi về email trước đó.

Chúng tôi muốn chắc chắn rằng bạn có tất cả thông tin cần thiết về {{productName}}.

Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi:
📞 Điện thoại: 0123-456-789
📧 Email: support@smartfurni.com
💬 Chat: https://smartfurni.com/chat

Hoặc bạn có thể:
- Xem video demo: https://smartfurni.com/demo-video
- Đọc đánh giá khách hàng: https://smartfurni.com/reviews
- Tính giá: https://smartfurni.com/calculator

Chúng tôi sẵn sàng giúp bạn!

Trân trọng,
Đội ngũ SmartFurni`,
    bodyHtml: `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Xin chào {{leadName}},</h2>
            <p>Chúng tôi nhận thấy bạn chưa có phản hồi về email trước đó.</p>
            <p>Chúng tôi muốn chắc chắn rằng bạn có tất cả thông tin cần thiết về <strong>{{productName}}</strong>.</p>
            <h3>Nếu bạn có bất kỳ câu hỏi nào:</h3>
            <ul>
              <li>📞 Điện thoại: <strong>0123-456-789</strong></li>
              <li>📧 Email: <strong>support@smartfurni.com</strong></li>
              <li>💬 Chat: <a href="https://smartfurni.com/chat">Trò chuyện trực tiếp</a></li>
            </ul>
            <h3>Hoặc bạn có thể:</h3>
            <ul>
              <li><a href="https://smartfurni.com/demo-video">Xem video demo</a></li>
              <li><a href="https://smartfurni.com/reviews">Đọc đánh giá khách hàng</a></li>
              <li><a href="https://smartfurni.com/calculator">Tính giá</a></li>
            </ul>
            <p style="margin-top: 30px; color: #666;">
              Chúng tôi sẵn sàng giúp bạn!<br>
              <strong>Đội ngũ SmartFurni</strong>
            </p>
          </div>
        </body>
      </html>
    `,
    variables: ['leadName', 'productName'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  },
  {
    id: 'special-offer-limited',
    name: 'Ưu Đãi Đặc Biệt - Giới Hạn',
    description: 'Email ưu đãi đặc biệt có thời hạn',
    category: 'special_offer',
    subject: '🎁 Ưu Đãi Đặc Biệt Cho {{leadName}} - Giảm 20% Hôm Nay!',
    bodyText: `Xin chào {{leadName}},

Chúng tôi có một ưu đãi đặc biệt dành riêng cho bạn!

🎁 GIẢM 20% cho {{productName}}
⏰ Chỉ có hiệu lực hôm nay ({{offerDate}})
📦 Bao gồm lắp đặt miễn phí

Giá thông thường: {{regularPrice}}
Giá ưu đãi: {{discountPrice}}
Tiết kiệm: {{savings}}

Đây là cơ hội tuyệt vời để nâng cấp không gian ngủ của bạn với giá tốt nhất!

Đặt hàng ngay:
🛒 Online: https://smartfurni.com/order?code=SAVE20
📞 Gọi: 0123-456-789
💬 Chat: https://smartfurni.com/chat

Lưu ý: Ưu đãi này chỉ có hiệu lực trong 24 giờ!

Trân trọng,
Đội ngũ SmartFurni`,
    bodyHtml: `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Xin chào {{leadName}},</h2>
            <p>Chúng tôi có một <strong style="color: #C9A84C;">ưu đãi đặc biệt</strong> dành riêng cho bạn!</p>
            <div style="background: #C9A84C; color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h3 style="margin: 0; font-size: 24px;">🎁 GIẢM 20%</h3>
              <p style="margin: 10px 0;">cho {{productName}}</p>
              <p style="margin: 0; font-size: 14px;">⏰ Chỉ hôm nay ({{offerDate}})</p>
            </div>
            <h3>Chi Tiết Ưu Đãi:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px;">Giá thông thường:</td>
                <td style="padding: 10px; text-align: right;"><strong>{{regularPrice}}</strong></td>
              </tr>
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 10px;">Giá ưu đãi:</td>
                <td style="padding: 10px; text-align: right;"><strong style="color: #22C55E;">{{discountPrice}}</strong></td>
              </tr>
              <tr style="background: #f0f0f0;">
                <td style="padding: 10px;">Tiết kiệm:</td>
                <td style="padding: 10px; text-align: right;"><strong style="color: #C9A84C;">{{savings}}</strong></td>
              </tr>
            </table>
            <p style="margin-top: 20px;">📦 Bao gồm lắp đặt miễn phí</p>
            <h3>Đặt Hàng Ngay:</h3>
            <div style="text-align: center; margin: 20px 0;">
              <a href="https://smartfurni.com/order?code=SAVE20" style="background: #C9A84C; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block;">🛒 Đặt Hàng Online</a>
            </div>
            <p>Hoặc liên hệ:</p>
            <ul>
              <li>📞 Gọi: <strong>0123-456-789</strong></li>
              <li>💬 <a href="https://smartfurni.com/chat">Chat trực tiếp</a></li>
            </ul>
            <p style="color: #EF4444; font-weight: bold;">⚠️ Lưu ý: Ưu đãi này chỉ có hiệu lực trong 24 giờ!</p>
          </div>
        </body>
      </html>
    `,
    variables: ['leadName', 'productName', 'offerDate', 'regularPrice', 'discountPrice', 'savings'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  },
  {
    id: 'reminder-abandoned',
    name: 'Nhắc Nhở - Giỏ Hàng Bỏ Lại',
    description: 'Email nhắc nhở khách hàng về giỏ hàng chưa thanh toán',
    category: 'reminder',
    subject: 'Bạn quên {{productName}} trong giỏ hàng rồi!',
    bodyText: `Xin chào {{leadName}},

Chúng tôi nhận thấy bạn đã thêm {{productName}} vào giỏ hàng nhưng chưa hoàn tất đơn hàng.

Có phải bạn có thắc mắc gì không? Chúng tôi sẵn sàng giúp!

Thông tin đơn hàng:
- Sản phẩm: {{productName}}
- Số lượng: {{quantity}}
- Giá: {{price}}

Hoàn tất đơn hàng:
🛒 Tiếp tục mua sắm: https://smartfurni.com/cart
📞 Gọi để tư vấn: 0123-456-789

Hoặc nếu bạn có thắc mắc:
- Xem câu hỏi thường gặp: https://smartfurni.com/faq
- Chat với chúng tôi: https://smartfurni.com/chat

Cảm ơn bạn đã chọn SmartFurni!

Trân trọng,
Đội ngũ SmartFurni`,
    bodyHtml: `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Xin chào {{leadName}},</h2>
            <p>Chúng tôi nhận thấy bạn đã thêm <strong>{{productName}}</strong> vào giỏ hàng nhưng chưa hoàn tất đơn hàng.</p>
            <p>Có phải bạn có thắc mắc gì không? Chúng tôi sẵn sàng giúp!</p>
            <div style="background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Thông Tin Đơn Hàng:</h3>
              <ul style="list-style: none; padding: 0;">
                <li>📦 Sản phẩm: <strong>{{productName}}</strong></li>
                <li>📊 Số lượng: <strong>{{quantity}}</strong></li>
                <li>💰 Giá: <strong>{{price}}</strong></li>
              </ul>
            </div>
            <h3>Hoàn Tất Đơn Hàng:</h3>
            <div style="text-align: center; margin: 20px 0;">
              <a href="https://smartfurni.com/cart" style="background: #C9A84C; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block;">🛒 Tiếp Tục Mua Sắm</a>
            </div>
            <p>Hoặc gọi để tư vấn: <strong>0123-456-789</strong></p>
            <h3>Có Thắc Mắc?</h3>
            <ul>
              <li><a href="https://smartfurni.com/faq">Xem câu hỏi thường gặp</a></li>
              <li><a href="https://smartfurni.com/chat">Chat với chúng tôi</a></li>
            </ul>
            <p style="margin-top: 30px; color: #666;">
              Cảm ơn bạn đã chọn SmartFurni!<br>
              <strong>Đội ngũ SmartFurni</strong>
            </p>
          </div>
        </body>
      </html>
    `,
    variables: ['leadName', 'productName', 'quantity', 'price'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  },
  {
    id: 'feedback-post-purchase',
    name: 'Phản Hồi - Sau Mua Hàng',
    description: 'Email yêu cầu phản hồi sau khi khách hàng mua hàng',
    category: 'feedback',
    subject: 'Bạn hài lòng với {{productName}} không, {{leadName}}?',
    bodyText: `Xin chào {{leadName}},

Cảm ơn bạn đã mua {{productName}} từ SmartFurni!

Chúng tôi rất mong muốn biết bạn hài lòng với sản phẩm và dịch vụ của chúng tôi như thế nào.

Vui lòng dành 2 phút để chia sẻ phản hồi của bạn:
⭐ Đánh giá sản phẩm: https://smartfurni.com/review/{{orderId}}

Phản hồi của bạn sẽ giúp chúng tôi cải thiện dịch vụ!

Nếu bạn có bất kỳ vấn đề nào:
📞 Hỗ trợ: 0123-456-789
📧 Email: support@smartfurni.com
💬 Chat: https://smartfurni.com/chat

Chúng tôi cam k承 sẽ giải quyết mọi vấn đề trong 24 giờ!

Cảm ơn bạn đã tin tưởng SmartFurni!

Trân trọng,
Đội ngũ SmartFurni`,
    bodyHtml: `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Xin chào {{leadName}},</h2>
            <p>Cảm ơn bạn đã mua <strong>{{productName}}</strong> từ SmartFurni!</p>
            <p>Chúng tôi rất mong muốn biết bạn hài lòng với sản phẩm và dịch vụ của chúng tôi như thế nào.</p>
            <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h3 style="margin-top: 0;">Chia Sẻ Phản Hồi Của Bạn</h3>
              <p>Vui lòng dành 2 phút để đánh giá:</p>
              <a href="https://smartfurni.com/review/{{orderId}}" style="background: #C9A84C; color: white; padding: 12px 30px; border-radius: 5px; text-decoration: none; display: inline-block;">⭐ Đánh Giá Sản Phẩm</a>
              <p style="margin-top: 15px; font-size: 14px; color: #666;">Phản hồi của bạn sẽ giúp chúng tôi cải thiện dịch vụ!</p>
            </div>
            <h3>Có Vấn Đề?</h3>
            <p>Nếu bạn có bất kỳ vấn đề nào, vui lòng liên hệ:</p>
            <ul>
              <li>📞 Hỗ trợ: <strong>0123-456-789</strong></li>
              <li>📧 Email: <strong>support@smartfurni.com</strong></li>
              <li>💬 <a href="https://smartfurni.com/chat">Chat trực tiếp</a></li>
            </ul>
            <p style="background: #22C55E; color: white; padding: 10px; border-radius: 5px; text-align: center;">
              ✅ Chúng tôi cam kết giải quyết mọi vấn đề trong 24 giờ!
            </p>
            <p style="margin-top: 30px; color: #666;">
              Cảm ơn bạn đã tin tưởng SmartFurni!<br>
              <strong>Đội ngũ SmartFurni</strong>
            </p>
          </div>
        </body>
      </html>
    `,
    variables: ['leadName', 'productName', 'orderId'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
  },
];

// Lưu trữ templates (trong production, lưu vào database)
let templates: EmailTemplate[] = [...DEFAULT_TEMPLATES];

/**
 * Lấy tất cả templates
 */
export function getAllTemplates(): EmailTemplate[] {
  return [...templates];
}

/**
 * Lấy templates theo category
 */
export function getTemplatesByCategory(category: EmailTemplate['category']): EmailTemplate[] {
  return templates.filter((t) => t.category === category);
}

/**
 * Lấy template theo ID
 */
export function getTemplateById(id: string): EmailTemplate | null {
  return templates.find((t) => t.id === id) || null;
}

/**
 * Tạo template mới
 */
export function createTemplate(template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): EmailTemplate {
  const newTemplate: EmailTemplate = {
    ...template,
    id: `template-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  templates.push(newTemplate);
  console.log('[EMAIL-TEMPLATE] Template mới được tạo:', newTemplate.id);

  return newTemplate;
}

/**
 * Cập nhật template
 */
export function updateTemplate(id: string, updates: Partial<Omit<EmailTemplate, 'id' | 'createdAt'>>): EmailTemplate | null {
  const index = templates.findIndex((t) => t.id === id);

  if (index === -1) {
    console.error('[EMAIL-TEMPLATE] Template không tìm thấy:', id);
    return null;
  }

  templates[index] = {
    ...templates[index],
    ...updates,
    updatedAt: new Date(),
  };

  console.log('[EMAIL-TEMPLATE] Template được cập nhật:', id);

  return templates[index];
}

/**
 * Xóa template
 */
export function deleteTemplate(id: string): boolean {
  const index = templates.findIndex((t) => t.id === id);

  if (index === -1) {
    console.error('[EMAIL-TEMPLATE] Template không tìm thấy:', id);
    return false;
  }

  templates.splice(index, 1);
  console.log('[EMAIL-TEMPLATE] Template được xóa:', id);

  return true;
}

/**
 * Render template với variables
 */
export function renderTemplate(template: EmailTemplate, variables: Record<string, string>): {
  subject: string;
  bodyText: string;
  bodyHtml: string;
} {
  let subject = template.subject;
  let bodyText = template.bodyText;
  let bodyHtml = template.bodyHtml;

  // Replace variables
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, value);
    bodyText = bodyText.replace(regex, value);
    bodyHtml = bodyHtml.replace(regex, value);
  });

  return { subject, bodyText, bodyHtml };
}

/**
 * Lấy danh sách variables trong template
 */
export function getTemplateVariables(template: EmailTemplate): string[] {
  return template.variables;
}

/**
 * Kiểm tra template có tất cả variables cần thiết không
 */
export function validateTemplateVariables(template: EmailTemplate, variables: Record<string, string>): {
  valid: boolean;
  missingVariables: string[];
} {
  const missingVariables = template.variables.filter((v) => !variables[v]);

  return {
    valid: missingVariables.length === 0,
    missingVariables,
  };
}

/**
 * Reset templates về mặc định
 */
export function resetTemplates(): void {
  templates = [...DEFAULT_TEMPLATES];
  console.log('[EMAIL-TEMPLATE] Templates đã được reset về mặc định');
}

/**
 * Lấy thống kê templates
 */
export function getTemplateStats() {
  return {
    total: templates.length,
    active: templates.filter((t) => t.isActive).length,
    byCategory: {
      welcome: templates.filter((t) => t.category === 'welcome').length,
      followup: templates.filter((t) => t.category === 'followup').length,
      special_offer: templates.filter((t) => t.category === 'special_offer').length,
      reminder: templates.filter((t) => t.category === 'reminder').length,
      feedback: templates.filter((t) => t.category === 'feedback').length,
    },
  };
}
