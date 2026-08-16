import "server-only";

export type JourneyReplyRecommendation = "continue" | "pause" | "switch" | "stop" | "complete";
export type JourneyReplyIntent =
  | "neutral"
  | "question"
  | "pricing"
  | "consultation"
  | "not_interested"
  | "do_not_contact"
  | "purchased"
  | "wrong_product";

export interface JourneyReplyAnalysis {
  recommendation: JourneyReplyRecommendation;
  intent: JourneyReplyIntent;
  reason: string;
  confidence: number;
  suggestedPauseHours: number | null;
  hardStop: boolean;
  provider: "gemini" | "rules";
}

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("vi")
  .replace(/đ/g, "d")
  .replace(/\s+/g, " ")
  .trim();

const containsAny = (value: string, phrases: string[]) => phrases.some(phrase => value.includes(phrase));

/**
 * Lớp an toàn hoạt động ngay cả khi AI provider tạm thời không khả dụng.
 * Chỉ yêu cầu chặn tự động với yêu cầu không liên hệ rõ ràng; các trường hợp
 * còn lại đều là đề xuất để nhân viên quyết định.
 */
export function classifyJourneyReplyWithRules(message: string): JourneyReplyAnalysis {
  const text = normalize(message);
  if (containsAny(text, [
    "dung nhan", "dung gui", "khong lien he", "khong lam phien", "huy dang ky",
    "bo so toi", "xoa so toi", "unsubscribe", "stop messaging", "do not contact",
  ])) {
    return {
      recommendation: "stop", intent: "do_not_contact",
      reason: "Khách yêu cầu rõ ràng không tiếp tục liên hệ.", confidence: 0.99,
      suggestedPauseHours: null, hardStop: true, provider: "rules",
    };
  }
  if (containsAny(text, ["da mua", "mua roi", "chot roi", "dat hang roi", "thanh toan roi"])) {
    return {
      recommendation: "complete", intent: "purchased",
      reason: "Khách cho biết đã mua hoặc đã chốt; cần nhân viên xác nhận kết quả.", confidence: 0.9,
      suggestedPauseHours: null, hardStop: false, provider: "rules",
    };
  }
  if (containsAny(text, ["khong quan tam", "khong co nhu cau", "chua co nhu cau", "khong can nua"])) {
    return {
      recommendation: "stop", intent: "not_interested",
      reason: "Khách thể hiện không còn nhu cầu; đề xuất nhân viên xác nhận trước khi dừng.", confidence: 0.92,
      suggestedPauseHours: null, hardStop: false, provider: "rules",
    };
  }
  if (containsAny(text, ["san pham khac", "khong phai san pham", "quan tam sofa", "quan tam giuong", "loai khac"])) {
    return {
      recommendation: "switch", intent: "wrong_product",
      reason: "Nhu cầu có thể phù hợp với một workflow sản phẩm khác.", confidence: 0.78,
      suggestedPauseHours: null, hardStop: false, provider: "rules",
    };
  }
  if (containsAny(text, [
    "bao gia", "gia bao nhieu", "gia the nao", "khuyen mai", "chiet khau", "goi lai",
    "tu van", "hen", "showroom", "xem mau", "kich thuoc", "bao hanh", "lap dat",
  ])) {
    const pricing = containsAny(text, ["bao gia", "gia bao nhieu", "gia the nao", "khuyen mai", "chiet khau"]);
    return {
      recommendation: "pause", intent: pricing ? "pricing" : "consultation",
      reason: "Khách đang có tín hiệu mua và cần nhân viên xử lý trực tiếp trước nội dung tự động tiếp theo.",
      confidence: 0.86, suggestedPauseHours: 24, hardStop: false, provider: "rules",
    };
  }
  if (text.includes("?") || containsAny(text, ["cho hoi", "the nao", "tai sao", "co duoc khong"])) {
    return {
      recommendation: "pause", intent: "question",
      reason: "Khách đặt câu hỏi; đề xuất tạm dừng ngắn sau khi nhân viên tiếp nhận.",
      confidence: 0.72, suggestedPauseHours: 24, hardStop: false, provider: "rules",
    };
  }
  return {
    recommendation: "continue", intent: "neutral",
    reason: "Phản hồi chưa cho thấy lý do cần dừng chuỗi; workflow có thể tiếp tục theo lịch.",
    confidence: 0.65, suggestedPauseHours: null, hardStop: false, provider: "rules",
  };
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const cleaned = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function analyzeJourneyReply(input: {
  message: string;
  leadName: string;
  journeyName: string;
}): Promise<JourneyReplyAnalysis> {
  const fallback = classifyJourneyReplyWithRules(input.message);
  // Yêu cầu không liên hệ phải được nhận diện cục bộ, không phụ thuộc AI/provider.
  if (fallback.hardStop || fallback.confidence >= 0.9) return fallback;
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return fallback;

  const model = process.env.CRM_JOURNEY_REPLY_AI_MODEL?.trim()
    || process.env.GEMINI_MODEL?.trim()
    || "gemini-2.5-flash";
  const prompt = `Bạn phân loại phản hồi khách hàng cho CRM SmartFurni.
Khách: ${input.leadName}
Workflow hiện tại: ${input.journeyName}
Tin nhắn khách: ${JSON.stringify(input.message.slice(0, 3000))}

Chọn đúng một recommendation:
- continue: phản hồi xã giao/trung tính, workflow vẫn chạy
- pause: khách hỏi giá, tư vấn, hẹn gọi hoặc cần nhân viên xử lý trước
- switch: nhu cầu thuộc sản phẩm/workflow khác
- stop: không quan tâm hoặc muốn dừng liên hệ
- complete: đã mua/đã chốt

Chọn intent trong neutral, question, pricing, consultation, not_interested, do_not_contact, purchased, wrong_product.
Không được tự quyết định thay nhân viên. Trả JSON: {"recommendation":"...","intent":"...","reason":"...","confidence":0.0,"suggestedPauseHours":24|null}.`;
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!response.ok) return fallback;
    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const raw = payload.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("") || "";
    const parsed = parseJsonObject(raw);
    const recommendations: JourneyReplyRecommendation[] = ["continue", "pause", "switch", "stop", "complete"];
    const intents: JourneyReplyIntent[] = ["neutral", "question", "pricing", "consultation", "not_interested", "do_not_contact", "purchased", "wrong_product"];
    const recommendation = recommendations.includes(parsed?.recommendation as JourneyReplyRecommendation)
      ? parsed?.recommendation as JourneyReplyRecommendation : fallback.recommendation;
    const intent = intents.includes(parsed?.intent as JourneyReplyIntent)
      ? parsed?.intent as JourneyReplyIntent : fallback.intent;
    const confidence = Math.max(0, Math.min(1, Number(parsed?.confidence ?? fallback.confidence)));
    const pauseHours = Number(parsed?.suggestedPauseHours);
    return {
      recommendation,
      intent,
      reason: String(parsed?.reason || fallback.reason).slice(0, 1000),
      confidence: Number.isFinite(confidence) ? confidence : fallback.confidence,
      suggestedPauseHours: recommendation === "pause" && Number.isFinite(pauseHours)
        ? Math.max(1, Math.min(720, pauseHours)) : null,
      // Không cho mô hình tự chặn liên hệ; hard-stop chỉ đến từ bộ quy tắc
      // minh định phía trên để tránh false positive.
      hardStop: false,
      provider: "gemini",
    };
  } catch {
    return fallback;
  }
}
