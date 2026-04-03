import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface ZaloMessage {
  userId: string;
  displayName: string;
  message: string;
  timestamp: number;
}

export interface ZaloSendMessageOptions {
  userId: string;
  message: string;
  quickReplies?: Array<{
    label: string;
    payload: string;
  }>;
}

export interface SendZaloMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Zalo Integration Service
 * Handles all interactions with Zalo OA API
 */
export class ZaloIntegration {
  private client: AxiosInstance;
  private oaId: string;
  private accessToken: string;
  private secretKey: string;
  private baseUrl = 'https://openapi.zalo.me/v2.0';

  constructor() {
    this.oaId = process.env.ZALO_OA_ID || '';
    this.accessToken = process.env.ZALO_ACCESS_TOKEN || '';
    this.secretKey = process.env.ZALO_SECRET_KEY || '';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!this.oaId || !this.accessToken) {
      logger.warn('Zalo API credentials not fully configured');
    } else {
      logger.info('Zalo Integration initialized', { oaId: this.oaId });
    }
  }

  /**
   * Send message to user
   */
  async sendMessage(options: ZaloSendMessageOptions): Promise<SendZaloMessageResult> {
    try {
      const payload = {
        recipient: {
          user_id: options.userId,
        },
        message: {
          text: options.message,
        },
      };

      // Add quick replies if provided
      if (options.quickReplies && options.quickReplies.length > 0) {
        (payload.message as any).quick_reply = {
          items: options.quickReplies.map((qr) => ({
            title: qr.label,
            payload: qr.payload,
          })),
        };
      }

      const response = await this.client.post('/oa/message/cs/send', payload);

      if (response.data.error === 0) {
        logger.info('Zalo message sent successfully', {
          userId: options.userId,
          messageId: response.data.data?.message_id,
        });

        return {
          success: true,
          messageId: response.data.data?.message_id,
        };
      } else {
        throw new Error(response.data.message || 'Unknown error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to send Zalo message', {
        userId: options.userId,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<{
    success: boolean;
    profile?: {
      userId: string;
      displayName: string;
      avatar: string;
      gender?: string;
    };
    error?: string;
  }> {
    try {
      const response = await this.client.get(`/oa/getprofile?user_id=${userId}`);

      if (response.data.error === 0) {
        const data = response.data.data;
        return {
          success: true,
          profile: {
            userId: data.user_id,
            displayName: data.display_name,
            avatar: data.avatar,
            gender: data.gender,
          },
        };
      } else {
        throw new Error(response.data.message || 'Unknown error');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get Zalo user profile', {
        userId,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(userId: string): Promise<boolean> {
    try {
      const response = await this.client.post('/oa/message/cs/typing', {
        recipient: {
          user_id: userId,
        },
      });

      return response.data.error === 0;
    } catch (error) {
      logger.warn('Failed to send typing indicator', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    timestamp: string,
    signature: string,
    body: string
  ): boolean {
    try {
      const crypto = require('crypto');
      const data = `${timestamp}.${body}`;
      const hash = crypto
        .createHmac('sha256', this.secretKey)
        .update(data)
        .digest('hex');

      return hash === signature;
    } catch (error) {
      logger.error('Failed to verify webhook signature', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Parse webhook event
   */
  parseWebhookEvent(body: any): {
    type: string;
    userId: string;
    message?: string;
    timestamp: number;
  } | null {
    try {
      if (body.event_name === 'user_received_message') {
        const message = body.message;
        return {
          type: 'message',
          userId: message.from_id,
          message: message.text,
          timestamp: message.timestamp,
        };
      } else if (body.event_name === 'user_followed_oa') {
        return {
          type: 'follow',
          userId: body.follower_id,
          timestamp: body.timestamp,
        };
      } else if (body.event_name === 'user_unfollow_oa') {
        return {
          type: 'unfollow',
          userId: body.user_id,
          timestamp: body.timestamp,
        };
      }

      return null;
    } catch (error) {
      logger.error('Failed to parse webhook event', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.accessToken) {
        return false;
      }

      // Try to get OA info
      const response = await this.client.get('/oa/getinfo');
      return response.data.error === 0;
    } catch (error) {
      logger.error('Zalo health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

export const zaloIntegration = new ZaloIntegration();

