"use client";

import { useState, useRef, useCallback } from "react";
import {
  Printer, Plus, Trash2, GripVertical, Eye, EyeOff,
  ChevronLeft, ChevronRight, LayoutGrid, Layers,
  Package, Tag, Phone, Star, Award,
  CheckCircle2, Shield,
  Edit3, X, RotateCcw, Upload, ImageIcon, Save,
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
  slideBg: "linear-gradient(160deg, #0d0b1a 0%, #1a1000 60%, #2a1800 100%)",
};

// ─── Font: dùng system-ui sans-serif cho tên sản phẩm ─────────────────────────
const FONT_PRODUCT = "'Inter', 'SF Pro Display', system-ui, -apple-system, sans-serif";
const FONT_HEADING = "'Inter', 'SF Pro Display', system-ui, sans-serif";

// ─── Slide Types ──────────────────────────────────────────────────────────────
type SlideType =
  | "cover"
  | "intro"
  | "category_header"
  | "product_intro"    // Trang 1/4: Giới thiệu sản phẩm
  | "product_feature" // Trang 2/4: Tính năng & thông số
  | "product_pricing" // Trang 3/4: Bảng giá
  | "product_gallery" // Trang 4/4: Ảnh thực tế
  | "why_smartfurni"
  | "warranty"
  | "contact";

interface SlideOverrides {
  title?: string;
  subtitle?: string;
  body?: string;
  imageDataUrl?: string;  // Ảnh chính
  image2DataUrl?: string; // Ảnh 2 (gallery)
  image3DataUrl?: string; // Ảnh 3 (gallery)
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
  product_gallery: "SP — Ảnh thực tế (4/4)",
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
      slides.push({ id: `intro_${p.id}`, type: "product_intro", visible: true, productId: p.id });
      slides.push({ id: `feat_${p.id}`, type: "product_feature", visible: true, productId: p.id });
      slides.push({ id: `price_${p.id}`, type: "product_pricing", visible: true, productId: p.id });
      slides.push({ id: `gallery_${p.id}`, type: "product_gallery", visible: true, productId: p.id });
    });
  }
  if (sofas.length > 0) {
    slides.push({ id: "cat_sofa", type: "category_header", visible: true, category: "sofa_bed" });
    sofas.forEach(p => {
      slides.push({ id: `intro_${p.id}`, type: "product_intro", visible: true, productId: p.id });
      slides.push({ id: `feat_${p.id}`, type: "product_feature", visible: true, productId: p.id });
      slides.push({ id: `price_${p.id}`, type: "product_pricing", visible: true, productId: p.id });
      slides.push({ id: `gallery_${p.id}`, type: "product_gallery", visible: true, productId: p.id });
    });
  }
  slides.push({ id: "warranty", type: "warranty", visible: true });
  slides.push({ id: "contact", type: "contact", visible: true });
  return slides;
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props { products: CrmProduct[] }

