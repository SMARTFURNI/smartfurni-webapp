/**
 * Prompt Manager
 * Manages all prompts used for Gemini API calls
 */

export interface PromptContext {
  [key: string]: string | number | boolean | object;
}

export class PromptManager {
  /**
   * Email Generation Prompts
   */
  static getEmailGenerationPrompt(context: PromptContext): string {
    const {
      leadName,
      companyName,
      productName,
      emailType,
      previousEmails,
      lastInteraction,
    } = context;

    return `
Bạn là một chuyên gia viết email bán hàng B2B cho công ty SmartFurni.
Hãy viết một email ${emailType} chuyên nghiệp, ngắn gọn và hiệu quả.

Thông tin:
- Tên khách hàng: ${leadName}
- Công ty: ${companyName}
- Sản phẩm: ${productName}
- Loại email: ${emailType}
- Số email đã gửi trước: ${previousEmails}
- Lần tương tác cuối: ${lastInteraction}

Yêu cầu:
1. Email phải ngắn gọn (dưới 200 từ)
2. Có subject line hấp dẫn
3. Có CTA (Call To Action) rõ ràng
4. Tone chuyên nghiệp nhưng thân thiện
5. Phù hợp với ngữ cảnh B2B

Hãy trả về JSON với cấu trúc:
{
  \"subject\": \"Subject line\",
  \"body\": \"Email body\",
  \"cta\": \"Call to action text\",
  \"tone\": \"professional/friendly/urgent\"
}
`;
  }

  /**
   * Zalo Intent Detection Prompts
   */
  static getZaloIntentDetectionPrompt(context: PromptContext): string {
    const { message, conversationHistory, leadData } = context;

    return `
Bạn là một AI assistant phân tích ý định khách hàng trong các tin nhắn Zalo.
Hãy phân tích tin nhắn sau và xác định ý định của khách hàng.

Tin nhắn: \"${message}\"

Lịch sử trò chuyện:
${conversationHistory || 'Không có'}

Thông tin khách hàng:
${JSON.stringify(leadData, null, 2)}

Yêu cầu:
1. Xác định ý định chính (intent)
2. Trích xuất các thực thể (entities) quan trọng
3. Xác định độ tin cậy (0.0 - 1.0)
4. Gợi ý hành động tiếp theo
5. Xác định xem có cần escalate cho nhân viên không

Hãy trả về JSON với cấu trúc:
{
  \"intent\": \"price_inquiry|product_info|schedule_consultation|complaint|other\",
  \"confidence\": 0.95,
  \"entities\": {
    \"product\": \"Tên sản phẩm\",
    \"attribute\": \"Thuộc tính được hỏi\"
  },
  \"sentiment\": \"positive|neutral|negative\",
  \"suggested_action\": \"send_quote|provide_info|schedule_call|escalate\",
  \"should_escalate\": false,
  \"response\": \"Câu trả lời gợi ý\"
}
`;
  }

  /**
   * Lead Scoring Prompts
   */
  static getLeadScoringPrompt(context: PromptContext): string {
    const {
      leadName,
      company,
      engagementMetrics,
      purchaseHistory,
      currentStage,
      source,
    } = context;

    return `
Bạn là một AI chuyên gia phân tích và chấm điểm lead trong lĩnh vực bán hàng B2B.
Hãy đánh giá chất lượng của lead này dựa trên các yếu tố được cung cấp.

Thông tin Lead:
- Tên: ${leadName}
- Công ty: ${company}
- Nguồn: ${source}
- Giai đoạn hiện tại: ${currentStage}

Chỉ số Engagement:
${JSON.stringify(engagementMetrics, null, 2)}

Lịch sử Mua hàng:
${JSON.stringify(purchaseHistory, null, 2)}

Yêu cầu:
1. Tính toán điểm số (0-100)
2. Phân loại: Hot (80-100), Warm (50-79), Cold (0-49)
3. Phân tích từng yếu tố ảnh hưởng
4. Gợi ý hành động tiếp theo
5. Dự đoán khả năng chuyển đổi

Hãy trả về JSON với cấu trúc:
{
  \"score\": 75,
  \"classification\": \"warm\",
  \"factors\": {
    \"engagement\": {\"score\": 25, \"weight\": 0.35},
    \"recency\": {\"score\": 20, \"weight\": 0.25},
    \"source_quality\": {\"score\": 18, \"weight\": 0.20},
    \"company_profile\": {\"score\": 12, \"weight\": 0.20}
  },
  \"recommendations\": [\"Gợi ý 1\", \"Gợi ý 2\", \"Gợi ý 3\"],
  \"next_best_action\": \"schedule_consultation\",
  \"conversion_probability\": 0.65
}
`;
  }

