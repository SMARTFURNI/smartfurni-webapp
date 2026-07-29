import type {
  FacebookGroupSettings, GroupScoreInput, RuleAnalysis, ScheduleValidationInput,
} from "./facebook-group-marketing-types";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const digits = (value: string) => value.replace(/\D/g, "");

export function buildFacebookGroupContactCta(input: {
  rawCta?: string;
  sourceCode?: string;
  ruleAnalysis?: Partial<RuleAnalysis> | null;
  contact: FacebookGroupSettings["contact"];
}) {
  const rawCta = String(input.rawCta || "").trim();
  const sourceCode = String(input.sourceCode || "").trim();
  const analysis = input.ruleAnalysis || {};
  const blocks = rawCta ? [rawCta] : [];
  const normalizedRaw = normalize(rawCta);
  const rawDigits = digits(rawCta);

  if (sourceCode && !normalizedRaw.includes(normalize(sourceCode))) {
    blocks.push(`Nhắn tin cho Fanpage với mã ${sourceCode} để được tư vấn đúng nội dung này.`);
  }

  if (analysis.allowsPhone === true) {
    const contactParts: string[] = [];
    const hotlineDigits = digits(input.contact.hotline);
    const zaloDigits = digits(input.contact.zalo);
    if (hotlineDigits && hotlineDigits === zaloDigits && !rawDigits.includes(hotlineDigits)) {
      contactParts.push(`Liên hệ/Zalo: ${input.contact.zalo || input.contact.hotline}`);
    } else if (input.contact.hotline && hotlineDigits && !rawDigits.includes(hotlineDigits)) {
      contactParts.push(`Hotline: ${input.contact.hotline}`);
    }
    if (hotlineDigits !== zaloDigits && input.contact.zalo && zaloDigits && !rawDigits.includes(zaloDigits)) {
      contactParts.push(`Zalo: ${input.contact.zalo}`);
    }
    if (contactParts.length) blocks.push(contactParts.join(" · "));
  }

  if (analysis.allowsLink === true) {
    const links: string[] = [];
    if (input.contact.zaloUrl && !rawCta.includes(input.contact.zaloUrl)) {
      links.push(`Zalo trực tiếp: ${input.contact.zaloUrl}`);
    }
    if (input.contact.website && !rawCta.includes(input.contact.website)) {
      links.push(`Website: ${input.contact.website}`);
    }
    if (links.length) blocks.push(links.join("\n"));
  }

  return blocks.join("\n\n");
}

export function generateFacebookGroupSourceCode(input: {
  groupCode: string;
  productCode: string;
  date: Date;
  version: number;
}) {
  const clean = (value: string, fallback: string) =>
    normalize(value).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || fallback;
  const day = String(input.date.getDate()).padStart(2, "0");
  const month = String(input.date.getMonth() + 1).padStart(2, "0");
  let version = Math.max(1, input.version);
  let suffix = "";
  while (version > 0) {
    version -= 1;
    suffix = String.fromCharCode(65 + (version % 26)) + suffix;
    version = Math.floor(version / 26);
  }
  return `${clean(input.groupCode, "GROUP")}-${clean(input.productCode, "SMF")}-${day}${month}-${suffix}`;
}

export function calculateFacebookGroupScore(
  input: GroupScoreInput,
  settings: FacebookGroupSettings,
) {
  const w = settings.scoreWeights;
  const approvalRate = input.totalPosts ? input.approvedPosts / input.totalPosts : 0;
  const messengerRate = input.totalPosts ? input.messengerLeads / input.totalPosts : 0;
  const score =
    Math.min(1, Math.max(0, input.audienceFitPercent / 100)) * w.audienceFit +
    (input.allowsPages ? w.allowsPages : 0) +
    (input.allowsSales ? w.allowsSales : 0) +
    Math.min(1, approvalRate) * w.approvalRate +
    Math.min(1, messengerRate / 0.1) * w.messengerRate +
    Math.min(1, input.qualifiedLeads / 10) * w.qualifiedLeads +
    Math.min(1, input.orders / 3) * w.orders +
    Math.min(1, input.revenue / 100_000_000) * w.revenue;
  const rounded = Math.round(Math.min(100, Math.max(0, score)) * 100) / 100;
  const grade = rounded >= settings.gradeRules.A ? "A"
    : rounded >= settings.gradeRules.B ? "B"
      : rounded >= settings.gradeRules.C ? "C" : "D";
  return { score: rounded, grade };
}

