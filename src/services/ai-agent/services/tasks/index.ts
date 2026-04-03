export {
  DEFAULT_TASK_TEMPLATES,
  DEFAULT_AUTOMATION_RULES,
  getTaskTemplate,
  getPriorityColor,
  getPriorityLabel,
  getStatusLabel,
} from './TaskAutomationModel';
export { TaskCreatorEngine, taskCreatorEngine } from './TaskCreatorEngine';
export { TaskAssignmentEngine, taskAssignmentEngine } from './TaskAssignmentEngine';
export { TaskAutomationScheduler, taskAutomationScheduler } from './TaskAutomationScheduler';

export type { TaskType, TaskPriority, TaskStatus, TaskTemplate, AutomationRule } from './TaskAutomationModel';
export type { AutomatedTask } from './TaskCreatorEngine';
export type { SalesRepProfile, AssignmentResult } from './TaskAssignmentEngine';
export type { AutomationSchedule } from './TaskAutomationScheduler';

