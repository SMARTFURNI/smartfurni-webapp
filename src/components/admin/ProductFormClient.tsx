"use client";
import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Product, ProductCategory, ProductStatus, ProductVariant } from "@/lib/product-store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantDraft {
  id: string;
  name: string;
  sku: string;
  stock: number;
}

interface SpecEntry {
  key: string;
  value: string;
}

interface FormState {
  name: string;
  category: ProductCategory;
  status: ProductStatus;
  description: string;
  price: string;
  originalPrice: string;
  cost: string;
  coverImage: string;
  isFeatured: boolean;
  features: string[];
  specs: SpecEntry[];
  variants: VariantDraft[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function parseNumber(val: string): number {
  return parseInt(val.replace(/[^0-9]/g, ""), 10) || 0;
}

function formatNumberInput(val: string): string {
  const n = val.replace(/[^0-9]/g, "");
  if (!n) return "";
  return parseInt(n, 10).toLocaleString("vi-VN");
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-wider mb-5">{title}</h2>
      {children}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1.5 font-medium">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-700 mt-1">{hint}</p>}
    </div>
  );
}

const inputClass = "w-full bg-[#0D0B00] border border-[#C9A84C]/15 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40 transition-colors";
const selectClass = "w-full bg-[#0D0B00] border border-[#C9A84C]/15 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40 transition-colors";

