import { beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock, queryOneMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  queryOneMock: vi.fn(),
}));

function assertParameterCount(sql: string, params?: unknown[]) {
  const positions = Array.from(sql.matchAll(/\$(\d+)/g), match => Number(match[1]));
  const expected = positions.length ? Math.max(...positions) : 0;
  expect(params?.length || 0).toBe(expected);
}

vi.mock("@/lib/db", () => ({ query: queryMock, queryOne: queryOneMock }));
vi.mock("@/lib/crm-store", () => ({ getLeads: vi.fn(async () => []) }));

import { getJourneyWorkflowReport } from "./crm-journey-reporting";

describe("journey report SQL bindings", () => {
  beforeEach(() => {
    queryMock.mockReset().mockImplementation(async (sql: string, params?: unknown[]) => {
      assertParameterCount(sql, params);
      return [];
    });
    queryOneMock.mockReset().mockImplementation(async (sql: string, params?: unknown[]) => {
      assertParameterCount(sql, params);
      return null;
    });
  });

  it("binds every placeholder for the unfiltered report", async () => {
    const report = await getJourneyWorkflowReport({ from: "2026-08-01", to: "2026-08-16" });
    expect(report.summary.enrolled).toBe(0);
    expect(report.options.workflows).toHaveLength(2);
    expect(queryMock).toHaveBeenCalled();
  });

  it("binds channel, workflow, source and assignee filters without extra parameters", async () => {
    const report = await getJourneyWorkflowReport({
      from: "2026-08-01",
      to: "2026-08-16",
      journeyCode: "JRN_B2B_SOFA_90D_V1",
      channel: "email",
      source: "Facebook Ads",
      assignedTo: "Lan",
    });
    expect(report.filters.channel).toBe("email");
    expect(report.daily.length).toBe(16);
  });
});
