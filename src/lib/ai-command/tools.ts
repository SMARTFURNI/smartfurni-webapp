import { tool } from "@openai/agents";
import { z } from "zod";
import { logAudit } from "@/lib/audit-helper";
import { getLead, getLeads, getCrmStats, createTask, updateLead } from "@/lib/crm-store";
import { listAgents, searchKnowledge } from "@/lib/business-brain-store";
import { assertActorAnyPermission, assertActorPermission, getCurrentPermissions, AiCommandAccessError } from "./access";
import { finishToolCall, startToolCall } from "./store";
import type { AiCommandActor, AiCommandMode, AiCommandSurface, AiRiskLevel } from "./types";

export interface AiCommandRunContext {
  actor: AiCommandActor;
  threadId: string;
  runId: string;
  mode: AiCommandMode;
  surface: AiCommandSurface;
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
  send_zalo_consultation: {
    title: "Gửi tin chăm sóc qua Zalo OA",
    description: "Gửi nội dung đã soạn tới một người dùng Zalo OA trong cửa sổ tư vấn hợp lệ.",
    riskLevel: "external" as AiRiskLevel,
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

  const getOrdersSnapshot = tool({
    name: "get_orders_snapshot",
    description: "Đọc số liệu đơn hàng và doanh thu SmartFurni. Dùng khi câu hỏi liên quan đơn chốt, doanh thu, sản phẩm bán chạy hoặc trạng thái giao hàng.",
    parameters: z.object({ days: z.number().int().min(1).max(90).default(7) }),
    async execute(input, runContext) {
      const context = runContext!.context as AiCommandRunContext;
      return executeLogged({ context, toolName: "get_orders_snapshot", riskLevel: "read", arguments: input, execute: async () => {
        await assertActorAnyPermission(context.actor, ["dashboard_view", "reports_view"]);
        const permissions = await getCurrentPermissions(context.actor);
        const canReadOrderDetails = context.actor.kind === "admin" || permissions?.reports_view === true;
        const { getAllOrders, getOrderDashboardStats, refreshOrdersFromDatabase } = await import("@/lib/order-store");
        await refreshOrdersFromDatabase();
        const dashboard = getOrderDashboardStats();
        const since = Date.now() - input.days * 86_400_000;
        const orders = getAllOrders().filter(order => new Date(order.createdAt).getTime() >= since);
        return {
          periodDays: input.days,
          generatedAt: new Date().toISOString(),
          stats: dashboard.stats,
          ordersByStatus: dashboard.ordersByStatus,
          topProducts: dashboard.topProducts.slice(0, 8),
          recentOrders: canReadOrderDetails ? orders.slice(0, 30).map(order => ({
            id: order.id, orderNumber: order.orderNumber, customerName: order.customerName,
            status: order.status, paymentStatus: order.paymentStatus, total: order.total,
            products: order.items.map(item => `${item.productName} ×${item.quantity}`), createdAt: order.createdAt,
          })) : [],
          detailScope: canReadOrderDetails ? "full" : "aggregate_only",
        };
      }});
    },
  });

  const getCustomerCareSnapshot = tool({
    name: "get_customer_care_snapshot",
    description: "Đọc toàn cảnh chăm sóc khách hàng từ Zalo OA và ba Fanpage, gồm hội thoại, tin chưa đọc, lead nóng và kế hoạch đang chờ.",
    parameters: z.object({ includeHotLeads: z.boolean().default(true) }),
    async execute(input, runContext) {
      const context = runContext!.context as AiCommandRunContext;
      return executeLogged({ context, toolName: "get_customer_care_snapshot", riskLevel: "read", arguments: input, execute: async () => {
        await assertActorAnyPermission(context.actor, ["zalo_oa_view", "zalo_inbox_view", "ai_agent_view"]);
        const permissions = await getCurrentPermissions(context.actor);
        const canReadZalo = context.actor.kind === "admin" || permissions?.zalo_oa_view === true || permissions?.zalo_inbox_view === true;
        const canReadFanpage = context.actor.kind === "admin" || permissions?.ai_agent_view === true;
        const [{ getZaloDashboard }, { getFanpageCareOverview, listFanpageCarePlans }] = await Promise.all([
          import("@/lib/zalo-oa-store"), import("@/lib/fanpage-care-center"),
        ]);
        const [zalo, fanpage, plans] = await Promise.all([
          canReadZalo ? getZaloDashboard() : Promise.resolve(null),
          canReadFanpage ? getFanpageCareOverview() : Promise.resolve(null),
          canReadFanpage && input.includeHotLeads ? listFanpageCarePlans({ limit: 30 }) : Promise.resolve([]),
        ]);
        return {
          generatedAt: new Date().toISOString(),
          zalo: zalo ? {
            active: zalo.config.isActive, stats: zalo.stats,
            approvedTemplates: zalo.templates.filter(item => item.approvalStatus === "ENABLE").length,
            campaigns: zalo.campaigns.slice(0, 10).map(item => ({ name: item.name, status: item.status, sent: item.sentCount, failed: item.failedCount })),
            latestConversations: zalo.conversations.slice(0, 20).map(item => ({
              userId: item.userId, displayName: item.displayName, unreadCount: item.unreadCount,
              lastMessage: item.lastMessagePreview, lastInteraction: item.lastUserInteraction,
              tags: item.tags, canConsult: item.lastUserInteraction ? Date.now() - new Date(item.lastUserInteraction).getTime() <= 7 * 86_400_000 : false,
            })),
          } : null,
          fanpage,
          hotFanpageLeads: plans
            .filter(item => item.leadTemperature === "hot" || item.leadTemperature === "warm")
            .slice(0, 15)
            .map(item => ({ id: item.id, customerName: item.customerName, pageName: item.pageName, leadScore: item.leadScore,
              temperature: item.leadTemperature, need: item.customerNeed, summary: item.summary, status: item.status, dueAt: item.dueAt })),
        };
      }});
    },
  });

  const searchZaloCustomers = tool({
    name: "search_zalo_customers",
    description: "Tìm đúng người dùng Zalo OA theo tên, Zalo UID hoặc tag và trả lịch sử tin nhắn gần nhất để tránh hỏi lại thông tin đã có.",
    parameters: z.object({ query: z.string().trim().min(2).max(120), limit: z.number().int().min(1).max(10).default(5) }),
    async execute(input, runContext) {
      const context = runContext!.context as AiCommandRunContext;
      return executeLogged({ context, toolName: "search_zalo_customers", riskLevel: "read", arguments: input, execute: async () => {
        await assertActorAnyPermission(context.actor, ["zalo_oa_view", "zalo_inbox_view"]);
        const { getZaloDashboard } = await import("@/lib/zalo-oa-store");
        const dashboard = await getZaloDashboard();
        const needle = input.query.toLocaleLowerCase("vi");
        const customers = dashboard.conversations.filter(item =>
          item.userId.toLocaleLowerCase("vi").includes(needle) ||
          item.displayName.toLocaleLowerCase("vi").includes(needle) ||
          item.tags.some(tag => tag.toLocaleLowerCase("vi").includes(needle)),
        ).slice(0, input.limit);
        return {
          count: customers.length,
          customers: customers.map(customer => ({
            userId: customer.userId, displayName: customer.displayName, tags: customer.tags,
            unreadCount: customer.unreadCount, lastInteraction: customer.lastUserInteraction,
            canConsult: customer.lastUserInteraction ? Date.now() - new Date(customer.lastUserInteraction).getTime() <= 7 * 86_400_000 : false,
            recentMessages: dashboard.messages.filter(message => message.userId === customer.userId).slice(0, 8)
              .map(message => ({ direction: message.direction, content: message.content, status: message.status, at: message.createdAt })),
          })),
        };
      }});
    },
  });

  const getMarketingSnapshot = tool({
    name: "get_marketing_snapshot",
    description: "Đọc hiệu suất và tài sản Email Marketing cùng AI Group Growth để lập kế hoạch, so sánh và đề xuất công việc tiếp theo.",
    parameters: z.object({ days: z.number().int().min(1).max(90).default(30) }),
    async execute(input, runContext) {
      const context = runContext!.context as AiCommandRunContext;
      return executeLogged({ context, toolName: "get_marketing_snapshot", riskLevel: "read", arguments: input, execute: async () => {
        await assertActorAnyPermission(context.actor, ["email_marketing_view", "facebook_group_marketing_view", "content_marketing_view"]);
        const permissions = await getCurrentPermissions(context.actor);
        const canReadEmail = context.actor.kind === "admin" || permissions?.email_marketing_view === true;
        const canReadGroups = context.actor.kind === "admin" || permissions?.facebook_group_marketing_view === true;
        const [{ getEmailCampaigns, getEmailLogs, getEmailTemplates, getEmailWorkflows, getLeadSegments }, { getFacebookGroupDashboard }] = await Promise.all([
          import("@/lib/email-marketing-store"), import("@/lib/facebook-group-marketing-store"),
        ]);
        const [campaigns, templates, workflows, logs, segments, groups] = await Promise.all([
          canReadEmail ? getEmailCampaigns() : Promise.resolve([]),
          canReadEmail ? getEmailTemplates() : Promise.resolve([]),
          canReadEmail ? getEmailWorkflows() : Promise.resolve([]),
          canReadEmail ? getEmailLogs() : Promise.resolve([]),
          canReadEmail ? getLeadSegments() : Promise.resolve([]),
          canReadGroups
            ? getFacebookGroupDashboard({ from: new Date(Date.now() - (input.days - 1) * 86_400_000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) })
            : Promise.resolve(null),
        ]);
        const sent = logs.filter(item => ["sent", "delivered", "opened", "clicked"].includes(item.status));
        return {
          periodDays: input.days, generatedAt: new Date().toISOString(),
          email: canReadEmail ? {
            campaigns: campaigns.map(item => ({ id: item.id, name: item.name, status: item.status, segments: item.targetSegments })),
            templates: templates.map(item => ({ id: item.id, name: item.name, subject: item.subject })),
            workflows: workflows.map(item => ({ id: item.id, name: item.name, status: item.status, trigger: item.triggerType, steps: item.steps.length })),
            segments: segments.map(item => ({ id: item.id, name: item.name })),
            performance: { total: logs.length, sent: sent.length, opened: logs.filter(item => item.status === "opened" || item.status === "clicked").length,
              clicked: logs.filter(item => item.status === "clicked").length, failed: logs.filter(item => item.status === "failed" || item.status === "bounced").length },
          } : null,
          groupGrowth: groups,
        };
      }});
    },
  });

  const getAdminSnapshot = tool({
    name: "get_admin_snapshot",
    description: "Đọc trạng thái vận hành Admin SmartFurni: nhân sự, vai trò, AI agent và nhật ký gần nhất. Không trả mật khẩu, token hoặc API key.",
    parameters: z.object({ auditLimit: z.number().int().min(1).max(30).default(10) }),
    async execute(input, runContext) {
      const context = runContext!.context as AiCommandRunContext;
      return executeLogged({ context, toolName: "get_admin_snapshot", riskLevel: "read", arguments: input, execute: async () => {
        await assertActorAnyPermission(context.actor, ["staff_view", "audit_logs_view", "ai_agent_view"]);
        const permissions = await getCurrentPermissions(context.actor);
        const canReadStaff = context.actor.kind === "admin" || permissions?.staff_view === true;
        const canReadAudit = context.actor.kind === "admin" || permissions?.audit_logs_view === true;
        const canReadAgents = context.actor.kind === "admin" || permissions?.ai_agent_view === true;
        const [{ getAllStaff }, { getAllRoles }, { getAuditLogs }] = await Promise.all([
          import("@/lib/crm-staff-store"), import("@/lib/crm-roles-store"), import("@/lib/crm-audit-store"),
        ]);
        const [staff, roles, agents, audit] = await Promise.all([
          canReadStaff ? getAllStaff() : Promise.resolve([]),
          canReadStaff ? getAllRoles() : Promise.resolve([]),
          canReadAgents ? listAgents() : Promise.resolve([]),
          canReadAudit ? getAuditLogs({ limit: input.auditLimit }) : Promise.resolve(null),
        ]);
        return {
          generatedAt: new Date().toISOString(),
          staff: canReadStaff ? {
            total: staff.length,
            active: staff.filter(item => item.status === "active").length,
            byRole: Object.entries(staff.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.role]: (acc[item.role] || 0) + 1 }), {})),
          } : null,
          roles: canReadStaff ? roles.map(role => ({ id: role.id, name: role.name, staffCount: role.staffCount, isSystem: role.isSystem })) : null,
          agents: canReadAgents ? agents.map(agent => ({ id: agent.id, name: agent.name, role: agent.role, status: agent.status, allowedActions: agent.allowedActions })) : null,
          recentAudit: audit ? audit.logs.slice(0, input.auditLimit).map(item => ({ action: item.action, actor: item.actorName, entity: item.entityName, at: item.createdAt })) : null,
        };
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

  const sendZaloMessage = tool({
    name: "send_zalo_consultation",
    description: "Gửi một tin tư vấn Zalo OA đã hoàn chỉnh. Chỉ gọi sau khi đã tìm đúng userId, kiểm tra nội dung và cửa sổ tương tác; luôn dừng để người dùng phê duyệt.",
    parameters: z.object({ userId: z.string().trim().min(3).max(120), customerName: z.string().trim().min(1).max(120), content: z.string().trim().min(1).max(2000) }),
    needsApproval: true,
    async execute(input, runContext) {
      const context = runContext!.context as AiCommandRunContext;
      return executeLogged({ context, toolName: "send_zalo_consultation", riskLevel: "external", arguments: input, execute: async () => {
        await assertActorPermission(context.actor, "ai_command_execute");
        await assertActorAnyPermission(context.actor, ["zalo_oa_view", "zalo_inbox_view"]);
        const { sendZaloConsultation } = await import("@/lib/zalo-oa-store");
        const result = await sendZaloConsultation({ userId: input.userId, content: input.content, source: "ai" });
        if (!result.ok) throw new Error(result.error || "Zalo OA không gửi được tin.");
        await logAudit({
          action: "ai.external_message_sent", entityType: "zalo_user", entityId: input.userId, entityName: input.customerName,
          actorId: context.actor.id, actorName: context.actor.name,
          metadata: { runId: context.runId, threadId: context.threadId, tool: "send_zalo_consultation" },
        });
        return { sent: true, channel: "Zalo OA", userId: input.userId, customerName: input.customerName };
      }});
    },
  });

  return {
    searchCustomers, getSummary, knowledgeSearch, listSpecialists,
    getOrdersSnapshot, getCustomerCareSnapshot, searchZaloCustomers, getMarketingSnapshot, getAdminSnapshot,
    createFollowUpTask, addCustomerTags, sendZaloMessage,
  };
}
