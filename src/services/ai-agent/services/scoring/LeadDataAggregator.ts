import { logger } from '../../utils/logger';

export interface LeadProfile {
  leadId: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  industry?: string;
  location?: string;
  jobTitle?: string;
  source: 'facebook' | 'tiktok' | 'website' | 'zalo' | 'email' | 'manual';
  createdAt: Date;
}

export interface EmailEngagementData {
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsConverted: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  lastEmailDate?: Date;
}

export interface ZaloEngagementData {
  messagesReceived: number;
  messagesReplied: number;
  responseRate: number;
  lastMessageDate?: Date;
  averageResponseTime?: number; // in seconds
}

export interface BehaviorData {
  websiteVisits: number;
  productPagesViewed: string[];
  priceInquiries: number;
  demoRequests: number;
  contentDownloads: number;
  lastVisitDate?: Date;
}

export interface AggregatedLeadData {
  profile: LeadProfile;
  emailEngagement: EmailEngagementData;
  zaloEngagement: ZaloEngagementData;
  behavior: BehaviorData;
  recencyDays: number;
  frequencyScore: number; // 0-100
  monetaryValue: number; // Estimated in USD
}

/**
 * Lead Data Aggregator
 * Collects and aggregates data from multiple sources
 */
export class LeadDataAggregator {
  /**
   * Aggregate all lead data
   */
  async aggregateLeadData(leadId: string): Promise<AggregatedLeadData | null> {
    try {
      logger.info('Aggregating lead data', { leadId });

      // TODO: Fetch data from database
      // const profile = await db.leads.findById(leadId);
      // const emailData = await db.emailTracking.aggregate({ leadId });
      // const zaloData = await db.zaloConversations.aggregate({ leadId });
      // const behaviorData = await db.leadBehavior.findById(leadId);

      // Mock data for now
      const aggregatedData: AggregatedLeadData = {
        profile: {
          leadId,
          name: 'Nguyễn Văn A',
          email: 'nguyenvana@company.com',
          phone: '0901234567',
          company: 'ABC Hotel Group',
          companySize: 'large',
          industry: 'Hospitality',
          location: 'Ho Chi Minh City',
          jobTitle: 'General Manager',
          source: 'facebook',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        },
        emailEngagement: {
          emailsSent: 5,
          emailsOpened: 4,
          emailsClicked: 2,
          emailsConverted: 0,
          openRate: 0.8,
          clickRate: 0.4,
          conversionRate: 0.0,
          lastEmailDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
        zaloEngagement: {
          messagesReceived: 3,
          messagesReplied: 3,
          responseRate: 1.0,
          lastMessageDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          averageResponseTime: 300, // 5 minutes
        },
        behavior: {
          websiteVisits: 8,
          productPagesViewed: ['smart-bed-pro', 'smart-bed-premium'],
          priceInquiries: 2,
          demoRequests: 1,
          contentDownloads: 0,
          lastVisitDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        recencyDays: 1,
        frequencyScore: 75,
        monetaryValue: 50000, // Estimated $50,000 deal
      };

      logger.info('Lead data aggregated successfully', { leadId });
      return aggregatedData;
    } catch (error) {
      logger.error('Failed to aggregate lead data', {
        leadId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Calculate recency score (0-100)
   * More recent interactions = higher score
   */
  calculateRecencyScore(lastInteractionDate: Date): number {
    const now = new Date();
    const daysSinceInteraction = Math.floor(
      (now.getTime() - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Scoring: 0 days = 100, 30 days = 50, 60+ days = 0
    if (daysSinceInteraction <= 0) return 100;
    if (daysSinceInteraction >= 60) return 0;
    return Math.max(0, 100 - (daysSinceInteraction / 60) * 100);
  }

  /**
   * Calculate frequency score (0-100)
   * Based on interactions in past 30 days
   */
  calculateFrequencyScore(
    emailInteractions: number,
    zaloInteractions: number,
    websiteVisits: number
  ): number {
    // Weight: Email 30%, Zalo 40%, Website 30%
    const emailScore = Math.min(emailInteractions * 20, 100); // Max 5 emails
    const zaloScore = Math.min(zaloInteractions * 25, 100); // Max 4 messages
    const websiteScore = Math.min(websiteVisits * 12.5, 100); // Max 8 visits

    return (
      emailScore * 0.3 + zaloScore * 0.4 + websiteScore * 0.3
    );
  }

  /**
   * Estimate monetary value based on company profile
   */
  estimateMonetaryValue(
    companySize?: string,
    industry?: string
  ): number {
    let baseValue = 10000; // Base $10,000

    // Company size multiplier
    const sizeMultiplier: Record<string, number> = {
      startup: 1.0,
      small: 1.5,
      medium: 2.0,
      large: 3.0,
      enterprise: 5.0,
    };
    baseValue *= sizeMultiplier[companySize || 'small'] || 1.5;

    // Industry multiplier
    const industryMultiplier: Record<string, number> = {
      hospitality: 2.0,
      healthcare: 2.5,
      finance: 2.0,
      retail: 1.5,
      technology: 1.8,
      manufacturing: 1.5,
      education: 1.2,
    };
    baseValue *= industryMultiplier[industry?.toLowerCase() || 'retail'] || 1.0;

    return baseValue;
  }

  /**
   * Get engagement summary
   */
  getEngagementSummary(data: AggregatedLeadData): {
    totalInteractions: number;
    primaryChannel: string;
    engagementLevel: 'high' | 'medium' | 'low';
  } {
    const emailInteractions = data.emailEngagement.emailsSent;
    const zaloInteractions = data.zaloEngagement.messagesReceived;
    const websiteInteractions = data.behavior.websiteVisits;

    const totalInteractions =
      emailInteractions + zaloInteractions + websiteInteractions;

    let primaryChannel = 'website';
    if (zaloInteractions > emailInteractions && zaloInteractions > websiteInteractions) {
      primaryChannel = 'zalo';
    } else if (
      emailInteractions > zaloInteractions &&
      emailInteractions > websiteInteractions
    ) {
      primaryChannel = 'email';
    }

    let engagementLevel: 'high' | 'medium' | 'low' = 'low';
    if (totalInteractions >= 10) {
      engagementLevel = 'high';
    } else if (totalInteractions >= 5) {
      engagementLevel = 'medium';
    }

    return {
      totalInteractions,
      primaryChannel,
      engagementLevel,
    };
  }
}

export const leadDataAggregator = new LeadDataAggregator();

