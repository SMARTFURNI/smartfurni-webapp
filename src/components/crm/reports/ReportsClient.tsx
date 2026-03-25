"use client";

import { useState, useMemo } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, Users, DollarSign,
  Target, Award, ArrowUpRight, ArrowDownRight, Minus,
  ChevronDown, Calendar, Download, Filter,
} from "lucide-react";
import type { Lead, Quote, CrmStats } from "@/lib/crm-store";

interface Props {
  leads: Lead[];
  stats: CrmStats;
  quotes: Quote[];
}

type ReportTab = "overview" | "pipeline" | "sales" | "sources" | "forecast";

const MONTHS_VI = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];

const STAGE_LABELS: Record<string, string> = {
  new: "Khách mới", profile_sent: "Đã gửi Profile", surveyed: "Đã khảo sát",
  quoted: "Đã báo giá", negotiating: "Thương thảo", won: "Đã chốt", lost: "Thất bại",
};

const STAGE_COLORS: Record<string, string> = {
  new: "#60a5fa", profile_sent: "#a78bfa", surveyed: "#C9A84C",
  quoted: "#f97316", negotiating: "#ec4899", won: "#22c55e", lost: "#f87171",
};

const SOURCE_COLORS: Record<string, string> = {
  "Facebook Ads": "#60a5fa", "Google Ads": "#f87171", "KTS giới thiệu": "#a78bfa",
  "Zalo": "#22c55e", "Triển lãm": "#C9A84C", "Website": "#f97316", "Khác": "#94a3b8",
};

function formatVND(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  return n.toLocaleString("vi-VN");
}

