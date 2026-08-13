import { afterEach, describe, expect, it } from "vitest";
import {
  getZaloMediaExpiresAt,
  getZaloMediaKind,
  getZaloMediaMaxBytes,
  getZaloMediaRetentionDays,
} from "@/lib/zalo-media-policy";

const POLICY_ENV_KEYS = [
  "ZALO_MEDIA_IMAGE_MAX_MB",
  "ZALO_MEDIA_VIDEO_MAX_MB",
  "ZALO_MEDIA_FILE_MAX_MB",
  "ZALO_MEDIA_IMAGE_RETENTION_DAYS",
  "ZALO_MEDIA_VIDEO_RETENTION_DAYS",
  "ZALO_MEDIA_FILE_RETENTION_DAYS",
] as const;

afterEach(() => {
  for (const key of POLICY_ENV_KEYS) delete process.env[key];
});

describe("Zalo media policy", () => {
  it("classifies media and applies safe default limits", () => {
    expect(getZaloMediaKind("image/jpeg")).toBe("image");
    expect(getZaloMediaKind("video/mp4")).toBe("video");
    expect(getZaloMediaKind("application/pdf")).toBe("file");

    expect(getZaloMediaMaxBytes("image")).toBe(15 * 1024 * 1024);
    expect(getZaloMediaMaxBytes("video")).toBe(40 * 1024 * 1024);
    expect(getZaloMediaRetentionDays("image")).toBe(180);
    expect(getZaloMediaRetentionDays("video")).toBe(60);
    expect(getZaloMediaRetentionDays("file")).toBe(365);
  });

  it("supports environment overrides and calculates expiry deterministically", () => {
    process.env.ZALO_MEDIA_VIDEO_MAX_MB = "25";
    process.env.ZALO_MEDIA_VIDEO_RETENTION_DAYS = "30";
    const now = Date.UTC(2026, 7, 13);

    expect(getZaloMediaMaxBytes("video")).toBe(25 * 1024 * 1024);
    expect(getZaloMediaExpiresAt("video", now).getTime()).toBe(
      now + 30 * 24 * 60 * 60 * 1000,
    );
  });
});
