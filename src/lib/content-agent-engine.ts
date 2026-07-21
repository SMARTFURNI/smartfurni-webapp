import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { CATEGORIES, type BlogCategory } from "./blog-data";
import { PRODUCT_FAMILIES } from "./product-families";
import {
  createContentItemId,
  createContentPlanId,
  type ContentPlan,
  type ContentPlanItem,
  type ContentQaResult,
  type FunnelStage,
} from "./content-agent-store";

const funnelStageSchema = z.enum(["TOFU", "MOFU", "BOFU"]);
const categorySchema = z.enum(["tips-giac-ngu", "huong-dan-su-dung", "cap-nhat-san-pham", "suc-khoe"]);

const planItemSchema = z.object({
  funnelStage: funnelStageSchema,
  title: z.string().min(12),
  primaryKeyword: z.string().min(2),
  secondaryKeywords: z.array(z.string()).default([]),
  searchIntent: z.string().min(3),
  audiencePainPoint: z.string().min(3),
  angle: z.string().min(3),
  outline: z.array(z.string()).min(3),
  cta: z.string().min(3),
  category: categorySchema,
  plannedWeek: z.number().int().min(1),
});

const planResponseSchema = z.object({
  strategySummary: z.string().min(20),
  items: z.array(planItemSchema).min(3),
});

const articleResponseSchema = z.object({
  title: z.string().min(12),
  excerpt: z.string().min(40),
  content: z.string().min(500),
  tags: z.array(z.string()).min(2),
  category: categorySchema,
  metaTitle: z.string().min(10),
  metaDescription: z.string().min(40),
  primaryKeyword: z.string().min(2),
  secondaryKeywords: z.array(z.string()).default([]),
  internalLinks: z.array(z.object({ anchor: z.string(), href: z.string() })).default([]),
  sources: z.array(z.object({ title: z.string(), url: z.string().url() })).default([]),
  reviewerRequired: z.boolean().default(false),
  riskNotes: z.array(z.string()).default([]),
});

export interface ContentPlanInput {
  name: string;
  goal: string;
  audience: string;
  productFamilySlug: string;
  horizonWeeks: number;
  weeklyCadence: number;
}

export type GeneratedArticle = z.infer<typeof articleResponseSchema>;

function parseJsonResponse(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("AI không trả về JSON hợp lệ");
  return JSON.parse(cleaned.slice(first, last + 1));
}

async function generateJson(prompt: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY chưa được cấu hình");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    generationConfig: { temperature: 0.55, maxOutputTokens: 16384, responseMimeType: "application/json" },
  });
  const result = await model.generateContent(prompt);
  return parseJsonResponse(result.response.text());
}

function productContext(slug: string): string {
  const family = PRODUCT_FAMILIES.find((item) => item.slug === slug) || PRODUCT_FAMILIES[0];
  return [
    `Dòng sản phẩm: ${family.label}`,
    `Mô tả đã được xác nhận: ${family.description}`,
    `Thông tin nền: ${family.intro}`,
    `Lợi ích được phép dùng: ${family.benefits.join("; ")}`,
    `Trang đích nội bộ: /products/${family.slug}`,
  ].join("\n");
}

const SAFETY_RULES = `
QUY TẮC BIÊN TẬP BẮT BUỘC:
- Không tự tạo số liệu, nghiên cứu, chứng nhận, giải thưởng, giá, bảo hành, đánh giá khách hàng hoặc tên/chức danh chuyên gia.
- Không nói sản phẩm chữa, điều trị hoặc phòng bệnh. Nội dung sức khỏe chỉ mang tính tham khảo, phải nêu nguồn đáng tin cậy và đánh dấu cần người có chuyên môn duyệt.
- Khi thiếu dữ liệu thực tế, viết rõ [CẦN SMARTFURNI XÁC NHẬN], không điền một con số có vẻ hợp lý.
- Không sao chép câu chữ của website tham khảo. Chỉ học cấu trúc hub, phân loại chủ đề, heading, liên kết nội bộ và khối bài liên quan.
- TOFU: giải đáp nhu cầu rộng, CTA đọc tiếp/tải checklist. MOFU: so sánh, hướng dẫn chọn, CTA xem dòng sản phẩm/tư vấn. BOFU: ý định mua cao, CTA xem sản phẩm/đặt lịch/tư vấn.
- Mọi bài tạo ra chỉ là BẢN NHÁP, không tự xuất bản.
`;

