import { describe, expect, it } from "vitest";
import {
  buildZaloFriendRequestMessage,
  getLeadProductLabel,
  normalizeZaloFriendPhone,
} from "./crm-zalo-friendship-message";

describe("Zalo personal friendship message", () => {
  it("chuẩn hóa số điện thoại Việt Nam", () => {
    expect(normalizeZaloFriendPhone("+84 912 345 678")).toBe("0912345678");
    expect(normalizeZaloFriendPhone("0912.345.678")).toBe("0912345678");
  });

  it("đưa đúng sản phẩm khách quan tâm vào lời mời", () => {
    const message = buildZaloFriendRequestMessage({
      name: "Nguyễn Minh Anh",
      assignedTo: "Ms Khuyên",
      interestedProducts: ["sofa_bed"],
    });
    expect(message).toContain("Anh");
    expect(message).toContain("Ms Khuyên");
    expect(message).toContain("Sofa giường");
    expect(message.length).toBeLessThanOrEqual(150);
  });

  it("đổi câu chữ khi gửi lại và gộp tối đa hai nhóm sản phẩm", () => {
    expect(getLeadProductLabel(["sofa_bed", "ergonomic_bed", "other"]))
      .toBe("Sofa giường và Giường công thái học");
    expect(buildZaloFriendRequestMessage({
      name: "Tam Le",
      assignedTo: "",
      interestedProducts: ["ergonomic_bed"],
    }, 2)).toContain("xin gửi lại lời mời");
  });
});
