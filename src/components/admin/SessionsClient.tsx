"use client";
import { useState, useEffect, useCallback, useRef } from "react";

interface SessionEvent {
  id: string;
  sessionId: string;
  path: string;
  fullUrl: string;
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
  referrerUrl: string;
  sourceDetail: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  entryPage: string;
  entryUrl: string;
  exitPage: string;
  exitUrl: string;
  isActive: boolean;
}

interface VisitorSession extends SessionListItem {
  country: string;
  events: SessionEvent[];
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "–";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  if (minutes < 60) return restSeconds > 0 ? `${minutes}p ${restSeconds}s` : `${minutes}p`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes > 0 ? `${hours}g ${restMinutes}p` : `${hours}g`;
}

function timeAgo(isoStr: string): string {
  const diff = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
  if (diff < 10) return "vừa xong";
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)}p trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}g trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

function shortId(sessionId: string): string {
  return sessionId.length > 12 ? `${sessionId.slice(0, 12)}…` : sessionId;
}

function deviceLabel(device: string): string {
  if (device === "Mobile") return "Mobile";
  if (device === "Tablet") return "Tablet";
  return "Desktop";
}

function normalizeDisplayUrl(url?: string, fallbackPath = "/"): string {
  const value = (url || "").trim();
  if (!value) return fallbackPath || "/";
  return value;
}

function hostFromUrl(url?: string): string {
  const value = (url || "").trim();
  if (!value) return "Direct";
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value.startsWith("/") ? "smartfurni.com.vn" : value;
  }
}

function sourceLabel(session: Pick<SessionListItem, "referrer" | "referrerUrl" | "utmSource" | "utmMedium" | "utmCampaign" | "sourceDetail">): {
  label: string;
  detail: string;
  color: string;
  bg: string;
  border: string;
} {
  const raw = session.utmSource || session.referrer || "Direct";
  const lower = raw.toLowerCase();
  const palette = (() => {
    if (lower.includes("google")) return { color: "#60A5FA", bg: "rgba(96,165,250,0.12)", border: "rgba(96,165,250,0.24)" };
    if (lower.includes("facebook") || lower.includes("fb")) return { color: "#3B82F6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.24)" };
    if (lower.includes("instagram")) return { color: "#F472B6", bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.24)" };
    if (lower.includes("tiktok")) return { color: "#C084FC", bg: "rgba(192,132,252,0.12)", border: "rgba(192,132,252,0.24)" };
    if (lower.includes("zalo")) return { color: "#38BDF8", bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.24)" };
    if (lower.includes("direct") || lower.includes("trực")) return { color: "#52525B", bg: "rgba(113,113,122,0.10)", border: "rgba(113,113,122,0.22)" };
    return { color: "#C9A84C", bg: "rgba(201,168,76,0.12)", border: "rgba(201,168,76,0.24)" };
  })();

  const label = session.utmSource || (session.referrer === "Direct" ? "Trực tiếp" : session.referrer || "Trực tiếp");
  const detail = session.utmCampaign
    ? `${label} / ${session.utmMedium || "medium?"} / ${session.utmCampaign}`
    : session.referrerUrl || session.sourceDetail || label;

  return { label, detail, ...palette };
}

function pathTitle(path: string): string {
  const cleanPath = path.split("?")[0] || "/";
  if (cleanPath === "/") return "Trang chủ";
  if (cleanPath.startsWith("/lp/")) return `Landing page ${cleanPath.replace("/lp/", "")}`;
  if (cleanPath === "/products") return "Sản phẩm";
  if (cleanPath.startsWith("/products/")) return cleanPath.replace("/products/", "");
  if (cleanPath === "/contact") return "Liên hệ";
  if (cleanPath === "/cart") return "Giỏ hàng";
  if (cleanPath === "/checkout") return "Thanh toán";
  return cleanPath;
}

