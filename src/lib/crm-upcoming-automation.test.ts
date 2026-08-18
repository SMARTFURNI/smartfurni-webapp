import { describe, expect, it } from "vitest";
import {
  normalizeUpcomingAutomationFilters,
  summarizeUpcomingAutomationItems,
} from "./crm-upcoming-automation";
import type { UpcomingAutomationItem } from "./crm-upcoming-automation-types";

function item(input: Partial<UpcomingAutomationItem>): UpcomingAutomationItem {
  return {
    id: "journey:a1",
    origin: "journey",
    leadId: "lead-1",
    leadName: "Khách A",
    company: "",
    recipient: "0900000000",
    leadSource: "Facebook Ads",
    assignedTo: "Lan",
    effectiveSendAt: "2026-08-18T02:00:00.000Z",
    scheduledAt: "2026-08-18T02:00:00.000Z",
    nextAttemptAt: null,
    channel: "zalo_personal",
    fallbackChannels: ["email"],
    journeyCode: "JRN_TEST",
    journeyName: "Workflow thử nghiệm",
    stepId: "D0",
    stepTitle: "Chào khách",
    dayOffset: 0,
    subject: "",
    message: "Xin chào",
    rawStatus: "pending",
    readiness: "ready",
    readinessReason: "Sẵn sàng",
    attempts: 0,
    mediaCount: 0,
    updatedAt: "2026-08-18T01:00:00.000Z",
    ...input,
  };
}

describe("upcoming automation filters", () => {
  it("mặc định xem hôm nay theo giờ Việt Nam", () => {
    const normalized = normalizeUpcomingAutomationFilters({}, new Date("2026-08-17T18:00:00.000Z"));
    expect(normalized.from).toBe("2026-08-18");
    expect(normalized.to).toBe("2026-08-18");
  });

  it("đảo khoảng ngày bị nhập ngược và giữ các bộ lọc hợp lệ", () => {
    expect(normalizeUpcomingAutomationFilters({
      from: "2026-08-30",
      to: "2026-08-18",
      channel: "email",
      readiness: "waiting_content",
      search: "  Nguyễn An  ",
    }, new Date("2026-08-18T00:00:00.000Z"))).toMatchObject({
      from: "2026-08-18",
      to: "2026-08-30",
      channel: "email",
      readiness: "waiting_content",
      search: "Nguyễn An",
    });
  });

  it("giới hạn truy vấn tùy chọn ở 366 ngày để bảo vệ màn hình vận hành", () => {
    const normalized = normalizeUpcomingAutomationFilters({ from: "2026-01-01", to: "2028-01-01" });
    expect(normalized.to).toBe("2027-01-02");
  });
});

describe("upcoming automation summary", () => {
  it("đếm đúng tin, khách duy nhất, kênh và các mục cần chú ý", () => {
    const summary = summarizeUpcomingAutomationItems([
      item({ id: "a", leadId: "lead-1", channel: "zalo_personal", readiness: "ready" }),
      item({ id: "b", leadId: "lead-1", channel: "email", readiness: "retrying" }),
      item({ id: "c", leadId: "lead-2", channel: "zalo_oa", readiness: "missing_recipient" }),
    ]);
    expect(summary).toEqual({
      total: 3,
      uniqueLeads: 2,
      ready: 1,
      attention: 2,
      channels: { zalo_personal: 1, zalo_oa: 1, email: 1 },
    });
  });
});
