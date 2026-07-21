"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CATEGORIES, formatDate, type BlogPost } from "@/lib/blog-data";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import type { SiteTheme } from "@/lib/theme-types";
import type { Product } from "@/lib/product-store";
import { trackBlogCtaClick, trackDirectBlogProductClick } from "@/lib/blog-attribution";

interface Props {
  post: BlogPost;
  relatedPosts: BlogPost[];
  theme: SiteTheme;
  recommendedProducts: Product[];
}

const FUNNEL_CTA = {
  TOFU: {
    eyebrow: "Khám phá thêm",
    title: "Tiếp tục tìm hiểu giải pháp nghỉ ngơi phù hợp",
    description: "Xem thêm các hướng dẫn và kiến thức thực tế trước khi lựa chọn sản phẩm.",
    primaryLabel: "Đọc thêm bài viết",
    primaryHref: "/blog",
    secondaryLabel: "Xem sản phẩm",
    secondaryHref: "/products",
  },
  MOFU: {
    eyebrow: "Cân nhắc giải pháp",
    title: "So sánh các dòng sản phẩm SmartFurni",
    description: "Khám phá cấu hình, lợi ích và lựa chọn phù hợp với nhu cầu sử dụng thực tế.",
    primaryLabel: "Xem dòng sản phẩm",
    primaryHref: "/products",
    secondaryLabel: "Liên hệ tư vấn",
    secondaryHref: "/contact",
  },
  BOFU: {
    eyebrow: "Sẵn sàng trải nghiệm",
    title: "Nhận tư vấn giải pháp SmartFurni phù hợp",
    description: "Trao đổi nhu cầu và không gian sử dụng để được tư vấn cấu hình phù hợp.",
    primaryLabel: "Liên hệ tư vấn",
    primaryHref: "/contact",
    secondaryLabel: "Xem sản phẩm",
    secondaryHref: "/products",
  },
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatInlineMarkdown(value: string): string {
  return escapeHtml(value)
    .replace(/\[([^\]]+)\]\(((?:\/|https:\/\/)[^)]+)\)/g, '<a href="$2" class="font-medium text-[#856018] underline decoration-[#B88A2B]/35 underline-offset-4 hover:text-[#5E4210]">$1</a>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[#211D18]">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-[#7A5817]">$1</em>');
}

function formatPrice(price: number): string {
  if (!price) return "Liên hệ";
  return new Intl.NumberFormat("vi-VN").format(price) + "đ";
}

function createHeadingId(value: string, index: number): string {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `muc-${index + 1}-${slug || "noi-dung"}`;
}

function removeHeadingNumber(value: string): string {
  return value
    .replace(/^\s*(?:phần\s+\d+[:.)-]?|\d+(?:\.\d+)*[.)-])\s+/i, "")
    .trim();
}

