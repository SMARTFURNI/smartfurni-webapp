import { geminiClient, PromptManager } from '../gemini';
import { logger } from '../../utils/logger';
import { PerformanceTimer } from '../../utils/monitoring';

export interface EmailGenerationRequest {
  leadId: string;
  leadName: string;
  email: string;
  companyName?: string;
  productName: string;
  emailType: 'chao_hang' | 'follow_up' | 'quote' | 'thank_you' | 'khuyenmai';
  previousEmails?: number;
  lastInteraction?: string;
  customContext?: Record<string, any>;
}

export interface GeneratedEmail {
  success: boolean;
  subject: string;
  body: string;
  htmlBody?: string;
  cta?: string;
  tone?: string;
  estimatedOpenRate?: number;
  tokensUsed: {
    input: number;
    output: number;
  };
  generatedAt: Date;
}

/**
 * Email Generator Service
 * Uses Gemini 2.5 Flash to generate professional B2B emails
 */
export class EmailGenerator {
  /**
   * Generate email content using Gemini
   */
  async generateEmail(
    request: EmailGenerationRequest
  ): Promise<GeneratedEmail> {
    const timer = new PerformanceTimer('email_generation');

    try {
      logger.info('Starting email generation', {
        leadId: request.leadId,
        emailType: request.emailType,
      });

      // Create prompt context
      const promptContext = {
        leadName: request.leadName,
        companyName: request.companyName || 'Công ty',
        productName: request.productName,
        emailType: this.getEmailTypeLabel(request.emailType),
        previousEmails: request.previousEmails || 0,
        lastInteraction: request.lastInteraction || 'Không xác định',
        ...request.customContext,
      };

      // Get prompt from PromptManager
      const prompt = PromptManager.getPrompt('email_generation', promptContext);

      // Call Gemini API
      const response = await geminiClient.generateContent(prompt, {
        temperature: 0.7,
        maxTokens: 800,
      });

      if (!response.success) {
        throw new Error('Failed to generate email content from Gemini');
      }

      // Parse response
      const emailContent = this.parseEmailResponse(response.content);

      // Generate HTML version
      const htmlBody = this.generateHtmlEmail(emailContent.body);

      const duration = timer.end();

      logger.info('Email generation completed successfully', {
        leadId: request.leadId,
        emailType: request.emailType,
        duration,
        tokensUsed: response.tokensUsed,
      });

      return {
        success: true,
        subject: emailContent.subject,
        body: emailContent.body,
        htmlBody,
        cta: emailContent.cta,
        tone: emailContent.tone,
        estimatedOpenRate: this.estimateOpenRate(request.emailType),
        tokensUsed: response.tokensUsed,
        generatedAt: new Date(),
      };
    } catch (error) {
      const duration = timer.end();

      logger.error('Email generation failed', {
        leadId: request.leadId,
        emailType: request.emailType,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      throw error;
    }
  }

  /**
   * Generate multiple email variations
   */
  async generateEmailVariations(
    request: EmailGenerationRequest,
    count: number = 3
  ): Promise<GeneratedEmail[]> {
    logger.info('Generating email variations', {
      leadId: request.leadId,
      count,
    });

    const variations: GeneratedEmail[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const email = await this.generateEmail({
          ...request,
          customContext: {
            ...request.customContext,
            variation: i + 1,
          },
        });
        variations.push(email);
      } catch (error) {
        logger.warn(`Failed to generate variation ${i + 1}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return variations;
  }

  /**
   * Parse email response from Gemini
   */
  private parseEmailResponse(
    content: string
  ): {
    subject: string;
    body: string;
    cta?: string;
    tone?: string;
  } {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);
      return {
        subject: parsed.subject || 'No Subject',
        body: parsed.body || '',
        cta: parsed.cta,
        tone: parsed.tone,
      };
    } catch (error) {
      // If JSON parsing fails, extract from text
      logger.warn('Failed to parse email response as JSON, using text extraction');

      const subjectMatch = content.match(/Subject[\s:]*([^\n]+)/i);
      const bodyMatch = content.match(/Body[\\s:]*([\\s\\S]+?)(?:CTA|$)/i);

      return {
        subject: subjectMatch ? subjectMatch[1].trim() : 'No Subject',
        body: bodyMatch ? bodyMatch[1].trim() : content,
      };
    }
  }

  /**
   * Generate HTML version of email
   */
  private generateHtmlEmail(body: string): string {
    // Simple HTML template
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\">
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f5f5f5; padding: 20px; border-radius: 5px; }
    .content { padding: 20px 0; }
    .footer { border-top: 1px solid #ddd; padding-top: 20px; font-size: 12px; color: #666; }
    a { color: #007bff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class=\"container\">
    <div class=\"content\">
      ${body
        .split('\n')
        .map((line) => (line.trim() ? `<p>${line}</p>` : ''))
        .join('')}
    </div>
    <div class=\"footer\">
      <p>SmartFurni - Giường Điều Khiển Thông Minh</p>
      <p>© 2026 SmartFurni. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    return html;
  }

  /**
   * Estimate open rate based on email type
   */
  private estimateOpenRate(emailType: string): number {
    const rates: Record<string, number> = {
      chao_hang: 0.35,
      follow_up: 0.45,
      quote: 0.55,
      thank_you: 0.40,
      khuyenmai: 0.50,
    };
    return rates[emailType] || 0.40;
  }

  /**
   * Get human-readable email type label
   */
  private getEmailTypeLabel(emailType: string): string {
    const labels: Record<string, string> = {
      chao_hang: 'Chào hàng',
      follow_up: 'Theo dõi',
      quote: 'Báo giá',
      thank_you: 'Cảm ơn',
      khuyenmai: 'Khuyến mại',
    };
    return labels[emailType] || emailType;
  }
}

export const emailGenerator = new EmailGenerator();

