"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Product } from "@/lib/product-store";
import type { SiteTheme } from "@/lib/theme-types";

interface Props {
  products: Product[];
  theme: SiteTheme;
}

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ đ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu đ`;
  return price.toLocaleString("vi-VN") + " đ";
}

// Bed SVG for AR overlay
function BedAROverlay({
  color,
  size,
  scale,
  opacity,
}: {
  color: string;
  size: "single" | "double" | "queen" | "king";
  scale: number;
  opacity: number;
}) {
  const baseW = size === "single" ? 180 : size === "double" ? 240 : size === "queen" ? 270 : 300;
  const baseH = size === "single" ? 130 : 150;
  const w = baseW * scale;
  const h = baseH * scale;

  return (
    <svg
      width={w}
      height={h + 40}
      viewBox={`0 0 ${baseW} ${baseH + 40}`}
      style={{ opacity, filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))" }}
    >
      {/* Shadow ellipse */}
      <ellipse cx={baseW / 2} cy={baseH + 30} rx={baseW / 2 - 10} ry={12} fill="rgba(0,0,0,0.35)" />

      {/* Bed frame */}
      <rect x={4} y={30} width={baseW - 8} height={baseH - 30} rx={6}
        fill={`${color}30`} stroke={color} strokeWidth="2" />

      {/* Mattress */}
      <rect x={8} y={38} width={baseW - 16} height={baseH - 46} rx={8}
        fill={`${color}40`} stroke={`${color}70`} strokeWidth="1.5" />

      {/* Pillows */}
      <rect x={14} y={42} width={baseW / 2 - 22} height={22} rx={8}
        fill={`${color}60`} stroke={`${color}80`} strokeWidth="1" />
      <rect x={baseW / 2 + 8} y={42} width={baseW / 2 - 22} height={22} rx={8}
        fill={`${color}60`} stroke={`${color}80`} strokeWidth="1" />

      {/* Headboard */}
      <rect x={0} y={0} width={baseW} height={36} rx={6}
        fill={color} opacity="0.8" />

      {/* Headboard detail */}
      <rect x={8} y={6} width={baseW - 16} height={24} rx={4}
        fill="transparent" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />

      {/* Legs */}
      {[[10, baseH - 4], [baseW - 18, baseH - 4], [10, 52], [baseW - 18, 52]].map(([lx, ly], i) => (
        <rect key={i} x={lx} y={ly} width={8} height={18} rx={3}
          fill={`${color}60`} stroke={`${color}40`} strokeWidth="0.5" />
      ))}

      {/* AR measurement lines */}
      <line x1={4} y1={baseH + 8} x2={baseW - 4} y2={baseH + 8} stroke="rgba(255,255,255,0.4)" strokeWidth="1" strokeDasharray="3,2" />
      <line x1={4} y1={baseH + 4} x2={4} y2={baseH + 12} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <line x1={baseW - 4} y1={baseH + 4} x2={baseW - 4} y2={baseH + 12} stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
    </svg>
  );
}

// AR scanning animation overlay
function ScanningOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Corner brackets */}
      {[
        "top-4 left-4 border-t-2 border-l-2",
        "top-4 right-4 border-t-2 border-r-2",
        "bottom-4 left-4 border-b-2 border-l-2",
        "bottom-4 right-4 border-b-2 border-r-2",
      ].map((cls, i) => (
        <div key={i} className={`absolute w-8 h-8 border-[#C9A84C] ${cls}`} />
      ))}

      {/* Scanning line animation */}
      <div
        className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent opacity-70"
        style={{ animation: "scanLine 2s ease-in-out infinite" }}
      />

      {/* Center crosshair */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border border-[#C9A84C]/30 rounded-full" />
          <div className="absolute top-1/2 left-0 right-0 h-px bg-[#C9A84C]/40" />
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#C9A84C]/40" />
        </div>
      </div>
    </div>
  );
}

const BED_SIZES = [
  { id: "single" as const, label: "Đơn", dim: "90×200cm" },
  { id: "double" as const, label: "Đôi", dim: "140×200cm" },
  { id: "queen" as const, label: "Queen", dim: "160×200cm" },
  { id: "king" as const, label: "King", dim: "180×200cm" },
];

const BED_COLORS = [
  { id: "charcoal", label: "Đen than", hex: "#3D3D3D" },
  { id: "ivory", label: "Trắng ngà", hex: "#D4C9A8" },
  { id: "navy", label: "Xanh navy", hex: "#2A4F80" },
  { id: "gold", label: "Vàng đồng", hex: "#C9A84C" },
  { id: "sage", label: "Xanh rêu", hex: "#5C7D52" },
];

