import { requireCrmAccess } from "@/lib/admin-auth";
import { BusinessBrainClient } from "@/components/crm/business-brain/BusinessBrainClient";

export const metadata = {
  title: "Bộ não doanh nghiệp — SmartFurni CRM",
  description: "Kho tri thức, hồ sơ khách hàng và AI agent vận hành theo quy trình SmartFurni",
};

export default async function BusinessBrainPage() {
  await requireCrmAccess();

  return (
    <div className="p-6">
      <BusinessBrainClient />
    </div>
  );
}