export function validateFacebookGroupSchedule(
  input: ScheduleValidationInput,
  settings: FacebookGroupSettings,
) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const target = new Date(input.scheduledAt);
  if (Number.isNaN(target.getTime())) errors.push("Thời gian đăng không hợp lệ.");
  if (input.contentStatus !== "approved") errors.push("Nội dung chưa được duyệt.");
  if (!input.ruleCheckPassed) errors.push("Nội dung chưa đạt kiểm tra nội quy.");
  if (input.duplicateRatio > settings.maxDuplicateRatio) errors.push("Nội dung trùng lặp vượt ngưỡng.");
  if (input.groupStatus !== "active") errors.push("Group chưa ở trạng thái hoạt động.");
  if (input.membershipStatus !== "joined") errors.push("Fanpage chưa được xác nhận đã tham gia group.");
  if (input.groupNextAllowedPostAt && target < new Date(input.groupNextAllowedPostAt)) {
    errors.push("Group chưa đến ngày được phép đăng lại.");
  }
  if (input.pagePostsSameDay.length >= settings.maxPostsPerPagePerDay) {
    errors.push("Fanpage đã đạt giới hạn bài trong ngày.");
  }
  const minGap = settings.minPagePostIntervalMinutes * 60_000;
  if (input.pagePostsSameDay.some(value => Math.abs(target.getTime() - new Date(value).getTime()) < minGap)) {
    errors.push("Hai bài của Fanpage quá gần nhau.");
  }
  if (input.employeeTasksAt.some(value => Math.abs(target.getTime() - new Date(value).getTime()) < 15 * 60_000)) {
    errors.push("Nhân viên bị trùng lịch trong vòng 15 phút.");
  }
  if (!settings.workingDays.includes(target.getDay())) warnings.push("Thời gian nằm ngoài ngày làm việc mặc định.");
  return { ok: errors.length === 0, errors, warnings };
}

export function contentSimilarityPercent(left: string, right: string) {
  const words = (value: string) => new Set(
    normalize(value).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(word => word.length > 2),
  );
  const a = words(left);
  const b = words(right);
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter(word => b.has(word)).length;
  const union = new Set([...a, ...b]).size;
  return Math.round((intersection / union) * 10000) / 100;
}

export type FacebookGroupAiSuggestion = {
  opening: string;
  body: string;
  cta: string;
  contentType: "community_share" | "education" | "story" | "sales";
};

export function parseFacebookGroupAiSuggestion(rawResponse: string): FacebookGroupAiSuggestion {
  const raw = String(rawResponse || "").trim();
  const cleaned = raw
    .replace(/^\uFEFF/, "")
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const candidates = [cleaned];
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(cleaned.slice(start, end + 1));

  let parsed: Record<string, unknown> | null = null;
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        parsed = value as Record<string, unknown>;
        break;
      }
    } catch {
      // Thử định dạng tiếp theo trước khi dùng bộ tách văn bản dự phòng.
    }
  }

  const source = parsed && parsed.suggestion && typeof parsed.suggestion === "object"
    ? parsed.suggestion as Record<string, unknown>
    : parsed;
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const result = source?.[key];
      if (typeof result === "string" && result.trim()) return result.trim();
    }
    return "";
  };
  const extractSection = (labels: string[], nextLabels: string[]) => {
    const labelPattern = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const nextPattern = nextLabels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const pattern = new RegExp(
      `(?:^|\\n)\\s*(?:#{1,4}\\s*)?(?:${labelPattern})\\s*[:\\-]?\\s*([\\s\\S]*?)(?=\\n\\s*(?:#{1,4}\\s*)?(?:${nextPattern})\\s*[:\\-]?|$)`,
      "i",
    );
    return cleaned.match(pattern)?.[1]?.trim() || "";
  };

  const opening = pick("opening", "cauMoDau", "cau_mo_dau", "hook")
    || extractSection(["Câu mở đầu", "Mở đầu", "Opening", "Hook"], ["Nội dung chính", "Nội dung", "Body", "CTA", "Loại nội dung"]);
  const body = pick("body", "content", "noiDungChinh", "noi_dung_chinh")
    || extractSection(["Nội dung chính", "Nội dung", "Body", "Content"], ["CTA", "Kêu gọi hành động", "Loại nội dung", "Content type"]);
  const cta = pick("cta", "callToAction", "call_to_action")
    || extractSection(["CTA", "Kêu gọi hành động", "Call to action"], ["Loại nội dung", "Content type"]);
  const rawType = normalize(pick("contentType", "content_type", "type")
    || extractSection(["Loại nội dung", "Content type"], ["$"]));
  const contentType = rawType.includes("sale") || rawType.includes("ban hang") ? "sales"
    : rawType.includes("story") || rawType.includes("cau chuyen") ? "story"
      : rawType.includes("education") || rawType.includes("kien thuc") ? "education"
        : "community_share";

  if (!body) throw new Error("AI chưa trả về phần nội dung chính có thể sử dụng.");
  return { opening, body, cta, contentType };
}

