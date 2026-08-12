import type {
  BusinessBrainFlowEdge,
  BusinessBrainFlowStep,
  KnowledgeCategory,
  KnowledgeStatus,
} from "@/types/business-brain";

export const CRM_AUTOMATION_SPEC_SOURCE = "crm-automation-spec-v1.0";
export const CRM_AUTOMATION_SPEC_VERSION = "1.0";
export const CRM_AUTOMATION_SPEC_PUBLISHED_AT = "2026-08-12";

export interface CrmAutomationSpecificationDocument {
  id: string;
  title: string;
  category: KnowledgeCategory;
  status: KnowledgeStatus;
  content: string;
  summary: string;
  tags: string[];
  source: string;
  createdBy: string;
  updatedBy: string;
  metadata: {
    documentCode: string;
    sequence: number;
    version: string;
    publishedAt: string;
    sourceFile: string;
    sourceSections: string[];
    documentType: string;
    owner: string;
    audience: string;
    reviewCycle: string;
    implementationMode: string;
    linkedCrmModules: string[];
    developmentRequirements: string[];
    acceptanceCriteria: string[];
    aiProgrammingPrompt: string;
    codeVersion: string;
    implementationStatus: "specified" | "planned" | "in_development" | "testing" | "deployed";
    flowSteps: BusinessBrainFlowStep[];
    flowEdges: BusinessBrainFlowEdge[];
  };
}

type FlowSeed = Omit<BusinessBrainFlowStep, "id"> & { key: string };

function buildFlow(prefix: string, seeds: FlowSeed[], branches?: Array<[string, string, string?]>) {
  const flowSteps = seeds.map(({ key, ...step }) => ({ ...step, id: `${prefix}-${key}` }));
  const edgeSeeds = branches ?? seeds.slice(0, -1).map((step, index) => [step.key, seeds[index + 1].key] as [string, string]);
  const flowEdges = edgeSeeds.map(([source, target, label], index) => ({
    id: `${prefix}-edge-${index + 1}`,
    source: `${prefix}-${source}`,
    target: `${prefix}-${target}`,
    label: label || "",
  }));
  return { flowSteps, flowEdges };
}

function createDocument(input: Omit<CrmAutomationSpecificationDocument, "source" | "createdBy" | "updatedBy" | "metadata"> & {
  sequence: number;
  sourceSections: string[];
  documentType: string;
  owner: string;
  audience: string;
  reviewCycle: string;
  implementationMode: string;
  flow: ReturnType<typeof buildFlow>;
}): CrmAutomationSpecificationDocument {
  return {
    id: input.id,
    title: input.title,
    category: input.category,
    status: input.status,
    content: input.content,
    summary: input.summary,
    tags: input.tags,
    source: CRM_AUTOMATION_SPEC_SOURCE,
    createdBy: "SmartFurni Spec Import",
    updatedBy: "SmartFurni Spec Import",
    metadata: {
      documentCode: `SF-AUTO-${String(input.sequence).padStart(2, "0")}`,
      sequence: input.sequence,
      version: CRM_AUTOMATION_SPEC_VERSION,
      publishedAt: CRM_AUTOMATION_SPEC_PUBLISHED_AT,
      sourceFile: "Bo_Dac_Ta_Tu_Dong_Hoa_CRM_SmartFurni.pdf",
      sourceSections: input.sourceSections,
      documentType: input.documentType,
      owner: input.owner,
      audience: input.audience,
      reviewCycle: input.reviewCycle,
      implementationMode: input.implementationMode,
      linkedCrmModules: input.flow.flowSteps.map(step => step.channel).filter((value, index, values) => Boolean(value) && values.indexOf(value) === index),
      developmentRequirements: [
        `Triển khai đúng phạm vi ${input.title.replace(/^SF-AUTO-\d+\s*·\s*/, "")}.`,
        "Mọi mutation phải có RBAC, audit log, idempotency và trạng thái lỗi rõ ràng.",
        "Không tự động hóa hành động vượt quá implementationMode đã được phê duyệt.",
      ],
      acceptanceCriteria: [
        "Đạt toàn bộ tiêu chí nghiệm thu nêu trong nội dung tài liệu.",
        "Có unit test, integration test và bằng chứng kiểm thử giao diện tương ứng.",
        "Mã nguồn và cấu hình triển khai dẫn chiếu đúng documentCode và version.",
      ],
      aiProgrammingPrompt: `Đọc SF-AUTO-${String(input.sequence).padStart(2, "0")} cùng SF-AUTO-01, SF-AUTO-08 và SF-AUTO-09 trước khi phân tích hoặc lập trình. Chỉ đề xuất thay đổi trong phạm vi tài liệu active; nêu rõ file, dữ liệu, quyền, guardrail, test và rollback. Không sửa tài liệu doanh nghiệp hoặc triển khai hành động rủi ro nếu chưa có phê duyệt của quản trị viên.`,
      codeVersion: "Chưa liên kết commit",
      implementationStatus: "specified",
      flowSteps: input.flow.flowSteps,
      flowEdges: input.flow.flowEdges,
    },
  };
}

const dataFlow = buildFlow("sf-auto-01", [
  { key: "capture", title: "Tiếp nhận lead", description: "Ghi nguồn, chiến dịch và payload gốc", owner: "Marketing Ops", channel: "Data Pool", tone: "blue", nodeType: "start" },
  { key: "dedupe", title: "Chuẩn hóa & chống trùng", description: "Chuẩn hóa SĐT/email, hợp nhất đúng hồ sơ", owner: "CRM", channel: "Data", tone: "violet", nodeType: "data" },
  { key: "contact", title: "Contact & Organization", description: "Một người, nhiều nguồn và cơ hội", owner: "CRM Admin", channel: "CRM", tone: "blue", nodeType: "crm" },
  { key: "opportunity", title: "Cơ hội kinh doanh", description: "Segment, sản phẩm, stage và owner", owner: "Sale", channel: "Pipeline", tone: "amber", nodeType: "human" },
  { key: "classify", title: "Tag & lead score", description: "Phân loại có namespace và bằng chứng", owner: "AI + Sale", channel: "Rules", tone: "violet", nodeType: "ai" },
  { key: "journey", title: "Đủ điều kiện vào journey", description: "Chỉ định tuyến khi dữ liệu tối thiểu hợp lệ", owner: "Automation", channel: "Workflow", tone: "emerald", nodeType: "end" },
]);

const intakeFlow = buildFlow("sf-auto-02", [
  { key: "assign", title: "Phân công lead", description: "Theo sản phẩm, khu vực, segment và tải", owner: "CRM", channel: "Queue", tone: "blue", nodeType: "start" },
  { key: "call", title: "Gọi xác nhận", description: "Ưu tiên trong SLA 5–15 phút", owner: "Sale", channel: "Tổng đài", tone: "amber", nodeType: "human" },
  { key: "connected", title: "Khách nghe máy?", description: "Chọn disposition bắt buộc", owner: "Sale", channel: "Call Form", tone: "violet", nodeType: "decision" },
  { key: "enrich", title: "AI điền gợi ý", description: "Tóm tắt, nhu cầu, score và bước tiếp", owner: "AI Agent", channel: "Draft", tone: "violet", nodeType: "ai" },
  { key: "confirm", title: "Nhân viên xác nhận", description: "Sửa dữ liệu trước khi lưu", owner: "Sale", channel: "CRM", tone: "amber", nodeType: "approval" },
  { key: "noanswer", title: "Không nghe máy", description: "Lịch gọi lại và tin nhắn nhỡ đã duyệt", owner: "Workflow", channel: "Zalo OA", tone: "blue", nodeType: "delay" },
  { key: "route", title: "Định tuyến journey", description: "Hủy chuỗi cũ, tạo hành động tiếp theo", owner: "Automation", channel: "Event", tone: "emerald", nodeType: "end" },
], [
  ["assign", "call"], ["call", "connected"], ["connected", "enrich", "Có"], ["enrich", "confirm"],
  ["confirm", "route"], ["connected", "noanswer", "Không"], ["noanswer", "route"],
]);