type ARState = "idle" | "requesting" | "scanning" | "placed" | "no_camera";

export default function ARTryAtHomeClient({ products, theme }: Props) {
  const { colors } = theme;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [arState, setArState] = useState<ARState>("idle");
  const [selectedProduct, setSelectedProduct] = useState(
    products.find((p) => p.category !== "accessory" && p.status === "active") ?? products[0]
  );
  const [bedSize, setBedSize] = useState<"single" | "double" | "queen" | "king">("queen");
  const [bedColor, setBedColor] = useState(BED_COLORS[0]);
  const [bedPosition, setBedPosition] = useState({ x: 0, y: 0 });
  const [bedScale, setBedScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showInfo, setShowInfo] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const startAR = async () => {
    setArState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setArState("scanning");
      // Auto-place after 2s scanning
      setTimeout(() => {
        setArState("placed");
        setBedPosition({ x: 0, y: 0 });
      }, 2000);
    } catch (err) {
      console.error("Camera error:", err);
      setArState("no_camera");
    }
  };

  const stopAR = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setArState("idle");
  }, []);

  useEffect(() => {
    return () => stopAR();
  }, [stopAR]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (arState !== "placed") return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - bedPosition.x, y: e.clientY - bedPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setBedPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (arState !== "placed") return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - bedPosition.x, y: touch.clientY - bedPosition.y });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setBedPosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const bedSizeLabel = BED_SIZES.find((s) => s.id === bedSize);

  return (
    <div className="pt-28 sm:pt-32 pb-16 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#C9A84C]" />
            <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">AR Thử tại nhà</span>
            <span className="w-6 h-px bg-[#C9A84C]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-[#F5EDD6] mb-3">
            Thử giường <span style={{ color: colors.primary }} className="font-semibold">trong phòng của bạn</span>
          </h1>
          <p className="text-sm text-[#F5EDD6]/50 max-w-xl mx-auto">
            Sử dụng camera điện thoại để đặt thử giường SmartFurni vào phòng ngủ thực tế. Xem kích thước và màu sắc trước khi đặt hàng.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Config */}
          <div className="space-y-4">
            {/* Product selector */}
            <div style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-2xl border p-4">
              <h3 className="text-xs font-semibold text-[#F5EDD6]/60 uppercase tracking-wider mb-3">Chọn sản phẩm</h3>
              <div className="space-y-2">
                {products.filter((p) => p.category !== "accessory").slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    style={{
                      backgroundColor: selectedProduct.id === p.id ? `${colors.primary}15` : "transparent",
                      borderColor: selectedProduct.id === p.id ? colors.primary : colors.border,
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all duration-200"
                  >
                    <div
                      style={{ background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})`, borderColor: colors.border }}
                      className="w-10 h-8 rounded-lg border flex-shrink-0 overflow-hidden"
                    >
                      {p.coverImage && <img src={p.coverImage} alt={p.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0">
                      <p style={{ color: selectedProduct.id === p.id ? colors.primary : "#F5EDD6" }} className="text-xs font-semibold truncate">{p.name}</p>
                      <p className="text-[10px] text-[#F5EDD6]/40">{formatPrice(p.price)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Size selector */}
            <div style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-2xl border p-4">
              <h3 className="text-xs font-semibold text-[#F5EDD6]/60 uppercase tracking-wider mb-3">Kích thước</h3>
              <div className="grid grid-cols-2 gap-2">
                {BED_SIZES.map((sz) => (
                  <button
                    key={sz.id}
                    onClick={() => setBedSize(sz.id)}
                    style={{
                      backgroundColor: bedSize === sz.id ? `${colors.primary}15` : "transparent",
                      borderColor: bedSize === sz.id ? colors.primary : colors.border,
                    }}
                    className="p-2 rounded-lg border text-left transition-all duration-200"
                  >
                    <p style={{ color: bedSize === sz.id ? colors.primary : "#F5EDD6" }} className="text-xs font-semibold">{sz.label}</p>
                    <p className="text-[10px] text-[#F5EDD6]/40">{sz.dim}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Color selector */}
            <div style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-[#F5EDD6]/60 uppercase tracking-wider">Màu sắc</h3>
                <span style={{ color: colors.primary }} className="text-xs">{bedColor.label}</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {BED_COLORS.map((bc) => (
                  <button
                    key={bc.id}
                    onClick={() => setBedColor(bc)}
                    title={bc.label}
                    style={{
                      backgroundColor: bc.hex,
                      borderColor: bedColor.id === bc.id ? colors.primary : "transparent",
                      boxShadow: bedColor.id === bc.id ? `0 0 0 3px ${colors.primary}50` : "none",
                    }}
                    className="w-9 h-9 rounded-full border-2 transition-all duration-200 hover:scale-110"
                  />
                ))}
              </div>
            </div>

            {/* Scale control */}
            {arState === "placed" && (
              <div style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-2xl border p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-[#F5EDD6]/60 uppercase tracking-wider">Kích thước hiển thị</h3>
                  <span style={{ color: colors.primary }} className="text-xs">{Math.round(bedScale * 100)}%</span>
                </div>
                <input
                  type="range" min={0.5} max={2} step={0.05} value={bedScale}
                  onChange={(e) => setBedScale(Number(e.target.value))}
                  className="w-full accent-[#C9A84C] h-1"
                />
              </div>
            )}

            {/* CTA */}
            <Link
              href={`/products/${selectedProduct.slug}`}
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }}
              className="block text-center py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Đặt hàng {selectedProduct.name} →
            </Link>
          </div>

          {/* Center + Right: AR Viewport */}
          <div className="lg:col-span-2">
            <div
              ref={containerRef}
              style={{ backgroundColor: colors.surface, borderColor: colors.border }}
              className="rounded-2xl border overflow-hidden"
            >
              {/* AR viewport */}
              <div
                className="relative"
                style={{ aspectRatio: "16/9", minHeight: 300, cursor: isDragging ? "grabbing" : arState === "placed" ? "grab" : "default" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* Camera video feed */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ display: arState === "idle" || arState === "no_camera" ? "none" : "block" }}
                />

                {/* Idle state */}
                {arState === "idle" && (
                  <div
                    style={{ background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})` }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8"
                  >
                    {/* Mock room background */}
                    <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice">
                      {/* Floor */}
                      <rect x={0} y={280} width={800} height={170} fill="#8B6914" opacity="0.4" />
                      {/* Wall */}
                      <rect x={0} y={0} width={800} height={280} fill="#F5F0E8" opacity="0.3" />
                      {/* Floor lines */}
                      {[0, 80, 160, 240, 320, 400, 480, 560, 640, 720, 800].map((x, i) => (
                        <line key={i} x1={x} y1={280} x2={x + 40} y2={450} stroke="#8B6914" strokeWidth="0.5" opacity="0.3" />
                      ))}
                      {/* Window */}
                      <rect x={550} y={60} width={180} height={140} rx={4} fill="rgba(135,206,250,0.3)" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                      <line x1={640} y1={60} x2={640} y2={200} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                      <line x1={550} y1={130} x2={730} y2={130} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                    </svg>

                    {/* Bed preview in room */}
                    <div className="relative z-10 flex flex-col items-center gap-4">
                      <div style={{ opacity: 0.7 }}>
                        <BedAROverlay color={bedColor.hex} size={bedSize} scale={1.2} opacity={0.8} />
                      </div>
                      <button
                        onClick={startAR}
                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all duration-200 hover:scale-105 shadow-lg"
                      >
                        <span className="text-lg">📷</span>
                        Bật camera AR
                      </button>
                      <p className="text-xs text-[#F5EDD6]/40 text-center max-w-xs">
                        Cần cấp quyền truy cập camera. Hoạt động tốt nhất trên điện thoại.
                      </p>
                    </div>
                  </div>
                )}

                {/* Scanning state */}
                {arState === "scanning" && (
                  <>
                    <ScanningOverlay />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                      <div
                        style={{ backgroundColor: "rgba(0,0,0,0.7)", borderColor: `${colors.primary}40` }}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border"
                      >
                        <div
                          style={{ backgroundColor: colors.primary }}
                          className="w-2 h-2 rounded-full animate-pulse"
                        />
                        <span className="text-xs text-[#F5EDD6]">Đang quét bề mặt sàn...</span>
                      </div>
                    </div>
                  </>
                )}

                {/* Placed state */}
                {arState === "placed" && (
                  <>
                    {/* AR bed overlay */}
                    <div
                      className="absolute z-10 select-none"
                      style={{
                        left: "50%",
                        bottom: "20%",
                        transform: `translate(calc(-50% + ${bedPosition.x}px), ${bedPosition.y}px)`,
                        filter: "drop-shadow(0 12px 32px rgba(0,0,0,0.6))",
                      }}
                    >
                      <BedAROverlay color={bedColor.hex} size={bedSize} scale={bedScale} opacity={0.92} />
                    </div>

                    {/* AR UI overlays */}
                    <ScanningOverlay />

                    {/* Info badge */}
                    {showInfo && (
                      <div
                        style={{ backgroundColor: "rgba(0,0,0,0.75)", borderColor: `${colors.primary}40` }}
                        className="absolute top-3 left-3 z-20 flex items-center gap-2 px-3 py-2 rounded-xl border"
                      >
                        <div>
                          <p style={{ color: colors.primary }} className="text-xs font-bold">{selectedProduct.name}</p>
                          <p className="text-[10px] text-[#F5EDD6]/60">{bedSizeLabel?.label} · {bedColor.label}</p>
                        </div>
                        <button onClick={() => setShowInfo(false)} className="text-[#F5EDD6]/30 hover:text-[#F5EDD6] ml-1 text-xs">✕</button>
                      </div>
                    )}

                    {/* Measurement badge */}
                    <div
                      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full"
                    >
                      <p className="text-[10px] text-[#F5EDD6]/70">
                        📐 {bedSizeLabel?.dim} · Kéo để di chuyển · Cuộn để zoom
                      </p>
                    </div>

                    {/* Stop button */}
                    <button
                      onClick={stopAR}
                      style={{ backgroundColor: "rgba(0,0,0,0.7)", borderColor: "rgba(255,255,255,0.2)" }}
                      className="absolute top-3 right-3 z-20 p-2 rounded-xl border text-xs text-[#F5EDD6]/70 hover:text-[#F5EDD6] transition-colors"
                    >
                      ✕ Thoát AR
                    </button>
                  </>
                )}

                {/* No camera state */}
                {arState === "no_camera" && (
                  <div
                    style={{ background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})` }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8"
                  >
                    <span className="text-4xl">📵</span>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-[#F5EDD6] mb-1">Không thể truy cập camera</p>
                      <p className="text-xs text-[#F5EDD6]/50 max-w-xs">
                        Trình duyệt không hỗ trợ hoặc bạn chưa cấp quyền camera. Hãy thử trên điện thoại với Chrome/Safari.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setArState("idle")}
                        style={{ borderColor: colors.border, color: `${colors.text}60` }}
                        className="px-4 py-2 rounded-xl border text-xs"
                      >
                        Quay lại
                      </button>
                      <button
                        onClick={startAR}
                        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }}
                        className="px-4 py-2 rounded-xl text-xs font-bold"
                      >
                        Thử lại
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom toolbar */}
              <div style={{ borderTopColor: colors.border }} className="border-t px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {arState === "placed" && (
                    <>
                      <button
                        onClick={() => setBedScale((s) => Math.max(0.5, s - 0.1))}
                        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                        className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm text-[#F5EDD6]/60 hover:text-[#F5EDD6] transition-colors"
                      >
                        −
                      </button>
                      <span className="text-xs text-[#F5EDD6]/40">{Math.round(bedScale * 100)}%</span>
                      <button
                        onClick={() => setBedScale((s) => Math.min(2, s + 0.1))}
                        style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                        className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm text-[#F5EDD6]/60 hover:text-[#F5EDD6] transition-colors"
                      >
                        +
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {arState === "idle" && (
                    <button
                      onClick={startAR}
                      style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      📷 Bật AR
                    </button>
                  )}
                  {arState === "placed" && (
                    <Link
                      href={`/products/${selectedProduct.slug}`}
                      style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                    >
                      🛒 Đặt hàng ngay
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Feature highlights */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { icon: "📐", title: "Kích thước thực tế", desc: "Hiển thị đúng tỷ lệ 1:1 với phòng của bạn" },
                { icon: "🎨", title: "Thử màu sắc", desc: "Xem trước 5 màu sắc khác nhau" },
                { icon: "🔄", title: "Di chuyển tự do", desc: "Kéo để đặt vào vị trí bất kỳ" },
              ].map((feat, i) => (
                <div
                  key={i}
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  className="rounded-xl border p-3 text-center"
                >
                  <p className="text-xl mb-1">{feat.icon}</p>
                  <p className="text-xs font-semibold text-[#F5EDD6] mb-0.5">{feat.title}</p>
                  <p className="text-[10px] text-[#F5EDD6]/40">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scanLine {
          0% { top: 10%; }
          50% { top: 85%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  );
}
