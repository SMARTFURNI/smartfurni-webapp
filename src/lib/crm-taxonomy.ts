import type {
  CustomerSegment,
  InterestedProduct,
  Lead,
  LeadStage,
  LeadTemperature,
  LeadType,
} from "./crm-types";

export interface CrmTaxonomyOption<T extends string> {
  id: T;
  label: string;
  color: string;
  order: number;
}

/** Nguồn chuẩn duy nhất cho giai đoạn bán hàng trong toàn bộ CRM. */
export const CRM_LEAD_STAGE_OPTIONS = [
  { id: "new", label: "Khách hàng mới", color: "#60a5fa", order: 0 },
  { id: "profile_sent", label: "Đã gửi Profile", color: "#a78bfa", order: 1 },
  { id: "surveyed", label: "Đã khảo sát", color: "#C9A84C", order: 2 },
  { id: "quoted", label: "Đã báo giá", color: "#f97316", order: 3 },
  { id: "negotiating", label: "Thương thảo", color: "#ec4899", order: 4 },
  { id: "won", label: "Đã chốt", color: "#22c55e", order: 5 },
  { id: "lost", label: "Thất bại", color: "#f87171", order: 6 },
] as const satisfies readonly CrmTaxonomyOption<LeadStage>[];

/** Vai trò của khách hàng; khác với nhóm chăm sóc và sản phẩm quan tâm. */
export const CRM_LEAD_TYPE_OPTIONS = [
  { id: "retail", label: "Khách mua lẻ", color: "#0ea5e9", order: 0 },
  { id: "architect", label: "Kiến trúc sư", color: "#a78bfa", order: 1 },
  { id: "investor", label: "Đối tác dự án", color: "#60a5fa", order: 2 },
  { id: "dealer", label: "Đại lý / nhà phân phối", color: "#C9A84C", order: 3 },
  { id: "b2b", label: "Doanh nghiệp / B2B", color: "#14b8a6", order: 4 },
] as const satisfies readonly CrmTaxonomyOption<LeadType>[];

export const CRM_CUSTOMER_SEGMENT_OPTIONS = [
  { id: "retail", label: "Khách mua lẻ", tag: "SEG:BAN_LE", color: "#0ea5e9" },
  { id: "dealer", label: "Đại lý / nhà phân phối", tag: "SEG:DAI_LY", color: "#C9A84C" },
  { id: "project", label: "Đối tác dự án", tag: "SEG:DU_AN", color: "#60a5fa" },
  { id: "b2b", label: "Doanh nghiệp / B2B", tag: "SEG:B2B", color: "#14b8a6" },
] as const;

export const CRM_PRODUCT_OPTIONS = [
  { id: "sofa_bed", label: "Sofa giường", tag: "PROD:SOFA_GIUONG", color: "#6366f1" },
  { id: "ergonomic_bed", label: "Giường công thái học", tag: "PROD:GIUONG_CONG_THAI_HOC", color: "#ec4899" },
  { id: "other", label: "Sản phẩm khác", tag: "PROD:KHAC", color: "#64748b" },
] as const;

export const CUSTOMER_SEGMENT_LABELS = Object.fromEntries(
  CRM_CUSTOMER_SEGMENT_OPTIONS.map(item => [item.id, item.label]),
) as Record<CustomerSegment, string>;

export const PRODUCT_LABELS = Object.fromEntries(
  CRM_PRODUCT_OPTIONS.map(item => [item.id, item.label]),
) as Record<InterestedProduct, string>;

export const TEMPERATURE_LABELS: Record<LeadTemperature, string> = {
  hot: "Nóng",
  warm: "Ấm",
  cold: "Lạnh",
};

export const SEGMENT_TAGS = Object.fromEntries(
  CRM_CUSTOMER_SEGMENT_OPTIONS.map(item => [item.id, item.tag]),
) as Record<CustomerSegment, string>;

