import type { Lead } from "@/lib/crm-types";

export const B2B_SOFA_JOURNEY_CODE = "JRN_B2B_HOSPITALITY_SOFA_90D_V2";
export const B2B_SOFA_JOURNEY_VERSION = 2;

export type JourneyChannel = "zalo_personal" | "zalo_oa" | "email";

export interface JourneyStepDefinition {
  id: string;
  day: number;
  sendHour: number;
  sendMinute: number;
  phase: "diagnosis" | "fit" | "approval" | "long_term";
  title: string;
  objective: string;
  primaryChannel: JourneyChannel;
  fallbackChannels: JourneyChannel[];
  emailSubject: string;
  emailBody: string;
  zaloBody: string;
  requiredContext?: string[];
}

export interface B2BSofaJourneyDefinition {
  code: string;
  version: number;
  name: string;
  description: string;
  officialContact: {
    hotline: string;
    zalo: string;
    email: string;
    website: string;
    showroomHcm: string;
    showroomHanoi: string;
    factory: string;
  };
  steps: JourneyStepDefinition[];
}

export interface B2BSofaJourneySettings {
  enabled: boolean;
  autoEnroll: boolean;
  autoEnrollExisting: boolean;
  requireHospitalitySignal: boolean;
  activationAt: string | null;
  timezone: "Asia/Ho_Chi_Minh";
  businessHoursStart: string;
  businessHoursEnd: string;
  maxMessagesPerSevenDays: number;
  automationAccountId: string;
  surveyFormUrl: string;
  approvedDemoVideoUrl: string;
  projectBriefUrl: string;
  comparisonPackUrl: string;
  doNotContactTags: string[];
}

export const DEFAULT_B2B_SOFA_JOURNEY_SETTINGS: B2BSofaJourneySettings = {
  enabled: false,
  autoEnroll: true,
  autoEnrollExisting: false,
  requireHospitalitySignal: true,
  activationAt: null,
  timezone: "Asia/Ho_Chi_Minh",
  businessHoursStart: "08:30",
  businessHoursEnd: "18:00",
  maxMessagesPerSevenDays: 4,
  automationAccountId: "",
  surveyFormUrl: "",
  approvedDemoVideoUrl: "",
  projectBriefUrl: "",
  comparisonPackUrl: "",
  doNotContactTags: [
    "DNC",
    "Do not contact",
    "Không liên hệ",
    "Không làm phiền",
    "Dừng chăm sóc",
    "Unsubscribe",
  ],
};

const ZALO_SIGNATURE = [
  "",
  "SmartFurni | Hotline 028.7122.0818",
  "Zalo tư vấn 0918.326.552 | smartfurni.com.vn",
].join("\n");

const EMAIL_SIGNATURE = [
  "",
  "Trân trọng,",
  "{{sales_name}} – Bộ phận dự án B2B SmartFurni",
  "Hotline: 028.7122.0818 | Zalo: 0918.326.552",
  "Email: b2b@smartfurni.com.vn",
  "Website: https://www.smartfurni.com.vn",
  "Showroom: TP.HCM và Hà Nội",
].join("\n");

function zalo(body: string): string {
  return `${body.trim()}${ZALO_SIGNATURE}`;
}

function email(body: string): string {
  return `${body.trim()}${EMAIL_SIGNATURE}`;
}

