import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyZaloWebhookSignature, type ZaloOAConfig } from "@/lib/zalo-oa-store";

const config: ZaloOAConfig = {
  oaId: "oa-1",
  appId: "429156857373131074",
  appSecret: "oauth-app-secret",
  oaSecretKey: "oa-webhook-secret",
  accessToken: "",
  refreshToken: "",
  isActive: true,
  aiEnabled: true,
  aiAutoSend: false,
  requireApproval: true,
  aiModel: "gpt-5.6-terra",
  aiConfidenceThreshold: 0.9,
  maxAutoMessagesPerDay: 30,
  businessHoursStart: "08:00",
  businessHoursEnd: "20:00",
  zbsEnabled: false,
  followWelcomeEnabled: false,
  followWelcomeMessage: "Chào {{name}}",
  updatedAt: new Date(0).toISOString(),
};

function sign(data: string, timestamp: string, secret = config.oaSecretKey) {
  return createHash("sha256")
    .update(`${config.appId}${data}${timestamp}${secret}`)
    .digest("hex");
}

describe("Zalo OA webhook signature", () => {
  it("verifies a signature generated from the complete raw body", () => {
    const timestamp = "1785686400000";
    const body = JSON.stringify({ event_name: "user_send_text", timestamp, sender: { id: "user-1" }, message: { text: "Xin chào" } });

    expect(verifyZaloWebhookSignature(body, `mac=${sign(body, timestamp)}`, config)).toBe(true);
  });

  it("verifies Zalo's nested data signature format", () => {
    const timestamp = "1785686400000";
    const data = { event_name: "user_send_image", sender: { id: "user-1" }, message: { attachments: [{ type: "image" }] } };
    const body = JSON.stringify({ timestamp, data });

    expect(verifyZaloWebhookSignature(body, sign(JSON.stringify(data), timestamp), config)).toBe(true);
  });

  it("does not confuse the OAuth App Secret with the OA webhook secret", () => {
    const timestamp = "1785686400000";
    const body = JSON.stringify({ event_name: "user_send_text", timestamp });

    expect(verifyZaloWebhookSignature(body, sign(body, timestamp, config.appSecret), config)).toBe(false);
  });
});
