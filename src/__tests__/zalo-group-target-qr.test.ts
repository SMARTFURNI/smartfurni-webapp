import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  getPublicZaloGmfSourceLink,
  initZaloGmfSchema,
  markZaloGmfVisitOpened,
  qrToString,
  recordZaloGmfSourceVisit,
} = vi.hoisted(() => ({
  getPublicZaloGmfSourceLink: vi.fn(),
  initZaloGmfSchema: vi.fn().mockResolvedValue(undefined),
  markZaloGmfVisitOpened: vi.fn().mockResolvedValue(undefined),
  qrToString: vi.fn().mockResolvedValue("<svg></svg>"),
  recordZaloGmfSourceVisit: vi.fn(),
}));

vi.mock("qrcode", () => ({ default: { toString: qrToString } }));
vi.mock("@/lib/zalo-gmf-attribution-store", () => ({
  getPublicZaloGmfSourceLink,
  markZaloGmfVisitOpened,
  recordZaloGmfSourceVisit,
}));
vi.mock("@/lib/zalo-gmf-store", () => ({ initZaloGmfSchema }));

import { GET as GET_OPEN } from "@/app/api/zalo-group/[slug]/open/route";
import { GET as GET_TARGET_QR } from "@/app/api/zalo-group/[slug]/target-qr/route";

describe("Zalo group focused join page QR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getPublicZaloGmfSourceLink.mockResolvedValue({ targetUrl: "https://zalo.me/g/example-group" });
    recordZaloGmfSourceVisit.mockResolvedValue({
      visitId: "visit-1",
      visitorKey: "visitor-1",
      link: { targetUrl: "https://zalo.me/g/example-group" },
    });
  });

  it("renders an SVG QR that points to the tracked group opener", async () => {
    const response = await GET_TARGET_QR(new Request("https://www.smartfurni.com.vn/api/zalo-group/showroom-a/target-qr"), {
      params: Promise.resolve({ slug: "showroom-a" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(await response.text()).toContain("<svg");
    expect(getPublicZaloGmfSourceLink).toHaveBeenCalledWith("showroom-a");
    expect(qrToString).toHaveBeenCalledWith(
      "https://www.smartfurni.com.vn/api/zalo-group/showroom-a/open?via=qr",
      expect.objectContaining({ errorCorrectionLevel: "H" }),
    );
  });

  it("records the QR visit and redirects to the target Zalo group", async () => {
    const request = new NextRequest("https://www.smartfurni.com.vn/api/zalo-group/showroom-a/open?via=qr", {
      headers: { "user-agent": "test-agent", "x-forwarded-for": "203.0.113.10" },
    });
    const response = await GET_OPEN(request, { params: Promise.resolve({ slug: "showroom-a" }) });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://zalo.me/g/example-group");
    expect(response.headers.get("set-cookie")).toContain("sf_gmf_visitor=visitor-1");
    expect(recordZaloGmfSourceVisit).toHaveBeenCalledWith("showroom-a", expect.objectContaining({
      ip: "203.0.113.10",
      queryParams: { via: "qr" },
    }));
    expect(markZaloGmfVisitOpened).toHaveBeenCalledWith("showroom-a", "visit-1");
  });

  it("returns 404 when the source link is unavailable", async () => {
    getPublicZaloGmfSourceLink.mockResolvedValueOnce(null);
    const response = await GET_TARGET_QR(new Request("https://www.smartfurni.com.vn/api/zalo-group/showroom-a/target-qr"), {
      params: Promise.resolve({ slug: "showroom-a" }),
    });

    expect(response.status).toBe(404);
  });
});
