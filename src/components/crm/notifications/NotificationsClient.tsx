"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Bell, MessageSquare, Phone, Clock, CheckCircle,
  AlertCircle, Settings, Plus, Trash2, RefreshCw, Zap
} from "lucide-react";

interface NotificationRule {
  id: string;
  name: string;
  trigger: "overdue" | "stage_change" | "new_lead" | "quote_sent" | "contract_signed";
  channel: "zalo" | "sms" | "both";
  delayHours: number;
  templateId: string;
  isActive: boolean;
  sentCount: number;
}

interface NotificationLog {
  id: string;
  ruleName: string;
  leadName: string;
  channel: string;
  status: "sent" | "failed" | "pending";
  message: string;
  sentAt: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  overdue: "KH quá hạn không tương tác",
  stage_change: "KH chuyển giai đoạn",
  new_lead: "Có lead mới",
  quote_sent: "Đã gửi báo giá",
  contract_signed: "Ký hợp đồng",
};

const CHANNEL_LABELS: Record<string, { label: string; color: string }> = {
  zalo: { label: "Zalo", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  sms: { label: "SMS", color: "text-green-400 bg-green-500/10 border-green-500/20" },
  both: { label: "Zalo + SMS", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
};

const DEFAULT_RULES: NotificationRule[] = [
  { id: "r1", name: "Nhắc KH quá hạn 3 ngày", trigger: "overdue", channel: "zalo", delayHours: 72, templateId: "t3", isActive: true, sentCount: 0 },
  { id: "r2", name: "Chào hỏi lead mới", trigger: "new_lead", channel: "zalo", delayHours: 0, templateId: "t1", isActive: true, sentCount: 0 },
  { id: "r3", name: "Follow-up sau báo giá 2 ngày", trigger: "quote_sent", channel: "both", delayHours: 48, templateId: "t2", isActive: true, sentCount: 0 },
  { id: "r4", name: "Gửi NPS sau ký hợp đồng", trigger: "contract_signed", channel: "zalo", delayHours: 168, templateId: "t5", isActive: true, sentCount: 0 },
];

export default function NotificationsClient() {
  const [rules, setRules] = useState<NotificationRule[]>(DEFAULT_RULES);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"rules" | "logs" | "settings">("rules");
  const [saving, setSaving] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState<Partial<NotificationRule>>({
    trigger: "overdue", channel: "zalo", delayHours: 24, isActive: true
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/notifications");
      if (res.ok) {
        const data = await res.json();
        if (data.rules?.length) setRules(data.rules);
        if (data.logs) setLogs(data.logs);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSaveRules() {
    setSaving(true);
    try {
      await fetch("/api/crm/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
    } finally { setSaving(false); }
  }

  async function handleAddRule() {
    if (!newRule.name) return;
    const rule: NotificationRule = {
      id: `r${Date.now()}`,
      name: newRule.name || "",
      trigger: newRule.trigger || "overdue",
      channel: newRule.channel || "zalo",
      delayHours: newRule.delayHours || 24,
      templateId: "t1",
      isActive: true,
      sentCount: 0,
    };
    setRules(r => [...r, rule]);
    setShowAddRule(false);
    setNewRule({ trigger: "overdue", channel: "zalo", delayHours: 24, isActive: true });
  }

  const stats = {
    active: rules.filter(r => r.isActive).length,
    total: rules.length,
    sent: logs.filter(l => l.status === "sent").length,
    failed: logs.filter(l => l.status === "failed").length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-[#1a1f2e]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center">
              <Bell size={20} className="text-[#C9A84C]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Nhắc nhở tự động</h1>
              <p className="text-sm text-gray-500">Gửi Zalo/SMS tự động theo sự kiện CRM</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 rounded-lg bg-[#1a1f2e] text-gray-400 hover:text-white transition-colors">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={handleSaveRules} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A84C] text-black text-sm font-medium hover:bg-[#d4b55a] transition-colors disabled:opacity-50">
              <CheckCircle size={14} /> {saving ? "Đang lưu..." : "Lưu tất cả"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: "Quy tắc đang bật", value: stats.active, color: "text-emerald-400" },
            { label: "Tổng quy tắc", value: stats.total, color: "text-white" },
            { label: "Đã gửi hôm nay", value: stats.sent, color: "text-blue-400" },
            { label: "Thất bại", value: stats.failed, color: "text-red-400" },
          ].map(s => (
            <div key={s.label} className="bg-[#1a1f2e] rounded-xl p-3 border border-[#252b3b] text-center">
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 bg-[#1a1f2e] rounded-lg p-1 w-fit">
          {[
            { id: "rules", label: "Quy tắc", icon: <Zap size={13} /> },
            { id: "logs", label: "Lịch sử", icon: <Clock size={13} /> },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${tab === t.id ? "bg-[#C9A84C] text-black font-medium" : "text-gray-400 hover:text-white"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Rules Tab */}
        {tab === "rules" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button onClick={() => setShowAddRule(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1f2e] text-gray-400 hover:text-white border border-[#252b3b] text-sm transition-colors">
                <Plus size={14} /> Thêm quy tắc
              </button>
            </div>
            {rules.map(rule => {
              const ch = CHANNEL_LABELS[rule.channel];
              return (
                <div key={rule.id} className={`bg-[#1a1f2e] rounded-xl p-4 border transition-colors ${rule.isActive ? "border-[#252b3b]" : "border-[#1a1f2e] opacity-60"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => setRules(rs => rs.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r))}
                        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 mt-0.5 ${rule.isActive ? "bg-[#C9A84C]" : "bg-[#252b3b]"}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${rule.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                      <div>
                        <div className="text-sm font-medium text-white mb-1">{rule.name}</div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500 bg-[#0f1117] px-2 py-0.5 rounded border border-[#252b3b]">
                            {TRIGGER_LABELS[rule.trigger]}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded border ${ch.color}`}>{ch.label}</span>
                          {rule.delayHours > 0 && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Clock size={10} /> Sau {rule.delayHours >= 24 ? `${rule.delayHours / 24} ngày` : `${rule.delayHours} giờ`}
                            </span>
                          )}
                          {rule.sentCount > 0 && (
                            <span className="text-xs text-gray-600">Đã gửi: {rule.sentCount}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setRules(rs => rs.filter(r => r.id !== rule.id))}
                      className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Logs Tab */}
        {tab === "logs" && (
          <div className="space-y-3">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <Bell size={32} className="mb-3 opacity-30" />
                <p className="text-sm">Chưa có lịch sử gửi thông báo</p>
              </div>
            ) : logs.map(log => (
              <div key={log.id} className="bg-[#1a1f2e] rounded-xl p-4 border border-[#252b3b]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{log.leadName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs border ${CHANNEL_LABELS[log.channel]?.color || "text-gray-400 bg-gray-500/10 border-gray-500/20"}`}>
                        {CHANNEL_LABELS[log.channel]?.label || log.channel}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">{log.ruleName}</div>
                    <p className="text-sm text-gray-400">{log.message}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${
                      log.status === "sent" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      log.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    }`}>
                      {log.status === "sent" ? <CheckCircle size={10} /> : log.status === "failed" ? <AlertCircle size={10} /> : <Clock size={10} />}
                      {log.status === "sent" ? "Đã gửi" : log.status === "failed" ? "Thất bại" : "Đang gửi"}
                    </span>
                    <span className="text-xs text-gray-600">{new Date(log.sentAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Rule Modal */}
      {showAddRule && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1117] border border-[#1a1f2e] rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-[#1a1f2e] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Thêm quy tắc nhắc nhở</h2>
              <button onClick={() => setShowAddRule(false)} className="text-gray-500 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Tên quy tắc *</label>
                <input value={newRule.name || ""} onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))}
                  placeholder="VD: Nhắc KH sau 5 ngày"
                  className="w-full bg-[#1a1f2e] border border-[#252b3b] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C9A84C]/50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Khi nào kích hoạt</label>
                <select value={newRule.trigger} onChange={e => setNewRule(p => ({ ...p, trigger: e.target.value as NotificationRule["trigger"] }))}
                  className="w-full bg-[#1a1f2e] border border-[#252b3b] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C9A84C]/50">
                  {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Kênh gửi</label>
                <div className="flex gap-2">
                  {(["zalo", "sms", "both"] as const).map(ch => (
                    <button key={ch} onClick={() => setNewRule(p => ({ ...p, channel: ch }))}
                      className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${newRule.channel === ch ? "bg-[#C9A84C]/20 border-[#C9A84C]/50 text-[#C9A84C]" : "bg-[#1a1f2e] border-[#252b3b] text-gray-400"}`}>
                      {CHANNEL_LABELS[ch].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Độ trễ (giờ)</label>
                <input type="number" min={0} max={720} value={newRule.delayHours}
                  onChange={e => setNewRule(p => ({ ...p, delayHours: Number(e.target.value) }))}
                  className="w-full bg-[#1a1f2e] border border-[#252b3b] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C9A84C]/50"
                />
                <p className="text-xs text-gray-600 mt-1">0 = gửi ngay lập tức</p>
              </div>
            </div>
            <div className="p-6 border-t border-[#1a1f2e] flex justify-end gap-3">
              <button onClick={() => setShowAddRule(false)} className="px-4 py-2 rounded-lg bg-[#1a1f2e] text-gray-400 text-sm hover:text-white transition-colors">Hủy</button>
              <button onClick={handleAddRule} disabled={!newRule.name}
                className="px-4 py-2 rounded-lg bg-[#C9A84C] text-black text-sm font-medium hover:bg-[#d4b55a] transition-colors disabled:opacity-50">
                Thêm quy tắc
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
