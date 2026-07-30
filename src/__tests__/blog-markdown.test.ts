import { describe, expect, it } from "vitest";
import { normalizeBlogMarkdown } from "@/lib/blog-markdown";

describe("normalizeBlogMarkdown", () => {
  it("separates labeled bold bullets that an AI joined on one line", () => {
    const input = [
      "### Ngủ nằm ngửa",
      "",
      "* **Ưu điểm:** Phân bổ trọng lượng đều. * **Nhược điểm:** Có thể làm tăng ngáy. * **Mẹo:** Chọn gối vừa phải.",
    ].join("\n");

    expect(normalizeBlogMarkdown(input)).toBe([
      "### Ngủ nằm ngửa",
      "",
      "- **Ưu điểm:** Phân bổ trọng lượng đều.",
      "- **Nhược điểm:** Có thể làm tăng ngáy.",
      "- **Mẹo:** Chọn gối vừa phải.",
    ].join("\n"));
  });

  it("downgrades unsupported deep headings and gives blocks blank lines", () => {
    const input = "Mở bài\n#### 1. Lợi ích\nNội dung\n[[SMARTFURNI_CTA]]\nKết luận";

    expect(normalizeBlogMarkdown(input)).toBe([
      "Mở bài",
      "",
      "### 1. Lợi ích",
      "",
      "Nội dung",
      "",
      "[[SMARTFURNI_CTA]]",
      "",
      "Kết luận",
    ].join("\n"));
  });

  it("is idempotent and leaves inline emphasis untouched", () => {
    const input = "## Tiêu đề\n\nĐây là *cụm từ nhấn mạnh* trong một đoạn văn.";
    const normalized = normalizeBlogMarkdown(input);

    expect(normalized).toBe(input);
    expect(normalizeBlogMarkdown(normalized)).toBe(normalized);
  });
});
