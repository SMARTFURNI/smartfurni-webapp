import { tool } from "@openai/agents";
import { z } from "zod";
import { logAudit } from "@/lib/audit-helper";
import { getLead, getLeads, getCrmStats, createTask, updateLead } from "@/lib/crm-store";
import { listAgents, searchKnowledge } from "@/lib/business-brain-store";
import { assertActorAnyPermission, assertActorPermission, getCurrentPermissions, AiCommandAccessError } from "./access";
import { finishToolCall, startToolCall } from "./store";
import type { AiCommandActor, AiRiskLevel } from "./types";

export interface AiCommandRunContext {
  actor: AiCommandActor;
  threadId: string;
  runId: string;
}

const TOOL_META = {
  create_follow_up_task: {
    title: "Tạo việc chăm sóc khách hàng",
    description: "Tạo một công việc mới trong CRM và giao cho người dùng hiện tại.",
    riskLevel: "reversible" as AiRiskLevel,
  },
  add_customer_tags: {
    title: "Gắn tag cho khách hàng",
    description: "Cập nhật danh sách tag trên hồ sơ khách hàng trong CRM.",
    riskLevel: "reversible" as AiRiskLevel,
  },
};

export function getApprovalPresentation(toolName: string) {
  return TOOL_META[toolName as keyof typeof TOOL_META] || {
    title: "Phê duyệt tác vụ AI",
    description: `Cho phép AI thực thi công cụ ${toolName}.`,
    riskLevel: "sensitive" as AiRiskLevel,
  };
}

function maskPhone(phone: string) {
  const clean = String(phone || "").trim();
  if (clean.length < 7) return clean;
  return `${clean.slice(0, 4)}***${clean.slice(-3)}`;
}

async function assertLeadScope(actor: AiCommandActor, leadId: string) {
  const lead = await getLead(leadId);
  if (!lead) throw new AiCommandAccessError("Không tìm thấy khách hàng.", 404);
  if (actor.kind === "staff") {
    const permissions = await getCurrentPermissions(actor);
    if (!permissions?.leads_view_all && lead.assignedTo && lead.assignedTo !== actor.name) {
      throw new AiCommandAccessError("Khách hàng này không thuộc phạm vi bạn được phép xử lý.");
    }
  }
  return lead;
}