// ─── Image Gallery Component ──────────────────────────────────────────────────
function ProductImageGallery({
  productId,
  initialImages,
  initialCover,
  onImagesChange,
}: {
  productId?: string;
  initialImages: string[];
  initialCover: string;
  onImagesChange: (images: string[], cover: string) => void;
}) {
  const [images, setImages] = useState<string[]>(initialImages);
  const [cover, setCover] = useState<string>(initialCover);
  const [uploading, setUploading] = useState(false);
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImageError(idx: number) {
    setBrokenImages((prev) => new Set(prev).add(idx));
  }

  async function uploadFile(file: File) {
    if (!productId) {
      // For new products, use the blog upload endpoint temporarily
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        return url as string;
      }
      throw new Error("Upload failed");
    }

    const fd = new FormData();
    fd.append("file", file);
    fd.append("productId", productId);
    const res = await fetch("/api/admin/products-mgmt/images", { method: "POST", body: fd });
    if (res.ok) {
      const data = await res.json();
      return data.url as string;
    }
    throw new Error("Upload failed");
  }

  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!fileArray.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of fileArray) {
        const url = await uploadFile(file);
        urls.push(url);
      }
      const newImages = [...images, ...urls];
      const newCover = cover || newImages[0] || "";
      setImages(newImages);
      setCover(newCover);
      onImagesChange(newImages, newCover);
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteImage(idx: number) {
    const imageUrl = images[idx];
    setDeletingIdx(idx);
    try {
      if (productId) {
        await fetch("/api/admin/products-mgmt/images", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, imageUrl }),
        });
      }
      const newImages = images.filter((_, i) => i !== idx);
      const newCover = cover === imageUrl ? (newImages[0] || "") : cover;
      setImages(newImages);
      setCover(newCover);
      onImagesChange(newImages, newCover);
    } finally {
      setDeletingIdx(null);
    }
  }

  async function handleSetCover(imageUrl: string) {
    if (productId) {
      await fetch("/api/admin/products-mgmt/images", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, imageUrl }),
      });
    }
    setCover(imageUrl);
    onImagesChange(images, imageUrl);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center w-full h-28 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
          dragOver
            ? "border-[#C9A84C] bg-[#C9A84C]/5"
            : "border-[#C9A84C]/20 hover:border-[#C9A84C]/40 bg-[#0D0B00]/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          className="hidden"
          disabled={uploading}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <span className="text-xl animate-spin">↻</span>
            <span className="text-xs text-[#C9A84C] animate-pulse">Đang tải lên...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 pointer-events-none">
            <span className="text-2xl">📸</span>
            <span className="text-xs text-gray-400 font-medium">
              {dragOver ? "Thả ảnh vào đây" : "Click hoặc kéo thả ảnh vào đây"}
            </span>
            <span className="text-xs text-gray-700">JPG, PNG, WebP, AVIF · Tối đa 10MB · Nhiều ảnh cùng lúc</span>
          </div>
        )}
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-[#0D0B00]/60 border border-[#C9A84C]/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {brokenImages.has(idx) ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a1500]/80 gap-1">
                  <span className="text-2xl opacity-40">🖼️</span>
                  <span className="text-[9px] text-gray-600 text-center px-1">Ảnh không tồn tại</span>
                </div>
              ) : (
                <img
                  src={img}
                  alt={`Ảnh ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(idx)}
                />
              )}

              {/* Cover badge */}
              {img === cover && (
                <div className="absolute top-1.5 left-1.5 bg-[#C9A84C] text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  ✓ Bìa
                </div>
              )}

              {/* Overlay actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                {img !== cover && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSetCover(img); }}
                    className="text-[10px] bg-[#C9A84C] text-black font-semibold px-2 py-1 rounded-lg hover:bg-[#E2C97E] transition-colors"
                  >
                    Đặt làm bìa
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteImage(idx); }}
                  disabled={deletingIdx === idx}
                  className="text-[10px] bg-red-500/80 text-white font-semibold px-2 py-1 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50"
                >
                  {deletingIdx === idx ? "Đang xóa..." : "🗑 Xóa ảnh"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <p className="text-xs text-gray-700 text-center">Chưa có ảnh nào. Tải lên ảnh đầu tiên để hiển thị trên trang sản phẩm.</p>
      )}

      <p className="text-xs text-gray-700">
        {images.length} ảnh · Ảnh bìa hiển thị trên danh sách sản phẩm · Hover vào ảnh để xóa hoặc đặt làm bìa
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProductFormClient({ product }: { product?: Product }) {
  const router = useRouter();
  const isEdit = !!product;

  const [form, setForm] = useState<FormState>({
    name: product?.name || "",
    category: product?.category || "standard",
    status: product?.status || "active",
    description: product?.description || "",
    price: product?.price ? product.price.toLocaleString("vi-VN") : "",
    originalPrice: product?.originalPrice ? product.originalPrice.toLocaleString("vi-VN") : "",
    cost: product?.cost ? product.cost.toLocaleString("vi-VN") : "",
    coverImage: product?.coverImage || "",
    isFeatured: product?.isFeatured || false,
    features: product?.features.length ? product.features : [""],
    specs: product?.specs
      ? Object.entries(product.specs).map(([key, value]) => ({ key, value }))
      : [{ key: "", value: "" }],
    variants: product?.variants.length
      ? product.variants.map((v) => ({ id: v.id, name: v.name, sku: v.sku, stock: v.stock }))
      : [{ id: uid(), name: "", sku: "", stock: 0 }],
  });

  const [productImages, setProductImages] = useState<string[]>(product?.images || []);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Field updaters ──────────────────────────────────────────────────────────
  const set = useCallback((key: keyof FormState, val: unknown) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
  }, []);

  // ── Features ────────────────────────────────────────────────────────────────
  function setFeature(i: number, val: string) {
    const arr = [...form.features];
    arr[i] = val;
    set("features", arr);
  }
  function addFeature() { set("features", [...form.features, ""]); }
  function removeFeature(i: number) {
    const arr = form.features.filter((_, idx) => idx !== i);
    set("features", arr.length ? arr : [""]);
  }

  // ── Specs ───────────────────────────────────────────────────────────────────
  function setSpec(i: number, field: "key" | "value", val: string) {
    const arr = [...form.specs];
    arr[i] = { ...arr[i], [field]: val };
    set("specs", arr);
  }
  function addSpec() { set("specs", [...form.specs, { key: "", value: "" }]); }
  function removeSpec(i: number) {
    const arr = form.specs.filter((_, idx) => idx !== i);
    set("specs", arr.length ? arr : [{ key: "", value: "" }]);
  }

  // ── Variants ────────────────────────────────────────────────────────────────
  function setVariant(i: number, field: keyof VariantDraft, val: string | number) {
    const arr = [...form.variants];
    arr[i] = { ...arr[i], [field]: val };
    set("variants", arr);
  }
  function addVariant() { set("variants", [...form.variants, { id: uid(), name: "", sku: "", stock: 0 }]); }
  function removeVariant(i: number) {
    const arr = form.variants.filter((_, idx) => idx !== i);
    set("variants", arr.length ? arr : [{ id: uid(), name: "", sku: "", stock: 0 }]);
  }

  // ── Image gallery callback ───────────────────────────────────────────────────
  function handleImagesChange(images: string[], cover: string) {
    setProductImages(images);
    set("coverImage", cover);
  }

  // ── Validation ───────────────────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Tên sản phẩm không được để trống";
    if (!form.description.trim()) errs.description = "Mô tả không được để trống";
    if (!form.price || parseNumber(form.price) <= 0) errs.price = "Giá bán phải lớn hơn 0";
    if (!form.cost || parseNumber(form.cost) <= 0) errs.cost = "Giá vốn phải lớn hơn 0";
    if (form.variants.some((v) => !v.name.trim())) errs.variants = "Tên biến thể không được để trống";
    if (form.variants.some((v) => !v.sku.trim())) errs.variants = "SKU biến thể không được để trống";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        status: form.status,
        description: form.description.trim(),
        price: parseNumber(form.price),
        originalPrice: parseNumber(form.originalPrice) || parseNumber(form.price),
        cost: parseNumber(form.cost),
        coverImage: form.coverImage || undefined,
        images: productImages,
        isFeatured: form.isFeatured,
        features: form.features.filter((f) => f.trim()),
        specs: Object.fromEntries(form.specs.filter((s) => s.key.trim() && s.value.trim()).map((s) => [s.key.trim(), s.value.trim()])),
        variants: form.variants.map((v) => ({ name: v.name.trim(), sku: v.sku.trim(), stock: Number(v.stock) })),
      };

      let res: Response;
      if (isEdit) {
        res = await fetch(`/api/admin/products-mgmt/${product!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/admin/products-mgmt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        router.push("/admin/products");
        router.refresh();
      } else {
        const err = await res.json();
        setErrors({ submit: err.error || "Có lỗi xảy ra, vui lòng thử lại" });
      }
    } finally {
      setSaving(false);
    }
  }

  const totalStock = form.variants.reduce((s, v) => s + Number(v.stock), 0);
  const priceNum = parseNumber(form.price);
  const costNum = parseNumber(form.cost);
  const margin = priceNum > 0 && costNum > 0 ? Math.round(((priceNum - costNum) / priceNum) * 100) : 0;

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => router.push("/admin/products")}
              className="text-gray-600 hover:text-white transition-colors text-sm"
            >
              ← Quay lại
            </button>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? `Chỉnh sửa: ${product!.name}` : "Thêm sản phẩm mới"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isEdit ? "Cập nhật thông tin sản phẩm" : "Điền đầy đủ thông tin để tạo sản phẩm mới"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="px-5 py-2.5 text-sm text-gray-400 border border-gray-700 rounded-xl hover:text-white hover:border-gray-500 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold bg-[#C9A84C] text-black rounded-xl hover:bg-[#E2C97E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin text-xs">↻</span>
                {isEdit ? "Đang lưu..." : "Đang tạo..."}
              </>
            ) : (
              isEdit ? "💾 Lưu thay đổi" : "✨ Tạo sản phẩm"
            )}
          </button>
        </div>
      </div>

      {errors.submit && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          {errors.submit}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <Section title="Thông tin cơ bản">
            <div className="space-y-4">
              <Field label="Tên sản phẩm" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="VD: SmartFurni Pro 2026"
                  className={`${inputClass} ${errors.name ? "border-red-500/50" : ""}`}
                />
                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
              </Field>

              <Field label="Mô tả sản phẩm" required>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Mô tả chi tiết về sản phẩm, tính năng nổi bật..."
                  rows={4}
                  className={`${inputClass} resize-none ${errors.description ? "border-red-500/50" : ""}`}
                />
                {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
              </Field>
            </div>
          </Section>

          {/* Pricing */}
          <Section title="Giá cả">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Giá bán (VNĐ)" required>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => set("price", formatNumberInput(e.target.value))}
                  placeholder="45,000,000"
                  className={`${inputClass} ${errors.price ? "border-red-500/50" : ""}`}
                />
                {errors.price && <p className="text-xs text-red-400 mt-1">{errors.price}</p>}
              </Field>
              <Field label="Giá gốc (trước KM)" hint="Để trống nếu không có khuyến mãi">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.originalPrice}
                  onChange={(e) => set("originalPrice", formatNumberInput(e.target.value))}
                  placeholder="48,000,000"
                  className={inputClass}
                />
              </Field>
              <Field label="Giá vốn (VNĐ)" required>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.cost}
                  onChange={(e) => set("cost", formatNumberInput(e.target.value))}
                  placeholder="22,000,000"
                  className={`${inputClass} ${errors.cost ? "border-red-500/50" : ""}`}
                />
                {errors.cost && <p className="text-xs text-red-400 mt-1">{errors.cost}</p>}
              </Field>
            </div>
            {priceNum > 0 && costNum > 0 && (
              <div className="mt-3 flex items-center gap-3 text-xs">
                <span className="text-gray-600">Biên lợi nhuận:</span>
                <span className={`font-semibold ${margin >= 30 ? "text-green-400" : margin >= 15 ? "text-yellow-400" : "text-red-400"}`}>
                  {margin}% ({(priceNum - costNum).toLocaleString("vi-VN")}đ/sản phẩm)
                </span>
              </div>
            )}
          </Section>

          {/* Variants */}
          <Section title="Biến thể & Tồn kho">
            <div className="space-y-3">
              {form.variants.map((v, i) => (
                <div key={v.id} className="flex items-center gap-3 p-3 bg-[#0D0B00]/60 rounded-xl">
                  <div className="flex-1 grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Tên màu/loại</label>
                      <input
                        type="text"
                        value={v.name}
                        onChange={(e) => setVariant(i, "name", e.target.value)}
                        placeholder="VD: Trắng Ngà"
                        className={`${inputClass} text-xs py-2`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">SKU</label>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => setVariant(i, "sku", e.target.value.toUpperCase())}
                        placeholder="VD: SFP-IVR"
                        className={`${inputClass} text-xs py-2 font-mono`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Tồn kho</label>
                      <input
                        type="number"
                        min="0"
                        value={v.stock}
                        onChange={(e) => setVariant(i, "stock", parseInt(e.target.value) || 0)}
                        className={`${inputClass} text-xs py-2`}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVariant(i)}
                    disabled={form.variants.length === 1}
                    className="text-red-400/60 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg flex-shrink-0 mt-4"
                  >
                    ×
                  </button>
                </div>
              ))}
              {errors.variants && <p className="text-xs text-red-400">{errors.variants}</p>}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={addVariant}
                  className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C] transition-colors flex items-center gap-1"
                >
                  + Thêm biến thể
                </button>
                <span className="text-xs text-gray-600">Tổng tồn kho: <span className="text-white font-semibold">{totalStock}</span></span>
              </div>
            </div>
          </Section>

          {/* Features */}
          <Section title="Tính năng nổi bật">
            <div className="space-y-2">
              {form.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[#C9A84C] text-sm flex-shrink-0">✓</span>
                  <input
                    type="text"
                    value={f}
                    onChange={(e) => setFeature(i, e.target.value)}
                    placeholder={`Tính năng ${i + 1}...`}
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(i)}
                    disabled={form.features.length === 1}
                    className="text-red-400/60 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addFeature}
                className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C] transition-colors"
              >
                + Thêm tính năng
              </button>
            </div>
          </Section>

          {/* Specs */}
          <Section title="Thông số kỹ thuật">
            <div className="space-y-2">
              {form.specs.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={s.key}
                    onChange={(e) => setSpec(i, "key", e.target.value)}
                    placeholder="Thông số (VD: Kích thước)"
                    className={`${inputClass} flex-1`}
                  />
                  <span className="text-gray-700 flex-shrink-0">:</span>
                  <input
                    type="text"
                    value={s.value}
                    onChange={(e) => setSpec(i, "value", e.target.value)}
                    placeholder="Giá trị (VD: 1.6m x 2m)"
                    className={`${inputClass} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => removeSpec(i)}
                    disabled={form.specs.length === 1}
                    className="text-red-400/60 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-lg flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSpec}
                className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C] transition-colors"
              >
                + Thêm thông số
              </button>
            </div>
          </Section>
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-6">
          {/* Status & Category */}
          <Section title="Phân loại">
            <div className="space-y-4">
              <Field label="Danh mục">
                <select value={form.category} onChange={(e) => set("category", e.target.value as ProductCategory)} className={selectClass}>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="elite">Elite</option>
                  <option value="accessory">Phụ kiện</option>
                </select>
              </Field>
              <Field label="Trạng thái">
                <select value={form.status} onChange={(e) => set("status", e.target.value as ProductStatus)} className={selectClass}>
                  <option value="active">Đang bán</option>
                  <option value="out_of_stock">Hết hàng</option>
                  <option value="coming_soon">Sắp ra mắt</option>
                  <option value="discontinued">Ngừng sản xuất</option>
                </select>
              </Field>
              <div className="flex items-center gap-3 p-3 bg-[#0D0B00]/60 rounded-xl cursor-pointer" onClick={() => set("isFeatured", !form.isFeatured)}>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${form.isFeatured ? "bg-[#C9A84C] border-[#C9A84C]" : "border-gray-600"}`}>
                  {form.isFeatured && <span className="text-black text-xs font-bold">✓</span>}
                </div>
                <div>
                  <p className="text-sm text-white">Sản phẩm nổi bật</p>
                  <p className="text-xs text-gray-600">Hiển thị badge ★ trên danh sách</p>
                </div>
              </div>
            </div>
          </Section>

          {/* Product Images Gallery */}
          <Section title="Ảnh sản phẩm">
            <ProductImageGallery
              productId={product?.id}
              initialImages={productImages}
              initialCover={form.coverImage}
              onImagesChange={handleImagesChange}
            />
          </Section>

          {/* Summary card */}
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5">
            <h2 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-4">Tóm tắt</h2>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-600">Tên:</span><span className="text-white truncate ml-2 max-w-[140px] text-right">{form.name || "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Danh mục:</span><span className="text-white capitalize">{form.category}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Giá bán:</span><span className="text-[#C9A84C] font-semibold">{priceNum > 0 ? priceNum.toLocaleString("vi-VN") + "đ" : "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Biên LN:</span><span className={margin > 0 ? "text-green-400" : "text-gray-700"}>{margin > 0 ? `${margin}%` : "—"}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Tồn kho:</span><span className="text-white">{totalStock} units ({form.variants.length} loại)</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Ảnh:</span><span className="text-white">{productImages.length} ảnh</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Tính năng:</span><span className="text-white">{form.features.filter((f) => f.trim()).length}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Thông số:</span><span className="text-white">{form.specs.filter((s) => s.key.trim()).length}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom save button */}
      <div className="mt-8 flex justify-end gap-3 pb-8">
        <button
          type="button"
          onClick={() => router.push("/admin/products")}
          className="px-6 py-3 text-sm text-gray-400 border border-gray-700 rounded-xl hover:text-white hover:border-gray-500 transition-colors"
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3 text-sm font-semibold bg-[#C9A84C] text-black rounded-xl hover:bg-[#E2C97E] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {saving ? (
            <><span className="animate-spin">↻</span> {isEdit ? "Đang lưu..." : "Đang tạo..."}</>
          ) : (
            isEdit ? "💾 Lưu thay đổi" : "✨ Tạo sản phẩm"
          )}
        </button>
      </div>
    </form>
  );
}
