import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import {
  getAllPlans,
  getPlanById,
  savePlan,
  deletePlan,
  type TwelveWeekPlan,
  type Goal,
  type WeeklyTask,
  type WeeklyAllocation,
  type DailyAllocation,
} from "@/lib/twelve-week-plan-store";

export const dynamic = "force-dynamic";

function nanoid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function calcEndDate(startDate: string): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + 12 * 7 - 1);
  return d.toISOString().split("T")[0];
}

// GET - lấy danh sách plans (hoặc 1 plan theo id)
export async function GET(req: NextRequest) {
  try {
    const session = await requireCrmAccess();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all"); // admin only

    if (id) {
      const plan = await getPlanById(id);
      if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
      // Staff có thể xem plan nếu: (1) plan là của họ, HOẶC (2) họ được gán vào plan
      const staffId = session.staffId ?? "admin";
      const canView = session.isAdmin || 
                      plan.staffId === staffId || 
                      (Array.isArray((plan as any).assignedStaffIds) && (plan as any).assignedStaffIds.includes(staffId));
      if (!canView) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json(plan);
    }

    // Lấy kế hoạch chung của admin (shared plan) - nhân viên có thể xem
    const shared = searchParams.get("shared");
    if (shared === "1") {
      const adminPlans = await getAllPlans("admin");
      const activePlan = adminPlans.find(p => p.isActive) ?? adminPlans[0] ?? null;
      return NextResponse.json(activePlan ? [activePlan] : []);
    }
    // Lấy theo staffId - nhân viên xem kế hoạch của họ + kế hoạch được gán cho họ
    const staffId = session.isAdmin && all ? undefined : (session.staffId ?? "admin");
    const plans = await getAllPlans(staffId);
    
    // Nếu là nhân viên, thêm các kế hoạch admin được gán cho họ
    if (!session.isAdmin && staffId) {
      const adminPlans = await getAllPlans("admin");
      const assignedAdminPlans = adminPlans.filter(p => 
        Array.isArray((p as any).assignedStaffIds) && (p as any).assignedStaffIds.includes(staffId)
      );
      plans.push(...assignedAdminPlans);
    }
    
    return NextResponse.json(plans);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// POST - tạo plan mới
export async function POST(req: NextRequest) {
  try {
    const session = await requireCrmAccess();
    const body = await req.json();
    const staffId = session.staffId ?? "admin";
    const now = new Date().toISOString();
    const startDate = body.startDate || new Date().toISOString().split("T")[0];

    const plan: TwelveWeekPlan = {
      id: "plan_" + nanoid(),
      staffId,
      title: body.title || "Kế hoạch 12 tuần",
      vision: body.vision || "",
      startDate,
      endDate: calcEndDate(startDate),
      isActive: true,
      goals: [],
      tasks: [],
      createdAt: now,
      updatedAt: now,
    };

    await savePlan(plan);
    return NextResponse.json(plan, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// PATCH - cập nhật plan, goal, task
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireCrmAccess();
    const body = await req.json();
    const { planId, action } = body;

    if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });

    const plan = await getPlanById(planId);
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const staffId = session.staffId ?? "admin";
    if (!session.isAdmin && plan.staffId !== staffId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date().toISOString();

    switch (action) {
      // ── Plan-level updates ─────────────────────────────────────────────
      case "update_plan": {
        if (body.title !== undefined) plan.title = body.title;
        if (body.vision !== undefined) plan.vision = body.vision;
        if (body.startDate !== undefined) {
          plan.startDate = body.startDate;
          plan.endDate = calcEndDate(body.startDate);
        }
        if (body.isActive !== undefined) plan.isActive = body.isActive;
        plan.updatedAt = now;
        break;
      }

      case "update_title": {
        if (body.title !== undefined) plan.title = body.title;
        plan.updatedAt = now;
        break;
      }

      case "set_default": {
        if (body.defaultForDashboard !== undefined) {
          if (body.defaultForDashboard) {
            const allPlans = await getAllPlans("admin");
            for (const p of allPlans) {
              if (p.id !== planId && p.defaultForDashboard) {
                p.defaultForDashboard = false;
                await savePlan(p);
              }
            }
          }
          plan.defaultForDashboard = body.defaultForDashboard;
          plan.updatedAt = now;
        }
        break;
      }

      case "assign_staff": {
        if (Array.isArray(body.assignedStaffIds)) {
          plan.assignedStaffIds = body.assignedStaffIds;
          plan.updatedAt = now;
        }
        break;
      }

      // ── Goal CRUD ──────────────────────────────────────────────────────
      case "add_goal": {
        const goal: Goal = {
          id: "goal_" + nanoid(),
          planId,
          title: body.title || "Mục tiêu mới",
          description: body.description,
          color: body.color || "indigo",
          targetMetric: body.targetMetric,
          currentMetric: body.currentMetric,
          order: plan.goals.length,
          createdAt: now,
          updatedAt: now,
        };
        plan.goals.push(goal);
        plan.updatedAt = now;
        break;
      }
      case "update_goal": {
        const idx = plan.goals.findIndex((g) => g.id === body.goalId);
        if (idx === -1) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
        const g = plan.goals[idx];
        if (body.title !== undefined) g.title = body.title;
        if (body.description !== undefined) g.description = body.description;
        if (body.color !== undefined) g.color = body.color;
        if (body.targetMetric !== undefined) g.targetMetric = body.targetMetric;
        if (body.currentMetric !== undefined) g.currentMetric = body.currentMetric;
        if (body.kpis !== undefined) g.kpis = body.kpis;
        g.updatedAt = now;
        plan.updatedAt = now;
        break;
      }
      // ── KPI Allocation ─────────────────────────────────────────────────
      case "update_kpi_allocation": {
        // body: { goalId, kpiIndex, weeklyAllocations: WeeklyAllocation[] }
        const gIdx = plan.goals.findIndex((g) => g.id === body.goalId);
        if (gIdx === -1) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
        const goal = plan.goals[gIdx];
        if (!goal.kpis || body.kpiIndex === undefined) {
          return NextResponse.json({ error: "KPI not found" }, { status: 404 });
        }
        goal.kpis[body.kpiIndex].weeklyAllocations = body.weeklyAllocations as WeeklyAllocation[];
        // Cập nhật weeklyTarget = tổng / 12 nếu không có override
        goal.updatedAt = now;
        plan.updatedAt = now;
        break;
      }
      case "update_daily_allocation": {
        // body: { goalId, kpiIndex, weekNumber, dailyAllocations: DailyAllocation[] }
        const gIdx = plan.goals.findIndex((g) => g.id === body.goalId);
        if (gIdx === -1) return NextResponse.json({ error: "Goal not found" }, { status: 404 });
        const goal = plan.goals[gIdx];
        if (!goal.kpis || body.kpiIndex === undefined) {
          return NextResponse.json({ error: "KPI not found" }, { status: 404 });
        }
        const kpi = goal.kpis[body.kpiIndex];
        if (!kpi.weeklyAllocations) kpi.weeklyAllocations = [];
        const wIdx = kpi.weeklyAllocations.findIndex(a => a.weekNumber === body.weekNumber);
        if (wIdx >= 0) {
          kpi.weeklyAllocations[wIdx].dailyAllocations = body.dailyAllocations as DailyAllocation[];
        } else {
          kpi.weeklyAllocations.push({
            weekNumber: body.weekNumber,
            target: Math.round(kpi.targetTotal / 12),
            dailyAllocations: body.dailyAllocations as DailyAllocation[],
          });
        }
        goal.updatedAt = now;
        plan.updatedAt = now;
        break;
      }
      case "delete_goal": {
        plan.goals = plan.goals.filter((g) => g.id !== body.goalId);
        plan.tasks = plan.tasks.filter((t) => t.goalId !== body.goalId);
        plan.updatedAt = now;
        break;
      }

      // ── Task CRUD ──────────────────────────────────────────────────────
      case "add_task": {
        const task: WeeklyTask = {
          id: "task_" + nanoid(),
          goalId: body.goalId,
          planId,
          weekNumber: body.weekNumber || 1,
          title: body.title || "Công việc mới",
          description: body.description,
          status: "pending",
          priority: body.priority || "medium",
          assignedDate: body.assignedDate,
          dueDate: body.dueDate,
          estimatedHours: body.estimatedHours,
          tags: body.tags,
          createdAt: now,
          updatedAt: now,
        };
        plan.tasks.push(task);
        plan.updatedAt = now;
        break;
      }
      case "update_task": {
        const idx = plan.tasks.findIndex((t) => t.id === body.taskId);
        if (idx === -1) return NextResponse.json({ error: "Task not found" }, { status: 404 });
        const t = plan.tasks[idx];
        if (body.title !== undefined) t.title = body.title;
        if (body.description !== undefined) t.description = body.description;
        if (body.status !== undefined) {
          t.status = body.status;
          if (body.status === "done") t.completedAt = now;
          else t.completedAt = undefined;
        }
        if (body.weekNumber !== undefined) t.weekNumber = body.weekNumber;
        if (body.dueDate !== undefined) t.dueDate = body.dueDate;
        if (body.assignedDate !== undefined) t.assignedDate = body.assignedDate;
        if (body.priority !== undefined) t.priority = body.priority;
        if (body.estimatedHours !== undefined) t.estimatedHours = body.estimatedHours;
        if (body.tags !== undefined) t.tags = body.tags;
        if (body.goalId !== undefined) t.goalId = body.goalId;
        t.updatedAt = now;
        plan.updatedAt = now;
        break;
      }
      case "delete_task": {
        plan.tasks = plan.tasks.filter((t) => t.id !== body.taskId);
        plan.updatedAt = now;
        break;
      }

      // ── Bulk task status ───────────────────────────────────────────────
      case "bulk_update_tasks": {
        // body.updates: Array<{ taskId, status }>
        for (const upd of body.updates ?? []) {
          const t = plan.tasks.find((x) => x.id === upd.taskId);
          if (t) {
            t.status = upd.status;
            if (upd.status === "done") t.completedAt = now;
            else t.completedAt = undefined;
            t.updatedAt = now;
          }
        }
        plan.updatedAt = now;
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    await savePlan(plan);
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// DELETE - xóa plan
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireCrmAccess();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const plan = await getPlanById(id);
    if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const staffId = session.staffId ?? "admin";
    if (!session.isAdmin && plan.staffId !== staffId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deletePlan(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
