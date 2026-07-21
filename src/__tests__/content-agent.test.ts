import { describe, expect, it } from "vitest";
import { evaluateArticle, type GeneratedArticle } from "@/lib/content-agent-engine";
import type { ContentPlanItem } from "@/lib/content-agent-store";

const item: ContentPlanItem = {
  id: "brief-1",
  funnelStage: "TOFU",
  title: "Hướng dẫn lựa chọn tư thế nghỉ ngơi phù hợp",
  primaryKeyword: "tư thế nghỉ ngơi",
  secondaryKeywords: ["giấc ngủ", "nâng đầu giường"],
  searchIntent: "Tìm hiểu thông tin",
  audiencePainPoint: "Khó tìm tư thế thoải mái",
  angle: "Hướng dẫn thực tế, không đưa claim y tế",
  outline: ["Tư thế là gì", "Cách lựa chọn", "Khi nào cần tư vấn"],
  cta: "Đọc thêm hướng dẫn",
  category: "tips-giac-ngu",
  plannedWeek: 1,
  status: "approved",
};

function safeArticle(): GeneratedArticle {
  const body = Array.from({ length: 440 }, (_, index) => index % 20 === 0 ? "tư thế nghỉ ngơi" : "hướng dẫn").join(" ");
  return {
    title: "Hướng dẫn lựa chọn tư thế nghỉ ngơi phù hợp",
    excerpt: "Một hướng dẫn thực tế giúp người đọc cân nhắc tư thế nghỉ ngơi phù hợp với nhu cầu cá nhân.",
    content: `## Hiểu nhu cầu\n\n${body}\n\n[[SMARTFURNI_PRODUCTS]]\n\n## Các lựa chọn\n\nNội dung thực tế.\n\n[[SMARTFURNI_CTA]]\n\n## Cách thử an toàn\n\nTheo dõi cảm nhận cá nhân.`,
    tags: ["giấc ngủ", "tư thế"],
    category: "tips-giac-ngu",
    metaTitle: "Tư thế nghỉ ngơi: hướng dẫn lựa chọn phù hợp",
    metaDescription: "Tìm hiểu cách lựa chọn tư thế nghỉ ngơi phù hợp với nhu cầu cá nhân, các bước thử thực tế và những lưu ý cần biết trước khi áp dụng.",
    primaryKeyword: "tư thế nghỉ ngơi",
    secondaryKeywords: ["giấc ngủ"],
    internalLinks: [
      { anchor: "Xem bài viết", href: "/blog" },
      { anchor: "Xem sản phẩm", href: "/products" },
    ],
    sources: [],
    reviewerRequired: false,
    riskNotes: [],
    productBlock: {
      title: "Sản phẩm SmartFurni phù hợp",
      description: "Các lựa chọn liên quan trực tiếp đến nhu cầu nghỉ ngơi trong bài viết.",
      ctaLabel: "Xem dòng sản phẩm",
    },
    articleCta: {
      eyebrow: "Tìm hiểu thêm",
      title: "Chọn giải pháp phù hợp với nhu cầu",
      description: "Xem sản phẩm hoặc trao đổi cùng SmartFurni trước khi lựa chọn.",
      primaryLabel: "Xem sản phẩm",
      secondaryLabel: "Liên hệ tư vấn",
    },
  };
}

describe("AI Content Agent QA", () => {
  it("passes a complete and policy-safe draft", () => {
    const result = evaluateArticle(safeArticle(), item);
    expect(result.checks.filter((check) => !check.passed)).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.riskFlags).toEqual([]);
  });

  it("flags unsupported medical or statistical claims", () => {
    const article = safeArticle();
    article.content += "\n\nSản phẩm cam kết chữa khỏi và hiệu quả 100%.";
    const result = evaluateArticle(article, item);
    expect(result.passed).toBe(false);
    expect(result.riskFlags.length).toBeGreaterThan(0);
  });

  it("requires sources for health content", () => {
    const article = safeArticle();
    article.category = "suc-khoe";
    article.reviewerRequired = true;
    const result = evaluateArticle(article, { ...item, category: "suc-khoe" });
    expect(result.riskFlags).toContain("Nội dung sức khỏe chưa có nguồn tham khảo");
  });
});
