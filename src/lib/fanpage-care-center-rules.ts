import type {
  FanpageCarePlanStep,
  FanpageLeadTemperature,
} from "@/types/fanpage-care-center";
import {
  DEFAULT_FANPAGE_CARE_SETTINGS,
  type FanpageCareSettings,
} from "@/lib/fanpage-care-settings";

export interface ConversationForAnalysis {
  pageInternalId: string;
  pageFacebookId: string;
  pageName: string;
  conversationId: string;
  participantId?: string;
  participantName: string;
  unreadCount: number;
  canReply: boolean;
  latestMessageAt?: string;
  customerId?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  messages: Array<{
    id: string;
    direction: "inbound" | "outbound";
    content: string;
    createdAt?: string;
  }>;
}

export interface DeterministicConversationAssessment {
  leadScore: number;
  leadTemperature: FanpageLeadTemperature;
  funnelStage: string;
  customerNeed: string;
  productInterest: string[];
  objections: string[];
  buyingSignals: string[];
  nextBestAction: string;
  dueAt: string;
  qualifies: boolean;
  latestInboundUnanswered: boolean;
}

export interface GeneratedCarePlan {
  conversationId: string;
  summary: string;
  customerNeed: string;
  productInterest: string[];
  objections: string[];
  buyingSignals: string[];
  nextBestAction: string;
  confidence: number;
  planSteps: FanpageCarePlanStep[];
}

