/**
 * Email Scenario Builder Service
 * Tạo và quản lý các kịch bản tự động hoá email
 */

import { getTemplateById, renderTemplate } from './email-template-service';

export interface EmailScenarioStep {
  id: string;
  templateId: string;
  delayDays: number;
  delayHours?: number;
  delayMinutes?: number;
  condition?: {
    type: 'lead_score' | 'lead_stage' | 'email_opened' | 'link_clicked' | 'none';
    value?: string;
  };
}

export interface EmailScenarioTrigger {
  type: 'new_lead' | 'lead_score_change' | 'stage_change' | 'manual' | 'date_based';
  conditions?: {
    minScore?: number;
    maxScore?: number;
    stage?: string;
    source?: string;
  };
}

export interface EmailScenario {
  id: string;
  name: string;
  description: string;
  trigger: EmailScenarioTrigger;
  steps: EmailScenarioStep[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  stats?: {
    totalSent: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  };
}

// 3 kịch bản mặc định
const DEFAULT_SCENARIOS: EmailScenario[] = [
  {
    id: 'scenario-welcome-series',
    name: 'Chuỗi Chào Mừng - Lead Mới',
    description: 'Gửi email chào mừng cho tất cả lead mới từ Facebook',
    trigger: {
      type: 'new_lead',
      conditions: {
        source: 'facebook',
      },
    },
    steps: [
      {
        id: 'step-1',
        templateId: 'welcome-default',
        delayDays: 0,
        delayHours: 0,
        delayMinutes: 5,
        condition: { type: 'none' },
      },
      {
        id: 'step-2',
        templateId: 'followup-24h',
        delayDays: 1,
        delayHours: 9,
        condition: {
          type: 'email_opened',
          value: 'false',
        },
      },
      {
        id: 'step-3',
        templateId: 'special-offer-limited',
        delayDays: 3,
        condition: {
          type: 'none',
        },
      },
    ],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    stats: {
      totalSent: 10,
      openRate: 70,
      clickRate: 40,
      conversionRate: 20,
    },
  },
  {
    id: 'scenario-hot-lead-followup',
    name: 'Follow-up Nhanh - Hot Lead',
    description: 'Follow-up tích cực cho lead có điểm cao (>80)',
    trigger: {
      type: 'lead_score_change',
      conditions: {
        minScore: 80,
      },
    },
    steps: [
      {
        id: 'step-1',
        templateId: 'followup-24h',
        delayDays: 0,
        delayHours: 1,
        condition: { type: 'none' },
      },
      {
        id: 'step-2',
        templateId: 'special-offer-limited',
        delayDays: 1,
        condition: {
          type: 'email_opened',
          value: 'false',
        },
      },
    ],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    stats: {
      totalSent: 5,
      openRate: 80,
      clickRate: 60,
      conversionRate: 30,
    },
  },
  {
    id: 'scenario-warm-lead-nurture',
    name: 'Nuôi Dưỡng - Warm Lead',
    description: 'Nuôi dưỡng dài hạn cho lead có điểm trung bình (50-79)',
    trigger: {
      type: 'lead_score_change',
      conditions: {
        minScore: 50,
        maxScore: 79,
      },
    },
    steps: [
      {
        id: 'step-1',
        templateId: 'welcome-default',
        delayDays: 0,
        condition: { type: 'none' },
      },
      {
        id: 'step-2',
        templateId: 'followup-24h',
        delayDays: 5,
        condition: { type: 'none' },
      },
      {
        id: 'step-3',
        templateId: 'reminder-abandoned',
        delayDays: 10,
        condition: { type: 'none' },
      },
    ],
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    stats: {
      totalSent: 8,
      openRate: 62.5,
      clickRate: 35,
      conversionRate: 15,
    },
  },
];

// Lưu trữ kịch bản (trong production, lưu vào database)
let scenarios: EmailScenario[] = [...DEFAULT_SCENARIOS];

/**
 * Lấy tất cả kịch bản
 */
export function getAllScenarios(): EmailScenario[] {
  return [...scenarios];
}

/**
 * Lấy kịch bản theo ID
 */
export function getScenarioById(id: string): EmailScenario | null {
  return scenarios.find((s) => s.id === id) || null;
}

/**
 * Lấy kịch bản theo trigger type
 */
export function getScenariosByTrigger(triggerType: EmailScenarioTrigger['type']): EmailScenario[] {
  return scenarios.filter((s) => s.trigger.type === triggerType);
}

/**
 * Tạo kịch bản mới
 */
export function createScenario(scenario: Omit<EmailScenario, 'id' | 'createdAt' | 'updatedAt'>): EmailScenario {
  const newScenario: EmailScenario = {
    ...scenario,
    id: `scenario-${Date.now()}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  scenarios.push(newScenario);
  console.log('[EMAIL-SCENARIO] Kịch bản mới được tạo:', newScenario.id);

  return newScenario;
}

/**
 * Cập nhật kịch bản
 */
export function updateScenario(id: string, updates: Partial<Omit<EmailScenario, 'id' | 'createdAt'>>): EmailScenario | null {
  const index = scenarios.findIndex((s) => s.id === id);

  if (index === -1) {
    console.error('[EMAIL-SCENARIO] Kịch bản không tìm thấy:', id);
    return null;
  }

  scenarios[index] = {
    ...scenarios[index],
    ...updates,
    updatedAt: new Date(),
  };

  console.log('[EMAIL-SCENARIO] Kịch bản được cập nhật:', id);

  return scenarios[index];
}

/**
 * Xóa kịch bản
 */
export function deleteScenario(id: string): boolean {
  const index = scenarios.findIndex((s) => s.id === id);

  if (index === -1) {
    console.error('[EMAIL-SCENARIO] Kịch bản không tìm thấy:', id);
    return false;
  }

  scenarios.splice(index, 1);
  console.log('[EMAIL-SCENARIO] Kịch bản được xóa:', id);

  return true;
}

/**
 * Thực thi kịch bản cho một lead
 */
export async function executeScenario(
  scenario: EmailScenario,
  leadData: {
    id: string;
    name: string;
    email: string;
    score?: number;
    stage?: string;
    quantity?: number;
    productName?: string;
    [key: string]: any;
  }
): Promise<{
  success: boolean;
  executedSteps: Array<{
    stepId: string;
    templateId: string;
    status: 'pending' | 'sent' | 'failed';
    scheduledFor?: Date;
    error?: string;
  }>;
}> {
  const executedSteps = [];

  console.log(`[EMAIL-SCENARIO] Thực thi kịch bản ${scenario.id} cho lead ${leadData.name}`);

  for (const step of scenario.steps) {
    try {
      // Kiểm tra điều kiện
      if (step.condition?.type === 'email_opened' && step.condition.value === 'false') {
        console.log(`[EMAIL-SCENARIO] Bỏ qua bước ${step.id} vì email đã được mở`);
        continue;
      }

      // Lấy template
      const template = getTemplateById(step.templateId);
      if (!template) {
        console.error(`[EMAIL-SCENARIO] Template không tìm thấy: ${step.templateId}`);
        executedSteps.push({
          stepId: step.id,
          templateId: step.templateId,
          status: 'failed',
          error: 'Template không tìm thấy',
        });
        continue;
      }

      // Render template
      const rendered = renderTemplate(template, {
        leadName: leadData.name,
        email: leadData.email,
        quantity: leadData.quantity?.toString() || '1',
        productName: leadData.productName || 'Giường Điều Khiển Thông Minh',
        offerDate: new Date().toLocaleDateString('vi-VN'),
        regularPrice: '50,000,000 VNĐ',
        discountPrice: '40,000,000 VNĐ',
        savings: '10,000,000 VNĐ',
        orderId: leadData.id,
      });

      // Tính thời gian gửi
      const delayMs = (step.delayDays || 0) * 86400000 + (step.delayHours || 0) * 3600000 + (step.delayMinutes || 0) * 60000;
      const scheduledFor = new Date(Date.now() + delayMs);

      console.log(`[EMAIL-SCENARIO] Bước ${step.id} được lên lịch gửi lúc ${scheduledFor}`);

      executedSteps.push({
        stepId: step.id,
        templateId: step.templateId,
        status: 'pending',
        scheduledFor,
      });
    } catch (error) {
      console.error(`[EMAIL-SCENARIO] Lỗi thực thi bước ${step.id}:`, error);
      executedSteps.push({
        stepId: step.id,
        templateId: step.templateId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return {
    success: executedSteps.some((s) => s.status === 'pending' || s.status === 'sent'),
    executedSteps,
  };
}

/**
 * Kiểm tra xem kịch bản có áp dụng cho lead không
 */
export function shouldApplyScenario(scenario: EmailScenario, leadData: { score?: number; stage?: string; source?: string }): boolean {
  const conditions = scenario.trigger.conditions || {};

  // Kiểm tra điểm lead
  if (conditions.minScore !== undefined && (leadData.score || 0) < conditions.minScore) {
    return false;
  }

  if (conditions.maxScore !== undefined && (leadData.score || 0) > conditions.maxScore) {
    return false;
  }

  // Kiểm tra giai đoạn
  if (conditions.stage && leadData.stage !== conditions.stage) {
    return false;
  }

  // Kiểm tra nguồn
  if (conditions.source && leadData.source !== conditions.source) {
    return false;
  }

  return true;
}

/**
 * Lấy thống kê kịch bản
 */
export function getScenarioStats() {
  return {
    total: scenarios.length,
    active: scenarios.filter((s) => s.enabled).length,
    byTrigger: {
      new_lead: scenarios.filter((s) => s.trigger.type === 'new_lead').length,
      lead_score_change: scenarios.filter((s) => s.trigger.type === 'lead_score_change').length,
      stage_change: scenarios.filter((s) => s.trigger.type === 'stage_change').length,
      manual: scenarios.filter((s) => s.trigger.type === 'manual').length,
    },
    totalSent: scenarios.reduce((sum, s) => sum + (s.stats?.totalSent || 0), 0),
    avgOpenRate: scenarios.length > 0 ? scenarios.reduce((sum, s) => sum + (s.stats?.openRate || 0), 0) / scenarios.length : 0,
  };
}

/**
 * Reset kịch bản về mặc định
 */
export function resetScenarios(): void {
  scenarios = [...DEFAULT_SCENARIOS];
  console.log('[EMAIL-SCENARIO] Kịch bản đã được reset về mặc định');
}

/**
 * Lấy kịch bản hoạt động
 */
export function getActiveScenarios(): EmailScenario[] {
  return scenarios.filter((s) => s.enabled);
}

/**
 * Tìm kịch bản áp dụng cho lead
 */
export function findApplicableScenarios(leadData: { score?: number; stage?: string; source?: string }): EmailScenario[] {
  return scenarios.filter((scenario) => scenario.enabled && shouldApplyScenario(scenario, leadData));
}
