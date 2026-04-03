import { emailGenerator, EmailGenerationRequest } from './EmailGenerator';
import { EmailTracker } from './EmailTracker';
import { logger } from '../../utils/logger';
import { PerformanceTimer } from '../../utils/monitoring';

export interface SendEmailRequest {
  leadId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  htmlBody?: string;
  scheduling?: {
    type: 'immediate' | 'delay' | 'scheduled';
    delayMinutes?: number;
    scheduledTime?: Date;
  };
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  leadId: string;
  status: 'sent' | 'scheduled' | 'failed';
  sentAt?: Date;
  error?: string;
}

/**
 * Email Service
 * Orchestrates email generation and sending
 */
export class EmailService {
  private emailTracker: EmailTracker;

  constructor() {
    this.emailTracker = new EmailTracker();
  }

  /**
   * Generate and send email in one operation
   */
  async generateAndSendEmail(
    generateRequest: EmailGenerationRequest,
    sendRequest: Partial<SendEmailRequest> = {}
  ): Promise<SendEmailResponse> {
    const timer = new PerformanceTimer('generate_and_send_email');

    try {
      logger.info('Starting generate and send email', {
        leadId: generateRequest.leadId,
        emailType: generateRequest.emailType,
      });

      // Step 1: Generate email
      const generatedEmail = await emailGenerator.generateEmail(generateRequest);

      // Step 2: Send email
      const sendResponse = await this.sendEmail({
        leadId: generateRequest.leadId,
        recipientEmail: generateRequest.email,
        subject: generatedEmail.subject,
        body: generatedEmail.body,
        htmlBody: generatedEmail.htmlBody,
        scheduling: sendRequest.scheduling,
      });

      // Step 3: Track email
      if (sendResponse.success && sendResponse.messageId) {
        await this.emailTracker.trackEmailSent({
          leadId: generateRequest.leadId,
          emailId: sendResponse.messageId,
          subject: generatedEmail.subject,
          emailType: generateRequest.emailType,
          tokensUsed: generatedEmail.tokensUsed.input + generatedEmail.tokensUsed.output,
        });
      }

      const duration = timer.end();

      logger.info('Generate and send email completed', {
        leadId: generateRequest.leadId,
        status: sendResponse.status,
        duration,
      });

      return sendResponse;
    } catch (error) {
      const duration = timer.end();

      logger.error('Generate and send email failed', {
        leadId: generateRequest.leadId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      return {
        success: false,
        leadId: generateRequest.leadId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send email
   */
  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    try {
      logger.info('Sending email', {
        leadId: request.leadId,
        recipientEmail: request.recipientEmail,
      });

      // TODO: Implement actual email sending via Email Provider
      // For now, return mock response

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Simulate scheduling
      if (request.scheduling?.type === 'scheduled' || request.scheduling?.type === 'delay') {
        logger.info('Email scheduled for later sending', {
          leadId: request.leadId,
          messageId,
          scheduledTime: request.scheduling.scheduledTime,
        });

        return {
          success: true,
          messageId,
          leadId: request.leadId,
          status: 'scheduled',
        };
      }

      // Immediate send
      logger.info('Email sent successfully', {
        leadId: request.leadId,
        messageId,
      });

      return {
        success: true,
        messageId,
        leadId: request.leadId,
        status: 'sent',
        sentAt: new Date(),
      };
    } catch (error) {
      logger.error('Email sending failed', {
        leadId: request.leadId,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        leadId: request.leadId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get email analytics
   */
  async getEmailAnalytics(
    leadId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  }> {
    try {
      logger.info('Retrieving email analytics', { leadId, startDate, endDate });

      // TODO: Implement actual analytics retrieval from database
      // For now, return mock data

      return {
        sent: 42,
        delivered: 42,
        opened: 28,
        clicked: 18,
        converted: 5,
        openRate: 0.67,
        clickRate: 0.43,
        conversionRate: 0.12,
      };
    } catch (error) {
      logger.error('Failed to retrieve email analytics', {
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Get email tracker instance
   */
  getTracker(): EmailTracker {
    return this.emailTracker;
  }
}

export const emailService = new EmailService();

