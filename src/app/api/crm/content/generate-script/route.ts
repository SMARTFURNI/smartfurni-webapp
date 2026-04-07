import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getCrmSession } from "@/lib/admin-auth";
import {
  saveAIGeneration,
  loadContentMarketingFromDb,
  loadContentSettings,
  getContentSettings,
  DEFAULT_PROMPT_TEMPLATE,
  DEFAULT_SYSTEM_CONTEXT,
  type ContentPlatform,
} from "@/lib/crm-content-store";

let loaded = false;
async function ensureLoaded() {
  if (!loaded) {
    await loadContentMarketingFromDb();
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

const PLATFORM_GUIDE: Record<string, string> = {
  tiktok: "TikTok (video ngắn 15-60 giây, hook mạnh trong 3 giây đầu, năng động, trending, CTA rõ ràng)",
  facebook: "Facebook (video 1-3 phút, storytelling, emotional, phù hợp xem không âm thanh, caption đầy đủ)",
  youtube: "YouTube (video 3-10 phút, intro hấp dẫn, nội dung chuyên sâu, SEO-friendly, outro với CTA)",
  all: "đa nền tảng (TikTok, Facebook, YouTube)",
};

const TONE_GUIDE: Record<string, string> = {
  professional: "chuyên nghiệp, uy tín, đáng tin cậy",
  casual: "thân thiện, gần gũi, dễ tiếp cận",
  humorous: "hài hước, vui vẻ, dễ nhớ",
  emotional: "cảm xúc, chạm đến trái tim, truyền cảm hứng",
  educational: "giáo dục, thông tin hữu ích, chuyên gia",
};

/**
 * Build prompt from template with {{variable}} substitution.
 * Supports conditional blocks: {{#var}}content{{/var}}
 */
function buildPromptFromTemplate(
  template: string,
  systemContext: string,
  params: {
    platform: ContentPlatform;
    topic: string;
    productName?: string;
    targetAudience?: string;
    tone?: string;
    durationSeconds?: number;
    additionalNotes?: string;
    brandName?: string;
  }
): string {
  const duration = params.durationSeconds
    ? `${params.durationSeconds} giây`
    : params.platform === "tiktok"
    ? "30-60 giây"
    : params.platform === "youtube"
    ? "3-5 phút"
    : "1-2 phút";

  const toneText = params.tone ? (TONE_GUIDE[params.tone] || params.tone) : "chuyên nghiệp và thân thiện";
  const platformText = PLATFORM_GUIDE[params.platform] || params.platform;
  const brandName = params.brandName || "SmartFurni";

  // Replace simple variables
  let prompt = template
    .replace(/\{\{brandName\}\}/g, brandName)
    .replace(/\{\{platform\}\}/g, platformText)
    .replace(/\{\{topic\}\}/g, params.topic)
    .replace(/\{\{duration\}\}/g, duration)
    .replace(/\{\{tone\}\}/g, toneText)
    .replace(/\{\{productName\}\}/g, params.productName || "")
    .replace(/\{\{targetAudience\}\}/g, params.targetAudience || "")
    .replace(/\{\{additionalNotes\}\}/g, params.additionalNotes || "");

  // Handle conditional blocks {{#var}}...{{/var}}
  prompt = prompt.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_match, varName, content) => {
    const val = (params as Record<string, unknown>)[varName];
    return val ? content : "";
  });

  // Prepend system context
  if (systemContext && systemContext.trim()) {
    return `**Về ${brandName}:**\n${systemContext}\n\n---\n\n${prompt}`;
  }
  return prompt;
}

/** Check if an error is a rate-limit / quota error that warrants trying the next model */
function isRateLimitError(msg: string): boolean {
  return (
    msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("rateLimitExceeded") ||
    msg.includes("Too Many Requests")
  );
}

