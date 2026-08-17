import type {
  B2BCustomerGroup,
  B2BCustomerSubtype,
  CustomerContactRole,
  CustomerMarketScope,
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

/** Mã tương thích kỹ thuật. Workflow cũ tiếp tục đọc trường `Lead.type`. */
export const CRM_LEAD_TYPE_OPTIONS = [
  { id: "retail", label: "Khách mua lẻ", color: "#0ea5e9", order: 0 },
  { id: "architect", label: "Kiến trúc sư", color: "#a78bfa", order: 1 },
  { id: "investor", label: "Đối tác dự án", color: "#60a5fa", order: 2 },
  { id: "dealer", label: "Đại lý / nhà phân phối", color: "#C9A84C", order: 3 },
  { id: "b2b", label: "Doanh nghiệp / B2B", color: "#14b8a6", order: 4 },
] as const satisfies readonly CrmTaxonomyOption<LeadType>[];

export const CRM_MARKET_SCOPE_OPTIONS = [
  { id: "b2c", label: "Khách mua lẻ", description: "Mua cho nhu cầu cá nhân hoặc gia đình", color: "#0ea5e9" },
  { id: "b2b", label: "Khách số lượng / B2B", description: "Mua cho cơ sở, dự án, bán lại hoặc tổ chức", color: "#2563eb" },
] as const;

export const CRM_B2B_GROUP_OPTIONS = [
  { id: "hospitality", label: "Kinh doanh lưu trú", description: "Tăng chỗ ngủ và doanh thu/phòng", color: "#2563eb" },
  { id: "property_rental", label: "BĐS & phòng cho thuê", description: "Trang bị căn hộ, studio, condotel và phòng trọ", color: "#7c3aed" },
  { id: "design_construction", label: "Thiết kế & thi công", description: "Nhà thầu và đơn vị nội thất triển khai dự án", color: "#f59e0b" },
  { id: "resale", label: "Đại lý & bán lại", description: "Showroom, nhà phân phối và người bán online", color: "#d4a72c" },
  { id: "internal_use", label: "Tổ chức dùng nội bộ", description: "Y tế, văn phòng, nhà máy và khu lưu trú nhân viên", color: "#0f9f7f" },
] as const satisfies ReadonlyArray<{ id: B2BCustomerGroup; label: string; description: string; color: string }>;

export const CRM_B2B_SUBTYPE_OPTIONS = [
  { id: "B2B-HOMESTAY", groupId: "hospitality", label: "Homestay / Airbnb / Villa nghỉ dưỡng", priority: 1, typicalOrder: "5–30 bộ/dự án", legacyType: "investor" },
  { id: "B2B-SERVICED-APT", groupId: "hospitality", label: "Căn hộ dịch vụ / Co-living / Tòa nhà cho thuê", priority: 2, typicalOrder: "10–100 bộ", legacyType: "investor" },
  { id: "B2B-HOTEL", groupId: "hospitality", label: "Khách sạn / Hostel / Nhà nghỉ / Resort", priority: 3, typicalOrder: "10–100 bộ", legacyType: "investor" },
  { id: "B2B-DEVELOPER", groupId: "property_rental", label: "Chủ đầu tư chung cư / Studio / Condotel", priority: 6, typicalOrder: "20–300 bộ/dự án", legacyType: "investor" },
  { id: "B2B-RENTAL", groupId: "property_rental", label: "Nhà trọ cao cấp / Ký túc xá tư nhân", priority: 7, typicalOrder: "10–100 bộ", legacyType: "investor" },
  { id: "B2B-CONTRACTOR", groupId: "design_construction", label: "Nhà thầu / Công ty thiết kế nội thất", priority: 4, typicalOrder: "5–50 bộ/dự án", legacyType: "architect" },
  { id: "B2B-DEALER", groupId: "resale", label: "Đại lý / Showroom nội thất", priority: 5, typicalOrder: "10–50 bộ/lần", legacyType: "dealer" },
  { id: "B2B-ONLINE-SELLER", groupId: "resale", label: "Người bán nội thất online / Sàn TMĐT", priority: 8, typicalOrder: "10–100 bộ/tháng", legacyType: "dealer" },
  { id: "B2B-HEALTHCARE", groupId: "internal_use", label: "Bệnh viện / Phòng khám / Chăm sóc cao tuổi", priority: 9, typicalOrder: "5–50 bộ", legacyType: "b2b" },
  { id: "B2B-WORKPLACE", groupId: "internal_use", label: "Văn phòng / Coworking / Nhà máy / Khu nhân viên", priority: 10, typicalOrder: "5–50 bộ", legacyType: "b2b" },
] as const satisfies ReadonlyArray<{
  id: B2BCustomerSubtype;
  groupId: B2BCustomerGroup;
  label: string;
  priority: number;
  typicalOrder: string;
  legacyType: LeadType;
}>;

export const CRM_CONTACT_ROLE_OPTIONS = [
  { id: "owner", label: "Chủ cơ sở / Chủ doanh nghiệp" },
  { id: "investor", label: "Chủ đầu tư" },
  { id: "decision_maker", label: "Người quyết định" },
  { id: "procurement", label: "Mua hàng / Thu mua" },
  { id: "operator", label: "Quản lý vận hành" },
  { id: "architect", label: "Kiến trúc sư / Thiết kế" },
  { id: "contractor", label: "Nhà thầu" },
  { id: "dealer", label: "Đại lý / Người bán lại" },
  { id: "referrer", label: "Người giới thiệu" },
  { id: "unknown", label: "Chưa xác định" },
] as const satisfies ReadonlyArray<{ id: CustomerContactRole; label: string }>;

export const B2B_GROUP_LABELS = Object.fromEntries(
  CRM_B2B_GROUP_OPTIONS.map(item => [item.id, item.label]),
) as Record<B2BCustomerGroup, string>;

export const B2B_SUBTYPE_LABELS = Object.fromEntries(
  CRM_B2B_SUBTYPE_OPTIONS.map(item => [item.id, item.label]),
) as Record<B2BCustomerSubtype, string>;

export const CONTACT_ROLE_LABELS = Object.fromEntries(
  CRM_CONTACT_ROLE_OPTIONS.map(item => [item.id, item.label]),
) as Record<CustomerContactRole, string>;

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

export function leadTypeForSegment(segment: CustomerSegment): LeadType {
  if (segment === "dealer") return "dealer";
  if (segment === "project") return "investor";
  if (segment === "b2b") return "b2b";
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

function foldTaxonomyValue(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function normalizeB2BCustomerGroup(value: unknown): B2BCustomerGroup | undefined {
  const folded = foldTaxonomyValue(value).replace(/[\s-]+/g, "_");
  const exact = CRM_B2B_GROUP_OPTIONS.find(item => item.id === folded);
  if (exact) return exact.id;
  if (/luu tru|hospitality/.test(folded.replace(/_/g, " "))) return "hospitality";
  if (/bat dong san|bds|phong cho thue|property|rental/.test(folded.replace(/_/g, " "))) return "property_rental";
  if (/thiet ke|thi cong|design|contractor/.test(folded.replace(/_/g, " "))) return "design_construction";
  if (/dai ly|ban lai|resale|showroom/.test(folded.replace(/_/g, " "))) return "resale";
  if (/noi bo|to chuc|internal/.test(folded.replace(/_/g, " "))) return "internal_use";
  return undefined;
}

export function normalizeB2BCustomerSubtype(value: unknown): B2BCustomerSubtype | undefined {
  const raw = String(value ?? "").trim().toUpperCase().replace(/_/g, "-");
  const exact = CRM_B2B_SUBTYPE_OPTIONS.find(item => item.id === raw);
  if (exact) return exact.id;
  const text = foldTaxonomyValue(value);
  const matchers: Array<[RegExp, B2BCustomerSubtype]> = [
    [/homestay|airbnb|villa/, "B2B-HOMESTAY"],
    [/can ho dich vu|co.?living|toa nha cho thue/, "B2B-SERVICED-APT"],
    [/khach san|hostel|nha nghi|resort/, "B2B-HOTEL"],
    [/chung cu|studio|condotel|chu dau tu bat dong san/, "B2B-DEVELOPER"],
    [/nha tro|phong tro|ky tuc xa/, "B2B-RENTAL"],
    [/nha thau|thiet ke noi that|thi cong noi that|kien truc/, "B2B-CONTRACTOR"],
    [/dai ly|nha phan phoi|showroom/, "B2B-DEALER"],
    [/tiktok shop|shopee|nguoi ban online|ban hang online|facebook seller/, "B2B-ONLINE-SELLER"],
    [/benh vien|phong kham|cao tuoi|vien duong lao/, "B2B-HEALTHCARE"],
    [/van phong|coworking|nha may|khu luu tru nhan vien|phong truc/, "B2B-WORKPLACE"],
  ];
  return matchers.find(([pattern]) => pattern.test(text))?.[1];
}

export function normalizeCustomerContactRole(value: unknown): CustomerContactRole | undefined {
  const raw = foldTaxonomyValue(value).replace(/[\s-]+/g, "_");
  if (CRM_CONTACT_ROLE_OPTIONS.some(item => item.id === raw)) return raw as CustomerContactRole;
  const text = raw.replace(/_/g, " ");
  if (/chu co so|chu doanh nghiep/.test(text)) return "owner";
  if (/chu dau tu/.test(text)) return "investor";
  if (/quyet dinh|giam doc|ceo/.test(text)) return "decision_maker";
  if (/thu mua|mua hang|procurement/.test(text)) return "procurement";
  if (/van hanh|quan ly/.test(text)) return "operator";
  if (/kien truc|thiet ke/.test(text)) return "architect";
  if (/nha thau|thi cong/.test(text)) return "contractor";
  if (/dai ly|ban lai|phan phoi/.test(text)) return "dealer";
  if (/gioi thieu|moi gioi/.test(text)) return "referrer";
  return value ? "unknown" : undefined;
}

export function normalizeCustomerMarketScope(value: unknown): CustomerMarketScope | undefined {
  const raw = foldTaxonomyValue(value).replace(/[\s-]+/g, "_");
  if (["b2c", "retail", "khach_mua_le", "ca_nhan", "gia_dinh"].includes(raw)) return "b2c";
  if (["b2b", "business", "doanh_nghiep", "khach_so_luong", "du_an"].includes(raw)) return "b2b";
  return undefined;
}

export function legacyLeadTypeForCustomerClassification(input: {
  marketScope?: CustomerMarketScope;
  b2bCustomerGroup?: B2BCustomerGroup;
  b2bCustomerSubtype?: B2BCustomerSubtype;
  currentType?: LeadType;
}): LeadType {
  if (input.marketScope === "b2c") return "retail";
  const subtype = CRM_B2B_SUBTYPE_OPTIONS.find(item => item.id === input.b2bCustomerSubtype);
  if (subtype) return subtype.legacyType;
  if (input.b2bCustomerGroup === "design_construction") return "architect";
  if (input.b2bCustomerGroup === "resale") return "dealer";
  if (input.b2bCustomerGroup === "hospitality" || input.b2bCustomerGroup === "property_rental") return "investor";
  if (input.marketScope === "b2b") return "b2b";
  return input.currentType ?? "retail";
}

function unique(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

/**
 * Tạo bản xem trước dữ liệu phân loại chuẩn. Hàm thuần, không ghi database.
 * Chỉ namespace SEG/PROD/TEMP được thay thế; các tag nghiệp vụ khác được giữ nguyên.
 */
export function previewCanonicalLeadTaxonomy(lead: Lead) {
  const normalizedType = normalizeLeadType(lead.type);
  const segmentFromTag = CRM_CUSTOMER_SEGMENT_OPTIONS.find(item => (lead.tags ?? []).includes(item.tag))?.id;
  const legacyFallback = normalizedType ?? leadTypeForSegment(lead.customerSegment ?? segmentFromTag ?? "retail");
  const marketScope: CustomerMarketScope = lead.marketScope ?? (legacyFallback === "retail" ? "b2c" : "b2b");
  const b2bCustomerGroup = normalizeB2BCustomerGroup(lead.b2bCustomerGroup);
  const b2bCustomerSubtype = normalizeB2BCustomerSubtype(lead.b2bCustomerSubtype);
  const contactRole = normalizeCustomerContactRole(lead.contactRole);
  const type = lead.marketScope || b2bCustomerGroup || b2bCustomerSubtype
    ? legacyLeadTypeForCustomerClassification({ marketScope, b2bCustomerGroup, b2bCustomerSubtype, currentType: legacyFallback })
    : legacyFallback;
  // `type` is the user-editable source of truth for customer classification.
  // Older records may still carry a stale customerSegment from a previous type;
  // always derive it again when the type is valid so every CRM screen agrees.
  const customerSegment = segmentForLeadType(type);
  const productsFromTags = (lead.tags ?? []).flatMap(tag => {
    const option = CRM_PRODUCT_OPTIONS.find(item => item.tag === tag);
    return option ? [option.id] : [];
  });
  const products = [...new Set(lead.interestedProducts ?? productsFromTags)] as InterestedProduct[];
  const stage = normalizeLeadStage(lead.stage);
  const preservedTags = (lead.tags ?? []).filter(tag =>
    !tag.startsWith("SEG:") && !tag.startsWith("PROD:") && !tag.startsWith("TEMP:")
      && !tag.startsWith("MARKET:") && !tag.startsWith("B2B_GROUP:")
      && !tag.startsWith("B2B_TYPE:") && !tag.startsWith("CONTACT_ROLE:"),
  );
  const tags = unique([
    ...preservedTags,
    SEGMENT_TAGS[customerSegment],
    ...products.map(product => PRODUCT_TAGS[product]),
    ...(lead.leadTemperature ? [TEMP_TAGS[lead.leadTemperature]] : []),
    `MARKET:${marketScope.toUpperCase()}`,
    ...(b2bCustomerGroup ? [`B2B_GROUP:${b2bCustomerGroup.toUpperCase()}`] : []),
    ...(b2bCustomerSubtype ? [`B2B_TYPE:${b2bCustomerSubtype}`] : []),
    ...(contactRole ? [`CONTACT_ROLE:${contactRole.toUpperCase()}`] : []),
  ]);

  const changes: string[] = [];
  if (type !== lead.type) changes.push("type");
  if (!lead.customerSegment || lead.customerSegment !== customerSegment) changes.push("customerSegment");
  if (!lead.interestedProducts) changes.push("interestedProducts");
  if (stage && stage !== lead.stage) changes.push("stage");
  if (JSON.stringify(tags) !== JSON.stringify(lead.tags ?? [])) changes.push("tags");
  if (!lead.marketScope || lead.marketScope !== marketScope) changes.push("marketScope");
  if (b2bCustomerGroup && lead.b2bCustomerGroup !== b2bCustomerGroup) changes.push("b2bCustomerGroup");
  if (b2bCustomerSubtype && lead.b2bCustomerSubtype !== b2bCustomerSubtype) changes.push("b2bCustomerSubtype");
  if (contactRole && lead.contactRole !== contactRole) changes.push("contactRole");

  return {
    leadId: lead.id,
    name: lead.name,
    changes,
    patch: {
      customerSegment,
      interestedProducts: products,
      type,
      ...(stage ? { stage } : {}),
      tags,
      marketScope,
      ...(b2bCustomerGroup ? { b2bCustomerGroup } : {}),
      ...(b2bCustomerSubtype ? { b2bCustomerSubtype } : {}),
      ...(contactRole ? { contactRole } : {}),
    },
    invalidStage: !stage,
    invalidType: !normalizedType,
  };
}

/** Chuẩn hóa dữ liệu khi đọc để các màn hình không tự suy diễn phân loại khác nhau. */
export function canonicalizeLeadTaxonomy(lead: Lead): Lead {
  return { ...lead, ...previewCanonicalLeadTaxonomy(lead).patch };
}
