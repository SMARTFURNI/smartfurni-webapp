import { describe, expect, it } from "vitest";
import { defaultZaloFollowLandingConfig, normalizeZaloFollowLandingConfig } from "@/lib/zalo-follow-content";

describe("Zalo follow editable landing content", () => {
  it("creates complete product-aware defaults", () => {
    const config = defaultZaloFollowLandingConfig("sofa_bed", ["Xem mẫu", "Nhận báo giá"]);
    expect(config.trustStats).toHaveLength(4);
    expect(config.reasonCards[0].title).toBe("Xem mẫu");
    expect(config.leadOptions[0].label).toContain("Sofa");
    expect(config.qualifierValues).toContain("1m6");
  });

  it("sanitizes editable blocks and keeps optional testimonials empty", () => {
    const config = normalizeZaloFollowLandingConfig({
      authorityLabel: "Chuyên viên SmartFurni",
      trustStats: [{ value: "Miễn phí", label: "Tư vấn" }],
      reasonCards: [{ title: "Báo giá rõ ràng", description: "Theo kích thước" }],
      testimonials: [],
      leadOptions: [{ label: "Mẫu A", description: "Mô tả", badge: "Mới", price: "Liên hệ", image: "/a.webp" }],
      qualifierLabel: "Kích thước",
      qualifierValues: ["1m6", "1m8"],
    }, "sofa_bed");
    expect(config.authorityLabel).toBe("Chuyên viên SmartFurni");
    expect(config.trustStats).toEqual([{ value: "Miễn phí", label: "Tư vấn" }]);
    expect(config.testimonials).toEqual([]);
    expect(config.leadOptions[0]).toMatchObject({ label: "Mẫu A", badge: "Mới", image: "/a.webp" });
    expect(config.qualifierValues).toEqual(["1m6", "1m8"]);
  });
});
