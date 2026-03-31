/**
 * crm-settings-store.ts — SmartFurni CRM Settings
 * Lưu trữ và quản lý toàn bộ cấu hình CRM trong database
 */

import { query } from "./db";

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
  id: string;
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
  // ── Facebook Lead Ads ──────────────────────────────────────────────────────
  /** Bật/tắt tích hợp Facebook Lead Ads */
  fbEnabled: boolean;
  /** Facebook App ID (lấy từ Meta for Developers) */
  fbAppId: string;
  /** Facebook App Secret (dùng để xác thực chữ ký webhook) */
  fbAppSecret: string;
  /** Verify Token (tự đặt, dùng khi đăng ký webhook trên Facebook) */
  fbVerifyToken: string;
  /** Page Access Token (lấy từ Facebook Page Settings → Integrations) */
  fbPageAccessToken: string;
  /** Tên Page Facebook đang kết nối */
  fbPageName: string;
}

/** Cấu hình cho 1 sheet nguồn (Facebook / TikTok / Website / ...) */
export interface SheetSourceConfig {
  /** ID duy nhất của sheet này */
  id: string;
  /** Tên hiển thị, ví dụ: "Facebook Lead Ads" */
  label: string;
  /** Bật/tắt sheet này */
  enabled: boolean;
  /** Spreadsheet ID (lấy từ URL Google Sheet) */
  spreadsheetId: string;
  /** Tên sheet tab, ví dụ: Trang tính1 */
  sheetName: string;
  /** Nguồn kênh cố định cho sheet này */
  source: "facebook_lead" | "tiktok_lead" | "website" | "other";
  /** Màu badge hiển thị */
  color: string;
  /** Thời điểm sync lần cuối (ISO string) */
  lastSyncedAt: string;
  /** Số lead đã sync */
  totalSynced: number;
}

export interface GoogleSheetConfig {
  /** Bật/tắt toàn bộ tích hợp Google Sheet */
  enabled: boolean;
  /** Google Service Account JSON key (dùng chung cho tất cả sheet) */
  serviceAccountKey: string;
  /** Danh sách các sheet nguồn */
  sources: SheetSourceConfig[];
  /** Cột ID để dedup (tránh import trùng) */
  idColumn: string;
  /** Cột tên đầy đủ */
  nameColumn: string;
  /** Cột số điện thoại */
  phoneColumn: string;
  /** Cột email */
  emailColumn: string;
  /** Cột tên quảng cáo */
  adNameColumn: string;
  /** Cột tên campaign */
  campaignNameColumn: string;
  /** Cột tên form */
  formNameColumn: string;
  /** Cột ghi chú/nhu cầu (tùy chọn) */
  messageColumn: string;
  /** Cột vai trò / nhu cầu chính (tùy chọn) */
  customerRoleColumn: string;
  /** Tổng số lead đã sync */
  totalSynced: number;
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

// ─── Dashboard Theme Types ────────────────────────────────────────────────────

export type DashboardSectionId =
  | "kpiCards" | "dataPool" | "monthSummary" | "revenueChart"
  | "pipeline" | "funnel" | "staleDeals" | "heatmap"
  | "staffPerformance" | "recentActivities" | "recentQuotes"
  | "tasks" | "quickStats" | "quickLinks"
  | "overdue" | "leaderboard" | "teamOnline";

export type KpiCardId =
  | "totalLeads" | "pipelineValue" | "wonRate" | "overdue"
  | "revenueMonth" | "newLeadsMonth" | "wonLeadsMonth" | "totalQuotes";

export type ChartType = "bar" | "line" | "area";
export type FunnelStyle = "bars" | "funnel" | "donut";
export type ChartPalette = "brand" | "categorical" | "monochrome";
export type DensityMode = "compact" | "default" | "comfortable";
export type FontFamily = "inter" | "roboto" | "be-vietnam-pro" | "playfair";
export type KpiSize = "small" | "medium" | "large";
export type KpiColumns = 2 | 3 | 4;
export type RefreshInterval = 0 | 30 | 60 | 300 | 900;

export interface CustomWidget {
  id: string;
  title: string;
  dataType: "leads" | "tasks" | "quotes";
  filterStage?: string;
  filterSource?: string;
  displayType: "count" | "value" | "list";
  enabled: boolean;
}

export interface DashboardTheme {
  // Nền tổng thể
  pageBg: string;
  // KPI Cards
  kpiCardBg: string;
  kpiCardBorder: string;
  kpiCardTitleColor: string;
  kpiCardValueColor: string;
  kpiCardMutedColor: string;
  // KPI icon accent colors
  kpiCustomerColor: string;
  kpiPipelineColor: string;
  kpiWonColor: string;
  kpiOverdueColor: string;
  // Data Pool banner
  dataPoolBannerBg: string;
  dataPoolBannerText: string;
  dataPoolBtnBg: string;
  dataPoolBtnText: string;
  // This Month Summary cards
  summaryCardBg: string;
  summaryCardBorder: string;
  summaryRevenueColor: string;
  summaryNewLeadColor: string;
  summaryWonColor: string;
  // Section cards (chart, pipeline, etc.)
  sectionCardBg: string;
  sectionCardBorder: string;
  sectionHeaderColor: string;
  sectionBodyColor: string;
  // Right column (tasks, quick links)
  taskCardBg: string;
  taskUrgentColor: string;
  quickLinkBg: string;
  quickLinkIconColor: string;
  // Accent / brand color
  accentColor: string;
  accentTextColor: string;

