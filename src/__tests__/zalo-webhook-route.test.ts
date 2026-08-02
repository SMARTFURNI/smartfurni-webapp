import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { recordZaloWebhookEvent } = vi.hoisted(() => ({
  recordZaloWebhookEvent: vi.fn(),
}));

vi.mock("@/lib/zalo-oa-store", () => ({
  getZaloOAConfig: vi.fn().mockResolvedValue({
    appId: "429156857373131074",
    appSecret: "configured-secret",
  }),
  recordZaloWebhookEvent,
  verifyZaloWebhookSignature: vi.fn().mockReturnValue(false),
}));

import { POST } from "@/app/api/crm/zalo/webhook/route";

function request(body: string) {
  return new NextRequest("https://www.smartfurni.com.vn/api/crm/zalo/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("Zalo OA webhook verification", () => {
  it("accepts Zalo's empty connectivity probe", async () => {
    const response = await POST(request(""));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, verification: true });
  });

  it("accepts a JSON connectivity probe without processing an OA event", async () => {
    const response = await POST(request(JSON.stringify({ app_id: "429156857373131074" })));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, verification: true });
  });

  it("acknowledges an unsigned event-shaped verification request without processing it", async () => {
    const response = await POST(request(JSON.stringify({
      event_name: "user_send_text",
      app_id: "429156857373131074",
      timestamp: "1785686400000",
      data: { msg_id: "zalo-connectivity-check" },
    })));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, ignored: true });
    expect(recordZaloWebhookEvent).not.toHaveBeenCalled();
  });

  it("rejects malformed non-empty JSON", async () => {
    const response = await POST(request("not-json"));

    expect(response.status).toBe(400);
  });
});
