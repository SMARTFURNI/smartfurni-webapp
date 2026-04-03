import { ZaloWebhookHandler } from './ZaloWebhookHandler';
import { intentDetectionEngine } from './IntentDetectionEngine';
import { zaloResponseGenerator } from './ZaloResponseGenerator';
import { zaloAPIClient } from './ZaloAPIClient';
import { logger } from '../../utils/logger';
import { PerformanceTimer } from '../../utils/monitoring';

export interface ChatbotConversation {
  userId: string;
  messages: Array<{
    role: 'user' | 'assistant';
    text: string;
    timestamp: Date;
  }>;
  lastInteraction: Date;
  context?: Record<string, any>;
}

/**
 * Zalo Chatbot Service
 * Orchestrates the entire chatbot flow
 */
export class ZaloChatbotService {
  private webhookHandler: ZaloWebhookHandler;
  private conversations: Map<string, ChatbotConversation> = new Map();

  constructor() {
    this.webhookHandler = new ZaloWebhookHandler(
      process.env.ZALO_WEBHOOK_SECRET_KEY || '',
      process.env.ZALO_OFFICIAL_ACCOUNT_ID || ''
    );
  }

  /**
   * Handle incoming webhook
   */
  async handleWebhook(
    body: any,
    signature: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    const timer = new PerformanceTimer('zalo_webhook_handling');

    try {
      // Verify signature
      const bodyString = JSON.stringify(body);
      if (!this.webhookHandler.verifySignature(bodyString, signature)) {
        logger.warn('Invalid webhook signature');
        return {
          success: false,
          error: 'Invalid signature',
        };
      }

      // Parse webhook
      const event = this.webhookHandler.parseWebhookPayload(body);
      if (!event) {
        return {
          success: false,
          error: 'Failed to parse webhook',
        };
      }

      // Process event
      const result = await this.webhookHandler.processWebhookEvent(event);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      // Handle different event types
      switch (event.event) {
        case 'user_send_message':
          await this.handleUserMessage(
            result.data.userId,
            result.data.message
          );
          break;

        case 'user_follow_official_account':
          await this.handleUserFollow(result.data.userId, result.data.userName);
          break;

        case 'user_unfollow_official_account':
          await this.handleUserUnfollow(result.data.userId);
          break;
      }

      const duration = timer.end();

      logger.info('Webhook handled successfully', {
        event: event.event,
        duration,
      });

      return { success: true };
    } catch (error) {
      const duration = timer.end();

      logger.error('Failed to handle webhook', {
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handle user message
   */
  private async handleUserMessage(
    userId: string,
    message: string
  ): Promise<void> {
    try {
      logger.info('Processing user message', { userId, messageLength: message.length });

      // Get or create conversation
      let conversation = this.conversations.get(userId);
      if (!conversation) {
        conversation = {
          userId,
          messages: [],
          lastInteraction: new Date(),
        };
        this.conversations.set(userId, conversation);
      }

      // Add user message to conversation
      conversation.messages.push({
        role: 'user',
        text: message,
        timestamp: new Date(),
      });

      // Build conversation history
      const conversationHistory = conversation.messages
        .map((m) => `${m.role === 'user' ? 'Khách:' : 'Bot:'} ${m.text}`)
        .join('\
');

      // Detect intent
      const intent = await intentDetectionEngine.detectIntent(
        message,
        conversationHistory,
        conversation.context
      );

      logger.info('Intent detected', {
        userId,
        intent: intent.intent,
        confidence: intent.confidence,
      });

      // Check if should escalate
      if (intent.shouldEscalate) {
        logger.info('Escalating to human agent', { userId });
        await zaloAPIClient.sendTextMessage(
          userId,
          'Yêu cầu của bạn cần được xử lý bởi nhân viên hỗ trợ. Vui lòng chờ, chúng tôi sẽ liên hệ với bạn sớm.'
        );
        return;
      }

      // Generate response
      const response = await zaloResponseGenerator.generateResponse({
        message,
        intent,
        conversationHistory,
        customContext: conversation.context,
      });

      // Send response
      if (response.quickReplies && response.quickReplies.length > 0) {
        await zaloAPIClient.sendQuickReplyMessage(
          userId,
          response.text,
          response.quickReplies
        );
      } else {
        await zaloAPIClient.sendTextMessage(userId, response.text);
      }

      // Add bot response to conversation
      conversation.messages.push({
        role: 'assistant',
        text: response.text,
        timestamp: new Date(),
      });

      // Update last interaction
      conversation.lastInteraction = new Date();

      logger.info('User message handled successfully', { userId });
    } catch (error) {
      logger.error('Failed to handle user message', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Send error message
      await zaloAPIClient.sendTextMessage(
        userId,
        'Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.'
      );
    }
  }

  /**
   * Handle user follow
   */
  private async handleUserFollow(
    userId: string,
    userName?: string
  ): Promise<void> {
    try {
      logger.info('User followed OA', { userId, userName });

      // Create conversation
      if (!this.conversations.has(userId)) {
        this.conversations.set(userId, {
          userId,
          messages: [],
          lastInteraction: new Date(),
        });
      }

      // Send welcome message
      const welcomeMessage = await zaloResponseGenerator.generateWelcomeMessage(
        userName
      );

      if (welcomeMessage.quickReplies && welcomeMessage.quickReplies.length > 0) {
        await zaloAPIClient.sendQuickReplyMessage(
          userId,
          welcomeMessage.text,
          welcomeMessage.quickReplies
        );
      } else {
        await zaloAPIClient.sendTextMessage(userId, welcomeMessage.text);
      }
    } catch (error) {
      logger.error('Failed to handle user follow', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle user unfollow
   */
  private async handleUserUnfollow(userId: string): Promise<void> {
    try {
      logger.info('User unfollowed OA', { userId });

      // Remove conversation
      this.conversations.delete(userId);
    } catch (error) {
      logger.error('Failed to handle user unfollow', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get conversation
   */
  getConversation(userId: string): ChatbotConversation | undefined {
    return this.conversations.get(userId);
  }

  /**
   * Get all conversations
   */
  getAllConversations(): ChatbotConversation[] {
    return Array.from(this.conversations.values());
  }

  /**
   * Clear old conversations (older than 24 hours)
   */
  clearOldConversations(): number {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    let cleared = 0;

    for (const [userId, conversation] of this.conversations) {
      if (now - conversation.lastInteraction.getTime() > oneDayMs) {
        this.conversations.delete(userId);
        cleared++;
      }
    }

    logger.info('Old conversations cleared', { count: cleared });
    return cleared;
  }
}

export const zaloChatbotService = new ZaloChatbotService();

