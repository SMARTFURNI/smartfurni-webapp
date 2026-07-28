import "server-only";

import { getCrmSession } from "./admin-auth";
import { getRoleById, type RolePermissions } from "./crm-roles-store";
import { getStaffById } from "./crm-staff-store";

export type FacebookGroupPermission = Extract<keyof RolePermissions, `facebook_group_${string}`>;

export async function authorizeFacebookGroupMarketing(permission: FacebookGroupPermission) {
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
