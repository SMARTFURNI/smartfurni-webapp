import { query, queryOne } from "@/lib/db";

export interface FanpageCareSettings {
  prompts: {
    system: string;
    planning: string;
  };
  scoring: {
    inboundBase: number;
    productWeight: number;
    productCap: number;
    buyingSignalWeight: number;
    buyingSignalCap: number;
    unansweredBonus: number;
    unreadBonus: number;
    recentBonus: number;
    recentWindowHours: number;
    cannotReplyPenalty: number;
    objectionPenalty: number;
    objectionCap: number;
    postPriceQuestionWeight: number;
    postPriceQuestionCap: number;
    pricePassedBonus: number;
    minimumPostPriceQuestions: number;
    prePriceScoreCap: number;
    disengagedAfterPriceScore: number;
    qualifyThreshold: number;
    warmThreshold: number;
    hotThreshold: number;
  };
  timing: {
    hotDueHours: number;
    warmDueHours: number;
    coldDueHours: number;
    maxPlanDays: number;
  };
  notifications: {
    enabled: boolean;
    minimumScore: number;
  };
  keywords: {
    products: string[];
    pricing: string[];
    dimensions: string[];
    delivery: string[];
    purchaseIntent: string[];
    contact: string[];
    objections: string[];
    smallSpaceNeeds: string[];
    homeCareNeeds: string[];
    visualProofNeeds: string[];
    pricePresented: string[];
    passiveAfterPrice: string[];
  };
}

export interface StoredFanpageCareSettings {
  settings: FanpageCareSettings;
  version: number;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_FANPAGE_CARE_SETTINGS: FanpageCareSettings = {
  prompts: {
    system: "Bạn là AI Customer Care Planner của CRM nội bộ SmartFurni. Chỉ phân tích dữ liệu hội thoại được cung cấp và tạo kế hoạch để nhân viên xem xét.",
    planning: "Ưu tiên tin nhắn khách chưa được phản hồi, xác định đúng nhu cầu, sản phẩm quan tâm, tín hiệu mua và trở ngại. Đọc cách nhân viên và khách đang xưng hô để giữ đúng đại từ trong mọi tin nhắn nháp; không tự đổi sang văn mẫu. Kế hoạch phải ngắn gọn, tự nhiên, có giá trị và không gây áp lực.",
  },
  scoring: {
    inboundBase: 18,
    productWeight: 10,
    productCap: 20,
    buyingSignalWeight: 15,
    buyingSignalCap: 45,
    unansweredBonus: 16,
    unreadBonus: 8,
    recentBonus: 8,
    recentWindowHours: 24,
    cannotReplyPenalty: 15,
    objectionPenalty: 3,
    objectionCap: 9,
    postPriceQuestionWeight: 12,
    postPriceQuestionCap: 30,
    pricePassedBonus: 30,
    minimumPostPriceQuestions: 2,
    prePriceScoreCap: 69,
    disengagedAfterPriceScore: 0,
    qualifyThreshold: 40,
    warmThreshold: 45,
    hotThreshold: 75,
  },
  timing: {
    hotDueHours: 0.5,
    warmDueHours: 4,
    coldDueHours: 24,
    maxPlanDays: 7,
  },
  notifications: {
    enabled: true,
    minimumScore: 40,
  },
  keywords: {
    products: ["sofa", "giường gấp", "sofa bed", "giường thông minh", "giường công thái học", "nâng hạ", "zero gravity", "giường y tế", "bệnh nhân", "người già", "nệm"],
    pricing: ["giá", "báo giá", "bao nhiêu", "chi phí"],
    dimensions: ["size", "kích thước", "90cm", "120cm", "140cm", "160cm", "180cm"],
    delivery: ["giao", "lắp đặt", "ship", "địa chỉ", "showroom", "ở đâu"],
    purchaseIntent: ["mua", "đặt hàng", "chốt", "cọc", "chuyển khoản", "lấy mẫu"],
    contact: ["số điện thoại", "sđt", "gọi cho", "liên hệ"],
    objections: ["mắc", "cao", "rẻ hơn", "giảm giá", "bớt giá", "suy nghĩ", "để xem", "bảo hành", "có bền", "lo hỏng", "phí ship", "không vừa"],
    smallSpaceNeeds: ["phòng nhỏ", "căn hộ", "chung cư", "studio", "tiết kiệm diện tích"],
    homeCareNeeds: ["người già", "bệnh nhân", "đau lưng", "nâng hạ", "đọc sách", "xem phim"],
    visualProofNeeds: ["ảnh thực tế", "video", "clip", "showroom"],
    pricePresented: ["gửi báo giá", "báo giá chi tiết", "giá là", "giá bán", "giá từ", "giá trọn bộ", "em gửi giá", "mình gửi giá", "smartfurni gửi giá"],
    passiveAfterPrice: ["ok", "okay", "oki", "dạ", "vâng", "ừ", "uh", "được", "đã nhận", "cảm ơn", "thanks", "thank you"],
  },
};

const SETTINGS_ID = "default";

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function cleanText(value: unknown, fallback: string, maxLength = 8000) {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, maxLength);
}