export const B2B_SOFA_JOURNEY: B2BSofaJourneyDefinition = {
  code: B2B_SOFA_JOURNEY_CODE,
  version: B2B_SOFA_JOURNEY_VERSION,
  name: "Chăm sóc B2B lưu trú – Sofa giường 90 ngày",
  description: "Chuỗi tư vấn cho chủ đầu tư homestay, BnB, căn hộ dịch vụ và phòng trọ, tập trung cao trong 30 ngày đầu.",
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
    {
      id: "D0_QUALIFY",
      day: 0,
      sendHour: 9,
      sendMinute: 15,
      phase: "diagnosis",
      title: "Xác nhận đúng nhu cầu",
      objective: "Thu thập số lượng, kích thước và thời điểm triển khai trước khi giới thiệu mẫu.",
      primaryChannel: "zalo_personal",
      fallbackChannels: ["zalo_oa", "email"],
      emailSubject: "SmartFurni xác nhận nhu cầu sofa giường cho {{property_name}}",
      zaloBody: zalo(`
Chào anh/chị {{customer_name}}, em là {{sales_name}} từ SmartFurni.

Em nhận được yêu cầu của anh/chị về sofa giường cho {{property_type}} tại {{city}}. Để không gửi nhiều mẫu không đúng nhu cầu, anh/chị giúp em 3 thông tin:

1. Số phòng hoặc số sofa dự kiến
2. Kích thước vị trí đặt: rộng × sâu, hoặc gửi em một ảnh phòng
3. Thời điểm dự kiến hoàn thiện/khai trương

Anh/chị có thể trả lời ngắn như: “12 phòng – vị trí 1,5 × 2,2m – hoàn thiện tháng 11”. Em sẽ lọc tối đa 2 cấu hình phù hợp. Nếu chưa có kích thước, anh/chị nhắn CHECKLIST, em gửi hướng dẫn đo.`),
      emailBody: email(`
Chào anh/chị {{customer_name}},

SmartFurni đã nhận được yêu cầu của anh/chị về sofa giường cho {{property_type}} tại {{city}}.

Để lựa chọn đúng cấu hình, anh/chị vui lòng cho biết số phòng hoặc số sofa dự kiến, kích thước vị trí đặt và thời điểm dự kiến hoàn thiện/khai trương. Anh/chị có thể trả lời trực tiếp email này hoặc gửi ảnh phòng qua Zalo 0918.326.552.

Sau khi nhận thông tin, SmartFurni sẽ lọc tối đa hai cấu hình phù hợp để anh/chị dễ so sánh.`),
    },
    {
      id: "D1_SURVEY_CHECKLIST",
      day: 1,
      sendHour: 8,
      sendMinute: 45,
      phase: "diagnosis",
      title: "Checklist khảo sát dự án",
      objective: "Giúp khách chuẩn bị đủ dữ liệu kỹ thuật thay vì xem catalogue chung.",
      primaryChannel: "email",
      fallbackChannels: ["zalo_oa", "zalo_personal"],
      emailSubject: "[SmartFurni] 7 thông tin để chọn đúng sofa giường cho {{property_name}}",
      zaloBody: zalo(`
SmartFurni đã chuẩn bị checklist 7 thông tin để chọn sofa giường cho cơ sở lưu trú: loại hình, số lượng, kích thước đóng/mở, tần suất ngủ, yêu cầu vệ sinh, màu/chất liệu và thời điểm lắp đặt.

Anh/chị trả lời CHECKLIST để nhận hướng dẫn, hoặc gửi ảnh/mặt bằng qua Zalo này. {{survey_form_line}}`),
      emailBody: email(`
Chào anh/chị {{customer_name}},

Sofa giường dùng cho cơ sở lưu trú cần được đánh giá khác với sản phẩm dùng trong gia đình. Ngoài hình thức, cấu hình cần phù hợp với diện tích phòng, tần suất sử dụng và quy trình vệ sinh giữa các lượt khách.

SmartFurni đề nghị xác nhận 7 thông tin:

1. Loại hình: homestay, BnB, căn hộ dịch vụ hay phòng trọ
2. Số phòng và số lượng dự kiến
3. Kích thước vị trí khi đặt ở chế độ sofa
4. Khoảng trống còn lại khi mở thành giường
5. Tần suất dự kiến sử dụng để ngủ
6. Yêu cầu về màu sắc, chất liệu và vệ sinh
7. Mốc hoàn thiện, lắp đặt hoặc khai trương

Anh/chị chỉ cần trả lời email này hoặc gửi mặt bằng/ảnh phòng qua Zalo 0918.326.552. {{survey_form_line}}

Đội ngũ SmartFurni sẽ lập cấu hình sơ bộ trước khi đề xuất sản phẩm.`),
    },
    {
      id: "D3_PRIORITY",
      day: 3,
      sendHour: 9,
      sendMinute: 30,
      phase: "diagnosis",
      title: "Phân loại ưu tiên",
      objective: "Xác định ưu tiên vận hành để cá nhân hóa phần còn lại của journey.",
      primaryChannel: "zalo_oa",
      fallbackChannels: ["zalo_personal", "email"],
      emailSubject: "Ưu tiên chính khi chọn sofa giường cho {{property_name}}",
      zaloBody: zalo(`
Khi lựa chọn sofa giường cho {{property_name}}, anh/chị đang ưu tiên yếu tố nào nhất?

1 — Bổ sung chỗ ngủ khi cần
2 — Giữ phòng gọn và rộng khi không sử dụng
3 — Dễ vệ sinh, thuận tiện vận hành
4 — Đồng bộ màu sắc và phong cách nội thất
5 — Kiểm soát ngân sách đầu tư

Anh/chị chỉ cần trả lời một số. SmartFurni sẽ gửi nội dung đúng với ưu tiên đó.`),
      emailBody: email(`
Chào anh/chị {{customer_name}},

Để đề xuất đúng cấu hình cho {{property_name}}, anh/chị vui lòng chọn ưu tiên quan trọng nhất:

1 — Bổ sung chỗ ngủ khi cần
2 — Giữ phòng gọn và rộng khi không sử dụng
3 — Dễ vệ sinh, thuận tiện vận hành
4 — Đồng bộ màu sắc và phong cách nội thất
5 — Kiểm soát ngân sách đầu tư

Anh/chị chỉ cần trả lời email bằng một số. SmartFurni sẽ điều chỉnh đề xuất theo lựa chọn đó.`),
    },
    {
      id: "D5_DEMO",
      day: 5,
      sendHour: 14,
      sendMinute: 15,
      phase: "fit",
      title: "Video thao tác và kiểm tra mặt bằng",
      objective: "Chứng minh thao tác thực tế và xin ảnh phòng để đánh giá độ vừa vặn.",
      primaryChannel: "zalo_personal",
      fallbackChannels: ["zalo_oa", "email"],
      emailSubject: "Video thao tác sofa giường và 3 điểm cần kiểm tra",
      zaloBody: zalo(`
Em gửi anh/chị video thao tác thực tế của sofa giường SmartFurni: {{approved_demo_video_url}}

Khi xem, anh/chị lưu ý 3 điểm: khoảng trống khi mở, lối đi/cửa/tủ sau khi mở và mức độ thuận tiện khi nhân viên hoặc khách thao tác.

Nếu anh/chị gửi một ảnh chụp từ cửa phòng vào trong, em có thể đánh dấu trực tiếp vị trí và kích thước cần kiểm tra.`),
      emailBody: email(`
Chào anh/chị {{customer_name}},

SmartFurni gửi anh/chị video thao tác thực tế của sofa giường: {{approved_demo_video_url}}

Khi xem, anh/chị vui lòng kiểm tra ba điểm: khoảng trống cần thiết khi mở thành giường; lối đi, cửa và tủ sau khi mở; thao tác chuyển đổi có phù hợp với nhân viên và khách lưu trú hay không.

Anh/chị có thể gửi một ảnh chụp từ cửa phòng vào trong. Đội ngũ SmartFurni sẽ đánh dấu vị trí và kích thước cần kiểm tra.`),
      requiredContext: ["approved_demo_video_url"],
    },
    {
      id: "D8_TWO_OPTIONS",
      day: 8,
      sendHour: 8,
      sendMinute: 45,
      phase: "fit",
      title: "Hai cấu hình sơ bộ",
      objective: "Biến dữ liệu khảo sát thành hai lựa chọn có lý do rõ ràng.",
      primaryChannel: "email",
      fallbackChannels: ["zalo_oa", "zalo_personal"],
      emailSubject: "[SmartFurni] 2 cấu hình sơ bộ cho {{property_name}} – {{quantity}} sản phẩm",
      zaloBody: zalo(`
SmartFurni đã chuẩn bị 2 cấu hình sơ bộ cho {{property_name}} dựa trên số lượng {{quantity}}, vị trí {{available_dimensions}} và ưu tiên {{main_priority}}.

Phương án A: {{option_a_model}} — {{option_a_reason}}
Phương án B: {{option_b_model}} — {{option_b_reason}}

Anh/chị trả lời A, B hoặc C nếu muốn điều chỉnh theo ngân sách. Em sẽ gửi bản so sánh chi tiết.`),
      emailBody: email(`
Chào anh/chị {{customer_name}},

Dựa trên các thông tin đã trao đổi:

- Loại hình: {{property_type}}
- Số lượng dự kiến: {{quantity}}
- Kích thước vị trí: {{available_dimensions}}
- Ưu tiên chính: {{main_priority}}
- Thời điểm cần hàng: {{required_date}}

SmartFurni đề xuất hai hướng:

PHƯƠNG ÁN A – {{option_a_name}}
Mẫu/cấu hình: {{option_a_model}}
Phù hợp vì: {{option_a_reason}}
Kích thước đóng/mở: {{option_a_dimensions}}
Chất liệu: {{option_a_material}}
Lưu ý vận hành: {{option_a_operational_note}}

PHƯƠNG ÁN B – {{option_b_name}}
Mẫu/cấu hình: {{option_b_model}}
Phù hợp vì: {{option_b_reason}}
Kích thước đóng/mở: {{option_b_dimensions}}
Chất liệu: {{option_b_material}}
Lưu ý vận hành: {{option_b_operational_note}}

Đây là bước lựa chọn kỹ thuật sơ bộ, chưa phải báo giá cuối cùng. Anh/chị vui lòng trả lời A nếu muốn phát triển phương án A, B nếu muốn phát triển phương án B, hoặc C nếu muốn điều chỉnh theo ngân sách.`),
      requiredContext: [
        "quantity", "available_dimensions", "main_priority", "required_date",
        "option_a_name", "option_a_model", "option_a_reason", "option_a_dimensions", "option_a_material", "option_a_operational_note",
        "option_b_name", "option_b_model", "option_b_reason", "option_b_dimensions", "option_b_material", "option_b_operational_note",
      ],
    },
    {
      id: "D12_OPERATIONS",
      day: 12,
      sendHour: 9,
      sendMinute: 30,
      phase: "fit",
      title: "Giảm rủi ro vận hành",
      objective: "Chuyển cuộc trao đổi từ giá mua sang tiêu chí vận hành và hậu mãi.",
      primaryChannel: "zalo_oa",
      fallbackChannels: ["zalo_personal", "email"],
      emailSubject: "5 điểm cần kiểm tra trước khi chốt sofa giường dự án",
      zaloBody: zalo(`
Khi mua sofa giường cho cơ sở lưu trú, giá ban đầu chỉ là một phần của quyết định. Anh/chị nên kiểm tra thêm:

1. Thao tác đóng/mở trong vận hành hằng ngày
2. Bề mặt và áo nệm có thuận tiện vệ sinh không
3. Khả năng thay thế từng bộ phận khi cần
4. Màu sắc có thể đồng bộ giữa nhiều phòng không
5. Phạm vi bảo hành được ghi rõ cho cấu hình dự án

Trả lời 1 để nhận bảng kiểm vận hành, hoặc 2 để nhận thông số cấu hình đang quan tâm.`),
      emailBody: email(`
Chào anh/chị {{customer_name}},

Khi mua sofa giường cho cơ sở lưu trú, giá ban đầu chỉ là một phần của quyết định. Trước khi chốt, SmartFurni đề nghị kiểm tra thao tác đóng/mở, khả năng vệ sinh, khả năng thay thế bộ phận, tính đồng bộ giữa các phòng và phạm vi bảo hành được ghi rõ cho cấu hình dự án.

Anh/chị trả lời 1 để nhận bảng kiểm vận hành, hoặc 2 để nhận thông số cấu hình đang quan tâm.`),
    },
    {
      id: "D16_PILOT",
      day: 16,
      sendHour: 14,
      sendMinute: 15,
      phase: "fit",
      title: "Đề xuất duyệt cấu hình mẫu",
      objective: "Giảm rủi ro trước khi khách quyết định số lượng lớn.",
      primaryChannel: "zalo_personal",
      fallbackChannels: ["zalo_oa", "email"],
      emailSubject: "Đề xuất cách duyệt cấu hình mẫu cho {{property_name}}",
      zaloBody: zalo(`
Với dự án {{quantity}} sản phẩm, em không khuyến nghị chốt toàn bộ chỉ dựa trên hình ảnh. Phương án an toàn hơn là duyệt một cấu hình mẫu trước, sau đó mới xác nhận số lượng và màu sắc.

A — Xem trực tiếp tại showroom
B — Video call 15 phút để kiểm tra kích thước phòng
C — SmartFurni lập phương án cấu hình mẫu để anh/chị duyệt

Anh/chị trả lời A, B hoặc C; em sẽ chuẩn bị đúng bước tiếp theo.`),
      emailBody: email(`
Chào anh/chị {{customer_name}},

Với dự án {{quantity}} sản phẩm, SmartFurni đề xuất duyệt một cấu hình mẫu trước khi xác nhận toàn bộ số lượng và màu sắc.

Anh/chị có thể chọn: A — xem trực tiếp tại showroom; B — video call 15 phút để kiểm tra kích thước phòng; C — để SmartFurni lập phương án cấu hình mẫu.

Mọi chi phí và điều kiện liên quan đến cấu hình mẫu sẽ được xác nhận rõ trước khi thực hiện.`),
      requiredContext: ["quantity"],
    },
    {
      id: "D21_PROJECT_BRIEF",
      day: 21,
      sendHour: 8,
      sendMinute: 45,
      phase: "approval",
      title: "Hồ sơ yêu cầu dự án",
      objective: "Chuẩn hóa yêu cầu thành một hồ sơ có thể xác nhận và chuyển nội bộ.",
      primaryChannel: "email",
      fallbackChannels: ["zalo_oa", "zalo_personal"],
      emailSubject: "[Cần xác nhận] Hồ sơ yêu cầu sofa giường – {{property_name}}",
      zaloBody: zalo(`
SmartFurni đã tổng hợp hồ sơ yêu cầu cho {{property_name}} gồm số lượng, loại phòng, cấu hình, kích thước, chất liệu, thời điểm giao và địa điểm lắp đặt.

Anh/chị xem tại {{project_brief_url}} và trả lời XÁC NHẬN nếu thông tin đúng, hoặc ghi phần cần sửa. Sau khi xác nhận, SmartFurni mới lập báo giá và tiến độ chính thức.`),
      emailBody: email(`
Chào anh/chị {{customer_name}},

SmartFurni đã tổng hợp yêu cầu sơ bộ của dự án:

- Số lượng: {{quantity}}
- Loại phòng áp dụng: {{room_types}}
- Cấu hình đang xem xét: {{selected_configuration}}
- Kích thước: {{selected_dimensions}}
- Chất liệu/màu sắc: {{material_and_color}}
- Thời điểm giao mong muốn: {{required_date}}
- Địa điểm lắp đặt: {{installation_address}}
- Người duyệt phương án: {{decision_maker}}

Hồ sơ dự án: {{project_brief_url}}

Anh/chị vui lòng trả lời XÁC NHẬN nếu thông tin đúng, hoặc ghi phần cần chỉnh sửa. Sau khi xác nhận, SmartFurni mới lập báo giá và phương án tiến độ chính thức.`),
      requiredContext: [
        "quantity", "room_types", "selected_configuration", "selected_dimensions", "material_and_color",
        "required_date", "installation_address", "decision_maker", "project_brief_url",
      ],
    },
    {
      id: "D27_VERIFY",
      day: 27,
      sendHour: 9,
      sendMinute: 30,
      phase: "approval",
      title: "Mời kiểm chứng sản phẩm và năng lực triển khai",
      objective: "Tạo lựa chọn kiểm chứng trực tiếp hoặc từ xa trước khi ra quyết định.",
      primaryChannel: "zalo_oa",
      fallbackChannels: ["zalo_personal", "email"],
      emailSubject: "Các hình thức xem mẫu SmartFurni cho {{property_name}}",
      zaloBody: zalo(`
Anh/chị có thể chọn hình thức kiểm tra sản phẩm phù hợp:

A — Showroom TP.HCM: 74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức
B — Showroom Hà Nội: B9-LK4, KĐT Geleximco B, Lê Trọng Tấn, Hà Đông
C — Xưởng sản xuất: 202 Nguyễn Thị Sáng, Đông Thạnh, Hóc Môn
D — Video call để xem sản phẩm và trao đổi từ xa

Anh/chị trả lời A, B, C hoặc D. Bộ phận dự án sẽ xác nhận lịch trước khi anh/chị đến.`),
      emailBody: email(`
Chào anh/chị {{customer_name}},

Anh/chị có thể lựa chọn một trong các hình thức kiểm tra sản phẩm và năng lực triển khai:

A — Showroom TP.HCM: 74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức
B — Showroom Hà Nội: B9-LK4, KĐT Geleximco B, Lê Trọng Tấn, Q. Hà Đông
C — Xưởng sản xuất: 202 Nguyễn Thị Sáng, X. Đông Thạnh, H. Hóc Môn
D — Video call để xem sản phẩm và trao đổi từ xa

Anh/chị trả lời A, B, C hoặc D. Bộ phận dự án sẽ liên hệ xác nhận lịch.`),
    },
    {
      id: "D30_TIMING",
      day: 30,
      sendHour: 14,
      sendMinute: 15,
      phase: "approval",
      title: "Xác định thời điểm mua",
      objective: "Phân luồng lead theo thời điểm ra quyết định và giảm liên hệ không cần thiết.",
      primaryChannel: "zalo_personal",
      fallbackChannels: ["zalo_oa", "email"],
      emailSubject: "Xác nhận tiến độ dự án {{property_name}}",
      zaloBody: zalo(`
Để em cập nhật đúng tiến độ và không liên hệ quá nhiều, anh/chị cho em biết dự án đang ở trạng thái nào:

1 — Dự kiến chốt trong 30 ngày tới
2 — Dự kiến chốt trong 1–3 tháng
3 — Chưa có lịch cụ thể, cần theo dõi sau
4 — Tạm dừng hoặc không còn nhu cầu

Anh/chị chỉ cần trả lời một số. SmartFurni sẽ điều chỉnh lịch chăm sóc theo đúng trạng thái dự án.`),
      emailBody: email(`
Chào anh/chị {{customer_name}},

Để SmartFurni cập nhật đúng tiến độ và không liên hệ quá nhiều, anh/chị vui lòng chọn trạng thái dự án:

1 — Dự kiến chốt trong 30 ngày tới
2 — Dự kiến chốt trong 1–3 tháng
3 — Chưa có lịch cụ thể, cần theo dõi sau
4 — Tạm dừng hoặc không còn nhu cầu

Anh/chị chỉ cần trả lời email bằng một số. Chúng tôi sẽ điều chỉnh lịch chăm sóc tương ứng.`),
    },
    {
      id: "D45_APPROVAL_PACK",
      day: 45,
      sendHour: 8,
      sendMinute: 45,
      phase: "long_term",
      title: "Bộ hồ sơ hỗ trợ phê duyệt",
      objective: "Giúp người liên hệ trình bày phương án cho các bên cùng quyết định.",
      primaryChannel: "email",
      fallbackChannels: ["zalo_oa", "zalo_personal"],
      emailSubject: "[SmartFurni] Bộ so sánh cấu hình để duyệt nội bộ – {{property_name}}",
      zaloBody: zalo(`
SmartFurni đã chuẩn bị bộ so sánh cấu hình cho {{property_name}}, gồm công năng, kích thước, chất liệu, vệ sinh, bảo hành, dự toán, tiến độ và nghiệm thu.

Anh/chị xem tại {{comparison_pack_url}}. Nếu cần, SmartFurni có thể trao đổi 20 phút cùng các bên phụ trách thiết kế, vận hành hoặc tài chính.`),
      emailBody: email(`
Chào anh/chị {{customer_name}},

Để hỗ trợ việc trao đổi với người đồng quyết định, SmartFurni đã chuẩn bị bảng so sánh theo các tiêu chí:

- Công năng khi đóng và khi mở
- Kích thước và lối đi cần chừa
- Chất liệu, màu sắc và cách vệ sinh
- Cấu hình nệm
- Chính sách bảo hành áp dụng
- Số lượng, dự toán và điều kiện báo giá
- Tiến độ sản xuất, giao và lắp đặt
- Quy trình kiểm tra, nghiệm thu

Bộ hồ sơ: {{comparison_pack_url}}

Anh/chị có thể chuyển tiếp email này cho kiến trúc sư, quản lý vận hành hoặc người phụ trách tài chính. Nếu cần, SmartFurni có thể tổ chức cuộc trao đổi 20 phút để giải đáp trực tiếp các điểm còn khác nhau giữa hai phương án.`),
      requiredContext: ["comparison_pack_url"],
    },
    {
      id: "D60_BLOCKER",
      day: 60,
      sendHour: 14,
      sendMinute: 15,
      phase: "long_term",
      title: "Xác định trở ngại còn lại",
      objective: "Chỉ gửi tài liệu giải quyết đúng điểm đang cản trở quyết định.",
      primaryChannel: "zalo_personal",
      fallbackChannels: ["zalo_oa", "email"],
      emailSubject: "Dự án {{property_name}} đang cần SmartFurni hỗ trợ phần nào?",
      zaloBody: zalo(`
Em xin cập nhật một điểm để hỗ trợ đúng việc anh/chị đang cần. Hiện dự án còn vướng nhất ở phần nào?

1 — Chưa chốt kích thước/mặt bằng
2 — Muốn kiểm tra mẫu và thao tác thực tế
3 — Chưa có báo giá phù hợp để trình duyệt
4 — Chưa xác định tiến độ giao hàng
5 — Đang chờ quyết định nội bộ

Anh/chị trả lời một số; em sẽ chỉ gửi tài liệu liên quan đến phần đó.`),
      emailBody: email(`
Chào anh/chị {{customer_name}},

SmartFurni xin cập nhật một điểm để hỗ trợ đúng việc dự án đang cần. Anh/chị vui lòng chọn trở ngại lớn nhất hiện nay:

1 — Chưa chốt kích thước/mặt bằng
2 — Muốn kiểm tra mẫu và thao tác thực tế
3 — Chưa có báo giá phù hợp để trình duyệt
4 — Chưa xác định tiến độ giao hàng
5 — Đang chờ quyết định nội bộ

Anh/chị trả lời một số; chúng tôi sẽ chỉ gửi tài liệu liên quan đến phần đó.`),
    },
    {
      id: "D75_CLOSING_PACK",
      day: 75,
      sendHour: 9,
      sendMinute: 30,
      phase: "long_term",
      title: "Chuẩn bị hồ sơ chốt dự án",
      objective: "Đưa khách đến một yêu cầu tài liệu cụ thể trước quyết định mua.",
      primaryChannel: "zalo_oa",
      fallbackChannels: ["zalo_personal", "email"],
      emailSubject: "Hồ sơ cần chuẩn bị trước khi chốt dự án {{property_name}}",
      zaloBody: zalo(`
Trước khi chốt số lượng, SmartFurni có thể chuẩn bị:

A — Bản cấu hình và kích thước
B — Bảng màu/chất liệu cần duyệt
C — Báo giá theo số lượng
D — Kế hoạch giao, lắp đặt và nghiệm thu
E — Chính sách bảo hành áp dụng cho đơn hàng

Anh/chị trả lời chữ cái tương ứng. Bộ phận dự án sẽ kiểm tra và gửi phiên bản mới nhất.`),
      emailBody: email(`
Chào anh/chị {{customer_name}},

Trước khi chốt số lượng, SmartFurni có thể chuẩn bị một trong các hồ sơ sau:

A — Bản cấu hình và kích thước
B — Bảng màu/chất liệu cần duyệt
C — Báo giá theo số lượng
D — Kế hoạch giao, lắp đặt và nghiệm thu
E — Chính sách bảo hành áp dụng cho đơn hàng

Anh/chị trả lời chữ cái tương ứng. Bộ phận dự án sẽ kiểm tra và gửi phiên bản mới nhất.`),
    },
    {
      id: "D90_CLOSE_LOOP",
      day: 90,
      sendHour: 8,
      sendMinute: 45,
      phase: "long_term",
      title: "Đóng vòng chăm sóc",
      objective: "Xin lựa chọn rõ ràng và kết thúc chuỗi tự động một cách tôn trọng.",
      primaryChannel: "email",
      fallbackChannels: ["zalo_oa", "zalo_personal"],
      emailSubject: "Xác nhận bước tiếp theo cho dự án {{property_name}}",
      zaloBody: zalo(`
SmartFurni xin khép lại chuỗi tư vấn tự động để tránh gửi thêm thông tin khi dự án chưa đến thời điểm phù hợp.

1 — Tiếp tục: cập nhật cấu hình và báo giá dự án
2 — Hẹn lại: anh/chị cho biết thời điểm phù hợp để liên hệ
3 — Kết thúc: CRM đóng nhu cầu và không tiếp tục gửi nội dung

Anh/chị chỉ cần trả lời 1, 2 hoặc 3.`),
      emailBody: email(`
Chào anh/chị {{customer_name}},

SmartFurni xin khép lại chuỗi tư vấn tự động để tránh gửi thêm thông tin khi dự án chưa đến thời điểm phù hợp. Anh/chị vui lòng chọn một trong ba phương án:

1. Tiếp tục: SmartFurni cập nhật cấu hình và báo giá dự án
2. Hẹn lại: Anh/chị cho biết tháng/ngày phù hợp để liên hệ lại
3. Kết thúc: CRM đóng nhu cầu và không tiếp tục gửi nội dung

Khi cần trao đổi lại, anh/chị có thể liên hệ Hotline 028.7122.0818, Zalo 0918.326.552 hoặc email b2b@smartfurni.com.vn.

Cảm ơn anh/chị đã dành thời gian trao đổi cùng SmartFurni.`),
    },
  ],
};