export default function CatalogueClient({ products }: Props) {
  const [slides, setSlides] = useState<Slide[]>(() => buildDefaultSlides(products));
  const [activeSlideId, setActiveSlideId] = useState<string>("cover");
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);

  const activeProducts = products.filter(p => p.isActive);
  const visibleSlides = slides.filter(s => s.visible);
  const activeSlide = slides.find(s => s.id === activeSlideId) ?? slides[0];
  const activeIndex = visibleSlides.findIndex(s => s.id === activeSlideId);
  const getProduct = (id?: string) => activeProducts.find(p => p.id === id);

  const today = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  // ── Slide management ──
  const toggleVisible = (id: string) => setSlides(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  const removeSlide = (id: string) => {
    setSlides(prev => prev.filter(s => s.id !== id));
    if (activeSlideId === id) setActiveSlideId(slides[0]?.id ?? "");
  };
  const addSlide = (type: SlideType, productId?: string, category?: "ergonomic_bed" | "sofa_bed") => {
    const newSlide: Slide = { id: `${type}_${Date.now()}`, type, visible: true, productId, category };
    setSlides(prev => [...prev, newSlide]);
    setActiveSlideId(newSlide.id);
    setShowAddPanel(false);
  };
  const resetSlides = () => { setSlides(buildDefaultSlides(products)); setActiveSlideId("cover"); };
  const updateSlideOverrides = (id: string, overrides: SlideOverrides) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, overrides: { ...s.overrides, ...overrides } } : s));
  };

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
  };

  // ── Navigate ──
  const goNext = () => { const idx = visibleSlides.findIndex(s => s.id === activeSlideId); if (idx < visibleSlides.length - 1) setActiveSlideId(visibleSlides[idx + 1].id); };
  const goPrev = () => { const idx = visibleSlides.findIndex(s => s.id === activeSlideId); if (idx > 0) setActiveSlideId(visibleSlides[idx - 1].id); };

  return (
    <div className="flex flex-col h-full" style={{ background: D.pageBg }}>

      {/* ── Print CSS ── */}
      <style>{`
        @media print {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          .no-print, .catalogue-toolbar, .catalogue-panel, .catalogue-sidebar { display: none !important; }
          aside, nav, header, [data-sidebar] { display: none !important; }
          .crm-root > aside { display: none !important; }
          .crm-root > main { width: 100% !important; overflow: visible !important; height: auto !important; }
          body, html { overflow: visible !important; height: auto !important; background: #fff !important; margin: 0 !important; padding: 0 !important; }
          .catalogue-print-area { display: block !important; width: 100% !important; }
          .catalogue-slide-print {
            width: 210mm !important;
            height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            margin: 0 auto !important;
            box-sizing: border-box !important;
          }
          .catalogue-slide-print:last-child { page-break-after: avoid !important; break-after: avoid !important; }
          .catalogue-preview-area { display: none !important; }
        }
        @media screen {
          .catalogue-print-area { display: none !important; }
        }
      `}</style>

      {/* ── Toolbar ── */}
      <div className="catalogue-toolbar no-print flex-shrink-0 px-5 py-3 flex items-center justify-between gap-3"
        style={{ background: D.headerBg, borderBottom: `1px solid ${D.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs"
            style={{ background: `linear-gradient(135deg, ${D.gold}, ${D.goldDark})`, color: "#fff" }}>SF</div>
          <div>
            <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: D.gold }}>Catalogue Online</div>
            <div className="text-sm font-bold" style={{ color: D.textPrimary, fontFamily: FONT_HEADING }}>SmartFurni — Giường & Sofa Thông Minh</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: D.goldDim, color: D.gold, border: `1px solid ${D.borderGold}` }}>
            {visibleSlides.length} trang
          </span>
          <button onClick={resetSlides} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textMuted }}>
            <RotateCcw size={12} /> Đặt lại
          </button>
          <button onClick={() => setShowAddPanel(!showAddPanel)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
            <Plus size={12} /> Thêm slide
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: `linear-gradient(135deg, ${D.gold}, ${D.goldDark})`, color: "#fff", boxShadow: D.goldGlow }}>
            <Printer size={14} /> Xuất PDF
          </button>
        </div>
      </div>

      {/* ── Add Slide Panel ── */}
      {showAddPanel && (
        <div className="no-print flex-shrink-0 px-5 py-3 border-b" style={{ background: "rgba(13,11,26,0.99)", borderColor: D.border }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: D.textPrimary }}>Thêm slide mới</span>
            <button onClick={() => setShowAddPanel(false)} style={{ color: D.textMuted }}><X size={16} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["cover", "intro", "why_smartfurni", "warranty", "contact"] as SlideType[]).map(type => {
              const Icon = SLIDE_ICONS[type];
              return (
                <button key={type} onClick={() => addSlide(type)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
                  <Icon size={12} /> {SLIDE_LABELS[type]}
                </button>
              );
            })}
            <button onClick={() => addSlide("category_header", undefined, "ergonomic_bed")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: D.purpleDim, border: `1px solid ${D.purple}40`, color: D.purple }}>
              <Layers size={12} /> Tiêu đề: Giường CTH
            </button>
            <button onClick={() => addSlide("category_header", undefined, "sofa_bed")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: D.blueDim, border: `1px solid ${D.blue}40`, color: D.blue }}>
              <Layers size={12} /> Tiêu đề: Sofa Giường
            </button>
            {activeProducts.map(p => (
              <div key={p.id} className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] font-bold px-2 py-1 rounded" style={{ background: D.goldDim, color: D.gold }}>{p.sku}</span>
                <button onClick={() => addSlide("product_intro", p.id)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
                  <Star size={10} /> 1/4 Giới thiệu
                </button>
                <button onClick={() => addSlide("product_feature", p.id)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
                  <Package size={10} /> 2/4 Tính năng
                </button>
                <button onClick={() => addSlide("product_pricing", p.id)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
                  <Tag size={10} /> 3/4 Bảng giá
                </button>
                <button onClick={() => addSlide("product_gallery", p.id)} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
                  <LayoutGrid size={10} /> 4/4 Ảnh thực tế
                </button>
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
                <div key={slide.id} draggable
                  onDragStart={() => handleDragStart(slide.id)}
                  onDragOver={(e) => handleDragOver(e, slide.id)}
                  onDrop={() => handleDrop(slide.id)}
                  onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                  onClick={() => setActiveSlideId(slide.id)}
                  className="group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: isActive ? D.goldDim : isDragOver ? "rgba(255,255,255,0.06)" : "transparent",
                    border: `1px solid ${isActive ? D.borderGold : "transparent"}`,
                    opacity: slide.visible ? 1 : 0.4,
                  }}>
                  <GripVertical size={11} style={{ color: D.textMuted, flexShrink: 0 }} className="cursor-grab" />
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
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setEditingSlide(slide); }}
                      className="w-5 h-5 rounded flex items-center justify-center" style={{ color: D.gold }}>
                      <Edit3 size={9} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleVisible(slide.id); }}
                      className="w-5 h-5 rounded flex items-center justify-center" style={{ color: D.textMuted }}>
                      {slide.visible ? <Eye size={9} /> : <EyeOff size={9} />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                      className="w-5 h-5 rounded flex items-center justify-center" style={{ color: "#ef4444" }}>
                      <Trash2 size={9} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Center: Slide Preview ── */}
        <div className="catalogue-preview-area flex-1 flex flex-col items-center justify-start overflow-auto py-4 px-6"
          style={{ background: "rgba(5,4,12,0.7)" }}>
          {/* Navigation */}
          <div className="flex items-center gap-4 mb-4 flex-shrink-0">
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
            <button onClick={() => activeSlide && setEditingSlide(activeSlide)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: D.goldDim, border: `1px solid ${D.borderGold}`, color: D.gold }}>
              <Edit3 size={11} /> Chỉnh sửa slide
            </button>
          </div>

          {/* Slide preview — scroll nội dung đầy đủ */}
          <div className="w-full rounded-xl overflow-hidden shadow-2xl flex-shrink-0"
            style={{
              maxWidth: 680,
              border: `1px solid ${D.borderGold}`,
              boxShadow: `0 0 40px rgba(201,168,76,0.1)`,
            }}>
            {activeSlide && (
              <SlideRenderer
                slide={activeSlide}
                product={getProduct(activeSlide.productId)}
                products={activeProducts}
                today={today}
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
                <div key={slide.id} onClick={() => setActiveSlideId(slide.id)}
                  className="cursor-pointer rounded-lg overflow-hidden"
                  style={{ border: `2px solid ${isActive ? D.gold : "transparent"}`, boxShadow: isActive ? D.goldGlow : "none" }}>
                  {/* Thumbnail: scale down slide */}
                  <div style={{ position: "relative", width: "100%", paddingBottom: "141.4%", overflow: "hidden", background: D.pageBg }}>
                    <div style={{ position: "absolute", top: 0, left: 0, width: "560%", height: "560%", transform: "scale(0.179)", transformOrigin: "top left", pointerEvents: "none" }}>
                      <SlideRenderer slide={slide} product={getProduct(slide.productId)} products={activeProducts} today={today} />
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
            <SlideRenderer slide={slide} product={getProduct(slide.productId)} products={activeProducts} today={today} />
          </div>
        ))}
      </div>

      {/* ── Slide Editor Modal ── */}
      {editingSlide && (
        <SlideEditorModal
          slide={editingSlide}
          product={getProduct(editingSlide.productId)}
          onSave={(overrides) => { updateSlideOverrides(editingSlide.id, overrides); setEditingSlide(null); }}
          onClose={() => setEditingSlide(null)}
        />
      )}
    </div>
  );
}

// ─── Slide Editor Modal ───────────────────────────────────────────────────────
function SlideEditorModal({
  slide, product, onSave, onClose,
}: {
  slide: Slide;
  product?: CrmProduct;
  onSave: (overrides: SlideOverrides) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(slide.overrides?.title ?? "");
  const [subtitle, setSubtitle] = useState(slide.overrides?.subtitle ?? "");
  const [body, setBody] = useState(slide.overrides?.body ?? "");
  const [imageDataUrl, setImageDataUrl] = useState(slide.overrides?.imageDataUrl ?? "");
  const [image2DataUrl, setImage2DataUrl] = useState(slide.overrides?.image2DataUrl ?? "");
  const [image3DataUrl, setImage3DataUrl] = useState(slide.overrides?.image3DataUrl ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);
  const fileInput3Ref = useRef<HTMLInputElement>(null);

  const makeUploadHandler = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    onSave({
      title: title || undefined,
      subtitle: subtitle || undefined,
      body: body || undefined,
      imageDataUrl: imageDataUrl || undefined,
      image2DataUrl: image2DataUrl || undefined,
      image3DataUrl: image3DataUrl || undefined,
    });
  };

  const canEditImage = ["cover", "intro", "category_header", "product_intro", "product_feature", "product_pricing", "product_gallery"].includes(slide.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "#0f0d1f", border: `1px solid ${D.borderGold}` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${D.border}` }}>
          <div>
            <div className="text-xs uppercase tracking-widest mb-0.5" style={{ color: D.gold }}>Chỉnh sửa slide</div>
            <div className="text-base font-bold" style={{ color: D.textPrimary, fontFamily: FONT_HEADING }}>
              {SLIDE_LABELS[slide.type]}
              {product && <span className="ml-2 text-sm font-normal" style={{ color: D.textMuted }}>— {product.sku}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ color: D.textMuted }}><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: D.textMuted }}>
              Tiêu đề (để trống = dùng mặc định)
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={product?.name ?? "Tiêu đề slide..."}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${D.border}`, color: D.textPrimary, fontFamily: FONT_PRODUCT }} />
          </div>

          {/* Subtitle */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: D.textMuted }}>
              Phụ đề / Mô tả ngắn
            </label>
            <input value={subtitle} onChange={e => setSubtitle(e.target.value)}
              placeholder="Mô tả ngắn..."
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${D.border}`, color: D.textPrimary }} />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: D.textMuted }}>
              Nội dung chi tiết (mỗi dòng = 1 gạch đầu dòng)
            </label>
            <textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder={"Tính năng 1\nTính năng 2\nTính năng 3"}
              rows={5}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${D.border}`, color: D.textPrimary }} />
          </div>

          {/* Image upload */}
          {canEditImage && (
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: D.textMuted }}>
                {slide.type === "product_gallery" ? "Hình ảnh thực tế (tối đa 3 ảnh)" : "Hình ảnh slide"}
              </label>
              {/* Image 1 */}
              <div className="flex items-start gap-3 mb-3">
                {imageDataUrl ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ border: `1px solid ${D.borderGold}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageDataUrl} alt="preview" className="w-full h-full object-cover" />
                    <button onClick={() => setImageDataUrl("")} className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.9)" }}><X size={10} color="#fff" /></button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: `1px dashed ${D.border}` }}><ImageIcon size={20} style={{ color: D.textMuted }} /></div>
                )}
                <div className="flex-1">
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-full justify-center" style={{ background: D.goldDim, border: `1px solid ${D.borderGold}`, color: D.gold }}>
                    <Upload size={12} /> {slide.type === "product_gallery" ? "Ảnh 1 (chính)" : "Chọn ảnh"}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={makeUploadHandler(setImageDataUrl)} />
                </div>
              </div>
              {/* Image 2 & 3 — only for gallery */}
              {slide.type === "product_gallery" && (
                <>
                  <div className="flex items-start gap-3 mb-3">
                    {image2DataUrl ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ border: `1px solid ${D.border}` }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image2DataUrl} alt="preview2" className="w-full h-full object-cover" />
                        <button onClick={() => setImage2DataUrl("")} className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.9)" }}><X size={10} color="#fff" /></button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: `1px dashed ${D.border}` }}><ImageIcon size={20} style={{ color: D.textMuted }} /></div>
                    )}
                    <div className="flex-1">
                      <button onClick={() => fileInput2Ref.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-full justify-center" style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
                        <Upload size={12} /> Ảnh 2
                      </button>
                      <input ref={fileInput2Ref} type="file" accept="image/*" className="hidden" onChange={makeUploadHandler(setImage2DataUrl)} />
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    {image3DataUrl ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0" style={{ border: `1px solid ${D.border}` }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image3DataUrl} alt="preview3" className="w-full h-full object-cover" />
                        <button onClick={() => setImage3DataUrl("")} className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.9)" }}><X size={10} color="#fff" /></button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.04)", border: `1px dashed ${D.border}` }}><ImageIcon size={20} style={{ color: D.textMuted }} /></div>
                    )}
                    <div className="flex-1">
                      <button onClick={() => fileInput3Ref.current?.click()} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium w-full justify-center" style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
                        <Upload size={12} /> Ảnh 3
                      </button>
                      <input ref={fileInput3Ref} type="file" accept="image/*" className="hidden" onChange={makeUploadHandler(setImage3DataUrl)} />
                    </div>
                  </div>
                </>
              )}
              <p className="text-[10px] mt-2" style={{ color: D.textMuted }}>Hỗ trợ JPG, PNG, WebP. Ảnh lưu trong phiên làm việc.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: `1px solid ${D.border}` }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textMuted }}>
            Huỷ
          </button>
          <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold"
            style={{ background: `linear-gradient(135deg, ${D.gold}, ${D.goldDark})`, color: "#fff" }}>
            <Save size={14} /> Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Slide Renderer ───────────────────────────────────────────────────────────
