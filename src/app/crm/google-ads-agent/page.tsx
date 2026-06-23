import { requireCrmAccess } from "@/lib/admin-auth";
import { getStaffById } from "@/lib/crm-staff-store";
import { canAccessGoogleAdsAgent } from "@/lib/google-ads-agent/validation";
import GoogleAdsAgentClient from "@/components/crm/google-ads-agent/GoogleAdsAgentClient";

export const metadata = {
  title: "AI Google Ads Agent — SmartFurni CRM",
};

export default async function GoogleAdsAgentPage() {
  const session = await requireCrmAccess();
  const staff = !session.isAdmin && session.staffId ? await getStaffById(session.staffId) : null;
  const allowed = canAccessGoogleAdsAgent({ isAdmin: session.isAdmin, staffRole: staff?.role ?? session.staffRole });

  if (!allowed) {
    return (
      <div className="p-6 text-center text-white">
        <h1 className="text-2xl font-bold text-red-400">Không có quyền truy cập</h1>
        <p className="mt-2 text-white/60">Module này chỉ dành cho admin hoặc marketing manager.</p>
      </div>
    );
  }

  return <GoogleAdsAgentClient />;
}
