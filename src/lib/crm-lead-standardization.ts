import type { RawLead, RawLeadSource } from "./crm-raw-lead-store";
import type {
  B2BCustomerGroup,
  B2BCustomerSubtype,
  CustomerContactRole,
  CustomerMarketScope,
  CustomerSegment,
  InterestedProduct,
  Lead,
  LeadDataQuality,
  LeadTemperature,
  LeadType,
} from "./crm-types";
import {
  CUSTOMER_SEGMENT_LABELS,
  PRODUCT_LABELS,
  PRODUCT_TAGS,
  SEGMENT_TAGS,
  TEMPERATURE_LABELS,
  TEMP_TAGS,
  legacyLeadTypeForCustomerClassification,
  normalizeB2BCustomerGroup,
  normalizeB2BCustomerSubtype,
  normalizeCustomerContactRole,
  normalizeCustomerMarketScope,
} from "./crm-taxonomy";
import { formatGoogleFormAnswers } from "./google-sheet-form-answers";

export { CUSTOMER_SEGMENT_LABELS, PRODUCT_LABELS, TEMPERATURE_LABELS } from "./crm-taxonomy";

export const CRM_FOUNDATION_PROFILE = {
  version: "1.0",
  documentCodes: ["SF-AUTO-01", "SF-AUTO-02"],
  routes: ["/crm/data-pool", "/crm/leads", "/crm/lead-segmentation"],
  rules: [
    "Một hồ sơ khách hàng cho mỗi số điện thoại hoặc email chuẩn hóa",
    "Mỗi lead có nhóm đối tượng, sản phẩm quan tâm, nguồn và nhiệt độ",
    "Nhận lead từ Data Pool phải giữ nguyên dấu vết nguồn quảng cáo",
  ],
} as const;

export const SOURCE_LABELS: Record<RawLeadSource, string> = {
  facebook_lead: "Facebook Ads",
  tiktok_lead: "TikTok Ads",
  website: "Website / Landing Page",
  manual: "Nhập tay",
  other: "Khác",
};

function fold(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function normalizeCrmPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length >= 11) return `0${digits.slice(2)}`;
  return digits;
}

export function normalizeCrmEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function uniqueTags(tags: Array<string | undefined>): string[] {
  return [...new Set(tags.map(tag => tag?.trim()).filter((tag): tag is string => Boolean(tag)))];
}