const HOSPITALITY_TERMS = [
  "homestay", "home stay", "bnb", "airbnb", "booking", "lưu trú", "luu tru",
  "căn hộ dịch vụ", "can ho dich vu", "phòng trọ", "phong tro", "nhà trọ", "nha tro",
  "khách sạn", "khach san", "resort", "chủ đầu tư", "chu dau tu",
];

const SOFA_TERMS = ["sofa", "sofa giường", "sofa giuong", "giường gấp", "giuong gap"];

export function leadHasHospitalitySignal(lead: Lead): boolean {
  const text = [
    lead.company,
    lead.projectName,
    lead.projectAddress,
    lead.notes,
    lead.sourceDetail,
    ...(lead.tags || []),
  ].join(" ").toLocaleLowerCase("vi");
  return HOSPITALITY_TERMS.some(term => text.includes(term));
}

export function leadHasSofaInterest(lead: Lead): boolean {
  if (lead.interestedProducts?.includes("sofa_bed")) return true;
  const text = [lead.notes, lead.sourceDetail, lead.projectName, ...(lead.tags || [])]
    .join(" ")
    .toLocaleLowerCase("vi");
  return SOFA_TERMS.some(term => text.includes(term));
}

export function isEligibleForB2BSofaJourney(
  lead: Lead,
  settings: B2BSofaJourneySettings,
): { eligible: boolean; reason?: string } {
  if (!["new", "profile_sent", "surveyed"].includes(lead.stage)) {
    return { eligible: false, reason: "Lead không còn ở giai đoạn nuôi dưỡng chung." };
  }
  if (["retail", "dealer"].includes(lead.type)) {
    return { eligible: false, reason: "Không thuộc nhóm chủ đầu tư/B2B." };
  }
  if (!leadHasSofaInterest(lead)) {
    return { eligible: false, reason: "Chưa có tín hiệu quan tâm sofa giường." };
  }
  if (settings.requireHospitalitySignal && !leadHasHospitalitySignal(lead)) {
    return { eligible: false, reason: "Chưa có tín hiệu homestay/BnB/phòng trọ/lưu trú." };
  }
  const normalizedTags = new Set((lead.tags || []).map(tag => tag.trim().toLocaleLowerCase("vi")));
  const blocked = settings.doNotContactTags.some(tag => normalizedTags.has(tag.trim().toLocaleLowerCase("vi")));
  if (blocked) return { eligible: false, reason: "Lead có nhãn không liên hệ." };
  if (!lead.phone && !lead.email && !lead.zaloId) {
    return { eligible: false, reason: "Không có kênh liên hệ." };
  }
  return { eligible: true };
}

