import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Webhook } from "svix";

const { recordJourneyEmailProviderEvent } = vi.hoisted(() => ({
  recordJourneyEmailProviderEvent: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/crm-journey-reporting", () => ({ recordJourneyEmailProviderEvent }));

import { POST } from "@/app/api/crm/automation/reports/email-webhook/route";

const SECRET = "MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw";

function signedRequest(payload: string, messageId = "msg_workflow_report_1") {
  const timestamp = new Date();
  const signature = new Webhook(SECRET).sign(messageId, timestamp, payload);
  return new NextRequest("https://www.smartfurni.com.vn/api/crm/automation/reports/email-webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "svix-id": messageId,
      "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
      "svix-signature": signature,
    },
    body: payload,
  });
}

describe("journey Resend webhook", () => {
  beforeEach(() => {
    process.env.RESEND_WEBHOOK_SECRET = SECRET;
    recordJourneyEmailProviderEvent.mockClear().mockResolvedValue(true);
  });

  afterEach(() => {
    delete process.env.RESEND_WEBHOOK_SECRET;
  });

  it("xác thực chữ ký và ghi sự kiện delivered theo provider message id", async () => {
    const payload = JSON.stringify({
      type: "email.delivered",
      created_at: "2026-08-16T02:00:00.000Z",
      data: {
        email_id: "resend-email-123",
        created_at: "2026-08-16T02:00:00.000Z",
        from: "SmartFurni <b2b@smartfurni.com.vn>",
        to: ["customer@example.com"],
        subject: "Test",
      },
    });
    const response = await POST(signedRequest(payload));

    expect(response.status).toBe(200);
    expect(recordJourneyEmailProviderEvent).toHaveBeenCalledWith(expect.objectContaining({
      providerMessageId: "resend-email-123",
      providerEventId: "msg_workflow_report_1",
      eventType: "delivered",
    }));
  });

  it("từ chối payload có chữ ký sai", async () => {
    const request = signedRequest(JSON.stringify({ type: "email.delivered", data: {} }));
    request.headers.set("svix-signature", "v1,invalid");
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(recordJourneyEmailProviderEvent).not.toHaveBeenCalled();
  });
});