  // ── Nhóm 1: Bố cục ──────────────────────────────────────────────────────────
  /** Thứ tự hiển thị các section */
  sectionOrder: DashboardSectionId[];
  /** Các section bị ẩn */
  hiddenSections: DashboardSectionId[];
  /** Số cột KPI cards: 2 | 3 | 4 */
  kpiColumns: KpiColumns;
  /** Các KPI card được chọn hiển thị */
  visibleKpiCards: KpiCardId[];

  // ── Nhóm 2: Typography ──────────────────────────────────────────────────────
  /** Mật độ thông tin */
  density: DensityMode;
  /** Font chữ */
  fontFamily: FontFamily;
  /** Cỡ chữ KPI value */
  kpiValueSize: KpiSize;

  // ── Nhóm 3: Biểu đồ ─────────────────────────────────────────────────────────
  /** Loại biểu đồ doanh thu */
  chartType: ChartType;
  /** Số tháng hiển thị trên biểu đồ */
  chartMonths: 3 | 6 | 12 | 24;
  /** Kiểu hiển thị Pipeline Funnel */
  funnelStyle: FunnelStyle;
  /** Palette màu biểu đồ */
  chartPalette: ChartPalette;

  // ── Nhóm 4: Widget & Nội dung ────────────────────────────────────────────────
  /** Custom widgets do admin tạo */
  customWidgets: CustomWidget[];
  /** Ticker thông báo nội bộ */
  tickerEnabled: boolean;
  tickerText: string;
  tickerBg: string;
  tickerTextColor: string;
  /** Logo & tên công ty trên header */
  headerLogoUrl: string;
  headerCompanyName: string;
  /** Ảnh nền header */
  headerBgImageUrl: string;
  headerBgOpacity: number;