export function classifyRawLead(rawLead: RawLead): {
  customerSegment: CustomerSegment;
  interestedProducts: InterestedProduct[];
  leadScore: number;
  leadTemperature: LeadTemperature;
  dataQuality: LeadDataQuality;
  tags: string[];
  source: string;
  sourceDetail: string;
  legacyType: LeadType;
  marketScope: CustomerMarketScope;
  b2bCustomerGroup?: B2BCustomerGroup;
  b2bCustomerSubtype?: B2BCustomerSubtype;
  contactRole?: CustomerContactRole;
  classificationConfidence: number;
} {
  const raw = rawLead.rawData ?? {};
  const explicitMarketScope = normalizeCustomerMarketScope(
    raw.marketScope ?? raw.market_scope ?? raw.b2c_b2b ?? raw.phan_khuc ?? raw.phân_khúc,
  );
  const explicitGroup = normalizeB2BCustomerGroup(
    raw.b2bCustomerGroup ?? raw.b2b_group ?? raw.nhom_b2b ?? raw.nhóm_b2b,
  );
  const explicitSubtype = normalizeB2BCustomerSubtype(
    raw.b2bCustomerSubtype ?? raw.b2b_subtype ?? raw.loai_hinh_b2b ?? raw.phan_loai_chi_tiet ?? raw.đối_tượng_kh,
  );
  const explicitContactRole = normalizeCustomerContactRole(
    raw.contactRole ?? raw.contact_role ?? raw.vai_tro_lien_he ?? rawLead.customerRole,
  );
  const context = fold([
    rawLead.customerRole,
    rawLead.message,
    rawLead.adName,
    rawLead.campaignName,
    rawLead.formName,
    JSON.stringify(rawLead.rawData ?? {}),
  ].join(" "));

  const b2bCustomerSubtype = explicitMarketScope === "b2c"
    ? undefined
    : explicitSubtype ?? normalizeB2BCustomerSubtype(context);
  const subtypeMeta = b2bCustomerSubtype
    ? ({
        "B2B-HOMESTAY": "hospitality",
        "B2B-SERVICED-APT": "hospitality",
        "B2B-HOTEL": "hospitality",
        "B2B-DEVELOPER": "property_rental",
        "B2B-RENTAL": "property_rental",
        "B2B-CONTRACTOR": "design_construction",
        "B2B-DEALER": "resale",
        "B2B-ONLINE-SELLER": "resale",
        "B2B-HEALTHCARE": "internal_use",
        "B2B-WORKPLACE": "internal_use",
      } as Record<B2BCustomerSubtype, B2BCustomerGroup>)[b2bCustomerSubtype]
    : undefined;
  const b2bCustomerGroup = explicitMarketScope === "b2c" ? undefined : explicitGroup ?? subtypeMeta;

  let customerSegment: CustomerSegment = "retail";
  if (/dai ly|nha phan phoi|si |ban si|reseller/.test(context)) customerSegment = "dealer";
  else if (/du an|kien truc|thiet ke|nha thau|chdv|homestay|khach san|can ho dich vu/.test(context)) customerSegment = "project";
  else if (/b2b|doanh nghiep|cong ty|van phong|mua so luong|doi tac/.test(context)) customerSegment = "b2b";

  const marketScope: CustomerMarketScope = explicitMarketScope
    ?? (b2bCustomerGroup || b2bCustomerSubtype || customerSegment !== "retail" ? "b2b" : "b2c");

  const interestedProducts: InterestedProduct[] = [];
  if (/sofa giuong|sofa bed|giuong sofa/.test(context)) interestedProducts.push("sofa_bed");
  if (/cong thai hoc|ergonomic|giuong thong minh/.test(context)) interestedProducts.push("ergonomic_bed");
  if (interestedProducts.length === 0) interestedProducts.push("other");

  const phone = normalizeCrmPhone(rawLead.phone);
  const email = normalizeCrmEmail(rawLead.email);
  let leadScore = 20;
  if (phone.length >= 9) leadScore += 25;
  if (email.includes("@")) leadScore += 15;
  if (rawLead.message?.trim()) leadScore += 10;
  if (interestedProducts[0] !== "other") leadScore += 10;
  if (customerSegment !== "retail") leadScore += 10;
  if (/bao gia|gia |so luong|kich thuoc|gap|ngay|goi lai/.test(context)) leadScore += 10;
  leadScore = Math.min(100, leadScore);

  const leadTemperature: LeadTemperature = leadScore >= 75 ? "hot" : leadScore >= 50 ? "warm" : "cold";
  const dataQuality: LeadDataQuality = phone.length >= 9 && email.includes("@")
    ? "complete"
    : phone.length >= 9 || email.includes("@")
      ? "needs_verification"
      : "incomplete";
  const source = SOURCE_LABELS[rawLead.source] ?? rawLead.source;
  const sourceDetail = [rawLead.campaignName, rawLead.adName, rawLead.formName].filter(Boolean).join(" · ");
  const legacyType = legacyLeadTypeForCustomerClassification({
    marketScope,
    b2bCustomerGroup,
    b2bCustomerSubtype,
    currentType: customerSegment === "dealer" ? "dealer" : customerSegment === "project" ? "investor" : customerSegment === "b2b" ? "b2b" : "retail",
  });
  customerSegment = legacyType === "dealer" ? "dealer" : ["architect", "investor"].includes(legacyType) ? "project" : legacyType === "b2b" ? "b2b" : "retail";
  const classificationConfidence = explicitSubtype ? 100 : explicitGroup ? 90 : explicitMarketScope ? 80 : b2bCustomerSubtype ? 85 : b2bCustomerGroup ? 70 : 45;

  return {
    customerSegment,
    interestedProducts,
    leadScore,
    leadTemperature,
    dataQuality,
    source,
    sourceDetail,
    legacyType,
    marketScope,
    b2bCustomerGroup,
    b2bCustomerSubtype,
    contactRole: explicitContactRole,
    classificationConfidence,
    tags: uniqueTags([
      SEGMENT_TAGS[customerSegment],
      ...interestedProducts.map(product => PRODUCT_TAGS[product]),
      `SRC:${rawLead.source.toUpperCase()}`,
      TEMP_TAGS[leadTemperature],
      `QUALITY:${dataQuality.toUpperCase()}`,
      `MARKET:${marketScope.toUpperCase()}`,
      b2bCustomerGroup ? `B2B_GROUP:${b2bCustomerGroup.toUpperCase()}` : undefined,
      b2bCustomerSubtype ? `B2B_TYPE:${b2bCustomerSubtype}` : undefined,
      explicitContactRole ? `CONTACT_ROLE:${explicitContactRole.toUpperCase()}` : undefined,
    ]),
  };
}

