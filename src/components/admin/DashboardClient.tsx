"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { DashboardStats } from "@/lib/admin-store";
import type { OrderDashboardStats } from "@/lib/order-store";
import type { ProductDashboardStats } from "@/lib/product-store";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + " tr";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return n.toString();
}
function fmtVND(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ ₫";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " tr ₫";
  return n.toLocaleString("vi-VN") + " ₫";
}
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}
function GrowthBadge({ pct }: { pct: number }) {
  if (pct === 0) return null;
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${up ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
      {up ? "↑" : "↓"}{Math.abs(pct)}%
    </span>
  );
}

// ─── Date Range Picker ────────────────────────────────────────────────────────
type DateRange = "today" | "7d" | "30d" | "quarter" | "year" | "all";
const DATE_RANGES: { key: DateRange; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "7d", label: "7 ngày" },
  { key: "30d", label: "30 ngày" },
  { key: "quarter", label: "Quý" },
  { key: "year", label: "Năm" },
  { key: "all", label: "Tất cả" },
];
function filterByRange<T extends { createdAt: string }>(items: T[], range: DateRange): T[] {
  if (range === "all") return items;
  const now = new Date();
  let from: Date;
  if (range === "today") { from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); }
  else if (range === "7d") { from = new Date(now.getTime() - 7 * 86400000); }
  else if (range === "30d") { from = new Date(now.getTime() - 30 * 86400000); }
  else if (range === "quarter") { from = new Date(now.getTime() - 90 * 86400000); }
  else { from = new Date(now.getFullYear(), 0, 1); }
  return items.filter((i) => new Date(i.createdAt) >= from);
}

// ─── Sparkline ───────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#C9A84C", height = 36 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 100;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const pathD = `M ${pts.join(" L ")}`;
  const areaD = `M ${pts[0]} L ${pts.join(" L ")} L ${w},${height} L 0,${height} Z`;
  const gradId = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon, href, trend, trendLabel, growth, growthLabel }: {
  label: string; value: string; sub?: string; color: string; icon: string;
  href?: string; trend?: number[]; trendLabel?: string; growth?: number; growthLabel?: string;
}) {
  const inner = (
    <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all h-full group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {growth !== undefined && growth !== 0 && <GrowthBadge pct={growth} />}
          {href && <span className="text-gray-700 group-hover:text-gray-400 text-xs transition-colors">→</span>}
        </div>
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-gray-600">{sub}</div>}
      {growthLabel && growth !== undefined && <div className="text-[10px] text-gray-700 mt-0.5">{growthLabel}</div>}
      {trend && trend.length > 1 && (
        <div className="mt-3">
          <Sparkline data={trend} color={color} height={32} />
          {trendLabel && <div className="text-[10px] text-gray-700 mt-1">{trendLabel}</div>}
        </div>
      )}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : <div className="h-full">{inner}</div>;
}

// ─── Status Donut ─────────────────────────────────────────────────────────────
function StatusDonut({ segments, total }: { segments: { count: number; color: string }[]; total: number }) {
  const size = 80; const r = 30; const cx = size / 2; const cy = size / 2;
  let cumAngle = -Math.PI / 2;
  const arcs = segments.map((s) => {
    const angle = total > 0 ? (s.count / total) * 2 * Math.PI : 0;
    const x1 = cx + r * Math.cos(cumAngle); const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle); const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { ...s, x1, y1, x2, y2, large, angle };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) => arc.angle > 0.01 ? (
        <path key={i} d={`M ${cx} ${cy} L ${arc.x1} ${arc.y1} A ${r} ${r} 0 ${arc.large} 1 ${arc.x2} ${arc.y2} Z`} fill={arc.color} opacity="0.85" />
      ) : null)}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#0D0B00" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#6B7280" fontSize="8">tổng</text>
    </svg>
  );
}

