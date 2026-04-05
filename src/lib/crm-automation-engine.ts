/**
 * crm-automation-engine.ts
 * Engine thực thi tự động hoá chăm sóc khách hàng SmartFurni CRM
 *
 * Nhóm 1: Nhắc nhở & Follow-up tự động
 * Nhóm 2: Automation theo giai đoạn
 * Nhóm 3: Phân loại & ưu tiên thông minh (Hot lead, auto-assign)
 * Nhóm 4: Thông báo đa kênh (Zalo/Email theo template)
 */
import { getLeads, createTask, updateLead } from "./crm-store";
import { getAutomationRules, getAutoAssignConfig, getSlaConfig, saveAutomationRules } from "./crm-automation-store";
import { getNotificationRules, logNotification } from "./crm-notifications-store";
import type { Lead } from "./crm-types";
import type { AutomationRule, AutomationAction } from "./crm-automation-store";
import { findZaloUserByPhone, sendZaloMessage, isZaloConnected, initZaloGateway, sendZaloFriendRequest } from "./zalo-gateway";
import { getCrmSettings } from "./crm-settings-store";
import nodemailer from "nodemailer";

// Module-level init flag cho Zalo gateway
let zaloGatewayInitialized = false;
async function ensureZaloGateway(): Promise<boolean> {
  if (!zaloGatewayInitialized) {
    zaloGatewayInitialized = true;
    await initZaloGateway().catch(() => {});
  }
  let waited = 0;
  while (!isZaloConnected() && waited < 5000) {
    await new Promise((r) => setTimeout(r, 300));
    waited += 300;
  }
  return isZaloConnected();
}

const STAGE_LABELS_VI: Record<string, string> = {
  new: "Kh\u00e1ch h\u00e0ng m\u1edbi",
  profile_sent: "\u0110\u00e3 g\u1eedi Profile",
  surveyed: "\u0110\u00e3 kh\u1ea3o s\u00e1t",
  quoted: "\u0110\u00e3 b\u00e1o gi\u00e1",
  negotiating: "Th\u01b0\u01a1ng th\u1ea3o",
  won: "\u0110\u00e3 ch\u1ed1t",
  lost: "Th\u1ea5t b\u1ea1i",
};

// ─── Run log entry ─────────────────────────────────────────────────────────────
export interface AutomationRunLog {
  ruleId: string;
  ruleName: string;
  leadId: string;
  leadName: string;
  actionsExecuted: string[];
  triggeredAt: string;
  success: boolean;
  error?: string;
}

export interface AutomationRunResult {
  startedAt: string;
  finishedAt: string;
  totalLeads: number;
  totalRulesChecked: number;
  totalTriggered: number;
  logs: AutomationRunLog[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 9999;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function hoursSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 9999;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60));
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ─── Check if a rule's trigger matches a lead ─────────────────────────────────
function checkTrigger(rule: AutomationRule, lead: Lead): boolean {
  const { trigger } = rule;
  // Chỉ xử lý leads đang active (không phải won/lost)
  const activeStages = ["new", "profile_sent", "surveyed", "quoted", "negotiating"];
  if (!activeStages.includes(lead.stage)) return false;

  switch (trigger.type) {
    case "no_activity_days": {
      const days = trigger.days ?? 3;
      return daysSince(lead.lastContactAt) >= days;
    }
    case "lead_created": {
      // Trigger trong vòng 1 giờ đầu sau khi tạo
      return hoursSince(lead.createdAt) < 1;
    }
    case "value_threshold": {
      const min = trigger.minValue ?? 0;
      return lead.expectedValue >= min;
    }
    case "stage_duration": {
      const hours = trigger.hours ?? 24;
      return hoursSince(lead.updatedAt) >= hours;
    }
    case "lead_type_match": {
      return !trigger.leadType || lead.type === trigger.leadType;
    }
    case "stage_changed": {
      // stage_changed chỉ trigger khi có event, không check định kỳ
      return false;
    }
    default:
      return false;
  }
}

