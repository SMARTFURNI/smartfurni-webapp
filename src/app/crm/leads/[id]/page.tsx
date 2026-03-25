import { notFound } from "next/navigation";
import { getLead, getActivities, getQuotes, getTasks } from "@/lib/crm-store";
import LeadDetailClient from "@/components/crm/LeadDetailClient";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead, activities, quotes, tasks] = await Promise.all([
    getLead(id),
    getActivities(id),
    getQuotes(id),
    getTasks({ leadId: id }),
  ]);

  if (!lead) notFound();

  return (
    <LeadDetailClient
      lead={lead}
      initialActivities={activities}
      initialQuotes={quotes}
      initialTasks={tasks}
    />
  );
}
