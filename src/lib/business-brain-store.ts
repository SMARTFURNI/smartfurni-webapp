import { randomUUID } from "crypto";
import { getDb, query, queryOne } from "@/lib/db";
import { calculateKnowledgeHealth, canTransitionKnowledgeStatus } from "@/lib/business-brain-governance";
import { CRM_AUTOMATION_SPEC_DOCUMENTS } from "@/lib/business-brain-crm-automation-documents";
import type {
  AgentActionLog,
  AiAgentDefinition,
  BrainQuotation,
  BusinessCustomer,
  CustomerConversation,
  KnowledgeCategory,
  KnowledgeDocument,
  KnowledgeDocumentChangeRequest,
  KnowledgeDocumentVersion,
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
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);

  await query(`ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`);

  await query(`
    CREATE TABLE IF NOT EXISTS knowledge_document_change_requests (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      proposed_document JSONB NOT NULL,
      change_note TEXT NOT NULL,
      requested_by_id TEXT,
      requested_by_name TEXT,
      reviewed_by_id TEXT,
      reviewed_by_name TEXT,
      review_note TEXT,
      applied_version INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS knowledge_document_reviews (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      action TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      actor_id TEXT,
      actor_name TEXT,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS knowledge_document_versions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      tags TEXT[] DEFAULT '{}',
      source TEXT,
      metadata JSONB DEFAULT '{}'::jsonb,
      changed_by TEXT,
      change_note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(document_id, version)
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
  await query(`CREATE INDEX IF NOT EXISTS idx_knowledge_deleted ON knowledge_documents(deleted_at)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_knowledge_reviews_document ON knowledge_document_reviews(document_id, created_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_knowledge_versions_document ON knowledge_document_versions(document_id, version DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_knowledge_change_requests_document ON knowledge_document_change_requests(document_id, created_at DESC)`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_one_pending_change ON knowledge_document_change_requests(document_id) WHERE status='pending'`);
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

  const playbookCount = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM knowledge_documents WHERE source = 'business-playbook-v1'`
  );
  if (Number(playbookCount?.count ?? 0) === 0) {
    const playbooks: Array<Pick<KnowledgeDocument, "id" | "title" | "category" | "status" | "content" | "summary" | "tags" | "source" | "metadata">> = [
      {
        id: "playbook-customer-care-master",
        title: "Bản đồ tổng thể chăm sóc khách hàng SmartFurni",
        category: "customer_care",
        status: "active",
        summary: "Quy trình chuẩn từ quảng cáo, Data Pool, xác minh, phân loại đến chốt sale và hậu mãi.",
        tags: ["quy trình tổng", "Data Pool", "CRM", "Zalo OA", "Email"],
        source: "business-playbook-v1",
        content: `# Mục tiêu\nBiến mọi lead quảng cáo thành hồ sơ có người phụ trách, nhu cầu rõ ràng và bước chăm sóc tiếp theo.\n\n## Nguyên tắc vận hành\n- Sản phẩm quyết định nội dung tư vấn.\n- Loại khách quyết định chính sách bán hàng.\n- Trạng thái quyết định hành động tiếp theo.\n- Không tự gửi thông tin chưa được phê duyệt hoặc chưa đủ căn cứ liên hệ.\n\n## Đầu vào bắt buộc\nTên khách hàng, số điện thoại, email nếu có, nguồn quảng cáo, chiến dịch, sản phẩm quan tâm và thời gian tiếp nhận.\n\n## Kết quả đầu ra\nMỗi lead phải có phân khúc, sản phẩm, trạng thái, nhân viên phụ trách, lịch hẹn tiếp theo và lịch sử tương tác.`,
        metadata: {
          documentType: "process",
          owner: "Trưởng phòng Kinh doanh",
          audience: "Marketing, Sale, CSKH, Quản lý",
          reviewCycle: "Hàng quý",
          flowSteps: [
            { id: "ads", title: "Quảng cáo", description: "Google, Facebook, TikTok", owner: "Marketing", channel: "Ads", tone: "blue" },
            { id: "pool", title: "Data Pool", description: "Ghi nhận thông tin và nguồn", owner: "CRM", channel: "CRM", tone: "violet" },
            { id: "verify", title: "Gọi xác nhận", description: "Xác minh nhu cầu trong 15 phút", owner: "Sale", channel: "Hotline", tone: "amber" },
            { id: "classify", title: "Phân loại", description: "Sản phẩm, đối tượng, trạng thái", owner: "Sale", channel: "CRM Tag", tone: "emerald" },
            { id: "care", title: "Chăm sóc đa kênh", description: "Zalo OA, email, gọi lại", owner: "Sale & CSKH", channel: "Omnichannel", tone: "blue" },
            { id: "result", title: "Kết quả", description: "Chốt, nuôi dưỡng hoặc loại trừ", owner: "Quản lý", channel: "Pipeline", tone: "rose" }
          ]
        }
      },
      {
        id: "playbook-tag-taxonomy",
        title: "Chuẩn phân loại và hệ thống tag khách hàng",
        category: "governance",
        status: "active",
        summary: "Quy tắc gắn tag ba lớp để dữ liệu không trùng, không sai chính tả và dùng được cho tự động hóa.",
        tags: ["tag", "phân khúc", "sản phẩm", "trạng thái"],
        source: "business-playbook-v1",
        content: `# Cấu trúc tag bắt buộc\nMỗi khách hàng phải có tối thiểu ba lớp tag.\n\n## 1. Đối tượng\n- SEG:BAN_LE\n- SEG:DAI_LY\n- SEG:DU_AN\n- SEG:B2B\n\n## 2. Sản phẩm\n- PROD:SOFA_GIUONG\n- PROD:GIUONG_CONG_THAI_HOC\n\n## 3. Trạng thái\n- STAGE:MOI\n- STAGE:DA_XAC_NHAN\n- STAGE:DA_TU_VAN\n- STAGE:DA_BAO_GIA\n- STAGE:DANG_THUONG_LUONG\n- STAGE:DA_CHOT\n- STAGE:NUOI_DUONG\n- STAGE:KHONG_PHU_HOP\n\n## Quy tắc\nKhông tạo tag tự do nếu đã có tag chuẩn. Nhân viên phải cập nhật trạng thái sau mỗi lần liên hệ.`,
        metadata: {
          documentType: "policy",
          owner: "CRM Admin",
          audience: "Sale, CSKH, Marketing",
          reviewCycle: "Hàng tháng",
          flowSteps: [
            { id: "segment", title: "Tag đối tượng", description: "Bán lẻ, đại lý, dự án, B2B", owner: "Sale", channel: "CRM", tone: "blue" },
            { id: "product", title: "Tag sản phẩm", description: "Sofa giường hoặc giường công thái học", owner: "Sale", channel: "CRM", tone: "violet" },
            { id: "stage", title: "Tag trạng thái", description: "Mới đến đã chốt hoặc nuôi dưỡng", owner: "Sale", channel: "Pipeline", tone: "emerald" }
          ]
        }
      },
      {
        id: "playbook-retail-care",
        title: "Hành trình chăm sóc khách mua lẻ",
        category: "customer_care",
        status: "active",
        summary: "Kịch bản chăm sóc khách mua sofa giường và giường công thái học theo nhu cầu cá nhân.",
        tags: ["bán lẻ", "sofa giường", "giường công thái học", "follow-up"],
        source: "business-playbook-v1",
        content: `# Mục tiêu\nGiúp khách chọn đúng mẫu, kích thước và công năng; giảm áp lực bán hàng và tăng tỷ lệ trải nghiệm sản phẩm.\n\n## Lần liên hệ đầu\nXác nhận sản phẩm, kích thước không gian, khu vực giao, ngân sách, thời gian dự kiến mua và trở ngại chính.\n\n## Nội dung gửi\n- Ảnh và video mẫu phù hợp.\n- Kích thước, vật liệu và công năng.\n- Báo giá theo nhu cầu đã xác nhận.\n- Chính sách giao lắp và bảo hành đã được duyệt.\n\n## Follow-up\nNgày 1 gửi thông tin phù hợp; ngày 3 hỏi phản hồi; ngày 7 xử lý băn khoăn; sau đó chuyển nuôi dưỡng nếu khách chưa sẵn sàng.`,
        metadata: {
          documentType: "journey",
          owner: "Trưởng nhóm Bán lẻ",
          audience: "Sale bán lẻ, CSKH",
          reviewCycle: "Hàng tháng",
          flowSteps: [
            { id: "need", title: "Khám phá nhu cầu", description: "Không gian, size, ngân sách", owner: "Sale", channel: "Gọi điện", tone: "blue" },
            { id: "recommend", title: "Tư vấn mẫu", description: "Gửi 2–3 lựa chọn phù hợp", owner: "Sale", channel: "Zalo OA", tone: "violet" },
            { id: "quote", title: "Báo giá", description: "Giá, giao lắp, bảo hành", owner: "Sale", channel: "Zalo & Email", tone: "amber" },
            { id: "follow", title: "Chăm sóc lại", description: "Ngày 3 và ngày 7", owner: "CRM", channel: "Task", tone: "emerald" },
            { id: "close", title: "Chốt hoặc nuôi dưỡng", description: "Cập nhật lý do và bước tiếp", owner: "Sale", channel: "Pipeline", tone: "rose" }
          ]
        }
      },
      {
        id: "playbook-b2b-care",
        title: "Hành trình đại lý, dự án và khách hàng B2B",
        category: "customer_care",
        status: "active",
        summary: "Quy trình khai thác cơ hội sỉ, đại lý, dự án và hợp đồng doanh nghiệp.",
        tags: ["B2B", "đại lý", "dự án", "khách sỉ"],
        source: "business-playbook-v1",
        content: `# Mục tiêu\nXác định đúng vai trò người liên hệ, quy mô cơ hội, tiêu chí kỹ thuật và quy trình ra quyết định.\n\n## Thông tin cần thu thập\nLoại hình doanh nghiệp, người quyết định, khu vực, số lượng, hồ sơ kỹ thuật, ngân sách, tiến độ, yêu cầu mẫu và điều kiện thanh toán.\n\n## Bộ tài liệu gửi\nHồ sơ năng lực, catalogue, bảng giá phù hợp phân khúc, thông số kỹ thuật, mẫu vật liệu, case study và chính sách hợp tác đã duyệt.\n\n## Kiểm soát\nBáo giá đặc biệt, chiết khấu, cam kết tiến độ và điều khoản hợp đồng phải qua người có thẩm quyền phê duyệt.`,
        metadata: {
          documentType: "journey",
          owner: "Giám đốc Kinh doanh B2B",
          audience: "Sale B2B, Dự án, Kế toán, Quản lý",
          reviewCycle: "Hàng quý",
          flowSteps: [
            { id: "qualify", title: "Thẩm định cơ hội", description: "Vai trò, quy mô, thời gian", owner: "Sale B2B", channel: "Gọi & Email", tone: "blue" },
            { id: "solution", title: "Đề xuất giải pháp", description: "Mẫu, thông số, khối lượng", owner: "Kỹ thuật & Sale", channel: "Meeting", tone: "violet" },
            { id: "commercial", title: "Báo giá thương mại", description: "Giá, chiết khấu, thanh toán", owner: "Quản lý", channel: "Email", tone: "amber" },
            { id: "negotiate", title: "Thương lượng", description: "Điều khoản và tiến độ", owner: "Sale B2B", channel: "CRM", tone: "emerald" },
            { id: "contract", title: "Hợp đồng & triển khai", description: "Bàn giao cho vận hành", owner: "Các phòng ban", channel: "Workflow", tone: "rose" }
          ]
        }
      },
      {
        id: "playbook-channel-automation",
        title: "Quy tắc chăm sóc đa kênh và tự động hóa",
        category: "automation",
        status: "active",
        summary: "Phân vai Zalo OA, Email Marketing, cuộc gọi, task và remarketing trong từng giai đoạn.",
        tags: ["Zalo OA", "Email Marketing", "automation", "remarketing"],
        source: "business-playbook-v1",
        content: `# Phân vai kênh\n- Cuộc gọi: xác minh nhu cầu, xử lý vấn đề phức tạp và chốt bước tiếp theo.\n- Zalo OA: hội thoại tư vấn, gửi mẫu tin được duyệt và chăm sóc sau bán đúng chính sách.\n- Email: catalogue, hồ sơ năng lực, case study, báo giá và tài liệu dài.\n- CRM Task: đảm bảo nhân viên không bỏ quên lịch hẹn.\n- Remarketing: nhắc lại đúng sản phẩm, loại trừ khách không phù hợp hoặc đã yêu cầu dừng.\n\n## Cổng an toàn trước tự động hóa\nCó căn cứ liên hệ; đúng đối tượng; đúng trạng thái; nội dung đã duyệt; đủ dữ liệu biến; không trùng lịch; có giới hạn tần suất; lưu nhật ký và cho phép dừng.\n\n## Nguyên tắc triển khai chức năng\nMỗi chức năng CRM mới phải dẫn chiếu tài liệu đang ở trạng thái Đang dùng, xác định chủ sở hữu và có tiêu chí nghiệm thu.`,
        metadata: {
          documentType: "policy",
          owner: "CRM Admin & Ban điều hành",
          audience: "Marketing, Sale, CSKH, Kỹ thuật",
          reviewCycle: "Hàng tháng",
          flowSteps: [
            { id: "trigger", title: "Sự kiện CRM", description: "Lead mới hoặc đổi trạng thái", owner: "CRM", channel: "Event", tone: "blue" },
            { id: "check", title: "Kiểm tra điều kiện", description: "Quyền, tag, dữ liệu, tần suất", owner: "Automation", channel: "Rules", tone: "violet" },
            { id: "approve", title: "Phê duyệt", description: "Nếu hành động có rủi ro", owner: "Quản lý", channel: "Approval", tone: "amber" },
            { id: "execute", title: "Thực hiện", description: "Zalo, email, task hoặc ads", owner: "Agent", channel: "Omnichannel", tone: "emerald" },
            { id: "audit", title: "Đo lường & audit", description: "Kết quả, lỗi, chi phí", owner: "Quản lý", channel: "Report", tone: "rose" }
          ]
        }
      }
    ];
    for (const doc of playbooks) await createKnowledgeDocument(doc);
  }

  // Nạp từng tài liệu theo ID để môi trường đã có dữ liệu vẫn nhận đủ bộ đặc tả.
  // ON CONFLICT bảo đảm nhiều instance khởi động đồng thời không tạo trùng và không ghi đè bản đã chỉnh sửa.
  for (const specification of CRM_AUTOMATION_SPEC_DOCUMENTS) {
    const inserted = await query<{ id: string }>(
      `INSERT INTO knowledge_documents
        (id, title, category, status, content, summary, tags, source, metadata, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [
        specification.id,
        specification.title,
        specification.category,
        specification.status,
        specification.content,
        specification.summary,
        specification.tags,
        specification.source,
        JSON.stringify(specification.metadata),
        specification.createdBy,
        specification.updatedBy,
      ]
    );
    if (inserted[0]) {
      await snapshotKnowledgeDocument(specification.id, specification.createdBy, "Nhập bộ đặc tả CRM SmartFurni v1.0");
    } else {
      // Bổ sung các trường liên kết lập trình còn thiếu mà không ghi đè nội dung doanh nghiệp đã chỉnh sửa.
      // Đây là migration một lần được thực hiện trong đợt nâng cấp cơ chế quản trị tài liệu.
      const backfilled = await query<{ id: string }>(
        `UPDATE knowledge_documents
         SET metadata=$2::jsonb || metadata
         WHERE id=$1 AND deleted_at IS NULL
           AND NOT (metadata ? 'linkedCrmModules' AND metadata ? 'developmentRequirements'
                    AND metadata ? 'acceptanceCriteria' AND metadata ? 'aiProgrammingPrompt'
                    AND metadata ? 'codeVersion' AND metadata ? 'implementationStatus')
         RETURNING id`,
        [specification.id, JSON.stringify(specification.metadata)],
      );
      if (backfilled[0]) {
        await snapshotKnowledgeDocument(specification.id, "SmartFurni System Migration", "Bổ sung liên kết đặc tả với chức năng CRM và tiêu chí nghiệm thu");
      }
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
    deletedAt: row.deleted_at ? new Date(String(row.deleted_at)).toISOString() : undefined,
  };
}

function mapKnowledgeVersion(row: Record<string, unknown>): KnowledgeDocumentVersion {
  return {
    id: String(row.id),
    documentId: String(row.document_id),
    version: Number(row.version || 1),
    title: String(row.title || ""),
    category: String(row.category || "faq") as KnowledgeCategory,
    status: String(row.status || "draft") as KnowledgeStatus,
    content: String(row.content || ""),
    summary: row.summary ? String(row.summary) : undefined,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    source: row.source ? String(row.source) : undefined,
    metadata: asJson<Record<string, unknown>>(row.metadata, {}),
    changedBy: row.changed_by ? String(row.changed_by) : undefined,
    changeNote: row.change_note ? String(row.change_note) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function mapKnowledgeChangeRequest(row: Record<string, unknown>): KnowledgeDocumentChangeRequest {
  return {
    id: String(row.id),
    documentId: String(row.document_id),
    documentTitle: String(row.document_title || ""),
    status: String(row.status || "pending") as KnowledgeDocumentChangeRequest["status"],
    proposedDocument: asJson<Partial<KnowledgeDocument>>(row.proposed_document, {}),
    changeNote: String(row.change_note || ""),
    requestedById: row.requested_by_id ? String(row.requested_by_id) : undefined,
    requestedByName: row.requested_by_name ? String(row.requested_by_name) : undefined,
    reviewedById: row.reviewed_by_id ? String(row.reviewed_by_id) : undefined,
    reviewedByName: row.reviewed_by_name ? String(row.reviewed_by_name) : undefined,
    reviewNote: row.review_note ? String(row.review_note) : undefined,
    appliedVersion: row.applied_version == null ? undefined : Number(row.applied_version),
    createdAt: new Date(String(row.created_at)).toISOString(),
    reviewedAt: row.reviewed_at ? new Date(String(row.reviewed_at)).toISOString() : undefined,
  };
}

async function snapshotKnowledgeDocument(documentId: string, changedBy?: string, changeNote?: string) {
  await query(
    `INSERT INTO knowledge_document_versions
      (id,document_id,version,title,category,status,content,summary,tags,source,metadata,changed_by,change_note)
     SELECT $2,id,COALESCE((SELECT MAX(version)+1 FROM knowledge_document_versions WHERE document_id=$1),1),
       title,category,status,content,summary,tags,source,metadata,$3,$4
     FROM knowledge_documents WHERE id=$1`,
    [documentId, randomUUID(), changedBy || null, changeNote || null],
  );
}

export async function listKnowledgeDocumentVersions(documentId: string) {
  await initBusinessBrainSchema();
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM knowledge_document_versions WHERE document_id=$1 ORDER BY version DESC LIMIT 60`,
    [documentId],
  );
  return rows.map(mapKnowledgeVersion);
}

