import { Agent, Runner, RunState } from "@openai/agents";
import { createAiCommandTools, type AiCommandRunContext } from "./tools";

export const AI_COMMAND_MODEL = process.env.OPENAI_AI_COMMAND_MODEL || "gpt-5.6-terra";

export function createCommandAgent() {
  const tools = createAiCommandTools();
  const sharedSettings = {
    reasoning: { effort: "medium" as const },
    text: { verbosity: "low" as const },
    parallelToolCalls: false,
  };

  const crmSpecialist = new Agent<AiCommandRunContext>({
    name: "SmartFurni CRM Specialist",
    model: AI_COMMAND_MODEL,
    modelSettings: sharedSettings,
    instructions: `Bạn là chuyên gia CRM nội bộ SmartFurni.
Chỉ dùng dữ liệu từ công cụ. Tôn trọng phạm vi khách hàng của người dùng.
Nếu được yêu cầu thay đổi dữ liệu, gọi đúng công cụ; hệ thống sẽ tự dừng để xin phê duyệt.
Không được gửi tin, xóa dữ liệu, đổi giá, đổi quyền hoặc tuyên bố đã làm nếu chưa có kết quả công cụ.`,
    tools: [tools.searchCustomers, tools.getSummary, tools.createFollowUpTask, tools.addCustomerTags],
  });

  const knowledgeSpecialist = new Agent<AiCommandRunContext>({
    name: "SmartFurni Knowledge Specialist",
    model: AI_COMMAND_MODEL,
    modelSettings: sharedSettings,
    instructions: `Bạn trả lời câu hỏi nội bộ dựa trên Knowledge Base SmartFurni.
Luôn tra cứu trước khi trả lời câu hỏi về sản phẩm, giá, chính sách hoặc quy trình.
Nêu tên tài liệu hoặc ID nguồn đã dùng. Thiếu nguồn thì nói rõ cần bổ sung tri thức, không đoán.`,
    tools: [tools.knowledgeSearch],
  });

  const systemSpecialist = new Agent<AiCommandRunContext>({
    name: "SmartFurni Agent Registry Specialist",
    model: AI_COMMAND_MODEL,
    modelSettings: sharedSettings,
    instructions: "Bạn giải thích trạng thái và phạm vi các AI agent đang cấu hình. Chỉ dùng kết quả từ công cụ registry.",
    tools: [tools.listSpecialists],
  });

  return new Agent<AiCommandRunContext>({
    name: "Trợ lý Điều hành AI SmartFurni",
    model: AI_COMMAND_MODEL,
    modelSettings: sharedSettings,
    instructions: (runContext) => `Bạn là đầu mối điều hành AI nội bộ SmartFurni cho ${runContext.context.actor.name}.
Mục tiêu: hiểu yêu cầu, giao đúng chuyên gia, tổng hợp câu trả lời ngắn gọn bằng tiếng Việt và cho biết việc nào đã thực hiện.
Bạn không có quyền tự bịa dữ liệu hoặc thực hiện thao tác ngoài tool.
Mọi thay đổi CRM phải đi qua chuyên gia CRM và cổng phê duyệt. Không gửi tin, đăng bài, chạy quảng cáo, xóa dữ liệu, đổi giá hoặc quyền.
Khi câu hỏi có thể trả lời bằng dữ liệu thật, phải gọi chuyên gia trước. Khi thiếu thông tin định danh khách hàng, hãy hỏi lại một câu ngắn.
Phân biệt rõ: kết quả đã đọc, bản nháp đề xuất, tác vụ đang chờ duyệt và tác vụ đã hoàn tất.`,
    tools: [
      crmSpecialist.asTool({ toolName: "ask_crm_specialist", toolDescription: "Tra cứu và xử lý tác vụ CRM, khách hàng, pipeline, tag và follow-up." }),
      knowledgeSpecialist.asTool({ toolName: "ask_knowledge_specialist", toolDescription: "Tra cứu tri thức sản phẩm, giá, chính sách và quy trình SmartFurni." }),
      systemSpecialist.asTool({ toolName: "ask_agent_registry", toolDescription: "Kiểm tra danh sách và trạng thái các AI agent chuyên trách." }),
    ],
  });
}

function createRunner(threadId: string) {
  return new Runner({
    tracingDisabled: false,
    traceIncludeSensitiveData: false,
    workflowName: "SmartFurni AI Command Center",
    traceMetadata: { threadId },
  });
}

export async function runCommand(input: string, context: AiCommandRunContext) {
  const agent = createCommandAgent();
  const runner = createRunner(context.threadId);
  return runner.run(agent, input, { context, maxTurns: 10 });
}

export async function resumeCommand(stateJson: string, context: AiCommandRunContext) {
  const agent = createCommandAgent();
  const state = await RunState.fromString<AiCommandRunContext, typeof agent>(agent, stateJson);
  state._context.context = context;
  const runner = createRunner(context.threadId);
  return { agent, state, runner };
}
