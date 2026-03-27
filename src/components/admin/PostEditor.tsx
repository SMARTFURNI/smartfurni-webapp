"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BlogPost, PostStatus } from "@/lib/blog-data";
import { CATEGORIES } from "@/lib/blog-data";

interface PostEditorProps {
  mode: "create" | "edit";
  initialData?: BlogPost;
}

const STATUS_CONFIG: Record<PostStatus, { label: string; bg: string }> = {
  published: { label: "Đã đăng", bg: "bg-green-500/10 border-green-500/30 text-green-400" },
  draft: { label: "Bản nháp", bg: "bg-gray-500/10 border-gray-500/30 text-gray-400" },
  scheduled: { label: "Lên lịch", bg: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
};

export default function PostEditor({ mode, initialData }: PostEditorProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: initialData?.title || "",
    slug: initialData?.slug || "",
    excerpt: initialData?.excerpt || "",
    content: initialData?.content || "",
    author: initialData?.author || "",
    authorRole: initialData?.authorRole || "",
    category: (initialData?.category || "tips-giac-ngu") as BlogPost["category"],
    tags: initialData?.tags?.join(", ") || "",
    readTime: initialData?.readTime || 5,
    featured: initialData?.featured || false,
    status: (initialData?.status || "published") as PostStatus,
    scheduledAt: initialData?.scheduledAt ? initialData.scheduledAt.slice(0, 16) : "",
    coverImage: initialData?.coverImage || "",
    publishedAt: initialData?.publishedAt?.split("T")[0] || new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  function autoSlug(title: string) {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 60);
  }

  function handleTitleChange(title: string) {
    setForm((prev) => ({
      ...prev,
      title,
      slug: mode === "create" ? autoSlug(title) : prev.slug,
    }));
  }

  async function handleImageUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Chỉ chấp nhận file ảnh (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh không được vượt quá 5MB.");
      return;
    }
    setUploadingImage(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload thất bại");
      const data = await res.json();
      setForm((p) => ({ ...p, coverImage: data.url }));
    } catch {
      setError("Lỗi upload ảnh. Vui lòng thử lại.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSave() {
    if (!form.title || !form.content || !form.author) {
      setError("Vui lòng điền đầy đủ Tiêu đề, Nội dung và Tác giả.");
      return;
    }
    if (form.status === "scheduled" && !form.scheduledAt) {
      setError("Vui lòng chọn ngày giờ lên lịch đăng bài.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        categoryLabel: CATEGORIES[form.category].label,
        publishedAt: new Date(form.publishedAt).toISOString(),
        scheduledAt:
          form.status === "scheduled" && form.scheduledAt
            ? new Date(form.scheduledAt).toISOString()
            : undefined,
      };
      const url =
        mode === "create" ? "/api/admin/posts" : `/api/admin/posts/${initialData?.slug}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Lưu thất bại");
      router.push("/admin/posts");
      router.refresh();
    } catch {
      setError("Lỗi khi lưu bài viết. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  const statusCfg = STATUS_CONFIG[form.status];
  const saveLabel = saving
    ? "Đang lưu..."
    : form.status === "draft"
    ? "Lưu nháp"
    : form.status === "scheduled"
    ? "Lên lịch"
    : mode === "create"
    ? "Đăng bài"
    : "Lưu thay đổi";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/posts" className="text-gray-500 hover:text-white transition-colors text-sm">
            ← Quay lại
          </Link>
          <h1 className="text-xl font-bold text-white">
            {mode === "create" ? "Bài Viết Mới" : "Chỉnh Sửa Bài Viết"}
          </h1>
          <span className={`text-xs px-2.5 py-1 rounded-full border ${statusCfg.bg}`}>
            {statusCfg.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreview(!preview)}
            className="text-sm text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded-xl transition-colors"
          >
            {preview ? "✏️ Soạn thảo" : "👁 Xem trước"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#C9A84C] text-[#0D0B00] px-5 py-2 rounded-xl font-semibold text-sm hover:bg-[#E2C97E] transition-colors disabled:opacity-50"
          >
            {saveLabel}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {preview ? (
        <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-8 max-w-3xl">
          {form.coverImage && (
            <img src={form.coverImage} alt="Cover" className="w-full h-56 object-cover rounded-xl mb-6" />
          )}
          <h1 className="text-3xl font-bold text-white mb-4">{form.title || "Tiêu đề bài viết"}</h1>
          <p className="text-gray-400 text-lg mb-6 border-l-4 border-[#C9A84C] pl-4">{form.excerpt}</p>
          <div className="text-sm text-gray-500 mb-8">
            {form.author} · {form.authorRole} · {form.readTime} phút đọc
          </div>
          <div className="prose prose-invert max-w-none">
            {form.content.split("\n\n").map((block, i) => {
              if (block.startsWith("## "))
                return (
                  <h2 key={i} className="text-2xl font-bold text-[#C9A84C] mt-8 mb-3">
                    {block.replace("## ", "")}
                  </h2>
                );
              if (block.startsWith("### "))
                return (
                  <h3 key={i} className="text-xl font-semibold text-white mt-6 mb-2">
                    {block.replace("### ", "")}
                  </h3>
                );
              return (
                <p key={i} className="text-gray-300 leading-relaxed mb-4">
                  {block}
                </p>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Cover Image Upload */}
            <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
              <label className="block text-xs text-[#C9A84C]/70 mb-3 uppercase tracking-wider">
                Ảnh bìa bài viết
              </label>
              <div
                className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
                  uploadingImage
                    ? "border-[#C9A84C]/40 bg-[#C9A84C]/5"
                    : "border-[#C9A84C]/15 hover:border-[#C9A84C]/35"
                }`}
                onClick={() => !uploadingImage && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleImageUpload(file);
                }}
              >
                {form.coverImage ? (
                  <div className="relative">
                    <img
                      src={form.coverImage}
                      alt="Cover preview"
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm((p) => ({ ...p, coverImage: "" }));
                      }}
                      className="absolute top-2 right-2 bg-black/70 text-white w-7 h-7 rounded-full text-sm hover:bg-red-500/80 transition-colors"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
                      Click để thay đổi
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    {uploadingImage ? (
                      <>
                        <div className="w-8 h-8 border-2 border-[#C9A84C]/40 border-t-[#C9A84C] rounded-full animate-spin" />
                        <p className="text-sm text-gray-500">Đang tải lên...</p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl">🖼️</span>
                        <p className="text-sm text-gray-400">Kéo thả hoặc click để chọn ảnh</p>
                        <p className="text-xs text-gray-600">JPG, PNG, WebP · Tối đa 5MB</p>
                      </>
                    )}
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageUpload(f);
                }}
              />
              <div className="mt-3">
                <input
                  type="url"
                  value={form.coverImage}
                  onChange={(e) => setForm((p) => ({ ...p, coverImage: e.target.value }))}
                  placeholder="Hoặc dán URL ảnh trực tiếp..."
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 rounded-xl px-4 py-2 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>
            </div>

            {/* Title / Slug / Excerpt */}
            <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-xs text-[#C9A84C]/70 mb-2 uppercase tracking-wider">
                  Tiêu đề *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Nhập tiêu đề bài viết..."
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 rounded-xl px-4 py-3 text-white text-lg placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[#C9A84C]/70 mb-2 uppercase tracking-wider">
                  Slug URL
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                  placeholder="ten-bai-viet"
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 rounded-xl px-4 py-3 text-gray-400 text-sm font-mono placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-[#C9A84C]/70 mb-2 uppercase tracking-wider">
                  Tóm tắt
                </label>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
                  placeholder="Mô tả ngắn về bài viết (hiển thị trong danh sách)..."
                  rows={2}
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Content */}
            <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
              <label className="block text-xs text-[#C9A84C]/70 mb-3 uppercase tracking-wider">
                Nội dung * (Markdown)
              </label>
              <div className="text-xs text-gray-600 mb-3 flex flex-wrap gap-3">
                <span>## Tiêu đề lớn</span>
                <span>### Tiêu đề nhỏ</span>
                <span>**in đậm**</span>
                <span>*in nghiêng*</span>
                <span>- danh sách</span>
              </div>
              <textarea
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Viết nội dung bài viết bằng Markdown..."
                rows={20}
                className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40 transition-colors resize-y"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Publish Status */}
            <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Trạng thái xuất bản</h3>
              <div className="grid grid-cols-3 gap-2">
                {(["published", "draft", "scheduled"] as PostStatus[]).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => setForm((p) => ({ ...p, status: s }))}
                      className={`text-xs py-2 px-1 rounded-xl border transition-all ${
                        form.status === s
                          ? cfg.bg
                          : "border-[#C9A84C]/10 text-gray-600 hover:text-gray-400"
                      }`}
                    >
                      {s === "published" ? "✅" : s === "draft" ? "📝" : "🕐"} {cfg.label}
                    </button>
                  );
                })}
              </div>
              {form.status === "scheduled" && (
                <div>
                  <label className="block text-xs text-gray-500 mb-2">Ngày giờ lên lịch</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                    className="w-full bg-[#0D0B00] border border-blue-500/30 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/60"
                  />
                  <p className="text-xs text-blue-400/60 mt-1">
                    Bài sẽ tự động xuất bản vào thời điểm này
                  </p>
                </div>
              )}
              {form.status === "draft" && (
                <div className="bg-gray-500/5 border border-gray-500/20 rounded-xl p-3">
                  <p className="text-xs text-gray-500">
                    Bản nháp không hiển thị trên website. Chỉ admin mới xem được.
                  </p>
                </div>
              )}
            </div>

            {/* Post Info */}
            <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Thông tin bài viết</h3>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Chủ đề</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value as BlogPost["category"] }))
                  }
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                >
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Tác giả *</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Chức danh tác giả</label>
                <input
                  type="text"
                  value={form.authorRole}
                  onChange={(e) => setForm((p) => ({ ...p, authorRole: e.target.value }))}
                  placeholder="Chuyên gia sức khỏe"
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Thời gian đọc (phút)</label>
                <input
                  type="number"
                  value={form.readTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, readTime: parseInt(e.target.value) || 5 }))
                  }
                  min={1}
                  max={60}
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">Ngày đăng</label>
                <input
                  type="date"
                  value={form.publishedAt}
                  onChange={(e) => setForm((p) => ({ ...p, publishedAt: e.target.value }))}
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2">
                  Tags (cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="giấc ngủ, sức khỏe, giường"
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => setForm((p) => ({ ...p, featured: !p.featured }))}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    form.featured ? "bg-[#C9A84C]" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full mt-1 transition-transform ${
                      form.featured ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </div>
                <span className="text-sm text-gray-400">Bài viết nổi bật ⭐</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
