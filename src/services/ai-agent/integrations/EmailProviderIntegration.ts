import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email Provider Integration Service
 * Handles email sending via Gmail or SendGrid
 */
export class EmailProviderIntegration {
  private transporter: nodemailer.Transporter | null = null;
  private provider: string;
  private fromAddress: string;
  private fromName: string;

  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'gmail';
    this.fromAddress = process.env.EMAIL_FROM_ADDRESS || 'noreply@smartfurni.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'SmartFurni CRM';

    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  private initializeTransporter(): void {
    try {
      if (this.provider === 'gmail') {
        const gmailUser = process.env.GMAIL_USER;
        const gmailPassword = process.env.GMAIL_APP_PASSWORD;

        if (!gmailUser || !gmailPassword) {
          throw new Error('Gmail credentials not configured');
        }

        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailPassword,
          },
        });

        logger.info('Gmail email provider initialized', { user: gmailUser });
      } else if (this.provider === 'sendgrid') {
        const sendgridApiKey = process.env.SENDGRID_API_KEY;

        if (!sendgridApiKey) {
          throw new Error('SendGrid API key not configured');
        }

        // SendGrid SMTP configuration
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: {
            user: 'apikey',
            pass: sendgridApiKey,
          },
        });

        logger.info('SendGrid email provider initialized');
      } else {
        throw new Error(`Unknown email provider: ${this.provider}`);
      }
    } catch (error) {
      logger.error('Failed to initialize email provider', {
        provider: this.provider,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: EmailOptions): Promise<SendEmailResult> {
    if (!this.transporter) {
      return {
        success: false,
        error: 'Email transporter not initialized',
      };
    }

    try {
      const mailOptions = {
        from: `${this.fromName} <${this.fromAddress}>`,
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc?.join(','),
        bcc: options.bcc?.join(','),
        replyTo: options.replyTo,
        attachments: options.attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: options.to,
        subject: options.subject,
        provider: this.provider,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to send email', {
        to: options.to,
        subject: options.subject,
        error: errorMessage,
        provider: this.provider,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send batch emails
   */
  async sendBatchEmails(
    recipients: Array<{
      email: string;
      name: string;
      subject: string;
      html: string;
    }>
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: SendEmailResult[];
  }> {
    const results: SendEmailResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const recipient of recipients) {
      const result = await this.sendEmail({
        to: recipient.email,
        subject: recipient.subject,
        html: recipient.html,
      });

      results.push(result);
      if (result.success) {
        successful++;
      } else {
        failed++;
      }

      // Rate limiting: 1 email per second
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    logger.info('Batch email sending completed', {
      total: recipients.length,
      successful,
      failed,
    });

    return {
      total: recipients.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Verify email address
   */
  async verifyEmailAddress(email: string): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email provider verified successfully');
      return true;
    } catch (error) {
      logger.error('Email provider verification failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }

      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email provider health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

export const emailProviderIntegration = new EmailProviderIntegration();

