"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageCircle, Plus, Trash2, Save, Power, ChevronDown, ChevronUp,
  Zap, Clock, GitBranch, AlertCircle, CheckCircle2, Loader2, Info,
  ArrowRight, Edit3, Copy,
} from "lucide-react";
import type { AutomationRule, AutomationTrigger } from "@/lib/crm-automation-store";

// ─── Constants ─────────────────────────────────────────────────────────────────
const STAGES = [
  { id: "new", label: "Khách hàng mới", color: "#6366f1" },
  { id: "profile_sent", label: "Đã gửi Profile", color: "#3b82f6" },
  { id: "surveyed", label: "Đã khảo sát", color: "#0ea5e9" },
  { id: "quoted", label: "Đã báo giá", color: "#f59e0b" },
  { id: "negotiating", label: "Thương thảo", color: "#f97316" },
  { id: "won", label: "Đã chốt", color: "#22c55e" },
  { id: "lost", label: "Thất bại", color: "#ef4444" },
];

const TRIGGER_OPTIONS = [
  { value: "stage_changed", label: "Khi chuyển giai đoạn", icon: GitBranch },
  { value: "lead_created", label: "Khi tạo khách hàng mới", icon: Plus },
  { value: "no_activity_days", label: "Không tương tác N ngày", icon: Clock },
  { value: "stage_duration", label: "Ở giai đoạn quá N giờ", icon: Clock },
];

const TEMPLATE_VARIABLES = [
  { var: "{{name}}", desc: "Tên khách hàng" },
  { var: "{{stage}}", desc: "Giai đoạn hiện tại" },
  { var: "{{phone}}", desc: "Số điện thoại" },
  { var: "{{assignedTo}}", desc: "Nhân viên phụ trách" },
  { var: "{{value}}", desc: "Giá trị dự kiến" },
];

const DEFAULT_TEMPLATES: Record<string, string> = {
  new: "Xin chào {{name}}! Cảm ơn bạn đã quan tâm đến SmartFurni. Tôi là {{assignedTo}}, rất vui được hỗ trợ bạn. Bạn có thể cho tôi biết thêm về nhu cầu nội thất của mình không?",
  profile_sent: "Xin chào {{name}}! Tôi vừa gửi thông tin sản phẩm SmartFurni cho bạn. Bạn đã xem qua chưa? Nếu có thắc mắc gì, hãy liên hệ tôi nhé!",
  surveyed: "Xin chào {{name}}! Cảm ơn bạn đã dành thời gian cho buổi khảo sát. Tôi sẽ chuẩn bị báo giá chi tiết và gửi cho bạn sớm nhất có thể.",
  quoted: "Xin chào {{name}}! Tôi đã gửi báo giá chi tiết cho bạn. Bạn đã xem qua chưa? Nếu cần điều chỉnh hoặc có câu hỏi, tôi luôn sẵn sàng hỗ trợ.",
  negotiating: "Xin chào {{name}}! Cảm ơn bạn đã tin tưởng SmartFurni. Tôi muốn xác nhận lại các điều khoản để chúng ta có thể tiến hành hợp đồng sớm nhất.",
  won: "Xin chào {{name}}! Chúc mừng! Chúng tôi rất vui được hợp tác với bạn. Đội ngũ SmartFurni sẽ liên hệ để bắt đầu triển khai dự án.",
  lost: "Xin chào {{name}}! Cảm ơn bạn đã quan tâm đến SmartFurni. Nếu trong tương lai bạn cần tư vấn về nội thất, chúng tôi luôn sẵn sàng hỗ trợ.",
};

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ZaloWorkflowRule extends AutomationRule {
  // Guaranteed to have send_zalo_personal action
}

// ─── Sub-components ────────────────────────────────────────────────────────────
function StageTag({ stageId, label }: { stageId: string; label: string }) {
  const stage = STAGES.find((s) => s.id === stageId);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{
        background: stage ? `${stage.color}18` : "rgba(255,255,255,0.04)",
        color: stage?.color ?? "#6b7280",
        border: `1px solid ${stage ? `${stage.color}40` : "#e5e7eb"}`,
      }}
    >
      {label}
    </span>
  );
}

function VariableChip({ variable, onClick }: { variable: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
    >
      {variable}
    </button>
  );
}