/** Check if an error means the model name is invalid (try next in chain) */
function isModelNotFoundError(msg: string): boolean {
  return msg.includes("not found") || msg.includes("404") || msg.includes("MODEL_NOT_FOUND");
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

  // Use settings from DB (or defaults)
  const settings = getContentSettings();
  const promptTemplate = settings?.promptTemplate || DEFAULT_PROMPT_TEMPLATE;
  const systemContext = settings?.promptSystemContext || DEFAULT_SYSTEM_CONTEXT;
  const primaryModel = settings?.aiModel || process.env.GEMINI_MODEL || "gemini-2.5-flash-preview-04-17";
  const temperature = settings?.aiTemperature ?? 0.7;
  const brandName = settings?.brandName || "SmartFurni";

  // Build fallback model chain: primary model + fallback list (deduplicated, preserving order)
  const rawFallback = settings?.aiFallbackModels;
  const fallbackList: string[] = rawFallback
    ? (typeof rawFallback === "string" ? JSON.parse(rawFallback) : rawFallback)
    : ["gemini-2.5-flash-lite-preview-06-17", "gemini-2.0-flash", "gemini-2.0-flash-lite"];
  const modelChain = [primaryModel, ...fallbackList.filter(m => m !== primaryModel)];

  const prompt = buildPromptFromTemplate(promptTemplate, systemContext, {
    platform: platform as ContentPlatform,
    topic,
    productName,
    targetAudience,
    tone,
    durationSeconds,
    additionalNotes,
    brandName,
  });

  const startTime = Date.now();
  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = "";
  let lastErrMsg = "";

  // ── Try each model in chain until one succeeds ──────────────────────────────
  for (let i = 0; i < modelChain.length; i++) {
    const modelName = modelChain[i];
    try {
      console.log(`[generate-script] Trying model [${i + 1}/${modelChain.length}]: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature,
          maxOutputTokens: settings?.aiMaxTokens || 8192,
        },
      });

      const result = await model.generateContent(prompt);
      const generatedScript = result.response.text();
      const generationTimeMs = Date.now() - startTime;

      // Save to DB (non-blocking)
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
          modelUsed: modelName,
          generationTimeMs,
          createdBy: session.id,
        });
        generationId = generation.id;
      } catch (dbErr) {
        console.error("[generate-script] DB save error (non-fatal):", (dbErr as Error).message);
      }

      const isFallback = modelName !== primaryModel;
      return NextResponse.json({
        success: true,
        generationId,
        script: generatedScript,
        generationTimeMs,
        platform,
        topic,
        modelUsed: modelName,
        // Notify frontend when a fallback model was used
        ...(isFallback && {
          fallbackUsed: true,
          fallbackFrom: primaryModel,
          fallbackReason: `Model ưu tiên đã đạt giới hạn, tự động chuyển sang ${modelName}`,
        }),
      });
    } catch (err) {
      const errMsg = (err as Error).message || "Unknown error";
      lastError = modelName;
      lastErrMsg = errMsg;
      console.warn(`[generate-script] Model ${modelName} failed (${i + 1}/${modelChain.length}): ${errMsg.slice(0, 120)}`);

      // Only continue fallback chain for rate-limit or model-not-found errors
      if (!isRateLimitError(errMsg) && !isModelNotFoundError(errMsg)) {
        // Fatal error (bad API key, network, etc.) — stop immediately
        break;
      }
      // Continue to next model in chain
    }
  }

  // ── All models exhausted — return final error ───────────────────────────────
  console.error("[generate-script] All models failed. Last error:", lastErrMsg);
  let userError = "Lỗi khi tạo kịch bản AI";
  if (lastErrMsg.includes("API_KEY") || lastErrMsg.includes("API key") || lastErrMsg.includes("INVALID_ARGUMENT")) {
    userError = "GEMINI_API_KEY không hợp lệ hoặc chưa được cấu hình";
  } else if (isRateLimitError(lastErrMsg)) {
    userError = `Tất cả ${modelChain.length} model đã đạt giới hạn ngày. Vui lòng thử lại vào ngày mai hoặc nâng cấp gói Gemini API.`;
  } else if (isModelNotFoundError(lastErrMsg)) {
    userError = `Model "${lastError}" không tồn tại, vui lòng kiểm tra cài đặt`;
  } else if (lastErrMsg.includes("network") || lastErrMsg.includes("fetch")) {
    userError = "Lỗi kết nối mạng, vui lòng thử lại";
  }

  return NextResponse.json(
    { error: userError, details: lastErrMsg },
    { status: 500 }
  );
}
