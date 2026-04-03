import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';

export interface FacebookLead {
  id: string;
  createdTime: string;
  adId: string;
  adName: string;
  adsetId: string;
  adsetName: string;
  campaignId: string;
  campaignName: string;
  fieldData: Array<{
    name: string;
    values: string[];
  }>;
}

export interface ParsedFacebookLead {
  leadId: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  source: string;
  createdAt: Date;
}

/**
 * Facebook Lead Ads Integration Service
 * Handles webhook events from Facebook Lead Ads
 */
export class FacebookLeadIntegration {
  private client: AxiosInstance;
  private appId: string;
  private appSecret: string;
  private accessToken: string;
  private pageId: string;
  private baseUrl = 'https://graph.facebook.com/v18.0';

  constructor() {
    this.appId = process.env.FACEBOOK_APP_ID || '';
    this.appSecret = process.env.FACEBOOK_APP_SECRET || '';
    this.accessToken = process.env.FACEBOOK_ACCESS_TOKEN || '';
    this.pageId = process.env.FACEBOOK_PAGE_ID || '';

    this.client = axios.create({
      baseURL: this.baseUrl,
      params: {
        access_token: this.accessToken,
      },
    });

    if (!this.appId || !this.accessToken) {
      logger.warn('Facebook API credentials not fully configured');
    } else {
      logger.info('Facebook Lead Integration initialized', { pageId: this.pageId });
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    try {
      const crypto = require('crypto');
      const hash = crypto
        .createHmac('sha1', this.appSecret)
        .update(body)
        .digest('hex');

      return hash === signature;
    } catch (error) {
      logger.error('Failed to verify Facebook webhook signature', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Parse lead from webhook event
   */
  async parseLead(leadId: string): Promise<{
    success: boolean;
    lead?: ParsedFacebookLead;
    error?: string;
  }> {
    try {
      const response = await this.client.get(`/${leadId}`);
      const data = response.data;

      // Extract field data
      const fieldDataMap: Record<string, string> = {};
      if (data.field_data) {
        for (const field of data.field_data) {
          fieldDataMap[field.name] = field.values[0] || '';
        }
      }

      const lead: ParsedFacebookLead = {
        leadId: data.id,
        name: fieldDataMap['full_name'] || fieldDataMap['name'] || '',
        email: fieldDataMap['email'] || '',
        phone: fieldDataMap['phone_number'] || fieldDataMap['phone'] || '',
        company: fieldDataMap['company'] || fieldDataMap['business_name'] || undefined,
        source: 'facebook_lead_ads',
        createdAt: new Date(data.created_time),
      };

      logger.info('Facebook lead parsed successfully', {
        leadId: lead.leadId,
        name: lead.name,
      });

      return {
        success: true,
        lead,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to parse Facebook lead', {
        leadId,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get leads from form
   */
  async getLeadsFromForm(
    formId: string,
    limit: number = 100
  ): Promise<{
    success: boolean;
    leads?: ParsedFacebookLead[];
    error?: string;
  }> {
    try {
      const response = await this.client.get(`/${formId}/leads`, {
        params: {
          limit,
          fields: 'id,created_time,field_data,ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name',
        },
      });

      const leads: ParsedFacebookLead[] = [];

      for (const lead of response.data.data) {
        const fieldDataMap: Record<string, string> = {};
        if (lead.field_data) {
          for (const field of lead.field_data) {
            fieldDataMap[field.name] = field.values[0] || '';
          }
        }

        leads.push({
          leadId: lead.id,
          name: fieldDataMap['full_name'] || fieldDataMap['name'] || '',
          email: fieldDataMap['email'] || '',
          phone: fieldDataMap['phone_number'] || fieldDataMap['phone'] || '',
          company: fieldDataMap['company'] || fieldDataMap['business_name'] || undefined,
          source: 'facebook_lead_ads',
          createdAt: new Date(lead.created_time),
        });
      }

      logger.info('Fetched leads from Facebook form', {
        formId,
        count: leads.length,
      });

      return {
        success: true,
        leads,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to get leads from Facebook form', {
        formId,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
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

      // Try to get page info
      const response = await this.client.get(`/${this.pageId}`);
      return response.status === 200;
    } catch (error) {
      logger.error('Facebook health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

export const facebookLeadIntegration = new FacebookLeadIntegration();

