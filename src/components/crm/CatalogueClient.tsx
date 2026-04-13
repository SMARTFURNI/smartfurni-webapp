"use client";

import { useState, useRef, useCallback } from "react";
import {
  Printer, Plus, Trash2, GripVertical, Eye, EyeOff,
  ChevronLeft, ChevronRight, LayoutGrid, Layers,
  Package, Tag, Phone, Star, Award,
  CheckCircle2, Shield,
  Edit3, X, Upload, ImageIcon, Check, RefreshCw,
} from "lucide-react";
import type { CrmProduct, SizePricing } from "@/lib/crm-types";
import { formatVND } from "@/lib/crm-types";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  pageBg: "#0d0b1a",
  headerBg: "rgba(13,11,26,0.98)",
  cardBg: "rgba(255,255,255,0.04)",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,168,76,0.4)",
  textPrimary: "#f5edd6",
  textSecondary: "rgba(245,237,214,0.75)",
  textMuted: "rgba(255,255,255,0.4)",
  gold: "#C9A84C",
  goldDark: "#9A7A2E",
  goldDim: "rgba(201,168,76,0.12)",
  goldGlow: "0 0 24px rgba(201,168,76,0.25)",
  purple: "#a78bfa",
  purpleDim: "rgba(167,139,250,0.12)",
  blue: "#60a5fa",
  blueDim: "rgba(96,165,250,0.12)",
  divider: "rgba(255,255,255,0.06)",
  slideBg: "linear-gradient(160deg, #1c1a2e 0%, #241c08 55%, #2e2004 100%)",
};

const FONT_PRODUCT = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
const FONT_HEADING = "'Inter', 'SF Pro Display', system-ui, sans-serif";

// ─── Slide Types ──────────────────────────────────────────────────────────────
type SlideType =
  | "cover"
  | "intro"
  | "category_header"
  | "product_intro"
  | "product_feature"
  | "product_pricing"
  | "product_feature_pricing"
  | "product_full"
  | "product_gallery"
  | "why_smartfurni"
  | "warranty"
  | "contact";

interface SlideOverrides {
  title?: string;
  subtitle?: string;
  body?: string;
  imageDataUrl?: string;
  image2DataUrl?: string;
  image3DataUrl?: string;
}

interface Slide {
  id: string;
  type: SlideType;
  visible: boolean;
  productId?: string;
  category?: "ergonomic_bed" | "sofa_bed";
  overrides?: SlideOverrides;
}

const SLIDE_LABELS: Record<SlideType, string> = {
  cover: "Trang Bìa",
  intro: "Giới Thiệu Thương Hiệu",
  category_header: "Tiêu Đề Danh Mục",
  product_intro: "SP — Giới thiệu (1/4)",
  product_feature: "SP — Tính năng (2/4)",
  product_pricing: "SP — Bảng giá (3/4)",
  product_feature_pricing: "SP — Tính năng & Giá (2/3)",
  product_full: "SP — Giới thiệu & Giá (1/2)",
  product_gallery: "SP — Ảnh thực tế (2/2)",
  why_smartfurni: "Tại Sao Chọn SmartFurni",
  warranty: "Chính Sách Bảo Hành",
  contact: "Thông Tin Liên Hệ",
};

const SLIDE_ICONS: Record<SlideType, React.ElementType> = {
  cover: Star,
  intro: Award,
  category_header: Layers,
  product_intro: Star,
  product_feature: Package,
  product_pricing: Tag,
  product_feature_pricing: Tag,
  product_full: Package,
  product_gallery: LayoutGrid,
  why_smartfurni: Shield,
  warranty: CheckCircle2,
  contact: Phone,
};

// ─── Build default slides ─────────────────────────────────────────────────────
function buildDefaultSlides(products: CrmProduct[]): Slide[] {
  const active = products.filter(p => p.isActive);
  const beds = active.filter(p => p.category === "ergonomic_bed");
  const sofas = active.filter(p => p.category === "sofa_bed");
  const slides: Slide[] = [
    { id: "cover", type: "cover", visible: true },
    { id: "intro", type: "intro", visible: true },
    { id: "why", type: "why_smartfurni", visible: true },
  ];
  if (beds.length > 0) {
    slides.push({ id: "cat_bed", type: "category_header", visible: true, category: "ergonomic_bed" });
    beds.forEach(p => {
      slides.push({ id: `full_${p.id}`, type: "product_full", visible: true, productId: p.id });
      slides.push({ id: `gallery_${p.id}`, type: "product_gallery", visible: true, productId: p.id });
    });
  }
  if (sofas.length > 0) {
    slides.push({ id: "cat_sofa", type: "category_header", visible: true, category: "sofa_bed" });
    sofas.forEach(p => {
      slides.push({ id: `full_${p.id}`, type: "product_full", visible: true, productId: p.id });
      slides.push({ id: `gallery_${p.id}`, type: "product_gallery", visible: true, productId: p.id });
    });
  }
  slides.push({ id: "warranty", type: "warranty", visible: true });
  slides.push({ id: "contact", type: "contact", visible: true });
  return slides;
}

// ─── Inline Edit Helpers ──────────────────────────────────────────────────────
interface InlineTextProps {
  value: string;
  placeholder?: string;
  isEditing: boolean;
  onCommit: (v: string) => void;
  style?: React.CSSProperties;
  multiline?: boolean;
  className?: string;
}

function InlineText({ value, placeholder, isEditing, onCommit, style, multiline, className }: InlineTextProps) {
  const [local, setLocal] = useState(value);

  // sync when value changes from outside
  const prevValue = useRef(value);
  if (prevValue.current !== value) {
    prevValue.current = value;
    setLocal(value);
  }

  if (!isEditing) {
    return <span style={style} className={className}>{value || placeholder || ""}</span>;
  }

  const inputStyle: React.CSSProperties = {
    ...style,
    background: "rgba(201,168,76,0.08)",
    border: "1.5px solid rgba(201,168,76,0.5)",
    borderRadius: 6,
    outline: "none",
    padding: "2px 6px",
    width: "100%",
    boxSizing: "border-box",
    resize: multiline ? "vertical" : "none",
    cursor: "text",
    fontFamily: style?.fontFamily ?? FONT_HEADING,
    fontSize: style?.fontSize,
    fontWeight: style?.fontWeight,
    color: style?.color ?? D.textPrimary,
    lineHeight: style?.lineHeight,
    letterSpacing: style?.letterSpacing,
    textTransform: style?.textTransform as React.CSSProperties["textTransform"],
  };

  if (multiline) {
    return (
      <textarea
        value={local}
        placeholder={placeholder}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => onCommit(local)}
        rows={3}
        style={inputStyle}
        onClick={e => e.stopPropagation()}
      />
    );
  }
  return (
    <input
      type="text"
      value={local}
      placeholder={placeholder}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      onKeyDown={e => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
      style={inputStyle}
      onClick={e => e.stopPropagation()}
    />
  );
}

interface InlineImageProps {
  src?: string;
  alt?: string;
  isEditing: boolean;
  onUpload: (dataUrl: string) => void;
  onRemove: () => void;
  style?: React.CSSProperties;
  placeholderStyle?: React.CSSProperties;
  placeholderLabel?: string;
}

