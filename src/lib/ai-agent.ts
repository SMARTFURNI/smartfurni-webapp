import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface EmailContent {
  subject: string;
  body: string;
}

interface LeadScoreResult {
  score: number;
  classification: 'hot' | 'warm' | 'cold';
  recommendation: string;
  factors: {
    customerType: number;
    stage: number;
    interaction: number;
    value: number;
    duration: number;
  };
}

interface ChatbotResponse {
  reply: string;
  suggestedActions: string[];
}

interface TaskSuggestion {
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: Date;
}

/**
 * AI Agent Service using Gemini 2.5 Flash
 * Handles automation for customer care tasks
 */
export class AIAgentService {
  private model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  /**
   * Generate email content for customer
   */
  async generateEmailContent(
    customerName: string,
    customerType: string,
    stage: string,
    lastInteraction?: Date
  ): Promise<EmailContent> {
    const prompt = `Bạn là chuyên gia marketing B2B cho công ty SmartFurni (sản phẩm: Giường điều khiển thông minh).
    
Hãy tạo email chào hàng chuyên nghiệp cho khách hàng:
- Tên: ${customerName}
- Loại: ${customerType}
- Giai đoạn: ${stage}
- Lần tương tác cuối: ${lastInteraction ? lastInteraction.toLocaleDateString('vi-VN') : 'Chưa có'}

Yêu cầu:
1. Email phải chuyên nghiệp, ngắn gọn (100-150 từ)
2. Có subject line hấp dẫn
3. Có CTA rõ ràng
4. Phù hợp với loại khách hàng
5. Trả về JSON format: { "subject": "...", "body": "..." }`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        subject: 'Giới thiệu Giường điều khiển thông minh SmartFurni',
        body: text,
      };
    } catch (error) {
      console.error('Error generating email:', error);
      throw error;
    }
  }

  /**
   * Generate Zalo chatbot response
   */
  async generateZaloChatbotResponse(
    message: string,
    customerName: string,
    customerType: string
  ): Promise<ChatbotResponse> {
    const prompt = `Bạn là nhân viên bán hàng SmartFurni (sản phẩm: Giường điều khiển thông minh).
    
Khách hàng: ${customerName} (${customerType})
Tin nhắn: "${message}"

Hãy trả lời tin nhắn:
1. Thân thiện, chuyên nghiệp
2. Ngắn gọn (50-100 từ)
3. Có thông tin hữu ích
4. Gợi ý sản phẩm nếu phù hợp
5. Trả về JSON format: { "reply": "...", "suggestedActions": [...] }

Suggested actions có thể là: "Gửi báo giá", "Gọi điện", "Gửi tài liệu", "Hẹn gặp"`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        reply: text,
        suggestedActions: ['Gửi báo giá', 'Gọi điện'],
      };
    } catch (error) {
      console.error('Error generating chatbot response:', error);
      throw error;
    }
  }

  /**
   * Calculate lead score using AI
   */
  async calculateLeadScore(
    customerName: string,
    customerType: string,
    stage: string,
    expectedValue: number,
    lastInteractionDays: number,
    interactionCount: number
  ): Promise<LeadScoreResult> {
    const prompt = `Bạn là chuyên gia phân tích lead B2B.

Dữ liệu lead:
- Tên: ${customerName}
- Loại: ${customerType}
- Giai đoạn: ${stage}
- Giá trị dự kiến: ${expectedValue.toLocaleString('vi-VN')} ₫
- Ngày lần tương tác cuối: ${lastInteractionDays} ngày trước
- Số lần tương tác: ${interactionCount}

Hãy tính điểm lead (0-100) và phân loại:
1. Hot (70-100): Sẵn sàng mua
2. Warm (40-69): Quan tâm, cần nurture
3. Cold (0-39): Chưa sẵn sàng

Trả về JSON format:
{
  "score": 75,
  "classification": "hot",
  "recommendation": "...",
  "factors": {
    "customerType": 30,
    "stage": 25,
    "interaction": 20,
    "value": 15,
    "duration": 10
  }
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error calculating lead score:', error);
      throw error;
    }
  }

  /**
   * Generate task suggestions
   */
  async generateTaskSuggestions(
    customerName: string,
    customerType: string,
    stage: string,
    daysSinceLastInteraction: number
  ): Promise<TaskSuggestion[]> {
    const prompt = `Bạn là chuyên gia quản lý bán hàng B2B.

Khách hàng:
- Tên: ${customerName}
- Loại: ${customerType}
- Giai đoạn: ${stage}
- Chưa tương tác: ${daysSinceLastInteraction} ngày

Hãy gợi ý 2-3 task follow-up cần làm:
1. Ưu tiên: high/medium/low
2. Loại: "call", "email", "zalo", "meeting", "proposal"
3. Mô tả chi tiết
4. Thời hạn: số ngày từ hôm nay

Trả về JSON array format:
[
  {
    "type": "call",
    "title": "Gọi follow-up",
    "description": "...",
    "priority": "high",
    "dueDate": 1
  }
]`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const tasks = JSON.parse(jsonMatch[0]);
        return tasks.map((task: any) => ({
          ...task,
          dueDate: new Date(Date.now() + task.dueDate * 24 * 60 * 60 * 1000),
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error generating task suggestions:', error);
      throw error;
    }
  }

  /**
   * Analyze customer sentiment from message
   */
  async analyzeSentiment(message: string): Promise<{
    sentiment: 'positive' | 'neutral' | 'negative';
    confidence: number;
    keywords: string[];
  }> {
    const prompt = `Phân tích cảm xúc của tin nhắn sau:
"${message}"

Trả về JSON format:
{
  "sentiment": "positive",
  "confidence": 0.95,
  "keywords": ["từ khóa 1", "từ khóa 2"]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return {
        sentiment: 'neutral',
        confidence: 0.5,
        keywords: [],
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      throw error;
    }
  }
}

export const aiAgent = new AIAgentService();