  /**
   * Task Generation Prompts
   */
  static getTaskGenerationPrompt(context: PromptContext): string {
    const { leadName, leadScore, currentStage, lastInteraction, trigger } =
      context;

    return `
Bạn là một AI quản lý công việc trong bán hàng B2B.
Hãy gợi ý các công việc cần làm tiếp theo cho lead này.

Thông tin Lead:
- Tên: ${leadName}
- Điểm số: ${leadScore}
- Giai đoạn: ${currentStage}
- Lần tương tác cuối: ${lastInteraction}
- Trigger: ${trigger}

Yêu cầu:
1. Gợi ý 2-3 công việc cần làm
2. Xác định độ ưu tiên (high/medium/low)
3. Ước tính thời gian hoàn thành
4. Gợi ý nhân viên phù hợp (dựa trên expertise)
5. Giải thích lý do cho mỗi gợi ý

Hãy trả về JSON với cấu trúc:
{
  \"tasks\": [
    {
      \"type\": \"follow_up_call|send_email|schedule_meeting|send_quote\",
      \"title\": \"Tiêu đề task\",
      \"description\": \"Mô tả chi tiết\",
      \"priority\": \"high|medium|low\",
      \"estimated_duration_minutes\": 15,
      \"due_date_hours\": 24,
      \"suggested_assignee_expertise\": \"sales|support|manager\",
      \"reasoning\": \"Lý do gợi ý task này\"
    }
  ]
}
`;
  }

  /**
   * Quote Generation Prompts
   */
  static getQuoteGenerationPrompt(context: PromptContext): string {
    const { leadName, productName, quantity, specialRequirements } = context;

    return `
Bạn là một chuyên gia tạo báo giá cho sản phẩm nội thất thông minh.
Hãy tạo một báo giá chuyên nghiệp dựa trên thông tin được cung cấp.

Thông tin:
- Khách hàng: ${leadName}
- Sản phẩm: ${productName}
- Số lượng: ${quantity}
- Yêu cầu đặc biệt: ${specialRequirements || 'Không có'}

Yêu cầu:
1. Tạo báo giá chuyên nghiệp
2. Bao gồm giá cơ bản, phí lắp đặt, bảo hành
3. Điều khoản thanh toán
4. Thời hạn báo giá (30 ngày)
5. Thông tin liên hệ

Hãy trả về JSON với cấu trúc:
{
  \"quote_number\": \"QT-2026-001\",
  \"items\": [
    {\"description\": \"...\", \"quantity\": 1, \"unit_price\": 15000000, \"total\": 15000000}
  ],
  \"subtotal\": 15000000,
  \"installation_fee\": 500000,
  \"warranty\": \"2 năm\",
  \"total\": 15500000,
  \"payment_terms\": \"50% deposit, 50% upon delivery\",
  \"validity_days\": 30
}
`;
  }

  /**
   * Get prompt by type
   */
  static getPrompt(
    promptType: string,
    context: PromptContext
  ): string {
    switch (promptType) {
      case 'email_generation':
        return this.getEmailGenerationPrompt(context);
      case 'zalo_intent_detection':
        return this.getZaloIntentDetectionPrompt(context);
      case 'lead_scoring':
        return this.getLeadScoringPrompt(context);
      case 'task_generation':
        return this.getTaskGenerationPrompt(context);
      case 'quote_generation':
        return this.getQuoteGenerationPrompt(context);
      default:
        throw new Error(`Unknown prompt type: ${promptType}`);
    }
  }
}

