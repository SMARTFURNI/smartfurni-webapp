import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { getRoleById } from "@/lib/crm-roles-store";
import { getLeads, getTasks, getQuotes, getCrmStats } from "@/lib/crm-store";
import { getCrmSettings } from "@/lib/crm-settings-store";
import { getAllPlans } from "@/lib/twelve-week-plan-store";
import { getRawLeadStats } from "@/lib/crm-raw-lead-store";
import CrmDashboardClient from "@/components/crm/CrmDashboardClient";
import { redirect } from "next/navigation";
import { dashboardPeriodWindow, vietnamDateKey } from "@/lib/crm-dashboard-period";

export const dynamic = "force-dynamic";

export default async function CrmDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { source } = await searchParams;
  if (source === "pwa") {
    redirect("/admin/choose-module?source=pwa&entry=crm");
  }

  const session = await requireCrmAccess();

  // Lấy thông tin nhân viên đang đăng nhập
  let currentStaff = null;
  if (session.isAdmin) {
    const { getStaffByUsername } = await import("@/lib/crm-staff-store");
    currentStaff = await getStaffByUsername("admin");
  } else if (session.staffId) {
    currentStaff = await getStaffById(session.staffId);
  }

  const staffName = currentStaff?.fullName ?? "";
  const staffRole = currentStaff?.role ?? "sales";
  const staffUsername = currentStaff?.username ?? "";
  const staffId = currentStaff?.id ?? null;

  // Kiểm tra permission leads_view_all từ DB
  let canViewAll = session.isAdmin;
  if (!session.isAdmin && staffRole) {
    const roleData = await getRoleById(staffRole).catch(() => null);
    if (roleData?.permissions?.leads_view_all) {
      canViewAll = true;
    }
  }

  // canViewAll (admin hoặc leader): xem tất cả; còn lại chỉ xem leads được giao cho mình
  const staffFilter = (!canViewAll && staffName) ? { assignedTo: staffName } : undefined;

  // Pre-load tất cả dữ liệu song song để giảm thời gian chờ
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

  // Tính period_stats cho "Hôm nay" ngay từ server để dashboard mở ra
  // đúng bộ lọc mặc định và không nhấp nháy dữ liệu tuần cũ khi hydrate.
  const now = new Date();
  const { start: todayStart, end: tomorrowStart } = dashboardPeriodWindow("today", now);
  const inToday = (dateStr: string) => {
    const timestamp = new Date(dateStr);
    return timestamp >= todayStart && timestamp < tomorrowStart;
  };
  const newLeadsToday = leads.filter(l => inToday(l.createdAt));
  const wonLeadsToday = leads.filter(l => l.stage === "won" && inToday(l.updatedAt));
  const wonValueToday = wonLeadsToday.reduce((s, l) => s + (l.expectedValue || 0), 0);
  const totalClosedToday = wonLeadsToday.length + leads.filter(l => l.stage === "lost" && inToday(l.updatedAt)).length;
  const convRateToday = totalClosedToday > 0 ? Math.round((wonLeadsToday.length / totalClosedToday) * 100) : 0;
  const sparkline = [];
  const wonSparkline = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = vietnamDateKey(d);
    sparkline.push(leads.filter(l => vietnamDateKey(new Date(l.createdAt)) === dayStr).length);
    wonSparkline.push(leads.filter(l => l.stage === "won" && vietnamDateKey(new Date(l.updatedAt)) === dayStr).length);
  }
  const periodStats = {
    period: "today",
    newLeads: newLeadsToday.length,
    wonLeads: wonLeadsToday.length,
    wonValue: wonValueToday,
    convRate: convRateToday,
    sparkline,
    wonSparkline,
  };

  // Cố định nội dung thời gian ngay từ phía máy chủ để HTML đầu tiên và lần
  // hydrate trên điện thoại luôn giống nhau, tránh React bỏ DOM rồi dựng lại.
  const vietnamHour = Number(new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(now));
  const initialGreeting = vietnamHour < 12
    ? "Chào buổi sáng"
    : vietnamHour < 18
      ? "Chào buổi chiều"
      : "Chào buổi tối";
  const initialDateLabel = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(now);

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
      initialRenderTimestamp={now.getTime()}
      initialGreeting={initialGreeting}
      initialDateLabel={initialDateLabel}
    />
  );
}
