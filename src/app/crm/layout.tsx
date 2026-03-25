import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import CrmSidebar from "@/components/crm/CrmSidebar";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCrmAccess();

  let staffRole = "sales";
  let staffName = "";

  if (!session.isAdmin && session.staffId) {
    const staff = await getStaffById(session.staffId);
    staffRole = staff?.role ?? "sales";
    staffName = staff?.fullName ?? "";
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f8f9fb" }}>
      <CrmSidebar
        isAdmin={session.isAdmin}
        staffRole={staffRole}
        staffName={staffName}
      />
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
