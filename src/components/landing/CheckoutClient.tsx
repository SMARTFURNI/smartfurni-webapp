"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SiteTheme } from "@/lib/theme-types";
import { useCart } from "@/lib/cart-context";
import Footer from "@/components/landing/Footer";

interface Props {
  theme: SiteTheme;
}

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ đ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu đ`;
  return price.toLocaleString("vi-VN") + " đ";
}

const PAYMENT_METHODS = [
  {
    id: "cod",
    label: "Thanh toán khi nhận hàng (COD)",
    desc: "Trả tiền mặt khi nhận hàng",
    icon: "💵",
  },
  {
    id: "bank_transfer",
    label: "Chuyển khoản ngân hàng",
    desc: "Chuyển khoản trước khi giao hàng",
    icon: "🏦",
  },
  {
    id: "momo",
    label: "Ví MoMo",
    desc: "Thanh toán qua ví điện tử MoMo",
    icon: "📱",
  },
  {
    id: "vnpay",
    label: "VNPay",
    desc: "Thanh toán qua cổng VNPay",
    icon: "💳",
  },
];

const CITIES = [
  "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
  "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông",
  "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang",
  "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình",
  "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu",
  "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định",
  "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên",
  "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị",
  "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên",
  "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang",
  "Vĩnh Long", "Vĩnh Phúc", "Yên Bái",
];

const SHIPPING_FEE = 0;

export default function CheckoutClient({ theme }: Props) {
  const { colors, layout, pageCheckout } = theme;
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();

  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingAddress: "",
    city: "Hà Nội",
    notes: "",
    paymentMethod: "cod",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "payment">("form");

  const total = subtotal + SHIPPING_FEE;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.customerName.trim()) errs.customerName = "Vui lòng nhập họ tên";
    if (!form.customerPhone.trim()) errs.customerPhone = "Vui lòng nhập số điện thoại";
    else if (!/^(0|\+84)[0-9]{9}$/.test(form.customerPhone.replace(/\s/g, ""))) {
      errs.customerPhone = "Số điện thoại không hợp lệ";
    }
    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail)) {
      errs.customerEmail = "Email không hợp lệ";
    }
    if (!form.shippingAddress.trim()) errs.shippingAddress = "Vui lòng nhập địa chỉ giao hàng";
    if (!form.city) errs.city = "Vui lòng chọn tỉnh/thành phố";
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.customerName,
          customerEmail: form.customerEmail,
          customerPhone: form.customerPhone,
          shippingAddress: form.shippingAddress,
          city: form.city,
          notes: form.notes,
          paymentMethod: form.paymentMethod,
          shippingFee: SHIPPING_FEE,
          discount: 0,
          items: items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            variant: item.variantName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
        }),
      });

      const data = await res.json();
      if (data.success && data.order) {
        clearCart();
        router.push(`/checkout/success?order=${data.order.orderNumber}&name=${encodeURIComponent(form.customerName)}&total=${total}&method=${form.paymentMethod}`);
      } else {
        setErrors({ submit: data.error || "Có lỗi xảy ra, vui lòng thử lại" });
      }
    } catch {
      setErrors({ submit: "Không thể kết nối máy chủ, vui lòng thử lại" });
    } finally {
      setLoading(false);
    }
  };

  // Redirect if cart empty
  if (items.length === 0) {
    return (
      <div style={{ maxWidth: layout.maxWidth, paddingTop: 100 }} className="mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
        <h1 className="text-2xl font-light text-[#F5EDD6] mb-4">Giỏ hàng <span className="text-gold-gradient">trống</span></h1>
        <p className="text-sm text-[#F5EDD6]/50 mb-6 leading-relaxed">Vui lòng thêm sản phẩm vào giỏ hàng trước khi đặt hàng.</p>
        <Link
          href="/products"
          style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold"
        >
          Khám phá sản phẩm →
        </Link>
      </div>
    );
  }

  const inputStyle = (field: string) => ({
    backgroundColor: colors.surface,
    borderColor: errors[field] ? colors.error : colors.border,
    color: colors.text,
  });

  const labelStyle = { color: `${colors.text}70` };

  return (
    <>
    <div style={{ maxWidth: layout.maxWidth, paddingTop: 80 }} className="mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Checkout Progress Steps */}
      <div className="mb-8">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-6">
          {[
            { step: 1, label: "Giỏ hàng", href: "/cart", done: true },
            { step: 2, label: "Đặt hàng", href: null, done: false, active: true },
            { step: 3, label: "Xác nhận", href: null, done: false },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center">
              {/* Step node */}
              {s.href ? (
                <Link href={s.href} className="flex flex-col items-center gap-1.5 group">
                  <div
                    style={{
                      backgroundColor: s.done ? colors.primary : "transparent",
                      borderColor: s.done ? colors.primary : `${colors.primary}30`,
                      color: s.done ? colors.background : `${colors.text}30`,
                    }}
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all"
                  >
                    {s.done ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : s.step}
                  </div>
                  <span style={{ color: s.done ? colors.primary : `${colors.text}30` }} className="text-xs font-medium hidden sm:block">{s.label}</span>
                </Link>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    style={{
                      backgroundColor: s.active ? colors.primary : "transparent",
                      borderColor: s.active ? colors.primary : `${colors.primary}20`,
                      color: s.active ? colors.background : `${colors.text}20`,
                    }}
                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
                  >
                    {s.step}
                  </div>
                  <span style={{ color: s.active ? colors.primary : `${colors.text}20` }} className="text-xs font-medium hidden sm:block">{s.label}</span>
                </div>
              )}
              {/* Connector line */}
              {i < 2 && (
                <div
                  style={{ backgroundColor: i === 0 ? colors.primary : `${colors.primary}20` }}
                  className="w-16 sm:w-24 h-0.5 mx-2"
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="w-6 h-px bg-[#C9A84C]" />
          <h1 className="text-2xl font-light text-[#F5EDD6]">Thông tin <span className="text-gold-gradient">đặt hàng</span></h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Customer info */}
          <div
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="rounded-2xl border p-4 sm:p-6"
          >
            <h2 className="font-semibold text-[#F5EDD6] text-base mb-4 sm:mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-[#C9A84C]/20 text-[#C9A84C]">1</span>
              Thông tin khách hàng
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label style={labelStyle} className="block text-xs font-medium mb-1.5">
                  Họ và tên <span style={{ color: colors.error }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={form.customerName}
                  onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                  style={inputStyle("customerName")}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-1"
                />
                {errors.customerName && (
                  <p style={{ color: colors.error }} className="text-xs mt-1">{errors.customerName}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label style={labelStyle} className="block text-xs font-medium mb-1.5">
                  Số điện thoại <span style={{ color: colors.error }}>*</span>
                </label>
                <input
                  type="tel"
                  placeholder="0912 345 678"
                  value={form.customerPhone}
                  onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))}
                  style={inputStyle("customerPhone")}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-1"
                />
                {errors.customerPhone && (
                  <p style={{ color: colors.error }} className="text-xs mt-1">{errors.customerPhone}</p>
                )}
              </div>

              {/* Email */}
              <div className="md:col-span-2">
                <label style={labelStyle} className="block text-xs font-medium mb-1.5">
                  Email (tùy chọn)
                </label>
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={form.customerEmail}
                  onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
                  style={inputStyle("customerEmail")}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-1"
                />
                {errors.customerEmail && (
                  <p style={{ color: colors.error }} className="text-xs mt-1">{errors.customerEmail}</p>
                )}
              </div>
            </div>
          </div>

          {/* Shipping address */}
          <div
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="rounded-2xl border p-4 sm:p-6"
          >
            <h2 className="font-semibold text-[#F5EDD6] text-base mb-4 sm:mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-[#C9A84C]/20 text-[#C9A84C]">2</span>
              Địa chỉ giao hàng
            </h2>

            <div className="flex flex-col gap-4">
              {/* City */}
              <div>
                <label style={labelStyle} className="block text-xs font-medium mb-1.5">
                  Tỉnh / Thành phố <span style={{ color: colors.error }}>*</span>
                </label>
                <select
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  style={inputStyle("city")}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-1 cursor-pointer"
                >
                  {CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {errors.city && (
                  <p style={{ color: colors.error }} className="text-xs mt-1">{errors.city}</p>
                )}
              </div>

              {/* Address */}
              <div>
                <label style={labelStyle} className="block text-xs font-medium mb-1.5">
                  Địa chỉ cụ thể <span style={{ color: colors.error }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện"
                  value={form.shippingAddress}
                  onChange={(e) => setForm((f) => ({ ...f, shippingAddress: e.target.value }))}
                  style={inputStyle("shippingAddress")}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-1"
                />
                {errors.shippingAddress && (
                  <p style={{ color: colors.error }} className="text-xs mt-1">{errors.shippingAddress}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle} className="block text-xs font-medium mb-1.5">
                  Ghi chú đơn hàng (tùy chọn)
                </label>
                <textarea
                  placeholder="Ghi chú về đơn hàng, ví dụ: thời gian hay chỉ dẫn địa điểm giao hàng chi tiết hơn."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-1 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Payment method */}
          <div
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="rounded-2xl border p-4 sm:p-6"
          >
            <h2 className="font-semibold text-[#F5EDD6] text-base mb-4 sm:mb-5 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-[#C9A84C]/20 text-[#C9A84C]">3</span>
              Phương thức thanh toán
            </h2>

            <div className="flex flex-col gap-3">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = form.paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setForm((f) => ({ ...f, paymentMethod: method.id }))}
                    style={
                      isSelected
                        ? {
                            borderColor: colors.primary,
                            backgroundColor: `${colors.primary}08`,
                          }
                        : {
                            borderColor: colors.border,
                            backgroundColor: "transparent",
                          }
                    }
                    className="flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150"
                  >
                    {/* Radio */}
                    <div
                      style={{
                        borderColor: isSelected ? colors.primary : `${colors.text}30`,
                        backgroundColor: "transparent",
                      }}
                      className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    >
                      {isSelected && (
                        <div
                          style={{ backgroundColor: colors.primary }}
                          className="w-2.5 h-2.5 rounded-full"
                        />
                      )}
                    </div>

                    {/* Icon */}
                    <span className="text-xl">{method.icon}</span>

                    {/* Label */}
                    <div className="flex-1">
                      <p style={{ color: colors.text }} className="text-sm font-medium">{method.label}</p>
                      <p style={{ color: `${colors.text}50` }} className="text-xs mt-0.5">{method.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bank transfer info */}
            {form.paymentMethod === "bank_transfer" && (
              <div
                style={{ backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` }}
                className="mt-4 p-4 rounded-xl border"
              >
                <p style={{ color: colors.text }} className="text-sm font-semibold mb-2">Thông tin chuyển khoản:</p>
                <div className="flex flex-col gap-1">
                  {[
                    { label: "Ngân hàng", value: pageCheckout?.bankName ?? "Vietcombank" },
                    { label: "Số tài khoản", value: pageCheckout?.bankAccount ?? "1234567890" },
                    { label: "Chủ tài khoản", value: pageCheckout?.bankHolder ?? "CONG TY SMARTFURNI" },
                    { label: "Nội dung CK", value: "SF [Số điện thoại] [Tên]" },
                  ].map((row) => (
                    <div key={row.label} className="flex gap-2">
                      <span style={{ color: `${colors.text}50` }} className="text-xs w-32 flex-shrink-0">{row.label}:</span>
                      <span style={{ color: colors.text }} className="text-xs font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MoMo info */}
            {form.paymentMethod === "momo" && (
              <div
                style={{ backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` }}
                className="mt-4 p-4 rounded-xl border"
              >
                <p style={{ color: colors.text }} className="text-sm font-semibold mb-1">Số MoMo:</p>
                <p style={{ color: colors.primary }} className="text-base font-bold">{pageCheckout?.momoPhone ?? "0901234567"}</p>
                <p style={{ color: `${colors.text}50` }} className="text-xs mt-1">{pageCheckout?.bankHolder ?? "SmartFurni Vietnam"}</p>
              </div>
            )}
          </div>

          {/* Submit error */}
          {errors.submit && (
            <div
              style={{ backgroundColor: `${colors.error}10`, borderColor: `${colors.error}30`, color: colors.error }}
              className="rounded-xl border p-4 text-sm"
            >
              ⚠️ {errors.submit}
            </div>
          )}

          {/* Submit button (mobile) */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: loading
                ? colors.border
                : `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              color: loading ? `${colors.text}40` : colors.background,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            className="lg:hidden w-full py-4 rounded-xl text-sm font-semibold transition-all duration-200"
          >
            {loading ? "Đang xử lý..." : `Đặt hàng — ${formatPrice(total)}`}
          </button>
        </div>

        {/* Right: Order summary */}
        <div className="lg:col-span-1">
          <div
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="rounded-2xl border p-6 sticky top-24"
          >
            <div className="flex items-center gap-2 mb-5">
              <span className="w-5 h-px bg-[#C9A84C]" />
              <h2 className="font-semibold text-[#F5EDD6] text-base">
                Đơn hàng của bạn
              </h2>
            </div>

            {/* Items */}
            <div className="flex flex-col gap-3 mb-5">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId}`} className="flex gap-3">
                  {/* Image */}
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})`,
                      borderColor: colors.border,
                      width: 56,
                      height: 56,
                      flexShrink: 0,
                    }}
                    className="rounded-lg border overflow-hidden flex items-center justify-center relative"
                  >
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.productName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 56 40" width="44" height="32" fill="none">
                        <rect x="4" y="20" width="48" height="16" rx="3"
                          fill={`${colors.primary}12`} stroke={`${colors.primary}35`} strokeWidth="1" />
                        <rect x="6" y="14" width="44" height="18" rx="4"
                          fill={`${colors.primary}18`} stroke={`${colors.primary}40`} strokeWidth="1" />
                        <rect x="2" y="8" width="6" height="24" rx="2"
                          fill={`${colors.primary}20`} stroke={`${colors.primary}40`} strokeWidth="1" />
                        <rect x="2" y="30" width="52" height="2" rx="1"
                          fill={colors.primary} opacity="0.5" />
                      </svg>
                    )}
                    {/* Quantity badge */}
                    <span
                      style={{ backgroundColor: colors.primary, color: colors.background }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                    >
                      {item.quantity}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#F5EDD6] truncate">{item.productName}</p>
                    <p className="text-xs text-[#F5EDD6]/40">{item.variantName}</p>
                    <p style={{ color: colors.primary }} className="text-xs font-semibold mt-0.5">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderColor: colors.border }} className="border-t mb-4" />

            {/* Subtotal */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#F5EDD6]/50">Tạm tính</span>
              <span className="text-sm text-[#F5EDD6]">{formatPrice(subtotal)}</span>
            </div>

            {/* Shipping */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-[#F5EDD6]/50">Phí vận chuyển</span>
              <span style={{ color: colors.success }} className="text-sm font-medium">Miễn phí</span>
            </div>

            {/* Divider */}
            <div style={{ borderColor: colors.border }} className="border-t mb-4" />

            {/* Total */}
            <div className="flex justify-between items-center mb-6">
              <span className="font-semibold text-[#F5EDD6]">Tổng cộng</span>
              <span className="text-xl font-semibold text-gold-gradient">{formatPrice(total)}</span>
            </div>

            {/* Submit button (desktop) */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                background: loading
                  ? colors.border
                  : `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                color: loading ? `${colors.text}40` : colors.background,
                cursor: loading ? "not-allowed" : "pointer",
              }}
              className="hidden lg:block w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200"
            >
              {loading ? "Đang xử lý..." : "Đặt hàng ngay →"}
            </button>

            {/* Trust badges */}
            <div
              style={{ backgroundColor: `${theme.colors.background}80`, borderColor: `${theme.colors.border}50` }}
              className="mt-4 rounded-xl border p-4 space-y-3"
            >
              <p className="text-xs font-medium uppercase tracking-wider text-[#C9A84C]/70">Cam kết của SmartFurni</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🔒</span>
                  <span className="text-xs text-[#F5EDD6]/50">Thanh toán bảo mật SSL 256-bit</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🚚</span>
                  <span className="text-xs text-[#F5EDD6]/50">Giao hàng miễn phí toàn quốc</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📅</span>
                  <Link href="/returns" className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C] transition-colors underline-offset-2 hover:underline">
                    30 ngày đổi trả không rủi ro
                  </Link>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">🛡️</span>
                  <Link href="/warranty" className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C] transition-colors underline-offset-2 hover:underline">
                    Bảo hành 5 năm chính hãng
                  </Link>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-base">📞</span>
                  <a href="tel:19001234" className="text-xs text-[#F5EDD6]/50 hover:text-[#C9A84C] transition-colors">Hỗ trợ 24/7: 1900 1234</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer theme={theme} variant="minimal" />
    </>
  );
}
