import { logger } from '../../utils/logger';

export interface EmailTrackingData {
  leadId: string;
  emailId: string;
  subject: string;
  emailType: string;
  tokensUsed: number;
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  convertedAt?: Date;
}

/**
 * Email Tracker Service
 * Tracks email metrics and engagement
 */
export class EmailTracker {
  private trackingData: Map<string, EmailTrackingData> = new Map();

  /**
   * Track email sent
   */
  async trackEmailSent(data: Omit<EmailTrackingData, 'sentAt'>): Promise<void> {
    try {
      const trackingData: EmailTrackingData = {
        ...data,
        sentAt: new Date(),
      };

      this.trackingData.set(data.emailId, trackingData);

      logger.info('Email tracked as sent', {
        leadId: data.leadId,
        emailId: data.emailId,
        emailType: data.emailType,
      });

      // TODO: Save to database
      // await db.emailTracking.create(trackingData);
    } catch (error) {
      logger.error('Failed to track email sent', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Track email opened
   */
  async trackEmailOpened(emailId: string): Promise<void> {
    try {
      const tracking = this.trackingData.get(emailId);
      if (tracking) {
        tracking.openedAt = new Date();
      }

      logger.info('Email tracked as opened', { emailId });

      // TODO: Update database
      // await db.emailTracking.update({ emailId }, { openedAt: new Date() });
    } catch (error) {
      logger.error('Failed to track email opened', {
        emailId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Track email clicked
   */
  async trackEmailClicked(emailId: string, linkUrl?: string): Promise<void> {
    try {
      const tracking = this.trackingData.get(emailId);
      if (tracking) {
        tracking.clickedAt = new Date();
      }

      logger.info('Email tracked as clicked', { emailId, linkUrl });

      // TODO: Update database
      // await db.emailTracking.update({ emailId }, { clickedAt: new Date() });
    } catch (error) {
      logger.error('Failed to track email clicked', {
        emailId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Track email converted (lead took action)
   */
  async trackEmailConverted(emailId: string, action: string): Promise<void> {
    try {
      const tracking = this.trackingData.get(emailId);
      if (tracking) {
        tracking.convertedAt = new Date();
      }

      logger.info('Email tracked as converted', { emailId, action });

      // TODO: Update database
      // await db.emailTracking.update({ emailId }, { convertedAt: new Date() });
    } catch (error) {
      logger.error('Failed to track email converted', {
        emailId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get tracking data for email
   */
  getTrackingData(emailId: string): EmailTrackingData | undefined {
    return this.trackingData.get(emailId);
  }

  /**
   * Get tracking data for lead
   */
  getLeadTrackingData(leadId: string): EmailTrackingData[] {
    const data: EmailTrackingData[] = [];
    for (const tracking of this.trackingData.values()) {
      if (tracking.leadId === leadId) {
        data.push(tracking);
      }
    }
    return data;
  }

  /**
   * Calculate email metrics
   */
  calculateMetrics(leadId?: string): {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalConverted: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  } {
    let emails: EmailTrackingData[] = [];

    if (leadId) {
      emails = this.getLeadTrackingData(leadId);
    } else {
      emails = Array.from(this.trackingData.values());
    }

    const totalSent = emails.length;
    const totalOpened = emails.filter((e) => e.openedAt).length;
    const totalClicked = emails.filter((e) => e.clickedAt).length;
    const totalConverted = emails.filter((e) => e.convertedAt).length;

    return {
      totalSent,
      totalOpened,
      totalClicked,
      totalConverted,
      openRate: totalSent > 0 ? totalOpened / totalSent : 0,
      clickRate: totalSent > 0 ? totalClicked / totalSent : 0,
      conversionRate: totalSent > 0 ? totalConverted / totalSent : 0,
    };
  }
}