export function buildJourneyContext(
  lead: Lead,
  settings: B2BSofaJourneySettings,
  extra: Record<string, string> = {},
): Record<string, string> {
  const quantity = lead.unitCount > 0 ? String(lead.unitCount) : "";
  const propertyType = leadHasHospitalitySignal(lead) ? "cơ sở lưu trú" : "dự án";
  return {
    customer_name: lead.name || "Anh/Chị",
    sales_name: lead.assignedTo || "Bộ phận dự án",
    lead_source: lead.source || "website",
    property_name: lead.projectName || lead.company || "dự án của anh/chị",
    property_type: propertyType,
    city: lead.district || lead.projectAddress || "khu vực dự án",
    quantity,
    installation_address: lead.projectAddress || "",
    survey_form_url: settings.surveyFormUrl,
    survey_form_line: settings.surveyFormUrl ? `Điền nhanh tại: ${settings.surveyFormUrl}` : "",
    approved_demo_video_url: settings.approvedDemoVideoUrl,
    project_brief_url: settings.projectBriefUrl,
    comparison_pack_url: settings.comparisonPackUrl,
    ...extra,
  };
}

export function renderJourneyTemplate(template: string, context: Record<string, string>): string {
  return template
    .replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_match, key: string) => context[key]?.trim() || "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function missingRequiredContext(
  step: JourneyStepDefinition,
  context: Record<string, string>,
): string[] {
  return (step.requiredContext || []).filter(key => !context[key]?.trim());
}

