import { randomUUID } from "crypto";
import { query, queryOne } from "@/lib/db";
import type {
  AgentActionLog,
  AiAgentDefinition,
  BrainQuotation,
  BusinessCustomer,
  CustomerConversation,
  KnowledgeCategory,
  KnowledgeDocument,
  KnowledgeStatus,
  LeadScoreRecord,
  LeadTemperature,
  WorkflowRule,
} from "@/types/business-brain";

let initialized = false;

function nowIso() {
  return new Date().toISOString();
}

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

function scoreText(queryText: string, haystack: string) {
  const qTokens = new Set(normalizeText(queryText).split(" ").filter(Boolean));
  if (qTokens.size === 0) return 0;
  const text = normalizeText(haystack);
  let score = 0;
  for (const token of qTokens) {
    if (text.includes(token)) score += token.length > 3 ? 2 : 1;
  }
  const synonymGroups = [
    ["gia", "bao gia", "bao nhieu", "chi phi"],
    ["size", "kich thuoc", "long giuong"],
    ["sofa", "giuong", "khung", "dem"],
    ["bao hanh", "giao lap", "van chuyen"],
  ];
  for (const group of synonymGroups) {
    if (group.some(s => normalizeText(queryText).includes(s)) && group.some(s => text.includes(s))) score += 3;
  }
  return score;
}

export async function initBusinessBrainSchema() {
  if (initialized) return;

  await query(`
    CREATE TABLE IF NOT EXISTS knowledge_documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      content TEXT NOT NULL,
      summary TEXT,
      tags TEXT[] DEFAULT '{}',
      source TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      embedding JSONB,
      created_by TEXT,
      updated_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL UNIQUE,
      lead_source TEXT,
      interested_products TEXT[] DEFAULT '{}',
      preferred_size TEXT,
      preferred_color TEXT,
      budget NUMERIC,
      location TEXT,
      conversation_summary TEXT,
      temperature TEXT NOT NULL DEFAULT 'cold',
      lead_score INTEGER NOT NULL DEFAULT 0,
      main_pain_point TEXT,
      ai_next_step TEXT,
      owner_id TEXT,
      owner_name TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'manual',
      direction TEXT NOT NULL,
      message TEXT NOT NULL,
      author_type TEXT NOT NULL,
      author_name TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS ai_agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      allowed_actions JSONB DEFAULT '[]'::jsonb,
      system_prompt TEXT NOT NULL,
      tools JSONB DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS agent_actions (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      customer_id TEXT,
      action_type TEXT NOT NULL,
      prompt TEXT,
      referenced_document_ids TEXT[] DEFAULT '{}',
      input JSONB DEFAULT '{}'::jsonb,
      output JSONB DEFAULT '{}'::jsonb,
      status TEXT NOT NULL,
      duration_ms INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      rule JSONB DEFAULT '{}'::jsonb,
      actions JSONB DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS lead_scores (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      score INTEGER NOT NULL,
      temperature TEXT NOT NULL,
      reason TEXT NOT NULL,
      signals JSONB DEFAULT '[]'::jsonb,
      created_by_agent_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS business_brain_quotations (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      size TEXT,
      color TEXT,
      price NUMERIC NOT NULL DEFAULT 0,
      deposit NUMERIC,
      shipping_fee NUMERIC,
      status TEXT NOT NULL DEFAULT 'draft',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sales_tasks (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      title TEXT NOT NULL,
      due_date DATE NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'open',
      assigned_to TEXT,
      created_by_agent_id TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_documents(status)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_documents(category)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_agent_actions_customer ON agent_actions(customer_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_sales_tasks_customer ON sales_tasks(customer_id)`);

  initialized = true;
  await seedDefaults();
}

