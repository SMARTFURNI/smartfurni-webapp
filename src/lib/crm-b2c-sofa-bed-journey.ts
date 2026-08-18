import type { Lead } from "@/lib/crm-types";
import {
  type B2BSofaJourneyDefinition,
  type B2BSofaJourneySettings,
  type JourneyStepDefinition,
  type JourneyStepOverride,
} from "@/lib/crm-b2b-sofa-journey";

export const B2C_SOFA_BED_JOURNEY_CODE = "JRN_B2C_SOFA_BED_90D_V1";
export const B2C_SOFA_BED_JOURNEY_VERSION = 1;

export interface B2CSofaBedJourneySettings extends B2BSofaJourneySettings {
  requireRetailSignal: boolean;
  requireAcceptedZaloFriendship: boolean;
}

export type B2CSofaBedJourneyDefinition = B2BSofaJourneyDefinition;

export const DEFAULT_B2C_SOFA_BED_JOURNEY_SETTINGS: B2CSofaBedJourneySettings = {
  enabled: false,
  autoEnroll: true,
  autoEnrollExisting: false,
  canaryMode: false,
  canaryLeadIds: [],
  requireHospitalitySignal: false,
  requireRetailSignal: true,
  requireAcceptedZaloFriendship: true,
  activationAt: null,
  timezone: "Asia/Ho_Chi_Minh",
  businessHoursStart: "08:30",
  businessHoursEnd: "20:30",
  maxMessagesPerSevenDays: 4,
  automationAccountId: "",
  surveyFormUrl: "",
  approvedDemoVideoUrl: "",
  projectBriefUrl: "",
  comparisonPackUrl: "",
  stepOverrides: {},
  doNotContactTags: ["DNC", "Do not contact", "Không liên hệ", "Không làm phiền", "Dừng chăm sóc", "Unsubscribe"],
};

function zalo(body: string): string {
  return body.trim();
}

function step(input: Omit<JourneyStepDefinition, "primaryChannel" | "fallbackChannels" | "emailSubject" | "emailBody">): JourneyStepDefinition {
  return { ...input, primaryChannel: "zalo_personal", fallbackChannels: [], emailSubject: "", emailBody: "" };
}

