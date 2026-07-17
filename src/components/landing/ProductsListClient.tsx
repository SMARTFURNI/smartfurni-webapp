"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product, ProductFamily } from "@/lib/product-store";
import { inferProductFamily } from "@/lib/product-families";
import type { SiteTheme } from "@/lib/theme-types";
import { StaggerReveal } from "./ScrollReveal";
import { StaticProductCard } from "./StaticProductsSection";

interface Props {
  products: Product[];
  theme: SiteTheme;
}

const CATEGORIES: { key: ProductFamily | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "ergonomic_bed", label: "Giường công thái học" },
  { key: "electric_mattress", label: "Nệm thông minh điều chỉnh điện" },
  { key: "sofa_bed", label: "Sofa giường" },
  { key: "accessory", label: "Phụ kiện" },
];

const SORT_OPTIONS = [
  { key: "default", label: "Mặc định" },
  { key: "price_asc", label: "Giá tăng dần" },
  { key: "price_desc", label: "Giá giảm dần" },
  { key: "rating", label: "Đánh giá cao nhất" },
  { key: "bestseller", label: "Bán chạy nhất" },
];

function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-[#2E2800] bg-[#221D00] sm:rounded-2xl">
      <div className="aspect-square w-full animate-pulse bg-[#2E2800]" />
      <div className="flex flex-col gap-2 p-3 sm:gap-3 sm:p-5">
        <div className="h-2.5 w-16 animate-pulse rounded-full bg-[#2E2800]" />
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-[#2E2800]" />
        <div className="h-4 w-3/5 animate-pulse rounded-full bg-[#2E2800]" />
        <div className="mt-2 h-16 animate-pulse rounded-lg bg-[#2E2800]" />
      </div>
    </div>
  );
}

export default function ProductsListClient({ products, theme }: Props) {
  const { colors, layout, pageProducts } = theme;
  const [activeCategory, setActiveCategory] = useState<ProductFamily | "all">("all");
  const [sortKey, setSortKey] = useState("default");
  const [search, setSearch] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    let list = [...products];

    if (activeCategory !== "all") {
      list = list.filter((product) => inferProductFamily(product) === activeCategory);
    }

    if (search.trim()) {
      const query = search.toLocaleLowerCase("vi");
      list = list.filter(
        (product) =>
          product.name.toLocaleLowerCase("vi").includes(query) ||
          product.description.toLocaleLowerCase("vi").includes(query),
      );
    }

    if (sortKey === "price_asc") list.sort((a, b) => a.price - b.price);
    else if (sortKey === "price_desc") list.sort((a, b) => b.price - a.price);
    else if (sortKey === "rating") list.sort((a, b) => b.rating - a.rating);
    else if (sortKey === "bestseller") list.sort((a, b) => b.totalSold - a.totalSold);

    return list;
  }, [activeCategory, products, search, sortKey]);

  return (
    <div className="mx-auto px-4 py-8 sm:px-6 sm:py-10" style={{ maxWidth: layout.maxWidth }}>
      <h2 className="mb-4 text-xl font-light text-[#F5EDD6]">{pageProducts.filterLabel}</h2>

      <div className="mb-8 flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" stroke={`${colors.text}40`} strokeWidth="1.5" />
            <path d="M11 11L14 14" stroke={`${colors.text}40`} strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
            className="w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-1"
          />
        </div>

        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value)}
          style={{ backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }}
          className="cursor-pointer rounded-xl border px-4 py-2.5 text-sm outline-none"
          aria-label="Sắp xếp sản phẩm"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((category) => (
          <button
            key={category.key}
            type="button"
            onClick={() => setActiveCategory(category.key)}
            style={
              activeCategory === category.key
                ? { background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }
                : { backgroundColor: colors.surface, color: `${colors.text}60`, borderColor: colors.border }
            }
            className="whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200"
          >
            {category.label}
          </button>
        ))}
      </div>

      <p className="mb-5 text-xs" style={{ color: `${colors.text}40` }}>
        {filtered.length} sản phẩm
      </p>

      {!isLoaded ? (
        <StaggerReveal
          baseDelay={0}
          step={50}
          variant="fadeUp"
          className="sf-home-product-grid grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </StaggerReveal>
      ) : filtered.length === 0 ? (
        <div
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          className="rounded-2xl border p-12 text-center sm:p-16"
        >
          <p className="text-base" style={{ color: `${colors.text}40` }}>
            {pageProducts.emptyTitle}
          </p>
          <p className="mx-auto mt-2 max-w-lg text-sm" style={{ color: `${colors.text}35` }}>
            {pageProducts.emptySubtitle}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setActiveCategory("all");
            }}
            style={{ color: colors.primary }}
            className="mt-3 text-sm transition-opacity hover:opacity-70"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <StaggerReveal
          baseDelay={0}
          step={60}
          variant="fadeUp"
          className="sf-home-product-grid grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filtered.map((product, index) => (
            <StaticProductCard key={product.id} product={product} index={index} />
          ))}
        </StaggerReveal>
      )}
    </div>
  );
}
