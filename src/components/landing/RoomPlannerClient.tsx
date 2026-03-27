"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import type { SiteTheme } from "@/lib/theme-types";

interface Props {
  theme: SiteTheme;
}

// Room presets
const ROOM_PRESETS = [
  { id: "small", label: "Phòng nhỏ", w: 300, h: 250, desc: "3×2.5m" },
  { id: "medium", label: "Phòng vừa", w: 400, h: 300, desc: "4×3m" },
  { id: "large", label: "Phòng lớn", w: 500, h: 380, desc: "5×3.8m" },
  { id: "master", label: "Master", w: 600, h: 450, desc: "6×4.5m" },
];

// Furniture catalog
const FURNITURE_CATALOG = [
  { id: "bed_queen", label: "Giường Queen", category: "bed", w: 120, h: 80, color: "#C9A84C", icon: "🛏️", desc: "SmartFurni Queen" },
  { id: "bed_king", label: "Giường King", category: "bed", w: 140, h: 90, color: "#C9A84C", icon: "🛏️", desc: "SmartFurni King" },
  { id: "bed_single", label: "Giường Đơn", category: "bed", w: 80, h: 70, color: "#C9A84C", icon: "🛏️", desc: "SmartFurni Single" },
  { id: "wardrobe", label: "Tủ quần áo", category: "storage", w: 100, h: 40, color: "#8B6914", icon: "🚪", desc: "Tủ 2 cánh" },
  { id: "desk", label: "Bàn làm việc", category: "work", w: 90, h: 50, color: "#6B7280", icon: "🖥️", desc: "Bàn góc" },
  { id: "dresser", label: "Tủ đầu giường", category: "storage", w: 45, h: 40, color: "#8B6914", icon: "🗄️", desc: "Tủ nhỏ" },
  { id: "chair", label: "Ghế đọc sách", category: "seating", w: 55, h: 55, color: "#4A6741", icon: "🪑", desc: "Armchair" },
  { id: "sofa", label: "Sofa nhỏ", category: "seating", w: 110, h: 55, color: "#1E3A5F", icon: "🛋️", desc: "2 chỗ ngồi" },
  { id: "tv_stand", label: "Kệ TV", category: "media", w: 100, h: 35, color: "#374151", icon: "📺", desc: "Kệ thấp" },
  { id: "plant", label: "Cây xanh", category: "decor", w: 30, h: 30, color: "#4A6741", icon: "🌿", desc: "Trang trí" },
  { id: "lamp", label: "Đèn sàn", category: "lighting", w: 25, h: 25, color: "#F59E0B", icon: "💡", desc: "Floor lamp" },
  { id: "rug", label: "Thảm trải sàn", category: "decor", w: 130, h: 90, color: "#9CA3AF", icon: "🟫", desc: "Thảm lớn" },
];

const CATEGORIES = [
  { id: "all", label: "Tất cả" },
  { id: "bed", label: "Giường" },
  { id: "storage", label: "Tủ" },
  { id: "seating", label: "Ghế" },
  { id: "work", label: "Làm việc" },
  { id: "media", label: "Media" },
  { id: "decor", label: "Trang trí" },
  { id: "lighting", label: "Đèn" },
];

interface PlacedItem {
  id: string;
  catalogId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  color: string;
  label: string;
  icon: string;
}

// Wall colors
const WALL_COLORS = [
  { id: "white", label: "Trắng", hex: "#F5F0E8" },
  { id: "cream", label: "Kem", hex: "#EDE8D8" },
  { id: "gray", label: "Xám nhạt", hex: "#D1D5DB" },
  { id: "blue", label: "Xanh nhạt", hex: "#DBEAFE" },
  { id: "green", label: "Xanh lá", hex: "#D1FAE5" },
  { id: "dark", label: "Tối", hex: "#1F2937" },
];

// Floor colors
const FLOOR_COLORS = [
  { id: "wood_light", label: "Gỗ sáng", hex: "#D4A96A" },
  { id: "wood_dark", label: "Gỗ tối", hex: "#8B5E3C" },
  { id: "tile_white", label: "Gạch trắng", hex: "#F3F4F6" },
  { id: "tile_gray", label: "Gạch xám", hex: "#9CA3AF" },
  { id: "marble", label: "Đá cẩm thạch", hex: "#E5E7EB" },
  { id: "carpet", label: "Thảm", hex: "#6B7280" },
];