async function seedDefaults() {
  const agentCount = await queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ai_agents`);
  if (Number(agentCount?.count ?? 0) === 0) {
    const agents: Array<Omit<AiAgentDefinition, "createdAt" | "updatedAt">> = [
      {
        id: "lead-classification",
        name: "Lead Classification Agent",
        role: "Phân loại độ nóng, nhu cầu và điểm lead",
        allowedActions: ["classify_lead", "write_lead_score"],
        systemPrompt: "Chỉ chấm điểm dựa trên hội thoại và tri thức SmartFurni. Thiếu dữ liệu thì trả need_human_review.",
        tools: ["knowledge_search", "lead_score_writer"],
        status: "active",
      },
      {
        id: "product-consultant",
        name: "Product Consultant Agent",
        role: "Tư vấn sản phẩm, giá, size, chính sách dựa trên Knowledge Base",
        allowedActions: ["suggest_product", "answer_price", "request_human_review"],
        systemPrompt: "Không bịa giá, size, màu, bảo hành. Chỉ dùng tài liệu active trong Knowledge Base.",
        tools: ["knowledge_search", "customer_profile_reader"],
        status: "active",
      },
      {
        id: "closing",
        name: "Closing Agent",
        role: "Đề xuất bước chốt sale và tạo việc gọi điện",
        allowedActions: ["suggest_close", "create_task"],
        systemPrompt: "Không tự chốt đơn hoặc thay đổi giá. Chỉ gợi ý nhân viên gọi/chăm sóc.",
        tools: ["task_creator", "customer_profile_reader"],
        status: "active",
      },
      {
        id: "follow-up",
        name: "Follow-up Agent",
        role: "Tạo kịch bản chăm sóc lại theo thời điểm",
        allowedActions: ["suggest_follow_up", "create_task"],
        systemPrompt: "Chăm sóc lịch sự, rõ thông tin, không tạo áp lực quá mức.",
        tools: ["knowledge_search", "task_creator"],
        status: "active",
      },
      {
        id: "quotation",
        name: "Quotation Agent",
        role: "Tạo báo giá nháp theo sản phẩm, size, giá, cọc và phí giao hàng",
        allowedActions: ["create_quote_draft"],
        systemPrompt: "Chỉ tạo báo giá nháp nếu giá có trong Knowledge Base hoặc nhân viên nhập.",
        tools: ["knowledge_search", "quote_writer"],
        status: "active",
      },
      {
        id: "order-check",
        name: "Order Check Agent",
        role: "Kiểm tra thông tin đơn, cọc, giao hàng và lắp đặt",
        allowedActions: ["check_order", "request_human_review"],
        systemPrompt: "Nếu thiếu thông tin giao hàng hoặc cọc, đánh dấu cần người kiểm tra.",
        tools: ["order_reader", "task_creator"],
        status: "active",
      },
      {
        id: "sales-manager",
        name: "Sales Manager Agent",
        role: "Tổng hợp tình trạng lead, rủi ro và việc cần làm cho quản lý",
        allowedActions: ["summarize_pipeline", "flag_risk"],
        systemPrompt: "Báo cáo ngắn gọn, ưu tiên lead nóng chưa chăm sóc.",
        tools: ["report_reader", "agent_action_reader"],
        status: "active",
      },
    ];

    for (const agent of agents) {
      await query(
        `INSERT INTO ai_agents (id, name, role, allowed_actions, system_prompt, tools, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [agent.id, agent.name, agent.role, JSON.stringify(agent.allowedActions), agent.systemPrompt, JSON.stringify(agent.tools), agent.status]
      );
    }
  }

  const workflowCount = await queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM workflows`);
  if (Number(workflowCount?.count ?? 0) === 0) {
    await query(
      `INSERT INTO workflows (id, name, trigger_type, rule, actions, status)
       VALUES ($1, $2, $3, $4, $5, 'active')`,
      [
        "price-question-to-consult-and-task",
        "Khách hỏi giá -> AI tư vấn -> phân loại lead -> tạo task chăm sóc",
        "message_intent",
        JSON.stringify({ anyKeywords: ["giá", "bao nhiêu", "báo giá", "size", "kích thước"] }),
        JSON.stringify([
          { agentId: "product-consultant", action: "answer_price" },
          { agentId: "lead-classification", action: "classify_lead" },
          { agentId: "closing", action: "create_follow_up_task" },
        ]),
      ]
    );
  }

  const knowledgeCount = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM knowledge_documents WHERE source = 'system-seed'`
  );
  if (Number(knowledgeCount?.count ?? 0) === 0) {
    const seedDocs: Array<Pick<KnowledgeDocument, "title" | "category" | "status" | "content" | "summary" | "tags" | "source">> = [
      {
        title: "Bảng giá GSF150 khung giường nâng hạ",
        category: "pricing",
        status: "active",
        summary: "Giá mẫu GSF150 theo size để AI tư vấn không bịa.",
        tags: ["GSF150", "giá", "size", "khung nâng hạ"],
        source: "system-seed",
        content:
          "GSF150 Single Bed: 0,9m x 2m giá 9.790.000đ; 1m2 x 2m giá 10.990.000đ; 1m4 x 2m giá 11.990.000đ; 1m6 x 2m giá 12.490.000đ; 1m8 x 2m giá 13.890.000đ. GSF150 Double Bed: 1m6 x 2m giá 19.580.000đ; 1m8 x 2m giá 19.580.000đ; đặt size theo lòng giường thì báo nhân viên kiểm tra.",
      },
      {
        title: "Chính sách giao lắp và bảo hành SmartFurni",
        category: "policies",
        status: "active",
        summary: "Các chính sách thường dùng khi tư vấn.",
        tags: ["bảo hành", "giao lắp", "chính sách"],
        source: "system-seed",
        content:
          "SmartFurni hỗ trợ giao lắp tận nơi theo khu vực phục vụ. Motor/khung nâng hạ được tư vấn bảo hành theo từng dòng sản phẩm. Khi chưa chắc khu vực hoặc phí vận chuyển, AI phải báo cần nhân viên xác nhận.",
      },
      {
        title: "Kịch bản xử lý khách hỏi giá",
        category: "sales_process",
        status: "active",
        summary: "Quy trình tư vấn khi khách hỏi giá.",
        tags: ["hỏi giá", "báo giá", "sale"],
        source: "system-seed",
        content:
          "Khi khách hỏi giá, hãy hỏi thêm size lòng giường, khu vực giao lắp, loại nệm đang dùng và nhu cầu chính. Nếu khách đã có size rõ ràng, tư vấn giá tương ứng và đề xuất nhân viên gọi xác nhận trong ngày.",
      },
    ];

    for (const doc of seedDocs) {
      await createKnowledgeDocument(doc);
    }
  }
}

