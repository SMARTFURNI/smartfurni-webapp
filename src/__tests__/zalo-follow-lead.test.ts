import { describe, expect, it } from "vitest";
import { getZaloFollowLeadOptions, getZaloFollowQualifiers, normalizeZaloLeadPhone } from "@/lib/zalo-follow-lead";

describe("Zalo follow landing lead capture", () => {
  it("returns product-specific choices", () => {
    expect(getZaloFollowLeadOptions("sofa_bed")[0].label).toContain("Sofa");
    expect(getZaloFollowLeadOptions("ergonomic_bed")[0].label).toContain("giường");
    expect(getZaloFollowLeadOptions("unknown")).toEqual(getZaloFollowLeadOptions("all_products"));
  });

  it("uses the right qualifier for the campaign", () => {
    expect(getZaloFollowQualifiers("electric_sofa").label).toContain("chỗ ngồi");
    expect(getZaloFollowQualifiers("sofa_bed").values).toContain("1m6");
  });

  it("normalizes Vietnamese phone numbers", () => {
    expect(normalizeZaloLeadPhone("0918 326 552")).toBe("0918326552");
    expect(normalizeZaloLeadPhone("+84 918 326 552")).toBe("0918326552");
    expect(normalizeZaloLeadPhone("918326552")).toBeNull();
  });
});
