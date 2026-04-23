"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionEvent {
  id: string;
  sessionId: string;
  path: string;
  title: string;
  enteredAt: string;
  duration: number;
  isActive: boolean;
}

interface SessionListItem {
  sessionId: string;
  startedAt: string;
  lastSeenAt: string;
  totalDuration: number;
  pageCount: number;
  device: string;
  browser: string;
  os: string;
  referrer: string;
  entryPage: string;
  exitPage: string;
  isActive: boolean;
}

interface VisitorSession extends SessionListItem {
  country: string;
  events: SessionEvent[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "–";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}p ${s}s` : `${m}p`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}g ${rm}p` : `${h}g`;
}

function timeAgo(isoStr: string): string {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 10) return "vừa xong";
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}g trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

function deviceIcon(device: string): string {
  if (device === "Mobile") return "📱";
  if (device === "Tablet") return "📟";
  return "🖥️";
}

function sourceLabel(ref: string): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    Google: { label: "Google", color: "#4285F4", bg: "#4285F420" },
    Facebook: { label: "Facebook", color: "#1877F2", bg: "#1877F220" },
    Instagram: { label: "Instagram", color: "#E1306C", bg: "#E1306C20" },
    TikTok: { label: "TikTok", color: "#a855f7", bg: "#a855f720" },
    YouTube: { label: "YouTube", color: "#FF0000", bg: "#FF000020" },
    Zalo: { label: "Zalo", color: "#0068FF", bg: "#0068FF20" },
    Direct: { label: "Trực tiếp", color: "#9CA3AF", bg: "#9CA3AF20" },
  };
  return map[ref] || { label: ref, color: "#C9A84C", bg: "#C9A84C20" };
}