export const B2C_SOFA_BED_JOURNEY: B2CSofaBedJourneyDefinition = {
  code: B2C_SOFA_BED_JOURNEY_CODE,
  version: B2C_SOFA_BED_JOURNEY_VERSION,
  name: "Khách lẻ – Sofa Giường 90 ngày",
  description: "Chăm sóc chỉ qua Zalo cá nhân, tập trung trong 14 ngày đầu và thưa dần đến ngày 90. Hành trình chỉ chạy khi đã kết bạn Zalo.",
  officialContact: {
    hotline: "028.7122.0818",
    zalo: "0918.326.552",
    email: "b2b@smartfurni.com.vn",
    website: "https://www.smartfurni.com.vn",
    showroomHcm: "74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức",
    showroomHanoi: "B9-LK4, KĐT Geleximco B, Lê Trọng Tấn, Q. Hà Đông",
    factory: "202 Nguyễn Thị Sáng, X. Đông Thạnh, H. Hóc Môn",
  },
  steps: [
    step({ id: "D0_SPACE_DISCOVERY", day: 0, sendHour: 9, sendMinute: 15, phase: "diagnosis", title: "Xác định không gian", objective: "Hiểu vị trí đặt và cách khách muốn dùng sofa giường.", zaloBody: zalo(`Chào anh/chị {{customer_name}}, em là {{sales_name}} từ SmartFurni. Em thấy anh/chị đang quan tâm Sofa Giường.

Anh/chị dự định đặt sản phẩm ở phòng khách, phòng ngủ phụ, căn hộ nhỏ hay không gian khác ạ? Nếu tiện, anh/chị gửi em một ảnh vị trí đặt để em lọc cấu hình phù hợp.`) }),
    step({ id: "D2_DIMENSIONS", day: 2, sendHour: 19, sendMinute: 15, phase: "diagnosis", title: "Kích thước và ảnh thực tế", objective: "Thu kích thước vị trí trước khi đề xuất mẫu.", zaloBody: zalo(`Để Sofa Giường vừa khi đóng và không vướng khi mở, anh/chị giúp em chiều rộng × chiều sâu vị trí đặt, hoặc gửi một ảnh chụp toàn cảnh.

Nếu chưa đo được, em sẽ hướng dẫn anh/chị đo nhanh trong vài phút.`) }),
    step({ id: "D4_DEMO", day: 4, sendHour: 14, sendMinute: 0, phase: "fit", title: "Video thao tác thực tế", objective: "Cho khách thấy cách chuyển đổi giữa sofa và giường.", zaloBody: zalo(`Em gửi anh/chị video thao tác Sofa Giường thực tế: {{approved_demo_video_url}}

Khi xem, anh/chị để ý không gian cần có khi mở giường và cách thao tác. Anh/chị ưu tiên gọn khi đóng hay rộng, thoải mái hơn khi ngủ ạ?`), requiredContext: ["approved_demo_video_url"] }),
    step({ id: "D7_USAGE", day: 7, sendHour: 19, sendMinute: 15, phase: "fit", title: "Tần suất sử dụng", objective: "Phân biệt nhu cầu ngủ thường xuyên và thỉnh thoảng.", zaloBody: zalo(`Sofa Giường của anh/chị sẽ dùng để ngủ hằng ngày, cuối tuần hay chỉ khi có khách ở lại ạ?

Tần suất sử dụng giúp em ưu tiên đúng kiểu đệm, kích thước và cách vận hành thay vì gửi quá nhiều mẫu.`) }),
    step({ id: "D10_MATERIAL", day: 10, sendHour: 9, sendMinute: 30, phase: "fit", title: "Chất liệu và vệ sinh", objective: "Xác định ưu tiên sử dụng và bảo quản.", zaloBody: zalo(`Với chất liệu bọc, anh/chị ưu tiên cảm giác mềm, dễ vệ sinh, màu dễ phối hay độ bền khi sử dụng thường xuyên?

Anh/chị cho em biết nhà có trẻ nhỏ hoặc thú cưng không để em tư vấn hướng chất liệu phù hợp hơn.`) }),
    step({ id: "D12_PRIORITY", day: 12, sendHour: 19, sendMinute: 15, phase: "fit", title: "Chốt ưu tiên chính", objective: "Thu hẹp phương án theo ưu tiên lớn nhất.", zaloBody: zalo(`Đến lúc này, tiêu chí quan trọng nhất của anh/chị là:
1 — Gọn khi làm sofa
2 — Thoải mái khi ngủ
3 — Dễ vệ sinh
4 — Hợp phong cách nội thất
5 — Phù hợp khoảng đầu tư

Anh/chị trả lời 1–5, em sẽ tập trung đúng phương án.`) }),
    step({ id: "D14_DEMO_INVITE", day: 14, sendHour: 14, sendMinute: 0, phase: "approval", title: "Mời trải nghiệm", objective: "Đề nghị bước tiếp theo cụ thể sau hai tuần tư vấn.", zaloBody: zalo(`Nếu anh/chị muốn kiểm tra trực tiếp độ ngồi, bề mặt ngủ và thao tác mở, em có thể sắp xếp lịch trải nghiệm tại showroom hoặc tư vấn video theo mẫu phù hợp.

Anh/chị thuận tiện ngày nào để em chuẩn bị trước ạ?`) }),
    step({ id: "D21_OBJECTION", day: 21, sendHour: 19, sendMinute: 15, phase: "approval", title: "Gỡ vướng mắc", objective: "Xác định lý do khách chưa tiến tới bước chọn mẫu.", zaloBody: zalo(`Em xin phép hỏi ngắn: điều làm anh/chị còn cân nhắc về Sofa Giường hiện tại là kích thước, kiểu dáng, trải nghiệm nằm, ngân sách hay thời điểm mua?

Anh/chị chỉ cần nêu một điểm, em sẽ trả lời đúng phần đó.`) }),
    step({ id: "D30_TIMING", day: 30, sendHour: 9, sendMinute: 30, phase: "approval", title: "Thời điểm mua và báo giá", objective: "Xác nhận mốc quyết định để chuẩn bị báo giá phù hợp.", zaloBody: zalo(`Anh/chị dự kiến cần Sofa Giường trong tháng này, 1–3 tháng tới hay chưa có mốc cụ thể?

Khi có kích thước và mức đầu tư dự kiến, em có thể chuẩn bị phương án gọn để anh/chị dễ so sánh.`) }),
    step({ id: "D45_PERSONAL_REMINDER", day: 45, sendHour: 19, sendMinute: 15, phase: "long_term", title: "Nhắc lại theo nhu cầu", objective: "Tái kết nối bằng đúng bối cảnh khách đã cung cấp.", zaloBody: zalo(`Em nhắn lại về nhu cầu Sofa Giường cho {{use_space}} của anh/chị. Trước đó anh/chị ưu tiên {{primary_priority}}.

Nhu cầu này còn phù hợp không, hay không gian/kế hoạch của anh/chị đã thay đổi?`), requiredContext: ["use_space", "primary_priority"] }),
    step({ id: "D60_READINESS", day: 60, sendHour: 9, sendMinute: 30, phase: "long_term", title: "Kiểm tra mức sẵn sàng", objective: "Xác định khách có muốn quay lại bước tư vấn cụ thể.", zaloBody: zalo(`SmartFurni xin hỏi thăm: anh/chị đã sẵn sàng chọn mẫu Sofa Giường chưa, hay muốn em liên hệ lại vào thời điểm khác?

Em sẽ theo đúng thời điểm anh/chị thấy thuận tiện.`) }),
    step({ id: "D75_LOGISTICS", day: 75, sendHour: 14, sendMinute: 0, phase: "long_term", title: "Thông tin giao lắp", objective: "Thu thông tin vận chuyển cần thiết trước khi ra quyết định.", zaloBody: zalo(`Khi chọn Sofa Giường, ngoài kích thước vị trí đặt còn cần kiểm tra lối vận chuyển như cửa, thang máy hoặc cầu thang.

Nếu anh/chị gửi khu vực giao và vài ảnh lối vào, em có thể hỗ trợ kiểm tra sơ bộ trước khi chốt cấu hình.`) }),
    step({ id: "D90_CLOSE_LOOP", day: 90, sendHour: 9, sendMinute: 30, phase: "long_term", title: "Đóng vòng chăm sóc", objective: "Xin phép tiếp tục, hẹn lại hoặc kết thúc tôn trọng.", zaloBody: zalo(`SmartFurni xin phép khép lại chuỗi tư vấn Sofa Giường hiện tại. Anh/chị chọn:
1 — Tiếp tục tư vấn
2 — Liên hệ lại vào thời điểm khác
3 — Ngừng nhận nội dung về sản phẩm này

SmartFurni sẽ thực hiện đúng lựa chọn của anh/chị.`) }),
  ],
};

