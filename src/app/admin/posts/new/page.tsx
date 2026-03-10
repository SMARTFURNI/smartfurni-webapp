import { requireAdmin } from "@/lib/admin-auth";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import PostEditor from "@/components/admin/PostEditor";

export const metadata = { title: "Viết bài mới" };

export default async function NewPostPage() {
  await requireAdmin();
  const sidebarStats = getSidebarStats();
  return (
    <div className="flex min-h-screen bg-[#080600]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <AdminHeader title="Viết bài mới" subtitle="Tạo nội dung mới cho blog SmartFurni" />
        <PostEditor mode="create" />
      </main>
    </div>
  );
}
