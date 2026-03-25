/**
 * crm-settings-store.ts — SmartFurni CRM Settings
 * Lưu trữ và quản lý toàn bộ cấu hình CRM trong database
 */

import { query, queryOne } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PipelineStage {
  id: string;
  label: string;
  color: string;
  order: number;
  isWon: boolean;
  isLost: boolean;
}

export interface LeadSource {
  id: string;
  label: string;
  color: string;
  order: number;
}

export interface LeadTypeConfig {
  id: string;         // "architect" | "investor" | "dealer" | custom
  label: string;
  color: string;
  order: number;
}

export interface DiscountTierConfig {
  minQty: number;
  discountPct: number;
  label: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  taxCode: string;
  bankName: string;
  bankAccount: string;
  bankBranch: string;
  logoUrl: string;
  representativeName: string;
  representativeTitle: string;
}

export interface WebhookConfig {
  secret: string;
  enabledSources: string[];
  defaultAssignedTo: string;
  defaultStage: string;
  notifyOnNewLead: boolean;
  notifyEmail: string;
}

export interface NotificationConfig {
  overdueThresholdDays: number;
  reminderBeforeMeetingMinutes: number;
  dailyDigestEnabled: boolean;
  dailyDigestTime: string;
}

export interface QuoteConfig {
  validityDays: number;
  defaultPaymentTerms: string;
  defaultDeliveryDays: number;
  footerNote: string;
  showProductImages: boolean;
  currency: string;
}

export interface EmailConfig {
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  emailSignature: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  useSsl: boolean;
}

