import { getLeads, type Lead } from "@/lib/crm-store";
import { getCrmSession } from "@/lib/admin-auth";
import LeadsListClient from "@/components/crm/LeadsListClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  let leads: Lead[] = [];
  try {
    leads = await getLeads();
  } catch (err) {
    console.error("[crm/leads] Failed to load leads:", err);
  }
  const session = await getCrmSession();
  return <LeadsListClient initialLeads={leads} isAdmin={session?.isAdmin ?? false} />;
}
