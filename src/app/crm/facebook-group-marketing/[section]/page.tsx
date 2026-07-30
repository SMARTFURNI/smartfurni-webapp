import { notFound, redirect } from "next/navigation";
import { requireCrmAccess } from "@/lib/admin-auth";
import { getRoleById } from "@/lib/crm-roles-store";
import { getStaffById } from "@/lib/crm-staff-store";
import FacebookGroupMarketingClient from "@/components/crm/facebook-group-marketing/FacebookGroupMarketingClient";

const allowed = new Set([
  "groups", "builder", "campaigns", "content", "calendar", "tasks", "posts",
  "comments", "leads", "reports", "settings",
]);

export default async function FacebookGroupMarketingSectionPage({
  params,
}: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!allowed.has(section)) notFound();
  const session = await requireCrmAccess();
  let permissions = null;
  if (!session.isAdmin && session.staffId) {
    const staff = await getStaffById(session.staffId);
    permissions = (await getRoleById(staff?.role || session.staffRole || ""))?.permissions || null;
    if (!permissions?.facebook_group_marketing_view) redirect("/crm");
    if (section === "reports" && !permissions.facebook_group_reports) redirect("/crm/facebook-group-marketing");
    if (section === "settings" && !permissions.facebook_group_settings) redirect("/crm/facebook-group-marketing");
    if (section === "leads" && !permissions.facebook_group_sales) redirect("/crm/facebook-group-marketing");
    if (section === "builder" && !permissions.facebook_group_manage) redirect("/crm/facebook-group-marketing");
  }
  return <FacebookGroupMarketingClient section={section} permissions={{
    admin: session.isAdmin,
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