export async function restoreKnowledgeDocumentVersion(documentId: string, versionId: string, actor?: string) {
  await initBusinessBrainSchema();
  const version = await queryOne<Record<string, unknown>>(
    `SELECT * FROM knowledge_document_versions WHERE id=$1 AND document_id=$2`,
    [versionId, documentId],
  );
  if (!version) return null;
  const restored = await updateKnowledgeDocument(documentId, {
    title: String(version.title || ""),
    category: String(version.category || "faq") as KnowledgeCategory,
    // A restored snapshot must be reviewed again before it can become an AI source.
    status: "draft",
    content: String(version.content || ""),
    summary: version.summary ? String(version.summary) : undefined,
    tags: Array.isArray(version.tags) ? version.tags.map(String) : [],
    source: version.source ? String(version.source) : "manual",
    metadata: asJson<Record<string, unknown>>(version.metadata, {}),
    updatedBy: actor,
  }, { skipSnapshot: true });
  if (restored) await snapshotKnowledgeDocument(documentId, actor, `Khôi phục phiên bản ${Number(version.version || 1)}`);
  return restored;
}

export async function createKnowledgeDocumentChangeRequest(input: {
  documentId: string;
  proposedDocument: Partial<KnowledgeDocument>;
  changeNote: string;
  requestedById?: string;
  requestedByName?: string;
}) {
  await initBusinessBrainSchema();
  const document = await queryOne<Record<string, unknown>>(
    `SELECT id,title FROM knowledge_documents WHERE id=$1 AND deleted_at IS NULL`,
    [input.documentId],
  );
  if (!document) return null;
  const proposal: Partial<KnowledgeDocument> = {};
  for (const key of ["title", "category", "content", "summary", "tags", "source", "metadata"] as const) {
    if (input.proposedDocument[key] !== undefined) {
      (proposal as Record<string, unknown>)[key] = input.proposedDocument[key];
    }
  }
  if (!Object.keys(proposal).length) throw new Error("Yêu cầu thay đổi chưa có nội dung cập nhật.");
  if (!input.changeNote.trim()) throw new Error("Cần nêu lý do và phạm vi thay đổi để người duyệt xác nhận.");
  try {
    const rows = await query<Record<string, unknown>>(
      `INSERT INTO knowledge_document_change_requests
        (id,document_id,status,proposed_document,change_note,requested_by_id,requested_by_name)
       VALUES ($1,$2,'pending',$3::jsonb,$4,$5,$6)
       RETURNING *, $7::text AS document_title`,
      [randomUUID(), input.documentId, JSON.stringify(proposal), input.changeNote.trim(), input.requestedById || null, input.requestedByName || null, document.title],
    );
    await query(
      `INSERT INTO knowledge_document_reviews
        (id,document_id,action,from_status,to_status,actor_id,actor_name,note)
       SELECT $1,id,'Đề xuất cập nhật',status,status,$3,$4,$5 FROM knowledge_documents WHERE id=$2`,
      [randomUUID(), input.documentId, input.requestedById || null, input.requestedByName || null, input.changeNote.trim()],
    );
    return mapKnowledgeChangeRequest(rows[0]);
  } catch (error) {
    if (error instanceof Error && /idx_knowledge_one_pending_change|duplicate key/i.test(error.message)) {
      throw new Error("Tài liệu đã có một yêu cầu thay đổi đang chờ duyệt. Hãy xử lý yêu cầu đó trước.");
    }
    throw error;
  }
}

