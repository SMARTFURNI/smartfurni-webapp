import { logger } from '../../utils/logger';
import { EmailGenerationRequest } from './EmailGenerator';

export type EmailTriggerType =
  | 'new_lead'
  | 'no_interaction_3days'
  | 'quote_sent'
  | 'successful_close'
  | 'manual';

export interface EmailTrigger {
  type: EmailTriggerType;
  leadId: string;
  emailType: string;
  conditions?: Record<string, any>;
  priority?: 'high' | 'medium' | 'low';
  scheduledFor?: Date;
}

export interface TriggerConfig {
  enabled: boolean;
  emailType: string;
  delayMinutes?: number;
  conditions?: Record<string, any>;
}

/**
 * Email Trigger Manager
 * Manages email sending triggers based on lead events
 */
export class EmailTriggerManager {
  private triggerConfigs: Map<EmailTriggerType, TriggerConfig> = new Map([
    [
      'new_lead',
      {
        enabled: true,
        emailType: 'chao_hang',
        delayMinutes: 5,
      },
    ],
    [
      'no_interaction_3days',
      {
        enabled: true,
        emailType: 'follow_up',
        delayMinutes: 0,
      },
    ],
    [
      'quote_sent',
      {
        enabled: true,
        emailType: 'follow_up',
        delayMinutes: 1440, // 24 hours
      },
    ],
    [
      'successful_close',
      {
        enabled: true,
        emailType: 'thank_you',
        delayMinutes: 0,
      },
    ],
  ]);

  private activeTriggers: Map<string, EmailTrigger[]> = new Map();

  /**
   * Register trigger configuration
   */
  registerTrigger(
    type: EmailTriggerType,
    config: TriggerConfig
  ): void {
    this.triggerConfigs.set(type, config);
    logger.info('Email trigger registered', { type, config });
  }

  /**
   * Get trigger configuration
   */
  getTriggerConfig(type: EmailTriggerType): TriggerConfig | undefined {
    return this.triggerConfigs.get(type);
  }

  /**
   * Check if trigger should fire
   */
  shouldFireTrigger(
    trigger: EmailTrigger
  ): boolean {
    const config = this.triggerConfigs.get(trigger.type);

    if (!config || !config.enabled) {
      return false;
    }

    // Check conditions if any
    if (config.conditions && trigger.conditions) {
      for (const [key, value] of Object.entries(config.conditions)) {
        if (trigger.conditions[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Create trigger for new lead
   */
  createNewLeadTrigger(leadId: string, leadData: any): EmailTrigger | null {
    const config = this.triggerConfigs.get('new_lead');
    if (!config || !config.enabled) {
      return null;
    }

    const trigger: EmailTrigger = {
      type: 'new_lead',
      leadId,
      emailType: config.emailType,
      priority: 'high',
      scheduledFor: new Date(
        Date.now() + (config.delayMinutes || 0) * 60000
      ),
    };

    this.addTrigger(trigger);
    logger.info('New lead trigger created', { leadId });

    return trigger;
  }

  /**
   * Create trigger for inactive lead
   */
  createInactivityTrigger(
    leadId: string,
    daysSinceInteraction: number
  ): EmailTrigger | null {
    if (daysSinceInteraction < 3) {
      return null;
    }

    const config = this.triggerConfigs.get('no_interaction_3days');
    if (!config || !config.enabled) {
      return null;
    }

    const trigger: EmailTrigger = {
      type: 'no_interaction_3days',
      leadId,
      emailType: config.emailType,
      priority: 'medium',
      conditions: { daysSinceInteraction },
      scheduledFor: new Date(
        Date.now() + (config.delayMinutes || 0) * 60000
      ),
    };

    this.addTrigger(trigger);
    logger.info('Inactivity trigger created', { leadId, daysSinceInteraction });

    return trigger;
  }

  /**
   * Create trigger for quote sent
   */
  createQuoteSentTrigger(leadId: string, quoteId: string): EmailTrigger | null {
    const config = this.triggerConfigs.get('quote_sent');
    if (!config || !config.enabled) {
      return null;
    }

    const trigger: EmailTrigger = {
      type: 'quote_sent',
      leadId,
      emailType: config.emailType,
      priority: 'high',
      conditions: { quoteId },
      scheduledFor: new Date(
        Date.now() + (config.delayMinutes || 0) * 60000
      ),
    };

    this.addTrigger(trigger);
    logger.info('Quote sent trigger created', { leadId, quoteId });

    return trigger;
  }

  /**
   * Create trigger for successful close
   */
  createSuccessfulCloseTrigger(
    leadId: string,
    orderId: string
  ): EmailTrigger | null {
    const config = this.triggerConfigs.get('successful_close');
    if (!config || !config.enabled) {
      return null;
    }

    const trigger: EmailTrigger = {
      type: 'successful_close',
      leadId,
      emailType: config.emailType,
      priority: 'high',
      conditions: { orderId },
      scheduledFor: new Date(
        Date.now() + (config.delayMinutes || 0) * 60000
      ),
    };

    this.addTrigger(trigger);
    logger.info('Successful close trigger created', { leadId, orderId });

    return trigger;
  }

  /**
   * Add trigger to active triggers
   */
  private addTrigger(trigger: EmailTrigger): void {
    if (!this.activeTriggers.has(trigger.leadId)) {
      this.activeTriggers.set(trigger.leadId, []);
    }
    this.activeTriggers.get(trigger.leadId)!.push(trigger);
  }

  /**
   * Get pending triggers
   */
  getPendingTriggers(): EmailTrigger[] {
    const now = new Date();
    const pending: EmailTrigger[] = [];

    for (const triggers of this.activeTriggers.values()) {
      for (const trigger of triggers) {
        if (
          trigger.scheduledFor &&
          trigger.scheduledFor <= now &&
          this.shouldFireTrigger(trigger)
        ) {
          pending.push(trigger);
        }
      }
    }

    return pending;
  }

  /**
   * Remove trigger after processing
   */
  removeTrigger(trigger: EmailTrigger): void {
    const triggers = this.activeTriggers.get(trigger.leadId);
    if (triggers) {
      const index = triggers.indexOf(trigger);
      if (index > -1) {
        triggers.splice(index, 1);
      }
    }
  }

  /**
   * Get all active triggers
   */
  getAllActiveTriggers(): EmailTrigger[] {
    const all: EmailTrigger[] = [];
    for (const triggers of this.activeTriggers.values()) {
      all.push(...triggers);
    }
    return all;
  }
}

export const emailTriggerManager = new EmailTriggerManager();

