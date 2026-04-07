"use client";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, CheckCircle2, XCircle, Clock, MessageCircle, Mail, Filter, Search, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

interface NotificationLog {
  id: string;
  ruleId: string;
  ruleName: string;
  channel: string;
  actionType?: string;
  recipient: string;
  leadId?: string;
  leadName?: string;
  message: string;
  status: "sent" | "failed" | "pending";
  error?: string;
  sentAt: string;
}

type FilterChannel = "all" | "zalo_personal" | "email" | "zalo_oa" | "sms";
type FilterStatus = "all" | "sent" | "failed" | "pending";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

function getChannelLabel(log: NotificationLog): string {
  if (log.actionType === "zalo_personal") return "Zalo Personal";
  if (log.actionType === "email") return "Email";
  if (log.actionType === "zalo_oa") return "Zalo OA";
  if (log.channel === "zalo") return "Zalo OA";
  if (log.channel === "email") return "Email";
  if (log.channel === "sms") return "SMS";
  return log.channel;
}

function getChannelColor(log: NotificationLog): string {
  if (log.actionType === "zalo_personal") return "#0ea5e9";
  if (log.channel === "email" || log.actionType === "email") return "#8b5cf6";
  if (log.channel === "zalo") return "#06b6d4";
  if (log.channel === "sms") return "#f59e0b";
  return "#6b7280";
}

function getChannelIcon(log: NotificationLog) {
  if (log.channel === "email" || log.actionType === "email") return <Mail size={13} />;
  return <MessageCircle size={13} />;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "sent") return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, background: "#dcfce7", color: "#16a34a", fontSize: 12, fontWeight: 600 }}>
      <CheckCircle2 size={11} /> Thành công
    </span>
  );
  if (status === "failed") return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, background: "#fee2e2", color: "#dc2626", fontSize: 12, fontWeight: 600 }}>
      <XCircle size={11} /> Thất bại
    </span>
  );
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 20, background: "#fef9c3", color: "#ca8a04", fontSize: 12, fontWeight: 600 }}>
      <Clock size={11} /> Đang chờ
    </span>
  );
}

