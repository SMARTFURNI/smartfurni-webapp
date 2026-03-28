/**
 * Email Template Service
 * Quản lý các mẫu email cho hệ thống tự động hoá
 */

import { productLaunchTemplates } from './product-launch-templates';

export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  variables: string[];
  isActive: boolean;
}

// 5 mẫu email cơ bản
const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome-default',
    name: 'Chào Mừng - Mẫu Mặc Định',
    description: 'Email chào mừng chuẩn cho lead mới từ Facebook',
    category: 'welcome',
    subject: 'Chào mừng {{leadName}} - Giải pháp {{productName}} - SmartFurni',
    bodyText: `Xin chào {{leadName}},

Cảm ơn bạn đã quan tâm đến {{productName}} của SmartFurni!

Chúng tôi rất vui được giới thiệu cho bạn giải pháp hoàn hảo cho nhu cầu của bạn.

5 Lợi Ích Chính:
✓ Tiết kiệm thời gian
✓ Tăng hiệu suất
✓ Giảm chi phí
✓ Dễ sử dụng
✓ Hỗ trợ 24/7

Hãy liên hệ với chúng tôi để biết thêm chi tiết:
📞 0123-456-789
💬 Chat: www.smartfurni.com/chat

---
SmartFurni Team`,
    bodyHtml: `<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Chào mừng {{leadName}}</h2>
    <p>Cảm ơn bạn đã quan tâm đến <strong>{{productName}}</strong> của SmartFurni!</p>
    <p>Chúng tôi rất vui được giới thiệu cho bạn giải pháp hoàn hảo.</p>
    <ul>
      <li>✓ Tiết kiệm thời gian</li>
      <li>✓ Tăng hiệu suất</li>
      <li>✓ Giảm chi phí</li>
    </ul>
  </div>
</body>
</html>`,
    variables: ['leadName', 'productName'],
    isActive: true,
  },
  {
    id: 'followup-24h',
    name: 'Follow-up - 24 Giờ',
    description: 'Email follow-up sau 24 giờ không có phản hồi',
    category: 'followup',
    subject: 'Bạn có thắc mắc gì về {{productName}} không, {{leadName}}?',
    bodyText: `Xin chào {{leadName}},

Tôi vừa gửi cho bạn email về {{productName}}.

Bạn có thắc mắc gì không? Chúng tôi sẵn sàng giúp!

3 Cách Liên Hệ:
📞 Gọi: 0123-456-789
💬 Chat: www.smartfurni.com/chat
📧 Email: support@smartfurni.com

---
SmartFurni Team`,
    bodyHtml: `<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Bạn có thắc mắc gì không?</h2>
    <p>Chúng tôi sẵn sàng giúp bạn!</p>
  </div>
</body>
</html>`,
    variables: ['leadName', 'productName'],
    isActive: true,
  },
  {
    id: 'special-offer-limited',
    name: 'Ưu Đãi Đặc Biệt - Giới Hạn',
    description: 'Email ưu đãi đặc biệt có thời hạn',
    category: 'special_offer',
    subject: '🎁 Ưu Đãi Đặc Biệt Cho {{leadName}} - Giảm 20% Hôm Nay!',
    bodyText: `Xin chào {{leadName}},

Chúng tôi có ưu đãi đặc biệt cho bạn!

🎁 GIẢM 20%
Cho {{productName}}

Giá thông thường: {{regularPrice}}
Giá ưu đãi: {{discountPrice}}
Tiết kiệm: {{savings}}

⏰ Chỉ hôm nay (Đến {{expiryTime}})

Đặt hàng ngay: [Link Order]

---
SmartFurni Team`,
    bodyHtml: `<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #C9A84C;">🎁 Ưu Đãi Đặc Biệt</h2>
    <p>Giảm 20% cho {{productName}}</p>
  </div>
</body>
</html>`,
    variables: ['leadName', 'productName', 'regularPrice', 'discountPrice', 'savings', 'expiryTime'],
    isActive: true,
  },
  {
    id: 'reminder-abandoned',
    name: 'Nhắc Nhở - Giỏ Hàng Bỏ Lại',
    description: 'Email nhắc nhở khách hàng về giỏ hàng chưa thanh toán',
    category: 'reminder',
    subject: 'Bạn quên {{productName}} trong giỏ hàng rồi!',
    bodyText: `Xin chào {{leadName}},

Bạn có {{quantity}} {{productName}} trong giỏ hàng nhưng chưa thanh toán.

Giá: {{price}}

Hoàn tất đơn hàng: [Link Order]

Nếu có vấn đề gì, hãy liên hệ:
📞 0123-456-789

---
SmartFurni Team`,
    bodyHtml: `<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Bạn quên giỏ hàng rồi!</h2>
    <p>Bạn có <strong>{{quantity}}</strong> {{productName}} trong giỏ hàng.</p>
  </div>
</body>
</html>`,
    variables: ['leadName', 'productName', 'quantity', 'price'],
    isActive: true,
  },
  {
    id: 'feedback-post-purchase',
    name: 'Phản Hồi - Sau Mua Hàng',
    description: 'Email yêu cầu phản hồi sau khi khách hàng mua hàng',
    category: 'feedback',
    subject: 'Bạn hài lòng với {{productName}} không, {{leadName}}?',
    bodyText: `Xin chào {{leadName}},

Cảm ơn bạn đã mua {{productName}} từ chúng tôi!

Chúng tôi rất quan tâm đến ý kiến của bạn.

Bạn vui lòng dành 2 phút để đánh giá sản phẩm?

Đánh giá: [Link Review]

Nếu có vấn đề gì, chúng tôi cam kết giải quyết trong 24 giờ.

---
SmartFurni Team`,
    bodyHtml: `<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Cảm ơn bạn!</h2>
    <p>Chúng tôi rất quan tâm đến ý kiến của bạn về {{productName}}.</p>
  </div>
</body>
</html>`,
    variables: ['leadName', 'productName'],
    isActive: true,
  },
];

