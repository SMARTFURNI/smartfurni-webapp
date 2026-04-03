import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';

export interface ZaloSendMessageRequest {
  recipient: {
    user_id: string;
  };
  message: {
    text?: string;
    attachment?: {
      type: 'image' | 'video' | 'file' | 'template';
      payload: any;
    };
  };
}

export interface ZaloSendMessageResponse {
  error: number;
  message: string;
  data?: {
    message_id: string;
  };
}

/**
 * Zalo API Client
 * Handles communication with Zalo API
 */
export class ZaloAPIClient {
  private client: AxiosInstance;
  private accessToken: string;
  private oaId: string;
  private baseUrl: string = 'https://openapi.zalo.me/v2.0';

  constructor(accessToken: string, oaId: string) {
    this.accessToken = accessToken;
    this.oaId = oaId;

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.accessToken,
      },
    });
  }

  /**
   * Send text message
   */
  async sendTextMessage(
    userId: string,
    text: string
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      logger.info('Sending Zalo text message', {
        userId,
        textLength: text.length,
      });

      const payload: ZaloSendMessageRequest = {
        recipient: { user_id: userId },
        message: { text },
      };

      const response = await this.client.post<ZaloSendMessageResponse>(
        '/message/text',
        payload
      );

      if (response.data.error !== 0) {
        throw new Error(`Zalo API error: ${response.data.message}`);
      }

      logger.info('Zalo message sent successfully', {
        userId,
        messageId: response.data.data?.message_id,
      });

      return {
        success: true,
        messageId: response.data.data?.message_id,
      };
    } catch (error) {
      logger.error('Failed to send Zalo message', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send quick reply message
   */
  async sendQuickReplyMessage(
    userId: string,
    text: string,
    quickReplies: string[]
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      logger.info('Sending Zalo quick reply message', {
        userId,
        quickRepliesCount: quickReplies.length,
      });

      // Zalo quick reply template
      const payload: ZaloSendMessageRequest = {
        recipient: { user_id: userId },
        message: {
          attachment: {
            type: 'template',
            payload: {
              template_type: 'button',
              elements: [
                {
                  title: text,
                  buttons: quickReplies.map((reply) => ({
                    type: 'postback',
                    title: reply,
                    payload: reply,
                  })),
                },
              ],
            },
          },
        },
      };

      const response = await this.client.post<ZaloSendMessageResponse>(
        '/message/template',
        payload
      );

      if (response.data.error !== 0) {
        throw new Error(`Zalo API error: ${response.data.message}`);
      }

      logger.info('Zalo quick reply message sent successfully', {
        userId,
        messageId: response.data.data?.message_id,
      });

      return {
        success: true,
        messageId: response.data.data?.message_id,
      };
    } catch (error) {
      logger.error('Failed to send Zalo quick reply message', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(userId: string): Promise<{
    success: boolean;
    data?: {
      user_id: string;
      display_name: string;
      avatar: string;
    };
    error?: string;
  }> {
    try {
      logger.info('Fetching Zalo user info', { userId });

      const response = await this.client.get(`/user/${userId}/profile`);

      if (response.data.error !== 0) {
        throw new Error(`Zalo API error: ${response.data.message}`);
      }

      logger.info('User info fetched successfully', { userId });

      return {
        success: true,
        data: {
          user_id: response.data.data.user_id,
          display_name: response.data.data.display_name,
          avatar: response.data.data.avatar,
        },
      };
    } catch (error) {
      logger.error('Failed to fetch user info', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      logger.info('Marking message as read', { userId });

      const response = await this.client.post(`/user/${userId}/seen`);

      if (response.data.error !== 0) {
        throw new Error(`Zalo API error: ${response.data.message}`);
      }

      logger.info('Message marked as read', { userId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to mark message as read', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Create Zalo API client from environment variables
 */
export function createZaloAPIClient(): ZaloAPIClient {
  const accessToken = process.env.ZALO_ACCESS_TOKEN;
  const oaId = process.env.ZALO_OFFICIAL_ACCOUNT_ID;

  if (!accessToken || !oaId) {
    throw new Error(
      'ZALO_ACCESS_TOKEN and ZALO_OFFICIAL_ACCOUNT_ID environment variables are required'
    );
  }

  return new ZaloAPIClient(accessToken, oaId);
}

export const zaloAPIClient = createZaloAPIClient();