// ─── Execute a single action on a lead ────────────────────────────────────────
async function executeAction(
  action: AutomationAction,
  lead: Lead,
  staffList: string[],
  rule?: AutomationRule,
): Promise<string> {
  const ruleId = rule?.id ?? "manual";
  const ruleName = rule?.name ?? "Manual";
  switch (action.type) {
    case "create_task": {
      const dueDate = addDays(action.taskDueDays ?? 1);
      await createTask({
        leadId: lead.id,
        leadName: lead.name,
        title: action.taskTitle ?? `Follow-up: ${lead.name}`,
        dueDate,
        priority: action.taskPriority ?? "medium",
        done: false,
        assignedTo: lead.assignedTo ?? "",
      });
      return `Tao task "${action.taskTitle ?? "Follow-up"}" (han: ${dueDate})`;
    }

    case "add_tag": {
      const tag = action.tag ?? "";
      const currentTags = Array.isArray(lead.tags) ? lead.tags : [];
      if (tag && !currentTags.includes(tag)) {
        await updateLead(lead.id, { tags: [...currentTags, tag] });
        return `Gan tag "${tag}"`;
      }
      return `Tag "${tag}" da ton tai`;
    }

    case "assign_staff": {
      if (!staffList.length) return "Khong co nhan vien de phan cong";
      let targetStaff = action.assignStaffId ?? "";
      if (action.assignMode === "round_robin" && staffList.length > 0) {
        const hash = lead.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        targetStaff = staffList[hash % staffList.length];
      } else if (action.assignMode === "least_loaded") {
        targetStaff = staffList[0];
      }
      if (targetStaff) {
        await updateLead(lead.id, { assignedTo: targetStaff });
        return `Phan cong cho "${targetStaff}"`;
      }
      return "Bo qua phan cong";
    }

    case "move_stage": {
      const target = action.targetStage as Lead["stage"];
      if (target && target !== lead.stage) {
        await updateLead(lead.id, { stage: target });
        return `Chuyen sang giai doan "${target}"`;
      }
      return "Bo qua chuyen giai doan";
    }

    case "notify_manager": {
      const msg = (action.notifyMessage ?? "Can chu y khach hang")
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{stage\}\}/g, lead.stage)
        .replace(/\{\{value\}\}/g, lead.expectedValue.toLocaleString("vi-VN"));
      await logNotification({
        ruleId,
        ruleName,
        channel: "in_app",
        recipient: lead.phone ?? "",
        leadId: lead.id,
        leadName: lead.name,
        message: msg,
        status: "sent",
      });
      return `Thong bao quan ly: "${msg}"`;
    }

    case "send_email": {
      await logNotification({
        ruleId,
        ruleName,
        channel: "email",
        recipient: lead.email ?? "",
        leadId: lead.id,
        leadName: lead.name,
        message: action.emailSubject ?? "Thong bao tu SmartFurni CRM",
        status: "pending",
      });
      return `Xep hang gui email: "${action.emailSubject}"`;
    }

    case "send_webhook": {
      if (!action.webhookUrl) return "Bo qua webhook (khong co URL)";
      try {
        const payload = (action.webhookPayload ?? JSON.stringify({ leadId: lead.id, leadName: lead.name }))
          .replace(/\{\{leadId\}\}/g, lead.id)
          .replace(/\{\{leadName\}\}/g, lead.name)
          .replace(/\{\{stage\}\}/g, lead.stage);
        await fetch(action.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          signal: AbortSignal.timeout(5000),
        });
        return `Gui webhook den ${action.webhookUrl}`;
      } catch (e) {
        return `Loi webhook: ${e instanceof Error ? e.message : "unknown"}`;
      }
    }

    case "send_zalo_personal": {
      const phone = lead.zaloPhone || lead.phone;
      if (!phone) return "Bo qua Zalo: khong co so dien thoai";

      // Delay neu can
      const delayMs = (action.zaloDelayMinutes ?? 0) * 60 * 1000;
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));

      // Kiem tra Zalo connected
      const connected = await ensureZaloGateway();
      if (!connected) return "Bo qua Zalo: chua ket noi Zalo Personal";

      // Chuan hoa so dien thoai
      const normalizedPhone = phone.replace(/\s+/g, "").replace(/^\+84/, "0").replace(/^84/, "0");

      // Noi dung tin nhan (thay the bien)
      const rawMsg = action.zaloMessage || "Xin ch\u00e0o {{name}}! SmartFurni xin c\u1ea3m \u01a1n b\u1ea1n \u0111\u00e3 quan t\u00e2m.";
      const message = rawMsg
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{stage\}\}/g, STAGE_LABELS_VI[lead.stage] ?? lead.stage)
        .replace(/\{\{phone\}\}/g, normalizedPhone)
        .replace(/\{\{assignedTo\}\}/g, lead.assignedTo ?? "")
        .replace(/\{\{value\}\}/g, lead.expectedValue?.toLocaleString("vi-VN") ?? "0");

      // Tim userId Zalo tu S\u0110T
      const findResult = await findZaloUserByPhone(normalizedPhone);
      if (!findResult.success || !findResult.user?.uid) {
        if (action.zaloFallbackToAddFriend) {
          const friendMsg = `Xin ch\u00e0o ${lead.name}! T\u00f4i l\u00e0 nh\u00e2n vi\u00ean SmartFurni.`;
          await sendZaloFriendRequest({ userId: normalizedPhone, message: friendMsg }).catch(() => {});
          return `Khong tim thay Zalo, da gui loi moi ket ban den ${normalizedPhone}`;
        }
        return `Khong tim thay tai khoan Zalo voi so ${normalizedPhone}`;
      }

      const { uid } = findResult.user;
      const sendResult = await sendZaloMessage({ conversationId: uid, content: message });
      if (sendResult.success) {
        await logNotification({
          ruleId,
          ruleName,
          channel: "zalo",
          actionType: "zalo_personal",
          recipient: normalizedPhone,
          leadId: lead.id,
          leadName: lead.name,
          message: message.slice(0, 500),
          status: "sent",
        });
        return `Da gui Zalo den ${lead.name} (${normalizedPhone}): "${message.slice(0, 50)}..."` ;
      }

      await logNotification({
        ruleId,
        ruleName,
        channel: "zalo",
        actionType: "zalo_personal",
        recipient: normalizedPhone,
        leadId: lead.id,
        leadName: lead.name,
        message: message.slice(0, 500),
        status: "failed",
        error: sendResult.error ?? "unknown",
      });

      if (action.zaloFallbackToAddFriend) {
        const friendMsg = `Xin ch\u00e0o ${lead.name}! T\u00f4i l\u00e0 nh\u00e2n vi\u00ean SmartFurni.`;
        await sendZaloFriendRequest({ userId: uid, message: friendMsg }).catch(() => {});
        return `Gui tin nhan that bai, da gui loi moi ket ban den ${lead.name}`;
      }

      return `Loi gui Zalo: ${sendResult.error ?? "unknown"}`;
    }

    case "send_email_workflow": {
      if (!lead.email) return "Bo qua email workflow: khong co email khach hang";
      try {
        const crmSettings = await getCrmSettings();
        const emailCfg = crmSettings.email;
        const smtpHost = emailCfg?.smtpHost ?? "";
        const smtpPort = emailCfg?.smtpPort ?? 587;
        const smtpUser = emailCfg?.smtpUser ?? "";
        const smtpPass = emailCfg?.smtpPassword ?? "";
        const fromEmail = emailCfg?.senderEmail ?? emailCfg?.smtpUser ?? "";
        const fromName = (emailCfg as unknown as Record<string, unknown>)?.senderName as string ?? action.emailFromName ?? "SmartFurni";
        const secure = smtpPort === 465;
        if (!smtpHost || !smtpUser || !smtpPass) {
          await logNotification({
            ruleId, ruleName, channel: "email",
            recipient: lead.email ?? "",
            leadId: lead.id, leadName: lead.name,
            message: action.emailSubject ?? "Email tu dong",
            status: "pending",
            actionType: "send_email",
          });
          return "SMTP chua cau hinh, xep hang gui email";
        }
        const rawSubject = action.emailSubject ?? "Thong bao tu SmartFurni";
        const rawBody = action.emailBody ?? "Xin chao {{name}}!";
        const replaceVars = (t: string) => t
          .replace(/\{\{name\}\}/g, lead.name)
          .replace(/\{\{stage\}\}/g, STAGE_LABELS_VI[lead.stage] ?? lead.stage)
          .replace(/\{\{phone\}\}/g, lead.phone ?? "")
          .replace(/\{\{email\}\}/g, lead.email ?? "")
          .replace(/\{\{assignedTo\}\}/g, lead.assignedTo ?? "")
          .replace(/\{\{value\}\}/g, lead.expectedValue?.toLocaleString("vi-VN") ?? "0");
        const subject = replaceVars(rawSubject);
        const body = replaceVars(rawBody);
        const delayMs = (action.emailDelayMinutes ?? 0) * 60 * 1000;
        if (delayMs > 0) {
          await logNotification({
            ruleId, ruleName, channel: "email",
            recipient: lead.email ?? "",
            leadId: lead.id, leadName: lead.name,
            message: subject, status: "pending",
            actionType: "send_email",
          });
          return `Xep hang gui email (delay ${action.emailDelayMinutes} phut): "${subject}"`;
        }
        const transporter = nodemailer.createTransport({
          host: smtpHost, port: smtpPort, secure,
          auth: { user: smtpUser, pass: smtpPass },
        });
        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail || smtpUser}>`,
          to: lead.email,
          subject,
          text: body,
          html: body.replace(/\n/g, "<br>"),
        });
        await logNotification({
          ruleId, ruleName, channel: "email",
          recipient: lead.email ?? "",
          leadId: lead.id, leadName: lead.name,
          message: subject, status: "sent",
          actionType: "send_email",
        });
        return `Gui email thanh cong: "${subject}" den ${lead.email}`;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "unknown";
        await logNotification({
          ruleId, ruleName, channel: "email",
          recipient: lead.email ?? "",
          leadId: lead.id, leadName: lead.name,
          message: action.emailSubject ?? "Email tu dong",
          status: "failed", error: errMsg,
          actionType: "send_email",
        });
        return `Loi gui email: ${errMsg}`;
      }
    }

    default:
      return `Bo qua action khong xac dinh`;
  }
}

// ─── Nhóm 3: Smart tagging & Hot lead detection ────────────────────────────────
async function runSmartTagging(leads: Lead[]): Promise<AutomationRunLog[]> {
  const logs: AutomationRunLog[] = [];

  for (const lead of leads) {
    const activeStages = ["new", "profile_sent", "surveyed", "quoted", "negotiating"];
    if (!activeStages.includes(lead.stage)) continue;

    const actions: string[] = [];
    const newTags = [...(Array.isArray(lead.tags) ? lead.tags : [])];

    // Hot lead: gia tri cao + dang thuong thao
    if (lead.expectedValue >= 500_000_000 && lead.stage === "negotiating") {
      if (!newTags.includes("Hot Lead")) {
        newTags.push("Hot Lead");
        actions.push('Gan tag "Hot Lead" (gia tri >= 500M + Thuong thao)');
      }
    }

    // VIP: gia tri >= 1 ty
    if (lead.expectedValue >= 1_000_000_000) {
      if (!newTags.includes("VIP")) {
        newTags.push("VIP");
        actions.push('Gan tag "VIP" (gia tri >= 1 ty)');
      }
    }

    // Urgent: khong tuong tac > 7 ngay + stage active
    if (daysSince(lead.lastContactAt) >= 7 && !newTags.includes("Can theo doi")) {
      newTags.push("Can theo doi");
      actions.push('Gan tag "Can theo doi" (khong tuong tac > 7 ngay)');
    }

    // New lead chua phan cong
    if (lead.stage === "new" && (!lead.assignedTo || lead.assignedTo === "")) {
      if (!newTags.includes("Chua phan cong")) {
        newTags.push("Chua phan cong");
        actions.push('Gan tag "Chua phan cong"');
      }
    }

    if (actions.length > 0) {
      try {
        await updateLead(lead.id, { tags: newTags });
        logs.push({
          ruleId: "smart_tagging",
          ruleName: "Smart Tagging tu dong",
          leadId: lead.id,
          leadName: lead.name,
          actionsExecuted: actions,
          triggeredAt: new Date().toISOString(),
          success: true,
        });
      } catch (e) {
        logs.push({
          ruleId: "smart_tagging",
          ruleName: "Smart Tagging tu dong",
          leadId: lead.id,
          leadName: lead.name,
          actionsExecuted: actions,
          triggeredAt: new Date().toISOString(),
          success: false,
          error: e instanceof Error ? e.message : "unknown",
        });
      }
    }
  }

  return logs;
}

// ─── Nhóm 3: Auto-assign leads chưa được phân công ────────────────────────────
async function runAutoAssign(leads: Lead[]): Promise<AutomationRunLog[]> {
  const logs: AutomationRunLog[] = [];
  const config = await getAutoAssignConfig();
  if (!config.enabled) return logs;

  const unassigned = leads.filter(
    (l) => (!l.assignedTo || l.assignedTo === "") && l.stage === "new"
  );
  if (!unassigned.length) return logs;

  for (const lead of unassigned) {
    // Tim rule phu hop theo tinh/thanh pho
    const matchingRule = config.rules
      .sort((a, b) => a.priority - b.priority)
      .find((rule) => {
        const provinceMatch = !rule.province || lead.district?.includes(rule.province);
        const typeMatch = !rule.leadTypes.length || rule.leadTypes.includes(lead.type);
        return provinceMatch && typeMatch;
      });

    const targetStaff = matchingRule?.staffId || config.fallbackStaffId;
    if (!targetStaff) continue;

    try {
      await updateLead(lead.id, { assignedTo: targetStaff });
      logs.push({
        ruleId: "auto_assign",
        ruleName: "Tu dong phan cong",
        leadId: lead.id,
        leadName: lead.name,
        actionsExecuted: [`Phan cong cho "${targetStaff}" (rule: ${matchingRule?.id ?? "fallback"})`],
        triggeredAt: new Date().toISOString(),
        success: true,
      });
    } catch (e) {
      logs.push({
        ruleId: "auto_assign",
        ruleName: "Tu dong phan cong",
        leadId: lead.id,
        leadName: lead.name,
        actionsExecuted: [],
        triggeredAt: new Date().toISOString(),
        success: false,
        error: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  return logs;
}

// ─── Nhóm 1 & 2: Chạy automation rules định nghĩa sẵn ─────────────────────────
async function runAutomationRules(leads: Lead[]): Promise<AutomationRunLog[]> {
  const logs: AutomationRunLog[] = [];
  const rules = await getAutomationRules();
  const enabledRules = rules.filter((r) => r.enabled);

  // Lay danh sach nhan vien tu leads (don gian: lay unique assignedTo)
  const staffList = [...new Set(leads.map((l) => l.assignedTo).filter(Boolean))];

  const updatedRules = [...rules];

  for (const rule of enabledRules) {
    for (const lead of leads) {
      if (!checkTrigger(rule, lead)) continue;

      const actionsExecuted: string[] = [];
      let success = true;
      let error: string | undefined;

      try {
        for (const action of rule.actions) {
          const result = await executeAction(action, lead, staffList);
          actionsExecuted.push(result);
        }
        // Cap nhat runCount
        const ruleIdx = updatedRules.findIndex((r) => r.id === rule.id);
        if (ruleIdx >= 0) {
          updatedRules[ruleIdx] = {
            ...updatedRules[ruleIdx],
            runCount: (updatedRules[ruleIdx].runCount ?? 0) + 1,
            lastRunAt: new Date().toISOString(),
          };
        }
      } catch (e) {
        success = false;
        error = e instanceof Error ? e.message : "unknown";
      }

      logs.push({
        ruleId: rule.id,
        ruleName: rule.name,
        leadId: lead.id,
        leadName: lead.name,
        actionsExecuted,
        triggeredAt: new Date().toISOString(),
        success,
        error,
      });
    }
  }

  // Luu lai runCount
  try {
    await saveAutomationRules(updatedRules);
  } catch {
    // non-critical
  }

  return logs;
}

// ─── Nhóm 4: Notification rules (Zalo/Email/SMS/In-app) ───────────────────────
async function runNotificationRules(leads: Lead[]): Promise<AutomationRunLog[]> {
  const logs: AutomationRunLog[] = [];
  let notifRules: Awaited<ReturnType<typeof getNotificationRules>>;
  try {
    notifRules = await getNotificationRules();
  } catch {
    return logs;
  }

  const activeNotifRules = notifRules.filter((r) => r.isActive);

  for (const rule of activeNotifRules) {
    for (const lead of leads) {
      const activeStages = ["new", "profile_sent", "surveyed", "quoted", "negotiating"];
      if (!activeStages.includes(lead.stage)) continue;

      let shouldTrigger = false;

      switch (rule.trigger) {
        case "lead_overdue": {
          const days = rule.config.overdueDays ?? 3;
          shouldTrigger = daysSince(lead.lastContactAt) >= days;
          break;
        }
        case "task_due": {
          // Handled separately by task scheduler
          break;
        }
        case "appointment_remind": {
          // Handled separately
          break;
        }
        default:
          break;
      }

      if (!shouldTrigger) continue;

      const message = (rule.config.messageTemplate ?? "")
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{stage\}\}/g, lead.stage)
        .replace(/\{\{assignedTo\}\}/g, lead.assignedTo ?? "")
        .replace(/\{\{phone\}\}/g, lead.phone ?? "");

      const actionsExecuted: string[] = [];

      for (const channel of rule.channels) {
        try {
          await logNotification({
            ruleId: rule.id,
            ruleName: rule.name,
            channel,
            recipient: channel === "email" ? (lead.email ?? "") : (lead.phone ?? ""),
            leadId: lead.id,
            leadName: lead.name,
            message,
            status: channel === "in_app" ? "sent" : "pending",
          });

          // Gui Zalo thuc su neu co config
          if (channel === "zalo") {
            actionsExecuted.push(`Xep hang gui Zalo: "${message.slice(0, 50)}..."`);
          } else if (channel === "email") {
            actionsExecuted.push(`Xep hang gui Email: "${message.slice(0, 50)}..."`);
          } else if (channel === "sms") {
            actionsExecuted.push(`Xep hang gui SMS: "${message.slice(0, 50)}..."`);
          } else {
            actionsExecuted.push(`Gui thong bao in-app`);
          }
        } catch (e) {
          actionsExecuted.push(`Loi ${channel}: ${e instanceof Error ? e.message : "unknown"}`);
        }
      }

      if (actionsExecuted.length > 0) {
        logs.push({
          ruleId: rule.id,
          ruleName: rule.name,
          leadId: lead.id,
          leadName: lead.name,
          actionsExecuted,
          triggeredAt: new Date().toISOString(),
          success: true,
        });
      }
    }
  }

  return logs;
}

// ─── SLA Check: cảnh báo KH ở giai đoạn quá lâu ──────────────────────────────
async function runSlaCheck(leads: Lead[]): Promise<AutomationRunLog[]> {
  const logs: AutomationRunLog[] = [];
  const sla = await getSlaConfig();
  if (!sla.enabled) return logs;

  for (const lead of leads) {
    const stageConfig = sla.stages.find((s) => s.stageId === lead.stage);
    if (!stageConfig) continue;

    const hoursInStage = hoursSince(lead.updatedAt);

    if (hoursInStage >= stageConfig.maxHours) {
      const actions: string[] = [];

      // Tao task canh bao
      try {
        await createTask({
          leadId: lead.id,
          leadName: lead.name,
          title: `[SLA] ${lead.name} da o giai doan "${stageConfig.stageLabel}" qua ${Math.floor(hoursInStage / 24)} ngay`,
          dueDate: addDays(0),
          priority: "high",
          done: false,
          assignedTo: lead.assignedTo ?? "",
        });
        actions.push(`Tao task SLA canh bao (${Math.floor(hoursInStage / 24)} ngay)`);
      } catch {
        // ignore duplicate
      }

      // Thong bao quan ly neu can
      if (stageConfig.escalateToManager) {
      await logNotification({
        ruleId: "sla_check",
        ruleName: "Kiem tra SLA",
        channel: "in_app",
        recipient: lead.phone ?? "",
        leadId: lead.id,
        leadName: lead.name,
        message: `[SLA] ${lead.name} da o giai doan "${stageConfig.stageLabel}" qua ${stageConfig.maxHours}h (hien tai: ${hoursInStage}h)`,
        status: "sent",
      });
        actions.push("Thong bao quan ly qua SLA");
      }

      if (actions.length > 0) {
        logs.push({
          ruleId: "sla_check",
          ruleName: "Kiem tra SLA",
          leadId: lead.id,
          leadName: lead.name,
          actionsExecuted: actions,
          triggeredAt: new Date().toISOString(),
          success: true,
        });
      }
    }
  }

  return logs;
}

// ─── Main engine entry point ───────────────────────────────────────────────────
export async function runAutomationEngine(): Promise<AutomationRunResult> {
  const startedAt = new Date().toISOString();
  const allLogs: AutomationRunLog[] = [];

  // Lay tat ca leads active
  const leads = await getLeads();
  const totalLeads = leads.length;

  // Nhom 1 & 2: Automation rules (follow-up, stage-based)
  const ruleLogs = await runAutomationRules(leads);
  allLogs.push(...ruleLogs);

  // Nhom 3: Smart tagging + auto-assign
  const tagLogs = await runSmartTagging(leads);
  allLogs.push(...tagLogs);

  const assignLogs = await runAutoAssign(leads);
  allLogs.push(...assignLogs);

  // Nhom 4: Notification rules (Zalo/Email/SMS)
  const notifLogs = await runNotificationRules(leads);
  allLogs.push(...notifLogs);

  // SLA check
  const slaLogs = await runSlaCheck(leads);
  allLogs.push(...slaLogs);

  const finishedAt = new Date().toISOString();

  return {
    startedAt,
    finishedAt,
    totalLeads,
    totalRulesChecked: totalLeads,
    totalTriggered: allLogs.filter((l) => l.actionsExecuted.length > 0).length,
    logs: allLogs,
  };
}

// ─── Event-based trigger: gọi khi KH chuyển giai đoạn ────────────────────────
export async function triggerStageChangeAutomation(
  lead: Lead,
  fromStage: string,
): Promise<AutomationRunLog[]> {
  const logs: AutomationRunLog[] = [];
  const rules = await getAutomationRules();
  const staffList: string[] = [];

  const stageRules = rules.filter(
    (r) =>
      r.enabled &&
      r.trigger.type === "stage_changed" &&
      (!r.trigger.fromStage || r.trigger.fromStage === fromStage) &&
      (!r.trigger.toStage || r.trigger.toStage === lead.stage)
  );

  for (const rule of stageRules) {
    const actionsExecuted: string[] = [];
    let success = true;
    let error: string | undefined;

    try {
      for (const action of rule.actions) {
        const result = await executeAction(action, lead, staffList);
        actionsExecuted.push(result);
      }
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : "unknown";
    }

    logs.push({
      ruleId: rule.id,
      ruleName: rule.name,
      leadId: lead.id,
      leadName: lead.name,
      actionsExecuted,
      triggeredAt: new Date().toISOString(),
      success,
      error,
    });
  }

  // Notification rules cho stage_changed
  try {
    const notifRules = await getNotificationRules();
    const stageNotifRules = notifRules.filter(
      (r) => r.isActive && r.trigger === "stage_changed" &&
        (!r.config.stages?.length || r.config.stages.includes(lead.stage))
    );

    for (const rule of stageNotifRules) {
      const message = (rule.config.messageTemplate ?? "")
        .replace(/\{\{name\}\}/g, lead.name)
        .replace(/\{\{stage\}\}/g, lead.stage)
        .replace(/\{\{assignedTo\}\}/g, lead.assignedTo ?? "")
        .replace(/\{\{phone\}\}/g, lead.phone ?? "");

      for (const channel of rule.channels) {
        await logNotification({
          ruleId: rule.id,
          ruleName: rule.name,
          channel,
          recipient: channel === "email" ? (lead.email ?? "") : (lead.phone ?? ""),
          leadId: lead.id,
          leadName: lead.name,
          message,
          status: channel === "in_app" ? "sent" : "pending",
        });
      }

      logs.push({
        ruleId: rule.id,
        ruleName: rule.name,
        leadId: lead.id,
        leadName: lead.name,
        actionsExecuted: rule.channels.map((c) => `Gui thong bao ${c}`),
        triggeredAt: new Date().toISOString(),
        success: true,
      });
    }
  } catch {
    // non-critical
  }

  return logs;
}
