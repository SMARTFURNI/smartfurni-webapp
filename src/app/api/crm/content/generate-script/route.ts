import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  saveAIGeneration,
  loadContentMarketingFromDb,
  type ContentPlatform,
} from "@/lib/crm-content-store";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) {
    await loadContentMarketingFromDb();
    loaded = true;
  }
}

async function getSession() {
  const session = await getCrmSession();
  if (!session) return null;
  return {
    id: session.isAdmin ? "admin" : (session.staffId || "staff"),
    name: session.isAdmin ? "Admin" : (session.staffId || "Staff"),
    isAdmin: session.isAdmin,
  };
}

// Tạo prompt tối ưu cho từng platform
function buildPrompt(params: {
  platform: ContentPlatform;
  topic: string;
  productName?: string;
  targetAudience?: string;
  tone?: string;
  durationSeconds?: number;
  additionalNotes?: string;
}): string {
  const platformGuide: Record<string, string> = {
    tiktok: `TikTok (video ngắn 15-60 giây, hook mạnh trong 3 giây đầu, năng động, trending, CTA rõ ràng)`,
    facebook: `Facebook (video 1-3 phút, storytelling, emotional, phù hợp xem không âm thanh, caption đầy đủ)`,
    youtube: `YouTube (video 3-10 phút, intro hấp dẫn, nội dung chuyên sâu, SEO-friendly, outro với CTA)`,
    all: `đa nền tảng (TikTok, Facebook, YouTube)`,
  };

  const toneGuide: Record<string, string> = {
    professional: "chuyên nghiệp, uy tín, đáng tin cậy",
    casual: "thân thiện, gần gũi, dễ tiếp cận",
    humorous: "hài hước, vui vẻ, dễ nhớ",
    emotional: "cảm xúc, chạm đến trái tim, truyền cảm hứng",
    educational: "giáo dục, thông tin hữu ích, chuyên gia",
  };

  const duration = params.durationSeconds
    ? `${params.durationSeconds} giây`
    : params.platform === "tiktok"
    ? "30-60 giây"
    : params.platform === "youtube"
    ? "3-5 phút"
    : "1-2 phút";

  const tone = params.tone ? toneGuide[params.tone] || params.tone : "chuyên nghiệp và thân thiện";

  return `Bạn là chuyên gia sáng tạo nội dung video cho thương hiệu nội thất công thái học SmartFurni (Việt Nam).

Hãy viết kịch bản video hoàn chỉnh cho nền tảng ${platformGuide[params.platform] || params.platform}.

**Thông tin video:**
- Chủ đề: ${params.topic}
${params.productName ? `- Sản phẩm: ${params.productName}` : ""}
- Thời lượng: ${duration}
- Giọng điệu: ${tone}
${params.targetAudience ? `- Đối tượng mục tiêu: ${params.targetAudience}` : "- Đối tượng: dân văn phòng, người làm việc từ xa, quan tâm đến sức khỏe"}
${params.additionalNotes ? `- Ghi chú thêm: ${params.additionalNotes}` : ""}

**Yêu cầu kịch bản:**
1. Viết bằng tiếng Việt, tự nhiên và cuốn hút
2. Bao gồm: Hook mở đầu → Nội dung chính → Call-to-Action
3. Ghi rõ [CẢNH], [VOICEOVER], [TEXT ON SCREEN], [NHẠC NỀN] khi cần
4. Phù hợp với đặc thù của ${params.platform === "all" ? "đa nền tảng" : params.platform.toUpperCase()}
5. Kết thúc bằng hashtag gợi ý (5-10 hashtag tiếng Việt và tiếng Anh)
6. Thêm ghi chú sản xuất (góc quay, ánh sáng, props cần thiết)

**Về SmartFurni:**
- Thương hiệu nội thất công thái học cao cấp tại Việt Nam
- Sản phẩm: giường điều chỉnh điện, bàn làm việc ergonomic, ghế văn phòng
- USP: Chăm sóc sức khỏe cột sống, nâng cao chất lượng giấc ngủ và hiệu suất làm việc
- Giá trị: Chất lượng Đức/Nhật, phù hợp với người Việt

Hãy viết kịch bản chi tiết, sáng tạo và có thể thực hiện ngay:`;
}

// POST /api/crm/content/generate-script
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureLoaded();

  const body = await req.json();
  const {
    platform = "tiktok",
    topic,
    productName,
    targetAudience,
    tone = "professional",
    durationSeconds,
    additionalNotes,
  } = body;

  if (!topic) {
    return NextResponse.json(
      { error: "Thiếu thông tin: topic (chủ đề) là bắt buộc" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY chưa được cấu hình" },
      { status: 500 }
    );
  }

  const prompt = buildPrompt({
    platform: platform as ContentPlatform,
    topic,
    productName,
    targetAudience,
    tone,
    durationSeconds,
    additionalNotes,
  });

  const startTime = Date.now();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-1.5-flash",
    });

    const result = await model.generateContent(prompt);
    const response = result.response;
    const generatedScript = response.text();
    const generationTimeMs = Date.now() - startTime;

    // Lưu vào DB (non-blocking - không ảnh hưởng response nếu DB lỗi)
    let generationId = "";
    try {
      const generation = await saveAIGeneration({
        platform: platform as ContentPlatform,
        topic,
        productName,
        targetAudience,
        tone,
        durationSeconds,
        additionalNotes,
        promptUsed: prompt,
        generatedScript,
        modelUsed: process.env.GEMINI_MODEL || "gemini-1.5-flash",
        generationTimeMs,
        createdBy: session.id,
      });
      generationId = generation.id;
    } catch (dbErr) {
      console.error("[generate-script] DB save error (non-fatal):", (dbErr as Error).message);
    }

    return NextResponse.json({
      success: true,
      generationId,
      script: generatedScript,
      generationTimeMs,
      platform,
      topic,
    });
  } catch (err) {
    console.error("[generate-script] Gemini error:", err);
    return NextResponse.json(
      {
        error: "Lỗi khi tạo kịch bản AI",
        details: (err as Error).message,
      },
      { status: 500 }
    );
  }
}
