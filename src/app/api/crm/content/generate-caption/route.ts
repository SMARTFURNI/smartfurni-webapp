import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getCrmSession } from "@/lib/admin-auth";
import {
  loadContentSettings,
  getContentSettings,
} from "@/lib/crm-content-store";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) {
    await loadContentSettings();
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

function isRateLimitError(msg: string) {
  return msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("rate limit");
}
function isModelNotFoundError(msg: string) {
  return msg.includes("404") || msg.includes("not found") || msg.includes("MODEL_NOT_FOUND");
}

export async function POST(req: NextRequest) {
  await ensureLoaded();
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const body = await req.json();
  const {
    platform = "facebook",
    title = "",
    script = "",
    hashtags = [],
    tone = "professional",
  } = body;

  if (!script && !title) {
    return NextResponse.json({ error: "Cần có kịch bản hoặc tiêu đề để tạo caption" }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY chưa được cấu hình" }, { status: 500 });
  }

  const settings = getContentSettings();
  const primaryModel = settings?.aiModel || process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-04-17";
  const temperature = settings?.aiTemperature ?? 0.7;
  const brandName = settings?.brandName || "SmartFurni";

  const rawFallback = settings?.aiFallbackModels;
  const fallbackList: string[] = rawFallback
    ? (typeof rawFallback === "string" ? JSON.parse(rawFallback) : rawFallback)
    : ["gemini-2.5-flash-lite-preview-06-17", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
  const modelChain = [primaryModel, ...fallbackList.filter(m => m !== primaryModel)];

  const platformGuide: Record<string, string> = {
    facebook: "Facebook Fanpage (caption dài 150-300 từ, storytelling, emotional, dùng emoji vừa phải, kết thúc bằng CTA rõ ràng, thêm hashtag liên quan)",
    tiktok: "TikTok (caption ngắn 50-100 từ, hook mạnh, năng động, trending hashtag, CTA ngắn gọn)",
  };

  const toneGuide: Record<string, string> = {
    professional: "chuyên nghiệp, uy tín, B2B",
    casual: "thân thiện, gần gũi, dễ tiếp cận",
    humorous: "hài hước, vui vẻ, tạo cảm giác thoải mái",
    emotional: "cảm xúc, chạm đến trái tim, kể chuyện",
    educational: "giáo dục, chia sẻ kiến thức, hữu ích",
  };

  const hashtagStr = hashtags.length > 0 ? `\nHashtag gợi ý: ${hashtags.map((h: string) => `#${h}`).join(" ")}` : "";

  const prompt = `Bạn là chuyên gia marketing nội thất thông minh cho thương hiệu ${brandName}.

Hãy viết caption bài đăng ${platformGuide[platform] || platformGuide.facebook} với giọng điệu ${toneGuide[tone] || toneGuide.professional}.

Thông tin kịch bản:
- Tiêu đề video: ${title || "(không có)"}
- Nội dung kịch bản:
${script ? script.slice(0, 2000) : "(không có kịch bản, hãy tạo dựa trên tiêu đề)"}
${hashtagStr}

Yêu cầu:
1. Viết caption hoàn chỉnh, sẵn sàng đăng ngay
2. Phù hợp với nền tảng ${platform === "facebook" ? "Facebook" : "TikTok"}
3. Thêm emoji phù hợp (không quá nhiều)
4. Kết thúc bằng CTA (call-to-action) rõ ràng
5. Thêm 5-10 hashtag liên quan ở cuối
6. Chỉ trả về caption, không giải thích thêm`;

  const startTime = Date.now();
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = "";
  let lastErrMsg = "";

  for (let i = 0; i < modelChain.length; i++) {
    const modelName = modelChain[i];
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature, maxOutputTokens: 2048 },
      });
      const result = await model.generateContent(prompt);
      const caption = result.response.text();
      const generationTimeMs = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        caption,
        generationTimeMs,
        modelUsed: modelName,
      });
    } catch (err) {
      const errMsg = (err as Error).message || "Unknown error";
      lastError = modelName;
      lastErrMsg = errMsg;
      if (!isRateLimitError(errMsg) && !isModelNotFoundError(errMsg)) break;
    }
  }

  return NextResponse.json(
    { error: "Lỗi khi tạo caption AI", details: lastErrMsg },
    { status: 500 }
  );
}
