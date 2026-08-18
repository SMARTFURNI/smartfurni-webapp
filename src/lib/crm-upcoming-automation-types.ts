export type UpcomingAutomationChannel = "zalo_personal" | "zalo_oa" | "email";

export type UpcomingAutomationReadiness =
  | "ready"
  | "deferred"
  | "retrying"
  | "processing"
  | "waiting_content"
  | "paused"
  | "missing_recipient";

export type UpcomingAutomationOrigin = "journey" | "email_queue" | "zalo_queue";

export interface UpcomingAutomationFilters {
  from: string;
  to: string;
  journeyCode: string;
  channel: string;
  readiness: string;
  source: string;
  assignedTo: string;
  search: string;
}

export interface UpcomingAutomationItem {
  id: string;
  origin: UpcomingAutomationOrigin;
  leadId: string;
  leadName: string;
  company: string;
  recipient: string;
  leadSource: string;
  assignedTo: string;
  effectiveSendAt: string;
  scheduledAt: string;
  nextAttemptAt: string | null;
  channel: UpcomingAutomationChannel;
  fallbackChannels: UpcomingAutomationChannel[];
  journeyCode: string;
  journeyName: string;
  stepId: string;
  stepTitle: string;
  dayOffset: number | null;
  subject: string;
  message: string;
  rawStatus: string;
  readiness: UpcomingAutomationReadiness;
  readinessReason: string;
  attempts: number;
  mediaCount: number;
  updatedAt: string;
}

export interface UpcomingAutomationDailyRow {
  date: string;
  total: number;
  ready: number;
  attention: number;
  channels: Record<UpcomingAutomationChannel, number>;
}

export interface UpcomingAutomationSummary {
  total: number;
  uniqueLeads: number;
  ready: number;
  attention: number;
  channels: Record<UpcomingAutomationChannel, number>;
}

export interface UpcomingAutomationOption {
  value: string;
  label: string;
}

export interface UpcomingAutomationReport {
  generatedAt: string;
  filters: UpcomingAutomationFilters;
  summary: UpcomingAutomationSummary;
  daily: UpcomingAutomationDailyRow[];
  items: UpcomingAutomationItem[];
  options: {
    workflows: UpcomingAutomationOption[];
    sources: UpcomingAutomationOption[];
    assignees: UpcomingAutomationOption[];
    channels: UpcomingAutomationOption[];
    readiness: UpcomingAutomationOption[];
  };
  dataFreshness: {
    lastUpdatedAt: string | null;
    note: string;
  };
}
