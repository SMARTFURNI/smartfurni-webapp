import { describe, expect, it } from "vitest";
import type { CallLog } from "./crm-types";
import { areComplementaryItyCallLogs, coalesceComplementaryItyCallLogs } from "./crm-call-log-reconciliation";

function call(overrides: Partial<CallLog>): CallLog {
  return {
    id: "call-default",
    callId: "default",
    callerNumber: "101",
    receiverNumber: "0932166116",
    direction: "outbound",
    status: "answered",
    duration: 36,
    provider: "jssip",
    startedAt: "2026-08-18T08:38:00.000Z",
    createdAt: "2026-08-18T08:38:36.000Z",
    updatedAt: "2026-08-18T08:38:36.000Z",
    ...overrides,
  };
}

describe("ITY call log reconciliation", () => {
  it("merges a browser success record with the later ITY recording record", () => {
    const browser = call({ id: "browser", staffId: "staff-1", staffName: "Ms Khuyên", leadId: "lead-1" });
    const webhook = call({
      id: "webhook",
      callId: "ity-real-call-id",
      provider: "ity",
      receiverNumber: "+84932166116",
      duration: 22,
      recordingUrl: "https://c89866.ity.vn/recording.mp3",
      note: "Chất lượng (MOS): 4.26",
      startedAt: "2026-08-18T08:38:03.000Z",
      updatedAt: "2026-08-18T08:39:00.000Z",
    });

    expect(areComplementaryItyCallLogs(browser, webhook)).toBe(true);
    expect(coalesceComplementaryItyCallLogs([browser, webhook])).toEqual([
      expect.objectContaining({
        id: "webhook",
        callId: "ity-real-call-id",
        staffName: "Ms Khuyên",
        leadId: "lead-1",
        duration: 22,
        recordingUrl: "https://c89866.ity.vn/recording.mp3",
      }),
    ]);
  });

  it("keeps genuinely separate calls even when they use the same phone number", () => {
    const first = call({ id: "first" });
    const later = call({
      id: "later",
      provider: "ity",
      recordingUrl: "https://c89866.ity.vn/later.mp3",
      startedAt: "2026-08-18T08:43:00.000Z",
    });

    expect(areComplementaryItyCallLogs(first, later)).toBe(false);
    expect(coalesceComplementaryItyCallLogs([first, later])).toHaveLength(2);
  });

  it("does not merge calls when neither entry contains a recording", () => {
    const browser = call({ id: "browser" });
    const pendingIty = call({ id: "pending", provider: "ity", startedAt: "2026-08-18T08:38:02.000Z" });

    expect(areComplementaryItyCallLogs(browser, pendingIty)).toBe(false);
  });
});
