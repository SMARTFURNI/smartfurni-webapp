export type ConversationSenderType = "customer" | "page" | "sale" | "agent" | "system";
export type ConversationLearningStatus = "draft" | "approved" | "archived";
export type ConversationLearningLeadTemperature = "hot" | "warm" | "cold";
export type ConversationAnalysisReviewStatus = "analyzed" | "need_human_review";

export interface ConversationMessageInput {
  id?: string;
  customerId?: string;
  customerName?: string;
  facebookUserId?: string;
  conversationId: string;
  assignedSale?: string;
  tags: string[];
  orderStatus?: string;
  content: string;
  senderType: ConversationSenderType;
  messageTime: string;
}

export interface ConversationLearningSource {
  conversationId: string;
  customerId?: string;
  customerName?: string;
  facebookUserId?: string;
  assignedSale?: string;
  tags: string[];
  orderStatus?: string;
  latestMessageAt?: string;
  messages: ConversationMessageInput[];
}

export interface ConversationAnalysis {
  id: string;
  conversationId: string;
  customerId?: string;
  productInterest: string[];
  customerNeed: string;
  objections: string[];
  buyingSignals: string[];
  leadTemperature: ConversationLearningLeadTemperature;
  leadScore: number;
  conversationSummary: string;
  finalStatus: string;
  nextBestAction: string;
  reviewStatus: ConversationAnalysisReviewStatus;
  sourcePayload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SalesScript {
  id: string;
  scriptName: string;
  customerSituation: string;
  triggerSignals: string[];
  suggestedQuestions: string[];
  suggestedReply: string;
  recommendedProducts: string[];
  objectionHandling: string;
  closingMethod: string;
  nextCrmAction: string;
  status: ConversationLearningStatus;
  sourceAnalysisIds: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SalesWorkflow {
  id: string;
  workflowName: string;
  triggerCondition: string;
  aiAction: string;
  humanAction: string;
  delayTime: string;
  priority: number;
  status: ConversationLearningStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationLearningOverview {
  totalAnalyzed: number;
  needHumanReview: number;
  hotLeads: number;
  draftScripts: number;
  approvedScripts: number;
  activeWorkflows: number;
  latestAnalyses: ConversationAnalysis[];
}

export const CONVERSATION_LEAD_TEMPERATURE_LABELS: Record<ConversationLearningLeadTemperature, string> = {
  hot: "Nóng",
  warm: "Ấm",
  cold: "Lạnh",
};

export const CONVERSATION_REVIEW_STATUS_LABELS: Record<ConversationAnalysisReviewStatus, string> = {
  analyzed: "Đã phân tích",
  need_human_review: "Cần người kiểm tra",
};
