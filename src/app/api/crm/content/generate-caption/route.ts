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

// Footer cố định luôn được thêm vào cuối mỗi caption
const SMARTFURNI_FOOTER = `
📩 [NHẬN BÁO GIÁ DỰ ÁN NGAY] – Inbox để được tư vấn kích thước phù hợp nhất với căn hộ của bạn.

🏢 CÔNG TY CỔ PHẦN SMARTFURNI
📍 Showroom HCM: 74 Nguyễn Thị Nhung, KĐT Vạn Phúc city, TP. Thủ Đức, TP. Hồ Chí Minh
📍 Showroom HN: B46-29, KĐT Geleximco B, Lê Trọng Tấn, Q. Hà Đông, TP. Hà Nội
🏭 XƯỞNG SẢN XUẤT: 202 Nguyễn Thị Sáng, X. Đông Thạnh, H. Hóc Môn, HCM
📞 Hotline: 028.7122.0818
💬 Zalo: https://zalo.me/0918326552
🌐 Website: https://smartfurni.vn`;

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
    facebook: "Facebook Fanpage (caption dài 150-300 từ, storytelling, emotional, dùng emoji vừa phải, kết thúc bằng CTA rõ ràng)",
    tiktok: "TikTok (caption ngắn 50-100 từ, hook mạnh, năng động, CTA ngắn gọn)",
  };

  const toneGuide: Record<string, string> = {
    professional: "chuyên nghiệp, uy tín, B2B",
    casual: "thân thiện, gần gũi, dễ tiếp cận",
    humorous: "hài hước, vui vẻ, tạo cảm giác thoải mái",
    emotional: "cảm xúc, chạm đến trái tim, kể chuyện",
    educational: "giáo dục, chia sẻ kiến thức, hữu ích",
  };

  const hashtagHint = hashtags.length > 0
    ? `\nHashtag tham khảo từ kịch bản: ${hashtags.map((h: string) => `#${h}`).join(" ")}`
    : "";

  const prompt = `Bạn là chuyên gia marketing nội thất thông minh cho thương hiệu ${brandName}.

Hãy viết caption bài đăng ${platformGuide[platform] || platformGuide.facebook} với giọng điệu ${toneGuide[tone] || toneGuide.professional}.

Thông tin kịch bản:
- Tiêu đề kịch bản gốc (chỉ để tham khảo nội dung, KHÔNG dùng làm tiêu đề bài đăng): ${title || "(không có)"}
- Nội dung kịch bản:
${script ? script.slice(0, 2000) : "(không có kịch bản, hãy tạo dựa trên tiêu đề)"}
${hashtagHint}

Yêu cầu bắt buộc — trả về đúng định dạng sau:

[DÒNG 1] Tiêu đề bài đăng: Tự sáng tạo một tiêu đề BÁN HÀNG ĐẬP MẮT, VIẾT HOA TOÀN BỘ, tóm gọn điểm nhấn chính của nội dung kịch bản (KHÔNG copy tiêu đề kịch bản gốc, phải là tiêu đề mới sáng tạo, thu hút click)

[DÒNG 2 trở đi] Nội dung caption: Viết nội dung bài đăng hoàn chỉnh bên dưới tiêu đề, phù hợp nền tảng ${platform === "facebook" ? "Facebook" : "TikTok"}, có emoji vừa phải, kết thúc bằng CTA rõ ràng

[CUỐI CÙNG] Hashtag: Tạo 8-12 hashtag LIÊN QUAN TRỰC TIẾP đến nội dung bài đăng vừa viết (không chỉ hashtag chung chung), mỗi hashtag bắt đầu bằng #, viết liền nhau trên một dòng

Lưu ý:
- KHÔNG thêm thông tin liên hệ hay địa chỉ công ty (sẽ được thêm tự động)
- Chỉ trả về caption theo đúng định dạng trên, không giải thích thêm`;

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
      const aiCaption = result.response.text().trim();
      // Ghép caption AI + footer cố định
      const caption = aiCaption + "\n" + SMARTFURNI_FOOTER;
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
