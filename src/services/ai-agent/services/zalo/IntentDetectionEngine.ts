import { geminiClient, PromptManager } from '../gemini';
import { logger } from '../../utils/logger';
import { PerformanceTimer } from '../../utils/monitoring';

export type IntentType =
  | 'price_inquiry'
  | 'product_info'
  | 'schedule_consultation'
  | 'complaint'
  | 'order_status'
  | 'technical_support'
  | 'greeting'
  | 'other';

export interface DetectedIntent {
  intent: IntentType;
  confidence: number; // 0.0 - 1.0
  entities: Record<string, any>;
  sentiment: 'positive' | 'neutral' | 'negative';
  suggestedAction: string;
  shouldEscalate: boolean;
  reasoning: string;
}

/**
 * Intent Detection Engine
 * Uses Gemini to detect customer intent from Zalo messages
 */
export class IntentDetectionEngine {
  /**
   * Detect intent from message
   */
  async detectIntent(
    message: string,
    conversationHistory?: string,
    leadData?: Record<string, any>
  ): Promise<DetectedIntent> {
    const timer = new PerformanceTimer('intent_detection');

    try {
      logger.info('Detecting intent from message', {
        messageLength: message.length,
      });

      // Create prompt context
      const promptContext = {
        message,
        conversationHistory: conversationHistory || 'Không có',
        leadData: leadData || {},
      };

      // Get prompt from PromptManager
      const prompt = PromptManager.getPrompt(
        'zalo_intent_detection',
        promptContext
      );

      // Call Gemini API
      const response = await geminiClient.generateContent(prompt, {
        temperature: 0.3, // Lower temperature for more consistent intent detection
        maxTokens: 500,
      });

      if (!response.success) {
        throw new Error('Failed to detect intent from Gemini');
      }

      // Parse response
      const intent = this.parseIntentResponse(response.content);

      const duration = timer.end();

      logger.info('Intent detection completed', {
        intent: intent.intent,
        confidence: intent.confidence,
        duration,
      });

      return intent;
    } catch (error) {
      const duration = timer.end();

      logger.error('Intent detection failed', {
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      // Return default intent on error
      return {
        intent: 'other',
        confidence: 0.0,
        entities: {},
        sentiment: 'neutral',
        suggestedAction: 'escalate_to_human',
        shouldEscalate: true,
        reasoning: 'Failed to detect intent due to error',
      };
    }
  }

  /**
   * Parse intent response from Gemini
   */
  private parseIntentResponse(content: string): DetectedIntent {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);

      return {
        intent: (parsed.intent || 'other') as IntentType,
        confidence: parseFloat(parsed.confidence) || 0.5,
        entities: parsed.entities || {},
        sentiment: (parsed.sentiment || 'neutral') as
          | 'positive'
          | 'neutral'
          | 'negative',
        suggestedAction: parsed.suggested_action || 'provide_info',
        shouldEscalate: parsed.should_escalate || false,
        reasoning: parsed.reasoning || '',
      };
    } catch (error) {
      logger.warn('Failed to parse intent response as JSON, using text extraction');

      // Extract intent from text
      const intentMatch = content.match(/intent[\":\\s]+([a-z_]+)/i);
      const confidenceMatch = content.match(/confidence[\":\\s]+([0-9.]+)/i);
      const sentimentMatch = content.match(/sentiment[\":\\s]+(positive|neutral|negative)/i);

      return {
        intent: (intentMatch ? intentMatch[1] : 'other') as IntentType,
        confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5,
        entities: {},
        sentiment: (sentimentMatch ? sentimentMatch[1] : 'neutral') as
          | 'positive'
          | 'neutral'
          | 'negative',
        suggestedAction: 'provide_info',
        shouldEscalate: false,
        reasoning: content,
      };
    }
  }

  /**
   * Detect multiple intents (for complex messages)
   */
  async detectMultipleIntents(
    message: string,
    conversationHistory?: string
  ): Promise<DetectedIntent[]> {
    logger.info('Detecting multiple intents from message');

    // For now, return single intent in array
    // In future, this can be enhanced to detect multiple intents
    const intent = await this.detectIntent(message, conversationHistory);
    return [intent];
  }

  /**
   * Classify message urgency
   */
  async classifyUrgency(
    message: string,
    intent: DetectedIntent
  ): Promise<{
    level: 'critical' | 'high' | 'medium' | 'low';
    reason: string;
  }> {
    // Based on sentiment and intent
    if (intent.sentiment === 'negative' && intent.shouldEscalate) {
      return {
        level: 'critical',
        reason: 'Negative sentiment with escalation flag',
      };
    }

    if (
      intent.intent === 'complaint' ||
      intent.intent === 'technical_support'
    ) {
      return {
        level: 'high',
        reason: 'Complaint or technical support request',
      };
    }

    if (
      intent.intent === 'schedule_consultation' ||
      intent.intent === 'order_status'
    ) {
      return {
        level: 'medium',
        reason: 'Time-sensitive request',
      };
    }

    return {
      level: 'low',
      reason: 'General inquiry',
    };
  }

  /**
   * Get recommended response type based on intent
   */
  getRecommendedResponseType(intent: DetectedIntent): string {
    const responseMap: Record<IntentType, string> = {
      price_inquiry: 'send_quote',
      product_info: 'provide_info',
      schedule_consultation: 'schedule_call',
      complaint: 'escalate',
      order_status: 'check_order',
      technical_support: 'escalate',
      greeting: 'welcome_message',
      other: 'provide_info',
    };

    return responseMap[intent.intent] || 'provide_info';
  }
}

export const intentDetectionEngine = new IntentDetectionEngine();