// ─── City Revenue Interactive Chart ─────────────────────────────────────────
type CityData = { city: string; count: number; revenue: number; percentage: number };
function CityRevenueChart({ data }: { data: CityData[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"bar" | "donut">("bar");
  if (data.length === 0) return <p className="text-gray-600 text-xs text-center py-8">Chưa có dữ liệu</p>;
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const totalRev = data.reduce((s, d) => s + d.revenue, 0);
  const COLORS = ["#C9A84C", "#3B82F6", "#22C55E", "#F472B6", "#8B5CF6", "#F59E0B"];
  const DonutView = () => {
    const size = 160; const r = 58; const cx = size / 2; const cy = size / 2;
    let cumAngle = -Math.PI / 2;
    const arcs = data.map((d, i) => {
      const angle = totalRev > 0 ? (d.revenue / totalRev) * 2 * Math.PI : 0;
      const x1 = cx + r * Math.cos(cumAngle); const y1 = cy + r * Math.sin(cumAngle);
      cumAngle += angle;
      const x2 = cx + r * Math.cos(cumAngle); const y2 = cy + r * Math.sin(cumAngle);
      const large = angle > Math.PI ? 1 : 0;
      return { ...d, x1, y1, x2, y2, large, angle, color: COLORS[i % COLORS.length] };
    });
    const active = activeIdx !== null ? arcs[activeIdx] : null;
    return (
      <div className="flex items-center gap-4">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {arcs.map((arc, i) => arc.angle > 0.01 ? (
            <path key={i}
              d={`M ${cx} ${cy} L ${arc.x1} ${arc.y1} A ${r} ${r} 0 ${arc.large} 1 ${arc.x2} ${arc.y2} Z`}
              fill={arc.color} opacity={activeIdx === null || activeIdx === i ? 0.9 : 0.25}
              style={{ transform: activeIdx === i ? "scale(1.04)" : "scale(1)", transformOrigin: `${cx}px ${cy}px`, transition: "all 0.2s" }}
              onMouseEnter={() => setActiveIdx(i)} onMouseLeave={() => setActiveIdx(null)} />
          ) : null)}
          <circle cx={cx} cy={cy} r={r * 0.5} fill="#0D0B00" />
          {active ? (
            <>
              <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">{active.city.split(" ").pop()}</text>
              <text x={cx} y={cy + 5} textAnchor="middle" fill={active.color} fontSize="10" fontWeight="bold">{Math.round((active.revenue / totalRev) * 100)}%</text>
              <text x={cx} y={cy + 17} textAnchor="middle" fill="#9CA3AF" fontSize="7">{fmtVND(active.revenue)}</text>
            </>
          ) : (
            <>
              <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{data.length}</text>
              <text x={cx} y={cy + 9} textAnchor="middle" fill="#6B7280" fontSize="8">khu vực</text>
            </>
          )}
        </svg>
        <div className="flex-1 space-y-2">
          {arcs.map((arc, i) => (
            <div key={i} className="flex items-center gap-2 cursor-pointer group" onMouseEnter={() => setActiveIdx(i)} onMouseLeave={() => setActiveIdx(null)}>
              <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0 transition-transform group-hover:scale-125" style={{ backgroundColor: arc.color }} />
              <span className={`text-xs flex-1 truncate transition-colors ${activeIdx === i ? "text-white" : "text-gray-500"}`}>{arc.city}</span>
              <span className="text-xs font-semibold flex-shrink-0" style={{ color: activeIdx === i ? arc.color : "#6B7280" }}>{Math.round((arc.revenue / totalRev) * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };
  const BarView = () => (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const color = COLORS[i % COLORS.length];
        const pct = (d.revenue / maxRev) * 100;
        const isActive = activeIdx === i;
        return (
          <div key={d.city} className="cursor-pointer" onMouseEnter={() => setActiveIdx(i)} onMouseLeave={() => setActiveIdx(null)}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-700 w-3">{i + 1}</span>
                <span className={`text-xs font-medium transition-colors ${isActive ? "text-white" : "text-gray-400"}`}>{d.city}</span>
                <span className="text-[10px] text-gray-700">{d.count} đơn</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-bold transition-colors" style={{ color: isActive ? color : "#9CA3AF" }}>{fmtVND(d.revenue)}</span>
                <span className="text-[10px] text-gray-700 w-8 text-right">{Math.round((d.revenue / totalRev) * 100)}%</span>
              </div>
            </div>
            <div className="h-5 bg-white/4 rounded-md overflow-hidden relative">
              <div className="h-full rounded-md transition-all duration-500 relative overflow-hidden" style={{ width: `${pct}%`, backgroundColor: color, opacity: isActive ? 1 : 0.55 }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
              </div>
              {isActive && (
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-[10px] font-semibold text-white/90">{Math.round((d.revenue / totalRev) * 100)}% tổng doanh thu</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
  return (
    <div>
      <div className="flex items-center gap-1 mb-4 bg-white/4 rounded-lg p-0.5 w-fit">
        {(["bar", "donut"] as const).map((m) => (
          <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${viewMode === m ? "bg-[#C9A84C] text-[#0A0800]" : "text-gray-500 hover:text-gray-300"}`}>
            {m === "bar" ? "Thanh ngang" : "Tròn"}
          </button>
        ))}
      </div>
      {viewMode === "bar" ? <BarView /> : <DonutView />}
      <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 gap-3">
        <div>
          <div className="text-[10px] text-gray-700 mb-0.5">Khu vực dẫn đầu</div>
          <div className="text-xs font-semibold text-white">{data[0]?.city || "—"}</div>
          <div className="text-[10px] text-[#C9A84C]">{data[0] ? fmtVND(data[0].revenue) : ""}</div>
        </div>
        <div>
          <div className="text-[10px] text-gray-700 mb-0.5">Tổng khu vực</div>
          <div className="text-xs font-semibold text-white">{data.length} thành phố</div>
          <div className="text-[10px] text-gray-500">{fmtVND(totalRev)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Revenue Bar Chart ────────────────────────────────────────────────────────
function RevenueBarChart({ data }: { data: { label: string; revenue: number; units: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-1.5 h-28">
      {data.map((d, i) => {
        const h = Math.max((d.revenue / max) * 100, d.revenue > 0 ? 4 : 0);
        const isHov = hovered === i;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1 cursor-pointer group" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            {isHov && <div className="text-[9px] text-[#C9A84C] font-bold whitespace-nowrap">{fmtVND(d.revenue)}</div>}
            <div className="w-full flex items-end" style={{ height: "80px" }}>
              <div className="w-full rounded-t-sm transition-all duration-200" style={{ height: `${h}%`, backgroundColor: isHov ? "#C9A84C" : "#C9A84C66", minHeight: d.revenue > 0 ? "2px" : "0" }} />
            </div>
            <span className="text-[9px] text-gray-600 group-hover:text-gray-400 transition-colors">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Heatmap Chart ────────────────────────────────────────────────────────────
function HeatmapChart({ byHour, byDow }: {
  byHour: { hour: number; label: string; count: number; revenue: number }[];
  byDow: { day: number; label: string; count: number; revenue: number }[];
}) {
  const [view, setView] = useState<"hour" | "dow">("hour");
  const [hovered, setHovered] = useState<number | null>(null);
  const data = view === "hour" ? byHour : byDow;
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const HEAT_COLORS = ["#1a1200", "#3d2a00", "#6b4800", "#9a6800", "#C9A84C", "#e8c46a"];
  function getColor(count: number) {
    const idx = Math.floor((count / maxCount) * (HEAT_COLORS.length - 1));
    return HEAT_COLORS[Math.min(idx, HEAT_COLORS.length - 1)];
  }
  return (
    <div>
      <div className="flex items-center gap-1 mb-3 bg-white/4 rounded-lg p-0.5 w-fit">
        {(["hour", "dow"] as const).map((m) => (
          <button key={m} onClick={() => setView(m)} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${view === m ? "bg-[#C9A84C] text-[#0A0800]" : "text-gray-500 hover:text-gray-300"}`}>
            {m === "hour" ? "Theo giờ" : "Theo ngày"}
          </button>
        ))}
      </div>
      <div className={`grid gap-1 ${view === "hour" ? "grid-cols-12" : "grid-cols-7"}`}>
        {data.map((d, i) => (
          <div key={i} className="relative group cursor-pointer" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div className="rounded aspect-square flex items-center justify-center transition-all duration-150 border border-white/5 hover:border-white/20" style={{ backgroundColor: getColor(d.count) }}>
              <span className="text-[8px] text-white/60 font-medium">{d.label}</span>
            </div>
            {hovered === i && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-[#1a1400] border border-white/10 rounded-lg px-2 py-1.5 z-10 whitespace-nowrap shadow-xl">
                <div className="text-xs font-bold text-white">{d.label}</div>
                <div className="text-[10px] text-[#C9A84C]">{d.count} đơn</div>
                <div className="text-[10px] text-gray-500">{fmtVND(d.revenue)}</div>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[9px] text-gray-700">Ít</span>
        {HEAT_COLORS.map((c, i) => <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />)}
        <span className="text-[9px] text-gray-700">Nhiều</span>
      </div>
    </div>
  );
}

// ─── Funnel Chart ─────────────────────────────────────────────────────────────
function FunnelChart({ data }: { data: { stage: string; label: string; count: number; pct: number; color: string; avgHours: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => {
        const width = (d.count / maxCount) * 100;
        const isHov = hovered === i;
        return (
          <div key={d.stage} className="cursor-pointer" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className={`text-xs transition-colors ${isHov ? "text-white" : "text-gray-400"}`}>{d.label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-bold text-white">{d.count}</span>
                <span className="text-[10px] text-gray-600">{d.pct}%</span>
                {d.avgHours > 0 && <span className="text-[10px] text-gray-700">~{d.avgHours}h</span>}
              </div>
            </div>
            <div className="h-6 bg-white/4 rounded-md overflow-hidden relative">
              <div className="h-full rounded-md transition-all duration-500" style={{ width: `${width}%`, backgroundColor: d.color, opacity: isHov ? 1 : 0.5 }} />
              {isHov && i < data.length - 1 && data[i + 1] && (
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-[10px] text-white/80 font-medium">
                    → {data[i + 1].label}: {data[i + 1].count > 0 ? Math.round((data[i + 1].count / d.count) * 100) : 0}% chuyển đổi
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Smart Alerts Banner ──────────────────────────────────────────────────────
function AlertsBanner({ alerts }: { alerts: OrderDashboardStats["alerts"] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;
  const typeStyle = {
    error: "border-red-500/30 bg-red-500/8 text-red-400",
    warning: "border-yellow-500/30 bg-yellow-500/8 text-yellow-400",
    info: "border-blue-500/30 bg-blue-500/8 text-blue-400",
  };
  const typeIcon = { error: "🚨", warning: "⚠️", info: "ℹ️" };
  return (
    <div className="space-y-2">
      {visible.map((alert) => (
        <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-xl border ${typeStyle[alert.type]}`}>
          <span className="text-base flex-shrink-0 mt-0.5">{typeIcon[alert.type]}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold">{alert.title}</div>
            <div className="text-[11px] opacity-75 mt-0.5">{alert.message}</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {alert.href && <Link href={alert.href} className="text-[10px] underline opacity-70 hover:opacity-100 transition-opacity">Xem →</Link>}
            <button onClick={() => setDismissed((s) => new Set([...s, alert.id]))} className="text-xs opacity-40 hover:opacity-80 transition-opacity">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Live Notification Toast ──────────────────────────────────────────────────
type Toast = { id: string; message: string; type: "order" | "contact"; time: number };
function usePollingNotifications(enabled: boolean) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [lastCounts, setLastCounts] = useState<{ orders: number; contacts: number } | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/poll-counts", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { orders: number; contacts: number };
      if (lastCounts !== null) {
        if (data.orders > lastCounts.orders) {
          const diff = data.orders - lastCounts.orders;
          setToasts((t) => [...t, { id: `ord_${Date.now()}`, message: `${diff} đơn hàng mới!`, type: "order", time: Date.now() }]);
        }
        if (data.contacts > lastCounts.contacts) {
          const diff = data.contacts - lastCounts.contacts;
          setToasts((t) => [...t, { id: `cnt_${Date.now()}`, message: `${diff} tin nhắn liên hệ mới!`, type: "contact", time: Date.now() }]);
        }
      }
      setLastCounts(data);
    } catch { /* silent */ }
  }, [lastCounts]);

  useEffect(() => {
    if (!enabled) return;
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [enabled, poll]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setToasts((t) => t.filter((toast) => now - toast.time < 5000));
    }, 5100);
    return () => clearTimeout(timer);
  }, [toasts]);

  const dismiss = (id: string) => setToasts((t) => t.filter((toast) => toast.id !== id));
  return { toasts, dismiss };
}

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-xs">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl ${t.type === "order" ? "bg-[#1a1200] border-[#C9A84C]/30 text-[#C9A84C]" : "bg-[#001020] border-blue-500/30 text-blue-400"}`}>
          <span className="text-base">{t.type === "order" ? "🛍️" : "💬"}</span>
          <span className="text-sm font-medium flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="text-xs opacity-50 hover:opacity-100">✕</button>
        </div>
      ))}
    </div>
  );
}

// ─── Export Button ────────────────────────────────────────────────────────────
function ExportButton({ orderData, productData, dateRange }: {
  orderData: OrderDashboardStats; productData: ProductDashboardStats; dateRange: DateRange;
}) {
  const [exporting, setExporting] = useState(false);
  async function handleExport(format: "csv" | "json") {
    setExporting(true);
    try {
      const o = orderData.stats; const p = productData.stats;
      if (format === "json") {
        const payload = {
          exportedAt: new Date().toISOString(), dateRange,
          revenue: { total: o.totalRevenue, thisWeek: o.weekRevenue, thisMonth: o.thisMonthRevenue, growthWeek: o.revenueGrowthWeek, growthMonth: o.revenueGrowthMonth },
          orders: { total: o.totalOrders, delivered: o.deliveredOrders, pending: o.pendingOrders, conversionRate: o.conversionRate },
          products: { total: p.totalProducts, sold: p.totalSold, inStock: p.totalStock },
          topProducts: orderData.topProducts, revenueByCity: orderData.revenueByCity,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `smartfurni-report-${new Date().toISOString().slice(0, 10)}.json`; a.click();
        URL.revokeObjectURL(url);
      } else {
        const rows = [
          ["Chỉ số", "Giá trị"],
          ["Doanh thu tổng", o.totalRevenue], ["Doanh thu tuần này", o.weekRevenue],
          ["Tăng trưởng tuần (%)", o.revenueGrowthWeek], ["Doanh thu tháng này", o.thisMonthRevenue],
          ["Tăng trưởng tháng (%)", o.revenueGrowthMonth], ["Tổng đơn hàng", o.totalOrders],
          ["Đơn đã giao", o.deliveredOrders], ["Tỷ lệ chuyển đổi (%)", o.conversionRate],
          ["Khách hàng quay lại (%)", o.repeatCustomerRate], ["Tổng sản phẩm", p.totalProducts],
          ["Tổng đã bán", p.totalSold], ["Tồn kho", p.totalStock],
          [], ["Doanh thu theo khu vực", ""],
          ...orderData.revenueByCity.map((c) => [c.city, c.revenue]),
          [], ["Sản phẩm bán chạy", "Doanh thu"],
          ...orderData.topProducts.map((t) => [t.productName, t.revenue]),
        ];
        const csv = rows.map((r) => r.join(",")).join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `smartfurni-report-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        URL.revokeObjectURL(url);
      }
    } finally { setExporting(false); }
  }
  return (
    <div className="relative group">
      <button disabled={exporting} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-white/10 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 hover:border-white/20">
        <span>{exporting ? "⏳" : "⬇️"}</span>
        {exporting ? "Đang xuất..." : "Xuất báo cáo"}
      </button>
      <div className="absolute right-0 top-full mt-1 bg-[#1a1400] border border-white/10 rounded-xl overflow-hidden shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-20 min-w-[140px]">
        <button onClick={() => handleExport("csv")} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors">📊 Xuất CSV (Excel)</button>
        <button onClick={() => handleExport("json")} className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 hover:text-white transition-colors">📋 Xuất JSON</button>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardClient({
  blogData, orderData, productData,
}: {
  blogData: DashboardStats; orderData: OrderDashboardStats; productData: ProductDashboardStats;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [liveEnabled, setLiveEnabled] = useState(true);
  const { toasts, dismiss } = usePollingNotifications(liveEnabled);

  async function handleRefresh() {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    window.location.reload();
  }

  // Filter orders by date range for dynamic KPIs
  const filteredOrders = filterByRange(orderData.orders, dateRange);
  const filteredPaid = filteredOrders.filter((o) => o.paymentStatus === "paid");
  const filteredRevenue = filteredPaid.reduce((s, o) => s + o.total, 0);
  const filteredDelivered = filteredOrders.filter((o) => o.status === "delivered").length;
  const filteredConversion = filteredOrders.length > 0 ? Math.round((filteredDelivered / filteredOrders.length) * 100) : 0;
  const filteredAvgOrder = filteredPaid.length > 0 ? Math.round(filteredRevenue / filteredPaid.length) : 0;

  const o = orderData.stats;
  const p = productData.stats;
  const b = blogData.stats;
  const revTrend = orderData.revenueByDay.map((d) => d.revenue);
  const orderTrend = orderData.revenueByDay.map((d) => d.orders);
  const profitMargin = p.totalRevenue > 0 ? Math.round((p.totalProfit / p.totalRevenue) * 100) : 0;
  const today = new Date();
  const dateStr = today.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">Tổng Quan Kinh Doanh</h1>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setLiveEnabled(!liveEnabled)}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all ${liveEnabled ? "border-green-500/30 text-green-400 bg-green-500/8" : "border-white/10 text-gray-500"}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${liveEnabled ? "bg-green-400 animate-pulse" : "bg-gray-600"}`} />
            {liveEnabled ? "Live" : "Tắt live"}
          </button>
          <ExportButton orderData={orderData} productData={productData} dateRange={dateRange} />
          <button onClick={handleRefresh} disabled={refreshing} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-white/10 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 hover:border-white/20">
            <span className={refreshing ? "animate-spin inline-block" : "inline-block"}>↻</span>
            {refreshing ? "Đang tải..." : "Làm mới"}
          </button>
        </div>
      </div>

      {/* Smart Alerts */}
      {orderData.alerts.length > 0 && <AlertsBanner alerts={orderData.alerts} />}

      {/* Date Range Picker */}
      <div className="flex items-center gap-1 bg-white/3 rounded-xl p-1 w-fit border border-white/5">
        {DATE_RANGES.map((r) => (
          <button key={r.key} onClick={() => setDateRange(r.key)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dateRange === r.key ? "bg-[#C9A84C] text-[#0A0800] shadow-sm" : "text-gray-500 hover:text-gray-300"}`}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Row 1: Top KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Doanh thu" value={fmtVND(filteredRevenue)} sub={`Tuần này: ${fmtVND(o.weekRevenue)}`} color="#C9A84C" icon="💰" href="/admin/orders" trend={revTrend} trendLabel="Doanh thu 7 ngày" growth={o.revenueGrowthWeek} growthLabel="so với tuần trước" />
        <KpiCard label="Lợi nhuận" value={fmtVND(p.totalProfit)} sub={`Biên lợi nhuận: ${profitMargin}%`} color="#22C55E" icon="📈" growth={o.revenueGrowthMonth} growthLabel="so với tháng trước" />
        <KpiCard label="Đơn hàng" value={fmt(filteredOrders.length)} sub={`Chờ: ${o.pendingOrders} · Đang giao: ${o.shippingOrders}`} color="#3B82F6" icon="📦" href="/admin/orders" trend={orderTrend} trendLabel="Đơn hàng 7 ngày" growth={o.ordersGrowthWeek} growthLabel="so với tuần trước" />
        <KpiCard label="Giá trị TB/đơn" value={fmtVND(filteredAvgOrder)} sub={`${fmt(filteredDelivered)} đã giao · ${filteredConversion}% tỷ lệ`} color="#F472B6" icon="🎯" />
      </div>

      {/* Row 2: Secondary KPI */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Sản phẩm" value={fmt(p.totalProducts)} sub={`Đang bán: ${p.activeProducts} · Hết hàng: ${p.outOfStock}`} color="#8B5CF6" icon="🛏️" href="/admin/products" />
        <KpiCard label="Tồn kho" value={fmt(p.totalStock)} sub={`${p.lowStockCount} sản phẩm sắp hết hàng`} color={p.lowStockCount > 0 ? "#F59E0B" : "#22C55E"} icon="🏭" href="/admin/products" />
        <KpiCard label="Khách quay lại" value={`${o.repeatCustomerRate}%`} sub={`${o.repeatCustomerCount} khách đặt ≥2 lần`} color="#06B6D4" icon="🔄" />
        <KpiCard label="Liên hệ" value={fmt(b.totalContacts)} sub={`${b.unreadContacts} chưa đọc`} color={b.unreadContacts > 0 ? "#EF4444" : "#6B7280"} icon="💬" href="/admin/contacts" />
      </div>

      {/* Row 3: Revenue Chart + Order Status */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Doanh thu theo tháng</h3>
              <p className="text-xs text-gray-600 mt-0.5">6 tháng gần nhất</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-600">Tháng này</div>
              <div className="text-sm font-bold text-[#C9A84C]">{fmtVND(o.thisMonthRevenue)}</div>
              <div className="mt-0.5"><GrowthBadge pct={o.revenueGrowthMonth} /></div>
            </div>
          </div>
          <RevenueBarChart data={productData.revenueByMonth} />
          <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Tháng tốt nhất</div>
              <div className="text-sm font-bold text-white">{productData.revenueByMonth.length > 0 ? fmtVND(Math.max(...productData.revenueByMonth.map((m) => m.revenue))) : "—"}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Tổng đơn vị bán</div>
              <div className="text-sm font-bold text-white">{fmt(productData.revenueByMonth.reduce((s, m) => s + m.units, 0))}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Doanh thu TB/tháng</div>
              <div className="text-sm font-bold text-white">{productData.revenueByMonth.length > 0 ? fmtVND(Math.round(p.totalRevenue / productData.revenueByMonth.length)) : "—"}</div>
            </div>
          </div>
        </div>
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Trạng thái đơn hàng</h3>
          <div className="flex flex-col items-center gap-4">
            <StatusDonut segments={orderData.ordersByStatus} total={o.totalOrders} />
            <div className="w-full space-y-2">
              {orderData.ordersByStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-gray-400 truncate">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-white">{s.count}</span>
                    <span className="text-xs text-gray-700">{o.totalOrders > 0 ? `${Math.round((s.count / o.totalOrders) * 100)}%` : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Top Products + Recent Orders */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Sản phẩm bán chạy</h3>
            <Link href="/admin/products" className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C] transition-colors">Xem tất cả →</Link>
          </div>
          <div className="space-y-3">
            {productData.topSellingProducts.slice(0, 5).map((prod, i) => (
              <div key={prod.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-[#C9A84C]">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{prod.name}</div>
                  <div className="text-[10px] text-gray-600">{fmt(prod.totalSold)} đã bán · {prod.rating}⭐</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold text-[#C9A84C]">{fmtVND(prod.totalRevenue)}</div>
                </div>
              </div>
            ))}
            {productData.topSellingProducts.length === 0 && <p className="text-gray-600 text-xs text-center py-4">Chưa có dữ liệu bán hàng</p>}
          </div>
          {productData.lowStockProducts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-orange-400 text-xs">⚠️</span>
                <span className="text-xs font-medium text-orange-400">Sắp hết hàng ({productData.lowStockProducts.length})</span>
              </div>
              <div className="space-y-1.5">
                {productData.lowStockProducts.slice(0, 3).map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 truncate flex-1">{prod.name}</span>
                    <span className="text-xs font-bold text-orange-400 ml-2">{prod.totalStock} còn</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Đơn hàng gần đây</h3>
            <Link href="/admin/orders" className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C] transition-colors">Xem tất cả →</Link>
          </div>
          <div className="space-y-3">
            {orderData.recentOrders.slice(0, 6).map((order) => {
              const statusColors: Record<string, string> = { pending: "text-yellow-400 bg-yellow-400/10", confirmed: "text-blue-400 bg-blue-400/10", processing: "text-purple-400 bg-purple-400/10", shipping: "text-cyan-400 bg-cyan-400/10", delivered: "text-green-400 bg-green-400/10", cancelled: "text-red-400 bg-red-400/10", refunded: "text-gray-400 bg-gray-400/10" };
              const statusLabels: Record<string, string> = { pending: "Chờ", confirmed: "Xác nhận", processing: "Xử lý", shipping: "Giao hàng", delivered: "Đã giao", cancelled: "Hủy", refunded: "Hoàn" };
              return (
                <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center gap-3 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white group-hover:text-[#C9A84C] transition-colors">{order.orderNumber}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[order.status] || "text-gray-400 bg-gray-400/10"}`}>{statusLabels[order.status] || order.status}</span>
                    </div>
                    <div className="text-[10px] text-gray-600 truncate">{order.customerName} · {timeAgo(order.createdAt)}</div>
                  </div>
                  <div className="text-xs font-bold text-[#C9A84C] flex-shrink-0">{fmtVND(order.total)}</div>
                </Link>
              );
            })}
            {orderData.recentOrders.length === 0 && <p className="text-gray-600 text-xs text-center py-4">Chưa có đơn hàng nào</p>}
          </div>
        </div>
      </div>

      {/* Row 5: Funnel + Heatmap */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Funnel chuyển đổi đơn hàng</h3>
            <p className="text-xs text-gray-600 mt-0.5">Hover để xem tỷ lệ chuyển đổi từng bước</p>
          </div>
          <FunnelChart data={orderData.funnelData} />
          <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Xác nhận", hours: o.avgConfirmHours, color: "#3B82F6" },
              { label: "Xử lý", hours: o.avgProcessHours, color: "#8B5CF6" },
              { label: "Giao hàng", hours: o.avgShipHours, color: "#06B6D4" },
              { label: "Nhận hàng", hours: o.avgDeliverHours, color: "#22C55E" },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-sm font-bold" style={{ color: item.color }}>{item.hours}h</div>
                <div className="text-[9px] text-gray-700">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Phân bố đơn hàng</h3>
            <p className="text-xs text-gray-600 mt-0.5">Khung giờ và ngày đặt hàng nhiều nhất</p>
          </div>
          <HeatmapChart byHour={orderData.revenueByHour} byDow={orderData.revenueByDayOfWeek} />
          {orderData.revenueByHour.length > 0 && (() => {
            const peakHour = orderData.revenueByHour.reduce((a, b) => a.count > b.count ? a : b);
            const peakDow = orderData.revenueByDayOfWeek.reduce((a, b) => a.count > b.count ? a : b);
            return (
              <div className="mt-3 pt-3 border-t border-white/5 grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-[10px] text-gray-700 mb-0.5">Giờ cao điểm</div>
                  <div className="text-sm font-bold text-[#C9A84C]">{peakHour.label}</div>
                  <div className="text-[10px] text-gray-600">{peakHour.count} đơn</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-700 mb-0.5">Ngày cao điểm</div>
                  <div className="text-sm font-bold text-[#C9A84C]">{peakDow.label}</div>
                  <div className="text-[10px] text-gray-600">{peakDow.count} đơn</div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Row 6: City Revenue + Payment + Blog */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white">Doanh thu theo khu vực</h3>
            <p className="text-xs text-gray-600 mt-0.5">Di chuột để xem chi tiết</p>
          </div>
          <CityRevenueChart data={orderData.revenueByCity} />
        </div>
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Phương thức thanh toán</h3>
          <div className="space-y-3">
            {orderData.ordersByPayment.map((pm) => {
              const pct = o.totalOrders > 0 ? Math.round((pm.count / o.totalOrders) * 100) : 0;
              return (
                <div key={pm.method}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-300">{pm.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{pm.count}</span>
                      <span className="text-[10px] text-gray-600">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pm.color }} />
                  </div>
                </div>
              );
            })}
            {orderData.ordersByPayment.length === 0 && <p className="text-gray-600 text-xs text-center py-4">Chưa có dữ liệu</p>}
          </div>
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Tỷ lệ chuyển đổi</span>
              <span className="text-sm font-bold text-green-400">{o.conversionRate}%</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${o.conversionRate}%` }} />
            </div>
          </div>
        </div>
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Nội dung & Liên hệ</h3>
          <div className="space-y-3">
            <div className="p-3 bg-white/3 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><span>📝</span><span className="text-xs text-gray-300">Bài viết</span></div>
                <Link href="/admin/posts" className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C]">Quản lý →</Link>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-sm font-bold text-green-400">{b.publishedPosts}</div><div className="text-[10px] text-gray-600">Đã đăng</div></div>
                <div><div className="text-sm font-bold text-gray-400">{b.draftPosts}</div><div className="text-[10px] text-gray-600">Nháp</div></div>
                <div><div className="text-sm font-bold text-blue-400">{b.scheduledPosts}</div><div className="text-[10px] text-gray-600">Lịch</div></div>
              </div>
            </div>
            <div className="p-3 bg-white/3 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2"><span>💬</span><span className="text-xs text-gray-300">Liên hệ</span></div>
                <Link href="/admin/contacts" className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C]">Xem →</Link>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div><div className="text-sm font-bold text-white">{b.totalContacts}</div><div className="text-[10px] text-gray-600">Tổng</div></div>
                <div><div className={`text-sm font-bold ${b.unreadContacts > 0 ? "text-red-400" : "text-gray-500"}`}>{b.unreadContacts}</div><div className="text-[10px] text-gray-600">Chưa đọc</div></div>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-gray-700 uppercase tracking-wider mb-2">Chủ đề phổ biến</div>
              {blogData.contactsBySubject.slice(0, 3).map((s, i) => {
                const colors = ["#C9A84C", "#3B82F6", "#22C55E"];
                return (
                  <div key={s.subject} className="flex items-center justify-between py-1">
                    <span className="text-xs text-gray-500 truncate flex-1">{s.subject}</span>
                    <span className="text-xs font-medium ml-2" style={{ color: colors[i] }}>{s.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Row 7: Quick Actions */}
      <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { href: "/admin/orders/new", icon: "➕", label: "Tạo đơn hàng" },
            { href: "/admin/products/new", icon: "🛏️", label: "Thêm sản phẩm" },
            { href: "/admin/posts/new", icon: "✏️", label: "Viết bài mới" },
            { href: "/admin/contacts", icon: "💬", label: "Xem liên hệ" },
            { href: "/admin/homepage-products", icon: "🏠", label: "Trang chủ" },
            { href: "/admin/settings", icon: "⚙️", label: "Cài đặt" },
          ].map((action) => (
            <Link key={action.href} href={action.href} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/3 hover:bg-white/6 border border-transparent hover:border-white/10 transition-all group">
              <span className="text-xl">{action.icon}</span>
              <span className="text-[11px] text-gray-500 group-hover:text-gray-300 text-center transition-colors">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
