import OpenAI from "openai";
import { randomUUID } from "crypto";
import type { AdCampaignDraft, AIAdDraftOutput, CampaignInput, GoogleAdsProduct, KeywordDraft } from "@/lib/google-ads-agent/types";
import { validateAIOutput, validateCampaignInput } from "@/lib/google-ads-agent/validation";

const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export class AIAdGenerator {
  async generateDraft(input: CampaignInput, product: GoogleAdsProduct, createdBy: string): Promise<AdCampaignDraft> {
    const inputErrors = validateCampaignInput(input);
    if (inputErrors.length > 0) {
      return this.toDraft(input, product, fallbackOutput(input, product), createdBy, inputErrors, "validation-only");
    }

    let output: AIAdDraftOutput;
    let model = "smartfurni-rules-fallback";

    if (process.env.OPENAI_API_KEY) {
      try {
        output = await this.generateWithOpenAI(input, product);
        model = MODEL;
      } catch (error) {
        console.error("[AIAdGenerator] OpenAI failed, using fallback:", (error as Error).message);
        output = fallbackOutput(input, product);
      }
    } else {
      output = fallbackOutput(input, product);
    }

    const errors = validateAIOutput(output, product);
    return this.toDraft(input, product, output, createdBy, errors, model);
  }

  private async generateWithOpenAI(input: CampaignInput, product: GoogleAdsProduct): Promise<AIAdDraftOutput> {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Bạn là Google Ads strategist cho SmartFurni. Chỉ trả về JSON hợp lệ, không markdown. Tuân thủ giới hạn: headline <=30 ký tự, description <=90 ký tự. Không dùng claim chữa khỏi bệnh, tốt nhất Việt Nam, giá rẻ nhất.",
        },
        {
          role: "user",
          content: JSON.stringify({
            requirement: {
              keywords: "20-50",
              negativeKeywords: "10-15",
              headlines: 15,
              descriptions: 4,
              sitelinks: 4,
              callouts: 10,
              structuredSnippet: 1,
            },
            smartfurniRules: [
              "Sản xuất tại Việt Nam",
              "Nhận đặt size, màu theo yêu cầu",
              "Giao lắp tận nơi",
              "Bảo hành 5 năm",
              "Tiết kiệm diện tích",
              "Khung thép chắc chắn",
              "Phù hợp căn hộ nhỏ, nhà có khách ở lại",
            ],
            input,
            product,
          }),
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI empty content");
    return normalizeOutput(JSON.parse(content), product);
  }

  private toDraft(
    input: CampaignInput,
    product: GoogleAdsProduct,
    output: AIAdDraftOutput,
    createdBy: string,
    validationErrors: string[],
    aiModel: string
  ): AdCampaignDraft {
    const now = new Date().toISOString();
    return {
      id: randomUUID(),
      input,
      product,
      output,
      status: "ai_created",
      validationErrors,
      aiModel,
      createdBy,
      createdAt: now,
      updatedAt: now,
    };
  }
}

function normalizeOutput(value: AIAdDraftOutput, product: GoogleAdsProduct): AIAdDraftOutput {
  return {
    campaignName: String(value.campaignName || `SF ${product.sku}`),
    adGroupName: String(value.adGroupName || `${product.sku} Ads`),
    keywords: Array.isArray(value.keywords) ? value.keywords.slice(0, 50) : [],
    negativeKeywords: Array.isArray(value.negativeKeywords) ? value.negativeKeywords.slice(0, 15) : [],
    headlines: (Array.isArray(value.headlines) ? value.headlines : []).map(String).slice(0, 15),
    descriptions: (Array.isArray(value.descriptions) ? value.descriptions : []).map(String).slice(0, 4),
    sitelinks: Array.isArray(value.sitelinks) ? value.sitelinks.slice(0, 4) : [],
    callouts: (Array.isArray(value.callouts) ? value.callouts : []).map(String).slice(0, 10),
    structuredSnippet: value.structuredSnippet || { header: "Dịch vụ", values: ["Đặt size", "Giao lắp", "Bảo hành"] },
    landingPageUrl: product.landingPageUrl,
    suggestedDailyBudget: Number(value.suggestedDailyBudget || 300000),
    strategyReason: String(value.strategyReason || "Tập trung nhóm keyword có ý định mua cao."),
  };
}

