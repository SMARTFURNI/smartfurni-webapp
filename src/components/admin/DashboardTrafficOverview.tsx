"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Eye,
  Globe2,
  Link2,
  Mail,
  Megaphone,
  MousePointer2,
  Search,
  Share2,
  UsersRound,
} from "lucide-react";
import type {
  AnalyticsData,
  TrafficSourceGroupKey,
  TrafficSourceGroupRow,
} from "@/lib/analytics-store";

export type DashboardTrafficRange = "today" | "7d" | "30d" | "quarter" | "year" | "all";

const RANGE_MAP: Record<DashboardTrafficRange, string> = {
  today: "day",
  "7d": "week",
  "30d": "month",
  quarter: "quarter",
  year: "year",
  all: "all",
};

const SOURCE_STYLE: Record<TrafficSourceGroupKey, { color: string; icon: typeof Search }> = {
  organic_search: { color: "#34D399", icon: Search },
  social: { color: "#60A5FA", icon: Share2 },
  paid: { color: "#F472B6", icon: Megaphone },
  referral: { color: "#A78BFA", icon: Link2 },
  direct: { color: "#C9A84C", icon: MousePointer2 },
  email: { color: "#22D3EE", icon: Mail },
  other: { color: "#94A3B8", icon: Globe2 },
};

