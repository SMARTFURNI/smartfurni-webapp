import { redirect } from "next/navigation";
import { getCrmSession } from "@/lib/admin-auth";
import { getStaffById, getAllStaff } from "@/lib/crm-staff-store";
import DataPoolClient from "@/components/crm/DataPoolClient";

export default async function DataPoolPage() {
  const session = await getCrmSession();
  if (!session) redirect("/crm/login");

  const [staff, allStaff] = await Promise.all([
    session.staffId ? getStaffById(session.staffId) : null,
    session.isAdmin ? getAllStaff() : [],
  ]);

  const staffList = allStaff
    .filter(s => s.status === "active")
    .map(s => ({ id: s.id, fullName: s.fullName, role: s.role }));

  return (
    <div className="h-full">
      <DataPoolClient
        isAdmin={session.isAdmin}
        currentStaffId={staff?.id}
        currentStaffName={staff?.fullName}
        staffList={staffList}
      />
    </div>
  );
}
