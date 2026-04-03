import { geminiClient } from '../gemini';
import { logger } from '../../utils/logger';
import { PerformanceTimer } from '../../utils/monitoring';
import { DetectedIntent } from './IntentDetectionEngine';

export interface ResponseGenerationRequest {
  message: string;
  intent: DetectedIntent;
  leadData?: Record<string, any>;
  conversationHistory?: string;
  customContext?: Record<string, any>;
}

export interface GeneratedResponse {
  text: string;
  quickReplies?: string[];
  attachmentType?: 'image' | 'video' | 'file' | 'template';
  attachmentUrl?: string;
  shouldSendQuote?: boolean;
  quoteTemplate?: string;
  tokensUsed: {
    input: number;
    output: number;
  };
}

/**
 * Zalo Response Generator
 * Generates contextual responses using Gemini
 */
export class ZaloResponseGenerator {
  /**
   * Generate response for detected intent
   */
  async generateResponse(
    request: ResponseGenerationRequest
  ): Promise<GeneratedResponse> {
    const timer = new PerformanceTimer('zalo_response_generation');

    try {
      logger.info('Generating Zalo response', {
        intent: request.intent.intent,
        confidence: request.intent.confidence,
      });

      // Choose response template based on intent
      const prompt = this.buildResponsePrompt(request);

      // Call Gemini API
      const response = await geminiClient.generateContent(prompt, {
        temperature: 0.7,
        maxTokens: 300,
      });

      if (!response.success) {
        throw new Error('Failed to generate response from Gemini');
      }

      // Parse response
      const generatedResponse = this.parseResponseContent(
        response.content,
        request.intent
      );

      const duration = timer.end();

      logger.info('Zalo response generated successfully', {
        intent: request.intent.intent,
        duration,
        tokensUsed: response.tokensUsed,
      });

      return {
        ...generatedResponse,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      const duration = timer.end();

      logger.error('Response generation failed', {
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      // Return default response on error
      return {
        text: 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn lúc này. Vui lòng liên hệ với đội hỗ trợ của chúng tôi.',
        quickReplies: ['Liên hệ nhân viên', 'Quay lại'],
        tokensUsed: { input: 0, output: 0 },
      };
    }
  }

  /**
   * Build prompt for response generation
   */
  private buildResponsePrompt(request: ResponseGenerationRequest): string {
    const { message, intent, leadData, conversationHistory } = request;

    return `
Bạn là một chatbot hỗ trợ khách hàng chuyên nghiệp cho SmartFurni (công ty bán giường điều khiển thông minh).
Hãy trả lời tin nhắn của khách hàng một cách thân thiện, chuyên nghiệp và ngắn gọn (dưới 150 từ).

Tin nhắn của khách hàng: \"${message}\"

Intent được phát hiện: ${intent.intent}
Độ tin cậy: ${(intent.confidence * 100).toFixed(0)}%
Cảm xúc: ${intent.sentiment}

Lịch sử trò chuyện:
${conversationHistory || 'Đây là tin nhắn đầu tiên'}

Thông tin khách hàng:
${JSON.stringify(leadData || {}, null, 2)}

Yêu cầu:
1. Trả lời phù hợp với intent được phát hiện
2. Tone thân thiện nhưng chuyên nghiệp
3. Nếu cần, gợi ý các bước tiếp theo
4. Không vượt quá 150 từ
5. Sử dụng tiếng Việt

Hãy trả về JSON với cấu trúc:
{
  \"text\": \"Nội dung trả lời\",
  \"quick_replies\": [\"Lựa chọn 1\", \"Lựa chọn 2\"],
  \"should_send_quote\": false,
  \"attachment_type\": null
}
`;
  }

  /**
   * Parse response content from Gemini
   */
  private parseResponseContent(
    content: string,
    intent: DetectedIntent
  ): Omit<GeneratedResponse, 'tokensUsed'> {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);

      return {
        text: parsed.text || 'Xin lỗi, tôi không thể xử lý yêu cầu này.',
        quickReplies: parsed.quick_replies,
        attachmentType: parsed.attachment_type,
        attachmentUrl: parsed.attachment_url,
        shouldSendQuote: parsed.should_send_quote || false,
      };
    } catch (error) {
      logger.warn('Failed to parse response as JSON, using text extraction');

      // Extract text from response
      const textMatch = content.match(/text[\":\\s]+\"([^\"]+)\"/i);
      const text = textMatch ? textMatch[1] : content;

      // Add quick replies based on intent
      const quickReplies = this.getDefaultQuickReplies(intent.intent);

      return {
        text,
        quickReplies,
        shouldSendQuote: intent.intent === 'price_inquiry',
      };
    }
  }

  /**
   * Get default quick replies based on intent
   */
  private getDefaultQuickReplies(intent: string): string[] {
    const repliesMap: Record<string, string[]> = {
      price_inquiry: ['Xem báo giá', 'Liên hệ nhân viên', 'Quay lại'],
      product_info: ['Xem sản phẩm khác', 'Liên hệ nhân viên', 'Quay lại'],
      schedule_consultation: ['Đặt lịch', 'Hỏi thêm', 'Quay lại'],
      complaint: ['Liên hệ quản lý', 'Hỗ trợ thêm', 'Quay lại'],
      order_status: ['Kiểm tra lại', 'Liên hệ nhân viên', 'Quay lại'],
      technical_support: ['Liên hệ hỗ trợ', 'Hỏi thêm', 'Quay lại'],
      greeting: ['Xem sản phẩm', 'Liên hệ nhân viên', 'Quay lại'],
      other: ['Liên hệ nhân viên', 'Hỏi thêm', 'Quay lại'],
    };

    return repliesMap[intent] || ['Liên hệ nhân viên', 'Hỏi thêm'];
  }

  /**
   * Generate welcome message
   */
  async generateWelcomeMessage(
    leadName?: string
  ): Promise<GeneratedResponse> {
    const timer = new PerformanceTimer('welcome_message_generation');

    try {
      const prompt = `
Bạn là chatbot hỗ trợ khách hàng của SmartFurni.
Hãy tạo một tin nhắn chào mừng thân thiện cho khách hàng mới.
${leadName ? `Tên khách hàng: ${leadName}` : ''}

Yêu cầu:
1. Ngắn gọn (dưới 100 từ)
2. Thân thiện và chuyên nghiệp
3. Giới thiệu sản phẩm chính
4. Gợi ý các bước tiếp theo

Hãy trả về JSON:
{
  \"text\": \"Nội dung chào mừng\",
  \"quick_replies\": [\"Lựa chọn 1\", \"Lựa chọn 2\"]
}
`;

      const response = await geminiClient.generateContent(prompt, {
        temperature: 0.7,
        maxTokens: 200,
      });

      if (!response.success) {
        throw new Error('Failed to generate welcome message');
      }

      const parsed = this.parseResponseContent(
        response.content,
        {
          intent: 'greeting',
          confidence: 1.0,
          entities: {},
          sentiment: 'positive',
          suggestedAction: 'provide_info',
          shouldEscalate: false,
          reasoning: '',
        }
      );

      const duration = timer.end();

      logger.info('Welcome message generated', { duration });

      return {
        ...parsed,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      logger.error('Failed to generate welcome message', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        text: `Xin chào${leadName ? ' ' + leadName : ''}! 👋\
\
Chào mừng bạn đến với SmartFurni - chuyên cung cấp giường điều khiển thông minh. Tôi có thể giúp bạn tìm hiểu về sản phẩm, giá cả hoặc lên lịch tư vấn. Bạn cần gì?`,
        quickReplies: ['Xem sản phẩm', 'Hỏi giá', 'Tư vấn'],
        tokensUsed: { input: 0, output: 0 },
      };
    }
  }
}

export const zaloResponseGenerator = new ZaloResponseGenerator();

