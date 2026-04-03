import { leadScoringEngine } from './LeadScoringEngine';
import { logger } from '../../utils/logger';

/**
 * Scoring Scheduler
 * Manages automatic scoring schedules
 */
export class ScoringScheduler {
  private isRunning: boolean = false;
  private schedules: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scoring scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Scoring scheduler started');

    // Schedule daily batch scoring at 2 AM
    this.scheduleDailyBatchScoring();

    // Schedule re-scoring of warm leads every 3 days
    this.scheduleWarmLeadReScoring();

    // Schedule cleanup of old scores every week
    this.scheduleScoreCleanup();
  }

  /**
   * Stop scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Scoring scheduler is not running');
      return;
    }

    this.isRunning = false;

    for (const [name, timeout] of this.schedules) {
      clearInterval(timeout);
      logger.info('Cleared schedule', { name });
    }

    this.schedules.clear();
    logger.info('Scoring scheduler stopped');
  }

  /**
   * Schedule daily batch scoring
   */
  private scheduleDailyBatchScoring(): void {
    // Run every day at 2 AM
    const schedule = setInterval(async () => {
      try {
        logger.info('Running daily batch scoring');

        // TODO: Fetch all leads from database
        // const leads = await db.leads.find({ status: 'active' });
        // const leadIds = leads.map(l => l.id);
        // await batchScoringService.startBatchScoringJob(leadIds);

        logger.info('Daily batch scoring completed');
      } catch (error) {
        logger.error('Daily batch scoring failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours

    this.schedules.set('daily_batch_scoring', schedule);
    logger.info('Daily batch scoring scheduled');
  }

  /**
   * Schedule warm lead re-scoring
   */
  private scheduleWarmLeadReScoring(): void {
    // Run every 3 days
    const schedule = setInterval(async () => {
      try {
        logger.info('Running warm lead re-scoring');

        // TODO: Fetch warm leads from database
        // const warmLeads = await db.leadScores.find({
        //   classification: 'warm',
        //   validUntil: { $lt: new Date() }
        // });
        // for (const lead of warmLeads) {
        //   await leadScoringEngine.scoreLead(lead.leadId);
        // }

        logger.info('Warm lead re-scoring completed');
      } catch (error) {
        logger.error('Warm lead re-scoring failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 3 * 24 * 60 * 60 * 1000); // Every 3 days

    this.schedules.set('warm_lead_rescoring', schedule);
    logger.info('Warm lead re-scoring scheduled');
  }

  /**
   * Schedule score cleanup
   */
  private scheduleScoreCleanup(): void {
    // Run every week
    const schedule = setInterval(async () => {
      try {
        logger.info('Running score cleanup');

        // TODO: Delete expired scores from database
        // await db.leadScores.deleteMany({
        //   validUntil: { $lt: new Date() }
        // });

        logger.info('Score cleanup completed');
      } catch (error) {
        logger.error('Score cleanup failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 7 * 24 * 60 * 60 * 1000); // Every 7 days

    this.schedules.set('score_cleanup', schedule);
    logger.info('Score cleanup scheduled');
  }

  /**
   * Manually trigger scoring for a lead
   */
  async triggerLeadScoring(leadId: string): Promise<void> {
    try {
      logger.info('Manually triggering lead scoring', { leadId });
      await leadScoringEngine.scoreLead(leadId);
      logger.info('Lead scoring triggered successfully', { leadId });
    } catch (error) {
      logger.error('Failed to trigger lead scoring', {
        leadId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    schedules: string[];
  } {
    return {
      isRunning: this.isRunning,
      schedules: Array.from(this.schedules.keys()),
    };
  }
}

export const scoringScheduler = new ScoringScheduler();