export interface CrmSettings {
  company: CompanyInfo;
  pipeline: PipelineStage[];
  sources: LeadSource[];
  leadTypes: LeadTypeConfig[];
  discountTiers: DiscountTierConfig[];
  webhook: WebhookConfig;
  notifications: NotificationConfig;
  quote: QuoteConfig;
  email: EmailConfig;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: CrmSettings = {
  company: {
    name: "SmartFurni",
    address: "123 Nguyễn Văn Linh, Q7, TP.HCM",
    phone: "0901 234 567",
    email: "b2b@smartfurni.vn",
    website: "https://smartfurni.vn",
    taxCode: "0123456789",
    bankName: "Vietcombank",
    bankAccount: "1234567890",
    bankBranch: "Chi nhánh TP.HCM",
    logoUrl: "",
    representativeName: "Nguyễn Văn A",
    representativeTitle: "Giám đốc Kinh doanh",
  },
  pipeline: [
    { id: "new",           label: "Khách hàng mới",   color: "#60a5fa", order: 0, isWon: false, isLost: false },
    { id: "profile_sent",  label: "Đã gửi Profile",   color: "#a78bfa", order: 1, isWon: false, isLost: false },
    { id: "surveyed",      label: "Đã khảo sát",      color: "#C9A84C", order: 2, isWon: false, isLost: false },
    { id: "quoted",        label: "Đã báo giá",        color: "#f97316", order: 3, isWon: false, isLost: false },
    { id: "negotiating",   label: "Thương thảo",       color: "#ec4899", order: 4, isWon: false, isLost: false },
    { id: "won",           label: "Đã chốt (Won)",     color: "#22c55e", order: 5, isWon: true,  isLost: false },
    { id: "lost",          label: "Thất bại (Lost)",   color: "#f87171", order: 6, isWon: false, isLost: true  },
  ],
  sources: [
    { id: "facebook_ads",   label: "Facebook Ads",              color: "#60a5fa", order: 0 },
    { id: "google_ads",     label: "Google Ads",                color: "#f87171", order: 1 },
    { id: "kts",            label: "KTS giới thiệu",            color: "#a78bfa", order: 2 },
    { id: "referral",       label: "Khách hàng cũ giới thiệu",  color: "#22c55e", order: 3 },
    { id: "zalo",           label: "Zalo",                      color: "#06b6d4", order: 4 },
    { id: "website",        label: "Website",                   color: "#f97316", order: 5 },
    { id: "exhibition",     label: "Triển lãm",                 color: "#C9A84C", order: 6 },
    { id: "telesale",       label: "Telesale",                  color: "#94a3b8", order: 7 },
    { id: "other",          label: "Khác",                      color: "#64748b", order: 8 },
  ],
  leadTypes: [
    { id: "architect", label: "Kiến trúc sư",         color: "#a78bfa", order: 0 },
    { id: "investor",  label: "Chủ đầu tư CHDV",      color: "#60a5fa", order: 1 },
    { id: "dealer",    label: "Đại lý",                color: "#C9A84C", order: 2 },
  ],
  discountTiers: [
    { minQty: 5,  discountPct: 10, label: "Từ 5 bộ" },
    { minQty: 10, discountPct: 15, label: "Từ 10 bộ" },
    { minQty: 20, discountPct: 20, label: "Từ 20 bộ" },
    { minQty: 50, discountPct: 25, label: "Từ 50 bộ" },
  ],
  webhook: {
    secret: "smartfurni-webhook-2025",
    enabledSources: ["Facebook Ads", "Google Ads", "Zalo", "Website"],
    defaultAssignedTo: "",
    defaultStage: "new",
    notifyOnNewLead: true,
    notifyEmail: "",
  },
  notifications: {
    overdueThresholdDays: 3,
    reminderBeforeMeetingMinutes: 30,
    dailyDigestEnabled: false,
    dailyDigestTime: "08:00",
  },
  quote: {
    validityDays: 30,
    defaultPaymentTerms: "Thanh toán 50% khi đặt hàng, 50% khi giao hàng",
    defaultDeliveryDays: 14,
    footerNote: "Báo giá có hiệu lực trong 30 ngày kể từ ngày phát hành. Giá chưa bao gồm VAT.",
    showProductImages: true,
    currency: "VND",
  },
  email: {
    senderName: "SmartFurni B2B",
    senderEmail: "b2b@smartfurni.vn",
    replyToEmail: "b2b@smartfurni.vn",
    emailSignature: "Trân trọng,\nĐội ngũ SmartFurni B2B\nHotline: 0901 234 567",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPassword: "",
    useSsl: true,
  },
};

// ─── DB Init ──────────────────────────────────────────────────────────────────

async function initSettingsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function getCrmSettings(): Promise<CrmSettings> {
  await initSettingsTable();
  const rows = await query("SELECT key, value FROM crm_settings");
  const stored: Partial<Record<keyof CrmSettings, unknown>> = {};
  for (const row of rows) {
    stored[row.key as keyof CrmSettings] = row.value;
  }
  return {
    company:       (stored.company       as CompanyInfo)       ?? DEFAULT_SETTINGS.company,
    pipeline:      (stored.pipeline      as PipelineStage[])   ?? DEFAULT_SETTINGS.pipeline,
    sources:       (stored.sources       as LeadSource[])      ?? DEFAULT_SETTINGS.sources,
    leadTypes:     (stored.leadTypes     as LeadTypeConfig[])  ?? DEFAULT_SETTINGS.leadTypes,
    discountTiers: (stored.discountTiers as DiscountTierConfig[]) ?? DEFAULT_SETTINGS.discountTiers,
    webhook:       (stored.webhook       as WebhookConfig)     ?? DEFAULT_SETTINGS.webhook,
    notifications: (stored.notifications as NotificationConfig) ?? DEFAULT_SETTINGS.notifications,
    quote:         (stored.quote         as QuoteConfig)       ?? DEFAULT_SETTINGS.quote,
    email:         (stored.email         as EmailConfig)       ?? DEFAULT_SETTINGS.email,
  };
}

export async function updateCrmSetting<K extends keyof CrmSettings>(
  key: K,
  value: CrmSettings[K]
): Promise<void> {
  await initSettingsTable();
  await query(
    `INSERT INTO crm_settings (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
}

export async function resetCrmSetting<K extends keyof CrmSettings>(key: K): Promise<void> {
  await initSettingsTable();
  await query("DELETE FROM crm_settings WHERE key=$1", [key]);
}
