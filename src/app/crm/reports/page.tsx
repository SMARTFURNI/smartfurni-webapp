import { requireAdmin } from "@/lib/admin-auth";
import { getLeads, getQuotes, getCrmStats } from "@/lib/crm-store";
import ReportsClient from "@/components/crm/reports/ReportsClient";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireAdmin();

  const [leads, stats, quotes] = await Promise.all([
    getLeads(),
    getCrmStats(),
    getQuotes(),
  ]);

  return <ReportsClient leads={leads} stats={stats} quotes={quotes} />;
}