const omnichannelFlow = buildFlow("sf-auto-03", [
  { key: "event", title: "Sự kiện CRM", description: "Stage, inbound, quote, lịch hẹn hoặc cọc", owner: "CRM", channel: "Event", tone: "blue", nodeType: "trigger" },
  { key: "route", title: "Chọn journey", description: "segment + product + stage + temperature + next action", owner: "Workflow Engine", channel: "Router", tone: "violet", nodeType: "ai" },
  { key: "guard", title: "Cổng an toàn", description: "Consent, stop, dedupe, quiet hours, frequency cap", owner: "Automation", channel: "Policy", tone: "amber", nodeType: "decision" },
  { key: "schedule", title: "Lập lịch hành động", description: "Snapshot phiên bản và idempotency key", owner: "Job Queue", channel: "Queue", tone: "blue", nodeType: "delay" },
  { key: "channel", title: "Thực thi đúng kênh", description: "Zalo OA, email, tổng đài hoặc task", owner: "Channel Adapter", channel: "Omnichannel", tone: "emerald", nodeType: "channel" },
  { key: "audit", title: "Ghi kết quả & audit", description: "Provider result, lỗi, skip reason và KPI", owner: "CRM", channel: "Audit", tone: "emerald", nodeType: "end" },
  { key: "skip", title: "Dừng hoặc bỏ qua", description: "Ghi rõ lý do, không tạo tác vụ trùng", owner: "Workflow Engine", channel: "Audit", tone: "rose", nodeType: "end" },
], [
  ["event", "route"], ["route", "guard"], ["guard", "schedule", "Đạt"], ["schedule", "channel"],
  ["channel", "audit"], ["guard", "skip", "Không đạt"],
]);

const sofaFlow = buildFlow("sf-auto-04", [
  { key: "qualified", title: "Lead Sofa Giường", description: "Xác nhận bán lẻ và nhu cầu chính", owner: "Sale bán lẻ", channel: "CRM", tone: "blue", nodeType: "start" },
  { key: "discovery", title: "Khám phá nhu cầu", description: "Không gian, size, nệm sẵn có, ngân sách", owner: "Sale", channel: "Gọi điện", tone: "amber", nodeType: "human" },
  { key: "recommend", title: "Chọn tối đa 3 mẫu", description: "Chỉ từ catalog, tồn kho và giá hiệu lực", owner: "AI + Sale", channel: "Zalo OA", tone: "violet", nodeType: "ai" },
  { key: "temperature", title: "Mức độ sẵn sàng", description: "HOT, WARM hoặc COLD có căn cứ", owner: "CRM", channel: "Lead Score", tone: "violet", nodeType: "decision" },
  { key: "action", title: "CTA phù hợp", description: "Báo giá, gọi lại, showroom hoặc nuôi dưỡng", owner: "Sale", channel: "Task", tone: "blue", nodeType: "action" },
  { key: "outcome", title: "Kết quả", description: "Tiến triển stage hoặc dừng đúng điều kiện", owner: "Sale", channel: "Pipeline", tone: "emerald", nodeType: "end" },
]);

const ergoFlow = buildFlow("sf-auto-05", [
  { key: "qualified", title: "Lead Giường công thái học", description: "Xác nhận bán lẻ và nhu cầu sử dụng", owner: "Sale kỹ thuật", channel: "CRM", tone: "blue", nodeType: "start" },
  { key: "collect", title: "Thu dữ liệu lắp đặt", description: "Size, nệm, giường cũ, ảnh lòng/nan giường", owner: "Sale", channel: "Zalo OA", tone: "amber", nodeType: "human" },
  { key: "compatibility", title: "Kiểm tra tương thích", description: "Không tự kết luận khi thiếu ảnh hoặc cấu tạo", owner: "Kỹ thuật", channel: "Review", tone: "violet", nodeType: "approval" },
  { key: "recommend", title: "Phương án đã xác minh", description: "Cấu hình, nệm phù hợp và video vận hành", owner: "AI + Kỹ thuật", channel: "Draft", tone: "violet", nodeType: "ai" },
  { key: "experience", title: "Báo giá hoặc trải nghiệm", description: "Chọn CTA chính theo nhiệt độ lead", owner: "Sale", channel: "Zalo & Showroom", tone: "blue", nodeType: "action" },
  { key: "outcome", title: "Kết quả", description: "Theo dõi phản hồi, cọc hoặc nuôi dưỡng", owner: "Sale", channel: "Pipeline", tone: "emerald", nodeType: "end" },
]);

const b2bFlow = buildFlow("sf-auto-06", [
  { key: "identify", title: "Nhận diện B2B", description: "Đại lý, nhà phân phối hoặc dự án", owner: "Sale B2B", channel: "CRM", tone: "blue", nodeType: "start" },
  { key: "organization", title: "Xác minh tổ chức", description: "Vai trò, khu vực, năng lực và người quyết định", owner: "Sale B2B", channel: "Call & Email", tone: "amber", nodeType: "human" },
  { key: "qualify", title: "Thẩm định cơ hội", description: "Số lượng, timeline, ngân sách, BOQ và tiêu chí", owner: "Sale B2B", channel: "CRM", tone: "violet", nodeType: "decision" },
  { key: "package", title: "Gói tài liệu phù hợp", description: "Catalogue, năng lực, mẫu và case study", owner: "Marketing B2B", channel: "Email", tone: "blue", nodeType: "action" },
  { key: "approval", title: "Phê duyệt thương mại", description: "Giá ngoại lệ, công nợ, độc quyền và cam kết", owner: "Giám đốc Kinh doanh", channel: "Approval", tone: "amber", nodeType: "approval" },
  { key: "pipeline", title: "Pipeline B2B", description: "Meeting, mẫu thử, báo giá, hợp đồng hoặc nurture", owner: "Sale B2B", channel: "Pipeline", tone: "emerald", nodeType: "end" },
]);

const revenueFlow = buildFlow("sf-auto-07", [
  { key: "quote", title: "Tạo báo giá nháp", description: "Product/price version, size, phí và thời hạn", owner: "Sale", channel: "Quotation", tone: "blue", nodeType: "start" },
  { key: "validate", title: "Kiểm tra & phê duyệt", description: "Biến, giá, chiết khấu, file và người duyệt", owner: "Quản lý", channel: "Approval", tone: "amber", nodeType: "approval" },
  { key: "send", title: "Gửi & theo dõi báo giá", description: "Snapshot bản gửi và follow-up đúng version", owner: "Sale", channel: "Email & Zalo", tone: "violet", nodeType: "action" },
  { key: "showroom", title: "Hẹn trải nghiệm", description: "Xác nhận, nhắc lịch, kết quả và no-show", owner: "Showroom Host", channel: "Appointment", tone: "blue", nodeType: "human" },
  { key: "deposit", title: "Chờ cọc & đối soát", description: "Không xác nhận tiền chỉ dựa trên ảnh giao dịch", owner: "Sale + Kế toán", channel: "Payment", tone: "amber", nodeType: "decision" },
  { key: "order", title: "Đơn hàng & giao lắp", description: "Sản xuất, lịch giao, nghiệm thu và trạng thái", owner: "Vận hành", channel: "Order", tone: "blue", nodeType: "crm" },
  { key: "aftercare", title: "Hậu mãi", description: "Ngày 1, hướng dẫn, đánh giá, bảo hành và cross-sell", owner: "CSKH", channel: "Zalo OA", tone: "emerald", nodeType: "end" },
]);

const aiFlow = buildFlow("sf-auto-08", [
  { key: "request", title: "Yêu cầu nghiệp vụ", description: "Có actor, mục tiêu và phạm vi dữ liệu", owner: "CRM", channel: "Agent Router", tone: "blue", nodeType: "start" },
  { key: "retrieve", title: "Truy xuất tri thức", description: "Chỉ tài liệu active và dữ liệu có version", owner: "AI Agent", channel: "Knowledge", tone: "violet", nodeType: "ai" },
  { key: "confidence", title: "Đủ dữ liệu & tin cậy?", description: "Không bịa giá, chính sách hay thông số", owner: "AI Governance", channel: "Guardrail", tone: "amber", nodeType: "decision" },
  { key: "draft", title: "Tạo gợi ý/nháp", description: "Đầu ra JSON có bằng chứng và next action", owner: "AI Agent", channel: "Draft", tone: "violet", nodeType: "ai" },
  { key: "approve", title: "Phê duyệt theo rủi ro", description: "Giá ngoại lệ, thanh toán, hợp đồng, khiếu nại", owner: "Người có thẩm quyền", channel: "Approval", tone: "amber", nodeType: "approval" },
  { key: "execute", title: "Thực hiện có kiểm soát", description: "Idempotency, consent, audit và kill switch", owner: "Workflow", channel: "Action", tone: "emerald", nodeType: "end" },
  { key: "handoff", title: "Chuyển con người", description: "Kèm tóm tắt, lý do, dữ liệu thiếu và SLA", owner: "Sale/CSKH", channel: "Task", tone: "rose", nodeType: "human" },
], [
  ["request", "retrieve"], ["retrieve", "confidence"], ["confidence", "draft", "Đạt"], ["draft", "approve"],
  ["approve", "execute"], ["confidence", "handoff", "Thiếu/không chắc"],
]);

