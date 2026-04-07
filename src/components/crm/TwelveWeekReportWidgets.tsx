"use client";
/**
 * TwelveWeekReportWidgets
 * Shared report components dùng chung giữa TwelveWeekPlanClient và Dashboard.
 * Export chính: <TwelveWeekReportDashboard plan={plan} />
 */

import React, { useState } from "react";
import {
  Star, Eye, Award, BarChart2, TrendingUp, Zap, Target,
  CheckCircle2, Clock, AlertCircle, List, ChevronDown, ChevronUp, CheckCircle, XCircle, Circle,
} from "lucide-react";
import type { TwelveWeekPlan, GoalColor } from "@/lib/twelve-week-plan-store";

// ── Theme (mirror of TwelveWeekPlanClient) ───────────────────────────────────
const T = {
  bg: "#F8F9FB", card: "#FFFFFF", cardBorder: "#E5E7EB",
  cardShadow: "0 1px 4px rgba(0,0,0,0.06)",
  textPrimary: "#111827", textSecondary: "#374151", textMuted: "#6B7280",
  divider: "#F3F4F6",
  indigo: "#4F46E5", indigoBg: "#EEF2FF", indigoLight: "#C7D2FE",
  green: "#059669", greenBg: "#ECFDF5",
  gold: "#D97706", goldBg: "#FFFBEB",
  red: "#DC2626", redBg: "#FEF2F2",
  purple: "#7C3AED", purpleBg: "#F5F3FF",
  blue: "#2563EB", blueBg: "#EFF6FF",
};

