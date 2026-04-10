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
    <>
      {/* Global print CSS — ẩn sidebar, fix layout khi in */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .crm-root { display: block !important; height: auto !important; overflow: visible !important; }
          .crm-root > aside { display: none !important; }
          .crm-root > main { width: 100% !important; overflow: visible !important; height: auto !important; }
          body, html { overflow: visible !important; height: auto !important; background: #fff !important; }
        }
      `}</style>
      <div className="crm-root flex h-screen overflow-hidden" style={{ background: "#0D0D0F" }}>
        <CrmSidebar
          isAdmin={session.isAdmin}
          staffRole={staffRole}
          staffName={staffName}
          rolePermissions={rolePermissions}
          roleName={roleName}
        />
        <main className="flex-1 overflow-auto min-w-0" style={{ background: "inherit" }}>
          {children}
        </main>
        {/* Real-time notification khi có lead mới vào Data Pool */}
        <DataPoolNotification />
      </div>
    </>
  );
}
