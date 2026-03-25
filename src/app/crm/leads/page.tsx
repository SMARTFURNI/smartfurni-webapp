import { getLeads } from "@/lib/crm-store";
import LeadsListClient from "@/components/crm/LeadsListClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await getLeads();
  return <LeadsListClient initialLeads={leads} />;
}
