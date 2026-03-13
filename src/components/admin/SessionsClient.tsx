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

interface SessionsResult {
  sessions: SessionListItem[];
  total: number;
  activeNow: number;
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
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}g trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function deviceIcon(device: string): string {
  if (device === "Mobile") return "📱";
  if (device === "Tablet") return "📟";
  return "🖥️";
}

function referrerColor(ref: string): string {
  if (ref === "Google") return "text-blue-400";
  if (ref === "Facebook") return "text-blue-500";
  if (ref === "Instagram") return "text-pink-400";
  if (ref === "TikTok") return "text-purple-400";
  if (ref === "Direct") return "text-gray-400";
  return "text-yellow-400";
}

function pathLabel(path: string): string {
  if (path === "/") return "Trang chủ";
  if (path.startsWith("/products/")) return "Chi tiết: " + path.replace("/products/", "");
  if (path === "/products") return "Sản phẩm";
  if (path === "/contact") return "Liên hệ";
  if (path === "/about") return "Giới thiệu";
  if (path === "/blog") return "Blog";
  if (path.startsWith("/blog/")) return "Bài viết: " + path.replace("/blog/", "");
  if (path === "/cart") return "Giỏ hàng";
  if (path === "/checkout") return "Thanh toán";
  return path;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SessionsClient() {
  const [filter, setFilter] = useState<"all" | "active" | "today" | "week">("today");
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [activeNow, setActiveNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<VisitorSession | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/sessions?filter=${filter}&limit=100`);
      if (!res.ok) return;
      const data: SessionsResult = await res.json();
      setSessions(data.sessions);
      setTotal(data.total);
      setActiveNow(data.activeNow);
      setLastRefresh(new Date());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchDetail = useCallback(async (sessionId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/sessions?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return;
      const data: VisitorSession = await res.json();
      setSelectedSession(data);
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  }, []);

  // Initial load + filter change
  useEffect(() => {
    setLoading(true);
    fetchSessions();
  }, [fetchSessions]);

  // Auto-refresh every 15s
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchSessions();
        if (selectedSession) fetchDetail(selectedSession.sessionId);
      }, 15000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchSessions, fetchDetail, selectedSession]);

  const filterLabels = {
    active: "Đang online",
    today: "Hôm nay",
    week: "7 ngày",
    all: "Tất cả",
  };

  return (
    <div className="min-h-screen bg-[#080600] text-white">
      {/* Header */}
      <div className="border-b border-[#C9A84C]/10 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Hành trình khách hàng</h1>
            <p className="text-xs text-gray-500 mt-0.5">Theo dõi trực tiếp từng phiên truy cập và hành trình trang</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Active now badge */}
            <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">{activeNow} đang online</span>
            </div>
            {/* Auto refresh toggle */}
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
                autoRefresh
                  ? "bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C]"
                  : "bg-white/3 border-white/10 text-gray-500"
              }`}
            >
              <span className={autoRefresh ? "animate-spin" : ""} style={{ display: "inline-block", animationDuration: "3s" }}>↻</span>
              {autoRefresh ? "Live" : "Tắt live"}
            </button>
            {/* Manual refresh */}
            <button
              onClick={fetchSessions}
              className="px-3 py-1.5 rounded-full text-xs bg-white/3 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
            >
              Làm mới
            </button>
          </div>
        </div>
        {/* Last refresh */}
        <p className="text-[10px] text-gray-700 mt-2">
          Cập nhật lần cuối: {lastRefresh.toLocaleTimeString("vi-VN")} · Tổng {total} phiên
        </p>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Left panel: Session list */}
        <div className="w-full lg:w-[420px] flex-shrink-0 border-r border-[#C9A84C]/8 flex flex-col">
          {/* Filter tabs */}
          <div className="flex border-b border-[#C9A84C]/8 px-3 pt-3 gap-1">
            {(["active", "today", "week", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-medium transition-all ${
                  filter === f
                    ? "bg-[#C9A84C]/12 text-[#C9A84C] border-b-2 border-[#C9A84C]"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {filterLabels[f]}
                {f === "active" && activeNow > 0 && (
                  <span className="ml-1.5 bg-green-500 text-white text-[9px] rounded-full px-1.5 py-0.5">{activeNow}</span>
                )}
              </button>
            ))}
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="text-gray-600 text-sm">Đang tải...</div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2">
                <span className="text-3xl">👁️</span>
                <p className="text-gray-600 text-sm">Chưa có phiên truy cập nào</p>
                <p className="text-gray-700 text-xs">Dữ liệu sẽ xuất hiện khi khách truy cập website</p>
              </div>
            ) : (
              <div className="divide-y divide-white/3">
                {sessions.map((session) => (
                  <button
                    key={session.sessionId}
                    onClick={() => fetchDetail(session.sessionId)}
                    className={`w-full text-left px-4 py-3 hover:bg-white/3 transition-all ${
                      selectedSession?.sessionId === session.sessionId ? "bg-[#C9A84C]/6 border-l-2 border-[#C9A84C]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Active indicator */}
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${session.isActive ? "bg-green-400 animate-pulse" : "bg-gray-700"}`} />
                        <div className="min-w-0">
                          {/* Session ID (short) */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono text-gray-400">{session.sessionId.slice(0, 8)}…</span>
                            <span className="text-[10px]">{deviceIcon(session.device)}</span>
                            <span className="text-[10px] text-gray-600">{session.browser}</span>
                          </div>
                          {/* Entry page */}
                          <div className="text-xs text-white/70 truncate mt-0.5">{pathLabel(session.entryPage)}</div>
                          {/* Meta */}
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] ${referrerColor(session.referrer)}`}>{session.referrer}</span>
                            <span className="text-[10px] text-gray-600">·</span>
                            <span className="text-[10px] text-gray-600">{session.pageCount} trang</span>
                            <span className="text-[10px] text-gray-600">·</span>
                            <span className="text-[10px] text-gray-600">{formatDuration(session.totalDuration)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-[10px] text-gray-600">{timeAgo(session.lastSeenAt)}</div>
                        {session.isActive && (
                          <div className="text-[9px] text-green-400 mt-0.5">● Online</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: Session detail */}
        <div className="flex-1 overflow-y-auto">
          {!selectedSession && !detailLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <span className="text-5xl opacity-20">🗺️</span>
              <h3 className="text-gray-500 font-medium">Chọn một phiên để xem hành trình</h3>
              <p className="text-gray-700 text-sm max-w-xs">
                Click vào bất kỳ phiên nào ở bên trái để xem chi tiết hành trình, thời gian ở từng trang và thông tin thiết bị.
              </p>
            </div>
          ) : detailLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-600 text-sm">Đang tải hành trình...</div>
            </div>
          ) : selectedSession ? (
            <SessionDetail session={selectedSession} onRefresh={() => fetchDetail(selectedSession.sessionId)} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Session Detail Component ─────────────────────────────────────────────────

function SessionDetail({ session, onRefresh }: { session: VisitorSession; onRefresh: () => void }) {
  const totalPages = session.events.length;
  const maxDuration = Math.max(...session.events.map((e) => e.duration), 1);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Session header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {session.isActive && (
              <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-2 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Đang online
              </span>
            )}
            <span className="text-xs font-mono text-gray-500">{session.sessionId}</span>
          </div>
          <h2 className="text-lg font-bold text-white">
            {deviceIcon(session.device)} {session.device} · {session.browser} · {session.os}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Bắt đầu: {formatDateTime(session.startedAt)} · Lần cuối: {timeAgo(session.lastSeenAt)}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="text-xs text-gray-600 hover:text-gray-300 px-3 py-1.5 rounded-lg bg-white/3 border border-white/8 transition-colors"
        >
          ↻ Làm mới
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Tổng trang", value: totalPages.toString(), icon: "📄" },
          { label: "Thời gian", value: formatDuration(session.totalDuration), icon: "⏱️" },
          { label: "Nguồn", value: session.referrer, icon: "🔗" },
          { label: "Quốc gia", value: session.country || "Việt Nam", icon: "🌏" },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#0E0C00] border border-[#C9A84C]/10 rounded-xl p-3">
            <div className="text-lg mb-1">{stat.icon}</div>
            <div className="text-sm font-semibold text-white truncate">{stat.value}</div>
            <div className="text-[10px] text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Journey timeline */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-[#C9A84C] mb-4 flex items-center gap-2">
          <span>🗺️</span> Hành trình ({totalPages} trang)
        </h3>

        {session.events.length === 0 ? (
          <div className="text-center py-8 text-gray-600 text-sm">Chưa có dữ liệu hành trình</div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-4 bottom-4 w-px bg-[#C9A84C]/10" />

            <div className="space-y-0">
              {session.events.map((event, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === session.events.length - 1;
                const durationPct = maxDuration > 0 ? (event.duration / maxDuration) * 100 : 0;

                return (
                  <div key={event.id} className="relative flex gap-4 pl-10 pb-4">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-[11px] top-3 w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 z-10 ${
                        event.isActive
                          ? "bg-green-400 border-green-400 animate-pulse"
                          : isFirst
                          ? "bg-[#C9A84C] border-[#C9A84C]"
                          : isLast
                          ? "bg-orange-400 border-orange-400"
                          : "bg-gray-700 border-gray-600"
                      }`}
                    />

                    {/* Content card */}
                    <div className="flex-1 bg-[#0E0C00] border border-white/5 rounded-xl p-3 hover:border-[#C9A84C]/20 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {/* Step badge */}
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] bg-[#C9A84C]/10 text-[#C9A84C] rounded px-1.5 py-0.5 font-mono">
                              #{idx + 1}
                            </span>
                            {isFirst && <span className="text-[9px] text-green-400 bg-green-400/10 rounded px-1.5 py-0.5">Vào</span>}
                            {isLast && !event.isActive && <span className="text-[9px] text-orange-400 bg-orange-400/10 rounded px-1.5 py-0.5">Thoát</span>}
                            {event.isActive && <span className="text-[9px] text-green-400 bg-green-400/10 rounded px-1.5 py-0.5 animate-pulse">● Đang ở đây</span>}
                          </div>

                          {/* Path */}
                          <div className="text-sm font-medium text-white truncate">{pathLabel(event.path)}</div>
                          <div className="text-[10px] text-gray-600 font-mono truncate mt-0.5">{event.path}</div>

                          {/* Duration bar */}
                          {event.duration > 0 && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-gray-600">Thời gian ở trang</span>
                                <span className="text-[10px] text-[#C9A84C] font-medium">{formatDuration(event.duration)}</span>
                              </div>
                              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-[#C9A84C]/60 to-[#C9A84C] rounded-full transition-all"
                                  style={{ width: `${Math.max(durationPct, 3)}%` }}
                                />
                              </div>
                            </div>
                          )}
                          {event.duration === 0 && event.isActive && (
                            <div className="mt-2 text-[10px] text-green-400">⏱ Đang đếm thời gian...</div>
                          )}
                        </div>

                        {/* Time */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-[10px] text-gray-600">{formatTime(event.enteredAt)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Entry/Exit summary */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="bg-[#0E0C00] border border-green-500/10 rounded-xl p-3">
          <div className="text-[10px] text-green-400 mb-1">🚪 Trang vào</div>
          <div className="text-sm text-white font-medium truncate">{pathLabel(session.entryPage)}</div>
          <div className="text-[10px] text-gray-600 font-mono truncate">{session.entryPage}</div>
        </div>
        <div className="bg-[#0E0C00] border border-orange-500/10 rounded-xl p-3">
          <div className="text-[10px] text-orange-400 mb-1">🚪 Trang thoát</div>
          <div className="text-sm text-white font-medium truncate">{pathLabel(session.exitPage)}</div>
          <div className="text-[10px] text-gray-600 font-mono truncate">{session.exitPage}</div>
        </div>
      </div>
    </div>
  );
}
