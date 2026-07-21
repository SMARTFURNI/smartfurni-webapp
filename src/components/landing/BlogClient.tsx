"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, formatDate, type BlogCategory, type BlogPost } from "@/lib/blog-data";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import type { SiteTheme } from "@/lib/theme-types";
import { ScrollReveal } from "./ScrollReveal";

interface Props {
  theme: SiteTheme;
  featured: BlogPost[];
  allPosts: BlogPost[];
}

const TOPIC_META: Record<BlogCategory, { icon: string; description: string; accent: string; tint: string }> = {
  "tips-giac-ngu": {
    icon: "☾",
    description: "Thói quen, tư thế và kiến thức giúp nghỉ ngơi tốt hơn.",
    accent: "#2F7155",
    tint: "#E8F2EC",
  },
  "huong-dan-su-dung": {
    icon: "⌁",
    description: "Kết nối, điều khiển và sử dụng sản phẩm SmartFurni.",
    accent: "#35669A",
    tint: "#E9F0F8",
  },
  "cap-nhat-san-pham": {
    icon: "◇",
    description: "Sản phẩm, công nghệ và những cập nhật mới từ SmartFurni.",
    accent: "#8A6418",
    tint: "#F7EFD9",
  },
  "suc-khoe": {
    icon: "+",
    description: "Thông tin tham khảo về sức khỏe và chất lượng giấc ngủ.",
    accent: "#A64D70",
    tint: "#F8EAF0",
  },
};