function FurnitureSVG({ item }: { item: PlacedItem }) {
  const { w, h, color, label, icon, catalogId } = item;
  const isRug = catalogId === "rug";
  const isBed = catalogId.startsWith("bed_");

  return (
    <g>
      {isRug ? (
        <>
          <rect x={0} y={0} width={w} height={h} rx={4} fill={`${color}40`} stroke={`${color}60`} strokeWidth="1.5" strokeDasharray="4,3" />
          <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fontSize="10" fill={`${color}80`}>{label}</text>
        </>
      ) : isBed ? (
        <>
          {/* Bed frame */}
          <rect x={0} y={0} width={w} height={h} rx={6} fill={`${color}25`} stroke={color} strokeWidth="1.5" />
          {/* Mattress */}
          <rect x={4} y={8} width={w - 8} height={h - 12} rx={5} fill={`${color}35`} stroke={`${color}60`} strokeWidth="1" />
          {/* Pillows */}
          <rect x={8} y={10} width={w / 2 - 14} height={16} rx={5} fill={`${color}50`} stroke={`${color}70`} strokeWidth="0.8" />
          <rect x={w / 2 + 6} y={10} width={w / 2 - 14} height={16} rx={5} fill={`${color}50`} stroke={`${color}70`} strokeWidth="0.8" />
          {/* Headboard */}
          <rect x={-2} y={-8} width={w + 4} height={12} rx={3} fill={color} opacity="0.7" />
          <text x={w / 2} y={h - 6} textAnchor="middle" fontSize="9" fill={`${color}90`}>{label}</text>
        </>
      ) : (
        <>
          <rect x={0} y={0} width={w} height={h} rx={4} fill={`${color}30`} stroke={color} strokeWidth="1.5" />
          <text x={w / 2} y={h / 2 - 4} textAnchor="middle" fontSize="14">{icon}</text>
          <text x={w / 2} y={h / 2 + 10} textAnchor="middle" fontSize="8" fill={`${color}90`}>{label}</text>
        </>
      )}
    </g>
  );
}

