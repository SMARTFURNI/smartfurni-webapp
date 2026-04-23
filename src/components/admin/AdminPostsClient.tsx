"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BlogPost, PostStatus } from "@/lib/blog-data";
import { CATEGORIES } from "@/lib/blog-data";

const STATUS_BADGE: Record<PostStatus, { label: string; cls: string }> = {
  published: { label: "Đã đăng", cls: "text-green-400 bg-green-500/10" },
  draft: { label: "Nháp", cls: "text-[rgba(245,237,214,0.70)] bg-gray-500/10" },
  scheduled: { label: "Lên lịch", cls: "text-blue-400 bg-blue-500/10" },
};

export default function AdminPostsClient({ initialPosts }: { initialPosts: BlogPost[] }) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const filtered = posts.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.author.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.category === filter;
    const postStatus = p.status || "published";
    const matchStatus = statusFilter === "all" || postStatus === statusFilter;
    return matchSearch && matchFilter && matchStatus;
  });

  async function handleDelete(slug: string) {
    if (!confirm("Bạn có chắc muốn xóa bài viết này?")) return;
    setDeleting(slug);
    try {
      const res = await fetch(`/api/admin/posts/${slug}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.slug !== slug));
      }
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản Lý Bài Viết</h1>
          <p className="text-[rgba(245,237,214,0.55)] text-sm mt-1">{posts.length} bài viết</p>
        </div>
        <Link
          href="/admin/posts/new"
          className="bg-[#C9A84C] text-[#0D0B00] px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#E2C97E] transition-colors"
        >
          + Bài viết mới
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Tìm kiếm bài viết..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-[#1a1200] border border-[rgba(255,200,100,0.22)] rounded-xl px-4 py-2 text-white text-sm placeholder-[rgba(245,237,214,0.30)] focus:outline-none focus:border-[rgba(255,200,100,0.08)]0 w-64"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-[#1a1200] border border-[rgba(255,200,100,0.22)] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[rgba(255,200,100,0.08)]0"
        >
          <option value="all">Tất cả chủ đề</option>
          {Object.entries(CATEGORIES).map(([key, cat]) => (
            <option key={key} value={key}>{cat.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#1a1200] border border-[rgba(255,200,100,0.22)] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-[rgba(255,200,100,0.08)]0"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="published">✅ Đã đăng</option>
          <option value="draft">📝 Bản nháp</option>
          <option value="scheduled">🕐 Lên lịch</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[rgba(255,200,100,0.14)]">
              <th className="text-left px-6 py-4 text-xs text-[rgba(245,237,214,0.55)] font-medium uppercase tracking-wider">Tiêu đề</th>
              <th className="text-left px-4 py-4 text-xs text-[rgba(245,237,214,0.55)] font-medium uppercase tracking-wider hidden md:table-cell">Chủ đề</th>
              <th className="text-left px-4 py-4 text-xs text-[rgba(245,237,214,0.55)] font-medium uppercase tracking-wider hidden lg:table-cell">Tác giả</th>
              <th className="text-left px-4 py-4 text-xs text-[rgba(245,237,214,0.55)] font-medium uppercase tracking-wider hidden lg:table-cell">Ngày đăng</th>
              <th className="text-left px-4 py-4 text-xs text-[rgba(245,237,214,0.55)] font-medium uppercase tracking-wider hidden xl:table-cell">Trạng thái</th>
              <th className="text-right px-6 py-4 text-xs text-[rgba(245,237,214,0.55)] font-medium uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#C9A84C]/5">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[rgba(245,237,214,0.45)]">
                  Không tìm thấy bài viết nào
                </td>
              </tr>
            ) : (
              filtered.map((post) => {
                const cat = CATEGORIES[post.category];
                return (
                  <tr key={post.slug} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {post.featured && <span className="text-yellow-500 text-xs">⭐</span>}
                        <div>
                          <p className="text-sm text-white font-medium line-clamp-1">{post.title}</p>
                          <p className="text-xs text-[rgba(245,237,214,0.45)] mt-0.5">{post.readTime} phút đọc</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span
                        className="text-xs px-2 py-1 rounded-full"
                        style={{ backgroundColor: cat.color + "15", color: cat.color }}
                      >
                        {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <p className="text-sm text-[rgba(245,237,214,0.70)]">{post.author}</p>
                    </td>
                    <td className="px-4 py-4 hidden lg:table-cell">
                      <p className="text-sm text-[rgba(245,237,214,0.55)]">
                        {new Date(post.publishedAt).toLocaleDateString("vi-VN")}
                      </p>
                    </td>
                    <td className="px-4 py-4 hidden xl:table-cell">
                      {(() => {
                        const s = (post.status || "published") as PostStatus;
                        const badge = STATUS_BADGE[s];
                        return (
                          <span className={`text-xs px-2 py-1 rounded-full ${badge.cls}`}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="text-xs text-[rgba(245,237,214,0.55)] hover:text-gray-300 px-2 py-1 rounded transition-colors"
                        >
                          Xem
                        </Link>
                        <Link
                          href={`/admin/posts/${post.slug}/edit`}
                          className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C] px-2 py-1 rounded transition-colors"
                        >
                          Sửa
                        </Link>
                        <button
                          onClick={() => handleDelete(post.slug)}
                          disabled={deleting === post.slug}
                          className="text-xs text-red-500/50 hover:text-red-400 px-2 py-1 rounded transition-colors disabled:opacity-30"
                        >
                          {deleting === post.slug ? "..." : "Xóa"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
