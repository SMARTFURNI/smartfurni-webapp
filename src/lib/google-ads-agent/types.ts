export type ProductLine = "sofa_giuong" | "giuong_cong_thai_hoc" | "giuong_y_te" | "ban_si_dai_ly";
export type CampaignObjective = "messages" | "calls" | "purchase" | "showroom" | "dealer";
export type CampaignLocation = "HCM" | "Ha Noi" | "Binh Duong" | "Dong Nai" | "Long An" | "Toan quoc";
export type MatchType = "broad" | "phrase" | "exact";
export type ApprovalStatus = "ai_created" | "human_approved" | "pushed_to_google" | "rejected";
export type GoogleAdsAccountStatus = "not_connected" | "connected" | "error";

export interface GoogleAdsProduct {
  id: string;
  sku: string;
  name: string;
  productLine: ProductLine;
  price: number;
  size: string;
  material: string;
  usp: string[];
  targetCustomers: string[];
  landingPageUrl: string;
  status: "active" | "paused";
  createdAt: string;
  updatedAt: string;
}

export interface CampaignInput {
  productLine: ProductLine;
  productSku: string;
  objective: CampaignObjective;
  location: CampaignLocation;
  dailyBudget: number;
  targetCpa: number;
}

export interface KeywordDraft {
  keyword: string;
  matchType: MatchType;
  intent: "high" | "medium" | "low";
  negative: boolean;
}

export interface AdAssetDraft {
  type: "headline" | "description" | "sitelink" | "callout" | "structured_snippet";
  text: string;
  url?: string;
  values?: string[];
}

export interface AIAdDraftOutput {
  campaignName: string;
  adGroupName: string;
  keywords: KeywordDraft[];
  negativeKeywords: KeywordDraft[];
  headlines: string[];
  descriptions: string[];
  sitelinks: { text: string; url: string; description?: string }[];
  callouts: string[];
  structuredSnippet: { header: string; values: string[] };
  landingPageUrl: string;
  suggestedDailyBudget: number;
  strategyReason: string;
}

export interface AdCampaignDraft {
  id: string;
  input: CampaignInput;
  product: GoogleAdsProduct;
  output: AIAdDraftOutput;
  status: ApprovalStatus;
  validationErrors: string[];
  aiModel: string;
  googleCampaignId?: string;
  createdBy: string;
  approvedBy?: string;
  rejectedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleAdsAccount {
  id: string;
  customerId: string;
  encryptedRefreshToken?: string;
  status: GoogleAdsAccountStatus;
  connectedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdPerformanceDaily {
  id: string;
  date: string;
  campaignName: string;
  adGroupName: string;
  productSku: string;
  cost: number;
  clicks: number;
  impressions: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
}

export interface ApprovalLog {
  id: string;
  draftId: string;
  status: ApprovalStatus;
  reason?: string;
  actor: string;
  createdAt: string;
}
