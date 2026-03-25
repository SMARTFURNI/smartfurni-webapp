import { getLeads, getTasks, getQuotes, getCrmStats } from "@/lib/crm-store";
import CrmDashboardClient from "@/components/crm/CrmDashboardClient";

export const dynamic = "force-dynamic";

export default async function CrmDashboardPage() {
  const [leads, tasks, quotes, stats] = await Promise.all([
    getLeads(),
    getTasks({ dueToday: true }),
    getQuotes(),
    getCrmStats(),
  ]);

  return (
    <CrmDashboardClient
      leads={leads}
      todayTasks={tasks}
      quotes={quotes}
      stats={stats}
    />
  );
}
