import { redirect } from "next/navigation";
import { authorizeBusinessBrain } from "@/lib/business-brain-auth";
import { BusinessBrainClient } from "@/components/crm/business-brain/BusinessBrainClient";

export const metadata = {
  title: "Bộ não doanh nghiệp — SmartFurni CRM",
  description: "Thư viện tài liệu, hướng dẫn và sơ đồ vận hành có thể chỉnh sửa của SmartFurni",
};

export default async function BusinessBrainPage() {
  const access = await authorizeBusinessBrain("business_brain_view");
  if (!access) redirect("/crm");

  return <BusinessBrainClient capabilities={{
    canEdit: access.actor.isAdmin || access.permissions?.business_brain_edit === true,
    canReview: access.actor.isAdmin || access.permissions?.business_brain_review === true,
    canPublish: access.actor.isAdmin || access.permissions?.business_brain_publish === true,
    canDelete: access.actor.isAdmin || access.permissions?.business_brain_delete === true,
    canManageAgents: access.actor.isAdmin || access.permissions?.business_brain_agent_manage === true,
  }} />;
}
