import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createCallLog, enqueueCallAiAnalysis, initCallLogSchema, query } = vi.hoisted(() => ({
  createCallLog: vi.fn(),
  enqueueCallAiAnalysis: vi.fn().mockResolvedValue(undefined),
  initCallLogSchema: vi.fn().mockResolvedValue(undefined),
  query: vi.fn(),
}));

vi.mock("@/lib/crm-store", () => ({
  createCallLog,
  initCallLogSchema,
  updateCallLog: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ query }));
vi.mock("@/lib/crm-call-ai", () => ({ enqueueCallAiAnalysis }));

import { POST } from "@/app/wsapi/[customer]/call_answered/route";

function webhookRequest() {
  return new NextRequest("https://smartfurni.com.vn/wsapi/89866001/call_answered?secret=test-secret", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      callid: "ity-call-1",
      phone: "0932166116",
      extension: "101",
      direction: "outbound",
      status: "ANSWERED",
      billsec: 22,
      start_stamp: "2026-08-18 15:38:03",
      end_stamp: "2026-08-18 15:38:25",
      recording: "https://c89866.ity.vn/recording.mp3",
      userfield: "lead-1",
    }),
  });
}

describe("ITY call_answered alias", () => {
  const previousCustomer = process.env.ITY_CUSTOMER;
  const previousSecret = process.env.ITY_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ITY_CUSTOMER = "89866001";
    process.env.ITY_WEBHOOK_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env.ITY_CUSTOMER = previousCustomer;
    process.env.ITY_WEBHOOK_SECRET = previousSecret;
  });

  it("routes the public webhook through reconciliation and updates the original call", async () => {
    query
      .mockResolvedValueOnce([{
        id: "browser-call",
        data: {
          id: "browser-call",
          callId: "webphone-local-id",
          callerNumber: "89866001",
          receiverNumber: "0932166116",
          direction: "outbound",
          status: "answered",
          duration: 36,
          provider: "jssip",
          staffName: "Ms Khuyên",
          leadId: "lead-1",
          startedAt: "2026-08-18T08:38:00.000Z",
          createdAt: "2026-08-18T08:38:36.000Z",
          updatedAt: "2026-08-18T08:38:36.000Z",
        },
      }])
      .mockResolvedValueOnce([]);

    const response = await POST(webhookRequest(), {
      params: Promise.resolve({ customer: "89866001" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: "browser-call",
      callId: "ity-call-1",
      merged: true,
    });
    expect(createCallLog).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledTimes(2);
    expect(String(query.mock.calls[1][0])).toContain("UPDATE crm_call_logs");
    expect(enqueueCallAiAnalysis).toHaveBeenCalledWith("browser-call");
  });

  it("rejects a webhook for a different ITY customer", async () => {
    const response = await POST(webhookRequest(), {
      params: Promise.resolve({ customer: "wrong-customer" }),
    });

    expect(response.status).toBe(403);
    expect(query).not.toHaveBeenCalled();
    expect(createCallLog).not.toHaveBeenCalled();
  });
});
