import type { Lead } from "@/lib/crm-types";
import {
  type B2BSofaJourneyDefinition,
  type B2BSofaJourneySettings,
  type JourneyStepDefinition,
  type JourneyStepOverride,
} from "@/lib/crm-b2b-sofa-journey";

export const B2C_ERGONOMIC_BED_JOURNEY_CODE = "JRN_B2C_ERGONOMIC_BED_90D_V1";
export const B2C_ERGONOMIC_BED_JOURNEY_VERSION = 1;

export interface B2CErgonomicBedJourneySettings extends B2BSofaJourneySettings {
  requireRetailSignal: boolean;
}

export type B2CErgonomicBedJourneyDefinition = B2BSofaJourneyDefinition;

export const DEFAULT_B2C_ERGONOMIC_BED_JOURNEY_SETTINGS: B2CErgonomicBedJourneySettings = {
  enabled: false,
  autoEnroll: true,
  autoEnrollExisting: false,
  canaryMode: false,
  canaryLeadIds: [],
  requireHospitalitySignal: false,
  requireRetailSignal: true,
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
  "{{sales_name}} – Tư vấn Giường công thái học SmartFurni",
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

function step(input: JourneyStepDefinition): JourneyStepDefinition {
  return input;
}

export const B2C_ERGONOMIC_BED_JOURNEY: B2CErgonomicBedJourneyDefinition = {
  code: B2C_ERGONOMIC_BED_JOURNEY_CODE,
  version: B2C_ERGONOMIC_BED_JOURNEY_VERSION,
  name: "Khách lẻ – Giường công thái học 90 ngày",
  description: "Hành trình lợi ích trước, tập trung cao trong 30 ngày đầu cho khách mua nguyên bộ hoặc khung nâng hạ lắp vào giường có sẵn.",
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
    step({
      id: "D0_BENEFIT_DISCOVERY", day: 0, sendHour: 9, sendMinute: 0, phase: "diagnosis",
      title: "Khơi đúng lợi ích", objective: "Bắt đầu bằng điều khách muốn cải thiện, chưa hỏi thông số.",
      primaryChannel: "zalo_oa", fallbackChannels: ["zalo_personal", "email"],
      emailSubject: "SmartFurni đã nhận nhu cầu Giường công thái học của {{customer_name}}",
      zaloBody: zalo(`Chào anh/chị {{customer_name}}, SmartFurni đã nhận yêu cầu tìm hiểu Giường công thái học điều chỉnh điện.

Điều anh/chị muốn cải thiện nhất ở chiếc giường hiện tại là:

1 — Có tư thế nghỉ ngơi thoải mái hơn
2 — Đọc sách, xem phim thuận tiện hơn
3 — Nâng cấp giường đang dùng nhưng vẫn giữ thiết kế cũ
4 — Làm một bộ giường hoàn chỉnh, đồng bộ với phòng ngủ

Anh/chị trả lời 1–4, SmartFurni sẽ gửi đúng giải pháp phù hợp.`),
      emailBody: email(`Chào anh/chị {{customer_name}},

SmartFurni đã nhận yêu cầu tìm hiểu Giường công thái học điều chỉnh điện. Để tư vấn đúng lợi ích anh/chị cần, vui lòng cho biết mong muốn chính: nghỉ ngơi thoải mái hơn; đọc sách, xem phim thuận tiện hơn; giữ lại giường hiện có; hay hoàn thiện một bộ giường đồng bộ.

Anh/chị chỉ cần trả lời email bằng số 1, 2, 3 hoặc 4.`),
    }),
    step({
      id: "D1_USER_CONTEXT", day: 1, sendHour: 9, sendMinute: 15, phase: "diagnosis",
      title: "Ai sẽ sử dụng?", objective: "Cá nhân hóa theo người dùng thay vì giới thiệu model chung.",
      primaryChannel: "zalo_personal", fallbackChannels: ["zalo_oa", "email"],
      emailSubject: "Ai sẽ sử dụng Giường công thái học SmartFurni?",
      zaloBody: zalo(`Em chào anh/chị {{customer_name}}, em là {{sales_name}} từ SmartFurni.

Hệ giường điều chỉnh điện giúp thay đổi phần lưng và chân để anh/chị chủ động lựa chọn tư thế khi nằm nghỉ, đọc sách, xem phim hoặc thư giãn.

Anh/chị đang tìm sản phẩm cho bản thân, hai vợ chồng hay cho bố mẹ ạ?`),
      emailBody: email(`Chào anh/chị {{customer_name}},

Mỗi người có thói quen nghỉ ngơi khác nhau. SmartFurni muốn biết sản phẩm được chọn cho bản thân, hai vợ chồng hay bố mẹ để ưu tiên đúng trải nghiệm và cách điều khiển phù hợp.

Anh/chị trả lời trực tiếp email này, đội ngũ tư vấn sẽ đi đúng nhu cầu thay vì gửi catalogue chung.`),
    }),
    step({
      id: "D2_LIFESTYLE_EMAIL", day: 2, sendHour: 10, sendMinute: 0, phase: "diagnosis",
      title: "Một chiếc giường, nhiều trải nghiệm", objective: "Giúp khách hình dung lợi ích trong đời sống hằng ngày.",
      primaryChannel: "email", fallbackChannels: ["zalo_personal", "zalo_oa"],
      emailSubject: "Chiếc giường của anh/chị có thể tiện nghi hơn như thế nào?",
      zaloBody: zalo(`Giường truyền thống thường chỉ có một mặt phẳng cố định. Với hệ điều chỉnh điện, anh/chị có thể chủ động thay đổi phần lưng và chân cho từng lúc: nằm nghỉ, đọc sách, xem phim hoặc thư giãn.

SmartFurni có hai hướng: bộ giường hoàn chỉnh hoặc khung nâng hạ để giữ lại giường đang dùng nếu tương thích. Anh/chị trả lời NGUYÊN BỘ hoặc GIỮ GIƯỜNG CŨ để nhận đúng tư vấn.`),
      emailBody: email(`Chào anh/chị {{customer_name}},

Phần lớn giường truyền thống chỉ có một mặt phẳng cố định. Khi muốn đọc sách, xem phim hoặc nghỉ ở tư thế cao hơn, người dùng thường phải kê nhiều gối và điều chỉnh lại nhiều lần.

Giường công thái học SmartFurni cho phép thay đổi phần lưng và chân bằng hệ thống điều khiển điện. Cùng một chiếc giường có thể phục vụ nhiều thời điểm: nằm nghỉ, tựa lưng đọc sách, xem phim hoặc lựa chọn tư thế thư giãn phù hợp.

Anh/chị có thể chọn bộ giường hoàn chỉnh để đồng bộ phòng ngủ, hoặc khung nâng hạ để giữ lại giường hiện có khi kích thước và nệm tương thích.

Hãy trả lời NGUYÊN BỘ hoặc GIỮ GIƯỜNG CŨ, SmartFurni sẽ tư vấn đúng hướng.`),
    }),
    step({
      id: "D4_DEMO_MEDIA", day: 4, sendHour: 14, sendMinute: 0, phase: "fit",
      title: "Video trải nghiệm thực tế", objective: "Chứng minh lợi ích qua thao tác remote và chuyển đổi tư thế.",
      primaryChannel: "zalo_oa", fallbackChannels: ["zalo_personal", "email"],
      emailSubject: "Video thực tế: thay đổi tư thế bằng một thao tác",
      zaloBody: zalo(`Một thao tác trên remote có thể chuyển chiếc giường từ tư thế nằm sang tư thế tựa lưng để đọc sách, xem phim hoặc thư giãn.

Em gửi anh/chị video vận hành thực tế: {{approved_demo_video_url}}

Anh/chị thích lợi ích nào nhất: 1 — tựa lưng; 2 — điều chỉnh phần chân; 3 — thao tác đơn giản; 4 — giữ lại giường hiện có?`),
      emailBody: email(`Chào anh/chị {{customer_name}},

SmartFurni gửi video vận hành thực tế để anh/chị thấy rõ cách thay đổi phần lưng và chân bằng remote: {{approved_demo_video_url}}

Khi xem, anh/chị hãy chọn lợi ích mình quan tâm nhất: tựa lưng thuận tiện, điều chỉnh phần chân, thao tác đơn giản hay khả năng giữ lại giường hiện có.`),
      requiredContext: ["approved_demo_video_url"],
    }),
    step({
      id: "D6_SOLUTION_BRANCH", day: 6, sendHour: 9, sendMinute: 30, phase: "fit",
      title: "Hai hướng nâng cấp", objective: "Làm rõ lợi ích của nguyên bộ và khung nâng hạ.",
      primaryChannel: "zalo_personal", fallbackChannels: ["zalo_oa", "email"],
      emailSubject: "Giữ giường cũ hay hoàn thiện nguyên bộ?",
      zaloBody: zalo(`Nếu chọn bộ giường hoàn chỉnh, anh/chị giảm công sức tự phối khung, nệm và phần hoàn thiện từ nhiều nguồn.

Nếu chiếc giường hiện tại vẫn đẹp, phương án khung nâng hạ có thể giúp bổ sung công năng điều chỉnh mà vẫn giữ thiết kế quen thuộc, khi kích thước và nệm tương thích.

Anh/chị nghiêng về NGUYÊN BỘ hay GIỮ GIƯỜNG CŨ ạ?`),
      emailBody: email(`Chào anh/chị {{customer_name}},

Bộ giường hoàn chỉnh phù hợp khi anh/chị muốn một giải pháp đồng bộ cho phòng ngủ và không muốn tự ghép nhiều hạng mục.

Khung nâng hạ phù hợp khi anh/chị vẫn yêu thích chiếc giường hiện tại và muốn tập trung ngân sách vào công năng điều chỉnh. SmartFurni sẽ kiểm tra kích thước lòng giường, kết cấu đỡ và nệm trước khi xác nhận.

Anh/chị trả lời NGUYÊN BỘ hoặc GIỮ GIƯỜNG CŨ để được hướng dẫn bước tiếp theo.`),
    }),
    step({
      id: "D8_DAY_IN_LIFE", day: 8, sendHour: 10, sendMinute: 0, phase: "fit",
      title: "Trải nghiệm trong một ngày", objective: "Kết nối sản phẩm với thói quen thật của khách.",
      primaryChannel: "email", fallbackChannels: ["zalo_personal", "zalo_oa"],
      emailSubject: "Từ lúc nghỉ ngơi đến khi đọc sách: một chiếc giường, nhiều tư thế",
      zaloBody: zalo(`Giá trị của giường điều chỉnh điện nằm ở khả năng thích nghi với từng hoạt động: tựa lưng khi đọc sách/xem phim, điều chỉnh phần chân khi thư giãn và đưa giường về tư thế nằm khi đi ngủ.

Anh/chị thường dành nhiều thời gian nhất cho hoạt động nào trên giường?`),
      emailBody: email(`Chào anh/chị {{customer_name}},

Giá trị của giường điều chỉnh điện không chỉ nằm ở motor hay remote, mà ở khả năng thích nghi với từng hoạt động: nâng phần lưng khi đọc sách hoặc xem phim; điều chỉnh phần chân khi thư giãn; và đưa giường trở lại tư thế nằm phù hợp khi đi ngủ.

Nếu mua nguyên bộ, SmartFurni có thể tư vấn phần hoàn thiện phù hợp với phòng ngủ. Nếu dùng khung nâng hạ, SmartFurni sẽ kiểm tra giường và nệm hiện tại trước khi đề xuất.

Anh/chị có thể gửi ảnh phòng hoặc ảnh giường qua Zalo 0918.326.552 để được tư vấn trực quan hơn.`),
    }),
    step({
      id: "D10_KEEP_EXISTING_BED", day: 10, sendHour: 14, sendMinute: 30, phase: "fit",
      title: "Không nhất thiết thay toàn bộ giường", objective: "Gỡ băn khoăn của khách muốn giữ lại nội thất hiện có.",
      primaryChannel: "zalo_oa", fallbackChannels: ["zalo_personal", "email"],
      emailSubject: "Có thể nâng cấp mà vẫn giữ lại giường hiện tại?",
      zaloBody: zalo(`Không phải trường hợp nào cũng cần thay toàn bộ chiếc giường.

Nếu lòng giường và kết cấu phù hợp, SmartFurni có thể tư vấn hệ khung nâng hạ lắp bên trong, giúp anh/chị giữ kiểu dáng quen thuộc, hạn chế thay đổi phòng ngủ và tập trung ngân sách vào công năng điều chỉnh.

Anh/chị gửi một ảnh tổng thể giường để SmartFurni kiểm tra sơ bộ.`),
      emailBody: email(`Chào anh/chị {{customer_name}},

Nếu chiếc giường hiện tại vẫn phù hợp với phòng ngủ, anh/chị có thể chưa cần thay toàn bộ. Khi lòng giường, kết cấu đỡ và nệm đáp ứng điều kiện, hệ khung nâng hạ có thể được tư vấn để bổ sung công năng điều chỉnh.

Anh/chị chỉ cần gửi một ảnh tổng thể giường. SmartFurni sẽ hướng dẫn những ảnh và kích thước tiếp theo cần kiểm tra.`),
    }),
    step({
      id: "D13_COMPATIBILITY", day: 13, sendHour: 9, sendMinute: 0, phase: "fit",
      title: "Kiểm tra tương thích đơn giản", objective: "Biến việc đo đạc thành một bước nhẹ nhàng, có lợi ích rõ ràng.",
      primaryChannel: "zalo_personal", fallbackChannels: ["zalo_oa", "email"],
      emailSubject: "Ba thông tin để SmartFurni kiểm tra giường hiện tại",
      zaloBody: zalo(`Để biết chiếc giường hiện tại có thể nâng cấp hay không, anh/chị không cần tự nghiên cứu thông số phức tạp.

Chỉ cần gửi: 1 — ảnh tổng thể; 2 — ảnh bên trong sau khi bỏ nệm; 3 — chiều rộng × chiều dài lòng giường.

SmartFurni sẽ kiểm tra sơ bộ khả năng giữ lại giường, dùng lại nệm và kích thước khung nên chọn. Việc kiểm tra này chưa phải đặt hàng.`),
      emailBody: email(`Chào anh/chị {{customer_name}},

Anh/chị chỉ cần gửi ba thông tin: ảnh tổng thể giường; ảnh phần bên trong sau khi bỏ nệm; và chiều rộng × chiều dài lòng giường.

SmartFurni sẽ kiểm tra sơ bộ khả năng giữ lại giường, khả năng dùng lại nệm và kích thước hệ khung nên xem xét. Việc kiểm tra này chưa phải đặt hàng.`),
    }),
    step({
      id: "D16_BENEFIT_COMPARE", day: 16, sendHour: 10, sendMinute: 0, phase: "fit",
      title: "So sánh theo lợi ích", objective: "Giúp khách tự chọn hướng phù hợp mà không sa vào thông số.",
      primaryChannel: "email", fallbackChannels: ["zalo_personal", "zalo_oa"],
      emailSubject: "Nên nâng cấp khung hay chọn bộ giường hoàn chỉnh?",
      zaloBody: zalo(`Khung nâng hạ phù hợp khi anh/chị muốn giữ kiểu dáng giường, hạn chế thay đổi phòng ngủ và tập trung vào công năng. Bộ giường hoàn chỉnh phù hợp khi anh/chị muốn đồng bộ thiết kế, nệm và phần hoàn thiện.

Không có phương án tốt hơn cho tất cả mọi người; phương án phù hợp là phương án đáp ứng đúng trải nghiệm anh/chị cần.`),
      emailBody: email(`Chào anh/chị {{customer_name}},

Khung nâng hạ có lợi thế khi anh/chị muốn giữ kiểu dáng giường hiện tại, hạn chế thay đổi phòng ngủ và tập trung vào công năng điều chỉnh. Tuy nhiên, giường và nệm cần được kiểm tra tương thích.

Bộ giường hoàn chỉnh có lợi thế khi anh/chị muốn đồng bộ thiết kế, nệm và phần hoàn thiện trong một cấu hình được tư vấn chung.

Không có phương án nào tốt hơn cho tất cả mọi người. Phương án phù hợp là phương án giúp anh/chị đạt trải nghiệm mong muốn mà không phải chi cho hạng mục không cần thiết.`),
    }),
    step({
      id: "D19_DEMO_INVITE", day: 19, sendHour: 14, sendMinute: 0, phase: "approval",
      title: "Mời trải nghiệm", objective: "Đưa khách từ tìm hiểu sang cảm nhận thực tế.",
      primaryChannel: "zalo_personal", fallbackChannels: ["zalo_oa", "email"],
      emailSubject: "Chọn cách trải nghiệm Giường công thái học thuận tiện nhất",
      zaloBody: zalo(`Giường điều chỉnh điện là sản phẩm nên xem vận hành thực tế trước khi quyết định, vì cảm nhận về tư thế và cách điều khiển quan trọng hơn việc chỉ đọc thông số.

1 — Xem tại showroom
2 — Tư vấn qua video call
3 — Nhận video chi tiết đúng cấu hình

Anh/chị chọn 1, 2 hoặc 3, em sắp xếp giúp ạ.`),
      emailBody: email(`Chào anh/chị {{customer_name}},

Anh/chị có thể chọn xem trực tiếp tại showroom TP.HCM hoặc Hà Nội, tư vấn qua video call, hoặc nhận video chi tiết đúng cấu hình đang quan tâm.

Hãy trả lời 1, 2 hoặc 3. SmartFurni sẽ xác nhận lịch hoặc chuẩn bị nội dung phù hợp trước khi gửi.`),
    }),
    step({
      id: "D22_PERSONAL_PROPOSAL", day: 22, sendHour: 9, sendMinute: 30, phase: "approval",
      title: "Đề xuất cá nhân hóa", objective: "Chỉ gửi đề xuất khi CRM có đủ dữ liệu và lý do phù hợp.",
      primaryChannel: "email", fallbackChannels: ["zalo_personal", "zalo_oa"],
      emailSubject: "Phương án SmartFurni đề xuất riêng cho {{customer_name}}",
      zaloBody: zalo(`Dựa trên nhu cầu {{primary_benefit}}, SmartFurni đề xuất:

Phương án: {{solution_type}}
Trải nghiệm chính: {{benefit_summary}}
Phù hợp vì: {{fit_reason}}
Kích thước dự kiến: {{recommended_size}}
Khoảng đầu tư: {{price_range}}

Anh/chị muốn xem vận hành, xác nhận kích thước hay nhận báo giá chính thức?`),
      emailBody: email(`Chào anh/chị {{customer_name}},

Dựa trên nhu cầu {{primary_benefit}} và thông tin anh/chị đã cung cấp, SmartFurni đề xuất:

- Phương án: {{solution_type}}
- Trải nghiệm chính: {{benefit_summary}}
- Phù hợp vì: {{fit_reason}}
- Kích thước dự kiến: {{recommended_size}}
- Khoảng đầu tư: {{price_range}}
- Hạng mục bao gồm: {{included_items}}

Phương án tập trung vào những lợi ích anh/chị thực sự cần và loại bỏ các hạng mục chưa cần thiết. Anh/chị có thể chọn xem vận hành, xác nhận kích thước hoặc nhận báo giá chính thức.`),
      requiredContext: ["primary_benefit", "solution_type", "benefit_summary", "fit_reason", "recommended_size", "price_range", "included_items"],
    }),
    step({
      id: "D24_RISK_REDUCTION", day: 24, sendHour: 14, sendMinute: 30, phase: "approval",
      title: "Giảm rủi ro quyết định", objective: "Nhấn mạnh dịch vụ kiểm tra trước khi mua.",
      primaryChannel: "zalo_oa", fallbackChannels: ["zalo_personal", "email"],
      emailSubject: "SmartFurni kiểm tra gì trước khi xác nhận cấu hình?",
      zaloBody: zalo(`Khi chọn Giường công thái học, SmartFurni kiểm tra cả quá trình sử dụng sau đó:

✓ Kích thước có phù hợp không gian
✓ Nệm có tương thích với chuyển động nâng hạ
✓ Lối vận chuyển và vị trí lắp đặt có thuận tiện
✓ Người sử dụng có dễ thao tác điều khiển

Mục tiêu là giúp anh/chị chọn đúng ngay từ đầu và tránh mua thêm tính năng không cần thiết.`),
      emailBody: email(`Chào anh/chị {{customer_name}},

Trước khi xác nhận cấu hình, SmartFurni sẽ kiểm tra kích thước không gian, độ tương thích của nệm, lối vận chuyển, vị trí lắp đặt và khả năng thao tác của người sử dụng.

Mục tiêu là giúp anh/chị chọn đúng ngay từ đầu, tránh sai kích thước hoặc mua thêm những hạng mục chưa cần thiết.`),
    }),
    step({
      id: "D27_BLOCKER", day: 27, sendHour: 9, sendMinute: 0, phase: "approval",
      title: "Xác định trở ngại thật", objective: "Chỉ xử lý đúng điểm đang cản trở quyết định.",
      primaryChannel: "zalo_personal", fallbackChannels: ["zalo_oa", "email"],
      emailSubject: "Điều gì khiến anh/chị chưa quyết định?",
      zaloBody: zalo(`Em muốn hỗ trợ đúng vấn đề anh/chị đang cân nhắc nhất:

1 — Chưa rõ nên mua nguyên bộ hay khung nâng hạ
2 — Chưa chắc giường/nệm hiện tại có tương thích
3 — Muốn trải nghiệm thực tế trước
4 — Đang cân đối ngân sách
5 — Chưa đến thời điểm mua

Anh/chị chọn một ý, em chỉ tập trung giải đáp đúng nội dung đó.`),
      emailBody: email(`Chào anh/chị {{customer_name}},

Điều gì khiến anh/chị chưa quyết định: chưa rõ nên mua nguyên bộ hay khung nâng hạ; chưa chắc giường/nệm tương thích; muốn trải nghiệm trước; đang cân đối ngân sách; hay chưa đến thời điểm mua?

Anh/chị chỉ cần trả lời một ý. SmartFurni sẽ tập trung giải đáp đúng nội dung đó.`),
    }),
    step({
      id: "D30_NEXT_STEP", day: 30, sendHour: 14, sendMinute: 0, phase: "approval",
      title: "Chốt bước tiếp theo", objective: "Đưa lead về một trạng thái rõ ràng sau 30 ngày.",
      primaryChannel: "zalo_personal", fallbackChannels: ["zalo_oa", "email"],
      emailSubject: "Xác nhận bước tiếp theo cùng SmartFurni",
      zaloBody: zalo(`Sau thời gian tìm hiểu, em xin xác nhận hướng phù hợp nhất với anh/chị:

1 — Đặt lịch trải nghiệm
2 — Nhận đề xuất và báo giá chính thức
3 — Kiểm tra khả năng lắp vào giường hiện có
4 — Liên hệ lại sau 1–3 tháng
5 — Tạm dừng tư vấn

Anh/chị trả lời một số, SmartFurni sẽ thực hiện đúng bước đó.`),
      emailBody: email(`Chào anh/chị {{customer_name}},

Anh/chị vui lòng chọn bước tiếp theo: đặt lịch trải nghiệm; nhận đề xuất và báo giá; kiểm tra khả năng lắp vào giường hiện có; liên hệ lại sau 1–3 tháng; hoặc tạm dừng tư vấn.

SmartFurni sẽ thực hiện đúng lựa chọn và không gửi thêm nội dung không cần thiết.`),
    }),
    step({
      id: "D45_USE_CASE", day: 45, sendHour: 10, sendMinute: 0, phase: "long_term",
      title: "Ứng dụng đúng nhu cầu", objective: "Nhắc lại lợi ích phù hợp thay vì khuyến mãi đại trà.",
      primaryChannel: "email", fallbackChannels: ["zalo_personal", "zalo_oa"],
      emailSubject: "Gợi ý trải nghiệm phù hợp với nhu cầu {{primary_benefit}}",
      zaloBody: zalo(`SmartFurni xin gửi lại gợi ý theo nhu cầu {{primary_benefit}} của anh/chị. Nếu kế hoạch đã thay đổi, anh/chị chỉ cần nhắn MỚI; em sẽ cập nhật lại giải pháp thay vì tiếp tục gửi nội dung cũ.`),
      emailBody: email(`Chào anh/chị {{customer_name}},

SmartFurni xin gửi lại nội dung ứng dụng phù hợp với nhu cầu {{primary_benefit}}. Nếu nhu cầu hoặc không gian đã thay đổi, anh/chị chỉ cần trả lời email này; đội ngũ tư vấn sẽ cập nhật lại hướng đề xuất.`),
      requiredContext: ["primary_benefit"],
    }),
    step({
      id: "D60_TIMING", day: 60, sendHour: 14, sendMinute: 0, phase: "long_term",
      title: "Kiểm tra thời điểm mua", objective: "Điều chỉnh lịch chăm sóc theo kế hoạch thực tế.",
      primaryChannel: "zalo_personal", fallbackChannels: ["zalo_oa", "email"],
      emailSubject: "Kế hoạch Giường công thái học của anh/chị hiện thế nào?",
      zaloBody: zalo(`Trước đây anh/chị đã tìm hiểu Giường công thái học SmartFurni. Kế hoạch hiện tại là:

1 — Dự kiến mua trong 30 ngày tới
2 — Chuyển sang thời điểm khác
3 — Cần kiểm tra lại kích thước/cấu hình
4 — Tạm dừng nhu cầu

Anh/chị trả lời một số, em cập nhật đúng trạng thái để không gửi thừa thông tin.`),
      emailBody: email(`Chào anh/chị {{customer_name}},

Kế hoạch hiện tại của anh/chị là mua trong 30 ngày tới, chuyển sang thời điểm khác, cần kiểm tra lại cấu hình, hay tạm dừng nhu cầu? Hãy trả lời một lựa chọn để SmartFurni điều chỉnh lịch chăm sóc phù hợp.`),
    }),
    step({
      id: "D75_INSTALLATION_PREP", day: 75, sendHour: 10, sendMinute: 0, phase: "long_term",
      title: "Chuẩn bị giao và lắp đặt", objective: "Tạo sự yên tâm về trải nghiệm sau quyết định.",
      primaryChannel: "email", fallbackChannels: ["zalo_personal", "zalo_oa"],
      emailSubject: "Chuẩn bị gì trước khi giao và lắp Giường công thái học?",
      zaloBody: zalo(`Trước khi giao và lắp đặt, SmartFurni sẽ cùng anh/chị xác nhận lối vận chuyển, vị trí ổ điện, khoảng trống quanh giường, nệm và kích thước. Việc chuẩn bị trước giúp quá trình lắp đặt gọn gàng và sử dụng thuận tiện hơn.`),
      emailBody: email(`Chào anh/chị {{customer_name}},

Trước khi giao và lắp đặt, SmartFurni sẽ cùng anh/chị xác nhận lối vận chuyển, kích thước cửa hoặc thang máy khi cần, vị trí ổ điện, khoảng trống quanh giường, nệm và kích thước cấu hình.

Chuẩn bị trước giúp quá trình lắp đặt gọn gàng và người sử dụng được hướng dẫn vận hành đầy đủ.`),
    }),
    step({
      id: "D90_CLOSE_LOOP", day: 90, sendHour: 9, sendMinute: 0, phase: "long_term",
      title: "Đóng vòng chăm sóc", objective: "Xin phép tiếp tục, hẹn lại hoặc kết thúc tôn trọng.",
      primaryChannel: "zalo_personal", fallbackChannels: ["email", "zalo_oa"],
      emailSubject: "SmartFurni xin xác nhận lần cuối về nhu cầu của anh/chị",
      zaloBody: zalo(`SmartFurni xin phép khép lại chuỗi tư vấn hiện tại. Anh/chị chọn:

1 — Tiếp tục tư vấn
2 — Liên hệ lại vào thời điểm khác
3 — Ngừng nhận nội dung về sản phẩm này

SmartFurni sẽ thực hiện đúng lựa chọn của anh/chị.`),
      emailBody: email(`Chào anh/chị {{customer_name}},

SmartFurni xin phép khép lại chuỗi tư vấn hiện tại. Anh/chị có thể chọn tiếp tục tư vấn, hẹn liên hệ lại vào thời điểm khác hoặc ngừng nhận nội dung về sản phẩm này.

Chúng tôi sẽ thực hiện đúng lựa chọn của anh/chị.`),
    }),
  ],
};

