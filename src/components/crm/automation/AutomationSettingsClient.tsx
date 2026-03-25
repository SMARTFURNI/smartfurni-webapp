"use client";

import { useState, useEffect } from "react";
import {
  Zap, Plus, Trash2, Save, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Clock, GitBranch, Users, ArrowRight,
  Play, Pause, BarChart2, Settings,
} from "lucide-react";
import type {
  AutomationRule, AutomationTrigger, AutomationAction,
  SlaConfig, SlaStageConfig, AutoAssignConfig,
  TriggerType, ActionType,
} from "@/lib/crm-automation-store";
import { TRIGGER_LABELS, ACTION_LABELS } from "@/lib/crm-automation-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRIGGER_ICONS: Record<TriggerType, React.ElementType> = {
  stage_changed: GitBranch, lead_created: Plus, no_activity_days: Clock,
  value_threshold: BarChart2, stage_duration: Clock, lead_type_match: Users,
};

const ACTION_COLORS: Record<ActionType, string> = {
  create_task: "#60a5fa", send_email: "#a78bfa", assign_staff: "#22c55e",
  add_tag: "#C9A84C", notify_manager: "#f97316", move_stage: "#06b6d4",
  send_webhook: "#f87171",
};

const STAGES = [
  { id: "new", label: "Khách hàng mới" },
  { id: "profile_sent", label: "Đã gửi Profile" },
  { id: "surveyed", label: "Đã khảo sát" },
  { id: "quoted", label: "Đã báo giá" },
  { id: "negotiating", label: "Thương thảo" },
  { id: "won", label: "Đã chốt" },
  { id: "lost", label: "Thất bại" },
];

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`}
      style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.2)" }}>
        <Icon size={16} style={{ color: "#C9A84C" }} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs mt-0.5" style={{  }}>{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Trigger Editor ───────────────────────────────────────────────────────────

function TriggerEditor({ trigger, onChange }: { trigger: AutomationTrigger; onChange: (t: AutomationTrigger) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>Điều kiện kích hoạt</label>
        <select value={trigger.type} onChange={e => onChange({ type: e.target.value as TriggerType })}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }}>
          {(Object.entries(TRIGGER_LABELS) as [TriggerType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {trigger.type === "stage_changed" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1" style={{  }}>Từ giai đoạn</label>
            <select value={trigger.fromStage ?? ""} onChange={e => onChange({ ...trigger, fromStage: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }}>
              <option value="">Bất kỳ</option>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{  }}>Sang giai đoạn</label>
            <select value={trigger.toStage ?? ""} onChange={e => onChange({ ...trigger, toStage: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }}>
              <option value="">Bất kỳ</option>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {(trigger.type === "no_activity_days") && (
        <div>
          <label className="block text-xs mb-1" style={{  }}>Số ngày không tương tác</label>
          <input type="number" min={1} max={30} value={trigger.days ?? 3}
            onChange={e => onChange({ ...trigger, days: parseInt(e.target.value) })}
            className="w-32 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }} />
        </div>
      )}

      {trigger.type === "stage_duration" && (
        <div>
          <label className="block text-xs mb-1" style={{  }}>Số giờ ở giai đoạn</label>
          <div className="flex items-center gap-3">
            <select value={trigger.fromStage ?? ""} onChange={e => onChange({ ...trigger, fromStage: e.target.value || undefined })}
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }}>
              <option value="">Chọn giai đoạn</option>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <input type="number" min={1} value={trigger.hours ?? 24}
              onChange={e => onChange({ ...trigger, hours: parseInt(e.target.value) })}
              className="w-24 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }} />
            <span className="text-xs" style={{ color: "#6b7280" }}>giờ</span>
          </div>
        </div>
      )}

      {trigger.type === "value_threshold" && (
        <div>
          <label className="block text-xs mb-1" style={{  }}>Giá trị tối thiểu (VND)</label>
          <input type="number" value={trigger.minValue ?? 500000000}
            onChange={e => onChange({ ...trigger, minValue: parseInt(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }} />
        </div>
      )}

      {trigger.type === "lead_type_match" && (
        <div>
          <label className="block text-xs mb-1" style={{  }}>Phân loại KH</label>
          <select value={trigger.leadType ?? ""} onChange={e => onChange({ ...trigger, leadType: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }}>
            <option value="architect">Kiến trúc sư</option>
            <option value="investor">Chủ đầu tư CHDV</option>
            <option value="dealer">Đại lý</option>
          </select>
        </div>
      )}
    </div>
  );
}

// ─── Action Editor ────────────────────────────────────────────────────────────

function ActionEditor({ action, onChange, onRemove }: {
  action: AutomationAction; onChange: (a: AutomationAction) => void; onRemove: () => void;
}) {
  return (
    <div className="p-3 rounded-xl space-y-3"
      style={{ background: "#f9fafb", border: `1px solid ${ACTION_COLORS[action.type]}30` }}>
      <div className="flex items-center justify-between">
        <select value={action.type} onChange={e => onChange({ type: e.target.value as ActionType })}
          className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none mr-2"
          style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: ACTION_COLORS[action.type] }}>
          {(Object.entries(ACTION_LABELS) as [ActionType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all"
          style={{  }}>
          <Trash2 size={13} />
        </button>
      </div>

      {action.type === "create_task" && (
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Tiêu đề task" value={action.taskTitle ?? ""} onChange={e => onChange({ ...action, taskTitle: e.target.value })}
            className="col-span-2 px-2 py-1.5 rounded text-xs outline-none"
            style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#fff" }} />
          <select value={action.taskPriority ?? "medium"} onChange={e => onChange({ ...action, taskPriority: e.target.value as "high" | "medium" | "low" })}
            className="px-2 py-1.5 rounded text-xs outline-none"
            style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#fff" }}>
            <option value="high">Ưu tiên Cao</option>
            <option value="medium">Ưu tiên TB</option>
            <option value="low">Ưu tiên Thấp</option>
          </select>
          <div className="flex items-center gap-1.5">
            <input type="number" min={0} max={30} value={action.taskDueDays ?? 1}
              onChange={e => onChange({ ...action, taskDueDays: parseInt(e.target.value) })}
              className="w-16 px-2 py-1.5 rounded text-xs outline-none"
              style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#fff" }} />
            <span className="text-xs" style={{  }}>ngày sau</span>
          </div>
        </div>
      )}

      {action.type === "send_email" && (
        <input placeholder="Tiêu đề email" value={action.emailSubject ?? ""} onChange={e => onChange({ ...action, emailSubject: e.target.value })}
          className="w-full px-2 py-1.5 rounded text-xs outline-none"
          style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#fff" }} />
      )}

      {action.type === "add_tag" && (
        <input placeholder="Nhãn (VD: VIP, Hot, Tiềm năng)" value={action.tag ?? ""} onChange={e => onChange({ ...action, tag: e.target.value })}
          className="w-full px-2 py-1.5 rounded text-xs outline-none"
          style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#fff" }} />
      )}

      {action.type === "notify_manager" && (
        <input placeholder="Nội dung thông báo" value={action.notifyMessage ?? ""} onChange={e => onChange({ ...action, notifyMessage: e.target.value })}
          className="w-full px-2 py-1.5 rounded text-xs outline-none"
          style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#fff" }} />
      )}

      {action.type === "move_stage" && (
        <select value={action.targetStage ?? ""} onChange={e => onChange({ ...action, targetStage: e.target.value })}
          className="w-full px-2 py-1.5 rounded text-xs outline-none"
          style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#fff" }}>
          <option value="">Chọn giai đoạn đích</option>
          {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      )}

      {action.type === "send_webhook" && (
        <input placeholder="Webhook URL" value={action.webhookUrl ?? ""} onChange={e => onChange({ ...action, webhookUrl: e.target.value })}
          className="w-full px-2 py-1.5 rounded text-xs outline-none font-mono"
          style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#C9A84C" }} />
      )}
    </div>
  );
}

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({ rule, onChange, onDelete }: {
  rule: AutomationRule;
  onChange: (r: AutomationRule) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const TriggerIcon = TRIGGER_ICONS[rule.trigger.type];

  return (
    <div className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: `1px solid ${rule.enabled ? "rgba(201,168,76,0.3)" : "#e5e7eb"}`,
        background: rule.enabled ? "rgba(201,168,76,0.03)" : "#f9fafb",
      }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: rule.enabled ? "rgba(201,168,76,0.12)" : "#f3f4f6" }}>
          <TriggerIcon size={15} style={{ color: rule.enabled ? "#C9A84C" : "#9ca3af" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate" style={{ color: rule.enabled ? "#fff" : "#6b7280" }}>
              {rule.name}
            </span>
            {rule.runCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa" }}>
                {rule.runCount} lần chạy
              </span>
            )}
          </div>
          <p className="text-xs truncate mt-0.5" style={{ color: "#9ca3af" }}>{rule.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => onChange({ ...rule, enabled: !rule.enabled })}
            className="p-1.5 rounded-lg transition-all"
            style={{
              background: rule.enabled ? "rgba(34,197,94,0.12)" : "#f3f4f6",
              color: rule.enabled ? "#22c55e" : "#9ca3af",
            }}
            title={rule.enabled ? "Đang bật — click để tắt" : "Đang tắt — click để bật"}
          >
            {rule.enabled ? <Play size={13} /> : <Pause size={13} />}
          </button>
          <button onClick={() => setExpanded(v => !v)} className="p-1.5 rounded-lg hover:bg-white/5 transition-all"
            style={{ color: "#9ca3af" }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-all"
            style={{ color: "#9ca3af" }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: "#f3f4f6" }}>
          <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                value={rule.name}
                onChange={e => onChange({ ...rule, name: e.target.value })}
                placeholder="Tên quy tắc"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-2"
                style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#fff" }}
              />
              <input
                value={rule.description}
                onChange={e => onChange({ ...rule, description: e.target.value })}
                placeholder="Mô tả quy tắc"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#6b7280" }}
              />
            </div>
            <TriggerEditor trigger={rule.trigger} onChange={t => onChange({ ...rule, trigger: t })} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: "#6b7280" }}>
                Hành động thực hiện ({rule.actions.length})
              </span>
              <button
                onClick={() => onChange({ ...rule, actions: [...rule.actions, { type: "create_task" }] })}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all hover:opacity-80"
                style={{ background: "rgba(201,168,76,0.1)", color: "#C9A84C" }}>
                <Plus size={11} /> Thêm hành động
              </button>
            </div>
            <div className="flex items-start gap-2 flex-wrap">
              {rule.actions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-1.5 flex-1 min-w-[260px]">
                  {idx > 0 && (
                    <div className="flex items-center mt-3 flex-shrink-0">
                      <ArrowRight size={12} style={{ color: "#9ca3af" }} />
                    </div>
                  )}
                  <div className="flex-1">
                    <ActionEditor
                      action={action}
                      onChange={a => {
                        const updated = [...rule.actions];
                        updated[idx] = a;
                        onChange({ ...rule, actions: updated });
                      }}
                      onRemove={() => onChange({ ...rule, actions: rule.actions.filter((_, i) => i !== idx) })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SLA Tab ──────────────────────────────────────────────────────────────────

function SlaTab({ config, onChange }: { config: SlaConfig; onChange: (c: SlaConfig) => void }) {
  const updateStage = (idx: number, field: keyof SlaStageConfig, value: string | number | boolean) => {
    const stages = [...config.stages];
    stages[idx] = { ...stages[idx], [field]: value };
    onChange({ ...config, stages });
  };

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Bật SLA</div>
            <div className="text-xs mt-0.5" style={{  }}>
              Cảnh báo khi KH ở giai đoạn quá thời gian cho phép
            </div>
          </div>
          <button onClick={() => onChange({ ...config, enabled: !config.enabled })}
            className="relative w-11 h-6 rounded-full transition-all"
            style={{ background: config.enabled ? "#C9A84C" : "#e5e7eb" }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm"
              style={{ left: config.enabled ? "calc(100% - 22px)" : "2px" }} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs" style={{ color: "#6b7280" }}>Phản hồi lần đầu trong vòng</label>
          <input type="number" min={1} max={72} value={config.firstResponseHours}
            onChange={e => onChange({ ...config, firstResponseHours: parseInt(e.target.value) })}
            className="w-20 px-2 py-1.5 rounded text-sm text-center outline-none"
            style={{ background: "#f3f4f6", border: "1px solid #d1d5db", color: "#C9A84C" }} />
          <label className="text-xs" style={{ color: "#6b7280" }}>giờ kể từ khi tạo lead</label>
        </div>
      </Card>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6b7280" }}>Giai đoạn</th>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6b7280" }}>Tối đa (giờ)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6b7280" }}>Cảnh báo (giờ)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#6b7280" }}>Báo quản lý</th>
            </tr>
          </thead>
          <tbody>
            {config.stages.map((stage, idx) => (
              <tr key={stage.stageId} style={{ borderTop: "1px solid #e5e7eb" }}>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium" style={{ color: "#374151" }}>{stage.stageLabel}</span>
                </td>
                <td className="px-4 py-3">
                  <input type="number" min={1} value={stage.maxHours}
                    onChange={e => updateStage(idx, "maxHours", parseInt(e.target.value))}
                    className="w-20 px-2 py-1 rounded text-sm text-center outline-none"
                    style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }} />
                </td>
                <td className="px-4 py-3">
                  <input type="number" min={1} value={stage.warningHours}
                    onChange={e => updateStage(idx, "warningHours", parseInt(e.target.value))}
                    className="w-20 px-2 py-1 rounded text-sm text-center outline-none"
                    style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }} />
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => updateStage(idx, "escalateToManager", !stage.escalateToManager)}
                    className="relative w-9 h-5 rounded-full transition-all"
                    style={{ background: stage.escalateToManager ? "#C9A84C" : "#e5e7eb" }}>
                    <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm"
                      style={{ left: stage.escalateToManager ? "calc(100% - 18px)" : "2px" }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Auto-assign Tab ──────────────────────────────────────────────────────────

function AutoAssignTab({ config, onChange }: { config: AutoAssignConfig; onChange: (c: AutoAssignConfig) => void }) {
  return (
    <div className="space-y-5">
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Tự động phân công</div>
            <div className="text-xs mt-0.5" style={{  }}>
              Giao lead mới cho nhân viên dựa trên khu vực và loại KH
            </div>
          </div>
          <button onClick={() => onChange({ ...config, enabled: !config.enabled })}
            className="relative w-11 h-6 rounded-full transition-all"
            style={{ background: config.enabled ? "#C9A84C" : "#e5e7eb" }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm"
              style={{ left: config.enabled ? "calc(100% - 22px)" : "2px" }} />
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6b7280" }}>Phương thức mặc định</label>
          <div className="flex gap-2">
            {[
              { id: "round_robin", label: "Luân phiên" },
              { id: "least_loaded", label: "Ít KH nhất" },
              { id: "manual", label: "Thủ công" },
            ].map(m => (
              <button key={m.id} onClick={() => onChange({ ...config, defaultMode: m.id as AutoAssignConfig["defaultMode"] })}
                className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: config.defaultMode === m.id ? "rgba(201,168,76,0.15)" : "#f9fafb",
                  color: config.defaultMode === m.id ? "#C9A84C" : "#6b7280",
                  border: `1px solid ${config.defaultMode === m.id ? "rgba(201,168,76,0.3)" : "#e5e7eb"}`,
                }}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "#4b5563" }}>
          Quy tắc phân công theo khu vực ({config.rules.length})
        </p>
        <button
          onClick={() => onChange({
            ...config,
            rules: [...config.rules, {
              id: `rule_${Date.now()}`, province: "TP. Hồ Chí Minh",
              districts: [], staffId: "", staffName: "Chưa chọn",
              leadTypes: [], priority: config.rules.length + 1,
            }],
          })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
          style={{ background: "rgba(201,168,76,0.12)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.25)" }}>
          <Plus size={12} /> Thêm quy tắc
        </button>
      </div>

      {config.rules.length === 0 && (
        <div className="text-center py-10" style={{  }}>
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Chưa có quy tắc phân công</p>
          <p className="text-xs mt-1">Thêm quy tắc để tự động giao lead theo khu vực</p>
        </div>
      )}

      <div className="space-y-2">
        {config.rules.map((rule, idx) => (
          <div key={rule.id} className="p-4 rounded-xl"
            style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs mb-1" style={{  }}>Tỉnh/Thành phố</label>
                <input value={rule.province} onChange={e => {
                  const updated = [...config.rules];
                  updated[idx] = { ...updated[idx], province: e.target.value };
                  onChange({ ...config, rules: updated });
                }} className="w-full px-2 py-1.5 rounded text-xs outline-none"
                  style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#fff" }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{  }}>Nhân viên phụ trách</label>
                <input value={rule.staffName} onChange={e => {
                  const updated = [...config.rules];
                  updated[idx] = { ...updated[idx], staffName: e.target.value };
                  onChange({ ...config, rules: updated });
                }} className="w-full px-2 py-1.5 rounded text-xs outline-none"
                  style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#fff" }} />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{  }}>Loại KH</label>
                <select value={rule.leadTypes[0] ?? ""} onChange={e => {
                  const updated = [...config.rules];
                  updated[idx] = { ...updated[idx], leadTypes: e.target.value ? [e.target.value] : [] };
                  onChange({ ...config, rules: updated });
                }} className="w-full px-2 py-1.5 rounded text-xs outline-none"
                  style={{ background: "#f3f4f6", border: "1px solid #e5e7eb", color: "#fff" }}>
                  <option value="">Tất cả</option>
                  <option value="architect">Kiến trúc sư</option>
                  <option value="investor">Chủ đầu tư</option>
                  <option value="dealer">Đại lý</option>
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={() => onChange({ ...config, rules: config.rules.filter((_, i) => i !== idx) })}
                  className="px-3 py-1.5 rounded-lg text-xs hover:bg-red-500/20 transition-all w-full"
                  style={{ color: "#f87171", border: "1px solid rgba(248,113,113,0.2)" }}>
                  Xóa quy tắc
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TabId = "rules" | "sla" | "auto_assign";

export default function AutomationSettingsClient() {
  const [activeTab, setActiveTab] = useState<TabId>("rules");
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [sla, setSla] = useState<SlaConfig | null>(null);
  const [autoAssign, setAutoAssign] = useState<AutoAssignConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [r, s, a] = await Promise.all([
        fetch("/api/crm/automation?type=rules").then(r => r.json()),
        fetch("/api/crm/automation?type=sla").then(r => r.json()),
        fetch("/api/crm/automation?type=auto_assign").then(r => r.json()),
      ]);
      setRules(r);
      setSla(s);
      setAutoAssign(a);
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (activeTab === "rules") await fetch("/api/crm/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "rules", data: rules }) });
      if (activeTab === "sla" && sla) await fetch("/api/crm/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "sla", data: sla }) });
      if (activeTab === "auto_assign" && autoAssign) await fetch("/api/crm/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "auto_assign", data: autoAssign }) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    const newRule: AutomationRule = {
      id: `rule_${Date.now()}`,
      name: "Quy tắc mới",
      description: "Mô tả quy tắc",
      enabled: false,
      trigger: { type: "stage_changed" },
      actions: [{ type: "create_task", taskTitle: "Task mới", taskDueDays: 1, taskPriority: "medium" }],
      runCount: 0,
      lastRunAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRules(prev => [...prev, newRule]);
  };

  const TABS = [
    { id: "rules" as TabId, label: "Quy tắc tự động", icon: Zap, count: rules.filter(r => r.enabled).length },
    { id: "sla" as TabId, label: "SLA & Thời gian", icon: Clock, count: null },
    { id: "auto_assign" as TabId, label: "Phân công tự động", icon: Users, count: null },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: "#9ca3af" }}>
      <RefreshCw size={20} className="animate-spin mr-2" /> Đang tải...
    </div>
  );

  return (
    <div className="space-y-5" style={{ color: "#fff" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Tự động hóa CRM</h1>
          <p className="text-xs mt-0.5" style={{  }}>
            Cấu hình quy tắc tự động, SLA và phân công nhân viên
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle2 size={12} /> Đã lưu
            </div>
          )}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)", color: "#000" }}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Lưu cài đặt
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === tab.id ? "rgba(201,168,76,0.12)" : "transparent",
              color: activeTab === tab.id ? "#C9A84C" : "#6b7280",
            }}>
            <tab.icon size={14} />
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
                {tab.count} bật
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm" style={{ color: "#6b7280" }}>
              {rules.filter(r => r.enabled).length}/{rules.length} quy tắc đang hoạt động
            </p>
            <button onClick={addRule}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
              style={{ background: "rgba(201,168,76,0.12)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.25)" }}>
              <Plus size={14} /> Thêm quy tắc
            </button>
          </div>
          <div className="space-y-3">
            {rules.map((rule, idx) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onChange={r => setRules(prev => prev.map((x, i) => i === idx ? r : x))}
                onDelete={() => setRules(prev => prev.filter((_, i) => i !== idx))}
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === "sla" && sla && (
        <SlaTab config={sla} onChange={setSla} />
      )}

      {activeTab === "auto_assign" && autoAssign && (
        <AutoAssignTab config={autoAssign} onChange={setAutoAssign} />
      )}
    </div>
  );
}
