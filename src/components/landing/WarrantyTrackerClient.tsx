"use client";
import { useState } from "react";
import Link from "next/link";
import type { SiteTheme } from "@/lib/theme-types";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { ScrollReveal, StaggerReveal } from "./ScrollReveal";

interface Props {
  theme: SiteTheme;
}

type OrderStatus = "confirmed" | "processing" | "shipping" | "delivered" | "cancelled";

interface WarrantyInfo {
  startDate: string;
  endDate: string;
  type: string;
  coverage: string[];
  remainingDays: number;
  totalDays: number;
}

interface TrackingEvent {
  date: string;
  time: string;
  status: string;
  location: string;
  note?: string;
}

interface OrderResult {
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  product: string;
  variant: string;
  quantity: number;
  total: number;
  paymentMethod: string;
  shippingAddress: string;
  trackingCode: string;
  shippingPartner: string;
  estimatedDelivery: string;
  orderDate: string;
  warranty: WarrantyInfo;
  timeline: TrackingEvent[];
}

// Mock data for demo
const MOCK_ORDERS: Record<string, OrderResult> = {
  "SF-2026-0042": {
    orderNumber: "SF-2026-0042",
    status: "shipping",
    customerName: "Nguyễn Văn An",
    product: "SmartFurni Pro",
    variant: "Queen 160×200cm — Xám Bạch Kim",
    quantity: 1,
    total: 28900000,
    paymentMethod: "Chuyển khoản ngân hàng",
    shippingAddress: "123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
    trackingCode: "GHTK-2026-88421",
    shippingPartner: "Giao Hàng Tiết Kiệm",
    estimatedDelivery: "12/03/2026",
    orderDate: "08/03/2026",
    warranty: {
      startDate: "12/03/2026",
      endDate: "12/03/2031",
      type: "Bảo hành toàn diện 5 năm",
      coverage: [
        "Khung giường và cơ cấu nâng hạ",
        "Bộ điều khiển điện tử và motor",
        "Ứng dụng SmartFurni và cập nhật phần mềm",
        "Đệm và lớp bọc vải (lỗi sản xuất)",
        "Hỗ trợ kỹ thuật 24/7",
      ],
      remainingDays: 1827,
      totalDays: 1827,
    },
    timeline: [
      { date: "10/03/2026", time: "14:32", status: "Đang vận chuyển", location: "Kho phân loại Bình Dương", note: "Hàng đang trên đường đến TP.HCM" },
      { date: "10/03/2026", time: "08:15", status: "Đã lấy hàng", location: "Kho SmartFurni — Bình Dương" },
      { date: "09/03/2026", time: "16:45", status: "Đang đóng gói", location: "Nhà máy SmartFurni — Bình Dương" },
      { date: "08/03/2026", time: "11:20", status: "Đã xác nhận đơn hàng", location: "Hệ thống SmartFurni", note: "Đơn hàng đã được xác nhận và đưa vào sản xuất" },
      { date: "08/03/2026", time: "10:05", status: "Đặt hàng thành công", location: "SmartFurni.vn" },
    ],
  },
  "SF-2026-0031": {
    orderNumber: "SF-2026-0031",
    status: "delivered",
    customerName: "Trần Thị Bích",
    product: "SmartFurni Elite",
    variant: "King 180×200cm — Đen Obsidian",
    quantity: 1,
    total: 45900000,
    paymentMethod: "MoMo",
    shippingAddress: "45 Trần Phú, Ba Đình, Hà Nội",
    trackingCode: "GHTK-2026-77312",
    shippingPartner: "Giao Hàng Tiết Kiệm",
    estimatedDelivery: "05/03/2026",
    orderDate: "01/03/2026",
    warranty: {
      startDate: "05/03/2026",
      endDate: "05/03/2033",
      type: "Bảo hành cao cấp 7 năm",
      coverage: [
        "Khung giường và cơ cấu nâng hạ",
        "Bộ điều khiển điện tử và motor",
        "Ứng dụng SmartFurni và cập nhật phần mềm",
        "Đệm và lớp bọc vải (lỗi sản xuất)",
        "Hỗ trợ kỹ thuật 24/7",
        "Bảo dưỡng định kỳ miễn phí (2 lần/năm)",
        "Thay thế linh kiện ưu tiên trong 24h",
      ],
      remainingDays: 2552,
      totalDays: 2552,
    },
    timeline: [
      { date: "05/03/2026", time: "15:20", status: "Đã giao hàng thành công", location: "45 Trần Phú, Ba Đình, Hà Nội", note: "Khách hàng đã nhận hàng và ký xác nhận" },
      { date: "05/03/2026", time: "09:30", status: "Đang giao hàng", location: "Bưu cục Ba Đình, Hà Nội" },
      { date: "04/03/2026", time: "18:00", status: "Đến kho Hà Nội", location: "Kho phân loại Hà Nội" },
      { date: "03/03/2026", time: "12:00", status: "Đã lấy hàng", location: "Kho SmartFurni — Bình Dương" },
      { date: "01/03/2026", time: "14:30", status: "Đặt hàng thành công", location: "SmartFurni.vn" },
    ],
  },
};

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: string; step: number }> = {
  confirmed: { label: "Đã xác nhận", color: "#3B82F6", icon: "✓", step: 1 },
  processing: { label: "Đang xử lý", color: "#F59E0B", icon: "⚙", step: 2 },
  shipping: { label: "Đang vận chuyển", color: "#8B5CF6", icon: "🚚", step: 3 },
  delivered: { label: "Đã giao hàng", color: "#22C55E", icon: "✓✓", step: 4 },
  cancelled: { label: "Đã hủy", color: "#EF4444", icon: "✕", step: 0 },
};

