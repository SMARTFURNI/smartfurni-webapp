"use client";

import { useState, useCallback, useRef } from "react";
import {
  Printer, Plus, Trash2, GripVertical, Eye, EyeOff,
  ChevronLeft, ChevronRight, LayoutGrid, Layers,
  Package, Tag, Phone, Mail, Globe, Star, Award,
  CheckCircle2, ArrowRight, Zap, Shield, Truck,
  Edit3, X, RotateCcw, Download,
} from "lucide-react";
import type { CrmProduct, SizePricing } from "@/lib/crm-types";
import { formatVND } from "@/lib/crm-types";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const D = {
  pageBg: "linear-gradient(135deg, #0f172a 0%, #1e1a0e 50%, #1a1200 100%)",
  headerBg: "rgba(15,23,42,0.97)",
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
  slideAspect: "210/297", // A4
};

// ─── Slide Types ──────────────────────────────────────────────────────────────
type SlideType =
  | "cover"
  | "intro"
  | "category_header"
  | "product_feature"
  | "product_pricing"
  | "comparison"
  | "why_smartfurni"
  | "warranty"
  | "contact";

interface Slide {
  id: string;
  type: SlideType;
  visible: boolean;
  productId?: string;
  category?: "ergonomic_bed" | "sofa_bed";
  customTitle?: string;
  customSubtitle?: string;
}

const SLIDE_LABELS: Record<SlideType, string> = {
  cover: "Trang Bìa",
  intro: "Giới Thiệu Thương Hiệu",
  category_header: "Tiêu Đề Danh Mục",
  product_feature: "Tính Năng Sản Phẩm",
  product_pricing: "Bảng Giá Sản Phẩm",
  comparison: "So Sánh Dòng Sản Phẩm",
  why_smartfurni: "Tại Sao Chọn SmartFurni",
  warranty: "Chính Sách Bảo Hành",
  contact: "Thông Tin Liên Hệ",
};

const SLIDE_ICONS: Record<SlideType, React.ElementType> = {
  cover: Star,
  intro: Award,
  category_header: Layers,
  product_feature: Package,
  product_pricing: Tag,
  comparison: LayoutGrid,
  why_smartfurni: Shield,
  warranty: CheckCircle2,
  contact: Phone,
};

