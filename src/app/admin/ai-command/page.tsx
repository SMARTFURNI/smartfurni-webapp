import { requireAdmin } from "@/lib/admin-auth";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AiCommandClient from "@/components/ai-command/AiCommandClient";

export const metadata = { title: "Trợ lý Điều hành AI" };
export const dynamic = "force-dynamic";

export default async function AdminAiCommandPage() {
  await requireAdmin();
  return <div className="flex min-h-screen"><AdminSidebar stats={getSidebarStats()} /><main className="min-w-0 flex-1 overflow-auto"><AiCommandClient surface="admin" initialAccess={{ canApprove: true, actor: { id: "admin", name: "Quản trị viên", kind: "admin" } }} /></main></div>;
}