export async function generateContentPlan(input: ContentPlanInput): Promise<ContentPlan> {
  const family = PRODUCT_FAMILIES.find((item) => item.slug === input.productFamilySlug) || PRODUCT_FAMILIES[0];
  const requestedCount = Math.max(3, Math.min(48, input.horizonWeeks * input.weeklyCadence));
  const prompt = `Bạn là AI Content Strategist tiếng Việt cho SmartFurni.

Hãy lập kế hoạch ${requestedCount} bài trong ${input.horizonWeeks} tuần, đúng ${input.weeklyCadence} bài/tuần, trải đều theo hành trình TOFU-MOFU-BOFU. Tỷ lệ mục tiêu 50% TOFU, 30% MOFU, 20% BOFU (có thể lệch 1 bài do làm tròn).

Tên chiến dịch: ${input.name}
Mục tiêu: ${input.goal}
Đối tượng: ${input.audience}
${productContext(input.productFamilySlug)}

Tham chiếu phương pháp: xây hub chủ đề và nội dung thực hành có taxonomy rõ; bài chi tiết có breadcrumb, H2/H3, tác giả/ngày, nguồn, bài liên quan và CTA theo hành trình.
${SAFETY_RULES}

Chỉ trả JSON theo cấu trúc:
{
  "strategySummary": "...",
  "items": [{
    "funnelStage": "TOFU|MOFU|BOFU",
    "title": "...",
    "primaryKeyword": "...",
    "secondaryKeywords": ["..."],
    "searchIntent": "...",
    "audiencePainPoint": "...",
    "angle": "...",
    "outline": ["H2 ...", "H2 ...", "H2 ..."],
    "cta": "...",
    "category": "tips-giac-ngu|huong-dan-su-dung|cap-nhat-san-pham|suc-khoe",
    "plannedWeek": 1
  }]
}`;

  const parsed = planResponseSchema.parse(await generateJson(prompt));
  if (parsed.items.length < requestedCount) {
    throw new Error(`AI chỉ trả về ${parsed.items.length}/${requestedCount} brief. Vui lòng tạo lại kế hoạch.`);
  }
  const now = new Date().toISOString();
  const items = parsed.items.slice(0, requestedCount).map((item, index): ContentPlanItem => ({
    ...item,
    plannedWeek: Math.min(input.horizonWeeks, Math.max(1, item.plannedWeek)),
    id: createContentItemId(index),
    status: "idea",
  }));
  const allocation = items.reduce<Record<FunnelStage, number>>(
    (acc, item) => ({ ...acc, [item.funnelStage]: acc[item.funnelStage] + 1 }),
    { TOFU: 0, MOFU: 0, BOFU: 0 },
  );
  return {
    id: createContentPlanId(),
    ...input,
    productFamilyLabel: family.label,
    strategySummary: parsed.strategySummary,
    funnelAllocation: allocation,
    items,
    createdAt: now,
    updatedAt: now,
  };
}

