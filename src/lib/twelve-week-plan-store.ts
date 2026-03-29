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

export interface WeeklyTask {
  id: string;
  goalId: string;
  planId: string;
  weekNumber: number; // 1-12
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: string; // ISO date string
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  planId: string;
  title: string;
  description?: string;
  color: GoalColor;
  targetMetric?: string; // e.g. "Doanh thu 1.2 tỷ"
  currentMetric?: string; // e.g. "850 triệu"
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
