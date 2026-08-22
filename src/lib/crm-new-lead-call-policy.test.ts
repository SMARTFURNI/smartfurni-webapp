import { describe, expect, it } from "vitest";
import { buildNewLeadCallSlots, evaluateNewLeadCallUnlock, normalizeNewLeadCallPolicy } from "./crm-new-lead-call-policy";

describe("new lead call policy", () => {
  it("creates three calls per day, three hours apart, for three days", () => {
    const plan = buildNewLeadCallSlots("2026-08-22T01:00:00.000Z"); // 08:00 tại Việt Nam
    expect(plan.slots).toHaveLength(9);
    expect(plan.slots.slice(0, 3).map(slot => slot.scheduledAt)).toEqual([
      "2026-08-22T02:00:00.000Z",
      "2026-08-22T05:00:00.000Z",
      "2026-08-22T08:00:00.000Z",
    ]);
    expect(plan.slots.at(-1)?.dayNumber).toBe(3);
    expect(plan.unlockAt).toBe("2026-08-24T13:00:00.000Z");
  });

  it("moves the sequence to the next morning when a full day no longer fits", () => {
    const plan = buildNewLeadCallSlots("2026-08-22T07:30:00.000Z"); // 14:30 tại Việt Nam
    expect(plan.slots[0].scheduledAt).toBe("2026-08-23T02:00:00.000Z");
  });

  it("normalizes unsafe admin values and keeps the configured window feasible", () => {
    const policy = normalizeNewLeadCallPolicy({ startHour: 18, endHour: 19, callsPerDay: 3, intervalHours: 2 });
    expect(policy.endHour).toBe(22);
    expect(policy.unlockMinAttemptsPerDay).toBeLessThanOrEqual(policy.callsPerDay);
  });

  it("only unlocks failed calls after six attempts spread across all three days", () => {
    const attempts = [1, 2, 3].flatMap(day => [1, 2].map(slot => ({ dayKey: `2026-08-2${day}`, status: "missed", duration: slot - 1 })));
    expect(evaluateNewLeadCallUnlock({ attempts, unlockAt: "2026-08-23T13:00:00.000Z", now: new Date("2026-08-23T12:59:59.000Z") }).unlocked).toBe(false);
    expect(evaluateNewLeadCallUnlock({ attempts, unlockAt: "2026-08-23T13:00:00.000Z", now: new Date("2026-08-23T13:00:00.000Z") })).toMatchObject({ unlocked: true, qualifiedDays: 3 });
  });

  it("unlocks immediately when ITY reports an answered call", () => {
    expect(evaluateNewLeadCallUnlock({
      attempts: [{ dayKey: "2026-08-22", status: "answered", duration: 12 }],
      unlockAt: "2026-08-25T13:00:00.000Z",
      now: new Date("2026-08-22T03:00:00.000Z"),
    })).toMatchObject({ unlocked: true, success: true });
  });
});
