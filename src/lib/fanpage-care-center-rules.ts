import type {
  FanpageCarePlanStep,
  FanpageLeadTemperature,
} from "@/types/fanpage-care-center";

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

function detectProducts(text: string) {
  const normalized = normalizeText(text);
  const codes = text.toUpperCase().match(/\b(?:SMF|GSF|GYT)\d{2,4}\b/g) || [];
  const products = [...codes];
  if (/sofa|giuong gap|sofa bed/.test(normalized)) products.push("Sofa giường");
  if (/giuong (thong minh|cong thai hoc)|nang ha|zero gravity/.test(normalized)) products.push("Giường công thái học");
  if (/giuong y te|benh nhan|nguoi gia/.test(normalized)) products.push("Giường y tế");
  if (/nem|nệm/.test(text.toLowerCase())) products.push("Nệm");
  return unique(products);
}

function detectSignals(text: string) {
  const normalized = normalizeText(text);
  const signals: string[] = [];
  if (/gia|bao gia|bao nhieu|chi phi/.test(normalized)) signals.push("Hỏi giá/báo giá");
  if (/size|kich thuoc|1m|0 9m|90cm|120cm|140cm|160cm|180cm/.test(normalized)) signals.push("Hỏi kích thước");
  if (/giao|lap dat|ship|dia chi|showroom|o dau/.test(normalized)) signals.push("Hỏi giao lắp/showroom");
  if (/mua|dat hang|chot|coc|chuyen khoan|lay mau/.test(normalized)) signals.push("Có ý định mua/chốt");
  if (/so dien thoai|sdt|goi cho|lien he/.test(normalized)) signals.push("Sẵn sàng nhận liên hệ");
  return unique(signals);
}

function detectObjections(text: string) {
  const normalized = normalizeText(text);
  const objections: string[] = [];
  if (/mac|cao|re hon|giam gia|bot gia/.test(normalized)) objections.push("Ngại giá");
  if (/suy nghi|de xem|hoi vo|hoi chong|hoi gia dinh/.test(normalized)) objections.push("Cần thêm thời gian");
  if (/bao hanh|co ben|lo hong|chat luong/.test(normalized)) objections.push("Lo chất lượng/bảo hành");
  if (/xa|phi ship|giao hang|lap dat/.test(normalized)) objections.push("Lo giao lắp/vận chuyển");
  if (/khong vua|size nao|kich thuoc nao/.test(normalized)) objections.push("Chưa chắc kích thước");
  return unique(objections);
}

function detectNeed(text: string, products: string[]) {
  const normalized = normalizeText(text);
  const needs: string[] = [];
  if (/phong nho|can ho|chung cu|studio|tiet kiem dien tich/.test(normalized)) needs.push("Tối ưu không gian nhỏ");
  if (/nguoi gia|benh nhan|dau lung|nang ha|doc sach|xem phim/.test(normalized)) needs.push("Nâng đỡ và chăm sóc tại nhà");
  if (/anh thuc te|video|clip|showroom/.test(normalized)) needs.push("Cần xem sản phẩm thực tế");
  if (products.length) needs.push(`Quan tâm ${products.join(", ")}`);
  return needs.join("; ") || "Cần hỏi thêm nhu cầu sử dụng, kích thước, khu vực và ngân sách.";
}

function addHours(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function assessFanpageConversation(
  input: Pick<ConversationForAnalysis, "messages" | "unreadCount" | "canReply" | "latestMessageAt">,
): DeterministicConversationAssessment {
  const inbound = input.messages.filter(message => message.direction === "inbound");
  const customerText = inbound.map(message => message.content).join("\n");
  const allText = input.messages.map(message => message.content).join("\n");
  const productInterest = detectProducts(allText);
  const buyingSignals = detectSignals(customerText);
  const objections = detectObjections(customerText);
  const customerNeed = detectNeed(customerText, productInterest);
  const latest = input.messages[input.messages.length - 1];
  const latestInboundUnanswered = latest?.direction === "inbound";
  const recentHours = input.latestMessageAt
    ? Math.max(0, (Date.now() - new Date(input.latestMessageAt).getTime()) / 3_600_000)
    : 999;

  let score = inbound.length ? 18 : 0;
  score += Math.min(productInterest.length * 10, 20);
  score += Math.min(buyingSignals.length * 15, 45);
  if (latestInboundUnanswered) score += 16;
  if (input.unreadCount > 0) score += 8;
  if (recentHours <= 24) score += 8;
  if (!input.canReply) score -= 15;
  score -= Math.min(objections.length * 3, 9);
  score = Math.max(0, Math.min(100, score));

  const leadTemperature: FanpageLeadTemperature = score >= 75 ? "hot" : score >= 45 ? "warm" : "cold";
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
    dueAt: addHours(leadTemperature === "hot" ? 0.5 : leadTemperature === "warm" ? 4 : 24),
    qualifies: inbound.length > 0 && (score >= 40 || latestInboundUnanswered || input.unreadCount > 0),
    latestInboundUnanswered,
  };
}

export function buildFallbackCarePlan(
  conversation: ConversationForAnalysis,
  assessment: DeterministicConversationAssessment,
): GeneratedCarePlan {
  const firstGoal = assessment.funnelStage === "closing"
    ? "Xác nhận thông tin để chốt đơn"
    : assessment.funnelStage === "quotation"
      ? "Làm rõ size và khu vực trước khi báo giá"
      : "Làm rõ nhu cầu thật của khách";
  const firstDraft = assessment.latestInboundUnanswered
    ? `Chào anh/chị, em đã nhận được tin nhắn về ${assessment.productInterest[0] || "sản phẩm SmartFurni"}. Anh/chị cho em xin thêm kích thước cần dùng và khu vực giao lắp để em tư vấn chính xác nhé.`
    : `Chào anh/chị, em xin phép hỏi thăm thêm về nhu cầu ${assessment.productInterest[0] || "nội thất thông minh"} mình đã trao đổi. Hiện anh/chị còn cần em hỗ trợ về kích thước, giá hay giao lắp không ạ?`;

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
        draftMessage: "Em gửi thêm thông tin thực tế để anh/chị dễ cân nhắc. Nếu mình cho em biết size và khu vực, em sẽ lọc đúng phương án phù hợp nhất.",
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