export function analyzeFacebookGroupRules(rawText: string): RuleAnalysis {
  const text = normalize(rawText);
  const containsAny = (terms: string[]) => terms.some(term => text.includes(normalize(term)));
  const denied = (terms: string[]) => containsAny(terms.map(term => `không ${term}`))
    || containsAny(terms.map(term => `cấm ${term}`));
  const allowed = (terms: string[]) => containsAny(terms.map(term => `được ${term}`))
    || containsAny(terms.map(term => `cho phép ${term}`));
  const tri = (terms: string[]) => denied(terms) ? false : allowed(terms) ? true : null;
  const warnings: string[] = [];
  if (containsAny(["spam", "xóa bài", "khóa tài khoản", "cấm thành viên"])) {
    warnings.push("Nội quy có chế tài về spam/xóa bài; cần nhân viên kiểm tra kỹ trước khi đăng.");
  }
  return {
    allowsSales: tri(["bán hàng", "quảng cáo", "rao bán"]),
    allowsPrice: tri(["đăng giá", "ghi giá", "để giá"]),
    allowsPhone: tri(["số điện thoại", "để số"]),
    allowsLink: tri(["đường dẫn", "link"]),
    requiresSource: containsAny(["ghi nguồn", "dẫn nguồn"]) ? true : null,
    hasFrequencyLimit: containsAny(["mỗi ngày", "mỗi tuần", "tần suất", "7 ngày"]) ? true : null,
    bannedKeywords: [],
    requiresApproval: containsAny(["kiểm duyệt", "quản trị viên phê duyệt", "chờ duyệt"]) ? true : null,
    suitableFormats: containsAny(["hình ảnh", "video"]) ? ["image", "video"] : ["text", "image"],
    warnings,
  };
}

export function extractFacebookGroupSourceCode(message: string) {
  const candidates = message.toUpperCase().match(/\b[A-Z0-9]{2,12}-[A-Z0-9]{2,12}-\d{4}-[A-Z]{1,3}\b/g);
  return candidates?.[0] || null;
}

export function parseFacebookGroupUrl(value: string) {
  try {
    const url = new URL(value);
    if (!/(^|\.)facebook\.com$/i.test(url.hostname)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const groupIndex = parts.findIndex(part => part.toLowerCase() === "groups");
    const groupKey = parts[groupIndex + 1];
    if (groupIndex < 0 || !groupKey) return null;
    return { url, groupKey: groupKey.toLowerCase() };
  } catch {
    return null;
  }
}

export function parseFacebookGroupPostUrl(value: string) {
  const parsed = parseFacebookGroupUrl(value);
  if (!parsed) return null;
  const parts = parsed.url.pathname.split("/").filter(Boolean);
  const groupIndex = parts.findIndex(part => part.toLowerCase() === "groups");
  const kind = parts[groupIndex + 2]?.toLowerCase();
  const postKey = parts[groupIndex + 3];
  if (!postKey || !["posts", "permalink"].includes(kind)) return null;
  return { ...parsed, postKey, kind };
}
