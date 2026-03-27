import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { redirect } from "next/navigation";
import StaffProfileClient from "@/components/crm/StaffProfileClient";

export const dynamic = "force-dynamic";

export default async function StaffProfilePage() {
  const session = await requireCrmAccess();

  // Admin không dùng trang này
  if (session.isAdmin) {
    redirect("/crm");
  }

  if (!session.staffId) {
    redirect("/crm-login");
  }

  const staff = await getStaffById(session.staffId);
  if (!staff) redirect("/crm-login");

  return <StaffProfileClient staff={staff} />;
}
