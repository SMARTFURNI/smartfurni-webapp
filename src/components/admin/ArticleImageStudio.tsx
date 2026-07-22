"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ImageIcon,
  LoaderCircle,
  RefreshCw,
  Save,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import type { BlogArticleImage, BlogArticleImagePlan } from "@/lib/blog-data";

interface ArticleImageStudioProps {
  postSlug: string;
  initialImages?: BlogArticleImage[];
  initialPlan?: BlogArticleImagePlan;
  onBeforeCreatePlan: () => Promise<boolean>;
  onApplied: (result: { coverImage?: string; content?: string }) => void;
}

const STATUS_LABELS: Record<BlogArticleImage["status"], string> = {
  planned: "Chờ tạo",
  generating: "Đang tạo",
  review: "Chờ chọn",
  approved: "Đã duyệt",
  failed: "Có lỗi",
};

export default function ArticleImageStudio({
  postSlug,
  initialImages = [],
  initialPlan,
  onBeforeCreatePlan,
  onApplied,
}: ArticleImageStudioProps) {
  const [images, setImages] = useState<BlogArticleImage[]>(initialImages);
  const [plan, setPlan] = useState<BlogArticleImagePlan | undefined>(initialPlan);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string>("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedCount = useMemo(
    () => images.filter((image) => selected[image.id]).length,
    [images, selected],
  );

  function updateImage(id: string, patch: Partial<BlogArticleImage>) {
    setImages((current) => current.map((image) => image.id === id ? { ...image, ...patch } : image));
  }

  async function createPlan() {
    setError("");
    setMessage("");
    setBusy("plan");
    try {
      const saved = await onBeforeCreatePlan();
      if (!saved) return;
      const response = await fetch(`/api/admin/posts/${postSlug}/image-plan`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tạo brief ảnh");
      setImages(data.images || []);
      setPlan(data.plan);
      setSelected({});
      setMessage("Đã phân tích bài viết và tạo brief cho bộ ảnh.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tạo brief ảnh");
    } finally {
      setBusy("");
    }
  }

  async function saveBriefs() {
    setError("");
    setMessage("");
    setBusy("save");
    try {
      const response = await fetch(`/api/admin/posts/${postSlug}/image-plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể lưu brief");
      setImages(data.images || images);
      setMessage("Đã lưu brief ảnh.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể lưu brief");
    } finally {
      setBusy("");
    }
  }

  async function generate(image: BlogArticleImage) {
    setError("");
    setMessage("");
    setBusy(image.id);
    updateImage(image.id, { status: "generating" });
    try {
      const response = await fetch(`/api/admin/posts/${postSlug}/images/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể tạo ảnh");
      setImages((current) => current.map((item) => item.id === image.id ? data.image : item));
      const firstVariant = data.image?.variants?.[0]?.dataUrl;
      if (firstVariant) setSelected((current) => ({ ...current, [image.id]: firstVariant }));
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : "Không thể tạo ảnh";
      updateImage(image.id, { status: "failed", error: detail });
      setError(detail);
    } finally {
      setBusy("");
    }
  }

  async function approveSelected() {
    const selections = images
      .filter((image) => selected[image.id])
      .map((image) => ({ imageId: image.id, dataUrl: selected[image.id] }));
    if (selections.length === 0) {
      setError("Hãy chọn ít nhất một phương án ảnh trước khi duyệt.");
      return;
    }
    setError("");
    setMessage("");
    setBusy("approve");
    try {
      const response = await fetch(`/api/admin/posts/${postSlug}/images/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Không thể duyệt bộ ảnh");
      setImages(data.images || images);
      setPlan(data.plan || plan);
      setSelected({});
      onApplied({ coverImage: data.coverImage, content: data.content });
      setMessage("Đã lưu ảnh WebP lên kho media, cập nhật ảnh bìa và chèn ảnh nội dung vào bài viết.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể duyệt bộ ảnh");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="rounded-2xl border border-[#C9A84C]/25 bg-[linear-gradient(135deg,rgba(22,29,41,.96),rgba(38,28,15,.94))] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#E6BF55]">
            <WandSparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[.16em]">AI hình ảnh bài viết</span>
          </div>
          <h2 className="mt-2 text-lg font-semibold text-[#F5EDD6]">Tạo và duyệt bộ ảnh theo nội dung</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-[#F5EDD6]/55">
            Hệ thống tạo 1 ảnh bìa và 2–3 ảnh minh họa, mỗi vị trí có 2 phương án để chọn. Bài viết vẫn giữ trạng thái hiện tại và chỉ xuất bản khi bạn chủ động lưu.
          </p>
        </div>
        <button
          type="button"
          onClick={createPlan}
          disabled={Boolean(busy)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#C9A84C] px-4 py-2.5 text-sm font-semibold text-[#0D0B00] transition hover:bg-[#E2C97E] disabled:opacity-50"
        >
          {busy === "plan" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {images.length ? "Phân tích lại bài" : "Tạo bộ brief ảnh"}
        </button>
      </div>

      {plan && (
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#F5EDD6]/60">
          <span className="rounded-full border border-white/10 px-3 py-1">{plan.wordCount.toLocaleString("vi-VN")} từ</span>
          <span className="rounded-full border border-white/10 px-3 py-1">{plan.headingCount} đề mục</span>
          <span className="rounded-full border border-white/10 px-3 py-1">{images.length} vị trí ảnh</span>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
        </div>
      )}
      {message && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />{message}
        </div>
      )}

      {images.length > 0 && (
        <>
          <div className="mt-5 space-y-4">
            {images.map((image) => {
              const isGenerating = busy === image.id;
              const canRegenerate = (image.regenerationCount || 0) < 2;
              const previewAspect = image.aspectRatio === "16:9"
                ? "aspect-video"
                : image.aspectRatio === "4:3"
                  ? "aspect-[4/3]"
                  : "aspect-[3/2]";
              return (
                <article key={image.id} className="overflow-hidden rounded-2xl border border-white/10 bg-[#111722]/85">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/8 text-[#E6BF55]">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#F5EDD6]">
                          {image.role === "cover" ? "Ảnh bìa bài viết" : `Ảnh nội dung ${image.order}`}
                        </h3>
                        <p className="text-xs text-[#F5EDD6]/45">
                          {image.role === "cover" ? "Đầu bài · 16:9" : `${image.sectionTitle || "Cuối bài"} · ${image.aspectRatio}`}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      image.status === "approved"
                        ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-300"
                        : image.status === "failed"
                          ? "border-red-400/25 bg-red-500/10 text-red-300"
                          : "border-[#C9A84C]/20 bg-[#C9A84C]/8 text-[#E6BF55]"
                    }`}>{STATUS_LABELS[image.status]}</span>
                  </div>

                  <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <div className="space-y-3">
                      <label className="block text-[11px] font-semibold uppercase tracking-[.14em] text-[#E6BF55]/75">Prompt tạo ảnh</label>
                      <textarea
                        value={image.prompt}
                        onChange={(event) => updateImage(image.id, { prompt: event.target.value, status: "planned" })}
                        rows={7}
                        className="w-full resize-y rounded-xl border border-white/10 bg-black/15 px-3 py-3 text-sm leading-6 text-[#F5EDD6]/80 outline-none transition focus:border-[#C9A84C]/45"
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-[11px] uppercase tracking-[.12em] text-[#F5EDD6]/45">Alt ảnh</label>
                          <input value={image.alt} onChange={(event) => updateImage(image.id, { alt: event.target.value })} className="w-full rounded-xl border border-white/10 bg-black/15 px-3 py-2.5 text-sm text-[#F5EDD6]/80 outline-none focus:border-[#C9A84C]/45" />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-[11px] uppercase tracking-[.12em] text-[#F5EDD6]/45">Chú thích</label>
                          <input value={image.caption || ""} onChange={(event) => updateImage(image.id, { caption: event.target.value })} className="w-full rounded-xl border border-white/10 bg-black/15 px-3 py-2.5 text-sm text-[#F5EDD6]/80 outline-none focus:border-[#C9A84C]/45" />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => generate(image)} disabled={Boolean(busy) || (!canRegenerate && image.status === "review")} className="inline-flex items-center gap-2 rounded-xl border border-[#C9A84C]/30 px-3 py-2 text-xs font-semibold text-[#E6BF55] transition hover:bg-[#C9A84C]/10 disabled:opacity-40">
                          {isGenerating ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : image.status === "review" ? <RefreshCw className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                          {isGenerating ? "Đang tạo 2 phương án..." : image.status === "review" ? "Tạo lại" : "Tạo 2 phương án"}
                        </button>
                        {(image.regenerationCount || 0) > 0 && <span className="self-center text-xs text-[#F5EDD6]/40">Đã tạo lại {image.regenerationCount}/2 lần</span>}
                      </div>
                      {image.error && <p className="text-xs text-red-300">{image.error}</p>}
                    </div>

                    <div>
                      {image.url && image.status === "approved" ? (
                        <div className="overflow-hidden rounded-xl border border-emerald-400/20 bg-black/20">
                          <img src={image.url} alt={image.alt} className={`${previewAspect} w-full object-cover`} />
                          <div className="flex items-center gap-2 px-3 py-2 text-xs text-emerald-300"><Check className="h-3.5 w-3.5" />Ảnh đã được lưu</div>
                        </div>
                      ) : image.variants?.length ? (
                        <div className="grid grid-cols-2 gap-2">
                          {image.variants.map((variant, index) => {
                            const isSelected = selected[image.id] === variant.dataUrl;
                            return (
                              <button key={variant.id} type="button" onClick={() => setSelected((current) => ({ ...current, [image.id]: variant.dataUrl }))} className={`group relative overflow-hidden rounded-xl border-2 text-left transition ${isSelected ? "border-[#E6BF55]" : "border-white/10 hover:border-[#C9A84C]/45"}`}>
                                <img src={variant.dataUrl} alt={`Phương án ${index + 1}`} className={`${previewAspect} w-full object-cover`} />
                                <span className="absolute bottom-2 left-2 rounded-full bg-black/75 px-2 py-1 text-[10px] text-white">PA {index + 1}</span>
                                {isSelected && <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[#E6BF55] text-black"><Check className="h-3.5 w-3.5" /></span>}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="grid min-h-44 place-items-center rounded-xl border border-dashed border-white/10 bg-black/10 px-6 text-center">
                          <div>
                            {isGenerating ? <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#E6BF55]" /> : <ImageIcon className="mx-auto h-7 w-7 text-[#F5EDD6]/25" />}
                            <p className="mt-2 text-xs leading-5 text-[#F5EDD6]/40">{isGenerating ? "AI đang tạo ảnh xem trước" : "Chưa có phương án xem trước"}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-[#F5EDD6]/45">Ảnh được duyệt sẽ chuyển sang WebP 1200px và lưu thành một commit media. Ảnh nội dung được chèn theo đúng đề mục đã chọn.</p>
            <div className="flex shrink-0 gap-2">
              <button type="button" onClick={saveBriefs} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-white/12 px-3 py-2.5 text-xs font-semibold text-[#F5EDD6]/75 hover:bg-white/5 disabled:opacity-50"><Save className="h-3.5 w-3.5" />Lưu brief</button>
              <button type="button" onClick={approveSelected} disabled={Boolean(busy) || selectedCount === 0} className="inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-4 py-2.5 text-xs font-semibold text-black hover:bg-[#E2C97E] disabled:opacity-45">
                {busy === "approve" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Duyệt ảnh đã chọn ({selectedCount})
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