function cleanKeywords(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return [...fallback];
  const result = [...new Set(value.map(item => String(item).trim()).filter(Boolean))]
    .slice(0, 60)
    .map(item => item.slice(0, 80));
  return result.length ? result : [...fallback];
}

export function normalizeFanpageCareSettings(value: unknown): FanpageCareSettings {
  const source = (value && typeof value === "object" ? value : {}) as Partial<FanpageCareSettings>;
  const scoring = source.scoring || {} as FanpageCareSettings["scoring"];
  const timing = source.timing || {} as FanpageCareSettings["timing"];
  const notifications = source.notifications || {} as FanpageCareSettings["notifications"];
  const keywords = source.keywords || {} as FanpageCareSettings["keywords"];
  const defaults = DEFAULT_FANPAGE_CARE_SETTINGS;
  const hotThreshold = clampNumber(scoring.hotThreshold, defaults.scoring.hotThreshold, 50, 100);
  const warmThreshold = clampNumber(scoring.warmThreshold, defaults.scoring.warmThreshold, 1, hotThreshold - 1);
  return {
    prompts: {
      system: cleanText(source.prompts?.system, defaults.prompts.system),
      planning: cleanText(source.prompts?.planning, defaults.prompts.planning),
    },
    scoring: {
      inboundBase: clampNumber(scoring.inboundBase, defaults.scoring.inboundBase, 0, 100),
      productWeight: clampNumber(scoring.productWeight, defaults.scoring.productWeight, 0, 50),
      productCap: clampNumber(scoring.productCap, defaults.scoring.productCap, 0, 100),
      buyingSignalWeight: clampNumber(scoring.buyingSignalWeight, defaults.scoring.buyingSignalWeight, 0, 50),
      buyingSignalCap: clampNumber(scoring.buyingSignalCap, defaults.scoring.buyingSignalCap, 0, 100),
      unansweredBonus: clampNumber(scoring.unansweredBonus, defaults.scoring.unansweredBonus, 0, 50),
      unreadBonus: clampNumber(scoring.unreadBonus, defaults.scoring.unreadBonus, 0, 50),
      recentBonus: clampNumber(scoring.recentBonus, defaults.scoring.recentBonus, 0, 50),
      recentWindowHours: clampNumber(scoring.recentWindowHours, defaults.scoring.recentWindowHours, 1, 720),
      cannotReplyPenalty: clampNumber(scoring.cannotReplyPenalty, defaults.scoring.cannotReplyPenalty, 0, 100),
      objectionPenalty: clampNumber(scoring.objectionPenalty, defaults.scoring.objectionPenalty, 0, 50),
      objectionCap: clampNumber(scoring.objectionCap, defaults.scoring.objectionCap, 0, 100),
      postPriceQuestionWeight: clampNumber(scoring.postPriceQuestionWeight, defaults.scoring.postPriceQuestionWeight, 0, 50),
      postPriceQuestionCap: clampNumber(scoring.postPriceQuestionCap, defaults.scoring.postPriceQuestionCap, 0, 100),
      pricePassedBonus: clampNumber(scoring.pricePassedBonus, defaults.scoring.pricePassedBonus, 0, 100),
      minimumPostPriceQuestions: clampNumber(scoring.minimumPostPriceQuestions, defaults.scoring.minimumPostPriceQuestions, 1, 10),
      prePriceScoreCap: clampNumber(scoring.prePriceScoreCap, defaults.scoring.prePriceScoreCap, 0, hotThreshold - 1),
      disengagedAfterPriceScore: clampNumber(scoring.disengagedAfterPriceScore, defaults.scoring.disengagedAfterPriceScore, 0, warmThreshold - 1),
      qualifyThreshold: clampNumber(scoring.qualifyThreshold, defaults.scoring.qualifyThreshold, 0, 100),
      warmThreshold,
      hotThreshold,
    },
    timing: {
      hotDueHours: clampNumber(timing.hotDueHours, defaults.timing.hotDueHours, 0.25, 168),
      warmDueHours: clampNumber(timing.warmDueHours, defaults.timing.warmDueHours, 0.25, 336),
      coldDueHours: clampNumber(timing.coldDueHours, defaults.timing.coldDueHours, 0.25, 720),
      maxPlanDays: clampNumber(timing.maxPlanDays, defaults.timing.maxPlanDays, 1, 30),
    },
    notifications: {
      enabled: notifications.enabled !== false,
      minimumScore: clampNumber(notifications.minimumScore, defaults.notifications.minimumScore, 0, 100),
    },
    keywords: {
      products: cleanKeywords(keywords.products, defaults.keywords.products),
      pricing: cleanKeywords(keywords.pricing, defaults.keywords.pricing),
      dimensions: cleanKeywords(keywords.dimensions, defaults.keywords.dimensions),
      delivery: cleanKeywords(keywords.delivery, defaults.keywords.delivery),
      purchaseIntent: cleanKeywords(keywords.purchaseIntent, defaults.keywords.purchaseIntent),
      contact: cleanKeywords(keywords.contact, defaults.keywords.contact),
      objections: cleanKeywords(keywords.objections, defaults.keywords.objections),
      smallSpaceNeeds: cleanKeywords(keywords.smallSpaceNeeds, defaults.keywords.smallSpaceNeeds),
      homeCareNeeds: cleanKeywords(keywords.homeCareNeeds, defaults.keywords.homeCareNeeds),
      visualProofNeeds: cleanKeywords(keywords.visualProofNeeds, defaults.keywords.visualProofNeeds),
      pricePresented: cleanKeywords(keywords.pricePresented, defaults.keywords.pricePresented),
      passiveAfterPrice: cleanKeywords(keywords.passiveAfterPrice, defaults.keywords.passiveAfterPrice),
    },
  };
}