// ─── Default Slides Builder ───────────────────────────────────────────────────
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
      slides.push({ id: `feat_${p.id}`, type: "product_feature", visible: true, productId: p.id });
      slides.push({ id: `price_${p.id}`, type: "product_pricing", visible: true, productId: p.id });
    });
  }

  if (sofas.length > 0) {
    slides.push({ id: "cat_sofa", type: "category_header", visible: true, category: "sofa_bed" });
    sofas.forEach(p => {
      slides.push({ id: `feat_${p.id}`, type: "product_feature", visible: true, productId: p.id });
      slides.push({ id: `price_${p.id}`, type: "product_pricing", visible: true, productId: p.id });
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
  const printRef = useRef<HTMLDivElement>(null);

  const activeProducts = products.filter(p => p.isActive);
  const visibleSlides = slides.filter(s => s.visible);
  const activeSlide = slides.find(s => s.id === activeSlideId) ?? slides[0];
  const activeIndex = visibleSlides.findIndex(s => s.id === activeSlideId);

  const getProduct = (id?: string) => activeProducts.find(p => p.id === id);

  // ── Slide management ──
  const toggleVisible = (id: string) => {
    setSlides(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  };

  const removeSlide = (id: string) => {
    setSlides(prev => prev.filter(s => s.id !== id));
    if (activeSlideId === id) setActiveSlideId(slides[0]?.id ?? "");
  };

  const addSlide = (type: SlideType, productId?: string, category?: "ergonomic_bed" | "sofa_bed") => {
    const newSlide: Slide = {
      id: `${type}_${Date.now()}`,
      type,
      visible: true,
      productId,
      category,
    };
    setSlides(prev => [...prev, newSlide]);
    setActiveSlideId(newSlide.id);
    setShowAddPanel(false);
  };

  const resetSlides = () => {
    setSlides(buildDefaultSlides(products));
    setActiveSlideId("cover");
  };

  // ── Drag & Drop ──
  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  };
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
    setDragId(null);
    setDragOverId(null);
  };

  // ── Navigate ──
  const goNext = () => {
    const idx = visibleSlides.findIndex(s => s.id === activeSlideId);
    if (idx < visibleSlides.length - 1) setActiveSlideId(visibleSlides[idx + 1].id);
  };
  const goPrev = () => {
    const idx = visibleSlides.findIndex(s => s.id === activeSlideId);
    if (idx > 0) setActiveSlideId(visibleSlides[idx - 1].id);
  };

  // ── Print ──
  const handlePrint = () => {
    window.print();
  };

  const today = new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <div className="flex flex-col h-full" style={{ background: D.pageBg }}>

      {/* ── Print CSS ── */}
      <style>{`
        @media print {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;

          /* Ẩn toàn bộ UI ngoài catalogue */
          .no-print, .catalogue-toolbar, .catalogue-panel, .catalogue-sidebar { display: none !important; }
          aside, nav, header, [data-sidebar] { display: none !important; }
          .crm-root { display: block !important; }
          .crm-root > aside { display: none !important; }
          .crm-root > main { width: 100% !important; overflow: visible !important; height: auto !important; }
          body, html { overflow: visible !important; height: auto !important; background: #fff !important; margin: 0 !important; padding: 0 !important; }

          /* Container in */
          .catalogue-print-area { display: block !important; width: 100% !important; }
          .catalogue-slide-print {
            width: 210mm !important;
            min-height: 297mm !important;
            page-break-after: always !important;
            break-after: page !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            margin: 0 auto !important;
          }
          .catalogue-slide-print:last-child { page-break-after: avoid !important; break-after: avoid !important; }

          /* Ẩn preview area */
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
            style={{ background: `linear-gradient(135deg, ${D.gold}, ${D.goldDark})`, color: "#fff" }}>
            SF
          </div>
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase" style={{ color: D.gold }}>Catalogue Online</div>
            <div className="text-sm font-bold" style={{ color: D.textPrimary }}>SmartFurni — Giường & Sofa Thông Minh</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: D.goldDim, color: D.gold, border: `1px solid ${D.borderGold}` }}>
            {visibleSlides.length} trang
          </span>
          <button onClick={resetSlides}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textMuted }}>
            <RotateCcw size={12} /> Đặt lại
          </button>
          <button onClick={() => setShowAddPanel(!showAddPanel)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
            <Plus size={12} /> Thêm slide
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{ background: `linear-gradient(135deg, ${D.gold}, ${D.goldDark})`, color: "#fff", boxShadow: D.goldGlow }}>
            <Printer size={14} /> Xuất PDF
          </button>
        </div>
      </div>

      {/* ── Add Slide Panel ── */}
      {showAddPanel && (
        <div className="no-print flex-shrink-0 px-5 py-3 border-b"
          style={{ background: "rgba(15,23,42,0.98)", borderColor: D.border }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: D.textPrimary }}>Thêm slide mới</span>
            <button onClick={() => setShowAddPanel(false)} style={{ color: D.textMuted }}><X size={16} /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Static slides */}
            {(["cover", "intro", "why_smartfurni", "warranty", "contact"] as SlideType[]).map(type => {
              const Icon = SLIDE_ICONS[type];
              return (
                <button key={type} onClick={() => addSlide(type)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
                  <Icon size={12} /> {SLIDE_LABELS[type]}
                </button>
              );
            })}
            {/* Category headers */}
            <button onClick={() => addSlide("category_header", undefined, "ergonomic_bed")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: D.purpleDim, border: `1px solid ${D.purple}40`, color: D.purple }}>
              <Layers size={12} /> Tiêu đề: Giường CTH
            </button>
            <button onClick={() => addSlide("category_header", undefined, "sofa_bed")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: D.blueDim, border: `1px solid ${D.blue}40`, color: D.blue }}>
              <Layers size={12} /> Tiêu đề: Sofa Giường
            </button>
            {/* Product slides */}
            {activeProducts.map(p => (
              <div key={p.id} className="flex items-center gap-1">
                <button onClick={() => addSlide("product_feature", p.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
                  <Package size={12} /> {p.sku} - Tính năng
                </button>
                <button onClick={() => addSlide("product_pricing", p.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textSecondary }}>
                  <Tag size={12} /> {p.sku} - Giá
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
          style={{ background: "rgba(10,10,20,0.8)", borderRight: `1px solid ${D.border}` }}>
          <div className="px-3 py-2.5 flex items-center justify-between flex-shrink-0"
            style={{ borderBottom: `1px solid ${D.divider}` }}>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: D.textMuted }}>
              Danh sách trang
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: D.goldDim, color: D.gold }}>
              {slides.length}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
            {slides.map((slide, idx) => {
              const Icon = SLIDE_ICONS[slide.type];
              const product = getProduct(slide.productId);
              const isActive = slide.id === activeSlideId;
              const isDragOver = dragOverId === slide.id;
              return (
                <div
                  key={slide.id}
                  draggable
                  onDragStart={() => handleDragStart(slide.id)}
                  onDragOver={(e) => handleDragOver(e, slide.id)}
                  onDrop={() => handleDrop(slide.id)}
                  onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                  onClick={() => { setActiveSlideId(slide.id); }}
                  className="group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: isActive ? D.goldDim : isDragOver ? "rgba(255,255,255,0.06)" : "transparent",
                    border: `1px solid ${isActive ? D.borderGold : "transparent"}`,
                    opacity: slide.visible ? 1 : 0.4,
                  }}>
                  <GripVertical size={12} style={{ color: D.textMuted, flexShrink: 0 }} className="cursor-grab" />
                  <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: isActive ? D.goldDim : "rgba(255,255,255,0.06)" }}>
                    <Icon size={11} style={{ color: isActive ? D.gold : D.textMuted }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold truncate" style={{ color: isActive ? D.gold : D.textSecondary }}>
                      {idx + 1}. {SLIDE_LABELS[slide.type]}
                    </div>
                    {product && (
                      <div className="text-[9px] truncate" style={{ color: D.textMuted }}>{product.sku}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); toggleVisible(slide.id); }}
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ color: slide.visible ? D.textMuted : D.textMuted }}>
                      {slide.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); removeSlide(slide.id); }}
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ color: "#ef4444" }}>
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Center: Slide Preview ── */}
        <div className="catalogue-preview-area flex-1 flex flex-col items-center justify-center overflow-auto p-6"
          style={{ background: "rgba(5,5,15,0.6)" }}>

          {/* Navigation */}
          <div className="flex items-center gap-4 mb-4">
            <button onClick={goPrev} disabled={activeIndex <= 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textMuted }}>
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs" style={{ color: D.textMuted }}>
              {activeIndex + 1} / {visibleSlides.length}
            </span>
            <button onClick={goNext} disabled={activeIndex >= visibleSlides.length - 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
              style={{ background: D.cardBg, border: `1px solid ${D.border}`, color: D.textMuted }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Slide Preview Box */}
          <div className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
            style={{ border: `1px solid ${D.borderGold}`, boxShadow: `0 0 40px rgba(201,168,76,0.1)` }}>
            {activeSlide && (
              <SlideRenderer
                slide={activeSlide}
                product={getProduct(activeSlide.productId)}
                products={activeProducts}
                today={today}
                preview
              />
            )}
          </div>

          {/* Slide type label */}
          <div className="mt-3 text-xs" style={{ color: D.textMuted }}>
            {SLIDE_LABELS[activeSlide?.type ?? "cover"]}
            {!activeSlide?.visible && <span className="ml-2 px-1.5 py-0.5 rounded text-[10px]"
              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>Ẩn</span>}
          </div>
        </div>

        {/* ── Right Panel: Slide Thumbnails ── */}
        <div className="catalogue-panel w-36 flex-shrink-0 flex flex-col overflow-hidden"
          style={{ background: "rgba(10,10,20,0.8)", borderLeft: `1px solid ${D.border}` }}>
          <div className="px-3 py-2.5 flex-shrink-0" style={{ borderBottom: `1px solid ${D.divider}` }}>
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: D.textMuted }}>
              Xem trước
            </span>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-2">
            {visibleSlides.map((slide, idx) => {
              const isActive = slide.id === activeSlideId;
              return (
                <div key={slide.id} onClick={() => setActiveSlideId(slide.id)}
                  className="cursor-pointer rounded-lg overflow-hidden transition-all"
                  style={{
                    border: `2px solid ${isActive ? D.gold : "transparent"}`,
                    boxShadow: isActive ? D.goldGlow : "none",
                  }}>
                  <div className="w-full" style={{ aspectRatio: "210/297", overflow: "hidden", transform: "scale(1)", transformOrigin: "top left" }}>
                    <div style={{ transform: "scale(0.19)", transformOrigin: "top left", width: "527%", height: "527%", pointerEvents: "none" }}>
                      <SlideRenderer
                        slide={slide}
                        product={getProduct(slide.productId)}
                        products={activeProducts}
                        today={today}
                        preview={false}
                      />
                    </div>
                  </div>
                  <div className="text-center py-0.5 text-[9px]" style={{ background: "rgba(0,0,0,0.5)", color: isActive ? D.gold : D.textMuted }}>
                    {idx + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Print Area (hidden on screen, shown when printing) ── */}
      <div className="catalogue-print-area" ref={printRef}>
        {visibleSlides.map((slide) => (
          <div key={slide.id} className="catalogue-slide-print">
            <SlideRenderer
              slide={slide}
              product={getProduct(slide.productId)}
              products={activeProducts}
              today={today}
              preview={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Slide Renderer ───────────────────────────────────────────────────────────
function SlideRenderer({
  slide, product, products, today, preview,
}: {
  slide: Slide;
  product?: CrmProduct;
  products: CrmProduct[];
  today: string;
  preview: boolean;
}) {
  switch (slide.type) {
    case "cover": return <SlideCover today={today} />;
    case "intro": return <SlideIntro />;
    case "category_header": return <SlideCategoryHeader category={slide.category!} />;
    case "product_feature": return product ? <SlideProductFeature product={product} /> : <SlideEmpty />;
    case "product_pricing": return product ? <SlideProductPricing product={product} /> : <SlideEmpty />;
    case "why_smartfurni": return <SlideWhySmartFurni />;
    case "warranty": return <SlideWarranty />;
    case "contact": return <SlideContact today={today} />;
    default: return <SlideEmpty />;
  }
}

// ─── Slide: Cover ─────────────────────────────────────────────────────────────
function SlideCover({ today }: { today: string }) {
  return (
    <div className="w-full h-full flex flex-col" style={{
      background: "linear-gradient(160deg, #0d0b1a 0%, #1a1000 45%, #2a1800 100%)",
      minHeight: "297mm",
    }}>
      {/* Gold top bar */}
      <div style={{ height: 6, background: "linear-gradient(90deg, #C9A84C, #f5edd6, #C9A84C)" }} />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-12 text-center">
        {/* Logo mark */}
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
          style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)", boxShadow: "0 0 40px rgba(201,168,76,0.4)" }}>
          <span className="text-3xl font-black text-white">SF</span>
        </div>

        {/* Brand */}
        <div className="text-xs font-bold tracking-[0.4em] uppercase mb-3" style={{ color: "#C9A84C" }}>
          SMARTFURNI
        </div>
        <h1 className="text-5xl font-black mb-4 leading-tight" style={{ color: "#f5edd6" }}>
          CATALOGUE<br />SẢN PHẨM
        </h1>
        <div className="w-24 h-0.5 mb-6" style={{ background: "linear-gradient(90deg, transparent, #C9A84C, transparent)" }} />
        <p className="text-lg font-medium mb-2" style={{ color: "rgba(245,237,214,0.8)" }}>
          Giường Công Thái Học & Sofa Giường Đa Năng
        </p>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          Công nghệ điều khiển điện thông minh — Thiết kế sang trọng hiện đại
        </p>
      </div>

      {/* Bottom info */}
      <div className="px-12 pb-10 flex items-end justify-between">
        <div>
          <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Ngày phát hành</div>
          <div className="text-sm font-semibold" style={{ color: "#C9A84C" }}>{today}</div>
        </div>
        <div className="text-right">
          <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Phiên bản</div>
          <div className="text-sm font-semibold" style={{ color: "rgba(245,237,214,0.6)" }}>2025 Edition</div>
        </div>
      </div>

      {/* Gold bottom bar */}
      <div style={{ height: 4, background: "linear-gradient(90deg, #C9A84C, #f5edd6, #C9A84C)" }} />
    </div>
  );
}

// ─── Slide: Intro ─────────────────────────────────────────────────────────────
function SlideIntro() {
  return (
    <div className="w-full h-full flex flex-col" style={{
      background: "linear-gradient(160deg, #0d0b1a 0%, #1a1000 60%, #2a1800 100%)",
      minHeight: "297mm",
    }}>
      <div style={{ height: 4, background: "linear-gradient(90deg, #C9A84C, #f5edd6, #C9A84C)" }} />

      <div className="flex-1 px-12 py-10 flex flex-col">
        {/* Header */}
        <div className="mb-8">
          <div className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: "#C9A84C" }}>
            VỀ CHÚNG TÔI
          </div>
          <h2 className="text-3xl font-black" style={{ color: "#f5edd6" }}>Thương Hiệu SmartFurni</h2>
          <div className="w-16 h-0.5 mt-3" style={{ background: "#C9A84C" }} />
        </div>

        {/* Story */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
          <p className="text-base leading-relaxed" style={{ color: "rgba(245,237,214,0.85)" }}>
            SmartFurni là thương hiệu nội thất thông minh tiên phong tại Việt Nam, chuyên cung cấp
            giường công thái học điều khiển điện và sofa giường đa năng cao cấp. Chúng tôi mang đến
            giải pháp nghỉ ngơi tối ưu cho không gian sống hiện đại.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { value: "5+", label: "Năm kinh nghiệm" },
            { value: "1000+", label: "Khách hàng tin dùng" },
            { value: "8", label: "Dòng sản phẩm" },
          ].map(stat => (
            <div key={stat.label} className="text-center rounded-xl p-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-2xl font-black mb-1" style={{ color: "#C9A84C" }}>{stat.value}</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Values */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "🏆", title: "Chất lượng cao cấp", desc: "Vật liệu nhập khẩu, kiểm định nghiêm ngặt" },
            { icon: "⚡", title: "Công nghệ thông minh", desc: "Điều khiển điện, kết nối app di động" },
            { icon: "🛡️", title: "Bảo hành dài hạn", desc: "Khung cơ 5 năm, motor điện 3 năm" },
            { icon: "🚚", title: "Giao hàng & lắp đặt", desc: "Miễn phí trong bán kính 30km TP.HCM" },
          ].map(v => (
            <div key={v.title} className="flex items-start gap-3 rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-xl flex-shrink-0">{v.icon}</span>
              <div>
                <div className="text-sm font-semibold mb-0.5" style={{ color: "#f5edd6" }}>{v.title}</div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{v.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 4, background: "linear-gradient(90deg, #C9A84C, #f5edd6, #C9A84C)" }} />
    </div>
  );
}

// ─── Slide: Category Header ───────────────────────────────────────────────────
function SlideCategoryHeader({ category }: { category: "ergonomic_bed" | "sofa_bed" }) {
  const isBed = category === "ergonomic_bed";
  const color = isBed ? "#a78bfa" : "#60a5fa";
  const colorDim = isBed ? "rgba(167,139,250,0.1)" : "rgba(96,165,250,0.1)";
  const icon = isBed ? "🛏️" : "🛋️";
  const title = isBed ? "Giường Công Thái Học" : "Sofa Giường Đa Năng";
  const subtitle = isBed
    ? "Dòng giường điều khiển điện thông minh, hỗ trợ nâng đầu/chân, tích hợp massage"
    : "Dòng sofa gấp thành giường thông minh, tiết kiệm không gian, phù hợp căn hộ hiện đại";
  const features = isBed
    ? ["Điều khiển điện không dây", "Nâng đầu 0–70°, nâng chân 0–45°", "Massage rung tích hợp", "Khung thép mạ kẽm bảo hành 5 năm", "Điều khiển từ xa & app"]
    : ["Gấp mở dễ dàng trong 30 giây", "Kết cấu khung thép chắc chắn", "Đệm foam cao cấp thoáng khí", "Tiết kiệm không gian tối đa", "Phù hợp căn hộ 30–80m²"];

  return (
    <div className="w-full h-full flex flex-col" style={{
      background: "linear-gradient(160deg, #0d0b1a 0%, #1a1000 60%, #2a1800 100%)",
      minHeight: "297mm",
    }}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, #f5edd6, ${color})` }} />

      <div className="flex-1 flex flex-col items-center justify-center px-12 text-center">
        {/* Icon */}
        <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl mb-8"
          style={{ background: colorDim, border: `2px solid ${color}40` }}>
          {icon}
        </div>

        {/* Label */}
        <div className="text-xs font-bold tracking-[0.4em] uppercase mb-3" style={{ color }}>
          DÒNG SẢN PHẨM
        </div>

        {/* Title */}
        <h2 className="text-4xl font-black mb-4" style={{ color: "#f5edd6" }}>{title}</h2>
        <div className="w-20 h-0.5 mb-6" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
        <p className="text-base max-w-md mb-10" style={{ color: "rgba(245,237,214,0.7)" }}>{subtitle}</p>

        {/* Features */}
        <div className="w-full max-w-md space-y-2">
          {features.map(f => (
            <div key={f} className="flex items-center gap-3 rounded-xl px-4 py-2.5"
              style={{ background: colorDim, border: `1px solid ${color}25` }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-sm" style={{ color: "rgba(245,237,214,0.85)" }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, #f5edd6, ${color})` }} />
    </div>
  );
}

// ─── Slide: Product Feature ───────────────────────────────────────────────────
function SlideProductFeature({ product }: { product: CrmProduct }) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? "#a78bfa" : "#60a5fa";
  const colorDim = isBed ? "rgba(167,139,250,0.1)" : "rgba(96,165,250,0.1)";
  const specEntries = Object.entries(product.specs || {}).filter(([, v]) => v);

  return (
    <div className="w-full h-full flex flex-col" style={{
      background: "linear-gradient(160deg, #0d0b1a 0%, #1a1000 60%, #2a1800 100%)",
      minHeight: "297mm",
    }}>
      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, #f5edd6, ${color})` }} />

      <div className="flex-1 px-10 py-8 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          {/* Product image */}
          <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${color}30` }}>
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" loading="eager" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                {isBed ? "🛏️" : "🛋️"}
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold tracking-[0.3em] uppercase mb-1" style={{ color }}>
              {isBed ? "GIƯỜNG CÔNG THÁI HỌC" : "SOFA GIƯỜNG ĐA NĂNG"}
            </div>
            <h3 className="text-2xl font-black mb-1" style={{ color: "#f5edd6" }}>{product.name}</h3>
            <div className="text-sm font-mono px-2 py-0.5 rounded inline-block mb-2"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}>
              {product.sku}
            </div>
            {product.description && (
              <p className="text-sm leading-relaxed" style={{ color: "rgba(245,237,214,0.7)" }}>
                {product.description}
              </p>
            )}
          </div>
        </div>

        {/* Specs Grid */}
        {specEntries.length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
              THÔNG SỐ KỸ THUẬT
            </div>
            <div className="grid grid-cols-2 gap-2">
              {specEntries.map(([key, val]) => (
                <div key={key} className="flex items-start gap-2 rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
                  <div>
                    <div className="text-[10px] uppercase tracking-wide mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{key}</div>
                    <div className="text-xs font-semibold" style={{ color: "#f5edd6" }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price preview */}
        <div className="mt-auto rounded-2xl p-4 flex items-center justify-between"
          style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)" }}>
          <div>
            <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Giá tham khảo từ</div>
            <div className="text-2xl font-black" style={{ color: "#C9A84C" }}>
              {product.sizePricings && product.sizePricings.length > 0
                ? formatVND(Math.min(...product.sizePricings.map(s => s.price)))
                : product.basePrice > 0 ? formatVND(product.basePrice) : "Liên hệ"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>Bảo hành</div>
            <div className="text-sm font-semibold" style={{ color: "#f5edd6" }}>
              {isBed ? "Khung 5 năm · Motor 3 năm" : "Khung 3 năm · Đệm 1 năm"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, #f5edd6, ${color})` }} />
    </div>
  );
}

