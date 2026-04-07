import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { getRoleById } from "@/lib/crm-roles-store";
import type { RolePermissions } from "@/lib/crm-roles-store";
import CrmSidebar from "@/components/crm/CrmSidebar";
import DataPoolNotification from "@/components/crm/DataPoolNotification";
export const dynamic = "force-dynamic";

export default async function CrmLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCrmAccess();
  let staffRole = session.staffRole ?? "sales";
  let staffName = "";
  let rolePermissions: RolePermissions | null = null;
  let roleName: string | undefined;

  // Lấy thông tin nhân viên và permissions từ DB
  if (!session.isAdmin && session.staffId) {
    const staff = await getStaffById(session.staffId);
    staffRole = staff?.role ?? staffRole;
    staffName = staff?.fullName ?? "";

    // Load permissions từ bảng crm_custom_roles theo role ID
    if (staffRole) {
      const roleData = await getRoleById(staffRole);
      if (roleData) {
        rolePermissions = roleData.permissions;
        roleName = roleData.name;
      }
    }
  }

  return (
    <div className="crm-root flex h-screen overflow-hidden" style={{ background: "#f8f9fb" }}>
      <CrmSidebar
        isAdmin={session.isAdmin}
        staffRole={staffRole}
        staffName={staffName}
        rolePermissions={rolePermissions}
        roleName={roleName}
      />
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
      {/* Real-time notification khi có lead mới vào Data Pool */}
      <DataPoolNotification />
    </div>
  );
}