export function b2cErgonomicJourneyDefinitionWithOverrides(
  settings: Pick<B2CErgonomicBedJourneySettings, "stepOverrides">,
): B2CErgonomicBedJourneyDefinition {
  return {
    ...B2C_ERGONOMIC_BED_JOURNEY,
    steps: B2C_ERGONOMIC_BED_JOURNEY.steps.map(current => {
      const override: JourneyStepOverride = settings.stepOverrides?.[current.id] || {};
      return {
        ...current,
        emailSubject: override.emailSubject ?? current.emailSubject,
        emailBody: override.emailBody ?? current.emailBody,
        zaloBody: override.zaloBody ?? current.zaloBody,
        mediaAssetIds: [...new Set(override.mediaAssetIds || current.mediaAssetIds || [])].slice(0, 10),
      };
    }),
  };
}

const ERGONOMIC_TERMS = [
  "giường công thái học", "giuong cong thai hoc", "giường điều chỉnh", "giuong dieu chinh",
  "giường nâng hạ", "giuong nang ha", "khung nâng hạ", "khung nang ha",
  "adjustable bed", "ergonomic bed", "giường điện", "giuong dien",
];

export function leadHasErgonomicBedInterest(lead: Lead): boolean {
  if (lead.interestedProducts?.includes("ergonomic_bed")) return true;
  const text = [lead.notes, lead.sourceDetail, lead.projectName, lead.company, ...(lead.tags || [])]
    .join(" ")
    .toLocaleLowerCase("vi");
  return ERGONOMIC_TERMS.some(term => text.includes(term));
}

