import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { AiCommandAccessError } from "./access";
import { assertTrustedJsonRequest } from "./security";

function request(headers: Record<string, string>) {
  return new NextRequest("https://smartfurni-webapp-production.up.railway.app/api/ai-command/chat", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
  });
}

describe("assertTrustedJsonRequest", () => {
  it("accepts a browser-confirmed same-origin request behind a proxy", () => {
    expect(() => assertTrustedJsonRequest(request({
      origin: "https://smartfurni.com.vn",
      "sec-fetch-site": "same-origin",
      host: "smartfurni-webapp-production.up.railway.app",
    }))).not.toThrow();
  });

  it("accepts the public host supplied by the trusted reverse proxy", () => {
    expect(() => assertTrustedJsonRequest(request({
      origin: "https://smartfurni.com.vn",
      "sec-fetch-site": "same-site",
      host: "smartfurni-webapp-production.up.railway.app",
      "x-forwarded-host": "smartfurni.com.vn",
    }))).not.toThrow();
  });

  it("rejects cross-site browser requests", () => {
    expect(() => assertTrustedJsonRequest(request({
      origin: "https://attacker.example",
      "sec-fetch-site": "cross-site",
      "x-forwarded-host": "smartfurni.com.vn",
    }))).toThrow(AiCommandAccessError);
  });

  it("rejects a mismatched origin when the browser does not confirm same-origin", () => {
    expect(() => assertTrustedJsonRequest(request({
      origin: "https://attacker.example",
      "sec-fetch-site": "same-site",
      "x-forwarded-host": "smartfurni.com.vn",
    }))).toThrow("Nguồn gửi yêu cầu không hợp lệ.");
  });
});
