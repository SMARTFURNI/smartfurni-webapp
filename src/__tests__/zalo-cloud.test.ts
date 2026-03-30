/**
 * Tests for Zalo Cloud Connect integration
 */
import { describe, it, expect } from "vitest";
import {
  normalizeVietnamesePhone,
  mapZaloReplyStatus,
  mapZaloDeliveryStatus,
} from "@/lib/zalo-cloud";

describe("normalizeVietnamesePhone", () => {
  it("converts 0xxx to 84xxx", () => {
    expect(normalizeVietnamesePhone("0901234567")).toBe("84901234567");
  });

  it("keeps 84xxx unchanged", () => {
    expect(normalizeVietnamesePhone("84901234567")).toBe("84901234567");
  });

  it("adds 84 prefix to bare number", () => {
    expect(normalizeVietnamesePhone("901234567")).toBe("84901234567");
  });

  it("removes non-digit characters", () => {
    expect(normalizeVietnamesePhone("090-123-4567")).toBe("84901234567");
  });
});

describe("mapZaloReplyStatus", () => {
  it("maps P to answered", () => {
    expect(mapZaloReplyStatus("P")).toBe("answered");
  });

  it("maps N to missed", () => {
    expect(mapZaloReplyStatus("N")).toBe("missed");
  });

  it("maps Z to failed", () => {
    expect(mapZaloReplyStatus("Z")).toBe("failed");
  });

  it("maps unknown to failed", () => {
    expect(mapZaloReplyStatus("X")).toBe("failed");
  });
});

describe("mapZaloDeliveryStatus", () => {
  it("maps Received correctly", () => {
    expect(mapZaloDeliveryStatus("Received")).toBe("Đã nhận");
  });

  it("maps Seen correctly", () => {
    expect(mapZaloDeliveryStatus("Seen")).toBe("Đã xem");
  });

  it("maps Unknown correctly", () => {
    expect(mapZaloDeliveryStatus("Unknown")).toBe("Không xác định");
  });
});