function ProductRecommendationBlock({ post, products }: { post: BlogPost; products: Product[] }) {
  const recommendation = post.productRecommendation;
  if (!recommendation) return null;
  const visibleProducts = products.slice(0, 4);
  return (
    <aside className="my-9 overflow-hidden rounded-3xl border border-[#C9A84C]/30 bg-[linear-gradient(135deg,#192331_0%,#272116_100%)] font-sans shadow-[0_20px_70px_rgba(18,24,32,.22)]">
      <div className="border-b border-[#C9A84C]/15 px-5 py-5 sm:px-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#E6BF55]">SmartFurni gợi ý</p>
        <h2 className="mt-2 text-xl font-semibold text-[#F5EDD6]">{recommendation.title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#F5EDD6]/55">{recommendation.description}</p>
      </div>
      {visibleProducts.length > 0 && (
        <div className="grid grid-cols-2 gap-2 p-2.5 sm:gap-3 sm:p-5">
          {visibleProducts.map((product) => {
            const image = product.coverImage || product.images[0];
            return (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                onClick={() => trackDirectBlogProductClick(post.slug, product)}
                className="group overflow-hidden rounded-2xl border border-white/[.08] bg-black/20 transition hover:-translate-y-0.5 hover:border-[#C9A84C]/40"
              >
                {image && <img src={image} alt={product.name} loading="lazy" className="aspect-square w-full bg-[#0F151E] object-contain p-2" />}
                <div className="p-2.5 sm:p-4">
                  <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-[#F5EDD6] group-hover:text-[#E6BF55] sm:text-sm sm:leading-5">{product.name}</p>
                  <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-[#F5EDD6]/40 sm:mt-2 sm:text-xs sm:leading-5">{product.description}</p>
                  <div className="mt-2.5 flex flex-col gap-1 sm:mt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <span className="text-[11px] font-semibold text-[#E6BF55] sm:text-sm">{formatPrice(product.price)}</span>
                    <span className="text-[10px] text-[#F5EDD6]/55 sm:text-xs">Xem chi tiết →</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <div className="px-4 pb-5 sm:px-5">
        <Link
          href={recommendation.ctaHref}
          onClick={() => trackBlogCtaClick({
            postSlug: post.slug,
            ctaId: "product_recommendation_cta",
            ctaLabel: recommendation.ctaLabel,
            targetPath: recommendation.ctaHref,
          })}
          className="flex w-full items-center justify-center rounded-xl bg-[linear-gradient(110deg,#E4C557,#B98B20)] px-5 py-3 text-sm font-semibold text-[#151005] transition hover:brightness-110"
        >
          {recommendation.ctaLabel} →
        </Link>
      </div>
    </aside>
  );
}

function ArticleCtaBlock({ post }: { post: BlogPost }) {
  const cta = post.articleCta;
  if (!cta) return null;
  return (
    <aside className="my-9 rounded-3xl border border-[#C9A84C]/25 bg-[#1A1600]/90 p-6 text-center sm:p-8">
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#E6BF55]">{cta.eyebrow}</p>
      <h2 className="mt-2 text-xl font-semibold text-[#F5EDD6]">{cta.title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#F5EDD6]/50">{cta.description}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href={cta.primaryHref}
          onClick={() => trackBlogCtaClick({ postSlug: post.slug, ctaId: "article_primary", ctaLabel: cta.primaryLabel, targetPath: cta.primaryHref })}
          className="rounded-full bg-[#C9A84C] px-6 py-2.5 text-sm font-semibold text-black hover:bg-[#E8C56B]"
        >{cta.primaryLabel}</Link>
        {cta.secondaryLabel && cta.secondaryHref && <Link
          href={cta.secondaryHref}
          onClick={() => trackBlogCtaClick({ postSlug: post.slug, ctaId: "article_secondary", ctaLabel: cta.secondaryLabel!, targetPath: cta.secondaryHref! })}
          className="rounded-full border border-[#C9A84C]/40 px-6 py-2.5 text-sm text-[#C9A84C] hover:border-[#C9A84C]"
        >{cta.secondaryLabel}</Link>}
      </div>
    </aside>
  );
}

function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const handleScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop || document.body.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;
      if (scrollHeight > 0) setProgress((scrollTop / scrollHeight) * 100);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-transparent">
      <div
        style={{ width: `${progress}%`, background: "linear-gradient(90deg, #C9A84C, #E8C56B)" }}
        className="h-full transition-[width] duration-100"
      />
    </div>
  );
}

function ShareButtons({ title, slug }: { title: string; slug: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/blog/${slug}` : `/blog/${slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shareLinks = [
    {
      label: "Facebook",
      color: "#1877F2",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: "Twitter/X",
      color: "#000000",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.736-8.851L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    },
  ];

  return (
    <div className="mt-10 border-t border-[#DED6C9] pt-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#6F665B]">Chia sẻ bài viết</span>
        {shareLinks.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full border border-[#D8D0C4] bg-white px-3 py-1.5 text-xs text-[#5E564D] transition-all hover:border-[#B88A2B] hover:text-[#7A5817]"
          >
            <span style={{ color: s.color }}>{s.icon}</span>
            {s.label}
          </a>
        ))}
        <button
          onClick={copyLink}
          className="flex items-center gap-2 rounded-full border border-[#D8D0C4] bg-white px-3 py-1.5 text-xs text-[#5E564D] transition-all hover:border-[#B88A2B] hover:text-[#7A5817]"
        >
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Đã sao chép!
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Sao chép link
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default function BlogPostClient({ post, relatedPosts, theme, recommendedProducts }: Props) {
  const categoryColor = CATEGORIES[post.category].color;
  const funnelCta = FUNNEL_CTA[post.funnelStage || "MOFU"];
  const contentBlocks = post.content.split("\n\n");
  let sectionNumber = 0;
  const articleHeadings = contentBlocks.flatMap((block, blockIndex) => {
    const level = block.startsWith("## ") ? 2 : block.startsWith("### ") ? 3 : null;
    if (!level) return [];
    if (level === 2) sectionNumber += 1;
    const title = block.replace(/^#{2,3}\s+/, "").trim();
    return [{
      id: createHeadingId(title, blockIndex),
      level,
      title: removeHeadingNumber(title) || title,
      sectionNumber,
    }];
  });

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#14110D_0,#14110D_72px,#E5E9ED_72px,#F0EBE2_100%)] font-sans text-[#252B33]">
      <ReadingProgressBar />
      <Navbar theme={theme} />

      <div className="mx-auto max-w-5xl px-0 pb-16 pt-20 sm:px-6 sm:pt-24">
        <div className="mx-auto mb-5 flex max-w-4xl flex-wrap items-center gap-2 px-4 text-sm text-[#746B61] sm:px-0">
          <Link href="/" className="transition-colors hover:text-[#856018]">Trang chủ</Link>
          <span>/</span>
          <Link href="/blog" className="transition-colors hover:text-[#856018]">Tin tức</Link>
          <span>/</span>
          <span className="max-w-[65vw] truncate text-[#4F4840]">{post.title}</span>
        </div>

        <article className="mx-auto max-w-4xl border-y border-[#CDD1D4] bg-[#FCFBF8] px-5 py-8 shadow-[0_22px_70px_rgba(22,30,40,.10)] sm:rounded-3xl sm:border sm:px-10 sm:py-12 md:px-16">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span
              className="rounded-full px-3 py-1 text-sm font-semibold"
              style={{
                backgroundColor: categoryColor + "16",
                color: categoryColor,
                border: `1px solid ${categoryColor}35`,
              }}
            >
              {post.categoryLabel}
            </span>
            <span className="text-sm text-[#746B61]">{post.readTime} phút đọc</span>
          </div>

          <h1 className="mb-6 text-[26px] font-bold leading-[1.2] tracking-[-0.025em] text-[#1E2630] sm:text-[32px] md:text-[38px]">
            {post.title}
          </h1>

          <p className="mb-8 border-l-4 pl-4 text-lg leading-8 text-[#5E564D]" style={{ borderColor: categoryColor }}>
            {post.excerpt}
          </p>

          <div className="mb-8 flex items-center gap-4 border-y border-[#DED6C9] py-5">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-base font-bold text-white" style={{ backgroundColor: categoryColor }}>
              {post.author.charAt(post.author.indexOf(" ") + 1) || post.author.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-[#2C2721]">{post.author}</div>
              <div className="text-sm text-[#756C62]">{post.authorRole} · {formatDate(post.publishedAt)}</div>
            </div>
          </div>

          <nav aria-label="Mục lục bài viết" className="mb-9 rounded-2xl border border-[#C7D0D8] bg-[linear-gradient(135deg,#EDF2F6_0%,#F7F1E5_100%)] p-5 shadow-[0_12px_32px_rgba(30,38,48,.06)] sm:p-6">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1E2A38] text-sm font-bold text-[#E6BF55]">≡</span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#8A651C]">Đọc nhanh</p>
                <h2 className="mt-0.5 text-lg font-bold text-[#202832]">Mục lục bài viết</h2>
              </div>
            </div>
            <ol className="mt-4 space-y-1.5 border-t border-[#C9D0D5] pt-4">
              {articleHeadings.length > 0 ? articleHeadings.map((heading) => (
                <li key={heading.id} className={heading.level === 3 ? "pl-6" : ""}>
                  <a href={`#${heading.id}`} className={`group flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm leading-5 transition hover:bg-white/70 hover:text-[#7A5817] ${heading.level === 2 ? "font-semibold text-[#303A45]" : "text-[#626B73]"}`}>
                    <span className={`mt-0.5 shrink-0 text-[#A77B22] ${heading.level === 3 ? "text-[10px]" : "text-xs font-bold"}`}>
                      {heading.level === 2 ? `${heading.sectionNumber}.` : "•"}
                    </span>
                    <span>{heading.title}</span>
                  </a>
                </li>
              )) : (
                <li>
                  <a href="#noi-dung-bai-viet" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#303A45] transition hover:bg-white/70 hover:text-[#7A5817]">
                    <span className="text-[#A77B22]">1.</span>
                    Đọc nội dung bài viết
                  </a>
                </li>
              )}
            </ol>
          </nav>

          {post.coverImage && (
            <figure className="mb-10 overflow-hidden rounded-2xl bg-[#E8E1D6]">
              <img src={post.coverImage} alt={post.title} className="aspect-[16/9] w-full object-cover" />
            </figure>
          )}

          <div id="noi-dung-bai-viet" className="max-w-none scroll-mt-28 text-[16px] leading-[1.85] text-[#3E4650] sm:text-[17px]">
            {contentBlocks.map((block, i) => {
              if (block.trim() === "[[SMARTFURNI_PRODUCTS]]") {
                return <ProductRecommendationBlock key={i} post={post} products={recommendedProducts} />;
              }
              if (block.trim() === "[[SMARTFURNI_CTA]]") {
                return <ArticleCtaBlock key={i} post={post} />;
              }
              if (block.startsWith("## ")) {
                const title = block.replace("## ", "");
                return (
                  <h2 id={createHeadingId(title, i)} key={i} className="mb-4 mt-11 scroll-mt-28 text-2xl font-semibold leading-snug tracking-[-0.025em] text-[#202832] sm:text-[30px]">
                    {title}
                  </h2>
                );
              }
              if (block.startsWith("### ")) {
                const title = block.replace("### ", "");
                return (
                  <h3 id={createHeadingId(title, i)} key={i} className="mb-3 mt-8 scroll-mt-28 text-xl font-semibold tracking-[-0.015em] text-[#28313C] sm:text-2xl">
                    {title}
                  </h3>
                );
              }
              if (block.startsWith("| ")) {
                const rows = block.split("\n").filter((r) => r.trim() && !r.match(/^\|[-| :]+\|$/));
                const parsedRows = rows.map((row) => row.split("|").filter((cell) => cell.trim() !== ""));
                const [headerRow, ...bodyRows] = parsedRows;
                return (
                  <div key={i} className="my-7 overflow-x-auto rounded-xl border border-[#D8CFC2] bg-white font-sans">
                    <table className="w-full border-collapse text-left text-sm">
                      {headerRow && (
                        <thead className="bg-[#EDE3CF] font-semibold">
                          <tr>
                            {headerRow.map((cell, ci) => (
                              <th key={ci} scope="col" className="border-b border-r border-[#E2DACE] px-4 py-3 text-[#403931] last:border-r-0">
                                {cell.trim()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                      )}
                      <tbody>
                        {bodyRows.map((cells, ri) => (
                          <tr key={ri} className="even:bg-[#FAF7F1]">
                            {cells.map((cell, ci) => (
                              <td key={ci} className="border-b border-r border-[#E2DACE] px-4 py-3 text-[#403931] last:border-r-0">
                                {cell.trim()}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              if (block.startsWith("- ")) {
                const items = block.split("\n").filter((l) => l.startsWith("- "));
                return (
                  <ul key={i} className="my-5 space-y-2.5 pl-1">
                    {items.map((item, ii) => {
                      const text = item.replace(/^- (\[.\] )?/, "");
                      const isDone = item.includes("[x]");
                      const isTodo = item.includes("[ ]");
                      return (
                        <li key={ii} className={`flex items-start gap-3 ${isDone ? "text-[#29724E]" : isTodo ? "text-[#7A7167]" : "text-[#403931]"}`}>
                          <span className="mt-0.5 flex-shrink-0 font-sans text-[#A47920]">{isDone ? "✓" : isTodo ? "○" : "•"}</span>
                          <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(text) }} />
                        </li>
                      );
                    })}
                  </ul>
                );
              }
              return (
                <p key={i} className="mb-5"
                  dangerouslySetInnerHTML={{
                    __html: formatInlineMarkdown(block)
                  }}
                />
              );
            })}
          </div>

          {post.productRecommendation && !post.content.includes("[[SMARTFURNI_PRODUCTS]]") && (
            <ProductRecommendationBlock post={post} products={recommendedProducts} />
          )}

          {(post.reviewer || post.sources?.length) && (
            <section className="mt-10 rounded-2xl border border-[#BFD8C8] bg-[#F1F8F3] p-5 font-sans sm:p-6">
              {post.reviewer && (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DCEFE3] text-[#28724D]">✓</div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[.14em] text-[#28724D]">Đã được kiểm duyệt nội dung</p>
                    <p className="mt-1 text-sm font-semibold text-[#2D3D33]">{post.reviewer}</p>
                    {post.reviewerRole && <p className="text-xs text-[#647168]">{post.reviewerRole}</p>}
                  </div>
                </div>
              )}
              {post.sources && post.sources.length > 0 && (
                <div className={post.reviewer ? "mt-5 border-t border-[#C9DCCF] pt-5" : ""}>
                  <h2 className="text-sm font-semibold text-[#2D3D33]">Nguồn tham khảo</h2>
                  <ol className="mt-3 space-y-2 text-sm text-[#59685E]">
                    {post.sources.map((source, index) => (
                      <li key={`${source.url}-${index}`} className="flex gap-2">
                        <span className="text-[#856018]">{index + 1}.</span>
                        <a href={source.url} target="_blank" rel="noopener noreferrer nofollow" className="break-words hover:text-[#856018] hover:underline">
                          {source.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {(post.category === "suc-khoe" || post.reviewerRequired) && (
                <p className="mt-5 border-t border-[#C9DCCF] pt-4 text-xs leading-5 text-[#647168]">
                  Nội dung chỉ nhằm cung cấp thông tin tham khảo, không thay thế chẩn đoán hoặc tư vấn của người có chuyên môn.
                </p>
              )}
            </section>
          )}

          {post.internalLinks && post.internalLinks.length > 0 && (
            <section className="mt-8 font-sans">
              <h2 className="text-sm font-semibold uppercase tracking-[.14em] text-[#856018]">Đọc thêm trên SmartFurni</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {post.internalLinks.map((link, index) => (
                  <Link key={`${link.href}-${index}`} href={link.href} className="rounded-xl border border-[#D8D0C4] bg-white px-4 py-3 text-sm text-[#544C43] transition-colors hover:border-[#B88A2B] hover:text-[#7A5817]">
                    {link.anchor} →
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Tags */}
          <div className="mt-10 border-t border-[#DED6C9] pt-6 font-sans">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-[#D8D0C4] bg-[#F7F2E9] px-3 py-1 text-sm text-[#6B6258]">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Share buttons */}
          <ShareButtons title={post.title} slug={post.slug} />
        </article>

        {!post.content.includes("[[SMARTFURNI_CTA]]") && <div className="mx-4 mt-10 rounded-2xl border border-[#58451E] bg-[linear-gradient(125deg,#172231,#302718)] p-6 text-center shadow-[0_18px_50px_rgba(47,36,21,.16)] sm:mx-auto sm:max-w-4xl sm:p-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-6 h-px bg-[#C9A84C]" />
            <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">{funnelCta.eyebrow}</span>
            <span className="w-6 h-px bg-[#C9A84C]" />
          </div>
          <h3 className="text-xl font-light text-[#F5EDD6] mb-2">{funnelCta.title}</h3>
          <p className="mb-4 text-sm leading-relaxed text-[#F5EDD6]/65">{funnelCta.description}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href={funnelCta.primaryHref}
              onClick={() => trackBlogCtaClick({ postSlug: post.slug, ctaId: "funnel_primary", ctaLabel: funnelCta.primaryLabel, targetPath: funnelCta.primaryHref })}
              className="bg-[#C9A84C] text-black px-6 py-2 rounded-full font-semibold text-sm hover:bg-[#E8C56B] transition-colors"
            >
              {funnelCta.primaryLabel}
            </Link>
            <Link
              href={funnelCta.secondaryHref}
              onClick={() => trackBlogCtaClick({ postSlug: post.slug, ctaId: "funnel_secondary", ctaLabel: funnelCta.secondaryLabel, targetPath: funnelCta.secondaryHref })}
              className="border border-[#C9A84C]/40 text-[#C9A84C] px-6 py-2 rounded-full text-sm hover:border-[#C9A84C] transition-colors"
            >
              {funnelCta.secondaryLabel}
            </Link>
          </div>
        </div>}

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mx-4 mb-2 mt-12 sm:mx-auto sm:max-w-4xl">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-8 bg-[#A47A25]" />
              <h2 className="text-2xl font-light tracking-[-0.025em] text-[#202832]">Bài viết liên quan</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {relatedPosts.map((related) => (
                <Link key={related.slug} href={`/blog/${related.slug}`} className="group overflow-hidden rounded-2xl border border-[#D8D0C4] bg-[#FFFDF9] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  {related.coverImage && <img src={related.coverImage} alt={`Ảnh minh họa: ${related.title}`} loading="lazy" className="aspect-[16/9] w-full object-cover" />}
                  <article className="p-4">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full mb-2 inline-block"
                      style={{ backgroundColor: CATEGORIES[related.category].color + "15", color: CATEGORIES[related.category].color }}
                    >
                      {related.categoryLabel}
                    </span>
                    <h3 className="mb-2 line-clamp-2 text-base font-semibold leading-snug text-[#28313C] transition-colors group-hover:text-[#856018]">
                      {related.title}
                    </h3>
                    <p className="text-xs text-[#786F64]">{related.readTime} phút · {formatDate(related.publishedAt)}</p>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <Footer theme={theme} variant="full" />
    </main>
  );
}
