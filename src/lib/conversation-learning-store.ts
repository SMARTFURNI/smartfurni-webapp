import { randomUUID } from "crypto";
import { query, queryOne } from "@/lib/db";
import {
  createKnowledgeDocument,
  createSalesTask,
  getDefaultTaskDueDate,
  initBusinessBrainSchema,
  logAgentAction,
} from "@/lib/business-brain-store";
import type { KnowledgeCategory } from "@/types/business-brain";
import type {
  ConversationAnalysis,
  ConversationAnalysisReviewStatus,
  ConversationLearningLeadTemperature,
  ConversationLearningOverview,
  ConversationLearningSource,
  ConversationMessageInput,
  ConversationSenderType,
  SalesScript,
  SalesWorkflow,
} from "@/types/conversation-learning";

let initialized = false;

function asJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeString(value: unknown) {
  return value == null ? undefined : String(value);
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(item => String(item)).filter(Boolean);
}

function unique(values: string[]) {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function slugify(value: string) {
  return normalizeText(value).replace(/\s+/g, "-").slice(0, 80);
}

function mapSenderType(direction: string, authorType: string): ConversationSenderType {
  if (authorType === "customer" || direction === "inbound") return "customer";
  if (authorType === "ai") return "agent";
  if (authorType === "staff" || direction === "outbound") return "sale";
  if (authorType === "system") return "system";
  return "page";
}

function mapAnalysis(row: Record<string, unknown>): ConversationAnalysis {
  return {
    id: String(row.id),
    conversationId: String(row.conversation_id),
    customerId: safeString(row.customer_id),
    productInterest: stringArray(row.product_interest),
    customerNeed: String(row.customer_need ?? ""),
    objections: stringArray(row.objections),
    buyingSignals: stringArray(row.buying_signals),
    leadTemperature: String(row.lead_temperature ?? "cold") as ConversationLearningLeadTemperature,
    leadScore: Number(row.lead_score ?? 0),
    conversationSummary: String(row.conversation_summary ?? ""),
    finalStatus: String(row.final_status ?? ""),
    nextBestAction: String(row.next_best_action ?? ""),
    reviewStatus: String(row.review_status ?? "analyzed") as ConversationAnalysisReviewStatus,
    sourcePayload: asJson<Record<string, unknown>>(row.source_payload, {}),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapScript(row: Record<string, unknown>): SalesScript {
  return {
    id: String(row.id),
    scriptName: String(row.script_name ?? ""),
    customerSituation: String(row.customer_situation ?? ""),
    triggerSignals: stringArray(row.trigger_signals),
    suggestedQuestions: stringArray(row.suggested_questions),
    suggestedReply: String(row.suggested_reply ?? ""),
    recommendedProducts: stringArray(row.recommended_products),
    objectionHandling: String(row.objection_handling ?? ""),
    closingMethod: String(row.closing_method ?? ""),
    nextCrmAction: String(row.next_crm_action ?? ""),
    status: String(row.status ?? "draft") as SalesScript["status"],
    sourceAnalysisIds: stringArray(row.source_analysis_ids),
    metadata: asJson<Record<string, unknown>>(row.metadata, {}),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapWorkflow(row: Record<string, unknown>): SalesWorkflow {
  return {
    id: String(row.id),
    workflowName: String(row.workflow_name ?? ""),
    triggerCondition: String(row.trigger_condition ?? ""),
    aiAction: String(row.ai_action ?? ""),
    humanAction: String(row.human_action ?? ""),
    delayTime: String(row.delay_time ?? ""),
    priority: Number(row.priority ?? 3),
    status: String(row.status ?? "draft") as SalesWorkflow["status"],
    metadata: asJson<Record<string, unknown>>(row.metadata, {}),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function initConversationLearningSchema() {
  if (initialized) return;

  await initBusinessBrainSchema();

  await query(`
    CREATE TABLE IF NOT EXISTS conversation_analysis (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL UNIQUE,
      customer_id TEXT,
      product_interest TEXT[] DEFAULT '{}',
      customer_need TEXT,
      objections TEXT[] DEFAULT '{}',
      buying_signals TEXT[] DEFAULT '{}',
      lead_temperature TEXT NOT NULL DEFAULT 'cold',
      lead_score INTEGER NOT NULL DEFAULT 0,
      conversation_summary TEXT,
      final_status TEXT,
      next_best_action TEXT,
      review_status TEXT NOT NULL DEFAULT 'analyzed',
      source_payload JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sales_scripts (
      id TEXT PRIMARY KEY,
      script_name TEXT NOT NULL,
      customer_situation TEXT NOT NULL,
      trigger_signals TEXT[] DEFAULT '{}',
      suggested_questions TEXT[] DEFAULT '{}',
      suggested_reply TEXT NOT NULL,
      recommended_products TEXT[] DEFAULT '{}',
      objection_handling TEXT,
      closing_method TEXT,
      next_crm_action TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      source_analysis_ids TEXT[] DEFAULT '{}',
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sales_workflows (
      id TEXT PRIMARY KEY,
      workflow_name TEXT NOT NULL,
      trigger_condition TEXT NOT NULL,
      ai_action TEXT NOT NULL,
      human_action TEXT NOT NULL,
      delay_time TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 3,
      status TEXT NOT NULL DEFAULT 'draft',
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_conversation_analysis_customer ON conversation_analysis(customer_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_conversation_analysis_temperature ON conversation_analysis(lead_temperature)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sales_scripts_status ON sales_scripts(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sales_workflows_status ON sales_workflows(status)`);

  initialized = true;
}

async function tableExists(tableName: string) {
  const row = await queryOne<{ name: string | null }>(`SELECT to_regclass($1::text) AS name`, [tableName]);
  return Boolean(row?.name);
}

export async function loadConversationSources(limit = 50): Promise<ConversationLearningSource[]> {
  await initConversationLearningSchema();

  if (!(await tableExists("conversations"))) return [];

  const rows = await query<Record<string, unknown>>(
    `SELECT
       c.*,
       cu.name AS customer_name,
       cu.phone AS customer_phone,
       cu.owner_name,
       cu.lead_source,
       cu.metadata AS customer_metadata
     FROM conversations c
     LEFT JOIN customers cu ON cu.id = c.customer_id
     WHERE c.channel IN ('facebook', 'pancake', 'zalo', 'website', 'manual')
     ORDER BY c.created_at DESC
     LIMIT $1`,
    [Math.max(limit * 12, 120)]
  );

  const groups = new Map<string, ConversationLearningSource>();

  for (const row of rows) {
    const metadata = asJson<Record<string, unknown>>(row.metadata, {});
    const customerMetadata = asJson<Record<string, unknown>>(row.customer_metadata, {});
    const conversationId =
      safeString(metadata.conversationId) ||
      safeString(metadata.conversation_id) ||
      safeString(metadata.facebook_conversation_id) ||
      safeString(metadata.pancake_conversation_id) ||
      safeString(row.customer_id) ||
      safeString(row.id) ||
      randomUUID();
    const tags = unique([...stringArray(metadata.tags), ...stringArray(customerMetadata.tags)]);

    const message: ConversationMessageInput = {
      id: String(row.id),
      customerId: safeString(row.customer_id),
      customerName: safeString(row.customer_name),
      facebookUserId:
        safeString(metadata.facebookUserId) ||
        safeString(metadata.facebook_user_id) ||
        safeString(metadata.user_id),
      conversationId,
      assignedSale: safeString(row.owner_name) || safeString(metadata.assignedSale),
      tags,
      orderStatus: safeString(metadata.orderStatus) || safeString(metadata.order_status),
      content: String(row.message ?? ""),
      senderType: mapSenderType(String(row.direction ?? ""), String(row.author_type ?? "")),
      messageTime: new Date(String(row.created_at)).toISOString(),
    };

    const existing = groups.get(conversationId);
    if (existing) {
      existing.messages.push(message);
      existing.tags = unique([...existing.tags, ...tags]);
      if (!existing.latestMessageAt || message.messageTime > existing.latestMessageAt) {
        existing.latestMessageAt = message.messageTime;
      }
    } else {
      groups.set(conversationId, {
        conversationId,
        customerId: safeString(row.customer_id),
        customerName: safeString(row.customer_name),
        facebookUserId: message.facebookUserId,
        assignedSale: message.assignedSale,
        tags,
        orderStatus: message.orderStatus,
        latestMessageAt: message.messageTime,
        messages: [message],
      });
    }
  }

  return [...groups.values()]
    .map(source => ({ ...source, messages: source.messages.sort((a, b) => a.messageTime.localeCompare(b.messageTime)) }))
    .sort((a, b) => String(b.latestMessageAt || "").localeCompare(String(a.latestMessageAt || "")))
    .slice(0, limit);
}

function detectProducts(text: string) {
  const normalized = normalizeText(text);
  const products: string[] = [];
  const codes = text.toUpperCase().match(/\b(SMF12|SMF23|SMF18|SMF450|GSF150|GYT300)\b/g) || [];
  products.push(...codes);
  if (/sofa|giuong gap|giuong sofa/.test(normalized)) products.push("Sofa giường");
  if (/cong thai hoc|nang ha|khung giuong|zero gravity/.test(normalized)) products.push("Giường công thái học / GSF150");
  if (/y te|benh nhan|nguoi gia|cham soc/.test(normalized)) products.push("Giường y tế");
  return unique(products);
}

function detectNeed(text: string) {
  const normalized = normalizeText(text);
  const parts: string[] = [];
  const sizeMatches = text.match(/\b(0[,.\s]?9m?|1m2|1m4|1m6|1m8|90cm|120cm|140cm|160cm|180cm|2m)\b/gi) || [];
  const budgetMatches = text.match(/\b\d{1,3}(?:[.,]\d{3})*(?:\s?tr|\s?triệu|\s?trieu|\s?k|\s?đ|\s?vnd)?\b/gi) || [];
  if (sizeMatches.length) parts.push(`Size quan tâm: ${unique(sizeMatches).join(", ")}`);
  if (/hcm|ho chi minh|sai gon/.test(normalized)) parts.push("Khu vực: HCM");
  if (/ha noi|hanoi/.test(normalized)) parts.push("Khu vực: Hà Nội");
  if (/binh duong/.test(normalized)) parts.push("Khu vực: Bình Dương");
  if (/dong nai/.test(normalized)) parts.push("Khu vực: Đồng Nai");
  if (/long an/.test(normalized)) parts.push("Khu vực: Long An");
  if (budgetMatches.some(item => /\d/.test(item))) parts.push(`Có nhắc ngân sách/giá: ${unique(budgetMatches).slice(0, 4).join(", ")}`);
  if (/can ho|phong nho|dien tich|chung cu/.test(normalized)) parts.push("Nhu cầu: tối ưu không gian nhỏ");
  if (/bo me|nguoi gia|benh nhan|dau lung|dau moi|doc sach|xem phim/.test(normalized)) parts.push("Nhu cầu: nâng đỡ tư thế nghỉ ngơi");
  if (/anh thuc te|video|clip|showroom/.test(normalized)) parts.push("Cần ảnh/video thực tế hoặc xem showroom");
  return parts.length ? parts.join("; ") : "Chưa đủ dữ liệu nhu cầu, cần nhân viên hỏi thêm size, khu vực và mục đích sử dụng.";
}

function detectObjections(text: string) {
  const normalized = normalizeText(text);
  const objections: string[] = [];
  if (/mac|cao|re hon|giam gia|bot/.test(normalized)) objections.push("Ngại giá / muốn giảm giá");
  if (/suy nghi|de xem|hoi vo|hoi chong|hoi nha/.test(normalized)) objections.push("Cần thời gian hoặc hỏi thêm người nhà");
  if (/bao hanh|lo hong|co ben|chat luong/.test(normalized)) objections.push("Lo về bảo hành/chất lượng");
  if (/xa|phi ship|van chuyen|giao hang|lap dat/.test(normalized)) objections.push("Lo về giao lắp/vận chuyển");
  if (/size|kich thuoc|vua khong|long giuong/.test(normalized)) objections.push("Chưa chắc kích thước phù hợp");
  if (/anh thuc te|video|clip|mau that/.test(normalized)) objections.push("Muốn xem ảnh/video thực tế");
  return unique(objections);
}

function detectBuyingSignals(text: string) {
  const normalized = normalizeText(text);
  const signals: string[] = [];
  if (/gia|bao gia|bao nhieu|chi phi/.test(normalized)) signals.push("Khách hỏi giá");
  if (/size|kich thuoc|long giuong|1m|0 9m|1m8/.test(normalized)) signals.push("Khách hỏi size/kích thước");
  if (/giao|lap|dia chi|o dau|khu vuc|ship/.test(normalized)) signals.push("Khách hỏi giao lắp/khu vực");
  if (/mua|dat|chot|coc|chuyen khoan|lay|dat hang/.test(normalized)) signals.push("Có tín hiệu mua/chốt");
  if (/so dien thoai|sdt|goi|tu van/.test(normalized)) signals.push("Sẵn sàng để nhân viên liên hệ");
  return unique(signals);
}

function leadScoreFrom(signals: string[], objections: string[], productInterest: string[], customerNeed: string) {
  let score = 20;
  score += Math.min(productInterest.length * 10, 25);
  score += Math.min(signals.length * 14, 45);
  if (customerNeed && !customerNeed.startsWith("Chưa đủ")) score += 10;
  if (objections.length > 0) score -= Math.min(objections.length * 4, 12);
  const safeScore = Math.max(0, Math.min(100, score));
  const leadTemperature: ConversationLearningLeadTemperature = safeScore >= 75 ? "hot" : safeScore >= 45 ? "warm" : "cold";
  return { leadScore: safeScore, leadTemperature };
}

export function analyzeSourceConversation(source: ConversationLearningSource): Omit<ConversationAnalysis, "id" | "createdAt" | "updatedAt"> {
  const customerText = source.messages
    .filter(message => message.senderType === "customer")
    .map(message => message.content)
    .join("\n");
  const allText = source.messages.map(message => message.content).join("\n");
  const productInterest = detectProducts(allText);
  const customerNeed = detectNeed(customerText || allText);
  const objections = detectObjections(customerText);
  const buyingSignals = detectBuyingSignals(customerText);
  const { leadScore, leadTemperature } = leadScoreFrom(buyingSignals, objections, productInterest, customerNeed);
  const reviewStatus: ConversationAnalysisReviewStatus =
    !customerText.trim() || productInterest.length === 0 ? "need_human_review" : "analyzed";
  const hasCloseSignal = buyingSignals.includes("Có tín hiệu mua/chốt");
  const finalStatus = hasCloseSignal
    ? "ready_to_close"
    : reviewStatus === "need_human_review"
      ? "need_human_review"
      : objections.length
        ? "needs_objection_handling"
        : "consulting";
  const nextBestAction = hasCloseSignal
    ? "Tạo task gọi điện trong 2 giờ để xác nhận size, khu vực giao lắp và bước đặt cọc."
    : objections.length
      ? `Dùng script xử lý: ${objections[0]}. Hỏi thêm 1 câu ngắn trước khi báo tiếp.`
      : "Tư vấn sản phẩm phù hợp, hỏi rõ size/khu vực/ngân sách trước khi báo giá chi tiết.";

  return {
    conversationId: source.conversationId,
    customerId: source.customerId,
    productInterest,
    customerNeed,
    objections,
    buyingSignals,
    leadTemperature,
    leadScore,
    conversationSummary:
      `Khách ${source.customerName || "chưa rõ tên"} quan tâm ${productInterest.join(", ") || "chưa rõ sản phẩm"}. ` +
      `${customerNeed} ${objections.length ? `Trở ngại: ${objections.join(", ")}.` : ""}`,
    finalStatus,
    nextBestAction,
    reviewStatus,
    sourcePayload: {
      customerName: source.customerName,
      facebookUserId: source.facebookUserId,
      assignedSale: source.assignedSale,
      tags: source.tags,
      orderStatus: source.orderStatus,
      messageCount: source.messages.length,
      latestMessageAt: source.latestMessageAt,
      source: "crm_conversations",
    },
  };
}

async function upsertAnalysis(input: Omit<ConversationAnalysis, "id" | "createdAt" | "updatedAt">) {
  await initConversationLearningSchema();
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO conversation_analysis
      (id, conversation_id, customer_id, product_interest, customer_need, objections, buying_signals,
       lead_temperature, lead_score, conversation_summary, final_status, next_best_action, review_status, source_payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (conversation_id) DO UPDATE SET
       customer_id = EXCLUDED.customer_id,
       product_interest = EXCLUDED.product_interest,
       customer_need = EXCLUDED.customer_need,
       objections = EXCLUDED.objections,
       buying_signals = EXCLUDED.buying_signals,
       lead_temperature = EXCLUDED.lead_temperature,
       lead_score = EXCLUDED.lead_score,
       conversation_summary = EXCLUDED.conversation_summary,
       final_status = EXCLUDED.final_status,
       next_best_action = EXCLUDED.next_best_action,
       review_status = EXCLUDED.review_status,
       source_payload = EXCLUDED.source_payload,
       updated_at = NOW()
     RETURNING *`,
    [
      randomUUID(),
      input.conversationId,
      input.customerId ?? null,
      input.productInterest,
      input.customerNeed,
      input.objections,
      input.buyingSignals,
      input.leadTemperature,
      input.leadScore,
      input.conversationSummary,
      input.finalStatus,
      input.nextBestAction,
      input.reviewStatus,
      JSON.stringify(input.sourcePayload ?? {}),
    ]
  );
  return mapAnalysis(rows[0]);
}

export async function analyzeLatestConversations(limit = 50, actorId = "system") {
  await initConversationLearningSchema();
  const startedAt = Date.now();
  const sources = await loadConversationSources(limit);
  const analyses: ConversationAnalysis[] = [];
  const createdTaskIds: string[] = [];

  for (const source of sources) {
    const analysis = await upsertAnalysis(analyzeSourceConversation(source));
    analyses.push(analysis);

    const shouldCreateTask =
      analysis.customerId &&
      (analysis.leadTemperature === "hot" || analysis.buyingSignals.includes("Khách hỏi giá"));
    if (shouldCreateTask) {
      const task = await createSalesTask({
        customerId: analysis.customerId!,
        title:
          analysis.leadTemperature === "hot"
            ? "Gọi ngay lead nóng từ hội thoại fanpage"
            : "Chăm sóc khách vừa hỏi giá",
        dueDate: getDefaultTaskDueDate(analysis.leadTemperature),
        priority: analysis.leadTemperature === "hot" ? "high" : "medium",
        assignedTo: safeString(analysis.sourcePayload.assignedSale),
        createdByAgentId: "lead-classification",
        metadata: {
          source: "conversation-learning",
          conversationId: analysis.conversationId,
          nextBestAction: analysis.nextBestAction,
        },
      });
      createdTaskIds.push(task.id);
    }
  }

  await logAgentAction({
    agentId: "lead-classification",
    customerId: undefined,
    actionType: "conversation_learning_batch_analyze",
    prompt: "Phân tích hội thoại CRM/fanpage nội bộ, không tự nhắn khách, thiếu dữ liệu thì need_human_review.",
    referencedDocumentIds: [],
    input: { limit, sourceCount: sources.length, actorId },
    output: { analyzedCount: analyses.length, createdTaskIds },
    status: "success",
    durationMs: Date.now() - startedAt,
  });

  return { sourcesCount: sources.length, analyses, createdTaskIds };
}

export async function listConversationAnalyses(limit = 80) {
  await initConversationLearningSchema();
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM conversation_analysis ORDER BY updated_at DESC LIMIT $1`,
    [limit]
  );
  return rows.map(mapAnalysis);
}

const SCRIPT_TEMPLATES = [
  {
    scriptName: "Khách hỏi giá",
    customerSituation: "price_question",
    triggerSignals: ["giá", "bao nhiêu", "báo giá", "chi phí"],
    suggestedQuestions: ["Anh/chị đang dùng lòng giường size bao nhiêu?", "Mình giao lắp ở khu vực nào để em kiểm tra hỗ trợ?"],
    suggestedReply:
      "Dạ em gửi giá theo size phù hợp, nhưng để báo đúng nhất em cần xác nhận thêm lòng giường và khu vực giao lắp. SmartFurni có hỗ trợ giao lắp tận nơi và bảo hành theo dòng sản phẩm.",
    objectionHandling: "Nếu khách so giá, nhấn mạnh khung chắc, motor vận hành êm, giao lắp và bảo hành rõ ràng thay vì chỉ so giá mua ban đầu.",
    closingMethod: "Chốt bước nhỏ: xin size + khu vực, sau đó hẹn gọi xác nhận trong ngày.",
    nextCrmAction: "Tạo task gọi điện trong 2 giờ nếu khách đã cho size hoặc số điện thoại.",
  },
  {
    scriptName: "Tư vấn sofa giường",
    customerSituation: "sofa_bed_consulting",
    triggerSignals: ["sofa", "giường gấp", "căn hộ nhỏ", "tiết kiệm diện tích"],
    suggestedQuestions: ["Phòng mình rộng khoảng bao nhiêu m2?", "Anh/chị ưu tiên làm sofa hằng ngày hay giường ngủ thường xuyên?"],
    suggestedReply:
      "Sofa giường SmartFurni phù hợp căn hộ nhỏ, nhà có khách ở lại và nhu cầu tiết kiệm diện tích. Mình có thể chọn size, màu theo không gian thực tế.",
    objectionHandling: "Nếu khách lo cồng kềnh, gợi ý gửi ảnh/video thực tế và hỏi kích thước phòng.",
    closingMethod: "Gợi ý gửi mẫu phù hợp với diện tích phòng.",
    nextCrmAction: "Gắn tag sofa-giuong và hẹn gửi ảnh thực tế.",
  },
  {
    scriptName: "Tư vấn giường công thái học",
    customerSituation: "ergonomic_bed_consulting",
    triggerSignals: ["GSF150", "công thái học", "nâng hạ", "đọc sách", "xem phim"],
    suggestedQuestions: ["Anh/chị muốn đặt vào khung giường cũ hay mua trọn bộ?", "Nệm hiện tại dày và size bao nhiêu?"],
    suggestedReply:
      "GSF150 giúp nâng đầu/chân bằng remote, phù hợp đọc sách, xem phim và nghỉ ngơi linh hoạt. Nếu giữ khung giường cũ, cần kiểm tra lòng giường trước khi lắp.",
    objectionHandling: "Không nói chữa bệnh; chỉ nói hỗ trợ tư thế nghỉ ngơi và tiện lợi khi sử dụng.",
    closingMethod: "Mời khách gửi kích thước lòng giường hoặc ảnh khung giường.",
    nextCrmAction: "Tạo task kiểm tra size/nệm trước khi báo giá.",
  },
  {
    scriptName: "Khách mua cho ba mẹ/người bệnh",
    customerSituation: "parents_patient_need",
    triggerSignals: ["ba mẹ", "người già", "bệnh nhân", "chăm sóc", "giường y tế"],
    suggestedQuestions: ["Người dùng cần nâng đầu/chân hay cần thanh chắn an toàn?", "Mình dùng tại nhà hay cơ sở chăm sóc?"],
    suggestedReply:
      "SmartFurni có các dòng hỗ trợ chăm sóc tại nhà. Em sẽ hỏi thêm nhu cầu nâng đầu/chân, thanh chắn và không gian phòng để tư vấn đúng mẫu.",
    objectionHandling: "Không cam kết điều trị/chữa khỏi. Chỉ tư vấn tiện ích hỗ trợ chăm sóc và sinh hoạt.",
    closingMethod: "Hẹn tư vấn viên gọi để hỏi tình trạng sử dụng thực tế.",
    nextCrmAction: "Đánh dấu cần tư vấn kỹ và tạo lịch gọi.",
  },
  {
    scriptName: "Khách im lặng sau báo giá",
    customerSituation: "silent_after_quote",
    triggerSignals: ["đã báo giá", "chưa phản hồi", "seen", "im lặng"],
    suggestedQuestions: ["Anh/chị cần em kiểm tra lại size hoặc phương án tiết kiệm hơn không?"],
    suggestedReply:
      "Em nhắn lại để hỗ trợ mình chọn đúng size và phương án phù hợp ngân sách. Nếu cần, em gửi thêm ảnh/video thực tế để anh/chị dễ hình dung.",
    objectionHandling: "Không thúc ép. Mở bằng hỗ trợ chọn phương án hoặc kiểm tra size.",
    closingMethod: "Đề nghị một hành động nhỏ: gửi size/phòng/ảnh giường cũ.",
    nextCrmAction: "Tạo task follow-up sau 24 giờ.",
  },
  {
    scriptName: "Khách so sánh với bên khác",
    customerSituation: "comparison_question",
    triggerSignals: ["so sánh", "bên khác", "khác gì", "loại nào tốt"],
    suggestedQuestions: ["Anh/chị đang so với mẫu nào để em đối chiếu đúng điểm khác biệt?", "Mình ưu tiên giá, độ bền khung hay bảo hành/giao lắp?"],
    suggestedReply:
      "Dạ mình nên so theo khung, motor, bảo hành và phần giao lắp sau mua. SmartFurni tập trung vào khung chắc, vận hành êm, đặt size theo nhu cầu và có đội hỗ trợ lắp tận nơi.",
    objectionHandling: "Không nói tốt nhất thị trường. Chỉ đưa tiêu chí so sánh rõ ràng và mời khách gửi mẫu đang cân nhắc.",
    closingMethod: "Đề nghị gửi bảng so sánh ngắn theo nhu cầu thực tế của khách.",
    nextCrmAction: "Gắn tag so-sanh và tạo task gửi bảng so sánh.",
  },
  {
    scriptName: "Khách chê giá cao",
    customerSituation: "price_objection",
    triggerSignals: ["mắc", "cao", "giá cao", "bớt", "giảm giá"],
    suggestedQuestions: ["Ngân sách mình đang dự kiến khoảng bao nhiêu để em lọc phương án phù hợp?", "Anh/chị ưu tiên size nào và có cần giao lắp tận nơi không?"],
    suggestedReply:
      "Em hiểu mình cần cân đối ngân sách. Để không báo dư tính năng, em kiểm tra size và nhu cầu dùng chính rồi đề xuất phương án vừa đủ, vẫn đảm bảo khung chắc và bảo hành rõ ràng.",
    objectionHandling: "Chuyển từ giảm giá sang chọn đúng cấu hình, đúng size, đúng nhu cầu.",
    closingMethod: "Chốt bằng phương án tiết kiệm hơn hoặc chia bước đặt cọc.",
    nextCrmAction: "Tạo task tư vấn phương án theo ngân sách.",
  },
  {
    scriptName: "Khách hỏi bảo hành",
    customerSituation: "warranty_question",
    triggerSignals: ["bảo hành", "hỏng", "motor", "có bền", "sửa"],
    suggestedQuestions: ["Anh/chị muốn dùng cho gia đình hay cơ sở lưu trú để em tư vấn tải trọng và tần suất phù hợp?", "Khu vực mình ở đâu để em kiểm tra hỗ trợ kỹ thuật?"],
    suggestedReply:
      "Dạ sản phẩm có chính sách bảo hành theo từng dòng và SmartFurni hỗ trợ kỹ thuật trong quá trình sử dụng. Khi chốt đơn, em ghi rõ cấu hình, thời hạn bảo hành và khu vực hỗ trợ.",
    objectionHandling: "Không cam kết tuyệt đối; nói rõ chính sách cần kiểm tra theo sản phẩm/đơn hàng.",
    closingMethod: "Đề nghị gửi chính sách bảo hành kèm báo giá.",
    nextCrmAction: "Tạo task gửi chính sách bảo hành phù hợp sản phẩm.",
  },
  {
    scriptName: "Khách hỏi giao hàng và lắp đặt",
    customerSituation: "delivery_installation_question",
    triggerSignals: ["giao", "lắp", "ship", "vận chuyển", "tận nơi"],
    suggestedQuestions: ["Địa chỉ giao lắp của mình ở quận/huyện nào?", "Nhà mình có thang máy hoặc cần bê cầu thang không?"],
    suggestedReply:
      "SmartFurni có hỗ trợ giao lắp tận nơi theo khu vực. Em kiểm tra địa chỉ, đường lên phòng và size sản phẩm để báo lịch giao lắp chính xác cho mình.",
    objectionHandling: "Nếu khách lo phí, tách rõ giá sản phẩm và phí phát sinh nếu có.",
    closingMethod: "Xin khu vực cụ thể để chốt lịch/chi phí giao lắp.",
    nextCrmAction: "Tạo task kiểm tra khu vực giao lắp.",
  },
  {
    scriptName: "Khách hỏi đặt cọc",
    customerSituation: "deposit_question",
    triggerSignals: ["cọc", "đặt hàng", "chuyển khoản", "giữ hàng"],
    suggestedQuestions: ["Anh/chị muốn đặt size nào để em kiểm tra tồn/lịch sản xuất?", "Thông tin giao hàng gồm tên, số điện thoại và khu vực của mình là gì?"],
    suggestedReply:
      "Dạ để đặt hàng, em xác nhận lại size, giá, khu vực giao lắp và thông tin nhận hàng trước. Sau đó nhân viên phụ trách sẽ gửi hướng dẫn đặt cọc chính thức.",
    objectionHandling: "Không gửi thông tin thanh toán tự động nếu chưa được nhân viên xác nhận.",
    closingMethod: "Chốt checklist đặt hàng: size, giá, địa chỉ, lịch giao, cọc.",
    nextCrmAction: "Tạo task xác nhận đơn và chuyển bước đặt cọc.",
  },
  {
    scriptName: "Khách muốn ảnh hoặc video thực tế",
    customerSituation: "real_photo_video_request",
    triggerSignals: ["ảnh thật", "ảnh thực tế", "video", "clip", "showroom"],
    suggestedQuestions: ["Anh/chị muốn xem màu/size nào?", "Mình cần xem sản phẩm đặt trong phòng ngủ hay video vận hành nâng hạ?"],
    suggestedReply:
      "Dạ em gửi ảnh/video thực tế theo đúng dòng mình quan tâm để dễ hình dung. Nếu cần, em cũng kiểm tra showroom hoặc mẫu đang có sẵn cho mình xem trực tiếp.",
    objectionHandling: "Gửi đúng mẫu khách hỏi, tránh gửi quá nhiều làm khách rối.",
    closingMethod: "Sau khi gửi media, hỏi khách chọn size/khu vực để báo giá.",
    nextCrmAction: "Gắn tag can-anh-video và tạo task gửi media.",
  },
  {
    scriptName: "Tư vấn theo kích thước phòng",
    customerSituation: "room_size_advice",
    triggerSignals: ["phòng nhỏ", "diện tích", "mấy m2", "vừa không", "kích thước phòng"],
    suggestedQuestions: ["Phòng mình rộng khoảng bao nhiêu m2?", "Sau khi đặt giường, mình cần chừa lối đi khoảng bao nhiêu cm?"],
    suggestedReply:
      "Để chọn đúng size, mình nên tính lòng giường, lối đi và vị trí mở/nâng. Anh/chị gửi giúp em kích thước phòng hoặc ảnh góc đặt, em sẽ gợi ý size phù hợp hơn.",
    objectionHandling: "Nếu thiếu số đo, chuyển sang xin ảnh hoặc kích thước ước lượng.",
    closingMethod: "Chốt bằng đề xuất 1-2 size phù hợp nhất.",
    nextCrmAction: "Tạo task kiểm tra kích thước phòng.",
  },
  {
    scriptName: "Khách ở căn hộ nhỏ",
    customerSituation: "small_apartment_need",
    triggerSignals: ["căn hộ nhỏ", "chung cư", "studio", "tiết kiệm diện tích", "phòng hẹp"],
    suggestedQuestions: ["Mình cần dùng hằng ngày hay chủ yếu cho khách ở lại?", "Phòng có thang máy và lối vào rộng không?"],
    suggestedReply:
      "Với căn hộ nhỏ, SmartFurni ưu tiên giải pháp gọn, đúng size và dễ vận hành. Em sẽ lọc mẫu tiết kiệm diện tích, màu hài hòa nội thất và phương án giao lắp phù hợp.",
    objectionHandling: "Tập trung vào gọn, đúng công năng, không nói quá về diện tích nếu chưa có số đo.",
    closingMethod: "Mời khách gửi ảnh phòng để gợi ý mẫu.",
    nextCrmAction: "Gắn tag can-ho-nho và tạo task tư vấn layout.",
  },
  {
    scriptName: "Khách cần đặt size theo yêu cầu",
    customerSituation: "custom_size_request",
    triggerSignals: ["đặt size", "theo yêu cầu", "đo riêng", "không chuẩn", "lòng giường"],
    suggestedQuestions: ["Anh/chị đo giúp em chiều ngang, chiều dài lòng giường hiện tại được không?", "Mình muốn giữ nệm cũ hay thay nệm mới?"],
    suggestedReply:
      "SmartFurni có thể kiểm tra phương án theo kích thước thực tế. Mình gửi số đo lòng giường, loại nệm đang dùng và ảnh khung hiện tại để kỹ thuật đối chiếu trước khi báo chính xác.",
    objectionHandling: "Không nhận chắc khi chưa có số đo/ảnh; chuyển trạng thái cần kiểm tra kỹ thuật.",
    closingMethod: "Chốt bước gửi số đo và ảnh khung giường.",
    nextCrmAction: "Tạo task kỹ thuật kiểm tra size theo yêu cầu.",
  },
];

function recommendedProductsFromAnalyses(analyses: ConversationAnalysis[]) {
  const products = unique(analyses.flatMap(item => item.productInterest));
  return products.length ? products : ["GSF150", "SMF12", "SMF23"];
}

export async function generateDraftSalesScripts(actorId = "system") {
  await initConversationLearningSchema();
  const analyses = await listConversationAnalyses(200);
  const recommendedProducts = recommendedProductsFromAnalyses(analyses);
  const sourceAnalysisIds = analyses.slice(0, 20).map(item => item.id);
  const scripts: SalesScript[] = [];

  for (const template of SCRIPT_TEMPLATES) {
    const id = `conversation-script-${slugify(template.customerSituation)}`;
    const rows = await query<Record<string, unknown>>(
      `INSERT INTO sales_scripts
        (id, script_name, customer_situation, trigger_signals, suggested_questions, suggested_reply,
         recommended_products, objection_handling, closing_method, next_crm_action, status, source_analysis_ids, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         script_name = EXCLUDED.script_name,
         customer_situation = EXCLUDED.customer_situation,
         trigger_signals = EXCLUDED.trigger_signals,
         suggested_questions = EXCLUDED.suggested_questions,
         suggested_reply = EXCLUDED.suggested_reply,
         recommended_products = EXCLUDED.recommended_products,
         objection_handling = EXCLUDED.objection_handling,
         closing_method = EXCLUDED.closing_method,
         next_crm_action = EXCLUDED.next_crm_action,
         source_analysis_ids = EXCLUDED.source_analysis_ids,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [
        id,
        template.scriptName,
        template.customerSituation,
        template.triggerSignals,
        template.suggestedQuestions,
        template.suggestedReply,
        recommendedProducts,
        template.objectionHandling,
        template.closingMethod,
        template.nextCrmAction,
        sourceAnalysisIds,
        JSON.stringify({ generatedBy: "conversation-learning", actorId, analysisCount: analyses.length }),
      ]
    );
    scripts.push(mapScript(rows[0]));
  }

  await logAgentAction({
    agentId: "sales-manager",
    actionType: "conversation_learning_generate_scripts",
    prompt: "Tạo script nháp từ phân tích hội thoại. Script chưa được dùng cho khách cho đến khi quản lý duyệt.",
    referencedDocumentIds: [],
    input: { actorId, analysisCount: analyses.length },
    output: { scriptCount: scripts.length, scriptIds: scripts.map(script => script.id) },
    status: "success",
    durationMs: 0,
  });

  return scripts;
}

export async function listSalesScripts() {
  await initConversationLearningSchema();
  const rows = await query<Record<string, unknown>>(`SELECT * FROM sales_scripts ORDER BY updated_at DESC`);
  return rows.map(mapScript);
}

export async function approveSalesScript(id: string) {
  await initConversationLearningSchema();
  const rows = await query<Record<string, unknown>>(
    `UPDATE sales_scripts SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] ? mapScript(rows[0]) : null;
}

export async function publishSalesScriptToKnowledge(id: string, actorId = "system") {
  await initConversationLearningSchema();
  const row = await queryOne<Record<string, unknown>>(`SELECT * FROM sales_scripts WHERE id = $1`, [id]);
  if (!row) return null;
  const script = mapScript(row);
  const category: KnowledgeCategory =
    script.customerSituation.includes("silent") || script.customerSituation.includes("follow")
      ? "follow_up_scripts"
      : script.objectionHandling
        ? "objection_handling"
        : "sales_process";

  return createKnowledgeDocument({
    title: `[Script đã duyệt] ${script.scriptName}`,
    category,
    status: "draft",
    source: "conversation-learning",
    tags: unique([script.customerSituation, ...script.triggerSignals, ...script.recommendedProducts]),
    summary: script.suggestedReply.slice(0, 180),
    content: [
      `Tình huống: ${script.customerSituation}`,
      `Dấu hiệu kích hoạt: ${script.triggerSignals.join(", ")}`,
      `Câu hỏi nên hỏi: ${script.suggestedQuestions.join(" | ")}`,
      `Gợi ý trả lời: ${script.suggestedReply}`,
      `Xử lý từ chối: ${script.objectionHandling}`,
      `Cách chốt: ${script.closingMethod}`,
      `Hành động CRM tiếp theo: ${script.nextCrmAction}`,
    ].join("\n\n"),
    metadata: { scriptId: script.id, sourceAnalysisIds: script.sourceAnalysisIds },
    createdBy: actorId,
    updatedBy: actorId,
  });
}

export async function generateDraftSalesWorkflows(actorId = "system") {
  await initConversationLearningSchema();
  const templates = [
    {
      workflowName: "Khách hỏi giá -> tư vấn sản phẩm",
      triggerCondition: "Tin nhắn có: giá, bao nhiêu, báo giá, chi phí",
      aiAction: "Product Consultant Agent đọc Knowledge Base và soạn câu trả lời nháp.",
      humanAction: "Sale kiểm tra size/khu vực rồi gửi hoặc gọi xác nhận.",
      delayTime: "Ngay lập tức",
      priority: 1,
    },
    {
      workflowName: "Lead nóng -> tạo task gọi điện",
      triggerCondition: "Lead score >= 75 hoặc có tín hiệu mua/chốt/cọc.",
      aiAction: "Closing Agent tóm tắt nhu cầu và đề xuất câu chốt.",
      humanAction: "Sale gọi trong 2 giờ, cập nhật kết quả vào CRM.",
      delayTime: "Trong 2 giờ",
      priority: 1,
    },
    {
      workflowName: "Chưa phản hồi sau báo giá",
      triggerCondition: "Không có phản hồi sau 24 giờ từ lần báo giá cuối.",
      aiAction: "Follow-up Agent tạo tin nhắn chăm sóc lại nháp.",
      humanAction: "Sale duyệt nội dung và gửi thủ công.",
      delayTime: "24 giờ",
      priority: 2,
    },
    {
      workflowName: "Khách muốn báo giá",
      triggerCondition: "Tin nhắn có: gửi báo giá, báo giá chi tiết, xuất báo giá.",
      aiAction: "Quotation Agent tạo báo giá nháp từ dữ liệu sản phẩm/giá trong Knowledge Base.",
      humanAction: "Sale kiểm tra giá, phí giao hàng và gửi báo giá chính thức.",
      delayTime: "Trong ngày",
      priority: 2,
    },
    {
      workflowName: "Khách đã cọc -> kiểm tra đơn",
      triggerCondition: "Hội thoại có: đã cọc, chuyển khoản, đặt hàng.",
      aiAction: "Order Check Agent liệt kê thông tin còn thiếu.",
      humanAction: "Nhân viên xác nhận đơn, lịch giao lắp và cập nhật trạng thái.",
      delayTime: "Ngay lập tức",
      priority: 1,
    },
  ];
  const workflows: SalesWorkflow[] = [];

  for (const template of templates) {
    const id = `conversation-workflow-${slugify(template.workflowName)}`;
    const rows = await query<Record<string, unknown>>(
      `INSERT INTO sales_workflows
        (id, workflow_name, trigger_condition, ai_action, human_action, delay_time, priority, status, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8)
       ON CONFLICT (id) DO UPDATE SET
         workflow_name = EXCLUDED.workflow_name,
         trigger_condition = EXCLUDED.trigger_condition,
         ai_action = EXCLUDED.ai_action,
         human_action = EXCLUDED.human_action,
         delay_time = EXCLUDED.delay_time,
         priority = EXCLUDED.priority,
         metadata = EXCLUDED.metadata,
         updated_at = NOW()
       RETURNING *`,
      [
        id,
        template.workflowName,
        template.triggerCondition,
        template.aiAction,
        template.humanAction,
        template.delayTime,
        template.priority,
        JSON.stringify({ generatedBy: "conversation-learning", actorId }),
      ]
    );
    workflows.push(mapWorkflow(rows[0]));
  }

  return workflows;
}

export async function listSalesWorkflows() {
  await initConversationLearningSchema();
  const rows = await query<Record<string, unknown>>(`SELECT * FROM sales_workflows ORDER BY priority ASC, updated_at DESC`);
  return rows.map(mapWorkflow);
}

export async function getConversationLearningOverview(): Promise<ConversationLearningOverview> {
  await initConversationLearningSchema();
  const [total, review, hot, draftScripts, approvedScripts, activeWorkflows, latest] = await Promise.all([
    queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM conversation_analysis`),
    queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM conversation_analysis WHERE review_status = 'need_human_review'`),
    queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM conversation_analysis WHERE lead_temperature = 'hot'`),
    queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM sales_scripts WHERE status = 'draft'`),
    queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM sales_scripts WHERE status = 'approved'`),
    queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM sales_workflows WHERE status = 'approved'`),
    query<Record<string, unknown>>(`SELECT * FROM conversation_analysis ORDER BY updated_at DESC LIMIT 8`),
  ]);

  return {
    totalAnalyzed: Number(total?.count ?? 0),
    needHumanReview: Number(review?.count ?? 0),
    hotLeads: Number(hot?.count ?? 0),
    draftScripts: Number(draftScripts?.count ?? 0),
    approvedScripts: Number(approvedScripts?.count ?? 0),
    activeWorkflows: Number(activeWorkflows?.count ?? 0),
    latestAnalyses: latest.map(mapAnalysis),
  };
}