function pathLabel(path: string): string {
  if (path === "/") return "Trang chủ";
  if (path === "/products") return "Sản phẩm";
  if (path.startsWith("/products/")) return path.replace("/products/", "");
  if (path === "/contact") return "Liên hệ";
  if (path === "/about") return "Giới thiệu";
  if (path === "/blog") return "Blog";
  if (path.startsWith("/blog/")) return path.replace("/blog/", "");
  if (path === "/cart") return "Giỏ hàng";
  if (path === "/checkout") return "Thanh toán";
  if (path === "/configurator") return "Cấu hình 3D";
  return path;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SessionsClient() {
  const [filter, setFilter] = useState<"all" | "active" | "today" | "week">("today");
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [activeNow, setActiveNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VisitorSession | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [tick, setTick] = useState(0); // force re-render for timeAgo
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/sessions?filter=${filter}&limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      setSessions(data.sessions || []);
      setTotal(data.total || 0);
      setActiveNow(data.activeNow || 0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [filter]);

  const fetchDetail = useCallback(async (sessionId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/sessions?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return;
      const data: VisitorSession = await res.json();
      setSelected(data);
    } catch { /* silent */ }
    finally { setDetailLoading(false); }
  }, []);

  // Initial load + filter change
  useEffect(() => {
    setLoading(true);
    fetchSessions();
  }, [fetchSessions]);

  // Auto-refresh every 5s (matching heartbeat interval)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isLive) return;
    intervalRef.current = setInterval(() => {
      fetchSessions();
      if (selected) fetchDetail(selected.sessionId);
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isLive, fetchSessions, fetchDetail, selected]);

  // Tick every second to update timeAgo displays
  useEffect(() => {
    tickRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, []);

  // Suppress unused variable warning
  void tick;

  const maxDuration = selected
    ? Math.max(...selected.events.map(e => e.duration || 1), 1)
    : 1;

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">

      {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
      <div className="w-[360px] flex-shrink-0 flex flex-col border-r border-white/5">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Khách truy cập</span>
              {activeNow > 0 && (
                <span className="flex items-center gap-1 bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-500/20">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  {activeNow} online
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsLive(v => !v)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                  isLive
                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                    : "bg-white/3 border-white/10 text-[rgba(245,237,214,0.55)]"
                }`}
              >
                {isLive ? "● Live" : "○ Tắt"}
              </button>
              <button
                onClick={fetchSessions}
                className="text-xs px-2.5 py-1 rounded-full border border-white/10 bg-white/3 text-[rgba(245,237,214,0.70)] hover:text-white transition-colors"
              >
                ↻
              </button>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-0.5 bg-white/3 rounded-lg p-0.5">
            {(["active", "today", "week", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 text-xs py-1.5 rounded-md transition-all font-medium ${
                  filter === f
                    ? "bg-white/10 text-white"
                    : "text-[rgba(245,237,214,0.55)] hover:text-gray-300"
                }`}
              >
                {f === "active" ? "Online" : f === "today" ? "Hôm nay" : f === "week" ? "7 ngày" : "Tất cả"}
                {f === "active" && activeNow > 0 && (
                  <span className="ml-1 bg-green-500 text-white text-[9px] rounded-full px-1">{activeNow}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-[rgba(245,237,214,0.45)] text-sm">Đang tải...</div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-[rgba(245,237,214,0.45)]">
              <span className="text-3xl">👁️</span>
              <p className="text-sm">Chưa có phiên truy cập</p>
            </div>
          ) : (
            sessions.map((s) => {
              const src = sourceLabel(s.referrer);
              const isSelected = selected?.sessionId === s.sessionId;
              return (
                <button
                  key={s.sessionId}
                  onClick={() => fetchDetail(s.sessionId)}
                  className={`w-full text-left px-4 py-3 border-b border-white/3 hover:bg-white/3 transition-all ${
                    isSelected ? "bg-[#C9A84C]/5 border-l-2 border-l-[#C9A84C]" : ""
                  }`}
                >
                  {/* Row 1: status + id + time */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      {s.isActive ? (
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse flex-shrink-0" />
                      ) : (
                        <span className="w-2 h-2 bg-gray-700 rounded-full flex-shrink-0" />
                      )}
                      <span className="text-xs font-mono text-[rgba(245,237,214,0.55)]">{s.sessionId.slice(0, 10)}…</span>
                      <span className="text-xs">{deviceIcon(s.device)}</span>
                    </div>
                    <span className="text-[11px] text-[rgba(245,237,214,0.45)]">{timeAgo(s.lastSeenAt)}</span>
                  </div>

                  {/* Row 2: Current URL — Talkto style */}
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md truncate max-w-[260px] ${
                      s.isActive
                        ? "bg-green-500/10 text-green-300"
                        : "bg-white/5 text-[rgba(245,237,214,0.70)]"
                    }`}>
                      {s.isActive ? "● " : ""}{s.exitPage}
                    </span>
                  </div>

                  {/* Row 3: meta */}
                  <div className="flex items-center gap-2 text-[11px] text-[rgba(245,237,214,0.45)]">
                    <span>{s.pageCount} trang</span>
                    <span>·</span>
                    <span>{formatDuration(s.totalDuration)}</span>
                    <span>·</span>
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{ backgroundColor: src.bg, color: src.color }}
                    >
                      {src.label}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/5 flex justify-between text-[11px] text-[rgba(245,237,214,0.35)]">
          <span>{total} phiên</span>
          <span>Cập nhật mỗi 5s</span>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[rgba(245,237,214,0.45)]">
            {detailLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Đang tải hành trình...</span>
              </div>
            ) : (
              <>
                <span className="text-5xl mb-4">🔍</span>
                <span className="text-sm font-medium text-[rgba(245,237,214,0.55)]">Chọn một phiên để xem hành trình</span>
                <span className="text-xs text-[rgba(245,237,214,0.35)] mt-1">Theo dõi từng URL khách đã truy cập</span>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Detail header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  {selected.isActive ? (
                    <span className="flex items-center gap-1.5 text-green-400 text-sm font-semibold">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                      Đang online
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[rgba(245,237,214,0.55)] text-sm">
                      <span className="w-2 h-2 bg-gray-600 rounded-full" />
                      Offline · {timeAgo(selected.lastSeenAt)}
                    </span>
                  )}
                  <span className="text-xs font-mono text-[rgba(245,237,214,0.45)]">{selected.sessionId}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-[rgba(245,237,214,0.55)] flex-wrap">
                  <span>{deviceIcon(selected.device)} {selected.device} · {selected.browser} · {selected.os}</span>
                  <span
                    className="px-2 py-0.5 rounded text-[11px]"
                    style={{ backgroundColor: sourceLabel(selected.referrer).bg, color: sourceLabel(selected.referrer).color }}
                  >
                    {sourceLabel(selected.referrer).label}
                  </span>
                  <span>🕐 {new Date(selected.startedAt).toLocaleString("vi-VN")}</span>
                </div>
              </div>

              {/* KPI */}
              <div className="flex gap-5 flex-shrink-0">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{selected.pageCount}</div>
                  <div className="text-xs text-[rgba(245,237,214,0.45)]">trang</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{formatDuration(selected.totalDuration)}</div>
                  <div className="text-xs text-[rgba(245,237,214,0.45)]">tổng TG</div>
                </div>
              </div>
            </div>

            {/* Journey — Talkto URL feed style */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="text-xs text-[rgba(245,237,214,0.45)] uppercase tracking-widest mb-5 font-medium">
                Hành trình truy cập · {selected.events.length} trang
              </div>

              <div className="relative space-y-0">
                {/* Vertical connector line */}
                <div className="absolute left-[15px] top-4 bottom-4 w-px bg-white/5" />

                {selected.events.map((ev, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === selected.events.length - 1;
                  const isHere = ev.isActive && selected.isActive;
                  const barWidth = ev.duration > 0
                    ? Math.max(4, Math.round((ev.duration / maxDuration) * 100))
                    : 0;

                  return (
                    <div key={ev.id} className="relative flex gap-4 pb-3">
                      {/* Node */}
                      <div className="relative z-10 flex-shrink-0 mt-2.5">
                        {isHere ? (
                          <div className="w-[30px] h-[30px] rounded-full bg-green-500/15 border-2 border-green-400 flex items-center justify-center">
                            <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
                          </div>
                        ) : (
                          <div className={`w-[30px] h-[30px] rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                            isFirst
                              ? "border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]"
                              : "border-white/10 bg-[#0a0a0a] text-[rgba(245,237,214,0.45)]"
                          }`}>
                            {idx + 1}
                          </div>
                        )}
                      </div>

                      {/* Card */}
                      <div className={`flex-1 rounded-xl border px-4 py-3 transition-all ${
                        isHere
                          ? "bg-green-500/5 border-green-500/20"
                          : isFirst
                          ? "bg-[#C9A84C]/5 border-[rgba(255,200,100,0.18)]"
                          : "bg-white/2 border-white/5"
                      }`}>
                        {/* Top row: badges + time */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isHere && (
                              <span className="text-[11px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-medium animate-pulse">
                                ● Đang ở đây
                              </span>
                            )}
                            {isFirst && (
                              <span className="text-[11px] bg-[#C9A84C]/20 text-[#C9A84C] px-2 py-0.5 rounded-full">
                                Trang vào
                              </span>
                            )}
                            {isLast && !isFirst && !isHere && (
                              <span className="text-[11px] bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded-full">
                                Trang thoát
                              </span>
                            )}
                            <span className="text-sm font-semibold text-white">
                              {pathLabel(ev.path)}
                            </span>
                          </div>
                          <span className="text-[11px] text-[rgba(245,237,214,0.45)] flex-shrink-0 ml-2">
                            {new Date(ev.enteredAt).toLocaleTimeString("vi-VN", {
                              hour: "2-digit", minute: "2-digit", second: "2-digit"
                            })}
                          </span>
                        </div>

                        {/* URL — Talkto style: full path visible */}
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <span className="text-[11px] text-[rgba(245,237,214,0.45)] font-mono">
                            smartfurni-webapp-production.up.railway.app
                          </span>
                          <span className={`text-[11px] font-mono font-medium ${
                            isHere ? "text-green-300" : "text-gray-300"
                          }`}>
                            {ev.path}
                          </span>
                        </div>

                        {/* Duration bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            {isHere ? (
                              <div className="h-full bg-green-400 rounded-full w-full animate-pulse" />
                            ) : barWidth > 0 ? (
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${barWidth}%`,
                                  backgroundColor: isFirst ? "#C9A84C" : "#4B5563",
                                }}
                              />
                            ) : null}
                          </div>
                          <span className="text-[11px] text-[rgba(245,237,214,0.55)] w-14 text-right flex-shrink-0">
                            {isHere ? "live" : formatDuration(ev.duration)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Entry / Exit summary */}
              <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3">
                <div className="bg-[#C9A84C]/5 rounded-xl p-3 border border-[rgba(255,200,100,0.14)]">
                  <div className="text-[11px] text-[rgba(245,237,214,0.45)] mb-1">Trang vào</div>
                  <div className="text-xs font-mono text-[#C9A84C] truncate">{selected.entryPage}</div>
                </div>
                <div className={`rounded-xl p-3 border ${
                  selected.isActive
                    ? "bg-green-500/5 border-green-500/15"
                    : "bg-orange-500/5 border-orange-500/10"
                }`}>
                  <div className="text-[11px] text-[rgba(245,237,214,0.45)] mb-1">
                    {selected.isActive ? "Đang ở" : "Trang thoát"}
                  </div>
                  <div className={`text-xs font-mono truncate ${
                    selected.isActive ? "text-green-400" : "text-orange-400"
                  }`}>
                    {selected.exitPage}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
