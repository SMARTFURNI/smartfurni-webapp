"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Star, TrendingUp, Users, ThumbsUp, ThumbsDown, Minus,
  Send, RefreshCw, Settings, CheckCircle, Clock, AlertCircle,
  BarChart3, MessageSquare, Plus, Filter
} from "lucide-react";
import type { NpsSurvey, NpsStats, NpsConfig } from "@/lib/crm-nps-store";

const STATUS_MAP = {
  pending: { label: "Chờ gửi", color: "text-gray-500 bg-gray-400/10 border-gray-400/20" },
  sent: { label: "Đã gửi", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  completed: { label: "Đã hoàn thành", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  expired: { label: "Hết hạn", color: "text-red-400 bg-red-400/10 border-red-400/20" },
};

const CATEGORY_MAP = {
  promoter: { label: "Người ủng hộ", color: "text-emerald-400", icon: <ThumbsUp size={14} /> },
  passive: { label: "Trung lập", color: "text-yellow-400", icon: <Minus size={14} /> },
  detractor: { label: "Người phản đối", color: "text-red-400", icon: <ThumbsDown size={14} /> },
};

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 50 ? "#10b981" : score >= 0 ? "#f59e0b" : "#ef4444";
  const label = score >= 50 ? "Xuất sắc" : score >= 0 ? "Tốt" : "Cần cải thiện";
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-16 overflow-hidden">
        <div className="absolute inset-0 rounded-t-full border-8 border-[rgba(255,255,255,0.12)]" />
        <div
          className="absolute inset-0 rounded-t-full border-8 transition-all duration-700"
          style={{
            borderColor: color,
            clipPath: `polygon(0 100%, 100% 100%, 100% ${50 - score / 2}%, 0 ${50 - score / 2}%)`,
          }}
        />
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-xs mt-1" style={{ color }}>{label}</span>
    </div>
  );
}

