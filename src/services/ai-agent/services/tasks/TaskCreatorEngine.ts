import { geminiClient, PromptManager } from '../gemini';
import { LeadScore } from '../scoring';
import {
  DEFAULT_TASK_TEMPLATES,
  TaskType,
  TaskPriority,
  getTaskTemplate,
} from './TaskAutomationModel';
import { logger } from '../../utils/logger';
import { PerformanceTimer } from '../../utils/monitoring';

export interface AutomatedTask {
  taskId: string;
  leadId: string;
  type: TaskType;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: Date;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string; // User ID
  aiGeneratedContent?: {
    emailBody?: string;
    callScript?: string;
    notes?: string;
  };
  createdAt: Date;
  createdBy: 'automation' | 'manual';
}

/**
 * Task Creator Engine
 * Creates tasks based on lead scores and automation rules
 */
export class TaskCreatorEngine {
  /**
   * Create tasks for a lead based on its score
   */
  async createTasksForLead(
    leadScore: LeadScore,
    leadData?: Record<string, any>
  ): Promise<AutomatedTask[]> {
    const timer = new PerformanceTimer('task_creation');

    try {
      logger.info('Creating tasks for lead', {
        leadId: leadScore.leadId,
        classification: leadScore.classification,
      });

      const tasks: AutomatedTask[] = [];

      // Determine task types based on classification and score
      const taskTypes = this.determineTaskTypes(leadScore);

      for (const taskType of taskTypes) {
        try {
          const task = await this.createTask(
            leadScore.leadId,
            taskType,
            leadScore,
            leadData
          );
          if (task) {
            tasks.push(task);
          }
        } catch (error) {
          logger.warn('Failed to create task', {
            leadId: leadScore.leadId,
            taskType,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const duration = timer.end();

      logger.info('Tasks created for lead', {
        leadId: leadScore.leadId,
        taskCount: tasks.length,
        duration,
      });

      return tasks;
    } catch (error) {
      const duration = timer.end();

      logger.error('Failed to create tasks for lead', {
        leadId: leadScore.leadId,
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      return [];
    }
  }

  /**
   * Determine task types based on lead score
   */
  private determineTaskTypes(leadScore: LeadScore): TaskType[] {
    const taskTypes: TaskType[] = [];

    if (leadScore.classification === 'hot') {
      taskTypes.push('follow_up_call');
      if (leadScore.score >= 90) {
        taskTypes.push('send_quote');
        taskTypes.push('schedule_demo');
      }
    } else if (leadScore.classification === 'warm') {
      taskTypes.push('send_case_study');
      if (leadScore.score >= 70) {
        taskTypes.push('send_quote');
      }
    } else {
      taskTypes.push('nurture_email');
    }

    return taskTypes;
  }

  /**
   * Create a single task
   */
  private async createTask(
    leadId: string,
    taskType: TaskType,
    leadScore: LeadScore,
    leadData?: Record<string, any>
  ): Promise<AutomatedTask | null> {
    try {
      const template = getTaskTemplate(taskType);
      const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Calculate due date based on priority
      const dueDate = this.calculateDueDate(template.priority);

      // Generate AI content if needed
      const aiContent = await this.generateTaskContent(taskType, leadData);

      const task: AutomatedTask = {
        taskId,
        leadId,
        type: taskType,
        title: template.title,
        description: template.description,
        priority: template.priority,
        dueDate,
        status: 'pending',
        aiGeneratedContent: aiContent,
        createdAt: new Date(),
        createdBy: 'automation',
      };

      logger.info('Task created', {
        taskId,
        leadId,
        taskType,
        priority: template.priority,
      });

      return task;
    } catch (error) {
      logger.error('Failed to create task', {
        leadId,
        taskType,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Calculate due date based on priority
   */
  private calculateDueDate(priority: TaskPriority): Date {
    const now = new Date();
    const dueDateMap: Record<TaskPriority, number> = {
      critical: 0, // Today
      high: 1, // Tomorrow
      medium: 3, // 3 days
      low: 7, // 1 week
    };

    const days = dueDateMap[priority];
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + days);
    dueDate.setHours(17, 0, 0, 0); // 5 PM

    return dueDate;
  }

  /**
   * Generate AI content for task
   */
  private async generateTaskContent(
    taskType: TaskType,
    leadData?: Record<string, any>
  ): Promise<{
    emailBody?: string;
    callScript?: string;
    notes?: string;
  }> {
    try {
      const prompt = PromptManager.getPrompt('task_content_generation', {
        taskType,
        leadData: leadData || {},
      });

      const response = await geminiClient.generateContent(prompt, {
        temperature: 0.7,
        maxTokens: 500,
      });

      if (!response.success) {
        throw new Error('Failed to generate task content');
      }

      // Parse response
      const content = this.parseTaskContent(response.content, taskType);
      return content;
    } catch (error) {
      logger.warn('Failed to generate AI task content', {
        taskType,
        error: error instanceof Error ? error.message : String(error),
      });
      return {};
    }
  }

  /**
   * Parse task content from AI response
   */
  private parseTaskContent(
    content: string,
    taskType: TaskType
  ): {
    emailBody?: string;
    callScript?: string;
    notes?: string;
  } {
    try {
      const parsed = JSON.parse(content);
      return {
        emailBody: parsed.email_body,
        callScript: parsed.call_script,
        notes: parsed.notes,
      };
    } catch (error) {
      logger.warn('Failed to parse task content as JSON');
      return {
        notes: content,
      };
    }
  }

  /**
   * Create bulk tasks
   */
  async createBulkTasks(
    leadScores: LeadScore[],
    leadsData?: Record<string, Record<string, any>>
  ): Promise<{
    totalTasks: number;
    createdTasks: AutomatedTask[];
    failedLeads: string[];
  }> {
    const timer = new PerformanceTimer('bulk_task_creation');

    try {
      logger.info('Creating bulk tasks', { leadCount: leadScores.length });

      const createdTasks: AutomatedTask[] = [];
      const failedLeads: string[] = [];

      for (const leadScore of leadScores) {
        try {
          const leadData = leadsData?.[leadScore.leadId];
          const tasks = await this.createTasksForLead(leadScore, leadData);
          createdTasks.push(...tasks);
        } catch (error) {
          failedLeads.push(leadScore.leadId);
          logger.warn('Failed to create tasks for lead', {
            leadId: leadScore.leadId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      const duration = timer.end();

      logger.info('Bulk task creation completed', {
        totalLeads: leadScores.length,
        totalTasks: createdTasks.length,
        failedLeads: failedLeads.length,
        duration,
      });

      return {
        totalTasks: createdTasks.length,
        createdTasks,
        failedLeads,
      };
    } catch (error) {
      const duration = timer.end();

      logger.error('Bulk task creation failed', {
        error: error instanceof Error ? error.message : String(error),
        duration,
      });

      return {
        totalTasks: 0,
        createdTasks: [],
        failedLeads: leadScores.map((l) => l.leadId),
      };
    }
  }
}

export const taskCreatorEngine = new TaskCreatorEngine();

