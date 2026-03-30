/**
 * 12 Week Year Plan Store
 * Dựa trên phương pháp "The 12 Week Year" của Brian P. Moran
 *
 * Cấu trúc:
 * - TwelveWeekPlan: Kế hoạch 12 tuần (có vision, start date, goals)
 * - Goal: Mục tiêu lớn trong kế hoạch (có nhiều weekly tasks)
 * - WeeklyTask: Công việc cụ thể cho từng tuần (có due date, status)
 */

import { query } from "./db";

// ── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = "pending" | "done" | "skipped";
export type GoalColor = "indigo" | "green" | "gold" | "red" | "purple" | "blue";

export interface DailyAllocation {
  date: string;       // ISO date "YYYY-MM-DD"
  target: number;     // Chỉ tiêu ngày đó
  note?: string;      // Ghi chú
}

export interface WeeklyAllocation {
  weekNumber: number;           // 1-12
  target: number;               // Chỉ tiêu tuần (override targetTotal/12)
  dailyAllocations?: DailyAllocation[]; // Phân bổ từng ngày trong tuần
}

export interface GoalKpi {
  label: string;           // e.g. "Doanh thu"
  unit: string;            // e.g. "VNĐ" | "KH" | "đơn" | "%"
  targetTotal: number;     // Mục tiêu 12 tuần (e.g. 1200000000)
  weeklyTarget: number;    // Mục tiêu mỗi tuần = targetTotal / 12 (default)
  weeklyAllocations?: WeeklyAllocation[]; // Override phân bổ từng tuần
  currentValue?: number;   // Giá trị thực tế hiện tại (lấy từ CRM)
  format: "currency" | "number" | "percent"; // Cách hiển thị
}

