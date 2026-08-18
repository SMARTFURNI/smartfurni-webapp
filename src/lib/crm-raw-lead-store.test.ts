import { describe, expect, it, vi } from "vitest";

const { emitSSEMock, notifyNewDataPoolLeadMock, queryMock, queryOneMock } = vi.hoisted(() => ({
  emitSSEMock: vi.fn(),
  notifyNewDataPoolLeadMock: vi.fn().mockResolvedValue({ crm: null, admin: null }),
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ query: queryMock, queryOne: queryOneMock }));
vi.mock("@/lib/sse-emitter", () => ({ emitSSE: emitSSEMock }));
vi.mock("@/lib/crm-raw-lead-push", () => ({ notifyNewDataPoolLead: notifyNewDataPoolLeadMock }));

import { createRawLead } from "./crm-raw-lead-store";

describe("createRawLead notifications", () => {
  it("notifies only when the lead row is newly inserted", async () => {
    let insertAttempt = 0;
    queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes("INSERT INTO crm_raw_leads")) {
        insertAttempt += 1;
        return insertAttempt === 1 ? [{ id: "lead-dedup" }] : [];
      }
      return [];
    });
    queryOneMock.mockResolvedValue({
      id: "lead-dedup",
      source: "facebook_lead",
      full_name: "Khách mới",
      phone: "0900000000",
      email: "khach@example.com",
      status: "pending",
      campaign_name: "Chiến dịch A",
      created_at: "2026-08-18T01:00:00.000Z",
    });

    await createRawLead({ id: "lead-dedup", fullName: "Khách mới", source: "facebook_lead" });
    await createRawLead({ id: "lead-dedup", fullName: "Khách mới", source: "facebook_lead" });

    expect(notifyNewDataPoolLeadMock).toHaveBeenCalledTimes(1);
    expect(notifyNewDataPoolLeadMock).toHaveBeenCalledWith(expect.objectContaining({ id: "lead-dedup" }));
    expect(emitSSEMock).toHaveBeenCalledTimes(1);
  });
});
