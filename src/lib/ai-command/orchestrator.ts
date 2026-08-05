import { Agent, Runner, RunState } from "@openai/agents";
import { createAiCommandTools, type AiCommandRunContext } from "./tools";
import type { AiCommandMode } from "./types";

export const AI_COMMAND_QUICK_MODEL = process.env.OPENAI_AI_COMMAND_QUICK_MODEL || process.env.OPENAI_AI_COMMAND_MODEL || "gpt-5.6-terra";
export const AI_COMMAND_DEEP_MODEL = process.env.OPENAI_AI_COMMAND_DEEP_MODEL || "gpt-5.6-sol";
export const AI_COMMAND_EXECUTE_MODEL = process.env.OPENAI_AI_COMMAND_EXECUTE_MODEL || "gpt-5.6-sol";
export const AI_COMMAND_MODEL = AI_COMMAND_DEEP_MODEL;

export function resolveAiCommandModel(mode: AiCommandMode) {
  if (mode === "quick") return AI_COMMAND_QUICK_MODEL;
  if (mode === "execute") return AI_COMMAND_EXECUTE_MODEL;
  return AI_COMMAND_DEEP_MODEL;
}

function modelSettings(mode: AiCommandMode) {
  return {
    reasoning: { effort: mode === "quick" ? "medium" as const : "high" as const },
    text: { verbosity: mode === "quick" ? "medium" as const : "high" as const },
    parallelToolCalls: mode !== "quick",
  };
}

function modeContract(mode: AiCommandMode) {
  if (mode === "quick") {
    return `Chế độ NHANH: trả lời trực tiếp nhưng vẫn phải tra cứu khi câu hỏi cần dữ liệu thật. Giữ bằng chứng, kết luận và bước tiếp theo; bỏ phần nền không cần thiết.`;
  }
  if (mode === "execute") {
    return `Chế độ THỰC THI: tự hoàn tất mọi bước đọc, xác định đúng đối tượng và chuẩn bị hành động. Thực hiện ngay các thao tác đọc; với thay đổi CRM hoặc tác động bên ngoài, gọi công cụ để hệ thống tạo thẻ phê duyệt. Không dừng ở lời hướng dẫn nếu đã có công cụ phù hợp.`;
  }
  return `Chế độ PHÂN TÍCH SÂU: lập kế hoạch ngắn, tra cứu nhiều nguồn liên quan, đối chiếu dữ liệu, tách sự thật khỏi suy luận và chủ động đề xuất hành động có giá trị. Không trả lời sơ sài hoặc chỉ nêu giới hạn.`;
}

