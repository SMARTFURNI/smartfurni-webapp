import { getLeads } from "@/lib/crm-store";
import KanbanClient from "@/components/crm/KanbanClient";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const leads = await getLeads();
  return <KanbanClient initialLeads={leads} />;
}
