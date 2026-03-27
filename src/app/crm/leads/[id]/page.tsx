import { notFound } from "next/navigation";
import { getLead, getActivities, getQuotes, getTasks } from "@/lib/crm-store";
import { getCrmSession } from "@/lib/admin-auth";
import { getAllStaff, getStaffById } from "@/lib/crm-staff-store";
import LeadDetailClient from "@/components/crm/LeadDetailClient";

export const dynamic = "force-dynamic";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [lead, activities, quotes, tasks, session, allStaff] = await Promise.all([
    getLead(id),
    getActivities(id),
    getQuotes(id),
    getTasks({ leadId: id }),
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

  return (
    <LeadDetailClient
      lead={lead}
      initialActivities={activities}
      initialQuotes={quotes}
      initialTasks={tasks}
      isAdmin={session?.isAdmin ?? false}
      currentUserName={currentUserName}
      staffList={staffList}
    />
  );
}