export default function RoomPlannerClient({ theme }: Props) {
  const { colors } = theme;
  const [roomPreset, setRoomPreset] = useState(ROOM_PRESETS[1]);
  const [wallColor, setWallColor] = useState(WALL_COLORS[0]);
  const [floorColor, setFloorColor] = useState(FLOOR_COLORS[0]);
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [viewScale, setViewScale] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const PADDING = 30;

  const filteredCatalog = activeCategory === "all"
    ? FURNITURE_CATALOG
    : FURNITURE_CATALOG.filter((f) => f.category === activeCategory);

  const addFurniture = (catalogItem: typeof FURNITURE_CATALOG[0]) => {
    const newItem: PlacedItem = {
      id: `${catalogItem.id}-${Date.now()}`,
      catalogId: catalogItem.id,
      x: PADDING + 20,
      y: PADDING + 20,
      w: catalogItem.w,
      h: catalogItem.h,
      rotation: 0,
      color: catalogItem.color,
      label: catalogItem.label,
      icon: catalogItem.icon,
    };
    setPlacedItems((prev) => [...prev, newItem]);
    setSelectedId(newItem.id);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setPlacedItems((prev) => prev.filter((i) => i.id !== selectedId));
    setSelectedId(null);
  };

  const rotateSelected = () => {
    if (!selectedId) return;
    setPlacedItems((prev) =>
      prev.map((item) =>
        item.id === selectedId
          ? { ...item, rotation: (item.rotation + 90) % 360, w: item.h, h: item.w }
          : item
      )
    );
  };

  const handleSvgMouseDown = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = (roomPreset.w + PADDING * 2) / rect.width;
      const scaleY = (roomPreset.h + PADDING * 2) / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      // Check if clicking on a placed item (reverse order for top item)
      let found: PlacedItem | null = null;
      for (let i = placedItems.length - 1; i >= 0; i--) {
        const item = placedItems[i];
        if (mx >= item.x && mx <= item.x + item.w && my >= item.y && my <= item.y + item.h) {
          found = item;
          break;
        }
      }

      if (found) {
        setSelectedId(found.id);
        setDraggingId(found.id);
        setDragOffset({ x: mx - found.x, y: my - found.y });
        e.preventDefault();
      } else {
        setSelectedId(null);
      }
    },
    [placedItems, roomPreset]
  );

  const handleSvgMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!draggingId) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = (roomPreset.w + PADDING * 2) / rect.width;
      const scaleY = (roomPreset.h + PADDING * 2) / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      setPlacedItems((prev) =>
        prev.map((item) => {
          if (item.id !== draggingId) return item;
          const newX = Math.max(PADDING, Math.min(PADDING + roomPreset.w - item.w, mx - dragOffset.x));
          const newY = Math.max(PADDING, Math.min(PADDING + roomPreset.h - item.h, my - dragOffset.y));
          return { ...item, x: newX, y: newY };
        })
      );
    },
    [draggingId, dragOffset, roomPreset]
  );

  const handleSvgMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  const clearAll = () => {
    setPlacedItems([]);
    setSelectedId(null);
  };

  const selectedItem = placedItems.find((i) => i.id === selectedId);
  const viewW = roomPreset.w + PADDING * 2;
  const viewH = roomPreset.h + PADDING * 2;

  // Grid lines
  const gridLines = [];
  if (showGrid) {
    const step = 50; // 50px = 0.5m
    for (let x = PADDING; x <= PADDING + roomPreset.w; x += step) {
      gridLines.push(<line key={`v${x}`} x1={x} y1={PADDING} x2={x} y2={PADDING + roomPreset.h} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />);
    }
    for (let y = PADDING; y <= PADDING + roomPreset.h; y += step) {
      gridLines.push(<line key={`h${y}`} x1={PADDING} y1={y} x2={PADDING + roomPreset.w} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />);
    }
  }

  return (
    <div className="pt-28 sm:pt-32 pb-16 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#C9A84C]" />
            <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">Room Planner</span>
            <span className="w-6 h-px bg-[#C9A84C]" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-[#F5EDD6] mb-3">
            Thiết kế <span style={{ color: colors.primary }} className="font-semibold">phòng ngủ</span> của bạn
          </h1>
          <p className="text-sm text-[#F5EDD6]/50 max-w-xl mx-auto">
            Kéo thả nội thất vào bản đồ phòng. Thử nghiệm bố cục trước khi đặt hàng — miễn phí, không cần tài khoản.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Left sidebar: controls */}
          <div className="xl:col-span-1 space-y-4">
            {/* Room size */}
            <div style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-2xl border p-4">
              <h3 className="text-xs font-semibold text-[#F5EDD6]/60 uppercase tracking-wider mb-3">Kích thước phòng</h3>
              <div className="grid grid-cols-2 gap-2">
                {ROOM_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => setRoomPreset(preset)}
                    style={{
                      backgroundColor: roomPreset.id === preset.id ? `${colors.primary}15` : "transparent",
                      borderColor: roomPreset.id === preset.id ? colors.primary : colors.border,
                    }}
                    className="p-2 rounded-lg border text-left transition-all duration-200"
                  >
                    <p style={{ color: roomPreset.id === preset.id ? colors.primary : "#F5EDD6" }} className="text-xs font-semibold">{preset.label}</p>
                    <p className="text-[10px] text-[#F5EDD6]/40">{preset.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Wall & floor color */}
            <div style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-2xl border p-4">
              <h3 className="text-xs font-semibold text-[#F5EDD6]/60 uppercase tracking-wider mb-3">Màu tường & sàn</h3>
              <p className="text-[10px] text-[#F5EDD6]/40 mb-2">Tường</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {WALL_COLORS.map((wc) => (
                  <button
                    key={wc.id}
                    onClick={() => setWallColor(wc)}
                    title={wc.label}
                    style={{
                      backgroundColor: wc.hex,
                      borderColor: wallColor.id === wc.id ? colors.primary : "transparent",
                      boxShadow: wallColor.id === wc.id ? `0 0 0 2px ${colors.primary}` : "none",
                    }}
                    className="w-7 h-7 rounded-full border-2 transition-all duration-200"
                  />
                ))}
              </div>
              <p className="text-[10px] text-[#F5EDD6]/40 mb-2">Sàn</p>
              <div className="flex flex-wrap gap-2">
                {FLOOR_COLORS.map((fc) => (
                  <button
                    key={fc.id}
                    onClick={() => setFloorColor(fc)}
                    title={fc.label}
                    style={{
                      backgroundColor: fc.hex,
                      borderColor: floorColor.id === fc.id ? colors.primary : "transparent",
                      boxShadow: floorColor.id === fc.id ? `0 0 0 2px ${colors.primary}` : "none",
                    }}
                    className="w-7 h-7 rounded-full border-2 transition-all duration-200"
                  />
                ))}
              </div>
            </div>

            {/* View options */}
            <div style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-2xl border p-4">
              <h3 className="text-xs font-semibold text-[#F5EDD6]/60 uppercase tracking-wider mb-3">Hiển thị</h3>
              <button
                onClick={() => setShowGrid(!showGrid)}
                style={{ color: showGrid ? colors.primary : `${colors.text}40`, borderColor: showGrid ? colors.primary : colors.border }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all duration-200 w-full"
              >
                <span>{showGrid ? "✓" : "○"}</span> Lưới tham chiếu
              </button>
            </div>

            {/* Selected item controls */}
            {selectedItem && (
              <div style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }} className="rounded-2xl border p-4">
                <h3 className="text-xs font-semibold text-[#F5EDD6]/60 uppercase tracking-wider mb-3">
                  Đang chọn: <span style={{ color: colors.primary }}>{selectedItem.label}</span>
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={rotateSelected}
                    style={{ backgroundColor: colors.surface, borderColor: colors.border, color: "#F5EDD6" }}
                    className="flex-1 py-2 rounded-lg border text-xs font-medium hover:opacity-80 transition-opacity"
                  >
                    ↻ Xoay 90°
                  </button>
                  <button
                    onClick={removeSelected}
                    style={{ backgroundColor: `${colors.error}15`, borderColor: `${colors.error}30`, color: colors.error }}
                    className="flex-1 py-2 rounded-lg border text-xs font-medium hover:opacity-80 transition-opacity"
                  >
                    🗑 Xóa
                  </button>
                </div>
                <p className="text-[10px] text-[#F5EDD6]/30 mt-2">
                  Vị trí: {Math.round(selectedItem.x - PADDING)}, {Math.round(selectedItem.y - PADDING)} px
                </p>
              </div>
            )}

            {/* Clear all */}
            {placedItems.length > 0 && (
              <button
                onClick={clearAll}
                style={{ borderColor: colors.border, color: `${colors.text}40` }}
                className="w-full py-2 rounded-xl border text-xs hover:opacity-70 transition-opacity"
              >
                Xóa tất cả nội thất
              </button>
            )}
          </div>

          {/* Center: Canvas */}
          <div className="xl:col-span-2">
            <div style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-2xl border overflow-hidden">
              {/* Canvas toolbar */}
              <div style={{ borderBottomColor: colors.border }} className="flex items-center justify-between px-4 py-2.5 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#F5EDD6]/50">Phòng: {roomPreset.label} ({roomPreset.desc})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#F5EDD6]/30">{placedItems.length} vật dụng</span>
                </div>
              </div>

              {/* SVG Canvas */}
              <div className="relative overflow-auto" style={{ maxHeight: 520 }}>
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${viewW} ${viewH}`}
                  width="100%"
                  style={{ cursor: draggingId ? "grabbing" : "default", userSelect: "none", display: "block" }}
                  onMouseDown={handleSvgMouseDown}
                  onMouseMove={handleSvgMouseMove}
                  onMouseUp={handleSvgMouseUp}
                  onMouseLeave={handleSvgMouseUp}
                >
                  {/* Wall (outer) */}
                  <rect x={0} y={0} width={viewW} height={viewH} fill={wallColor.hex} />

                  {/* Floor (inner room) */}
                  <rect x={PADDING} y={PADDING} width={roomPreset.w} height={roomPreset.h} fill={floorColor.hex} />

                  {/* Floor texture pattern */}
                  {floorColor.id.startsWith("wood") && (
                    <g opacity="0.15">
                      {Array.from({ length: Math.ceil(roomPreset.h / 20) }).map((_, i) => (
                        <line key={i} x1={PADDING} y1={PADDING + i * 20} x2={PADDING + roomPreset.w} y2={PADDING + i * 20}
                          stroke="#000" strokeWidth="0.5" />
                      ))}
                    </g>
                  )}

                  {/* Grid */}
                  {gridLines}

                  {/* Room border */}
                  <rect x={PADDING} y={PADDING} width={roomPreset.w} height={roomPreset.h}
                    fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />

                  {/* Door indicator */}
                  <path d={`M${PADDING + 40},${PADDING} A40,40 0 0,1 ${PADDING},${PADDING + 40}`}
                    fill="rgba(255,255,255,0.15)" stroke="rgba(0,0,0,0.2)" strokeWidth="1" strokeDasharray="3,2" />
                  <text x={PADDING + 8} y={PADDING + 55} fontSize="9" fill="rgba(0,0,0,0.4)">Cửa</text>

                  {/* Window indicator */}
                  <rect x={PADDING + roomPreset.w - 80} y={PADDING - 4} width={70} height={8}
                    fill="rgba(135,206,250,0.5)" stroke="rgba(0,0,0,0.2)" strokeWidth="1" />
                  <text x={PADDING + roomPreset.w - 70} y={PADDING - 8} fontSize="9" fill="rgba(0,0,0,0.4)">Cửa sổ</text>

                  {/* Dimension labels */}
                  <text x={PADDING + roomPreset.w / 2} y={PADDING - 8} textAnchor="middle" fontSize="9" fill="rgba(0,0,0,0.4)">
                    {roomPreset.desc.split("×")[0]}m
                  </text>
                  <text x={PADDING - 8} y={PADDING + roomPreset.h / 2} textAnchor="middle" fontSize="9" fill="rgba(0,0,0,0.4)"
                    transform={`rotate(-90, ${PADDING - 8}, ${PADDING + roomPreset.h / 2})`}>
                    {roomPreset.desc.split("×")[1]}
                  </text>

                  {/* Placed furniture */}
                  {placedItems.map((item) => {
                    const isSelected = item.id === selectedId;
                    return (
                      <g
                        key={item.id}
                        transform={`translate(${item.x}, ${item.y})`}
                        style={{ cursor: "grab" }}
                      >
                        <FurnitureSVG item={item} />
                        {isSelected && (
                          <>
                            <rect x={-2} y={-2} width={item.w + 4} height={item.h + 4} rx={4}
                              fill="none" stroke={colors.primary} strokeWidth="1.5" strokeDasharray="4,2" />
                            {/* Resize handle */}
                            <rect x={item.w - 6} y={item.h - 6} width={8} height={8} rx={2}
                              fill={colors.primary} opacity="0.8" />
                          </>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Canvas hint */}
              {placedItems.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ top: 44 }}>
                  <div className="text-center">
                    <p className="text-3xl mb-2">🛏️</p>
                    <p className="text-sm text-[#F5EDD6]/30">Nhấn vào nội thất bên phải để thêm vào phòng</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[#F5EDD6]/30">
              <span>💡 Nhấn vào nội thất để chọn</span>
              <span>🖱️ Kéo để di chuyển</span>
              <span>↻ Xoay 90° trong menu</span>
            </div>
          </div>

          {/* Right sidebar: furniture catalog */}
          <div className="xl:col-span-1">
            <div style={{ backgroundColor: colors.surface, borderColor: colors.border }} className="rounded-2xl border overflow-hidden">
              <div style={{ borderBottomColor: colors.border }} className="px-4 py-3 border-b">
                <h3 className="text-xs font-semibold text-[#F5EDD6]/70 uppercase tracking-wider">Nội thất</h3>
              </div>

              {/* Category filter */}
              <div className="px-3 py-2 flex gap-1.5 overflow-x-auto scrollbar-hide" style={{ borderBottomColor: colors.border, borderBottomWidth: 1 }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    style={activeCategory === cat.id
                      ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }
                      : { backgroundColor: "transparent", color: `${colors.text}50` }
                    }
                    className="px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200"
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Furniture list */}
              <div className="p-3 space-y-1.5 max-h-[400px] overflow-y-auto">
                {filteredCatalog.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addFurniture(item)}
                    style={{ backgroundColor: colors.background, borderColor: colors.border }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border text-left hover:border-[#C9A84C] transition-all duration-200 group"
                  >
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-[#F5EDD6] group-hover:text-[#C9A84C] transition-colors">{item.label}</p>
                      <p className="text-[10px] text-[#F5EDD6]/35">{item.desc} · {item.w}×{item.h}px</p>
                    </div>
                    <span style={{ color: colors.primary }} className="text-sm opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">+</span>
                  </button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` }} className="mt-4 rounded-2xl border p-4">
              <p className="text-xs font-semibold text-[#F5EDD6]/70 mb-2">Thích bố cục này?</p>
              <p className="text-[10px] text-[#F5EDD6]/40 mb-3">Đặt hàng giường SmartFurni ngay để hoàn thiện phòng ngủ của bạn.</p>
              <Link
                href="/products"
                style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }}
                className="block text-center py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Xem sản phẩm →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
