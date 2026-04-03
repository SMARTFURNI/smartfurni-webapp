import crypto from 'crypto';
import { logger } from '../../utils/logger';

export interface ZaloWebhookMessage {
  event: string;
  timestamp: number;
  data: {
    user_id: string;
    user_name?: string;
    message?: string;
    message_id?: string;
    attachment?: {
      type: string;
      payload?: any;
    };
  };
}

export interface ZaloWebhookEvent {
  event: 'user_send_message' | 'user_follow_official_account' | 'user_unfollow_official_account';
  timestamp: number;
  data: any;
}

/**
 * Zalo Webhook Handler
 * Handles incoming webhooks from Zalo Official Account
 */
export class ZaloWebhookHandler {
  private secretKey: string;
  private oaId: string;

  constructor(secretKey: string, oaId: string) {
    this.secretKey = secretKey;
    this.oaId = oaId;
  }

  /**
   * Verify webhook signature
   * Zalo sends X-Zalo-Signature header with HMAC SHA256 signature
   */
  verifySignature(body: string, signature: string): boolean {
    try {
      const hash = crypto
        .createHmac('sha256', this.secretKey)
        .update(body)
        .digest('hex');

      const isValid = hash === signature;

      if (!isValid) {
        logger.warn('Invalid webhook signature', {
          expected: hash,
          received: signature,
        });
      }

      return isValid;
    } catch (error) {
      logger.error('Signature verification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Parse webhook payload
   */
  parseWebhookPayload(body: any): ZaloWebhookEvent | null {
    try {
      if (!body.event || !body.data) {
        logger.warn('Invalid webhook payload structure');
        return null;
      }

      const event: ZaloWebhookEvent = {
        event: body.event,
        timestamp: body.timestamp || Date.now(),
        data: body.data,
      };

      logger.debug('Webhook payload parsed', { event: event.event });
      return event;
    } catch (error) {
      logger.error('Failed to parse webhook payload', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Handle user send message event
   */
  handleUserMessage(event: ZaloWebhookEvent): {
    userId: string;
    message: string;
    messageId?: string;
    timestamp: number;
  } | null {
    try {
      const { user_id, message, message_id } = event.data;

      if (!user_id || !message) {
        logger.warn('Missing required fields in message event');
        return null;
      }

      logger.info('User message received', {
        userId: user_id,
        messageLength: message.length,
        messageId,
      });

      return {
        userId: user_id,
        message,
        messageId,
        timestamp: event.timestamp,
      };
    } catch (error) {
      logger.error('Failed to handle user message', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Handle user follow event
   */
  handleUserFollow(event: ZaloWebhookEvent): {
    userId: string;
    userName?: string;
    timestamp: number;
  } | null {
    try {
      const { user_id, user_name } = event.data;

      if (!user_id) {
        logger.warn('Missing user_id in follow event');
        return null;
      }

      logger.info('User followed OA', {
        userId: user_id,
        userName: user_name,
      });

      return {
        userId: user_id,
        userName: user_name,
        timestamp: event.timestamp,
      };
    } catch (error) {
      logger.error('Failed to handle user follow', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Handle user unfollow event
   */
  handleUserUnfollow(event: ZaloWebhookEvent): {
    userId: string;
    timestamp: number;
  } | null {
    try {
      const { user_id } = event.data;

      if (!user_id) {
        logger.warn('Missing user_id in unfollow event');
        return null;
      }

      logger.info('User unfollowed OA', { userId: user_id });

      return {
        userId: user_id,
        timestamp: event.timestamp,
      };
    } catch (error) {
      logger.error('Failed to handle user unfollow', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Process webhook event
   */
  async processWebhookEvent(
    event: ZaloWebhookEvent
  ): Promise<{
    success: boolean;
    eventType: string;
    data?: any;
    error?: string;
  }> {
    try {
      switch (event.event) {
        case 'user_send_message':
          const messageData = this.handleUserMessage(event);
          return {
            success: messageData !== null,
            eventType: 'user_send_message',
            data: messageData,
          };

        case 'user_follow_official_account':
          const followData = this.handleUserFollow(event);
          return {
            success: followData !== null,
            eventType: 'user_follow_official_account',
            data: followData,
          };

        case 'user_unfollow_official_account':
          const unfollowData = this.handleUserUnfollow(event);
          return {
            success: unfollowData !== null,
            eventType: 'user_unfollow_official_account',
            data: unfollowData,
          };

        default:
          logger.warn('Unknown webhook event type', { event: event.event });
          return {
            success: false,
            eventType: event.event,
            error: 'Unknown event type',
          };
      }
    } catch (error) {
      logger.error('Failed to process webhook event', {
        event: event.event,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        eventType: event.event,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export function createZaloWebhookHandler(
  secretKey?: string,
  oaId?: string
): ZaloWebhookHandler {
  return new ZaloWebhookHandler(
    secretKey || process.env.ZALO_WEBHOOK_SECRET_KEY || '',
    oaId || process.env.ZALO_OFFICIAL_ACCOUNT_ID || ''
  );
}

