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
            "Ban la Google Ads strategist cho SmartFurni. Chi tra ve JSON hop le, khong markdown. Tuan thu gioi han: headline <=30 ky tu, description <=90 ky tu. Khong dung claim chua khoi benh, tot nhat Viet Nam, gia re nhat.",
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
              "San xuat tai Viet Nam",
              "Nhan dat size, mau theo yeu cau",
              "Giao lap tan noi",
              "Bao hanh 5 nam",
              "Tiet kiem dien tich",
              "Khung thep chac chan",
              "Phu hop can ho nho, nha co khach o lai",
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
    structuredSnippet: value.structuredSnippet || { header: "Dich vu", values: ["Dat size", "Giao lap", "Bao hanh"] },
    landingPageUrl: product.landingPageUrl,
    suggestedDailyBudget: Number(value.suggestedDailyBudget || 300000),
    strategyReason: String(value.strategyReason || "Tap trung nhom keyword co y dinh mua cao."),
  };
}

function fallbackOutput(input: CampaignInput, product: GoogleAdsProduct): AIAdDraftOutput {
  const lineLabel = product.productLine === "giuong_y_te" ? "Giuong Y Te" : product.productLine === "ban_si_dai_ly" ? "Ban Si Dai Ly" : product.productLine === "giuong_cong_thai_hoc" ? "Giuong Nang Ha" : "Sofa Giuong";
  const location = input.location === "Toan quoc" ? "Toan Quoc" : input.location;
  const base = product.productLine === "giuong_y_te" ? "giuong y te" : product.productLine === "giuong_cong_thai_hoc" ? "giuong nang ha" : "sofa giuong";
  const keywordSeeds = [
    `${base} ${product.sku}`,
    `${base} thong minh`,
    `${base} ${location}`,
    `${base} gia tot`,
    `${base} dat size`,
    `${base} bao hanh 5 nam`,
    `${base} giao lap tan noi`,
    `${base} khung thep`,
    `${base} can ho nho`,
    `${base} smartfurni`,
    `${product.sku} gia`,
    `${product.sku} mua o dau`,
    `${product.sku} ${location}`,
    `noi that thong minh ${location}`,
    `giuong sofa thong minh`,
    `giuong gap thong minh`,
    `sofa bed thong minh`,
    `giuong dieu chinh dien`,
    `khung giuong nang ha`,
    `dat lam ${base}`,
    `${base} cao cap`,
    `${base} viet nam`,
    `${base} theo yeu cau`,
    `showroom smartfurni`,
  ];
  const keywords: KeywordDraft[] = keywordSeeds.map((keyword, index) => ({
    keyword,
    matchType: index % 3 === 0 ? "exact" : index % 3 === 1 ? "phrase" : "broad",
    intent: index < 12 ? "high" : "medium",
    negative: false,
  }));
  const negativeKeywords = ["mien phi", "cu", "thanh ly", "tu lam", "ban ve", "pdf", "sua chua", "viec lam", "tuyen dung", "review xau"].map((keyword) => ({
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
      `${lineLabel} Thong Minh`,
      "Dat Size Theo Yeu Cau",
      "Giao Lap Tan Noi",
      "Bao Hanh 5 Nam",
      "Khung Thep Chac Chan",
      "Tiet Kiem Dien Tich",
      "San Xuat Tai Viet Nam",
      "Hop Can Ho Nho",
      "Nhan Chon Mau Rieng",
      "Tu Van Nhanh",
      "Dat Lich Showroom",
      "Noi That Thong Minh",
      "Thiet Ke Gon Dep",
      "Gia Tri Su Dung Cao",
    ],
    descriptions: [
      `${product.name}. Dat size, mau theo yeu cau. Giao lap tan noi.`,
      "Khung thep chac chan, bao hanh 5 nam, tu van theo khong gian nha.",
      "Phu hop can ho nho, phong da nang va nha co khach o lai.",
      "Nhan bao gia nhanh, xem mau va chon kich thuoc phu hop.",
    ],
    sitelinks: [
      { text: "Xem San Pham", url: product.landingPageUrl },
      { text: "Dat Lich Tu Van", url: `${product.landingPageUrl}?lead=consult` },
      { text: "Bao Hanh 5 Nam", url: `${product.landingPageUrl}?section=warranty` },
      { text: "Giao Lap Tan Noi", url: `${product.landingPageUrl}?section=install` },
    ],
    callouts: [
      "San Xuat Tai VN",
      "Dat Size Rieng",
      "Chon Mau Theo Nha",
      "Giao Lap Tan Noi",
      "Bao Hanh 5 Nam",
      "Khung Thep Chac",
      "Tu Van Mien Phi",
      "Tiet Kiem Dien Tich",
      "Lap Dat Nhanh",
      "Ho Tro Showroom",
    ],
    structuredSnippet: {
      header: "Dich vu",
      values: ["Dat size", "Chon mau", "Giao lap", "Bao hanh"],
    },
    landingPageUrl: product.landingPageUrl,
    suggestedDailyBudget: Math.max(input.dailyBudget, product.productLine === "giuong_y_te" ? 500000 : 350000),
    strategyReason: `Tap trung keyword y dinh mua cao cho ${product.sku}, nhan manh san xuat tai Viet Nam, dat size/mau va giao lap tan noi. Nhom y te chi noi ve ho tro cham soc, khong dua claim dieu tri.`,
  };
}

function objectiveLabel(objective: string) {
  const labels: Record<string, string> = {
    messages: "Tin Nhan",
    calls: "Goi Dien",
    purchase: "Mua Hang",
    showroom: "Showroom",
    dealer: "Dai Ly",
  };
  return labels[objective] ?? "Chien Dich";
}