function LogRow({ log }: { log: NotificationLog }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr
        onClick={() => setExpanded(e => !e)}
        style={{ cursor: "pointer", borderBottom: "1px solid #f1f5f9", transition: "background 0.1s" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
        onMouseLeave={e => (e.currentTarget.style.background = "white")}
      >
        <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>{formatDate(log.sentAt)}</span>
        </td>
        <td style={{ padding: "10px 12px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", borderRadius: 20, background: getChannelColor(log) + "18", color: getChannelColor(log), fontSize: 12, fontWeight: 600 }}>
            {getChannelIcon(log)} {getChannelLabel(log)}
          </span>
        </td>
        <td style={{ padding: "10px 12px" }}>
          {log.leadName ? (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>{log.leadName}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{log.recipient}</div>
            </div>
          ) : (
            <span style={{ fontSize: 13, color: "#64748b" }}>{log.recipient}</span>
          )}
        </td>
        <td style={{ padding: "10px 12px", maxWidth: 280 }}>
          <span style={{ fontSize: 12, color: "#374151", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {log.message}
          </span>
        </td>
        <td style={{ padding: "10px 12px" }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>{log.ruleName || "—"}</span>
        </td>
        <td style={{ padding: "10px 12px" }}>
          <StatusBadge status={log.status} />
        </td>
        <td style={{ padding: "10px 12px", textAlign: "center" }}>
          {expanded ? <ChevronDown size={14} color="#94a3b8" /> : <ChevronRight size={14} color="#94a3b8" />}
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
          <td colSpan={7} style={{ padding: "12px 24px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Nội dung tin nhắn</div>
                <div style={{ fontSize: 13, color: "#374151", background: "white", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-wrap", maxHeight: 120, overflowY: "auto" }}>
                  {log.message}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Quy tắc: </span>
                  <span style={{ fontSize: 13, color: "#374151" }}>{log.ruleName || "Thủ công"}</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Kênh: </span>
                  <span style={{ fontSize: 13, color: "#374151" }}>{getChannelLabel(log)}</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Người nhận: </span>
                  <span style={{ fontSize: 13, color: "#374151" }}>{log.leadName ? `${log.leadName} (${log.recipient})` : log.recipient}</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>Thời gian: </span>
                  <span style={{ fontSize: 13, color: "#374151" }}>{formatDate(log.sentAt)}</span>
                </div>
                {log.error && (
                  <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 6, padding: "8px 10px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", marginBottom: 2 }}>Lỗi:</div>
                    <div style={{ fontSize: 12, color: "#b91c1c" }}>{log.error}</div>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AutomationHistoryPanel() {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState<FilterChannel>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(100);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/notifications?type=logs&limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      }
    } catch { /* silent */ }
    setLoading(false);
  }, [limit]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = logs.filter(log => {
    // Filter by channel
    if (filterChannel !== "all") {
      if (filterChannel === "zalo_personal" && log.actionType !== "zalo_personal") return false;
      if (filterChannel === "email" && log.channel !== "email" && log.actionType !== "email") return false;
      if (filterChannel === "zalo_oa" && !(log.channel === "zalo" && log.actionType !== "zalo_personal")) return false;
      if (filterChannel === "sms" && log.channel !== "sms") return false;
    }
    // Filter by status
    if (filterStatus !== "all" && log.status !== filterStatus) return false;
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!log.leadName?.toLowerCase().includes(q) &&
          !log.recipient?.toLowerCase().includes(q) &&
          !log.ruleName?.toLowerCase().includes(q) &&
          !log.message?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Stats
  const totalSent = logs.filter(l => l.status === "sent").length;
  const totalFailed = logs.filter(l => l.status === "failed").length;
  const totalZaloPersonal = logs.filter(l => l.actionType === "zalo_personal").length;
  const totalEmail = logs.filter(l => l.channel === "email").length;

  return (
    <div style={{ padding: "24px 0" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: 0 }}>Lịch sử gửi tự động</h3>
          <p style={{ fontSize: 13, color: "#64748b", margin: "4px 0 0" }}>Theo dõi trạng thái gửi Zalo Personal và Email từ automation</p>
        </div>
        <button
          onClick={loadLogs}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", cursor: "pointer", fontSize: 13, color: "#374151", fontWeight: 500 }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Làm mới
        </button>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Tổng đã gửi", value: totalSent, color: "#16a34a", bg: "#dcfce7", icon: <CheckCircle2 size={18} /> },
          { label: "Thất bại", value: totalFailed, color: "#dc2626", bg: "#fee2e2", icon: <XCircle size={18} /> },
          { label: "Zalo Personal", value: totalZaloPersonal, color: "#0ea5e9", bg: "#e0f2fe", icon: <MessageCircle size={18} /> },
          { label: "Email", value: totalEmail, color: "#8b5cf6", bg: "#ede9fe", icon: <Mail size={18} /> },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ color: s.color }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, color: s.color + "cc", marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm tên khách, SĐT, nội dung..."
            style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13, color: "#374151", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        {/* Channel filter */}
        <div style={{ display: "flex", gap: 4 }}>
          <Filter size={14} style={{ color: "#94a3b8", alignSelf: "center" }} />
          {([
            { key: "all", label: "Tất cả" },
            { key: "zalo_personal", label: "Zalo Personal" },
            { key: "email", label: "Email" },
            { key: "zalo_oa", label: "Zalo OA" },
          ] as { key: FilterChannel; label: string }[]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilterChannel(f.key)}
              style={{
                padding: "6px 12px", borderRadius: 20, border: "1px solid",
                borderColor: filterChannel === f.key ? "#0ea5e9" : "#e2e8f0",
                background: filterChannel === f.key ? "#e0f2fe" : "white",
                color: filterChannel === f.key ? "#0284c7" : "#64748b",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div style={{ display: "flex", gap: 4 }}>
          {([
            { key: "all", label: "Mọi trạng thái" },
            { key: "sent", label: "✅ Thành công" },
            { key: "failed", label: "❌ Thất bại" },
            { key: "pending", label: "⏳ Chờ" },
          ] as { key: FilterStatus; label: string }[]).map(f => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              style={{
                padding: "6px 12px", borderRadius: 20, border: "1px solid",
                borderColor: filterStatus === f.key ? "#6366f1" : "#e2e8f0",
                background: filterStatus === f.key ? "#eef2ff" : "white",
                color: filterStatus === f.key ? "#4f46e5" : "#64748b",
                fontSize: 12, fontWeight: 500, cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
            <RefreshCw size={24} style={{ margin: "0 auto 8px", display: "block" }} />
            <div style={{ fontSize: 14 }}>Đang tải lịch sử...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Chưa có lịch sử gửi</div>
            <div style={{ fontSize: 13, color: "#94a3b8" }}>
              {logs.length === 0
                ? "Khi automation gửi Zalo Personal hoặc Email, lịch sử sẽ hiển thị ở đây."
                : "Không có kết quả khớp với bộ lọc hiện tại."}
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: "10px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#64748b" }}>Hiển thị <strong>{filtered.length}</strong> / {logs.length} bản ghi</span>
              {logs.length >= limit && (
                <button
                  onClick={() => setLimit(l => l + 100)}
                  style={{ fontSize: 12, color: "#0ea5e9", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}
                >
                  Tải thêm 100 bản ghi
                </button>
              )}
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    {["Thời gian", "Kênh", "Khách hàng", "Nội dung", "Quy tắc", "Trạng thái", ""].map(h => (
                      <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(log => <LogRow key={log.id} log={log} />)}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Note */}
      <div style={{ marginTop: 16, padding: "12px 16px", background: "#f0f9ff", borderRadius: 8, border: "1px solid #bae6fd" }}>
        <div style={{ fontSize: 12, color: "#0369a1" }}>
          <strong>Lưu ý:</strong> Lịch sử bao gồm tất cả tin nhắn gửi từ automation (Zalo Personal, Email). Click vào từng dòng để xem chi tiết nội dung và lỗi (nếu có).
        </div>
      </div>
    </div>
  );
}
