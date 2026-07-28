import { redirect } from "next/navigation";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getRoleById } from "@/lib/crm-roles-store";
import { getStaffById } from "@/lib/crm-staff-store";
import FacebookGroupMarketingClient from "@/components/crm/facebook-group-marketing/FacebookGroupMarketingClient";

export default async function FacebookGroupMarketingPage() {
  const session = await requireCrmAccess();
  let permissions = null;
  if (!session.isAdmin && session.staffId) {
    const staff = await getStaffById(session.staffId);
    permissions = (await getRoleById(staff?.role || session.staffRole || ""))?.permissions || null;
    if (!permissions?.facebook_group_marketing_view) redirect("/crm");
  }
  return <FacebookGroupMarketingClient section="overview" permissions={{
    manage: session.isAdmin || !!permissions?.facebook_group_manage,
    campaigns: session.isAdmin || !!permissions?.facebook_group_campaign_manage,
    content: session.isAdmin || !!permissions?.facebook_group_content_create,
    approve: session.isAdmin || !!permissions?.facebook_group_content_approve,
    schedule: session.isAdmin || !!permissions?.facebook_group_schedule,
    publish: session.isAdmin || !!permissions?.facebook_group_publish_task,
    sales: session.isAdmin || !!permissions?.facebook_group_sales,
    reports: session.isAdmin || !!permissions?.facebook_group_reports,
    settings: session.isAdmin || !!permissions?.facebook_group_settings,
  }} />;
}

