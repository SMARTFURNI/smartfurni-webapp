"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BlogPost, PostStatus } from "@/lib/blog-data";
import { CATEGORIES } from "@/lib/blog-data";
import { PRODUCT_FAMILIES } from "@/lib/product-families";

interface PostEditorProps {
  mode: "create" | "edit";
  initialData?: BlogPost;
}

const STATUS_CONFIG: Record<PostStatus, { label: string; bg: string }> = {
  published: { label: "Đã đăng", bg: "bg-green-500/10 border-green-500/30 text-green-400" },
  draft: { label: "Bản nháp", bg: "bg-gray-500/10 border-gray-500/30 text-[rgba(245,237,214,0.70)]" },
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
    funnelStage: initialData?.funnelStage || "TOFU",
    seoClusterRole: initialData?.seoClusterRole || "supporting",
    pillarKeyword: initialData?.pillarKeyword || "",
    primaryKeyword: initialData?.primaryKeyword || "",
    secondaryKeywords: initialData?.secondaryKeywords?.join(", ") || "",
    searchIntent: initialData?.searchIntent || "",
    metaTitle: initialData?.metaTitle || "",
    metaDescription: initialData?.metaDescription || "",
    sources: initialData?.sources?.map((source) => `${source.title} | ${source.url}`).join("\n") || "",
    reviewerRequired: initialData?.reviewerRequired || false,
    reviewer: initialData?.reviewer || "",
    reviewerRole: initialData?.reviewerRole || "",
    claimReviewStatus: initialData?.claimReviewStatus || "pending",
    aiGenerated: initialData?.aiGenerated || false,
    contentPlanId: initialData?.contentPlanId || "",
    contentPlanItemId: initialData?.contentPlanItemId || "",
    productFamilySlug: initialData?.productRecommendation?.familySlug || PRODUCT_FAMILIES[0].slug,
    productBlockTitle: initialData?.productRecommendation?.title || "Sản phẩm SmartFurni phù hợp",
    productBlockDescription: initialData?.productRecommendation?.description || "Khám phá các lựa chọn phù hợp với nhu cầu vừa được đề cập trong bài viết.",
    productSlugs: initialData?.productRecommendation?.productSlugs.join(", ") || "",
    productCtaLabel: initialData?.productRecommendation?.ctaLabel || "Xem toàn bộ dòng sản phẩm",
    articleCtaEyebrow: initialData?.articleCta?.eyebrow || "Tư vấn từ SmartFurni",
    articleCtaTitle: initialData?.articleCta?.title || "Tìm giải pháp phù hợp với nhu cầu của bạn",
    articleCtaDescription: initialData?.articleCta?.description || "Khám phá sản phẩm hoặc trao đổi với SmartFurni để lựa chọn cấu hình phù hợp.",
    articleCtaPrimaryLabel: initialData?.articleCta?.primaryLabel || "Xem sản phẩm",
    articleCtaSecondaryLabel: initialData?.articleCta?.secondaryLabel || "Liên hệ tư vấn",
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
    if ((form.status === "published" || form.status === "scheduled") && form.aiGenerated && form.claimReviewStatus !== "approved") {
      setError("Bản nháp AI phải được duyệt claim trước khi đăng hoặc lên lịch.");
      return;
    }
    if ((form.status === "published" || form.status === "scheduled") && form.reviewerRequired && !form.reviewer.trim()) {
      setError("Nội dung này yêu cầu nhập người kiểm duyệt trước khi xuất bản.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        secondaryKeywords: form.secondaryKeywords.split(",").map((t) => t.trim()).filter(Boolean),
        sources: form.sources.split("\n").map((line) => {
          const [title, ...urlParts] = line.split("|");
          return { title: title?.trim(), url: urlParts.join("|").trim() };
        }).filter((source) => source.title && source.url),
        categoryLabel: CATEGORIES[form.category].label,
        publishedAt: new Date(form.publishedAt).toISOString(),
        scheduledAt:
          form.status === "scheduled" && form.scheduledAt
            ? new Date(form.scheduledAt).toISOString()
            : undefined,
        productRecommendation: {
          familySlug: form.productFamilySlug,
          title: form.productBlockTitle,
          description: form.productBlockDescription,
          productSlugs: form.productSlugs.split(",").map((slug) => slug.trim()).filter(Boolean),
          ctaLabel: form.productCtaLabel,
          ctaHref: `/products/${form.productFamilySlug}`,
        },
        articleCta: {
          eyebrow: form.articleCtaEyebrow,
          title: form.articleCtaTitle,
          description: form.articleCtaDescription,
          primaryLabel: form.articleCtaPrimaryLabel,
          primaryHref: `/products/${form.productFamilySlug}`,
          secondaryLabel: form.articleCtaSecondaryLabel,
          secondaryHref: "/contact",
        },
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
          <Link href="/admin/posts" className="text-[rgba(245,237,214,0.55)] hover:text-white transition-colors text-sm">
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
            className="text-sm text-[rgba(245,237,214,0.70)] hover:text-white border border-gray-700 px-4 py-2 rounded-xl transition-colors"
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
        <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-8 max-w-3xl">
          {form.coverImage && (
            <img src={form.coverImage} alt="Cover" className="w-full h-56 object-cover rounded-xl mb-6" />
          )}
          <h1 className="text-3xl font-bold text-white mb-4">{form.title || "Tiêu đề bài viết"}</h1>
          <p className="text-[rgba(245,237,214,0.70)] text-lg mb-6 border-l-4 border-[#C9A84C] pl-4">{form.excerpt}</p>
          <div className="text-sm text-[rgba(245,237,214,0.55)] mb-8">
            {form.author} · {form.authorRole} · {form.readTime} phút đọc
          </div>
          <div className="prose prose-invert max-w-none">
            {form.content.split("\n\n").map((block, i) => {
              if (block.trim() === "[[SMARTFURNI_PRODUCTS]]")
                return (
                  <div key={i} className="my-6 rounded-2xl border border-[#C9A84C]/25 bg-[linear-gradient(135deg,rgba(31,35,44,.98),rgba(39,28,12,.96))] p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#E6BF55]">SmartFurni gợi ý</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#F5EDD6]">{form.productBlockTitle}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#F5EDD6]/55">{form.productBlockDescription}</p>
                    <div className="mt-4 rounded-xl bg-[#C9A84C] px-4 py-2.5 text-center text-sm font-semibold text-black">{form.productCtaLabel} →</div>
                  </div>
                );
              if (block.trim() === "[[SMARTFURNI_CTA]]")
                return (
                  <div key={i} className="my-6 rounded-2xl border border-[#C9A84C]/25 bg-[#1A1600]/90 p-5 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#E6BF55]">{form.articleCtaEyebrow}</p>
                    <h2 className="mt-2 text-xl font-semibold text-[#F5EDD6]">{form.articleCtaTitle}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#F5EDD6]/55">{form.articleCtaDescription}</p>
                  </div>
                );
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
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6">
              <label className="block text-xs text-[#C9A84C]/70 mb-3 uppercase tracking-wider">
                Ảnh bìa bài viết
              </label>
              <div
                className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer ${
                  uploadingImage
                    ? "border-[#C9A84C]/40 bg-[#C9A84C]/5"
                    : "border-[rgba(255,200,100,0.18)] hover:border-[#C9A84C]/35"
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
                        <p className="text-sm text-[rgba(245,237,214,0.55)]">Đang tải lên...</p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl">🖼️</span>
                        <p className="text-sm text-[rgba(245,237,214,0.70)]">Kéo thả hoặc click để chọn ảnh</p>
                        <p className="text-xs text-[rgba(245,237,214,0.45)]">JPG, PNG, WebP · Tối đa 5MB</p>
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
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>
            </div>

            {/* Title / Slug / Excerpt */}
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-xs text-[#C9A84C]/70 mb-2 uppercase tracking-wider">
                  Tiêu đề *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Nhập tiêu đề bài viết..."
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-3 text-white text-lg placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40 transition-colors"
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
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-3 text-[rgba(245,237,214,0.70)] text-sm font-mono placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40 transition-colors"
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
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-3 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Content */}
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6">
              <label className="block text-xs text-[#C9A84C]/70 mb-3 uppercase tracking-wider">
                Nội dung * (Markdown)
              </label>
              <div className="text-xs text-[rgba(245,237,214,0.45)] mb-3 flex flex-wrap gap-3">
                <span>## Tiêu đề lớn</span>
                <span>### Tiêu đề nhỏ</span>
                <span>**in đậm**</span>
                <span>*in nghiêng*</span>
                <span>- danh sách</span>
                <button type="button" onClick={() => setForm((p) => ({ ...p, content: `${p.content}\n\n[[SMARTFURNI_PRODUCTS]]` }))} className="rounded-full border border-[#C9A84C]/20 px-2 py-0.5 text-[#C9A84C]">+ Khối sản phẩm</button>
                <button type="button" onClick={() => setForm((p) => ({ ...p, content: `${p.content}\n\n[[SMARTFURNI_CTA]]` }))} className="rounded-full border border-[#C9A84C]/20 px-2 py-0.5 text-[#C9A84C]">+ CTA trong bài</button>
              </div>
              <textarea
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Viết nội dung bài viết bằng Markdown..."
                rows={20}
                className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40 transition-colors resize-y"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Publish Status */}
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-5 space-y-4">
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
                          : "border-[rgba(255,200,100,0.14)] text-[rgba(245,237,214,0.45)] hover:text-[rgba(245,237,214,0.70)]"
                      }`}
                    >
                      {s === "published" ? "✅" : s === "draft" ? "📝" : "🕐"} {cfg.label}
                    </button>
                  );
                })}
              </div>
              {form.status === "scheduled" && (
                <div>
                  <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Ngày giờ lên lịch</label>
                  <input
                    type="datetime-local"
                    value={form.scheduledAt}
                    onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                    className="w-full bg-[#1a1200] border border-blue-500/30 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500/60"
                  />
                  <p className="text-xs text-blue-400/60 mt-1">
                    Bài sẽ tự động xuất bản vào thời điểm này
                  </p>
                </div>
              )}
              {form.status === "draft" && (
                <div className="bg-gray-500/5 border border-gray-500/20 rounded-xl p-3">
                  <p className="text-xs text-[rgba(245,237,214,0.55)]">
                    Bản nháp không hiển thị trên website. Chỉ admin mới xem được.
                  </p>
                </div>
              )}
            </div>

            {/* Post Info */}
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Thông tin bài viết</h3>
              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Chủ đề</label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value as BlogPost["category"] }))
                  }
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                >
                  {Object.entries(CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Tác giả *</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Chức danh tác giả</label>
                <input
                  type="text"
                  value={form.authorRole}
                  onChange={(e) => setForm((p) => ({ ...p, authorRole: e.target.value }))}
                  placeholder="Chuyên gia sức khỏe"
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Thời gian đọc (phút)</label>
                <input
                  type="number"
                  value={form.readTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, readTime: parseInt(e.target.value) || 5 }))
                  }
                  min={1}
                  max={60}
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Ngày đăng</label>
                <input
                  type="date"
                  value={form.publishedAt}
                  onChange={(e) => setForm((p) => ({ ...p, publishedAt: e.target.value }))}
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">
                  Tags (cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
                  placeholder="giấc ngủ, sức khỏe, giường"
                  className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
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
                <span className="text-sm text-[rgba(245,237,214,0.70)]">Bài viết nổi bật ⭐</span>
              </label>
            </div>

            {/* SEO & AI governance */}
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">SEO & Funnel</h3>
                {form.aiGenerated && <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[10px] text-violet-300">AI draft</span>}
              </div>
              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Giai đoạn hành trình</label>
                <select value={form.funnelStage} onChange={(e) => setForm((p) => ({ ...p, funnelStage: e.target.value as "TOFU" | "MOFU" | "BOFU" }))} className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40">
                  <option value="TOFU">TOFU · Nhận biết</option>
                  <option value="MOFU">MOFU · Cân nhắc</option>
                  <option value="BOFU">BOFU · Chuyển đổi</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Vai trò SEO</label>
                  <select value={form.seoClusterRole} onChange={(e) => setForm((p) => ({ ...p, seoClusterRole: e.target.value as "pillar" | "supporting" | "commercial" }))} className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm">
                    <option value="pillar">Pillar</option><option value="supporting">Supporting</option><option value="commercial">Commercial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Từ khóa trụ cột</label>
                  <input value={form.pillarKeyword} onChange={(e) => setForm((p) => ({ ...p, pillarKeyword: e.target.value }))} className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Từ khóa chính</label>
                <input value={form.primaryKeyword} onChange={(e) => setForm((p) => ({ ...p, primaryKeyword: e.target.value }))} className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40" />
              </div>
              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Từ khóa phụ (dấu phẩy)</label>
                <input value={form.secondaryKeywords} onChange={(e) => setForm((p) => ({ ...p, secondaryKeywords: e.target.value }))} className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40" />
              </div>
              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Search intent</label>
                <input value={form.searchIntent} onChange={(e) => setForm((p) => ({ ...p, searchIntent: e.target.value }))} className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40" />
              </div>
              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Meta title <span className="text-[rgba(245,237,214,0.35)]">({form.metaTitle.length}/65)</span></label>
                <input value={form.metaTitle} maxLength={80} onChange={(e) => setForm((p) => ({ ...p, metaTitle: e.target.value }))} className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40" />
              </div>
              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Meta description <span className="text-[rgba(245,237,214,0.35)]">({form.metaDescription.length}/165)</span></label>
                <textarea rows={3} value={form.metaDescription} maxLength={220} onChange={(e) => setForm((p) => ({ ...p, metaDescription: e.target.value }))} className="w-full resize-none bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40" />
              </div>
              <div>
                <label className="block text-xs text-[rgba(245,237,214,0.55)] mb-2">Nguồn tham khảo <span className="text-[rgba(245,237,214,0.35)]">(Tên | URL, mỗi dòng một nguồn)</span></label>
                <textarea rows={4} value={form.sources} onChange={(e) => setForm((p) => ({ ...p, sources: e.target.value }))} className="w-full resize-y bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-none focus:border-[#C9A84C]/40" />
              </div>
            </div>

            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Sản phẩm & CTA trong bài</h3>
                <p className="mt-1 text-[11px] leading-5 text-[rgba(245,237,214,0.4)]">Hiển thị tại marker [[SMARTFURNI_PRODUCTS]] và [[SMARTFURNI_CTA]] trong nội dung.</p>
              </div>
              <select value={form.productFamilySlug} onChange={(e) => setForm((p) => ({ ...p, productFamilySlug: e.target.value }))} className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm">
                {PRODUCT_FAMILIES.map((family) => <option key={family.slug} value={family.slug}>{family.label}</option>)}
              </select>
              <input value={form.productBlockTitle} onChange={(e) => setForm((p) => ({ ...p, productBlockTitle: e.target.value }))} placeholder="Tiêu đề khối sản phẩm" className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm" />
              <textarea rows={3} value={form.productBlockDescription} onChange={(e) => setForm((p) => ({ ...p, productBlockDescription: e.target.value }))} placeholder="Mô tả lý do sản phẩm phù hợp" className="w-full resize-none bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm" />
              <input value={form.productSlugs} onChange={(e) => setForm((p) => ({ ...p, productSlugs: e.target.value }))} placeholder="slug-san-pham-1, slug-san-pham-2" className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-xs font-mono" />
              <input value={form.productCtaLabel} onChange={(e) => setForm((p) => ({ ...p, productCtaLabel: e.target.value }))} placeholder="Nhãn nút xem dòng sản phẩm" className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm" />
              <div className="border-t border-[rgba(255,200,100,0.1)] pt-4 space-y-3">
                <input value={form.articleCtaEyebrow} onChange={(e) => setForm((p) => ({ ...p, articleCtaEyebrow: e.target.value }))} placeholder="Nhãn CTA" className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm" />
                <input value={form.articleCtaTitle} onChange={(e) => setForm((p) => ({ ...p, articleCtaTitle: e.target.value }))} placeholder="Tiêu đề CTA" className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm" />
                <textarea rows={2} value={form.articleCtaDescription} onChange={(e) => setForm((p) => ({ ...p, articleCtaDescription: e.target.value }))} placeholder="Mô tả CTA" className="w-full resize-none bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm" />
                <div className="grid grid-cols-2 gap-2">
                  <input value={form.articleCtaPrimaryLabel} onChange={(e) => setForm((p) => ({ ...p, articleCtaPrimaryLabel: e.target.value }))} placeholder="Nút chính" className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-xs" />
                  <input value={form.articleCtaSecondaryLabel} onChange={(e) => setForm((p) => ({ ...p, articleCtaSecondaryLabel: e.target.value }))} placeholder="Nút phụ" className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-xs" />
                </div>
              </div>
            </div>

            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-white">Kiểm duyệt claim</h3>
              <select value={form.claimReviewStatus} onChange={(e) => setForm((p) => ({ ...p, claimReviewStatus: e.target.value as "pending" | "approved" | "changes_requested" }))} className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40">
                <option value="pending">Chờ kiểm duyệt</option>
                <option value="changes_requested">Cần chỉnh sửa</option>
                <option value="approved">Đã duyệt claim</option>
              </select>
              <label className="flex items-center gap-3 text-sm text-[rgba(245,237,214,0.70)]">
                <input type="checkbox" checked={form.reviewerRequired} onChange={(e) => setForm((p) => ({ ...p, reviewerRequired: e.target.checked }))} className="accent-[#C9A84C]" /> Yêu cầu người có chuyên môn duyệt
              </label>
              {form.reviewerRequired && <>
                <input value={form.reviewer} onChange={(e) => setForm((p) => ({ ...p, reviewer: e.target.value }))} placeholder="Tên người kiểm duyệt" className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40" />
                <input value={form.reviewerRole} onChange={(e) => setForm((p) => ({ ...p, reviewerRole: e.target.value }))} placeholder="Chức danh / chuyên môn" className="w-full bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40" />
              </>}
              {form.aiGenerated && form.claimReviewStatus !== "approved" && <p className="rounded-xl border border-amber-400/15 bg-amber-500/[.05] p-3 text-xs leading-5 text-amber-200">Không thể xuất bản hoặc lên lịch cho đến khi claim được duyệt.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