// Lưu trữ templates (trong production, lưu vào database)
let templates: EmailTemplate[] = [...DEFAULT_TEMPLATES];

// Thêm mẫu ra mắt sản phẩm
Object.values(productLaunchTemplates).forEach((template: any) => {
  if (template.id && !template.steps) {
    templates.push({
      ...template,
      isActive: true,
    });
  }
});

/**
 * Lấy tất cả templates
 */
export function getAllTemplates(): EmailTemplate[] {
  return [...templates];
}

/**
 * Lấy templates theo danh mục
 */
export function getTemplatesByCategory(category: string): EmailTemplate[] {
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
export function createTemplate(template: Omit<EmailTemplate, 'id'>): EmailTemplate {
  const newTemplate: EmailTemplate = {
    ...template,
    id: `template-${Date.now()}`,
  };

  templates.push(newTemplate);
  console.log('[EMAIL-TEMPLATE] Template mới được tạo:', newTemplate.id);

  return newTemplate;
}

/**
 * Cập nhật template
 */
export function updateTemplate(id: string, updates: Partial<Omit<EmailTemplate, 'id'>>): EmailTemplate | null {
  const index = templates.findIndex((t) => t.id === id);

  if (index === -1) {
    console.error('[EMAIL-TEMPLATE] Template không tìm thấy:', id);
    return null;
  }

  templates[index] = {
    ...templates[index],
    ...updates,
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

  // Thay thế tất cả variables
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    subject = subject.replace(new RegExp(placeholder, 'g'), value);
    bodyText = bodyText.replace(new RegExp(placeholder, 'g'), value);
    bodyHtml = bodyHtml.replace(new RegExp(placeholder, 'g'), value);
  });

  return { subject, bodyText, bodyHtml };
}

/**
 * Validate template variables
 */
export function validateTemplateVariables(
  template: EmailTemplate,
  variables: Record<string, string>
): { valid: boolean; missingVariables: string[] } {
  const missingVariables = template.variables.filter((v) => !variables[v]);

  return {
    valid: missingVariables.length === 0,
    missingVariables,
  };
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
      product_launch: templates.filter((t) => t.category === 'product_launch').length,
    },
  };
}

/**
 * Reset templates về mặc định
 */
export function resetTemplates(): void {
  templates = [...DEFAULT_TEMPLATES];
  Object.values(productLaunchTemplates).forEach((template: any) => {
    if (template.id && !template.steps) {
      templates.push({
        ...template,
        isActive: true,
      });
    }
  });
  console.log('[EMAIL-TEMPLATE] Templates đã được reset về mặc định');
}
