import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import {
  addConversation,
  buildSuggestedReply,
  classifyLeadFromMessage,
  createLeadScore,
  createSalesTask,
  getDefaultTaskDueDate,
  logAgentAction,
  searchKnowledge,
  upsertCustomer,
} from "@/lib/business-brain-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function inferProducts(message: string) {
  const normalized = message.toLowerCase();
  const products = ["GSF150", "SMF12", "SMF23", "SMF18", "SMF450", "GYT300"].filter(code =>
    normalized.includes(code.toLowerCase())
  );
  if (products.length) return products;
  if (/khung|nâng hạ|nang ha/.test(normalized)) return ["GSF150"];
  if (/sofa|giường gấp|giuong gap/.test(normalized)) return ["SMF12", "SMF23"];
  return [];
}

export async function POST(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const startedAt = Date.now();
  const body = await req.json();
  const phone = String(body.phone || "").trim();
  const message = String(body.message || "").trim();
  if (!phone || !message) {
    return NextResponse.json({ error: "Cần số điện thoại và nội dung khách hỏi." }, { status: 400 });
  }

  const referencedDocuments = await searchKnowledge(message, 5);
  const suggestedReply = buildSuggestedReply(message, referencedDocuments);
  const classification = classifyLeadFromMessage(message, referencedDocuments);
  const status = referencedDocuments.length ? "answered" : "need_human_review";
  const nextStep =
    status === "need_human_review"
      ? "Nhân viên cần kiểm tra và bổ sung tri thức trước khi trả lời khách."
      : classification.temperature === "hot"
        ? "Gọi xác nhận size, khu vực giao lắp và chốt lịch tư vấn trong 2 giờ."
        : "Gửi tư vấn theo mẫu và đặt lịch chăm sóc lại.";

  const customer = await upsertCustomer({
    phone,
    name: body.name ? String(body.name) : "",
    leadSource: body.leadSource ? String(body.leadSource) : "Demo workflow",
    interestedProducts: inferProducts(message),
    conversationSummary: message,
    temperature: classification.temperature,
    leadScore: classification.score,
    mainPainPoint: message,
    aiNextStep: nextStep,
    ownerId: session.staffId,
    ownerName: session.isAdmin ? "Admin" : session.staffRole,
    metadata: { lastWorkflow: "price-question-to-consult-and-task" },
  });

  await addConversation({
    customerId: customer.id,
    channel: "manual",
    direction: "inbound",
    message,
    authorType: "customer",
    authorName: customer.name || "Khách hàng",
    metadata: { workflow: "price-question-to-consult-and-task" },
  });

  await addConversation({
    customerId: customer.id,
    channel: "manual",
    direction: "outbound",
    message: suggestedReply,
    authorType: "ai",
    authorName: "Product Consultant Agent",
    metadata: { reviewStatus: status },
  });

  const leadScore = await createLeadScore({
    customerId: customer.id,
    score: classification.score,
    temperature: classification.temperature,
    reason: classification.reason,
    signals: classification.signals,
    createdByAgentId: "lead-classification",
  });

  const docIds = referencedDocuments.map(doc => doc.id);
  const productAction = await logAgentAction({
    agentId: "product-consultant",
    customerId: customer.id,
    actionType: "answer_price",
    prompt: "Khách hỏi giá, tư vấn chỉ dựa trên Knowledge Base.",
    referencedDocumentIds: docIds,
    input: { message },
    output: { suggestedReply, reviewStatus: status },
    status,
    durationMs: Date.now() - startedAt,
  });

  const scoreAction = await logAgentAction({
    agentId: "lead-classification",
    customerId: customer.id,
    actionType: "classify_lead",
    prompt: "Chấm điểm lead dựa trên tín hiệu trong hội thoại.",
    referencedDocumentIds: docIds,
    input: { message },
    output: classification,
    status: "success",
    durationMs: Date.now() - startedAt,
  });

  const task = await createSalesTask({
    customerId: customer.id,
    title: `${classification.temperature === "hot" ? "Gọi ngay" : "Chăm sóc lại"}: ${customer.name || phone}`,
    dueDate: getDefaultTaskDueDate(classification.temperature),
    priority: classification.temperature === "hot" ? "high" : classification.temperature === "warm" ? "medium" : "low",
    assignedTo: session.staffId,
    createdByAgentId: "closing",
    metadata: { phone, nextStep },
  });

  const closeAction = await logAgentAction({
    agentId: "closing",
    customerId: customer.id,
    actionType: "create_follow_up_task",
    prompt: "Tạo task chăm sóc, không tự chốt đơn.",
    referencedDocumentIds: docIds,
    input: { temperature: classification.temperature, nextStep },
    output: { taskId: task.id, title: task.title, dueDate: task.dueDate },
    status: "success",
    durationMs: Date.now() - startedAt,
  });

  return NextResponse.json({
    status,
    customer,
    referencedDocuments,
    suggestedReply,
    leadScore,
    nextTask: {
      id: task.id,
      title: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
    },
    agentActions: [productAction, scoreAction, closeAction],
  });
}