// ─── Slide: Product Pricing ───────────────────────────────────────────────────
function SlideProductPricing({ product }: { product: CrmProduct }) {
  const isBed = product.category === "ergonomic_bed";
  const color = isBed ? "#a78bfa" : "#60a5fa";
  const hasSizes = product.sizePricings && product.sizePricings.length > 0;

  return (
    <div className="w-full h-full flex flex-col" style={{
      background: "linear-gradient(160deg, #0d0b1a 0%, #1a1000 60%, #2a1800 100%)",
      minHeight: "297mm",
    }}>
      <div style={{ height: 4, background: "linear-gradient(90deg, #C9A84C, #f5edd6, #C9A84C)" }} />

      <div className="flex-1 px-10 py-8 flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="text-xs font-bold tracking-[0.3em] uppercase mb-1" style={{ color: "#C9A84C" }}>
            BẢNG GIÁ
          </div>
          <h3 className="text-2xl font-black" style={{ color: "#f5edd6" }}>{product.name}</h3>
          <div className="text-sm font-mono mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{product.sku}</div>
        </div>

        {/* Pricing Table */}
        {hasSizes ? (
          <div className="rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid rgba(201,168,76,0.2)" }}>
            <div className="px-5 py-3" style={{ background: "rgba(201,168,76,0.1)" }}>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>Kích thước</div>
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>Mã</div>
                <div className="text-xs font-bold uppercase tracking-wide text-right" style={{ color: "rgba(255,255,255,0.5)" }}>Đơn giá (VNĐ)</div>
              </div>
            </div>
            {product.sizePricings!.map((sp: SizePricing, i: number) => (
              <div key={i} className="px-5 py-3.5 grid grid-cols-3 gap-4"
                style={{
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                }}>
                <div className="text-sm font-medium" style={{ color: "#f5edd6" }}>{sp.label || sp.size}</div>
                <div className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>{sp.size}</div>
                <div className="text-sm font-black text-right" style={{ color: "#C9A84C" }}>
                  {sp.price > 0 ? formatVND(sp.price) : "Liên hệ"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl p-6 mb-6 text-center"
            style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <div className="text-3xl font-black mb-1" style={{ color: "#C9A84C" }}>
              {product.basePrice > 0 ? formatVND(product.basePrice) : "Liên hệ"}
            </div>
            <div className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Giá niêm yết chưa VAT</div>
          </div>
        )}

        {/* Discount Tiers */}
        {product.discountTiers && product.discountTiers.length > 0 && (
          <div className="mb-6">
            <div className="text-xs font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
              CHIẾT KHẤU THEO SỐ LƯỢNG
            </div>
            <div className="grid grid-cols-3 gap-2">
              {product.discountTiers.map((tier, i) => (
                <div key={i} className="rounded-xl p-3 text-center"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-lg font-black" style={{ color: "#C9A84C" }}>{tier.discountPct}%</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{tier.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mt-auto rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="text-xs space-y-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            <div>• Giá trên chưa bao gồm VAT (10%)</div>
            <div>• Giá có thể thay đổi mà không báo trước</div>
            <div>• Liên hệ để được báo giá dự án (số lượng lớn)</div>
          </div>
        </div>
      </div>

      <div style={{ height: 4, background: "linear-gradient(90deg, #C9A84C, #f5edd6, #C9A84C)" }} />
    </div>
  );
}

// ─── Slide: Why SmartFurni ────────────────────────────────────────────────────
function SlideWhySmartFurni() {
  const reasons = [
    { icon: "🏆", title: "Chất lượng vượt trội", desc: "Vật liệu nhập khẩu cao cấp, quy trình sản xuất đạt chuẩn ISO, kiểm định nghiêm ngặt từng sản phẩm trước khi xuất xưởng." },
    { icon: "⚡", title: "Công nghệ thông minh", desc: "Hệ thống điều khiển điện tử tiên tiến, điều chỉnh góc nâng chính xác, kết nối điều khiển từ xa và ứng dụng di động." },
    { icon: "🛡️", title: "Bảo hành toàn diện", desc: "Khung cơ bảo hành 5 năm, motor điện 3 năm, đệm và vải 1 năm. Hỗ trợ kỹ thuật 24/7 trong suốt thời gian bảo hành." },
    { icon: "🚚", title: "Dịch vụ trọn gói", desc: "Giao hàng và lắp đặt miễn phí trong bán kính 30km TP.HCM. Thời gian giao hàng 7–14 ngày làm việc sau xác nhận đơn." },
    { icon: "💎", title: "Thiết kế sang trọng", desc: "Ngôn ngữ thiết kế tối giản, tinh tế. Phù hợp với không gian nội thất cao cấp, căn hộ penthouse, biệt thự." },
    { icon: "🤝", title: "Hỗ trợ chuyên nghiệp", desc: "Đội ngũ tư vấn chuyên nghiệp, hỗ trợ thiết kế không gian, báo giá dự án và chính sách đặc biệt cho đối tác B2B." },
  ];

  return (
    <div className="w-full h-full flex flex-col" style={{
      background: "linear-gradient(160deg, #0d0b1a 0%, #1a1000 60%, #2a1800 100%)",
      minHeight: "297mm",
    }}>
      <div style={{ height: 4, background: "linear-gradient(90deg, #C9A84C, #f5edd6, #C9A84C)" }} />

      <div className="flex-1 px-10 py-8 flex flex-col">
        <div className="mb-6">
          <div className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: "#C9A84C" }}>
            LÝ DO LỰA CHỌN
          </div>
          <h2 className="text-3xl font-black" style={{ color: "#f5edd6" }}>Tại Sao Chọn SmartFurni?</h2>
          <div className="w-16 h-0.5 mt-3" style={{ background: "#C9A84C" }} />
        </div>

        <div className="grid grid-cols-2 gap-4 flex-1">
          {reasons.map(r => (
            <div key={r.title} className="rounded-2xl p-5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="text-2xl mb-2">{r.icon}</div>
              <div className="text-sm font-bold mb-1.5" style={{ color: "#f5edd6" }}>{r.title}</div>
              <div className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 4, background: "linear-gradient(90deg, #C9A84C, #f5edd6, #C9A84C)" }} />
    </div>
  );
}

// ─── Slide: Warranty ─────────────────────────────────────────────────────────
function SlideWarranty() {
  return (
    <div className="w-full h-full flex flex-col" style={{
      background: "linear-gradient(160deg, #0d0b1a 0%, #1a1000 60%, #2a1800 100%)",
      minHeight: "297mm",
    }}>
      <div style={{ height: 4, background: "linear-gradient(90deg, #C9A84C, #f5edd6, #C9A84C)" }} />

      <div className="flex-1 px-10 py-8 flex flex-col">
        <div className="mb-8">
          <div className="text-xs font-bold tracking-[0.3em] uppercase mb-2" style={{ color: "#C9A84C" }}>
            CAM KẾT
          </div>
          <h2 className="text-3xl font-black" style={{ color: "#f5edd6" }}>Chính Sách Bảo Hành</h2>
          <div className="w-16 h-0.5 mt-3" style={{ background: "#C9A84C" }} />
        </div>

        {/* Warranty cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { years: "5", label: "Khung cơ", desc: "Khung thép mạ kẽm, hàn điểm công nghiệp" },
            { years: "3", label: "Motor điện", desc: "Động cơ nâng đầu & nâng chân độc lập" },
            { years: "1", label: "Đệm & vải", desc: "Đệm foam cao cấp, vải bọc chống bẩn" },
          ].map(w => (
            <div key={w.label} className="rounded-2xl p-5 text-center"
              style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}>
              <div className="text-4xl font-black mb-1" style={{ color: "#C9A84C" }}>{w.years}</div>
              <div className="text-xs uppercase tracking-wide mb-2" style={{ color: "#C9A84C" }}>NĂM</div>
              <div className="text-sm font-bold mb-1" style={{ color: "#f5edd6" }}>{w.label}</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{w.desc}</div>
            </div>
          ))}
        </div>

        {/* Terms */}
        <div className="rounded-2xl p-5 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="text-sm font-bold mb-3" style={{ color: "#f5edd6" }}>Điều kiện bảo hành</div>
          <div className="space-y-2">
            {[
              "Sản phẩm được sử dụng đúng mục đích và hướng dẫn sử dụng",
              "Không tự ý tháo lắp, sửa chữa hoặc thay thế linh kiện",
              "Bảo hành tại nhà trong bán kính 30km TP.HCM (miễn phí)",
              "Ngoài phạm vi: hỗ trợ kỹ thuật từ xa hoặc gửi linh kiện thay thế",
              "Xuất trình hóa đơn mua hàng khi yêu cầu bảo hành",
            ].map(t => (
              <div key={t} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "#C9A84C" }} />
                <span className="text-xs" style={{ color: "rgba(245,237,214,0.7)" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Support */}
        <div className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.15)" }}>
          <div className="text-2xl">📞</div>
          <div>
            <div className="text-sm font-bold" style={{ color: "#f5edd6" }}>Hotline hỗ trợ kỹ thuật</div>
            <div className="text-lg font-black" style={{ color: "#C9A84C" }}>1800 6868</div>
            <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Thứ 2 – Thứ 7, 8:00 – 18:00</div>
          </div>
        </div>
      </div>

      <div style={{ height: 4, background: "linear-gradient(90deg, #C9A84C, #f5edd6, #C9A84C)" }} />
    </div>
  );
}

// ─── Slide: Contact ───────────────────────────────────────────────────────────
function SlideContact({ today }: { today: string }) {
  return (
    <div className="w-full h-full flex flex-col" style={{
      background: "linear-gradient(160deg, #0d0b1a 0%, #1a1000 45%, #2a1800 100%)",
      minHeight: "297mm",
    }}>
      <div style={{ height: 4, background: "linear-gradient(90deg, #C9A84C, #f5edd6, #C9A84C)" }} />

      <div className="flex-1 flex flex-col items-center justify-center px-12 text-center">
        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: "linear-gradient(135deg, #C9A84C, #9A7A2E)", boxShadow: "0 0 30px rgba(201,168,76,0.3)" }}>
          <span className="text-2xl font-black text-white">SF</span>
        </div>

        <div className="text-xs font-bold tracking-[0.4em] uppercase mb-2" style={{ color: "#C9A84C" }}>LIÊN HỆ</div>
        <h2 className="text-3xl font-black mb-2" style={{ color: "#f5edd6" }}>Thông Tin Liên Hệ</h2>
        <div className="w-16 h-0.5 mb-8" style={{ background: "#C9A84C" }} />

        {/* Contact cards */}
        <div className="w-full max-w-sm space-y-3 mb-8">
          {[
            { icon: "📞", label: "Hotline", value: "1800 6868", sub: "Miễn phí · Thứ 2–7, 8:00–18:00" },
            { icon: "✉️", label: "Email", value: "sales@smartfurni.vn", sub: "Phản hồi trong 2 giờ làm việc" },
            { icon: "🌐", label: "Website", value: "smartfurni.vn", sub: "Xem thêm sản phẩm & khuyến mãi" },
            { icon: "📍", label: "Showroom", value: "TP. Hồ Chí Minh", sub: "Đặt lịch tham quan miễn phí" },
          ].map(c => (
            <div key={c.label} className="flex items-center gap-4 rounded-2xl px-5 py-3.5 text-left"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-2xl flex-shrink-0">{c.icon}</span>
              <div className="flex-1">
                <div className="text-xs mb-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{c.label}</div>
                <div className="text-base font-bold" style={{ color: "#f5edd6" }}>{c.value}</div>
                <div className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{c.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="rounded-2xl px-8 py-5 text-center"
          style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.25)" }}>
          <div className="text-sm font-semibold mb-1" style={{ color: "#C9A84C" }}>
            Nhận báo giá ngay hôm nay
          </div>
          <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            Liên hệ để được tư vấn miễn phí và nhận ưu đãi đặc biệt
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-12 pb-6 text-center">
        <div className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          © {new Date().getFullYear()} SmartFurni · Catalogue phát hành ngày {today} · Giá chưa bao gồm VAT
        </div>
      </div>

      <div style={{ height: 4, background: "linear-gradient(90deg, #C9A84C, #f5edd6, #C9A84C)" }} />
    </div>
  );
}

// ─── Slide: Empty ─────────────────────────────────────────────────────────────
function SlideEmpty() {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{
      background: "linear-gradient(160deg, #0d0b1a 0%, #1a1000 60%, #2a1800 100%)",
      minHeight: "297mm",
    }}>
      <div className="text-center">
        <div className="text-4xl mb-3">📄</div>
        <div className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Slide trống</div>
      </div>
    </div>
  );
}
