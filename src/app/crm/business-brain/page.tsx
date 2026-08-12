import { requireCrmAccess } from "@/lib/admin-auth";
import { BusinessBrainClient } from "@/components/crm/business-brain/BusinessBrainClient";

export const metadata = {
  title: "Bộ não doanh nghiệp — SmartFurni CRM",
  description: "Thư viện tài liệu, hướng dẫn và sơ đồ vận hành có thể chỉnh sửa của SmartFurni",
};

export default async function BusinessBrainPage() {
  await requireCrmAccess();

  return <BusinessBrainClient />;
}
