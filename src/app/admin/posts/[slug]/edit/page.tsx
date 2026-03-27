import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-auth";
import { getPostById } from "@/lib/admin-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import PostEditor from "@/components/admin/PostEditor";

export const metadata = { title: "Chỉnh sửa bài viết" };

export default async function EditPostPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  const { slug } = await params;
  const post = getPostById(slug);
  if (!post) notFound();
  const sidebarStats = getSidebarStats();
  return (
    <div className="flex min-h-screen bg-[#080600]">
      <AdminSidebar stats={sidebarStats} />
      <main className="flex-1 p-8 overflow-auto min-w-0">
        <AdminHeader title={`Chỉnh sửa: ${post.title}`} subtitle="Cập nhật nội dung bài viết" />
        <PostEditor mode="edit" initialData={post} />
      </main>
    </div>
  );
}