function AttributionGrid({ session }: { session: VisitorSession }) {
  const hasUtm = Boolean(session.utmSource || session.utmMedium || session.utmCampaign || session.utmTerm || session.utmContent);
  const src = sourceLabel(session);
  const rows = [
    { label: "Nguồn", value: src.label },
    { label: "Referrer", value: session.referrerUrl || (session.referrer === "Direct" ? "Truy cập trực tiếp" : session.referrer) },
    { label: "Trang vào", value: normalizeDisplayUrl(session.entryUrl, session.entryPage) },
    { label: session.isActive ? "Đang xem" : "Trang thoát", value: normalizeDisplayUrl(session.exitUrl, session.exitPage) },
  ];
  const utmRows = [
    { label: "utm_source", value: session.utmSource },
    { label: "utm_medium", value: session.utmMedium },
    { label: "utm_campaign", value: session.utmCampaign },
    { label: "utm_term", value: session.utmTerm },
    { label: "utm_content", value: session.utmContent },
  ].filter(row => row.value);

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">{row.label}</div>
          <div className="break-all font-mono text-xs leading-5 text-slate-800">{row.value || "–"}</div>
        </div>
      ))}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm xl:col-span-2">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">UTM tracking</div>
          <span className={`rounded-full px-2 py-0.5 text-[11px] ${hasUtm ? "bg-[#C9A84C]/15 text-[#8B6F16]" : "bg-slate-100 text-slate-500"}`}>
            {hasUtm ? "Có dữ liệu" : "Chưa có UTM"}
          </span>
        </div>
        {utmRows.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {utmRows.map((row) => (
              <div key={row.label} className="rounded-lg bg-slate-50 px-3 py-2">
                <span className="mr-2 text-[11px] text-slate-500">{row.label}</span>
                <span className="break-all font-mono text-xs text-slate-800">{row.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-500">Phiên này không có tham số UTM hoặc khách truy cập trực tiếp.</div>
        )}
      </div>
    </div>
  );
}

export function SessionsClient() {
  const [filter, setFilter] = useState<"all" | "active" | "today" | "week">("active");
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [activeNow, setActiveNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<VisitorSession | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/sessions?filter=${filter}&limit=100`);
      if (!res.ok) return;
      const data = await res.json();
      const nextSessions = data.sessions || [];
      setSessions(nextSessions);
      setTotal(data.total || 0);
      setActiveNow(data.activeNow || 0);
    } catch {
      // Silent polling failure: the next interval will retry.
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
      setSelected(data);
    } catch {
      // Silent polling failure: the next interval will retry.
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isLive) return;
    intervalRef.current = setInterval(() => {
      fetchSessions();
      if (selected) fetchDetail(selected.sessionId);
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLive, fetchSessions, fetchDetail, selected]);

  useEffect(() => {
    tickRef.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  void tick;

  const maxDuration = selected ? Math.max(...selected.events.map(e => e.duration || 1), 1) : 1;

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F4EC] text-slate-900">
      <aside className="flex w-[390px] flex-shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 pb-4 pt-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Khách truy cập</div>
              <div className="mt-1 text-[11px] text-slate-500">Theo dõi realtime theo từng URL</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                {activeNow} online
              </span>
              <button
                onClick={() => setIsLive(value => !value)}
                className={`rounded-full border px-2.5 py-1 text-xs transition ${isLive ? "border-[#C9A84C]/35 bg-[#C9A84C]/12 text-[#8B6F16]" : "border-slate-200 bg-slate-50 text-slate-500"}`}
              >
                {isLive ? "Live" : "Tạm dừng"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
            {(["active", "today", "week", "all"] as const).map(item => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-lg px-2 py-2 text-xs font-medium transition ${filter === item ? "bg-[#C9A84C] text-[#11100B] shadow-lg shadow-[#C9A84C]/15" : "text-slate-500 hover:bg-white hover:text-slate-900"}`}
              >
                {item === "active" ? "Online" : item === "today" ? "Hôm nay" : item === "week" ? "7 ngày" : "Tất cả"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-500">Đang tải danh sách khách truy cập...</div>
          ) : sessions.length === 0 ? (
            <div className="flex h-44 flex-col items-center justify-center gap-2 px-8 text-center">
              <div className="text-sm font-medium text-slate-700">Chưa có khách truy cập</div>
              <p className="text-xs leading-5 text-slate-500">Khi khách vào website, phiên online sẽ xuất hiện tại đây kèm URL, thiết bị và nguồn truy cập.</p>
            </div>
          ) : (
            sessions.map((session) => {
              const isSelected = selected?.sessionId === session.sessionId;
              const src = sourceLabel(session);
              const currentUrl = normalizeDisplayUrl(session.exitUrl, session.exitPage);
              return (
                <button
                  key={session.sessionId}
                  onClick={() => fetchDetail(session.sessionId)}
                  className={`w-full border-b border-slate-100 px-4 py-3 text-left transition hover:bg-[#F8F5EC] ${isSelected ? "border-l-2 border-l-[#C9A84C] bg-[#FFF8E3]" : "border-l-2 border-l-transparent"}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${session.isActive ? "bg-green-500 shadow-[0_0_14px_rgba(34,197,94,0.45)]" : "bg-slate-300"}`} />
                      <span className="truncate font-mono text-xs text-slate-700">{shortId(session.sessionId)}</span>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{deviceLabel(session.device)}</span>
                    </div>
                    <span className="flex-shrink-0 text-[11px] text-slate-500">{timeAgo(session.lastSeenAt)}</span>
                  </div>

                  <div className="mb-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${session.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                        {session.isActive ? "Đang xem" : "Trang cuối"}
                      </span>
                      <span className="truncate text-[11px] text-slate-500">{hostFromUrl(currentUrl)}</span>
                    </div>
                    <div className="break-all font-mono text-[11px] leading-4 text-slate-900">{currentUrl}</div>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
                    <span>{session.pageCount} trang · {formatDuration(session.totalDuration)}</span>
                    <span className="max-w-[145px] truncate rounded-full border px-2 py-0.5" style={{ color: src.color, backgroundColor: src.bg, borderColor: src.border }}>
                      {src.label}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500">
          <span>{total} phiên</span>
          <button onClick={fetchSessions} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600 hover:border-[#C9A84C]/40 hover:text-[#8B6F16]">
            Cập nhật lại
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#F7F4EC]">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            {detailLoading ? (
              <>
                <div className="mb-4 h-9 w-9 rounded-full border-2 border-[#C9A84C] border-t-transparent animate-spin" />
                <div className="text-sm text-slate-600">Đang tải hành trình truy cập...</div>
              </>
            ) : (
              <>
                <div className="mb-4 rounded-2xl border border-[#C9A84C]/25 bg-white px-5 py-4 text-[#8B6F16] shadow-sm">Visitor Monitor</div>
                <div className="text-base font-semibold text-slate-900">Chọn một khách truy cập để xem chi tiết</div>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Giao diện hiển thị full URL, trang vào, trang đang xem, nguồn/referrer và UTM để đội bán hàng biết khách đến từ chiến dịch nào.</p>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
              <div className="flex items-start justify-between gap-5">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${selected.isActive ? "border-green-500/25 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      <span className={`h-2 w-2 rounded-full ${selected.isActive ? "bg-green-500" : "bg-slate-300"}`} />
                      {selected.isActive ? "Đang online" : `Offline · ${timeAgo(selected.lastSeenAt)}`}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs text-slate-600">{selected.sessionId}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{deviceLabel(selected.device)} · {selected.browser} · {selected.os}</span>
                    <span>•</span>
                    <span>Bắt đầu {new Date(selected.startedAt).toLocaleString("vi-VN")}</span>
                    <span>•</span>
                    <span>Quốc gia: {selected.country || "Việt Nam"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                    <div className="text-xl font-bold text-slate-900">{selected.pageCount}</div>
                    <div className="text-[11px] text-slate-500">trang</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                    <div className="text-xl font-bold text-slate-900">{formatDuration(selected.totalDuration)}</div>
                    <div className="text-[11px] text-slate-500">thời gian</div>
                  </div>
                  <div className="rounded-xl border border-green-500/20 bg-green-50 px-4 py-2 shadow-sm">
                    <div className="text-xl font-bold text-green-700">{selected.isActive ? "Live" : "Done"}</div>
                    <div className="text-[11px] text-slate-500">trạng thái</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Nguồn truy cập và link hiện tại</h2>
                    <p className="mt-1 text-xs text-slate-500">Thông tin này được lấy từ referrer, URL đầy đủ và tham số UTM của phiên.</p>
                  </div>
                  <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ color: sourceLabel(selected).color, backgroundColor: sourceLabel(selected).bg, borderColor: sourceLabel(selected).border }}>
                    {sourceLabel(selected).detail}
                  </span>
                </div>
                <AttributionGrid session={selected} />
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Hành trình truy cập</h2>
                    <p className="mt-1 text-xs text-slate-500">Hiển thị giống live visitor monitor: từng trang, full link, thời điểm vào và thời lượng.</p>
                  </div>
                  <span className="rounded-full border border-[#C9A84C]/25 bg-[#C9A84C]/12 px-3 py-1 text-xs text-[#8B6F16]">{selected.events.length} trang</span>
                </div>

                <div className="relative">
                  <div className="absolute bottom-5 left-[17px] top-5 w-px bg-slate-200" />
                  <div className="space-y-3">
                    {selected.events.map((event, index) => {
                      const isFirst = index === 0;
                      const isLast = index === selected.events.length - 1;
                      const isHere = event.isActive && selected.isActive;
                      const fullUrl = normalizeDisplayUrl(event.fullUrl, event.path);
                      const durationPercent = event.duration > 0 ? Math.max(6, Math.round((event.duration / maxDuration) * 100)) : 0;

                      return (
                        <div key={event.id} className="relative flex gap-4">
                          <div className="relative z-10 mt-4 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border bg-white text-xs font-bold shadow-sm" style={{ borderColor: isHere ? "rgba(34,197,94,0.45)" : isFirst ? "rgba(201,168,76,0.65)" : "rgba(203,213,225,0.95)", color: isHere ? "#15803D" : isFirst ? "#8B6F16" : "#64748B" }}>
                            {isHere ? <span className="h-2.5 w-2.5 rounded-full bg-green-400 shadow-[0_0_16px_rgba(74,222,128,0.85)]" /> : index + 1}
                          </div>

                          <div className={`flex-1 rounded-2xl border p-4 shadow-sm ${isHere ? "border-green-500/25 bg-green-50" : isFirst ? "border-[#C9A84C]/25 bg-[#FFF8E3]" : "border-slate-200 bg-white"}`}>
                            <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                  {isHere && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Đang ở đây</span>}
                                  {isFirst && <span className="rounded-full bg-[#C9A84C]/16 px-2 py-0.5 text-[11px] font-semibold text-[#8B6F16]">Trang vào</span>}
                                  {isLast && !isFirst && !isHere && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">Trang thoát</span>}
                                  <span className="text-sm font-semibold text-slate-900">{pathTitle(event.path)}</span>
                                </div>
                                <div className="text-[11px] text-slate-500">{hostFromUrl(fullUrl)}</div>
                              </div>
                              <div className="flex-shrink-0 text-right text-[11px] text-slate-500">
                                <div>{new Date(event.enteredAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
                                <div>{new Date(event.enteredAt).toLocaleDateString("vi-VN")}</div>
                              </div>
                            </div>

                            <a href={fullUrl.startsWith("http") ? fullUrl : undefined} target="_blank" rel="noreferrer" className="block break-all rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-5 text-slate-900 hover:border-[#C9A84C]/40">
                              {fullUrl}
                            </a>

                            <div className="mt-3 flex items-center gap-3">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                                {isHere ? (
                                  <div className="h-full w-full rounded-full bg-green-400/80" />
                                ) : durationPercent > 0 ? (
                                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${durationPercent}%`, backgroundColor: isFirst ? "#C9A84C" : "#94A3B8" }} />
                                ) : null}
                              </div>
                              <span className="w-16 flex-shrink-0 text-right text-[11px] text-slate-500">{isHere ? "live" : formatDuration(event.duration)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