export interface WeeklyTask {
  id: string;
  goalId: string;
  planId: string;
  weekNumber: number; // 1-12
  title: string;
  description?: string;
  status: TaskStatus;
  priority?: "high" | "medium" | "low"; // Độ ưu tiên
  assignedDate?: string;  // ISO date "YYYY-MM-DD" - ngày cụ thể được giao
  dueDate?: string;       // ISO date string - hạn chót
  completedAt?: string;
  estimatedHours?: number; // Số giờ ước tính
  tags?: string[];         // Nhãn/tag
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  planId: string;
  title: string;
  description?: string;
  color: GoalColor;
  targetMetric?: string; // e.g. "Doanh thu 1.2 tỷ" (text mô tả)
  currentMetric?: string; // e.g. "850 triệu" (text mô tả)
  kpis?: GoalKpi[];       // Các chỉ số KPI có thể đo lường
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface TwelveWeekPlan {
  id: string;
  staffId: string; // owner
  title: string;
  vision: string; // "Tầm nhìn" - long-term vision
  startDate: string; // ISO date - start of week 1
  endDate: string; // ISO date - end of week 12
  isActive: boolean;
  goals: Goal[];
  tasks: WeeklyTask[];
  createdAt: string;
  updatedAt: string;
}

// ── DB Init ──────────────────────────────────────────────────────────────────
export async function ensureTwelveWeekPlanTables(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS twelve_week_plans (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_twelve_week_plans_staff
    ON twelve_week_plans(staff_id)
  `);
}
// ── CRUD ─────────────────────────────────────────────────────────────────────
export async function getAllPlans(staffId?: string): Promise<TwelveWeekPlan[]> {
  await ensureTwelveWeekPlanTables();
  let rows;
  if (staffId) {
    rows = await query<{ data: TwelveWeekPlan }>(
      `SELECT data FROM twelve_week_plans WHERE staff_id = $1 ORDER BY updated_at DESC`,
      [staffId]
    );
  } else {
    rows = await query<{ data: TwelveWeekPlan }>(
      `SELECT data FROM twelve_week_plans ORDER BY updated_at DESC`
    );
  }
  return rows.map((r) => r.data);
}
export async function getPlanById(id: string): Promise<TwelveWeekPlan | null> {
  await ensureTwelveWeekPlanTables();
  const rows = await query<{ data: TwelveWeekPlan }>(
    `SELECT data FROM twelve_week_plans WHERE id = $1`,
    [id]
  );
  return rows[0]?.data ?? null;
}
export async function savePlan(plan: TwelveWeekPlan): Promise<void> {
  await ensureTwelveWeekPlanTables();
  await query(
    `INSERT INTO twelve_week_plans (id, staff_id, data, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (id) DO UPDATE SET data = $3, updated_at = NOW()`,
    [plan.id, plan.staffId, JSON.stringify(plan)]
  );
}
export async function deletePlan(id: string): Promise<void> {
  await ensureTwelveWeekPlanTables();
  await query(`DELETE FROM twelve_week_plans WHERE id = $1`, [id]);
}
// ── Helpers ──────────────────────────────────────────────────────────────────
export function calcPlanProgress(plan: TwelveWeekPlan): {
  totalTasks: number;
  doneTasks: number;
  pct: number;
  weeklyPcts: number[];
  currentWeek: number;
} {
  const now = new Date();
  const start = new Date(plan.startDate);
  const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const currentWeek = Math.min(12, Math.max(1, Math.ceil((diffDays + 1) / 7)));
  const totalTasks = plan.tasks.filter((t) => t.status !== "skipped").length;
  const doneTasks = plan.tasks.filter((t) => t.status === "done").length;
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const weeklyPcts = Array.from({ length: 12 }, (_, i) => {
    const weekNum = i + 1;
    const weekTasks = plan.tasks.filter((t) => t.weekNumber === weekNum && t.status !== "skipped");
    const weekDone = plan.tasks.filter((t) => t.weekNumber === weekNum && t.status === "done");
    return weekTasks.length > 0 ? Math.round((weekDone.length / weekTasks.length) * 100) : 0;
  });
  return { totalTasks, doneTasks, pct, weeklyPcts, currentWeek };
}
export function getWeekDateRange(startDate: string, weekNumber: number): { start: Date; end: Date } {
  const start = new Date(startDate);
  const weekStart = new Date(start);
  weekStart.setDate(start.getDate() + (weekNumber - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return { start: weekStart, end: weekEnd };
}

/**
 * Lấy chỉ tiêu KPI cho tuần cụ thể (dùng weeklyAllocations nếu có, fallback về targetTotal/12)
 */
export function getWeeklyKpiTarget(kpi: GoalKpi, weekNumber: number): number {
  const alloc = kpi.weeklyAllocations?.find(a => a.weekNumber === weekNumber);
  if (alloc) return alloc.target;
  return Math.round(kpi.targetTotal / 12);
}

/**
 * Lấy chỉ tiêu KPI cho ngày cụ thể
 */
export function getDailyKpiTarget(kpi: GoalKpi, weekNumber: number, date: string): number {
  const weekAlloc = kpi.weeklyAllocations?.find(a => a.weekNumber === weekNumber);
  if (weekAlloc?.dailyAllocations) {
    const dayAlloc = weekAlloc.dailyAllocations.find(d => d.date === date);
    if (dayAlloc) return dayAlloc.target;
    // Chia đều cho các ngày trong tuần nếu không có phân bổ ngày
    return Math.round(weekAlloc.target / 7);
  }
  return Math.round(getWeeklyKpiTarget(kpi, weekNumber) / 7);
}

/**
 * Tính tổng chỉ tiêu đã phân bổ cho 12 tuần (để kiểm tra có khớp targetTotal không)
 */
export function calcAllocatedTotal(kpi: GoalKpi): number {
  if (!kpi.weeklyAllocations || kpi.weeklyAllocations.length === 0) {
    return kpi.targetTotal; // Mặc định chia đều
  }
  return kpi.weeklyAllocations.reduce((sum, a) => sum + a.target, 0);
}

/**
 * Tính mục tiêu lũy kế đến tuần N (ideal pace)
 */
export function calcCumulativeTarget(kpi: GoalKpi, weekNumber: number): number {
  if (kpi.weeklyAllocations && kpi.weeklyAllocations.length > 0) {
    // Dùng phân bổ thực tế
    return kpi.weeklyAllocations
      .filter(a => a.weekNumber <= weekNumber)
      .reduce((sum, a) => sum + a.target, 0);
  }
  return Math.round((kpi.targetTotal / 12) * weekNumber);
}

/**
 * Tính % hoàn thành KPI so với mục tiêu lũy kế đến tuần hiện tại
 */
export function calcKpiProgress(kpi: GoalKpi, currentWeek: number): {
  weeklyTarget: number;
  cumulativeTarget: number;
  currentValue: number;
  pct: number;
  gap: number;
  isOnTrack: boolean;
} {
  const weeklyTarget = getWeeklyKpiTarget(kpi, currentWeek);
  const cumulativeTarget = calcCumulativeTarget(kpi, currentWeek);
  const currentValue = kpi.currentValue ?? 0;
  const pct = cumulativeTarget > 0 ? Math.round((currentValue / cumulativeTarget) * 100) : 0;
  const gap = currentValue - cumulativeTarget;
  return {
    weeklyTarget,
    cumulativeTarget,
    currentValue,
    pct,
    gap,
    isOnTrack: currentValue >= cumulativeTarget * 0.9,
  };
}

/**
 * Format giá trị KPI theo đơn vị
 */
export function formatKpiValue(value: number, format: GoalKpi["format"]): string {
  if (format === "currency") {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${Math.round(value / 1_000_000)}tr`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
    return String(value);
  }
  if (format === "percent") return `${value}%`;
  return String(value);
}