export async function generateArticleDraft(plan: ContentPlan, item: ContentPlanItem): Promise<GeneratedArticle> {
  const prompt = `Bạn là AI Content Writer và SEO Editor tiếng Việt của SmartFurni. Viết một bài hoàn chỉnh từ brief đã được admin duyệt.

CHIẾN LƯỢC: ${plan.strategySummary}
ĐỐI TƯỢNG: ${plan.audience}
MỤC TIÊU: ${plan.goal}
GIAI ĐOẠN: ${item.funnelStage}
TIÊU ĐỀ GỢI Ý: ${item.title}
TỪ KHÓA CHÍNH: ${item.primaryKeyword}
TỪ KHÓA PHỤ: ${item.secondaryKeywords.join(", ")}
SEARCH INTENT: ${item.searchIntent}
NỖI ĐAU: ${item.audiencePainPoint}
GÓC TRIỂN KHAI: ${item.angle}
DÀN Ý: ${item.outline.join(" | ")}
CTA: ${item.cta}
${productContext(plan.productFamilySlug)}
${SAFETY_RULES}

Yêu cầu bài:
- 900-1600 từ, Markdown thuần; không có H1 trong content vì title là H1.
- Mở bài trả lời trực tiếp search intent, sau đó H2/H3 rõ ràng, đoạn ngắn, danh sách khi hữu ích.
- Có ít nhất 2 liên kết nội bộ hợp lý; dùng đúng URL trang dòng sản phẩm đã cung cấp và /blog.
- Nếu đề cập sức khỏe, tách rõ thông tin tham khảo, nguồn và khuyến nghị gặp chuyên gia phù hợp; reviewerRequired=true.
- Không chèn ảnh giả. Không dùng lời khẳng định tuyệt đối.

Chỉ trả JSON:
{
  "title": "...", "excerpt": "...", "content": "...", "tags": ["..."],
  "category": "${item.category}", "metaTitle": "...", "metaDescription": "...",
  "primaryKeyword": "...", "secondaryKeywords": ["..."],
  "internalLinks": [{"anchor":"...","href":"/..."}],
  "sources": [{"title":"...","url":"https://..."}],
  "reviewerRequired": false, "riskNotes": []
}`;
  return articleResponseSchema.parse(await generateJson(prompt));
}

export function evaluateArticle(article: GeneratedArticle, item: ContentPlanItem): ContentQaResult {
  const words = article.content.trim().split(/\s+/).filter(Boolean).length;
  const headings = (article.content.match(/^##\s+/gm) || []).length;
  const internalLinks = article.internalLinks.filter((link) => link.href.startsWith("/"));
  const riskFlags = [...article.riskNotes];
  const riskyPatterns = [
    /\b\d+(?:[.,]\d+)?\s*%/i,
    /\b(chữa khỏi|điều trị|phòng bệnh|cam kết|đảm bảo 100%)\b/i,
    /\b(theo nghiên cứu|chuyên gia khẳng định|bác sĩ khuyên)\b/i,
  ];
  riskyPatterns.forEach((pattern) => {
    if (pattern.test(`${article.title} ${article.content}`)) {
      riskFlags.push(`Cần xác minh claim khớp mẫu: ${pattern.source}`);
    }
  });
  if ((article.category === "suc-khoe" || article.reviewerRequired) && article.sources.length === 0) {
    riskFlags.push("Nội dung sức khỏe chưa có nguồn tham khảo");
  }

  const checks = [
    { key: "word_count", label: "Độ dài 900–1.600 từ", passed: words >= 900 && words <= 1600, note: `${words} từ` },
    { key: "structure", label: "Có ít nhất 3 heading H2", passed: headings >= 3, note: `${headings} heading H2` },
    { key: "keyword", label: "Có từ khóa chính", passed: article.content.toLocaleLowerCase("vi").includes(item.primaryKeyword.toLocaleLowerCase("vi")), note: item.primaryKeyword },
    { key: "internal_links", label: "Có ít nhất 2 liên kết nội bộ", passed: internalLinks.length >= 2, note: `${internalLinks.length} liên kết` },
    { key: "meta_title", label: "Meta title hợp lý", passed: article.metaTitle.length >= 35 && article.metaTitle.length <= 65, note: `${article.metaTitle.length} ký tự` },
    { key: "meta_description", label: "Meta description hợp lý", passed: article.metaDescription.length >= 120 && article.metaDescription.length <= 165, note: `${article.metaDescription.length} ký tự` },
    { key: "claim_safety", label: "Không có claim cần xác minh", passed: riskFlags.length === 0, note: riskFlags.length ? `${riskFlags.length} cảnh báo` : "Không phát hiện" },
  ];
  const passedCount = checks.filter((check) => check.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  return { score, passed: score >= 80 && riskFlags.length === 0, checks, riskFlags };
}

export function categoryLabel(category: BlogCategory): string {
  return CATEGORIES[category].label;
}