function InlineImage({ src, alt, isEditing, onUpload, onRemove, style, placeholderStyle, placeholderLabel }: InlineImageProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => onUpload(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  if (src) {
    return (
      <div style={{ position: "relative", display: "inline-block", ...style }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center", display: "block" }} loading="eager" />
        {isEditing && (
          <div
            onClick={() => fileRef.current?.click()}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", gap: 6 }}>
            <Upload size={20} color={D.gold} />
            <span style={{ fontSize: 10, color: D.gold, fontWeight: 600 }}>Đổi ảnh</span>
            <button
              onClick={e => { e.stopPropagation(); onRemove(); }}
              style={{ position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(239,68,68,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X size={11} color="#fff" />
            </button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      </div>
    );
  }

  return (
    <div
      onClick={isEditing ? () => fileRef.current?.click() : undefined}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: isEditing ? "pointer" : "default", ...placeholderStyle }}>
      <ImageIcon size={28} style={{ color: D.textMuted, marginBottom: 6 }} />
      <span style={{ fontSize: 10, color: D.textMuted }}>{placeholderLabel ?? "Chưa có ảnh"}</span>
      {isEditing && <span style={{ fontSize: 9, color: D.gold, marginTop: 4 }}>Click để upload</span>}
      {isEditing && <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />}
    </div>
  );
}

// ─── Migrate old slides → product_full ───────────────────────────────────────
function migrateSlides(slides: Slide[]): Slide[] {
  const result: Slide[] = [];
  let i = 0;
  while (i < slides.length) {
    const s = slides[i];
    const next = slides[i + 1];
    const next2 = slides[i + 2];
    // Migrate: intro + featprice + gallery → product_full + gallery
    if (
      s.type === "product_intro" &&
      next?.type === "product_feature_pricing" &&
      s.productId === next.productId
    ) {
      result.push({ ...s, id: `full_${s.productId}`, type: "product_full" });
      i += 2;
    }
    // Migrate: intro + feature + pricing → product_full
    else if (
      s.type === "product_intro" &&
      next?.type === "product_feature" &&
      next2?.type === "product_pricing" &&
      s.productId === next.productId &&
      s.productId === next2.productId
    ) {
      result.push({ ...s, id: `full_${s.productId}`, type: "product_full" });
      i += 3;
    }
    // Migrate: feature + pricing → product_full
    else if (
      s.type === "product_feature" &&
      next?.type === "product_pricing" &&
      s.productId === next.productId
    ) {
      result.push({ ...s, id: `full_${s.productId}`, type: "product_full" });
      i += 2;
    }
    // Migrate: feature_pricing → product_full
    else if (s.type === "product_feature_pricing") {
      result.push({ ...s, id: `full_${s.productId}`, type: "product_full" });
      i++;
    }
    else {
      result.push(s);
      i++;
    }
  }
  return result;
}
// ─── Main Component ───────────────────────────────────────────────────────────
interface Props { products: CrmProduct[]; initialSlides?: Slide[] | null; isAdmin?: boolean }

export default function CatalogueClient({ products, initialSlides, isAdmin = false }: Props) {
  const [slides, setSlides] = useState<Slide[]>(() =>
    initialSlides && initialSlides.length > 0 ? migrateSlides(initialSlides) : buildDefaultSlides(products)
  );
  const [activeSlideId, setActiveSlideId] = useState<string>(
    initialSlides && initialSlides.length > 0 ? (initialSlides[0]?.id ?? "cover") : "cover"
  );
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

   // ── Auto-save with debounce (1.5s) ──
  const saveSlides = useCallback((slidesToSave: Slide[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus("saving");
    saveTimerRef.current = setTimeout(() => {
      fetch("/api/crm/catalogue-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slides: slidesToSave }),
      })
        .then(r => r.json())
        .then(d => setSaveStatus(d.ok ? "saved" : "error"))
        .catch(() => setSaveStatus("error"))
        .finally(() => { setTimeout(() => setSaveStatus("idle"), 2000); });
    }, 1500);
  }, []);

  const activeProducts = products.filter(p => p.isActive);
  const visibleSlides = slides.filter(s => s.visible);
  const activeSlide = slides.find(s => s.id === activeSlideId) ?? slides[0];
  const activeIndex = visibleSlides.findIndex(s => s.id === activeSlideId);
  const getProduct = useCallback((id?: string) => activeProducts.find(p => p.id === id), [activeProducts]);

  const today = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  // ── Slide management ──
  const toggleVisible = (id: string) => setSlides(prev => {
    const next = prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s);
    saveSlides(next);
    return next;
  });
  const removeSlide = (id: string) => {
    setSlides(prev => {
      const next = prev.filter(s => s.id !== id);
      saveSlides(next);
      return next;
    });
    if (activeSlideId === id) setActiveSlideId(slides[0]?.id ?? "");
  };
  const addSlide = (type: SlideType, productId?: string, category?: "ergonomic_bed" | "sofa_bed") => {
    const newSlide: Slide = { id: `${type}_${Date.now()}`, type, visible: true, productId, category };
    setSlides(prev => {
      const next = [...prev, newSlide];
      saveSlides(next);
      return next;
    });
    setActiveSlideId(newSlide.id);
    setShowAddPanel(false);
  };
  // ── Sync slides with current products ──
  const syncWithProducts = useCallback(() => {
    setSlides(prev => {
      const existingProductIds = new Set(prev.filter(s => s.productId).map(s => s.productId!));
      const active = products.filter(p => p.isActive);
      const newProducts = active.filter(p => !existingProductIds.has(p.id));
      const removedIds = new Set(
        [...existingProductIds].filter(id => !active.find(p => p.id === id))
      );

      // Hide slides for removed products
      let next = prev.map(s =>
        s.productId && removedIds.has(s.productId) ? { ...s, visible: false } : s
      );

      // Add slides for new products — insert each product's slides AFTER the last slide
      // belonging to the same category (or after the category header if no products yet)
      if (newProducts.length > 0) {
        const newBeds = newProducts.filter(p => p.category === "ergonomic_bed");
        const newSofas = newProducts.filter(p => p.category === "sofa_bed");

        // Helper: find the index AFTER the last slide of a given category
        const findInsertAfterCategory = (cat: "ergonomic_bed" | "sofa_bed") => {
          // Find last index of a slide that belongs to this category
          let lastIdx = -1;
          for (let i = next.length - 1; i >= 0; i--) {
            const s = next[i];
            if (s.type === "category_header" && s.category === cat) { lastIdx = i; break; }
            if (s.productId) {
              const prod = active.find(p => p.id === s.productId);
              if (prod && prod.category === cat) { lastIdx = i; break; }
            }
          }
          if (lastIdx >= 0) return lastIdx + 1;
          // No existing slides for this category — insert before warranty/contact
          const beforeEnd = next.findIndex(s => s.type === "warranty" || s.type === "contact");
          return beforeEnd >= 0 ? beforeEnd : next.length;
        };

        // Insert sofa slides first (so bed insertions don't shift sofa indices unexpectedly)
        // Actually insert beds first, then sofas — each time recalculate position
        if (newBeds.length > 0) {
          const hasBedHeader = next.some(s => s.type === "category_header" && s.category === "ergonomic_bed");
          const bedSlides: Slide[] = [];
          if (!hasBedHeader) {
            bedSlides.push({ id: "cat_bed", type: "category_header", visible: true, category: "ergonomic_bed" });
          }
          newBeds.forEach(p => {
            bedSlides.push({ id: `full_${p.id}`, type: "product_full", visible: true, productId: p.id });
            bedSlides.push({ id: `gallery_${p.id}`, type: "product_gallery", visible: true, productId: p.id });
          });
          const insertAt = findInsertAfterCategory("ergonomic_bed");
          next = [...next.slice(0, insertAt), ...bedSlides, ...next.slice(insertAt)];
        }

        if (newSofas.length > 0) {
          const hasSofaHeader = next.some(s => s.type === "category_header" && s.category === "sofa_bed");
          const sofaSlides: Slide[] = [];
          if (!hasSofaHeader) {
            sofaSlides.push({ id: "cat_sofa", type: "category_header", visible: true, category: "sofa_bed" });
          }
          newSofas.forEach(p => {
            sofaSlides.push({ id: `full_${p.id}`, type: "product_full", visible: true, productId: p.id });
            sofaSlides.push({ id: `gallery_${p.id}`, type: "product_gallery", visible: true, productId: p.id });
          });
          const insertAt = findInsertAfterCategory("sofa_bed");
          next = [...next.slice(0, insertAt), ...sofaSlides, ...next.slice(insertAt)];
        }
      }

      const changed = newProducts.length > 0 || removedIds.size > 0;
      if (changed) saveSlides(next);

      const added = newProducts.length;
      const hidden = removedIds.size;
      if (added > 0 || hidden > 0) {
        alert(`Đồng bộ hoàn tất: thêm ${added} sản phẩm mới${hidden > 0 ? `, ẩn ${hidden} sản phẩm đã xóa` : ""}`);
      } else {
        alert("Đã đồng bộ — không có thay đổi.");
      }
      return next;
    });
  }, [products, saveSlides]);

  const resetSlides = () => {
    const fresh = buildDefaultSlides(products);
    setSlides(fresh);
    setActiveSlideId("cover");
    setIsEditing(false);
    saveSlides(fresh);
  };
  const updateSlideOverrides = useCallback((id: string, overrides: Partial<SlideOverrides>) => {
    setSlides(prev => {
      const next = prev.map(s => s.id === id ? { ...s, overrides: { ...s.overrides, ...overrides } } : s);
      saveSlides(next);
      return next;
    });
  }, [saveSlides]);

  // ── Drag & Drop ──
  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return; }
    setSlides(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(s => s.id === dragId);
      const toIdx = arr.findIndex(s => s.id === targetId);
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
    setDragId(null); setDragOverId(null);
    setSlides(prev => { saveSlides(prev); return prev; });
  };

  // ── Navigate ──
  const goNext = () => { const idx = visibleSlides.findIndex(s => s.id === activeSlideId); if (idx < visibleSlides.length - 1) setActiveSlideId(visibleSlides[idx + 1].id); };
  const goPrev = () => { const idx = visibleSlides.findIndex(s => s.id === activeSlideId); if (idx > 0) setActiveSlideId(visibleSlides[idx - 1].id); };

  // ── Inline update helpers ──
  const updateField = useCallback((field: keyof SlideOverrides, value: string) => {
    if (!activeSlide) return;
    updateSlideOverrides(activeSlide.id, { [field]: value || undefined });
  }, [activeSlide, updateSlideOverrides]);

  const slideUpdater = useCallback((id: string) => (field: keyof SlideOverrides, value: string) => {
    updateSlideOverrides(id, { [field]: value || undefined });
  }, [updateSlideOverrides]);

  return (
    <div className="flex flex-col h-full" style={{ background: D.pageBg }}>

      {/* ── Print CSS ── */}
      <style>{`
        @media print {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          /* Ẩn tất cả UI không liên quan */
          .no-print, .catalogue-toolbar, .catalogue-panel, .catalogue-sidebar { display: none !important; }
          aside, nav, header, [data-sidebar] { display: none !important; }
          .crm-root > aside { display: none !important; }
          .crm-root > main { width: 100% !important; overflow: visible !important; height: auto !important; }
          /* Ẩn tất cả phần tử fixed/floating (icon chat, scroll-to-top, notification...) */
          *[class*="fixed"], *[style*="position: fixed"], *[style*="position:fixed"] { display: none !important; }
          body, html { overflow: visible !important; height: auto !important; background: #fff !important; margin: 0 !important; padding: 0 !important; }
          /* Reset page size */
          @page { size: A4 portrait; margin: 0; }
          .catalogue-print-area { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
          .catalogue-slide-print {
            /* Mỗi slide chiếm đúng 1 trang A4 */
            page-break-before: always;
            break-before: page;
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
            width: 210mm;
            height: 297mm;
            max-height: 297mm;
            overflow: hidden;
            display: block;
            position: relative;
            box-sizing: border-box;
          }
          .catalogue-slide-print:first-child { page-break-before: avoid; break-before: avoid; }
          .catalogue-slide-print:last-child { page-break-after: avoid; break-after: avoid; }
          /* Đảm bảo nội dung bên trong slide không bị cắt */
          .catalogue-slide-print > * {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
        @media screen {
          .catalogue-print-area { display: none; }
        }
        .inline-edit-hint { opacity: 0; transition: opacity 0.15s; }
        .slide-editing .inline-edit-hint { opacity: 1; }
        .slide-editing [data-editable]:hover { outline: 1.5px dashed rgba(201,168,76,0.5); border-radius: 4px; cursor: text; }
      `}</style>

      {/* ── Toolbar ── */}
      <div className="catalogue-toolbar no-print flex items-center justify-between px-4 py-2.5 flex-shrink-0"
        style={{ background: D.headerBg, borderBottom: `1px solid ${D.border}` }}>
        <div className="flex items-center gap-3">
          <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" style={{ height: 36, width: "auto", objectFit: "contain" }} />
          <div>
            <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: D.gold }}>CATALOGUE ONLINE</div>
            <div className="text-sm font-bold" style={{ color: D.textPrimary, fontFamily: FONT_HEADING }}>Giường & Sofa Thông Minh</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-lg" style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textMuted }}>
            {visibleSlides.length} trang
          </span>
          {isAdmin && saveStatus === "saving" && (
            <span className="text-xs" style={{ color: D.textMuted }}>Đang lưu...</span>
          )}
          {isAdmin && saveStatus === "saved" && (
            <span className="text-xs" style={{ color: "#22c55e" }}>✓ Đã lưu</span>
          )}
          {isAdmin && saveStatus === "error" && (
            <span className="text-xs" style={{ color: "#f87171" }}>Lỗi lưu</span>
          )}
          {isAdmin && (
            <button onClick={syncWithProducts} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textMuted }}
              title="Đồng bộ sản phẩm mới từ danh mục">
              <RefreshCw size={11} /> Đồng bộ
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setShowAddPanel(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: showAddPanel ? D.goldDim : D.cardBg, border: `1px solid ${showAddPanel ? D.borderGold : D.border}`, color: showAddPanel ? D.gold : D.textMuted }}>
              <Plus size={11} /> Thêm slide
            </button>
          )}
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: `linear-gradient(135deg, ${D.gold}, ${D.goldDark})`, color: "#fff" }}>
            <Printer size={11} /> Xuất PDF
          </button>
        </div>
      </div>

      {/* ── Add Slide Panel ── */}
      {isAdmin && showAddPanel && (
        <div className="no-print px-4 py-3 flex-shrink-0" style={{ background: "rgba(8,7,18,0.95)", borderBottom: `1px solid ${D.border}` }}>
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: D.textMuted }}>Thêm slide</div>
          <div className="flex flex-wrap gap-2">
            {(["cover", "intro", "why_smartfurni", "warranty", "contact"] as SlideType[]).map(t => (
              <button key={t} onClick={() => addSlide(t)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
                {SLIDE_LABELS[t]}
              </button>
            ))}
            <div style={{ width: "100%", height: 1, background: D.divider, margin: "4px 0" }} />
            {activeProducts.map(p => (
              <div key={p.id} className="flex items-center gap-1">
                {(["product_intro", "product_feature", "product_pricing", "product_gallery"] as SlideType[]).map(t => (
                  <button key={t} onClick={() => addSlide(t, p.id)}
                    className="px-2 py-1 rounded text-[10px] font-medium"
                    style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textMuted }}>
                    {p.sku} · {t === "product_intro" ? "1/4" : t === "product_feature" ? "2/4" : t === "product_pricing" ? "3/4" : "4/4"}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Area ── */}
      <div className="no-print flex flex-1 overflow-hidden">

        {/* ── Left Panel: Slide List ── */}
        <div className="catalogue-panel w-52 flex-shrink-0 flex flex-col overflow-hidden"
          style={{ background: "rgba(8,7,18,0.9)", borderRight: `1px solid ${D.border}` }}>
          <div className="px-3 py-2.5 flex items-center justify-between flex-shrink-0" style={{ borderBottom: `1px solid ${D.divider}` }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: D.textMuted }}>Danh sách trang</span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: D.goldDim, color: D.gold }}>{slides.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {slides.map((slide, idx) => {
              const Icon = SLIDE_ICONS[slide.type];
              const product = getProduct(slide.productId);
              const isActive = slide.id === activeSlideId;
              const isDragOver = dragOverId === slide.id;
              return (
                <div key={slide.id} draggable={isAdmin}
                  onDragStart={isAdmin ? () => handleDragStart(slide.id) : undefined}
                  onDragOver={isAdmin ? (e) => handleDragOver(e, slide.id) : undefined}
                  onDrop={isAdmin ? () => handleDrop(slide.id) : undefined}
                  onDragEnd={isAdmin ? () => { setDragId(null); setDragOverId(null); } : undefined}
                  onClick={() => { setActiveSlideId(slide.id); setIsEditing(false); }}
                  className="group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: isActive ? D.goldDim : isDragOver ? "rgba(255,255,255,0.06)" : "transparent",
                    border: `1px solid ${isActive ? D.borderGold : "transparent"}`,
                    opacity: slide.visible ? 1 : 0.4,
                  }}>
                  {isAdmin && <GripVertical size={11} style={{ color: D.textMuted, flexShrink: 0 }} className="cursor-grab" />}
                  <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: isActive ? D.goldDim : "rgba(255,255,255,0.06)" }}>
                    <Icon size={10} style={{ color: isActive ? D.gold : D.textMuted }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold truncate" style={{ color: isActive ? D.gold : D.textSecondary }}>
                      {idx + 1}. {SLIDE_LABELS[slide.type]}
                    </div>
                    {product && <div className="text-[9px] truncate" style={{ color: D.textMuted }}>{product.sku}</div>}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); toggleVisible(slide.id); }}
                        className="w-5 h-5 rounded flex items-center justify-center" style={{ color: D.textMuted }}>
                        {slide.visible ? <Eye size={9} /> : <EyeOff size={9} />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                        className="w-5 h-5 rounded flex items-center justify-center" style={{ color: "#ef4444" }}>
                        <Trash2 size={9} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Center: Slide Preview ── */}
        <div className="catalogue-preview-area flex-1 flex flex-col items-center justify-start overflow-auto py-4 px-6"
          style={{ background: "rgba(5,4,12,0.7)" }}>
          {/* Navigation */}
          <div className="flex items-center gap-3 mb-4 flex-shrink-0">
            <button onClick={goPrev} disabled={activeIndex <= 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
              style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textMuted }}>
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs" style={{ color: D.textMuted }}>{activeIndex + 1} / {visibleSlides.length}</span>
            <button onClick={goNext} disabled={activeIndex >= visibleSlides.length - 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
              style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textMuted }}>
              <ChevronRight size={16} />
            </button>
            {isAdmin && (isEditing ? (
              <button onClick={() => setIsEditing(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: `linear-gradient(135deg, ${D.gold}, ${D.goldDark})`, color: "#fff" }}>
                <Check size={11} /> Xong chỉnh sửa
              </button>
            ) : (
              <button onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: D.goldDim, border: `1px solid ${D.borderGold}`, color: D.gold }}>
                <Edit3 size={11} /> Chỉnh sửa slide
              </button>
            ))}
          </div>

          {isAdmin && isEditing && (
            <div className="mb-3 px-3 py-2 rounded-lg text-xs flex-shrink-0 flex items-center gap-2"
              style={{ background: "rgba(201,168,76,0.08)", border: `1px solid ${D.borderGold}`, color: D.gold, maxWidth: 680, width: "100%" }}>
              <Edit3 size={12} />
              <span>Đang chỉnh sửa — Click vào bất kỳ văn bản nào để sửa trực tiếp. Click vào ảnh để thay đổi.</span>
            </div>
          )}

          {/* Slide preview */}
          <div className={`w-full rounded-xl overflow-hidden shadow-2xl flex-shrink-0 ${isEditing ? "slide-editing" : ""}`}
            style={{
              maxWidth: 680,
              border: `1px solid ${isEditing ? D.gold : D.borderGold}`,
              boxShadow: isEditing ? `0 0 40px rgba(201,168,76,0.25)` : `0 0 40px rgba(201,168,76,0.1)`,
            }}>
            {activeSlide && (
              <SlideRenderer
                slide={activeSlide}
                product={getProduct(activeSlide.productId)}
                products={activeProducts}
                today={today}
                isEditing={isAdmin && isEditing}
                onUpdate={(field, value) => updateField(field, value)}
              />
            )}
          </div>

          <div className="mt-3 text-xs flex-shrink-0" style={{ color: D.textMuted }}>
            {SLIDE_LABELS[activeSlide?.type ?? "cover"]}
            {!activeSlide?.visible && (
              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px]"
                style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>Ẩn</span>
            )}
          </div>
        </div>

        {/* ── Right Panel: Thumbnails ── */}
        <div className="catalogue-panel w-36 flex-shrink-0 flex flex-col overflow-hidden"
          style={{ background: "rgba(8,7,18,0.9)", borderLeft: `1px solid ${D.border}` }}>
          <div className="px-3 py-2.5 flex-shrink-0" style={{ borderBottom: `1px solid ${D.divider}` }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: D.textMuted }}>Xem trước</span>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-2">
            {visibleSlides.map((slide, idx) => {
              const isActive = slide.id === activeSlideId;
              return (
                <div key={slide.id} onClick={() => { setActiveSlideId(slide.id); setIsEditing(false); }}
                  className="cursor-pointer rounded-lg overflow-hidden"
                  style={{ border: `2px solid ${isActive ? D.gold : "transparent"}`, boxShadow: isActive ? D.goldGlow : "none" }}>
                  <div style={{ position: "relative", width: "100%", paddingBottom: "141.4%", overflow: "hidden", background: D.pageBg }}>
                    <div style={{ position: "absolute", top: 0, left: 0, width: "560%", height: "560%", transform: "scale(0.179)", transformOrigin: "top left", pointerEvents: "none" }}>
                      <SlideRenderer slide={slide} product={getProduct(slide.productId)} products={activeProducts} today={today} isEditing={false} onUpdate={() => {}} />
                    </div>
                  </div>
                  <div className="text-center py-0.5 text-[9px]"
                    style={{ background: "rgba(0,0,0,0.6)", color: isActive ? D.gold : D.textMuted }}>
                    {idx + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Print Area ── */}
      <div className="catalogue-print-area">
        {visibleSlides.map((slide) => (
          <div key={slide.id} className="catalogue-slide-print">
            <SlideRenderer slide={slide} product={getProduct(slide.productId)} products={activeProducts} today={today} isEditing={false} onUpdate={() => {}} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Slide Renderer ───────────────────────────────────────────────────────────
interface SlideRendererProps {
  slide: Slide;
  product?: CrmProduct;
  products: CrmProduct[];
  today: string;
  isEditing: boolean;
  onUpdate: (field: keyof SlideOverrides, value: string) => void;
}

function SlideRenderer({ slide, product, products, today, isEditing, onUpdate }: SlideRendererProps) {
  const props = { overrides: slide.overrides, isEditing, onUpdate };
  switch (slide.type) {
    case "cover": return <SlideCover today={today} {...props} />;
    case "intro": return <SlideIntro {...props} />;
    case "category_header": return <SlideCategoryHeader category={slide.category!} {...props} />;
    case "product_intro": return product ? <SlideProductIntro product={product} {...props} /> : <SlideEmpty />;
    case "product_feature": return product ? <SlideProductFeature product={product} {...props} /> : <SlideEmpty />;
    case "product_pricing": return product ? <SlideProductPricing product={product} {...props} /> : <SlideEmpty />;
    case "product_feature_pricing": return product ? <SlideProductFeaturePricing product={product} {...props} /> : <SlideEmpty />;
    case "product_gallery": return product ? <SlideProductGallery product={product} {...props} /> : <SlideEmpty />;
    case "product_full": return product ? <SlideProductFull product={product} {...props} /> : <SlideEmpty />;
    case "why_smartfurni": return <SlideWhySmartFurni {...props} />;
    case "warranty": return <SlideWarranty {...props} />;
    case "contact": return <SlideContact today={today} {...props} />;
    default: return <SlideEmpty />;
  }
}

// ─── Shared props type ────────────────────────────────────────────────────────
interface SlideProps {
  overrides?: SlideOverrides;
  isEditing: boolean;
  onUpdate: (field: keyof SlideOverrides, value: string) => void;
}

// ─── Shared Slide Shell ───────────────────────────────────────────────────────
function SlideShell({ accentColor = D.gold, children }: { accentColor?: string; children: React.ReactNode }) {
  return (
    <div style={{ width: "100%", height: "297mm", maxHeight: "297mm", display: "flex", flexDirection: "column", background: D.slideBg, fontFamily: FONT_HEADING, overflow: "hidden", boxSizing: "border-box" }}>
      <div style={{ height: 5, flexShrink: 0, background: `linear-gradient(90deg, ${accentColor}, #f5edd6, ${accentColor})` }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
      <div style={{ height: 4, flexShrink: 0, background: `linear-gradient(90deg, ${accentColor}, #f5edd6, ${accentColor})` }} />
    </div>
  );
}

// ─── Slide: Cover ─────────────────────────────────────────────────────────────
function SlideCover({ today, overrides, isEditing, onUpdate }: { today: string } & SlideProps) {
  return (
    <SlideShell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 60px", textAlign: "center" }}>
        <div style={{ marginBottom: 28 }}>
          <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" style={{ height: 120, width: "auto", objectFit: "contain" }} />
        </div>
        <h1 style={{ fontSize: 52, fontWeight: 900, color: D.textPrimary, lineHeight: 1.1, marginBottom: 16, fontFamily: FONT_HEADING, width: "100%" }}>
          <InlineText value={overrides?.title ?? ""} placeholder="CATALOGUE\nSẢN PHẨM" isEditing={isEditing} onCommit={v => onUpdate("title", v)}
            style={{ fontSize: 52, fontWeight: 900, color: D.textPrimary, lineHeight: 1.1, fontFamily: FONT_HEADING, textAlign: "center" }} />
        </h1>
        <div style={{ width: 80, height: 2, background: `linear-gradient(90deg, transparent, ${D.gold}, transparent)`, marginBottom: 20 }} />
        <p style={{ fontSize: 18, fontWeight: 500, color: "rgba(245,237,214,0.8)", marginBottom: 8, width: "100%" }}>
          <InlineText value={overrides?.subtitle ?? ""} placeholder="Giường Công Thái Học & Sofa Giường Đa Năng" isEditing={isEditing} onCommit={v => onUpdate("subtitle", v)}
            style={{ fontSize: 18, fontWeight: 500, color: "rgba(245,237,214,0.8)", textAlign: "center" }} />
        </p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", width: "100%" }}>
          <InlineText value={overrides?.body ?? ""} placeholder="Công nghệ điều khiển điện thông minh — Thiết kế sang trọng hiện đại" isEditing={isEditing} onCommit={v => onUpdate("body", v)}
            style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", textAlign: "center" }} />
        </p>
      </div>
      <div style={{ padding: "0 48px 32px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Ngày phát hành</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: D.gold }}>{today}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 4 }}>Phiên bản</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(245,237,214,0.6)" }}>2025 Edition</div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Intro ─────────────────────────────────────────────────────────────
function SlideIntro({ overrides, isEditing, onUpdate }: SlideProps) {
  const defaultBody = "🏆 Chất lượng cao cấp — Vật liệu nhập khẩu, kiểm định nghiêm ngặt\n⚡ Công nghệ thông minh — Điều khiển điện, kết nối app di động\n🛡️ Bảo hành dài hạn — Khung cơ 5 năm, motor điện 3 năm\n🚚 Giao hàng & lắp đặt — Miễn phí trong bán kính 30km TP.HCM";
  const bodyLines = (overrides?.body ?? defaultBody).split("\n").filter(Boolean);
  return (
    <SlideShell>
      <div style={{ flex: 1, padding: "40px 48px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: D.gold, marginBottom: 8 }}>VỀ CHÚNG TÔI</div>
          <h2 style={{ fontSize: 34, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING }}>
            <InlineText value={overrides?.title ?? ""} placeholder="Thương Hiệu SmartFurni" isEditing={isEditing} onCommit={v => onUpdate("title", v)}
              style={{ fontSize: 34, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING }} />
          </h2>
          <div style={{ width: 56, height: 2, background: D.gold, marginTop: 12 }} />
        </div>
        <div style={{ borderRadius: 16, padding: "20px 24px", marginBottom: 24, background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(245,237,214,0.85)" }}>
            <InlineText value={overrides?.subtitle ?? ""} placeholder="SmartFurni là thương hiệu nội thất thông minh tiên phong tại Việt Nam..." isEditing={isEditing} onCommit={v => onUpdate("subtitle", v)}
              style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(245,237,214,0.85)" }} />
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
          {[["5+", "Năm kinh nghiệm"], ["1000+", "Khách hàng tin dùng"], ["8", "Dòng sản phẩm"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center", borderRadius: 14, padding: "16px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: D.gold, marginBottom: 4 }}>{v}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {bodyLines.map((line, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, borderRadius: 12, padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{line.split(" ")[0]}</span>
              <span style={{ fontSize: 12, color: "rgba(245,237,214,0.75)", lineHeight: 1.5 }}>{line.replace(/^[^\s]+\s/, "")}</span>
            </div>
          ))}
        </div>
        {isEditing && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, color: D.textMuted, marginBottom: 6 }}>Chỉnh sửa nội dung (mỗi dòng = 1 mục):</div>
            <InlineText value={overrides?.body ?? defaultBody} placeholder={defaultBody} isEditing={true} onCommit={v => onUpdate("body", v)}
              multiline style={{ fontSize: 12, color: D.textSecondary }} />
          </div>
        )}
      </div>
    </SlideShell>
  );
}

// ─── Slide: Category Header ───────────────────────────────────────────────────
function SlideCategoryHeader({ category, overrides, isEditing, onUpdate }: { category: "ergonomic_bed" | "sofa_bed" } & SlideProps) {
  const isBed = category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const colorDim = isBed ? D.purpleDim : D.blueDim;
  const icon = isBed ? "🛏️" : "🛋️";
  const defaultTitle = isBed ? "Giường Công Thái Học" : "Sofa Giường Đa Năng";
  const defaultSubtitle = isBed
    ? "Dòng giường điều khiển điện thông minh, hỗ trợ nâng đầu/chân, tích hợp massage"
    : "Dòng sofa gấp thành giường thông minh, tiết kiệm không gian, phù hợp căn hộ hiện đại";
  const defaultFeatures = isBed
    ? ["Điều khiển điện không dây", "Nâng đầu 0–70°, nâng chân 0–45°", "Massage rung tích hợp", "Khung thép mạ kẽm bảo hành 5 năm", "Điều khiển từ xa & app"]
    : ["Gấp mở dễ dàng trong 30 giây", "Kết cấu khung thép chắc chắn", "Đệm foam cao cấp thoáng khí", "Tiết kiệm không gian tối đa", "Phù hợp căn hộ 30–80m²"];
  const bodyLines = (overrides?.body ?? defaultFeatures.join("\n")).split("\n").filter(Boolean);

  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 60px", textAlign: "center" }}>
        <div style={{ width: 96, height: 96, borderRadius: 24, overflow: "hidden", background: colorDim, border: `2px solid ${color}40`, marginBottom: 24 }}>
          <InlineImage src={overrides?.imageDataUrl} isEditing={isEditing} onUpload={v => onUpdate("imageDataUrl", v)} onRemove={() => onUpdate("imageDataUrl", "")}
            style={{ width: 96, height: 96 }}
            placeholderStyle={{ width: 96, height: 96, background: colorDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}
            placeholderLabel={icon} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4em", textTransform: "uppercase", color, marginBottom: 12 }}>DÒNG SẢN PHẨM</div>
        <h2 style={{ fontSize: 42, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING, marginBottom: 16, width: "100%" }}>
          <InlineText value={overrides?.title ?? ""} placeholder={defaultTitle} isEditing={isEditing} onCommit={v => onUpdate("title", v)}
            style={{ fontSize: 42, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING, textAlign: "center" }} />
        </h2>
        <div style={{ width: 72, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, marginBottom: 20 }} />
        <p style={{ fontSize: 15, maxWidth: 440, color: "rgba(245,237,214,0.7)", marginBottom: 36, width: "100%" }}>
          <InlineText value={overrides?.subtitle ?? ""} placeholder={defaultSubtitle} isEditing={isEditing} onCommit={v => onUpdate("subtitle", v)}
            style={{ fontSize: 15, color: "rgba(245,237,214,0.7)", textAlign: "center" }} />
        </p>
        <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 10 }}>
          {bodyLines.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 12, padding: "10px 18px", background: colorDim, border: `1px solid ${color}25` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: color }} />
              <span style={{ fontSize: 13, color: "rgba(245,237,214,0.85)" }}>{f}</span>
            </div>
          ))}
        </div>
        {isEditing && (
          <div style={{ marginTop: 16, width: "100%", maxWidth: 440 }}>
            <InlineText value={overrides?.body ?? defaultFeatures.join("\n")} placeholder={defaultFeatures.join("\n")} isEditing={true} onCommit={v => onUpdate("body", v)}
              multiline style={{ fontSize: 12, color: D.textSecondary }} />
          </div>
        )}
      </div>
    </SlideShell>
  );
}

// ─── Slide: Product Full (intro + features + pricing combined) ───────────────
function SlideProductFull({ product, overrides, isEditing, onUpdate }: { product: CrmProduct } & SlideProps) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const hasSizes = product.sizePricings && product.sizePricings.length > 0;
  const specEntries = Object.entries(product.specs || {}).filter(([, v]) => v);
  const bodyLines = overrides?.body?.split("\n").filter(Boolean) ?? [];
  const featureLines = bodyLines.length > 0 ? bodyLines : specEntries.map(([k, v]) => `${k}: ${v}`);
  const mainImageUrl = overrides?.imageDataUrl || product.imageUrl || product.imageAngle1;
  const minPrice = hasSizes
    ? Math.min(...product.sizePricings!.map((s: SizePricing) => s.price))
    : product.basePrice;

  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── TOP BAND: header strip ── */}
        <div style={{ padding: "10px 24px 8px", flexShrink: 0, borderBottom: `1px solid ${color}22` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color }}>
              {isBed ? "GIƯỜNG CÔNG THÁI HỌC" : "SOFA GIƯỜNG ĐA NĂNG"}
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>SKU: {product.sku}</div>
          </div>
        </div>

        {/* ── MAIN BODY ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "0 24px 12px", gap: 0, overflow: "hidden" }}>

          {/* ── SECTION 1: Image + Name + Price ── */}
          <div style={{ display: "flex", gap: 14, paddingTop: 10, paddingBottom: 10, flexShrink: 0, borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
            {/* Left: product image */}
            <div style={{ width: 140, height: 110, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.04)", border: `1px solid ${color}30` }}>
              <InlineImage
                src={mainImageUrl}
                isEditing={isEditing}
                onUpload={v => onUpdate("imageDataUrl", v)}
                onRemove={() => onUpdate("imageDataUrl", "")}
                style={{ width: 140, height: 110, objectFit: "cover" }}
                placeholderStyle={{ width: 140, height: 110, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}
                placeholderLabel={isBed ? "🛏️" : "🛋️"}
              />
            </div>
            {/* Right: name + price */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, lineHeight: 1.2, marginBottom: 4 }}>
                  <InlineText value={overrides?.title ?? ""} placeholder={product.name} isEditing={isEditing} onCommit={v => onUpdate("title", v)}
                    style={{ fontSize: 16, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, lineHeight: 1.2 }} />
                </h3>
                <p style={{ fontSize: 10, lineHeight: 1.4, color: "rgba(245,237,214,0.6)", marginBottom: 6 }}>
                  <InlineText value={overrides?.subtitle ?? ""} placeholder={product.description ?? ""} isEditing={isEditing} onCommit={v => onUpdate("subtitle", v)}
                    style={{ fontSize: 11, lineHeight: 1.5, color: "rgba(245,237,214,0.6)" }} />
                </p>
              </div>
              {/* Price badge */}
              <div style={{ display: "inline-flex", alignItems: "baseline", gap: 6, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, padding: "6px 12px" }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>Giá từ</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: D.gold, fontFamily: FONT_HEADING }}>
                  {minPrice > 0 ? formatVND(minPrice) : "Liên hệ"}
                </span>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: Features grid ── */}
          {featureLines.length > 0 && (
            <div style={{ paddingTop: 8, paddingBottom: 8, flexShrink: 0, borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>TÍNH NĂNG & THÔNG SỐ</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {featureLines.slice(0, 8).map((line, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, borderRadius: 6, padding: "4px 8px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", marginTop: 4, flexShrink: 0, background: color }} />
                    <span style={{ fontSize: 10, fontWeight: 500, color: D.textPrimary, lineHeight: 1.35 }}>{line}</span>
                  </div>
                ))}
              </div>
              {isEditing && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 9, color: D.textMuted, marginBottom: 4 }}>Tính năng (mỗi dòng = 1 mục, tối đa 10):</div>
                  <InlineText value={overrides?.body ?? specEntries.map(([k, v]) => `${k}: ${v}`).join("\n")} placeholder="Nhập tính năng..." isEditing={true} onCommit={v => onUpdate("body", v)}
                    multiline style={{ fontSize: 12, color: D.textSecondary }} />
                </div>
              )}
            </div>
          )}

          {/* ── SECTION 3: Pricing table ── */}
          <div style={{ paddingTop: 8, flexShrink: 0 }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>BẢNG GIÁ</div>
            {hasSizes ? (
              <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid rgba(201,168,76,0.2)" }}>
                <div style={{ padding: "5px 12px", background: "rgba(201,168,76,0.1)", display: "grid", gridTemplateColumns: "2fr 1.5fr 2fr" }}>
                  {["KÍCH THƯỚC", "MÃ SIZE", "ĐƠN GIÁ (VNĐ)"].map((h, i) => (
                    <div key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.05em", color: "rgba(255,255,255,0.45)", textAlign: i === 2 ? "right" : "left" }}>{h}</div>
                  ))}
                </div>
                {product.sizePricings!.map((sp: SizePricing, i: number) => (
                  <div key={i} style={{ padding: "5px 12px", display: "grid", gridTemplateColumns: "2fr 1.5fr 2fr", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: D.textPrimary }}>{sp.label || sp.size}</div>
                    <div style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.4)" }}>{sp.size}</div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: D.gold, textAlign: "right" }}>{sp.price > 0 ? formatVND(sp.price) : "Liên hệ"}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ borderRadius: 10, padding: "10px 16px", textAlign: "center", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: D.gold }}>{product.basePrice > 0 ? formatVND(product.basePrice) : "Liên hệ"}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Giá niêm yết chưa VAT</div>
              </div>
            )}
            <div style={{ marginTop: 5, fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
              • Giá chưa bao gồm VAT (10%) &nbsp;•&nbsp; Giá có thể thay đổi mà không báo trước
            </div>
          </div>

          {/* ── SECTION 4: Spec image fills remaining space ── */}
          <div style={{ flex: 1, minHeight: 60, display: "flex", flexDirection: "column", paddingTop: 8 }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 5, flexShrink: 0 }}>ẢNH THÔNG SỐ KỸ THUẬT</div>
            <div style={{ flex: 1, borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.03)", border: `1px solid ${color}20` }}>
              <InlineImage
                src={(overrides as any)?.specImageDataUrl || product.imageSpec || product.imageAngle2}
                isEditing={isEditing}
                onUpload={v => onUpdate("specImageDataUrl" as any, v)}
                onRemove={() => onUpdate("specImageDataUrl" as any, "")}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                placeholderStyle={{ width: "100%", height: "100%", minHeight: 80, background: "rgba(255,255,255,0.03)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}
                placeholderLabel="Ảnh thông số kỹ thuật"
              />
            </div>
          </div>

        </div>
      </div>
    </SlideShell>
  );
}
// ─── Slide: Product Feature ───────────────────────────────────────────────────
function SlideProductFeature({ product, overrides, isEditing, onUpdate }: { product: CrmProduct } & SlideProps) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const specEntries = Object.entries(product.specs || {}).filter(([, v]) => v);
  const bodyLines = overrides?.body?.split("\n").filter(Boolean) ?? [];
  const imageUrl = overrides?.imageDataUrl || product.imageSpec || product.imageUrl || product.imageAngle1;

  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, padding: "36px 44px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 24 }}>
          <div style={{ width: 140, height: 140, borderRadius: 18, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.06)", border: `1px solid ${color}30`, aspectRatio: "1/1" }}>
            <InlineImage src={imageUrl} isEditing={isEditing} onUpload={v => onUpdate("imageDataUrl", v)} onRemove={() => onUpdate("imageDataUrl", "")}
              style={{ width: 140, height: 140, objectFit: "cover", objectPosition: "center" }}
              placeholderStyle={{ width: 140, height: 140, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}
              placeholderLabel={isBed ? "🛏️" : "🛋️"} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color, marginBottom: 6 }}>
              {isBed ? "GIƯỜNG CÔNG THÁI HỌC" : "SOFA GIƯỜNG ĐA NĂNG"}
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, marginBottom: 6, lineHeight: 1.25 }}>
              <InlineText value={overrides?.title ?? ""} placeholder={product.name} isEditing={isEditing} onCommit={v => onUpdate("title", v)}
                style={{ fontSize: 24, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, lineHeight: 1.25 }} />
            </h3>
            <div style={{ fontSize: 11, fontFamily: "monospace", padding: "2px 8px", borderRadius: 6, display: "inline-block", marginBottom: 10, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {product.sku}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(245,237,214,0.7)" }}>
              <InlineText value={overrides?.subtitle ?? ""} placeholder={product.description ?? "Mô tả sản phẩm..."} isEditing={isEditing} onCommit={v => onUpdate("subtitle", v)}
                style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(245,237,214,0.7)" }} />
            </p>
          </div>
        </div>

        {bodyLines.length > 0 ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>TÍNH NĂNG NỔI BẬT</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {bodyLines.map((line, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, borderRadius: 10, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", marginTop: 5, flexShrink: 0, background: color }} />
                  <span style={{ fontSize: 12, color: D.textPrimary }}>{line}</span>
                </div>
              ))}
            </div>
          </div>
        ) : specEntries.length > 0 ? (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>THÔNG SỐ KỸ THUẬT</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {specEntries.map(([key, val]) => (
                <div key={key} style={{ display: "flex", alignItems: "flex-start", gap: 8, borderRadius: 10, padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", marginTop: 5, flexShrink: 0, background: color }} />
                  <div>
                    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>{key}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: D.textPrimary }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {isEditing && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: D.textMuted, marginBottom: 6 }}>Tính năng nổi bật (mỗi dòng = 1 mục, để trống = dùng thông số kỹ thuật):</div>
            <InlineText value={overrides?.body ?? ""} placeholder={"Tính năng 1\nTính năng 2\nTính năng 3"} isEditing={true} onCommit={v => onUpdate("body", v)}
              multiline style={{ fontSize: 12, color: D.textSecondary }} />
          </div>
        )}

        <div style={{ marginTop: "auto", borderRadius: 16, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)" }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Giá tham khảo từ</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: D.gold, fontFamily: FONT_HEADING }}>
              {product.sizePricings && product.sizePricings.length > 0
                ? formatVND(Math.min(...product.sizePricings.map(s => s.price)))
                : product.basePrice > 0 ? formatVND(product.basePrice) : "Liên hệ"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Bảo hành</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: D.textPrimary }}>
              {isBed ? "Khung 5 năm · Motor 3 năm" : "Khung 3 năm · Đệm 1 năm"}
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Product Feature + Pricing (combined) ────────────────────────────
function SlideProductFeaturePricing({ product, overrides, isEditing, onUpdate }: { product: CrmProduct } & SlideProps) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const hasSizes = product.sizePricings && product.sizePricings.length > 0;
  const specEntries = Object.entries(product.specs || {}).filter(([, v]) => v);
  const bodyLines = overrides?.body?.split("\n").filter(Boolean) ?? [];
  const featureLines = bodyLines.length > 0 ? bodyLines : specEntries.map(([k, v]) => `${k}: ${v}`);
  const mainImageUrl = overrides?.imageDataUrl || product.imageSpec || product.imageUrl || product.imageAngle1;
  const specImageUrl = (overrides as any)?.specImageDataUrl || product.imageSpec || product.imageAngle2 || product.imageAngle1;
  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, padding: "20px 36px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flexShrink: 0 }}>
          <div style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.06)", border: `1px solid ${color}30` }}>
            <InlineImage src={mainImageUrl} isEditing={isEditing} onUpload={v => onUpdate("imageDataUrl", v)} onRemove={() => onUpdate("imageDataUrl", "")}
              style={{ width: 72, height: 72, objectFit: "cover" }}
              placeholderStyle={{ width: 72, height: 72, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}
              placeholderLabel={isBed ? "🛏️" : "🛋️"} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color, marginBottom: 3 }}>
              {isBed ? "GIƯỜNG CÔNG THÁI HỌC" : "SOFA GIƯỜNG ĐA NĂNG"}
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, marginBottom: 4, lineHeight: 1.2 }}>
              <InlineText value={overrides?.title ?? ""} placeholder={product.name} isEditing={isEditing} onCommit={v => onUpdate("title", v)}
                style={{ fontSize: 17, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, lineHeight: 1.2 }} />
            </h3>
            <div style={{ fontSize: 9, fontFamily: "monospace", padding: "2px 8px", borderRadius: 6, display: "inline-block", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {product.sku}
            </div>
          </div>
        </div>

        {/* Tính năng & Thông số — 2 cột grid */}
        {featureLines.length > 0 && (
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>TÍNH NĂNG & THÔNG SỐ</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {featureLines.slice(0, 10).map((line, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 7, borderRadius: 6, padding: "6px 9px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", marginTop: 4, flexShrink: 0, background: color }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: D.textPrimary, lineHeight: 1.4 }}>{line}</span>
                </div>
              ))}
            </div>
            {isEditing && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 9, color: D.textMuted, marginBottom: 3 }}>Tính năng (mỗi dòng = 1 mục, tối đa 10):</div>
                <InlineText value={overrides?.body ?? specEntries.map(([k, v]) => `${k}: ${v}`).join("\n")} placeholder="Nhập tính năng..." isEditing={true} onCommit={v => onUpdate("body", v)}
                  multiline style={{ fontSize: 12, color: D.textSecondary }} />
              </div>
            )}
          </div>
        )}

        {/* Bảng giá */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>BẢNG GIÁ</div>
          {hasSizes ? (
            <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid rgba(201,168,76,0.25)" }}>
              <div style={{ padding: "6px 14px", background: "rgba(201,168,76,0.12)", display: "grid", gridTemplateColumns: "2fr 1.5fr 2fr", gap: 10 }}>
                {["Kích thước", "Mã size", "Đơn giá (VNĐ)"].map((h, i) => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.5)", textAlign: i === 2 ? "right" : "left" }}>{h}</div>
                ))}
              </div>
              {product.sizePricings!.map((sp: SizePricing, i: number) => (
                <div key={i} style={{ padding: "7px 14px", display: "grid", gridTemplateColumns: "2fr 1.5fr 2fr", gap: 10, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: D.textPrimary }}>{sp.label || sp.size}</div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.45)" }}>{sp.size}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: D.gold, textAlign: "right" }}>{sp.price > 0 ? formatVND(sp.price) : "Liên hệ"}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ borderRadius: 10, padding: "10px 16px", textAlign: "center", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: D.gold }}>
                {product.basePrice > 0 ? formatVND(product.basePrice) : "Liên hệ"}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Giá niêm yết chưa VAT</div>
            </div>
          )}
          <div style={{ marginTop: 5, fontSize: 9, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
            • Giá chưa bao gồm VAT (10%) &nbsp;•&nbsp; Giá có thể thay đổi mà không báo trước
          </div>
        </div>

        {/* Ảnh thông số 1:1 — kín phần còn lại */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 6, flexShrink: 0 }}>ẢNH THÔNG SỐ KỸ THUẬT</div>
          <div style={{ flex: 1, borderRadius: 10, overflow: "hidden", background: "rgba(255,255,255,0.04)", border: `1px solid ${color}25` }}>
            <InlineImage src={specImageUrl} isEditing={isEditing} onUpload={v => onUpdate("specImageDataUrl" as any, v)} onRemove={() => onUpdate("specImageDataUrl" as any, "")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              placeholderStyle={{ width: "100%", height: "100%", minHeight: 120, background: "rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
              placeholderLabel="Ảnh thông số kỹ thuật" />
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Product Pricing ───────────────────────────────────────────────────
function SlideProductPricing({ product, overrides, isEditing, onUpdate }: { product: CrmProduct } & SlideProps) {
  const hasSizes = product.sizePricings && product.sizePricings.length > 0;
  const imageUrl = overrides?.imageDataUrl || product.imageUrl || product.imageAngle1;

  return (
    <SlideShell>
      <div style={{ flex: 1, padding: "36px 44px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          {imageUrl && (
            <div style={{ width: 72, height: 72, borderRadius: 14, overflow: "hidden", flexShrink: 0, border: "1px solid rgba(201,168,76,0.3)" }}>
              <InlineImage src={imageUrl} isEditing={isEditing} onUpload={v => onUpdate("imageDataUrl", v)} onRemove={() => onUpdate("imageDataUrl", "")}
                style={{ width: 72, height: 72 }}
                placeholderStyle={{ width: 72, height: 72, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}
                placeholderLabel="Ảnh" />
            </div>
          )}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: D.gold, marginBottom: 4 }}>BẢNG GIÁ</div>
            <h3 style={{ fontSize: 26, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, lineHeight: 1.2 }}>
              <InlineText value={overrides?.title ?? ""} placeholder={product.name} isEditing={isEditing} onCommit={v => onUpdate("title", v)}
                style={{ fontSize: 26, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT }} />
            </h3>
            <div style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{product.sku}</div>
          </div>
        </div>

        {hasSizes ? (
          <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 20, border: "1px solid rgba(201,168,76,0.2)" }}>
            <div style={{ padding: "12px 20px", background: "rgba(201,168,76,0.1)", display: "grid", gridTemplateColumns: "2fr 1.5fr 2fr", gap: 16 }}>
              {["Kích thước", "Mã size", "Đơn giá (VNĐ)"].map((h, i) => (
                <div key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "rgba(255,255,255,0.5)", textAlign: i === 2 ? "right" : "left" }}>{h}</div>
              ))}
            </div>
            {product.sizePricings!.map((sp: SizePricing, i: number) => (
              <div key={i} style={{ padding: "12px 20px", display: "grid", gridTemplateColumns: "2fr 1.5fr 2fr", gap: 16, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: D.textPrimary }}>{sp.label || sp.size}</div>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.45)" }}>{sp.size}</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: D.gold, textAlign: "right" }}>
                  {sp.price > 0 ? formatVND(sp.price) : "Liên hệ"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ borderRadius: 16, padding: "24px", marginBottom: 20, textAlign: "center", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: D.gold, marginBottom: 4 }}>
              {product.basePrice > 0 ? formatVND(product.basePrice) : "Liên hệ"}
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Giá niêm yết chưa VAT</div>
          </div>
        )}

        {product.discountTiers && product.discountTiers.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 10 }}>CHIẾT KHẤU THEO SỐ LƯỢNG</div>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(product.discountTiers.length, 4)}, 1fr)`, gap: 10 }}>
              {product.discountTiers.map((tier, i) => (
                <div key={i} style={{ borderRadius: 12, padding: "12px 8px", textAlign: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: D.gold }}>{tier.discountPct}%</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>{tier.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isEditing && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: D.textMuted, marginBottom: 6 }}>Ghi chú thêm (mỗi dòng = 1 dòng):</div>
            <InlineText value={overrides?.body ?? ""} placeholder={"Ghi chú 1\nGhi chú 2"} isEditing={true} onCommit={v => onUpdate("body", v)}
              multiline style={{ fontSize: 12, color: D.textSecondary }} />
          </div>
        )}

        {overrides?.body && !isEditing && (
          <div style={{ marginBottom: 16 }}>
            {overrides.body.split("\n").filter(Boolean).map((line, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: D.gold, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "rgba(245,237,214,0.75)" }}>{line}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "auto", borderRadius: 12, padding: "14px 18px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.8 }}>
            • Giá trên chưa bao gồm VAT (10%) &nbsp;•&nbsp; Giá có thể thay đổi mà không báo trước &nbsp;•&nbsp; Liên hệ để được báo giá dự án
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Why SmartFurni ────────────────────────────────────────────────────
function SlideWhySmartFurni({ overrides, isEditing, onUpdate }: SlideProps) {
  const defaultReasons = [
    ["🏆", "Chất lượng vượt trội", "Vật liệu nhập khẩu cao cấp, quy trình sản xuất đạt chuẩn ISO, kiểm định nghiêm ngặt từng sản phẩm trước khi xuất xưởng."],
    ["⚡", "Công nghệ thông minh", "Hệ thống điều khiển điện tử tiên tiến, điều chỉnh góc nâng chính xác, kết nối điều khiển từ xa và ứng dụng di động."],
    ["🛡️", "Bảo hành toàn diện", "Khung cơ bảo hành 5 năm, motor điện 3 năm, đệm và vải 1 năm. Hỗ trợ kỹ thuật 24/7 trong suốt thời gian bảo hành."],
    ["🚚", "Dịch vụ trọn gói", "Giao hàng và lắp đặt miễn phí trong bán kính 30km TP.HCM. Thời gian giao hàng 7–14 ngày làm việc sau xác nhận đơn."],
    ["💎", "Thiết kế sang trọng", "Ngôn ngữ thiết kế tối giản, tinh tế. Phù hợp với không gian nội thất cao cấp, căn hộ penthouse, biệt thự."],
    ["🤝", "Hỗ trợ chuyên nghiệp", "Đội ngũ tư vấn chuyên nghiệp, hỗ trợ thiết kế không gian, báo giá dự án và chính sách đặc biệt cho đối tác B2B."],
  ];
  const bodyLines = overrides?.body?.split("\n").filter(Boolean) ?? [];
  const reasons = bodyLines.length > 0
    ? bodyLines.map(line => { const parts = line.split(" — "); return [parts[0] ?? "✓", parts[1] ?? line, parts[2] ?? ""]; })
    : defaultReasons;

  return (
    <SlideShell>
      <div style={{ flex: 1, padding: "36px 44px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: D.gold, marginBottom: 8 }}>LÝ DO LỰA CHỌN</div>
          <h2 style={{ fontSize: 34, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING }}>
            <InlineText value={overrides?.title ?? ""} placeholder="Tại Sao Chọn SmartFurni?" isEditing={isEditing} onCommit={v => onUpdate("title", v)}
              style={{ fontSize: 34, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING }} />
          </h2>
          <div style={{ width: 56, height: 2, background: D.gold, marginTop: 10 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, flex: 1 }}>
          {reasons.map((r, i) => (
            <div key={i} style={{ borderRadius: 16, padding: "18px 20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{r[0]}</div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, color: D.textPrimary }}>{r[1]}</div>
              {r[2] && <div style={{ fontSize: 11, lineHeight: 1.6, color: "rgba(255,255,255,0.5)" }}>{r[2]}</div>}
            </div>
          ))}
        </div>
        {isEditing && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, color: D.textMuted, marginBottom: 6 }}>Mỗi dòng: emoji — Tiêu đề — Mô tả (để trống = dùng mặc định)</div>
            <InlineText value={overrides?.body ?? ""} placeholder={"🏆 — Chất lượng vượt trội — Mô tả...\n⚡ — Công nghệ thông minh — Mô tả..."} isEditing={true} onCommit={v => onUpdate("body", v)}
              multiline style={{ fontSize: 12, color: D.textSecondary }} />
          </div>
        )}
      </div>
    </SlideShell>
  );
}

// ─── Slide: Warranty ─────────────────────────────────────────────────────────
function SlideWarranty({ overrides, isEditing, onUpdate }: SlideProps) {
  const defaultTerms = [
    "Sản phẩm được sử dụng đúng mục đích và hướng dẫn sử dụng",
    "Không tự ý tháo lắp, sửa chữa hoặc thay thế linh kiện",
    "Bảo hành tại nhà trong bán kính 30km TP.HCM (miễn phí)",
    "Ngoài phạm vi: hỗ trợ kỹ thuật từ xa hoặc gửi linh kiện thay thế",
    "Xuất trình hóa đơn mua hàng khi yêu cầu bảo hành",
  ];
  const terms = (overrides?.body ?? defaultTerms.join("\n")).split("\n").filter(Boolean);

  return (
    <SlideShell>
      <div style={{ flex: 1, padding: "36px 44px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: D.gold, marginBottom: 8 }}>CAM KẾT</div>
          <h2 style={{ fontSize: 34, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING }}>
            <InlineText value={overrides?.title ?? ""} placeholder="Chính Sách Bảo Hành" isEditing={isEditing} onCommit={v => onUpdate("title", v)}
              style={{ fontSize: 34, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING }} />
          </h2>
          <div style={{ width: 56, height: 2, background: D.gold, marginTop: 10 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
          {[["5", "Khung cơ", "Khung thép mạ kẽm, hàn điểm công nghiệp"], ["3", "Motor điện", "Động cơ nâng đầu & nâng chân độc lập"], ["1", "Đệm & vải", "Đệm foam cao cấp, vải bọc chống bẩn"]].map(([y, l, d]) => (
            <div key={l} style={{ borderRadius: 16, padding: "20px 12px", textAlign: "center", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
              <div style={{ fontSize: 40, fontWeight: 900, color: D.gold }}>{y}</div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: D.gold, marginBottom: 6 }}>NĂM</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: D.textPrimary, marginBottom: 4 }}>{l}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{ borderRadius: 16, padding: "18px 22px", marginBottom: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: D.textPrimary, marginBottom: 12 }}>Điều kiện bảo hành</div>
          {terms.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: D.gold, flexShrink: 0, marginTop: 5 }} />
              <span style={{ fontSize: 12, color: "rgba(245,237,214,0.7)", lineHeight: 1.5 }}>{t}</span>
            </div>
          ))}
        </div>
        {isEditing && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: D.textMuted, marginBottom: 6 }}>Điều kiện bảo hành (mỗi dòng = 1 điều kiện):</div>
            <InlineText value={overrides?.body ?? defaultTerms.join("\n")} placeholder={defaultTerms.join("\n")} isEditing={true} onCommit={v => onUpdate("body", v)}
              multiline style={{ fontSize: 12, color: D.textSecondary }} />
          </div>
        )}
        <div style={{ borderRadius: 16, padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
          <span style={{ fontSize: 28 }}>📞</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: D.textPrimary }}>Hotline hỗ trợ kỹ thuật</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: D.gold }}>1800 6868</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Thứ 2 – Thứ 7, 8:00 – 18:00</div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Contact ───────────────────────────────────────────────────────────
function SlideContact({ today, overrides, isEditing, onUpdate }: { today: string } & SlideProps) {
  const contacts = [
    { icon: "📞", label: "Hotline", value: "1800 6868", sub: "Miễn phí · Thứ 2–7, 8:00–18:00" },
    { icon: "✉️", label: "Email", value: "sales@smartfurni.vn", sub: "Phản hồi trong 2 giờ làm việc" },
    { icon: "🌐", label: "Website", value: "smartfurni.vn", sub: "Xem thêm sản phẩm & khuyến mãi" },
    { icon: "📍", label: "Showroom", value: "TP. Hồ Chí Minh", sub: "Đặt lịch tham quan miễn phí" },
  ];

  return (
    <SlideShell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 60px", textAlign: "center" }}>
        <div style={{ marginBottom: 20 }}>
          <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" style={{ height: 80, width: "auto", objectFit: "contain" }} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.4em", textTransform: "uppercase", color: D.gold, marginBottom: 8 }}>LIÊN HỆ</div>
        <h2 style={{ fontSize: 34, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING, marginBottom: 8, width: "100%" }}>
          <InlineText value={overrides?.title ?? ""} placeholder="Thông Tin Liên Hệ" isEditing={isEditing} onCommit={v => onUpdate("title", v)}
            style={{ fontSize: 34, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING, textAlign: "center" }} />
        </h2>
        <div style={{ width: 56, height: 2, background: D.gold, marginBottom: 28 }} />
        <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {contacts.map(c => (
            <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 16, borderRadius: 16, padding: "14px 20px", textAlign: "left", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 2 }}>{c.label}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: D.textPrimary, fontFamily: FONT_HEADING }}>{c.value}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{c.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ borderRadius: 16, padding: "16px 28px", textAlign: "center", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)", width: "100%", maxWidth: 440 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: D.gold, marginBottom: 4 }}>
            <InlineText value={overrides?.subtitle ?? ""} placeholder="Nhận báo giá ngay hôm nay" isEditing={isEditing} onCommit={v => onUpdate("subtitle", v)}
              style={{ fontSize: 13, fontWeight: 600, color: D.gold, textAlign: "center" }} />
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
            <InlineText value={overrides?.body ?? ""} placeholder="Liên hệ để được tư vấn miễn phí và nhận ưu đãi đặc biệt" isEditing={isEditing} onCommit={v => onUpdate("body", v)}
              style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", textAlign: "center" }} />
          </div>
        </div>
      </div>
      <div style={{ padding: "0 48px 20px", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
          © {new Date().getFullYear()} SmartFurni · Catalogue phát hành ngày {today} · Giá chưa bao gồm VAT
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Empty ─────────────────────────────────────────────────────────────
function SlideEmpty() {
  return (
    <SlideShell>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Slide trống</div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Product Intro (1/4) ───────────────────────────────────────────────
function SlideProductIntro({ product, overrides, isEditing, onUpdate }: { product: CrmProduct } & SlideProps) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const colorDim = isBed ? D.purpleDim : D.blueDim;
  const imageUrl = overrides?.imageDataUrl || product.imageUrl || product.imageAngle1;
  const defaultHighlights = isBed
    ? ["Điều khiển điện không dây", "Nâng đầu 0–70°, nâng chân 0–45°", "Massage rung tích hợp", "Khung thép mạ kẽm bảo hành 5 năm"]
    : ["Gấp mở dễ dàng trong 30 giây", "Kết cấu khung thép chắc chắn", "Đệm foam cao cấp thoáng khí", "Tiết kiệm không gian tối đa"];
  const highlights = (overrides?.body ?? defaultHighlights.join("\n")).split("\n").filter(Boolean);
  const minPrice = product.sizePricings && product.sizePricings.length > 0
    ? Math.min(...product.sizePricings.map(s => s.price))
    : null;

  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "32px 44px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color, padding: "4px 12px", borderRadius: 20, background: colorDim, border: `1px solid ${color}40` }}>
              {isBed ? "GIƯỜNG CÔNG THÁI HỌC" : "SOFA GIƯỜNG ĐA NĂNG"}
            </div>
            <div style={{ fontSize: 9, color: D.textMuted, letterSpacing: "0.2em" }}>SKU: {product.sku}</div>
          </div>
          <div style={{ fontSize: 9, color: D.textMuted, letterSpacing: "0.15em" }}>1 / 4</div>
        </div>

        <div style={{ flex: 1, display: "flex", gap: 36, alignItems: "flex-start" }}>
          <div style={{ width: "42%", flexShrink: 0 }}>
            <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: 16, overflow: "hidden", background: colorDim, border: `1px solid ${color}30` }}>
              <InlineImage src={imageUrl} isEditing={isEditing} onUpload={v => onUpdate("imageDataUrl", v)} onRemove={() => onUpdate("imageDataUrl", "")}
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
                placeholderStyle={{ width: "100%", height: "100%", minHeight: 200, background: colorDim, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
                placeholderLabel="Ảnh sản phẩm" />
            </div>
            {minPrice && (
              <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 12, background: colorDim, border: `1px solid ${color}30`, textAlign: "center" }}>
                <div style={{ fontSize: 9, color: D.textMuted, letterSpacing: "0.2em", marginBottom: 4 }}>GIÁ TỪ</div>
                <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: FONT_PRODUCT }}>{formatVND(minPrice)}</div>
                <div style={{ fontSize: 9, color: D.textMuted, marginTop: 2 }}>Chưa bao gồm VAT</div>
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, lineHeight: 1.25, marginBottom: 12 }}>
              <InlineText value={overrides?.title ?? ""} placeholder={product.name} isEditing={isEditing} onCommit={v => onUpdate("title", v)}
                style={{ fontSize: 26, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, lineHeight: 1.25 }} />
            </h2>
            <div style={{ width: 48, height: 3, borderRadius: 2, background: `linear-gradient(90deg, ${color}, transparent)`, marginBottom: 16 }} />
            <p style={{ fontSize: 13, color: D.textSecondary, lineHeight: 1.7, marginBottom: 24 }}>
              <InlineText value={overrides?.subtitle ?? ""} placeholder={product.description ?? "Mô tả sản phẩm..."} isEditing={isEditing} onCommit={v => onUpdate("subtitle", v)}
                style={{ fontSize: 13, color: D.textSecondary, lineHeight: 1.7 }} />
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {highlights.slice(0, 5).map((h, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: `1px solid ${D.border}` }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: D.textSecondary, lineHeight: 1.4 }}>{h}</span>
                </div>
              ))}
            </div>

            {isEditing && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 10, color: D.textMuted, marginBottom: 6 }}>Điểm nổi bật (mỗi dòng = 1 điểm):</div>
                <InlineText value={overrides?.body ?? defaultHighlights.join("\n")} placeholder={defaultHighlights.join("\n")} isEditing={true} onCommit={v => onUpdate("body", v)}
                  multiline style={{ fontSize: 12, color: D.textSecondary }} />
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${D.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
           <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" style={{ height: 20, width: "auto", objectFit: "contain", opacity: 0.85 }} />
          <div style={{ fontSize: 9, color: D.textMuted }}>smartfurni.vn · Giường & Sofa Thông Minh</div>
        </div>
      </div>
    </SlideShell>
  );
}
// ─── Slide: product_gallery (4/4) ─────────────────────────────────────────────
function SlideProductGallery({ product, overrides, isEditing, onUpdate }: { product: CrmProduct } & SlideProps) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const colorDim = isBed ? D.purpleDim : D.blueDim;
  const img1 = overrides?.imageDataUrl || product.imageAngle1 || product.imageUrl;
  const img2 = overrides?.image2DataUrl || product.imageAngle2 || product.imageScene || "";
  const img3 = overrides?.image3DataUrl || product.imageScene || product.imageSpec || "";
  const defaultApplications = isBed
    ? ["Căn hộ cao cấp & Penthouse", "Biệt thự & nhà phố", "Khách sạn 4–5 sao", "Không gian cần sự tinh tế"]
    : ["Căn hộ studio & 1PN", "Căn hộ 2–3 phòng ngủ", "Homestay & căn hộ dịch vụ", "Không gian cần tối ưu diện tích"];
  const applications = (overrides?.body ?? defaultApplications.join("\n")).split("\n").filter(Boolean);

  const ImageSlot = ({ src, field, label, style }: { src?: string; field: keyof SlideOverrides; label: string; style?: React.CSSProperties }) => (
    <div style={{ borderRadius: 12, overflow: "hidden", background: colorDim, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", ...style }}>
      <InlineImage src={src} isEditing={isEditing} onUpload={v => onUpdate(field, v)} onRemove={() => onUpdate(field, "")}
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 } as React.CSSProperties}
        placeholderStyle={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 12 }}
        placeholderLabel={label} />
    </div>
  );

  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "22px 40px 18px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color, marginBottom: 4 }}>ẢNH THỰC TẾ & ỨNG DỤNG</div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, margin: 0 }}>
              <InlineText value={overrides?.title ?? ""} placeholder={product.name} isEditing={isEditing} onCommit={v => onUpdate("title", v)}
                style={{ fontSize: 18, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT }} />
            </h3>
          </div>
          <div style={{ fontSize: 9, color: D.textMuted, letterSpacing: "0.15em", flexShrink: 0 }}>4 / 4</div>
        </div>

        {/* Row 1: 2 ảnh 1:1 nằm ngang */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14, flexShrink: 0 }}>
          <ImageSlot src={img1} field="imageDataUrl" label="Góc chụp 1" style={{ aspectRatio: "1/1", width: "100%" }} />
          <ImageSlot src={img2} field="image2DataUrl" label="Góc chụp 2" style={{ aspectRatio: "1/1", width: "100%" }} />
        </div>

        {/* Phân khúc — nằm giữa trang */}
        <div style={{ flexShrink: 0, marginBottom: 14 }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: D.textMuted, marginBottom: 8, textAlign: "center" }}>PHÂN KHÚC PHÙ HỢP</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {applications.map((app, i) => (
              <div key={i} style={{ padding: "6px 16px", borderRadius: 20, background: colorDim, border: `1px solid ${color}30`, fontSize: 10.5, color: D.textSecondary }}>
                {app}
              </div>
            ))}
          </div>
          {isEditing && (
            <div style={{ marginTop: 8, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: D.textMuted, marginBottom: 4 }}>Phân khúc (mỗi dòng = 1 tag):</div>
              <InlineText value={overrides?.body ?? defaultApplications.join("\n")} placeholder={defaultApplications.join("\n")} isEditing={true} onCommit={v => onUpdate("body", v)}
                multiline style={{ fontSize: 11, color: D.textSecondary }} />
            </div>
          )}
        </div>

        {/* Ảnh phối cảnh 1:1 full width */}
        <div style={{ width: "100%", aspectRatio: "1/1", flexShrink: 0 }}>
          <ImageSlot src={img3} field="image3DataUrl" label="Phối cảnh" style={{ width: "100%", height: "100%" }} />
        </div>

        {/* Footer */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${D.divider}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" style={{ height: 20, width: "auto", objectFit: "contain", opacity: 0.85 }} />
          <div style={{ fontSize: 9, color: D.textMuted }}>smartfurni.vn · Giường & Sofa Thông Minh</div>
        </div>
      </div>
    </SlideShell>
  );
}
