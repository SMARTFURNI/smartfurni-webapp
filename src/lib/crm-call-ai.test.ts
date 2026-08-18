import { describe, expect, it } from "vitest";
import { isCallEligibleForAi, validateCallAiUpload } from "./crm-call-ai";

describe("isCallEligibleForAi", () => {
  it("chỉ nhận cuộc gọi thành công có ghi âm và đủ thời lượng", () => {
    expect(isCallEligibleForAi({ status: "answered", duration: 31, recordingUrl: "https://recording.ity.vn/call.mp3" })).toBe(true);
    expect(isCallEligibleForAi({ status: "missed", duration: 31, recordingUrl: "https://recording.ity.vn/call.mp3" })).toBe(false);
    expect(isCallEligibleForAi({ status: "answered", duration: 31 })).toBe(false);
    expect(isCallEligibleForAi({ status: "answered", duration: 3, recordingUrl: "https://recording.ity.vn/call.mp3" })).toBe(false);
  });
});

describe("validateCallAiUpload", () => {
  it("accepts supported audio files", () => {
    expect(() => validateCallAiUpload({ name: "call.mp3", type: "audio/mpeg", size: 1024 })).not.toThrow();
    expect(() => validateCallAiUpload({ name: "call.m4a", type: "application/octet-stream", size: 1024 })).not.toThrow();
  });

  it("rejects empty, oversized, and unsupported files", () => {
    expect(() => validateCallAiUpload({ name: "call.mp3", type: "audio/mpeg", size: 0 })).toThrow("rỗng");
    expect(() => validateCallAiUpload({ name: "call.mp3", type: "audio/mpeg", size: 26 * 1024 * 1024 })).toThrow("25 MB");
    expect(() => validateCallAiUpload({ name: "call.txt", type: "text/plain", size: 1024 })).toThrow("MP3");
    expect(() => validateCallAiUpload({ name: "call.txt", type: "application/octet-stream", size: 1024 })).toThrow("MP3");
  });
});