export async function createKnowledgeRestoreRequest(input: {
  documentId: string;
  versionId: string;
  changeNote: string;
  requestedById?: string;
  requestedByName?: string;
}) {
  await initBusinessBrainSchema();
  const version = await queryOne<Record<string, unknown>>(
    `SELECT * FROM knowledge_document_versions WHERE id=$1 AND document_id=$2`,
    [input.versionId, input.documentId],
  );
  if (!version) return null;
  return createKnowledgeDocumentChangeRequest({
    documentId: input.documentId,
    proposedDocument: {
      title: String(version.title || ""),
      category: String(version.category || "faq") as KnowledgeCategory,
      content: String(version.content || ""),
      summary: version.summary ? String(version.summary) : undefined,
      tags: Array.isArray(version.tags) ? version.tags.map(String) : [],
      source: version.source ? String(version.source) : "manual",
      metadata: asJson<Record<string, unknown>>(version.metadata, {}),
    },
    changeNote: input.changeNote || `Đề xuất khôi phục phiên bản ${Number(version.version || 1)}`,
    requestedById: input.requestedById,
    requestedByName: input.requestedByName,
  });
}

export async function listKnowledgeDocumentChangeRequests(filters?: {
  documentId?: string;
  status?: KnowledgeDocumentChangeRequest["status"] | "all";
  limit?: number;
}) {
  await initBusinessBrainSchema();
  const params: unknown[] = [];
  const where: string[] = [];
  let index = 1;
  if (filters?.documentId) {
    where.push(`r.document_id=$${index++}`);
    params.push(filters.documentId);
  }
  if (filters?.status && filters.status !== "all") {
    where.push(`r.status=$${index++}`);
    params.push(filters.status);
  }
  params.push(filters?.limit || 120);
  const rows = await query<Record<string, unknown>>(
    `SELECT r.*,d.title AS document_title
     FROM knowledge_document_change_requests r
     JOIN knowledge_documents d ON d.id=r.document_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END,r.created_at DESC
     LIMIT $${index}`,
    params,
  );
  return rows.map(mapKnowledgeChangeRequest);
}