// ─── Rule Editor ───────────────────────────────────────────────────────────────
function RuleEditor({
  rule,
  onChange,
  onDelete,
}: {
  rule: AutomationRule;
  onChange: (updated: AutomationRule) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const zaloAction = rule.actions.find((a) => a.type === "send_zalo_personal");

  const updateTrigger = (patch: Partial<AutomationTrigger>) => {
    onChange({ ...rule, trigger: { ...rule.trigger, ...patch } });
  };

  const updateZaloAction = (patch: Record<string, unknown>) => {
    const newActions = rule.actions.map((a) =>
      a.type === "send_zalo_personal" ? { ...a, ...patch } : a
    );
    onChange({ ...rule, actions: newActions });
  };

  const insertVariable = (v: string) => {
    const current = zaloAction?.zaloMessage ?? "";
    updateZaloAction({ zaloMessage: current + v });
  };

  const triggerLabel = TRIGGER_OPTIONS.find((t) => t.value === rule.trigger.type)?.label ?? rule.trigger.type;

  return (
    <div
      className="rounded-xl border transition-all"
      style={{
        background: rule.enabled ? "#fff" : "#fafafa",
        borderColor: rule.enabled ? "#e5e7eb" : "rgba(255,255,255,0.04)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        {/* Enable toggle */}
        <button
          onClick={() => onChange({ ...rule, enabled: !rule.enabled })}
          className={`w-10 h-6 rounded-full transition-all flex-shrink-0 relative ${rule.enabled ? "bg-green-500" : "bg-gray-300"}`}
        >
          <div
            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${rule.enabled ? "left-5" : "left-1"}`}
          />
        </button>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900 truncate">{rule.name}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">{triggerLabel}</span>
            {rule.trigger.type === "stage_changed" && rule.trigger.toStage && (
              <>
                <ArrowRight size={12} className="text-[rgba(245,237,214,0.35)]" />
                <StageTag
                  stageId={rule.trigger.toStage}
                  label={STAGES.find((s) => s.id === rule.trigger.toStage)?.label ?? rule.trigger.toStage}
                />
              </>
            )}
          </div>
          {zaloAction?.zaloMessage && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              "{zaloAction.zaloMessage.slice(0, 80)}..."
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {rule.runCount > 0 && (
            <span className="text-xs text-gray-400 mr-1">Đã chạy {rule.runCount}x</span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.08)] text-gray-400 transition-colors"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Rule name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tên quy tắc</label>
            <input
              type="text"
              value={rule.name}
              onChange={(e) => onChange({ ...rule, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Trigger */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Điều kiện kích hoạt</label>
              <select
                value={rule.trigger.type}
                onChange={(e) => updateTrigger({ type: e.target.value as AutomationTrigger["type"] })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TRIGGER_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Trigger params */}
            {rule.trigger.type === "stage_changed" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Khi chuyển sang giai đoạn</label>
                <select
                  value={rule.trigger.toStage ?? ""}
                  onChange={(e) => updateTrigger({ toStage: e.target.value || undefined })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Bất kỳ giai đoạn nào --</option>
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            {rule.trigger.type === "no_activity_days" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sau N ngày không tương tác</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={rule.trigger.days ?? 3}
                  onChange={(e) => updateTrigger({ days: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {rule.trigger.type === "stage_duration" && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sau N giờ ở giai đoạn hiện tại</label>
                <input
                  type="number"
                  min={1}
                  max={720}
                  value={rule.trigger.hours ?? 24}
                  onChange={(e) => updateTrigger({ hours: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {/* Zalo message */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nội dung tin nhắn Zalo</label>
            <textarea
              value={zaloAction?.zaloMessage ?? ""}
              onChange={(e) => updateZaloAction({ zaloMessage: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Nhập nội dung tin nhắn..."
            />
            {/* Variable chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-xs text-gray-400 self-center">Chèn biến:</span>
              {TEMPLATE_VARIABLES.map((v) => (
                <VariableChip key={v.var} variable={v.var} onClick={() => insertVariable(v.var)} />
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Trì hoãn gửi (phút)</label>
              <input
                type="number"
                min={0}
                max={1440}
                value={zaloAction?.zaloDelayMinutes ?? 0}
                onChange={(e) => updateZaloAction({ zaloDelayMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">0 = gửi ngay lập tức</p>
            </div>

            <div className="flex items-start gap-2 pt-5">
              <input
                type="checkbox"
                id={`fallback-${rule.id}`}
                checked={zaloAction?.zaloFallbackToAddFriend ?? false}
                onChange={(e) => updateZaloAction({ zaloFallbackToAddFriend: e.target.checked })}
                className="mt-0.5 rounded"
              />
              <label htmlFor={`fallback-${rule.id}`} className="text-xs text-gray-700 cursor-pointer">
                Nếu chưa là bạn bè → tự động gửi lời mời kết bạn
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function ZaloWorkflowAutomation() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [allRules, setAllRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [zaloConnected, setZaloConnected] = useState<boolean | null>(null);

  // Load rules
  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const [rulesRes, statusRes] = await Promise.all([
        fetch("/api/crm/automation"),
        fetch("/api/crm/zalo-inbox/status"),
      ]);
      const allData: AutomationRule[] = await rulesRes.json();
      const statusData = await statusRes.json();

      setAllRules(allData);
      // Chỉ hiển thị rules có action send_zalo_personal
      setRules(allData.filter((r) => r.actions.some((a) => a.type === "send_zalo_personal")));
      setZaloConnected(statusData.connected ?? false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRules(); }, [loadRules]);

  // Save rules
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      // Merge: giữ các rule không phải zalo, thay thế các zalo rules
      const nonZaloRules = allRules.filter((r) => !r.actions.some((a) => a.type === "send_zalo_personal"));
      const merged = [...nonZaloRules, ...rules];
      const res = await fetch("/api/crm/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "rules", data: merged }),
      });
      if (!res.ok) throw new Error("Save failed");
      setAllRules(merged);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Add new rule
  const addRule = (templateStage?: string) => {
    const stage = templateStage ?? "new";
    const newRule: AutomationRule = {
      id: `zalo_rule_${Date.now()}`,
      name: `Zalo: ${STAGES.find((s) => s.id === stage)?.label ?? "Khách hàng mới"}`,
      description: "Gửi tin nhắn Zalo Personal tự động",
      enabled: true,
      trigger: templateStage
        ? { type: "stage_changed", toStage: stage }
        : { type: "stage_changed", toStage: "new" },
      actions: [{
        type: "send_zalo_personal",
        zaloMessage: DEFAULT_TEMPLATES[stage] ?? DEFAULT_TEMPLATES.new,
        zaloDelayMinutes: 0,
        zaloFallbackToAddFriend: true,
      }],
      runCount: 0,
      lastRunAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setRules((prev) => [...prev, newRule]);
  };

  const updateRule = (id: string, updated: AutomationRule) => {
    setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  const deleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle size={18} className="text-blue-500" />
            Automation Zalo Personal
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Tự động gửi tin nhắn Zalo cá nhân theo giai đoạn khách hàng
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
            saveStatus === "success"
              ? "bg-green-500 text-white"
              : saveStatus === "error"
              ? "bg-red-500 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saveStatus === "success" ? (
            <CheckCircle2 size={14} />
          ) : saveStatus === "error" ? (
            <AlertCircle size={14} />
          ) : (
            <Save size={14} />
          )}
          {saving ? "Đang lưu..." : saveStatus === "success" ? "Đã lưu!" : saveStatus === "error" ? "Lỗi lưu" : "Lưu thay đổi"}
        </button>
      </div>

      {/* Zalo status banner */}
      {zaloConnected === false && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Zalo Personal chưa kết nối</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Automation sẽ không hoạt động. Vui lòng{" "}
              <a href="/crm/zalo-inbox" className="underline font-medium">đăng nhập tại Zalo Inbox</a>.
            </p>
          </div>
        </div>
      )}

      {zaloConnected === true && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 size={16} className="text-green-500" />
          <p className="text-sm text-green-700 font-medium">Zalo Personal đã kết nối — Automation sẵn sàng hoạt động</p>
        </div>
      )}

      {/* Quick add by stage */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">Thêm nhanh theo giai đoạn:</p>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((stage) => (
            <button
              key={stage.id}
              onClick={() => addRule(stage.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all hover:shadow-sm"
              style={{
                background: `${stage.color}10`,
                borderColor: `${stage.color}30`,
                color: stage.color,
              }}
            >
              <Plus size={12} />
              {stage.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rules list */}
      {rules.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
          <MessageCircle size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Chưa có quy tắc nào</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Thêm quy tắc để tự động gửi tin nhắn Zalo theo giai đoạn</p>
          <button
            onClick={() => addRule()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            <Plus size={14} />
            Thêm quy tắc đầu tiên
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <RuleEditor
              key={rule.id}
              rule={rule}
              onChange={(updated) => updateRule(rule.id, updated)}
              onDelete={() => deleteRule(rule.id)}
            />
          ))}
          <button
            onClick={() => addRule()}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-500 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-300 hover:text-blue-500 transition-all"
          >
            <Plus size={16} />
            Thêm quy tắc mới
          </button>
        </div>
      )}

      {/* Info box */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700 space-y-1">
          <p className="font-semibold">Cách hoạt động:</p>
          <p>• <strong>Khi chuyển giai đoạn:</strong> Tin nhắn được gửi ngay khi nhân viên cập nhật giai đoạn khách hàng</p>
          <p>• <strong>Không tương tác N ngày:</strong> Cron job chạy mỗi 30 phút kiểm tra và gửi tự động</p>
          <p>• Nếu khách chưa là bạn bè Zalo → có thể tự động gửi lời mời kết bạn trước</p>
          <p>• Biến <code className="bg-blue-100 px-1 rounded">{"{{name}}"}</code>, <code className="bg-blue-100 px-1 rounded">{"{{stage}}"}</code>... sẽ được thay thế bằng dữ liệu thực của khách</p>
        </div>
      </div>
    </div>
  );
}
