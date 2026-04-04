import { getDb } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TriggerType =
  | "stage_changed"        // KH chuyển giai đoạn
  | "lead_created"         // KH mới được tạo
  | "no_activity_days"     // Không tương tác N ngày
  | "value_threshold"      // Giá trị vượt ngưỡng
  | "stage_duration"       // Ở giai đoạn quá N giờ
  | "lead_type_match";     // Phân loại KH khớp

export type ActionType =
  | "create_task"          // Tạo task tự động
  | "send_email"           // Gửi email
  | "assign_staff"         // Phân công nhân viên
  | "add_tag"              // Gắn nhãn
  | "notify_manager"       // Thông báo quản lý
  | "move_stage"           // Chuyển giai đoạn
  | "send_webhook"         // Gửi webhook ra ngoài
  | "send_zalo_personal"  // Gửi tin nhắn Zalo Personal
  | "send_email_workflow"; // Gửi email workflow (Email Automation tab)

export interface AutomationTrigger {
  type: TriggerType;
  // stage_changed
  fromStage?: string;
  toStage?: string;
  // no_activity_days / stage_duration
  days?: number;
  hours?: number;
  // value_threshold
  minValue?: number;
  // lead_type_match
  leadType?: string;
}

export interface AutomationAction {
  type: ActionType;
  // create_task
  taskTitle?: string;
  taskDueDays?: number;        // due in N days from now
  taskPriority?: "high" | "medium" | "low";
  // send_email / send_email_workflow
  emailTemplateId?: string;
  emailSubject?: string;
  emailBody?: string;         // Nội dung email (hỗ trợ {{name}}, {{stage}}, ...)
  emailFromName?: string;     // Tên người gửi
  emailDelayMinutes?: number; // Trì hoãn gửi (phút)
  // assign_staff
  assignMode?: "specific" | "round_robin" | "least_loaded";
  assignStaffId?: string;
  // add_tag
  tag?: string;
  // move_stage
  targetStage?: string;
  // send_webhook
  webhookUrl?: string;
  webhookPayload?: string;
  // notify_manager
  notifyMessage?: string;
  // send_zalo_personal
  zaloMessage?: string;              // Nội dung tin nhắn (hỗ trợ {{name}}, {{stage}}, {{phone}}, {{assignedTo}})
  zaloDelayMinutes?: number;         // Trì hoãn N phút trước khi gửi (0 = gửi ngay)
  zaloFallbackToAddFriend?: boolean; // Nếu chưa là bạn bè → tự động gửi lời mời kết bạn
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── SLA Config ───────────────────────────────────────────────────────────────

export interface SlaStageConfig {
  stageId: string;
  stageLabel: string;
  maxHours: number;           // max hours allowed in this stage
  warningHours: number;       // hours before warning
  escalateToManager: boolean;
}

export interface SlaConfig {
  enabled: boolean;
  stages: SlaStageConfig[];
  firstResponseHours: number; // max hours to first contact after lead created
}

// ─── Auto-assign Config ───────────────────────────────────────────────────────

export interface AssignmentRule {
  id: string;
  province: string;           // tỉnh/thành phố
  districts: string[];        // quận/huyện (empty = all)
  staffId: string;
  staffName: string;
  leadTypes: string[];        // empty = all types
  priority: number;           // lower = higher priority
}

export interface AutoAssignConfig {
  enabled: boolean;
  defaultMode: "round_robin" | "least_loaded" | "manual";
  rules: AssignmentRule[];
  fallbackStaffId: string;    // if no rule matches
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: "rule_followup",
    name: "Nhắc follow-up sau 3 ngày",
    description: "Tạo task gọi điện nếu KH không được tương tác quá 3 ngày",
    enabled: true,
    trigger: { type: "no_activity_days", days: 3 },
    actions: [{
      type: "create_task",
      taskTitle: "Gọi follow-up khách hàng",
      taskDueDays: 0,
      taskPriority: "high",
    }],
    runCount: 0,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule_won_email",
    name: "Email chúc mừng khi chốt đơn",
    description: "Gửi email cảm ơn tự động khi KH chuyển sang trạng thái Đã chốt",
    enabled: true,
    trigger: { type: "stage_changed", toStage: "won" },
    actions: [{
      type: "send_email",
      emailSubject: "Cảm ơn quý khách đã tin tưởng SmartFurni",
    }],
    runCount: 0,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "rule_vip_notify",
    name: "Thông báo KH VIP",
    description: "Thông báo quản lý khi có lead giá trị trên 500 triệu",
    enabled: true,
    trigger: { type: "value_threshold", minValue: 500000000 },
    actions: [{
      type: "notify_manager",
      notifyMessage: "Có khách hàng tiềm năng giá trị cao cần ưu tiên",
    }, {
      type: "add_tag",
      tag: "VIP",
    }],
    runCount: 0,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const DEFAULT_SLA: SlaConfig = {
  enabled: true,
  firstResponseHours: 24,
  stages: [
    { stageId: "new", stageLabel: "Khách hàng mới", maxHours: 24, warningHours: 12, escalateToManager: true },
    { stageId: "profile_sent", stageLabel: "Đã gửi Profile", maxHours: 72, warningHours: 48, escalateToManager: false },
    { stageId: "surveyed", stageLabel: "Đã khảo sát", maxHours: 48, warningHours: 24, escalateToManager: false },
    { stageId: "quoted", stageLabel: "Đã báo giá", maxHours: 120, warningHours: 72, escalateToManager: false },
    { stageId: "negotiating", stageLabel: "Thương thảo", maxHours: 168, warningHours: 120, escalateToManager: true },
  ],
};

export const DEFAULT_AUTO_ASSIGN: AutoAssignConfig = {
  enabled: false,
  defaultMode: "round_robin",
  rules: [],
  fallbackStaffId: "",
};

// ─── Store Functions ──────────────────────────────────────────────────────────

async function ensureTable(db: Awaited<ReturnType<typeof getDb>>) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_automation (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function getAutomationRules(): Promise<AutomationRule[]> {
  try {
    const db = await getDb();
    await ensureTable(db);
    const res = await db.query(`SELECT value FROM crm_automation WHERE key = 'rules'`);
    if (res.rows.length === 0) return DEFAULT_AUTOMATION_RULES;
    return res.rows[0].value as AutomationRule[];
  } catch {
    return DEFAULT_AUTOMATION_RULES;
  }
}

export async function saveAutomationRules(rules: AutomationRule[]): Promise<void> {
  const db = await getDb();
  await ensureTable(db);
  await db.query(
    `INSERT INTO crm_automation (key, value, updated_at) VALUES ('rules', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify(rules)]
  );
}

export async function getSlaConfig(): Promise<SlaConfig> {
  try {
    const db = await getDb();
    await ensureTable(db);
    const res = await db.query(`SELECT value FROM crm_automation WHERE key = 'sla'`);
    if (res.rows.length === 0) return DEFAULT_SLA;
    return res.rows[0].value as SlaConfig;
  } catch {
    return DEFAULT_SLA;
  }
}

export async function saveSlaConfig(config: SlaConfig): Promise<void> {
  const db = await getDb();
  await ensureTable(db);
  await db.query(
    `INSERT INTO crm_automation (key, value, updated_at) VALUES ('sla', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify(config)]
  );
}

export async function getAutoAssignConfig(): Promise<AutoAssignConfig> {
  try {
    const db = await getDb();
    await ensureTable(db);
    const res = await db.query(`SELECT value FROM crm_automation WHERE key = 'auto_assign'`);
    if (res.rows.length === 0) return DEFAULT_AUTO_ASSIGN;
    return res.rows[0].value as AutoAssignConfig;
  } catch {
    return DEFAULT_AUTO_ASSIGN;
  }
}

export async function saveAutoAssignConfig(config: AutoAssignConfig): Promise<void> {
  const db = await getDb();
  await ensureTable(db);
  await db.query(
    `INSERT INTO crm_automation (key, value, updated_at) VALUES ('auto_assign', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
    [JSON.stringify(config)]
  );
}

// ─── Trigger labels ───────────────────────────────────────────────────────────

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  stage_changed: "Khi chuyển giai đoạn",
  lead_created: "Khi tạo khách hàng mới",
  no_activity_days: "Không tương tác N ngày",
  value_threshold: "Giá trị vượt ngưỡng",
  stage_duration: "Ở giai đoạn quá N giờ",
  lead_type_match: "Phân loại KH khớp",
};

export const ACTION_LABELS: Record<ActionType, string> = {
  create_task: "Tạo task tự động",
  send_email: "Gửi email",
  assign_staff: "Phân công nhân viên",
  add_tag: "Gắn nhãn",
  notify_manager: "Thông báo quản lý",
  move_stage: "Chuyển giai đoạn",
  send_webhook: "Gửi webhook",
  send_zalo_personal: "Gửi tin nhắn Zalo Personal",
  send_email_workflow: "Gửi email tự động (Email Workflow)",
};