export async function decideKnowledgeDocumentChangeRequest(input: {
  requestId: string;
  decision: "approved" | "rejected";
  reviewerId?: string;
  reviewerName?: string;
  reviewNote?: string;
}) {
  await initBusinessBrainSchema();
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const requestResult = await client.query(
      `SELECT r.*,d.title AS document_title
       FROM knowledge_document_change_requests r
       JOIN knowledge_documents d ON d.id=r.document_id
       WHERE r.id=$1 FOR UPDATE OF r`,
      [input.requestId],
    );
    const request = requestResult.rows[0] as Record<string, unknown> | undefined;
    if (!request) {
      await client.query("ROLLBACK");
      return null;
    }
    if (String(request.status) !== "pending") throw new Error("Yêu cầu thay đổi này đã được xử lý.");
    if (input.decision === "rejected") {
      const rejected = await client.query(
        `UPDATE knowledge_document_change_requests
         SET status='rejected',reviewed_by_id=$2,reviewed_by_name=$3,review_note=$4,reviewed_at=NOW()
         WHERE id=$1 RETURNING *`,
        [input.requestId, input.reviewerId || null, input.reviewerName || null, input.reviewNote || null],
      );
      await client.query(
        `INSERT INTO knowledge_document_reviews
          (id,document_id,action,from_status,to_status,actor_id,actor_name,note)
         SELECT $1,id,'Từ chối cập nhật',status,status,$3,$4,$5 FROM knowledge_documents WHERE id=$2`,
        [randomUUID(), request.document_id, input.reviewerId || null, input.reviewerName || null, input.reviewNote || null],
      );
      await client.query("COMMIT");
      return { request: mapKnowledgeChangeRequest({ ...rejected.rows[0], document_title: request.document_title }), document: null };
    }

    const proposal = asJson<Partial<KnowledgeDocument>>(request.proposed_document, {});
    const currentResult = await client.query(`SELECT * FROM knowledge_documents WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`, [request.document_id]);
    const current = currentResult.rows[0] as Record<string, unknown> | undefined;
    if (!current) throw new Error("Tài liệu không còn tồn tại để áp dụng thay đổi.");
    const updatedResult = await client.query(
      `UPDATE knowledge_documents
       SET title=COALESCE($2,title),category=COALESCE($3,category),content=COALESCE($4,content),
           summary=CASE WHEN $5::boolean THEN $6 ELSE summary END,
           tags=COALESCE($7,tags),source=COALESCE($8,source),metadata=COALESCE($9::jsonb,metadata),
           updated_by=$10,updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [
        request.document_id,
        proposal.title ?? null,
        proposal.category ?? null,
        proposal.content ?? null,
        Object.hasOwn(proposal, "summary"),
        proposal.summary ?? null,
        proposal.tags ?? null,
        proposal.source ?? null,
        proposal.metadata ? JSON.stringify(proposal.metadata) : null,
        input.reviewerName || input.reviewerId || null,
      ],
    );
    const versionResult = await client.query<{ version: number }>(
      `INSERT INTO knowledge_document_versions
        (id,document_id,version,title,category,status,content,summary,tags,source,metadata,changed_by,change_note)
       SELECT $2,id,COALESCE((SELECT MAX(version)+1 FROM knowledge_document_versions WHERE document_id=$1),1),
         title,category,status,content,summary,tags,source,metadata,$3,$4
       FROM knowledge_documents WHERE id=$1 RETURNING version`,
      [request.document_id, randomUUID(), input.reviewerName || input.reviewerId || null, `Đã duyệt: ${String(request.change_note || "Cập nhật tài liệu")}`],
    );
    const appliedVersion = Number(versionResult.rows[0]?.version || 1);
    const approved = await client.query(
      `UPDATE knowledge_document_change_requests
       SET status='approved',reviewed_by_id=$2,reviewed_by_name=$3,review_note=$4,applied_version=$5,reviewed_at=NOW()
       WHERE id=$1 RETURNING *`,
      [input.requestId, input.reviewerId || null, input.reviewerName || null, input.reviewNote || null, appliedVersion],
    );
    await client.query(
      `INSERT INTO knowledge_document_reviews
        (id,document_id,action,from_status,to_status,actor_id,actor_name,note)
       VALUES ($1,$2,'Phê duyệt và áp dụng cập nhật',$3,$3,$4,$5,$6)`,
      [randomUUID(), request.document_id, current.status, input.reviewerId || null, input.reviewerName || null, input.reviewNote || request.change_note],
    );
    await client.query("COMMIT");
    return {
      request: mapKnowledgeChangeRequest({ ...approved.rows[0], document_title: updatedResult.rows[0]?.title || request.document_title }),
      document: mapKnowledge(updatedResult.rows[0]),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
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
  where.push(`deleted_at IS NULL`);

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
    .map(doc => ({
      doc,
      score: scoreText(
        queryText,
        `${doc.title} ${doc.summary ?? ""} ${doc.tags.join(" ")} ${doc.content} ${JSON.stringify(doc.metadata)}`,
      ),
    }))
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
  const document = mapKnowledge(rows[0]);
  await snapshotKnowledgeDocument(document.id, input.createdBy, "Tạo tài liệu");
  return document;
}

export async function updateKnowledgeDocument(
  id: string,
  input: Partial<KnowledgeDocument> & { changeNote?: string },
  options?: { skipSnapshot?: boolean },
) {
  await initBusinessBrainSchema();
  const current = await queryOne<Record<string, unknown>>(
    `SELECT * FROM knowledge_documents WHERE id=$1 AND deleted_at IS NULL`,
    [id],
  );
  if (!current) return null;
  const materialChange = ["title", "category", "content", "summary", "tags", "source", "metadata"]
    .some(key => input[key as keyof typeof input] !== undefined);
  const nextStatus = input.status ?? (
    materialChange && ["approved", "scheduled", "active"].includes(String(current.status)) ? "draft" : null
  );
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
      nextStatus,
      input.content ?? null,
      input.summary ?? null,
      input.tags ?? null,
      input.source ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
      input.updatedBy ?? null,
    ]
  );
  const document = rows[0] ? mapKnowledge(rows[0]) : null;
  if (document && !options?.skipSnapshot) {
    await snapshotKnowledgeDocument(id, input.updatedBy, input.changeNote || "Cập nhật tài liệu");
  }
  return document;
}

export async function deleteKnowledgeDocument(id: string, actorId?: string, actorName?: string) {
  await initBusinessBrainSchema();
  const current = await queryOne<Record<string, unknown>>(
    `SELECT status FROM knowledge_documents WHERE id=$1 AND deleted_at IS NULL`,
    [id],
  );
  if (!current) return false;
  await query(
    `UPDATE knowledge_documents
     SET deleted_at=NOW(), status='archived', updated_by=COALESCE($2, updated_by), updated_at=NOW()
     WHERE id=$1`,
    [id, actorName || actorId || null],
  );
  await query(
    `INSERT INTO knowledge_document_reviews
      (id,document_id,action,from_status,to_status,actor_id,actor_name,note)
     VALUES ($1,$2,'Chuyển vào lưu trữ',$3,'archived',$4,$5,'Xóa mềm; dữ liệu vẫn được giữ để audit')`,
    [randomUUID(), id, current.status, actorId || null, actorName || null],
  );
  return true;
}

export async function reviewKnowledgeDocument(input: {
  documentId: string;
  toStatus: KnowledgeStatus;
  action: string;
  actorId?: string;
  actorName?: string;
  note?: string;
  effectiveAt?: string;
  expiresAt?: string;
}) {
  await initBusinessBrainSchema();
  const current = await queryOne<Record<string, unknown>>(
    `SELECT * FROM knowledge_documents WHERE id=$1 AND deleted_at IS NULL`,
    [input.documentId],
  );
  if (!current) return null;
  const fromStatus = String(current.status || "draft") as KnowledgeStatus;
  if (!canTransitionKnowledgeStatus(fromStatus, input.toStatus)) {
    throw new Error(`Không thể chuyển trạng thái từ ${fromStatus} sang ${input.toStatus}.`);
  }
  const metadata = asJson<Record<string, unknown>>(current.metadata, {});
  const nextMetadata = {
    ...metadata,
    ...(input.effectiveAt ? { effectiveAt: input.effectiveAt } : {}),
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    lastReview: {
      action: input.action,
      actorId: input.actorId,
      actorName: input.actorName,
      note: input.note,
      at: nowIso(),
    },
  };
  const document = await updateKnowledgeDocument(input.documentId, {
    status: input.toStatus,
    metadata: nextMetadata,
    updatedBy: input.actorName || input.actorId,
    changeNote: input.note || input.action,
  });
  await query(
    `INSERT INTO knowledge_document_reviews
      (id,document_id,action,from_status,to_status,actor_id,actor_name,note)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [randomUUID(), input.documentId, input.action, fromStatus, input.toStatus, input.actorId || null, input.actorName || null, input.note || null],
  );
  return document;
}

