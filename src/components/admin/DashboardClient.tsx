"use client";
import { useState } from "react";
import Link from "next/link";
import type { DashboardStats } from "@/lib/admin-store";
import type { OrderDashboardStats } from "@/lib/order-store";
import type { ProductDashboardStats } from "@/lib/product-store";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + " tr";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return n.toString();
}

function fmtVND(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ ₫";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " tr ₫";
  return n.toLocaleString("vi-VN") + " ₫";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

// ─── Sparkline ───────────────────────────────────────────────────────────────
function Sparkline({ data, color = "#C9A84C", height = 36 }: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 100;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const pathD = `M ${pts.join(" L ")}`;
  const areaD = `M ${pts[0]} L ${pts.join(" L ")} L ${w},${height} L 0,${height} Z`;
  const gradId = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Revenue Bar Chart ────────────────────────────────────────────────────────
function RevenueBarChart({ data }: { data: { label: string; revenue: number; units: number }[] }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((d, i) => {
        const pct = (d.revenue / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="text-[10px] text-gray-600 group-hover:text-[#C9A84C] transition-colors opacity-0 group-hover:opacity-100">
              {fmtVND(d.revenue)}
            </div>
            <div className="w-full relative" style={{ height: "80px" }}>
              <div
                className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-[#C9A84C]/60 to-[#E2C97E]/80 transition-all duration-300 group-hover:from-[#C9A84C] group-hover:to-[#E2C97E]"
                style={{ height: `${Math.max(pct, 4)}%` }}
              />
            </div>
            <div className="text-[10px] text-gray-600 truncate w-full text-center">{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Order Status Donut ───────────────────────────────────────────────────────
function StatusDonut({ segments, total }: { segments: { label: string; count: number; color: string }[]; total: number }) {
  if (total === 0) return <div className="text-gray-600 text-sm text-center py-4">Chưa có đơn hàng</div>;
  const size = 110;
  const r = 38;
  const cx = size / 2;
  const cy = size / 2;
  let cumAngle = -Math.PI / 2;
  const arcs = segments.filter((s) => s.count > 0).map((seg) => {
    const angle = (seg.count / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { ...seg, x1, y1, x2, y2, large, angle };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) =>
        arc.angle > 0.01 ? (
          <path key={i} d={`M ${cx} ${cy} L ${arc.x1} ${arc.y1} A ${r} ${r} 0 ${arc.large} 1 ${arc.x2} ${arc.y2} Z`} fill={arc.color} opacity="0.85" />
        ) : null
      )}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#0D0B00" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#6B7280" fontSize="8">đơn</text>
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, color, icon, href, trend, trendLabel,
}: {
  label: string; value: string; sub?: string; color: string; icon: string;
  href?: string; trend?: number[]; trendLabel?: string;
}) {
  const inner = (
    <div className={`bg-[#0D0B00] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all h-full group`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">{label}</span>
        </div>
        {href && <span className="text-gray-700 group-hover:text-gray-400 text-xs transition-colors">→</span>}
      </div>
      <div className="text-2xl font-bold mb-1" style={{ color }}>{value}</div>
      {sub && <div className="text-xs text-gray-600">{sub}</div>}
      {trend && trend.length > 1 && (
        <div className="mt-3">
          <Sparkline data={trend} color={color} height={32} />
          {trendLabel && <div className="text-[10px] text-gray-700 mt-1">{trendLabel}</div>}
        </div>
      )}
    </div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : <div className="h-full">{inner}</div>;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DashboardClient({
  blogData,
  orderData,
  productData,
}: {
  blogData: DashboardStats;
  orderData: OrderDashboardStats;
  productData: ProductDashboardStats;
}) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 600));
    window.location.reload();
  }

  const o = orderData.stats;
  const p = productData.stats;
  const b = blogData.stats;

  // Revenue trend (7 days)
  const revTrend = orderData.revenueByDay.map((d) => d.revenue);
  const orderTrend = orderData.revenueByDay.map((d) => d.orders);

  // Profit margin
  const profitMargin = p.totalRevenue > 0 ? Math.round((p.totalProfit / p.totalRevenue) * 100) : 0;

  // Week-over-week revenue (compare last 7 days vs prior 7)
  const thisWeekRev = o.weekRevenue;

  const today = new Date();
  const dateStr = today.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">Tổng Quan Kinh Doanh</h1>
          <p className="text-gray-500 text-sm mt-0.5 capitalize">{dateStr}</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-white/10 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 hover:border-white/20"
        >
          <span className={refreshing ? "animate-spin inline-block" : "inline-block"}>↻</span>
          {refreshing ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {/* ── Row 1: Top KPI — Revenue / Profit / Orders / Customers ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Doanh thu"
          value={fmtVND(p.totalRevenue)}
          sub={`Tuần này: ${fmtVND(thisWeekRev)}`}
          color="#C9A84C"
          icon="💰"
          href="/admin/orders"
          trend={revTrend}
          trendLabel="Doanh thu 7 ngày"
        />
        <KpiCard
          label="Lợi nhuận"
          value={fmtVND(p.totalProfit)}
          sub={`Biên lợi nhuận: ${profitMargin}%`}
          color="#22C55E"
          icon="📈"
          trend={revTrend.map((v) => Math.round(v * profitMargin / 100))}
          trendLabel="Lợi nhuận ước tính"
        />
        <KpiCard
          label="Đơn hàng"
          value={fmt(o.totalOrders)}
          sub={`Chờ xử lý: ${o.pendingOrders} · Đang giao: ${o.shippingOrders}`}
          color="#3B82F6"
          icon="📦"
          href="/admin/orders"
          trend={orderTrend}
          trendLabel="Đơn hàng 7 ngày"
        />
        <KpiCard
          label="Giá trị TB / đơn"
          value={fmtVND(o.avgOrderValue)}
          sub={`Tổng ${fmt(o.deliveredOrders)} đơn đã giao · ${o.conversionRate}% tỷ lệ`}
          color="#F472B6"
          icon="🎯"
        />
      </div>

      {/* ── Row 2: Secondary KPI ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Sản phẩm"
          value={fmt(p.totalProducts)}
          sub={`Đang bán: ${p.activeProducts} · Hết hàng: ${p.outOfStock}`}
          color="#8B5CF6"
          icon="🛏️"
          href="/admin/products"
        />
        <KpiCard
          label="Tồn kho"
          value={fmt(p.totalStock)}
          sub={`${p.lowStockCount} sản phẩm sắp hết hàng`}
          color={p.lowStockCount > 0 ? "#F59E0B" : "#22C55E"}
          icon="🏭"
          href="/admin/products"
        />
        <KpiCard
          label="Đã bán"
          value={fmt(p.totalSold)}
          sub={`Đánh giá TB: ${p.avgRating}⭐`}
          color="#06B6D4"
          icon="🏆"
        />
        <KpiCard
          label="Liên hệ"
          value={fmt(b.totalContacts)}
          sub={`${b.unreadContacts} chưa đọc · ${blogData.contactsByDay.reduce((a, d) => a + d.count, 0)} tuần này`}
          color={b.unreadContacts > 0 ? "#EF4444" : "#6B7280"}
          icon="💬"
          href="/admin/contacts"
        />
      </div>

      {/* ── Row 3: Revenue Chart + Order Status ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue by month */}
        <div className="lg:col-span-2 bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Doanh thu theo tháng</h3>
              <p className="text-xs text-gray-600 mt-0.5">6 tháng gần nhất</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-600">Tổng cộng</div>
              <div className="text-sm font-bold text-[#C9A84C]">{fmtVND(p.totalRevenue)}</div>
            </div>
          </div>
          <RevenueBarChart data={productData.revenueByMonth} />
          <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Tháng tốt nhất</div>
              <div className="text-sm font-bold text-white">
                {productData.revenueByMonth.length > 0
                  ? fmtVND(Math.max(...productData.revenueByMonth.map((m) => m.revenue)))
                  : "—"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Tổng đơn vị bán</div>
              <div className="text-sm font-bold text-white">
                {fmt(productData.revenueByMonth.reduce((s, m) => s + m.units, 0))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">Doanh thu TB/tháng</div>
              <div className="text-sm font-bold text-white">
                {productData.revenueByMonth.length > 0
                  ? fmtVND(Math.round(p.totalRevenue / productData.revenueByMonth.length))
                  : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Order status donut */}
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Trạng thái đơn hàng</h3>
          <div className="flex flex-col items-center gap-4">
            <StatusDonut segments={orderData.ordersByStatus} total={o.totalOrders} />
            <div className="w-full space-y-2">
              {orderData.ordersByStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-gray-400 truncate">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-white">{s.count}</span>
                    <span className="text-xs text-gray-700">
                      {o.totalOrders > 0 ? `${Math.round((s.count / o.totalOrders) * 100)}%` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 4: Top Products + Recent Orders ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top selling products */}
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Sản phẩm bán chạy</h3>
            <Link href="/admin/products" className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C] transition-colors">Xem tất cả →</Link>
          </div>
          <div className="space-y-3">
            {productData.topSellingProducts.slice(0, 5).map((prod, i) => (
              <div key={prod.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-[#C9A84C]">{i + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{prod.name}</div>
                  <div className="text-[10px] text-gray-600">{fmt(prod.totalSold)} đã bán · {prod.rating}⭐</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold text-[#C9A84C]">{fmtVND(prod.totalRevenue)}</div>
                </div>
              </div>
            ))}
            {productData.topSellingProducts.length === 0 && (
              <p className="text-gray-600 text-xs text-center py-4">Chưa có dữ liệu bán hàng</p>
            )}
          </div>

          {/* Low stock alert */}
          {productData.lowStockProducts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-orange-400 text-xs">⚠️</span>
                <span className="text-xs font-medium text-orange-400">Sắp hết hàng ({productData.lowStockProducts.length})</span>
              </div>
              <div className="space-y-1.5">
                {productData.lowStockProducts.slice(0, 3).map((prod) => (
                  <div key={prod.id} className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 truncate flex-1">{prod.name}</span>
                    <span className="text-xs font-bold text-orange-400 ml-2">{prod.totalStock} còn</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent orders */}
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Đơn hàng gần đây</h3>
            <Link href="/admin/orders" className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C] transition-colors">Xem tất cả →</Link>
          </div>
          <div className="space-y-3">
            {orderData.recentOrders.slice(0, 6).map((order) => {
              const statusColors: Record<string, string> = {
                pending: "text-yellow-400 bg-yellow-400/10",
                confirmed: "text-blue-400 bg-blue-400/10",
                processing: "text-purple-400 bg-purple-400/10",
                shipping: "text-cyan-400 bg-cyan-400/10",
                delivered: "text-green-400 bg-green-400/10",
                cancelled: "text-red-400 bg-red-400/10",
                refunded: "text-gray-400 bg-gray-400/10",
              };
              const statusLabels: Record<string, string> = {
                pending: "Chờ",
                confirmed: "Xác nhận",
                processing: "Xử lý",
                shipping: "Giao hàng",
                delivered: "Đã giao",
                cancelled: "Hủy",
                refunded: "Hoàn",
              };
              return (
                <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center gap-3 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-white group-hover:text-[#C9A84C] transition-colors">{order.orderNumber}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColors[order.status] || "text-gray-400 bg-gray-400/10"}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-600 truncate">{order.customerName} · {timeAgo(order.createdAt)}</div>
                  </div>
                  <div className="text-xs font-bold text-[#C9A84C] flex-shrink-0">{fmtVND(order.total)}</div>
                </Link>
              );
            })}
            {orderData.recentOrders.length === 0 && (
              <p className="text-gray-600 text-xs text-center py-4">Chưa có đơn hàng nào</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 5: Revenue by city + Payment methods + Blog ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue by city */}
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Doanh thu theo khu vực</h3>
          <div className="space-y-3">
            {orderData.revenueByCity.slice(0, 5).map((city, i) => (
              <div key={city.city}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{i + 1}.</span>
                    <span className="text-xs text-gray-300 truncate">{city.city}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-[#C9A84C]">{fmtVND(city.revenue)}</span>
                    <span className="text-[10px] text-gray-600">{city.percentage}%</span>
                  </div>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#C9A84C]/60 to-[#E2C97E] rounded-full"
                    style={{ width: `${city.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            {orderData.revenueByCity.length === 0 && (
              <p className="text-gray-600 text-xs text-center py-4">Chưa có dữ liệu</p>
            )}
          </div>
        </div>

        {/* Payment methods */}
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Phương thức thanh toán</h3>
          <div className="space-y-3">
            {orderData.ordersByPayment.map((pm) => {
              const pct = o.totalOrders > 0 ? Math.round((pm.count / o.totalOrders) * 100) : 0;
              return (
                <div key={pm.method}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-300">{pm.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{pm.count}</span>
                      <span className="text-[10px] text-gray-600">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: pm.color }} />
                  </div>
                </div>
              );
            })}
            {orderData.ordersByPayment.length === 0 && (
              <p className="text-gray-600 text-xs text-center py-4">Chưa có dữ liệu</p>
            )}
          </div>

          {/* Conversion rate */}
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Tỷ lệ chuyển đổi</span>
              <span className="text-sm font-bold text-green-400">{o.conversionRate}%</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${o.conversionRate}%` }} />
            </div>
          </div>
        </div>

        {/* Blog & contacts summary */}
        <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Nội dung & Liên hệ</h3>
          <div className="space-y-3">
            {/* Posts */}
            <div className="p-3 bg-white/3 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>📝</span>
                  <span className="text-xs text-gray-300">Bài viết</span>
                </div>
                <Link href="/admin/posts" className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C]">Quản lý →</Link>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-sm font-bold text-green-400">{b.publishedPosts}</div>
                  <div className="text-[10px] text-gray-600">Đã đăng</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-400">{b.draftPosts}</div>
                  <div className="text-[10px] text-gray-600">Nháp</div>
                </div>
                <div>
                  <div className="text-sm font-bold text-blue-400">{b.scheduledPosts}</div>
                  <div className="text-[10px] text-gray-600">Lịch</div>
                </div>
              </div>
            </div>

            {/* Contacts */}
            <div className="p-3 bg-white/3 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span>💬</span>
                  <span className="text-xs text-gray-300">Liên hệ</span>
                </div>
                <Link href="/admin/contacts" className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C]">Xem →</Link>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-sm font-bold text-white">{b.totalContacts}</div>
                  <div className="text-[10px] text-gray-600">Tổng</div>
                </div>
                <div>
                  <div className={`text-sm font-bold ${b.unreadContacts > 0 ? "text-red-400" : "text-gray-500"}`}>{b.unreadContacts}</div>
                  <div className="text-[10px] text-gray-600">Chưa đọc</div>
                </div>
              </div>
            </div>

            {/* Top contact subjects */}
            <div>
              <div className="text-[10px] text-gray-700 uppercase tracking-wider mb-2">Chủ đề phổ biến</div>
              {blogData.contactsBySubject.slice(0, 3).map((s, i) => {
                const colors = ["#C9A84C", "#3B82F6", "#22C55E"];
                return (
                  <div key={s.subject} className="flex items-center justify-between py-1">
                    <span className="text-xs text-gray-500 truncate flex-1">{s.subject}</span>
                    <span className="text-xs font-medium ml-2" style={{ color: colors[i] }}>{s.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 6: Quick Actions ── */}
      <div className="bg-[#0D0B00] border border-white/5 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { href: "/admin/orders/new", icon: "➕", label: "Tạo đơn hàng", color: "#C9A84C" },
            { href: "/admin/products/new", icon: "🛏️", label: "Thêm sản phẩm", color: "#8B5CF6" },
            { href: "/admin/posts/new", icon: "✏️", label: "Viết bài mới", color: "#3B82F6" },
            { href: "/admin/contacts", icon: "💬", label: "Xem liên hệ", color: "#EF4444" },
            { href: "/admin/homepage-products", icon: "🏠", label: "Trang chủ", color: "#22C55E" },
            { href: "/admin/settings", icon: "⚙️", label: "Cài đặt", color: "#6B7280" },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/3 hover:bg-white/6 border border-transparent hover:border-white/10 transition-all group"
            >
              <span className="text-xl">{action.icon}</span>
              <span className="text-[11px] text-gray-500 group-hover:text-gray-300 text-center transition-colors">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