export default function ReportsClient({ leads, stats, quotes }: Props) {
  const [tab, setTab] = useState<ReportTab>("overview");
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  // ── Computed metrics ─────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const total = leads.length;
    const won = leads.filter(l => l.stage === "won").length;
    const lost = leads.filter(l => l.stage === "lost").length;
    const active = leads.filter(l => !["won","lost"].includes(l.stage)).length;
    const winRate = total > 0 ? Math.round((won / total) * 100) : 0;
    const totalValue = leads.filter(l => l.stage === "won").reduce((s, l) => s + l.expectedValue, 0);
    const pipelineValue = leads.filter(l => !["won","lost"].includes(l.stage)).reduce((s, l) => s + l.expectedValue, 0);
    const avgDealSize = won > 0 ? Math.round(totalValue / won) : 0;

    // Monthly data (simulate 12 months based on createdAt)
    const monthlyLeads = Array(12).fill(0);
    const monthlyWon = Array(12).fill(0);
    const monthlyValue = Array(12).fill(0);
    leads.forEach(l => {
      const m = new Date(l.createdAt).getMonth();
      monthlyLeads[m]++;
      if (l.stage === "won") { monthlyWon[m]++; monthlyValue[m] += l.expectedValue; }
    });

    // Stage distribution
    const stageCount: Record<string, number> = {};
    const stageValue: Record<string, number> = {};
    leads.forEach(l => {
      stageCount[l.stage] = (stageCount[l.stage] || 0) + 1;
      stageValue[l.stage] = (stageValue[l.stage] || 0) + l.expectedValue;
    });

    // Source performance
    const sourceMap: Record<string, { count: number; won: number; value: number }> = {};
    leads.forEach(l => {
      const s = l.source || "Khác";
      if (!sourceMap[s]) sourceMap[s] = { count: 0, won: 0, value: 0 };
      sourceMap[s].count++;
      if (l.stage === "won") { sourceMap[s].won++; sourceMap[s].value += l.expectedValue; }
    });
    const sources = Object.entries(sourceMap).map(([name, d]) => ({
      name, count: d.count, won: d.won, value: d.value,
      winRate: d.count > 0 ? Math.round((d.won / d.count) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    // Sales performance (by assignedTo)
    const salesMap: Record<string, { leads: number; won: number; value: number; lost: number }> = {};
    leads.forEach(l => {
      const s = l.assignedTo || "Chưa phân công";
      if (!salesMap[s]) salesMap[s] = { leads: 0, won: 0, value: 0, lost: 0 };
      salesMap[s].leads++;
      if (l.stage === "won") { salesMap[s].won++; salesMap[s].value += l.expectedValue; }
      if (l.stage === "lost") salesMap[s].lost++;
    });
    const salesPerf = Object.entries(salesMap).map(([name, d]) => ({
      name, leads: d.leads, won: d.won, value: d.value, lost: d.lost,
      winRate: d.leads > 0 ? Math.round((d.won / d.leads) * 100) : 0,
    })).sort((a, b) => b.value - a.value);

    // Forecast: pipeline * estimated close probability
    const stageProbability: Record<string, number> = {
      new: 5, profile_sent: 15, surveyed: 30, quoted: 50, negotiating: 75, won: 100, lost: 0,
    };
    const forecastValue = leads
      .filter(l => !["won","lost"].includes(l.stage))
      .reduce((s, l) => s + l.expectedValue * (stageProbability[l.stage] || 0) / 100, 0);

    return {
      total, won, lost, active, winRate, totalValue, pipelineValue, avgDealSize,
      monthlyLeads, monthlyWon, monthlyValue,
      stageCount, stageValue, sources, salesPerf, forecastValue,
    };
  }, [leads]);

  const maxMonthlyLeads = Math.max(...metrics.monthlyLeads, 1);
  const maxMonthlyValue = Math.max(...metrics.monthlyValue, 1);

  return (
    <div className="flex flex-col h-full" style={{ background: "#ffffff" }}>
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4"
        style={{ borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={20} style={{ color: "#C9A84C" }} />
              Báo cáo & Phân tích
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
              Tổng quan hiệu suất kinh doanh B2B SmartFurni
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid #e5e7eb" }}>
              {(["month","quarter","year"] as const).map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className="px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    background: period === p ? "rgba(201,168,76,0.15)" : "transparent",
                    color: period === p ? "#C9A84C" : "#6b7280",
                  }}>
                  {p === "month" ? "Tháng" : p === "quarter" ? "Quý" : "Năm"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Tổng khách hàng", value: metrics.total, sub: `${metrics.active} đang theo dõi`, icon: Users, color: "#60a5fa", trend: "up" },
            { label: "Doanh thu đã chốt", value: formatVND(metrics.totalValue) + "đ", sub: `${metrics.won} đơn thành công`, icon: DollarSign, color: "#22c55e", trend: "up" },
            { label: "Pipeline dự kiến", value: formatVND(metrics.pipelineValue) + "đ", sub: `${metrics.active} cơ hội`, icon: TrendingUp, color: "#C9A84C", trend: "up" },
            { label: "Tỷ lệ chốt", value: `${metrics.winRate}%`, sub: `Forecast: ${formatVND(metrics.forecastValue)}đ`, icon: Target, color: "#a78bfa", trend: metrics.winRate >= 30 ? "up" : "down" },
          ].map((kpi, i) => (
            <div key={i} className="rounded-2xl p-4"
              style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${kpi.color}15` }}>
                  <kpi.icon size={18} style={{ color: kpi.color }} />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold"
                  style={{ color: kpi.trend === "up" ? "#22c55e" : "#f87171" }}>
                  {kpi.trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900 leading-tight">{kpi.value}</div>
              <div className="text-[10px] mt-1 font-medium" style={{ color: "#374151" }}>{kpi.label}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "#9ca3af" }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-4" style={{ borderBottom: "1px solid #e5e7eb" }}>
          {([
            ["overview","Tổng quan"], ["pipeline","Pipeline"], ["sales","Hiệu suất Sales"],
            ["sources","Nguồn KH"], ["forecast","Dự báo"],
          ] as [ReportTab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="px-4 py-2 text-sm font-semibold relative transition-colors"
              style={{ color: tab === id ? "#C9A84C" : "#6b7280" }}>
              {label}
              {tab === id && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: "#C9A84C" }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ── Overview ─────────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* Monthly Leads Chart */}
            <ChartCard title="Khách hàng theo tháng" subtitle="Số lượng lead mới và đã chốt">
              <div className="flex items-end gap-2 h-40">
                {MONTHS_VI.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center gap-0.5">
                      <div className="w-full rounded-t-sm transition-all"
                        style={{ height: `${(metrics.monthlyLeads[i] / maxMonthlyLeads) * 120}px`, background: "rgba(96,165,250,0.3)", minHeight: "2px" }} />
                      <div className="w-full rounded-t-sm transition-all"
                        style={{ height: `${(metrics.monthlyWon[i] / maxMonthlyLeads) * 120}px`, background: "#22c55e", minHeight: metrics.monthlyWon[i] > 0 ? "2px" : "0" }} />
                    </div>
                    <div className="text-[9px]" style={{ color: "#9ca3af" }}>{m}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 rounded-sm" style={{ background: "rgba(96,165,250,0.3)" }} />
                  <span className="text-[10px]" style={{ color: "#6b7280" }}>Lead mới</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 rounded-sm" style={{ background: "#22c55e" }} />
                  <span className="text-[10px]" style={{ color: "#6b7280" }}>Đã chốt</span>
                </div>
              </div>
            </ChartCard>

            {/* Revenue Chart */}
            <ChartCard title="Doanh thu theo tháng" subtitle="Giá trị đơn hàng đã chốt (VNĐ)">
              <div className="flex items-end gap-2 h-40">
                {MONTHS_VI.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t-sm transition-all"
                      style={{
                        height: `${(metrics.monthlyValue[i] / maxMonthlyValue) * 130}px`,
                        background: metrics.monthlyValue[i] > 0
                          ? "linear-gradient(to top, #C9A84C, #E2C97E)"
                          : "#f3f4f6",
                        minHeight: "2px",
                      }} />
                    <div className="text-[9px]" style={{ color: "#9ca3af" }}>{m}</div>
                  </div>
                ))}
              </div>
              {metrics.totalValue > 0 && (
                <div className="mt-3 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid #e5e7eb" }}>
                  <span className="text-xs" style={{ color: "#6b7280" }}>Tổng doanh thu</span>
                  <span className="text-sm font-bold" style={{ color: "#C9A84C" }}>{formatVND(metrics.totalValue)}đ</span>
                </div>
              )}
            </ChartCard>
          </div>
        )}

        {/* ── Pipeline ─────────────────────────────────────────────────────── */}
        {tab === "pipeline" && (
          <div className="space-y-4">
            <ChartCard title="Phân bổ Pipeline" subtitle="Số lượng và giá trị theo từng giai đoạn">
              <div className="space-y-3 mt-2">
                {Object.entries(STAGE_LABELS).map(([stage, label]) => {
                  const count = metrics.stageCount[stage] || 0;
                  const value = metrics.stageValue[stage] || 0;
                  const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                  const color = STAGE_COLORS[stage];
                  return (
                    <div key={stage}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                          <span className="text-xs font-medium text-gray-900">{label}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                            style={{ background: `${color}15`, color }}>
                            {count}
                          </span>
                        </div>
                        <div className="text-xs" style={{ color: "#6b7280" }}>
                          {formatVND(value)}đ · {pct}%
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            {/* Funnel */}
            <ChartCard title="Phễu bán hàng" subtitle="Tỷ lệ chuyển đổi qua từng giai đoạn">
              <div className="space-y-1 mt-2">
                {["new","profile_sent","surveyed","quoted","negotiating","won"].map((stage, i, arr) => {
                  const count = metrics.stageCount[stage] || 0;
                  const total = metrics.stageCount[arr[0]] || 1;
                  const pct = Math.round((count / total) * 100);
                  const color = STAGE_COLORS[stage];
                  const width = 100 - i * 10;
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <div className="w-24 text-right text-[10px]" style={{ color: "#6b7280" }}>
                        {STAGE_LABELS[stage]}
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-7 rounded-lg flex items-center px-3"
                          style={{ background: `${color}20`, width: `${width}%`, maxWidth: "100%" }}>
                          <span className="text-xs font-bold" style={{ color }}>{count}</span>
                        </div>
                        <span className="text-[10px] w-8 text-right" style={{ color: "#9ca3af" }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>
        )}

        {/* ── Sales Performance ─────────────────────────────────────────────── */}
        {tab === "sales" && (
          <div className="space-y-4">
            <ChartCard title="Hiệu suất Sales" subtitle="Xếp hạng theo doanh thu đã chốt">
              <div className="space-y-3 mt-2">
                {metrics.salesPerf.map((s, i) => (
                  <div key={s.name} className="rounded-xl p-3"
                    style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: i === 0 ? "rgba(201,168,76,0.2)" : i === 1 ? "rgba(148,163,184,0.15)" : "#f3f4f6",
                          color: i === 0 ? "#C9A84C" : i === 1 ? "#94a3b8" : "rgba(255,255,255,0.4)",
                        }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-900">{s.name}</span>
                          <span className="text-sm font-bold" style={{ color: "#C9A84C" }}>{formatVND(s.value)}đ</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]" style={{ color: "#6b7280" }}>
                          <span>{s.leads} leads</span>
                          <span className="text-green-400">{s.won} chốt</span>
                          <span className="text-red-400">{s.lost} thất bại</span>
                          <span className="ml-auto font-semibold" style={{ color: s.winRate >= 30 ? "#22c55e" : "#f97316" }}>
                            Win rate: {s.winRate}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
                          <div className="h-full rounded-full" style={{ width: `${s.winRate}%`, background: s.winRate >= 30 ? "#22c55e" : "#f97316" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {metrics.salesPerf.length === 0 && (
                  <div className="text-center py-8 text-sm" style={{ color: "#9ca3af" }}>
                    Chưa có dữ liệu phân công sales
                  </div>
                )}
              </div>
            </ChartCard>

            {/* Avg deal size */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Giá trị đơn TB", value: formatVND(metrics.avgDealSize) + "đ", color: "#C9A84C" },
                { label: "Tổng đơn chốt", value: metrics.won.toString(), color: "#22c55e" },
                { label: "Tổng thất bại", value: metrics.lost.toString(), color: "#f87171" },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl p-4 text-center"
                  style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                  <div className="text-xl font-bold mb-1" style={{ color: item.color }}>{item.value}</div>
                  <div className="text-[10px]" style={{ color: "#6b7280" }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Sources ──────────────────────────────────────────────────────── */}
        {tab === "sources" && (
          <div className="space-y-4">
            <ChartCard title="Hiệu quả nguồn khách hàng" subtitle="So sánh số lượng, tỷ lệ chốt và doanh thu theo kênh">
              <div className="space-y-3 mt-2">
                {metrics.sources.map(src => {
                  const color = SOURCE_COLORS[src.name] || "#94a3b8";
                  const maxCount = Math.max(...metrics.sources.map(s => s.count), 1);
                  return (
                    <div key={src.name} className="rounded-xl p-3"
                      style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                          <span className="text-sm font-semibold text-gray-900">{src.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px]" style={{ color: "#6b7280" }}>
                          <span>{src.count} leads</span>
                          <span className="font-semibold" style={{ color: src.winRate >= 30 ? "#22c55e" : "#f97316" }}>
                            {src.winRate}% win
                          </span>
                          <span style={{ color: "#C9A84C" }}>{formatVND(src.value)}đ</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
                        <div className="h-full rounded-full" style={{ width: `${(src.count / maxCount) * 100}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>

            {/* Donut-style source breakdown */}
            <ChartCard title="Phân bổ nguồn" subtitle="Tỷ lệ % theo số lượng lead">
              <div className="grid grid-cols-2 gap-2 mt-2">
                {metrics.sources.map(src => {
                  const color = SOURCE_COLORS[src.name] || "#94a3b8";
                  const pct = metrics.total > 0 ? Math.round((src.count / metrics.total) * 100) : 0;
                  return (
                    <div key={src.name} className="flex items-center gap-2 p-2 rounded-lg"
                      style={{ background: "#f9fafb" }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ background: `${color}20`, color }}>
                        {pct}%
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-900">{src.name}</div>
                        <div className="text-[10px]" style={{ color: "#9ca3af" }}>{src.count} leads</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>
        )}

        {/* ── Forecast ─────────────────────────────────────────────────────── */}
        {tab === "forecast" && (
          <div className="space-y-4">
            {/* Forecast summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Doanh thu đã chốt", value: formatVND(metrics.totalValue) + "đ", color: "#22c55e", icon: CheckIcon },
                { label: "Dự báo có thể đạt", value: formatVND(metrics.forecastValue) + "đ", color: "#C9A84C", icon: TrendingUp },
                { label: "Tổng pipeline", value: formatVND(metrics.pipelineValue) + "đ", color: "#60a5fa", icon: Target },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl p-4"
                  style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: `${item.color}15` }}>
                    <item.icon size={18} style={{ color: item.color }} />
                  </div>
                  <div className="text-lg font-bold mb-1" style={{ color: item.color }}>{item.value}</div>
                  <div className="text-[10px]" style={{ color: "#6b7280" }}>{item.label}</div>
                </div>
              ))}
            </div>

            <ChartCard title="Dự báo theo giai đoạn" subtitle="Xác suất chốt × Giá trị dự kiến">
              <div className="space-y-3 mt-2">
                {[
                  { stage: "negotiating", prob: 75 },
                  { stage: "quoted", prob: 50 },
                  { stage: "surveyed", prob: 30 },
                  { stage: "profile_sent", prob: 15 },
                  { stage: "new", prob: 5 },
                ].map(({ stage, prob }) => {
                  const value = metrics.stageValue[stage] || 0;
                  const forecast = Math.round(value * prob / 100);
                  const color = STAGE_COLORS[stage];
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <div className="w-28 text-right">
                        <div className="text-xs font-medium text-gray-900">{STAGE_LABELS[stage]}</div>
                        <div className="text-[10px]" style={{ color: "#9ca3af" }}>Xác suất {prob}%</div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px]" style={{ color: "#9ca3af" }}>
                            {formatVND(value)}đ pipeline
                          </span>
                          <span className="text-xs font-bold" style={{ color }}>
                            ~{formatVND(forecast)}đ
                          </span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: "#f3f4f6" }}>
                          <div className="h-full rounded-full" style={{ width: `${prob}%`, background: color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 flex items-center justify-between"
                style={{ borderTop: "1px solid #e5e7eb" }}>
                <span className="text-sm font-semibold text-gray-900">Tổng dự báo</span>
                <span className="text-lg font-bold" style={{ color: "#C9A84C" }}>
                  ~{formatVND(metrics.forecastValue)}đ
                </span>
              </div>
            </ChartCard>

            {/* Quotes stats */}
            {quotes.length > 0 && (
              <ChartCard title="Trạng thái báo giá" subtitle="Tổng quan các báo giá đã tạo">
                <div className="grid grid-cols-4 gap-3 mt-2">
                  {[
                    { label: "Tổng báo giá", value: quotes.length, color: "#60a5fa" },
                    { label: "Đã gửi", value: quotes.filter(q => q.status === "sent").length, color: "#C9A84C" },
                    { label: "Đã chấp nhận", value: quotes.filter(q => q.status === "accepted").length, color: "#22c55e" },
                    { label: "Từ chối", value: quotes.filter(q => q.status === "rejected").length, color: "#f87171" },
                  ].map((item, i) => (
                    <div key={i} className="text-center p-3 rounded-xl"
                      style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                      <div className="text-xl font-bold mb-1" style={{ color: item.color }}>{item.value}</div>
                      <div className="text-[10px]" style={{ color: "#6b7280" }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </ChartCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-5"
      style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
      <div className="mb-4">
        <div className="text-sm font-bold text-gray-900">{title}</div>
        {subtitle && <div className="text-[11px] mt-0.5" style={{ color: "#6b7280" }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function CheckIcon({ size, style }: { size: number; style?: React.CSSProperties }) {
  return <Target size={size} style={style} />;
}
