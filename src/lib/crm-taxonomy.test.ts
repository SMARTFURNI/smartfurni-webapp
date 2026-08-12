import { describe, expect, it } from "vitest";
import type { Lead } from "./crm-types";
import { normalizeLeadStage, normalizeLeadType, previewCanonicalLeadTaxonomy, segmentForLeadType } from "./crm-taxonomy";

function lead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    name: "Khách thử nghiệm",
    company: "",
    phone: "0900000000",
    email: "",
    type: "dealer",
    stage: "new",
    district: "",
    expectedValue: 0,
    source: "Facebook Ads",
    assignedTo: "Admin",
    notes: "",
    lastContactAt: "2026-08-12T00:00:00.000Z",
    createdAt: "2026-08-12T00:00:00.000Z",
    updatedAt: "2026-08-12T00:00:00.000Z",
    tags: ["VIP", "SEG:BAN_LE"],
    projectName: "",
    projectAddress: "",
    unitCount: 0,
    ...overrides,
  };
}

describe("crm taxonomy", () => {
  it("maps every lead role into one canonical customer segment", () => {
    expect(segmentForLeadType("retail")).toBe("retail");
    expect(segmentForLeadType("architect")).toBe("project");
    expect(segmentForLeadType("investor")).toBe("project");
    expect(segmentForLeadType("dealer")).toBe("dealer");
    expect(segmentForLeadType("b2b")).toBe("b2b");
  });

  it("recognizes legacy stages without changing the database", () => {
    expect(normalizeLeadStage("contacted")).toBe("profile_sent");
    expect(normalizeLeadStage("proposal")).toBe("quoted");
    expect(normalizeLeadStage("negotiation")).toBe("negotiating");
  });

  it("normalizes legacy customer roles", () => {
    expect(normalizeLeadType("investor2")).toBe("investor");
    expect(normalizeLeadType("distributor")).toBe("dealer");
    expect(normalizeLeadType("invalid-role")).toBeUndefined();
  });

  it("previews canonical tags while preserving business tags", () => {
    const preview = previewCanonicalLeadTaxonomy(lead({ tags: ["VIP", "SEG:BAN_LE", "PROD:SOFA_GIUONG"] }));
    expect(preview.patch.customerSegment).toBe("dealer");
    expect(preview.patch.tags).toContain("SEG:DAI_LY");
    expect(preview.patch.tags).toContain("VIP");
    expect(preview.patch.tags).not.toContain("SEG:BAN_LE");
    expect(preview.patch.tags).toContain("PROD:SOFA_GIUONG");
    expect(preview.patch.interestedProducts).toEqual(["sofa_bed"]);
  });

  it("uses customer type as the source of truth when an old segment is stale", () => {
    const preview = previewCanonicalLeadTaxonomy(lead({
      type: "retail",
      customerSegment: "project",
      tags: ["SEG:DU_AN"],
    }));
    expect(preview.patch.customerSegment).toBe("retail");
    expect(preview.patch.tags).toContain("SEG:BAN_LE");
    expect(preview.patch.tags).not.toContain("SEG:DU_AN");
  });

  it("restores interested products from canonical product tags", () => {
    const preview = previewCanonicalLeadTaxonomy(lead({
      interestedProducts: undefined,
      tags: ["PROD:SOFA_GIUONG"],
    }));
    expect(preview.patch.interestedProducts).toEqual(["sofa_bed"]);
  });
});
