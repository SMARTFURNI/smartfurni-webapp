import { describe, expect, it } from "vitest";
import { automationTriggerKey, isAutomationTriggerStageAllowed } from "./crm-automation-trigger";
import type { AutomationRule } from "./crm-automation-store";
import type { Lead } from "./crm-types";

const lead = {
  id: "lead-1",
  name: "An Nhiên Homestay",
  stage: "negotiating",
  type: "investor",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-10T00:00:00.000Z",
  lastContactAt: "2026-08-09T00:00:00.000Z",
} as Lead;

const rule = {
  id: "rule-negotiating",
  trigger: { type: "no_activity_days", days: 5, stages: ["negotiating"] },
} as AutomationRule;

describe("automation trigger idempotency", () => {
  it("chỉ cho phép giai đoạn đã cấu hình", () => {
    expect(isAutomationTriggerStageAllowed(rule.trigger, "negotiating")).toBe(true);
    expect(isAutomationTriggerStageAllowed(rule.trigger, "new")).toBe(false);
  });

  it("giữ cùng khóa khi cron chạy lại nhưng đổi khóa sau tương tác mới", () => {
    const first = automationTriggerKey(rule, lead);
    expect(automationTriggerKey(rule, { ...lead })).toBe(first);
    expect(automationTriggerKey(rule, {
      ...lead,
      lastContactAt: "2026-08-14T00:00:00.000Z",
    })).not.toBe(first);
  });
});