export function channelSequence(step: JourneyStepDefinition): JourneyChannel[] {
  return [step.primaryChannel, ...step.fallbackChannels].filter(
    (channel, index, values) => values.indexOf(channel) === index,
  );
}

function vietnamDateParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function fromVietnamParts(year: number, month: number, day: number, hour: number, minute: number): Date {
  return new Date(Date.UTC(year, month, day, hour - 7, minute, 0, 0));
}

function moveOffSunday(date: Date): Date {
  const local = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  if (local.getUTCDay() !== 0) return date;
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

function timeValue(value: string, fallback: number): number {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return fallback;
  return Math.max(0, Math.min(1439, hour * 60 + minute));
}

/**
 * Trả về null khi có thể gửi ngay; ngược lại trả về mốc mở cửa kế tiếp.
 * Journey không tự gửi vào Chủ nhật hoặc ngoài khung giờ Việt Nam đã cấu hình.
 */
export function nextJourneyBusinessWindow(
  now: Date,
  settings: Pick<B2BSofaJourneySettings, "businessHoursStart" | "businessHoursEnd">,
): Date | null {
  const local = vietnamDateParts(now);
  const localDate = new Date(Date.UTC(local.year, local.month, local.day));
  const weekday = localDate.getUTCDay();
  const start = timeValue(settings.businessHoursStart, 8 * 60 + 30);
  const end = timeValue(settings.businessHoursEnd, 18 * 60);
  const current = local.hour * 60 + local.minute;

  if (weekday !== 0 && current >= start && current < end) return null;

  let dayOffset = 0;
  if (weekday === 0 || current >= end) dayOffset = 1;
  let target = fromVietnamParts(
    local.year,
    local.month,
    local.day + dayOffset,
    Math.floor(start / 60),
    start % 60,
  );
  target = moveOffSunday(target);
  return target;
}

export function scheduleJourneyStep(enrolledAt: Date, step: JourneyStepDefinition): Date {
  const local = vietnamDateParts(enrolledAt);
  let scheduled = fromVietnamParts(local.year, local.month, local.day + step.day, step.sendHour, step.sendMinute);
  scheduled = moveOffSunday(scheduled);
  if (step.day === 0 && scheduled.getTime() <= enrolledAt.getTime()) {
    const afterFiveMinutes = new Date(enrolledAt.getTime() + 5 * 60 * 1000);
    const afterParts = vietnamDateParts(afterFiveMinutes);
    if (afterParts.hour < 18) return afterFiveMinutes;
    scheduled = fromVietnamParts(afterParts.year, afterParts.month, afterParts.day + 1, 9, 15);
    scheduled = moveOffSunday(scheduled);
  }
  return scheduled;
}