function mapKnowledge(row: Record<string, unknown>): KnowledgeDocument {
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    category: String(row.category ?? "faq") as KnowledgeCategory,
    status: String(row.status ?? "draft") as KnowledgeStatus,
    content: String(row.content ?? ""),
    summary: row.summary ? String(row.summary) : undefined,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    source: row.source ? String(row.source) : undefined,
    metadata: asJson<Record<string, unknown>>(row.metadata, {}),
    createdBy: row.created_by ? String(row.created_by) : undefined,
    updatedBy: row.updated_by ? String(row.updated_by) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapCustomer(row: Record<string, unknown>): BusinessCustomer {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
    leadSource: row.lead_source ? String(row.lead_source) : undefined,
    interestedProducts: Array.isArray(row.interested_products) ? row.interested_products.map(String) : [],
    preferredSize: row.preferred_size ? String(row.preferred_size) : undefined,
    preferredColor: row.preferred_color ? String(row.preferred_color) : undefined,
    budget: row.budget == null ? undefined : Number(row.budget),
    location: row.location ? String(row.location) : undefined,
    conversationSummary: row.conversation_summary ? String(row.conversation_summary) : undefined,
    temperature: String(row.temperature ?? "cold") as LeadTemperature,
    leadScore: Number(row.lead_score ?? 0),
    mainPainPoint: row.main_pain_point ? String(row.main_pain_point) : undefined,
    aiNextStep: row.ai_next_step ? String(row.ai_next_step) : undefined,
    ownerId: row.owner_id ? String(row.owner_id) : undefined,
    ownerName: row.owner_name ? String(row.owner_name) : undefined,
    metadata: asJson<Record<string, unknown>>(row.metadata, {}),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapAgent(row: Record<string, unknown>): AiAgentDefinition {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    role: String(row.role ?? ""),
    allowedActions: asJson<string[]>(row.allowed_actions, []),
    systemPrompt: String(row.system_prompt ?? ""),
    tools: asJson<string[]>(row.tools, []),
    status: String(row.status ?? "active") as "active" | "inactive",
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

function mapAction(row: Record<string, unknown>): AgentActionLog {
  return {
    id: String(row.id),
    agentId: String(row.agent_id ?? ""),
    agentName: row.agent_name ? String(row.agent_name) : undefined,
    customerId: row.customer_id ? String(row.customer_id) : undefined,
    actionType: String(row.action_type ?? ""),
    prompt: row.prompt ? String(row.prompt) : undefined,
    referencedDocumentIds: Array.isArray(row.referenced_document_ids) ? row.referenced_document_ids.map(String) : [],
    input: asJson<Record<string, unknown>>(row.input, {}),
    output: asJson<Record<string, unknown>>(row.output, {}),
    status: String(row.status ?? "success") as AgentActionLog["status"],
    durationMs: Number(row.duration_ms ?? 0),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

export async function listKnowledgeDocuments(filters?: {
  search?: string;
  category?: KnowledgeCategory | "all";
  status?: KnowledgeStatus | "all";
  limit?: number;
}) {
  await initBusinessBrainSchema();
  const params: unknown[] = [];
  const where: string[] = [];
  let idx = 1;

  if (filters?.category && filters.category !== "all") {
    where.push(`category = $${idx++}`);
    params.push(filters.category);
  }
  if (filters?.status && filters.status !== "all") {
    where.push(`status = $${idx++}`);
    params.push(filters.status);
  }
  if (filters?.search) {
    where.push(`(title ILIKE $${idx} OR content ILIKE $${idx} OR summary ILIKE $${idx})`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  let sql = `SELECT * FROM knowledge_documents`;
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += ` ORDER BY updated_at DESC LIMIT $${idx}`;
  params.push(filters?.limit ?? 80);

  const rows = await query<Record<string, unknown>>(sql, params);
  return rows.map(mapKnowledge);
}

export async function searchKnowledge(queryText: string, limit = 5) {
  const docs = await listKnowledgeDocuments({ status: "active", limit: 200 });
  return docs
    .map(doc => ({ doc, score: scoreText(queryText, `${doc.title} ${doc.summary ?? ""} ${doc.tags.join(" ")} ${doc.content}`) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.doc);
}

export async function createKnowledgeDocument(input: Partial<KnowledgeDocument> & {
  title: string;
  category: KnowledgeCategory;
  content: string;
}) {
  await initBusinessBrainSchema();
  const id = input.id || randomUUID();
  const tags = input.tags ?? [];
  const metadata = input.metadata ?? {};
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO knowledge_documents
      (id, title, category, status, content, summary, tags, source, metadata, created_by, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [
      id,
      input.title,
      input.category,
      input.status ?? "draft",
      input.content,
      input.summary ?? null,
      tags,
      input.source ?? "manual",
      JSON.stringify(metadata),
      input.createdBy ?? null,
      input.updatedBy ?? input.createdBy ?? null,
    ]
  );
  return mapKnowledge(rows[0]);
}

export async function updateKnowledgeDocument(id: string, input: Partial<KnowledgeDocument>) {
  await initBusinessBrainSchema();
  const rows = await query<Record<string, unknown>>(
    `UPDATE knowledge_documents
     SET title = COALESCE($2, title),
         category = COALESCE($3, category),
         status = COALESCE($4, status),
         content = COALESCE($5, content),
         summary = COALESCE($6, summary),
         tags = COALESCE($7, tags),
         source = COALESCE($8, source),
         metadata = COALESCE($9::jsonb, metadata),
         updated_by = COALESCE($10, updated_by),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.title ?? null,
      input.category ?? null,
      input.status ?? null,
      input.content ?? null,
      input.summary ?? null,
      input.tags ?? null,
      input.source ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.updatedBy ?? null,
    ]
  );
  return rows[0] ? mapKnowledge(rows[0]) : null;
}

export async function deleteKnowledgeDocument(id: string) {
  await initBusinessBrainSchema();
  await query(`DELETE FROM knowledge_documents WHERE id = $1`, [id]);
}

export async function listCustomers(search?: string) {
  await initBusinessBrainSchema();
  const params: unknown[] = [];
  let sql = `SELECT * FROM customers`;
  if (search) {
    sql += ` WHERE name ILIKE $1 OR phone ILIKE $1 OR EXISTS (
      SELECT 1 FROM unnest(interested_products) AS p(product_name) WHERE p.product_name ILIKE $1
    )`;
    params.push(`%${search}%`);
  }
  sql += ` ORDER BY updated_at DESC LIMIT 80`;
  const rows = await query<Record<string, unknown>>(sql, params);
  return rows.map(mapCustomer);
}

export async function getCustomer(id: string) {
  await initBusinessBrainSchema();
  const row = await queryOne<Record<string, unknown>>(`SELECT * FROM customers WHERE id = $1`, [id]);
  return row ? mapCustomer(row) : null;
}

export async function upsertCustomer(input: Partial<BusinessCustomer> & { phone: string; name?: string }) {
  await initBusinessBrainSchema();
  const id = input.id || randomUUID();
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO customers
      (id, name, phone, lead_source, interested_products, preferred_size, preferred_color, budget, location,
       conversation_summary, temperature, lead_score, main_pain_point, ai_next_step, owner_id, owner_name, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     ON CONFLICT (phone) DO UPDATE SET
       name = COALESCE(EXCLUDED.name, customers.name),
       lead_source = COALESCE(EXCLUDED.lead_source, customers.lead_source),
       interested_products = CASE WHEN array_length(EXCLUDED.interested_products, 1) IS NULL THEN customers.interested_products ELSE EXCLUDED.interested_products END,
       preferred_size = COALESCE(EXCLUDED.preferred_size, customers.preferred_size),
       preferred_color = COALESCE(EXCLUDED.preferred_color, customers.preferred_color),
       budget = COALESCE(EXCLUDED.budget, customers.budget),
       location = COALESCE(EXCLUDED.location, customers.location),
       conversation_summary = COALESCE(EXCLUDED.conversation_summary, customers.conversation_summary),
       temperature = COALESCE(EXCLUDED.temperature, customers.temperature),
       lead_score = GREATEST(EXCLUDED.lead_score, customers.lead_score),
       main_pain_point = COALESCE(EXCLUDED.main_pain_point, customers.main_pain_point),
       ai_next_step = COALESCE(EXCLUDED.ai_next_step, customers.ai_next_step),
       owner_id = COALESCE(EXCLUDED.owner_id, customers.owner_id),
       owner_name = COALESCE(EXCLUDED.owner_name, customers.owner_name),
       metadata = customers.metadata || EXCLUDED.metadata,
       updated_at = NOW()
     RETURNING *`,
    [
      id,
      input.name ?? "",
      input.phone,
      input.leadSource ?? null,
      input.interestedProducts ?? [],
      input.preferredSize ?? null,
      input.preferredColor ?? null,
      input.budget ?? null,
      input.location ?? null,
      input.conversationSummary ?? null,
      input.temperature ?? "cold",
      input.leadScore ?? 0,
      input.mainPainPoint ?? null,
      input.aiNextStep ?? null,
      input.ownerId ?? null,
      input.ownerName ?? null,
      JSON.stringify(input.metadata ?? {}),
    ]
  );
  return mapCustomer(rows[0]);
}

export async function addConversation(input: Omit<CustomerConversation, "id" | "createdAt">) {
  await initBusinessBrainSchema();
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO conversations (id, customer_id, channel, direction, message, author_type, author_name, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [randomUUID(), input.customerId, input.channel, input.direction, input.message, input.authorType, input.authorName ?? null, JSON.stringify(input.metadata ?? {})]
  );
  return {
    id: String(rows[0].id),
    customerId: String(rows[0].customer_id),
    channel: String(rows[0].channel) as CustomerConversation["channel"],
    direction: String(rows[0].direction) as CustomerConversation["direction"],
    message: String(rows[0].message),
    authorType: String(rows[0].author_type) as CustomerConversation["authorType"],
    authorName: rows[0].author_name ? String(rows[0].author_name) : undefined,
    metadata: asJson<Record<string, unknown>>(rows[0].metadata, {}),
    createdAt: new Date(String(rows[0].created_at)).toISOString(),
  };
}

export async function listConversations(customerId: string) {
  await initBusinessBrainSchema();
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM conversations WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [customerId]
  );
  return rows.map(row => ({
    id: String(row.id),
    customerId: String(row.customer_id),
    channel: String(row.channel) as CustomerConversation["channel"],
    direction: String(row.direction) as CustomerConversation["direction"],
    message: String(row.message),
    authorType: String(row.author_type) as CustomerConversation["authorType"],
    authorName: row.author_name ? String(row.author_name) : undefined,
    metadata: asJson<Record<string, unknown>>(row.metadata, {}),
    createdAt: new Date(String(row.created_at)).toISOString(),
  }));
}

export async function listAgents() {
  await initBusinessBrainSchema();
  const rows = await query<Record<string, unknown>>(`SELECT * FROM ai_agents ORDER BY created_at ASC`);
  return rows.map(mapAgent);
}

export async function updateAgent(id: string, input: Partial<AiAgentDefinition>) {
  await initBusinessBrainSchema();
  const rows = await query<Record<string, unknown>>(
    `UPDATE ai_agents
     SET name = COALESCE($2, name),
         role = COALESCE($3, role),
         allowed_actions = COALESCE($4::jsonb, allowed_actions),
         system_prompt = COALESCE($5, system_prompt),
         tools = COALESCE($6::jsonb, tools),
         status = COALESCE($7, status),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      input.name ?? null,
      input.role ?? null,
      input.allowedActions ? JSON.stringify(input.allowedActions) : null,
      input.systemPrompt ?? null,
      input.tools ? JSON.stringify(input.tools) : null,
      input.status ?? null,
    ]
  );
  return rows[0] ? mapAgent(rows[0]) : null;
}

export async function getAgent(id: string) {
  await initBusinessBrainSchema();
  const row = await queryOne<Record<string, unknown>>(`SELECT * FROM ai_agents WHERE id = $1`, [id]);
  return row ? mapAgent(row) : null;
}

export async function logAgentAction(input: Omit<AgentActionLog, "id" | "createdAt">) {
  await initBusinessBrainSchema();
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO agent_actions
      (id, agent_id, customer_id, action_type, prompt, referenced_document_ids, input, output, status, duration_ms)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      randomUUID(),
      input.agentId,
      input.customerId ?? null,
      input.actionType,
      input.prompt ?? null,
      input.referencedDocumentIds ?? [],
      JSON.stringify(input.input ?? {}),
      JSON.stringify(input.output ?? {}),
      input.status,
      input.durationMs,
    ]
  );
  return mapAction(rows[0]);
}

export async function listAgentActions(customerId?: string) {
  await initBusinessBrainSchema();
  const params = customerId ? [customerId] : [];
  const rows = await query<Record<string, unknown>>(
    `SELECT aa.*, ag.name AS agent_name
     FROM agent_actions aa
     LEFT JOIN ai_agents ag ON ag.id = aa.agent_id
     ${customerId ? "WHERE aa.customer_id = $1" : ""}
     ORDER BY aa.created_at DESC
     LIMIT 80`,
    params
  );
  return rows.map(mapAction);
}

export async function listWorkflows() {
  await initBusinessBrainSchema();
  const rows = await query<Record<string, unknown>>(`SELECT * FROM workflows ORDER BY created_at ASC`);
  return rows.map(row => ({
    id: String(row.id),
    name: String(row.name),
    triggerType: String(row.trigger_type) as WorkflowRule["triggerType"],
    rule: asJson<Record<string, unknown>>(row.rule, {}),
    actions: asJson<Record<string, unknown>[]>(row.actions, []),
    status: String(row.status) as "active" | "inactive",
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  }));
}

export async function createLeadScore(input: Omit<LeadScoreRecord, "id" | "createdAt">) {
  await initBusinessBrainSchema();
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO lead_scores (id, customer_id, score, temperature, reason, signals, created_by_agent_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [randomUUID(), input.customerId, input.score, input.temperature, input.reason, JSON.stringify(input.signals), input.createdByAgentId ?? null]
  );
  return {
    id: String(rows[0].id),
    customerId: String(rows[0].customer_id),
    score: Number(rows[0].score),
    temperature: String(rows[0].temperature) as LeadTemperature,
    reason: String(rows[0].reason),
    signals: asJson<string[]>(rows[0].signals, []),
    createdByAgentId: rows[0].created_by_agent_id ? String(rows[0].created_by_agent_id) : undefined,
    createdAt: new Date(String(rows[0].created_at)).toISOString(),
  };
}

export async function createBrainQuotation(input: Omit<BrainQuotation, "id" | "createdAt" | "updatedAt">) {
  await initBusinessBrainSchema();
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO business_brain_quotations
      (id, customer_id, product_name, size, color, price, deposit, shipping_fee, status, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      randomUUID(),
      input.customerId,
      input.productName,
      input.size ?? null,
      input.color ?? null,
      input.price,
      input.deposit ?? null,
      input.shippingFee ?? null,
      input.status,
      input.notes ?? null,
    ]
  );
  return {
    id: String(rows[0].id),
    customerId: String(rows[0].customer_id),
    productName: String(rows[0].product_name),
    size: rows[0].size ? String(rows[0].size) : undefined,
    color: rows[0].color ? String(rows[0].color) : undefined,
    price: Number(rows[0].price),
    deposit: rows[0].deposit == null ? undefined : Number(rows[0].deposit),
    shippingFee: rows[0].shipping_fee == null ? undefined : Number(rows[0].shipping_fee),
    status: String(rows[0].status) as BrainQuotation["status"],
    notes: rows[0].notes ? String(rows[0].notes) : undefined,
    createdAt: new Date(String(rows[0].created_at)).toISOString(),
    updatedAt: new Date(String(rows[0].updated_at)).toISOString(),
  };
}

export async function createSalesTask(input: {
  customerId: string;
  title: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
  assignedTo?: string;
  createdByAgentId?: string;
  metadata?: Record<string, unknown>;
}) {
  await initBusinessBrainSchema();
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO sales_tasks
      (id, customer_id, title, due_date, priority, assigned_to, created_by_agent_id, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [
      randomUUID(),
      input.customerId,
      input.title,
      input.dueDate,
      input.priority,
      input.assignedTo ?? null,
      input.createdByAgentId ?? null,
      JSON.stringify(input.metadata ?? {}),
    ]
  );
  return {
    id: String(rows[0].id),
    customerId: String(rows[0].customer_id),
    title: String(rows[0].title),
    dueDate: new Date(String(rows[0].due_date)).toISOString().slice(0, 10),
    priority: String(rows[0].priority) as "high" | "medium" | "low",
    status: String(rows[0].status),
    assignedTo: rows[0].assigned_to ? String(rows[0].assigned_to) : undefined,
    createdByAgentId: rows[0].created_by_agent_id ? String(rows[0].created_by_agent_id) : undefined,
    metadata: asJson<Record<string, unknown>>(rows[0].metadata, {}),
    createdAt: new Date(String(rows[0].created_at)).toISOString(),
    updatedAt: new Date(String(rows[0].updated_at)).toISOString(),
  };
}

export async function listSalesTasks(customerId?: string) {
  await initBusinessBrainSchema();
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM sales_tasks
     ${customerId ? "WHERE customer_id = $1" : ""}
     ORDER BY created_at DESC
     LIMIT 80`,
    customerId ? [customerId] : []
  );
  return rows.map(row => ({
    id: String(row.id),
    customerId: String(row.customer_id),
    title: String(row.title),
    dueDate: new Date(String(row.due_date)).toISOString().slice(0, 10),
    priority: String(row.priority) as "high" | "medium" | "low",
    status: String(row.status),
    assignedTo: row.assigned_to ? String(row.assigned_to) : undefined,
    createdByAgentId: row.created_by_agent_id ? String(row.created_by_agent_id) : undefined,
    metadata: asJson<Record<string, unknown>>(row.metadata, {}),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  }));
}

export async function getBusinessBrainReport() {
  await initBusinessBrainSchema();
  const [total, byTemperature, neglected, hotNotCalled, products, rejectionReasons] = await Promise.all([
    queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM customers`),
    query<{ temperature: LeadTemperature; count: string }>(
      `SELECT temperature, COUNT(*)::text AS count FROM customers GROUP BY temperature`
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM customers WHERE updated_at < NOW() - INTERVAL '3 days'`
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM customers WHERE temperature = 'hot' AND updated_at < NOW() - INTERVAL '12 hours'`
    ),
    query<{ product: string; count: string }>(
      `SELECT unnest(interested_products) AS product, COUNT(*)::text AS count
       FROM customers
       WHERE array_length(interested_products, 1) IS NOT NULL
       GROUP BY product
       ORDER BY COUNT(*) DESC
       LIMIT 8`
    ),
    query<{ reason: string; count: string }>(
      `SELECT COALESCE(metadata->>'rejectionReason', 'Chưa có dữ liệu') AS reason, COUNT(*)::text AS count
       FROM customers
       GROUP BY reason
       ORDER BY COUNT(*) DESC
       LIMIT 8`
    ),
  ]);

  return {
    totalLeads: Number(total?.count ?? 0),
    temperatures: byTemperature.reduce<Record<string, number>>((acc, row) => {
      acc[row.temperature] = Number(row.count);
      return acc;
    }, { hot: 0, warm: 0, cold: 0 }),
    responseRate: 0,
    closeRate: 0,
    neglectedLeads: Number(neglected?.count ?? 0),
    hotNotCalled: Number(hotNotCalled?.count ?? 0),
    staffPerformance: [],
    topProducts: products.map(row => ({ product: row.product, count: Number(row.count) })),
    rejectionReasons: rejectionReasons.map(row => ({ reason: row.reason, count: Number(row.count) })),
  };
}

export function buildSuggestedReply(message: string, docs: KnowledgeDocument[]) {
  if (docs.length === 0) {
    return "Mình chưa thấy đủ dữ liệu trong kho tri thức để trả lời chính xác. Cần nhân viên SmartFurni kiểm tra và bổ sung thông tin trước khi tư vấn.";
  }
  const priceDoc = docs.find(doc => doc.category === "pricing");
  const policyDoc = docs.find(doc => doc.category === "policies");
  const intro = message.match(/giá|bao nhiêu|báo giá|size|kích thước/i)
    ? "Em gửi anh/chị thông tin tham khảo theo dữ liệu SmartFurni đang có:"
    : "Em kiểm tra theo kho tri thức SmartFurni và gợi ý như sau:";
  const parts = [intro];
  if (priceDoc) parts.push(priceDoc.content);
  if (policyDoc) parts.push(policyDoc.summary || policyDoc.content);
  parts.push("Để báo chính xác, mình nên xác nhận thêm size lòng giường, khu vực giao lắp và loại nệm đang dùng.");
  return parts.join("\n\n");
}

export function classifyLeadFromMessage(message: string, docs: KnowledgeDocument[]) {
  const normalized = normalizeText(message);
  const signals: string[] = [];
  let score = 20;
  if (/gia|bao gia|bao nhieu|chi phi/.test(normalized)) {
    score += 25;
    signals.push("Khách hỏi giá");
  }
  if (/mua|dat|chot|coc|lap|giao/.test(normalized)) {
    score += 30;
    signals.push("Có tín hiệu mua/giao lắp");
  }
  if (/size|kich thuoc|1m|0 9m|1m8/.test(normalized)) {
    score += 15;
    signals.push("Có nhắc size/kích thước");
  }
  if (docs.length > 0) {
    score += 10;
    signals.push("Có tri thức phù hợp để tư vấn");
  }
  const safeScore = Math.max(0, Math.min(100, score));
  const temperature: LeadTemperature = safeScore >= 75 ? "hot" : safeScore >= 45 ? "warm" : "cold";
  return {
    score: safeScore,
    temperature,
    reason: signals.length ? signals.join(", ") : "Chưa đủ tín hiệu mua hàng rõ ràng",
    signals,
  };
}

export function getDefaultTaskDueDate(temperature: LeadTemperature) {
  const date = new Date();
  date.setHours(date.getHours() + (temperature === "hot" ? 2 : temperature === "warm" ? 24 : 72));
  return date.toISOString().slice(0, 10);
}
