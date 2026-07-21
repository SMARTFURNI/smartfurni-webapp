import { requireAdmin } from "@/lib/admin-auth";
import { getAllPosts } from "@/lib/admin-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import { initDbOnce } from "@/lib/db-init";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminPostsClient from "@/components/admin/AdminPostsClient";
import { getBlogPostAnalyticsSummaries, initAnalyticsTables } from "@/lib/analytics-store";

export const metadata = { title: "Bài viết" };

export default async function AdminPostsPage() {
  await requireAdmin();
  await initDbOnce();
  const posts = getAllPosts();
  await initAnalyticsTables();
  const analytics = await getBlogPostAnalyticsSummaries(posts.map((post) => post.slug));
  const sidebarStats = getSidebarStats();

  return (
    <div className="flex min-h-screen bg-[#130e00]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <AdminHeader title="Quản lý Bài viết" subtitle={`${posts.length} bài viết trong hệ thống`} />
        <AdminPostsClient initialPosts={posts} initialAnalytics={analytics} />
      </main>
    </div>
  );
}