function number(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function TrafficMetric({ label, value, note, icon: Icon, color }: {
  label: string;
  value: string;
  note: string;
  icon: typeof Eye;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-[rgba(118,138,166,0.24)] bg-[linear-gradient(145deg,rgba(27,35,49,0.72),rgba(27,25,22,0.64))] p-4 min-w-0">
      <div className="flex items-center gap-2 text-[10px] sm:text-xs uppercase tracking-[0.12em] text-[rgba(245,237,214,0.52)]">
        <span className="grid h-8 w-8 place-items-center rounded-xl border border-[rgba(201,168,76,0.18)] bg-[rgba(201,168,76,0.055)]" style={{ color }}>
          <Icon size={16} />
        </span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-3 text-xl sm:text-2xl font-bold" style={{ color }}>{value}</div>
      <p className="mt-1 text-[10px] sm:text-xs text-[rgba(245,237,214,0.38)]">{note}</p>
    </div>
  );
}

function SourceCard({ row }: { row: TrafficSourceGroupRow }) {
  const style = SOURCE_STYLE[row.key];
  const Icon = style.icon;
  return (
    <div className="rounded-xl border border-[rgba(118,138,166,0.22)] bg-[#11151d]/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/[0.04]" style={{ color: style.color }}>
            <Icon size={14} />
          </span>
          <span className="truncate text-xs font-medium text-[rgba(245,237,214,0.78)]">{row.label}</span>
        </div>
        <span className="text-xs font-bold" style={{ color: style.color }}>{row.pct}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, row.pct)}%`, backgroundColor: style.color }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-[rgba(245,237,214,0.38)]">
        <span>{number(row.sessions)} lượt truy cập</span>
        <span>{number(row.views)} trang</span>
      </div>
    </div>
  );
}

export default function DashboardTrafficOverview({ range }: { range: DashboardTrafficRange }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?range=${RANGE_MAP[range]}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Không thể tải báo cáo lưu lượng");
      setData(await response.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleGroups = useMemo(
    () => (data?.sourceGroups || []).filter((row) => row.sessions > 0 || ["organic_search", "social", "paid", "direct"].includes(row.key)),
    [data]
  );
  const details = data?.sourceDetails?.slice(0, 10) || [];
  const paidDetails = details.filter((row) => row.group === "paid");
  const summary = data?.summary;
  const pagesPerSession = summary?.totalSessions
    ? Math.round((summary.totalViews / summary.totalSessions) * 10) / 10
    : 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-[rgba(201,168,76,0.18)] bg-[linear-gradient(135deg,rgba(18,25,37,0.97),rgba(29,24,14,0.96))] shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(201,168,76,0.16)] px-4 py-4 sm:px-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-400/15 bg-emerald-400/8 text-emerald-300">
              <Globe2 size={18} />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white">Lưu lượng truy cập website</h2>
              <p className="mt-0.5 text-[10px] sm:text-xs text-[rgba(245,237,214,0.42)]">Phân loại SEO, mạng xã hội, quảng cáo và nguồn giới thiệu</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="rounded-lg border border-[rgba(118,138,166,0.24)] px-2.5 py-1.5 text-[10px] text-[rgba(245,237,214,0.58)] hover:border-[rgba(201,168,76,0.35)] hover:text-white">
            Làm mới
          </button>
          <Link href="/admin/analytics" className="inline-flex items-center gap-1.5 rounded-lg border border-[#C9A84C]/25 px-2.5 py-1.5 text-[10px] font-medium text-[#D9BD6A] hover:bg-[#C9A84C]/8">
            Báo cáo đầy đủ <ExternalLink size={11} />
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-[320px] place-items-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#C9A84C] border-t-transparent" />
        </div>
      ) : !data ? (
        <div className="grid min-h-[220px] place-items-center px-6 text-center text-sm text-[rgba(245,237,214,0.48)]">
          Chưa thể tải dữ liệu lưu lượng. Vui lòng bấm “Làm mới”.
        </div>
      ) : (
        <div className="space-y-5 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <TrafficMetric label="Lượt truy cập" value={number(summary?.totalSessions || 0)} note="Phiên truy cập website" icon={MousePointer2} color="#34D399" />
            <TrafficMetric label="Người dùng" value={number(summary?.totalUniques || 0)} note="Khách truy cập duy nhất" icon={UsersRound} color="#60A5FA" />
            <TrafficMetric label="Lượt xem trang" value={number(summary?.totalViews || 0)} note="Tổng pageview trong kỳ" icon={Eye} color="#C9A84C" />
            <TrafficMetric label="Trang / lượt" value={String(pagesPerSession)} note="Mức độ khám phá website" icon={Globe2} color="#F472B6" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-[rgba(118,138,166,0.22)] bg-black/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Cơ cấu kênh truy cập</h3>
                  <p className="mt-0.5 text-[10px] text-[rgba(245,237,214,0.38)]">Tỷ trọng theo lượt truy cập</p>
                </div>
                <span className="text-[10px] text-[rgba(245,237,214,0.38)]">{number(summary?.totalSessions || 0)} lượt</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {visibleGroups.map((row) => <SourceCard key={row.key} row={row} />)}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(118,138,166,0.22)] bg-black/10 p-4 min-w-0">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">Chi tiết từng nguồn</h3>
                  <p className="mt-0.5 text-[10px] text-[rgba(245,237,214,0.38)]">Nguồn, kênh và chiến dịch mang khách vào website</p>
                </div>
                {paidDetails.length > 0 && (
                  <span className="shrink-0 rounded-full bg-pink-400/10 px-2 py-1 text-[9px] font-medium text-pink-300">{paidDetails.length} nguồn quảng cáo</span>
                )}
              </div>
              {details.length === 0 ? (
                <div className="grid min-h-36 place-items-center text-xs text-[rgba(245,237,214,0.38)]">Chưa có dữ liệu nguồn truy cập</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left">
                    <thead>
                      <tr className="border-b border-[rgba(118,138,166,0.22)] text-[9px] uppercase tracking-wider text-[rgba(245,237,214,0.36)]">
                        <th className="pb-2 font-medium">Nguồn</th>
                        <th className="pb-2 font-medium">Phân loại</th>
                        <th className="pb-2 text-right font-medium">Lượt</th>
                        <th className="pb-2 text-right font-medium">Người dùng</th>
                        <th className="pb-2 text-right font-medium">Trang</th>
                        <th className="pb-2 text-right font-medium">Tỷ trọng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.map((row, index) => {
                        const style = SOURCE_STYLE[row.group];
                        return (
                          <tr key={`${row.group}-${row.source}-${row.campaign}-${index}`} className="border-b border-[rgba(118,138,166,0.12)] last:border-0">
                            <td className="py-2.5 pr-3">
                              <div className="text-xs font-medium text-[rgba(245,237,214,0.82)]">{row.source}</div>
                              <div className="mt-0.5 max-w-[190px] truncate text-[9px] text-[rgba(245,237,214,0.35)]">{row.campaign || row.medium}</div>
                            </td>
                            <td className="py-2.5 pr-3"><span className="rounded-full px-2 py-1 text-[9px]" style={{ color: style.color, backgroundColor: `${style.color}16` }}>{row.groupLabel}</span></td>
                            <td className="py-2.5 text-right text-xs font-semibold text-white">{number(row.sessions)}</td>
                            <td className="py-2.5 text-right text-xs text-[rgba(245,237,214,0.58)]">{number(row.visitors)}</td>
                            <td className="py-2.5 text-right text-xs text-[rgba(245,237,214,0.58)]">{number(row.views)}</td>
                            <td className="py-2.5 text-right text-xs font-semibold" style={{ color: style.color }}>{row.pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