function SlideRenderer({ slide, product, products, today }: {
  slide: Slide; product?: CrmProduct; products: CrmProduct[]; today: string;
}) {
  switch (slide.type) {
    case "cover": return <SlideCover today={today} overrides={slide.overrides} />;
    case "intro": return <SlideIntro overrides={slide.overrides} />;
    case "category_header": return <SlideCategoryHeader category={slide.category!} overrides={slide.overrides} />;
    case "product_intro": return product ? <SlideProductIntro product={product} overrides={slide.overrides} /> : <SlideEmpty />;
    case "product_feature": return product ? <SlideProductFeature product={product} overrides={slide.overrides} /> : <SlideEmpty />;
    case "product_pricing": return product ? <SlideProductPricing product={product} overrides={slide.overrides} /> : <SlideEmpty />;
    case "product_gallery": return product ? <SlideProductGallery product={product} overrides={slide.overrides} /> : <SlideEmpty />;
    case "why_smartfurni": return <SlideWhySmartFurni overrides={slide.overrides} />;
    case "warranty": return <SlideWarranty overrides={slide.overrides} />;
    case "contact": return <SlideContact today={today} overrides={slide.overrides} />;
    default: return <SlideEmpty />;
  }
}

// ─── Shared Slide Shell ───────────────────────────────────────────────────────
function SlideShell({ accentColor = D.gold, children }: { accentColor?: string; children: React.ReactNode }) {
  return (
    <div style={{
      width: "100%",
      minHeight: "297mm",
      display: "flex",
      flexDirection: "column",
      background: D.slideBg,
      fontFamily: FONT_HEADING,
    }}>
      <div style={{ height: 5, flexShrink: 0, background: `linear-gradient(90deg, ${accentColor}, #f5edd6, ${accentColor})` }} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>{children}</div>
      <div style={{ height: 4, flexShrink: 0, background: `linear-gradient(90deg, ${accentColor}, #f5edd6, ${accentColor})` }} />
    </div>
  );
}

