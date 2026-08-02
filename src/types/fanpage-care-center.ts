export type FanpageCarePlanStatus =
  | "pending"
  | "approved"
  | "in_progress"
  | "completed"
  | "dismissed";

export type FanpageLeadTemperature = "hot" | "warm" | "cold";

export interface FanpageCarePlanStep {
  dayOffset: number;
  when: string;
  channel: "Messenger" | "Điện thoại" | "Zalo" | "CRM";
  goal: string;
  action: string;
  draftMessage?: string;
  requiresHumanApproval: boolean;
}

export interface FanpageCarePlan {
  id: string;
  analysisDate: string;
  runId?: string;
  pageInternalId: string;
  pageFacebookId: string;
  pageName: string;
  conversationId: string;
  participantId?: string;
  customerId?: string;
  customerName: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  leadScore: number;
  leadTemperature: FanpageLeadTemperature;
  funnelStage: string;
  confidence: number;
  summary: string;
  customerNeed: string;
  productInterest: string[];
  objections: string[];
  buyingSignals: string[];
  nextBestAction: string;
  dueAt?: string;
  planSteps: FanpageCarePlanStep[];
  status: FanpageCarePlanStatus;
  engine: "openai" | "gemini" | "rules";
  model?: string;
  sourceMessageCount: number;
  sourceLatestMessageAt?: string;
  notificationOwnerScope?: string;
  notificationOwnerId?: string;
  notificationSentAt?: string;
  notificationResult: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface FanpageCareRun {
  id: string;
  runDate: string;
  runType: "scheduled" | "manual";
  status: "running" | "success" | "partial" | "failed" | "skipped";
  startedAt: string;
  finishedAt?: string;
  pagesTotal: number;
  pagesSynced: number;
  conversationsScanned: number;
  messagesSaved: number;
  leadsQualified: number;
  plansGenerated: number;
  pushSent: number;
  model?: string;
  error?: string;
  details: Record<string, unknown>;
}

export interface FanpageCarePageSummary {
  pageInternalId: string;
  pageName: string;
  conversationCount: number;
  qualifiedLeads: number;
  hotLeads: number;
  pendingPlans: number;
  lastSyncedAt?: string;
}

export interface FanpageCareCenterOverview {
  totalPages: number;
  conversationsToday: number;
  qualifiedLeadsToday: number;
  hotLeadsToday: number;
  pendingPlans: number;
  approvedPlans: number;
  completedPlans: number;
  pushSentToday: number;
  lastRun?: FanpageCareRun;
  pages: FanpageCarePageSummary[];
}

export interface FanpageCareStaffOption {
  id: string;
  fullName: string;
  role: string;
  pushSubscriptions: number;
}
