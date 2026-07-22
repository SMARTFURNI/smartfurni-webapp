import "server-only";

import { createHash } from "crypto";
import type { BlogArticleImage, BlogArticleImagePlan, BlogPost } from "./blog-data";

export interface ArticleImageProductReference {
  name: string;
  slug: string;
  description: string;
  imageUrls: string[];
}

interface MarkdownHeading {
  level: number;
  title: string;
  anchor: string;
  index: number;
}

const BRAND_DIRECTION = [
  "Phong cách hình ảnh SmartFurni cao cấp, hiện đại và tối giản",
  "bảng màu xanh navy than đậm, graphite và ánh vàng champagne tinh tế",
  "ánh sáng điện ảnh mềm, không gian nội thất Việt Nam đương đại",
  "hình ảnh chân thực, bố cục sạch, phù hợp bài báo chuyên sâu",
  "không chèn chữ, không watermark, không logo giả, không tạo tuyên bố y khoa",
].join(", ");

function plainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`~|\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyHeading(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function extractMarkdownHeadings(content: string): MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const duplicateCount = new Map<string, number>();

  content.split("\n").forEach((line, index) => {
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line.trim());
    if (!match) return;
    const title = match[2].replace(/[*_`]/g, "").trim();
    const base = slugifyHeading(title) || `muc-${index + 1}`;
    const count = duplicateCount.get(base) || 0;
    duplicateCount.set(base, count + 1);
    headings.push({
      level: match[1].length,
      title,
      anchor: count === 0 ? base : `${base}-${count + 1}`,
      index,
    });
  });

  return headings;
}

export function getArticleImageFingerprint(post: BlogPost): string {
  return createHash("sha256")
    .update(JSON.stringify({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      primaryKeyword: post.primaryKeyword,
      funnelStage: post.funnelStage,
      productSlugs: post.productRecommendation?.productSlugs || [],
    }))
    .digest("hex")
    .slice(0, 20);
}

function productContext(products: ArticleImageProductReference[]): string {
  if (products.length === 0) {
    return "Không tập trung mô tả chính xác một mẫu sản phẩm cụ thể; ưu tiên bối cảnh và giá trị sử dụng.";
  }
  return `Sản phẩm liên quan: ${products.map((product) => `${product.name} (${product.description})`).join("; ")}. Khi cần thể hiện đúng sản phẩm, dùng ảnh tham chiếu chính thức và không tự ý thay đổi cấu trúc, vật liệu hoặc màu sắc.`;
}

function buildPrompt(args: {
  post: BlogPost;
  role: "cover" | "content";
  sectionTitle?: string;
  products: ArticleImageProductReference[];
}): string {
  const { post, role, sectionTitle, products } = args;
  const keyword = post.primaryKeyword || post.pillarKeyword || post.title;
  const scene = role === "cover"
    ? `Ảnh bìa kể câu chuyện tổng quan cho bài viết “${post.title}”, làm nổi bật chủ đề “${keyword}” với một tiêu điểm thị giác rõ ràng và khoảng thở tự nhiên.`
    : `Ảnh minh họa cho phần “${sectionTitle || post.title}” trong bài viết “${post.title}”; hình ảnh phải giúp người đọc hiểu nội dung phần này ngay cả khi không có chữ trên ảnh.`;

  return [
    scene,
    `Tóm tắt nội dung: ${post.excerpt}`,
    productContext(products),
    BRAND_DIRECTION,
    role === "cover"
      ? "Bố cục ngang 16:9, chủ thể nằm trong vùng an toàn trung tâm để dùng tốt trên desktop và mobile."
      : "Bố cục ngang 3:2, có chiều sâu, tự nhiên như ảnh biên tập tạp chí; tránh bố cục quảng cáo cứng.",
  ].join("\n");
}

function pickContentHeadings(headings: MarkdownHeading[], count: number): MarkdownHeading[] {
  const major = headings.filter((heading) => heading.level === 2);
  const pool = major.length >= count ? major : headings;
  if (pool.length <= count) return pool.slice(0, count);

  const chosen: MarkdownHeading[] = [];
  for (let i = 0; i < count; i += 1) {
    const rawIndex = Math.round(((i + 1) * (pool.length + 1)) / (count + 1)) - 1;
    const candidate = pool[Math.max(0, Math.min(pool.length - 1, rawIndex))];
    if (candidate && !chosen.some((item) => item.anchor === candidate.anchor)) chosen.push(candidate);
  }
  return chosen;
}

