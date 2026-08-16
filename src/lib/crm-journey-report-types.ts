export type JourneyReportEventType =
  | "enrolled"
  | "send_attempted"
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "opened"
  | "clicked"
  | "replied"
  | "fallback_used"
  | "waiting_content"
  | "failed"
  | "delivery_unknown"
  | "paused"
  | "resumed"
  | "cancelled"
  | "stage_changed"
  | "quote_created"
  | "won"
  | "lost"
  | "unsubscribed";

export interface JourneyReportFilters {
  from: string;
  to: string;
  journeyCode: string;
  channel: string;
  source: string;
  assignedTo: string;
}

export interface JourneyReportSummary {
  eligibleNow: number;
  enrolled: number;
  active: number;
  paused: number;
  completed: number;
  cancelled: number;
  contacted: number;
  responded: number;
  quoted: number;
  negotiating: number;
  won: number;
  lost: number;
  unsubscribed: number;
  dueActions: number;
  sentActions: number;
  failedActions: number;
  waitingContent: number;
  deliveryUnknown: number;
  deliveredEmails: number;
  bouncedEmails: number;
  complainedEmails: number;
  fallbackActions: number;
  sendSuccessRate: number;
  responseRate: number;
  quoteRate: number;
  winRate: number;
  fallbackRate: number;
  averageResponseHours: number | null;
  assistedRevenue: number;
  pipelineValue: number;
}

export interface JourneyReportFunnelRow {
  key: string;
  label: string;
  count: number;
  rateFromPrevious: number;
  rateFromEnrolled: number;
}

export interface JourneyReportDailyRow {
  date: string;
  enrolled: number;
  sent: number;
  responses: number;
  won: number;
}

export interface JourneyReportWorkflowRow {
  journeyCode: string;
  journeyName: string;
  enrolled: number;
  contacted: number;
  responded: number;
  sent: number;
  failed: number;
  won: number;
  assistedRevenue: number;
  sendSuccessRate: number;
  responseRate: number;
  winRate: number;
}

export interface JourneyReportChannelRow {
  channel: string;
  attempted: number;
  sent: number;
  failed: number;
  deliveryUnknown: number;
  delivered: number;
  bounced: number;
  complained: number;
  fallbackSent: number;
  responses: number;
  opened: number;
  clicked: number;
  successRate: number;
  responseRate: number;
}

export interface JourneyReportStepRow {
  journeyCode: string;
  stepId: string;
  dayOffset: number;
  title: string;
  objective: string;
  due: number;
  sent: number;
  failed: number;
  waitingContent: number;
  deliveryUnknown: number;
  fallbackSent: number;
  responses: number;
  opened: number;
  clicked: number;
  stageAdvanced: number;
  unsubscribed: number;
  successRate: number;
  responseRate: number;
}

export interface JourneyReportFailureRow {
  status: string;
  channel: string;
  error: string;
  count: number;
  lastOccurredAt: string;
}

export interface JourneyReportLeadRow {
  enrollmentId: string;
  journeyCode: string;
  leadId: string;
  leadName: string;
  company: string;
  source: string;
  assignedTo: string;
  stage: string;
  enrollmentStatus: string;
  enrolledAt: string;
  lastOutboundAt: string | null;
  sentSteps: number;
  dueSteps: number;
  responded: boolean;
  lastStepId: string;
  lastStepAt: string | null;
  expectedValue: number;
  pausedReason: string;
}

export interface JourneyReportOption {
  value: string;
  label: string;
}

export interface JourneyWorkflowReport {
  generatedAt: string;
  filters: JourneyReportFilters;
  dataFreshness: {
    lastActionAt: string | null;
    lastEventAt: string | null;
    note: string;
  };
  options: {
    workflows: JourneyReportOption[];
    sources: JourneyReportOption[];
    assignees: JourneyReportOption[];
    channels: JourneyReportOption[];
  };
  summary: JourneyReportSummary;
  funnel: JourneyReportFunnelRow[];
  daily: JourneyReportDailyRow[];
  workflows: JourneyReportWorkflowRow[];
  channels: JourneyReportChannelRow[];
  steps: JourneyReportStepRow[];
  failures: JourneyReportFailureRow[];
  leads: JourneyReportLeadRow[];
}

export interface JourneyTimelineItem {
  id: string;
  type: string;
  title: string;
  detail: string;
  channel: string;
  occurredAt: string;
  status: string;
}

export interface JourneyEnrollmentTimeline {
  enrollmentId: string;
  journeyCode: string;
  leadId: string;
  leadName: string;
  company: string;
  stage: string;
  enrollmentStatus: string;
  items: JourneyTimelineItem[];
}
