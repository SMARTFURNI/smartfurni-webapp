import { describe, expect, it } from "vitest";
import { isLeadProfileUpdate, validateLeadProfileForUpdate } from "./crm-lead-profile-validation";

describe("CRM lead profile validation", () => {
  it("does not treat stage, assignment or tag changes as profile edits", () => {
    expect(isLeadProfileUpdate({ stage: "quoted" })).toBe(false);
    expect(isLeadProfileUpdate({ assignedTo: "Sales A" })).toBe(false);
    expect(isLeadProfileUpdate({ tags: ["hot"] })).toBe(false);
    expect(isLeadProfileUpdate({ name: "Khách mới" })).toBe(true);
  });

  it("requires a product for every customer profile", () => {
    expect(validateLeadProfileForUpdate({ marketScope: "b2c", type: "retail", interestedProducts: [] })).toEqual({
      valid: false,
      errors: ["Vui lòng chọn ít nhất một sản phẩm quan tâm"],
    });
  });

  it("accepts a retail customer after a valid product is selected", () => {
    expect(validateLeadProfileForUpdate({
      marketScope: "b2c",
      type: "retail",
      interestedProducts: ["sofa_bed"],
    }).valid).toBe(true);
  });

  it("requires B2B subtype and a positive integer unit count", () => {
    expect(validateLeadProfileForUpdate({
      marketScope: "b2b",
      type: "b2b",
      interestedProducts: ["ergonomic_bed"],
      b2bCustomerSubtype: "",
      unitCount: 0,
    }).errors).toEqual([
      "Vui lòng chọn loại hình chi tiết cho khách B2B",
      "Vui lòng nhập số căn/phòng lớn hơn 0 cho khách B2B",
    ]);
  });

  it("accepts a complete B2B profile", () => {
    expect(validateLeadProfileForUpdate({
      marketScope: "b2b",
      type: "investor",
      interestedProducts: ["sofa_bed"],
      b2bCustomerSubtype: "B2B-HOTEL",
      unitCount: 12,
    }).valid).toBe(true);
  });
});
