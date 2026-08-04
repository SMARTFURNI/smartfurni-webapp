import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { initZaloGmfSchema, markZaloGmfVisitOpened, recordZaloGmfSourceVisit } = vi.hoisted(() => ({
  initZaloGmfSchema: vi.fn().mockResolvedValue(undefined),
  markZaloGmfVisitOpened: vi.fn().mockResolvedValue(undefined),
  recordZaloGmfSourceVisit: vi.fn(),
}));

vi.mock("@/lib/zalo-gmf-store", () => ({ initZaloGmfSchema }));
vi.mock("@/lib/zalo-gmf-attribution-store", () => ({
  markZaloGmfVisitOpened,
  recordZaloGmfSourceVisit,
}));

import { GET } from "@/app/zalo-group/[slug]/route";

describe("Zalo group tracking redirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordZaloGmfSourceVisit.mockResolvedValue({
      visitId: "visit-1",
      visitorKey: "visitor-1",
      link: { targetUrl: "https://zalo.me/g/example-group" },
    });
  });

  it("records the source and redirects directly to the Zalo group", async () => {
    const request = new NextRequest("https://www.smartfurni.com.vn/zalo-group/showroom-a?utm_campaign=summer", {
      headers: {
        referer: "https://www.smartfurni.com.vn/",
        "user-agent": "test-agent",
        "x-forwarded-for": "203.0.113.10",
      },
    });

    const response = await GET(request, { params: Promise.resolve({ slug: "showroom-a" }) });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://zalo.me/g/example-group");
    expect(response.headers.get("set-cookie")).toContain("sf_gmf_visitor=visitor-1");
    expect(recordZaloGmfSourceVisit).toHaveBeenCalledWith("showroom-a", expect.objectContaining({
      ip: "203.0.113.10",
      referrer: "https://www.smartfurni.com.vn/",
      queryParams: { utm_campaign: "summer" },
    }));
    expect(markZaloGmfVisitOpened).toHaveBeenCalledWith("showroom-a", "visit-1");
  });

  it("returns 404 instead of redirecting when the source link is invalid", async () => {
    recordZaloGmfSourceVisit.mockRejectedValueOnce(new Error("Link đã hết hạn."));
    const request = new NextRequest("https://www.smartfurni.com.vn/zalo-group/expired");

    const response = await GET(request, { params: Promise.resolve({ slug: "expired" }) });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: "Link đã hết hạn." });
    expect(markZaloGmfVisitOpened).not.toHaveBeenCalled();
  });
});
