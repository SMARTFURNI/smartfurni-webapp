export type RawLeadSource = "facebook_lead" | "tiktok_lead" | "website" | "manual" | "other";
export type RawLeadStatus = "pending" | "claimed" | "converted";

export interface RawLead {
  id: string;
  source: RawLeadSource;
  fullName: string;
  phone: string;
  email: string;
  adName?: string;
  campaignName?: string;
  formName?: string;
  message?: string;
  customerRole?: string;
  rawData?: Record<string, unknown>;
  status: RawLeadStatus;
  claimedBy?: string;
  claimedByName?: string;
  claimedAt?: string;
  convertedLeadId?: string;
  createdAt: string;
}

export const SOURCE_LABELS: Record<RawLeadSource, string> = {
  facebook_lead: "Facebook Lead",
  tiktok_lead: "TikTok Lead",
  website: "Website / Landing Page",
  manual: "Nhập tay",
  other: "Khác",
};

export const SOURCE_COLORS: Record<RawLeadSource, string> = {
  facebook_lead: "#1877F2",
  tiktok_lead: "#000000",
  website: "#F97316",
  manual: "#6b7280",
  other: "#9ca3af",
};
