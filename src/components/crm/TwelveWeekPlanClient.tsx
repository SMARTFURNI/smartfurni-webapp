"use client";
/**
 * 12 Week Year Plan — Client Component
 * Phương pháp "The 12 Week Year" của Brian P. Moran
 *
 * Features:
 * - Tạo / chỉnh sửa kế hoạch 12 tuần với vision
 * - Thêm / sửa / xóa mục tiêu (Goals) với màu sắc
 * - Thêm / sửa / xóa công việc (Tasks) cho từng tuần
 * - Xem theo 3 chế độ: Timeline (12 tuần), Tuần hiện tại, Mục tiêu
 * - Báo cáo tiến độ trực quan
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, ChevronDown, ChevronUp, Check, X, Edit3, Trash2,
  Target, Calendar, TrendingUp, CheckCircle2, Circle, SkipForward,
  Flag, Zap, Award, BarChart2, Eye, List, Clock, ChevronRight,
  Crosshair, Star, AlertCircle, RefreshCw, Save,
} from "lucide-react";
import type { TwelveWeekPlan, Goal, WeeklyTask, GoalColor, TaskStatus } from "@/lib/twelve-week-plan-store";

// ── Theme ────────────────────────────────────────────────────────────────────
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

const STATUS_CONFIG: Record<TaskStatus, { icon: React.ElementType; color: string; label: string }> = {
  pending:  { icon: Circle,       color: T.textMuted, label: "Chưa làm" },
  done:     { icon: CheckCircle2, color: T.green,     label: "Hoàn thành" },
  skipped:  { icon: SkipForward,  color: T.gold,      label: "Bỏ qua" },
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
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

// ── Sub-components ────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 48, stroke = 4, color }: { pct: number; size?: number; stroke?: number; color: string }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}20`} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
    </svg>
  );
}

function InlineEdit({ value, onSave, placeholder, multiline, className, style }: {
  value: string; onSave: (v: string) => void; placeholder?: string;
  multiline?: boolean; className?: string; style?: React.CSSProperties;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => { setVal(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const save = () => { setEditing(false); if (val.trim() !== value) onSave(val.trim() || value); };

  if (!editing) {
    return (
      <span className={className} style={{ ...style, cursor: "text" }}
        onClick={() => setEditing(true)} title="Nhấn để chỉnh sửa">
        {value || <span style={{ color: T.textMuted, fontStyle: "italic" }}>{placeholder}</span>}
      </span>
    );
  }
  const props = {
    ref, value: val,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setVal(e.target.value),
    onBlur: save,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !multiline) save();
      if (e.key === "Escape") { setVal(value); setEditing(false); }
    },
    className: `border rounded px-2 py-1 text-sm outline-none w-full ${className || ""}`,
    style: { borderColor: T.indigo, ...style },
    placeholder,
  };
  return multiline
    ? <textarea {...props} rows={3} style={{ ...props.style, resize: "vertical" }} />
    : <input {...props} />;
}

// ── Task Row ──────────────────────────────────────────────────────────────────
function TaskRow({ task, goal, onUpdate, onDelete }: {
  task: WeeklyTask; goal: Goal;
  onUpdate: (taskId: string, data: Partial<WeeklyTask>) => void;
  onDelete: (taskId: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const gc = GOAL_COLORS[goal.color];
  const sc = STATUS_CONFIG[task.status];
  const StatusIcon = sc.icon;

  const cycleStatus = () => {
    const next: Record<TaskStatus, TaskStatus> = { pending: "done", done: "skipped", skipped: "pending" };
    onUpdate(task.id, { status: next[task.status] });
  };

  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl group transition-all hover:bg-gray-50"
      style={{ borderLeft: `3px solid ${gc.border}` }}>
      {/* Status toggle */}
      <button onClick={cycleStatus}
        className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110"
        style={{ background: task.status === "done" ? T.green : task.status === "skipped" ? `${T.gold}20` : `${T.textMuted}15` }}
        title={`Trạng thái: ${sc.label} — Nhấn để chuyển`}>
        <StatusIcon size={11} style={{ color: task.status === "done" ? "#fff" : sc.color }} />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <InlineEdit
          value={task.title}
          onSave={(v) => onUpdate(task.id, { title: v })}
          placeholder="Tên công việc..."
          className={`text-sm font-medium ${task.status === "done" ? "line-through opacity-60" : ""}`}
          style={{ color: T.textPrimary }}
        />
        {task.dueDate && (
          <div className="flex items-center gap-1 mt-0.5">
            <Clock size={9} style={{ color: T.textMuted }} />
            <span className="text-[10px]" style={{ color: T.textMuted }}>{fmtDateFull(task.dueDate)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button onClick={() => onDelete(task.id)}
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-50 transition-colors"
          title="Xóa">
          <Trash2 size={11} style={{ color: T.red }} />
        </button>
      </div>
    </div>
  );
}

// ── Goal Card ─────────────────────────────────────────────────────────────────
function GoalCard({ goal, tasks, planStartDate, onUpdateGoal, onDeleteGoal, onAddTask, onUpdateTask, onDeleteTask, expandedWeeks }: {
  goal: Goal; tasks: WeeklyTask[]; planStartDate: string;
  onUpdateGoal: (goalId: string, data: Partial<Goal>) => void;
  onDeleteGoal: (goalId: string) => void;
  onAddTask: (goalId: string, weekNumber: number) => void;
  onUpdateTask: (taskId: string, data: Partial<WeeklyTask>) => void;
  onDeleteTask: (taskId: string) => void;
  expandedWeeks: Set<number>;
}) {
  const gc = GOAL_COLORS[goal.color];
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.filter((t) => t.status !== "skipped").length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${gc.border}`, boxShadow: T.cardShadow }}>
      {/* Goal header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: gc.bg, borderBottom: `1px solid ${gc.border}` }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: gc.text + "20" }}>
          <Target size={15} style={{ color: gc.text }} />
        </div>
        <div className="flex-1 min-w-0">
          <InlineEdit
            value={goal.title}
            onSave={(v) => onUpdateGoal(goal.id, { title: v })}
            placeholder="Tên mục tiêu..."
            className="text-sm font-bold"
            style={{ color: gc.text }}
          />
          {goal.targetMetric && (
            <div className="flex items-center gap-1 mt-0.5">
              <TrendingUp size={9} style={{ color: gc.text }} />
              <InlineEdit
                value={goal.targetMetric}
                onSave={(v) => onUpdateGoal(goal.id, { targetMetric: v })}
                placeholder="Chỉ số mục tiêu..."
                className="text-[10px]"
                style={{ color: gc.text + "cc" }}
              />
            </div>
          )}
        </div>
        {/* Progress */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <div className="text-lg font-black" style={{ color: gc.text }}>{pct}%</div>
            <div className="text-[9px]" style={{ color: gc.text + "99" }}>{doneTasks}/{totalTasks} việc</div>
          </div>
          <ProgressRing pct={pct} size={40} stroke={3} color={gc.text} />
        </div>
        {/* Color picker */}
        <div className="flex gap-1 flex-shrink-0">
          {(Object.keys(GOAL_COLORS) as GoalColor[]).map((c) => (
            <button key={c} onClick={() => onUpdateGoal(goal.id, { color: c })}
              className="w-4 h-4 rounded-full transition-transform hover:scale-125"
              style={{ background: GOAL_COLORS[c].text, outline: goal.color === c ? `2px solid ${GOAL_COLORS[c].text}` : "none", outlineOffset: 1 }} />
          ))}
        </div>
        <button onClick={() => onDeleteGoal(goal.id)}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors flex-shrink-0"
          title="Xóa mục tiêu">
          <Trash2 size={13} style={{ color: T.red }} />
        </button>
        <button onClick={() => setCollapsed(!collapsed)}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
          style={{ background: gc.text + "15" }}>
          {collapsed ? <ChevronDown size={13} style={{ color: gc.text }} /> : <ChevronUp size={13} style={{ color: gc.text }} />}
        </button>
      </div>

      {/* Weeks */}
      {!collapsed && (
        <div className="divide-y" style={{ borderColor: T.divider }}>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((week) => {
            const weekTasks = tasks.filter((t) => t.weekNumber === week);
            const { start, end } = getWeekRange(planStartDate, week);
            const isCurrentWeek = getCurrentWeek(planStartDate) === week;
            const doneCnt = weekTasks.filter((t) => t.status === "done").length;
            const totalCnt = weekTasks.filter((t) => t.status !== "skipped").length;
            const weekPct = totalCnt > 0 ? Math.round((doneCnt / totalCnt) * 100) : 0;
            const isExpanded = expandedWeeks.has(week);

            return (
              <div key={week}>
                <div className="px-4 py-2 flex items-center gap-2 cursor-default"
                  style={{ background: isCurrentWeek ? `${gc.bg}` : "transparent" }}>
                  {/* Week badge */}
                  <div className="w-14 flex-shrink-0">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                      style={{
                        background: isCurrentWeek ? gc.text : `${T.textMuted}15`,
                        color: isCurrentWeek ? "#fff" : T.textMuted,
                      }}>
                      T{week}{isCurrentWeek ? " ★" : ""}
                    </span>
                  </div>
                  {/* Date range */}
                  <span className="text-[10px] flex-shrink-0" style={{ color: T.textMuted }}>
                    {fmtDate(start.toISOString())} – {fmtDate(end.toISOString())}
                  </span>
                  {/* Mini progress */}
                  {totalCnt > 0 && (
                    <div className="flex-1 flex items-center gap-1.5">
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: `${gc.text}15` }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${weekPct}%`, background: gc.text }} />
                      </div>
                      <span className="text-[9px] font-bold flex-shrink-0" style={{ color: gc.text }}>{doneCnt}/{totalCnt}</span>
                    </div>
                  )}
                  {/* Add task */}
                  <button onClick={() => onAddTask(goal.id, week)}
                    className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors hover:opacity-80"
                    style={{ background: gc.text + "15" }}
                    title="Thêm việc">
                    <Plus size={11} style={{ color: gc.text }} />
                  </button>
                </div>
                {/* Tasks */}
                {weekTasks.length > 0 && (
                  <div className="px-4 pb-2 space-y-1">
                    {weekTasks.map((task) => (
                      <TaskRow key={task.id} task={task} goal={goal}
                        onUpdate={onUpdateTask} onDelete={onDeleteTask} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Weekly View ───────────────────────────────────────────────────────────────
function WeeklyView({ plan, onUpdateTask }: {
  plan: TwelveWeekPlan;
  onUpdateTask: (taskId: string, data: Partial<WeeklyTask>) => void;
}) {
  const currentWeek = getCurrentWeek(plan.startDate);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const weekTasks = plan.tasks.filter((t) => t.weekNumber === selectedWeek);
  const { start, end } = getWeekRange(plan.startDate, selectedWeek);

  const tasksByGoal = plan.goals.map((g) => ({
    goal: g,
    tasks: weekTasks.filter((t) => t.goalId === g.id),
  })).filter((x) => x.tasks.length > 0);

  const doneCnt = weekTasks.filter((t) => t.status === "done").length;
  const totalCnt = weekTasks.filter((t) => t.status !== "skipped").length;
  const pct = totalCnt > 0 ? Math.round((doneCnt / totalCnt) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Week selector */}
      <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={15} style={{ color: T.indigo }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Chọn tuần</span>
          <span className="ml-auto text-xs" style={{ color: T.textMuted }}>
            {fmtDateFull(start.toISOString())} – {fmtDateFull(end.toISOString())}
          </span>
        </div>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
            const wTasks = plan.tasks.filter((t) => t.weekNumber === w && t.status !== "skipped");
            const wDone = plan.tasks.filter((t) => t.weekNumber === w && t.status === "done");
            const wPct = wTasks.length > 0 ? Math.round((wDone.length / wTasks.length) * 100) : 0;
            const isCurrent = w === currentWeek;
            const isSelected = w === selectedWeek;
            return (
              <button key={w} onClick={() => setSelectedWeek(w)}
                className="rounded-xl p-2 flex flex-col items-center gap-1 transition-all hover:scale-105"
                style={{
                  background: isSelected ? T.indigo : isCurrent ? T.indigoBg : `${T.textMuted}08`,
                  border: `1px solid ${isSelected ? T.indigo : isCurrent ? T.indigoLight : T.cardBorder}`,
                }}>
                <span className="text-[10px] font-black" style={{ color: isSelected ? "#fff" : isCurrent ? T.indigo : T.textMuted }}>T{w}</span>
                {wTasks.length > 0 && (
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: isSelected ? "rgba(255,255,255,0.3)" : `${T.indigo}20` }}>
                    <div className="h-full rounded-full" style={{ width: `${wPct}%`, background: isSelected ? "#fff" : T.indigo }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Week summary */}
      <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <ProgressRing pct={pct} size={52} stroke={4} color={T.indigo} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black" style={{ color: T.indigo }}>{pct}%</span>
            </div>
          </div>
          <div>
            <h3 className="text-base font-bold" style={{ color: T.textPrimary }}>
              Tuần {selectedWeek}{selectedWeek === currentWeek ? " (Hiện tại)" : ""}
            </h3>
            <p className="text-xs" style={{ color: T.textMuted }}>{doneCnt}/{totalCnt} công việc hoàn thành</p>
          </div>
        </div>
        {totalCnt === 0 && (
          <div className="text-center py-4" style={{ color: T.textMuted }}>
            <Calendar size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Chưa có công việc cho tuần này</p>
            <p className="text-xs mt-1">Thêm từ tab Mục tiêu</p>
          </div>
        )}
      </div>

      {/* Tasks by goal */}
      {tasksByGoal.map(({ goal, tasks }) => {
        const gc = GOAL_COLORS[goal.color];
        return (
          <div key={goal.id} className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${gc.border}`, boxShadow: T.cardShadow }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: gc.bg }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: gc.text + "20" }}>
                <Target size={12} style={{ color: gc.text }} />
              </div>
              <span className="text-sm font-bold" style={{ color: gc.text }}>{goal.title}</span>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: gc.text + "20", color: gc.text }}>
                {tasks.filter((t) => t.status === "done").length}/{tasks.filter((t) => t.status !== "skipped").length} xong
              </span>
            </div>
            <div className="p-3 space-y-1">
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} goal={goal}
                  onUpdate={onUpdateTask} onDelete={() => {}} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Comparison Chart: Thực tế vs Mục tiêu ────────────────────────────────────
function ComparisonChart({ plan }: { plan: TwelveWeekPlan }) {
  const currentWeek = getCurrentWeek(plan.startDate);
  const totalTasks = plan.tasks.filter((t) => t.status !== "skipped").length;

  // Build cumulative data for each week
  const weeklyData = Array.from({ length: 12 }, (_, i) => {
    const w = i + 1;
    // Ideal pace: linear from 0% to 100% over 12 weeks
    const idealPct = Math.round((w / 12) * 100);
    // Actual: cumulative done up to this week (only for past/current weeks)
    const doneSoFar = plan.tasks.filter(
      (t) => t.weekNumber <= w && t.status === "done"
    ).length;
    const actualPct = w <= currentWeek && totalTasks > 0
      ? Math.round((doneSoFar / totalTasks) * 100)
      : null;
    return { week: w, idealPct, actualPct, isCurrent: w === currentWeek, isFuture: w > currentWeek };
  });

  // Per-goal comparison
  const goalData = plan.goals.map((goal) => {
    const gc = GOAL_COLORS[goal.color];
    const gTasks = plan.tasks.filter((t) => t.goalId === goal.id && t.status !== "skipped");
    const gDone = plan.tasks.filter((t) => t.goalId === goal.id && t.status === "done");
    const gPct = gTasks.length > 0 ? Math.round((gDone.length / gTasks.length) * 100) : 0;
    // Ideal for this goal at current week
    const idealAtNow = Math.round((currentWeek / 12) * 100);
    const gap = gPct - idealAtNow;
    return { goal, gc, gPct, idealAtNow, gap, gTasks: gTasks.length, gDone: gDone.length };
  });

  // SVG chart dimensions
  const W = 560; const H = 200; const PAD = { t: 16, r: 16, b: 32, l: 40 };
  const chartW = W - PAD.l - PAD.r;
  const chartH = H - PAD.t - PAD.b;

  // Build SVG path points
  function toX(w: number) { return PAD.l + ((w - 1) / 11) * chartW; }
  function toY(pct: number) { return PAD.t + (1 - pct / 100) * chartH; }

  // Ideal line points
  const idealPoints = weeklyData.map(d => `${toX(d.week)},${toY(d.idealPct)}`).join(" ");

  // Actual line points (only up to currentWeek)
  const actualPoints = weeklyData
    .filter(d => d.actualPct !== null)
    .map(d => `${toX(d.week)},${toY(d.actualPct!)}`).join(" ");

  // Area fill under actual line
  const actualAreaPoints = weeklyData
    .filter(d => d.actualPct !== null)
    .map(d => `${toX(d.week)},${toY(d.actualPct!)}`)
    .join(" ");
  const firstActual = weeklyData.find(d => d.actualPct !== null);
  const lastActual = [...weeklyData].reverse().find(d => d.actualPct !== null);
  const actualArea = firstActual && lastActual
    ? `M${toX(firstActual.week)},${toY(0)} L${actualAreaPoints} L${toX(lastActual.week)},${toY(0)} Z`
    : "";

  // Y-axis labels
  const yLabels = [0, 25, 50, 75, 100];

  // Overall status
  const currentActual = weeklyData[currentWeek - 1]?.actualPct ?? 0;
  const currentIdeal = weeklyData[currentWeek - 1]?.idealPct ?? 0;
  const gap = currentActual - currentIdeal;
  const statusColor = gap >= 0 ? T.green : gap >= -15 ? T.gold : T.red;
  const statusLabel = gap >= 0 ? "Vượt mục tiêu" : gap >= -15 ? "Đang bắt kịp" : "Cần tăng tốc";

  return (
    <div className="space-y-4">
      {/* Header status cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Tiến độ thực tế", value: `${currentActual}%`, sub: `Tuần ${currentWeek}/12`, color: T.indigo },
          { label: "Mục tiêu lý tưởng", value: `${currentIdeal}%`, sub: "Pace đều 12 tuần", color: "#64748B" },
          { label: "Chênh lệch", value: `${gap >= 0 ? "+" : ""}${gap}%`, sub: statusLabel, color: statusColor },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl p-3 text-center"
            style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
            <div className="text-xl font-black" style={{ color }}>{value}</div>
            <div className="text-[10px] font-semibold mt-0.5" style={{ color: T.textPrimary }}>{label}</div>
            <div className="text-[9px]" style={{ color: T.textMuted }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Main SVG Chart */}
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} style={{ color: T.indigo }} />
            <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Tiến độ tích lũy: Thực tế vs Mục tiêu</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 rounded" style={{ background: T.indigo }} />
              <span className="text-[10px] font-medium" style={{ color: T.textMuted }}>Thực tế</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="24" height="2"><line x1="0" y1="1" x2="24" y2="1" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 3"/></svg>
              <span className="text-[10px] font-medium" style={{ color: T.textMuted }}>Mục tiêu</span>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 280 }}>
            <defs>
              <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.indigo} stopOpacity="0.15"/>
                <stop offset="100%" stopColor={T.indigo} stopOpacity="0.01"/>
              </linearGradient>
              <linearGradient id="idealGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.08"/>
                <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.01"/>
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {yLabels.map(y => (
              <g key={y}>
                <line x1={PAD.l} y1={toY(y)} x2={W - PAD.r} y2={toY(y)}
                  stroke="#E5E7EB" strokeWidth="0.5" strokeDasharray={y === 0 ? "0" : "3 3"} />
                <text x={PAD.l - 6} y={toY(y) + 4} textAnchor="end"
                  fontSize="9" fill="#9CA3AF">{y}%</text>
              </g>
            ))}

            {/* Current week vertical line */}
            <line x1={toX(currentWeek)} y1={PAD.t} x2={toX(currentWeek)} y2={H - PAD.b}
              stroke={T.gold} strokeWidth="1" strokeDasharray="4 3" opacity="0.6" />
            <text x={toX(currentWeek)} y={PAD.t - 4} textAnchor="middle"
              fontSize="8" fill={T.gold} fontWeight="bold">T{currentWeek}</text>

            {/* Ideal area fill */}
            <path d={`M${toX(1)},${toY(0)} L${idealPoints} L${toX(12)},${toY(0)} Z`}
              fill="url(#idealGrad)" />

            {/* Ideal line (dashed) */}
            <polyline points={idealPoints} fill="none"
              stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="5 4" />

            {/* Actual area fill */}
            {actualArea && <path d={actualArea} fill="url(#actualGrad)" />}

            {/* Actual line */}
            {actualPoints && (
              <polyline points={actualPoints} fill="none"
                stroke={T.indigo} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            )}

            {/* Data points on actual line */}
            {weeklyData.filter(d => d.actualPct !== null).map(d => (
              <g key={d.week}>
                <circle cx={toX(d.week)} cy={toY(d.actualPct!)} r={d.isCurrent ? 5 : 3.5}
                  fill={d.isCurrent ? T.indigo : T.card} stroke={T.indigo}
                  strokeWidth={d.isCurrent ? 0 : 2} />
                {d.isCurrent && (
                  <circle cx={toX(d.week)} cy={toY(d.actualPct!)} r={8}
                    fill="none" stroke={T.indigo} strokeWidth="1" opacity="0.3" />
                )}
              </g>
            ))}

            {/* Gap annotation at current week */}
            {gap !== 0 && (
              <g>
                <line x1={toX(currentWeek) + 8} y1={toY(currentIdeal)}
                  x2={toX(currentWeek) + 8} y2={toY(currentActual)}
                  stroke={statusColor} strokeWidth="1.5" />
                <text x={toX(currentWeek) + 12} y={(toY(currentIdeal) + toY(currentActual)) / 2 + 4}
                  fontSize="9" fill={statusColor} fontWeight="bold">
                  {gap >= 0 ? "+" : ""}{gap}%
                </text>
              </g>
            )}

            {/* X-axis labels */}
            {weeklyData.map(d => (
              <text key={d.week} x={toX(d.week)} y={H - PAD.b + 14}
                textAnchor="middle" fontSize="9"
                fill={d.isCurrent ? T.indigo : "#9CA3AF"}
                fontWeight={d.isCurrent ? "bold" : "normal"}>
                T{d.week}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* Per-goal comparison bars */}
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-2 mb-4">
          <Target size={15} style={{ color: T.indigo }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>So sánh từng mục tiêu</span>
          <span className="ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: `${T.indigo}10`, color: T.indigo }}>
            Mục tiêu lý tưởng: {currentIdeal}%
          </span>
        </div>
        <div className="space-y-4">
          {goalData.map(({ goal, gc, gPct, idealAtNow, gap: gGap, gTasks, gDone }) => {
            const gStatusColor = gGap >= 0 ? T.green : gGap >= -15 ? T.gold : T.red;
            return (
              <div key={goal.id}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: gc.text }} />
                  <span className="text-xs font-semibold flex-1 truncate" style={{ color: T.textPrimary }}>{goal.title}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${gStatusColor}15`, color: gStatusColor }}>
                    {gGap >= 0 ? "+" : ""}{gGap}%
                  </span>
                  <span className="text-xs font-black" style={{ color: gc.text }}>{gPct}%</span>
                </div>
                {/* Stacked bar: actual vs ideal */}
                <div className="relative h-5 rounded-full overflow-hidden" style={{ background: `${gc.text}10` }}>
                  {/* Ideal marker */}
                  <div className="absolute top-0 bottom-0 w-0.5 z-10"
                    style={{ left: `${idealAtNow}%`, background: "#94A3B8" }} />
                  {/* Actual bar */}
                  <div className="h-full rounded-full transition-all duration-700 relative"
                    style={{ width: `${gPct}%`, background: `linear-gradient(90deg, ${gc.text}80, ${gc.text})` }}>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-black text-white">
                      {gPct}%
                    </div>
                  </div>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px]" style={{ color: T.textMuted }}>{gDone}/{gTasks} việc hoàn thành</span>
                  <span className="text-[9px]" style={{ color: "#94A3B8" }}>Mục tiêu: {idealAtNow}%</span>
                </div>
              </div>
            );
          })}
          {goalData.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: T.textMuted }}>Chưa có mục tiêu nào</p>
          )}
        </div>
      </div>

      {/* Weekly detail table */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.cardBorder}` }}>
          <BarChart2 size={15} style={{ color: T.indigo }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Chi tiết từng tuần</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: T.bg }}>
                <th className="px-4 py-2 text-left font-semibold" style={{ color: T.textMuted }}>Tuần</th>
                <th className="px-4 py-2 text-left font-semibold" style={{ color: T.textMuted }}>Thời gian</th>
                <th className="px-4 py-2 text-center font-semibold" style={{ color: T.textMuted }}>Mục tiêu</th>
                <th className="px-4 py-2 text-center font-semibold" style={{ color: T.textMuted }}>Thực tế</th>
                <th className="px-4 py-2 text-center font-semibold" style={{ color: T.textMuted }}>Chênh lệch</th>
                <th className="px-4 py-2 text-center font-semibold" style={{ color: T.textMuted }}>Việc xong</th>
              </tr>
            </thead>
            <tbody>
              {weeklyData.map((d) => {
                const { start, end } = getWeekRange(plan.startDate, d.week);
                const wTasks = plan.tasks.filter(t => t.weekNumber === d.week && t.status !== "skipped");
                const wDone = plan.tasks.filter(t => t.weekNumber === d.week && t.status === "done");
                const wGap = d.actualPct !== null ? d.actualPct - d.idealPct : null;
                const rowBg = d.isCurrent ? `${T.indigo}06` : "transparent";
                return (
                  <tr key={d.week} style={{ background: rowBg, borderTop: `1px solid ${T.divider}` }}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {d.isCurrent && <div className="w-1.5 h-1.5 rounded-full" style={{ background: T.gold }} />}
                        <span className="font-bold" style={{ color: d.isCurrent ? T.indigo : T.textPrimary }}>T{d.week}</span>
                        {d.isCurrent && <span className="text-[9px] font-semibold px-1 py-0.5 rounded" style={{ background: T.goldBg, color: T.gold }}>Hiện tại</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: T.textMuted }}>
                      {fmtDate(start.toISOString())} – {fmtDate(end.toISOString())}
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold" style={{ color: "#94A3B8" }}>{d.idealPct}%</td>
                    <td className="px-4 py-2.5 text-center font-bold" style={{ color: d.actualPct !== null ? T.indigo : T.textMuted }}>
                      {d.actualPct !== null ? `${d.actualPct}%` : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {wGap !== null ? (
                        <span className="font-bold text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: wGap >= 0 ? T.greenBg : wGap >= -15 ? T.goldBg : T.redBg, color: wGap >= 0 ? T.green : wGap >= -15 ? T.gold : T.red }}>
                          {wGap >= 0 ? "+" : ""}{wGap}%
                        </span>
                      ) : <span style={{ color: T.textMuted }}>—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center" style={{ color: T.textMuted }}>
                      {wTasks.length > 0 ? `${wDone.length}/${wTasks.length}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Goal Detail Report ────────────────────────────────────────────────────────
function GoalDetailReport({ plan }: { plan: TwelveWeekPlan }) {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(
    plan.goals.length > 0 ? plan.goals[0].id : null
  );
  const currentWeek = getCurrentWeek(plan.startDate);

  const selectedGoal = plan.goals.find(g => g.id === selectedGoalId) ?? plan.goals[0];
  if (!selectedGoal) return (
    <div className="rounded-2xl p-8 text-center" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
      <p style={{ color: T.textMuted }}>Chưa có mục tiêu nào trong kế hoạch</p>
    </div>
  );

  const gc = GOAL_COLORS[selectedGoal.color];

  // Build per-week stats for selected goal
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

  // Overall goal stats
  const allGoalTasks = plan.tasks.filter(t => t.goalId === selectedGoal.id && t.status !== "skipped");
  const doneTasks    = plan.tasks.filter(t => t.goalId === selectedGoal.id && t.status === "done");
  const skipTasks    = plan.tasks.filter(t => t.goalId === selectedGoal.id && t.status === "skipped");
  const pendTasks    = plan.tasks.filter(t => t.goalId === selectedGoal.id && t.status === "pending");
  const overallPct   = allGoalTasks.length > 0 ? Math.round((doneTasks.length / allGoalTasks.length) * 100) : 0;
  const idealPct     = Math.round((currentWeek / 12) * 100);
  const gap          = overallPct - idealPct;
  const gapColor     = gap >= 0 ? T.green : gap >= -15 ? T.gold : T.red;
  const gapLabel     = gap >= 0 ? "Vượt mục tiêu" : gap >= -15 ? "Đang bắt kịp" : "Cần tăng tốc";

  // Velocity
  const pastWeeks = weekStats.filter(w => w.isPast || w.isCurrent);
  const totalDoneInPast = pastWeeks.reduce((s, w) => s + w.done, 0);
  const velocity = pastWeeks.length > 0 ? (totalDoneInPast / pastWeeks.length).toFixed(1) : "0";
  const velocityNum = parseFloat(velocity);
  const weeksLeft = Math.max(0, 12 - currentWeek);
  const forecastDone = Math.min(allGoalTasks.length, doneTasks.length + Math.round(velocityNum * weeksLeft));
  const forecastPct = allGoalTasks.length > 0 ? Math.round((forecastDone / allGoalTasks.length) * 100) : 0;

  // Best / worst week
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
  function barTopY(total: number) { return PAD.t + chartH - Math.max(4, (total / maxTotal) * chartH); }
  function doneH(done: number, total: number) { return total > 0 ? (done / total) * Math.max(4, (total / maxTotal) * chartH) : 0; }

  return (
    <div className="space-y-4">
      {/* Goal selector */}
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

      {/* Goal header */}
      <div className="rounded-2xl p-5" style={{ background: `${gc.bg}`, border: `1.5px solid ${gc.border}` }}>
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
            <ProgressRing pct={overallPct} size={80} stroke={7} color={gc.text} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black" style={{ color: gc.text }}>{overallPct}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black mb-1" style={{ color: T.textPrimary }}>{selectedGoal.title}</h2>
            {selectedGoal.description && <p className="text-xs mb-2" style={{ color: T.textMuted }}>{selectedGoal.description}</p>}
            <div className="flex flex-wrap gap-2">
              {selectedGoal.targetMetric && (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background: `${gc.text}15`, color: gc.text }}>
                  🎯 Mục tiêu: {selectedGoal.targetMetric}
                </span>
              )}
              {selectedGoal.currentMetric && (
                <span className="text-[10px] font-semibold px-2 py-1 rounded-lg" style={{ background: `${T.green}15`, color: T.green }}>
                  ✅ Hiện tại: {selectedGoal.currentMetric}
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

      {/* KPI row */}
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
              <linearGradient id="gGoalGrad" x1="0" y1="0" x2="0" y2="1">
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
              const dH = doneH(done, total);
              const bTop = PAD.t + chartH - fullH2;
              return (
                <g key={week}>
                  <rect x={x} y={bTop} width={barW} height={fullH2} rx="3" fill={isCurrent ? `${gc.text}20` : `${gc.text}10`} />
                  {dH > 0 && (
                    <rect x={x} y={bTop + fullH2 - dH} width={barW} height={dH} rx="3"
                      fill={isCurrent ? "url(#gGoalGrad)" : pct === 100 ? T.green : `${gc.text}80`} />
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

      {/* Insights */}
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

      {/* Task list by week */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.cardBorder}`, background: gc.bg }}>
          <List size={14} style={{ color: gc.text }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Danh sách công việc chi tiết</span>
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${gc.text}15`, color: gc.text }}>
            {doneTasks.length}/{allGoalTasks.length + skipTasks.length} việc
          </span>
        </div>
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
                  const sc = STATUS_CONFIG[task.status];
                  const Icon = sc.icon;
                  return (
                    <div key={task.id} className="px-5 py-2 flex items-start gap-3" style={{ background: rowBg }}>
                      <Icon size={13} style={{ color: sc.color, marginTop: 2, flexShrink: 0 }} />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs" style={{ color: task.status === "done" ? T.textMuted : T.textPrimary, textDecoration: task.status === "done" ? "line-through" : "none" }}>{task.title}</span>
                        {task.description && <p className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>{task.description}</p>}
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
      </div>
    </div>
  );
}

// ── Progress Dashboard ────────────────────────────────────────────────────────
function ProgressView({ plan }: { plan: TwelveWeekPlan }) {
  const currentWeek = getCurrentWeek(plan.startDate);
  const totalTasks = plan.tasks.filter((t) => t.status !== "skipped").length;
  const doneTasks = plan.tasks.filter((t) => t.status === "done").length;
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Weekly completion bars
  const weeklyData = Array.from({ length: 12 }, (_, i) => {
    const w = i + 1;
    const wTasks = plan.tasks.filter((t) => t.weekNumber === w && t.status !== "skipped");
    const wDone = plan.tasks.filter((t) => t.weekNumber === w && t.status === "done");
    return { week: w, total: wTasks.length, done: wDone.length, pct: wTasks.length > 0 ? Math.round((wDone.length / wTasks.length) * 100) : 0 };
  });

  const maxBar = Math.max(...weeklyData.map((d) => d.total), 1);

  return (
    <div className="space-y-4">
      {/* Comparison Chart */}
      <ComparisonChart plan={plan} />

      {/* Overall */}
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <ProgressRing pct={overallPct} size={72} stroke={6} color={T.indigo} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black" style={{ color: T.indigo }}>{overallPct}%</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold" style={{ color: T.textPrimary }}>Tổng tiến độ</h3>
            <p className="text-sm" style={{ color: T.textMuted }}>{doneTasks}/{totalTasks} công việc hoàn thành</p>
            <p className="text-xs mt-1" style={{ color: T.textMuted }}>Tuần hiện tại: <span className="font-bold" style={{ color: T.indigo }}>Tuần {currentWeek}/12</span></p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-2xl font-black" style={{ color: T.gold }}>{12 - currentWeek + 1}</div>
            <div className="text-xs" style={{ color: T.textMuted }}>tuần còn lại</div>
          </div>
        </div>
        {/* Overall progress bar */}
        <div className="h-3 rounded-full overflow-hidden" style={{ background: `${T.indigo}15` }}>
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${overallPct}%`, background: `linear-gradient(90deg, ${T.indigo}, #818CF8)` }} />
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={15} style={{ color: T.indigo }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Tiến độ từng tuần</span>
        </div>
        <div className="flex items-end gap-1.5 h-32">
          {weeklyData.map(({ week, total, done, pct }) => {
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

      {/* Goal Detail Report */}
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-2 mb-4">
          <Flag size={15} style={{ color: T.indigo }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Báo cáo chi tiết từng mục tiêu</span>
        </div>
        <GoalDetailReport plan={plan} />
      </div>

      {/* Goals progress summary */}
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-2 mb-4">
          <Target size={15} style={{ color: T.indigo }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Tổng hợp tiến độ mục tiêu</span>
        </div>
        <div className="space-y-3">
          {plan.goals.map((goal) => {
            const gc = GOAL_COLORS[goal.color];
            const gTasks = plan.tasks.filter((t) => t.goalId === goal.id && t.status !== "skipped");
            const gDone = plan.tasks.filter((t) => t.goalId === goal.id && t.status === "done");
            const gPct = gTasks.length > 0 ? Math.round((gDone.length / gTasks.length) * 100) : 0;
            return (
              <div key={goal.id}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: gc.text }} />
                  <span className="text-xs font-semibold flex-1" style={{ color: T.textPrimary }}>{goal.title}</span>
                  {goal.targetMetric && (
                    <span className="text-[10px]" style={{ color: T.textMuted }}>{goal.targetMetric}</span>
                  )}
                  <span className="text-xs font-black" style={{ color: gc.text }}>{gPct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: `${gc.text}15` }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${gPct}%`, background: gc.text }} />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[9px]" style={{ color: T.textMuted }}>{gDone.length}/{gTasks.length} công việc</span>
                </div>
              </div>
            );
          })}
          {plan.goals.length === 0 && (
            <p className="text-sm text-center py-4" style={{ color: T.textMuted }}>Chưa có mục tiêu nào</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function TwelveWeekPlanClient() {
  const [plans, setPlans] = useState<TwelveWeekPlan[]>([]);
  const [activePlan, setActivePlan] = useState<TwelveWeekPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"goals" | "weekly" | "progress">("goals");
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [expandedWeeks] = useState<Set<number>>(new Set(Array.from({ length: 12 }, (_, i) => i + 1)));

  // New plan form
  const [newPlanForm, setNewPlanForm] = useState({
    title: "Kế hoạch 12 tuần",
    vision: "",
    startDate: new Date().toISOString().split("T")[0],
  });

  // ── API calls ──────────────────────────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/twelve-week-plan");
      if (res.ok) {
        const data = await res.json();
        setPlans(data);
        if (data.length > 0 && !activePlan) {
          setActivePlan(data.find((p: TwelveWeekPlan) => p.isActive) ?? data[0]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const apiPatch = useCallback(async (planId: string, action: string, data: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/crm/twelve-week-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, action, ...data }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActivePlan(updated);
        setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
    } finally {
      setSaving(false);
    }
  }, []);

  const createPlan = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/crm/twelve-week-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlanForm),
      });
      if (res.ok) {
        const plan = await res.json();
        setPlans((prev) => [plan, ...prev]);
        setActivePlan(plan);
        setShowNewPlanModal(false);
        setNewPlanForm({ title: "Kế hoạch 12 tuần", vision: "", startDate: new Date().toISOString().split("T")[0] });
      }
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm("Xóa kế hoạch này? Tất cả mục tiêu và công việc sẽ bị xóa.")) return;
    await fetch(`/api/crm/twelve-week-plan?id=${planId}`, { method: "DELETE" });
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    if (activePlan?.id === planId) setActivePlan(plans.find((p) => p.id !== planId) ?? null);
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleUpdatePlan = (data: Record<string, unknown>) => {
    if (!activePlan) return;
    apiPatch(activePlan.id, "update_plan", data);
  };

  const handleAddGoal = () => {
    if (!activePlan) return;
    const colors: GoalColor[] = ["indigo", "green", "gold", "red", "purple", "blue"];
    const color = colors[activePlan.goals.length % colors.length];
    apiPatch(activePlan.id, "add_goal", { title: "Mục tiêu mới", color });
  };

  const handleUpdateGoal = (goalId: string, data: Partial<Goal>) => {
    if (!activePlan) return;
    apiPatch(activePlan.id, "update_goal", { goalId, ...data });
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!activePlan || !confirm("Xóa mục tiêu này và tất cả công việc liên quan?")) return;
    apiPatch(activePlan.id, "delete_goal", { goalId });
  };

  const handleAddTask = (goalId: string, weekNumber: number) => {
    if (!activePlan) return;
    apiPatch(activePlan.id, "add_task", { goalId, weekNumber, title: "Công việc mới" });
  };

  const handleUpdateTask = (taskId: string, data: Partial<WeeklyTask>) => {
    if (!activePlan) return;
    apiPatch(activePlan.id, "update_task", { taskId, ...data });
  };

  const handleDeleteTask = (taskId: string) => {
    if (!activePlan) return;
    apiPatch(activePlan.id, "delete_task", { taskId });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin" style={{ color: T.indigo }} />
        <span className="ml-2 text-sm" style={{ color: T.textMuted }}>Đang tải...</span>
      </div>
    );
  }

  // No plans yet
  if (plans.length === 0 && !showNewPlanModal) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: T.indigoBg }}>
          <Crosshair size={36} style={{ color: T.indigo }} />
        </div>
        <h2 className="text-2xl font-black mb-2" style={{ color: T.textPrimary }}>Kế hoạch 12 Tuần</h2>
        <p className="text-sm text-center max-w-md mb-2" style={{ color: T.textMuted }}>
          Dựa trên phương pháp <strong>"The 12 Week Year"</strong> của Brian P. Moran — biến tầm nhìn dài hạn thành hành động cụ thể trong 12 tuần.
        </p>
        <div className="grid grid-cols-3 gap-3 my-6 w-full max-w-sm">
          {[
            { icon: Target, label: "Xác định mục tiêu", color: T.indigo },
            { icon: Calendar, label: "Lên kế hoạch tuần", color: T.green },
            { icon: TrendingUp, label: "Theo dõi tiến độ", color: T.gold },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
              <Icon size={20} className="mx-auto mb-1" style={{ color }} />
              <p className="text-[10px] font-semibold" style={{ color }}>{label}</p>
            </div>
          ))}
        </div>
        <button onClick={() => setShowNewPlanModal(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
          style={{ background: `linear-gradient(135deg, ${T.indigo}, #4338CA)` }}>
          <Plus size={16} /> Tạo kế hoạch đầu tiên
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          {activePlan ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: T.indigoBg }}>
                  <Crosshair size={16} style={{ color: T.indigo }} />
                </div>
                <InlineEdit
                  value={activePlan.title}
                  onSave={(v) => handleUpdatePlan({ title: v })}
                  className="text-xl font-black"
                  style={{ color: T.textPrimary }}
                />
                {saving && <RefreshCw size={12} className="animate-spin" style={{ color: T.textMuted }} />}
              </div>
              <div className="flex items-center gap-3 ml-10 flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar size={11} style={{ color: T.textMuted }} />
                  <span className="text-xs" style={{ color: T.textMuted }}>
                    {fmtDateFull(activePlan.startDate)} – {fmtDateFull(activePlan.endDate)}
                  </span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: T.indigoBg, color: T.indigo }}>
                  Tuần {getCurrentWeek(activePlan.startDate)}/12
                </span>
              </div>
              {/* Vision */}
              <div className="ml-10 mt-2 flex items-start gap-1.5">
                <Star size={11} style={{ color: T.gold }} className="mt-0.5 flex-shrink-0" />
                <InlineEdit
                  value={activePlan.vision}
                  onSave={(v) => handleUpdatePlan({ vision: v })}
                  placeholder="Tầm nhìn dài hạn của bạn... (nhấn để chỉnh sửa)"
                  multiline
                  className="text-xs italic"
                  style={{ color: T.textMuted }}
                />
              </div>
            </>
          ) : (
            <h1 className="text-xl font-black" style={{ color: T.textPrimary }}>Kế hoạch 12 Tuần</h1>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Plan selector */}
          {plans.length > 1 && (
            <select
              value={activePlan?.id ?? ""}
              onChange={(e) => setActivePlan(plans.find((p) => p.id === e.target.value) ?? null)}
              className="text-xs px-3 py-2 rounded-xl border outline-none"
              style={{ borderColor: T.cardBorder, color: T.textPrimary, background: T.card }}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          )}
          <button onClick={() => setShowNewPlanModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white"
            style={{ background: T.indigo }}>
            <Plus size={13} /> Tạo mới
          </button>
          {activePlan && (
            <button onClick={() => deletePlan(activePlan.id)}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-50 transition-colors"
              style={{ border: `1px solid ${T.cardBorder}` }}>
              <Trash2 size={13} style={{ color: T.red }} />
            </button>
          )}
        </div>
      </div>

      {activePlan && (
        <>
          {/* ── View tabs ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
            {([
              { id: "goals", label: "Mục tiêu", icon: Target },
              { id: "weekly", label: "Theo tuần", icon: Calendar },
              { id: "progress", label: "Báo cáo", icon: BarChart2 },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setView(id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: view === id ? T.indigo : "transparent",
                  color: view === id ? "#fff" : T.textMuted,
                }}>
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          {/* ── Add goal button (goals view) ──────────────────────────────── */}
          {view === "goals" && (
            <button onClick={handleAddGoal}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
              style={{ border: `2px dashed ${T.indigoLight}`, color: T.indigo, background: T.indigoBg }}>
              <Plus size={15} /> Thêm mục tiêu mới
            </button>
          )}

          {/* ── Content ───────────────────────────────────────────────────── */}
          {view === "goals" && (
            <div className="space-y-4">
              {activePlan.goals.length === 0 && (
                <div className="text-center py-12" style={{ color: T.textMuted }}>
                  <Target size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-semibold">Chưa có mục tiêu nào</p>
                  <p className="text-xs mt-1">Nhấn "Thêm mục tiêu mới" để bắt đầu</p>
                </div>
              )}
              {activePlan.goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  tasks={activePlan.tasks.filter((t) => t.goalId === goal.id)}
                  planStartDate={activePlan.startDate}
                  onUpdateGoal={handleUpdateGoal}
                  onDeleteGoal={handleDeleteGoal}
                  onAddTask={handleAddTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                  expandedWeeks={expandedWeeks}
                />
              ))}
            </div>
          )}

          {view === "weekly" && (
            <WeeklyView plan={activePlan} onUpdateTask={handleUpdateTask} />
          )}

          {view === "progress" && (
            <ProgressView plan={activePlan} />
          )}
        </>
      )}

      {/* ── New Plan Modal ─────────────────────────────────────────────────── */}
      {showNewPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: T.card }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: T.indigoBg }}>
                <Crosshair size={20} style={{ color: T.indigo }} />
              </div>
              <div>
                <h2 className="text-lg font-black" style={{ color: T.textPrimary }}>Tạo kế hoạch mới</h2>
                <p className="text-xs" style={{ color: T.textMuted }}>12 tuần = 1 "năm" theo phương pháp 12WY</p>
              </div>
              <button onClick={() => setShowNewPlanModal(false)} className="ml-auto">
                <X size={18} style={{ color: T.textMuted }} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: T.textSecondary }}>Tên kế hoạch</label>
                <input
                  value={newPlanForm.title}
                  onChange={(e) => setNewPlanForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ borderColor: T.cardBorder, color: T.textPrimary }}
                  placeholder="Kế hoạch Q1 2026..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: T.textSecondary }}>
                  Tầm nhìn <span style={{ color: T.textMuted }}>(Vision — điều bạn muốn đạt được)</span>
                </label>
                <textarea
                  value={newPlanForm.vision}
                  onChange={(e) => setNewPlanForm((f) => ({ ...f, vision: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 resize-none"
                  style={{ borderColor: T.cardBorder, color: T.textPrimary }}
                  rows={3}
                  placeholder="Tôi muốn đạt doanh thu 1.2 tỷ trong 12 tuần tới, mở rộng thêm 3 đại lý mới..."
                />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: T.textSecondary }}>Ngày bắt đầu tuần 1</label>
                <input
                  type="date"
                  value={newPlanForm.startDate}
                  onChange={(e) => setNewPlanForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ borderColor: T.cardBorder, color: T.textPrimary }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNewPlanModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50"
                style={{ borderColor: T.cardBorder, color: T.textMuted }}>
                Hủy
              </button>
              <button onClick={createPlan} disabled={saving || !newPlanForm.title}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${T.indigo}, #4338CA)` }}>
                {saving ? "Đang tạo..." : "Tạo kế hoạch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