  // ── Nhóm 5: Hành vi ──────────────────────────────────────────────────────────
  /** Tần suất tự động refresh (giây, 0 = tắt) */
  refreshInterval: RefreshInterval;
  /** Bật/tắt animation */
  animationsEnabled: boolean;
  /** Presentation mode (ẩn sidebar, phóng to số liệu) */
  presentationMode: boolean;
  /** Keyboard shortcuts enabled */
  keyboardShortcutsEnabled: boolean;
}

export interface CrmSettings {
  company: CompanyInfo;
  pipeline: PipelineStage[];
  sources: LeadSource[];
  leadTypes: LeadTypeConfig[];
  discountTiers: DiscountTierConfig[];
  webhook: WebhookConfig;
  googleSheet: GoogleSheetConfig;
  notifications: NotificationConfig;
  quote: QuoteConfig;
  email: EmailConfig;
  dashboardTheme: DashboardTheme;
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
  googleSheet: {
    enabled: false,
    serviceAccountKey: "",
    sources: [
      {
        id: "facebook",
        label: "Facebook Lead Ads",
        enabled: false,
        spreadsheetId: "",
        sheetName: "Trang tính1",
        source: "facebook_lead",
        color: "#1877f2",
        lastSyncedAt: "",
        totalSynced: 0,
      },
      {
        id: "tiktok",
        label: "TikTok Lead Ads",
        enabled: false,
        spreadsheetId: "",
        sheetName: "Trang tính1",
        source: "tiktok_lead",
        color: "#010101",
        lastSyncedAt: "",
        totalSynced: 0,
      },
      {
        id: "website",
        label: "Website / Landing Page",
        enabled: false,
        spreadsheetId: "",
        sheetName: "Trang tính1",
        source: "website",
        color: "#f97316",
        lastSyncedAt: "",
        totalSynced: 0,
      },
    ],
    idColumn: "id",
    nameColumn: "tên_đầy_đủ",
    phoneColumn: "số_điện_thoại",
    emailColumn: "email",
    adNameColumn: "ad_name",
    campaignNameColumn: "campaign_name",
    formNameColumn: "form_name",
    messageColumn: "",
    customerRoleColumn: "",
    totalSynced: 0,
  },
  webhook: {
    secret: "smartfurni-webhook-2025",
    enabledSources: ["Facebook Ads", "Google Ads", "Zalo", "Website"],
    defaultAssignedTo: "",
    defaultStage: "new",
    notifyOnNewLead: true,
    notifyEmail: "",
    fbEnabled: false,
    fbAppId: "",
    fbAppSecret: "",
    fbVerifyToken: "smartfurni_fb_webhook_2026",
    fbPageAccessToken: "",
    fbPageName: "",
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
  dashboardTheme: {
    // Colors — Clean Minimal
    pageBg: "#F7F8FA",
    kpiCardBg: "#FFFFFF",
    kpiCardBorder: "#EAECF0",
    kpiCardTitleColor: "#101828",
    kpiCardValueColor: "#101828",
    kpiCardMutedColor: "#667085",
    kpiCustomerColor: "#4F46E5",
    kpiPipelineColor: "#C9A84C",
    kpiWonColor: "#059669",
    kpiOverdueColor: "#DC2626",
    dataPoolBannerBg: "#FFFFFF",
    dataPoolBannerText: "#101828",
    dataPoolBtnBg: "#C9A84C",
    dataPoolBtnText: "#FFFFFF",
    summaryCardBg: "#FFFFFF",
    summaryCardBorder: "#EAECF0",
    summaryRevenueColor: "#C9A84C",
    summaryNewLeadColor: "#4F46E5",
    summaryWonColor: "#059669",
    sectionCardBg: "#FFFFFF",
    sectionCardBorder: "#EAECF0",
    sectionHeaderColor: "#101828",
    sectionBodyColor: "#344054",
    taskCardBg: "#FFFFFF",
    taskUrgentColor: "#DC2626",
    quickLinkBg: "#F7F8FA",
    quickLinkIconColor: "#4F46E5",
    accentColor: "#4F46E5",
    accentTextColor: "#FFFFFF",
    // Layout
    sectionOrder: [
      "kpiCards", "dataPool", "monthSummary", "revenueChart",
      "pipeline", "funnel", "staleDeals", "staffPerformance",
      "recentActivities", "recentQuotes",
      "tasks", "quickStats", "quickLinks", "overdue",
      "leaderboard", "teamOnline", "heatmap",
    ],
    hiddenSections: [],
    kpiColumns: 4,
    visibleKpiCards: ["totalLeads", "pipelineValue", "wonRate", "overdue"],
    // Typography
    density: "default",
    fontFamily: "inter",
    kpiValueSize: "medium",
    // Charts
    chartType: "bar",
    chartMonths: 6,
    funnelStyle: "bars",
    chartPalette: "brand",
    // Widgets
    customWidgets: [],
    tickerEnabled: false,
    tickerText: "",
    tickerBg: "#1E293B",
    tickerTextColor: "#F1F5F9",
    headerLogoUrl: "",
    headerCompanyName: "",
    headerBgImageUrl: "",
    headerBgOpacity: 0.08,
    // Behavior
    refreshInterval: 60,
    animationsEnabled: true,
    presentationMode: false,
    keyboardShortcutsEnabled: true,
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
  const savedTheme = stored.dashboardTheme as Partial<DashboardTheme> | undefined;
  return {
    company:       (stored.company       as CompanyInfo)       ?? DEFAULT_SETTINGS.company,
    pipeline:      (stored.pipeline      as PipelineStage[])   ?? DEFAULT_SETTINGS.pipeline,
    sources:       (stored.sources       as LeadSource[])      ?? DEFAULT_SETTINGS.sources,
    leadTypes:     (stored.leadTypes     as LeadTypeConfig[])  ?? DEFAULT_SETTINGS.leadTypes,
    discountTiers: (stored.discountTiers as DiscountTierConfig[]) ?? DEFAULT_SETTINGS.discountTiers,
    webhook:       (stored.webhook       as WebhookConfig)     ?? DEFAULT_SETTINGS.webhook,
    googleSheet: stored.googleSheet
      ? { ...DEFAULT_SETTINGS.googleSheet, ...(stored.googleSheet as GoogleSheetConfig) }
      : DEFAULT_SETTINGS.googleSheet,
    notifications: (stored.notifications as NotificationConfig) ?? DEFAULT_SETTINGS.notifications,
    quote:         (stored.quote         as QuoteConfig)       ?? DEFAULT_SETTINGS.quote,
    email:         (stored.email         as EmailConfig)       ?? DEFAULT_SETTINGS.email,
    // Merge saved theme with defaults so new fields always have a value
    dashboardTheme: savedTheme
      ? { ...DEFAULT_SETTINGS.dashboardTheme, ...savedTheme }
      : DEFAULT_SETTINGS.dashboardTheme,
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