const platformFlow = buildFlow("sf-auto-09", [
  { key: "transaction", title: "Giao dịch nghiệp vụ", description: "Cập nhật DB và ghi outbox cùng transaction", owner: "Backend", channel: "API", tone: "blue", nodeType: "start" },
  { key: "publish", title: "Phát sự kiện có version", description: "event id, actor, occurred_at và correlation id", owner: "Event Publisher", channel: "Outbox", tone: "violet", nodeType: "webhook" },
  { key: "enqueue", title: "Tạo job idempotent", description: "Lập lịch, retry policy và snapshot context", owner: "Workflow Engine", channel: "Queue", tone: "blue", nodeType: "delay" },
  { key: "recheck", title: "Kiểm tra lại trước chạy", description: "State, consent, stop, feature flag và phiên bản", owner: "Worker", channel: "Guardrail", tone: "amber", nodeType: "decision" },
  { key: "execute", title: "Gọi adapter/provider", description: "Timeout, client reference và kết quả chuẩn hóa", owner: "Worker", channel: "Adapter", tone: "violet", nodeType: "action" },
  { key: "observe", title: "Audit, metric và DLQ", description: "Truy vết, cảnh báo, replay có kiểm soát", owner: "DevOps", channel: "Observability", tone: "emerald", nodeType: "end" },
]);

const governanceFlow = buildFlow("sf-auto-10", [
  { key: "measure", title: "Đo KPI & SLA", description: "Funnel, nguồn, nhân viên, kênh và lỗi", owner: "Sales Ops", channel: "Dashboard", tone: "blue", nodeType: "start" },
  { key: "alert", title: "Phát hiện ngoại lệ", description: "HOT quá hạn, queue lỗi, consent hoặc template", owner: "CRM", channel: "Alert", tone: "rose", nodeType: "trigger" },
  { key: "route", title: "AI đọc đúng tài liệu", description: "Dùng manifest theo chủ đề và chức năng", owner: "AI Router", channel: "Knowledge", tone: "violet", nodeType: "ai" },
  { key: "template", title: "Chọn mẫu có version", description: "Biến đủ nguồn, một CTA và đúng cấp tự động", owner: "Content Owner", channel: "Template", tone: "amber", nodeType: "approval" },
  { key: "review", title: "Rà soát định kỳ", description: "Số liệu, phản hồi, lỗi và thay đổi chính sách", owner: "Chủ tài liệu", channel: "Governance", tone: "blue", nodeType: "human" },
  { key: "improve", title: "Phát hành phiên bản mới", description: "Không sửa âm thầm bản đang vận hành", owner: "CRM Admin", channel: "Version", tone: "emerald", nodeType: "end" },
]);

