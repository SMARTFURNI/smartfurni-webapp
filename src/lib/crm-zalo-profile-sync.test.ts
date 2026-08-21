import { describe, expect, it } from "vitest";
import { buildZaloCrmAlias } from "./crm-zalo-profile-sync";

describe("buildZaloCrmAlias", () => {
  it("đưa tên, sản phẩm và ghi chú CRM vào tên gợi nhớ", () => {
    expect(buildZaloCrmAlias({
      name: "Tùng Nguyễn",
      company: "",
      interestedProducts: ["ergonomic_bed"],
      notes: "Ưu tiên gọi buổi chiều",
    })).toContain("Tùng Nguyễn · Giường công thái học · Ưu tiên gọi buổi chiều");
  });

  it("rút gọn dữ liệu dài theo giới hạn an toàn", () => {
    const alias = buildZaloCrmAlias({
      name: "Khách hàng dự án",
      company: "Công ty nội thất mẫu",
      interestedProducts: ["sofa_bed"],
      notes: "Cần tư vấn số lượng lớn cho toàn bộ hệ thống khách sạn và ưu tiên tiến độ gấp",
    });
    expect(alias.length).toBeLessThanOrEqual(80);
    expect(alias).toContain("Khách hàng dự án");
  });
});
