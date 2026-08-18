import { describe, expect, it } from "vitest";
import { normalizeJourneyReportFilters, rewriteJourneyTrackedLinks } from "./crm-journey-reporting";
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

  it("bọc link Zalo bằng URL theo dõi nhưng giữ nguyên dấu câu", () => {
    expect(rewriteJourneyTrackedLinks("Xem https://smartfurni.com.vn/demo, rồi phản hồi.", "https://crm.test/click?u="))
      .toBe("Xem https://crm.test/click?u=https%3A%2F%2Fsmartfurni.com.vn%2Fdemo, rồi phản hồi.");
  });

  it("chuẩn hóa và theo dõi tên miền SmartFurni dạng trần nhưng không đụng vào email", () => {
    expect(rewriteJourneyTrackedLinks(
      "Website smartfurni.com.vn/demo. Email b2b@smartfurni.com.vn",
      "https://crm.test/click?u=",
    )).toBe(
      "Website https://crm.test/click?u=https%3A%2F%2Fsmartfurni.com.vn%2Fdemo. Email b2b@smartfurni.com.vn",
    );
  });

  it("không bọc lặp đường dẫn theo dõi đã tạo", () => {
    const clickBaseUrl = "https://www.smartfurni.com.vn/api/crm/automation/reports/email-click?t=abc&u=";
    const tracked = `${clickBaseUrl}https%3A%2F%2Fwww.smartfurni.com.vn`;
    expect(rewriteJourneyTrackedLinks(tracked, clickBaseUrl)).toBe(tracked);
  });
});
