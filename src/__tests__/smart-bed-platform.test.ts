import { describe, expect, it } from "vitest";
import { detectSmartBedPlatform } from "@/lib/smart-bed-platform";

describe("detectSmartBedPlatform", () => {
  it("nhận diện iPhone dù dùng trình duyệt Chrome", () => {
    expect(detectSmartBedPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) CriOS/126 Mobile/15E148")).toBe("ios");
  });

  it("nhận diện thiết bị Android", () => {
    expect(detectSmartBedPlatform("Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/126 Mobile")).toBe("android");
  });

  it("phân biệt máy tính Windows và macOS", () => {
    expect(detectSmartBedPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("windows");
    expect(detectSmartBedPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5)")).toBe("macos");
  });
});