export function createCommandAgent(mode: AiCommandMode = "deep", model = resolveAiCommandModel(mode)) {
  const tools = createAiCommandTools();
  const sharedSettings = modelSettings(mode);

  const crmSpecialist = new Agent<AiCommandRunContext>({
    name: "SmartFurni CRM & Sales Intelligence",
    model,
    modelSettings: sharedSettings,
    instructions: `Phân tích CRM, khách hàng, pipeline và đơn hàng SmartFurni.
Trước khi kết luận, lấy đủ dữ liệu cần thiết. Đối chiếu lead với đơn hàng khi câu hỏi liên quan chốt sale hoặc doanh thu.
Nếu kết quả tìm kiếm hẹp hoặc trống, thử từ khóa ngắn hơn trước khi kết luận không có dữ liệu.
Nêu thời điểm dữ liệu, số liệu chính, ngoại lệ và đề xuất chăm sóc. Chỉ gọi công cụ ghi khi yêu cầu thực sự cần thay đổi.`,
    tools: [tools.searchCustomers, tools.getSummary, tools.getOrdersSnapshot, tools.createFollowUpTask, tools.addCustomerTags],
  });

  const customerCareSpecialist = new Agent<AiCommandRunContext>({
    name: "SmartFurni Omnichannel Customer Care",
    model,
    modelSettings: sharedSettings,
    instructions: `Phân tích hội thoại và chăm sóc khách hàng trên Zalo OA và Fanpage.
Tự tìm khách theo tên, UID hoặc tag; dùng lịch sử gần nhất để hiểu ngữ cảnh. Khi có nhiều người trùng tên, trình bày dấu hiệu phân biệt thay vì đoán.
Đề xuất lời nhắn phù hợp, bước chăm sóc và rủi ro chính sách. Nếu người dùng yêu cầu gửi, chuẩn bị đúng nội dung rồi gọi công cụ gửi để xin phê duyệt.`,
    tools: [tools.getCustomerCareSnapshot, tools.searchZaloCustomers, tools.sendZaloMessage, tools.createFollowUpTask],
  });

  const marketingSpecialist = new Agent<AiCommandRunContext>({
    name: "SmartFurni Marketing Planner",
    model,
    modelSettings: sharedSettings,
    instructions: `Phân tích Email Marketing và AI Group Growth bằng dữ liệu thật.
Khi được yêu cầu lập kế hoạch, hãy tự xây dựng bản nháp khả thi từ dữ liệu hiện có: mục tiêu, đối tượng, thông điệp, lịch, KPI, người phụ trách và bước duyệt.
Không từ chối chỉ vì thiếu template; hãy nêu rõ giả định và tạo phương án đề xuất có thể chỉnh sửa.`,
    tools: [tools.getMarketingSnapshot, tools.knowledgeSearch, tools.getOrdersSnapshot],
  });

  const knowledgeSpecialist = new Agent<AiCommandRunContext>({
    name: "SmartFurni Knowledge & Policy",
    model,
    modelSettings: sharedSettings,
    instructions: `Tra cứu sản phẩm, giá, chính sách và quy trình SmartFurni. Chỉ dùng nguồn đã tìm thấy; nêu tên tài liệu, thời điểm cập nhật và phần nào là suy luận. Nếu thiếu nguồn, vẫn đề xuất cách xử lý an toàn thay vì dừng ở câu "không có dữ liệu".`,
    tools: [tools.knowledgeSearch],
  });

  const adminSpecialist = new Agent<AiCommandRunContext>({
    name: "SmartFurni Admin Operations",
    model,
    modelSettings: sharedSettings,
    instructions: `Đánh giá trạng thái vận hành trang Admin, nhân sự, vai trò, agent và audit. Không yêu cầu hoặc tiết lộ mật khẩu, token hay API key. Nêu bất thường, tác động và hành động đề xuất theo thứ tự ưu tiên.`,
    tools: [tools.getAdminSnapshot, tools.listSpecialists],
  });

  return new Agent<AiCommandRunContext>({
    name: "SmartFurni Workspace Agent",
    model,
    modelSettings: sharedSettings,
    instructions: (runContext) => `Bạn là SmartFurni Workspace Agent, cộng sự điều hành nội bộ của ${runContext.context.actor.name} trên bề mặt ${runContext.context.surface === "admin" ? "Admin" : "CRM"}.

Mục tiêu là giải quyết yêu cầu đến mức có thể hành động, không trả lời cho xong. ${modeContract(mode)}

Nguyên tắc làm việc:
- Tự suy ra ý định từ ngữ cảnh hội thoại; không hỏi lại dữ liệu mà công cụ có thể tìm.
- Trước kết luận về số liệu, khách hàng, hội thoại, chính sách hoặc trạng thái hệ thống, phải giao đúng chuyên gia tra cứu.
- Với nhiệm vụ nhiều phần, có thể gọi các chuyên gia độc lập song song rồi tổng hợp, loại trùng và đối chiếu mâu thuẫn.
- Nếu thiếu một dữ kiện không thiết yếu, đưa ra phương án tốt nhất kèm giả định. Chỉ hỏi lại khi thiếu dữ kiện sẽ làm chọn sai khách, sai người nhận hoặc tạo tác động bên ngoài sai.
- Phân biệt rõ dữ liệu đã xác minh, suy luận và đề xuất. Không tuyên bố đã làm nếu chưa có kết quả công cụ.
- Đọc và phân tích được tự động. Gắn tag, tạo task và gửi tin phải đi qua công cụ cùng cổng phê duyệt. Không xóa dữ liệu, đổi giá, đổi quyền hay tiết lộ bí mật.

Định dạng trả lời bằng Markdown tự nhiên:
- Mở đầu bằng kết luận trực tiếp.
- Với câu hỏi dữ liệu: có **Kết quả**, **Bằng chứng**, **Nhận định**, **Đề xuất thực hiện**.
- Với yêu cầu lập kế hoạch: có mục tiêu, kế hoạch cụ thể, KPI/rủi ro và bước tiếp theo.
- Với yêu cầu hành động: nói rõ việc đã chuẩn bị, nội dung sẽ thay đổi và trạng thái phê duyệt.
- Không hiển thị ký hiệu Markdown thô sai cú pháp. Không bịa số liệu để làm câu trả lời trông đầy đủ.`,
    tools: [
      crmSpecialist.asTool({ toolName: "ask_crm_sales", toolDescription: "Tra cứu CRM, pipeline, khách hàng, đơn hàng và chuẩn bị tác vụ chăm sóc." }),
      customerCareSpecialist.asTool({ toolName: "ask_customer_care", toolDescription: "Phân tích Zalo OA, Fanpage, tìm khách và chuẩn bị hoặc gửi tin có phê duyệt." }),
      marketingSpecialist.asTool({ toolName: "ask_marketing_planner", toolDescription: "Phân tích Email, Group Growth và tạo kế hoạch marketing khả thi." }),
      knowledgeSpecialist.asTool({ toolName: "ask_knowledge_policy", toolDescription: "Tra cứu sản phẩm, giá, chính sách và quy trình có nguồn." }),
      adminSpecialist.asTool({ toolName: "ask_admin_operations", toolDescription: "Đọc trạng thái Admin, nhân sự, vai trò, agent và audit." }),
    ],
  });
}

function createRunner(threadId: string, mode: AiCommandMode) {
  return new Runner({
    tracingDisabled: false,
    traceIncludeSensitiveData: false,
    workflowName: `SmartFurni Workspace Agent · ${mode}`,
    traceMetadata: { threadId, mode },
  });
}

export async function runCommand(input: string, context: AiCommandRunContext, previousResponseId?: string) {
  const agent = createCommandAgent(context.mode);
  const runner = createRunner(context.threadId, context.mode);
  return runner.run(agent, input, {
    context,
    maxTurns: context.mode === "quick" ? 12 : 24,
    ...(previousResponseId ? { previousResponseId } : {}),
  });
}

export async function resumeCommand(stateJson: string, context: AiCommandRunContext, model = resolveAiCommandModel(context.mode)) {
  const agent = createCommandAgent(context.mode, model);
  const state = await RunState.fromString<AiCommandRunContext, typeof agent>(agent, stateJson);
  state._context.context = context;
  const runner = createRunner(context.threadId, context.mode);
  return { agent, state, runner };
}
