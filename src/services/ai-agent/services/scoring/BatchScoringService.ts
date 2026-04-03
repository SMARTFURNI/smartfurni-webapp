import { leadScoringEngine, LeadScore } from './LeadScoringEngine';
import { logger } from '../../utils/logger';
import { PerformanceTimer } from '../../utils/monitoring';

export interface BatchScoringJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalLeads: number;
  processedLeads: number;
  failedLeads: number;
  startedAt: Date;
  completedAt?: Date;
  results: LeadScore[];
  errors: Array<{ leadId: string; error: string }>;
}

/**
 * Batch Scoring Service
 * Processes multiple leads for scoring
 */
export class BatchScoringService {
  private jobs: Map<string, BatchScoringJob> = new Map();

  /**
   * Start batch scoring job
   */
  async startBatchScoringJob(leadIds: string[]): Promise<BatchScoringJob> {
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timer = new PerformanceTimer('batch_scoring');

    const job: BatchScoringJob = {
      jobId,
      status: 'processing',
      totalLeads: leadIds.length,
      processedLeads: 0,
      failedLeads: 0,
      startedAt: new Date(),
      results: [],
      errors: [],
    };

    this.jobs.set(jobId, job);

    logger.info('Starting batch scoring job', {
      jobId,
      totalLeads: leadIds.length,
    });

    // Process leads asynchronously
    this.processBatch(jobId, leadIds, job, timer);

    return job;
  }

  /**
   * Process batch of leads
   */
  private async processBatch(
    jobId: string,
    leadIds: string[],
    job: BatchScoringJob,
    timer: PerformanceTimer
  ): Promise<void> {
    try {
      for (const leadId of leadIds) {
        try {
          logger.debug('Scoring lead', { jobId, leadId });

          const score = await leadScoringEngine.scoreLead(leadId);

          if (score) {
            job.results.push(score);
          } else {
            job.failedLeads++;
            job.errors.push({
              leadId,
              error: 'Failed to score lead',
            });
          }

          job.processedLeads++;
        } catch (error) {
          job.failedLeads++;
          job.errors.push({
            leadId,
            error: error instanceof Error ? error.message : String(error),
          });
          job.processedLeads++;
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();

      const duration = timer.end();

      logger.info('Batch scoring job completed', {
        jobId,
        totalLeads: job.totalLeads,
        processedLeads: job.processedLeads,
        failedLeads: job.failedLeads,
        duration,
      });
    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();

      const duration = timer.end();

      logger.error('Batch scoring job failed', {
        jobId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });
    }
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): BatchScoringJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): BatchScoringJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: string): BatchScoringJob[] {
    return Array.from(this.jobs.values()).filter((job) => job.status === status);
  }

  /**
   * Get batch results
   */
  getBatchResults(
    jobId: string,
    classification?: 'hot' | 'warm' | 'cold'
  ): LeadScore[] {
    const job = this.jobs.get(jobId);
    if (!job) {
      return [];
    }

    if (classification) {
      return job.results.filter((r) => r.classification === classification);
    }

    return job.results;
  }

  /**
   * Get batch statistics
   */
  getBatchStatistics(jobId: string): {
    totalLeads: number;
    processedLeads: number;
    failedLeads: number;
    hotLeads: number;
    warmLeads: number;
    coldLeads: number;
    averageScore: number;
    processingTime?: number;
  } | null {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    const hotLeads = job.results.filter((r) => r.classification === 'hot').length;
    const warmLeads = job.results.filter((r) => r.classification === 'warm').length;
    const coldLeads = job.results.filter((r) => r.classification === 'cold').length;
    const averageScore =
      job.results.length > 0
        ? Math.round(
            job.results.reduce((sum, r) => sum + r.score, 0) / job.results.length
          )
        : 0;

    const processingTime = job.completedAt
      ? job.completedAt.getTime() - job.startedAt.getTime()
      : undefined;

    return {
      totalLeads: job.totalLeads,
      processedLeads: job.processedLeads,
      failedLeads: job.failedLeads,
      hotLeads,
      warmLeads,
      coldLeads,
      averageScore,
      processingTime,
    };
  }

  /**
   * Export batch results to CSV
   */
  exportBatchResultsToCSV(jobId: string): string | null {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }

    const headers = [
      'Lead ID',
      'Score',
      'Classification',
      'Conversion Probability',
      'Next Action',
      'Scored At',
    ];

    const rows = job.results.map((r) => [
      r.leadId,
      r.score,
      r.classification,
      (r.conversionProbability * 100).toFixed(1) + '%',
      r.nextBestAction,
      r.scoredAt.toISOString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `\"${cell}\"`).join(',')),
    ].join('\
');

    return csv;
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
      job.status = 'failed';
      job.completedAt = new Date();
      logger.info('Batch scoring job cancelled', { jobId });
      return true;
    }

    return false;
  }
}

export const batchScoringService = new BatchScoringService();

