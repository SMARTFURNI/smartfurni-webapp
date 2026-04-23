"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductDashboardStats, Product, ProductCategory, ProductStatus } from "@/lib/product-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("vi-VN");
}

const CAT_CONFIG: Record<ProductCategory, { label: string; color: string; bg: string; border: string }> = {
  standard: { label: "Standard", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
  premium: { label: "Premium", color: "text-[#C9A84C]", bg: "bg-[#C9A84C]/10", border: "border-[rgba(255,200,100,0.22)]" },
  elite: { label: "Elite", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  accessory: { label: "Phụ kiện", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
};

const STATUS_CONFIG: Record<ProductStatus, { label: string; color: string; bg: string; dot: string }> = {
  active: { label: "Đang bán", color: "text-green-400", bg: "bg-green-500/10", dot: "bg-green-400" },
  discontinued: { label: "Ngừng SX", color: "text-[rgba(245,237,214,0.55)]", bg: "bg-gray-500/10", dot: "bg-gray-500" },
  out_of_stock: { label: "Hết hàng", color: "text-red-400", bg: "bg-red-500/10", dot: "bg-red-400" },
  coming_soon: { label: "Sắp ra mắt", color: "text-purple-400", bg: "bg-purple-500/10", dot: "bg-purple-400" },
};

function StarRating({ rating }: { rating: number }) {
  if (rating === 0) return <span className="text-xs text-[rgba(245,237,214,0.35)]">Chưa có</span>;
  return (
    <span className="flex items-center gap-1">
      <span className="text-yellow-400 text-xs">★</span>
      <span className="text-xs text-white">{rating.toFixed(1)}</span>
    </span>
  );
}

// ─── Revenue Bar Chart ────────────────────────────────────────────────────────
function RevenueLineChart({ data }: { data: { label: string; revenue: number; units: number }[] }) {
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const w = 400; const h = 80;
  const pts = data.map((d, i) => ({
    x: data.length > 1 ? (i / (data.length - 1)) * w : w / 2,
    y: h - (d.revenue / maxRev) * (h - 10) - 5,
    ...d,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 22}`} className="overflow-visible">
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#revGrad)" />
      <path d={pathD} fill="none" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="#C9A84C" />
          <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#E2C97E" fontSize="9" fontWeight="600">
            {formatVND(p.revenue)}đ
          </text>
          <text x={p.x} y={h + 14} textAnchor="middle" fill="#4B5563" fontSize="9">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 110, centerLabel = "", centerSub = "" }: {
  segments: { label: string; count: number; color: string }[];
  size?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = segments.reduce((s, seg) => s + seg.count, 0);
  if (total === 0) return <div className="text-[rgba(245,237,214,0.35)] text-xs text-center py-4">Không có dữ liệu</div>;
  const r = 38; const cx = size / 2; const cy = size / 2;
  let cumAngle = -Math.PI / 2;
  const arcs = segments.map((seg) => {
    const angle = (seg.count / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    return { ...seg, x1, y1, x2, y2, large: angle > Math.PI ? 1 : 0, angle };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) => arc.angle > 0.01 ? (
        <path key={i} d={`M ${cx} ${cy} L ${arc.x1} ${arc.y1} A ${r} ${r} 0 ${arc.large} 1 ${arc.x2} ${arc.y2} Z`} fill={arc.color} opacity="0.85" />
      ) : null)}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#0D0B00" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{centerLabel || total}</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fill="#6B7280" fontSize="8">{centerSub || "sản phẩm"}</text>
    </svg>
  );
}

// ─── Product Row ──────────────────────────────────────────────────────────────
function ProductRow({ product, onStatusChange, onDelete, onEdit }: {
  product: Product;
  onStatusChange: (id: string, status: ProductStatus) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cc = CAT_CONFIG[product.category];
  const sc = STATUS_CONFIG[product.status];
  const margin = product.price - product.cost;
  const marginPct = product.price > 0 ? Math.round((margin / product.price) * 100) : 0;
  const isLowStock = product.totalStock < 10 && product.status === "active";

  return (
    <>
      <tr
        className="border-b border-[rgba(255,200,100,0.08)] hover:bg-white/2 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A84C]/20 to-[#C9A84C]/5 flex items-center justify-center text-lg flex-shrink-0">
              {product.category === "accessory" ? "🔧" : product.category === "elite" ? "💎" : product.category === "premium" ? "⭐" : "🛏️"}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm text-white font-medium truncate">{product.name}</p>
                {product.isFeatured && <span className="text-yellow-400 text-xs">★</span>}
                {isLowStock && <span className="text-red-400 text-xs bg-red-500/10 px-1.5 py-0.5 rounded-full">Sắp hết</span>}
              </div>
              <p className="text-xs text-[rgba(245,237,214,0.45)]">{product.slug}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${cc.color} ${cc.bg} ${cc.border}`}>{cc.label}</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            <span className={`text-xs ${sc.color}`}>{sc.label}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="text-sm font-semibold text-white">{formatVND(product.price)}đ</div>
          {product.originalPrice > product.price && (
            <div className="text-xs text-[rgba(245,237,214,0.45)] line-through">{formatVND(product.originalPrice)}đ</div>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <div className={`text-sm font-bold ${product.totalStock === 0 ? "text-red-400" : product.totalStock < 10 ? "text-yellow-400" : "text-green-400"}`}>
            {product.totalStock}
          </div>
          <div className="text-xs text-[rgba(245,237,214,0.45)]">{product.variants.length} loại</div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="text-sm font-semibold text-[#C9A84C]">{formatVND(product.totalRevenue)}đ</div>
          <div className="text-xs text-[rgba(245,237,214,0.45)]">{product.totalSold} đã bán</div>
        </td>
        <td className="px-4 py-3">
          <StarRating rating={product.rating} />
          {product.reviewCount > 0 && <div className="text-xs text-[rgba(245,237,214,0.35)]">({product.reviewCount})</div>}
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <select
              value={product.status}
              onChange={(e) => onStatusChange(product.id, e.target.value as ProductStatus)}
              className="text-xs bg-[#1a1200] border border-[rgba(255,200,100,0.18)] text-[rgba(245,237,214,0.70)] rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="active">Đang bán</option>
              <option value="out_of_stock">Hết hàng</option>
              <option value="coming_soon">Sắp ra mắt</option>
              <option value="discontinued">Ngừng SX</option>
            </select>
            <button
              onClick={() => onEdit(product.id)}
              className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
            >
              Sửa
            </button>
            <button
              onClick={() => onDelete(product.id)}
              className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              Xóa
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[#1a1200]/50">
          <td colSpan={8} className="px-6 py-4">
            <div className="grid sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[rgba(245,237,214,0.45)] mb-2 font-medium">Thông tin giá</p>
                <div className="space-y-1">
                  <div className="flex justify-between"><span className="text-[rgba(245,237,214,0.55)]">Giá bán:</span><span className="text-white">{formatVND(product.price)}đ</span></div>
                  <div className="flex justify-between"><span className="text-[rgba(245,237,214,0.55)]">Giá vốn:</span><span className="text-[rgba(245,237,214,0.70)]">{formatVND(product.cost)}đ</span></div>
                  <div className="flex justify-between"><span className="text-[rgba(245,237,214,0.55)]">Biên lợi nhuận:</span><span className="text-green-400">{marginPct}% ({formatVND(margin)}đ)</span></div>
                  <div className="flex justify-between"><span className="text-[rgba(245,237,214,0.55)]">Lượt xem:</span><span className="text-[rgba(245,237,214,0.70)]">{product.viewCount.toLocaleString()}</span></div>
                </div>
              </div>
              <div>
                <p className="text-[rgba(245,237,214,0.45)] mb-2 font-medium">Tồn kho theo màu</p>
                <div className="space-y-1">
                  {product.variants.map((v) => (
                    <div key={v.id} className="flex items-center justify-between">
                      <span className="text-[rgba(245,237,214,0.70)]">{v.name} ({v.sku})</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${v.stock === 0 ? "text-red-400" : v.stock < 5 ? "text-yellow-400" : "text-green-400"}`}>{v.stock}</span>
                        {v.reserved > 0 && <span className="text-[rgba(245,237,214,0.45)]">({v.reserved} đặt trước)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[rgba(245,237,214,0.45)] mb-2 font-medium">Thông số kỹ thuật</p>
                <div className="space-y-1">
                  {Object.entries(product.specs).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                      <span className="text-[rgba(245,237,214,0.45)]">{k}:</span>
                      <span className="text-[rgba(245,237,214,0.70)] text-right">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {product.features.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {product.features.map((f) => (
                  <span key={f} className="text-xs px-2 py-0.5 bg-[#C9A84C]/5 border border-[rgba(255,200,100,0.14)] text-[rgba(245,237,214,0.55)] rounded-full">✓ {f}</span>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProductDashboardClient({ data: initialData }: { data: ProductDashboardStats }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [products, setProducts] = useState<Product[]>(initialData.products);
  const [view, setView] = useState<"dashboard" | "list">("dashboard");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/products-mgmt?mode=dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setProducts(json.products);
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function handleStatusChange(id: string, status: ProductStatus) {
    const res = await fetch(`/api/admin/products-mgmt/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setProducts((prev) => prev.map((p) => (p.id === id ? updated : p)));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
    const res = await fetch(`/api/admin/products-mgmt/${id}`, { method: "DELETE" });
    if (res.ok) setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  const filteredProducts = products.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || p.category === filterCat;
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchCat && matchStatus;
  });

  const d = data;
  const profitMargin = d.stats.totalRevenue > 0 ? Math.round((d.stats.totalProfit / d.stats.totalRevenue) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản Lý Sản Phẩm</h1>
          <p className="text-[rgba(245,237,214,0.55)] text-sm mt-1">
            {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-xl overflow-hidden">
            <button
              onClick={() => setView("dashboard")}
              className={`px-4 py-2 text-sm transition-colors ${view === "dashboard" ? "bg-[#C9A84C]/15 text-[#C9A84C]" : "text-[rgba(245,237,214,0.55)] hover:text-white"}`}
            >
              📊 Tổng quan
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-4 py-2 text-sm transition-colors ${view === "list" ? "bg-[#C9A84C]/15 text-[#C9A84C]" : "text-[rgba(245,237,214,0.55)] hover:text-white"}`}
            >
              📦 Danh sách
            </button>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 text-sm text-[rgba(245,237,214,0.70)] hover:text-white border border-gray-700 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
          >
            <span className={refreshing ? "animate-spin" : ""}>↻</span>
            {refreshing ? "Đang tải..." : "Làm mới"}
          </button>
          <button
            onClick={() => router.push("/admin/products/new")}
            className="flex items-center gap-2 text-sm font-semibold bg-[#C9A84C] text-black px-5 py-2 rounded-xl hover:bg-[#E2C97E] transition-colors"
          >
            + Thêm sản phẩm
          </button>
        </div>
      </div>

      {/* ── DASHBOARD VIEW ── */}
      {view === "dashboard" && (
        <>
          {/* Row 1: KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[rgba(245,237,214,0.45)] uppercase tracking-wider">Sản phẩm</span>
                <span className="text-xs text-green-400">{d.stats.activeProducts} đang bán</span>
              </div>
              <div className="text-3xl font-bold text-[#C9A84C] mb-1">{d.stats.totalProducts}</div>
              <div className="flex flex-wrap gap-2 text-xs">
                {d.stats.outOfStock > 0 && <span className="text-red-400">{d.stats.outOfStock} hết hàng</span>}
                {d.stats.comingSoon > 0 && <span className="text-purple-400">{d.stats.comingSoon} sắp ra</span>}
                {d.stats.discontinued > 0 && <span className="text-[rgba(245,237,214,0.45)]">{d.stats.discontinued} ngừng SX</span>}
              </div>
            </div>

            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[rgba(245,237,214,0.45)] uppercase tracking-wider">Doanh thu</span>
                <span className="text-xs text-[#C9A84C]">VNĐ</span>
              </div>
              <div className="text-3xl font-bold text-[#C9A84C] mb-1">{formatVND(d.stats.totalRevenue)}đ</div>
              <div className="text-xs text-green-400">Lợi nhuận: {formatVND(d.stats.totalProfit)}đ ({profitMargin}%)</div>
            </div>

            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[rgba(245,237,214,0.45)] uppercase tracking-wider">Tồn kho</span>
                {d.stats.lowStockCount > 0 && (
                  <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">⚠ {d.stats.lowStockCount} sắp hết</span>
                )}
              </div>
              <div className="text-3xl font-bold text-blue-400 mb-1">{d.stats.totalStock}</div>
              <div className="text-xs text-[rgba(245,237,214,0.55)]">{d.stats.totalSold} đã bán tổng cộng</div>
            </div>

            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[rgba(245,237,214,0.45)] uppercase tracking-wider">Đánh giá TB</span>
                <span className="text-yellow-400">★</span>
              </div>
              <div className="text-3xl font-bold text-yellow-400 mb-1">{d.stats.avgRating.toFixed(1)}</div>
              <div className="text-xs text-[rgba(245,237,214,0.55)]">trên 5.0 điểm</div>
            </div>
          </div>

          {/* Row 2: Revenue trend + Category donut */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Doanh thu 6 tháng gần nhất</h3>
                  <p className="text-xs text-[rgba(245,237,214,0.45)] mt-0.5">Tổng doanh thu theo tháng (tất cả sản phẩm)</p>
                </div>
                <span className="text-xs text-[#C9A84C] bg-[#C9A84C]/10 border border-[rgba(255,200,100,0.22)] px-2 py-0.5 rounded-full">
                  {formatVND(d.stats.totalRevenue)}đ tổng
                </span>
              </div>
              <RevenueLineChart data={d.revenueByMonth} />
              <div className="mt-4 grid grid-cols-6 gap-1">
                {d.revenueByMonth.map((m, i) => (
                  <div key={i} className="text-center">
                    <div className="text-xs font-medium text-[#C9A84C]">{m.units}</div>
                    <div className="text-xs text-[rgba(245,237,214,0.35)]">{m.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[rgba(245,237,214,0.35)] text-center mt-1">Số lượng bán theo tháng</p>
            </div>

            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Phân loại sản phẩm</h3>
              <div className="flex flex-col items-center gap-4">
                <DonutChart
                  segments={d.productsByCategory.map((c) => ({ label: c.label, count: c.count, color: c.color }))}
                  size={110}
                />
                <div className="w-full space-y-2">
                  {d.productsByCategory.map((c) => (
                    <div key={c.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="text-xs text-[rgba(245,237,214,0.70)]">{c.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white">{c.count}</span>
                        <span className="text-xs text-[rgba(245,237,214,0.45)]">{formatVND(c.revenue)}đ</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Top selling + Low stock + Stock by category */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            {/* Top selling */}
            <div className="lg:col-span-2 bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Sản phẩm bán chạy nhất</h3>
                <button onClick={() => setView("list")} className="text-xs text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors">Xem tất cả →</button>
              </div>
              <div className="space-y-3">
                {d.topSellingProducts.map((p, i) => {
                  const cc = CAT_CONFIG[p.category];
                  const sc = STATUS_CONFIG[p.status];
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center text-xs text-[#C9A84C] font-bold flex-shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs ${cc.color}`}>{cc.label}</span>
                          <span className="text-[rgba(245,237,214,0.35)]">·</span>
                          <div className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            <span className={`text-xs ${sc.color}`}>{sc.label}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-yellow-400 text-xs">★</span>
                        <span className="text-xs text-[rgba(245,237,214,0.70)]">{p.rating > 0 ? p.rating.toFixed(1) : "—"}</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-bold text-[#C9A84C]">{formatVND(p.totalRevenue)}đ</div>
                        <div className="text-xs text-[rgba(245,237,214,0.45)]">{p.totalSold} đã bán</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Low stock + Stock by category */}
            <div className="space-y-6">
              <div className="bg-[#1a1200] border border-red-500/10 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="text-red-400">⚠</span> Cảnh báo tồn kho
                </h3>
                {d.lowStockProducts.length === 0 ? (
                  <p className="text-xs text-[rgba(245,237,214,0.45)]">Tất cả sản phẩm đủ hàng ✓</p>
                ) : (
                  <div className="space-y-2">
                    {d.lowStockProducts.map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <span className="text-xs text-[rgba(245,237,214,0.70)] truncate flex-1">{p.name}</span>
                        <span className={`text-xs font-bold ml-2 flex-shrink-0 ${p.totalStock === 0 ? "text-red-400" : "text-yellow-400"}`}>
                          {p.totalStock === 0 ? "Hết" : `${p.totalStock} còn`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-white mb-3">Tồn kho theo danh mục</h3>
                <div className="space-y-2">
                  {d.stockByCategory.map((s) => {
                    const maxStock = Math.max(...d.stockByCategory.map((x) => x.stock), 1);
                    return (
                      <div key={s.category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-[rgba(245,237,214,0.70)]">{s.label}</span>
                          <span className="text-xs font-semibold text-white">{s.stock}</span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(s.stock / maxStock) * 100}%`, backgroundColor: s.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: Activity feed */}
          <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Hoạt động gần đây</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {d.recentActivity.map((act, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-[#1a1200]/50 rounded-xl">
                  <span className="text-base flex-shrink-0">{act.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-300 leading-relaxed">{act.message}</p>
                    <p className="text-xs text-[rgba(245,237,214,0.35)] mt-1">{act.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <div>
          <div className="flex flex-wrap gap-3 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên sản phẩm..."
              className="flex-1 min-w-48 bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
            />
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
            >
              <option value="all">Tất cả danh mục</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="elite">Elite</option>
              <option value="accessory">Phụ kiện</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang bán</option>
              <option value="out_of_stock">Hết hàng</option>
              <option value="coming_soon">Sắp ra mắt</option>
              <option value="discontinued">Ngừng SX</option>
            </select>
            <div className="flex items-center text-xs text-[rgba(245,237,214,0.55)] px-3">
              {filteredProducts.length} / {products.length} sản phẩm
            </div>
          </div>

          <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl overflow-hidden">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 text-[rgba(245,237,214,0.45)]">Không tìm thấy sản phẩm nào</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-[rgba(255,200,100,0.14)]">
                      <th className="px-4 py-3 text-left text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Sản phẩm</th>
                      <th className="px-4 py-3 text-left text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Danh mục</th>
                      <th className="px-4 py-3 text-left text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Trạng thái</th>
                      <th className="px-4 py-3 text-right text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Giá bán</th>
                      <th className="px-4 py-3 text-center text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Tồn kho</th>
                      <th className="px-4 py-3 text-right text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Doanh thu</th>
                      <th className="px-4 py-3 text-left text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Đánh giá</th>
                      <th className="px-4 py-3 text-left text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onEdit={(id) => router.push(`/admin/products/${id}/edit`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <p className="text-xs text-[rgba(245,237,214,0.35)] mt-3 text-center">Click vào hàng để xem chi tiết · Đổi trạng thái trực tiếp trong bảng</p>
        </div>
      )}
    </div>
  );
}
