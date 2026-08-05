import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicRequestOrigin } from "@/lib/public-origin";

describe("getPublicRequestOrigin", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the public proxy host instead of Railway's internal localhost URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("FRONTEND_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

    const request = new Request("http://localhost:3000/api/zalo-group/example/qr", {
      headers: {
        "x-forwarded-host": "www.smartfurni.com.vn",
        "x-forwarded-proto": "https",
      },
    });

    expect(getPublicRequestOrigin(request)).toBe("https://www.smartfurni.com.vn");
  });

  it("falls back to the canonical SmartFurni domain when only localhost is available", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("FRONTEND_URL", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");

    expect(getPublicRequestOrigin(new Request("http://localhost:3000/api/qr")))
      .toBe("https://www.smartfurni.com.vn");
  });
});
