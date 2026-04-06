import { requireCrmAccess } from "@/lib/admin-auth";
import { ContentMarketingClient } from "@/components/crm/content-marketing/ContentMarketingClient";

export const metadata = {
  title: "Content Marketing AI — SmartFurni CRM",
  description: "Tạo kịch bản video AI, quản lý kế hoạch content và lịch đăng bài TikTok/Facebook/YouTube",
};

export default async function ContentMarketingPage() {
  // Cả admin và staff đều có thể truy cập
  await requireCrmAccess();

  return (
    <div className="p-6">
      <ContentMarketingClient />
    </div>
  );
}
