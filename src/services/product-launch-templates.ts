/**
 * Mẫu Email Cho Chiến Dịch Ra Mắt Sản Phẩm Mới
 * 5 bước: Teaser → Announcement → Demo → Offer → Follow-up
 */

export const productLaunchTemplates = {
  // Bước 1: Teaser - Tạo kỳ vọng
  teaser: {
    id: 'launch-teaser',
    name: 'Ra Mắt Sản Phẩm - Teaser',
    category: 'product_launch',
    subject: '🚀 Cái gì sắp tới từ SmartFurni sẽ thay đổi cuộc sống của bạn?',
    bodyText: `Xin chào {{leadName}},

Chúng tôi rất vui được thông báo rằng một sản phẩm hoàn toàn mới sắp ra mắt!

Đây không chỉ là một sản phẩm thông thường. Đây là kết quả của 2 năm nghiên cứu và phát triển.

Bạn sẽ là một trong những người đầu tiên biết về nó.

Hãy chờ đợi... 👀

---
SmartFurni Team
www.smartfurni.com`,
    bodyHtml: `<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>🚀 Cái gì sắp tới từ SmartFurni sẽ thay đổi cuộc sống của bạn?</h2>
    
    <p>Xin chào <strong>{{leadName}}</strong>,</p>
    
    <p>Chúng tôi rất vui được thông báo rằng một sản phẩm hoàn toàn mới sắp ra mắt!</p>
    
    <p style="font-size: 16px; font-weight: bold; color: #C9A84C;">
      Đây không chỉ là một sản phẩm thông thường.
    </p>
    
    <p>Đây là kết quả của <strong>2 năm</strong> nghiên cứu và phát triển.</p>
    
    <p>Bạn sẽ là một trong những người đầu tiên biết về nó.</p>
    
    <p style="font-size: 18px; margin: 30px 0;">Hãy chờ đợi... 👀</p>
    
    <hr style="margin: 30px 0;">
    <p style="color: #666; font-size: 12px;">
      SmartFurni Team<br>
      www.smartfurni.com
    </p>
  </div>
</body>
</html>`,
    variables: ['leadName'],
  },

  // Bước 2: Announcement - Công bố chính thức
  announcement: {
    id: 'launch-announcement',
    name: 'Ra Mắt Sản Phẩm - Công Bố',
    category: 'product_launch',
    subject: '✨ Chính Thức Ra Mắt: {{productName}} - Giải Pháp Tương Lai',
    bodyText: `Xin chào {{leadName}},

Chúng tôi rất vui thông báo: {{productName}} đã chính thức ra mắt!

🎯 Tính Năng Chính:
✓ {{feature1}}
✓ {{feature2}}
✓ {{feature3}}
✓ {{feature4}}

💰 Giá Đặc Biệt Ra Mắt: {{launchPrice}}
(Giảm {{discount}}% so với giá bình thường)

⏰ Ưu Đãi Có Thời Hạn: Chỉ 7 ngày

Xem video demo: [Link Video]
Đọc bài viết chi tiết: [Link Blog]

---
SmartFurni Team
www.smartfurni.com`,
    bodyHtml: `<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #C9A84C;">✨ Chính Thức Ra Mắt: {{productName}}</h2>
    
    <p>Xin chào <strong>{{leadName}}</strong>,</p>
    
    <p style="font-size: 16px;">Chúng tôi rất vui thông báo: <strong>{{productName}}</strong> đã chính thức ra mắt!</p>
    
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3>🎯 Tính Năng Chính:</h3>
      <ul>
        <li>✓ {{feature1}}</li>
        <li>✓ {{feature2}}</li>
        <li>✓ {{feature3}}</li>
        <li>✓ {{feature4}}</li>
      </ul>
    </div>
    
    <div style="background: #C9A84C; color: white; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
      <p style="font-size: 14px; margin: 0;">💰 Giá Đặc Biệt Ra Mắt</p>
      <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">{{launchPrice}}</p>
      <p style="font-size: 12px; margin: 0;">Giảm {{discount}}% so với giá bình thường</p>
      <p style="font-size: 12px; margin: 10px 0;">⏰ Chỉ 7 ngày</p>
    </div>
    
    <div style="text-align: center; margin: 20px 0;">
      <a href="[video-link]" style="background: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block; margin-right: 10px;">📹 Xem Video Demo</a>
      <a href="[blog-link]" style="background: #F59E0B; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">📖 Đọc Chi Tiết</a>
    </div>
    
    <hr style="margin: 30px 0;">
    <p style="color: #666; font-size: 12px;">
      SmartFurni Team<br>
      www.smartfurni.com
    </p>
  </div>
</body>
</html>`,
    variables: ['leadName', 'productName', 'feature1', 'feature2', 'feature3', 'feature4', 'launchPrice', 'discount'],
  },

  // Bước 3: Demo - Hướng dẫn sử dụng
  demo: {
    id: 'launch-demo',
    name: 'Ra Mắt Sản Phẩm - Demo',
    category: 'product_launch',
    subject: '📹 Xem Cách {{productName}} Hoạt Động - Video Demo 5 Phút',
    bodyText: `Xin chào {{leadName}},

Bạn có tò mò {{productName}} hoạt động như thế nào không?

Chúng tôi đã tạo một video demo 5 phút giải thích tất cả:

🎬 Video Demo: [Link Video]

Trong video, bạn sẽ thấy:
✓ Cách thiết lập ban đầu (chỉ 2 phút)
✓ Các tính năng chính
✓ Cách sử dụng hàng ngày
✓ Kết quả thực tế từ khách hàng

Hoặc, nếu bạn thích, chúng tôi có thể lên lịch một cuộc demo trực tiếp với bạn.

Bấm vào đây để đặt lịch: [Link Booking]

---
SmartFurni Team
www.smartfurni.com`,
    bodyHtml: `<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>📹 Xem Cách {{productName}} Hoạt Động</h2>
    
    <p>Xin chào <strong>{{leadName}}</strong>,</p>
    
    <p>Bạn có tò mò <strong>{{productName}}</strong> hoạt động như thế nào không?</p>
    
    <p style="font-size: 16px; font-weight: bold; color: #C9A84C;">
      Chúng tôi đã tạo một video demo 5 phút giải thích tất cả!
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="[video-link]" style="background: #EF4444; color: white; padding: 15px 30px; border-radius: 5px; text-decoration: none; display: inline-block; font-size: 16px; font-weight: bold;">▶️ Xem Video Demo</a>
    </div>
    
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3>Trong video, bạn sẽ thấy:</h3>
      <ul>
        <li>✓ Cách thiết lập ban đầu (chỉ 2 phút)</li>
        <li>✓ Các tính năng chính</li>
        <li>✓ Cách sử dụng hàng ngày</li>
        <li>✓ Kết quả thực tế từ khách hàng</li>
      </ul>
    </div>
    
    <p style="margin: 20px 0;">Hoặc, nếu bạn thích, chúng tôi có thể lên lịch một cuộc demo trực tiếp với bạn.</p>
    
    <div style="text-align: center; margin: 20px 0;">
      <a href="[booking-link]" style="background: #3B82F6; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">📅 Đặt Lịch Demo</a>
    </div>
    
    <hr style="margin: 30px 0;">
    <p style="color: #666; font-size: 12px;">
      SmartFurni Team<br>
      www.smartfurni.com
    </p>
  </div>
</body>
</html>`,
    variables: ['leadName', 'productName'],
  },

  // Bước 4: Special Offer - Ưu đãi độc quyền
  specialOffer: {
    id: 'launch-special-offer',
    name: 'Ra Mắt Sản Phẩm - Ưu Đãi',
    category: 'product_launch',
    subject: '🎁 Ưu Đãi Độc Quyền: {{discount}}% Giảm Cho {{leadName}} - Chỉ Hôm Nay!',
    bodyText: `Xin chào {{leadName}},

Vì bạn là một trong những khách hàng trung thành của SmartFurni, chúng tôi muốn tặng bạn một ưu đãi đặc biệt:

🎁 GIẢM {{discount}}%
Cho {{productName}}

Giá thông thường: {{regularPrice}}
Giá ưu đãi: {{discountPrice}}
Tiết kiệm: {{savings}}

⏰ Ưu Đãi Có Thời Hạn: Chỉ Hôm Nay (Đến {{expiryTime}})

Bấm vào đây để đặt hàng ngay: [Link Order]

Hoặc, liên hệ trực tiếp:
📞 0123-456-789
💬 Chat: www.smartfurni.com/chat

---
SmartFurni Team
www.smartfurni.com`,
    bodyHtml: `<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="text-align: center; color: #C9A84C;">🎁 Ưu Đãi Độc Quyền Cho {{leadName}}</h2>
    
    <p>Vì bạn là một trong những khách hàng trung thành của SmartFurni, chúng tôi muốn tặng bạn một ưu đãi đặc biệt:</p>
    
    <div style="background: linear-gradient(135deg, #C9A84C, #B89A3C); color: white; padding: 30px; border-radius: 10px; text-align: center; margin: 30px 0;">
      <p style="font-size: 24px; font-weight: bold; margin: 0;">GIẢM {{discount}}%</p>
      <p style="font-size: 16px; margin: 10px 0;">Cho {{productName}}</p>
    </div>
    
    <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">Giá thông thường:</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">{{regularPrice}}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #22C55E;">Giá ưu đãi:</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; color: #22C55E; font-weight: bold; font-size: 18px;">{{discountPrice}}</td>
        </tr>
        <tr>
          <td style="padding: 10px;">Tiết kiệm:</td>
          <td style="padding: 10px; text-align: right; font-weight: bold; color: #EF4444;">{{savings}}</td>
        </tr>
      </table>
    </div>
    
    <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold;">⏰ Ưu Đãi Có Thời Hạn: Chỉ Hôm Nay (Đến {{expiryTime}})</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="[order-link]" style="background: #22C55E; color: white; padding: 15px 40px; border-radius: 5px; text-decoration: none; display: inline-block; font-size: 16px; font-weight: bold;">✅ Đặt Hàng Ngay</a>
    </div>
    
    <p style="text-align: center; margin: 20px 0;">Hoặc liên hệ trực tiếp:</p>
    <div style="text-align: center; margin: 20px 0;">
      <p style="margin: 5px 0;">📞 <strong>0123-456-789</strong></p>
      <p style="margin: 5px 0;">💬 <a href="[chat-link]" style="color: #3B82F6;">Chat trực tiếp</a></p>
    </div>
    
    <hr style="margin: 30px 0;">
    <p style="color: #666; font-size: 12px;">
      SmartFurni Team<br>
      www.smartfurni.com
    </p>
  </div>
</body>
</html>`,
    variables: ['leadName', 'productName', 'discount', 'regularPrice', 'discountPrice', 'savings', 'expiryTime'],
  },

  // Bước 5: Follow-up - Nhắc nhở cuối cùng
  followUp: {
    id: 'launch-followup',
    name: 'Ra Mắt Sản Phẩm - Follow-up',
    category: 'product_launch',
    subject: '⏰ Lần Cuối: {{productName}} - Ưu Đãi Kết Thúc Trong 24 Giờ',
    bodyText: `Xin chào {{leadName}},

Đây là lần cuối nhắc bạn: Ưu đãi {{discount}}% cho {{productName}} sẽ kết thúc trong 24 giờ!

Bạn sẽ mất {{savings}} nếu không đặt hàng ngay.

🎯 Tại sao bạn nên chọn {{productName}}?
✓ {{benefit1}}
✓ {{benefit2}}
✓ {{benefit3}}

💬 Bạn vẫn có thắc mắc?
Chúng tôi có đội hỗ trợ 24/7 sẵn sàng giúp bạn.

📞 0123-456-789
💬 Chat: www.smartfurni.com/chat

Đặt hàng ngay: [Link Order]

---
SmartFurni Team
www.smartfurni.com`,
    bodyHtml: `<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #EF4444;">⏰ Lần Cuối: Ưu Đãi Kết Thúc Trong 24 Giờ</h2>
    
    <p>Xin chào <strong>{{leadName}}</strong>,</p>
    
    <p style="font-size: 16px; font-weight: bold;">Đây là lần cuối nhắc bạn: Ưu đãi <strong>{{discount}}%</strong> cho <strong>{{productName}}</strong> sẽ kết thúc trong <strong>24 giờ</strong>!</p>
    
    <div style="background: #FEE2E2; border-left: 4px solid #EF4444; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; font-weight: bold;">⚠️ Bạn sẽ mất <strong style="color: #EF4444;">{{savings}}</strong> nếu không đặt hàng ngay!</p>
    </div>
    
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3>🎯 Tại sao bạn nên chọn {{productName}}?</h3>
      <ul>
        <li>✓ {{benefit1}}</li>
        <li>✓ {{benefit2}}</li>
        <li>✓ {{benefit3}}</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="[order-link]" style="background: #EF4444; color: white; padding: 15px 40px; border-radius: 5px; text-decoration: none; display: inline-block; font-size: 16px; font-weight: bold;">🛒 Đặt Hàng Ngay</a>
    </div>
    
    <p style="margin: 20px 0;">💬 Bạn vẫn có thắc mắc?</p>
    <p>Chúng tôi có đội hỗ trợ 24/7 sẵn sàng giúp bạn.</p>
    
    <div style="text-align: center; margin: 20px 0;">
      <p style="margin: 5px 0;">📞 <strong>0123-456-789</strong></p>
      <p style="margin: 5px 0;">💬 <a href="[chat-link]" style="color: #3B82F6;">Chat trực tiếp</a></p>
    </div>
    
    <hr style="margin: 30px 0;">
    <p style="color: #666; font-size: 12px;">
      SmartFurni Team<br>
      www.smartfurni.com
    </p>
  </div>
</body>
</html>`,
    variables: ['leadName', 'productName', 'discount', 'savings', 'benefit1', 'benefit2', 'benefit3'],
  },
};

