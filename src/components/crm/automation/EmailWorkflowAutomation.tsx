"use client";

import { useState, useEffect } from "react";
import {
  Mail, Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2,
  AlertCircle, RefreshCw, ExternalLink, Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailRule {
  id: string;
  enabled: boolean;
  name: string;
  triggerStage: string;
  subject: string;
  body: string;
  delayMinutes: number;
  fromName: string;
}

interface SmtpStatusInfo {
  configured: boolean;
  host: string;
  user: string;
  fromName: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = [
  { id: "new", label: "Khách hàng mới" },
  { id: "profile_sent", label: "Đã gửi Profile" },
  { id: "surveyed", label: "Đã khảo sát" },
  { id: "quoted", label: "Đã báo giá" },
  { id: "negotiating", label: "Thương thảo" },
  { id: "won", label: "Đã chốt" },
  { id: "lost", label: "Thất bại" },
];

const STAGE_LABEL: Record<string, string> = Object.fromEntries(STAGES.map(s => [s.id, s.label]));

const TEMPLATE_VARS = [
  { key: "{{name}}", desc: "Tên khách hàng" },
  { key: "{{stage}}", desc: "Giai đoạn hiện tại" },
  { key: "{{phone}}", desc: "Số điện thoại" },
  { key: "{{email}}", desc: "Email khách hàng" },
  { key: "{{assignedTo}}", desc: "Nhân viên phụ trách" },
  { key: "{{value}}", desc: "Giá trị dự kiến" },
  { key: "{{company}}", desc: "Công ty" },
];

const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  new: {
    subject: "SmartFurni — Chào mừng {{name}} đến với chúng tôi!",
    body: `Chào {{name}},

Cảm ơn bạn đã quan tâm đến SmartFurni — giải pháp nội thất thông minh hàng đầu.

Chúng tôi rất vui được hỗ trợ bạn tìm kiếm giải pháp phù hợp nhất. Nhân viên {{assignedTo}} sẽ liên hệ với bạn trong thời gian sớm nhất.

Nếu cần hỗ trợ ngay, vui lòng gọi hotline: 0918 326 552

Trân trọng,
Đội ngũ SmartFurni`,
  },
  quoted: {
    subject: "SmartFurni — Báo giá dành cho {{name}}",
    body: `Chào {{name}},

Chúng tôi đã chuẩn bị báo giá chi tiết dành riêng cho bạn.

Nhân viên {{assignedTo}} sẽ gửi báo giá đầy đủ và giải đáp mọi thắc mắc của bạn.

Giá trị dự kiến: {{value}}

Vui lòng liên hệ để được tư vấn thêm.

Trân trọng,
Đội ngũ SmartFurni`,
  },
  won: {
    subject: "SmartFurni — Cảm ơn {{name}} đã tin tưởng!",
    body: `Chào {{name}},

Chúc mừng! Hợp đồng của bạn đã được xác nhận thành công.

Đội ngũ SmartFurni sẽ liên hệ để sắp xếp lịch thi công và bàn giao sản phẩm trong thời gian sớm nhất.

Cảm ơn bạn đã tin tưởng SmartFurni!

Trân trọng,
Đội ngũ SmartFurni`,
  },
};

// ─── Rule Card ────────────────────────────────────────────────────────────────

function RuleCard({
  rule,
  onChange,
  onDelete,
}: {
  rule: EmailRule;
  onChange: (r: EmailRule) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const loadTemplate = () => {
    const tpl = DEFAULT_TEMPLATES[rule.triggerStage];
    if (tpl) onChange({ ...rule, subject: tpl.subject, body: tpl.body });
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.06)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Toggle */}
        <button
          onClick={() => onChange({ ...rule, enabled: !rule.enabled })}
          className="relative w-10 h-5 rounded-full flex-shrink-0 transition-all"
          style={{ background: rule.enabled ? "#22c55e" : "#d1d5db" }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
            style={{ left: rule.enabled ? "calc(100% - 18px)" : "2px" }}
          />
        </button>

        {/* Icon */}
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}>
          <Mail size={13} style={{ color: "#a78bfa" }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "#f5edd6" }}>{rule.name}</span>
            <span className="text-xs" style={{ color: "rgba(245,237,214,0.50)" }}>·</span>
            <span className="text-xs" style={{ color: "rgba(245,237,214,0.50)" }}>Khi chuyển sang</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
              {STAGE_LABEL[rule.triggerStage] ?? rule.triggerStage}
            </span>
          </div>
          {!expanded && (
            <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(245,237,214,0.50)" }}>
              {rule.subject || "Chưa có tiêu đề email"}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg transition-all hover:opacity-70"
            style={{ color: "rgba(245,237,214,0.40)" }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg transition-all hover:bg-red-50"
            style={{ color: "#ef4444" }}>
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded Editor */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <div className="pt-3 grid grid-cols-2 gap-3">
            {/* Tên quy tắc */}
            <div className="col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(245,237,214,0.85)" }}>Tên quy tắc</label>
              <input value={rule.name} onChange={e => onChange({ ...rule, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)", color: "#f5edd6" }} />
            </div>

            {/* Giai đoạn kích hoạt */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(245,237,214,0.85)" }}>Giai đoạn kích hoạt</label>
              <select value={rule.triggerStage} onChange={e => onChange({ ...rule, triggerStage: e.target.value })}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)", color: "#f5edd6" }}>
                {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            {/* Trì hoãn */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(245,237,214,0.85)" }}>Trì hoãn gửi</label>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={1440} value={rule.delayMinutes}
                  onChange={e => onChange({ ...rule, delayMinutes: parseInt(e.target.value) || 0 })}
                  className="w-24 px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)", color: "#f5edd6" }} />
                <span className="text-xs" style={{ color: "rgba(245,237,214,0.50)" }}>phút (0 = gửi ngay)</span>
              </div>
            </div>
          </div>

          {/* Template vars hint */}
          <div className="p-3 rounded-xl" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "#15803d" }}>Biến có thể dùng trong nội dung:</p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_VARS.map(v => (
                <span key={v.key} className="text-xs px-2 py-0.5 rounded font-mono cursor-pointer hover:opacity-70"
                  style={{ background: "#dcfce7", color: "#166534" }}
                  title={v.desc}>
                  {v.key}
                </span>
              ))}
            </div>
          </div>

          {/* Load template button */}
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold" style={{ color: "rgba(245,237,214,0.85)" }}>Tiêu đề email</label>
            {DEFAULT_TEMPLATES[rule.triggerStage] && (
              <button onClick={loadTemplate}
                className="text-xs px-2 py-1 rounded-lg transition-all hover:opacity-80"
                style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
                Dùng template mẫu
              </button>
            )}
          </div>
          <input value={rule.subject} onChange={e => onChange({ ...rule, subject: e.target.value })}
            placeholder="VD: SmartFurni — Cảm ơn {{name}} đã quan tâm!"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)", color: "#f5edd6" }} />

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "rgba(245,237,214,0.85)" }}>Nội dung email</label>
            <textarea value={rule.body} onChange={e => onChange({ ...rule, body: e.target.value })}
              rows={8} placeholder="Nội dung email gửi đến khách hàng..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none font-mono"
              style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.10)", color: "#f5edd6", lineHeight: "1.6" }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SMTP Status Banner ───────────────────────────────────────────────────────

