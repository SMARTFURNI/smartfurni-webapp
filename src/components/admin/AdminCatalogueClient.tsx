"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Catalogue } from "@/lib/catalogue-store";

interface Props {
  initialCatalogues: Catalogue[];
}

export default function AdminCatalogueClient({ initialCatalogues }: Props) {
  const router = useRouter();
  const [catalogues, setCatalogues] = useState<Catalogue[]>(initialCatalogues);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-catalogue",
          title: newTitle.trim(),
          description: newDesc.trim(),
          status: "draft",
        }),
      });
      if (res.ok) {
        const cat = await res.json();
        setCatalogues(prev => [cat, ...prev]);
        setCreating(false);
        setNewTitle("");
        setNewDesc("");
        // Navigate to editor
        router.push(`/admin/catalogue/${cat.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Xóa catalogue "${title}"? Tất cả trang trong catalogue sẽ bị xóa.`)) return;
    setDeletingId(id);
    try {
      await fetch("/api/admin/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-catalogue", id }),
      });
      setCatalogues(prev => prev.filter(c => c.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleStatus(cat: Catalogue) {
    const newStatus = cat.status === "published" ? "draft" : "published";
    await fetch("/api/admin/catalogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-catalogue", id: cat.id, status: newStatus }),
    });
    setCatalogues(prev => prev.map(c => c.id === cat.id ? { ...c, status: newStatus } : c));
  }

  return (
    <div className="min-h-screen bg-[#080600] text-white">
      {/* Header */}
      <div className="border-b border-[#C9A84C]/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Catalogue B2B</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Quản lý catalogue lật trang dành cho đối tác B2B
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/catalogue"
              target="_blank"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
            >
              <span>↗</span> Xem trang public
            </a>
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 bg-[#C9A84C] text-black font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#E2C97E] transition-colors"
            >
              <span>+</span> Tạo catalogue mới
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Create modal */}
        {creating && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#111] border border-[#C9A84C]/20 rounded-2xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold text-white mb-4">Tạo catalogue mới</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Tên catalogue *</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="VD: Bộ sưu tập 2025"
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
                    onKeyDown={e => e.key === "Enter" && handleCreate()}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Mô tả (tùy chọn)</label>
                  <textarea
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Mô tả ngắn về catalogue..."
                    rows={2}
                    className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/50 resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => { setCreating(false); setNewTitle(""); setNewDesc(""); }}
                  className="flex-1 border border-white/10 text-gray-400 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || loading}
                  className="flex-1 bg-[#C9A84C] text-black font-bold py-2 rounded-lg hover:bg-[#E2C97E] transition-colors text-sm disabled:opacity-50"
                >
                  {loading ? "Đang tạo..." : "Tạo & Chỉnh sửa"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-[#111] border border-white/5 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{catalogues.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Tổng catalogue</div>
          </div>
          <div className="bg-[#111] border border-white/5 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-400">
              {catalogues.filter(c => c.status === "published").length}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Đã xuất bản</div>
          </div>
          <div className="bg-[#111] border border-white/5 rounded-xl p-4">
            <div className="text-2xl font-bold text-[#C9A84C]">
              {catalogues.reduce((s, c) => s + c.viewCount, 0).toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Tổng lượt xem</div>
          </div>
        </div>

        {/* Catalogue list */}
        {catalogues.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-lg font-semibold text-white mb-2">Chưa có catalogue nào</h2>
            <p className="text-gray-500 text-sm mb-6">Tạo catalogue đầu tiên để bắt đầu</p>
            <button
              onClick={() => setCreating(true)}
              className="bg-[#C9A84C] text-black font-bold px-6 py-2.5 rounded-lg hover:bg-[#E2C97E] transition-colors"
            >
              + Tạo catalogue mới
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {catalogues.map((cat) => (
              <div
                key={cat.id}
                className="bg-[#111] border border-white/5 rounded-xl overflow-hidden hover:border-[#C9A84C]/20 transition-all group"
              >
                {/* Cover */}
                <div className="relative aspect-[3/2] bg-[#1a1a1a] overflow-hidden">
                  {cat.coverImageUrl ? (
                    <img
                      src={cat.coverImageUrl}
                      alt={cat.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl opacity-10">📋</span>
                    </div>
                  )}
                  {/* Status badge */}
                  <div className="absolute top-2 left-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      cat.status === "published"
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                    }`}>
                      {cat.status === "published" ? "● Đã xuất bản" : "○ Bản nháp"}
                    </span>
                  </div>
                  {/* Page count */}
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">
                    {cat.pageCount} trang
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-white text-sm mb-1 line-clamp-1">{cat.title}</h3>
                  {cat.description && (
                    <p className="text-gray-500 text-xs line-clamp-2 mb-3">{cat.description}</p>
                  )}
                  <div className="flex items-center justify-between text-[11px] text-gray-600 mb-3">
                    <span>{cat.viewCount.toLocaleString()} lượt xem</span>
                    <span>{new Date(cat.updatedAt).toLocaleDateString("vi-VN")}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <a
                      href={`/admin/catalogue/${cat.id}`}
                      className="flex-1 bg-[#C9A84C]/10 text-[#C9A84C] text-xs font-medium py-1.5 rounded-lg text-center hover:bg-[#C9A84C]/20 transition-colors border border-[#C9A84C]/20"
                    >
                      ✏️ Chỉnh sửa
                    </a>
                    <button
                      onClick={() => handleToggleStatus(cat)}
                      className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors border ${
                        cat.status === "published"
                          ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                          : "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20"
                      }`}
                    >
                      {cat.status === "published" ? "⏸ Ẩn" : "▶ Xuất bản"}
                    </button>
                    {cat.status === "published" && (
                      <a
                        href={`/catalogue/${cat.id}`}
                        target="_blank"
                        className="w-8 h-8 flex items-center justify-center bg-white/5 text-gray-400 rounded-lg hover:bg-white/10 hover:text-white transition-colors border border-white/5 text-xs"
                        title="Xem trang public"
                      >
                        ↗
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(cat.id, cat.title)}
                      disabled={deletingId === cat.id}
                      className="w-8 h-8 flex items-center justify-center bg-red-500/5 text-red-500/50 rounded-lg hover:bg-red-500/15 hover:text-red-400 transition-colors border border-red-500/10 text-xs"
                      title="Xóa catalogue"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
