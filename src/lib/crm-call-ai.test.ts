import { describe, expect, it } from "vitest";
import { isCallEligibleForAi } from "./crm-call-ai";

describe("isCallEligibleForAi", () => {
  it("chỉ nhận cuộc gọi thành công có ghi âm và đủ thời lượng", () => {
    expect(isCallEligibleForAi({ status: "answered", duration: 31, recordingUrl: "https://recording.ity.vn/call.mp3" })).toBe(true);
    expect(isCallEligibleForAi({ status: "missed", duration: 31, recordingUrl: "https://recording.ity.vn/call.mp3" })).toBe(false);
    expect(isCallEligibleForAi({ status: "answered", duration: 31 })).toBe(false);
    expect(isCallEligibleForAi({ status: "answered", duration: 3, recordingUrl: "https://recording.ity.vn/call.mp3" })).toBe(false);
  });
});
