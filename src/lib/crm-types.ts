/**
 * crm-types.ts — SmartFurni CRM B2B
 * Types, constants, and helper functions (no DB imports - safe for client components)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeadStage =
  | "new"           // Khách hàng mới
  | "profile_sent"  // Đã gửi Profile
  | "surveyed"      // Đã khảo sát
  | "quoted"        // Đã báo giá
  | "negotiating"   // Thương thảo
  | "won"           // Đã chốt
  | "lost";         // Thất bại

export type LeadType = "architect" | "investor" | "dealer";

export type ActivityType = "call" | "meeting" | "email" | "note" | "quote_sent" | "contract";

export interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  zaloPhone?: string;        // Số Zalo của khách hàng
  email: string;
  type: LeadType;
  stage: LeadStage;
  district: string;
  expectedValue: number;
  source: string;
  assignedTo: string;
  notes: string;
  lastContactAt: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  projectName: string;
  projectAddress: string;
  unitCount: number;
  lostReason?: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: ActivityType;
  title: string;
  content: string;
  createdBy: string;
  createdAt: string;
  scheduledAt?: string;
  attachments: ActivityAttachment[];
}

export interface ActivityAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface CrmProduct {
  id: string;
  name: string;
  category: "sofa_bed" | "ergonomic_bed";
  sku: string;
  description: string;
  imageUrl: string;
  specs: Record<string, string>;
  basePrice: number;
  discountTiers: DiscountTier[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DiscountTier {
  minQty: number;
  discountPct: number;
  label: string;
}

export interface QuoteItem {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  unitPrice: number;
  discountPct: number;
  finalPrice: number;
  notes: string;
}

export interface Quote {
  id: string;
  leadId: string;
  leadName: string;
  quoteNumber: string;
  items: QuoteItem[];
  subtotal: number;
  extraDiscountPct: number;
  total: number;
  validUntil: string;
  status: "draft" | "sent" | "accepted" | "rejected";
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrmTask {
  id: string;
  leadId: string;
  leadName: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  done: boolean;
  assignedTo: string;
  createdAt: string;
}

export interface CrmSourceStat {
  source: string;
  count: number;
  wonCount: number;
  totalValue: number;
}

export interface StaffPerformance {
  staffName: string;
  leadsCount: number;
  wonCount: number;
  wonValue: number;
  conversionRate: number;
}

export interface MonthlyRevenue {
  month: string;
  label: string;
  value: number;
}

export interface CrmStats {
  totalLeads: number;
  byStage: Record<LeadStage, number>;
  bySource: CrmSourceStat[];
  byType: Record<LeadType, number>;
  totalExpectedValue: number;
  wonValue: number;
  conversionRate: number;
  overdueLeads: number;
  todayTasks: number;
  recentActivities: Activity[];
  staffPerformance: StaffPerformance[];
  monthlyRevenue: MonthlyRevenue[];
  newLeadsThisMonth: number;
  wonLeadsThisMonth: number;
  wonValueThisMonth: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const STAGE_LABELS: Record<LeadStage, string> = {
  new: "Khách hàng mới",
  profile_sent: "Đã gửi Profile",
  surveyed: "Đã khảo sát",
  quoted: "Đã báo giá",
  negotiating: "Thương thảo",
  won: "Đã chốt ✓",
  lost: "Thất bại",
};

export const STAGE_COLORS: Record<LeadStage, string> = {
  new: "#6366f1",
  profile_sent: "#3b82f6",
  surveyed: "#8b5cf6",
  quoted: "#f59e0b",
  negotiating: "#f97316",
  won: "#22c55e",
  lost: "#6b7280",
};

export const TYPE_LABELS: Record<LeadType, string> = {
  architect: "Kiến trúc sư",
  investor: "Chủ đầu tư CHDV",
  dealer: "Đại lý",
};

export const TYPE_COLORS: Record<LeadType, string> = {
  architect: "#8b5cf6",
  investor: "#3b82f6",
  dealer: "#f59e0b",
};

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  call: "Gọi điện",
  meeting: "Họp / Gặp mặt",
  email: "Gửi email",
  note: "Ghi chú",
  quote_sent: "Gửi báo giá",
  contract: "Hợp đồng",
};

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  call: "phone",
  meeting: "users",
  email: "mail",
  note: "file-text",
  quote_sent: "file-check",
  contract: "file-signature",
};

export const DISTRICTS = [
  "Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10",
  "Q11", "Q12", "Bình Thạnh", "Gò Vấp", "Phú Nhuận", "Tân Bình",
  "Tân Phú", "Bình Tân", "Thủ Đức", "Hóc Môn", "Củ Chi", "Bình Chánh",
  "Nhà Bè", "Cần Giờ", "Hà Nội", "Đà Nẵng", "Khác",
];

export const SOURCES = [
  "Facebook Ads", "Google Ads", "KTS giới thiệu", "Khách hàng cũ giới thiệu",
  "Zalo", "Website", "Triển lãm", "Telesale", "Khác",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

export function isOverdue(lead: Lead): boolean {
  if (lead.stage === "won" || lead.stage === "lost") return false;
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  return new Date(lead.lastContactAt) < threeDaysAgo;
}

export function calcQuoteTotal(items: QuoteItem[], extraDiscountPct: number): number {
  const subtotal = items.reduce((sum, item) => sum + item.finalPrice * item.qty, 0);
  return subtotal * (1 - extraDiscountPct / 100);
}

export function getDiscountForQty(product: CrmProduct, qty: number): number {
  const tiers = [...product.discountTiers].sort((a, b) => b.minQty - a.minQty);
  for (const tier of tiers) {
    if (qty >= tier.minQty) return tier.discountPct;
  }
  return 0;
}
