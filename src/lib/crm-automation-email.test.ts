import { describe, expect, it } from "vitest";
import { isAmbiguousAutomationEmailError } from "./crm-automation-email";

describe("automation email error classification", () => {
  it("chỉ coi lỗi mạng sau khi gọi nhà cung cấp là chưa rõ kết quả", () => {
    expect(isAmbiguousAutomationEmailError("fetch failed: socket timeout")).toBe(true);
    expect(isAmbiguousAutomationEmailError("HTTP 503 from provider")).toBe(true);
  });

  it("coi lỗi dữ liệu hoặc media là thất bại xác định để cho phép fallback", () => {
    expect(isAmbiguousAutomationEmailError("Tổng dung lượng vượt giới hạn email 38 MB")).toBe(false);
    expect(isAmbiguousAutomationEmailError("Invalid recipient address")).toBe(false);
  });
});