export async function listKnowledgeDocumentReviews(documentId?: string) {
  await initBusinessBrainSchema();
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM knowledge_document_reviews
     ${documentId ? "WHERE document_id=$1" : ""}
     ORDER BY created_at DESC LIMIT 120`,
    documentId ? [documentId] : [],
  );
  return rows.map(row => ({
    id: String(row.id),
    documentId: String(row.document_id),
    action: String(row.action),
    fromStatus: row.from_status ? String(row.from_status) : undefined,
    toStatus: String(row.to_status),
    actorId: row.actor_id ? String(row.actor_id) : undefined,
    actorName: row.actor_name ? String(row.actor_name) : undefined,
    note: row.note ? String(row.note) : undefined,
    createdAt: new Date(String(row.created_at)).toISOString(),
  }));
}

export async function getKnowledgeGovernanceReport() {
  const documents = await listKnowledgeDocuments({ limit: 400 });
  const reviews = await listKnowledgeDocumentReviews();
  const health = documents.map(document => ({ documentId: document.id, ...calculateKnowledgeHealth(document) }));
  const averageHealth = health.length ? Math.round(health.reduce((sum, item) => sum + item.score, 0) / health.length) : 0;
  const statuses = documents.reduce<Record<string, number>>((acc, document) => {
    acc[document.status] = (acc[document.status] || 0) + 1;
    return acc;
  }, {});
  return {
    total: documents.length,
    statuses,
    averageHealth,
    healthy: health.filter(item => item.score >= 80).length,
    needsAttention: health.filter(item => item.score < 60).length,
    awaitingReview: statuses.in_review || 0,
    documents: documents.map(document => ({ document, health: health.find(item => item.documentId === document.id) })),
    recentReviews: reviews.slice(0, 30),
  };
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
