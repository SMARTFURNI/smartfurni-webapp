import { taskCreatorEngine } from './TaskCreatorEngine';
import { taskAssignmentEngine } from './TaskAssignmentEngine';
import { leadScoringEngine } from '../scoring';
import { logger } from '../../utils/logger';

export interface AutomationSchedule {
  name: string;
  description: string;
  frequency: 'hourly' | 'daily' | 'weekly';
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
}

/**
 * Task Automation Scheduler
 * Manages automatic task creation and assignment
 */
export class TaskAutomationScheduler {
  private isRunning: boolean = false;
  private schedules: Map<string, NodeJS.Timeout> = new Map();
  private automationSchedules: Map<string, AutomationSchedule> = new Map();

  /**
   * Start scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Task automation scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Task automation scheduler started');

    // Schedule hourly task creation for hot leads
    this.scheduleHotLeadTaskCreation();

    // Schedule daily task creation for warm leads
    this.scheduleDailyTaskCreation();

    // Schedule weekly task review
    this.scheduleWeeklyTaskReview();
  }

  /**
   * Stop scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Task automation scheduler is not running');
      return;
    }

    this.isRunning = false;

    for (const [name, timeout] of this.schedules) {
      clearInterval(timeout);
      logger.info('Cleared schedule', { name });
    }

    this.schedules.clear();
    logger.info('Task automation scheduler stopped');
  }

  /**
   * Schedule hourly task creation for hot leads
   */
  private scheduleHotLeadTaskCreation(): void {
    const schedule = setInterval(async () => {
      try {
        logger.info('Running hourly hot lead task creation');

        // TODO: Fetch newly scored hot leads from database
        // const hotLeads = await db.leadScores.find({
        //   classification: 'hot',
        //   tasksCreated: false,
        //   createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
        // });

        // for (const leadScore of hotLeads) {
        //   const tasks = await taskCreatorEngine.createTasksForLead(leadScore);
        //   const assignments = taskAssignmentEngine.assignTasks(tasks);
        //   await db.tasks.insertMany(tasks);
        //   logger.info('Hot lead tasks created and assigned', {
        //     leadId: leadScore.leadId,
        //     taskCount: tasks.length
        //   });
        // }

        logger.info('Hourly hot lead task creation completed');
      } catch (error) {
        logger.error('Hourly hot lead task creation failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 60 * 60 * 1000); // Every hour

    this.schedules.set('hot_lead_task_creation', schedule);
    this.automationSchedules.set('hot_lead_task_creation', {
      name: 'Hot Lead Task Creation',
      description: 'Create and assign tasks for newly identified hot leads',
      frequency: 'hourly',
      enabled: true,
    });
    logger.info('Hot lead task creation scheduled');
  }

  /**
   * Schedule daily task creation for warm leads
   */
  private scheduleDailyTaskCreation(): void {
    const schedule = setInterval(async () => {
      try {
        logger.info('Running daily warm lead task creation');

        // TODO: Fetch warm leads from database
        // const warmLeads = await db.leadScores.find({
        //   classification: 'warm',
        //   tasksCreated: false
        // });

        // const result = await taskCreatorEngine.createBulkTasks(warmLeads);
        // const assignments = taskAssignmentEngine.assignTasks(result.createdTasks);
        // logger.info('Daily warm lead task creation completed', {
        //   totalTasks: result.totalTasks,
        //   assignedTasks: assignments.length
        // });

        logger.info('Daily warm lead task creation completed');
      } catch (error) {
        logger.error('Daily warm lead task creation failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours

    this.schedules.set('daily_task_creation', schedule);
    this.automationSchedules.set('daily_task_creation', {
      name: 'Daily Task Creation',
      description: 'Create and assign tasks for warm leads',
      frequency: 'daily',
      enabled: true,
    });
    logger.info('Daily task creation scheduled');
  }

  /**
   * Schedule weekly task review
   */
  private scheduleWeeklyTaskReview(): void {
    const schedule = setInterval(async () => {
      try {
        logger.info('Running weekly task review');

        // TODO: Review completed tasks and update sales rep performance
        // const completedTasks = await db.tasks.find({
        //   status: 'completed',
        //   completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        // });

        // for (const task of completedTasks) {
        //   const rep = taskAssignmentEngine.salesReps.get(task.assignedTo);
        //   if (rep) {
        //     taskAssignmentEngine.updateSalesRepPerformance(
        //       task.assignedTo,
        //       1,
        //       task.status === 'completed' ? 1 : 0
        //     );
        //   }
        // }

        logger.info('Weekly task review completed');
      } catch (error) {
        logger.error('Weekly task review failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 7 * 24 * 60 * 60 * 1000); // Every 7 days

    this.schedules.set('weekly_task_review', schedule);
    this.automationSchedules.set('weekly_task_review', {
      name: 'Weekly Task Review',
      description: 'Review completed tasks and update sales rep performance',
      frequency: 'weekly',
      enabled: true,
    });
    logger.info('Weekly task review scheduled');
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    schedules: AutomationSchedule[];
  } {
    return {
      isRunning: this.isRunning,
      schedules: Array.from(this.automationSchedules.values()),
    };
  }

  /**
   * Manually trigger task creation
   */
  async triggerTaskCreation(leadScoreIds: string[]): Promise<void> {
    try {
      logger.info('Manually triggering task creation', {
        leadCount: leadScoreIds.length,
      });

      // TODO: Fetch lead scores and create tasks
      // const leadScores = await db.leadScores.find({ _id: { $in: leadScoreIds } });
      // const result = await taskCreatorEngine.createBulkTasks(leadScores);
      // const assignments = taskAssignmentEngine.assignTasks(result.createdTasks);

      logger.info('Task creation triggered successfully');
    } catch (error) {
      logger.error('Failed to trigger task creation', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export const taskAutomationScheduler = new TaskAutomationScheduler();