export const PRODUCT_TAGS = Object.fromEntries(
  CRM_PRODUCT_OPTIONS.map(item => [item.id, item.tag]),
) as Record<InterestedProduct, string>;

export const TEMP_TAGS: Record<LeadTemperature, string> = {
  hot: "TEMP:HOT",
  warm: "TEMP:WARM",
  cold: "TEMP:COLD",
};

const LEGACY_STAGE_ALIASES: Record<string, LeadStage> = {
  contacted: "profile_sent",
  interested: "profile_sent",
  qualified: "surveyed",
  proposal: "quoted",
  negotiation: "negotiating",
};

const LEGACY_TYPE_ALIASES: Record<string, LeadType> = {
  customer: "retail",
  individual: "retail",
  investor2: "investor",
  distributor: "dealer",
  company: "b2b",
};

export function getLeadTypeMeta(type: string) {
  return CRM_LEAD_TYPE_OPTIONS.find(item => item.id === type) ?? {
    id: type,
    label: type || "Chưa phân loại",
    color: "#64748b",
    order: 99,
  };
}

export function getLeadStageMeta(stage: string) {
  return CRM_LEAD_STAGE_OPTIONS.find(item => item.id === stage) ?? {
    id: stage,
    label: stage || "Chưa có giai đoạn",
    color: "#64748b",
    order: 99,
  };
}

export function segmentForLeadType(type: LeadType): CustomerSegment {
  if (type === "dealer") return "dealer";
  if (type === "architect" || type === "investor") return "project";
  if (type === "b2b") return "b2b";
  return "retail";
}

export function normalizeLeadStage(value: unknown): LeadStage | undefined {
  const stage = String(value ?? "").trim();
  if (CRM_LEAD_STAGE_OPTIONS.some(item => item.id === stage)) return stage as LeadStage;
  return LEGACY_STAGE_ALIASES[stage];
}

export function normalizeLeadType(value: unknown): LeadType | undefined {
  const type = String(value ?? "").trim().toLowerCase();
  if (CRM_LEAD_TYPE_OPTIONS.some(item => item.id === type)) return type as LeadType;
  return LEGACY_TYPE_ALIASES[type];
}

function unique(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

/**
 * Tạo bản xem trước dữ liệu phân loại chuẩn. Hàm thuần, không ghi database.
 * Chỉ namespace SEG/PROD/TEMP được thay thế; các tag nghiệp vụ khác được giữ nguyên.
 */
export function previewCanonicalLeadTaxonomy(lead: Lead) {
  const type = normalizeLeadType(lead.type);
  const customerSegment = lead.customerSegment ?? segmentForLeadType(type ?? "retail");
  const products = lead.interestedProducts ?? [];
  const stage = normalizeLeadStage(lead.stage);
  const preservedTags = (lead.tags ?? []).filter(tag =>
    !tag.startsWith("SEG:") && !tag.startsWith("PROD:") && !tag.startsWith("TEMP:"),
  );
  const tags = unique([
    ...preservedTags,
    SEGMENT_TAGS[customerSegment],
    ...products.map(product => PRODUCT_TAGS[product]),
    ...(lead.leadTemperature ? [TEMP_TAGS[lead.leadTemperature]] : []),
  ]);

  const changes: string[] = [];
  if (type && type !== lead.type) changes.push("type");
  if (!lead.customerSegment || lead.customerSegment !== customerSegment) changes.push("customerSegment");
  if (!lead.interestedProducts) changes.push("interestedProducts");
  if (stage && stage !== lead.stage) changes.push("stage");
  if (JSON.stringify(tags) !== JSON.stringify(lead.tags ?? [])) changes.push("tags");

  return {
    leadId: lead.id,
    name: lead.name,
    changes,
    patch: {
      customerSegment,
      interestedProducts: products,
      ...(type ? { type } : {}),
      ...(stage ? { stage } : {}),
      tags,
    },
    invalidStage: !stage,
    invalidType: !type,
  };
}