export function isEligibleForB2CErgonomicBedJourney(
  lead: Lead,
  settings: B2CErgonomicBedJourneySettings,
): { eligible: boolean; reason?: string } {
  if (!["new", "profile_sent", "surveyed"].includes(lead.stage)) {
    return { eligible: false, reason: "Lead không còn ở giai đoạn nuôi dưỡng chung." };
  }
  if (!leadHasErgonomicBedInterest(lead)) {
    return { eligible: false, reason: "Chưa có tín hiệu quan tâm Giường công thái học." };
  }
  const retail = lead.type === "retail" || lead.customerSegment === "retail";
  if (settings.requireRetailSignal && !retail) {
    return { eligible: false, reason: "Lead chưa được xác định là khách lẻ." };
  }
  const normalizedTags = new Set((lead.tags || []).map(tag => tag.trim().toLocaleLowerCase("vi")));
  const blocked = settings.doNotContactTags.some(tag => normalizedTags.has(tag.trim().toLocaleLowerCase("vi")));
  if (blocked) return { eligible: false, reason: "Lead có nhãn không liên hệ." };
  if (!lead.phone && !lead.email && !lead.zaloId) {
    return { eligible: false, reason: "Không có kênh liên hệ." };
  }
  return { eligible: true };
}

export function buildB2CErgonomicJourneyContext(
  lead: Lead,
  settings: B2CErgonomicBedJourneySettings,
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    customer_name: lead.name || "Anh/Chị",
    sales_name: lead.assignedTo || "Tư vấn viên SmartFurni",
    lead_source: lead.source || "website",
    city: lead.district || lead.projectAddress || "",
    primary_benefit: "",
    solution_type: "",
    benefit_summary: "",
    fit_reason: "",
    recommended_size: "",
    price_range: "",
    included_items: "",
    existing_bed_dimensions: "",
    mattress_type: "",
    user_profile: "",
    purchase_timing: "",
    approved_demo_video_url: settings.approvedDemoVideoUrl,
    comparison_pack_url: settings.comparisonPackUrl,
    survey_form_url: settings.surveyFormUrl,
    ...extra,
  };
}
