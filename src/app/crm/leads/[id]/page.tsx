import { notFound } from "next/navigation";
import { getLead, getActivities, getQuotes, getTasks } from "@/lib/crm-store";
import { getCrmSession } from "@/lib/admin-auth";
import { getAllStaff, getStaffById } from "@/lib/crm-staff-store";
import { getFacebookGroupLeadSources } from "@/lib/facebook-group-marketing-store";
import LeadDetailClient from "@/components/crm/LeadDetailClient";
import { getNewLeadCallGate } from "@/lib/crm-new-lead-call-policy";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead, activities, quotes, tasks, facebookGroupSources, session, allStaff] = await Promise.all([
    getLead(id),
    getActivities(id),
    getQuotes(id),
    getTasks({ leadId: id }),
    getFacebookGroupLeadSources(id),
    getCrmSession(),
    getAllStaff(),
  ]);
  // Lấy tên nhân viên đang đăng nhập
  let currentUserName = "";
  if (session && !session.isAdmin && session.staffId) {
    const staff = await getStaffById(session.staffId);
    currentUserName = staff?.fullName || "";
  }
  const staffList = allStaff.map(s => ({ id: s.id, fullName: s.fullName }));

  if (!lead) notFound();
  const initialCallGate = await getNewLeadCallGate(lead);

  return (
    <LeadDetailClient
      lead={lead}
      initialActivities={activities}
      initialQuotes={quotes}
      initialTasks={tasks}
      facebookGroupSources={facebookGroupSources}
      isAdmin={session?.isAdmin ?? false}
      currentUserName={currentUserName}
      staffList={staffList}
      initialCallGate={initialCallGate}
    />
  );
}