export function b2cSofaBedJourneyDefinitionWithOverrides(settings: Pick<B2CSofaBedJourneySettings, "stepOverrides">): B2CSofaBedJourneyDefinition {
  return {
    ...B2C_SOFA_BED_JOURNEY,
    steps: B2C_SOFA_BED_JOURNEY.steps.map(current => {
      const override: JourneyStepOverride = settings.stepOverrides?.[current.id] || {};
      return {
        ...current,
        enabled: override.enabled ?? true,
        day: Math.max(0, Math.min(365, Number(override.day ?? current.day))),
        sendHour: Math.max(0, Math.min(23, Number(override.sendHour ?? current.sendHour))),
        sendMinute: Math.max(0, Math.min(59, Number(override.sendMinute ?? current.sendMinute))),
        // Workflow này không cho phép cấu hình rơi sang OA hoặc email.
        primaryChannel: "zalo_personal" as const,
        fallbackChannels: [],
        emailSubject: "",
        emailBody: "",
        zaloBody: override.zaloBody ?? current.zaloBody,
        mediaAssetIds: [...new Set(override.mediaAssetIds || current.mediaAssetIds || [])].slice(0, 10),
      };
    }),
  };
}

const SOFA_BED_TERMS = ["sofa giường", "sofa giuong", "sofa bed", "sofabed", "ghế giường", "ghe giuong"];

export function leadHasSofaBedInterest(lead: Lead): boolean {
  if (lead.interestedProducts?.includes("sofa_bed")) return true;
  const text = [lead.notes, lead.sourceDetail, lead.projectName, lead.company, ...(lead.tags || [])].join(" ").toLocaleLowerCase("vi");
  return SOFA_BED_TERMS.some(term => text.includes(term));
}

export function isEligibleForB2CSofaBedJourney(lead: Lead, settings: B2CSofaBedJourneySettings): { eligible: boolean; reason?: string } {
  if (!["new", "profile_sent", "surveyed"].includes(lead.stage)) return { eligible: false, reason: "Lead không còn ở giai đoạn nuôi dưỡng chung." };
  if (!leadHasSofaBedInterest(lead)) return { eligible: false, reason: "Chưa có tín hiệu quan tâm Sofa Giường." };
  const retail = lead.type === "retail" || lead.customerSegment === "retail";
  if (settings.requireRetailSignal && !retail) return { eligible: false, reason: "Lead chưa được xác định là khách lẻ." };
  const normalizedTags = new Set((lead.tags || []).map(tag => tag.trim().toLocaleLowerCase("vi")));
  if (settings.doNotContactTags.some(tag => normalizedTags.has(tag.trim().toLocaleLowerCase("vi")))) return { eligible: false, reason: "Lead có nhãn không liên hệ." };
  if (!lead.phone && !lead.zaloPhone && !lead.zaloId) return { eligible: false, reason: "Không có số điện thoại hoặc Zalo để liên hệ." };
  if (settings.requireAcceptedZaloFriendship && lead.zaloFriendship?.status !== "accepted") return { eligible: false, reason: "Chưa kết bạn Zalo cá nhân." };
  return { eligible: true };
}

export function buildB2CSofaBedJourneyContext(lead: Lead, settings: B2CSofaBedJourneySettings, extra: Record<string, string> = {}): Record<string, string> {
  return {
    customer_name: lead.name || "Anh/Chị",
    sales_name: lead.assignedTo || "Tư vấn viên SmartFurni",
    lead_source: lead.source || "website",
    city: lead.district || lead.projectAddress || "",
    use_space: "",
    primary_priority: "",
    available_dimensions: "",
    usage_frequency: "",
    material_preference: "",
    purchase_timing: "",
    approved_demo_video_url: settings.approvedDemoVideoUrl,
    ...extra,
  };
}
