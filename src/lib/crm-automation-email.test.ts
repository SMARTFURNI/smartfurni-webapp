import { describe, expect, it } from "vitest";
import { buildAutomationEmailHtml, isAmbiguousAutomationEmailError } from "./crm-automation-email";

describe("automation email error classification", () => {
  it("chỉ coi lỗi mạng sau khi gọi nhà cung cấp là chưa rõ kết quả", () => {
    expect(isAmbiguousAutomationEmailError("fetch failed: socket timeout")).toBe(true);
    expect(isAmbiguousAutomationEmailError("HTTP 503 from provider")).toBe(true);
  });

  it("coi lỗi dữ liệu hoặc media là thất bại xác định để cho phép fallback", () => {
    expect(isAmbiguousAutomationEmailError("Tổng dung lượng vượt giới hạn email 38 MB")).toBe(false);
    expect(isAmbiguousAutomationEmailError("Invalid recipient address")).toBe(false);
  });

  it("gắn tracking mở và click nhưng vẫn giữ nguyên nội dung text cho người nhận", () => {
    const html = buildAutomationEmailHtml("Xem https://smartfurni.com.vn/contact.", {
      openUrl: "https://smartfurni.com.vn/api/open?t=opaque",
      clickBaseUrl: "https://smartfurni.com.vn/api/click?t=opaque&u=",
    });
    expect(html).toContain("api/open?t=opaque");
    expect(html).toContain("api/click?t=opaque&amp;u=https%3A%2F%2Fsmartfurni.com.vn%2Fcontact");
    expect(html).toContain(">https://smartfurni.com.vn/contact</a>.");
  });
});
