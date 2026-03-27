"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SiteTheme } from "@/lib/theme-types";
import { useCart } from "@/lib/cart-context";
import Footer from "@/components/landing/Footer";
import { getAllProducts } from "@/lib/product-store";

interface Props {
  theme: SiteTheme;
}

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ đ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu đ`;
  return price.toLocaleString("vi-VN") + " đ";
}

const SHIPPING_FEE = 0; // Free shipping

export default function CartClient({ theme }: Props) {
  const { colors, layout } = theme;
  const router = useRouter();
  const { items, totalItems, subtotal, removeItem, updateQuantity, clearCart } = useCart();

  const total = subtotal + SHIPPING_FEE;

  // Upsell: suggest products not already in cart
  const cartProductIds = new Set(items.map((i) => i.productId));
  const upsellProducts = getAllProducts()
    .filter((p) => p.status === "active" && !cartProductIds.has(p.id))
    .slice(0, 3);

  if (items.length === 0) {
    return (
      <div
        style={{ maxWidth: layout.maxWidth, paddingTop: 120 }}
        className="mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center"
      >
        {/* Empty cart icon */}
        <div
          style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` }}
          className="w-24 h-24 rounded-full border-2 flex items-center justify-center mx-auto mb-6"
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={`${colors.primary}60`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
          </svg>
        </div>
        <h1 className="text-2xl font-light text-[#F5EDD6] mb-3">
          Giỏ hàng <span className="text-gold-gradient">trống</span>
        </h1>
        <p className="text-sm text-[#F5EDD6]/50 mb-8 leading-relaxed">
          Bạn chưa có sản phẩm nào trong giỏ hàng. Hãy khám phá các sản phẩm của chúng tôi!
        </p>
        <Link
          href="/products"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            color: colors.background,
          }}
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold"
        >
          Khám phá sản phẩm →
        </Link>
      </div>
    );
  }

  return (
    <>
    <div style={{ maxWidth: layout.maxWidth, paddingTop: 80 }} className="mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-6 h-px bg-[#C9A84C]" />
            <h1 className="text-2xl font-light text-[#F5EDD6]">
              Giỏ <span className="text-gold-gradient">hàng</span>
            </h1>
          </div>
          <p className="text-sm text-[#F5EDD6]/40 mt-1">
            {totalItems} sản phẩm
          </p>
        </div>
        <button
          onClick={clearCart}
          style={{ color: `${colors.text}40`, borderColor: colors.border }}
          className="text-xs px-3 py-1.5 rounded-lg border hover:opacity-70 transition-opacity"
        >
          Xóa tất cả
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {items.map((item) => {
            const discount = item.originalPrice > item.price
              ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
              : 0;
            return (
              <div
                key={`${item.productId}-${item.variantId}`}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                className="rounded-2xl border p-4 sm:p-5 flex gap-3 sm:gap-4"
              >
                {/* Product image */}
                <Link href={`/products/${item.slug}`}>
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})`,
                      borderColor: colors.border,
                      width: 100,
                      height: 100,
                      flexShrink: 0,
                    }}
                    className="rounded-xl border overflow-hidden flex items-center justify-center"
                  >
                    {item.coverImage ? (
                      <img src={item.coverImage} alt={item.productName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 100 70" width="80" height="56" fill="none">
                        <rect x="8" y="35" width="84" height="28" rx="4"
                          fill={`${colors.primary}12`} stroke={`${colors.primary}35`} strokeWidth="1.5" />
                        <rect x="12" y="28" width="76" height="30" rx="5"
                          fill={`${colors.primary}18`} stroke={`${colors.primary}40`} strokeWidth="1.5" />
                        <rect x="16" y="22" width="24" height="14" rx="6"
                          fill={`${colors.primary}25`} stroke={`${colors.primary}45`} strokeWidth="1" />
                        <rect x="6" y="14" width="10" height="34" rx="3"
                          fill={`${colors.primary}20`} stroke={`${colors.primary}40`} strokeWidth="1.5" />
                        <rect x="6" y="48" width="88" height="2.5" rx="1.25"
                          fill={colors.primary} opacity="0.6" />
                      </svg>
                    )}
                  </div>
                </Link>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.slug}`}>
                    <h3 className="font-semibold text-[#F5EDD6] text-sm mb-1 hover:text-[#C9A84C] transition-colors">
                      {item.productName}
                    </h3>
                  </Link>
                  <p className="text-xs text-[#F5EDD6]/40 mb-3">
                    Phân loại: {item.variantName} · SKU: {item.sku}
                  </p>

                  {/* Price */}
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{ color: colors.primary }} className="font-bold text-sm">
                      {formatPrice(item.price)}
                    </span>
                    {discount > 0 && (
                      <>
                        <span style={{ color: `${colors.text}35` }} className="text-xs line-through">
                          {formatPrice(item.originalPrice)}
                        </span>
                        <span style={{ backgroundColor: `${colors.error}15`, color: colors.error }} className="text-xs px-1.5 py-0.5 rounded-full">
                          -{discount}%
                        </span>
                      </>
                    )}
                  </div>

                  {/* Quantity + Remove */}
                  <div className="flex items-center justify-between">
                    <div
                      style={{ borderColor: colors.border, backgroundColor: colors.background }}
                      className="flex items-center rounded-lg border overflow-hidden"
                    >
                      <button
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                        style={{ color: colors.text }}
                        className="w-8 h-8 flex items-center justify-center text-base hover:opacity-70 transition-opacity"
                      >
                        −
                      </button>
                      <span style={{ color: colors.text, borderColor: colors.border }} className="w-8 text-center text-xs font-medium border-x">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                        style={{ color: colors.text }}
                        className="w-8 h-8 flex items-center justify-center text-base hover:opacity-70 transition-opacity"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <span style={{ color: colors.text }} className="text-sm font-semibold">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => removeItem(item.productId, item.variantId)}
                        style={{ color: `${colors.text}35` }}
                        className="hover:opacity-60 transition-opacity"
                        title="Xóa sản phẩm"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Continue shopping */}
          <Link
            href="/products"
            style={{ color: colors.primary, borderColor: `${colors.primary}30` }}
            className="text-sm flex items-center gap-2 hover:opacity-80 transition-opacity mt-2"
          >
            ← Tiếp tục mua sắm
          </Link>

          {/* Upsell — sản phẩm gợi ý */}
          {upsellProducts.length > 0 && (
            <div
              style={{ borderColor: colors.border }}
              className="mt-6 pt-6 border-t"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="w-5 h-px bg-[#C9A84C]" />
                <h3 className="text-sm font-semibold text-[#F5EDD6]">Khách hàng cũng mua</h3>
              </div>
              <div className="flex flex-col gap-3">
                {upsellProducts.map((p) => {
                  const disc = p.originalPrice > p.price
                    ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                    : 0;
                  return (
                    <Link
                      key={p.id}
                      href={`/products/${p.slug}`}
                      style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                      className="flex items-center gap-3 rounded-xl border p-3 hover:border-[#C9A84C]/40 transition-all group"
                    >
                      {/* Thumbnail */}
                      <div
                        style={{ backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` }}
                        className="w-14 h-14 rounded-lg border flex-shrink-0 flex items-center justify-center overflow-hidden"
                      >
                        {p.coverImage ? (
                          <img src={p.coverImage} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <svg viewBox="0 0 56 56" width="32" height="32" fill="none">
                            <rect x="5" y="28" width="46" height="16" rx="3" fill={`${colors.primary}15`} stroke={`${colors.primary}30`} strokeWidth="1.5" />
                            <rect x="8" y="22" width="40" height="18" rx="4" fill={`${colors.primary}20`} stroke={`${colors.primary}35`} strokeWidth="1.5" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ color: colors.text }} className="text-xs font-semibold line-clamp-1 group-hover:text-[#C9A84C] transition-colors">{p.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span style={{ color: colors.primary }} className="text-xs font-bold">
                            {p.price >= 1_000_000 ? `${(p.price / 1_000_000).toFixed(0)} triệu đ` : p.price.toLocaleString("vi-VN") + " đ"}
                          </span>
                          {disc > 0 && (
                            <span style={{ backgroundColor: `${colors.error}15`, color: colors.error }} className="text-xs px-1 py-0.5 rounded-full">-{disc}%</span>
                          )}
                        </div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`${colors.primary}60`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="rounded-2xl border p-6 sticky top-24"
          >
            <div className="flex items-center gap-2 mb-5">
              <span className="w-5 h-px bg-[#C9A84C]" />
              <h2 className="font-semibold text-[#F5EDD6] text-base">
                Tóm tắt đơn hàng
              </h2>
            </div>

            {/* Items summary */}
            <div className="flex flex-col gap-3 mb-5">
              {items.map((item) => (
                <div key={`${item.productId}-${item.variantId}`} className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#F5EDD6]/60 truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-[#F5EDD6]/40">
                      {item.variantName} × {item.quantity}
                    </p>
                  </div>
                  <span style={{ color: colors.text }} className="text-xs font-medium whitespace-nowrap">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ borderColor: colors.border }} className="border-t mb-4" />

            {/* Subtotal */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#F5EDD6]/50">Tạm tính</span>
              <span className="text-sm font-medium text-[#F5EDD6]">{formatPrice(subtotal)}</span>
            </div>

            {/* Shipping */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-[#F5EDD6]/50">Phí vận chuyển</span>
              <span style={{ color: colors.success }} className="text-sm font-medium">
                {SHIPPING_FEE === 0 ? "Miễn phí" : formatPrice(SHIPPING_FEE)}
              </span>
            </div>

            {/* Divider */}
            <div style={{ borderColor: colors.border }} className="border-t mb-4" />

            {/* Total */}
            <div className="flex justify-between items-center mb-6">
              <span className="font-semibold text-[#F5EDD6]">Tổng cộng</span>
              <span className="text-xl font-semibold text-gold-gradient">{formatPrice(total)}</span>
            </div>

            {/* Checkout button */}
            <button
              onClick={() => router.push("/checkout")}
              style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                color: colors.background,
              }}
              className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
            >
              Tiến hành đặt hàng →
            </button>

            {/* Trust badges */}
            <div className="mt-5 flex flex-col gap-2">
              {[
                { icon: "🔒", text: "Thanh toán bảo mật 100%" },
                { icon: "🚚", text: "Giao hàng miễn phí toàn quốc" },
                { icon: "↩️", text: "Đổi trả trong 30 ngày" },
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm">{badge.icon}</span>
                  <span className="text-xs text-[#F5EDD6]/40">{badge.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
    <Footer theme={theme} variant="minimal" />
    </>
  );
}