export interface ConversationAddressingStyle {
  staffPronoun: string;
  customerAddress: string;
  greeting: string;
  source: "outbound" | "inbound" | "default";
  confidence: "high" | "medium" | "low";
  evidence?: string;
}

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function compactEvidence(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

function makeAddressingStyle(input: Omit<ConversationAddressingStyle, "greeting">): ConversationAddressingStyle {
  const deferential = /^(?:anh|chị|cô|chú|anh\/chị)$/.test(input.customerAddress);
  return {
    ...input,
    greeting: deferential ? `Dạ ${input.customerAddress}` : `Chào ${input.customerAddress}`,
  };
}

function detectStaffPronounFromOutbound(text: string) {
  const match = normalizeText(text).match(
    /\b(smartfurni|ben em|ben anh|ben chi|ben minh|chung toi|em|anh|chi|chau|con|toi|minh)\s+(?:xin|da|se|gui|muon|co the|kiem tra|ho tro|tu van|bao|nhan|goi|trao doi|cam on)\b/,
  );
  const value = match?.[1];
  if (!value) return undefined;
  return ({
    smartfurni: "SmartFurni",
    "ben em": "bên em",
    "ben anh": "bên anh",
    "ben chi": "bên chị",
    "ben minh": "bên mình",
    "chung toi": "chúng tôi",
    em: "em",
    anh: "anh",
    chi: "chị",
    chau: "cháu",
    con: "con",
    toi: "tôi",
    minh: "mình",
  } as Record<string, string>)[value];
}

function detectCustomerAddressFromOutbound(text: string) {
  const normalized = normalizeText(text);
  const receivers = [
    /\b(?:gui|ho tro|tu van|bao gia cho|cam on|moi|nho)\s+(anh\/chi|anh|chi|co|chu|em|minh|ban|quy khach)\b/,
    /\b(?:cua|voi)\s+(anh\/chi|anh|chi|co|chu|em|minh|ban|quy khach)\b/,
    /\b(anh\/chi|anh|chi|co|chu|minh|ban|quy khach)\s+(?:co|can|muon|cho|giup|xem|tham khao|nhan|sap xep|vui long|con)\b/,
    /^(?:da|vang|chao|xin chao)[,! ]+(anh\/chi|anh|chi|co|chu|em|minh|ban|quy khach)\b/,
  ];
  const value = receivers.map(pattern => normalized.match(pattern)?.[1]).find(Boolean);
  if (!value) return undefined;
  return ({
    "anh/chi": "anh/chị",
    anh: "anh",
    chi: "chị",
    co: "cô",
    chu: "chú",
    em: "em",
    minh: "mình",
    ban: "bạn",
    "quy khach": "quý khách",
  } as Record<string, string>)[value];
}

function defaultCustomerAddressForStaff(staffPronoun: string) {
  if (/^(?:anh|chị|bên anh|bên chị)$/.test(staffPronoun)) return "em";
  if (/^(?:cháu|con)$/.test(staffPronoun)) return "cô/chú";
  if (/^(?:SmartFurni|chúng tôi|tôi|mình|bên mình)$/.test(staffPronoun)) return "mình";
  return "anh/chị";
}

function detectInboundSelfReference(text: string) {
  const normalized = normalizeText(text);
  const match = normalized.match(/\b(em|anh|chi|co|chu|minh|toi)\s+(?:muon|can|hoi|dang|o|gui|lay|mua|quan tam|chua|da)\b/);
  const value = match?.[1];
  if (!value || value === "toi") return value === "toi" ? "mình" : undefined;
  return ({ em: "em", anh: "anh", chi: "chị", co: "cô", chu: "chú", minh: "mình" } as Record<string, string>)[value];
}

/**
 * Keep the same relationship language already established in the thread.
 * Staff outbound messages are authoritative; inbound vocatives are only used
 * when the page has not established a clear style yet.
 */
export function detectConversationAddressing(
  conversation: Pick<ConversationForAnalysis, "messages">,
): ConversationAddressingStyle {
  const outbound = [...conversation.messages].reverse().filter(message => message.direction === "outbound");
  for (const message of outbound) {
    const staffPronoun = detectStaffPronounFromOutbound(message.content);
    const customerAddress = detectCustomerAddressFromOutbound(message.content);
    if (staffPronoun || customerAddress) {
      const resolvedStaff = staffPronoun || (/^(?:anh|chị|cô|chú|anh\/chị)$/.test(customerAddress || "") ? "em" : "SmartFurni");
      return makeAddressingStyle({
        staffPronoun: resolvedStaff,
        customerAddress: customerAddress || defaultCustomerAddressForStaff(resolvedStaff),
        source: "outbound",
        confidence: staffPronoun && customerAddress ? "high" : "medium",
        evidence: compactEvidence(message.content),
      });
    }
  }

  const inbound = [...conversation.messages].reverse().filter(message => message.direction === "inbound");
  for (const message of inbound) {
    const normalized = normalizeText(message.content);
    const called = normalized.match(/\b(anh|chi|em|co|chu)\s+oi\b/)?.[1]
      || normalized.match(/^(?:chao|xin chao|da|alo)[,! ]+(anh|chi|em|co|chu)\b/)?.[1];
    const callsShop = /\b(?:shop|admin|smartfurni)\s+oi\b/.test(normalized);
    if (called || callsShop) {
      const staffPronoun = called
        ? ({ anh: "anh", chi: "chị", em: "em", co: "cô", chu: "chú" } as Record<string, string>)[called]
        : "SmartFurni";
      const selfReference = detectInboundSelfReference(message.content);
      return makeAddressingStyle({
        staffPronoun,
        customerAddress: selfReference || defaultCustomerAddressForStaff(staffPronoun),
        source: "inbound",
        confidence: selfReference ? "medium" : "low",
        evidence: compactEvidence(message.content),
      });
    }
  }

  return makeAddressingStyle({
    staffPronoun: "em",
    customerAddress: "anh/chị",
    source: "default",
    confidence: "low",
  });
}

function replaceWithCase(value: string, replacement: string) {
  return value[0] === value[0]?.toUpperCase()
    ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
    : replacement;
}

export function alignDraftMessageAddressing(
  draftMessage: string,
  style: ConversationAddressingStyle,
  participantName?: string,
) {
  let output = draftMessage.trim();
  if (!output || style.source === "default") return output;
  if (participantName?.trim()) {
    const escapedName = participantName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    output = output.replace(new RegExp(`^(?:Xin chào|Chào)\\s+${escapedName}\\s*,?`, "i"), `${style.greeting},`);
  }
  if (style.customerAddress !== "anh/chị") {
    output = output
      .replace(/anh\s*\/\s*chị/gi, match => replaceWithCase(match, style.customerAddress))
      .replace(/quý khách/gi, match => replaceWithCase(match, style.customerAddress))
      .replace(/\bBạn\b(?=\s+(?:có|cần|muốn|cho|giúp|vui lòng|thấy|đang|đã|sẽ|còn|ưu tiên|phản hồi))/g, replaceWithCase("Bạn", style.customerAddress))
      .replace(/\b(cho|gửi|hỗ trợ|tư vấn|của|với)\s+bạn\b/gi, match => match.replace(/bạn/i, style.customerAddress));
  }
  if (style.staffPronoun !== "SmartFurni") {
    const actionLookahead = "(?=xin|đã|sẽ|gửi|muốn|có thể|kiểm tra|hỗ trợ|tư vấn|cảm ơn|nhận|báo|trao đổi)";
    const staffReference = (offset: number) => offset === 0
      ? style.staffPronoun.charAt(0).toUpperCase() + style.staffPronoun.slice(1)
      : style.staffPronoun;
    output = output
      .replace(new RegExp(`\\bSmartFurni\\s+${actionLookahead}`, "gi"), (_match, offset: number) => `${staffReference(offset)} `)
      .replace(new RegExp(`\\b(?:bên em|bên mình|chúng tôi|tôi|em)\\s+${actionLookahead}`, "gi"), (_match, offset: number) => `${staffReference(offset)} `);
  }
  return output.replace(/\s{2,}/g, " ").trim();
}

function matchesKeyword(text: string, keywords: string[]) {
  return keywords.some(keyword => text.includes(normalizeText(keyword)));
}

function detectProducts(text: string, settings: FanpageCareSettings) {
  const normalized = normalizeText(text);
  const codes: string[] = text.toUpperCase().match(/\b(?:SMF|GSF|GYT)\d{2,4}\b/g) || [];
  const products = [...codes];
  if (/sofa|giuong gap|sofa bed/.test(normalized)) products.push("Sofa giường");
  if (/giuong (thong minh|cong thai hoc)|nang ha|zero gravity/.test(normalized)) products.push("Giường công thái học");
  if (/giuong y te|benh nhan|nguoi gia/.test(normalized)) products.push("Giường y tế");
  if (/nem|nệm/.test(text.toLowerCase())) products.push("Nệm");
  const configuredMatch = settings.keywords.products.find(keyword => normalized.includes(normalizeText(keyword)));
  if (configuredMatch && !products.some(product => !codes.includes(product))) products.push(configuredMatch);
  return unique(products);
}

function detectSignals(text: string, settings: FanpageCareSettings) {
  const normalized = normalizeText(text);
  const signals: string[] = [];
  if (matchesKeyword(normalized, settings.keywords.pricing)) signals.push("Hỏi giá/báo giá");
  if (matchesKeyword(normalized, settings.keywords.dimensions)) signals.push("Hỏi kích thước");
  if (matchesKeyword(normalized, settings.keywords.delivery)) signals.push("Hỏi giao lắp/showroom");
  if (matchesKeyword(normalized, settings.keywords.purchaseIntent)) signals.push("Có ý định mua/chốt");
  if (matchesKeyword(normalized, settings.keywords.contact)) signals.push("Sẵn sàng nhận liên hệ");
  return unique(signals);
}

function detectObjections(text: string, settings: FanpageCareSettings) {
  const normalized = normalizeText(text);
  const objections: string[] = [];
  if (/mac|cao|re hon|giam gia|bot gia/.test(normalized)) objections.push("Ngại giá");
  if (/suy nghi|de xem|hoi vo|hoi chong|hoi gia dinh/.test(normalized)) objections.push("Cần thêm thời gian");
  if (/bao hanh|co ben|lo hong|chat luong/.test(normalized)) objections.push("Lo chất lượng/bảo hành");
  if (/xa|phi ship|giao hang|lap dat/.test(normalized)) objections.push("Lo giao lắp/vận chuyển");
  if (/khong vua|size nao|kich thuoc nao/.test(normalized)) objections.push("Chưa chắc kích thước");
  if (matchesKeyword(normalized, settings.keywords.objections) && !objections.length) {
    objections.push("Có trở ngại cần nhân viên làm rõ");
  }
  return unique(objections);
}

function detectNeed(text: string, products: string[], settings: FanpageCareSettings) {
  const normalized = normalizeText(text);
  const needs: string[] = [];
  if (matchesKeyword(normalized, settings.keywords.smallSpaceNeeds)) needs.push("Tối ưu không gian nhỏ");
  if (matchesKeyword(normalized, settings.keywords.homeCareNeeds)) needs.push("Nâng đỡ và chăm sóc tại nhà");
  if (matchesKeyword(normalized, settings.keywords.visualProofNeeds)) needs.push("Cần xem sản phẩm thực tế");
  if (products.length) needs.push(`Quan tâm ${products.join(", ")}`);
  return needs.join("; ") || "Cần hỏi thêm nhu cầu sử dụng, kích thước, khu vực và ngân sách.";
}

function addHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function assessFanpageConversation(
  input: Pick<ConversationForAnalysis, "messages" | "unreadCount" | "canReply" | "latestMessageAt">,
  settings: FanpageCareSettings = DEFAULT_FANPAGE_CARE_SETTINGS,
): DeterministicConversationAssessment {
  const inbound = input.messages.filter(message => message.direction === "inbound");
  const customerText = inbound.map(message => message.content).join("\n");
  const allText = input.messages.map(message => message.content).join("\n");
  const productInterest = detectProducts(allText, settings);
  const buyingSignals = detectSignals(customerText, settings);
  const objections = detectObjections(customerText, settings);
  const customerNeed = detectNeed(customerText, productInterest, settings);
  const latest = input.messages[input.messages.length - 1];
  const latestInboundUnanswered = latest?.direction === "inbound";
  const recentHours = input.latestMessageAt
    ? Math.max(0, (Date.now() - new Date(input.latestMessageAt).getTime()) / 3_600_000)
    : 999;

  const weights = settings.scoring;
  let score = inbound.length ? weights.inboundBase : 0;
  score += Math.min(productInterest.length * weights.productWeight, weights.productCap);
  score += Math.min(buyingSignals.length * weights.buyingSignalWeight, weights.buyingSignalCap);
  if (latestInboundUnanswered) score += weights.unansweredBonus;
  if (input.unreadCount > 0) score += weights.unreadBonus;
  if (recentHours <= weights.recentWindowHours) score += weights.recentBonus;
  if (!input.canReply) score -= weights.cannotReplyPenalty;
  score -= Math.min(objections.length * weights.objectionPenalty, weights.objectionCap);
  score = Math.max(0, Math.min(100, score));

  const leadTemperature: FanpageLeadTemperature = score >= weights.hotThreshold ? "hot" : score >= weights.warmThreshold ? "warm" : "cold";
  const funnelStage = buyingSignals.includes("Có ý định mua/chốt")
    ? "closing"
    : buyingSignals.includes("Hỏi giá/báo giá")
      ? "quotation"
      : productInterest.length
        ? "consulting"
        : "new";
  const nextBestAction = latestInboundUnanswered
    ? leadTemperature === "hot"
      ? "Phản hồi Messenger và gọi xác nhận nhu cầu trong 30 phút."
      : "Phản hồi Messenger trong ngày, hỏi rõ sản phẩm, kích thước, khu vực và ngân sách."
    : leadTemperature === "hot"
      ? "Gọi lại trong 2 giờ để xác nhận bước chốt tiếp theo."
      : "Chăm sóc lại bằng câu hỏi ngắn, có giá trị và không gây áp lực.";

  return {
    leadScore: score,
    leadTemperature,
    funnelStage,
    customerNeed,
    productInterest,
    objections,
    buyingSignals,
    nextBestAction,
    dueAt: addHours(leadTemperature === "hot" ? settings.timing.hotDueHours : leadTemperature === "warm" ? settings.timing.warmDueHours : settings.timing.coldDueHours),
    qualifies: inbound.length > 0 && (score >= weights.qualifyThreshold || latestInboundUnanswered || input.unreadCount > 0),
    latestInboundUnanswered,
  };
}

export function buildFallbackCarePlan(
  conversation: ConversationForAnalysis,
  assessment: DeterministicConversationAssessment,
): GeneratedCarePlan {
  const addressing = detectConversationAddressing(conversation);
  const { staffPronoun, customerAddress, greeting } = addressing;
  const firstGoal = assessment.funnelStage === "closing"
    ? "Xác nhận thông tin để chốt đơn"
    : assessment.funnelStage === "quotation"
      ? "Làm rõ size và khu vực trước khi báo giá"
      : "Làm rõ nhu cầu thật của khách";
  const firstDraft = assessment.latestInboundUnanswered
    ? `${greeting}, ${staffPronoun} đã nhận được tin nhắn về ${assessment.productInterest[0] || "sản phẩm SmartFurni"}. ${customerAddress.charAt(0).toUpperCase() + customerAddress.slice(1)} cho ${staffPronoun} xin thêm kích thước cần dùng và khu vực giao lắp để ${staffPronoun} tư vấn chính xác nhé.`
    : `${greeting}, ${staffPronoun} xin phép hỏi thăm thêm về nhu cầu ${assessment.productInterest[0] || "nội thất thông minh"} mình đã trao đổi. Hiện ${customerAddress} còn cần ${staffPronoun} hỗ trợ về kích thước, giá hay giao lắp không ạ?`;

  return {
    conversationId: conversation.conversationId,
    summary: `${conversation.participantName || "Khách Facebook"} trên ${conversation.pageName}: ${assessment.customerNeed}`,
    customerNeed: assessment.customerNeed,
    productInterest: assessment.productInterest,
    objections: assessment.objections,
    buyingSignals: assessment.buyingSignals,
    nextBestAction: assessment.nextBestAction,
    confidence: Math.min(0.95, 0.55 + conversation.messages.length * 0.025 + assessment.buyingSignals.length * 0.06),
    planSteps: [
      {
        dayOffset: 0,
        when: assessment.leadTemperature === "hot" ? "Trong 30 phút" : "Trong hôm nay",
        channel: "Messenger",
        goal: firstGoal,
        action: assessment.nextBestAction,
        draftMessage: firstDraft,
        requiresHumanApproval: true,
      },
      {
        dayOffset: 1,
        when: "Sau 24 giờ nếu khách chưa phản hồi",
        channel: "Điện thoại",
        goal: "Xác nhận khách còn nhu cầu và gỡ vướng mắc chính",
        action: "Nhân viên gọi một lần trong giờ hành chính; nếu không nghe máy thì cập nhật CRM, không gọi dồn.",
        requiresHumanApproval: true,
      },
      {
        dayOffset: 3,
        when: "Ngày thứ 3",
        channel: "Messenger",
        goal: "Bổ sung thông tin có giá trị",
        action: "Gửi một nội dung phù hợp như ảnh thực tế, kích thước hoặc chính sách; không gửi lại nguyên báo giá.",
        draftMessage: `${staffPronoun.charAt(0).toUpperCase() + staffPronoun.slice(1)} gửi thêm thông tin thực tế để ${customerAddress} dễ cân nhắc. Nếu ${customerAddress} cho ${staffPronoun} biết kích thước và khu vực, ${staffPronoun} sẽ lọc đúng phương án phù hợp nhất.`,
        requiresHumanApproval: true,
      },
      {
        dayOffset: 7,
        when: "Ngày thứ 7",
        channel: "CRM",
        goal: "Kết thúc chu kỳ chăm sóc lịch sự",
        action: "Sale đánh giá lại phản hồi, chuyển nuôi dưỡng hoặc đóng kế hoạch; không tự gửi tin nhắn hàng loạt.",
        requiresHumanApproval: true,
      },
    ],
  };
}
