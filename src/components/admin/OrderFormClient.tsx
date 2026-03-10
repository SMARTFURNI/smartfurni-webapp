"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Order, OrderStatus, PaymentMethod, PaymentStatus } from "@/lib/order-store";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: OrderStatus; label: string; color: string }[] = [
  { value: "pending", label: "Chờ xác nhận", color: "text-yellow-400" },
  { value: "confirmed", label: "Đã xác nhận", color: "text-blue-400" },
  { value: "processing", label: "Đang xử lý", color: "text-purple-400" },
  { value: "shipping", label: "Đang giao", color: "text-cyan-400" },
  { value: "delivered", label: "Đã giao", color: "text-green-400" },
  { value: "cancelled", label: "Đã hủy", color: "text-red-400" },
  { value: "refunded", label: "Hoàn tiền", color: "text-gray-400" },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cod", label: "COD (Thanh toán khi nhận)" },
  { value: "bank_transfer", label: "Chuyển khoản ngân hàng" },
  { value: "momo", label: "MoMo" },
  { value: "vnpay", label: "VNPay" },
  { value: "credit_card", label: "Thẻ tín dụng" },
];

const PAYMENT_STATUS_OPTIONS: { value: PaymentStatus; label: string }[] = [
  { value: "unpaid", label: "Chưa thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "refunded", label: "Đã hoàn tiền" },
];

const CITIES = [
  "TP. Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "Biên Hòa", "Nha Trang", "Vũng Tàu", "Huế", "Đà Lạt",
  "Buôn Ma Thuột", "Quy Nhơn", "Long Xuyên", "Mỹ Tho", "Rạch Giá",
];

const SHIPPING_PARTNERS = ["GHN", "GHTK", "J&T Express", "Viettel Post", "VNPost", "DHL", "FedEx"];

const SAMPLE_PRODUCTS = [
  { productId: "p1", productName: "SmartFurni Basic", variant: "Trắng", sku: "SFB-WHT", unitPrice: 23000000 },
  { productId: "p2", productName: "SmartFurni Pro", variant: "Trắng Ngà", sku: "SFP-IVR", unitPrice: 45000000 },
  { productId: "p3", productName: "SmartFurni Elite", variant: "Đen Cao Cấp", sku: "SFE-BLK", unitPrice: 75000000 },
  { productId: "p4", productName: "SmartFurni Pro 2026", variant: "Bạc", sku: "SFP26-SLV", unitPrice: 52000000 },
  { productId: "p5", productName: "Remote Controller", variant: "Chuẩn", sku: "RC-STD", unitPrice: 1500000 },
  { productId: "p6", productName: "Nệm Memory Foam", variant: "1.6m", sku: "MF-160", unitPrice: 8500000 },
  { productId: "p8", productName: "Bộ Phụ Kiện", variant: "Full Set", sku: "ACC-FULL", unitPrice: 3200000 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatVND(n: number): string {
  return n.toLocaleString("vi-VN");
}

function parseVND(s: string): number {
  return parseInt(s.replace(/\D/g, ""), 10) || 0;
}

interface OrderItemForm {
  productId: string;
  productName: string;
  variant: string;
  sku: string;
  quantity: number;
  unitPrice: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrderFormClient({ order }: { order?: Order }) {
  const router = useRouter();
  const isEdit = !!order;

  // Customer info
  const [customerName, setCustomerName] = useState(order?.customerName || "");
  const [customerEmail, setCustomerEmail] = useState(order?.customerEmail || "");
  const [customerPhone, setCustomerPhone] = useState(order?.customerPhone || "");
  const [shippingAddress, setShippingAddress] = useState(order?.shippingAddress || "");
  const [city, setCity] = useState(order?.city || "TP. Hồ Chí Minh");

  // Items
  const [items, setItems] = useState<OrderItemForm[]>(
    order?.items.map((i) => ({
      productId: i.productId,
      productName: i.productName,
      variant: i.variant,
      sku: i.sku,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    })) || [{ productId: "", productName: "", variant: "", sku: "", quantity: 1, unitPrice: 0 }]
  );

  // Order details
  const [status, setStatus] = useState<OrderStatus>(order?.status || "pending");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(order?.paymentMethod || "cod");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order?.paymentStatus || "unpaid");
  const [shippingFeeStr, setShippingFeeStr] = useState(order ? formatVND(order.shippingFee) : "0");
  const [discountStr, setDiscountStr] = useState(order ? formatVND(order.discount) : "0");
  const [notes, setNotes] = useState(order?.notes || "");
  const [trackingCode, setTrackingCode] = useState(order?.trackingCode || "");
  const [shippingPartner, setShippingPartner] = useState(order?.shippingPartner || "");

  // UI state
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");

  // Computed
  const shippingFee = parseVND(shippingFeeStr);
  const discount = parseVND(discountStr);
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total = subtotal + shippingFee - discount;

  // Auto-set paymentStatus to paid when status is delivered
  useEffect(() => {
    if (status === "delivered" && paymentStatus === "unpaid") {
      setPaymentStatus("paid");
    }
  }, [status, paymentStatus]);

  function addItem() {
    setItems((prev) => [...prev, { productId: "", productName: "", variant: "", sku: "", quantity: 1, unitPrice: 0 }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof OrderItemForm, value: string | number) {
    setItems((prev) => {
      const next = [...prev];
      if (field === "productId" && typeof value === "string") {
        const found = SAMPLE_PRODUCTS.find((p) => p.productId === value);
        if (found) {
          next[idx] = { ...next[idx], ...found };
        } else {
          next[idx] = { ...next[idx], productId: value };
        }
      } else if (field === "unitPrice" && typeof value === "string") {
        next[idx] = { ...next[idx], unitPrice: parseVND(value) };
      } else {
        (next[idx] as unknown as Record<string, unknown>)[field] = value;
      }
      return next;
    });
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!customerName.trim()) errs.customerName = "Bắt buộc";
    if (!customerPhone.trim()) errs.customerPhone = "Bắt buộc";
    if (!shippingAddress.trim()) errs.shippingAddress = "Bắt buộc";
    if (items.length === 0) errs.items = "Cần ít nhất 1 sản phẩm";
    items.forEach((item, i) => {
      if (!item.productName.trim()) errs[`item_name_${i}`] = "Tên sản phẩm bắt buộc";
      if (item.quantity < 1) errs[`item_qty_${i}`] = "Số lượng ≥ 1";
      if (item.unitPrice <= 0) errs[`item_price_${i}`] = "Giá > 0";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    setSuccessMsg("");
    try {
      const payload = {
        customerName, customerEmail, customerPhone,
        shippingAddress, city,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          variant: i.variant,
          sku: i.sku,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
        shippingFee, discount, status, paymentMethod, paymentStatus,
        notes: notes || undefined,
        trackingCode: trackingCode || undefined,
        shippingPartner: shippingPartner || undefined,
      };

      const url = isEdit ? `/api/admin/orders/${order!.id}` : "/api/admin/orders";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        setErrors({ submit: err.error || "Có lỗi xảy ra" });
        return;
      }

      setSuccessMsg(isEdit ? "Đã lưu thay đổi!" : "Đã tạo đơn hàng mới!");
      setTimeout(() => router.push("/admin/orders"), 1200);
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-white mb-3 flex items-center gap-1 transition-colors"
          >
            ← Quay lại
          </button>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? `Chỉnh sửa: ${order!.orderNumber}` : "Tạo đơn hàng mới"}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isEdit ? "Cập nhật thông tin đơn hàng" : "Điền đầy đủ thông tin để tạo đơn hàng mới"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/orders")}
            className="text-sm text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 text-sm font-semibold bg-[#C9A84C] text-black px-6 py-2 rounded-xl hover:bg-[#E2C97E] transition-colors disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : isEdit ? "💾 Lưu thay đổi" : "✨ Tạo đơn hàng"}
          </button>
        </div>
      </div>

      {/* Success / Error Banner */}
      {successMsg && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
          ✓ {successMsg}
        </div>
      )}
      {errors.submit && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          ✕ {errors.submit}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Main form */}
        <div className="lg:col-span-2 space-y-6">

          {/* Customer Info */}
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-wider mb-5">
              👤 Thông tin khách hàng
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  Họ tên khách hàng <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className={`w-full bg-[#0D0B00] border ${errors.customerName ? "border-red-500/50" : "border-[#C9A84C]/15"} text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40`}
                />
                {errors.customerName && <p className="text-red-400 text-xs mt-1">{errors.customerName}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">
                  Số điện thoại <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="VD: 0901234567"
                  className={`w-full bg-[#0D0B00] border ${errors.customerPhone ? "border-red-500/50" : "border-[#C9A84C]/15"} text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40`}
                />
                {errors.customerPhone && <p className="text-red-400 text-xs mt-1">{errors.customerPhone}</p>}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="VD: khachhang@email.com"
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tỉnh / Thành phố</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40"
                >
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1.5">
                  Địa chỉ giao hàng <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="VD: 123 Nguyễn Huệ, Quận 1"
                  className={`w-full bg-[#0D0B00] border ${errors.shippingAddress ? "border-red-500/50" : "border-[#C9A84C]/15"} text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40`}
                />
                {errors.shippingAddress && <p className="text-red-400 text-xs mt-1">{errors.shippingAddress}</p>}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-wider">
                🛒 Sản phẩm đặt hàng
              </h2>
              <button
                onClick={addItem}
                className="text-xs text-[#C9A84C] hover:text-[#E2C97E] border border-[#C9A84C]/20 px-3 py-1.5 rounded-lg transition-colors"
              >
                + Thêm sản phẩm
              </button>
            </div>

            {errors.items && <p className="text-red-400 text-xs mb-3">{errors.items}</p>}

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="bg-[#0D0B00] border border-[#C9A84C]/10 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-600 font-medium">Sản phẩm #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        ✕ Xóa
                      </button>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {/* Product selector */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Chọn sản phẩm có sẵn</label>
                      <select
                        value={item.productId}
                        onChange={(e) => updateItem(idx, "productId", e.target.value)}
                        className="w-full bg-[#1A1500] border border-[#C9A84C]/10 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C9A84C]/30"
                      >
                        <option value="">-- Chọn từ danh sách hoặc nhập thủ công --</option>
                        {SAMPLE_PRODUCTS.map((p) => (
                          <option key={p.productId} value={p.productId}>
                            {p.productName} — {p.variant} ({formatVND(p.unitPrice)}đ)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Tên sản phẩm <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => updateItem(idx, "productName", e.target.value)}
                        placeholder="Tên sản phẩm"
                        className={`w-full bg-[#1A1500] border ${errors[`item_name_${idx}`] ? "border-red-500/50" : "border-[#C9A84C]/10"} text-white rounded-lg px-3 py-2 text-sm focus:outline-none`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Biến thể / Màu sắc</label>
                      <input
                        type="text"
                        value={item.variant}
                        onChange={(e) => updateItem(idx, "variant", e.target.value)}
                        placeholder="VD: Trắng Ngà"
                        className="w-full bg-[#1A1500] border border-[#C9A84C]/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">SKU</label>
                      <input
                        type="text"
                        value={item.sku}
                        onChange={(e) => updateItem(idx, "sku", e.target.value)}
                        placeholder="VD: SFP-IVR"
                        className="w-full bg-[#1A1500] border border-[#C9A84C]/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Số lượng <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                        className={`w-full bg-[#1A1500] border ${errors[`item_qty_${idx}`] ? "border-red-500/50" : "border-[#C9A84C]/10"} text-white rounded-lg px-3 py-2 text-sm focus:outline-none`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Đơn giá (VNĐ) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.unitPrice > 0 ? formatVND(item.unitPrice) : ""}
                        onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                        placeholder="VD: 45,000,000"
                        className={`w-full bg-[#1A1500] border ${errors[`item_price_${idx}`] ? "border-red-500/50" : "border-[#C9A84C]/10"} text-white rounded-lg px-3 py-2 text-sm focus:outline-none`}
                      />
                    </div>
                  </div>
                  {/* Item subtotal */}
                  <div className="mt-3 flex justify-end">
                    <span className="text-xs text-gray-600">Thành tiền: </span>
                    <span className="text-sm font-semibold text-[#C9A84C] ml-2">
                      {formatVND(item.unitPrice * item.quantity)}đ
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping & Notes */}
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
            <h2 className="text-sm font-semibold text-[#C9A84C] uppercase tracking-wider mb-5">
              🚚 Vận chuyển & Ghi chú
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Đơn vị vận chuyển</label>
                <select
                  value={shippingPartner}
                  onChange={(e) => setShippingPartner(e.target.value)}
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40"
                >
                  <option value="">-- Chưa chọn --</option>
                  {SHIPPING_PARTNERS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Mã vận đơn</label>
                <input
                  type="text"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="VD: GHN123456789"
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-gray-500 mb-1.5">Ghi chú đơn hàng</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Ghi chú nội bộ hoặc yêu cầu đặc biệt từ khách..."
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#C9A84C]/40 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-5">

          {/* Order Status */}
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wider mb-4">
              📋 Trạng thái đơn hàng
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Trạng thái</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Phương thức thanh toán</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                >
                  {PAYMENT_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Trạng thái thanh toán</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                >
                  {PAYMENT_STATUS_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wider mb-4">
              💰 Chi tiết thanh toán
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Phí vận chuyển (VNĐ)</label>
                <input
                  type="text"
                  value={shippingFeeStr}
                  onChange={(e) => setShippingFeeStr(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Giảm giá / Coupon (VNĐ)</label>
                <input
                  type="text"
                  value={discountStr}
                  onChange={(e) => setDiscountStr(e.target.value)}
                  placeholder="0"
                  className="w-full bg-[#0D0B00] border border-[#C9A84C]/15 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-[#C9A84C]/10 space-y-2 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Tạm tính ({items.length} sản phẩm)</span>
                <span className="text-gray-300">{formatVND(subtotal)}đ</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Phí vận chuyển</span>
                <span className="text-gray-300">+{formatVND(shippingFee)}đ</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Giảm giá</span>
                  <span>−{formatVND(discount)}đ</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-[#C9A84C]/10">
                <span className="text-white">Tổng cộng</span>
                <span className="text-[#C9A84C]">{formatVND(total)}đ</span>
              </div>
            </div>
          </div>

          {/* Quick summary */}
          <div className="bg-[#0D0B00] border border-[#C9A84C]/10 rounded-2xl p-5 text-xs space-y-2">
            <p className="text-gray-600 font-medium uppercase tracking-wider mb-3">Tóm tắt</p>
            <div className="flex justify-between">
              <span className="text-gray-600">Khách hàng:</span>
              <span className="text-gray-300">{customerName || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Thành phố:</span>
              <span className="text-gray-300">{city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Số sản phẩm:</span>
              <span className="text-gray-300">{items.length} loại</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Trạng thái:</span>
              <span className={STATUS_OPTIONS.find((s) => s.value === status)?.color || "text-gray-300"}>
                {STATUS_OPTIONS.find((s) => s.value === status)?.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Thanh toán:</span>
              <span className={paymentStatus === "paid" ? "text-green-400" : paymentStatus === "refunded" ? "text-gray-400" : "text-yellow-400"}>
                {PAYMENT_STATUS_OPTIONS.find((p) => p.value === paymentStatus)?.label}
              </span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t border-[#C9A84C]/10">
              <span className="text-gray-500">Tổng tiền:</span>
              <span className="text-[#C9A84C]">{formatVND(total)}đ</span>
            </div>
          </div>

          {/* Submit buttons */}
          <div className="space-y-2">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full text-sm font-semibold bg-[#C9A84C] text-black py-3 rounded-xl hover:bg-[#E2C97E] transition-colors disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : isEdit ? "💾 Lưu thay đổi" : "✨ Tạo đơn hàng"}
            </button>
            <button
              onClick={() => router.push("/admin/orders")}
              className="w-full text-sm text-gray-500 hover:text-white py-2.5 rounded-xl border border-gray-700 transition-colors"
            >
              Hủy bỏ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
