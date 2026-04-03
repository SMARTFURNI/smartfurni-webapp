import { AutomatedTask } from './TaskCreatorEngine';
import { logger } from '../../utils/logger';

export interface SalesRepProfile {
  userId: string;
  name: string;
  email: string;
  department: string;
  specialization?: string; // e.g., 'hospitality', 'healthcare'
  currentWorkload: number; // Number of assigned tasks
  maxCapacity: number; // Maximum tasks per day
  performanceScore: number; // 0-100 based on task completion rate
  successRate: number; // Percentage of successful conversions
  isActive: boolean;
}

export interface AssignmentResult {
  taskId: string;
  assignedTo: string;
  reason: string;
}

/**
 * Task Assignment Engine
 * Intelligently assigns tasks to sales representatives
 */
export class TaskAssignmentEngine {
  private salesReps: Map<string, SalesRepProfile> = new Map();

  /**
   * Register sales representative
   */
  registerSalesRep(profile: SalesRepProfile): void {
    this.salesReps.set(profile.userId, profile);
    logger.info('Sales rep registered', {
      userId: profile.userId,
      name: profile.name,
      maxCapacity: profile.maxCapacity,
    });
  }

  /**
   * Assign tasks to sales representatives
   */
  assignTasks(tasks: AutomatedTask[]): AssignmentResult[] {
    const results: AssignmentResult[] = [];

    // Sort tasks by priority (critical first)
    const sortedTasks = [...tasks].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    for (const task of sortedTasks) {
      const assignedTo = this.findBestAssignee(task);
      if (assignedTo) {
        const result: AssignmentResult = {
          taskId: task.taskId,
          assignedTo,
          reason: this.getAssignmentReason(task, assignedTo),
        };
        results.push(result);

        // Update sales rep workload
        const rep = this.salesReps.get(assignedTo);
        if (rep) {
          rep.currentWorkload++;
        }

        logger.info('Task assigned', {
          taskId: task.taskId,
          assignedTo,
          priority: task.priority,
        });
      } else {
        logger.warn('No available sales rep for task assignment', {
          taskId: task.taskId,
          priority: task.priority,
        });
      }
    }

    return results;
  }

  /**
   * Find best assignee for a task
   */
  private findBestAssignee(task: AutomatedTask): string | null {
    const activeSalesReps = Array.from(this.salesReps.values()).filter(
      (rep) => rep.isActive && rep.currentWorkload < rep.maxCapacity
    );

    if (activeSalesReps.length === 0) {
      return null;
    }

    // Calculate assignment score for each rep
    const scores = activeSalesReps.map((rep) => ({
      userId: rep.userId,
      score: this.calculateAssignmentScore(task, rep),
    }));

    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);

    return scores[0].userId;
  }

  /**
   * Calculate assignment score for a sales rep
   */
  private calculateAssignmentScore(
    task: AutomatedTask,
    rep: SalesRepProfile
  ): number {
    let score = 100;

    // Factor 1: Workload balance (30%)
    const workloadRatio = rep.currentWorkload / rep.maxCapacity;
    const workloadScore = (1 - workloadRatio) * 100;
    score += workloadScore * 0.3;

    // Factor 2: Performance score (40%)
    score += rep.performanceScore * 0.4;

    // Factor 3: Specialization match (20%)
    if (rep.specialization) {
      // Bonus if specialization matches task type
      if (
        (rep.specialization === 'hospitality' &&
          task.type === 'schedule_demo') ||
        (rep.specialization === 'healthcare' && task.type === 'send_proposal')
      ) {
        score += 20;
      }
    }

    // Factor 4: Success rate (10%)
    score += rep.successRate * 0.1;

    return score;
  }

  /**
   * Get assignment reason
   */
  private getAssignmentReason(task: AutomatedTask, assignedTo: string): string {
    const rep = this.salesReps.get(assignedTo);
    if (!rep) {
      return 'Assigned to available sales rep';
    }

    const reasons: string[] = [];

    if (rep.performanceScore >= 90) {
      reasons.push('High performance score');
    }

    if (rep.successRate >= 80) {
      reasons.push('Excellent conversion rate');
    }

    if (
      rep.currentWorkload < rep.maxCapacity * 0.5
    ) {
      reasons.push('Low current workload');
    }

    return reasons.length > 0
      ? reasons.join(', ')
      : 'Assigned based on availability';
  }

  /**
   * Get sales rep workload
   */
  getSalesRepWorkload(userId: string): {
    current: number;
    max: number;
    utilization: number;
  } | null {
    const rep = this.salesReps.get(userId);
    if (!rep) {
      return null;
    }

    return {
      current: rep.currentWorkload,
      max: rep.maxCapacity,
      utilization: (rep.currentWorkload / rep.maxCapacity) * 100,
    };
  }

  /**
   * Get all sales reps
   */
  getAllSalesReps(): SalesRepProfile[] {
    return Array.from(this.salesReps.values());
  }

  /**
   * Get available sales reps
   */
  getAvailableSalesReps(): SalesRepProfile[] {
    return Array.from(this.salesReps.values()).filter(
      (rep) => rep.isActive && rep.currentWorkload < rep.maxCapacity
    );
  }

  /**
   * Update sales rep performance
   */
  updateSalesRepPerformance(
    userId: string,
    completedTasks: number,
    successfulTasks: number
  ): void {
    const rep = this.salesReps.get(userId);
    if (!rep) {
      logger.warn('Sales rep not found', { userId });
      return;
    }

    // Update performance score
    const completionRate = completedTasks > 0 ? (successfulTasks / completedTasks) * 100 : 0;
    rep.performanceScore = Math.min(100, rep.performanceScore + completionRate * 0.1);
    rep.successRate = completionRate;

    logger.info('Sales rep performance updated', {
      userId,
      performanceScore: rep.performanceScore,
      successRate: rep.successRate,
    });
  }

  /**
   * Reassign task
   */
  reassignTask(task: AutomatedTask, newAssignee: string): boolean {
    const rep = this.salesReps.get(newAssignee);
    if (!rep) {
      logger.warn('Sales rep not found', { userId: newAssignee });
      return false;
    }

    if (rep.currentWorkload >= rep.maxCapacity) {
      logger.warn('Sales rep at capacity', { userId: newAssignee });
      return false;
    }

    // Decrease old assignee workload
    if (task.assignedTo) {
      const oldRep = this.salesReps.get(task.assignedTo);
      if (oldRep) {
        oldRep.currentWorkload--;
      }
    }

    // Increase new assignee workload
    rep.currentWorkload++;
    task.assignedTo = newAssignee;

    logger.info('Task reassigned', {
      taskId: task.taskId,
      from: task.assignedTo,
      to: newAssignee,
    });

    return true;
  }
}

export const taskAssignmentEngine = new TaskAssignmentEngine();

