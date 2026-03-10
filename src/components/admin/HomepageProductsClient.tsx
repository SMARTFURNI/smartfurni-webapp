"use client";

import { useState, useCallback } from "react";
import type { Product } from "@/lib/product-store";
import type { HomepageProductConfig } from "@/lib/homepage-products-store";

interface HomepageProductsClientProps {
  initialConfig: HomepageProductConfig;
  allProducts: Product[];
}

const CATEGORY_LABELS: Record<string, string> = {
  standard: "Standard",
  premium: "Premium",
  elite: "Elite",
  accessory: "Phụ kiện",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  out_of_stock: "#ef4444",
  coming_soon: "#f59e0b",
};

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu`;
  return price.toLocaleString("vi-VN") + " đ";
}

export default function HomepageProductsClient({
  initialConfig,
  allProducts,
}: HomepageProductsClientProps) {
  const [config, setConfig] = useState<HomepageProductConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"select" | "order" | "settings">("select");
  const [searchQ, setSearchQ] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  // Danh sách đã chọn (theo thứ tự)
  const selectedIds = config.displayedProductIds;
  const isAllSelected = selectedIds.length === 0;

  // Lấy Product object theo ID
  const getProduct = (id: string) => allProducts.find((p) => p.id === id);

  // Toggle chọn/bỏ chọn sản phẩm
  const toggleProduct = (id: string) => {
    setConfig((prev) => {
      const ids = prev.displayedProductIds;
      if (ids.includes(id)) {
        return { ...prev, displayedProductIds: ids.filter((x) => x !== id) };
      } else {
        return { ...prev, displayedProductIds: [...ids, id] };
      }
    });
  };

  // Chọn tất cả (reset về rỗng = hiển thị tất cả)
  const selectAll = () =>
    setConfig((prev) => ({ ...prev, displayedProductIds: [] }));

  // Chọn tất cả sản phẩm active
  const selectAllActive = () => {
    const activeIds = allProducts
      .filter((p) => p.status !== "discontinued")
      .map((p) => p.id);
    setConfig((prev) => ({ ...prev, displayedProductIds: activeIds }));
  };

  // Xóa khỏi danh sách hiển thị
  const removeProduct = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      displayedProductIds: prev.displayedProductIds.filter((x) => x !== id),
    }));
  };

  // Di chuyển lên/xuống
  const moveProduct = (id: string, direction: "up" | "down") => {
    setConfig((prev) => {
      const ids = [...prev.displayedProductIds];
      const idx = ids.indexOf(id);
      if (direction === "up" && idx > 0) {
        [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
      } else if (direction === "down" && idx < ids.length - 1) {
        [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
      }
      return { ...prev, displayedProductIds: ids };
    });
  };

  // Drag and drop
  const handleDragStart = (id: string) => setDragId(id);
  const handleDragOver = useCallback(
    (e: React.DragEvent, overId: string) => {
      e.preventDefault();
      if (overId !== dragId) setDragOverId(overId);
    },
    [dragId]
  );
  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    setConfig((prev) => {
      const ids = [...prev.displayedProductIds];
      const fromIdx = ids.indexOf(dragId);
      const toIdx = ids.indexOf(targetId);
      ids.splice(fromIdx, 1);
      ids.splice(toIdx, 0, dragId);
      return { ...prev, displayedProductIds: ids };
    });
    setDragId(null);
    setDragOverId(null);
  };

  // Lưu
  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/homepage-products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Lưu thất bại");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  // Lọc sản phẩm trong tab Select
  const filteredProducts = allProducts
    .filter((p) => p.status !== "discontinued")
    .filter(
      (p) =>
        (filterCat === "all" || p.category === filterCat) &&
        (searchQ === "" ||
          p.name.toLowerCase().includes(searchQ.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQ.toLowerCase()))
    );

  // Sản phẩm sẽ hiển thị (preview)
  const previewProducts =
    selectedIds.length === 0
      ? allProducts.filter((p) => p.status !== "discontinued")
      : selectedIds
          .map((id) => getProduct(id))
          .filter(Boolean) as Product[];

  const displayedPreview =
    config.maxDisplay > 0
      ? previewProducts.slice(0, config.maxDisplay)
      : previewProducts;

  return (
    <div className="flex gap-6 h-full">
      {/* ── LEFT PANEL ── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Tabs */}
        <div
          style={{ backgroundColor: "#1e2022", borderColor: "#334155" }}
          className="flex rounded-xl border p-1 gap-1"
        >
          {(
            [
              { key: "select", label: "1. Chọn sản phẩm" },
              { key: "order", label: "2. Sắp xếp thứ tự" },
              { key: "settings", label: "3. Cài đặt section" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={
                activeTab === t.key
                  ? { backgroundColor: "#C9A84C", color: "#0D0B00" }
                  : { color: "#9BA1A6" }
              }
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: CHỌN SẢN PHẨM ── */}
        {activeTab === "select" && (
          <div
            style={{ backgroundColor: "#1e2022", borderColor: "#334155" }}
            className="rounded-xl border flex flex-col gap-4 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 style={{ color: "#ECEDEE" }} className="font-semibold text-sm">
                  Chọn sản phẩm hiển thị
                </h3>
                <p style={{ color: "#9BA1A6" }} className="text-xs mt-0.5">
                  {selectedIds.length === 0
                    ? "Đang hiển thị tất cả sản phẩm active"
                    : `Đã chọn ${selectedIds.length} / ${allProducts.filter((p) => p.status !== "discontinued").length} sản phẩm`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  style={{ borderColor: "#334155", color: "#9BA1A6" }}
                  className="text-xs px-3 py-1.5 rounded-lg border hover:opacity-80 transition-opacity"
                >
                  Tất cả (mặc định)
                </button>
                <button
                  onClick={selectAllActive}
                  style={{ backgroundColor: "#C9A84C22", color: "#C9A84C", borderColor: "#C9A84C40" }}
                  className="text-xs px-3 py-1.5 rounded-lg border hover:opacity-80 transition-opacity"
                >
                  Chọn tất cả
                </button>
              </div>
            </div>

            {/* Search + filter */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Tìm sản phẩm..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                style={{
                  backgroundColor: "#151718",
                  borderColor: "#334155",
                  color: "#ECEDEE",
                }}
                className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none focus:border-yellow-500"
              />
              <select
                value={filterCat}
                onChange={(e) => setFilterCat(e.target.value)}
                style={{
                  backgroundColor: "#151718",
                  borderColor: "#334155",
                  color: "#ECEDEE",
                }}
                className="px-3 py-2 rounded-lg border text-sm outline-none"
              >
                <option value="all">Tất cả danh mục</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
                <option value="elite">Elite</option>
                <option value="accessory">Phụ kiện</option>
              </select>
            </div>

            {/* Product list */}
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
              {filteredProducts.length === 0 && (
                <p style={{ color: "#9BA1A6" }} className="text-sm text-center py-8">
                  Không tìm thấy sản phẩm
                </p>
              )}
              {filteredProducts.map((p) => {
                const isSelected =
                  selectedIds.length === 0 || selectedIds.includes(p.id);
                const isChecked = selectedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleProduct(p.id)}
                    style={{
                      backgroundColor: isChecked ? "#C9A84C10" : "#151718",
                      borderColor: isChecked ? "#C9A84C50" : "#334155",
                      cursor: "pointer",
                    }}
                    className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-yellow-500/40"
                  >
                    {/* Checkbox */}
                    <div
                      style={{
                        backgroundColor: isChecked ? "#C9A84C" : "transparent",
                        borderColor: isChecked ? "#C9A84C" : "#334155",
                        width: 18,
                        height: 18,
                        flexShrink: 0,
                      }}
                      className="rounded border-2 flex items-center justify-center"
                    >
                      {isChecked && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="#0D0B00"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>

                    {/* Thumbnail */}
                    <div
                      style={{ backgroundColor: "#0D0B00", width: 44, height: 44, flexShrink: 0 }}
                      className="rounded-lg overflow-hidden flex items-center justify-center"
                    >
                      {p.coverImage ? (
                        <img
                          src={p.coverImage}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span style={{ color: "#C9A84C" }} className="text-lg">
                          🛏️
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span style={{ color: "#ECEDEE" }} className="text-sm font-medium truncate">
                          {p.name}
                        </span>
                        {p.isFeatured && (
                          <span
                            style={{ backgroundColor: "#C9A84C20", color: "#C9A84C" }}
                            className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                          >
                            Nổi bật
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          style={{ color: "#C9A84C80" }}
                          className="text-xs"
                        >
                          {CATEGORY_LABELS[p.category]}
                        </span>
                        <span style={{ color: "#334155" }}>·</span>
                        <span
                          style={{ color: STATUS_COLORS[p.status] || "#9BA1A6" }}
                          className="text-xs"
                        >
                          {p.status === "active"
                            ? "Đang bán"
                            : p.status === "coming_soon"
                            ? "Sắp ra mắt"
                            : "Hết hàng"}
                        </span>
                        <span style={{ color: "#334155" }}>·</span>
                        <span style={{ color: "#9BA1A6" }} className="text-xs">
                          {formatPrice(p.price)}
                        </span>
                      </div>
                    </div>

                    {/* Order badge */}
                    {isChecked && selectedIds.length > 0 && (
                      <div
                        style={{ backgroundColor: "#C9A84C", color: "#0D0B00", width: 22, height: 22 }}
                        className="rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      >
                        {selectedIds.indexOf(p.id) + 1}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TAB 2: SẮP XẾP THỨ TỰ ── */}
        {activeTab === "order" && (
          <div
            style={{ backgroundColor: "#1e2022", borderColor: "#334155" }}
            className="rounded-xl border flex flex-col gap-4 p-5"
          >
            <div>
              <h3 style={{ color: "#ECEDEE" }} className="font-semibold text-sm">
                Sắp xếp thứ tự hiển thị
              </h3>
              <p style={{ color: "#9BA1A6" }} className="text-xs mt-0.5">
                Kéo thả hoặc dùng nút mũi tên để thay đổi thứ tự
              </p>
            </div>

            {selectedIds.length === 0 ? (
              <div
                style={{ borderColor: "#334155", backgroundColor: "#151718" }}
                className="rounded-xl border border-dashed p-8 text-center"
              >
                <p style={{ color: "#9BA1A6" }} className="text-sm">
                  Đang dùng chế độ <strong style={{ color: "#C9A84C" }}>Tất cả mặc định</strong>.
                  <br />
                  Chọn sản phẩm cụ thể ở tab 1 để sắp xếp thứ tự.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
                {selectedIds.map((id, idx) => {
                  const p = getProduct(id);
                  if (!p) return null;
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={() => handleDragStart(id)}
                      onDragOver={(e) => handleDragOver(e, id)}
                      onDrop={() => handleDrop(id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setDragOverId(null);
                      }}
                      style={{
                        backgroundColor:
                          dragOverId === id ? "#C9A84C15" : "#151718",
                        borderColor:
                          dragOverId === id ? "#C9A84C" : "#334155",
                        opacity: dragId === id ? 0.5 : 1,
                        cursor: "grab",
                      }}
                      className="flex items-center gap-3 p-3 rounded-xl border transition-all"
                    >
                      {/* Drag handle */}
                      <div style={{ color: "#334155" }} className="flex-shrink-0 cursor-grab">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="5" cy="4" r="1.2" fill="currentColor" />
                          <circle cx="5" cy="8" r="1.2" fill="currentColor" />
                          <circle cx="5" cy="12" r="1.2" fill="currentColor" />
                          <circle cx="11" cy="4" r="1.2" fill="currentColor" />
                          <circle cx="11" cy="8" r="1.2" fill="currentColor" />
                          <circle cx="11" cy="12" r="1.2" fill="currentColor" />
                        </svg>
                      </div>

                      {/* Order number */}
                      <div
                        style={{ backgroundColor: "#C9A84C", color: "#0D0B00", width: 24, height: 24 }}
                        className="rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      >
                        {idx + 1}
                      </div>

                      {/* Thumbnail */}
                      <div
                        style={{ backgroundColor: "#0D0B00", width: 40, height: 40 }}
                        className="rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
                      >
                        {p.coverImage ? (
                          <img src={p.coverImage} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-base">🛏️</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p style={{ color: "#ECEDEE" }} className="text-sm font-medium truncate">
                          {p.name}
                        </p>
                        <p style={{ color: "#9BA1A6" }} className="text-xs">
                          {CATEGORY_LABELS[p.category]} · {formatPrice(p.price)}
                        </p>
                      </div>

                      {/* Move buttons */}
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => moveProduct(id, "up")}
                          disabled={idx === 0}
                          style={{
                            backgroundColor: "#1e2022",
                            borderColor: "#334155",
                            color: idx === 0 ? "#334155" : "#9BA1A6",
                          }}
                          className="w-7 h-7 rounded-lg border flex items-center justify-center hover:opacity-80 disabled:cursor-not-allowed transition-opacity"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 8L6 4L10 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveProduct(id, "down")}
                          disabled={idx === selectedIds.length - 1}
                          style={{
                            backgroundColor: "#1e2022",
                            borderColor: "#334155",
                            color: idx === selectedIds.length - 1 ? "#334155" : "#9BA1A6",
                          }}
                          className="w-7 h-7 rounded-lg border flex items-center justify-center hover:opacity-80 disabled:cursor-not-allowed transition-opacity"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeProduct(id)}
                          style={{ backgroundColor: "#ef444415", borderColor: "#ef444440", color: "#ef4444" }}
                          className="w-7 h-7 rounded-lg border flex items-center justify-center hover:opacity-80 transition-opacity"
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: CÀI ĐẶT SECTION ── */}
        {activeTab === "settings" && (
          <div
            style={{ backgroundColor: "#1e2022", borderColor: "#334155" }}
            className="rounded-xl border flex flex-col gap-5 p-5"
          >
            <h3 style={{ color: "#ECEDEE" }} className="font-semibold text-sm">
              Cài đặt nội dung section
            </h3>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label style={{ color: "#9BA1A6" }} className="text-xs font-medium">
                Tiêu đề section
              </label>
              <input
                type="text"
                value={config.sectionTitle}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, sectionTitle: e.target.value }))
                }
                style={{ backgroundColor: "#151718", borderColor: "#334155", color: "#ECEDEE" }}
                className="px-3 py-2.5 rounded-lg border text-sm outline-none focus:border-yellow-500"
              />
            </div>

            {/* Subtitle */}
            <div className="flex flex-col gap-1.5">
              <label style={{ color: "#9BA1A6" }} className="text-xs font-medium">
                Mô tả section
              </label>
              <textarea
                value={config.sectionSubtitle}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, sectionSubtitle: e.target.value }))
                }
                rows={3}
                style={{ backgroundColor: "#151718", borderColor: "#334155", color: "#ECEDEE" }}
                className="px-3 py-2.5 rounded-lg border text-sm outline-none focus:border-yellow-500 resize-none"
              />
            </div>

            {/* Max display */}
            <div className="flex flex-col gap-1.5">
              <label style={{ color: "#9BA1A6" }} className="text-xs font-medium">
                Số sản phẩm tối đa hiển thị (0 = không giới hạn)
              </label>
              <input
                type="number"
                min={0}
                max={20}
                value={config.maxDisplay}
                onChange={(e) =>
                  setConfig((p) => ({
                    ...p,
                    maxDisplay: parseInt(e.target.value) || 0,
                  }))
                }
                style={{ backgroundColor: "#151718", borderColor: "#334155", color: "#ECEDEE" }}
                className="px-3 py-2.5 rounded-lg border text-sm outline-none focus:border-yellow-500 w-32"
              />
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-3">
              {[
                { key: "showCategoryFilter", label: "Hiển thị bộ lọc danh mục" },
                { key: "showCta", label: "Hiển thị nút CTA cuối section" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <span style={{ color: "#ECEDEE" }} className="text-sm">
                    {label}
                  </span>
                  <button
                    onClick={() =>
                      setConfig((p) => ({ ...p, [key]: !p[key as keyof HomepageProductConfig] }))
                    }
                    style={{
                      backgroundColor: config[key as keyof HomepageProductConfig]
                        ? "#C9A84C"
                        : "#334155",
                      width: 44,
                      height: 24,
                    }}
                    className="rounded-full relative transition-colors"
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        backgroundColor: "#fff",
                        transform: config[key as keyof HomepageProductConfig]
                          ? "translateX(22px)"
                          : "translateX(3px)",
                        transition: "transform 0.2s",
                      }}
                      className="absolute top-[3px] rounded-full"
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* CTA settings */}
            {config.showCta && (
              <div className="flex flex-col gap-3 pt-2 border-t" style={{ borderColor: "#334155" }}>
                <p style={{ color: "#9BA1A6" }} className="text-xs font-medium">
                  Nút CTA cuối section
                </p>
                <div className="flex flex-col gap-1.5">
                  <label style={{ color: "#9BA1A6" }} className="text-xs">
                    Text nút
                  </label>
                  <input
                    type="text"
                    value={config.ctaText}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, ctaText: e.target.value }))
                    }
                    style={{ backgroundColor: "#151718", borderColor: "#334155", color: "#ECEDEE" }}
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:border-yellow-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label style={{ color: "#9BA1A6" }} className="text-xs">
                    Link
                  </label>
                  <input
                    type="text"
                    value={config.ctaLink}
                    onChange={(e) =>
                      setConfig((p) => ({ ...p, ctaLink: e.target.value }))
                    }
                    style={{ backgroundColor: "#151718", borderColor: "#334155", color: "#ECEDEE" }}
                    className="px-3 py-2 rounded-lg border text-sm outline-none focus:border-yellow-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? "#334155" : "linear-gradient(135deg, #C9A84C, #8B6914)",
              color: saving ? "#9BA1A6" : "#0D0B00",
            }}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:cursor-not-allowed"
          >
            {saving ? "Đang lưu..." : saved ? "✓ Đã lưu!" : "Lưu thay đổi"}
          </button>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ borderColor: "#334155", color: "#9BA1A6" }}
            className="px-4 py-3 rounded-xl border text-sm hover:opacity-80 transition-opacity flex items-center gap-2"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7H12M8 3L12 7L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Xem trang chủ
          </a>
        </div>

        {error && (
          <p style={{ color: "#ef4444" }} className="text-sm">
            ⚠ {error}
          </p>
        )}
      </div>

      {/* ── RIGHT PANEL: PREVIEW ── */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4">
        {/* Summary card */}
        <div
          style={{ backgroundColor: "#1e2022", borderColor: "#334155" }}
          className="rounded-xl border p-4 flex flex-col gap-3"
        >
          <h3 style={{ color: "#ECEDEE" }} className="font-semibold text-sm">
            Tóm tắt cấu hình
          </h3>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span style={{ color: "#9BA1A6" }} className="text-xs">Chế độ</span>
              <span style={{ color: "#C9A84C" }} className="text-xs font-medium">
                {selectedIds.length === 0 ? "Tất cả mặc định" : "Tùy chỉnh"}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#9BA1A6" }} className="text-xs">Sản phẩm hiển thị</span>
              <span style={{ color: "#ECEDEE" }} className="text-xs font-medium">
                {displayedPreview.length} sản phẩm
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#9BA1A6" }} className="text-xs">Bộ lọc danh mục</span>
              <span style={{ color: config.showCategoryFilter ? "#22c55e" : "#ef4444" }} className="text-xs">
                {config.showCategoryFilter ? "Hiển thị" : "Ẩn"}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#9BA1A6" }} className="text-xs">Nút CTA</span>
              <span style={{ color: config.showCta ? "#22c55e" : "#ef4444" }} className="text-xs">
                {config.showCta ? "Hiển thị" : "Ẩn"}
              </span>
            </div>
            {config.maxDisplay > 0 && (
              <div className="flex justify-between">
                <span style={{ color: "#9BA1A6" }} className="text-xs">Giới hạn</span>
                <span style={{ color: "#ECEDEE" }} className="text-xs font-medium">
                  Tối đa {config.maxDisplay}
                </span>
              </div>
            )}
          </div>

          {/* Section title preview */}
          <div
            style={{ backgroundColor: "#151718", borderColor: "#334155" }}
            className="rounded-lg border p-3 mt-1"
          >
            <p style={{ color: "#9BA1A6" }} className="text-xs mb-1">
              Tiêu đề section:
            </p>
            <p style={{ color: "#C9A84C" }} className="text-sm font-semibold">
              {config.sectionTitle || "(Trống)"}
            </p>
          </div>
        </div>

        {/* Preview list */}
        <div
          style={{ backgroundColor: "#1e2022", borderColor: "#334155" }}
          className="rounded-xl border p-4 flex flex-col gap-3 flex-1 overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <h3 style={{ color: "#ECEDEE" }} className="font-semibold text-sm">
              Preview thứ tự
            </h3>
            <span
              style={{ backgroundColor: "#C9A84C20", color: "#C9A84C" }}
              className="text-xs px-2 py-0.5 rounded-full"
            >
              {displayedPreview.length} sp
            </span>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] pr-1">
            {displayedPreview.map((p, idx) => (
              <div
                key={p.id}
                style={{ backgroundColor: "#151718", borderColor: "#334155" }}
                className="flex items-center gap-2.5 p-2.5 rounded-lg border"
              >
                <span
                  style={{ backgroundColor: "#C9A84C20", color: "#C9A84C", width: 20, height: 20 }}
                  className="rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                >
                  {idx + 1}
                </span>
                <div
                  style={{ backgroundColor: "#0D0B00", width: 32, height: 32 }}
                  className="rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
                >
                  {p.coverImage ? (
                    <img src={p.coverImage} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm">🛏️</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p style={{ color: "#ECEDEE" }} className="text-xs font-medium truncate">
                    {p.name}
                  </p>
                  <p style={{ color: "#9BA1A6" }} className="text-xs">
                    {formatPrice(p.price)}
                  </p>
                </div>
                {p.isFeatured && (
                  <span style={{ color: "#C9A84C" }} className="text-xs flex-shrink-0">★</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Last saved */}
        {config.updatedAt && (
          <p style={{ color: "#334155" }} className="text-xs text-center">
            Lưu lần cuối: {new Date(config.updatedAt).toLocaleString("vi-VN")}
          </p>
        )}
      </div>
    </div>
  );
}
