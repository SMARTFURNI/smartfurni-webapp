"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderDashboardStats, Order, OrderStatus, PaymentMethod } from "@/lib/order-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}Bđ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}Mđ`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}Kđ`;
  return n.toLocaleString("vi-VN") + "đ";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; dot: string; icon: string }> = {
  pending:    { label: "Chờ xác nhận", color: "text-yellow-400",  bg: "bg-yellow-500/10",  dot: "bg-yellow-400",  icon: "⏳" },
  confirmed:  { label: "Đã xác nhận",  color: "text-blue-400",    bg: "bg-blue-500/10",    dot: "bg-blue-400",    icon: "✅" },
  processing: { label: "Đang xử lý",   color: "text-purple-400",  bg: "bg-purple-500/10",  dot: "bg-purple-400",  icon: "⚙️" },
  shipping:   { label: "Đang giao",    color: "text-cyan-400",    bg: "bg-cyan-500/10",    dot: "bg-cyan-400",    icon: "🚚" },
  delivered:  { label: "Đã giao",      color: "text-green-400",   bg: "bg-green-500/10",   dot: "bg-green-400",   icon: "📦" },
  cancelled:  { label: "Đã hủy",       color: "text-red-400",     bg: "bg-red-500/10",     dot: "bg-red-400",     icon: "❌" },
  refunded:   { label: "Hoàn tiền",    color: "text-[rgba(245,237,214,0.70)]",    bg: "bg-gray-500/10",    dot: "bg-gray-500",    icon: "↩️" },
};

const PAYMENT_CONFIG: Record<PaymentMethod, { label: string; icon: string }> = {
  bank_transfer: { label: "Chuyển khoản", icon: "🏦" },
  cod:           { label: "COD",           icon: "💵" },
  momo:          { label: "MoMo",          icon: "💜" },
  vnpay:         { label: "VNPay",         icon: "💳" },
  credit_card:   { label: "Thẻ tín dụng", icon: "💳" },
};

const STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "processing", "shipping", "delivered"];

