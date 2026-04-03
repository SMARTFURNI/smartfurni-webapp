/**
 * Task Automation Model
 * Defines task types, templates, and automation rules
 */

export type TaskType =
  | 'follow_up_call'
  | 'send_quote'
  | 'send_proposal'
  | 'schedule_demo'
  | 'send_case_study'
  | 'nurture_email'
  | 'check_in'
  | 'close_deal';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

export interface TaskTemplate {
  type: TaskType;
  title: string;
  description: string;
  estimatedDuration: number; // in minutes
  priority: TaskPriority;
  requiredFields: string[];
  successCriteria: string[];
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: {
    leadClassification: 'hot' | 'warm' | 'cold';
    minScore?: number;
    conditions?: Array<{
      field: string;
      operator: 'equals' | 'greater_than' | 'less_than' | 'contains';
      value: any;
    }>;
  };
  actions: Array<{
    taskType: TaskType;
    delayDays?: number; // Delay before creating task
    priority: TaskPriority;
  }>;
  enabled: boolean;
  createdAt: Date;
}

/**
 * Default Task Templates
 */
export const DEFAULT_TASK_TEMPLATES: Record<TaskType, TaskTemplate> = {
  follow_up_call: {
    type: 'follow_up_call',
    title: 'Gọi điện theo dõi',
    description: 'Gọi điện để theo dõi tiến độ và trả lời câu hỏi của khách hàng',
    estimatedDuration: 15,
    priority: 'high',
    requiredFields: ['leadPhone', 'leadName'],
    successCriteria: ['Cuộc gọi hoàn thành', 'Ghi chú cuộc gọi'],
  },
  send_quote: {
    type: 'send_quote',
    title: 'Gửi báo giá',
    description: 'Soạn và gửi báo giá chi tiết cho khách hàng',
    estimatedDuration: 30,
    priority: 'high',
    requiredFields: ['leadEmail', 'productInfo'],
    successCriteria: ['Email báo giá đã gửi', 'Khách hàng xác nhận nhận được'],
  },
  send_proposal: {
    type: 'send_proposal',
    title: 'Gửi đề xuất',
    description: 'Soạn và gửi đề xuất giải pháp toàn diện cho khách hàng',
    estimatedDuration: 60,
    priority: 'high',
    requiredFields: ['leadEmail', 'companyInfo', 'productInfo'],
    successCriteria: ['Proposal đã gửi', 'Khách hàng xác nhận'],
  },
  schedule_demo: {
    type: 'schedule_demo',
    title: 'Lên lịch Demo',
    description: 'Liên hệ khách hàng để lên lịch demo sản phẩm',
    estimatedDuration: 20,
    priority: 'high',
    requiredFields: ['leadPhone', 'leadEmail'],
    successCriteria: ['Demo đã được lên lịch', 'Khách hàng xác nhận'],
  },
  send_case_study: {
    type: 'send_case_study',
    title: 'Gửi Case Study',
    description: 'Gửi các case study liên quan để minh chứng giá trị sản phẩm',
    estimatedDuration: 15,
    priority: 'medium',
    requiredFields: ['leadEmail'],
    successCriteria: ['Case study đã gửi', 'Email mở được'],
  },
  nurture_email: {
    type: 'nurture_email',
    title: 'Email Nuôi dưỡng',
    description: 'Gửi email giáo dục/nuôi dưỡng để duy trì liên hệ',
    estimatedDuration: 10,
    priority: 'low',
    requiredFields: ['leadEmail'],
    successCriteria: ['Email đã gửi'],
  },
  check_in: {
    type: 'check_in',
    title: 'Kiểm tra tình hình',
    description: 'Gửi tin nhắn hoặc email kiểm tra tình hình khách hàng',
    estimatedDuration: 10,
    priority: 'medium',
    requiredFields: ['leadEmail', 'leadPhone'],
    successCriteria: ['Liên hệ đã thực hiện'],
  },
  close_deal: {
    type: 'close_deal',
    title: 'Đóng giao dịch',
    description: 'Hoàn tất các bước cuối cùng để đóng giao dịch',
    estimatedDuration: 45,
    priority: 'critical',
    requiredFields: ['leadEmail', 'leadPhone', 'dealValue'],
    successCriteria: ['Hợp đồng ký kết', 'Thanh toán xác nhận'],
  },
};

/**
 * Default Automation Rules
 */
export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'rule_hot_lead',
    name: 'Hot Lead - Immediate Follow-up',
    trigger: {
      leadClassification: 'hot',
      minScore: 85,
    },
    actions: [
      {
        taskType: 'follow_up_call',
        priority: 'critical',
      },
      {
        taskType: 'send_quote',
        delayDays: 1,
        priority: 'high',
      },
    ],
    enabled: true,
    createdAt: new Date(),
  },
  {
    id: 'rule_warm_lead',
    name: 'Warm Lead - Nurture Campaign',
    trigger: {
      leadClassification: 'warm',
      minScore: 50,
    },
    actions: [
      {
        taskType: 'send_case_study',
        priority: 'medium',
      },
      {
        taskType: 'nurture_email',
        delayDays: 3,
        priority: 'low',
      },
      {
        taskType: 'check_in',
        delayDays: 7,
        priority: 'medium',
      },
    ],
    enabled: true,
    createdAt: new Date(),
  },
  {
    id: 'rule_cold_lead',
    name: 'Cold Lead - Long-term Nurture',
    trigger: {
      leadClassification: 'cold',
    },
    actions: [
      {
        taskType: 'nurture_email',
        priority: 'low',
      },
      {
        taskType: 'check_in',
        delayDays: 14,
        priority: 'low',
      },
    ],
    enabled: true,
    createdAt: new Date(),
  },
  {
    id: 'rule_price_inquiry',
    name: 'Price Inquiry - Send Quote',
    trigger: {
      leadClassification: 'warm',
      conditions: [
        {
          field: 'priceInquiries',
          operator: 'greater_than',
          value: 0,
        },
      ],
    },
    actions: [
      {
        taskType: 'send_quote',
        priority: 'high',
      },
    ],
    enabled: true,
    createdAt: new Date(),
  },
];

/**
 * Get task template by type
 */
export function getTaskTemplate(type: TaskType): TaskTemplate {
  return DEFAULT_TASK_TEMPLATES[type];
}

/**
 * Get priority color for UI
 */
export function getPriorityColor(priority: TaskPriority): string {
  const colors: Record<TaskPriority, string> = {
    critical: '#FF0000', // Red
    high: '#FF6600', // Orange
    medium: '#FFCC00', // Yellow
    low: '#00CC00', // Green
  };
  return colors[priority];
}

/**
 * Get priority label
 */
export function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    critical: 'Rất Khẩn Cấp',
    high: 'Khẩn Cấp',
    medium: 'Bình Thường',
    low: 'Thấp',
  };
  return labels[priority];
}

/**
 * Get status label
 */
export function getStatusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    pending: 'Chưa Gán',
    assigned: 'Đã Gán',
    in_progress: 'Đang Xử Lý',
    completed: 'Hoàn Thành',
    cancelled: 'Hủy',
  };
  return labels[status];
}