export const CRM_AUTOMATION_SPEC_DOCUMENTS: CrmAutomationSpecificationDocument[] = [
  createDocument({
    id: "crm-auto-01-data-taxonomy", sequence: 1, title: "SF-AUTO-01 · Nền tảng dữ liệu, trạng thái, tag và lead score",
    category: "governance", status: "active", sourceSections: ["01", "02"], documentType: "data-governance",
    owner: "CRM Admin & Data Owner", audience: "Marketing, Sale, CSKH, AI Agent, Kỹ thuật", reviewCycle: "Hàng tháng",
    implementationMode: "Nền tảng bắt buộc trước mọi workflow", flow: dataFlow,
    summary: "Nguồn chuẩn về mô hình dữ liệu, vòng đời cơ hội, taxonomy tag và phương pháp chấm điểm lead SmartFurni.",
    tags: ["data model", "taxonomy", "stage", "tag", "lead score", "dedupe", "consent"],
    content: `# 1. Mục tiêu
Tạo một ngôn ngữ dữ liệu thống nhất để CRM, nhân viên và AI hiểu cùng một khách hàng, một cơ hội và một trạng thái. Tài liệu này là nền móng bắt buộc trước khi triển khai workflow.

# 2. Nguyên tắc bất biến
- Lead là lần ghi nhận nguồn; Contact là con người; Organization là tổ chức; Opportunity là nhu cầu mua cụ thể.
- Một Contact có thể đến từ nhiều quảng cáo và có nhiều Opportunity theo thời gian. Không nhân bản khách chỉ vì khác nguồn.
- Mọi thay đổi stage, owner, consent, score và dữ liệu nhạy cảm phải có lịch sử: trước/sau, actor, thời gian và lý do.
- Dữ liệu gốc từ form, webhook và cuộc gọi phải được lưu; dữ liệu AI chỉ là gợi ý cho đến khi có căn cứ hoặc người xác nhận.

# 3. Thực thể tối thiểu
Lead Source lưu platform, campaign, ad group, ad, keyword, landing, UTM, gclid/fbclid/ttclid và payload gốc. Contact lưu tên, SĐT chuẩn hóa, email, Zalo UID nếu hợp lệ, khu vực, consent và do-not-contact. Organization lưu loại hình, mã số thuế, địa chỉ, vai trò mua và quan hệ contact. Opportunity lưu segment, sản phẩm, stage, temperature, score, owner, ngân sách, số lượng, timeline, next action và lost reason.

Interaction phải ghi inbound/outbound, kênh, direction, nội dung hoặc transcript, provider id, template/version và trạng thái giao nhận. Task phải gắn contact/opportunity, loại việc, hạn xử lý, SLA, owner và kết quả. Journey Enrollment và Scheduled Action lưu journey/version, step, trạng thái, thời điểm chạy, snapshot ngữ cảnh, idempotency key và lý do skip/cancel. Consent lưu theo contact + channel + purpose, nguồn, thời điểm, bằng chứng và trạng thái.

# 4. Vòng đời cơ hội chuẩn
NEW → CONTACTING → CONNECTED → QUALIFIED → CONSULTING → QUOTE_PENDING → QUOTE_SENT → NEGOTIATING → SHOWROOM_BOOKED → DEPOSIT_PENDING → WON.

Nhánh kết thúc gồm LOST, INVALID hoặc NURTURE. Không tự chuyển LOST chỉ vì khách im lặng. Mỗi transition phải kiểm tra dữ liệu bắt buộc, quyền người thực hiện và transition hợp lệ.

# 5. Taxonomy tag có namespace
- SEG: RETAIL, DEALER, DISTRIBUTOR, PROJECT.
- PROD: SOFA_BED, ERGONOMIC_BED.
- NEED: SIZE_HELP, EXISTING_MATTRESS, TECHNICAL_REVIEW, SHOWROOM, QUOTE, DELIVERY.
- SOURCE: FACEBOOK, GOOGLE, TIKTOK, ORGANIC, REFERRAL.
- TEMP: HOT, WARM, COLD; trạng thái chính vẫn nằm ở trường stage, không dùng tag thay stage.
- RISK: DUPLICATE_REVIEW, CONSENT_MISSING, PRICE_EXCEPTION, COMPLAINT.

Không tạo tag tự do nếu đã có mã chuẩn. Tag phải có mô tả, owner, ngày hiệu lực và trạng thái active/inactive.

# 6. Lead score và nhiệt độ
Score là tổng bằng chứng có trọng số: liên lạc được, nhu cầu rõ, size/số lượng, khu vực, ngân sách/timeline, ý định báo giá/showroom/cọc, vai trò quyết định và mức tương tác. Trừ điểm khi dữ liệu giả, sai đối tượng, trùng chưa xử lý hoặc yêu cầu ngừng liên hệ. HOT/WARM/COLD phải có ngưỡng cấu hình và lưu phiên bản công thức; AI không được tự nâng HOT nếu không có bằng chứng.

# 7. Điều kiện dữ liệu khi chuyển stage
QUALIFIED cần segment, product, nhu cầu chính, owner và next action. QUOTE_SENT cần quote number/version, thời điểm gửi và kênh. SHOWROOM_BOOKED cần địa điểm, thời gian, host. DEPOSIT_PENDING cần cấu hình đơn dự kiến và chính sách thanh toán đã duyệt. WON chỉ sau khi giao dịch được đối soát theo quy trình.

# 8. Tiêu chí nghiệm thu
1. Lead trùng SĐT từ hai nguồn được hợp nhất vào Contact nhưng giữ đủ attribution.
2. Một Contact có thể có cơ hội bán lẻ và B2B độc lập.
3. Lọc được theo segment, sản phẩm, stage, temperature, tag, nguồn và owner.
4. Không chuyển stage nếu thiếu dữ liệu bắt buộc.
5. Retry không tạo Contact, interaction, task hoặc action trùng.
6. Consent và audit truy xuất được đến từng thay đổi.`,
  }),
  createDocument({
    id: "crm-auto-02-lead-call-intake", sequence: 2, title: "SF-AUTO-02 · Tiếp nhận lead, gọi xác nhận và xử lý không nghe máy",
    category: "sales_process", status: "active", sourceSections: ["03", "06"], documentType: "operating-procedure",
    owner: "Sales Ops & Call Center Lead", audience: "Sale, Call Center, CRM Admin, AI Agent", reviewCycle: "Hàng tháng",
    implementationMode: "Draft only trước; limited auto cho xác nhận cuộc gọi nhỡ", flow: intakeFlow,
    summary: "SOP từ lúc lead vào Data Pool đến disposition, AI hậu xử lý, callback và định tuyến journey.",
    tags: ["Data Pool", "call disposition", "no answer", "callback", "SLA", "post-call"],
    content: `# 1. Mục tiêu
Mọi lead mới phải được phân công, gọi xác nhận đúng SLA, ghi nhận kết quả có cấu trúc và có bước tiếp theo. Không nghe máy không đồng nghĩa lead không hợp lệ.

# 2. Trước cuộc gọi
CRM chuẩn hóa và chống trùng, xác định sản phẩm/segment dự kiến, gợi ý hồ sơ cũ, phân công theo khu vực và tải công việc. Sale nhìn thấy nguồn quảng cáo, landing, nội dung đăng ký, tương tác trước và cảnh báo consent/trùng.

# 3. Form kết quả cuộc gọi bắt buộc
- Disposition: CONNECTED_QUALIFIED, CONNECTED_NOT_READY, CALLBACK_REQUESTED, NO_ANSWER, BUSY, WRONG_NUMBER, DUPLICATE, NOT_INTERESTED, DO_NOT_CONTACT hoặc OTHER có lý do.
- Xác nhận segment, sản phẩm, nhu cầu, size/số lượng, khu vực, ngân sách/timeline nếu có, pain point, nhiệt độ, next action, lịch hẹn và ghi chú.
- AI có thể tóm tắt transcript, trích xuất trường và đề xuất score/journey; nhân viên phải xác nhận trước khi lưu nếu độ tin cậy chưa đạt.

# 4. Sau khi lưu disposition
CRM ghi interaction, cập nhật opportunity, tạo stage history và phát call.disposition_confirmed. Workflow engine hủy hành động cũ xung đột, chọn journey mới, tạo task hoặc nháp nội dung. Khách cũ ưu tiên owner đang quản lý trừ khi có quy tắc phân công khác được duyệt.

# 5. Luồng không nghe máy
Lần 1: ghi NO_ANSWER, tạo task gọi lại và gửi mẫu TPL_NO_ANSWER_ZALO_01 khi kênh/consent hợp lệ. Lần 2: gọi trong khung giờ khác; nếu khách hẹn giờ, lưu callback_time và gửi TPL_CALLBACK_CONFIRM_01. Lần 3: chỉ thực hiện theo cadence cấu hình, sau đó chuyển nurture chưa xác minh thay vì LOST.

Mọi lần thử phải có thời gian, kênh, kết quả, owner và next attempt. Khi khách gọi lại, nhắn lại, đặt lịch hoặc yêu cầu dừng, phải hủy toàn bộ scheduled action không còn phù hợp.

# 6. Quy tắc thời gian và tần suất
SLA lead mới mặc định 5–15 phút trong giờ làm việc nhưng quản trị viên được cấu hình. Không gọi/nhắn trong quiet hours. Không tạo hai task mở cùng loại cho một opportunity trong cùng khoảng chống trùng. Callback do khách yêu cầu có ưu tiên cao hơn nurture.

# 7. Trường hợp cần chuyển người/quản lý
HOT chưa có owner, callback quá hạn, khách khiếu nại, yêu cầu báo giá ngoại lệ, số điện thoại xung đột, transcript thiếu hoặc AI không chắc sản phẩm/segment.

# 8. Tiêu chí nghiệm thu
1. Form không lưu disposition kết nối nếu thiếu next action.
2. NO_ANSWER không tự chuyển LOST.
3. Callback đúng giờ có cảnh báo sau 15 phút quá hạn.
4. Inbound hủy tin nhắn nhỡ sắp gửi.
5. Mỗi quyết định AI lưu độ tin cậy và phần nhân viên sửa.
6. Quản lý xem được toàn bộ lần liên hệ và lý do bỏ qua.`,
  }),
  createDocument({
    id: "crm-auto-03-omnichannel-workflow", sequence: 3, title: "SF-AUTO-03 · Động cơ workflow và chính sách chăm sóc đa kênh",
    category: "automation", status: "active", sourceSections: ["04", "05"], documentType: "automation-policy",
    owner: "CRM Automation Lead", audience: "CRM Admin, Kỹ thuật, Marketing, Sale, CSKH", reviewCycle: "Hàng tháng",
    implementationMode: "Shadow → Draft only → Limited auto → Full auto theo từng journey", flow: omnichannelFlow,
    summary: "Quy tắc định tuyến, lập lịch, dừng chuỗi và phân vai Zalo OA, email, Zalo cá nhân, tổng đài.",
    tags: ["workflow engine", "Zalo OA", "email", "call center", "idempotency", "quiet hours"],
    content: `# 1. Mục tiêu
Điều phối hành động đa kênh dựa trên sự kiện, không dựa vào cron mù. Engine phải chọn đúng journey, kiểm tra lại ngay trước khi chạy, chống thực thi trùng và giải thích được vì sao gửi hoặc bỏ qua.

# 2. Cấu trúc workflow có phiên bản
Mỗi journey cần journey_code, version, entry_conditions, exclusions, priority, steps, wait_policy, exit_conditions, reentry_policy, frequency_cap, feature_flag, effective_from/to và owner. Không sửa nội dung phiên bản đã chạy; phát hành version mới để audit.

# 3. Khóa định tuyến
segment + product + current_stage + temperature + next_action. Tag nhu cầu/rào cản chỉ là điều kiện phụ. Khi nhiều journey phù hợp, ưu tiên khiếu nại/hậu mãi, inbound, callback khách hẹn, HOT handoff, giao dịch, rồi mới nurture.

# 4. Sự kiện kích hoạt chính
call.disposition_confirmed, opportunity.stage_changed, opportunity.temperature_changed, interaction.inbound_received, quote.approved/sent/revised, appointment.booked/rescheduled/completed/no_show, payment.confirmed, order.status_changed, consent.revoked.

# 5. Kiểm tra ngay trước action
Contact không do_not_contact; consent đúng channel/purpose; opportunity chưa WON/LOST/INVALID; không human_takeover; không inbound chưa xử lý; không action/task trùng; đúng quiet hours/frequency cap; template/version và biến còn hợp lệ; không có journey ưu tiên cao hơn; kill switch và feature flag cho phép.

# 6. Phân vai kênh
- Zalo OA: hội thoại tư vấn, mẫu được duyệt và ZBS phù hợp policy/quyền. Không giả định OA có thể gửi mọi nội dung ngoài cửa sổ tương tác.
- Zalo cá nhân: chỉ hỗ trợ one-to-one do nhân viên chủ động; không dùng broadcast tự động hàng loạt. Hệ thống có thể tạo draft và task.
- Email: catalogue, hồ sơ năng lực, báo giá và nội dung dài. Xử lý bounce, unsubscribe và suppression.
- Tổng đài: xác minh, xử lý phức tạp và chốt bước tiếp; lưu call id, recording/transcript theo quyền.
- CRM Task/PWA: kênh fallback an toàn khi không đủ quyền tự gửi.

# 7. Chế độ vận hành
SHADOW chỉ tính và ghi quyết định. DRAFT_ONLY tạo nháp chờ duyệt. LIMITED_AUTO chỉ tự gửi danh sách hành động rủi ro thấp đã phê duyệt. FULL_AUTO bật theo từng journey/kênh sau nghiệm thu; không có công tắc toàn cục mơ hồ.

# 8. Quan sát và lỗi
Mỗi action lưu correlation id, idempotency key, rule/version, template/version, provider response, retry count, skip/cancel reason và actor. Lỗi tạm thời retry exponential backoff; lỗi vĩnh viễn hoặc quá ngưỡng vào DLQ và cảnh báo. Không fallback sang kênh khác nếu có nguy cơ khách nhận trùng.

# 9. Tiêu chí nghiệm thu
1. Có thể xem lý do chọn journey và lý do skip.
2. Khách phản hồi ngay trước giờ gửi làm action bị hủy.
3. Job retry không gửi trùng.
4. Quiet hours, consent và frequency cap cấu hình theo kênh.
5. Tắt feature flag dừng hành động chưa chạy nhưng giữ audit.
6. Zalo cá nhân không bị dùng broadcast.`,
  }),
  createDocument({
    id: "crm-auto-04-retail-sofa-bed", sequence: 4, title: "SF-AUTO-04 · Hành trình khách mua lẻ Sofa Giường",
    category: "customer_care", status: "active", sourceSections: ["07"], documentType: "customer-journey",
    owner: "Trưởng nhóm Bán lẻ Sofa Giường", audience: "Sale bán lẻ, CSKH, Marketing, AI Agent", reviewCycle: "Hàng tháng",
    implementationMode: "Limited auto với nội dung đã duyệt; giá/ngoại lệ phải có nguồn", flow: sofaFlow,
    summary: "Hành trình tư vấn sofa giường theo size, không gian, nệm sẵn có, ngân sách và mức sẵn sàng.",
    tags: ["retail", "sofa bed", "size", "existing mattress", "showroom", "quote"],
    content: `# 1. Mục tiêu
Giúp khách mua lẻ chọn đúng mẫu và kích thước với ít vòng hỏi lại, đồng thời tránh gửi quá nhiều mẫu hoặc tư vấn không phù hợp không gian.

# 2. Dữ liệu khám phá
Mục đích dùng chính; chiều ngang vị trí đặt; chiều dài khi mở thành giường; lối vận chuyển; số người dùng; tần suất ngủ; nệm đang có (rộng × dài × dày và loại); khu vực; ngân sách; phong cách/màu; thời gian mua; mong muốn xem showroom.

# 3. Sau cuộc gọi
Chỉ đề xuất tối đa ba mẫu từ catalog active, có dữ liệu size, giá và khả năng giao lắp. Gửi video/ảnh thực tế và một câu hỏi hoặc CTA chính. Nếu chưa có size, ưu tiên TPL_SOFA_NEED_SIZE_01. Nếu có nệm bông ép ba khúc, dùng nhánh TPL_SOFA_EXISTING_MATTRESS_01 và chuyển kỹ thuật khi cấu hình không chắc chắn.

# 4. Nhánh nhiệt độ
HOT: nhu cầu/size/timeline rõ, hỏi báo giá, showroom hoặc cọc → task ưu tiên, báo giá hoặc đặt lịch. WARM: có nhu cầu nhưng thiếu size/ngân sách/timeline → gửi hướng dẫn đo và follow-up có giá trị. COLD: mới tham khảo → nurture nhẹ, không gọi/nhắn dồn.

# 5. Nội dung và CTA
Tin đầu không quá ba mẫu; mỗi tin chỉ một CTA. Không tự sáng tạo giá, tải trọng, bảo hành, thời gian giao hoặc độ tương thích. CTA hợp lệ: gửi số đo, chọn mẫu muốn xem kỹ, nhận báo giá, đặt lịch showroom hoặc hẹn gọi lại.

# 6. Điều kiện dừng
Dừng nurture khi có inbound chưa xử lý, QUOTE_PENDING/QUOTE_SENT, SHOWROOM_BOOKED, DEPOSIT_PENDING, WON, khiếu nại, human_takeover hoặc do_not_contact. Im lặng không tự đánh LOST.

# 7. Biến cần có
customer_name khi tin cậy, size_requirement, recommended_models_summary, approved_price_summary, catalog_url/video_url, showroom, sale_name và sale_phone. Thiếu biến bắt buộc thì tạo draft hoặc task, không gửi.

# 8. KPI & nghiệm thu
Đo tỷ lệ đủ size, gửi gợi ý, phản hồi, báo giá, showroom, cọc và WON theo nguồn. Kiểm thử khách chưa biết size, khách có nệm sẵn, khách đổi nhu cầu và khách phản hồi sát giờ scheduled action.`,
  }),
  createDocument({
    id: "crm-auto-05-retail-ergonomic-bed", sequence: 5, title: "SF-AUTO-05 · Hành trình khách mua lẻ Giường Công Thái Học",
    category: "customer_care", status: "active", sourceSections: ["08"], documentType: "customer-journey",
    owner: "Trưởng nhóm Giường Công Thái Học & Kỹ thuật", audience: "Sale kỹ thuật, CSKH, Kỹ thuật, AI Agent", reviewCycle: "Hàng tháng",
    implementationMode: "Draft only khi liên quan tương thích; limited auto cho hướng dẫn đã duyệt", flow: ergoFlow,
    summary: "Quy trình tư vấn giường công thái học, kiểm tra giường/nệm hiện có và chuyển kỹ thuật khi cần.",
    tags: ["retail", "ergonomic bed", "technical review", "mattress", "installation", "showroom"],
    content: `# 1. Mục tiêu
Tư vấn đúng cấu hình dựa trên nhu cầu, kích thước, kết cấu giường và nệm hiện tại; không đưa ra cam kết kỹ thuật hoặc y tế khi chưa xác minh.

# 2. Dữ liệu khám phá
Mục đích sử dụng; size giường/nệm; loại và độ dày nệm; ảnh toàn bộ giường và phần lòng/nan; mong muốn đặt trực tiếp hay tích hợp giường cũ; người dùng; khu vực; ngân sách; timeline; nhu cầu xem vận hành tại showroom.

# 3. Kiểm tra tương thích
AI chỉ phân loại dữ liệu và gợi ý checklist. Kỹ thuật hoặc nguồn cấu hình được duyệt phải xác nhận phương án. Nệm cao su thiên nhiên/tổng hợp, foam và lò xo túi độc lập thường có khả năng phù hợp; nệm bông ép cứng, lò xo liên kết cứng và xơ dừa thường không phù hợp, nhưng vẫn phải kiểm tra mẫu cụ thể. Không dùng ngôn ngữ chữa bệnh.

# 4. Nội dung tự động an toàn
TPL_ERGO_AFTER_CALL_01 gửi phương án và video sau khi dữ liệu đủ. TPL_ERGO_INSTALL_CHOICE_01 hỏi phương án lắp. TPL_ERGO_PHOTO_REQUEST_01 yêu cầu ảnh/size. TPL_ERGO_MATTRESS_GUIDE_01 chỉ là hướng dẫn khái quát, không phải xác nhận cuối.

# 5. Nhánh vận hành
HOT → ưu tiên kỹ thuật/sale, báo giá hoặc showroom. WARM → thu ảnh/size và giải đáp rào cản. COLD → nội dung giáo dục ngắn và frequency cap thấp. Nếu khách có đau/bệnh, chỉ mô tả công năng sản phẩm, không chẩn đoán hoặc hứa kết quả sức khỏe.

# 6. Handoff bắt buộc
Ảnh không rõ, cấu tạo đặc biệt, size ngoài danh mục, nệm không xác định, yêu cầu tải trọng/cam kết kỹ thuật, lắp trên giường cũ, báo giá ngoại lệ, khiếu nại hoặc khách cần tư vấn y tế.

# 7. Điều kiện dừng và KPI
Dừng scheduled action khi khách phản hồi, chuyển kỹ thuật, đặt showroom, chờ báo giá/cọc, mua hàng hoặc yêu cầu dừng. Đo tỷ lệ thu đủ ảnh/size, kỹ thuật xác nhận, báo giá, trải nghiệm, cọc và sai khác giữa gợi ý AI với kết luận kỹ thuật.

# 8. Tiêu chí nghiệm thu
Không gửi kết luận tương thích khi thiếu dữ liệu; ảnh và dữ liệu nhạy cảm theo đúng quyền; mọi cấu hình gửi khách có nguồn/version; phản hồi khách hủy hành động chờ.`,
  }),
  createDocument({
    id: "crm-auto-06-b2b", sequence: 6, title: "SF-AUTO-06 · Hành trình B2B: Đại lý, Nhà phân phối và Đối tác dự án",
    category: "sales_process", status: "active", sourceSections: ["09"], documentType: "b2b-journey",
    owner: "Giám đốc Kinh doanh B2B", audience: "Sale B2B, Dự án, Marketing B2B, Kỹ thuật, Kế toán, Ban giám đốc", reviewCycle: "Hàng quý",
    implementationMode: "Draft only cho thương mại; limited auto cho tài liệu đã duyệt", flow: b2bFlow,
    summary: "Qualification và nurture riêng cho đại lý, nhà phân phối, dự án; kiểm soát giá, công nợ và cam kết.",
    tags: ["B2B", "dealer", "distributor", "project", "BOQ", "approval", "pipeline"],
    content: `# 1. Mục tiêu
Phân biệt rõ ba mô hình B2B, thu đủ thông tin tổ chức và người quyết định, sau đó định tuyến đúng bộ tài liệu, quy trình phê duyệt và pipeline.

# 2. Dữ liệu chung
Organization, mã số thuế nếu có, website/địa chỉ, khu vực, người liên hệ và vai trò, người quyết định, sản phẩm, số lượng/giá trị dự kiến, timeline, tiêu chí lựa chọn, đối thủ, next action và deadline. Email công việc ưu tiên cho tài liệu dài; Zalo dùng xác nhận ngắn.

# 3. Đại lý
Xác minh cửa hàng/kênh bán, khu vực, phân khúc khách, mẫu muốn trưng bày, số lượng nhập thử, năng lực bán và nhu cầu đào tạo. Gửi catalogue/case study/chính sách hợp tác đã duyệt; không tự cam kết giá đại lý hoặc địa bàn.

# 4. Nhà phân phối
Thu vùng phủ, mạng lưới, kho/vận hành, mục tiêu doanh số, yêu cầu độc quyền, công nợ và hỗ trợ marketing. Mọi đề xuất độc quyền, công nợ, rebate hoặc cam kết doanh số phải có cấp phê duyệt và thời hạn.

# 5. Đối tác dự án
Thu project_name, loại dự án, BOQ/bản vẽ, số lượng, tiêu chuẩn kỹ thuật, tiến độ, địa điểm, người quyết định, quy trình mua sắm và response_deadline. Xác nhận đã nhận hồ sơ nhưng không hứa giá/tiến độ trước khi thẩm định.

# 6. Scoring và pipeline
Bằng chứng HOT B2B gồm người quyết định rõ, nhu cầu/số lượng/timeline, tài liệu dự án, yêu cầu mẫu/báo giá/meeting và deadline. Pipeline: QUALIFIED → MEETING/TECHNICAL_REVIEW → SAMPLE/TRIAL → QUOTE → NEGOTIATING → CONTRACT/ORDER → WON; hoặc NURTURE/LOST có lý do.

# 7. Hành động và phê duyệt
TPL_B2B_WELCOME_ZALO_01 xác nhận tài liệu; TPL_B2B_CATALOG_EMAIL_01 gửi gói tài liệu; TPL_PROJECT_DOCUMENT_RECEIVED_01 xác nhận hồ sơ. Giá ngoài khung, chiết khấu, công nợ, độc quyền, pháp lý và cam kết tiến độ luôn human approval.

# 8. Dừng, KPI và nghiệm thu
Nurture dừng khi có project/negotiation active, inbound, báo giá, khiếu nại hoặc opt-out. Đo pipeline value, đủ qualification, meeting, mẫu thử, báo giá, hợp đồng, thời gian lead→quote/contract, nhập lại và doanh thu theo nhóm B2B. Dashboard phải tách ba nhóm, không gộp thành một tag B2B chung.`,
  }),
  createDocument({
    id: "crm-auto-07-quote-to-aftercare", sequence: 7, title: "SF-AUTO-07 · Từ báo giá, showroom, cọc và đơn hàng đến hậu mãi",
    category: "sales_process", status: "active", sourceSections: ["10", "11", "12"], documentType: "revenue-lifecycle",
    owner: "Sales Ops, Kế toán, Vận hành & CSKH", audience: "Sale, Quản lý, Showroom, Kế toán, Vận hành, CSKH", reviewCycle: "Hàng tháng",
    implementationMode: "Người duyệt báo giá/cọc; limited auto cho xác nhận, nhắc lịch và hậu mãi", flow: revenueFlow,
    summary: "Quy trình doanh thu khép kín từ quote version đến trải nghiệm, đối soát cọc, giao lắp và chăm sóc sau bán.",
    tags: ["quote", "showroom", "deposit", "payment", "order", "delivery", "after-sales"],
    content: `# 1. Báo giá có version
Quote phải gắn opportunity, product/price version, cấu hình, số lượng, phí, thuế, thời hạn, điều kiện giao lắp/thanh toán và người tạo. Validation chặn biến thiếu, giá hết hiệu lực, chiết khấu vượt quyền, file lỗi hoặc khách chưa đủ điều kiện. Bản ngoại lệ vào approval; bản gửi khách được snapshot và có quote_number/version.

Khi sửa báo giá, tạo revision mới và hủy follow-up bản cũ. TPL_QUOTE_SENT_ZALO_01 xác nhận đã gửi; TPL_QUOTE_FOLLOWUP_01 chỉ ở draft để sale duyệt, không tự giảm giá. Dừng follow-up khi khách reply, yêu cầu sửa, chấp nhận, từ chối hoặc quote hết hạn.

# 2. Showroom và trải nghiệm
Appointment cần địa điểm, thời gian, sản phẩm/mẫu cần chuẩn bị, host, khách tham dự và mục tiêu. Gửi TPL_SHOWROOM_CONFIRM_01; nhắc TPL_SHOWROOM_REMINDER_02H_01 theo cấu hình; đổi lịch phải hủy reminder cũ. Host nhận task/PWA, cập nhật COMPLETED, NO_SHOW, CANCELLED hoặc RESCHEDULED cùng ghi chú, nhu cầu, nhiệt độ và next action.

No-show không tự LOST; dùng TPL_SHOWROOM_NO_SHOW_01 hoặc task gọi lại. Kết quả phải cập nhật trong ngày.

# 3. Chờ cọc và đối soát
Trước hướng dẫn cọc, xác nhận lại order_summary, giá trị và approved_payment_summary bằng TPL_DEPOSIT_SUMMARY_01 đã được sale duyệt. Thông tin tài khoản thanh toán lấy từ cấu hình bảo vệ, không hard-code trong template.

Ảnh giao dịch chỉ tạo trạng thái PAYMENT_PROOF_RECEIVED và TPL_PAYMENT_PROOF_RECEIVED_01; không đồng nghĩa đã nhận tiền. Chỉ kế toán/nguồn tích hợp được phép payment.confirmed, sau đó chuyển WON và tạo order.

# 4. Đơn hàng và giao lắp
Order lưu số đơn, cấu hình, địa chỉ, liên hệ, tiến độ sản xuất, lịch giao, đội lắp, nghiệm thu và trạng thái. TPL_ORDER_CONFIRMED_01 chỉ gửi sau khi đơn hợp lệ. Thay đổi lịch/cấu hình phải lưu lịch sử và thông báo đúng người.

# 5. Hậu mãi
Ngày 1 kiểm tra giao/lắp bằng TPL_POST_DELIVERY_DAY1_01. Khi có vấn đề, mở case và dừng cross-sell/nurture. Sau thời gian phù hợp dùng TPL_REVIEW_REQUEST_01. Bảo hành/khiếu nại có SLA theo mức độ, owner và audit. Chỉ cross-sell khi case đóng và consent phù hợp.

# 6. Tiêu chí nghiệm thu
Quote revision không gửi follow-up bản cũ; đổi lịch không gửi reminder cũ; ảnh chuyển khoản không tự xác nhận tiền; WON tạo order một lần; hậu mãi không chạy khi có complaint; mọi thông tin thanh toán truy xuất từ cấu hình được bảo vệ.`,
  }),
  createDocument({
    id: "crm-auto-08-ai-guardrails", sequence: 8, title: "SF-AUTO-08 · AI Agent, human handoff và guardrails an toàn",
    category: "governance", status: "active", sourceSections: ["13", "14"], documentType: "ai-governance",
    owner: "AI Governance Lead & CRM Admin", audience: "Ban điều hành, CRM Admin, Kỹ thuật, Sale, CSKH, QA", reviewCycle: "Hàng tháng",
    implementationMode: "An toàn mặc định; hành động rủi ro phải phê duyệt", flow: aiFlow,
    summary: "Ranh giới quyền AI, chuẩn đầu ra, cơ chế chuyển người, stop conditions, consent, dedupe và kill switch.",
    tags: ["AI Agent", "human handoff", "guardrails", "consent", "dedupe", "security", "kill switch"],
    content: `# 1. Vai trò AI
AI được phép phân loại, tóm tắt, truy xuất tài liệu active, gợi ý next action, tạo nháp tin/email/báo giá và tạo task trong phạm vi quyền. AI không tự đổi giá, xác nhận thanh toán, ký hợp đồng, xóa dữ liệu, cam kết kỹ thuật/y tế, gửi nội dung nhạy cảm hoặc vượt quyền.

# 2. Đầu ra có cấu trúc
Mỗi quyết định cần intent, entities, evidence, confidence, missing_fields, recommended_action, required_approval, referenced_documents và human_handoff_reason. Nếu thiếu nguồn giá/chính sách/thông số, trả need_human_review thay vì suy đoán.

# 3. Human handoff
Chuyển người khi confidence thấp, dữ liệu xung đột, HOT/URGENT, khách khiếu nại, hỏi giá ngoại lệ, công nợ/độc quyền/hợp đồng, thanh toán, cấu hình kỹ thuật đặc biệt, yêu cầu pháp lý/y tế hoặc khách muốn gặp người. Handoff tạo task có owner, SLA, tóm tắt, bằng chứng, dữ liệu thiếu và action đang chờ; automation liên quan phải pause.

# 4. Global stop conditions
Hủy/skip outbound marketing khi do_not_contact, consent bị thu hồi, opportunity WON/LOST/INVALID, merge review, complaint/after-sales ưu tiên cao, human_takeover hoặc inbound chưa xử lý. Tin giao dịch đánh giá theo policy riêng, không mặc định coi là marketing.

# 5. Stop theo journey
No-answer dừng khi khách nghe/phản hồi/hẹn gọi. Retail nurture dừng khi quote/showroom/cọc. Quote follow-up dừng khi reply/revision/accepted/expired. Showroom reminder dừng khi cancel/reschedule/completed. B2B nurture dừng khi project/negotiation active. Cross-sell dừng khi có khiếu nại/bảo hành.

# 6. Chống trùng
Chuẩn hóa SĐT/email và merge source vào Contact. Mỗi action có unique idempotency key theo contact/opportunity + journey/version + step + entry cycle. Provider retry dùng cùng client reference; webhook lặp bỏ qua theo provider event id. Không tạo hai task mở cùng loại và khoảng hạn trừ khi quản lý chủ động.

# 7. Consent, tần suất và bảo mật
Consent theo channel + purpose, có bằng chứng và thời điểm. Recheck ngay trước gửi. Áp dụng quiet hours, frequency cap và suppression. RBAC/least privilege, mask dữ liệu, mã hóa secret, xác minh webhook signature, audit đọc/sửa dữ liệu nhạy cảm và retention theo chính sách.

# 8. Kill switch và cảnh báo
Có kill switch toàn outbound và theo journey/channel; feature flag theo phiên bản. Cảnh báo gửi sau inbound, duplicate, permission violation, template/price stale, queue backlog, DLQ và token hết hạn.

# 9. Tiêu chí nghiệm thu
AI không bịa dữ liệu; action không vượt quyền; consent thu hồi chặn job sát giờ; kill switch dừng queue chưa chạy; người không đủ quyền không xem/sửa dữ liệu nhạy cảm; QA lưu được sai khác AI và bản nhân viên duyệt.`,
  }),
  createDocument({
    id: "crm-auto-09-platform-delivery", sequence: 9, title: "SF-AUTO-09 · Kiến trúc sự kiện, API, Job Queue và triển khai an toàn",
    category: "automation", status: "active", sourceSections: ["15", "17"], documentType: "technical-specification",
    owner: "Tech Lead & DevOps", audience: "Lập trình viên, QA, DevOps, CRM Admin, AI Agent triển khai", reviewCycle: "Theo mỗi lần phát hành",
    implementationMode: "Chuẩn hóa → Shadow → Draft only → Limited auto → Mở rộng", flow: platformFlow,
    summary: "Hợp đồng kỹ thuật cho event/outbox, API, queue, webhook, retry, kiểm thử, rollout và rollback.",
    tags: ["event", "API", "outbox", "job queue", "webhook", "testing", "deployment", "rollback"],
    content: `# 1. Event contract
Sự kiện dùng event_id, event_type, version, occurred_at, actor, entity_type/id, correlation_id, causation_id và payload có schema. Nhóm sự kiện chính: lead/contact/opportunity, call/interaction, quote, appointment, payment/order, consent, workflow/action và channel provider.

# 2. Transactional outbox
Cập nhật nghiệp vụ và ghi outbox trong cùng transaction. Publisher phát sự kiện ít nhất một lần; consumer bắt buộc idempotent. Không phát event trực tiếp trước khi transaction DB commit. Lưu trạng thái publish, retry và lỗi.

# 3. API nguyên tắc
API có version, RBAC, validation, pagination, error code ổn định, request/correlation id và audit cho hành động nhạy cảm. Endpoint cần hỗ trợ contact/opportunity, interaction/disposition, task, journey/action, quote, appointment, consent và agent handoff. Mutation rủi ro có idempotency key.

# 4. Job Queue
Job lưu action id, scheduled_at, status, attempt, max_attempts, lock/lease, payload snapshot và last_error. Worker claim atomically; trước chạy recheck state, consent, stop conditions, feature flag, template/version và idempotency. Timeout không rõ kết quả phải đối soát provider trước retry. Lỗi vĩnh viễn vào DLQ; replay có quyền và audit.

# 5. Webhook và bảo mật
Xác minh chữ ký, timestamp/replay window, provider event id và allowlist nếu có. Secret trong secret manager. Webhook giả/sai chữ ký bị từ chối; payload lỗi được ghi an toàn, không làm lộ PII.

# 6. Lộ trình phát hành
Giai đoạn 1 chuẩn hóa schema, taxonomy, audit, event/outbox, dedupe/consent. Giai đoạn 2 shadow trên 50–100 lead thật. Giai đoạn 3 draft only và lưu khác biệt AI–nhân viên. Giai đoạn 4 limited auto cho xác nhận, tin nhỡ, nội dung duyệt, nhắc lịch và hậu mãi. Giai đoạn 5 mở rộng theo journey/kênh; thương lượng, ngoại lệ, thanh toán, hợp đồng và khiếu nại vẫn có người duyệt.

# 7. Test pyramid
Unit: transition, score, routing, stop/skip, variable, permission, idempotency. Integration: call→stage→journey; inbound→pause; quote→follow-up; reschedule→reminder mới; payment→WON→order; consent revoked→cancel. Contract: event/webhook/adapter/product-price/AI schema. E2E với sandbox/mock. Test tải cho burst lead, backlog, provider chậm, AI timeout, concurrency, event sai thứ tự, restart và DLQ.

# 8. Ma trận bắt buộc
Lead trùng đa nguồn; sofa thiếu size/có nệm sẵn; ergo gửi ảnh; HOT hỏi cọc; inbound sát giờ gửi; đổi lịch hai lần; email hard bounce; giá ngoài khung; độc quyền/công nợ; BOQ có deadline; quote revision; ảnh chuyển khoản chưa đối soát; complaint khi cross-sell; webhook lặp; retry không rõ kết quả; consent thu hồi; kill switch khi queue còn job.

# 9. Rollback và Definition of Done
Rollback ưu tiên chuyển draft_only, tắt feature flag, pause worker; giữ audit và dữ liệu, migration tương thích ngược. Hoàn thành khi đạt acceptance criteria, không mất dữ liệu, contract có test, không gửi ngoài scope, truy vết đủ, nhân viên dùng được trên PWA/CRM và quản lý theo dõi KPI/lỗi.`,
  }),
  createDocument({
    id: "crm-auto-10-kpi-template-manifest", sequence: 10, title: "SF-AUTO-10 · KPI, SLA, thư viện mẫu và manifest định tuyến AI",
    category: "governance", status: "active", sourceSections: ["16", "18", "19"], documentType: "operations-control-center",
    owner: "Sales Ops, Marketing Ops & AI Governance", audience: "Ban điều hành, Quản lý, Sale, Marketing, CSKH, CRM Admin, AI Agent", reviewCycle: "Hàng tháng",
    implementationMode: "Dashboard theo dữ liệu lịch sử; template có version và phê duyệt", flow: governanceFlow,
    summary: "Bộ đo lường vận hành, SLA/cảnh báo, mã mẫu nội dung và quy tắc để AI đọc đúng tài liệu.",
    tags: ["KPI", "SLA", "dashboard", "alerts", "templates", "AI manifest", "routing"],
    content: `# 1. Dashboard ưu tiên hành động
Hiển thị HOT/URGENT thiếu hoặc quá hạn task; inbound chưa trả lời; báo giá quá hạn; showroom hôm nay/chưa cập nhật; chờ cọc; B2B có deadline; complaint/warranty mở. Bộ lọc: nhân viên/nhóm, segment, sản phẩm, khu vực, nguồn/campaign/ad/keyword, stage/temperature/tag và khoảng ngày.

# 2. SLA mặc định có thể cấu hình
Lead mới gọi trong 5–15 phút; HOT inbound nhận theo ca trực; callback đúng giờ và cảnh báo sau 15 phút; báo giá bán lẻ trong ngày làm việc; B2B/dự án theo deadline đã xác nhận; showroom cập nhật trong ngày; HOT chờ cọc có next action trong 24 giờ; khiếu nại theo mức độ case.

# 3. KPI
Funnel bán lẻ: lead → hợp lệ → gọi được → QUALIFIED → đủ nhu cầu/size → HOT → quote → showroom → đến showroom → cọc → WON, doanh thu và thời gian lead→cọc. B2B: qualification, đúng vai trò, HOT, pipeline value, meeting, mẫu thử, quote, hợp đồng, nhập lại và doanh thu theo nhóm. Nguồn ads: CPL thô/hợp lệ/gọi được/QUALIFIED/HOT/hẹn/quote/cọc, doanh thu và ROAS. Workflow: enrollment, gửi thành công, phản hồi, click, handoff, skip reason, opt-out, provider error, duplicate và response time. Nhân viên: SLA, disposition, task, conversion, doanh thu, QA và hồ sơ thiếu dữ liệu.

# 4. Cảnh báo & báo cáo
Sale nhận lead mới, callback, inbound, HOT handoff, showroom và cọc. Quản lý nhận HOT/deadline quá SLA, lỗi kênh, opt-out tăng và task quá hạn. Hệ thống nhận queue/DLQ/webhook/token/template/product-price alert. Có cooldown/acknowledge để không gửi lặp. Digest đầu ngày cho sale, cuối ngày cho quản lý, tuần cho funnel/nguồn/workflow, tháng cho doanh thu/CAC/B2B/mua lại.

# 5. Biến template dùng chung
{{customer_name}}, {{product_name}}, {{size_requirement}}, {{recommended_models_summary}}, {{approved_price_summary}}, {{catalog_url}}, {{video_url}}, {{showroom_name}}, {{showroom_address}}, {{appointment_time}}, {{sale_name}}, {{sale_phone}}, {{quote_number}}, {{order_number}}, {{callback_time}}, {{email_masked}}, {{organization_name}}, {{project_name}}, {{response_deadline}}, {{order_summary}}, {{approved_payment_summary}}.

# 6. Danh mục mẫu chuẩn
- Cuộc gọi: TPL_NO_ANSWER_ZALO_01, TPL_CALLBACK_CONFIRM_01.
- Sofa: TPL_SOFA_AFTER_CALL_01, TPL_SOFA_NEED_SIZE_01, TPL_SOFA_EXISTING_MATTRESS_01, TPL_SOFA_SHOWROOM_CTA_01.
- Giường công thái học: TPL_ERGO_AFTER_CALL_01, TPL_ERGO_INSTALL_CHOICE_01, TPL_ERGO_PHOTO_REQUEST_01, TPL_ERGO_MATTRESS_GUIDE_01.
- B2B: TPL_B2B_WELCOME_ZALO_01, TPL_B2B_CATALOG_EMAIL_01, TPL_PROJECT_DOCUMENT_RECEIVED_01.
- Báo giá/showroom: TPL_QUOTE_SENT_ZALO_01, TPL_QUOTE_FOLLOWUP_01, TPL_SHOWROOM_CONFIRM_01, TPL_SHOWROOM_REMINDER_02H_01, TPL_SHOWROOM_NO_SHOW_01.
- Cọc/đơn/hậu mãi: TPL_DEPOSIT_SUMMARY_01, TPL_PAYMENT_PROOF_RECEIVED_01, TPL_ORDER_CONFIRMED_01, TPL_POST_DELIVERY_DAY1_01, TPL_REVIEW_REQUEST_01, TPL_OPT_OUT_CONFIRM_01.

Mỗi mẫu có mã, version, owner, kênh, cấp tự động, biến bắt buộc, fallback, trạng thái và bản snapshot đã gửi. Một tin chỉ một CTA; không hard-code giá/chính sách; không claim y tế; test tiếng Việt, link/file và thiết bị; nghiệp vụ duyệt trước phát hành.

# 7. Manifest định tuyến 10 tài liệu
AI luôn đọc SF-AUTO-01 để hiểu dữ liệu và SF-AUTO-08 để áp guardrails. Khi xây workflow, đọc thêm SF-AUTO-03, SF-AUTO-09 và tài liệu journey tương ứng. Khi tạo nội dung hoặc gửi kênh, đọc SF-AUTO-03 và SF-AUTO-10. Sofa đọc SF-AUTO-04; ergonomic đọc SF-AUTO-05; B2B đọc SF-AUTO-06; quote/showroom/cọc/order/hậu mãi đọc SF-AUTO-07.

Danh mục định tuyến đầy đủ: SF-AUTO-01 dữ liệu/taxonomy; SF-AUTO-02 tiếp nhận lead/cuộc gọi; SF-AUTO-03 engine/kênh; SF-AUTO-04 Sofa Giường; SF-AUTO-05 Giường Công Thái Học; SF-AUTO-06 B2B; SF-AUTO-07 báo giá đến hậu mãi; SF-AUTO-08 AI/guardrails; SF-AUTO-09 nền tảng/triển khai; SF-AUTO-10 KPI/template/manifest.

Nếu yêu cầu chạm nhiều module, AI phải hợp nhất quy tắc nhưng ưu tiên guardrails, consent, quyền và tài liệu có version mới hơn. Mọi câu trả lời/hành động lưu referenced_documents.

# 8. Tiêu chí nghiệm thu
Dashboard drill-down đến Contact/Opportunity và tính stage từ history; attribution nối source/campaign đến WON; báo cáo tách bán lẻ và ba nhóm B2B; chỉ đúng quyền xem tài chính/PII; cảnh báo có cooldown; template không gửi khi thiếu biến; AI nêu đúng tài liệu đã tham chiếu.`,
  }),
];

export const CRM_AUTOMATION_SOURCE_SECTIONS = Array.from({ length: 19 }, (_, index) => String(index + 1).padStart(2, "0"));
