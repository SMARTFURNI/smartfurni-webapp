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
  DollarSign, Layers, PieChart, Settings, ChevronLeft,
  ArrowRight, Hash, Percent, BarChart, Info, Sliders,
} from "lucide-react";
import type { TwelveWeekPlan, Goal, WeeklyTask, GoalColor, TaskStatus, GoalKpi, WeeklyAllocation } from "@/lib/twelve-week-plan-store";

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

// ── KPI Helpers ──────────────────────────────────────────────────────────────
function fmtKpiValue(value: number, format: GoalKpi["format"]): string {
  if (format === "currency") {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}tr`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
    return String(value);
  }
  if (format === "percent") return `${value}%`;
  return String(value);
}

function parseKpiInput(raw: string, format: GoalKpi["format"]): number {
  const s = raw.replace(/[,. ]/g, "").replace(/tr$/i, "000000").replace(/b$/i, "000000000").replace(/k$/i, "000");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function getWeeklyTarget(kpi: GoalKpi, weekNumber: number): number {
  const alloc = kpi.weeklyAllocations?.find(a => a.weekNumber === weekNumber);
  if (alloc) return alloc.target;
  return Math.round(kpi.targetTotal / 12);
}

function calcAllocatedTotal(kpi: GoalKpi): number {
  if (!kpi.weeklyAllocations || kpi.weeklyAllocations.length === 0) return kpi.targetTotal;
  const sum = kpi.weeklyAllocations.reduce((s, a) => s + a.target, 0);
  // Fill in missing weeks with default
  const missing = 12 - kpi.weeklyAllocations.length;
  const defaultWeekly = Math.round(kpi.targetTotal / 12);
  return sum + missing * defaultWeekly;
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

// ── KPI Allocation Editor ───────────────────────────────────────────────────────────────
function KpiAllocationEditor({ goal, kpi, kpiIndex, planStartDate, onSave, onClose }: {
  goal: Goal;
  kpi: GoalKpi;
  kpiIndex: number;
  planStartDate: string;
  onSave: (weeklyAllocations: WeeklyAllocation[]) => void;
  onClose: () => void;
}) {
  const gc = GOAL_COLORS[goal.color];
  const defaultWeekly = Math.round(kpi.targetTotal / 12);

  // Initialize allocations from existing data or defaults
  const [allocations, setAllocations] = useState<number[]>(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const existing = kpi.weeklyAllocations?.find(a => a.weekNumber === i + 1);
      return existing ? existing.target : defaultWeekly;
    });
  });

  const [editMode, setEditMode] = useState<"equal" | "manual" | "ramp" | "frontload">("manual");

  const totalAllocated = allocations.reduce((s, v) => s + v, 0);
  const diff = totalAllocated - kpi.targetTotal;
  const isBalanced = Math.abs(diff) < kpi.targetTotal * 0.01; // within 1%

  const applyPreset = (mode: typeof editMode) => {
    setEditMode(mode);
    if (mode === "equal") {
      const weekly = Math.round(kpi.targetTotal / 12);
      const arr = Array(12).fill(weekly);
      // Adjust last week for rounding
      arr[11] = kpi.targetTotal - arr.slice(0, 11).reduce((s, v) => s + v, 0);
      setAllocations(arr);
    } else if (mode === "ramp") {
      // Ramp up: start at 50% of average, end at 150%
      const avg = kpi.targetTotal / 12;
      const arr = Array.from({ length: 12 }, (_, i) => Math.round(avg * (0.5 + (i / 11) * 1.0)));
      const total = arr.reduce((s, v) => s + v, 0);
      const scale = kpi.targetTotal / total;
      const scaled = arr.map(v => Math.round(v * scale));
      scaled[11] = kpi.targetTotal - scaled.slice(0, 11).reduce((s, v) => s + v, 0);
      setAllocations(scaled);
    } else if (mode === "frontload") {
      // Front-load: start at 150%, end at 50%
      const avg = kpi.targetTotal / 12;
      const arr = Array.from({ length: 12 }, (_, i) => Math.round(avg * (1.5 - (i / 11) * 1.0)));
      const total = arr.reduce((s, v) => s + v, 0);
      const scale = kpi.targetTotal / total;
      const scaled = arr.map(v => Math.round(v * scale));
      scaled[11] = kpi.targetTotal - scaled.slice(0, 11).reduce((s, v) => s + v, 0);
      setAllocations(scaled);
    }
  };

  const updateWeek = (weekIdx: number, rawValue: string) => {
    const num = parseKpiInput(rawValue, kpi.format);
    setAllocations(prev => {
      const next = [...prev];
      next[weekIdx] = num;
      return next;
    });
  };

  const handleSave = () => {
    const weeklyAllocations: WeeklyAllocation[] = allocations.map((target, i) => ({
      weekNumber: i + 1,
      target,
    }));
    onSave(weeklyAllocations);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden" style={{ background: T.card, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div className="px-5 py-4 flex items-center gap-3" style={{ background: gc.bg, borderBottom: `1px solid ${gc.border}` }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: gc.text + "20" }}>
            <Sliders size={16} style={{ color: gc.text }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-black" style={{ color: T.textPrimary }}>Phân bổ KPI theo tuần</h2>
            <p className="text-xs" style={{ color: T.textMuted }}>
              {kpi.label} • Tổng: <strong>{fmtKpiValue(kpi.targetTotal, kpi.format)} {kpi.unit}</strong>
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50">
            <X size={16} style={{ color: T.textMuted }} />
          </button>
        </div>

        {/* Preset buttons */}
        <div className="px-5 py-3 flex items-center gap-2 flex-wrap" style={{ borderBottom: `1px solid ${T.cardBorder}` }}>
          <span className="text-xs font-semibold" style={{ color: T.textMuted }}>Mẫu phân bổ:</span>
          {([
            { id: "equal", label: "Chia đều", desc: "Mỗi tuần bằng nhau" },
            { id: "ramp", label: "Tăng dần", desc: "Bắt đầu chậm, tăng dần" },
            { id: "frontload", label: "Tập trung đầu", desc: "Mạnh đầu kỳ" },
            { id: "manual", label: "Tùy chỉnh", desc: "Nhập thủ công" },
          ] as const).map(({ id, label }) => (
            <button key={id} onClick={() => applyPreset(id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: editMode === id ? gc.text : `${gc.text}10`,
                color: editMode === id ? "#fff" : gc.text,
                border: `1px solid ${editMode === id ? gc.text : gc.border}`,
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Allocation grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Balance indicator */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: isBalanced ? `${T.green}08` : `${T.red}08`, border: `1px solid ${isBalanced ? T.green : T.red}20` }}>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: T.textPrimary }}>Tổng đã phân bổ</span>
                <span className="text-sm font-black" style={{ color: isBalanced ? T.green : T.red }}>
                  {fmtKpiValue(totalAllocated, kpi.format)} / {fmtKpiValue(kpi.targetTotal, kpi.format)} {kpi.unit}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: `${T.textMuted}15` }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (totalAllocated / kpi.targetTotal) * 100)}%`, background: isBalanced ? T.green : totalAllocated > kpi.targetTotal ? T.red : T.gold }} />
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xs font-bold" style={{ color: isBalanced ? T.green : T.red }}>
                {diff === 0 ? "✓ Cân bằng" : diff > 0 ? `+${fmtKpiValue(diff, kpi.format)} thừa` : `${fmtKpiValue(Math.abs(diff), kpi.format)} thiếu`}
              </div>
            </div>
          </div>

          {/* Week inputs */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
            {allocations.map((val, i) => {
              const weekNum = i + 1;
              const { start, end } = getWeekRange(planStartDate, weekNum);
              const pct = kpi.targetTotal > 0 ? Math.round((val / kpi.targetTotal) * 100) : 0;
              const defaultVal = defaultWeekly;
              const isAbove = val > defaultVal * 1.2;
              const isBelow = val < defaultVal * 0.8;
              return (
                <div key={weekNum} className="rounded-xl p-3" style={{ background: T.bg, border: `1px solid ${T.cardBorder}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black" style={{ color: T.indigo }}>T{weekNum}</span>
                    <span className="text-[9px]" style={{ color: T.textMuted }}>{fmtDate(start.toISOString())}</span>
                  </div>
                  <input
                    type="text"
                    defaultValue={fmtKpiValue(val, kpi.format)}
                    key={`${weekNum}-${val}`}
                    onBlur={(e) => updateWeek(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    className="w-full text-center text-sm font-bold rounded-lg px-2 py-1.5 outline-none border transition-all"
                    style={{ borderColor: isAbove ? `${T.green}60` : isBelow ? `${T.red}60` : T.cardBorder, color: T.textPrimary }}
                  />
                  <div className="flex items-center gap-1 mt-1.5">
                    <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: `${gc.text}15` }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: gc.text }} />
                    </div>
                    <span className="text-[9px] font-bold" style={{ color: gc.text }}>{pct}%</span>
                  </div>
                  <div className="text-[9px] text-center mt-0.5" style={{ color: T.textMuted }}>{kpi.unit}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 flex gap-3" style={{ borderTop: `1px solid ${T.cardBorder}` }}>
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors hover:bg-gray-50"
            style={{ borderColor: T.cardBorder, color: T.textMuted }}>
            Hủy
          </button>
          <button onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ background: `linear-gradient(135deg, ${gc.text}, ${gc.text}cc)` }}>
            <Save size={14} className="inline mr-1.5" />Lưu phân bổ
          </button>
        </div>
      </div>
    </div>
  );
}

// ── KPI Manager Panel ──────────────────────────────────────────────────────────────────
function KpiManagerPanel({ goal, planStartDate, onUpdateGoal }: {
  goal: Goal;
  planStartDate: string;
  onUpdateGoal: (goalId: string, data: Partial<Goal>) => void;
}) {
  const gc = GOAL_COLORS[goal.color];
  const [showAddKpi, setShowAddKpi] = useState(false);
  const [editingKpiIdx, setEditingKpiIdx] = useState<number | null>(null);
  const [allocationEditorKpiIdx, setAllocationEditorKpiIdx] = useState<number | null>(null);

  const [newKpi, setNewKpi] = useState<Partial<GoalKpi>>({
    label: "", unit: "", targetTotal: 0, weeklyTarget: 0, format: "number",
  });

  const kpis = goal.kpis ?? [];

  const addKpi = () => {
    if (!newKpi.label || !newKpi.targetTotal) return;
    const kpi: GoalKpi = {
      label: newKpi.label!,
      unit: newKpi.unit || "",
      targetTotal: newKpi.targetTotal!,
      weeklyTarget: Math.round(newKpi.targetTotal! / 12),
      format: newKpi.format as GoalKpi["format"] || "number",
    };
    onUpdateGoal(goal.id, { kpis: [...kpis, kpi] });
    setNewKpi({ label: "", unit: "", targetTotal: 0, weeklyTarget: 0, format: "number" });
    setShowAddKpi(false);
  };

  const deleteKpi = (idx: number) => {
    onUpdateGoal(goal.id, { kpis: kpis.filter((_, i) => i !== idx) });
  };

  const updateKpiCurrentValue = (idx: number, value: number) => {
    const updated = [...kpis];
    updated[idx] = { ...updated[idx], currentValue: value };
    onUpdateGoal(goal.id, { kpis: updated });
  };

  const handleSaveAllocation = (kpiIdx: number, weeklyAllocations: WeeklyAllocation[]) => {
    const updated = [...kpis];
    updated[kpiIdx] = { ...updated[kpiIdx], weeklyAllocations };
    onUpdateGoal(goal.id, { kpis: updated });
  };

  return (
    <div className="space-y-3">
      {/* KPI list */}
      {kpis.map((kpi, idx) => {
        const weeklyTarget = getWeeklyTarget(kpi, 1); // default week 1
        const pct = kpi.targetTotal > 0 ? Math.round(((kpi.currentValue ?? 0) / kpi.targetTotal) * 100) : 0;
        const hasCustomAlloc = kpi.weeklyAllocations && kpi.weeklyAllocations.length > 0;
        return (
          <div key={idx} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${gc.border}` }}>
            <div className="px-4 py-3 flex items-center gap-3" style={{ background: gc.bg }}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: T.textPrimary }}>{kpi.label}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${gc.text}15`, color: gc.text }}>{kpi.unit}</span>
                  {hasCustomAlloc && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: `${T.green}15`, color: T.green }}>✓ Đã phân bổ</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs" style={{ color: T.textMuted }}>Tổng: <strong style={{ color: gc.text }}>{fmtKpiValue(kpi.targetTotal, kpi.format)}</strong></span>
                  <span className="text-xs" style={{ color: T.textMuted }}>TB/tuần: <strong style={{ color: T.indigo }}>{fmtKpiValue(Math.round(kpi.targetTotal / 12), kpi.format)}</strong></span>
                </div>
              </div>
              {/* Progress */}
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-black" style={{ color: pct >= 80 ? T.green : pct >= 50 ? T.gold : T.red }}>{pct}%</div>
                <div className="text-[9px]" style={{ color: T.textMuted }}>{fmtKpiValue(kpi.currentValue ?? 0, kpi.format)} / {fmtKpiValue(kpi.targetTotal, kpi.format)}</div>
              </div>
              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => setAllocationEditorKpiIdx(idx)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: `${T.indigo}10`, color: T.indigo }}
                  title="Phân bổ theo tuần">
                  <Sliders size={12} />
                </button>
                <button onClick={() => deleteKpi(idx)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                  title="Xóa KPI">
                  <Trash2 size={12} style={{ color: T.red }} />
                </button>
              </div>
            </div>

            {/* Current value editor */}
            <div className="px-4 py-2.5 flex items-center gap-3" style={{ borderTop: `1px solid ${gc.border}` }}>
              <span className="text-xs" style={{ color: T.textMuted }}>Giá trị thực tế:</span>
              <input
                type="text"
                defaultValue={fmtKpiValue(kpi.currentValue ?? 0, kpi.format)}
                key={`cv-${idx}-${kpi.currentValue}`}
                onBlur={(e) => updateKpiCurrentValue(idx, parseKpiInput(e.target.value, kpi.format))}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="w-32 text-sm font-bold rounded-lg px-2 py-1 outline-none border"
                style={{ borderColor: T.cardBorder, color: T.textPrimary }}
                placeholder="Nhập giá trị..."
              />
              <span className="text-xs" style={{ color: T.textMuted }}>{kpi.unit}</span>
              {/* Progress bar */}
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: `${gc.text}15` }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: pct >= 80 ? T.green : pct >= 50 ? T.gold : T.red }} />
              </div>
            </div>

            {/* Weekly allocation preview */}
            {hasCustomAlloc && (
              <div className="px-4 py-2 flex items-center gap-1 overflow-x-auto" style={{ borderTop: `1px solid ${gc.border}`, background: T.bg }}>
                <span className="text-[9px] font-semibold flex-shrink-0 mr-1" style={{ color: T.textMuted }}>Phân bổ:</span>
                {Array.from({ length: 12 }, (_, i) => {
                  const wTarget = getWeeklyTarget(kpi, i + 1);
                  return (
                    <div key={i} className="flex-shrink-0 text-center" style={{ minWidth: 36 }}>
                      <div className="text-[8px] font-bold" style={{ color: gc.text }}>{fmtKpiValue(wTarget, kpi.format)}</div>
                      <div className="text-[7px]" style={{ color: T.textMuted }}>T{i+1}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Add KPI form */}
      {showAddKpi ? (
        <div className="rounded-xl p-4 space-y-3" style={{ background: T.bg, border: `2px dashed ${gc.border}` }}>
          <div className="flex items-center gap-2 mb-2">
            <BarChart size={14} style={{ color: gc.text }} />
            <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Thêm chỉ số KPI mới</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: T.textSecondary }}>Tên chỉ số</label>
              <input value={newKpi.label || ""} onChange={e => setNewKpi(p => ({ ...p, label: e.target.value }))}
                className="w-full border rounded-lg px-2.5 py-1.5 text-sm outline-none"
                style={{ borderColor: T.cardBorder, color: T.textPrimary }}
                placeholder="VD: Doanh thu, Số khách..." />
            </div>
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: T.textSecondary }}>Đơn vị</label>
              <input value={newKpi.unit || ""} onChange={e => setNewKpi(p => ({ ...p, unit: e.target.value }))}
                className="w-full border rounded-lg px-2.5 py-1.5 text-sm outline-none"
                style={{ borderColor: T.cardBorder, color: T.textPrimary }}
                placeholder="VNĐ, KH, đơn..." />
            </div>
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: T.textSecondary }}>Mục tiêu 12 tuần</label>
              <input value={newKpi.targetTotal || ""} onChange={e => setNewKpi(p => ({ ...p, targetTotal: parseFloat(e.target.value) || 0 }))}
                className="w-full border rounded-lg px-2.5 py-1.5 text-sm outline-none"
                style={{ borderColor: T.cardBorder, color: T.textPrimary }}
                type="number" placeholder="1200000000" />
            </div>
            <div>
              <label className="text-[10px] font-semibold block mb-1" style={{ color: T.textSecondary }}>Định dạng</label>
              <select value={newKpi.format || "number"} onChange={e => setNewKpi(p => ({ ...p, format: e.target.value as GoalKpi["format"] }))}
                className="w-full border rounded-lg px-2.5 py-1.5 text-sm outline-none"
                style={{ borderColor: T.cardBorder, color: T.textPrimary }}>
                <option value="number">Số thường</option>
                <option value="currency">Tiền tệ (VNĐ)</option>
                <option value="percent">Phần trăm (%)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAddKpi(false)}
              className="flex-1 py-2 rounded-lg text-sm border"
              style={{ borderColor: T.cardBorder, color: T.textMuted }}>
              Hủy
            </button>
            <button onClick={addKpi} disabled={!newKpi.label || !newKpi.targetTotal}
              className="flex-1 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50"
              style={{ background: gc.text }}>
              Thêm KPI
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAddKpi(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ border: `2px dashed ${gc.border}`, color: gc.text, background: `${gc.text}05` }}>
          <Plus size={14} /> Thêm chỉ số KPI
        </button>
      )}

      {/* KPI Allocation Editor Modal */}
      {allocationEditorKpiIdx !== null && kpis[allocationEditorKpiIdx] && (
        <KpiAllocationEditor
          goal={goal}
          kpi={kpis[allocationEditorKpiIdx]}
          kpiIndex={allocationEditorKpiIdx}
          planStartDate={planStartDate}
          onSave={(weeklyAllocations) => handleSaveAllocation(allocationEditorKpiIdx, weeklyAllocations)}
          onClose={() => setAllocationEditorKpiIdx(null)}
        />
      )}
    </div>
  );
}

// ── Daily Calendar View ──────────────────────────────────────────────────────────────────
function DailyCalendarView({ plan, onUpdateTask }: {
  plan: TwelveWeekPlan;
  onUpdateTask: (taskId: string, data: Partial<WeeklyTask>) => void;
}) {
  const currentWeek = getCurrentWeek(plan.startDate);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const { start: weekStart } = getWeekRange(plan.startDate, selectedWeek);

  // Build 7 days of the selected week
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  // Get tasks for this week
  const weekTasks = plan.tasks.filter(t => t.weekNumber === selectedWeek);

  // Group tasks by assignedDate
  const tasksByDay: Record<string, WeeklyTask[]> = {};
  days.forEach(d => {
    const dateStr = d.toISOString().split("T")[0];
    tasksByDay[dateStr] = weekTasks.filter(t => t.assignedDate === dateStr || t.dueDate === dateStr);
  });

  // Unassigned tasks (no date)
  const unassignedTasks = weekTasks.filter(t => !t.assignedDate && !t.dueDate);

  const today = new Date().toISOString().split("T")[0];

  const assignTaskToDay = (taskId: string, dateStr: string | null) => {
    onUpdateTask(taskId, { assignedDate: dateStr ?? undefined });
  };

  return (
    <div className="space-y-4">
      {/* Week selector */}
      <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={15} style={{ color: T.indigo }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Lịch công việc theo ngày</span>
          <span className="ml-auto text-xs" style={{ color: T.textMuted }}>Tuần {selectedWeek}/12</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedWeek(w => Math.max(1, w - 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"
            disabled={selectedWeek === 1}>
            <ChevronLeft size={16} style={{ color: selectedWeek === 1 ? T.textMuted : T.textPrimary }} />
          </button>
          <div className="flex-1 grid grid-cols-6 md:grid-cols-12 gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(w => (
              <button key={w} onClick={() => setSelectedWeek(w)}
                className="rounded-lg py-1.5 text-[10px] font-bold transition-all"
                style={{
                  background: w === selectedWeek ? T.indigo : w === currentWeek ? T.indigoBg : `${T.textMuted}08`,
                  color: w === selectedWeek ? "#fff" : w === currentWeek ? T.indigo : T.textMuted,
                  border: `1px solid ${w === selectedWeek ? T.indigo : w === currentWeek ? T.indigoLight : T.cardBorder}`,
                }}>
                T{w}
              </button>
            ))}
          </div>
          <button onClick={() => setSelectedWeek(w => Math.min(12, w + 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100"
            disabled={selectedWeek === 12}>
            <ChevronRight size={16} style={{ color: selectedWeek === 12 ? T.textMuted : T.textPrimary }} />
          </button>
        </div>
      </div>

      {/* 7-day grid */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, dayIdx) => {
          const dateStr = day.toISOString().split("T")[0];
          const isToday = dateStr === today;
          const dayTasks = tasksByDay[dateStr] ?? [];
          const doneCnt = dayTasks.filter(t => t.status === "done").length;
          const dayName = dayNames[day.getDay()];

          return (
            <div key={dateStr} className="rounded-xl overflow-hidden" style={{
              border: `1.5px solid ${isToday ? T.indigo : T.cardBorder}`,
              background: isToday ? T.indigoBg : T.card,
              minHeight: 120,
            }}>
              {/* Day header */}
              <div className="px-2 py-2 text-center" style={{ borderBottom: `1px solid ${isToday ? T.indigoLight : T.divider}`, background: isToday ? T.indigo : T.bg }}>
                <div className="text-[9px] font-semibold" style={{ color: isToday ? "#fff" : T.textMuted }}>{dayName}</div>
                <div className="text-base font-black" style={{ color: isToday ? "#fff" : T.textPrimary }}>{day.getDate()}</div>
                {dayTasks.length > 0 && (
                  <div className="text-[8px] font-bold" style={{ color: isToday ? "rgba(255,255,255,0.8)" : T.textMuted }}>
                    {doneCnt}/{dayTasks.length}
                  </div>
                )}
              </div>

              {/* Tasks */}
              <div className="p-1.5 space-y-1">
                {dayTasks.map(task => {
                  const goal = plan.goals.find(g => g.id === task.goalId);
                  const gc2 = goal ? GOAL_COLORS[goal.color] : GOAL_COLORS.indigo;
                  const sc = STATUS_CONFIG[task.status];
                  const Icon = sc.icon;
                  return (
                    <div key={task.id}
                      className="rounded-lg px-1.5 py-1 flex items-start gap-1 group cursor-pointer"
                      style={{ background: gc2.bg, border: `1px solid ${gc2.border}` }}
                      title={task.title}>
                      <button onClick={() => {
                        const next: Record<TaskStatus, TaskStatus> = { pending: "done", done: "skipped", skipped: "pending" };
                        onUpdateTask(task.id, { status: next[task.status] });
                      }} className="flex-shrink-0 mt-0.5">
                        <Icon size={9} style={{ color: sc.color }} />
                      </button>
                      <span className="text-[9px] leading-tight flex-1 truncate" style={{ color: T.textPrimary, textDecoration: task.status === "done" ? "line-through" : "none", opacity: task.status === "done" ? 0.6 : 1 }}>
                        {task.title}
                      </span>
                      <button
                        onClick={() => assignTaskToDay(task.id, null)}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Bỏ gán ngày">
                        <X size={8} style={{ color: T.red }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unassigned tasks */}
      {unassignedTasks.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
          <div className="flex items-center gap-2 mb-3">
            <List size={14} style={{ color: T.textMuted }} />
            <span className="text-sm font-semibold" style={{ color: T.textPrimary }}>Chưa gán ngày ({unassignedTasks.length} việc)</span>
            <span className="text-xs" style={{ color: T.textMuted }}>Nhấn vào ngày để gán</span>
          </div>
          <div className="space-y-1.5">
            {unassignedTasks.map(task => {
              const goal = plan.goals.find(g => g.id === task.goalId);
              const gc2 = goal ? GOAL_COLORS[goal.color] : GOAL_COLORS.indigo;
              const sc = STATUS_CONFIG[task.status];
              const Icon = sc.icon;
              return (
                <div key={task.id} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: gc2.bg, border: `1px solid ${gc2.border}` }}>
                  <Icon size={12} style={{ color: sc.color }} />
                  <span className="text-xs flex-1 truncate" style={{ color: T.textPrimary }}>{task.title}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: `${gc2.text}15`, color: gc2.text }}>{goal?.title?.slice(0, 12) ?? ""}</span>
                  {/* Quick date assign */}
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) assignTaskToDay(task.id, e.target.value); }}
                    className="text-[9px] border rounded px-1 py-0.5 outline-none"
                    style={{ borderColor: T.cardBorder, color: T.textMuted }}>
                    <option value="">Gán ngày...</option>
                    {days.map(d => (
                      <option key={d.toISOString()} value={d.toISOString().split("T")[0]}>
                        {dayNames[d.getDay()]} {d.getDate()}/{d.getMonth() + 1}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Allocation View (tab mới) ──────────────────────────────────────────────────────────────────
function AllocationView({ plan, onUpdateGoal, onUpdateTask }: {
  plan: TwelveWeekPlan;
  onUpdateGoal: (goalId: string, data: Partial<Goal>) => void;
  onUpdateTask: (taskId: string, data: Partial<WeeklyTask>) => void;
}) {
  const [activeTab, setActiveTab] = useState<"kpi" | "calendar">("kpi");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(
    plan.goals.length > 0 ? plan.goals[0].id : null
  );

  const selectedGoal = plan.goals.find(g => g.id === selectedGoalId);

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
        <button onClick={() => setActiveTab("kpi")}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
          style={{ background: activeTab === "kpi" ? T.indigo : "transparent", color: activeTab === "kpi" ? "#fff" : T.textMuted }}>
          <Sliders size={12} /> Phân bổ KPI
        </button>
        <button onClick={() => setActiveTab("calendar")}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
          style={{ background: activeTab === "calendar" ? T.indigo : "transparent", color: activeTab === "calendar" ? "#fff" : T.textMuted }}>
          <Calendar size={12} /> Lịch hàng ngày
        </button>
      </div>

      {activeTab === "kpi" && (
        <div className="space-y-4">
          {/* Goal selector */}
          <div className="flex gap-2 flex-wrap">
            {plan.goals.map(goal => {
              const gc = GOAL_COLORS[goal.color];
              const hasKpis = (goal.kpis?.length ?? 0) > 0;
              const isActive = goal.id === selectedGoalId;
              return (
                <button key={goal.id} onClick={() => setSelectedGoalId(goal.id)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: isActive ? gc.bg : T.card, border: `1.5px solid ${isActive ? gc.text : T.cardBorder}`, color: isActive ? gc.text : T.textMuted }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: gc.text }} />
                  <span className="max-w-[120px] truncate">{goal.title}</span>
                  {hasKpis && <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: `${gc.text}15`, color: gc.text }}>{goal.kpis!.length} KPI</span>}
                </button>
              );
            })}
          </div>

          {/* KPI Manager for selected goal */}
          {selectedGoal ? (
            <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
              <div className="px-4 py-3 flex items-center gap-3" style={{ background: GOAL_COLORS[selectedGoal.color].bg, borderBottom: `1px solid ${GOAL_COLORS[selectedGoal.color].border}` }}>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: GOAL_COLORS[selectedGoal.color].text + "20" }}>
                  <Target size={15} style={{ color: GOAL_COLORS[selectedGoal.color].text }} />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold" style={{ color: T.textPrimary }}>{selectedGoal.title}</h3>
                  {selectedGoal.targetMetric && (
                    <p className="text-xs" style={{ color: T.textMuted }}>{selectedGoal.targetMetric}</p>
                  )}
                </div>
              </div>
              <div className="p-4">
                <KpiManagerPanel
                  goal={selectedGoal}
                  planStartDate={plan.startDate}
                  onUpdateGoal={onUpdateGoal}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12" style={{ color: T.textMuted }}>
              <Target size={32} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Chọn một mục tiêu để quản lý KPI</p>
            </div>
          )}

          {/* KPI Summary table */}
          {plan.goals.some(g => (g.kpis?.length ?? 0) > 0) && (
            <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.cardBorder}` }}>
                <BarChart2 size={14} style={{ color: T.indigo }} />
                <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Tổng hợp KPI tất cả mục tiêu</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: T.bg }}>
                      <th className="px-4 py-2 text-left font-semibold" style={{ color: T.textMuted }}>Mục tiêu</th>
                      <th className="px-4 py-2 text-left font-semibold" style={{ color: T.textMuted }}>KPI</th>
                      <th className="px-4 py-2 text-right font-semibold" style={{ color: T.textMuted }}>Tổng 12T</th>
                      <th className="px-4 py-2 text-right font-semibold" style={{ color: T.textMuted }}>TB/Tuần</th>
                      <th className="px-4 py-2 text-right font-semibold" style={{ color: T.textMuted }}>Thực tế</th>
                      <th className="px-4 py-2 text-right font-semibold" style={{ color: T.textMuted }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.goals.flatMap(goal =>
                      (goal.kpis ?? []).map((kpi, kpiIdx) => {
                        const gc = GOAL_COLORS[goal.color];
                        const pct = kpi.targetTotal > 0 ? Math.round(((kpi.currentValue ?? 0) / kpi.targetTotal) * 100) : 0;
                        return (
                          <tr key={`${goal.id}-${kpiIdx}`} style={{ borderTop: `1px solid ${T.divider}` }}>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ background: gc.text }} />
                                <span className="font-semibold truncate max-w-[100px]" style={{ color: T.textPrimary }}>{goal.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5">
                              <span style={{ color: T.textSecondary }}>{kpi.label}</span>
                              <span className="ml-1 text-[9px] px-1 py-0.5 rounded" style={{ background: `${gc.text}10`, color: gc.text }}>{kpi.unit}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold" style={{ color: T.textPrimary }}>{fmtKpiValue(kpi.targetTotal, kpi.format)}</td>
                            <td className="px-4 py-2.5 text-right" style={{ color: T.indigo }}>{fmtKpiValue(Math.round(kpi.targetTotal / 12), kpi.format)}</td>
                            <td className="px-4 py-2.5 text-right" style={{ color: T.textSecondary }}>{fmtKpiValue(kpi.currentValue ?? 0, kpi.format)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className="font-bold text-[10px] px-1.5 py-0.5 rounded-full"
                                style={{ background: pct >= 80 ? T.greenBg : pct >= 50 ? T.goldBg : T.redBg, color: pct >= 80 ? T.green : pct >= 50 ? T.gold : T.red }}>
                                {pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "calendar" && (
        <DailyCalendarView plan={plan} onUpdateTask={onUpdateTask} />
      )}
    </div>
  );
}

// ── Task Row ──────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  high:   { label: "Cao",   color: T.red,   bg: "#FEF2F2" },
  medium: { label: "TB",    color: T.gold,  bg: "#FFFBEB" },
  low:    { label: "Thấp",  color: T.green, bg: "#ECFDF5" },
};

function TaskRow({ task, goal, onUpdate, onDelete }: {
  task: WeeklyTask; goal: Goal;
  onUpdate: (taskId: string, data: Partial<WeeklyTask>) => void;
  onDelete: (taskId: string) => void;
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const gc = GOAL_COLORS[goal.color];
  const sc = STATUS_CONFIG[task.status];
  const StatusIcon = sc.icon;
  const priority = task.priority ?? "medium";
  const pc = PRIORITY_CONFIG[priority];

  const cycleStatus = () => {
    const next: Record<TaskStatus, TaskStatus> = { pending: "done", done: "skipped", skipped: "pending" };
    onUpdate(task.id, { status: next[task.status] });
  };

  const cyclePriority = () => {
    const next: Record<string, string> = { high: "medium", medium: "low", low: "high" };
    onUpdate(task.id, { priority: next[priority] as WeeklyTask["priority"] });
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

      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <InlineEdit
          value={task.title}
          onSave={(v) => onUpdate(task.id, { title: v })}
          placeholder="Tên công việc..."
          className={`text-sm font-medium ${task.status === "done" ? "line-through opacity-60" : ""}`}
          style={{ color: T.textPrimary }}
        />
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {/* Priority badge */}
          <button onClick={cyclePriority}
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-all hover:opacity-80"
            style={{ background: pc.bg, color: pc.color }}
            title="Độ ưu tiên — nhấn để thay đổi">
            {pc.label}
          </button>
          {/* Assigned date */}
          {task.assignedDate ? (
            <div className="flex items-center gap-1">
              <Calendar size={9} style={{ color: T.indigo }} />
              <span className="text-[9px] font-semibold" style={{ color: T.indigo }}>{fmtDateFull(task.assignedDate)}</span>
              <button onClick={() => onUpdate(task.id, { assignedDate: undefined })}
                className="hover:opacity-70" title="Xóa ngày">
                <X size={8} style={{ color: T.textMuted }} />
              </button>
            </div>
          ) : task.dueDate ? (
            <div className="flex items-center gap-1">
              <Clock size={9} style={{ color: T.textMuted }} />
              <span className="text-[9px]" style={{ color: T.textMuted }}>{fmtDateFull(task.dueDate)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {/* Date picker */}
        <div className="relative">
          <button
            onClick={() => setShowDatePicker(p => !p)}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-blue-50 transition-colors"
            title="Gán ngày">
            <Calendar size={11} style={{ color: T.indigo }} />
          </button>
          {showDatePicker && (
            <div className="absolute right-0 top-7 z-20 bg-white rounded-xl shadow-xl border p-2" style={{ borderColor: T.cardBorder, minWidth: 160 }}>
              <div className="text-[10px] font-semibold mb-1.5" style={{ color: T.textMuted }}>Gán ngày thực hiện</div>
              <input
                type="date"
                defaultValue={task.assignedDate || ""}
                onChange={(e) => {
                  onUpdate(task.id, { assignedDate: e.target.value || undefined });
                  setShowDatePicker(false);
                }}
                className="w-full text-xs border rounded-lg px-2 py-1.5 outline-none"
                style={{ borderColor: T.cardBorder, color: T.textPrimary }}
              />
              {task.assignedDate && (
                <button
                  onClick={() => { onUpdate(task.id, { assignedDate: undefined }); setShowDatePicker(false); }}
                  className="w-full mt-1 text-[10px] py-1 rounded-lg text-center hover:bg-red-50"
                  style={{ color: T.red }}>
                  Xóa ngày
                </button>
              )}
            </div>
          )}
        </div>
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
  const currentWeek = getCurrentWeek(planStartDate);
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.filter((t) => t.status !== "skipped").length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const [collapsed, setCollapsed] = useState(false);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(currentWeek);

  // KPI data
  const kpis = goal.kpis ?? [];
  const mainKpi = kpis[0];
  const kpiPct = mainKpi && mainKpi.targetTotal > 0
    ? Math.round(((mainKpi.currentValue ?? 0) / mainKpi.targetTotal) * 100)
    : null;

  // Current week stats
  const cwTasks = tasks.filter(t => t.weekNumber === currentWeek);
  const cwDone = cwTasks.filter(t => t.status === "done").length;
  const cwTotal = cwTasks.filter(t => t.status !== "skipped").length;
  const cwPct = cwTotal > 0 ? Math.round((cwDone / cwTotal) * 100) : 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1.5px solid ${gc.border}`, boxShadow: T.cardShadow }}>
      {/* ── Goal Header ── */}
      <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${gc.bg}, ${gc.text}08)`, borderBottom: `1px solid ${gc.border}` }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: gc.text + "20" }}>
            <Target size={18} style={{ color: gc.text }} />
          </div>
          <div className="flex-1 min-w-0">
            <InlineEdit
              value={goal.title}
              onSave={(v) => onUpdateGoal(goal.id, { title: v })}
              placeholder="Tên mục tiêu..."
              className="text-base font-black"
              style={{ color: T.textPrimary }}
            />
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {goal.targetMetric && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: `${gc.text}12` }}>
                  <Flag size={9} style={{ color: gc.text }} />
                  <InlineEdit
                    value={goal.targetMetric}
                    onSave={(v) => onUpdateGoal(goal.id, { targetMetric: v })}
                    placeholder="Mục tiêu..."
                    className="text-[10px] font-semibold"
                    style={{ color: gc.text }}
                  />
                </div>
              )}
              {!goal.targetMetric && (
                <button onClick={() => onUpdateGoal(goal.id, { targetMetric: "Nhập mục tiêu..." })}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-dashed"
                  style={{ borderColor: `${gc.text}40`, color: `${gc.text}80` }}>
                  + Thêm mục tiêu
                </button>
              )}
            </div>
          </div>

          {/* Right: current week + overall ring */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-center">
              <div className="text-[9px] font-semibold mb-0.5" style={{ color: T.textMuted }}>Tuần {currentWeek}</div>
              <div className="text-sm font-black" style={{ color: cwPct === 100 ? T.green : cwPct > 0 ? gc.text : T.textMuted }}>{cwPct}%</div>
              <div className="text-[9px]" style={{ color: T.textMuted }}>{cwDone}/{cwTotal} việc</div>
            </div>
            <div className="relative">
              <ProgressRing pct={pct} size={52} stroke={4} color={gc.text} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-black" style={{ color: gc.text }}>{pct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI summary */}
        {mainKpi && (
          <div className="mt-3 p-3 rounded-xl" style={{ background: T.card, border: `1px solid ${gc.border}` }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <BarChart size={11} style={{ color: gc.text }} />
                <span className="text-[10px] font-bold" style={{ color: T.textPrimary }}>{mainKpi.label}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: `${gc.text}10`, color: gc.text }}>{mainKpi.unit}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-black" style={{ color: gc.text }}>
                  {fmtKpiValue(mainKpi.currentValue ?? 0, mainKpi.format)}
                </span>
                <span className="text-[10px]" style={{ color: T.textMuted }}>/ {fmtKpiValue(mainKpi.targetTotal, mainKpi.format)}</span>
                {kpiPct !== null && (
                  <span className="text-[10px] font-black ml-1" style={{ color: kpiPct >= 80 ? T.green : kpiPct >= 50 ? T.gold : T.red }}>{kpiPct}%</span>
                )}
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${gc.text}12` }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, kpiPct ?? 0)}%`, background: `linear-gradient(90deg, ${gc.text}80, ${gc.text})` }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px]" style={{ color: T.textMuted }}>Mục tiêu/tuần: <strong style={{ color: gc.text }}>{fmtKpiValue(getWeeklyTarget(mainKpi, currentWeek), mainKpi.format)}</strong></span>
              <span className="text-[9px]" style={{ color: T.textMuted }}>12 tuần: {fmtKpiValue(mainKpi.targetTotal, mainKpi.format)}</span>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex gap-1">
            {(Object.keys(GOAL_COLORS) as GoalColor[]).map((c) => (
              <button key={c} onClick={() => onUpdateGoal(goal.id, { color: c })}
                className="w-4 h-4 rounded-full transition-transform hover:scale-125"
                style={{ background: GOAL_COLORS[c].text, outline: goal.color === c ? `2px solid ${GOAL_COLORS[c].text}` : "none", outlineOffset: 1 }} />
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={() => onDeleteGoal(goal.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"
            title="Xóa mục tiêu">
            <Trash2 size={13} style={{ color: T.red }} />
          </button>
          <button onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors"
            style={{ background: gc.text + "15", color: gc.text }}>
            {collapsed ? <><ChevronDown size={11} /> Hiện 12 tuần</> : <><ChevronUp size={11} /> Ẩn bớt</>}
          </button>
        </div>
      </div>

      {/* ── 12-week grid ── */}
      {!collapsed && (
        <div>
          {/* Week grid overview */}
          <div className="px-5 py-3" style={{ borderBottom: `1px solid ${T.divider}` }}>
            <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((week) => {
                const wTasks = tasks.filter(t => t.weekNumber === week);
                const wDone = wTasks.filter(t => t.status === "done").length;
                const wTotal = wTasks.filter(t => t.status !== "skipped").length;
                const wPct = wTotal > 0 ? Math.round((wDone / wTotal) * 100) : 0;
                const isCurrent = week === currentWeek;
                const isPast = week < currentWeek;
                const isSelected = expandedWeek === week;
                return (
                  <button key={week}
                    onClick={() => setExpandedWeek(isSelected ? null : week)}
                    className="rounded-xl p-2 flex flex-col items-center gap-0.5 transition-all hover:scale-105"
                    style={{
                      background: isSelected ? gc.text : isCurrent ? gc.bg : isPast && wTotal > 0 && wPct === 100 ? `${T.green}10` : isPast && wTotal > 0 ? `${T.red}06` : `${T.textMuted}06`,
                      border: `1.5px solid ${isSelected ? gc.text : isCurrent ? gc.border : isPast && wPct === 100 ? `${T.green}30` : T.cardBorder}`,
                    }}>
                    <span className="text-[9px] font-black" style={{ color: isSelected ? "#fff" : isCurrent ? gc.text : T.textMuted }}>T{week}</span>
                    {wTotal > 0 ? (
                      <>
                        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: isSelected ? "rgba(255,255,255,0.3)" : `${gc.text}20` }}>
                          <div className="h-full rounded-full" style={{ width: `${wPct}%`, background: isSelected ? "#fff" : wPct === 100 ? T.green : gc.text }} />
                        </div>
                        <span className="text-[7px]" style={{ color: isSelected ? "rgba(255,255,255,0.8)" : T.textMuted }}>{wDone}/{wTotal}</span>
                      </>
                    ) : (
                      <span className="text-[7px]" style={{ color: isSelected ? "rgba(255,255,255,0.5)" : `${T.textMuted}60` }}>—</span>
                    )}
                    {isCurrent && !isSelected && <div className="w-1 h-1 rounded-full" style={{ background: gc.text }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expanded week detail */}
          {expandedWeek !== null && (() => {
            const week = expandedWeek;
            const weekTasks = tasks.filter(t => t.weekNumber === week);
            const { start, end } = getWeekRange(planStartDate, week);
            const isCurrent = week === currentWeek;
            const doneCnt = weekTasks.filter(t => t.status === "done").length;
            const totalCnt = weekTasks.filter(t => t.status !== "skipped").length;
            const weekPct = totalCnt > 0 ? Math.round((doneCnt / totalCnt) * 100) : 0;
            const weekKpiTarget = mainKpi ? getWeeklyTarget(mainKpi, week) : null;

            return (
              <div>
                {/* Week header */}
                <div className="px-5 py-3 flex items-center gap-3 flex-wrap" style={{ background: isCurrent ? gc.bg : `${T.textMuted}04`, borderBottom: `1px solid ${T.divider}` }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black px-2.5 py-1 rounded-xl"
                      style={{ background: isCurrent ? gc.text : `${T.textMuted}15`, color: isCurrent ? "#fff" : T.textMuted }}>
                      Tuần {week}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: T.goldBg, color: T.gold }}>
                        ★ Hiện tại
                      </span>
                    )}
                    <span className="text-xs" style={{ color: T.textMuted }}>
                      {fmtDate(start.toISOString())} – {fmtDate(end.toISOString())}
                    </span>
                  </div>
                  <div className="ml-auto flex items-center gap-3">
                    {weekKpiTarget !== null && mainKpi && (
                      <div className="text-right">
                        <div className="text-[9px]" style={{ color: T.textMuted }}>Mục tiêu KPI</div>
                        <div className="text-sm font-black" style={{ color: gc.text }}>
                          {fmtKpiValue(weekKpiTarget, mainKpi.format)} <span className="text-[9px] font-normal">{mainKpi.unit}</span>
                        </div>
                      </div>
                    )}
                    {totalCnt > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 rounded-full overflow-hidden" style={{ background: `${gc.text}15` }}>
                          <div className="h-full rounded-full" style={{ width: `${weekPct}%`, background: weekPct === 100 ? T.green : gc.text }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: weekPct === 100 ? T.green : gc.text }}>{doneCnt}/{totalCnt}</span>
                      </div>
                    )}
                    <button onClick={() => onAddTask(goal.id, week)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors hover:opacity-80"
                      style={{ background: gc.text + "15", color: gc.text }}>
                      <Plus size={11} /> Thêm việc
                    </button>
                  </div>
                </div>

                {/* Tasks */}
                <div className="px-5 py-3 space-y-1">
                  {weekTasks.length === 0 ? (
                    <div className="py-4 text-center">
                      <p className="text-xs" style={{ color: T.textMuted }}>Chưa có công việc nào cho tuần này</p>
                    </div>
                  ) : (
                    weekTasks.map(task => (
                      <TaskRow key={task.id} task={task} goal={goal}
                        onUpdate={onUpdateTask} onDelete={onDeleteTask} />
                    ))
                  )}
                </div>
              </div>
            );
          })()}
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
  const isCurrentWeek = selectedWeek === currentWeek;

  const tasksByGoal = plan.goals.map((g) => ({
    goal: g,
    tasks: weekTasks.filter((t) => t.goalId === g.id),
  })).filter((x) => x.tasks.length > 0);

  const doneCnt = weekTasks.filter((t) => t.status === "done").length;
  const totalCnt = weekTasks.filter((t) => t.status !== "skipped").length;
  const pct = totalCnt > 0 ? Math.round((doneCnt / totalCnt) * 100) : 0;
  const pctColor = pct === 100 ? T.green : pct >= 70 ? T.indigo : pct >= 40 ? T.gold : T.red;

  // KPI summary for selected week
  const weekKpiSummary = plan.goals.map(g => {
    const kpi = g.kpis?.[0];
    if (!kpi) return null;
    const weekTarget = getWeeklyTarget(kpi, selectedWeek);
    const cumTarget = Array.from({ length: selectedWeek }, (_, i) => getWeeklyTarget(kpi, i + 1)).reduce((a, b) => a + b, 0);
    return { goal: g, kpi, weekTarget, cumTarget };
  }).filter(Boolean) as Array<{ goal: Goal; kpi: GoalKpi; weekTarget: number; cumTarget: number }>;

  return (
    <div className="space-y-4">
      {/* ── Week selector + current week hero ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        {/* Current week hero banner */}
        {isCurrentWeek && (
          <div className="px-5 py-4" style={{ background: `linear-gradient(135deg, ${T.indigoBg}, ${T.indigo}12)`, borderBottom: `1px solid ${T.indigoLight}` }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black px-2.5 py-1 rounded-full text-white" style={{ background: T.indigo }}>Tuần {currentWeek} ★ Hiện tại</span>
                  <span className="text-xs" style={{ color: T.textMuted }}>{fmtDateFull(start.toISOString())} – {fmtDateFull(end.toISOString())}</span>
                </div>
                <h2 className="text-xl font-black" style={{ color: T.textPrimary }}>Mục tiêu tuần này</h2>
                <p className="text-sm mt-0.5" style={{ color: T.textMuted }}>
                  {doneCnt}/{totalCnt} công việc • {12 - currentWeek} tuần còn lại
                </p>
              </div>
              <div className="relative">
                <ProgressRing pct={pct} size={64} stroke={5} color={pctColor} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-black" style={{ color: pctColor }}>{pct}%</span>
                </div>
              </div>
            </div>

            {/* KPI targets for current week */}
            {weekKpiSummary.length > 0 && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                {weekKpiSummary.map(({ goal, kpi, weekTarget, cumTarget }) => {
                  const gc = GOAL_COLORS[goal.color];
                  const kpiPct = cumTarget > 0 ? Math.round(((kpi.currentValue ?? 0) / cumTarget) * 100) : 0;
                  return (
                    <div key={goal.id} className="rounded-xl p-3" style={{ background: T.card, border: `1px solid ${gc.border}` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: gc.text }} />
                          <span className="text-[10px] font-semibold truncate max-w-[120px]" style={{ color: T.textMuted }}>{goal.title}</span>
                        </div>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: kpiPct >= 100 ? `${T.green}15` : kpiPct >= 80 ? `${T.gold}15` : `${T.red}10`, color: kpiPct >= 100 ? T.green : kpiPct >= 80 ? T.gold : T.red }}>
                          {kpiPct}%
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-xs font-semibold" style={{ color: T.textMuted }}>{kpi.label}: </span>
                          <span className="text-sm font-black" style={{ color: gc.text }}>{fmtKpiValue(weekTarget, kpi.format)}</span>
                          <span className="text-[9px] ml-0.5" style={{ color: T.textMuted }}>{kpi.unit}/tuần</span>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px]" style={{ color: T.textMuted }}>Lũy kế cần</div>
                          <div className="text-xs font-bold" style={{ color: T.textPrimary }}>{fmtKpiValue(cumTarget, kpi.format)}</div>
                        </div>
                      </div>
                      <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: `${gc.text}12` }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(100, kpiPct)}%`, background: kpiPct >= 100 ? T.green : gc.text }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Week grid selector */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={13} style={{ color: T.indigo }} />
            <span className="text-xs font-bold" style={{ color: T.textPrimary }}>Chọn tuần khác</span>
            {!isCurrentWeek && (
              <span className="text-xs" style={{ color: T.textMuted }}>
                {fmtDateFull(start.toISOString())} – {fmtDateFull(end.toISOString())}
              </span>
            )}
            {!isCurrentWeek && (
              <button onClick={() => setSelectedWeek(currentWeek)}
                className="ml-auto text-[10px] font-semibold px-2 py-1 rounded-lg"
                style={{ background: T.indigoBg, color: T.indigo }}>
                → Tuần hiện tại
              </button>
            )}
          </div>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-1.5">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
              const wTasks = plan.tasks.filter((t) => t.weekNumber === w && t.status !== "skipped");
              const wDone = plan.tasks.filter((t) => t.weekNumber === w && t.status === "done");
              const wPct = wTasks.length > 0 ? Math.round((wDone.length / wTasks.length) * 100) : 0;
              const isCurrent = w === currentWeek;
              const isSelected = w === selectedWeek;
              const isPast = w < currentWeek;
              return (
                <button key={w} onClick={() => setSelectedWeek(w)}
                  className="rounded-xl p-2 flex flex-col items-center gap-0.5 transition-all hover:scale-105"
                  style={{
                    background: isSelected ? T.indigo : isCurrent ? T.indigoBg : isPast && wPct === 100 ? `${T.green}10` : isPast && wTasks.length > 0 ? `${T.red}06` : `${T.textMuted}06`,
                    border: `1.5px solid ${isSelected ? T.indigo : isCurrent ? T.indigoLight : isPast && wPct === 100 ? `${T.green}30` : T.cardBorder}`,
                  }}>
                  <span className="text-[9px] font-black" style={{ color: isSelected ? "#fff" : isCurrent ? T.indigo : T.textMuted }}>T{w}</span>
                  {wTasks.length > 0 ? (
                    <>
                      <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: isSelected ? "rgba(255,255,255,0.3)" : `${T.indigo}20` }}>
                        <div className="h-full rounded-full" style={{ width: `${wPct}%`, background: isSelected ? "#fff" : wPct === 100 ? T.green : T.indigo }} />
                      </div>
                      <span className="text-[7px]" style={{ color: isSelected ? "rgba(255,255,255,0.8)" : T.textMuted }}>{wDone.length}/{wTasks.length}</span>
                    </>
                  ) : (
                    <span className="text-[7px]" style={{ color: `${T.textMuted}60` }}>—</span>
                  )}
                  {isCurrent && !isSelected && <div className="w-1 h-1 rounded-full" style={{ background: T.indigo }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Week summary (non-current weeks) ── */}
      {!isCurrentWeek && (
        <div className="rounded-2xl p-4" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <ProgressRing pct={pct} size={52} stroke={4} color={pctColor} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-black" style={{ color: pctColor }}>{pct}%</span>
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold" style={{ color: T.textPrimary }}>Tuần {selectedWeek}</h3>
              <p className="text-xs" style={{ color: T.textMuted }}>{fmtDateFull(start.toISOString())} – {fmtDateFull(end.toISOString())}</p>
              <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{doneCnt}/{totalCnt} công việc hoàn thành</p>
            </div>
            {weekKpiSummary.length > 0 && (
              <div className="flex gap-3">
                {weekKpiSummary.slice(0, 2).map(({ goal, kpi, weekTarget }) => {
                  const gc = GOAL_COLORS[goal.color];
                  return (
                    <div key={goal.id} className="text-center">
                      <div className="text-[9px]" style={{ color: T.textMuted }}>{kpi.label}</div>
                      <div className="text-sm font-black" style={{ color: gc.text }}>{fmtKpiValue(weekTarget, kpi.format)}</div>
                      <div className="text-[8px]" style={{ color: T.textMuted }}>{kpi.unit}/tuần</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {totalCnt === 0 && (
            <div className="text-center py-4 mt-2" style={{ color: T.textMuted }}>
              <Calendar size={24} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Chưa có công việc cho tuần này</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tasks by goal ── */}
      {tasksByGoal.map(({ goal, tasks }) => {
        const gc = GOAL_COLORS[goal.color];
        const gDone = tasks.filter(t => t.status === "done").length;
        const gTotal = tasks.filter(t => t.status !== "skipped").length;
        const gPct = gTotal > 0 ? Math.round((gDone / gTotal) * 100) : 0;
        const goalKpi = goal.kpis?.[0];
        const weekKpiTarget = goalKpi ? getWeeklyTarget(goalKpi, selectedWeek) : null;
        return (
          <div key={goal.id} className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1.5px solid ${gc.border}`, boxShadow: T.cardShadow }}>
            <div className="px-4 py-3" style={{ background: `linear-gradient(135deg, ${gc.bg}, ${gc.text}08)`, borderBottom: `1px solid ${gc.border}` }}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: gc.text + "20" }}>
                  <Target size={13} style={{ color: gc.text }} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold truncate block" style={{ color: T.textPrimary }}>{goal.title}</span>
                  {goalKpi && (
                    <span className="text-[9px]" style={{ color: T.textMuted }}>{goalKpi.label}: {fmtKpiValue(goalKpi.currentValue ?? 0, goalKpi.format)} / {fmtKpiValue(goalKpi.targetTotal, goalKpi.format)} {goalKpi.unit}</span>
                  )}
                </div>
                {weekKpiTarget !== null && goalKpi && (
                  <div className="text-right flex-shrink-0">
                    <div className="text-[9px]" style={{ color: T.textMuted }}>Mục tiêu tuần</div>
                    <div className="text-sm font-black" style={{ color: gc.text }}>{fmtKpiValue(weekKpiTarget, goalKpi.format)}</div>
                    <div className="text-[8px]" style={{ color: T.textMuted }}>{goalKpi.unit}</div>
                  </div>
                )}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: `${gc.text}15` }}>
                    <div className="h-full rounded-full" style={{ width: `${gPct}%`, background: gPct === 100 ? T.green : gc.text }} />
                  </div>
                  <span className="text-xs font-black" style={{ color: gPct === 100 ? T.green : gc.text }}>{gDone}/{gTotal}</span>
                </div>
              </div>
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

      {/* Empty state */}
      {tasksByGoal.length === 0 && (
        <div className="rounded-2xl p-8 text-center" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
          <Calendar size={32} className="mx-auto mb-3 opacity-20" style={{ color: T.indigo }} />
          <p className="text-sm font-semibold" style={{ color: T.textMuted }}>Chưa có công việc nào cho tuần {selectedWeek}</p>
          <p className="text-xs mt-1" style={{ color: T.textMuted }}>Thêm công việc từ tab Mục tiêu</p>
        </div>
      )}
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

// ── Summary Report: Tổng hợp hiệu suất tất cả mục tiêu ──────────────────────
function SummaryReport({ plan }: { plan: TwelveWeekPlan }) {
  const currentWeek = getCurrentWeek(plan.startDate);
  const weeksLeft = Math.max(0, 12 - currentWeek);
  const { start: planStart } = getWeekRange(plan.startDate, 1);
  const { end: planEnd }     = getWeekRange(plan.startDate, 12);

  // ── Per-goal stats ─────────────────────────────────────────────────────────
  const goalStats = plan.goals.map(goal => {
    const all    = plan.tasks.filter(t => t.goalId === goal.id);
    const active = all.filter(t => t.status !== "skipped");
    const done   = all.filter(t => t.status === "done");
    const skip   = all.filter(t => t.status === "skipped");
    const pend   = all.filter(t => t.status === "pending");
    const pct    = active.length > 0 ? Math.round((done.length / active.length) * 100) : 0;
    const idealPct = Math.round((currentWeek / 12) * 100);
    const gap    = pct - idealPct;

    // velocity: avg done/week in past+current weeks
    const pastWeeksDone = Array.from({ length: currentWeek }, (_, i) => {
      return all.filter(t => t.weekNumber === i + 1 && t.status === "done").length;
    });
    const velocity = currentWeek > 0 ? pastWeeksDone.reduce((s, v) => s + v, 0) / currentWeek : 0;
    const forecastDone = Math.min(active.length, done.length + Math.round(velocity * weeksLeft));
    const forecastPct  = active.length > 0 ? Math.round((forecastDone / active.length) * 100) : 0;

    // weekly breakdown
    const weeklyPcts = Array.from({ length: 12 }, (_, i) => {
      const w = i + 1;
      const wActive = all.filter(t => t.weekNumber === w && t.status !== "skipped");
      const wDone   = all.filter(t => t.weekNumber === w && t.status === "done");
      return wActive.length > 0 ? Math.round((wDone.length / wActive.length) * 100) : -1; // -1 = no tasks
    });

    // streak: consecutive weeks with 100%
    let streak = 0;
    for (let i = currentWeek - 1; i >= 0; i--) {
      if (weeklyPcts[i] === 100) streak++;
      else break;
    }

    // health score (0-100): weighted combo of pct, gap, forecast, streak
    const healthScore = Math.min(100, Math.round(
      pct * 0.4 +
      Math.max(0, 50 + gap) * 0.3 +
      forecastPct * 0.2 +
      streak * 5 * 0.1
    ));

    return { goal, all, active, done, skip, pend, pct, idealPct, gap, velocity, forecastPct, weeklyPcts, streak, healthScore };
  });

  // ── Overall stats ──────────────────────────────────────────────────────────
  const totalActive = goalStats.reduce((s, g) => s + g.active.length, 0);
  const totalDone   = goalStats.reduce((s, g) => s + g.done.length, 0);
  const totalSkip   = goalStats.reduce((s, g) => s + g.skip.length, 0);
  const totalPend   = goalStats.reduce((s, g) => s + g.pend.length, 0);
  const overallPct  = totalActive > 0 ? Math.round((totalDone / totalActive) * 100) : 0;
  const idealPct    = Math.round((currentWeek / 12) * 100);
  const overallGap  = overallPct - idealPct;
  const avgHealth   = goalStats.length > 0 ? Math.round(goalStats.reduce((s, g) => s + g.healthScore, 0) / goalStats.length) : 0;
  const onTrackGoals = goalStats.filter(g => g.gap >= -10).length;

  // ── Radar chart (SVG polygon) ──────────────────────────────────────────────
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
  const actualPoints = goalStats.map((g, i) => radarPoint(i, g.pct));
  const idealPoints  = goalStats.map((_, i) => radarPointIdeal(i));
  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ") + " Z";

  // ── Auto-generated insights ────────────────────────────────────────────────
  const sorted = [...goalStats].sort((a, b) => b.pct - a.pct);
  const best   = sorted[0];
  const worst  = sorted[sorted.length - 1];
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
      {/* ── Scorecard header ── */}
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

      {/* ── Radar chart + Goal ranking ── */}
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
                {/* Grid rings */}
                {[25, 50, 75, 100].map(pct => {
                  const pts = Array.from({ length: N }, (_, i) => radarPointIdeal(i)).map((p, i) => {
                    const angle = (i / N) * 2 * Math.PI - Math.PI / 2;
                    const r2 = (pct / 100) * R;
                    return { x: CX + r2 * Math.cos(angle), y: CY + r2 * Math.sin(angle) };
                  });
                  return (
                    <polygon key={pct} points={pts.map(p => `${p.x},${p.y}`).join(" ")}
                      fill="none" stroke="#E5E7EB" strokeWidth="0.8" />
                  );
                })}
                {/* Axis lines */}
                {goalStats.map((_, i) => {
                  const p = radarPointIdeal(i);
                  return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="#E5E7EB" strokeWidth="0.8" />;
                })}
                {/* Ideal polygon */}
                <polygon points={idealPoints.map(p => `${p.x},${p.y}`).join(" ")}
                  fill={`${T.indigo}08`} stroke={`${T.indigo}30`} strokeWidth="1" strokeDasharray="3 3" />
                {/* Actual polygon */}
                <polygon points={actualPoints.map(p => `${p.x},${p.y}`).join(" ")}
                  fill={`${T.indigo}20`} stroke={T.indigo} strokeWidth="2" />
                {/* Data points */}
                {actualPoints.map((p, i) => {
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
                {/* Center label */}
                <text x={CX} y={CY + 4} textAnchor="middle" fontSize="11" fill={T.indigo} fontWeight="bold">{overallPct}%</text>
              </svg>
              {/* Legend */}
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
            {sorted.map(({ goal, pct, gap, forecastPct, healthScore, velocity }, rank) => {
              const gc = GOAL_COLORS[goal.color];
              const rankColors = ["#F59E0B", "#9CA3AF", "#CD7F32"];
              return (
                <div key={goal.id} className="flex items-center gap-3">
                  {/* Rank badge */}
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
          </div>
        </div>
      </div>

      {/* ── Heatmap: 12 tuần × N mục tiêu ── */}
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 size={14} style={{ color: T.indigo }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Heatmap tiến độ — 12 tuần × mục tiêu</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[9px]" style={{ color: T.textMuted }}>0%</span>
            {[10, 30, 50, 70, 100].map(v => (
              <div key={v} className="w-3 h-3 rounded-sm"
                style={{ background: v === 0 ? "#F3F4F6" : v <= 30 ? "#FEF3C7" : v <= 60 ? "#FDE68A" : v <= 80 ? "#86EFAC" : "#059669" }} />
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

      {/* ── Forecast comparison ── */}
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} style={{ color: T.indigo }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Dự báo hoàn thành cuối kỳ</span>
          <span className="ml-auto text-[10px]" style={{ color: T.textMuted }}>Còn {weeksLeft} tuần</span>
        </div>
        <div className="space-y-3">
          {goalStats.map(({ goal, pct, forecastPct, velocity }) => {
            const gc = GOAL_COLORS[goal.color];
            const fColor = forecastPct >= 80 ? T.green : forecastPct >= 60 ? T.gold : T.red;
            return (
              <div key={goal.id}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: gc.text }} />
                  <span className="text-xs font-semibold flex-1 truncate" style={{ color: T.textPrimary }}>{goal.title}</span>
                  <span className="text-[10px]" style={{ color: T.textMuted }}>Tốc độ: {velocity.toFixed(1)}/tuần</span>
                  <span className="text-xs font-black" style={{ color: fColor }}>Dự báo: {forecastPct}%</span>
                </div>
                {/* Stacked bar: actual vs forecast */}
                <div className="h-3 rounded-full overflow-hidden relative" style={{ background: `${gc.text}10` }}>
                  {/* Actual */}
                  <div className="absolute left-0 top-0 h-full rounded-full"
                    style={{ width: `${pct}%`, background: gc.text, zIndex: 2 }} />
                  {/* Forecast extension */}
                  {forecastPct > pct && (
                    <div className="absolute top-0 h-full rounded-full"
                      style={{ left: `${pct}%`, width: `${forecastPct - pct}%`, background: `${fColor}50`, zIndex: 1 }} />
                  )}
                  {/* 100% marker */}
                  <div className="absolute top-0 right-0 w-0.5 h-full" style={{ background: `${gc.text}40` }} />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-[9px]" style={{ color: T.textMuted }}>Hiện tại: {pct}%</span>
                  <span className="text-[9px] font-semibold" style={{ color: fColor }}>
                    {forecastPct >= 100 ? "🎉 Sẽ hoàn thành!" : forecastPct >= 80 ? "✅ Đúng hướng" : forecastPct >= 60 ? "⚡ Cần tăng tốc" : "🚨 Nguy cơ không đạt"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Auto insights ── */}
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
      {/* Summary Report */}
      <div className="rounded-2xl p-5" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow }}>
        <div className="flex items-center gap-2 mb-4">
          <Star size={15} style={{ color: T.gold }} />
          <span className="text-sm font-bold" style={{ color: T.textPrimary }}>Báo cáo tổng hợp tất cả mục tiêu</span>
        </div>
        <SummaryReport plan={plan} />
      </div>

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
  const [view, setView] = useState<"goals" | "weekly" | "allocation" | "progress">("goals");
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
      // Lấy kế hoạch được gán cho nhân viên
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
              { id: "allocation", label: "Phân bổ", icon: Sliders },
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

          {view === "allocation" && (
            <AllocationView
              plan={activePlan}
              onUpdateGoal={handleUpdateGoal}
              onUpdateTask={handleUpdateTask}
            />
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