function PostImage({ post, className = "" }: { post: BlogPost; className?: string }) {
  const topic = TOPIC_META[post.category];
  if (post.coverImage) {
    return (
      <img
        src={post.coverImage}
        alt={post.title}
        loading="lazy"
        decoding="async"
        className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025] ${className}`}
      />
    );
  }
  return (
    <div className={`flex h-full w-full items-center justify-center ${className}`} style={{ background: `linear-gradient(145deg, ${topic.tint}, #FDFBF6)` }}>
      <div className="text-center">
        <div className="text-5xl" style={{ color: topic.accent }}>{topic.icon}</div>
        <p className="mt-2 text-xs font-bold uppercase tracking-[.16em]" style={{ color: topic.accent }}>{post.categoryLabel}</p>
      </div>
    </div>
  );
}

function CategoryLabel({ post }: { post: BlogPost }) {
  const topic = TOPIC_META[post.category];
  return (
    <span className="text-[11px] font-bold uppercase tracking-[.12em]" style={{ color: topic.accent }}>
      {post.categoryLabel}
    </span>
  );
}

export default function BlogClient({ theme, featured, allPosts }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<BlogCategory | null>(null);

  const filteredPosts = useMemo(() => {
    let posts = allPosts;
    if (activeCategory) posts = posts.filter((post) => post.category === activeCategory);
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLocaleLowerCase("vi");
      posts = posts.filter((post) =>
        post.title.toLocaleLowerCase("vi").includes(query) ||
        post.excerpt.toLocaleLowerCase("vi").includes(query) ||
        post.tags.some((tag) => tag.toLocaleLowerCase("vi").includes(query)) ||
        post.author.toLocaleLowerCase("vi").includes(query)
      );
    }
    return posts;
  }, [activeCategory, allPosts, searchQuery]);

  const topicCounts = useMemo(() => Object.keys(CATEGORIES).reduce((result, key) => {
    const category = key as BlogCategory;
    result[category] = allPosts.filter((post) => post.category === category).length;
    return result;
  }, {} as Record<BlogCategory, number>), [allPosts]);

  const leadPost = featured[0] || allPosts[0];
  const secondaryFeatured = (featured.length > 1 ? featured.slice(1, 3) : allPosts.filter((post) => post.slug !== leadPost?.slug).slice(0, 2));

  function chooseCategory(category: BlogCategory | null) {
    setActiveCategory(category);
    setSearchQuery("");
    window.requestAnimationFrame(() => document.getElementById("danh-sach-bai-viet")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <main className="min-h-screen bg-[#F5F1E8] text-[#28231D]">
      <Navbar theme={theme} />

      <section className="border-b border-[#D8D0C1] bg-[linear-gradient(180deg,#14110D_0,#14110D_72px,#FCFAF5_72px,#F2EBDD_100%)] px-4 pb-10 pt-28 sm:px-6 sm:pb-14 sm:pt-32">
        <ScrollReveal variant="fadeUp" delay={0}>
          <div className="mx-auto max-w-6xl text-center">
            <div className="mx-auto mb-5 flex w-fit items-center gap-3 border-y border-[#A78336]/30 py-2">
              <span className="text-[11px] font-bold uppercase tracking-[.24em] text-[#8A6418]">{theme.pageBlog.heroBadge}</span>
            </div>
            <h1
              className="mx-auto max-w-4xl font-[Georgia,serif] text-4xl leading-[1.08] text-[#201B16] sm:text-5xl md:text-6xl"
              dangerouslySetInnerHTML={{ __html: theme.pageBlog.heroTitle }}
            />
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#665E54] sm:text-lg">{theme.pageBlog.heroSubtitle}</p>

            <div className="relative mx-auto mt-8 max-w-xl text-left">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#82776A]" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={theme.pageBlog.searchPlaceholder}
                className="w-full rounded-full border border-[#CFC5B4] bg-white py-4 pl-12 pr-5 text-sm text-[#28231D] shadow-[0_8px_30px_rgba(67,51,28,.07)] outline-none placeholder:text-[#91887C] focus:border-[#9A772D] focus:ring-4 focus:ring-[#C9A84C]/10"
              />
            </div>
          </div>
        </ScrollReveal>
      </section>

      <section id="chuyen-muc" className="scroll-mt-24 border-b border-[#D8D0C1] bg-[#FFFDF9] px-4 py-8 sm:px-6 sm:py-10" aria-labelledby="blog-topics-heading">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#967129]">Khám phá nội dung</p>
              <h2 id="blog-topics-heading" className="mt-1 font-[Georgia,serif] text-2xl text-[#28231D] sm:text-3xl">Chuyên mục dành cho bạn</h2>
            </div>
            <button type="button" onClick={() => chooseCategory(null)} className="hidden text-sm font-semibold text-[#8A6418] hover:underline sm:block">Xem tất cả →</button>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {(Object.keys(CATEGORIES) as BlogCategory[]).map((key) => {
              const category = CATEGORIES[key];
              const topic = TOPIC_META[key];
              const active = activeCategory === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => chooseCategory(active ? null : key)}
                  aria-pressed={active}
                  className={`rounded-2xl border p-4 text-left transition-all sm:p-5 ${active ? "-translate-y-0.5 shadow-[0_10px_30px_rgba(64,48,26,.12)]" : "border-[#DDD5C8] bg-white hover:-translate-y-0.5 hover:border-[#B9A77F]"}`}
                  style={active ? { borderColor: topic.accent, backgroundColor: topic.tint } : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full text-xl" style={{ color: topic.accent, backgroundColor: topic.tint }}>{topic.icon}</span>
                    <span className="text-xs font-semibold text-[#887F73]">{topicCounts[key]} bài</span>
                  </div>
                  <h3 className="mt-4 text-sm font-bold leading-5 text-[#302A24] sm:text-base">{category.label}</h3>
                  <p className="mt-2 hidden text-xs leading-5 text-[#746B60] sm:block">{topic.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        {!searchQuery && !activeCategory && leadPost && (
          <section className="mb-14 border-b border-[#D8D0C1] pb-14 sm:mb-16 sm:pb-16">
            <div className="mb-6 flex items-center justify-between border-b-2 border-[#2D2822] pb-3">
              <h2 className="font-[Georgia,serif] text-2xl text-[#28231D] sm:text-3xl">{theme.pageBlog.featuredTitle}</h2>
              <span className="text-xs font-semibold uppercase tracking-[.14em] text-[#887D70]">Ban biên tập lựa chọn</span>
            </div>
            <div className="grid gap-7 lg:grid-cols-[1.65fr_1fr]">
              <Link href={`/blog/${leadPost.slug}`} className="group grid overflow-hidden rounded-2xl border border-[#D8D0C1] bg-white shadow-[0_16px_45px_rgba(70,52,28,.08)] sm:grid-cols-[1.2fr_1fr] lg:grid-cols-1">
                <div className="aspect-[16/10] overflow-hidden bg-[#EEE8DE] lg:aspect-[16/8.5]"><PostImage post={leadPost} /></div>
                <div className="p-5 sm:p-7">
                  <div className="flex items-center gap-3"><CategoryLabel post={leadPost} /><span className="text-xs text-[#8A8176]">{leadPost.readTime} phút đọc</span></div>
                  <h3 className="mt-3 font-[Georgia,serif] text-2xl leading-tight text-[#201B16] group-hover:text-[#8A6418] sm:text-3xl">{leadPost.title}</h3>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#665E54]">{leadPost.excerpt}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-[#E7E1D8] pt-4 text-xs text-[#81776B]">
                    <span>{leadPost.author}</span><span>{formatDate(leadPost.publishedAt)}</span>
                  </div>
                </div>
              </Link>

              <div className="divide-y divide-[#D8D0C1] border-y border-[#D8D0C1]">
                {secondaryFeatured.map((post) => (
                  <Link key={post.slug} href={`/blog/${post.slug}`} className="group grid grid-cols-[116px_1fr] gap-4 py-5 first:pt-0 lg:grid-cols-1 lg:py-6 lg:first:pt-0">
                    <div className="aspect-[4/3] overflow-hidden rounded-xl bg-[#EEE8DE] lg:aspect-[16/8]"><PostImage post={post} /></div>
                    <div>
                      <CategoryLabel post={post} />
                      <h3 className="mt-2 line-clamp-3 font-[Georgia,serif] text-lg font-semibold leading-snug text-[#28231D] group-hover:text-[#8A6418] lg:text-xl">{post.title}</h3>
                      <p className="mt-2 hidden line-clamp-2 text-sm leading-6 text-[#746B60] lg:block">{post.excerpt}</p>
                      <p className="mt-3 text-xs text-[#8A8176]">{formatDate(post.publishedAt)} · {post.readTime} phút</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="danh-sach-bai-viet" className="scroll-mt-28">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b-2 border-[#2D2822] pb-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#967129]">Thư viện kiến thức</p>
              <h2 className="mt-1 font-[Georgia,serif] text-2xl text-[#28231D] sm:text-3xl">
                {searchQuery ? "Kết quả tìm kiếm" : activeCategory ? CATEGORIES[activeCategory].label : theme.pageBlog.allPostsTitle}
              </h2>
            </div>
            <span className="text-sm text-[#756C61]">{filteredPosts.length} bài viết</span>
          </div>

          <div className="mb-7 flex gap-2 overflow-x-auto pb-2 scrollbar-hide" aria-label="Lọc bài viết theo chuyên mục">
            <button type="button" onClick={() => chooseCategory(null)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${!activeCategory ? "bg-[#28231D] text-white" : "border border-[#CFC6B8] bg-white text-[#5F574D] hover:border-[#927230]"}`}>Tất cả</button>
            {(Object.keys(CATEGORIES) as BlogCategory[]).map((key) => (
              <button type="button" key={key} onClick={() => chooseCategory(key)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${activeCategory === key ? "text-white" : "border border-[#CFC6B8] bg-white text-[#5F574D] hover:border-[#927230]"}`} style={activeCategory === key ? { backgroundColor: TOPIC_META[key].accent } : undefined}>{CATEGORIES[key].label}</button>
            ))}
          </div>

          {filteredPosts.length > 0 ? (
            <div className="grid gap-x-7 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group border-b border-[#D8D0C1] pb-7">
                  <article>
                    <div className="aspect-[16/10] overflow-hidden rounded-xl border border-[#DDD5C9] bg-[#EEE8DE]"><PostImage post={post} /></div>
                    <div className="mt-4 flex items-center gap-3"><CategoryLabel post={post} /><span className="text-xs text-[#8A8176]">{post.readTime} phút</span></div>
                    <h3 className="mt-2 line-clamp-3 font-[Georgia,serif] text-xl font-semibold leading-snug text-[#28231D] group-hover:text-[#8A6418]">{post.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#6E655A]">{post.excerpt}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-[#877D71]"><span className="truncate pr-3">{post.author}</span><span className="shrink-0">{formatDate(post.publishedAt)}</span></div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#D8D0C1] bg-white py-16 text-center">
              <p className="text-4xl">⌕</p>
              <p className="mt-3 font-[Georgia,serif] text-xl text-[#28231D]">Không tìm thấy bài viết</p>
              <p className="mt-2 text-sm text-[#756C61]">Hãy thử từ khóa khác hoặc mở lại toàn bộ thư viện.</p>
              <button type="button" onClick={() => { setSearchQuery(""); setActiveCategory(null); }} className="mt-5 rounded-full bg-[#28231D] px-6 py-2.5 text-sm font-semibold text-white">Xem tất cả bài viết</button>
            </div>
          )}
        </section>

        <section className="mt-14 overflow-hidden rounded-3xl bg-[linear-gradient(120deg,#182334,#302719)] p-7 text-center text-white shadow-[0_18px_50px_rgba(49,38,23,.14)] sm:p-10">
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#E6C761]">Bản tin SmartFurni</p>
          <h3 className="mt-3 font-[Georgia,serif] text-2xl sm:text-3xl">{theme.pageBlog.newsletterTitle}</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/65 sm:text-base">{theme.pageBlog.newsletterSubtitle}</p>
          <div className="mx-auto mt-6 flex max-w-lg flex-col gap-3 sm:flex-row">
            <input type="email" placeholder="Email của bạn" className="min-w-0 flex-1 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm text-white outline-none placeholder:text-white/45 focus:border-[#E6C761]" />
            <button type="button" className="rounded-full bg-[linear-gradient(110deg,#E6C761,#B98A22)] px-7 py-3 text-sm font-bold text-[#1A150B]">Đăng ký nhận tin</button>
          </div>
        </section>
      </div>

      <Footer theme={theme} variant="full" />
    </main>
  );
}