function fallbackOutput(input: CampaignInput, product: GoogleAdsProduct): AIAdDraftOutput {
  const lineLabel = product.productLine === "giuong_y_te" ? "Giường Y Tế" : product.productLine === "ban_si_dai_ly" ? "Bán Sỉ Đại Lý" : product.productLine === "giuong_cong_thai_hoc" ? "Giường Nâng Hạ" : "Sofa Giường";
  const location = input.location === "Toan quoc" ? "Toàn Quốc" : input.location === "Ha Noi" ? "Hà Nội" : input.location === "Binh Duong" ? "Bình Dương" : input.location === "Dong Nai" ? "Đồng Nai" : input.location;
  const base = product.productLine === "giuong_y_te" ? "giường y tế" : product.productLine === "giuong_cong_thai_hoc" ? "giường nâng hạ" : "sofa giường";
  const keywordSeeds = [
    `${base} ${product.sku}`,
    `${base} thông minh`,
    `${base} ${location}`,
    `${base} giá tốt`,
    `${base} đặt size`,
    `${base} bảo hành 5 năm`,
    `${base} giao lắp tận nơi`,
    `${base} khung thép`,
    `${base} căn hộ nhỏ`,
    `${base} smartfurni`,
    `${product.sku} giá`,
    `${product.sku} mua ở đâu`,
    `${product.sku} ${location}`,
    `nội thất thông minh ${location}`,
    `giường sofa thông minh`,
    `giường gấp thông minh`,
    `sofa bed thông minh`,
    `giường điều chỉnh điện`,
    `khung giường nâng hạ`,
    `đặt làm ${base}`,
    `${base} cao cấp`,
    `${base} Việt Nam`,
    `${base} theo yêu cầu`,
    `showroom smartfurni`,
  ];
  const keywords: KeywordDraft[] = keywordSeeds.map((keyword, index) => ({
    keyword,
    matchType: index % 3 === 0 ? "exact" : index % 3 === 1 ? "phrase" : "broad",
    intent: index < 12 ? "high" : "medium",
    negative: false,
  }));
  const negativeKeywords = ["miễn phí", "cũ", "thanh lý", "tự làm", "bản vẽ", "pdf", "sửa chữa", "việc làm", "tuyển dụng", "review xấu"].map((keyword) => ({
    keyword,
    matchType: "phrase" as const,
    intent: "low" as const,
    negative: true,
  }));

  return {
    campaignName: `SF ${lineLabel} ${location}`,
    adGroupName: `${product.sku} ${objectiveLabel(input.objective)}`,
    keywords,
    negativeKeywords,
    headlines: [
      `${product.sku} SmartFurni`,
      `${lineLabel} Thông Minh`,
      "Đặt Size Theo Yêu Cầu",
      "Giao Lắp Tận Nơi",
      "Bảo Hành 5 Năm",
      "Khung Thép Chắc Chắn",
      "Tiết Kiệm Diện Tích",
      "Sản Xuất Tại Việt Nam",
      "Hợp Căn Hộ Nhỏ",
      "Chọn Màu Theo Nhà",
      "Tư Vấn Nhanh",
      "Đặt Lịch Showroom",
      "Nội Thất Thông Minh",
      "Thiết Kế Gọn Đẹp",
      "Giá Trị Sử Dụng Cao",
    ],
    descriptions: [
      `${product.name}. Đặt size, màu theo yêu cầu. Giao lắp tận nơi.`,
      "Khung thép chắc chắn, bảo hành 5 năm, tư vấn theo không gian nhà.",
      "Phù hợp căn hộ nhỏ, phòng đa năng và nhà có khách ở lại.",
      "Nhận báo giá nhanh, xem mẫu và chọn kích thước phù hợp.",
    ],
    sitelinks: [
      { text: "Xem Sản Phẩm", url: product.landingPageUrl },
      { text: "Đặt Lịch Tư Vấn", url: `${product.landingPageUrl}?lead=consult` },
      { text: "Bảo Hành 5 Năm", url: `${product.landingPageUrl}?section=warranty` },
      { text: "Giao Lắp Tận Nơi", url: `${product.landingPageUrl}?section=install` },
    ],
    callouts: [
      "Sản Xuất Tại VN",
      "Đặt Size Riêng",
      "Chọn Màu Theo Nhà",
      "Giao Lắp Tận Nơi",
      "Bảo Hành 5 Năm",
      "Khung Thép Chắc",
      "Tư Vấn Nhanh",
      "Tiết Kiệm Diện Tích",
      "Lắp Đặt Nhanh",
      "Hỗ Trợ Showroom",
    ],
    structuredSnippet: {
      header: "Dịch vụ",
      values: ["Đặt size", "Chọn màu", "Giao lắp", "Bảo hành"],
    },
    landingPageUrl: product.landingPageUrl,
    suggestedDailyBudget: Math.max(input.dailyBudget, product.productLine === "giuong_y_te" ? 500000 : 350000),
    strategyReason: `Tập trung keyword có ý định mua cao cho ${product.sku}, nhấn mạnh sản xuất tại Việt Nam, đặt size/màu và giao lắp tận nơi. Nhóm y tế chỉ nói về hỗ trợ chăm sóc, không đưa claim điều trị.`,
  };
}

function objectiveLabel(objective: string) {
  const labels: Record<string, string> = {
    messages: "Tin Nhắn",
    calls: "Gọi Điện",
    purchase: "Mua Hàng",
    showroom: "Showroom",
    dealer: "Đại Lý",
  };
  return labels[objective] ?? "Chiến Dịch";
}
