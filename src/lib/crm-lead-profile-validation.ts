import { CRM_B2B_SUBTYPE_OPTIONS, CRM_PRODUCT_OPTIONS } from "./crm-taxonomy";

type LeadProfileInput = {
  type?: unknown;
  marketScope?: unknown;
  interestedProducts?: unknown;
  b2bCustomerSubtype?: unknown;
  unitCount?: unknown;
};

const PROFILE_UPDATE_KEYS = new Set([
  "name",
  "company",
  "phone",
  "email",
  "type",
  "district",
  "expectedValue",
  "source",
  "notes",
  "projectName",
  "projectAddress",
  "unitCount",
  "interestedProducts",
  "marketScope",
  "b2bCustomerGroup",
  "b2bCustomerSubtype",
  "contactRole",
  "classificationSource",
]);

const VALID_PRODUCT_IDS = new Set<string>(CRM_PRODUCT_OPTIONS.map(item => item.id));
const VALID_B2B_SUBTYPE_IDS = new Set<string>(CRM_B2B_SUBTYPE_OPTIONS.map(item => item.id));

export interface LeadProfileValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Stage, assignment and tag-only PATCH requests are operational updates and must
 * continue to work for legacy leads. Profile edits must satisfy the sales fields.
 */
export function isLeadProfileUpdate(updates: Record<string, unknown>): boolean {
  return Object.keys(updates).some(key => PROFILE_UPDATE_KEYS.has(key));
}

export function validateLeadProfileForUpdate(input: LeadProfileInput): LeadProfileValidationResult {
  const errors: string[] = [];
  const products = Array.isArray(input.interestedProducts)
    ? input.interestedProducts.filter(product => VALID_PRODUCT_IDS.has(String(product)))
    : [];
  const isB2B = input.marketScope === "b2b"
    || (input.marketScope !== "b2c" && input.type !== "retail");

  if (products.length === 0) {
    errors.push("Vui lòng chọn ít nhất một sản phẩm quan tâm");
  }

  if (isB2B && !VALID_B2B_SUBTYPE_IDS.has(String(input.b2bCustomerSubtype ?? ""))) {
    errors.push("Vui lòng chọn loại hình chi tiết cho khách B2B");
  }

  const unitCount = Number(input.unitCount);
  if (isB2B && (!Number.isInteger(unitCount) || unitCount <= 0)) {
    errors.push("Vui lòng nhập số căn/phòng lớn hơn 0 cho khách B2B");
  }

  return { valid: errors.length === 0, errors };
}