export function createArticleImagePlan(
  post: BlogPost,
  products: ArticleImageProductReference[],
): { images: BlogArticleImage[]; plan: BlogArticleImagePlan } {
  const headings = extractMarkdownHeadings(post.content);
  const wordCount = plainText(post.content).split(/\s+/).filter(Boolean).length;
  const majorHeadingCount = headings.filter((heading) => heading.level === 2).length;
  const contentImageCount = wordCount > 1500 || majorHeadingCount > 4 ? 3 : 2;
  const selectedHeadings = pickContentHeadings(headings, contentImageCount);
  const fingerprint = getArticleImageFingerprint(post);
  const referenceImageUrls = products.flatMap((product) => product.imageUrls).filter(Boolean).slice(0, 6);

  const cover: BlogArticleImage = {
    id: `cover-${fingerprint}`,
    role: "cover",
    order: 0,
    prompt: buildPrompt({ post, role: "cover", products }),
    alt: `${post.title} - hình ảnh minh họa SmartFurni`,
    caption: "Hình ảnh minh họa cho bài viết từ SmartFurni.",
    aspectRatio: "16:9",
    status: "planned",
    version: 1,
    regenerationCount: 0,
    referenceImageUrls,
  };

  const contentImages: BlogArticleImage[] = selectedHeadings.map((heading, index) => ({
    id: `content-${index + 1}-${fingerprint}`,
    role: "content",
    sectionAnchor: heading.anchor,
    sectionTitle: heading.title,
    order: index + 1,
    prompt: buildPrompt({ post, role: "content", sectionTitle: heading.title, products }),
    alt: `${heading.title} - minh họa trong bài ${post.title}`,
    caption: `Minh họa: ${heading.title}.`,
    aspectRatio: "3:2",
    status: "planned",
    version: 1,
    regenerationCount: 0,
    referenceImageUrls,
  }));

  return {
    images: [cover, ...contentImages],
    plan: {
      fingerprint,
      generatedAt: new Date().toISOString(),
      wordCount,
      headingCount: headings.length,
      status: "draft",
    },
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function imageMarkdown(image: BlogArticleImage): string {
  const caption = image.caption?.trim() ? `\n*${image.caption.trim()}*` : "";
  return [
    `<!-- SMARTFURNI_AI_IMAGE:${image.id}:START -->`,
    `![${image.alt.replace(/\]/g, "")}](${image.url})${caption}`,
    `<!-- SMARTFURNI_AI_IMAGE:${image.id}:END -->`,
  ].join("\n");
}

export function applyApprovedImagesToMarkdown(content: string, images: BlogArticleImage[]): string {
  let next = content;
  const approved = images
    .filter((image) => image.role === "content" && image.status === "approved" && image.url)
    .sort((a, b) => a.order - b.order);

  approved.forEach((image) => {
    const blockPattern = new RegExp(
      `\\n?<!-- SMARTFURNI_AI_IMAGE:${escapeRegExp(image.id)}:START -->[\\s\\S]*?<!-- SMARTFURNI_AI_IMAGE:${escapeRegExp(image.id)}:END -->\\n?`,
      "g",
    );
    next = next.replace(blockPattern, "\n");

    const headingTitle = image.sectionTitle?.trim();
    if (!headingTitle) {
      next = `${next.trim()}\n\n${imageMarkdown(image)}\n`;
      return;
    }

    const headingPattern = new RegExp(`(^#{2,3}\\s+${escapeRegExp(headingTitle)}\\s*$)`, "mi");
    if (headingPattern.test(next)) {
      next = next.replace(headingPattern, `$1\n\n${imageMarkdown(image)}`);
    } else {
      next = `${next.trim()}\n\n${imageMarkdown(image)}\n`;
    }
  });

  return next.replace(/\n{4,}/g, "\n\n\n").trim();
}
