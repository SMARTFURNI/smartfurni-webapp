import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger';

/**
 * Gemini Integration Service
 * Handles all interactions with Google Generative AI (Gemini 2.5 Flash)
 */
export class GeminiIntegration {
  private client: GoogleGenerativeAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or OPENAI_API_KEY environment variable is not set');
    }

    this.client = new GoogleGenerativeAI(apiKey);
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.temperature = parseFloat(process.env.GEMINI_TEMPERATURE || '0.7');
    this.maxTokens = parseInt(process.env.GEMINI_MAX_TOKENS || '2000');

    logger.info('Gemini Integration initialized', {
      model: this.model,
      temperature: this.temperature,
      maxTokens: this.maxTokens,
    });
  }

  /**
   * Generate content using Gemini
   */
  async generateContent(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    }
  ): Promise<{
    success: boolean;
    content: string;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    error?: string;
  }> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
        systemInstruction: options?.systemPrompt,
      });

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: options?.temperature || this.temperature,
          maxOutputTokens: options?.maxTokens || this.maxTokens,
        },
      });

      const text = result.response.text();

      logger.info('Gemini content generated successfully', {
        model: this.model,
        promptLength: prompt.length,
        responseLength: text.length,
      });

      return {
        success: true,
        content: text,
        usage: {
          promptTokens: result.response.usageMetadata?.promptTokens || 0,
          completionTokens: result.response.usageMetadata?.candidatesTokens || 0,
          totalTokens: result.response.usageMetadata?.totalTokens || 0,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to generate content with Gemini', {
        error: errorMessage,
        model: this.model,
      });

      return {
        success: false,
        content: '',
        error: errorMessage,
      };
    }
  }

  /**
   * Generate email content
   */
  async generateEmailContent(
    customerName: string,
    customerCompany: string,
    productInfo: string,
    emailType: 'greeting' | 'follow_up' | 'quote' | 'proposal'
  ): Promise<{
    subject: string;
    body: string;
    success: boolean;
  }> {
    const prompts: Record<string, string> = {
      greeting: `Soạn email chào hàng chuyên nghiệp cho khách hàng B2B:
Tên khách: ${customerName}
Công ty: ${customerCompany}
Sản phẩm: ${productInfo}

Yêu cầu:
- Tiêu đề email ngắn gọn, hấp dẫn
- Nội dung thân thiện, chuyên nghiệp
- Gọi hành động rõ ràng
- Trả về JSON: {\"subject\": \"...\", \"body\": \"...\"}`,
      follow_up: `Soạn email follow-up chuyên nghiệp:
Tên khách: ${customerName}
Công ty: ${customerCompany}
Sản phẩm: ${productInfo}

Yêu cầu:
- Nhắc nhở về cuộc liên hệ trước
- Cung cấp giá trị thêm
- Gọi hành động rõ ràng
- Trả về JSON: {\"subject\": \"...\", \"body\": \"...\"}`,
      quote: `Soạn email gửi báo giá:
Tên khách: ${customerName}
Công ty: ${customerCompany}
Sản phẩm: ${productInfo}

Yêu cầu:
- Giới thiệu báo giá
- Nhấn mạnh giá trị
- Mời thảo luận
- Trả về JSON: {\"subject\": \"...\", \"body\": \"...\"}`,
      proposal: `Soạn email gửi đề xuất giải pháp:
Tên khách: ${customerName}
Công ty: ${customerCompany}
Sản phẩm: ${productInfo}

Yêu cầu:
- Trình bày giải pháp toàn diện
- Liên kết với nhu cầu của khách
- Mời lên lịch demo
- Trả về JSON: {\"subject\": \"...\", \"body\": \"...\"}`,
    };

    const result = await this.generateContent(prompts[emailType], {
      temperature: 0.7,
      maxTokens: 1000,
      systemPrompt: 'Bạn là chuyên gia soạn email B2B chuyên nghiệp. Luôn trả về JSON hợp lệ.',
    });

    if (!result.success) {
      return {
        subject: '',
        body: '',
        success: false,
      };
    }

    try {
      const parsed = JSON.parse(result.content);
      return {
        subject: parsed.subject || '',
        body: parsed.body || '',
        success: true,
      };
    } catch (error) {
      logger.warn('Failed to parse email content as JSON', {
        content: result.content,
      });
      return {
        subject: 'Liên hệ từ SmartFurni',
        body: result.content,
        success: true,
      };
    }
  }

  /**
   * Analyze customer intent from Zalo message
   */
  async analyzeCustomerIntent(
    message: string,
    customerContext?: string
  ): Promise<{
    intent: string;
    confidence: number;
    suggestedResponse: string;
    shouldEscalate: boolean;
    success: boolean;
  }> {
    const prompt = `Phân tích ý định của khách hàng từ tin nhắn Zalo:

Tin nhắn: \"${message}\"
${customerContext ? `Ngữ cảnh: ${customerContext}` : ''}

Yêu cầu:
- Xác định ý định chính (hỏi giá, khiếu nại, tư vấn, đặt hàng, v.v.)
- Đánh giá độ tin cậy (0-100)
- Gợi ý phản hồi tự động
- Xác định có cần chuyển cho nhân viên không
- Trả về JSON: {\"intent\": \"...\", \"confidence\": 0-100, \"suggestedResponse\": \"...\", \"shouldEscalate\": true/false}`;

    const result = await this.generateContent(prompt, {
      temperature: 0.5,
      maxTokens: 500,
      systemPrompt: 'Bạn là chuyên gia phân tích ý định khách hàng. Luôn trả về JSON hợp lệ.',
    });

    if (!result.success) {
      return {
        intent: 'unknown',
        confidence: 0,
        suggestedResponse: 'Xin lỗi, tôi không hiểu rõ. Vui lòng liên hệ với nhân viên.',
        shouldEscalate: true,
        success: false,
      };
    }

    try {
      const parsed = JSON.parse(result.content);
      return {
        intent: parsed.intent || 'unknown',
        confidence: parsed.confidence || 0,
        suggestedResponse: parsed.suggestedResponse || '',
        shouldEscalate: parsed.shouldEscalate || false,
        success: true,
      };
    } catch (error) {
      logger.warn('Failed to parse intent analysis as JSON');
      return {
        intent: 'unknown',
        confidence: 50,
        suggestedResponse: result.content,
        shouldEscalate: false,
        success: true,
      };
    }
  }

  /**
   * Generate lead scoring reasoning
   */
  async generateScoringReasoning(
    leadData: Record<string, any>,
    score: number
  ): Promise<{
    reasoning: string;
    nextBestAction: string;
    success: boolean;
  }> {
    const prompt = `Phân tích điểm số Lead và đưa ra lý do:

Dữ liệu Lead:
${JSON.stringify(leadData, null, 2)}

Điểm số: ${score}/100

Yêu cầu:
- Giải thích tại sao Lead đạt điểm này
- Đưa ra hành động tiếp theo tốt nhất
- Trả về JSON: {\"reasoning\": \"...\", \"nextBestAction\": \"...\"}`;

    const result = await this.generateContent(prompt, {
      temperature: 0.6,
      maxTokens: 800,
      systemPrompt: 'Bạn là chuyên gia phân tích Lead B2B. Luôn trả về JSON hợp lệ.',
    });

    if (!result.success) {
      return {
        reasoning: 'Không thể phân tích',
        nextBestAction: 'Liên hệ thủ công',
        success: false,
      };
    }

    try {
      const parsed = JSON.parse(result.content);
      return {
        reasoning: parsed.reasoning || '',
        nextBestAction: parsed.nextBestAction || 'follow_up_call',
        success: true,
      };
    } catch (error) {
      logger.warn('Failed to parse scoring reasoning as JSON');
      return {
        reasoning: result.content,
        nextBestAction: 'follow_up_call',
        success: true,
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.generateContent('Hello', {
        maxTokens: 10,
      });
      return result.success;
    } catch (error) {
      logger.error('Gemini health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

export const geminiIntegration = new GeminiIntegration();

