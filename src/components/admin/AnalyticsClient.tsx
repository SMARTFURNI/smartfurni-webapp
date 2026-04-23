"use client";
import { useState, useEffect, useCallback } from "react";
import type { AnalyticsData } from "@/lib/analytics-store";

// ─── Types ────────────────────────────────────────────────────────────────────
type Range = "day" | "week" | "month" | "year" | "all";
type ChartMode = "views" | "uniques";

const RANGE_LABELS: Record<Range, string> = {
  day: "Hôm nay",
  week: "7 ngày",
  month: "30 ngày",
  year: "12 tháng",
  all: "Tất cả",
};

const DEVICE_COLORS: Record<string, string> = {
  Desktop: "#C9A84C",
  Mobile: "#3B82F6",
  Tablet: "#10B981",
  Unknown: "#6B7280",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function growthColor(g: number): string {
  if (g > 0) return "text-green-400";
  if (g < 0) return "text-red-400";
  return "text-[rgba(245,237,214,0.70)]";
}

function growthIcon(g: number): string {
  if (g > 0) return "↑";
  if (g < 0) return "↓";
  return "→";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  growth,
  sub,
  icon,
}: {
  label: string;
  value: string;
  growth: number;
  sub: string;
  icon: string;
}) {
  return (
    <div className="bg-[#0E0C00] border border-[rgba(255,200,100,0.14)] rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[#C9A84C]/60 text-xs font-medium uppercase tracking-wider">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-[#C9A84C] mb-1">{value}</div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold ${growthColor(growth)}`}>
          {growthIcon(growth)} {Math.abs(growth)}%
        </span>
        <span className="text-[#6B5B2A] text-xs">{sub}</span>
      </div>
    </div>
  );
}

function BarChart({
  data,
  mode,
  height = 200,
}: {
  data: { label: string; views: number; uniques: number; date: string }[];
  mode: ChartMode;
  height?: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-[#6B5B2A] text-sm">
        Chưa có dữ liệu
      </div>
    );
  }
  const values = data.map((d) => (mode === "views" ? d.views : d.uniques));
  const maxVal = Math.max(...values, 1);
  const barColor = mode === "views" ? "#C9A84C" : "#3B82F6";
  const barColorHover = mode === "views" ? "#F0C060" : "#60A5FA";

  return (
    <div className="relative" style={{ height }}>
      <div className="flex items-end gap-[2px] h-full pb-6">
        {data.map((d, i) => {
          const val = mode === "views" ? d.views : d.uniques;
          const barH = Math.max((val / maxVal) * (height - 40), val > 0 ? 4 : 0);
          const isHov = hovered === i;
          return (
            <div
              key={d.date}
              className="flex-1 flex flex-col items-center justify-end cursor-pointer group relative"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip */}
              {isHov && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1a1200] border border-[rgba(255,200,100,0.30)] rounded-lg px-3 py-2 text-xs whitespace-nowrap z-10 shadow-xl">
                  <div className="text-[#C9A84C] font-semibold">{d.label}</div>
                  <div className="text-white">Lượt xem: <span className="text-[#C9A84C]">{d.views.toLocaleString()}</span></div>
                  <div className="text-white">Unique: <span className="text-blue-400">{d.uniques.toLocaleString()}</span></div>
                </div>
              )}
              <div
                className="w-full rounded-t-sm transition-all duration-150"
                style={{
                  height: barH,
                  backgroundColor: isHov ? barColorHover : barColor,
                  opacity: hovered !== null && !isHov ? 0.4 : 1,
                }}
              />
              {/* Label — only show every N-th */}
              {(data.length <= 12 || i % Math.ceil(data.length / 12) === 0) && (
                <div className="absolute bottom-0 text-[9px] text-[#6B5B2A] truncate w-full text-center">
                  {d.label}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HourlyHeatmap({ data }: { data: { hour: number; label: string; views: number; uniques: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxViews = Math.max(...data.map((d) => d.views), 1);
  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {data.map((d) => {
          const intensity = d.views / maxViews;
          const bg = intensity === 0
            ? "#0E0C00"
            : `rgba(201,168,76,${0.1 + intensity * 0.9})`;
          return (
            <div
              key={d.hour}
              className="relative cursor-pointer"
              onMouseEnter={() => setHovered(d.hour)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-mono transition-all"
                style={{ backgroundColor: bg, color: intensity > 0.5 ? "#000" : "#C9A84C" }}
              >
                {d.hour}
              </div>
              {hovered === d.hour && (
                <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-[#1a1200] border border-[rgba(255,200,100,0.30)] rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                  <div className="text-[#C9A84C] font-semibold">{d.label}</div>
                  <div className="text-white">{d.views} lượt xem</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-[#6B5B2A]">Ít</span>
        <div className="flex gap-0.5">
          {[0.05, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
            <div key={v} className="w-4 h-2 rounded-sm" style={{ backgroundColor: `rgba(201,168,76,${v})` }} />
          ))}
        </div>
        <span className="text-[10px] text-[#6B5B2A]">Nhiều</span>
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: { device: string; count: number; pct: number }[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  if (!data.length) return <div className="text-[#6B5B2A] text-sm text-center py-8">Chưa có dữ liệu</div>;

  const total = data.reduce((s, d) => s + d.count, 0);
  const r = 60;
  const cx = 80;
  const cy = 80;
  let cumAngle = -Math.PI / 2;

  const slices = data.map((d) => {
    const angle = (d.count / total) * 2 * Math.PI;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    return { ...d, path, midAngle: startAngle + angle / 2 };
  });

  const hoveredSlice = slices.find((s) => s.device === hovered);

  return (
    <div className="flex items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {slices.map((s) => {
          const isHov = hovered === s.device;
          const color = DEVICE_COLORS[s.device] || "#6B7280";
          const scale = isHov ? 1.06 : 1;
          return (
            <path
              key={s.device}
              d={s.path}
              fill={color}
              opacity={hovered && !isHov ? 0.4 : 1}
              transform={`scale(${scale})`}
              style={{ transformOrigin: `${cx}px ${cy}px`, transition: "all 0.15s" }}
              onMouseEnter={() => setHovered(s.device)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            />
          );
        })}
        {/* Center hole */}
        <circle cx={cx} cy={cy} r={36} fill="#0E0C00" />
        {/* Center text */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#C9A84C" fontSize="11" fontWeight="bold">
          {hoveredSlice ? hoveredSlice.device : "Thiết bị"}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#C9A84C" fontSize="16" fontWeight="bold">
          {hoveredSlice ? `${hoveredSlice.pct}%` : `${total}`}
        </text>
        <text x={cx} y={cy + 24} textAnchor="middle" fill="#6B5B2A" fontSize="9">
          {hoveredSlice ? `${hoveredSlice.count.toLocaleString()} lượt` : "tổng lượt"}
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {slices.map((s) => (
          <div
            key={s.device}
            className="flex items-center gap-2 cursor-pointer"
            onMouseEnter={() => setHovered(s.device)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: DEVICE_COLORS[s.device] || "#6B7280" }} />
            <span className="text-xs text-[#C9A84C]/80">{s.device}</span>
            <span className="text-xs text-[#6B5B2A] ml-auto">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsClient() {
  const [range, setRange] = useState<Range>("month");
  const [chartMode, setChartMode] = useState<ChartMode>("views");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async (r: Range) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${r}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdated(new Date());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  // Chart data based on range
  const chartData = (() => {
    if (!data) return [];
    switch (range) {
      case "day": return data.byDay.slice(-1);
      case "week": return data.byDay.slice(-7);
      case "month": return data.byDay;
      case "year": return data.byMonth;
      case "all": return data.byYear;
    }
  })();

  const s = data?.summary;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#C9A84C]">Analytics</h1>
          <p className="text-[#6B5B2A] text-sm mt-0.5">
            Theo dõi lượt truy cập trang web
            {lastUpdated && (
              <span className="ml-2 text-[#4A3B1A]">· Cập nhật {lastUpdated.toLocaleTimeString("vi-VN")}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(range)}
            className="px-3 py-1.5 bg-[#1a1200] border border-[rgba(255,200,100,0.22)] text-[#C9A84C] text-xs rounded-lg hover:border-[rgba(255,200,100,0.08)]0 transition-colors"
          >
            ↻ Làm mới
          </button>
        </div>
      </div>

      {/* Range Picker */}
      <div className="flex gap-1 bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-xl p-1 w-fit">
        {(Object.entries(RANGE_LABELS) as [Range, string][]).map(([r, label]) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              range === r
                ? "bg-[#C9A84C] text-black"
                : "text-[#6B5B2A] hover:text-[#C9A84C]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Lượt xem"
          value={s ? fmt(s.totalViews) : "—"}
          growth={s?.viewsGrowth || 0}
          sub="so với kỳ trước"
          icon="👁"
        />
        <KPICard
          label="Khách duy nhất"
          value={s ? fmt(s.totalUniques) : "—"}
          growth={s?.uniquesGrowth || 0}
          sub="so với kỳ trước"
          icon="👤"
        />
        <KPICard
          label="TB/ngày"
          value={s ? fmt(s.avgViewsPerDay) : "—"}
          growth={0}
          sub="lượt xem mỗi ngày"
          icon="📊"
        />
        <KPICard
          label="Trang phổ biến"
          value={s?.topPage ? (s.topPage.length > 12 ? s.topPage.slice(0, 12) + "…" : s.topPage) : "/"}
          growth={0}
          sub="nhiều lượt xem nhất"
          icon="🏆"
        />
      </div>

      {/* Main Chart */}
      <div className="bg-[#0E0C00] border border-[rgba(255,200,100,0.14)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-[#C9A84C] font-semibold">Xu hướng lượt truy cập</h2>
            <p className="text-[#6B5B2A] text-xs mt-0.5">
              {range === "day" && "Hôm nay"}
              {range === "week" && "7 ngày qua"}
              {range === "month" && "30 ngày qua"}
              {range === "year" && "12 tháng qua"}
              {range === "all" && "Tất cả thời gian"}
            </p>
          </div>
          <div className="flex gap-1 bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-lg p-0.5">
            <button
              onClick={() => setChartMode("views")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${chartMode === "views" ? "bg-[#C9A84C] text-black" : "text-[#6B5B2A] hover:text-[#C9A84C]"}`}
            >
              Lượt xem
            </button>
            <button
              onClick={() => setChartMode("uniques")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all ${chartMode === "uniques" ? "bg-blue-500 text-white" : "text-[#6B5B2A] hover:text-[#C9A84C]"}`}
            >
              Unique
            </button>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full" />
          </div>
        ) : (
          <BarChart data={chartData} mode={chartMode} height={220} />
        )}
      </div>

      {/* Row: Top Pages + Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Pages */}
        <div className="bg-[#0E0C00] border border-[rgba(255,200,100,0.14)] rounded-xl p-5">
          <h2 className="text-[#C9A84C] font-semibold mb-4">Trang phổ biến nhất</h2>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-[#1a1200] rounded animate-pulse" />)}
            </div>
          ) : !data?.topPages.length ? (
            <div className="text-[#6B5B2A] text-sm text-center py-8">Chưa có dữ liệu</div>
          ) : (
            <div className="space-y-2">
              {data.topPages.map((p, i) => {
                const maxViews = data.topPages[0]?.views || 1;
                const pct = Math.round((p.views / maxViews) * 100);
                return (
                  <div key={p.path} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[#4A3B1A] text-xs w-4 flex-shrink-0">{i + 1}</span>
                        <span className="text-[#C9A84C]/80 text-xs truncate font-mono">{p.path}</span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                        <span className="text-[#C9A84C] text-xs font-semibold">{p.views.toLocaleString()}</span>
                        <span className="text-[#6B5B2A] text-xs">{p.uniques.toLocaleString()} unique</span>
                      </div>
                    </div>
                    <div className="h-1 bg-[#1a1200] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C9A84C] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Referrers */}
        <div className="bg-[#0E0C00] border border-[rgba(255,200,100,0.14)] rounded-xl p-5">
          <h2 className="text-[#C9A84C] font-semibold mb-4">Nguồn truy cập</h2>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-[#1a1200] rounded animate-pulse" />)}
            </div>
          ) : !data?.referrers.length ? (
            <div className="text-[#6B5B2A] text-sm text-center py-8">Chưa có dữ liệu</div>
          ) : (
            <div className="space-y-2">
              {data.referrers.map((r, i) => {
                const maxCount = data.referrers[0]?.count || 1;
                const pct = Math.round((r.count / maxCount) * 100);
                const label = r.referrer === "Direct"
                  ? "Trực tiếp"
                  : r.referrer.replace(/^https?:\/\//, "").split("/")[0];
                return (
                  <div key={r.referrer}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[#4A3B1A] text-xs w-4 flex-shrink-0">{i + 1}</span>
                        <span className="text-[#C9A84C]/80 text-xs truncate">{label}</span>
                      </div>
                      <span className="text-[#C9A84C] text-xs font-semibold flex-shrink-0 ml-2">
                        {r.count.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1 bg-[#1a1200] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row: Devices + Hourly Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Devices */}
        <div className="bg-[#0E0C00] border border-[rgba(255,200,100,0.14)] rounded-xl p-5">
          <h2 className="text-[#C9A84C] font-semibold mb-4">Thiết bị truy cập</h2>
          {loading ? (
            <div className="h-40 bg-[#1a1200] rounded animate-pulse" />
          ) : (
            <DonutChart data={data?.devices || []} />
          )}
        </div>

        {/* Hourly Heatmap */}
        <div className="bg-[#0E0C00] border border-[rgba(255,200,100,0.14)] rounded-xl p-5">
          <h2 className="text-[#C9A84C] font-semibold mb-1">Phân bố theo giờ</h2>
          <p className="text-[#6B5B2A] text-xs mb-4">7 ngày gần nhất</p>
          {loading ? (
            <div className="h-40 bg-[#1a1200] rounded animate-pulse" />
          ) : (
            <HourlyHeatmap data={data?.hourly || []} />
          )}
        </div>
      </div>

      {/* Weekly trend (byWeek) */}
      <div className="bg-[#0E0C00] border border-[rgba(255,200,100,0.14)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[#C9A84C] font-semibold">Xu hướng theo tuần</h2>
            <p className="text-[#6B5B2A] text-xs mt-0.5">12 tuần gần nhất</p>
          </div>
        </div>
        {loading ? (
          <div className="h-40 bg-[#1a1200] rounded animate-pulse" />
        ) : (
          <BarChart data={data?.byWeek || []} mode={chartMode} height={160} />
        )}
      </div>

      {/* Monthly trend */}
      <div className="bg-[#0E0C00] border border-[rgba(255,200,100,0.14)] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[#C9A84C] font-semibold">Xu hướng theo tháng</h2>
            <p className="text-[#6B5B2A] text-xs mt-0.5">12 tháng gần nhất</p>
          </div>
        </div>
        {loading ? (
          <div className="h-40 bg-[#1a1200] rounded animate-pulse" />
        ) : (
          <BarChart data={data?.byMonth || []} mode={chartMode} height={160} />
        )}
      </div>

      {/* Yearly trend */}
      {(data?.byYear?.length || 0) > 0 && (
        <div className="bg-[#0E0C00] border border-[rgba(255,200,100,0.14)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[#C9A84C] font-semibold">Xu hướng theo năm</h2>
              <p className="text-[#6B5B2A] text-xs mt-0.5">Tất cả các năm</p>
            </div>
          </div>
          <BarChart data={data!.byYear} mode={chartMode} height={160} />
        </div>
      )}

      {/* Empty state */}
      {!loading && data && data.summary.totalViews === 0 && (
        <div className="bg-[#0E0C00] border border-[rgba(255,200,100,0.14)] rounded-xl p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="text-[#C9A84C] font-semibold text-lg mb-2">Chưa có dữ liệu truy cập</h3>
          <p className="text-[#6B5B2A] text-sm max-w-md mx-auto">
            Hệ thống đã sẵn sàng theo dõi. Dữ liệu sẽ xuất hiện ngay khi có người truy cập trang web.
            Mỗi lượt truy cập được ghi nhận tự động — không cần cấu hình thêm.
          </p>
        </div>
      )}
    </div>
  );
}
