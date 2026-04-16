import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { getRoleById } from "@/lib/crm-roles-store";
import { getLeads, getTasks, getQuotes, getCrmStats } from "@/lib/crm-store";
import { getCrmSettings } from "@/lib/crm-settings-store";
import { getAllPlans } from "@/lib/twelve-week-plan-store";
import { getRawLeadStats } from "@/lib/crm-raw-lead-store";
import CrmDashboardClient from "@/components/crm/CrmDashboardClient";
import { cookies } from "next/headers";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CrmDashboardPage() {
  const session = await requireCrmAccess();

  // === BƯỚC 1: Lấy staff info + cookies SONG SONG ===
  const [currentStaff, cookieStore] = await Promise.all([
    session.isAdmin
      ? import("@/lib/crm-staff-store").then(m => m.getStaffByUsername("admin"))
      : session.staffId
        ? getStaffById(session.staffId)
        : Promise.resolve(null),
    cookies(),
  ]);

  const staffName = currentStaff?.fullName ?? "";
  const staffRole = currentStaff?.role ?? "sales";
  const staffUsername = currentStaff?.username ?? "";
  const staffId = currentStaff?.id ?? null;

  // === BƯỚC 2: Lấy role permissions + staff preferences SONG SONG ===
  const [roleData, staffPrefsRow] = await Promise.all([
    (!session.isAdmin && staffRole)
      ? getRoleById(staffRole).catch(() => null)
      : Promise.resolve(null),
    (!session.isAdmin && session.staffId)
      ? queryOne<{ data: string }>("SELECT data FROM crm_staff WHERE id = $1", [session.staffId]).catch(() => null)
      : Promise.resolve(null),
  ]);

  // Tính canViewAll từ roleData
  let canViewAll = session.isAdmin;
  if (!session.isAdmin && roleData?.permissions?.leads_view_all) {
    canViewAll = true;
  }

  // Đọc darkMode và gradientPreset preference
  let initialDarkMode = false;
  let initialGradientPreset = "default";
  try {
    if (session.isAdmin) {
      initialDarkMode = cookieStore.get("sf_admin_theme")?.value === "dark";
      initialGradientPreset = cookieStore.get("sf_admin_gradient")?.value ?? "default";
    } else if (staffPrefsRow) {
      const data = typeof staffPrefsRow.data === "string" ? JSON.parse(staffPrefsRow.data) : staffPrefsRow.data as Record<string, unknown>;
      const prefs = (data?.preferences as Record<string, unknown>) ?? {};
      initialDarkMode = prefs.darkMode === true;
      initialGradientPreset = (prefs.gradientPreset as string) ?? "default";
    }
  } catch { /* ignore, default to light */ }

  // canViewAll (admin hoặc leader): xem tất cả; còn lại chỉ xem leads được giao cho mình
  const staffFilter = (!canViewAll && staffName) ? { assignedTo: staffName } : undefined;

  // === BƯỚC 3: Pre-load tất cả dữ liệu song song ===
  const [leads, tasks, quotes, stats, crmSettings, allPlans, poolStats] = await Promise.all([
    getLeads(staffFilter),
    getTasks({ dueToday: true, ...(staffFilter ?? {}) }),
    getQuotes(),
    getCrmStats(staffFilter),
    getCrmSettings(),
    // Pre-load kế hoạch 12 tuần (cá nhân + chung)
    getAllPlans(session.isAdmin ? undefined : (staffId ?? undefined)).catch(() => []),
    // Pre-load pool stats (Data Pool)
    getRawLeadStats().catch(() => null),
  ]);

  // Tìm kế hoạch active cho user hiện tại
  const myStaffId = session.isAdmin ? "admin" : (staffId ?? "");
  const myPlans = allPlans.filter(p =>
    session.isAdmin
      ? true
      : (p.staffId === myStaffId || (Array.isArray((p as any).assignedStaffIds) && (p as any).assignedStaffIds.includes(myStaffId)))
  );
  const activePlan = myPlans.find(p => p.isActive) ?? myPlans[0] ?? null;

  // Kế hoạch chung của admin (shared) — dành cho nhân viên xem
  const sharedPlan = allPlans.find(p => (p as any).isShared === true) ?? null;

  // Tính period_stats (week mặc định) server-side
  const now = new Date();
  // Tuần hiện tại: thứ 2 gần nhất
  const dayOfWeek = now.getDay(); // 0=Sun
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysFromMonday);
  weekStart.setHours(0, 0, 0, 0);

  const inWeek = (dateStr: string) => new Date(dateStr) >= weekStart;
  const newLeadsWeek = leads.filter(l => inWeek(l.createdAt));
  const wonLeadsWeek = leads.filter(l => l.stage === "won" && inWeek(l.updatedAt));
  const wonValueWeek = wonLeadsWeek.reduce((s, l) => s + (l.expectedValue || 0), 0);
  const totalClosedWeek = wonLeadsWeek.length + leads.filter(l => l.stage === "lost" && inWeek(l.updatedAt)).length;
  const convRateWeek = totalClosedWeek > 0 ? Math.round((wonLeadsWeek.length / totalClosedWeek) * 100) : 0;
  const sparkline = [];
  const wonSparkline = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    sparkline.push(leads.filter(l => l.createdAt.slice(0, 10) === dayStr).length);
    wonSparkline.push(leads.filter(l => l.stage === "won" && l.updatedAt.slice(0, 10) === dayStr).length);
  }
  const periodStats = {
    period: "week",
    newLeads: newLeadsWeek.length,
    wonLeads: wonLeadsWeek.length,
    wonValue: wonValueWeek,
    convRate: convRateWeek,
    sparkline,
    wonSparkline,
  };

  return (
    <CrmDashboardClient
      leads={leads}
      todayTasks={tasks}
      quotes={quotes}
      stats={stats}
      dashboardTheme={crmSettings.dashboardTheme}
      initialLeadTypes={crmSettings.leadTypes ?? []}
      initialTwelveWeekPlan={activePlan}
      initialSharedPlan={sharedPlan}
      initialPoolStats={poolStats}
      initialPeriodStats={periodStats}
      currentUser={{
        name: staffName,
        username: staffUsername,
        role: staffRole,
        isAdmin: session.isAdmin,
        staffId: staffId ?? undefined,
      }}
      initialDarkMode={initialDarkMode}
      initialGradientPreset={initialGradientPreset}
    />
  );
}
