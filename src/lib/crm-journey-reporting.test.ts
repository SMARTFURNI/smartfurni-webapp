import { describe, expect, it } from "vitest";
import { normalizeJourneyReportFilters } from "./crm-journey-reporting";
import { B2B_SOFA_JOURNEY_CODE } from "./crm-b2b-sofa-journey";

describe("journey report filters", () => {
  it("giữ bộ lọc hợp lệ và loại bỏ channel hoặc workflow không được hỗ trợ", () => {
    expect(normalizeJourneyReportFilters({
      from: "2026-08-01",
      to: "2026-08-16",
      journeyCode: B2B_SOFA_JOURNEY_CODE,
      channel: "email",
      source: "Facebook Ads",
      assignedTo: "Lan",
    })).toEqual({
      from: "2026-08-01",
      to: "2026-08-16",
      journeyCode: B2B_SOFA_JOURNEY_CODE,
      channel: "email",
      source: "Facebook Ads",
      assignedTo: "Lan",
    });
    expect(normalizeJourneyReportFilters({ journeyCode: "invalid", channel: "sms" }).journeyCode).toBe("");
    expect(normalizeJourneyReportFilters({ journeyCode: "invalid", channel: "sms" }).channel).toBe("");
  });

  it("không cho khoảng báo cáo vượt quá một năm hoặc đảo ngày", () => {
    const normalized = normalizeJourneyReportFilters({ from: "2020-01-01", to: "2026-08-16" });
    expect(normalized.from).toBe("2026-07-18");
    expect(normalizeJourneyReportFilters({ from: "2026-09-01", to: "2026-08-16" }).from).toBe("2026-07-18");
  });
});