export default function NpsClient() {
  const [surveys, setSurveys] = useState<NpsSurvey[]>([]);
  const [stats, setStats] = useState<NpsStats | null>(null);
  const [config, setConfig] = useState<NpsConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "surveys" | "settings">("overview");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSurvey, setNewSurvey] = useState({ leadId: "", leadName: "", leadPhone: "", leadEmail: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [surveysRes, statsRes, configRes] = await Promise.all([
        fetch("/api/crm/nps"),
        fetch("/api/crm/nps?stats=1"),
        fetch("/api/crm/nps?config=1"),
      ]);
      if (surveysRes.ok) setSurveys(await surveysRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (configRes.ok) setConfig(await configRes.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = surveys.filter(s => filterStatus === "all" || s.status === filterStatus);

  async function handleSend(id: string) {
    await fetch(`/api/crm/nps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "sent" }),
    });
    load();
  }

  async function handleCreate() {
    setSaving(true);
    try {
      await fetch("/api/crm/nps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSurvey),
      });
      setShowCreateModal(false);
      setNewSurvey({ leadId: "", leadName: "", leadPhone: "", leadEmail: "" });
      load();
    } finally { setSaving(false); }
  }

  async function handleSaveConfig() {
    if (!config) return;
    setSaving(true);
    try {
      await fetch("/api/crm/nps?config=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
    } finally { setSaving(false); }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-[rgba(255,255,255,0.12)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Đánh giá NPS</h1>
            <p className="text-sm text-gray-500 mt-0.5">Khảo sát độ hài lòng khách hàng sau khi chốt đơn</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 rounded-lg bg-transparent text-gray-500 hover:text-gray-900 transition-colors">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A84C] text-black text-sm font-medium hover:bg-[#d4b55a] transition-colors"
            >
              <Plus size={16} /> Tạo khảo sát
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-transparent rounded-lg p-1 w-fit">
          {[
            { id: "overview", label: "Tổng quan", icon: <BarChart3 size={14} /> },
            { id: "surveys", label: "Danh sách", icon: <MessageSquare size={14} /> },
            { id: "settings", label: "Cài đặt", icon: <Settings size={14} /> },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-all ${tab === t.id ? "bg-[#C9A84C] text-black font-medium" : "text-gray-500 hover:text-gray-900"}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Overview Tab */}
        {tab === "overview" && stats && (
          <div className="space-y-6">
            {/* NPS Score */}
            <div className="bg-transparent rounded-2xl p-6 border border-[rgba(255,255,255,0.12)] shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-medium text-gray-900 mb-1">Điểm NPS tổng thể</h2>
                  <p className="text-sm text-gray-500">Net Promoter Score (-100 đến +100)</p>
                </div>
                <ScoreGauge score={stats.npsScore} />
              </div>
              <div className="grid grid-cols-4 gap-4 mt-6">
                {[
                  { label: "Tổng khảo sát", value: stats.total, color: "text-[#f5edd6]" },
                  { label: "Đã hoàn thành", value: stats.completed, color: "text-emerald-400" },
                  { label: "Tỷ lệ phản hồi", value: `${stats.responseRate}%`, color: "text-blue-400" },
                  { label: "Điểm TB", value: stats.avgScore, color: "text-[#C9A84C]" },
                ].map(s => (
                  <div key={s.label} className="bg-transparent rounded-xl p-4 text-center border border-[rgba(255,255,255,0.12)]">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category breakdown */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { key: "promoter", label: "Người ủng hộ", desc: "Điểm 9-10", count: stats.promoters, pct: stats.promoterPct, color: "#10b981", bg: "bg-emerald-500/10 border-emerald-500/20" },
                { key: "passive", label: "Trung lập", desc: "Điểm 7-8", count: stats.passives, pct: stats.passivePct, color: "#f59e0b", bg: "bg-yellow-500/10 border-yellow-500/20" },
                { key: "detractor", label: "Phản đối", desc: "Điểm 0-6", count: stats.detractors, pct: stats.detractorPct, color: "#ef4444", bg: "bg-red-500/10 border-red-500/20" },
              ].map(c => (
                <div key={c.key} className={`rounded-xl p-5 border ${c.bg}`}>
                  <div className="text-3xl font-bold mb-1" style={{ color: c.color }}>{c.count}</div>
                  <div className="text-sm font-medium text-gray-900">{c.label}</div>
                  <div className="text-xs text-gray-500 mb-3">{c.desc}</div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                  </div>
                  <div className="text-xs mt-1" style={{ color: c.color }}>{c.pct}%</div>
                </div>
              ))}
            </div>

            {/* Trend */}
            {stats.trend.length > 0 && (
              <div className="bg-transparent rounded-2xl p-6 border border-[rgba(255,255,255,0.12)] shadow-sm">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Xu hướng điểm NPS theo tháng</h3>
                <div className="flex items-end gap-3 h-32">
                  {stats.trend.map(t => {
                    const pct = ((t.score + 10) / 20) * 100;
                    const color = t.score >= 7 ? "#10b981" : t.score >= 5 ? "#f59e0b" : "#ef4444";
                    return (
                      <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs font-medium" style={{ color }}>{t.score}</span>
                        <div className="w-full bg-transparent rounded-t-sm overflow-hidden" style={{ height: "80px" }}>
                          <div className="w-full rounded-t-sm transition-all duration-700" style={{ height: `${pct}%`, backgroundColor: color, marginTop: `${100 - pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{t.month.slice(5)}</span>
                        <span className="text-xs text-gray-600">{t.count} KH</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Surveys Tab */}
        {tab === "surveys" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-transparent border border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-amber-400/70"
              >
                <option value="all">Tất cả trạng thái</option>
                {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <Star size={32} className="mb-3 opacity-30" />
                <p className="text-sm">Chưa có khảo sát nào</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(s => {
                  const st = STATUS_MAP[s.status];
                  return (
                    <div key={s.id} className="bg-transparent rounded-xl p-4 border border-[rgba(255,255,255,0.12)] shadow-sm hover:border-[#C9A84C]/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">{s.leadName}</span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${st.color}`}>
                              {s.status === "completed" ? <CheckCircle size={10} /> : s.status === "sent" ? <Clock size={10} /> : <AlertCircle size={10} />}
                              {st.label}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">{s.leadPhone} · {s.leadEmail}</div>
                          {s.status === "completed" && s.score !== undefined && (
                            <div className="mt-3 flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Điểm:</span>
                                <span className={`text-lg font-bold ${s.score >= 9 ? "text-emerald-400" : s.score >= 7 ? "text-yellow-400" : "text-red-400"}`}>{s.score}/10</span>
                              </div>
                              {s.category && (
                                <div className={`flex items-center gap-1 text-xs ${CATEGORY_MAP[s.category].color}`}>
                                  {CATEGORY_MAP[s.category].icon}
                                  {CATEGORY_MAP[s.category].label}
                                </div>
                              )}
                              {s.wouldRecommend !== undefined && (
                                <div className={`text-xs ${s.wouldRecommend ? "text-emerald-400" : "text-red-400"}`}>
                                  {s.wouldRecommend ? "✓ Sẽ giới thiệu" : "✗ Không giới thiệu"}
                                </div>
                              )}
                            </div>
                          )}
                          {s.feedback && (
                            <div className="mt-2 text-sm text-gray-600 bg-transparent rounded-lg p-3 italic">
                              &ldquo;{s.feedback}&rdquo;
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-gray-600">{new Date(s.createdAt).toLocaleDateString("vi-VN")}</span>
                          {s.status === "pending" && (
                            <button
                              onClick={() => handleSend(s.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs hover:bg-blue-500/20 transition-colors"
                            >
                              <Send size={12} /> Gửi khảo sát
                            </button>
                          )}
                          {s.status === "sent" && (
                            <div className="text-xs text-gray-500">
                              Đã gửi: {s.sentAt ? new Date(s.sentAt).toLocaleDateString("vi-VN") : "—"}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {tab === "settings" && config && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-transparent rounded-2xl p-6 border border-[rgba(255,255,255,0.12)] shadow-sm">
              <h3 className="text-base font-medium text-gray-900 mb-4">Cấu hình khảo sát NPS</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-900">Kích hoạt NPS tự động</div>
                    <div className="text-xs text-gray-500">Tự động tạo khảo sát khi hợp đồng được ký</div>
                  </div>
                  <button
                    onClick={() => setConfig(c => c ? { ...c, isActive: !c.isActive } : c)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${config.isActive ? "bg-[#C9A84C]" : "bg-gray-100"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${config.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Gửi sau khi ký (ngày)</label>
                    <input
                      type="number" min={1} max={30}
                      value={config.sendAfterDays}
                      onChange={e => setConfig(c => c ? { ...c, sendAfterDays: Number(e.target.value) } : c)}
                      className="w-full bg-transparent border border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">Nhắc lại sau (ngày)</label>
                    <input
                      type="number" min={1} max={14}
                      value={config.reminderAfterDays}
                      onChange={e => setConfig(c => c ? { ...c, reminderAfterDays: Number(e.target.value) } : c)}
                      className="w-full bg-transparent border border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Tiêu đề khảo sát</label>
                  <input
                    value={config.surveyTitle}
                    onChange={e => setConfig(c => c ? { ...c, surveyTitle: e.target.value } : c)}
                    className="w-full bg-transparent border border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Lời mở đầu</label>
                  <textarea
                    value={config.surveyIntro}
                    onChange={e => setConfig(c => c ? { ...c, surveyIntro: e.target.value } : c)}
                    rows={3}
                    className="w-full bg-transparent border border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Lời cảm ơn</label>
                  <textarea
                    value={config.thankYouMessage}
                    onChange={e => setConfig(c => c ? { ...c, thankYouMessage: e.target.value } : c)}
                    rows={2}
                    className="w-full bg-transparent border border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#C9A84C]/50 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Kênh gửi</label>
                  <div className="flex gap-2">
                    {(["zalo", "sms", "email"] as const).map(ch => (
                      <button
                        key={ch}
                        onClick={() => setConfig(c => {
                          if (!c) return c;
                          const channels = c.channels.includes(ch)
                            ? c.channels.filter(x => x !== ch)
                            : [...c.channels, ch];
                          return { ...c, channels };
                        })}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${config.channels.includes(ch) ? "bg-[#C9A84C]/20 border-[#C9A84C]/50 text-[#C9A84C]" : "bg-white border-gray-200 text-gray-500"}`}
                      >
                        {ch === "zalo" ? "Zalo" : ch === "sms" ? "SMS" : "Email"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={handleSaveConfig}
                disabled={saving}
                className="mt-4 px-4 py-2 rounded-lg bg-[#C9A84C] text-black text-sm font-medium hover:bg-[#d4b55a] transition-colors disabled:opacity-50"
              >
                {saving ? "Đang lưu..." : "Lưu cài đặt"}
              </button>
            </div>

            {/* Survey link preview */}
            <div className="bg-transparent rounded-2xl p-6 border border-[rgba(255,255,255,0.12)] shadow-sm">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Link khảo sát mẫu</h3>
              <div className="bg-transparent rounded-lg p-3 font-mono text-xs text-[#C9A84C] break-all">
                {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/nps/[survey-id]
              </div>
              <p className="text-xs text-gray-500 mt-2">Link này được gửi tự động qua Zalo/SMS sau khi hợp đồng được ký</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-transparent border border-[rgba(255,255,255,0.12)] rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-[rgba(255,255,255,0.12)] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Tạo khảo sát NPS</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-900">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: "leadName", label: "Tên khách hàng *", placeholder: "Nguyễn Văn A" },
                { key: "leadPhone", label: "Số điện thoại", placeholder: "0901234567" },
                { key: "leadEmail", label: "Email", placeholder: "email@company.com" },
                { key: "leadId", label: "Lead ID (nếu có)", placeholder: "ID trong CRM" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 mb-1.5">{f.label}</label>
                  <input
                    value={(newSurvey as Record<string, string>)[f.key]}
                    onChange={e => setNewSurvey(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-transparent border border-[rgba(255,255,255,0.12)] rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-[rgba(245,237,214,0.35)] focus:outline-none focus:border-amber-400/70"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-[rgba(255,255,255,0.12)] flex justify-end gap-3">
              <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-lg bg-transparent text-gray-600 text-sm hover:text-gray-900 transition-colors">Hủy</button>
              <button
                onClick={handleCreate}
                disabled={saving || !newSurvey.leadName}
                className="px-4 py-2 rounded-lg bg-[#C9A84C] text-black text-sm font-medium hover:bg-[#d4b55a] transition-colors disabled:opacity-50"
              >
                {saving ? "Đang tạo..." : "Tạo khảo sát"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
