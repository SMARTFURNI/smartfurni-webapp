import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { recordZaloWebhookEvent, recordZaloWebhookReceipt, recordZaloGmfWebhookEvent, verifyZaloWebhookSignature } = vi.hoisted(() => ({
  recordZaloWebhookEvent: vi.fn(),
  recordZaloWebhookReceipt: vi.fn().mockResolvedValue(undefined),
  recordZaloGmfWebhookEvent: vi.fn().mockResolvedValue({ handled: false }),
  verifyZaloWebhookSignature: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/zalo-oa-store", () => ({
  getZaloOAConfig: vi.fn().mockResolvedValue({
    appId: "429156857373131074",
    appSecret: "configured-secret",
    oaSecretKey: "configured-oa-secret",
  }),
  recordZaloWebhookEvent,
  recordZaloWebhookReceipt,
  verifyZaloWebhookSignature,
}));

vi.mock("@/lib/zalo-gmf-store", () => ({ recordZaloGmfWebhookEvent }));

import { POST } from "@/app/api/crm/zalo/webhook/route";

function request(body: string) {
  return new NextRequest("https://www.smartfurni.com.vn/api/crm/zalo/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("Zalo OA webhook verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordZaloGmfWebhookEvent.mockResolvedValue({ handled: false });
  });

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
    expect(recordZaloWebhookReceipt).toHaveBeenCalledWith(expect.objectContaining({
      eventName: "user_send_text",
      status: "ignored",
    }));
  });

  it("rejects malformed non-empty JSON", async () => {
    const response = await POST(request("not-json"));

    expect(response.status).toBe(400);
  });

  it("stores a correctly signed OA event and records successful processing", async () => {
    verifyZaloWebhookSignature.mockReturnValueOnce(true);
    recordZaloWebhookEvent.mockResolvedValueOnce({ handled: true, aiQueued: false });
    const body = JSON.stringify({
      event_name: "user_send_image",
      app_id: "429156857373131074",
      timestamp: "1785686400000",
      sender: { id: "zalo-user-1" },
      message: { msg_id: "message-1", attachments: [{ type: "image" }] },
    });
    const signedRequest = new NextRequest("https://www.smartfurni.com.vn/api/crm/zalo/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "x-zevent-signature": "mac=valid" },
      body,
    });

    const response = await POST(signedRequest);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, handled: true });
    expect(recordZaloWebhookEvent).toHaveBeenCalledWith(expect.objectContaining({ event_name: "user_send_image" }));
    expect(recordZaloWebhookReceipt).toHaveBeenCalledWith(expect.objectContaining({ status: "processed" }));
  });

  it("does not replace a successful receipt with a supported but non-conversation event", async () => {
    verifyZaloWebhookSignature.mockReturnValueOnce(true);
    recordZaloWebhookEvent.mockResolvedValueOnce({ handled: false });
    const body = JSON.stringify({
      event_name: "user_received_message",
      app_id: "429156857373131074",
      timestamp: "1785686400000",
      sender: { id: "zalo-user-1" },
      message: { msg_id: "receipt-1" },
    });
    const signedRequest = new NextRequest("https://www.smartfurni.com.vn/api/crm/zalo/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "x-zevent-signature": "mac=valid" },
      body,
    });

    const response = await POST(signedRequest);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, handled: false });
    expect(recordZaloWebhookReceipt).not.toHaveBeenCalled();
  });

  it("routes a signed GMF join event to the group processor", async () => {
    verifyZaloWebhookSignature.mockReturnValueOnce(true);
    recordZaloGmfWebhookEvent.mockResolvedValueOnce({ handled: true });
    const body = JSON.stringify({
      event_name: "user_request_join_group",
      app_id: "429156857373131074",
      group_id: "gmf-100",
      timestamp: "1785686400000",
      users: [{ id: "zalo-user-1" }],
    });
    const signedRequest = new NextRequest("https://www.smartfurni.com.vn/api/crm/zalo/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", "x-zevent-signature": "mac=valid" },
      body,
    });

    const response = await POST(signedRequest);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, handled: true, channel: "gmf" });
    expect(recordZaloGmfWebhookEvent).toHaveBeenCalledWith(expect.objectContaining({ group_id: "gmf-100" }));
    expect(recordZaloWebhookEvent).not.toHaveBeenCalled();
  });
});
