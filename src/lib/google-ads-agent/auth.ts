import { getCrmSession } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { canAccessGoogleAdsAgent } from "./validation";

export async function getGoogleAdsAgentSession() {
  const session = await getCrmSession();
  if (!session) return null;
  if (session.isAdmin) return { ...session, actor: "admin", staffRole: "super_admin" };
  const staff = session.staffId ? await getStaffById(session.staffId) : null;
  const staffRole = staff?.role ?? "sales";
  if (!canAccessGoogleAdsAgent({ isAdmin: false, staffRole })) return null;
  return { ...session, staffRole, actor: staff?.fullName ?? session.staffId ?? "staff" };
}
