import { NextResponse } from "next/server";
import { generateObject } from "ai";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createDraftCampaign } from "@/lib/googleAds";
import { adDataSchema, type AdData, type PromotionalProduct } from "@/types/ads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAIModel() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(process.env.GOOGLE_ADS_AI_MODEL || "gemini-1.5-pro-latest");
  }

  if (process.env.GOOGLE_API_KEY) {
    const googleWithApiKey = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_API_KEY });
    return googleWithApiKey(process.env.GOOGLE_ADS_AI_MODEL || "gemini-1.5-pro-latest");
  }

  if (process.env.OPENAI_API_KEY) {
    return openai(process.env.OPENAI_MODEL || "gpt-4.1-mini");
  }

  throw new Error("Thiếu GOOGLE_GENERATIVE_AI_API_KEY/GOOGLE_API_KEY hoặc OPENAI_API_KEY");
}

async function getLatestPromotionalProduct(): Promise<PromotionalProduct> {
  // MVP: mock dữ liệu sản phẩm. Sau này có thể thay bằng truy vấn DB thật:
  // SELECT * FROM products WHERE status='active' AND is_promotion=true ORDER BY updated_at DESC LIMIT 1
  return {
    id: "gsf150",
    name: "Giường Điều Chỉnh Điện GSF150",
    category: "Giường công thái học",
    description:
      "Giường điều chỉnh điện SmartFurni, nâng đầu/nâng chân, remote dễ dùng, khung chắc chắn, phù hợp căn hộ hiện đại và gia đình cần nghỉ ngơi tiện nghi.",
    landingPageUrl: "https://www.smartfurni.com.vn/lp/gsf150",
  };
}

async function sendTelegramNotification(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[generate-ads] Bỏ qua Telegram vì thiếu TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID");
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Telegram HTTP ${response.status}: ${text}`);
    }
  } catch (error) {
    // Không throw tiếp để lỗi gửi Telegram không làm che mất kết quả chính của cron.
    console.error("[generate-ads] Lỗi gửi Telegram:", error);
  }
}

function buildPrompt(product: PromotionalProduct) {
  return `
Sản phẩm cần quảng cáo:
- Tên: ${product.name}
- Danh mục: ${product.category}
- Mô tả: ${product.description}
- Landing page: ${product.landingPageUrl}

Yêu cầu đầu ra:
- campaignName: tên chiến dịch rõ ràng, có SmartFurni và danh mục.
- budget: ngân sách ngày bằng VND, dạng số, đề xuất hợp lý cho chiến dịch thử nghiệm.
- keywords: 20-50 từ khóa có ý định mua cao.
- negativeKeywords: 10-20 từ khóa phủ định để lọc traffic kém chất lượng.
- headlines: đúng 15 headline, mỗi headline tối đa 30 ký tự.
- descriptions: đúng 4 description, mỗi description tối đa 90 ký tự.
`;
}

async function generateAdData(product: PromotionalProduct): Promise<AdData> {
  try {
    const result = await generateObject({
      model: getAIModel(),
      schema: adDataSchema,
      system:
        "Bạn là chuyên gia PPC Google Ads cho ngành nội thất cao cấp tại Việt Nam. " +
        "Bạn tối ưu chiến dịch Search cho SmartFurni, tập trung ý định mua, lọc từ khóa rác, " +
        "viết headline ngắn, rõ lợi ích, không dùng claim y tế quá mức, không nói 'chữa khỏi bệnh', " +
        "không nói 'tốt nhất Việt Nam' hoặc 'giá rẻ nhất'. " +
        "Ưu tiên thông điệp: sản xuất tại Việt Nam, đặt size/màu theo yêu cầu, giao lắp tận nơi, " +
        "bảo hành 5 năm, tiết kiệm diện tích, khung chắc chắn, phù hợp căn hộ nhỏ.",
      prompt: buildPrompt(product),
    });

    // Vẫn parse lại bằng Zod để đảm bảo dữ liệu không lọt qua nếu provider thay đổi hành vi.
    return adDataSchema.parse(result.object);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi AI không xác định";
    throw new Error(`Không sinh được dữ liệu quảng cáo từ AI: ${message}`);
  }
}

export async function POST() {
  let product: PromotionalProduct | null = null;

  try {
    product = await getLatestPromotionalProduct();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi lấy sản phẩm";
    await sendTelegramNotification(`❌ <b>Google Ads Cron thất bại</b>\nKhông lấy được sản phẩm: ${message}`);
    return NextResponse.json({ ok: false, step: "product", error: message }, { status: 500 });
  }

  let adData: AdData;
  try {
    adData = await generateAdData(product);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi AI";
    await sendTelegramNotification(
      `❌ <b>Google Ads Cron thất bại</b>\nSản phẩm: ${product.name}\nLỗi AI: ${message}`
    );
    return NextResponse.json({ ok: false, step: "ai", error: message }, { status: 500 });
  }

  try {
    const googleAdsResult = await createDraftCampaign(adData);

    await sendTelegramNotification(
      [
        "✅ <b>Đã tạo Google Ads campaign PAUSED</b>",
        `Sản phẩm: ${product.name}`,
        `Campaign: ${adData.campaignName}`,
        `Budget/ngày: ${adData.budget.toLocaleString("vi-VN")} VND`,
        `Keywords: ${adData.keywords.length}`,
        `Headlines: ${adData.headlines.length}`,
        `Campaign resource: ${googleAdsResult.campaignResourceName}`,
      ].join("\n")
    );

    return NextResponse.json({
      ok: true,
      product,
      adData,
      googleAds: googleAdsResult,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi Google Ads";

    await sendTelegramNotification(
      [
        "❌ <b>Google Ads Cron thất bại</b>",
        `Sản phẩm: ${product.name}`,
        `Campaign AI đã sinh: ${adData.campaignName}`,
        `Lỗi Google Ads: ${message}`,
      ].join("\n")
    );

    return NextResponse.json(
      {
        ok: false,
        step: "google_ads",
        product,
        adData,
        error: message,
      },
      { status: 500 }
    );
  }
}
