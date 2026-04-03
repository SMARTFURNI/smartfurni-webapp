import { logger } from '../../utils/logger';
import { emailTriggerManager, EmailTrigger } from './EmailTriggerManager';
import { emailService } from './EmailService';

export interface ScheduledEmailJob {
  id: string;
  trigger: EmailTrigger;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
  error?: string;
}

/**
 * Email Scheduler
 * Manages scheduled email sending based on triggers
 */
export class EmailScheduler {
  private jobs: Map<string, ScheduledEmailJob> = new Map();
  private isRunning: boolean = false;
  private checkIntervalMs: number = 60000; // Check every minute
  private checkInterval?: NodeJS.Timeout;

  /**
   * Start scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Email scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Email scheduler started');

    // Check for pending triggers every minute
    this.checkInterval = setInterval(() => {
      this.processPendingTriggers().catch((error) => {
        logger.error('Error processing pending triggers', { error });
      });
    }, this.checkIntervalMs);
  }

  /**
   * Stop scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Email scheduler is not running');
      return;
    }

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    logger.info('Email scheduler stopped');
  }

  /**
   * Process pending triggers
   */
  private async processPendingTriggers(): Promise<void> {
    const pendingTriggers = emailTriggerManager.getPendingTriggers();

    if (pendingTriggers.length === 0) {
      return;
    }

    logger.info('Processing pending email triggers', {
      count: pendingTriggers.length,
    });

    for (const trigger of pendingTriggers) {
      try {
        await this.processTrigger(trigger);
      } catch (error) {
        logger.error('Failed to process trigger', {
          trigger,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Process individual trigger
   */
  private async processTrigger(trigger: EmailTrigger): Promise<void> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: ScheduledEmailJob = {
      id: jobId,
      trigger,
      status: 'processing',
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    try {
      logger.info('Processing email trigger', {
        jobId,
        leadId: trigger.leadId,
        triggerType: trigger.type,
      });

      // TODO: Fetch lead data from database
      // TODO: Generate email using EmailGenerator
      // TODO: Send email using EmailService
      // TODO: Track email sent

      job.status = 'completed';
      job.processedAt = new Date();

      logger.info('Email trigger processed successfully', { jobId });

      // Remove trigger from active triggers
      emailTriggerManager.removeTrigger(trigger);
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.processedAt = new Date();

      logger.error('Failed to process email trigger', {
        jobId,
        error: job.error,
      });
    }
  }

  /**
   * Schedule email manually
   */
  async scheduleEmail(
    trigger: EmailTrigger
  ): Promise<ScheduledEmailJob> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const job: ScheduledEmailJob = {
      id: jobId,
      trigger,
      status: 'pending',
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    logger.info('Email scheduled', {
      jobId,
      leadId: trigger.leadId,
      scheduledFor: trigger.scheduledFor,
    });

    return job;
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): ScheduledEmailJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ScheduledEmailJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: string): ScheduledEmailJob[] {
    return Array.from(this.jobs.values()).filter((job) => job.status === status);
  }

  /**
   * Get jobs for lead
   */
  getJobsForLead(leadId: string): ScheduledEmailJob[] {
    return Array.from(this.jobs.values()).filter(
      (job) => job.trigger.leadId === leadId
    );
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === 'pending' || job.status === 'processing') {
      this.jobs.delete(jobId);
      emailTriggerManager.removeTrigger(job.trigger);
      logger.info('Email job cancelled', { jobId });
      return true;
    }

    return false;
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    totalJobs: number;
    pendingJobs: number;
    completedJobs: number;
    failedJobs: number;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      isRunning: this.isRunning,
      totalJobs: jobs.length,
      pendingJobs: jobs.filter((j) => j.status === 'pending').length,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
      failedJobs: jobs.filter((j) => j.status === 'failed').length,
    };
  }
}

export const emailScheduler = new EmailScheduler();