export function buildLeadFromRawLead(rawLead: RawLead, assignedTo: string): Omit<Lead, "id" | "createdAt" | "updatedAt"> {
  const classification = classifyRawLead(rawLead);
  const formAnswers = formatGoogleFormAnswers(rawLead.rawData);
  const company = String(rawLead.rawData?.company ?? "").trim();
  const district = String(rawLead.rawData?.district ?? rawLead.rawData?.province ?? "").trim();
  const notes = [
    rawLead.message ? `Ghi chú từ form: ${rawLead.message}` : "",
    formAnswers ? `Câu trả lời từ Google Form:\n${formAnswers}` : "",
    rawLead.adName ? `Quảng cáo: ${rawLead.adName}` : "",
    rawLead.campaignName ? `Chiến dịch: ${rawLead.campaignName}` : "",
    rawLead.formName ? `Form: ${rawLead.formName}` : "",
  ].filter(Boolean).join("\n");

  return {
    name: rawLead.fullName || "Khách hàng mới",
    company,
    phone: normalizeCrmPhone(rawLead.phone),
    email: normalizeCrmEmail(rawLead.email),
    type: classification.legacyType,
    stage: "new",
    district,
    expectedValue: 0,
    source: classification.source,
    assignedTo,
    notes,
    lastContactAt: new Date().toISOString(),
    tags: classification.tags,
    projectName: "",
    projectAddress: "",
    unitCount: 0,
    customerSegment: classification.customerSegment,
    interestedProducts: classification.interestedProducts,
    leadTemperature: classification.leadTemperature,
    leadScore: classification.leadScore,
    dataQuality: classification.dataQuality,
    rawLeadIds: [rawLead.id],
    sourceDetail: classification.sourceDetail,
    marketScope: classification.marketScope,
    b2bCustomerGroup: classification.b2bCustomerGroup,
    b2bCustomerSubtype: classification.b2bCustomerSubtype,
    contactRole: classification.contactRole,
    classificationConfidence: classification.classificationConfidence,
    classificationSource: rawLead.rawData?.syncedFrom === "google_sheet" ? "google_sheet" : "raw_lead",
  };
}

export function mergeStandardizedLead(existing: Lead, incoming: Omit<Lead, "id" | "createdAt" | "updatedAt">): Partial<Lead> {
  return {
    name: existing.name || incoming.name,
    phone: existing.phone || incoming.phone,
    email: existing.email || incoming.email,
    source: existing.source || incoming.source,
    sourceDetail: uniqueTags([existing.sourceDetail, incoming.sourceDetail]).join(" · "),
    assignedTo: existing.assignedTo || incoming.assignedTo,
    notes: uniqueTags([existing.notes, incoming.notes]).join("\n\n"),
    tags: uniqueTags([...(existing.tags ?? []), ...(incoming.tags ?? [])]),
    interestedProducts: [...new Set([...(existing.interestedProducts ?? []), ...(incoming.interestedProducts ?? [])])],
    rawLeadIds: [...new Set([...(existing.rawLeadIds ?? []), ...(incoming.rawLeadIds ?? [])])],
    leadScore: Math.max(existing.leadScore ?? 0, incoming.leadScore ?? 0),
    leadTemperature: (existing.leadScore ?? 0) >= (incoming.leadScore ?? 0)
      ? existing.leadTemperature
      : incoming.leadTemperature,
    dataQuality: incoming.dataQuality === "complete" ? "complete" : existing.dataQuality ?? incoming.dataQuality,
    customerSegment: existing.customerSegment ?? incoming.customerSegment,
    type: existing.type ?? incoming.type,
    marketScope: existing.marketScope ?? incoming.marketScope,
    b2bCustomerGroup: existing.b2bCustomerGroup ?? incoming.b2bCustomerGroup,
    b2bCustomerSubtype: existing.b2bCustomerSubtype ?? incoming.b2bCustomerSubtype,
    contactRole: existing.contactRole ?? incoming.contactRole,
    classificationConfidence: Math.max(existing.classificationConfidence ?? 0, incoming.classificationConfidence ?? 0),
    classificationSource: existing.classificationSource ?? incoming.classificationSource,
  };
}