const GOAL_COLORS: Record<GoalColor, { bg: string; text: string; border: string; label: string }> = {
  indigo: { bg: "#EEF2FF", text: "#4F46E5", border: "#C7D2FE", label: "Indigo" },
  green:  { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0", label: "Xanh lá" },
  gold:   { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A", label: "Vàng" },
  red:    { bg: "#FEF2F2", text: "#DC2626", border: "#FECACA", label: "Đỏ" },
  purple: { bg: "#F5F3FF", text: "#7C3AED", border: "#DDD6FE", label: "Tím" },
  blue:   { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE", label: "Xanh dương" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

const STATUS_CONFIG_W = {
  done:    { icon: CheckCircle, color: T.green,    label: "Xong" },
  pending: { icon: Circle,       color: T.textMuted, label: "Chưa" },
  skipped: { icon: XCircle,      color: T.red,      label: "Bỏ qua" },
} as const;

function fmtDateFull(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}
function getWeekRange(startDate: string, week: number) {
  const s = new Date(startDate);
  s.setDate(s.getDate() + (week - 1) * 7);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return { start: s, end: e };
}
function getCurrentWeek(startDate: string): number {
  const now = new Date();
  const start = new Date(startDate);
  const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.min(12, Math.max(1, Math.ceil((diff + 1) / 7)));
}

// ── ProgressRing ─────────────────────────────────────────────────────────────
function ProgressRing({ pct, size = 48, stroke = 4, color }: { pct: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}20`} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.7s ease" }} />
    </svg>
  );
}

// ── InsightsPanel (collapsible) ──────────────────────────────────────────────
function InsightsPanel({
  insights,
  insightColors,
  insightBg,
}: {
  insights: { type: "success" | "warning" | "danger" | "info"; text: string }[];
  insightColors: Record<string, string>;
  insightBg: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const dangerCount = insights.filter(i => i.type === "danger").length;
  const warningCount = insights.filter(i => i.type === "warning").length;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-3 flex items-center gap-2 transition-colors"
        style={{ borderBottom: open ? `1px solid ${T.cardBorder}` : "none" }}
      >
        <Zap size={14} style={{ color: T.gold }} />
        <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Nhận xét & Khuyến nghị tự động</span>
        {!open && (
          <div className="flex items-center gap-1.5 ml-2">
            {dangerCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${T.red}15`, color: T.red }}>
                {dangerCount} cảnh báo
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${T.gold}20`, color: T.gold }}>
                {warningCount} lưu ý
              </span>
            )}
            {dangerCount === 0 && warningCount === 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${T.green}15`, color: T.green }}>
                Đang tốt
              </span>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold" style={{ color: T.textMuted }}>
          {open ? (
            <><ChevronUp size={14} /> Thu gọn</>
          ) : (
            <><ChevronDown size={14} /> Mở rộng</>
          )}
        </div>
      </button>
      {open && (
        <div className="px-5 py-4 space-y-2">
          {insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: insightBg[ins.type], border: `1px solid ${insightColors[ins.type]}20` }}>
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: insightColors[ins.type] }} />
              <p className="text-xs leading-relaxed" style={{ color: T.textPrimary }}>{ins.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main export: TwelveWeekReportDashboard ───────────────────────────────────
export function TwelveWeekReportDashboard({ plan }: { plan: TwelveWeekPlan }) {
  const currentWeek = getCurrentWeek(plan.startDate);
  const weeksLeft = Math.max(0, 12 - currentWeek);
  const { start: planStart } = getWeekRange(plan.startDate, 1);
  const { end: planEnd } = getWeekRange(plan.startDate, 12);

  // ── Per-goal stats ──────────────────────────────────────────────────────────
  const goalStats = plan.goals.map(goal => {
    const all    = plan.tasks.filter(t => t.goalId === goal.id);
    const active = all.filter(t => t.status !== "skipped");
    const done   = all.filter(t => t.status === "done");
    const skip   = all.filter(t => t.status === "skipped");
    const pend   = all.filter(t => t.status === "pending");
    const pct    = active.length > 0 ? Math.round((done.length / active.length) * 100) : 0;
    const idealPct = Math.round((currentWeek / 12) * 100);
    const gap    = pct - idealPct;

    const pastWeeksDone = Array.from({ length: currentWeek }, (_, i) =>
      all.filter(t => t.weekNumber === i + 1 && t.status === "done").length
    );
    const velocity = currentWeek > 0 ? pastWeeksDone.reduce((s, v) => s + v, 0) / currentWeek : 0;
    const forecastDone = Math.min(active.length, done.length + Math.round(velocity * weeksLeft));
    const forecastPct  = active.length > 0 ? Math.round((forecastDone / active.length) * 100) : 0;

    const weeklyPcts = Array.from({ length: 12 }, (_, i) => {
      const w = i + 1;
      const wActive = all.filter(t => t.weekNumber === w && t.status !== "skipped");
      const wDone   = all.filter(t => t.weekNumber === w && t.status === "done");
      return wActive.length > 0 ? Math.round((wDone.length / wActive.length) * 100) : -1;
    });

    let streak = 0;
    for (let i = currentWeek - 1; i >= 0; i--) {
      if (weeklyPcts[i] === 100) streak++;
      else break;
    }

    const healthScore = Math.min(100, Math.round(
      pct * 0.4 +
      Math.max(0, 50 + gap) * 0.3 +
      forecastPct * 0.2 +
      streak * 5 * 0.1
    ));

    return { goal, all, active, done, skip, pend, pct, idealPct, gap, velocity, forecastPct, weeklyPcts, streak, healthScore };
  });

  // ── Overall stats ───────────────────────────────────────────────────────────
  const totalActive = goalStats.reduce((s, g) => s + g.active.length, 0);
  const totalDone   = goalStats.reduce((s, g) => s + g.done.length, 0);
  const totalSkip   = goalStats.reduce((s, g) => s + g.skip.length, 0);
  const totalPend   = goalStats.reduce((s, g) => s + g.pend.length, 0);
  const overallPct  = totalActive > 0 ? Math.round((totalDone / totalActive) * 100) : 0;
  const idealPct    = Math.round((currentWeek / 12) * 100);
  const overallGap  = overallPct - idealPct;
  const avgHealth   = goalStats.length > 0 ? Math.round(goalStats.reduce((s, g) => s + g.healthScore, 0) / goalStats.length) : 0;
  const onTrackGoals = goalStats.filter(g => g.gap >= -10).length;

  // ── Radar chart ─────────────────────────────────────────────────────────────
  const CX = 120; const CY = 120; const R = 85;
  const N = Math.max(goalStats.length, 3);
  function radarPoint(idx: number, pct: number) {
    const angle = (idx / N) * 2 * Math.PI - Math.PI / 2;
    const r = (pct / 100) * R;
    return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
  }
  function radarPointIdeal(idx: number) {
    const angle = (idx / N) * 2 * Math.PI - Math.PI / 2;
    return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
  }
  const actualRadarPoints = goalStats.map((g, i) => radarPoint(i, g.pct));
  const idealRadarPoints  = goalStats.map((_, i) => radarPointIdeal(i));

  // ── Weekly bar chart data ───────────────────────────────────────────────────
  const weeklyBarData = Array.from({ length: 12 }, (_, i) => {
    const w = i + 1;
    const wTasks = plan.tasks.filter(t => t.weekNumber === w && t.status !== "skipped");
    const wDone  = plan.tasks.filter(t => t.weekNumber === w && t.status === "done");
    return { week: w, total: wTasks.length, done: wDone.length, pct: wTasks.length > 0 ? Math.round((wDone.length / wTasks.length) * 100) : 0 };
  });
  const maxBar = Math.max(...weeklyBarData.map(d => d.total), 1);

  // ── Insights ────────────────────────────────────────────────────────────────
  const sorted = [...goalStats].sort((a, b) => b.pct - a.pct);
  const best  = sorted[0];
  const worst = sorted[sorted.length - 1];
  const atRisk = goalStats.filter(g => g.forecastPct < 60);
  const exceeding = goalStats.filter(g => g.gap >= 10);

  const insights: { type: "success" | "warning" | "danger" | "info"; text: string }[] = [];
  if (overallGap >= 5)  insights.push({ type: "success", text: `Kế hoạch đang vượt mục tiêu ${overallGap}% so với pace lý tưởng. Tiếp tục duy trì!` });
  if (overallGap < -15) insights.push({ type: "danger",  text: `Kế hoạch đang chậm ${Math.abs(overallGap)}% so với mục tiêu. Cần tăng tốc ngay.` });
  if (overallGap >= -15 && overallGap < -5) insights.push({ type: "warning", text: `Kế hoạch chậm nhẹ ${Math.abs(overallGap)}% — cần chú ý để bắt kịp.` });
  if (best) insights.push({ type: "success", text: `"${best.goal.title}" đang dẫn đầu với ${best.pct}% hoàn thành.` });
  if (worst && worst !== best) insights.push({ type: worst.gap < -20 ? "danger" : "warning", text: `"${worst.goal.title}" cần chú ý nhất: chỉ đạt ${worst.pct}%, chậm ${Math.abs(worst.gap)}% so với mục tiêu.` });
  if (atRisk.length > 0) insights.push({ type: "danger", text: `${atRisk.length} mục tiêu có nguy cơ không đạt cuối kỳ: ${atRisk.map(g => `"${g.goal.title}"`).join(", ")}.` });
  if (exceeding.length > 0) insights.push({ type: "success", text: `${exceeding.length} mục tiêu vượt kế hoạch: ${exceeding.map(g => `"${g.goal.title}" (+${g.gap}%)`).join(", ")}.` });
  if (weeksLeft <= 3 && overallPct < 80) insights.push({ type: "danger", text: `Chỉ còn ${weeksLeft} tuần! Cần tập trung hoàn thành ${totalPend} công việc còn lại.` });
  if (insights.length === 0) insights.push({ type: "info", text: "Kế hoạch đang đi đúng hướng. Tiếp tục duy trì nhịp độ hiện tại." });

  const insightColors = { success: T.green, warning: T.gold, danger: T.red, info: T.indigo };
  const insightBg     = { success: T.greenBg, warning: T.goldBg, danger: T.redBg, info: T.indigoBg };

  return (
    <div className="space-y-4">
      {/* ── 1. Scorecard header ── */}
      <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${T.indigoBg}, #F0FDF4)`, border: `1.5px solid ${T.indigoLight}` }}>
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-xl" style={{ background: T.indigo }}>
            <Star size={18} color="#fff" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-black" style={{ color: T.textPrimary }}>Báo cáo tổng hợp hiệu suất</h2>
            <p className="text-xs" style={{ color: T.textMuted }}>{plan.title}</p>
            <p className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>
              {fmtDateFull(planStart.toISOString())} → {fmtDateFull(planEnd.toISOString())} · Tuần {currentWeek}/12
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black" style={{ color: avgHealth >= 70 ? T.green : avgHealth >= 50 ? T.gold : T.red }}>{avgHealth}</div>
            <div className="text-[10px] font-semibold" style={{ color: T.textMuted }}>Health Score</div>
          </div>
        </div>
        {/* 5 KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {[
            { label: "Tiến độ tổng", value: `${overallPct}%`, sub: `${totalDone}/${totalActive} việc`, color: T.indigo },
            { label: "So mục tiêu", value: `${overallGap >= 0 ? "+" : ""}${overallGap}%`, sub: `Pace lý tưởng: ${idealPct}%`, color: overallGap >= 0 ? T.green : overallGap >= -15 ? T.gold : T.red },
            { label: "Đúng hướng", value: `${onTrackGoals}/${goalStats.length}`, sub: "Mục tiêu on-track", color: T.green },
            { label: "Còn lại", value: String(totalPend), sub: `${weeksLeft} tuần còn lại`, color: T.gold },
            { label: "Bỏ qua", value: String(totalSkip), sub: "Công việc skipped", color: T.textMuted },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${T.cardBorder}` }}>
              <div className="text-xl font-black" style={{ color }}>{value}</div>
              <div className="text-[9px] font-semibold mt-0.5" style={{ color: T.textMuted }}>{label}</div>
              <div className="text-[8px]" style={{ color: T.textMuted }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. Radar + Goal Ranking ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Radar chart */}
        <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
          <div className="flex items-center gap-2 mb-3">
            <Eye size={14} style={{ color: T.indigo }} />
            <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Radar — So sánh mục tiêu</span>
          </div>
          {goalStats.length >= 3 ? (
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 240 240" className="w-full max-w-[220px]">
                {[25, 50, 75, 100].map(pct => {
                  const pts = Array.from({ length: N }, (_, i) => {
                    const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
                    const r2 = (pct / 100) * R;
                    return { x: CX + r2 * Math.cos(angle), y: CY + r2 * Math.sin(angle) };
                  });
                  return (
                    <polygon key={pct} points={pts.map(p => `${p.x},${p.y}`).join(" ")}
                      fill="none" stroke="#E5E7EB" strokeWidth="0.8" />
                  );
                })}
                {goalStats.map((_, i) => {
                  const p = radarPointIdeal(i);
                  return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="#E5E7EB" strokeWidth="0.8" />;
                })}
                <polygon points={idealRadarPoints.map(p => `${p.x},${p.y}`).join(" ")}
                  fill={`${T.indigo}08`} stroke={`${T.indigo}30`} strokeWidth="1" strokeDasharray="3 3" />
                <polygon points={actualRadarPoints.map(p => `${p.x},${p.y}`).join(" ")}
                  fill={`${T.indigo}20`} stroke={T.indigo} strokeWidth="2" />
                {actualRadarPoints.map((p, i) => {
                  const gc = GOAL_COLORS[goalStats[i].goal.color];
                  return (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r={5} fill={gc.text} stroke="#fff" strokeWidth="1.5" />
                      <text x={radarPointIdeal(i).x} y={radarPointIdeal(i).y}
                        textAnchor={radarPointIdeal(i).x < CX - 5 ? "end" : radarPointIdeal(i).x > CX + 5 ? "start" : "middle"}
                        dy={radarPointIdeal(i).y < CY ? -6 : 14}
                        fontSize="8" fill={gc.text} fontWeight="bold">
                        {goalStats[i].pct}%
                      </text>
                    </g>
                  );
                })}
                <text x={CX} y={CY + 4} textAnchor="middle" fontSize="11" fill={T.indigo} fontWeight="bold">{overallPct}%</text>
              </svg>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {goalStats.map(({ goal }) => {
                  const gc = GOAL_COLORS[goal.color];
                  return (
                    <div key={goal.id} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: gc.text }} />
                      <span className="text-[9px]" style={{ color: T.textMuted }}>{goal.title.length > 18 ? goal.title.slice(0, 18) + "…" : goal.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-xs" style={{ color: T.textMuted }}>Cần ít nhất 3 mục tiêu để hiển thị radar chart</p>
            </div>
          )}
        </div>

        {/* Goal ranking */}
        <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
          <div className="flex items-center gap-2 mb-3">
            <Award size={14} style={{ color: T.gold }} />
            <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Xếp hạng mục tiêu</span>
          </div>
          <div className="space-y-3">
            {sorted.map(({ goal, pct, gap, forecastPct, healthScore }, rank) => {
              const gc = GOAL_COLORS[goal.color];
              const rankColors = ["#F59E0B", "#9CA3AF", "#CD7F32"];
              return (
                <div key={goal.id} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-black"
                    style={{ background: rank < 3 ? `${rankColors[rank]}20` : T.divider, color: rank < 3 ? rankColors[rank] : T.textMuted }}>
                    {rank + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: gc.text }} />
                      <span className="text-xs font-semibold truncate" style={{ color: T.textPrimary }}>{goal.title}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: `${gc.text}15` }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: gc.text }} />
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 min-w-[60px]">
                    <div className="text-sm font-black" style={{ color: gc.text }}>{pct}%</div>
                    <div className="text-[9px]" style={{ color: gap >= 0 ? T.green : T.red }}>{gap >= 0 ? "+" : ""}{gap}% vs target</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-bold" style={{ color: healthScore >= 70 ? T.green : healthScore >= 50 ? T.gold : T.red }}>{healthScore}</div>
                    <div className="text-[8px]" style={{ color: T.textMuted }}>health</div>
                  </div>
                </div>
              );
            })}
            {sorted.length === 0 && (
              <p className="text-sm text-center py-4" style={{ color: T.textMuted }}>Chưa có mục tiêu nào</p>
            )}
          </div>
        </div>
      </div>

      {/* ── 3. Heatmap 12 tuần × mục tiêu ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        {/* Header */}
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.cardBorder}`, background: T.bg }}>
          <BarChart2 size={14} style={{ color: T.indigo }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Heatmap tiến độ — 12 tuần × mục tiêu</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[9px] font-medium" style={{ color: T.textMuted }}>0%</span>
            {["#FEE2E2","#FEF3C7","#FDE68A","#86EFAC","#34D399","#059669"].map((c,i) => (
              <div key={i} className="w-4 h-4 rounded" style={{ background: c }} />
            ))}
            <span className="text-[9px] font-medium" style={{ color: T.textMuted }}>100%</span>
          </div>
        </div>

        {/* Week header row */}
        <div className="px-5 pt-3 pb-1">
          <div className="flex items-center gap-1">
            <div style={{ width: 140, flexShrink: 0 }} />
            {Array.from({ length: 12 }, (_, i) => {
              const isCur = i + 1 === currentWeek;
              return (
                <div key={i} className="flex-1 text-center" style={{ minWidth: 0 }}>
                  <span className="text-[10px] font-bold block"
                    style={{ color: isCur ? T.indigo : T.textMuted }}>
                    T{i + 1}
                  </span>
                  {isCur && (
                    <div className="w-1 h-1 rounded-full mx-auto mt-0.5" style={{ background: T.indigo }} />
                  )}
                </div>
              );
            })}
            <div style={{ width: 44, flexShrink: 0 }} />
          </div>
        </div>

        {/* Goal rows */}
        <div className="px-5 pb-3 space-y-1.5">
          {goalStats.map(({ goal, weeklyPcts, pct }) => {
            const gc = GOAL_COLORS[goal.color];
            return (
              <div key={goal.id} className="flex items-center gap-1">
                <div className="flex items-center gap-1.5 flex-shrink-0" style={{ width: 140 }}>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: gc.text }} />
                  <span className="text-[10px] font-semibold truncate" style={{ color: T.textPrimary }}
                    title={goal.title}>{goal.title}</span>
                </div>
                {weeklyPcts.map((p, wi) => {
                  const isCur = wi + 1 === currentWeek;
                  const isFuture = wi + 1 > currentWeek;
                  const cellBg = p < 0
                    ? (isFuture ? "#F3F4F6" : "#F9FAFB")
                    : p === 0   ? "#FEE2E2"
                    : p <= 25   ? "#FEF3C7"
                    : p <= 50   ? "#FDE68A"
                    : p <= 75   ? "#86EFAC"
                    : p < 100   ? "#34D399"
                    : "#059669";
                  return (
                    <div key={wi} className="flex-1 group relative" style={{ minWidth: 0 }}>
                      <div
                        className="rounded-md transition-all duration-150 group-hover:scale-110 group-hover:shadow-md"
                        style={{
                          height: 28,
                          background: cellBg,
                          border: isCur
                            ? `2px solid ${T.indigo}`
                            : isFuture
                            ? `1px dashed #E5E7EB`
                            : `1px solid transparent`,
                        }}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ whiteSpace: "nowrap" }}>
                        <div className="px-2 py-1 rounded-lg text-[10px] font-bold shadow-lg"
                          style={{ background: T.textPrimary, color: "#fff" }}>
                          T{wi + 1}: {p < 0 ? "Chưa có việc" : `${p}%`}
                        </div>
                        <div className="w-1.5 h-1.5 mx-auto -mt-0.5 rotate-45" style={{ background: T.textPrimary }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex-shrink-0 text-right" style={{ width: 44 }}>
                  <span className="text-xs font-black" style={{ color: gc.text }}>{pct}%</span>
                </div>
              </div>
            );
          })}

          <div style={{ height: 1, background: T.cardBorder, margin: "6px 0" }} />

          {/* Overall row */}
          {(() => {
            const overallWeekPcts = Array.from({ length: 12 }, (_, wi) => {
              const wActive = plan.tasks.filter(t => t.weekNumber === wi + 1 && t.status !== "skipped");
              const wDone   = plan.tasks.filter(t => t.weekNumber === wi + 1 && t.status === "done");
              return wActive.length > 0 ? Math.round((wDone.length / wActive.length) * 100) : -1;
            });
            return (
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1.5 flex-shrink-0" style={{ width: 140 }}>
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: T.indigo }} />
                  <span className="text-[10px] font-black" style={{ color: T.textPrimary }}>Tổng hợp</span>
                </div>
                {overallWeekPcts.map((wp, wi) => {
                  const isCur = wi + 1 === currentWeek;
                  const isFuture = wi + 1 > currentWeek;
                  const cellBg = wp < 0
                    ? (isFuture ? "#F3F4F6" : "#F9FAFB")
                    : wp === 0   ? "#FEE2E2"
                    : wp <= 25   ? "#FEF3C7"
                    : wp <= 50   ? "#FDE68A"
                    : wp <= 75   ? "#86EFAC"
                    : wp < 100   ? "#34D399"
                    : "#059669";
                  return (
                    <div key={wi} className="flex-1 group relative" style={{ minWidth: 0 }}>
                      <div className="rounded-md transition-all duration-150 group-hover:scale-110 group-hover:shadow-md"
                        style={{
                          height: 28,
                          background: cellBg,
                          border: isCur ? `2px solid ${T.indigo}` : isFuture ? `1px dashed #E5E7EB` : `1px solid transparent`,
                        }} />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ whiteSpace: "nowrap" }}>
                        <div className="px-2 py-1 rounded-lg text-[10px] font-bold shadow-lg"
                          style={{ background: T.textPrimary, color: "#fff" }}>
                          T{wi + 1}: {wp < 0 ? "Chưa có việc" : `${wp}%`}
                        </div>
                        <div className="w-1.5 h-1.5 mx-auto -mt-0.5 rotate-45" style={{ background: T.textPrimary }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex-shrink-0 text-right" style={{ width: 44 }}>
                  <span className="text-xs font-black" style={{ color: T.indigo }}>{overallPct}%</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer legend */}
        <div className="px-5 py-2.5 flex items-center gap-4 flex-wrap" style={{ borderTop: `1px solid ${T.cardBorder}`, background: T.bg }}>
          {[
            { color: "#FEE2E2", label: "0%" },
            { color: "#FDE68A", label: "25–50%" },
            { color: "#86EFAC", label: "50–75%" },
            { color: "#059669", label: "100%" },
            { color: "#F3F4F6", label: "Chưa đến", dashed: true },
          ].map(({ color, label, dashed }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded"
                style={{ background: color, border: dashed ? "1px dashed #D1D5DB" : `1px solid ${color}` }} />
              <span className="text-[9px]" style={{ color: T.textMuted }}>{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-3.5 h-3.5 rounded" style={{ background: "transparent", border: `2px solid ${T.indigo}` }} />
            <span className="text-[9px]" style={{ color: T.textMuted }}>Tuần hiện tại</span>
          </div>
        </div>
      </div>

            {/* ── 4. Weekly bar chart ── */}
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={15} style={{ color: T.indigo }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Tiến độ từng tuần</span>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {weeklyBarData.map(({ week, total, done, pct }) => {
            const isCurrent = week === currentWeek;
            const barH = total > 0 ? Math.max(8, (total / maxBar) * 100) : 8;
            const doneH = total > 0 ? (done / total) * barH : 0;
            return (
              <div key={week} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end rounded-t-lg overflow-hidden relative"
                  style={{ height: barH, background: `${T.indigo}15` }}>
                  <div className="w-full rounded-t-lg transition-all duration-700"
                    style={{ height: `${doneH}px`, background: isCurrent ? T.indigo : pct === 100 ? T.green : `${T.indigo}60` }} />
                  {isCurrent && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full" style={{ background: T.gold }} />
                  )}
                </div>
                <span className="text-[9px] font-bold" style={{ color: isCurrent ? T.indigo : T.textMuted }}>T{week}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: T.green }} /><span className="text-[10px]" style={{ color: T.textMuted }}>Hoàn thành 100%</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: T.indigo }} /><span className="text-[10px]" style={{ color: T.textMuted }}>Đang làm</span></div>
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: T.gold }} /><span className="text-[10px]" style={{ color: T.textMuted }}>Tuần hiện tại</span></div>
        </div>
      </div>

      {/* ── 5. Auto insights ── */}
      <InsightsPanel insights={insights} insightColors={insightColors} insightBg={insightBg} />
    </div>
  );
}

// ── GoalDetailDashboard: Báo cáo chi tiết từng mục tiêu (dùng cho Dashboard) ─
export function GoalDetailDashboard({ plan }: { plan: TwelveWeekPlan }) {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(
    plan.goals.length > 0 ? plan.goals[0].id : null
  );
  const [showTaskList, setShowTaskList] = useState(false);
  const currentWeek = getCurrentWeek(plan.startDate);

  const selectedGoal = plan.goals.find(g => g.id === selectedGoalId) ?? plan.goals[0];
  if (!selectedGoal) return (
    <div className="rounded-2xl p-8 text-center" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
      <p style={{ color: T.textMuted }}>Chưa có mục tiêu nào trong kế hoạch</p>
    </div>
  );

  const gc = GOAL_COLORS[selectedGoal.color];

  const weekStats = Array.from({ length: 12 }, (_, i) => {
    const w = i + 1;
    const wAll   = plan.tasks.filter(t => t.goalId === selectedGoal.id && t.weekNumber === w);
    const wTasks = wAll.filter(t => t.status !== "skipped");
    const wDone  = wAll.filter(t => t.status === "done");
    const wSkip  = wAll.filter(t => t.status === "skipped");
    const wPend  = wAll.filter(t => t.status === "pending");
    const pct = wTasks.length > 0 ? Math.round((wDone.length / wTasks.length) * 100) : 0;
    return { week: w, total: wTasks.length, done: wDone.length, skip: wSkip.length, pending: wPend.length, pct, isPast: w < currentWeek, isCurrent: w === currentWeek, allTasks: [...wDone, ...wPend, ...wSkip] };
  });

  const allGoalTasks = plan.tasks.filter(t => t.goalId === selectedGoal.id && t.status !== "skipped");
  const doneTasks    = plan.tasks.filter(t => t.goalId === selectedGoal.id && t.status === "done");
  const skipTasks    = plan.tasks.filter(t => t.goalId === selectedGoal.id && t.status === "skipped");
  const pendTasks    = plan.tasks.filter(t => t.goalId === selectedGoal.id && t.status === "pending");
  const overallPct   = allGoalTasks.length > 0 ? Math.round((doneTasks.length / allGoalTasks.length) * 100) : 0;
  const idealPct     = Math.round((currentWeek / 12) * 100);
  const gap          = overallPct - idealPct;
  const gapColor     = gap >= 0 ? T.green : gap >= -15 ? T.gold : T.red;
  const gapLabel     = gap >= 0 ? "Vượt mục tiêu" : gap >= -15 ? "Đang bắt kịp" : "Cần tăng tốc";

  const pastWeeks = weekStats.filter(w => w.isPast || w.isCurrent);
  const totalDoneInPast = pastWeeks.reduce((s, w) => s + w.done, 0);
  const velocity = pastWeeks.length > 0 ? (totalDoneInPast / pastWeeks.length).toFixed(1) : "0";
  const velocityNum = parseFloat(velocity);
  const weeksLeft = Math.max(0, 12 - currentWeek);
  const forecastDone = Math.min(allGoalTasks.length, doneTasks.length + Math.round(velocityNum * weeksLeft));
  const forecastPct = allGoalTasks.length > 0 ? Math.round((forecastDone / allGoalTasks.length) * 100) : 0;

  const pastWithTasks = weekStats.filter(w => (w.isPast || w.isCurrent) && w.total > 0);
  const bestWeek  = pastWithTasks.length > 0 ? pastWithTasks.reduce((b, w) => w.pct > b.pct ? w : b) : null;
  const worstWeek = pastWithTasks.length > 0 ? pastWithTasks.reduce((b, w) => w.pct < b.pct ? w : b) : null;

  // SVG chart
  const W = 560; const H = 160;
  const PAD = { t: 20, r: 12, b: 28, l: 36 };
  const chartW = W - PAD.l - PAD.r; const chartH = H - PAD.t - PAD.b;
  const maxTotal = Math.max(...weekStats.map(w => w.total), 1);
  const barW = chartW / 12 - 4;
  function barX(w: number) { return PAD.l + ((w - 1) / 12) * chartW + 2; }
  function doneH2(done: number, total: number) { return total > 0 ? (done / total) * Math.max(4, (total / maxTotal) * chartH) : 0; }

  return (
    <div className="space-y-4">
      {/* Goal selector tabs */}
      <div className="flex gap-2 flex-wrap">
        {plan.goals.map(goal => {
          const c = GOAL_COLORS[goal.color];
          const gT = plan.tasks.filter(t => t.goalId === goal.id && t.status !== "skipped");
          const gD = plan.tasks.filter(t => t.goalId === goal.id && t.status === "done");
          const p = gT.length > 0 ? Math.round((gD.length / gT.length) * 100) : 0;
          const isActive = goal.id === selectedGoalId;
          return (
            <button key={goal.id} onClick={() => setSelectedGoalId(goal.id)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: isActive ? c.bg : T.card, border: `1.5px solid ${isActive ? c.text : T.cardBorder}`, color: isActive ? c.text : T.textMuted }}>
              <div className="w-2 h-2 rounded-full" style={{ background: c.text }} />
              <span className="max-w-[120px] truncate">{goal.title}</span>
              <span className="font-black">{p}%</span>
            </button>
          );
        })}
      </div>

      {/* Goal header card */}
      <div className="rounded-2xl p-5" style={{ background: gc.bg, border: `1.5px solid ${gc.border}` }}>
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <ProgressRing pct={overallPct} size={72} stroke={6} color={gc.text} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-black" style={{ color: gc.text }}>{overallPct}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black mb-1" style={{ color: T.textPrimary }}>{selectedGoal.title}</h2>
            {selectedGoal.description && <p className="text-xs mb-2" style={{ color: T.textMuted }}>{selectedGoal.description}</p>}
            <div className="flex flex-wrap gap-2">
              {(selectedGoal as { targetMetric?: string }).targetMetric && (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background: `${gc.text}15`, color: gc.text }}>
                  🎯 Mục tiêu: {(selectedGoal as { targetMetric?: string }).targetMetric}
                </span>
              )}
              {(selectedGoal as { currentMetric?: string }).currentMetric && (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background: `${T.green}15`, color: T.green }}>
                  ✅ Hiện tại: {(selectedGoal as { currentMetric?: string }).currentMetric}
                </span>
              )}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-black" style={{ color: gapColor }}>{gap >= 0 ? "+" : ""}{gap}%</div>
            <div className="text-[10px] font-semibold" style={{ color: gapColor }}>{gapLabel}</div>
          </div>
        </div>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {([
          { icon: CheckCircle2, label: "Đã hoàn thành", value: String(doneTasks.length), sub: `${allGoalTasks.length} tổng việc`, color: T.green },
          { icon: Clock, label: "Còn lại", value: String(pendTasks.length), sub: `${weeksLeft} tuần còn lại`, color: T.gold },
          { icon: Zap, label: "Tốc độ TB", value: `${velocity}/tuần`, sub: "Việc hoàn thành", color: T.indigo },
          { icon: TrendingUp, label: "Dự báo cuối kỳ", value: `${forecastPct}%`, sub: `~${forecastDone}/${allGoalTasks.length} việc`, color: forecastPct >= 80 ? T.green : forecastPct >= 60 ? T.gold : T.red },
        ] as const).map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="rounded-xl p-3" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={13} style={{ color }} />
              <span className="text-[10px] font-semibold" style={{ color: T.textMuted }}>{label}</span>
            </div>
            <div className="text-xl font-black" style={{ color }}>{value}</div>
            <div className="text-[9px]" style={{ color: T.textMuted }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Weekly bar chart */}
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 size={14} style={{ color: gc.text }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Tiến độ từng tuần</span>
        </div>
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 280 }}>
            <defs>
              <linearGradient id="gGoalGradDash2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gc.text} stopOpacity="1"/>
                <stop offset="100%" stopColor={gc.text} stopOpacity="0.4"/>
              </linearGradient>
            </defs>
            {[0, 25, 50, 75, 100].map(y => {
              const yPos = PAD.t + (1 - y / 100) * chartH;
              return (
                <g key={y}>
                  <line x1={PAD.l} y1={yPos} x2={W - PAD.r} y2={yPos} stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray={y === 0 ? "0" : "3 3"} />
                  <text x={PAD.l - 4} y={yPos + 4} textAnchor="end" fontSize="8" fill="#9CA3AF">{y}%</text>
                </g>
              );
            })}
            {weekStats.map(({ week, total, done, pct, isCurrent, isPast }) => {
              const x = barX(week);
              const fullH2 = Math.max(4, (total / maxTotal) * chartH);
              const dH = doneH2(done, total);
              const bTop = PAD.t + chartH - fullH2;
              return (
                <g key={week}>
                  <rect x={x} y={bTop} width={barW} height={fullH2} rx="3" fill={isCurrent ? `${gc.text}20` : `${gc.text}10`} />
                  {dH > 0 && (
                    <rect x={x} y={bTop + fullH2 - dH} width={barW} height={dH} rx="3"
                      fill={isCurrent ? "url(#gGoalGradDash2)" : pct === 100 ? T.green : `${gc.text}80`} />
                  )}
                  {isCurrent && <circle cx={x + barW / 2} cy={bTop - 5} r={3} fill={T.gold} />}
                  {(isPast || isCurrent) && total > 0 && (
                    <text x={x + barW / 2} y={bTop - 8} textAnchor="middle" fontSize="8"
                      fill={pct === 100 ? T.green : isCurrent ? gc.text : T.textMuted} fontWeight="bold">{pct}%</text>
                  )}
                  <text x={x + barW / 2} y={H - PAD.b + 12} textAnchor="middle" fontSize="9"
                    fill={isCurrent ? gc.text : "#9CA3AF"} fontWeight={isCurrent ? "bold" : "normal"}>T{week}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Insights: best/worst/forecast */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl p-4" style={{ background: T.greenBg, border: `1px solid ${T.green}30` }}>
          <div className="flex items-center gap-2 mb-2">
            <Award size={14} style={{ color: T.green }} />
            <span className="text-xs font-bold" style={{ color: T.green }}>Tuần tốt nhất</span>
          </div>
          {bestWeek ? (
            <>
              <div className="text-2xl font-black" style={{ color: T.green }}>Tuần {bestWeek.week}</div>
              <div className="text-xs mt-1" style={{ color: T.textMuted }}>{bestWeek.pct}% — {bestWeek.done}/{bestWeek.total} việc</div>
            </>
          ) : <div className="text-xs" style={{ color: T.textMuted }}>Chưa có dữ liệu</div>}
        </div>
        <div className="rounded-xl p-4" style={{ background: T.redBg, border: `1px solid ${T.red}30` }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} style={{ color: T.red }} />
            <span className="text-xs font-bold" style={{ color: T.red }}>Cần cải thiện</span>
          </div>
          {worstWeek && worstWeek !== bestWeek ? (
            <>
              <div className="text-2xl font-black" style={{ color: T.red }}>Tuần {worstWeek.week}</div>
              <div className="text-xs mt-1" style={{ color: T.textMuted }}>{worstWeek.pct}% — {worstWeek.done}/{worstWeek.total} việc</div>
            </>
          ) : <div className="text-xs" style={{ color: T.textMuted }}>Chưa có dữ liệu</div>}
        </div>
        <div className="rounded-xl p-4" style={{ background: forecastPct >= 80 ? T.greenBg : forecastPct >= 60 ? T.goldBg : T.redBg, border: `1px solid ${forecastPct >= 80 ? T.green : forecastPct >= 60 ? T.gold : T.red}30` }}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} style={{ color: forecastPct >= 80 ? T.green : forecastPct >= 60 ? T.gold : T.red }} />
            <span className="text-xs font-bold" style={{ color: forecastPct >= 80 ? T.green : forecastPct >= 60 ? T.gold : T.red }}>Dự báo cuối kỳ</span>
          </div>
          <div className="text-2xl font-black" style={{ color: forecastPct >= 80 ? T.green : forecastPct >= 60 ? T.gold : T.red }}>{forecastPct}%</div>
          <div className="text-xs mt-1" style={{ color: T.textMuted }}>
            {forecastPct >= 100 ? "🎉 Sẽ hoàn thành!" : forecastPct >= 80 ? "✅ Đúng hướng" : forecastPct >= 60 ? "⚡ Cần tăng tốc" : "🚨 Nguy cơ không đạt"}
          </div>
        </div>
      </div>

      {/* Task list with toggle button */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <button
          onClick={() => setShowTaskList(v => !v)}
          className="w-full px-5 py-3 flex items-center gap-2 transition-colors"
          style={{ borderBottom: showTaskList ? `1px solid ${T.cardBorder}` : "none", background: gc.bg }}>
          <List size={14} style={{ color: gc.text }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Danh sách công việc chi tiết</span>
          <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${gc.text}15`, color: gc.text }}>
            {doneTasks.length}/{allGoalTasks.length + skipTasks.length} việc
          </span>
          <div className="ml-auto flex items-center gap-1.5 text-xs font-semibold" style={{ color: gc.text }}>
            {showTaskList ? (
              <><ChevronUp size={14} /> Ẩn đi</>
            ) : (
              <><ChevronDown size={14} /> Xem chi tiết</>
            )}
          </div>
        </button>

        {showTaskList && (
          <div>
            {weekStats.filter(w => w.allTasks.length > 0).map(({ week, done, total, pct, isCurrent, isPast, allTasks }) => {
              const { start, end } = getWeekRange(plan.startDate, week);
              const rowBg = pct === 100 ? T.greenBg : isCurrent ? `${gc.text}06` : isPast && total > 0 && pct < 50 ? `${T.red}04` : "transparent";
              return (
                <div key={week} style={{ borderTop: `1px solid ${T.divider}` }}>
                  <div className="px-5 py-2.5 flex items-center gap-3" style={{ background: rowBg, borderBottom: `1px solid ${T.divider}` }}>
                    <div className="flex items-center gap-2">
                      {isCurrent && <div className="w-2 h-2 rounded-full" style={{ background: T.gold }} />}
                      <span className="text-xs font-black" style={{ color: isCurrent ? gc.text : T.textPrimary }}>Tuần {week}</span>
                      {isCurrent && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: T.goldBg, color: T.gold }}>Hiện tại</span>}
                    </div>
                    <span className="text-[10px]" style={{ color: T.textMuted }}>{fmtDate(start.toISOString())} – {fmtDate(end.toISOString())}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[10px]" style={{ color: T.textMuted }}>{done}/{total}</span>
                      <div className="w-14 h-1.5 rounded-full overflow-hidden" style={{ background: `${gc.text}15` }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? T.green : gc.text }} />
                      </div>
                      <span className="text-[10px] font-bold" style={{ color: pct === 100 ? T.green : isCurrent ? gc.text : T.textMuted }}>{pct}%</span>
                    </div>
                  </div>
                  {allTasks.map(task => {
                    const sc = STATUS_CONFIG_W[task.status as keyof typeof STATUS_CONFIG_W] ?? STATUS_CONFIG_W.pending;
                    const Icon = sc.icon;
                    return (
                      <div key={task.id} className="px-5 py-2 flex items-start gap-3" style={{ background: rowBg }}>
                        <Icon size={13} style={{ color: sc.color, marginTop: 2, flexShrink: 0 }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs" style={{ color: task.status === "done" ? T.textMuted : T.textPrimary, textDecoration: task.status === "done" ? "line-through" : "none" }}>{task.title}</span>
                        </div>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: `${sc.color}15`, color: sc.color }}>{sc.label}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {weekStats.every(w => w.allTasks.length === 0) && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm" style={{ color: T.textMuted }}>Chưa có công việc nào cho mục tiêu này</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