function SmtpStatusBanner({ status }: { status: SmtpStatusInfo | null }) {
  if (!status) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl"
        style={{ background: "rgba(156,163,175,0.08)", border: "1px solid rgba(156,163,175,0.2)" }}>
        <RefreshCw size={13} className="animate-spin" style={{ color: "rgba(245,237,214,0.40)" }} />
        <span className="text-xs" style={{ color: "rgba(245,237,214,0.50)" }}>Đang kiểm tra cấu hình SMTP...</span>
      </div>
    );
  }

  if (!status.configured) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl"
        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
        <div className="flex items-center gap-2">
          <AlertCircle size={14} style={{ color: "#f59e0b" }} />
          <span className="text-xs" style={{ color: "#92400e" }}>
            Chưa cấu hình SMTP — Email sẽ không được gửi cho đến khi cài đặt xong.
          </span>
        </div>
        <a href="/crm/settings?tab=email" target="_blank"
          className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg font-medium hover:opacity-80 flex-shrink-0 ml-3"
          style={{ background: "rgba(245,158,11,0.12)", color: "#b45309", border: "1px solid rgba(245,158,11,0.2)" }}>
          Cài đặt SMTP <ExternalLink size={10} />
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 rounded-xl"
      style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
      <div className="flex items-center gap-2 min-w-0">
        <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
        <div className="min-w-0">
          <span className="text-xs font-medium" style={{ color: "#15803d" }}>
            SMTP đã cấu hình — Email Automation sẵn sàng hoạt động
          </span>
          <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(245,237,214,0.50)" }}>
            {status.host} · {status.user}
            {status.fromName && ` · Tên gửi: ${status.fromName}`}
          </p>
        </div>
      </div>
      <a href="/crm/settings?tab=email" target="_blank"
        className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg font-medium hover:opacity-80 flex-shrink-0 ml-3"
        style={{ background: "rgba(34,197,94,0.08)", color: "#15803d", border: "1px solid rgba(34,197,94,0.2)" }}>
        Chỉnh sửa <ExternalLink size={10} />
      </a>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmailWorkflowAutomation() {
  const [rules, setRules] = useState<EmailRule[]>([]);
  const [allRules, setAllRules] = useState<{ id: string; actions: { type: string }[] }[]>([]);
  const [smtpStatus, setSmtpStatus] = useState<SmtpStatusInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load ALL automation rules from shared table (same as Zalo Workflow)
    fetch("/api/crm/automation?type=rules")
      .then(r => r.json())
      .then((allData: { id: string; name: string; description: string; enabled: boolean; trigger: { type: string; toStage?: string }; actions: { type: string; emailSubject?: string; emailBody?: string; emailFromName?: string; emailDelayMinutes?: number }[]; runCount: number; lastRunAt: string | null; createdAt: string; updatedAt: string }[]) => {
        if (!Array.isArray(allData)) return;
        setAllRules(allData);
        // Filter only email workflow rules
        const emailRules = allData
          .filter(r => r.actions.some(a => a.type === "send_email_workflow"))
          .map(r => {
            const action = r.actions.find(a => a.type === "send_email_workflow")!;
            return {
              id: r.id,
              enabled: r.enabled,
              name: r.name,
              triggerStage: r.trigger.toStage ?? "new",
              subject: action.emailSubject ?? "",
              body: action.emailBody ?? "",
              delayMinutes: action.emailDelayMinutes ?? 0,
              fromName: action.emailFromName ?? "SmartFurni",
            } as EmailRule;
          });
        setRules(emailRules);
      })
      .catch(() => {});

    // Load SMTP status from Email Marketing settings (crm_settings key "email")
    fetch("/api/crm/settings")
      .then(r => r.json())
      .then(d => {
        const emailCfg = d?.email;
        if (emailCfg?.smtpHost && emailCfg?.smtpUser) {
          setSmtpStatus({
            configured: true,
            host: emailCfg.smtpHost,
            user: emailCfg.smtpUser,
            fromName: emailCfg.senderName ?? emailCfg.fromName ?? "",
          });
        } else {
          setSmtpStatus({ configured: false, host: "", user: "", fromName: "" });
        }
      })
      .catch(() => setSmtpStatus({ configured: false, host: "", user: "", fromName: "" }));
  }, []);

  const addRule = (stageId?: string) => {
    const stage = stageId ?? "new";
    const tpl = DEFAULT_TEMPLATES[stage];
    const newRule: EmailRule = {
      id: `email_rule_${Date.now()}`,
      enabled: true,
      name: `Email: ${STAGE_LABEL[stage] ?? stage}`,
      triggerStage: stage,
      subject: tpl?.subject ?? "",
      body: tpl?.body ?? "",
      delayMinutes: 0,
      fromName: "SmartFurni",
    };
    setRules(prev => [...prev, newRule]);
  };

  const save = async () => {
    setSaving(true);
    try {
      // Convert EmailRule -> AutomationRule format (same as Zalo Workflow pattern)
      const emailAutomationRules = rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        description: `Gửi email tự động khi chuyển sang ${STAGE_LABEL[rule.triggerStage] ?? rule.triggerStage}`,
        enabled: rule.enabled,
        trigger: { type: "stage_changed", toStage: rule.triggerStage },
        actions: [{
          type: "send_email_workflow",
          emailSubject: rule.subject,
          emailBody: rule.body,
          emailFromName: rule.fromName,
          emailDelayMinutes: rule.delayMinutes,
        }],
        runCount: 0,
        lastRunAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      // Merge: keep non-email rules, replace email workflow rules (same as Zalo pattern)
      const nonEmailRules = allRules.filter(r => !r.actions.some(a => a.type === "send_email_workflow"));
      const merged = [...nonEmailRules, ...emailAutomationRules];

      await fetch("/api/crm/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "rules", data: merged }),
      });
      setAllRules(merged);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.2)" }}>
            <Mail size={16} style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "#f5edd6" }}>Email Automation</h2>
            <p className="text-xs" style={{ color: "rgba(245,237,214,0.50)" }}>Tự động gửi email theo giai đoạn khách hàng</p>
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)", color: "#000" }}>
          {saving ? <RefreshCw size={13} className="animate-spin" /> : saved ? <CheckCircle2 size={13} /> : null}
          {saved ? "Đã lưu!" : "Lưu thay đổi"}
        </button>
      </div>

      {/* SMTP Status Banner — reads from Email Marketing settings */}
      <SmtpStatusBanner status={smtpStatus} />

      {/* Quick add by stage */}
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: "rgba(245,237,214,0.85)" }}>Thêm nhanh theo giai đoạn:</p>
        <div className="flex flex-wrap gap-2">
          {STAGES.map(s => (
            <button key={s.id} onClick={() => addRule(s.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
              style={{ background: "rgba(167,139,250,0.08)", color: "#7c3aed", border: "1px solid rgba(167,139,250,0.2)" }}>
              <Plus size={11} /> {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-2xl"
            style={{ background: "transparent", border: "2px dashed #e5e7eb" }}>
            <Mail size={32} style={{ color: "#d1d5db" }} className="mb-3" />
            <p className="text-sm font-medium" style={{ color: "rgba(245,237,214,0.50)" }}>Chưa có quy tắc email nào</p>
            <p className="text-xs mt-1 mb-4" style={{ color: "rgba(245,237,214,0.40)" }}>
              Thêm quy tắc để tự động gửi email khi khách hàng chuyển giai đoạn
            </p>
            <button onClick={() => addRule()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium hover:opacity-80"
              style={{ background: "rgba(167,139,250,0.1)", color: "#7c3aed", border: "1px solid rgba(167,139,250,0.2)" }}>
              <Plus size={14} /> Thêm quy tắc đầu tiên
            </button>
          </div>
        ) : (
          rules.map((rule, idx) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onChange={r => setRules(prev => prev.map((x, i) => i === idx ? r : x))}
              onDelete={() => setRules(prev => prev.filter((_, i) => i !== idx))}
            />
          ))
        )}
      </div>

      {rules.length > 0 && (
        <button onClick={() => addRule()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80"
          style={{ background: "transparent", color: "rgba(245,237,214,0.85)", border: "2px dashed #e5e7eb" }}>
          <Plus size={14} /> Thêm quy tắc mới
        </button>
      )}

      {/* How it works */}
      <div className="p-4 rounded-2xl" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
        <div className="flex items-center gap-2 mb-2">
          <Zap size={13} style={{ color: "#2563eb" }} />
          <p className="text-xs font-semibold" style={{ color: "#1d4ed8" }}>Cách hoạt động:</p>
        </div>
        <ul className="space-y-1">
          {[
            "Khi chuyển giai đoạn: Email gửi ngay (hoặc sau thời gian trì hoãn) khi nhân viên cập nhật giai đoạn",
            "Biến {{name}}, {{stage}}, {{assignedTo}}... được thay thế bằng dữ liệu thực của khách",
            "SMTP được lấy tự động từ cài đặt Email Marketing — không cần cấu hình lại",
            "Lịch sử gửi được ghi nhận trong tab Lịch sử gửi",
          ].map((t, i) => (
            <li key={i} className="text-xs" style={{ color: "#93c5fd" }}>· {t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