// ─── Bar Chart (revenue by day) ───────────────────────────────────────────────
function RevenueBarChart({ data }: { data: { label: string; revenue: number; orders: number }[] }) {
  const maxRev = Math.max(...data.map((d) => d.revenue), 1);
  const w = 400; const h = 90;
  const barW = Math.floor(w / data.length) - 8;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 24}`} className="overflow-visible">
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#C9A84C" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const barH = Math.max((d.revenue / maxRev) * h, d.revenue > 0 ? 4 : 0);
        const x = i * (w / data.length) + 4;
        const y = h - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill="url(#barGrad)" rx="4" />
            {d.revenue > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="#C9A84C" fontSize="8" fontWeight="600">
                {formatVND(d.revenue)}
              </text>
            )}
            <text x={x + barW / 2} y={h + 14} textAnchor="middle" fill="#4B5563" fontSize="9">{d.label}</text>
            {d.orders > 0 && (
              <text x={x + barW / 2} y={h + 24} textAnchor="middle" fill="#374151" fontSize="8">{d.orders} đơn</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ segments, size = 110 }: {
  segments: { label: string; count: number; color: string }[];
  size?: number;
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
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">{total}</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fill="#6B7280" fontSize="8">đơn hàng</text>
    </svg>
  );
}

// ─── Order Timeline ───────────────────────────────────────────────────────────
function OrderTimeline({ order }: { order: Order }) {
  const completedStatuses = new Set(order.timeline.map((t) => t.status));
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1">
      {STATUS_FLOW.map((s, i) => {
        const done = completedStatuses.has(s);
        const current = order.status === s;
        const sc = STATUS_CONFIG[s];
        return (
          <div key={s} className="flex items-center gap-1 flex-shrink-0">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
              current ? `${sc.bg} ${sc.color} font-semibold ring-1 ring-current` :
              done ? "bg-green-500/10 text-green-400" : "bg-gray-800 text-[rgba(245,237,214,0.35)]"
            }`}>
              <span>{sc.icon}</span>
              <span className="hidden sm:inline">{sc.label}</span>
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <div className={`w-4 h-0.5 flex-shrink-0 ${done ? "bg-green-500/40" : "bg-gray-800"}`} />
            )}
          </div>
        );
      })}
      {(order.status === "cancelled" || order.status === "refunded") && (
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${STATUS_CONFIG[order.status].bg} ${STATUS_CONFIG[order.status].color} font-semibold ring-1 ring-current`}>
          <span>{STATUS_CONFIG[order.status].icon}</span>
          <span>{STATUS_CONFIG[order.status].label}</span>
        </div>
      )}
    </div>
  );
}

// ─── Order Row ────────────────────────────────────────────────────────────────
function OrderRow({ order, onStatusChange, onEdit, onDelete }: {
  order: Order;
  onStatusChange: (id: string, status: OrderStatus) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_CONFIG[order.status];
  const pc = PAYMENT_CONFIG[order.paymentMethod];
  const createdDate = new Date(order.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

  return (
    <>
      <tr
        className="border-b border-[rgba(255,200,100,0.08)] hover:bg-white/2 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="font-mono text-xs text-[#C9A84C] font-semibold">{order.orderNumber}</div>
          <div className="text-xs text-[rgba(245,237,214,0.45)]">{createdDate}</div>
        </td>
        <td className="px-4 py-3">
          <div className="text-sm text-white">{order.customerName}</div>
          <div className="text-xs text-[rgba(245,237,214,0.45)]">{order.customerPhone}</div>
        </td>
        <td className="px-4 py-3">
          <div className="text-xs text-[rgba(245,237,214,0.70)] truncate max-w-[160px]">
            {order.items.map((i) => `${i.productName} x${i.quantity}`).join(", ")}
          </div>
          <div className="text-xs text-[rgba(245,237,214,0.35)]">{order.items.length} sản phẩm</div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="text-sm font-bold text-[#C9A84C]">{formatVND(order.total)}</div>
          {order.discount > 0 && <div className="text-xs text-green-400">-{formatVND(order.discount)}</div>}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sc.dot}`} />
            <span className={`text-xs ${sc.color}`}>{sc.label}</span>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <span className="text-xs">{pc.icon}</span>
            <span className="text-xs text-[rgba(245,237,214,0.70)]">{pc.label}</span>
          </div>
          <div className={`text-xs mt-0.5 ${order.paymentStatus === "paid" ? "text-green-400" : order.paymentStatus === "refunded" ? "text-[rgba(245,237,214,0.55)]" : "text-yellow-400"}`}>
            {order.paymentStatus === "paid" ? "Đã thanh toán" : order.paymentStatus === "refunded" ? "Đã hoàn" : "Chưa thanh toán"}
          </div>
        </td>
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex flex-col gap-1.5">
            <select
              value={order.status}
              onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
              className="text-xs bg-[#1a1200] border border-[rgba(255,200,100,0.18)] text-[rgba(245,237,214,0.70)] rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="pending">Đợi xác nhận</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="processing">Đang xử lý</option>
              <option value="shipping">Đang giao</option>
              <option value="delivered">Đã giao</option>
              <option value="cancelled">Đã hủy</option>
              <option value="refunded">Hoàn tiền</option>
            </select>
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(order.id)}
                className="flex-1 text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
              >
                Sửa
              </button>
              <button
                onClick={() => onDelete(order.id)}
                className="flex-1 text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                Xóa
              </button>
            </div>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[#1a1200]/60">
          <td colSpan={7} className="px-6 py-4">
            <div className="mb-3">
              <OrderTimeline order={order} />
            </div>
            <div className="grid sm:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-[rgba(245,237,214,0.45)] mb-2 font-medium">Thông tin khách hàng</p>
                <div className="space-y-1">
                  <div className="flex gap-2"><span className="text-[rgba(245,237,214,0.45)]">Tên:</span><span className="text-white">{order.customerName}</span></div>
                  <div className="flex gap-2"><span className="text-[rgba(245,237,214,0.45)]">Email:</span><span className="text-[rgba(245,237,214,0.70)]">{order.customerEmail}</span></div>
                  <div className="flex gap-2"><span className="text-[rgba(245,237,214,0.45)]">SĐT:</span><span className="text-[rgba(245,237,214,0.70)]">{order.customerPhone}</span></div>
                  <div className="flex gap-2"><span className="text-[rgba(245,237,214,0.45)]">Địa chỉ:</span><span className="text-[rgba(245,237,214,0.70)]">{order.shippingAddress}, {order.city}</span></div>
                  {order.notes && <div className="flex gap-2"><span className="text-[rgba(245,237,214,0.45)]">Ghi chú:</span><span className="text-yellow-400">{order.notes}</span></div>}
                </div>
              </div>
              <div>
                <p className="text-[rgba(245,237,214,0.45)] mb-2 font-medium">Chi tiết đơn hàng</p>
                <div className="space-y-1">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between gap-2">
                      <span className="text-[rgba(245,237,214,0.70)] truncate">{item.productName} ({item.variant}) x{item.quantity}</span>
                      <span className="text-white flex-shrink-0">{formatVND(item.totalPrice)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-800 pt-1 mt-1">
                    {order.shippingFee > 0 && <div className="flex justify-between"><span className="text-[rgba(245,237,214,0.45)]">Phí ship:</span><span className="text-[rgba(245,237,214,0.70)]">{formatVND(order.shippingFee)}</span></div>}
                    {order.discount > 0 && <div className="flex justify-between"><span className="text-[rgba(245,237,214,0.45)]">Giảm giá:</span><span className="text-green-400">-{formatVND(order.discount)}</span></div>}
                    <div className="flex justify-between font-semibold"><span className="text-[rgba(245,237,214,0.70)]">Tổng:</span><span className="text-[#C9A84C]">{formatVND(order.total)}</span></div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[rgba(245,237,214,0.45)] mb-2 font-medium">Vận chuyển</p>
                <div className="space-y-1">
                  {order.trackingCode ? (
                    <>
                      <div className="flex gap-2"><span className="text-[rgba(245,237,214,0.45)]">Mã vận đơn:</span><span className="text-cyan-400 font-mono">{order.trackingCode}</span></div>
                      <div className="flex gap-2"><span className="text-[rgba(245,237,214,0.45)]">Đối tác:</span><span className="text-[rgba(245,237,214,0.70)]">{order.shippingPartner}</span></div>
                    </>
                  ) : (
                    <span className="text-[rgba(245,237,214,0.35)]">Chưa có mã vận đơn</span>
                  )}
                  <div className="mt-2">
                    <p className="text-[rgba(245,237,214,0.45)] mb-1">Lịch sử trạng thái</p>
                    {order.timeline.map((t, i) => {
                      const tsc = STATUS_CONFIG[t.status];
                      return (
                        <div key={i} className="flex items-start gap-2 mb-1">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 ${tsc.dot}`} />
                          <div>
                            <span className={`text-xs ${tsc.color}`}>{tsc.label}</span>
                            <span className="text-xs text-[rgba(245,237,214,0.35)] ml-1">{timeAgo(t.time)}</span>
                            {t.note && <p className="text-xs text-[rgba(245,237,214,0.45)]">{t.note}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OrderDashboardClient({ data: initialData }: { data: OrderDashboardStats }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const [orders, setOrders] = useState<Order[]>(initialData.orders);
  const [view, setView] = useState<"dashboard" | "list">("dashboard");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/orders?mode=dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setOrders(json.orders);
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function handleStatusChange(id: string, status: OrderStatus) {
    const res = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    }
  }

  async function handleDelete(id: string) {
    const order = orders.find((o) => o.id === id);
    if (!confirm(`Xóa đơn hàng ${order?.orderNumber || id}? Hành động này không thể hoàn tác.`)) return;
    const res = await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
    if (res.ok) setOrders((prev) => prev.filter((o) => o.id !== id));
  }

  const filteredOrders = orders.filter((o) => {
    const matchSearch = !search ||
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone.includes(search);
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const matchPayment = filterPayment === "all" || o.paymentMethod === filterPayment;
    return matchSearch && matchStatus && matchPayment;
  });

  const d = data;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Quản Lý Đơn Hàng</h1>
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
              📋 Danh sách
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
            onClick={() => router.push("/admin/orders/new")}
            className="flex items-center gap-2 text-sm font-semibold bg-[#C9A84C] text-black px-5 py-2 rounded-xl hover:bg-[#E2C97E] transition-colors"
          >
            + Tạo đơn hàng
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
                <span className="text-xs text-[rgba(245,237,214,0.45)] uppercase tracking-wider">Tổng đơn hàng</span>
                {d.stats.pendingOrders > 0 && (
                  <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">{d.stats.pendingOrders} chờ</span>
                )}
              </div>
              <div className="text-3xl font-bold text-[#C9A84C] mb-1">{d.stats.totalOrders}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <span className="text-cyan-400">🚚 {d.stats.shippingOrders} đang giao</span>
                <span className="text-green-400">✅ {d.stats.deliveredOrders} đã giao</span>
              </div>
            </div>

            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[rgba(245,237,214,0.45)] uppercase tracking-wider">Doanh thu</span>
                <span className="text-xs text-[#C9A84C]">đã thanh toán</span>
              </div>
              <div className="text-3xl font-bold text-[#C9A84C] mb-1">{formatVND(d.stats.totalRevenue)}</div>
              <div className="text-xs text-[rgba(245,237,214,0.55)]">Giá trị TB: {formatVND(d.stats.avgOrderValue)}/đơn</div>
            </div>

            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[rgba(245,237,214,0.45)] uppercase tracking-wider">Tuần này</span>
                <span className="text-xs text-blue-400">{d.stats.weekOrders} đơn</span>
              </div>
              <div className="text-3xl font-bold text-blue-400 mb-1">{formatVND(d.stats.weekRevenue)}</div>
              <div className="text-xs text-[rgba(245,237,214,0.55)]">
                Hôm nay: {d.stats.todayOrders} đơn · {formatVND(d.stats.todayRevenue)}
              </div>
            </div>

            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[rgba(245,237,214,0.45)] uppercase tracking-wider">Tỷ lệ giao thành công</span>
                <span className="text-xs text-green-400">%</span>
              </div>
              <div className="text-3xl font-bold text-green-400 mb-1">{d.stats.conversionRate}%</div>
              <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
                <div className="bg-green-400 h-1.5 rounded-full" style={{ width: `${d.stats.conversionRate}%` }} />
              </div>
            </div>
          </div>

          {/* Row 2: Revenue bar chart + Status donut */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Doanh thu 7 ngày gần nhất</h3>
                  <p className="text-xs text-[rgba(245,237,214,0.45)] mt-0.5">Doanh thu và số đơn theo ngày</p>
                </div>
                <span className="text-xs text-[#C9A84C] bg-[#C9A84C]/10 border border-[rgba(255,200,100,0.22)] px-2 py-0.5 rounded-full">
                  {formatVND(d.stats.weekRevenue)} tuần này
                </span>
              </div>
              <RevenueBarChart data={d.revenueByDay} />
            </div>

            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Trạng thái đơn hàng</h3>
              <div className="flex flex-col items-center gap-4">
                <DonutChart segments={d.ordersByStatus.map((s) => ({ label: s.label, count: s.count, color: s.color }))} size={110} />
                <div className="w-full space-y-2">
                  {d.ordersByStatus.map((s) => (
                    <div key={s.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        <span className="text-xs text-[rgba(245,237,214,0.70)]">{s.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-white">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Payment methods + Top products + City */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            {/* Payment methods */}
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Phương thức thanh toán</h3>
              <div className="space-y-3">
                {d.ordersByPayment.map((p) => {
                  const maxCount = Math.max(...d.ordersByPayment.map((x) => x.count), 1);
                  return (
                    <div key={p.method}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{PAYMENT_CONFIG[p.method].icon}</span>
                          <span className="text-xs text-[rgba(245,237,214,0.70)]">{p.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">{p.count}</span>
                          <span className="text-xs text-[rgba(245,237,214,0.45)]">{formatVND(p.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(p.count / maxCount) * 100}%`, backgroundColor: p.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top products */}
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Sản phẩm được đặt nhiều nhất</h3>
              <div className="space-y-3">
                {d.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center text-xs text-[#C9A84C] font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{p.productName}</p>
                      <p className="text-xs text-[rgba(245,237,214,0.45)]">{p.quantity} sản phẩm</p>
                    </div>
                    <div className="text-xs font-semibold text-[#C9A84C] flex-shrink-0">{formatVND(p.revenue)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* City distribution */}
            <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Phân bố theo tỉnh/thành</h3>
              <div className="space-y-3">
                {d.revenueByCity.map((c) => {
                  const maxRev = Math.max(...d.revenueByCity.map((x) => x.revenue), 1);
                  return (
                    <div key={c.city}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[rgba(245,237,214,0.70)]">{c.city}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white">{c.count} đơn</span>
                          <span className="text-xs text-[#C9A84C]">{formatVND(c.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-[#C9A84C]/60 rounded-full" style={{ width: `${(c.revenue / maxRev) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Row 4: Recent orders */}
          <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Đơn hàng gần đây</h3>
              <button onClick={() => setView("list")} className="text-xs text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors">
                Xem tất cả →
              </button>
            </div>
            <div className="space-y-2">
              {d.recentOrders.map((o) => {
                const sc = STATUS_CONFIG[o.status];
                const pc = PAYMENT_CONFIG[o.paymentMethod];
                return (
                  <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1200]/50 hover:bg-[#1a1200] transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center text-sm flex-shrink-0">
                      {sc.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-[#C9A84C] font-semibold">{o.orderNumber}</span>
                        <span className="text-xs text-[rgba(245,237,214,0.45)]">·</span>
                        <span className="text-xs text-white">{o.customerName}</span>
                      </div>
                      <div className="text-xs text-[rgba(245,237,214,0.45)] truncate">
                        {o.items.map((i) => `${i.productName} x${i.quantity}`).join(", ")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs">{pc.icon}</span>
                      <div className={`text-xs px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</div>
                      <div className="text-sm font-bold text-[#C9A84C]">{formatVND(o.total)}</div>
                    </div>
                  </div>
                );
              })}
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
              placeholder="Tìm theo mã đơn, tên, SĐT..."
              className="flex-1 min-w-48 bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-700 focus:outline-none focus:border-[#C9A84C]/40"
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xác nhận</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="processing">Đang xử lý</option>
              <option value="shipping">Đang giao</option>
              <option value="delivered">Đã giao</option>
              <option value="cancelled">Đã hủy</option>
              <option value="refunded">Hoàn tiền</option>
            </select>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="bg-[#1a1200] border border-[rgba(255,200,100,0.18)] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/40"
            >
              <option value="all">Tất cả thanh toán</option>
              <option value="bank_transfer">Chuyển khoản</option>
              <option value="cod">COD</option>
              <option value="momo">MoMo</option>
              <option value="vnpay">VNPay</option>
            </select>
            <div className="flex items-center text-xs text-[rgba(245,237,214,0.55)] px-3">
              {filteredOrders.length} / {orders.length} đơn hàng
            </div>
          </div>

          <div className="bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 text-[rgba(245,237,214,0.45)]">Không tìm thấy đơn hàng nào</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-[rgba(255,200,100,0.14)]">
                      <th className="px-4 py-3 text-left text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Mã đơn</th>
                      <th className="px-4 py-3 text-left text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Khách hàng</th>
                      <th className="px-4 py-3 text-left text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Sản phẩm</th>
                      <th className="px-4 py-3 text-right text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Tổng tiền</th>
                      <th className="px-4 py-3 text-left text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Trạng thái</th>
                      <th className="px-4 py-3 text-left text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Thanh toán</th>
                      <th className="px-4 py-3 text-left text-xs text-[rgba(245,237,214,0.45)] font-medium uppercase tracking-wider">Cập nhật</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        onStatusChange={handleStatusChange}
                        onEdit={(id) => router.push(`/admin/orders/${id}/edit`)}
                        onDelete={handleDelete}
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
