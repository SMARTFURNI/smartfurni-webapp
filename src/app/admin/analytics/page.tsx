import { requireAdmin } from "@/lib/admin-auth";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AnalyticsClient from "@/components/admin/AnalyticsClient";

export const metadata = { title: "Analytics — SmartFurni Admin" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  await requireAdmin();
  const sidebarStats = getSidebarStats();

  return (
    <div className="flex min-h-screen bg-[#130e00]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 overflow-auto min-w-0">
        <AnalyticsClient />
      </main>
    </div>
  );
}
