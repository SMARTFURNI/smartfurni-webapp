import "server-only";

import { getCrmSession } from "@/lib/admin-auth";
import { getRoleById, type RolePermissions } from "@/lib/crm-roles-store";
import { getStaffById } from "@/lib/crm-staff-store";

export type BusinessBrainPermission = Extract<keyof RolePermissions, `business_brain_${string}`>;

export async function authorizeBusinessBrain(permission: BusinessBrainPermission) {
  const session = await getCrmSession();
  if (!session) return null;
  if (session.isAdmin) {
    return { session, actor: { id: "admin", name: "Admin", isAdmin: true }, permissions: null };
  }
  if (!session.staffId) return null;
  const staff = await getStaffById(session.staffId);
  const role = await getRoleById(staff?.role || session.staffRole || "");
  if (!role?.permissions?.[permission]) return null;
  return {
    session,
    actor: { id: session.staffId, name: staff?.fullName || session.staffId, isAdmin: false },
    permissions: role.permissions,
  };
}
