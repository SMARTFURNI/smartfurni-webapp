export const dynamic = "force-dynamic";
import { requireSuperAdminCrm } from "@/lib/admin-auth";
import { getAllStaff } from "@/lib/crm-staff-store";
import StaffManagementClient from "@/components/crm/staff/StaffManagementClient";

export default async function CrmStaffPage() {
  await requireSuperAdminCrm();
  const staff = await getAllStaff();
  return <StaffManagementClient initialStaff={staff} />;
}
