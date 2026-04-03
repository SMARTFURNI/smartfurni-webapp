import nodemailer from 'nodemailer';
import { logger } from '../../../utils/logger';

export interface EmailProviderConfig {
  provider: 'gmail' | 'sendgrid' | 'smtp';
  from: string;
  auth?: {
    user?: string;
    pass?: string;
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    apiKey?: string;
  };
}

/**
 * Nodemailer Email Provider
 * Handles actual email sending
 */
export class NodemailerProvider {
  private transporter: nodemailer.Transporter;
  private config: EmailProviderConfig;

  constructor(config: EmailProviderConfig) {
    this.config = config;
    this.transporter = this.createTransporter(config);
  }

  /**
   * Create transporter based on provider type
   */
  private createTransporter(
    config: EmailProviderConfig
  ): nodemailer.Transporter {
    switch (config.provider) {
      case 'gmail':
        return nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: config.auth?.user,
            pass: config.auth?.pass,
            clientId: config.auth?.clientId,
            clientSecret: config.auth?.clientSecret,
            refreshToken: config.auth?.refreshToken,
          },
        });

      case 'sendgrid':
        return nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: {
            user: 'apikey',
            pass: config.auth?.apiKey,
          },
        });

      case 'smtp':
        return nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: config.auth?.user || process.env.SMTP_USER,
            pass: config.auth?.pass || process.env.SMTP_PASSWORD,
          },
        });

      default:
        throw new Error(`Unsupported email provider: ${config.provider}`);
    }
  }

  /**
   * Send email
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
  }): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      logger.info('Sending email via Nodemailer', {
        to: options.to,
        subject: options.subject,
        provider: this.config.provider,
      });

      const result = await this.transporter.sendMail({
        from: this.config.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
      });

      logger.info('Email sent successfully', {
        messageId: result.messageId,
        to: options.to,
      });

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error) {
      logger.error('Failed to send email', {
        to: options.to,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send bulk emails
   */
  async sendBulkEmails(
    emails: Array<{
      to: string;
      subject: string;
      text?: string;
      html?: string;
    }>
  ): Promise<
    Array<{
      to: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }>
  > {
    logger.info('Sending bulk emails', { count: emails.length });

    const results = await Promise.all(
      emails.map((email) =>
        this.sendEmail(email).then((result) => ({
          to: email.to,
          ...result,
        }))
      )
    );

    const successful = results.filter((r) => r.success).length;
    logger.info('Bulk email sending completed', {
      total: emails.length,
      successful,
      failed: emails.length - successful,
    });

    return results;
  }

  /**
   * Verify connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      logger.info('Email provider connection verified', {
        provider: this.config.provider,
      });
      return true;
    } catch (error) {
      logger.error('Email provider connection failed', {
        provider: this.config.provider,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}

/**
 * Factory function to create provider
 */
export function createEmailProvider(
  config: EmailProviderConfig
): NodemailerProvider {
  return new NodemailerProvider(config);
}

/**
 * Create provider from environment variables
 */
export function createEmailProviderFromEnv(): NodemailerProvider {
  const provider = (process.env.EMAIL_PROVIDER || 'smtp') as
    | 'gmail'
    | 'sendgrid'
    | 'smtp';

  const config: EmailProviderConfig = {
    provider,
    from: process.env.SMTP_FROM_EMAIL || 'noreply@smartfurni.com',
  };

  if (provider === 'gmail') {
    config.auth = {
      user: process.env.GMAIL_CLIENT_ID,
      pass: process.env.GMAIL_CLIENT_SECRET,
      refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    };
  } else if (provider === 'sendgrid') {
    config.auth = {
      apiKey: process.env.SENDGRID_API_KEY,
    };
  } else {
    config.auth = {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    };
  }

  return new NodemailerProvider(config);
}

