/**
 * Email Scenario Store
 * Manages email automation scenarios and sequences
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  htmlBody: string;
  variables: string[]; // e.g., [{{leadName}}, {{productName}}]
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailStep {
  id: string;
  order: number;
  delayDays: number; // Days after trigger
  templateId: string;
  condition?: {
    type: 'lead_score' | 'lead_stage' | 'custom';
    operator: '>' | '<' | '=' | '!=';
    value: any;
  };
}

export interface EmailScenario {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: 'new_lead' | 'lead_score_change' | 'stage_change' | 'manual';
    condition?: any;
  };
  steps: EmailStep[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailCampaignLog {
  id: string;
  leadId: string;
  leadName: string;
  email: string;
  scenarioId: string;
  stepId: string;
  templateId: string;
  subject: string;
  body: string;
  status: 'pending' | 'sent' | 'failed' | 'opened' | 'clicked';
  messageId?: string;
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailScenarioStats {
  scenarioId: string;
  scenarioName: string;
  totalLeads: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

// Mock data for demo
export const mockScenarios: EmailScenario[] = [
  {
    id: 'scenario-001',
    name: 'Welcome Series - New Lead',
    description: 'Gửi email chào mừng cho lead mới từ Facebook',
    trigger: {
      type: 'new_lead',
      condition: { source: 'facebook' },
    },
    steps: [
      {
        id: 'step-001',
        order: 1,
        delayDays: 0,
        templateId: 'template-001',
        condition: {
          type: 'lead_score',
          operator: '>',
          value: 50,
        },
      },
      {
        id: 'step-002',
        order: 2,
        delayDays: 3,
        templateId: 'template-002',
      },
      {
        id: 'step-003',
        order: 3,
        delayDays: 7,
        templateId: 'template-003',
      },
    ],
    enabled: true,
    createdAt: new Date('2026-03-20'),
    updatedAt: new Date('2026-03-27'),
  },
  {
    id: 'scenario-002',
    name: 'Hot Lead Follow-up',
    description: 'Follow-up nhanh cho lead có điểm cao (Hot Lead)',
    trigger: {
      type: 'lead_score_change',
      condition: { minScore: 80 },
    },
    steps: [
      {
        id: 'step-004',
        order: 1,
        delayDays: 0,
        templateId: 'template-004',
      },
      {
        id: 'step-005',
        order: 2,
        delayDays: 1,
        templateId: 'template-005',
      },
    ],
    enabled: true,
    createdAt: new Date('2026-03-15'),
    updatedAt: new Date('2026-03-27'),
  },
  {
    id: 'scenario-003',
    name: 'Warm Lead Nurture',
    description: 'Nuture lead có điểm trung bình (Warm Lead)',
    trigger: {
      type: 'lead_score_change',
      condition: { minScore: 50, maxScore: 79 },
    },
    steps: [
      {
        id: 'step-006',
        order: 1,
        delayDays: 0,
        templateId: 'template-006',
      },
      {
        id: 'step-007',
        order: 2,
        delayDays: 5,
        templateId: 'template-007',
      },
      {
        id: 'step-008',
        order: 3,
        delayDays: 10,
        templateId: 'template-008',
      },
    ],
    enabled: true,
    createdAt: new Date('2026-03-10'),
    updatedAt: new Date('2026-03-27'),
  },
];

export const mockTemplates: EmailTemplate[] = [
  {
    id: 'template-001',
    name: 'Welcome Email - Hot Lead',
    subject: 'Chào mừng {{leadName}} - Giải pháp giường thông minh cho {{quantity}} phòng',
    body: 'Xin chào {{leadName}},\n\nCảm ơn bạn đã quan tâm đến giường điều khiển thông minh của SmartFurni.',
    htmlBody: '<p>Xin chào {{leadName}},</p><p>Cảm ơn bạn đã quan tâm...</p>',
    variables: ['leadName', 'quantity', 'productName'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'template-002',
    name: 'Follow-up Email - Day 3',
    subject: 'Bạn đã xem email của chúng tôi chưa? - {{leadName}}',
    body: 'Xin chào {{leadName}},\n\nChúng tôi muốn kiểm tra xem bạn đã xem email trước đó chưa.',
    htmlBody: '<p>Xin chào {{leadName}},</p><p>Chúng tôi muốn kiểm tra...</p>',
    variables: ['leadName'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'template-003',
    name: 'Special Offer - Day 7',
    subject: 'Ưu đãi đặc biệt cho {{leadName}} - Giảm 20% hôm nay!',
    body: 'Xin chào {{leadName}},\n\nChúng tôi có ưu đãi đặc biệt cho bạn.',
    htmlBody: '<p>Xin chào {{leadName}},</p><p>Chúng tôi có ưu đãi...</p>',
    variables: ['leadName', 'discount'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'template-004',
    name: 'Urgent Follow-up - Hot Lead',
    subject: 'Cơ hội hạn chế - {{leadName}}, hãy liên hệ ngay!',
    body: 'Xin chào {{leadName}},\n\nChúng tôi muốn liên hệ với bạn ngay lập tức.',
    htmlBody: '<p>Xin chào {{leadName}},</p><p>Chúng tôi muốn liên hệ...</p>',
    variables: ['leadName'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const mockCampaignLogs: EmailCampaignLog[] = [
  {
    id: 'log-001',
    leadId: 'lead-001',
    leadName: 'Phạm Nhất Bá Tuật',
    email: 'contact.foodcom@gmail.com',
    scenarioId: 'scenario-001',
    stepId: 'step-001',
    templateId: 'template-001',
    subject: 'Chào mừng Phạm Nhất Bá Tuật - Giải pháp giường thông minh cho 2 phòng',
    body: 'Welcome email body...',
    status: 'sent',
    messageId: 'msg-001',
    sentAt: new Date('2026-03-27T12:54:04'),
    createdAt: new Date('2026-03-27T12:54:04'),
    updatedAt: new Date('2026-03-27T12:54:04'),
  },
  {
    id: 'log-002',
    leadId: 'lead-001',
    leadName: 'Phạm Nhất Bá Tuật',
    email: 'contact.foodcom@gmail.com',
    scenarioId: 'scenario-001',
    stepId: 'step-002',
    templateId: 'template-002',
    subject: 'Bạn đã xem email của chúng tôi chưa? - Phạm Nhất Bá Tuật',
    body: 'Follow-up email body...',
    status: 'pending',
    createdAt: new Date('2026-03-30'),
    updatedAt: new Date('2026-03-30'),
  },
  {
    id: 'log-003',
    leadId: 'lead-002',
    leadName: 'Lê Thị Hương',
    email: 'lethihuong@gmail.com',
    scenarioId: 'scenario-002',
    stepId: 'step-004',
    templateId: 'template-004',
    subject: 'Cơ hội hạn chế - Lê Thị Hương, hãy liên hệ ngay!',
    body: 'Urgent follow-up email body...',
    status: 'sent',
    messageId: 'msg-002',
    sentAt: new Date('2026-03-27T14:30:00'),
    openedAt: new Date('2026-03-27T15:45:00'),
    createdAt: new Date('2026-03-27T14:30:00'),
    updatedAt: new Date('2026-03-27T15:45:00'),
  },
];

// Helper functions
export function getScenarioById(id: string): EmailScenario | undefined {
  return mockScenarios.find((s) => s.id === id);
}

export function getTemplateById(id: string): EmailTemplate | undefined {
  return mockTemplates.find((t) => t.id === id);
}

export function getScenarioStats(scenarioId: string): EmailScenarioStats {
  const logs = mockCampaignLogs.filter((log) => log.scenarioId === scenarioId);
  const scenario = getScenarioById(scenarioId);

  const totalSent = logs.filter((log) => log.status === 'sent').length;
  const totalOpened = logs.filter((log) => log.openedAt).length;
  const totalClicked = logs.filter((log) => log.clickedAt).length;
  const totalConverted = logs.filter((log) => log.status === 'sent').length; // Mock

  return {
    scenarioId,
    scenarioName: scenario?.name || 'Unknown',
    totalLeads: logs.length,
    totalSent,
    totalOpened,
    totalClicked,
    totalConverted,
    openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
    clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
    conversionRate: totalSent > 0 ? (totalConverted / totalSent) * 100 : 0,
  };
}

export function getCampaignLogsByScenario(scenarioId: string): EmailCampaignLog[] {
  return mockCampaignLogs.filter((log) => log.scenarioId === scenarioId);
}
