export type KnowledgeCategory =
  | "products"
  | "pricing"
  | "policies"
  | "sales_process"
  | "faq"
  | "objection_handling"
  | "follow_up_scripts";

export type KnowledgeStatus = "draft" | "active" | "archived";
export type LeadTemperature = "hot" | "warm" | "cold";
export type AgentStatus = "active" | "inactive";
export type AiReviewStatus = "answered" | "need_human_review";

export interface KnowledgeDocument {
  id: string;
  title: string;
  category: KnowledgeCategory;
  status: KnowledgeStatus;
  content: string;
  summary?: string;
  tags: string[];
  source?: string;
  metadata: Record<string, unknown>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessCustomer {
  id: string;
  name: string;
  phone: string;
  leadSource?: string;
  interestedProducts: string[];
  preferredSize?: string;
  preferredColor?: string;
  budget?: number;
  location?: string;
  conversationSummary?: string;
  temperature: LeadTemperature;
  leadScore: number;
  mainPainPoint?: string;
  aiNextStep?: string;
  ownerId?: string;
  ownerName?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerConversation {
  id: string;
  customerId: string;
  channel: "manual" | "zalo" | "facebook" | "website" | "hotline" | "pancake";
  direction: "inbound" | "outbound" | "internal";
  message: string;
  authorType: "customer" | "staff" | "ai" | "system";
  authorName?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AiAgentDefinition {
  id: string;
  name: string;
  role: string;
  allowedActions: string[];
  systemPrompt: string;
  tools: string[];
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AgentActionLog {
  id: string;
  agentId: string;
  agentName?: string;
  customerId?: string;
  actionType: string;
  prompt?: string;
  referencedDocumentIds: string[];
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  status: AiReviewStatus | "success" | "failed";
  durationMs: number;
  createdAt: string;
}

export interface WorkflowRule {
  id: string;
  name: string;
  triggerType: "message_intent" | "lead_score" | "no_reply" | "quote_request" | "deposit_paid";
  rule: Record<string, unknown>;
  actions: Record<string, unknown>[];
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LeadScoreRecord {
  id: string;
  customerId: string;
  score: number;
  temperature: LeadTemperature;
  reason: string;
  signals: string[];
  createdByAgentId?: string;
  createdAt: string;
}

export interface BrainQuotation {
  id: string;
  customerId: string;
  productName: string;
  size?: string;
  color?: string;
  price: number;
  deposit?: number;
  shippingFee?: number;
  status: "draft" | "sent" | "accepted" | "rejected";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesTask {
  id: string;
  customerId: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  status: string;
  assignedTo?: string;
  createdByAgentId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRunResult {
  status: AiReviewStatus;
  customer: BusinessCustomer;
  referencedDocuments: KnowledgeDocument[];
  agentActions: AgentActionLog[];
  suggestedReply: string;
  nextTask?: {
    id: string;
    title: string;
    dueDate: string;
    priority: "high" | "medium" | "low";
  };
  leadScore: LeadScoreRecord;
}

export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  products: "Sản phẩm",
  pricing: "Giá, size, màu",
  policies: "Chính sách",
  sales_process: "Quy trình sale",
  faq: "FAQ",
  objection_handling: "Xử lý từ chối",
  follow_up_scripts: "Kịch bản chăm sóc lại",
};

export const KNOWLEDGE_STATUS_LABELS: Record<KnowledgeStatus, string> = {
  draft: "Nháp",
  active: "Đang dùng",
  archived: "Lưu trữ",
};