function ProgressBar({ status, colors }: { status: OrderStatus; colors: SiteTheme["colors"] }) {
  const steps = [
    { label: "Xác nhận", step: 1 },
    { label: "Xử lý", step: 2 },
    { label: "Vận chuyển", step: 3 },
    { label: "Giao hàng", step: 4 },
  ];
  const currentStep = STATUS_CONFIG[status]?.step ?? 0;

  return (
    <div className="flex items-center gap-0 w-full">
      {steps.map((s, i) => {
        const done = currentStep >= s.step;
        const active = currentStep === s.step;
        return (
          <div key={s.step} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  backgroundColor: done ? colors.primary : `${colors.border}`,
                  color: done ? colors.background : `${colors.text}50`,
                  boxShadow: active ? `0 0 0 3px ${colors.primary}30` : "none",
                }}
              >
                {done ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  s.step
                )}
              </div>
              <span className="text-xs whitespace-nowrap" style={{ color: done ? colors.primary : `${colors.text}50` }}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-1 mb-4 rounded transition-all duration-300"
                style={{ backgroundColor: currentStep > s.step ? colors.primary : `${colors.border}` }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function WarrantyCard({ warranty, colors }: { warranty: WarrantyInfo; colors: SiteTheme["colors"] }) {
  const pct = Math.round((warranty.remainingDays / warranty.totalDays) * 100);
  const years = Math.floor(warranty.remainingDays / 365);
  const months = Math.floor((warranty.remainingDays % 365) / 30);

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ backgroundColor: `${colors.success}08`, borderColor: `${colors.success}30` }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${colors.success}20` }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold" style={{ color: colors.text }}>{warranty.type}</h3>
          <p className="text-xs" style={{ color: `${colors.text}60` }}>{warranty.startDate} — {warranty.endDate}</p>
        </div>
        <span
          className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${colors.success}20`, color: colors.success }}
        >
          Còn hiệu lực
        </span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: `${colors.text}60` }}>
          <span>Thời gian bảo hành còn lại</span>
          <span style={{ color: colors.success }}>{years} năm {months} tháng ({warranty.remainingDays} ngày)</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${colors.border}` }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: colors.success }}
          />
        </div>
      </div>

      {/* Coverage */}
      <div>
        <p className="text-xs font-semibold mb-2" style={{ color: `${colors.text}70` }}>Phạm vi bảo hành:</p>
        <div className="grid grid-cols-1 gap-1.5">
          {warranty.coverage.map((item) => (
            <div key={item} className="flex items-start gap-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={colors.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-xs" style={{ color: `${colors.text}70` }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <a
          href="tel:19001234"
          className="flex-1 py-2 rounded-xl text-xs font-semibold text-center transition-opacity hover:opacity-90"
          style={{ backgroundColor: `${colors.success}20`, color: colors.success }}
        >
          Yêu cầu bảo hành
        </a>
        <a
          href="mailto:warranty@smartfurni.vn"
          className="flex-1 py-2 rounded-xl text-xs font-semibold text-center border transition-opacity hover:opacity-80"
          style={{ borderColor: `${colors.success}40`, color: `${colors.text}70` }}
        >
          Gửi email
        </a>
      </div>
    </div>
  );
}

export default function WarrantyTrackerClient({ theme }: Props) {
  const { colors } = theme;
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<OrderResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"tracking" | "warranty">("tracking");

  const handleSearch = () => {
    if (!orderNumber.trim()) {
      setError("Vui lòng nhập mã đơn hàng.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);

    setTimeout(() => {
      const found = MOCK_ORDERS[orderNumber.trim().toUpperCase()];
      if (found) {
        setResult(found);
      } else {
        setError("Không tìm thấy đơn hàng. Vui lòng kiểm tra lại mã đơn hàng hoặc số điện thoại.");
      }
      setLoading(false);
    }, 800);
  };

  return (
    <>
      <Navbar theme={theme} />
      <main className="min-h-screen pt-16" style={{ backgroundColor: colors.background }}>
        {/* Hero */}
        <section
          className="py-14 px-4"
          style={{ background: `linear-gradient(160deg, ${colors.background} 0%, ${colors.surface} 100%)` }}
        >
          <ScrollReveal variant="fadeUp" delay={0}>
          <div className="max-w-2xl mx-auto text-center">
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
            >
              Tra cứu đơn hàng & bảo hành
            </span>
            <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: colors.text }}>
              Theo dõi đơn hàng & Bảo hành
            </h1>
            <p className="text-sm" style={{ color: `${colors.text}65` }}>
              Nhập mã đơn hàng để xem trạng thái giao hàng và thông tin bảo hành sản phẩm.
            </p>
          </div>
          </ScrollReveal>
        </section>

        {/* Search form */}
        <ScrollReveal variant="fadeUp" delay={100}>
        <section className="px-4 py-6">
          <div className="max-w-lg mx-auto">            <div
              className="rounded-2xl p-6 border shadow-sm"
              style={{ backgroundColor: colors.surface, borderColor: `${colors.border}60` }}
            >
              <h2 className="text-sm font-bold mb-4" style={{ color: colors.text }}>Tra cứu đơn hàng</h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: `${colors.text}70` }}>
                    Mã đơn hàng <span style={{ color: colors.error }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="VD: SF-2026-0042"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1.5 block" style={{ color: `${colors.text}70` }}>
                    Số điện thoại (tuỳ chọn)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0901234567"
                    className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all"
                    style={{
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.text,
                    }}
                  />
                </div>

                {error && (
                  <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: `${colors.error}15`, color: colors.error }}>
                    {error}
                  </p>
                )}

                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary ?? colors.primary})`, color: colors.background }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity="0.25" />
                        <path d="M21 12a9 9 0 01-9-9" strokeLinecap="round" />
                      </svg>
                      Đang tra cứu...
                    </span>
                  ) : "Tra cứu ngay"}
                </button>

                {/* Demo hint */}
                <p className="text-xs text-center" style={{ color: `${colors.text}40` }}>
                  Demo: thử mã <button onClick={() => setOrderNumber("SF-2026-0042")} className="underline" style={{ color: colors.primary }}>SF-2026-0042</button> hoặc <button onClick={() => setOrderNumber("SF-2026-0031")} className="underline" style={{ color: colors.primary }}>SF-2026-0031</button>
                </p>
              </div>
            </div>
          </div>
        </section>
        </ScrollReveal>

        {/* Result */}
        {result && (
          <section className="px-4 pb-12">
            <div className="max-w-2xl mx-auto space-y-5">
              {/* Order header */}
              <div
                className="rounded-2xl p-5 border"
                style={{ backgroundColor: colors.surface, borderColor: `${colors.border}60` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold" style={{ color: colors.text }}>#{result.orderNumber}</h2>
                    <p className="text-xs mt-0.5" style={{ color: `${colors.text}55` }}>Đặt ngày {result.orderDate} · {result.customerName}</p>
                  </div>
                  <span
                    className="text-xs font-semibold px-3 py-1.5 rounded-full"
                    style={{
                      backgroundColor: `${STATUS_CONFIG[result.status].color}20`,
                      color: STATUS_CONFIG[result.status].color,
                    }}
                  >
                    {STATUS_CONFIG[result.status].label}
                  </span>
                </div>

                {/* Product */}
                <div
                  className="flex items-center gap-3 p-3 rounded-xl mb-4"
                  style={{ backgroundColor: `${colors.primary}08` }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${colors.primary}20` }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="8" width="20" height="10" rx="2" />
                      <path d="M6 8V6a2 2 0 012-2h8a2 2 0 012 2v2" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: colors.text }}>{result.product}</p>
                    <p className="text-xs truncate" style={{ color: `${colors.text}60` }}>{result.variant}</p>
                  </div>
                  <div className="ml-auto text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: colors.primary }}>{result.total.toLocaleString("vi-VN")}đ</p>
                    <p className="text-xs" style={{ color: `${colors.text}50` }}>x{result.quantity}</p>
                  </div>
                </div>

                {/* Progress */}
                {result.status !== "cancelled" && (
                  <ProgressBar status={result.status} colors={colors} />
                )}

                {/* Estimated delivery */}
                {result.status === "shipping" && (
                  <div
                    className="mt-4 flex items-center gap-2 p-3 rounded-xl"
                    style={{ backgroundColor: `${colors.warning}12`, border: `1px solid ${colors.warning}30` }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.warning} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                    </svg>
                    <p className="text-xs" style={{ color: `${colors.text}70` }}>
                      Dự kiến giao: <strong style={{ color: colors.warning }}>{result.estimatedDelivery}</strong> · Mã vận đơn: <span style={{ color: colors.primary }}>{result.trackingCode}</span> ({result.shippingPartner})
                    </p>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex gap-2">
                {(["tracking", "warranty"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={
                      activeTab === tab
                        ? { backgroundColor: colors.primary, color: colors.background }
                        : { backgroundColor: colors.surface, color: `${colors.text}70`, border: `1px solid ${colors.border}` }
                    }
                  >
                    {tab === "tracking" ? "📦 Lịch sử vận chuyển" : "🛡️ Thông tin bảo hành"}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {activeTab === "tracking" && (
                <div
                  className="rounded-2xl p-5 border"
                  style={{ backgroundColor: colors.surface, borderColor: `${colors.border}60` }}
                >
                  <h3 className="text-sm font-bold mb-4" style={{ color: colors.text }}>Lịch sử vận chuyển</h3>
                  <div className="space-y-0">
                    {result.timeline.map((event, i) => (
                      <div key={i} className="flex gap-3">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                            style={{
                              backgroundColor: i === 0 ? colors.primary : `${colors.border}`,
                              boxShadow: i === 0 ? `0 0 0 3px ${colors.primary}25` : "none",
                            }}
                          />
                          {i < result.timeline.length - 1 && (
                            <div className="w-0.5 flex-1 my-1" style={{ backgroundColor: `${colors.border}` }} />
                          )}
                        </div>

                        {/* Content */}
                        <div className="pb-4 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="text-xs font-semibold"
                              style={{ color: i === 0 ? colors.primary : colors.text }}
                            >
                              {event.status}
                            </span>
                            <span className="text-xs" style={{ color: `${colors.text}45` }}>
                              {event.date} {event.time}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: `${colors.text}60` }}>{event.location}</p>
                          {event.note && (
                            <p className="text-xs mt-1 italic" style={{ color: `${colors.text}45` }}>{event.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "warranty" && (
                <WarrantyCard warranty={result.warranty} colors={colors} />
              )}

              {/* Support */}
              <div
                className="rounded-2xl p-4 border flex items-center gap-3"
                style={{ backgroundColor: `${colors.primary}06`, borderColor: `${colors.primary}20` }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                <p className="text-xs flex-1" style={{ color: `${colors.text}70` }}>
                  Cần hỗ trợ? Liên hệ <strong style={{ color: colors.primary }}>1900 1234</strong> hoặc chat trực tiếp với tư vấn viên.
                </p>
                <a
                  href="tel:19001234"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0"
                  style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                >
                  Gọi ngay
                </a>
              </div>
            </div>
          </section>
        )}

        {/* Info cards */}
        {!result && (
          <section className="px-4 pb-12">
            <StaggerReveal baseDelay={0} step={100} variant="fadeUp" className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  icon: "🛡️",
                  title: "Bảo hành 5–7 năm",
                  desc: "Bảo hành toàn diện cho tất cả linh kiện điện tử và cơ khí",
                },
                {
                  icon: "🚚",
                  title: "Giao hàng toàn quốc",
                  desc: "Miễn phí giao hàng và lắp đặt tận nhà trong 2 giờ",
                },
                {
                  icon: "↩️",
                  title: "Đổi trả 30 ngày",
                  desc: "Không hài lòng? Trả lại trong 30 ngày, hoàn tiền 100%",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl p-5 border text-center"
                  style={{ backgroundColor: colors.surface, borderColor: `${colors.border}50` }}
                >
                  <div className="text-2xl mb-2">{card.icon}</div>
                  <h3 className="text-sm font-bold mb-1" style={{ color: colors.text }}>{card.title}</h3>
                  <p className="text-xs" style={{ color: `${colors.text}60` }}>{card.desc}</p>
                </div>
              ))}
            </StaggerReveal>
          </section>
        )}
      </main>
      <Footer theme={theme} />
    </>
  );
}
