"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product, ProductVariant } from "@/lib/product-store";
import BNPLBadge from "@/components/landing/BNPLBadge";
import type { SiteTheme } from "@/lib/theme-types";
import { useCart } from "@/lib/cart-context";
import Breadcrumb from "@/components/landing/Breadcrumb";

interface Props {
  product: Product;
  related: Product[];
  theme: SiteTheme;
}

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ đ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu đ`;
  return price.toLocaleString("vi-VN") + " đ";
}

function StarRating({ rating, count, color }: { rating: number; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg key={s} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1.5L9.8 5.8L14.5 6.3L11.2 9.3L12.1 14L8 11.7L3.9 14L4.8 9.3L1.5 6.3L6.2 5.8L8 1.5Z"
              fill={s <= Math.round(rating) ? color : "transparent"}
              stroke={s <= Math.round(rating) ? color : `${color}40`}
              strokeWidth="1"
            />
          </svg>
        ))}
      </div>
      <span style={{ color }} className="font-semibold text-sm">{rating.toFixed(1)}</span>
      <span style={{ color: `${color}60` }} className="text-sm">({count} đánh giá)</span>
    </div>
  );
}

const STATUS_MAP = {
  active: { label: "Còn hàng", bg: "success", text: "✓" },
  out_of_stock: { label: "Hết hàng", bg: "error", text: "✗" },
  coming_soon: { label: "Sắp ra mắt", bg: "warning", text: "⏳" },
  discontinued: { label: "Ngừng kinh doanh", bg: "muted", text: "—" },
};

const CATEGORY_MAP = {
  standard: "Standard",
  premium: "Premium",
  elite: "Elite",
  accessory: "Phụ kiện",
};

export default function ProductDetailClient({ product, related, theme }: Props) {
  const { colors, layout } = theme;
  const router = useRouter();
  const { addItem, totalItems } = useCart();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0]);
  const [activeTab, setActiveTab] = useState<"description" | "features" | "specs" | "reviews">("description");
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const discount =
    product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const statusCfg = STATUS_MAP[product.status];
  const isAvailable = product.status === "active" && selectedVariant.stock > 0;
  const isComingSoon = product.status === "coming_soon";

  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      sku: selectedVariant.sku,
      price: product.price,
      originalPrice: product.originalPrice,
      coverImage: product.coverImage,
      quantity,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleBuyNow = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      sku: selectedVariant.sku,
      price: product.price,
      originalPrice: product.originalPrice,
      coverImage: product.coverImage,
      quantity,
    });
    router.push("/checkout");
  };

  // Tabs: show description tab only if detailedDescription exists
  const tabs = [
    ...(product.detailedDescription ? [{ key: "description" as const, label: "Mô tả sản phẩm" }] : []),
    { key: "features" as const, label: "Tính năng" },
    { key: "specs" as const, label: "Thông số kỹ thuật" },
    { key: "reviews" as const, label: `Đánh giá (${product.reviewCount})` },
  ];

  // Sticky CTA: show after scrolling past hero section
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowSticky(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
    {/* Sticky CTA bar — mobile only */}
    <div
      style={{
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        transform: showSticky ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s ease",
      }}
      className="fixed bottom-0 left-0 right-0 z-40 border-t px-4 py-3 flex items-center gap-3 sm:hidden"
    >
      <div className="flex-1 min-w-0">
        <p style={{ color: colors.text }} className="text-sm font-semibold truncate">{product.name}</p>
        <p style={{ color: colors.primary }} className="text-sm font-bold">{formatPrice(product.price)}</p>
      </div>
      <button
        onClick={handleAddToCart}
        disabled={!isAvailable}
        style={{
          borderColor: colors.primary,
          color: colors.primary,
          opacity: isAvailable ? 1 : 0.4,
        }}
        className="px-4 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap flex-shrink-0"
      >
        + Giỏ hàng
      </button>
      <button
        onClick={handleBuyNow}
        disabled={!isAvailable}
        style={{
          background: isAvailable ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` : colors.border,
          color: isAvailable ? colors.background : `${colors.text}40`,
        }}
        className="px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0"
      >
        Mua ngay
      </button>
    </div>
    <div style={{ maxWidth: layout.maxWidth, paddingTop: (theme.navbar.height ?? 64) + 32 }} className="mx-auto px-4 sm:px-6 pb-8 sm:pb-10">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Breadcrumb items={[
          { label: "Trang chủ", href: "/" },
          { label: "Sản phẩm", href: "/products" },
          { label: product.name },
        ]} />
      </div>

      {/* Main product section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 mb-12 sm:mb-16">
        {/* Left: Image */}
        <div>
          <div
            className="rounded-2xl overflow-hidden flex items-center justify-center w-full"
            style={{
              background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})`,
              border: `1px solid ${colors.border}`,
              aspectRatio: '4/3',
            }}
          >
            {product.coverImage ? (
              <img
                src={product.coverImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg viewBox="0 0 300 200" width="260" height="173" fill="none">
                {/* Bed frame */}
                <rect x="30" y="100" width="240" height="75" rx="8"
                  fill={`${colors.primary}12`} stroke={`${colors.primary}35`} strokeWidth="2" />
                {/* Mattress */}
                <rect x="38" y="80" width="224" height="82" rx="10"
                  fill={`${colors.primary}18`} stroke={`${colors.primary}45`} strokeWidth="2" />
                {/* Pillow 1 */}
                <rect x="45" y="65" width="70" height="35" rx="14"
                  fill={`${colors.primary}28`} stroke={`${colors.primary}55`} strokeWidth="1.5" />
                {/* Pillow 2 */}
                <rect x="125" y="65" width="70" height="35" rx="14"
                  fill={`${colors.primary}28`} stroke={`${colors.primary}55`} strokeWidth="1.5" />
                {/* Headboard */}
                <rect x="22" y="40" width="28" height="90" rx="6"
                  fill={`${colors.primary}22`} stroke={`${colors.primary}45`} strokeWidth="2" />
                {/* LED strip */}
                <rect x="22" y="128" width="256" height="5" rx="2.5"
                  fill={colors.primary} opacity="0.7" />
                {/* Legs */}
                <rect x="38" y="172" width="14" height="22" rx="4"
                  fill={`${colors.primary}28`} stroke={`${colors.primary}40`} strokeWidth="1.5" />
                <rect x="248" y="172" width="14" height="22" rx="4"
                  fill={`${colors.primary}28`} stroke={`${colors.primary}40`} strokeWidth="1.5" />
                {/* Smart icon circle */}
                <circle cx="232" cy="95" r="14"
                  fill={`${colors.primary}18`} stroke={`${colors.primary}45`} strokeWidth="1.5" />
                <path d="M227 95 L231 99 L237 90"
                  stroke={colors.primary} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
                {/* Glow */}
                <ellipse cx="150" cy="195" rx="100" ry="8"
                  fill={colors.primary} opacity="0.08" />
              </svg>
            )}
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span
              style={{ backgroundColor: `${colors.primary}15`, color: colors.primary, borderColor: `${colors.primary}30` }}
              className="text-xs px-3 py-1 rounded-full border font-medium"
            >
              {CATEGORY_MAP[product.category]}
            </span>
            {product.isFeatured && (
              <span
                style={{ backgroundColor: `${colors.warning}15`, color: colors.warning, borderColor: `${colors.warning}30` }}
                className="text-xs px-3 py-1 rounded-full border font-medium"
              >
                ⭐ Nổi bật
              </span>
            )}
            {discount > 0 && (
              <span
                style={{ backgroundColor: `${colors.error}15`, color: colors.error, borderColor: `${colors.error}30` }}
                className="text-xs px-3 py-1 rounded-full border font-medium"
              >
                Giảm {discount}%
              </span>
            )}
            <span
              style={{
                backgroundColor: product.status === "active" ? `${colors.success}15` : product.status === "coming_soon" ? `${colors.warning}15` : `${colors.error}15`,
                color: product.status === "active" ? colors.success : product.status === "coming_soon" ? colors.warning : colors.error,
                borderColor: product.status === "active" ? `${colors.success}30` : product.status === "coming_soon" ? `${colors.warning}30` : `${colors.error}30`,
              }}
              className="text-xs px-3 py-1 rounded-full border font-medium"
            >
              {statusCfg.text} {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Right: Info */}
        <div className="flex flex-col gap-5">
          {/* Name */}
          <div>
            <h1 className="text-3xl font-light text-[#F5EDD6] leading-tight mb-2">
              {product.name}
            </h1>
            {product.reviewCount > 0 && (
              <StarRating rating={product.rating} count={product.reviewCount} color={colors.primary} />
            )}
          </div>

          {/* Price */}
          <div
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="rounded-xl p-4 border"
          >
            <div className="flex items-baseline gap-3">
              <span style={{ color: colors.primary }} className="text-3xl font-bold">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <span style={{ color: `${colors.text}40` }} className="text-lg line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            {discount > 0 && (
              <p style={{ color: colors.success }} className="text-sm mt-1">
                Tiết kiệm {formatPrice(product.originalPrice - product.price)}
              </p>
            )}
            {/* Urgency: delivery estimate */}
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: `${colors.border}50` }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7h9M7 4l3 3-3 3" stroke={colors.success} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 3h1.5a.5.5 0 01.5.5v7a.5.5 0 01-.5.5H11" stroke={colors.success} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{ color: colors.success }} className="text-xs font-medium">
                Đặt hôm nay — giao trong 3–5 ngày làm việc
              </span>
            </div>
          </div>

          {/* Urgency: stock + viewers */}
          {product.status === "active" && selectedVariant.stock > 0 && selectedVariant.stock <= 10 && (
            <div
              style={{ backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}25` }}
              className="rounded-xl px-4 py-3 border flex items-center gap-3"
            >
              <div
                style={{ backgroundColor: `${colors.warning}20`, color: colors.warning }}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
              >
                !
              </div>
              <div>
                <p style={{ color: colors.warning }} className="text-xs font-semibold">
                  Chỉ còn {selectedVariant.stock} sản phẩm
                </p>
                <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${colors.warning}20`, width: 120 }}>
                  <div
                    style={{ width: `${Math.min((selectedVariant.stock / 20) * 100, 100)}%`, backgroundColor: colors.warning }}
                    className="h-full rounded-full"
                  />
                </div>
              </div>
              <p style={{ color: `${colors.text}40` }} className="text-xs ml-auto">
                {Math.floor(Math.random() * 8) + 3} người đang xem
              </p>
            </div>
          )}

          {/* Short Description */}
          <p className="text-sm text-[#F5EDD6]/50 leading-relaxed">
            {product.description}
          </p>

          {/* Variants */}
          {product.variants.length > 0 && (
            <div>
              <p style={{ color: `${colors.text}70` }} className="text-sm font-medium mb-2">
                Màu sắc / Loại: <span style={{ color: colors.text }}>{selectedVariant.name}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const isSelected = v.id === selectedVariant.id;
                  const outOfStock = v.stock === 0 && product.status !== "coming_soon";
                  return (
                    <button
                      key={v.id}
                      onClick={() => !outOfStock && setSelectedVariant(v)}
                      disabled={outOfStock}
                      style={
                        isSelected
                          ? {
                              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                              color: colors.background,
                              borderColor: "transparent",
                            }
                          : outOfStock
                          ? { backgroundColor: "transparent", color: `${colors.text}30`, borderColor: `${colors.border}`, cursor: "not-allowed" }
                          : { backgroundColor: "transparent", color: colors.text, borderColor: colors.border }
                      }
                      className="px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 relative"
                    >
                      {v.name}
                      {outOfStock && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span style={{ color: `${colors.text}30` }} className="text-xs">Hết</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedVariant && (
                <p style={{ color: `${colors.text}50` }} className="text-xs mt-2">
                  SKU: {selectedVariant.sku} · Còn {selectedVariant.stock} sản phẩm
                </p>
              )}
            </div>
          )}

          {/* Quantity + CTA */}
          <div className="flex items-center gap-3">
            {/* Quantity */}
            <div
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
              className="flex items-center rounded-xl border overflow-hidden"
            >
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                style={{ color: colors.text }}
                className="w-10 h-10 flex items-center justify-center text-lg hover:opacity-70 transition-opacity"
              >
                −
              </button>
              <span style={{ color: colors.text, borderColor: colors.border }} className="w-10 text-center text-sm font-medium border-x">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                style={{ color: colors.text }}
                className="w-10 h-10 flex items-center justify-center text-lg hover:opacity-70 transition-opacity"
              >
                +
              </button>
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              disabled={!isAvailable && !isComingSoon}
              style={
                isAvailable || isComingSoon
                  ? {
                      background: addedToCart
                        ? `linear-gradient(135deg, ${colors.success}, ${colors.success})`
                        : `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      color: colors.background,
                    }
                  : { backgroundColor: colors.border, color: `${colors.text}40`, cursor: "not-allowed" }
              }
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
            >
              {addedToCart
                ? "✓ Đã thêm vào giỏ"
                : isAvailable
                ? "Thêm vào giỏ hàng"
                : isComingSoon
                ? "Đặt trước ngay"
                : "Hết hàng"}
            </button>
          </div>

          {/* Buy Now button */}
          {(isAvailable || isComingSoon) && (
            <button
              onClick={handleBuyNow}
              style={{ borderColor: colors.primary, color: colors.primary }}
              className="w-full py-3 rounded-xl text-sm font-semibold border text-center hover:opacity-80 transition-opacity"
            >
              Mua ngay →
            </button>
          )}

          {/* Feature CTAs row */}
          {product.category !== "accessory" && (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/products/configure/${product.slug}`}
                style={{ backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30`, color: colors.primary }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border hover:opacity-80 transition-opacity"
              >
                ⚙️ Cấu hình 3D
              </Link>
              <Link
                href="/ar-try"
                style={{ backgroundColor: `${colors.secondary}12`, borderColor: `${colors.secondary}30`, color: colors.secondary }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border hover:opacity-80 transition-opacity"
              >
                📷 AR Thử tại nhà
              </Link>
            </div>
          )}

          {/* BNPL Badge */}
          {product.category !== "accessory" && (
            <BNPLBadge
              price={product.price}
              primary={colors.primary}
              bg={colors.background}
              text={colors.text}
              border={colors.border}
              surface={colors.surface}
            />
          )}

          {/* Contact CTA */}
          <Link
            href="/contact"
            style={{ color: `${colors.text}60`, borderColor: colors.border }}
            className="w-full py-3 rounded-xl text-sm border text-center hover:opacity-80 transition-opacity"
          >
            Liên hệ tư vấn
          </Link>

          {/* Stats row */}
          <div
            style={{ borderColor: colors.border }}
            className="grid grid-cols-3 border rounded-xl overflow-hidden"
          >
            {[
              { label: "Đã bán", value: product.totalSold.toLocaleString() },
              { label: "Lượt xem", value: product.viewCount.toLocaleString() },
              { label: "Đánh giá", value: product.reviewCount > 0 ? `${product.rating.toFixed(1)}★` : "—" },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  borderRightColor: colors.border,
                  backgroundColor: colors.surface,
                }}
                className={`py-3 text-center ${i < 2 ? "border-r" : ""}`}
              >
                <p style={{ color: colors.primary }} className="text-base font-bold">{s.value}</p>
                <p style={{ color: `${colors.text}50` }} className="text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Cart notification */}
          {addedToCart && (
            <div
              style={{ backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30`, color: colors.success }}
              className="rounded-xl border p-3 text-sm flex items-center justify-between"
            >
              <span>✓ Đã thêm vào giỏ hàng!</span>
              <Link href="/cart" style={{ color: colors.primary }} className="font-semibold hover:opacity-80">
                Xem giỏ hàng →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tabs: Mô tả / Tính năng / Thông số / Đánh giá */}
      <div className="mb-16">
        {/* Tab headers */}
        <div
          style={{ borderColor: colors.border }}
          className="flex border-b mb-8 overflow-x-auto"
        >
          {tabs.map(({ key, label }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={
                  isActive
                    ? { color: colors.primary, borderBottomColor: colors.primary }
                    : { color: `${colors.text}50`, borderBottomColor: "transparent" }
                }
                className="px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap"
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab: Mô tả sản phẩm */}
        {activeTab === "description" && product.detailedDescription && (
          <div
            style={{
              color: colors.text,
              lineHeight: 1.8,
            }}
            className="prose-custom max-w-none"
            dangerouslySetInnerHTML={{ __html: product.detailedDescription }}
          />
        )}

        {/* Tab: Tính năng */}
        {activeTab === "features" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.features.map((f, i) => (
              <div
                key={i}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                className="flex items-start gap-3 p-4 rounded-xl border"
              >
                <div
                  style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5"
                >
                  ✓
                </div>
                <p style={{ color: colors.text }} className="text-sm leading-relaxed">{f}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Thông số kỹ thuật */}
        {activeTab === "specs" && (
          <div
            style={{ borderColor: colors.border }}
            className="rounded-xl border overflow-hidden"
          >
            {Object.entries(product.specs).map(([key, value], i) => (
              <div
                key={i}
                style={{
                  backgroundColor: i % 2 === 0 ? colors.surface : colors.background,
                  borderBottomColor: colors.border,
                }}
                className="flex border-b last:border-b-0"
              >
                <div
                  style={{ color: `${colors.text}70`, borderRightColor: colors.border, backgroundColor: `${colors.primary}08` }}
                  className="w-48 px-5 py-3.5 text-sm font-medium border-r flex-shrink-0"
                >
                  {key}
                </div>
                <div style={{ color: colors.text }} className="px-5 py-3.5 text-sm flex-1">
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Đánh giá */}
        {activeTab === "reviews" && (
          <div>
            {product.reviews.length === 0 ? (
              <div
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                className="rounded-xl border p-10 text-center"
              >
                <p style={{ color: `${colors.text}40` }} className="text-sm">
                  Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Summary */}
                <div
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  className="rounded-xl border p-6 flex items-center gap-8"
                >
                  <div className="text-center">
                    <p style={{ color: colors.primary }} className="text-5xl font-bold">{product.rating.toFixed(1)}</p>
                    <StarRating rating={product.rating} count={product.reviewCount} color={colors.primary} />
                  </div>
                  <div className="flex-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = product.reviews.filter((r) => r.rating === star).length;
                      const pct = product.reviews.length > 0 ? (count / product.reviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 mb-1">
                          <span style={{ color: `${colors.text}60` }} className="text-xs w-4">{star}★</span>
                          <div style={{ backgroundColor: colors.border }} className="flex-1 h-2 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${pct}%`, backgroundColor: colors.primary }}
                              className="h-full rounded-full transition-all"
                            />
                          </div>
                          <span style={{ color: `${colors.text}50` }} className="text-xs w-4">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Review cards */}
                {product.reviews.map((r) => (
                  <div
                    key={r.id}
                    style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                    className="rounded-xl border p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }}
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                        >
                          {r.userName.charAt(0)}
                        </div>
                        <div>
                          <p style={{ color: colors.text }} className="text-sm font-semibold">{r.userName}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <svg key={s} width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path
                                    d="M6 1L7.35 4.22L10.9 4.64L8.45 6.97L9.09 10.5L6 8.77L2.91 10.5L3.55 6.97L1.1 4.64L4.65 4.22L6 1Z"
                                    fill={s <= r.rating ? colors.primary : "transparent"}
                                    stroke={s <= r.rating ? colors.primary : `${colors.primary}30`}
                                    strokeWidth="0.8"
                                  />
                                </svg>
                              ))}
                            </div>
                            {r.verified && (
                              <span style={{ color: colors.success }} className="text-xs">✓ Đã mua</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span style={{ color: `${colors.text}40` }} className="text-xs">
                        {new Date(r.date).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <p style={{ color: `${colors.text}80` }} className="text-sm leading-relaxed">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span className="w-6 h-px bg-[#C9A84C]" />
            <h2 className="text-xl sm:text-2xl font-light text-[#F5EDD6]">
              Sản phẩm <span className="text-gold-gradient">liên quan</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((p) => {
              const disc = p.originalPrice > p.price
                ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                : 0;
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  }}
                  className="rounded-xl border overflow-hidden hover:border-primary transition-all duration-200 hover:-translate-y-1 block"
                >
                  <div
                    style={{ background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})`, height: 160 }}
                    className="flex items-center justify-center"
                  >
                    {p.coverImage ? (
                      <img src={p.coverImage} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 160 100" width="120" height="75" fill="none">
                        <rect x="15" y="50" width="130" height="40" rx="5"
                          fill={`${colors.primary}12`} stroke={`${colors.primary}35`} strokeWidth="1.5" />
                        <rect x="20" y="40" width="120" height="45" rx="6"
                          fill={`${colors.primary}18`} stroke={`${colors.primary}40`} strokeWidth="1.5" />
                        <rect x="25" y="33" width="38" height="20" rx="8"
                          fill={`${colors.primary}25`} stroke={`${colors.primary}45`} strokeWidth="1" />
                        <rect x="10" y="22" width="15" height="50" rx="3"
                          fill={`${colors.primary}20`} stroke={`${colors.primary}40`} strokeWidth="1.5" />
                        <rect x="10" y="68" width="140" height="3" rx="1.5"
                          fill={colors.primary} opacity="0.6" />
                      </svg>
                    )}
                  </div>
                  <div className="p-4">
                    <p style={{ color: colors.text }} className="text-sm font-semibold line-clamp-1 mb-1">{p.name}</p>
                    <div className="flex items-center gap-2">
                      <span style={{ color: colors.primary }} className="text-sm font-bold">{formatPrice(p.price)}</span>
                      {disc > 0 && (
                        <span style={{ backgroundColor: `${colors.error}15`, color: colors.error }} className="text-xs px-1.5 py-0.5 rounded-full">
                          -{disc}%
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
    </>
  );
}