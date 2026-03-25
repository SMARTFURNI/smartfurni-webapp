"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield, Search, RefreshCw, Download, Filter,
  User, Settings, FileText, Key, LogIn, LogOut,
  AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight,
} from "lucide-react";
import type { AuditLog, AuditAction } from "@/lib/crm-audit-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  "lead.created":       { label: "Tạo KH",         color: "#22c55e", icon: User },
  "lead.updated":       { label: "Sửa KH",          color: "#60a5fa", icon: User },
  "lead.deleted":       { label: "Xóa KH",          color: "#f87171", icon: User },
  "lead.stage_changed": { label: "Đổi giai đoạn",   color: "#C9A84C", icon: User },
  "quote.created":      { label: "Tạo báo giá",     color: "#22c55e", icon: FileText },
  "quote.updated":      { label: "Sửa báo giá",     color: "#60a5fa", icon: FileText },
  "quote.sent":         { label: "Gửi báo giá",     color: "#a78bfa", icon: FileText },
  "quote.approved":     { label: "Duyệt báo giá",   color: "#C9A84C", icon: FileText },
  "activity.created":   { label: "Thêm hoạt động",  color: "#22c55e", icon: CheckCircle2 },
  "activity.deleted":   { label: "Xóa hoạt động",   color: "#f87171", icon: CheckCircle2 },
  "task.created":       { label: "Tạo task",         color: "#22c55e", icon: CheckCircle2 },
  "task.completed":     { label: "Hoàn thành task",  color: "#C9A84C", icon: CheckCircle2 },
  "task.deleted":       { label: "Xóa task",         color: "#f87171", icon: CheckCircle2 },
  "staff.created":      { label: "Thêm nhân viên",  color: "#22c55e", icon: User },
  "staff.updated":      { label: "Sửa nhân viên",   color: "#60a5fa", icon: User },
  "staff.deleted":      { label: "Xóa nhân viên",   color: "#f87171", icon: User },
  "settings.updated":   { label: "Cập nhật cài đặt",color: "#f97316", icon: Settings },
  "auth.login":         { label: "Đăng nhập",        color: "#22c55e", icon: LogIn },
  "auth.logout":        { label: "Đăng xuất",        color: "#94a3b8", icon: LogOut },
  "auth.failed":        { label: "Đăng nhập thất bại",color: "#f87171", icon: AlertTriangle },
  "data.exported":      { label: "Xuất dữ liệu",    color: "#a78bfa", icon: Download },
  "data.imported":      { label: "Nhập dữ liệu",    color: "#60a5fa", icon: Download },
  "apikey.created":     { label: "Tạo API Key",      color: "#22c55e", icon: Key },
  "apikey.revoked":     { label: "Thu hồi API Key",  color: "#f87171", icon: Key },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "Vừa xong";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} phút trước`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} giờ trước`;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const ACTION_GROUPS = [
  { label: "Khách hàng", actions: ["lead.created", "lead.updated", "lead.deleted", "lead.stage_changed"] },
  { label: "Báo giá", actions: ["quote.created", "quote.updated", "quote.sent", "quote.approved"] },
  { label: "Task & Hoạt động", actions: ["activity.created", "activity.deleted", "task.created", "task.completed", "task.deleted"] },
  { label: "Nhân viên", actions: ["staff.created", "staff.updated", "staff.deleted"] },
  { label: "Hệ thống", actions: ["settings.updated", "auth.login", "auth.logout", "auth.failed", "data.exported", "data.imported", "apikey.created", "apikey.revoked"] },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditLogClient() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<AuditAction | "">("");
  const [filterEntityType, setFilterEntityType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const LIMIT = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(LIMIT),
      offset: String(page * LIMIT),
    });
    if (filterAction) params.set("action", filterAction);
    if (filterEntityType) params.set("entityType", filterEntityType);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/crm/audit?${params}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [filterAction, filterEntityType, dateFrom, dateTo, page]);

  useEffect(() => { load(); }, [load]);

  const filtered = logs.filter(l =>
    !search ||
    l.actorName.toLowerCase().includes(search.toLowerCase()) ||
    (l.entityName ?? "").toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="space-y-5" style={{ color: "#fff" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Nhật ký hoạt động</h1>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            Toàn bộ hành động trong hệ thống CRM — {total.toLocaleString()} bản ghi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg hover:bg-white/5 transition-all"
            style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => window.open("/api/crm/import?format=csv", "_blank")}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Download size={13} /> Xuất CSV
          </button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.25)" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm theo tên, hành động..."
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#fff" }}
          />
        </div>
        <button
          onClick={() => setShowFilters(v => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
          style={{
            background: showFilters ? "rgba(201,168,76,0.1)" : "rgba(255,255,255,0.04)",
            color: showFilters ? "#C9A84C" : "rgba(255,255,255,0.4)",
            border: `1px solid ${showFilters ? "rgba(201,168,76,0.25)" : "rgba(255,255,255,0.08)"}`,
          }}>
          <Filter size={14} /> Bộ lọc
        </button>
      </div>

      {/* Advanced filters */}
      {showFilters && (
        <div className="p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Loại hành động</label>
            <select value={filterAction} onChange={e => { setFilterAction(e.target.value as AuditAction | ""); setPage(0); }}
              className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
              <option value="">Tất cả</option>
              {ACTION_GROUPS.map(g => (
                <optgroup key={g.label} label={g.label}>
                  {g.actions.map(a => <option key={a} value={a}>{ACTION_META[a]?.label ?? a}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Đối tượng</label>
            <select value={filterEntityType} onChange={e => { setFilterEntityType(e.target.value); setPage(0); }}
              className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}>
              <option value="">Tất cả</option>
              <option value="lead">Khách hàng</option>
              <option value="quote">Báo giá</option>
              <option value="task">Task</option>
              <option value="staff">Nhân viên</option>
              <option value="settings">Cài đặt</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Từ ngày</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }}
              className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Đến ngày</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }}
              className="w-full px-2 py-1.5 rounded-lg text-xs outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </div>
        </div>
      )}

      {/* Log table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.04)" }}>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>Hành động</th>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>Đối tượng</th>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>Người thực hiện</th>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>IP</th>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "rgba(255,255,255,0.35)" }}>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12" style={{ color: "rgba(255,255,255,0.25)" }}>
                <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                <p className="text-xs">Đang tải...</p>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12" style={{ color: "rgba(255,255,255,0.25)" }}>
                <Shield size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Chưa có nhật ký nào</p>
              </td></tr>
            ) : filtered.map(log => {
              const meta = ACTION_META[log.action] ?? { label: log.action, color: "#94a3b8", icon: Settings };
              const Icon = meta.icon;
              return (
                <tr key={log.id} onClick={() => setSelectedLog(log)}
                  className="cursor-pointer transition-all hover:bg-white/3"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${meta.color}15` }}>
                        <Icon size={12} style={{ color: meta.color }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: meta.color }}>{meta.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {log.entityName ?? log.entityType ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>
                        {log.actorName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{log.actorName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {log.ipAddress ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {formatTime(log.createdAt)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            Hiển thị {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} / {total} bản ghi
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1.5 rounded-lg transition-all disabled:opacity-30"
              style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs px-3" style={{ color: "rgba(255,255,255,0.4)" }}>
              {page + 1} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg transition-all disabled:opacity-30"
              style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setSelectedLog(null)}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4"
            style={{ background: "#ffffff", border: "1px solid rgba(255,255,255,0.1)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Chi tiết nhật ký</h3>
              <button onClick={() => setSelectedLog(null)} className="text-xs px-2 py-1 rounded"
                style={{ color: "rgba(255,255,255,0.4)" }}>✕</button>
            </div>
            <div className="space-y-2 text-xs">
              {[
                ["ID", selectedLog.id],
                ["Hành động", ACTION_META[selectedLog.action]?.label ?? selectedLog.action],
                ["Đối tượng", `${selectedLog.entityType ?? "—"}: ${selectedLog.entityName ?? "—"}`],
                ["Người thực hiện", selectedLog.actorName],
                ["IP Address", selectedLog.ipAddress ?? "—"],
                ["Thời gian", new Date(selectedLog.createdAt).toLocaleString("vi-VN")],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-1.5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "rgba(255,255,255,0.35)" }}>{k}</span>
                  <span className="font-medium text-right" style={{ color: "rgba(255,255,255,0.7)" }}>{v}</span>
                </div>
              ))}
              {selectedLog.changes && (
                <div className="mt-3">
                  <p className="font-semibold mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Thay đổi</p>
                  <pre className="text-[10px] p-3 rounded-lg overflow-auto max-h-40"
                    style={{ background: "rgba(255,255,255,0.04)", color: "#C9A84C" }}>
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