/**
 * Kịch bản chiến dịch ra mắt sản phẩm
 */
export const productLaunchScenario = {
  id: 'scenario-product-launch',
  name: 'Chiến Dịch Ra Mắt Sản Phẩm Mới',
  description: 'Chuỗi email 5 bước cho chiến dịch ra mắt sản phẩm mới: Teaser → Announcement → Demo → Offer → Follow-up',
  trigger: {
    type: 'manual',
    conditions: {
      description: 'Kích hoạt thủ công khi bắt đầu chiến dịch',
    },
  },
  steps: [
    {
      id: 'step-1-teaser',
      templateId: 'launch-teaser',
      delayDays: 0,
      delayHours: 0,
      delayMinutes: 0,
      condition: { type: 'none' },
    },
    {
      id: 'step-2-announcement',
      templateId: 'launch-announcement',
      delayDays: 1,
      delayHours: 9,
      condition: { type: 'none' },
    },
    {
      id: 'step-3-demo',
      templateId: 'launch-demo',
      delayDays: 3,
      delayHours: 10,
      condition: { type: 'none' },
    },
    {
      id: 'step-4-offer',
      templateId: 'launch-special-offer',
      delayDays: 5,
      delayHours: 8,
      condition: { type: 'none' },
    },
    {
      id: 'step-5-followup',
      templateId: 'launch-followup',
      delayDays: 6,
      delayHours: 20,
      condition: { type: 'none' },
    },
  ],
  enabled: true,
  stats: {
    totalSent: 0,
    openRate: 0,
    clickRate: 0,
    conversionRate: 0,
  },
};
