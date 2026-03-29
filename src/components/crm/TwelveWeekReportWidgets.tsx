"use client";
/**
 * TwelveWeekReportWidgets
 * Shared report components dùng chung giữa TwelveWeekPlanClient và Dashboard.
 * Export chính: <TwelveWeekReportDashboard plan={plan} />
 */

import React, { useState } from "react";
import {
  Star, Eye, Award, BarChart2, TrendingUp, Zap, Target,
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

// ── Helpers ───────────────────────────────────────────────────────────────────
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
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={14} style={{ color: T.indigo }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Heatmap tiến độ — 12 tuần × mục tiêu</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[9px]" style={{ color: T.textMuted }}>0%</span>
            {[10, 30, 50, 70, 100].map(v => (
              <div key={v} className="w-3 h-3 rounded-sm"
                style={{ background: v <= 10 ? "#FEF2F2" : v <= 30 ? "#FEF3C7" : v <= 60 ? "#FDE68A" : v <= 80 ? "#86EFAC" : "#059669" }} />
            ))}
            <span className="text-[9px]" style={{ color: T.textMuted }}>100%</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]" style={{ minWidth: 400 }}>
            <thead>
              <tr>
                <th className="text-left pr-3 pb-2 font-semibold" style={{ color: T.textMuted, width: 120 }}>Mục tiêu</th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i} className="text-center pb-2 font-semibold"
                    style={{ color: i + 1 === currentWeek ? T.indigo : T.textMuted, width: 32 }}>
                    T{i + 1}
                  </th>
                ))}
                <th className="text-center pb-2 pl-2 font-semibold" style={{ color: T.textMuted }}>Tổng</th>
              </tr>
            </thead>
            <tbody>
              {goalStats.map(({ goal, weeklyPcts, pct }) => {
                const gc = GOAL_COLORS[goal.color];
                return (
                  <tr key={goal.id}>
                    <td className="pr-3 py-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: gc.text }} />
                        <span className="truncate font-medium" style={{ color: T.textPrimary, maxWidth: 100 }}>{goal.title}</span>
                      </div>
                    </td>
                    {weeklyPcts.map((p, wi) => {
                      const isCur = wi + 1 === currentWeek;
                      const cellBg = p < 0 ? "#F9FAFB"
                        : p === 0   ? "#FEF2F2"
                        : p <= 30   ? "#FEF3C7"
                        : p <= 60   ? "#FDE68A"
                        : p <= 80   ? "#86EFAC"
                        : "#059669";
                      const textColor = p >= 80 ? "#fff" : p >= 60 ? "#065F46" : p >= 30 ? "#92400E" : p >= 0 ? "#991B1B" : T.textMuted;
                      return (
                        <td key={wi} className="text-center py-1">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center mx-auto font-bold transition-all"
                            style={{
                              background: cellBg,
                              color: p < 0 ? T.textMuted : textColor,
                              border: isCur ? `1.5px solid ${T.indigo}` : "1px solid transparent",
                              fontSize: 9,
                            }}>
                            {p < 0 ? "–" : `${p}%`}
                          </div>
                        </td>
                      );
                    })}
                    <td className="text-center py-1 pl-2">
                      <span className="text-xs font-black" style={{ color: gc.text }}>{pct}%</span>
                    </td>
                  </tr>
                );
              })}
              {/* Overall row */}
              <tr style={{ borderTop: `2px solid ${T.cardBorder}` }}>
                <td className="pr-3 py-1.5">
                  <span className="text-[10px] font-black" style={{ color: T.textPrimary }}>Tổng hợp</span>
                </td>
                {Array.from({ length: 12 }, (_, wi) => {
                  const weekAllActive = plan.tasks.filter(t => t.weekNumber === wi + 1 && t.status !== "skipped");
                  const weekAllDone   = plan.tasks.filter(t => t.weekNumber === wi + 1 && t.status === "done");
                  const wp = weekAllActive.length > 0 ? Math.round((weekAllDone.length / weekAllActive.length) * 100) : -1;
                  const isCur = wi + 1 === currentWeek;
                  const cellBg = wp < 0 ? "#F9FAFB" : wp === 0 ? "#FEF2F2" : wp <= 30 ? "#FEF3C7" : wp <= 60 ? "#FDE68A" : wp <= 80 ? "#86EFAC" : "#059669";
                  const textColor = wp >= 80 ? "#fff" : wp >= 60 ? "#065F46" : wp >= 30 ? "#92400E" : wp >= 0 ? "#991B1B" : T.textMuted;
                  return (
                    <td key={wi} className="text-center py-1.5">
                      <div className="w-7 h-7 rounded-md flex items-center justify-center mx-auto font-black"
                        style={{ background: cellBg, color: wp < 0 ? T.textMuted : textColor, border: isCur ? `1.5px solid ${T.indigo}` : "1px solid transparent", fontSize: 9 }}>
                        {wp < 0 ? "–" : `${wp}%`}
                      </div>
                    </td>
                  );
                })}
                <td className="text-center py-1.5 pl-2">
                  <span className="text-xs font-black" style={{ color: T.indigo }}>{overallPct}%</span>
                </td>
              </tr>
            </tbody>
          </table>
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
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} style={{ color: T.gold }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Nhận xét & Khuyến nghị tự động</span>
        </div>
        <div className="space-y-2">
          {insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: insightBg[ins.type], border: `1px solid ${insightColors[ins.type]}20` }}>
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: insightColors[ins.type] }} />
              <p className="text-xs leading-relaxed" style={{ color: T.textPrimary }}>{ins.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