async function ensureSettingsSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS fanpage_ai_care_settings (
      id TEXT PRIMARY KEY,
      config JSONB NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      updated_by TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(
    `INSERT INTO fanpage_ai_care_settings (id, config)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [SETTINGS_ID, JSON.stringify(DEFAULT_FANPAGE_CARE_SETTINGS)],
  );
}

export async function getFanpageCareSettings(): Promise<StoredFanpageCareSettings> {
  await ensureSettingsSchema();
  const row = await queryOne<{ config: unknown; version: number; updated_at?: string; updated_by?: string }>(
    `SELECT config, version, updated_at, updated_by FROM fanpage_ai_care_settings WHERE id = $1`,
    [SETTINGS_ID],
  );
  return {
    settings: normalizeFanpageCareSettings(row?.config),
    version: Number(row?.version || 1),
    updatedAt: row?.updated_at,
    updatedBy: row?.updated_by,
  };
}

export async function saveFanpageCareSettings(value: unknown, actorId: string) {
  await ensureSettingsSchema();
  const settings = normalizeFanpageCareSettings(value);
  const row = await queryOne<{ version: number; updated_at?: string; updated_by?: string }>(
    `UPDATE fanpage_ai_care_settings
     SET config = $2::jsonb, version = version + 1, updated_by = $3, updated_at = NOW()
     WHERE id = $1 RETURNING version, updated_at, updated_by`,
    [SETTINGS_ID, JSON.stringify(settings), actorId],
  );
  return { settings, version: Number(row?.version || 1), updatedAt: row?.updated_at, updatedBy: row?.updated_by };
}

export async function resetFanpageCareSettings(actorId: string) {
  return saveFanpageCareSettings(DEFAULT_FANPAGE_CARE_SETTINGS, actorId);
}