async function executeLogged<T extends Record<string, unknown>>(params: {
  context: AiCommandRunContext;
  toolName: string;
  riskLevel: AiRiskLevel;
  arguments: Record<string, unknown>;
  execute: () => Promise<T>;
}) {
  const call = await startToolCall({
    runId: params.context.runId,
    threadId: params.context.threadId,
    toolName: params.toolName,
    riskLevel: params.riskLevel,
    arguments: params.arguments,
  });
  try {
    const result = await params.execute();
    await finishToolCall(call.id, call.startedAt, result);
    return JSON.stringify(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Công cụ không thực hiện được.";
    await finishToolCall(call.id, call.startedAt, {}, message);
    throw error;
  }
}

export function createAiCommandTools() {
  const searchCustomers = tool({
    name: "search_customers",
    description: "Tìm khách hàng CRM theo tên, công ty hoặc số điện thoại. Kết quả đã giới hạn theo quyền người dùng.",
    parameters: z.object({ query: z.string().trim().min(2).max(120), limit: z.number().int().min(1).max(10).default(5) }),
    async execute(input, runContext) {
      const context = runContext!.context as AiCommandRunContext;
      return executeLogged({ context, toolName: "search_customers", riskLevel: "read", arguments: input, execute: async () => {
        await assertActorAnyPermission(context.actor, ["leads_view_all", "leads_view_own"]);
        const permissions = await getCurrentPermissions(context.actor);
        const leads = await getLeads({
          search: input.query,
          ...(context.actor.kind === "staff" && !permissions?.leads_view_all ? { assignedTo: context.actor.name } : {}),
        });
        return {
          count: Math.min(leads.length, input.limit),
          customers: leads.slice(0, input.limit).map(lead => ({
            id: lead.id, name: lead.name, company: lead.company, phoneMasked: maskPhone(lead.phone),
            stage: lead.stage, assignedTo: lead.assignedTo, tags: lead.tags, expectedValue: lead.expectedValue,
            updatedAt: lead.updatedAt,
          })),
        };
      }});
    },
  });

  const getSummary = tool({
    name: "get_crm_summary",
    description: "Lấy số liệu tổng quan pipeline CRM theo đúng phạm vi dữ liệu của người dùng.",
    parameters: z.object({}),
    async execute(input, runContext) {
      const context = runContext!.context as AiCommandRunContext;
      return executeLogged({ context, toolName: "get_crm_summary", riskLevel: "read", arguments: input, execute: async () => {
        await assertActorPermission(context.actor, "dashboard_view");
        const permissions = await getCurrentPermissions(context.actor);
        const stats = await getCrmStats(
          context.actor.kind === "staff" && !permissions?.leads_view_all ? { assignedTo: context.actor.name } : undefined,
        );
        return {
          totalLeads: stats.totalLeads, byStage: stats.byStage, totalExpectedValue: stats.totalExpectedValue,
          wonValue: stats.wonValue, conversionRate: stats.conversionRate, overdueLeads: stats.overdueLeads,
          todayTasks: stats.todayTasks, newLeadsThisMonth: stats.newLeadsThisMonth,
        };
      }});
    },
  });

  const knowledgeSearch = tool({
    name: "search_business_knowledge",
    description: "Tra cứu Knowledge Base SmartFurni. Chỉ trả thông tin có nguồn, không tự suy đoán chính sách hoặc giá.",
    parameters: z.object({ query: z.string().trim().min(2).max(300), limit: z.number().int().min(1).max(5).default(3) }),
    async execute(input, runContext) {
      const context = runContext!.context as AiCommandRunContext;
      return executeLogged({ context, toolName: "search_business_knowledge", riskLevel: "read", arguments: input, execute: async () => {
        await assertActorPermission(context.actor, "ai_command_view");
        const documents = await searchKnowledge(input.query, input.limit);
        return {
          count: documents.length,
          documents: documents.map(doc => ({
            id: doc.id, title: doc.title, category: doc.category, source: doc.source,
            summary: doc.summary, excerpt: doc.content.slice(0, 1200), updatedAt: doc.updatedAt,
          })),
        };
      }});
    },
  });

  const listSpecialists = tool({
    name: "list_specialist_agents",
    description: "Liệt kê các AI agent chuyên trách đang được cấu hình trong Business Brain.",
    parameters: z.object({}),
    async execute(input, runContext) {
      const context = runContext!.context as AiCommandRunContext;
      return executeLogged({ context, toolName: "list_specialist_agents", riskLevel: "read", arguments: input, execute: async () => {
        await assertActorPermission(context.actor, "ai_command_view");
        const agents = await listAgents();
        return { agents: agents.map(agent => ({ id: agent.id, name: agent.name, role: agent.role, status: agent.status, allowedActions: agent.allowedActions })) };
      }});
    },
  });

  const createFollowUpTask = tool({
    name: "create_follow_up_task",
    description: "Tạo task chăm sóc cho một khách hàng CRM. Đây là thay đổi dữ liệu và luôn cần người dùng phê duyệt.",
    parameters: z.object({
      leadId: z.string().uuid(), title: z.string().trim().min(3).max(180),
      dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), priority: z.enum(["high", "medium", "low"]).default("medium"),
    }),
    needsApproval: true,
    async execute(input, runContext) {
      const context = runContext!.context as AiCommandRunContext;
      return executeLogged({ context, toolName: "create_follow_up_task", riskLevel: "reversible", arguments: input, execute: async () => {
        await assertActorPermission(context.actor, "ai_command_execute");
        await assertActorPermission(context.actor, "tasks_create");
        const lead = await assertLeadScope(context.actor, input.leadId);
        const task = await createTask({
          leadId: lead.id, leadName: lead.name, title: input.title, dueDate: input.dueDate,
          priority: input.priority, done: false, assignedTo: context.actor.name,
        });
        await logAudit({
          action: "ai.tool_executed", entityType: "task", entityId: task.id, entityName: task.title,
          actorId: context.actor.id, actorName: context.actor.name,
          metadata: { runId: context.runId, threadId: context.threadId, tool: "create_follow_up_task", leadId: lead.id },
        });
        return { task: { id: task.id, title: task.title, dueDate: task.dueDate, priority: task.priority, leadId: task.leadId } };
      }});
    },
  });

  const addCustomerTags = tool({
    name: "add_customer_tags",
    description: "Gắn thêm tag cho khách hàng CRM, không xóa tag cũ. Đây là thay đổi dữ liệu và luôn cần phê duyệt.",
    parameters: z.object({
      leadId: z.string().uuid(),
      tags: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
    }),
    needsApproval: true,
    async execute(input, runContext) {
      const context = runContext!.context as AiCommandRunContext;
      return executeLogged({ context, toolName: "add_customer_tags", riskLevel: "reversible", arguments: input, execute: async () => {
        await assertActorPermission(context.actor, "ai_command_execute");
        await assertActorPermission(context.actor, "leads_edit");
        const lead = await assertLeadScope(context.actor, input.leadId);
        const before = lead.tags || [];
        const tags = Array.from(new Set([...before, ...input.tags.map(tag => tag.replace(/[^\p{L}\p{N}_ -]/gu, "").trim()).filter(Boolean)]));
        const updated = await updateLead(lead.id, { tags });
        await logAudit({
          action: "ai.tool_executed", entityType: "lead", entityId: lead.id, entityName: lead.name,
          actorId: context.actor.id, actorName: context.actor.name,
          changes: { tags: { before, after: tags } },
          metadata: { runId: context.runId, threadId: context.threadId, tool: "add_customer_tags" },
        });
        return { customer: { id: updated?.id, name: updated?.name, tags: updated?.tags || tags } };
      }});
    },
  });

  return { searchCustomers, getSummary, knowledgeSearch, listSpecialists, createFollowUpTask, addCustomerTags };
}