// ─── Slide: Cover ─────────────────────────────────────────────────────────────
function SlideCover({ today, overrides }: { today: string; overrides?: SlideOverrides }) {
  return (
    <SlideShell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 60px", textAlign: "center" }}>
        {overrides?.imageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={overrides.imageDataUrl} alt="cover" style={{ width: 120, height: 120, objectFit: "cover", borderRadius: 20, marginBottom: 28, border: `2px solid ${D.borderGold}` }} />
        ) : (
          <div style={{ width: 88, height: 88, borderRadius: 20, background: `linear-gradient(135deg, ${D.gold}, ${D.goldDark})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28, boxShadow: "0 0 40px rgba(201,168,76,0.4)" }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "#fff", fontFamily: FONT_HEADING }}>SF</span>
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4em", textTransform: "uppercase", color: D.gold, marginBottom: 12 }}>SMARTFURNI</div>
        <h1 style={{ fontSize: 52, fontWeight: 900, color: D.textPrimary, lineHeight: 1.1, marginBottom: 16, fontFamily: FONT_HEADING }}>
          {overrides?.title || "CATALOGUE\nSẢN PHẨM"}
        </h1>
        <div style={{ width: 80, height: 2, background: `linear-gradient(90deg, transparent, ${D.gold}, transparent)`, marginBottom: 20 }} />
        <p style={{ fontSize: 18, fontWeight: 500, color: "rgba(245,237,214,0.8)", marginBottom: 8 }}>
          {overrides?.subtitle || "Giường Công Thái Học & Sofa Giường Đa Năng"}
        </p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
          {overrides?.body || "Công nghệ điều khiển điện thông minh — Thiết kế sang trọng hiện đại"}
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
function SlideIntro({ overrides }: { overrides?: SlideOverrides }) {
  const bodyLines = overrides?.body?.split("\n").filter(Boolean) ?? [];
  return (
    <SlideShell>
      <div style={{ flex: 1, padding: "40px 48px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: D.gold, marginBottom: 8 }}>VỀ CHÚNG TÔI</div>
          <h2 style={{ fontSize: 34, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING }}>{overrides?.title || "Thương Hiệu SmartFurni"}</h2>
          <div style={{ width: 56, height: 2, background: D.gold, marginTop: 12 }} />
        </div>
        <div style={{ borderRadius: 16, padding: "20px 24px", marginBottom: 24, background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
          <p style={{ fontSize: 15, lineHeight: 1.7, color: "rgba(245,237,214,0.85)" }}>
            {overrides?.subtitle || "SmartFurni là thương hiệu nội thất thông minh tiên phong tại Việt Nam, chuyên cung cấp giường công thái học điều khiển điện và sofa giường đa năng cao cấp. Chúng tôi mang đến giải pháp nghỉ ngơi tối ưu cho không gian sống hiện đại."}
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
          {(bodyLines.length > 0 ? bodyLines : ["🏆 Chất lượng cao cấp — Vật liệu nhập khẩu, kiểm định nghiêm ngặt", "⚡ Công nghệ thông minh — Điều khiển điện, kết nối app di động", "🛡️ Bảo hành dài hạn — Khung cơ 5 năm, motor điện 3 năm", "🚚 Giao hàng & lắp đặt — Miễn phí trong bán kính 30km TP.HCM"]).map(line => (
            <div key={line} style={{ display: "flex", alignItems: "flex-start", gap: 10, borderRadius: 12, padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{line.split(" ")[0]}</span>
              <span style={{ fontSize: 12, color: "rgba(245,237,214,0.75)", lineHeight: 1.5 }}>{line.replace(/^[^\s]+\s/, "")}</span>
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Category Header ───────────────────────────────────────────────────
function SlideCategoryHeader({ category, overrides }: { category: "ergonomic_bed" | "sofa_bed"; overrides?: SlideOverrides }) {
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
  const bodyLines = overrides?.body?.split("\n").filter(Boolean) ?? defaultFeatures;

  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 60px", textAlign: "center" }}>
        {overrides?.imageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={overrides.imageDataUrl} alt="category" style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 20, marginBottom: 24, border: `2px solid ${color}40` }} />
        ) : (
          <div style={{ width: 96, height: 96, borderRadius: 24, background: colorDim, border: `2px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44, marginBottom: 24 }}>
            {icon}
          </div>
        )}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.4em", textTransform: "uppercase", color, marginBottom: 12 }}>DÒNG SẢN PHẨM</div>
        <h2 style={{ fontSize: 42, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING, marginBottom: 16 }}>{overrides?.title || defaultTitle}</h2>
        <div style={{ width: 72, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, marginBottom: 20 }} />
        <p style={{ fontSize: 15, maxWidth: 440, color: "rgba(245,237,214,0.7)", marginBottom: 36 }}>{overrides?.subtitle || defaultSubtitle}</p>
        <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: 10 }}>
          {bodyLines.map((f, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 12, padding: "10px 18px", background: colorDim, border: `1px solid ${color}25` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: color }} />
              <span style={{ fontSize: 13, color: "rgba(245,237,214,0.85)" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Product Feature ───────────────────────────────────────────────────
function SlideProductFeature({ product, overrides }: { product: CrmProduct; overrides?: SlideOverrides }) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const colorDim = isBed ? D.purpleDim : D.blueDim;
  const specEntries = Object.entries(product.specs || {}).filter(([, v]) => v);
  const bodyLines = overrides?.body?.split("\n").filter(Boolean) ?? [];
  const imageUrl = overrides?.imageDataUrl || product.imageUrl;

  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, padding: "36px 44px", display: "flex", flexDirection: "column" }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 24 }}>
          <div style={{ width: 140, height: 140, borderRadius: 18, overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.06)", border: `1px solid ${color}30` }}>
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="eager" />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>
                {isBed ? "🛏️" : "🛋️"}
              </div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color, marginBottom: 6 }}>
              {isBed ? "GIƯỜNG CÔNG THÁI HỌC" : "SOFA GIƯỜNG ĐA NĂNG"}
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, marginBottom: 6, lineHeight: 1.25 }}>
              {overrides?.title || product.name}
            </h3>
            <div style={{ fontSize: 11, fontFamily: "monospace", padding: "2px 8px", borderRadius: 6, display: "inline-block", marginBottom: 10, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {product.sku}
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(245,237,214,0.7)" }}>
              {overrides?.subtitle || product.description}
            </p>
          </div>
        </div>

        {/* Custom body lines or specs */}
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

        {/* Price bar */}
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

// ─── Slide: Product Pricing ───────────────────────────────────────────────────
function SlideProductPricing({ product, overrides }: { product: CrmProduct; overrides?: SlideOverrides }) {
  const isBed = product.category === "ergonomic_bed";
  const hasSizes = product.sizePricings && product.sizePricings.length > 0;
  const imageUrl = overrides?.imageDataUrl || product.imageUrl;

  return (
    <SlideShell>
      <div style={{ flex: 1, padding: "36px 44px", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          {imageUrl && (
            <div style={{ width: 72, height: 72, borderRadius: 14, overflow: "hidden", flexShrink: 0, border: "1px solid rgba(201,168,76,0.3)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="eager" />
            </div>
          )}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: D.gold, marginBottom: 4 }}>BẢNG GIÁ</div>
            <h3 style={{ fontSize: 26, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT, lineHeight: 1.2 }}>
              {overrides?.title || product.name}
            </h3>
            <div style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{product.sku}</div>
          </div>
        </div>

        {/* Pricing Table */}
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

        {/* Discount Tiers */}
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

        {/* Custom body */}
        {overrides?.body && (
          <div style={{ marginBottom: 16 }}>
            {overrides.body.split("\n").filter(Boolean).map((line, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: D.gold, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: "rgba(245,237,214,0.75)" }}>{line}</span>
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
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
function SlideWhySmartFurni({ overrides }: { overrides?: SlideOverrides }) {
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
          <h2 style={{ fontSize: 34, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING }}>{overrides?.title || "Tại Sao Chọn SmartFurni?"}</h2>
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
      </div>
    </SlideShell>
  );
}

// ─── Slide: Warranty ─────────────────────────────────────────────────────────
function SlideWarranty({ overrides }: { overrides?: SlideOverrides }) {
  const bodyLines = overrides?.body?.split("\n").filter(Boolean) ?? [];
  const defaultTerms = [
    "Sản phẩm được sử dụng đúng mục đích và hướng dẫn sử dụng",
    "Không tự ý tháo lắp, sửa chữa hoặc thay thế linh kiện",
    "Bảo hành tại nhà trong bán kính 30km TP.HCM (miễn phí)",
    "Ngoài phạm vi: hỗ trợ kỹ thuật từ xa hoặc gửi linh kiện thay thế",
    "Xuất trình hóa đơn mua hàng khi yêu cầu bảo hành",
  ];
  const terms = bodyLines.length > 0 ? bodyLines : defaultTerms;

  return (
    <SlideShell>
      <div style={{ flex: 1, padding: "36px 44px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color: D.gold, marginBottom: 8 }}>CAM KẾT</div>
          <h2 style={{ fontSize: 34, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING }}>{overrides?.title || "Chính Sách Bảo Hành"}</h2>
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
function SlideContact({ today, overrides }: { today: string; overrides?: SlideOverrides }) {
  const contacts = [
    { icon: "📞", label: "Hotline", value: "1800 6868", sub: "Miễn phí · Thứ 2–7, 8:00–18:00" },
    { icon: "✉️", label: "Email", value: "sales@smartfurni.vn", sub: "Phản hồi trong 2 giờ làm việc" },
    { icon: "🌐", label: "Website", value: "smartfurni.vn", sub: "Xem thêm sản phẩm & khuyến mãi" },
    { icon: "📍", label: "Showroom", value: "TP. Hồ Chí Minh", sub: "Đặt lịch tham quan miễn phí" },
  ];

  return (
    <SlideShell>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 60px", textAlign: "center" }}>
        {overrides?.imageDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={overrides.imageDataUrl} alt="contact" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 16, marginBottom: 20, border: `2px solid ${D.borderGold}` }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(135deg, ${D.gold}, ${D.goldDark})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "0 0 30px rgba(201,168,76,0.3)" }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#fff", fontFamily: FONT_HEADING }}>SF</span>
          </div>
        )}
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.4em", textTransform: "uppercase", color: D.gold, marginBottom: 8 }}>LIÊN HỆ</div>
        <h2 style={{ fontSize: 34, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_HEADING, marginBottom: 8 }}>{overrides?.title || "Thông Tin Liên Hệ"}</h2>
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
        <div style={{ borderRadius: 16, padding: "16px 28px", textAlign: "center", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: D.gold, marginBottom: 4 }}>{overrides?.subtitle || "Nhận báo giá ngay hôm nay"}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{overrides?.body || "Liên hệ để được tư vấn miễn phí và nhận ưu đãi đặc biệt"}</div>
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

// ─── Slide: Product Intro (1/4) ─────────────────────────────────────────────
function SlideProductIntro({ product, overrides }: { product: CrmProduct; overrides?: SlideOverrides }) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const colorDim = isBed ? D.purpleDim : D.blueDim;
  const imageUrl = overrides?.imageDataUrl || product.imageUrl;
  const highlights = overrides?.body?.split("\n").filter(Boolean) ?? (
    isBed
      ? ["Điều khiển điện không dây", "Nâng đầu 0–70°, nâng chân 0–45°", "Massage rung tích hợp", "Khung thép mạ kẽm bảo hành 5 năm"]
      : ["Gấp mở dễ dàng trong 30 giây", "Kết cấu khung thép chắc chắn", "Đệm foam cao cấp thoáng khí", "Tiết kiệm không gian tối đa"]
  );

  return (
    <SlideShell accentColor={color}>
      {/* Top badge */}
      <div style={{ padding: "28px 44px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: colorDim, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            {isBed ? "🛏️" : "🛋️"}
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color }}>
              {isBed ? "GIƯỜNG CÔNG THÁI HỌC" : "SOFA GIƯỜNG ĐA NĂNG"}
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>{product.sku}</div>
          </div>
        </div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "0.15em" }}>01 / 04</div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", gap: 0, padding: "24px 44px 28px" }}>
        {/* Left: image */}
        <div style={{ width: "48%", flexShrink: 0, borderRadius: 20, overflow: "hidden", background: "rgba(255,255,255,0.04)", border: `1px solid ${color}25`, marginRight: 28 }}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="eager" />
          ) : (
            <div style={{ width: "100%", height: "100%", minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div style={{ fontSize: 56 }}>{isBed ? "🛏️" : "🛋️"}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "0 16px" }}>Chưa có ảnh sản phẩm<br/>Click ✏️ để upload ảnh</div>
            </div>
          )}
        </div>

        {/* Right: info */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: D.textPrimary, fontFamily: FONT_PRODUCT, lineHeight: 1.2, marginBottom: 10 }}>
            {overrides?.title || product.name}
          </h2>
          <div style={{ width: 48, height: 2, background: `linear-gradient(90deg, ${color}, transparent)`, marginBottom: 14 }} />
          <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(245,237,214,0.65)", marginBottom: 20 }}>
            {overrides?.subtitle || product.description || "Mô tả sản phẩm đang được cập nhật..."}
          </p>

          {/* Highlights */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {highlights.slice(0, 4).map((h, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderRadius: 10, background: colorDim, border: `1px solid ${color}20` }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: color }} />
                <span style={{ fontSize: 12, color: "rgba(245,237,214,0.85)", fontWeight: 500 }}>{h}</span>
              </div>
            ))}
          </div>

          {/* Price */}
          <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Giá tham khảo từ</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: D.gold, fontFamily: FONT_HEADING }}>
              {product.sizePricings && product.sizePricings.length > 0
                ? formatVND(Math.min(...product.sizePricings.map(s => s.price)))
                : product.basePrice > 0 ? formatVND(product.basePrice) : "Liên hệ báo giá"}
            </div>
          </div>
        </div>
      </div>
    </SlideShell>
  );
}

// ─── Slide: Product Gallery (4/4) ─────────────────────────────────────────────
function SlideProductGallery({ product, overrides }: { product: CrmProduct; overrides?: SlideOverrides }) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? D.purple : D.blue;
  const img1 = overrides?.imageDataUrl || product.imageUrl;
  const img2 = overrides?.image2DataUrl;
  const img3 = overrides?.image3DataUrl;
  const applications = overrides?.body?.split("\n").filter(Boolean) ?? [
    isBed ? "Căn hộ cao cấp & Penthouse" : "Căn hộ studio & 1PN",
    isBed ? "Biệt thự & nhà phố" : "Căn hộ 2–3 phòng ngủ",
    isBed ? "Khách sạn 4–5 sao" : "Homestay & căn hộ dịch vụ",
    "Không gian cần tối ưu diện tích",
  ];

  return (
    <SlideShell accentColor={color}>
      <div style={{ flex: 1, padding: "28px 44px", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.3em", textTransform: "uppercase", color, marginBottom: 4 }}>ẢNH THỰC TẾ & ỨNG DỤNG</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: D.textPrimary, fontFamily: FONT_PRODUCT }}>
              {overrides?.title || product.name}
            </h3>
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontWeight: 600, letterSpacing: "0.15em" }}>04 / 04</div>
        </div>

        {/* Image grid */}
        <div style={{ display: "grid", gridTemplateColumns: img2 || img3 ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 20, flex: 1 }}>
          {/* Main image */}
          <div style={{ borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.04)", border: `1px solid ${color}25`, gridRow: img2 && img3 ? "span 2" : "auto" }}>
            {img1 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img1} alt="gallery1" style={{ width: "100%", height: "100%", objectFit: "cover", minHeight: 160 }} loading="eager" />
            ) : (
              <div style={{ width: "100%", minHeight: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ fontSize: 36 }}>{isBed ? "🛏️" : "🛋️"}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>Ảnh 1 — Click ✏️ để upload</div>
              </div>
            )}
          </div>
          {/* Image 2 */}
          {(img2 || !img1) && (
            <div style={{ borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.04)", border: `1px dashed ${color}20` }}>
              {img2 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img2} alt="gallery2" style={{ width: "100%", height: "100%", objectFit: "cover", minHeight: 100 }} loading="eager" />
              ) : (
                <div style={{ width: "100%", minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>Ảnh 2 — Click ✏️</div>
                </div>
              )}
            </div>
          )}
          {/* Image 3 */}
          {(img3 || (!img1 && !img2)) && (
            <div style={{ borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,0.04)", border: `1px dashed ${color}20` }}>
              {img3 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img3} alt="gallery3" style={{ width: "100%", height: "100%", objectFit: "cover", minHeight: 100 }} loading="eager" />
              ) : (
                <div style={{ width: "100%", minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textAlign: "center" }}>Ảnh 3 — Click ✏️</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Applications */}
        <div>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 10 }}>PHÙ HỢP VỚI</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {applications.slice(0, 4).map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: colorDim, border: `1px solid ${color}20` }}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", flexShrink: 0, background: color }} />
                <span style={{ fontSize: 11, color: "rgba(245,237,214,0.8)" }}>{a}</span>
              </div>
            ))}
          </div>
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
