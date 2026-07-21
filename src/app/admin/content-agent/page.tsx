import { requireAdmin } from "@/lib/admin-auth";
import { initDbOnce } from "@/lib/db-init";
import { getContentPlans } from "@/lib/content-agent-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import ContentAgentClient from "@/components/admin/ContentAgentClient";

export const metadata = { title: "AI Content Agent" };

export default async function ContentAgentPage() {
  await requireAdmin();
  await initDbOnce();
  const plans = getContentPlans();
  const sidebarStats = getSidebarStats();

  return (
    <div className="sf-admin-shell flex min-h-screen bg-[#130e00]">
      <AdminSidebar stats={sidebarStats} />
      <main className="min-w-0 flex-1 overflow-auto p-4 md:p-8">
        <AdminHeader
          title="AI Content Agent"
          subtitle="Lập kế hoạch và tạo bản nháp TOFU–MOFU–BOFU có kiểm duyệt"
        />
        <ContentAgentClient initialPlans={plans} />
      </main>
    </div>
  );
}
