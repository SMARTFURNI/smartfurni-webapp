"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { CATEGORIES, formatDate, type BlogPost, type BlogCategory } from "@/lib/blog-data";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import type { SiteTheme } from "@/lib/theme-types";

interface Props {
  theme: SiteTheme;
  featured: BlogPost[];
  allPosts: BlogPost[];
}

export default function BlogClient({ theme, featured, allPosts }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<BlogCategory | null>(null);

  const filteredPosts = useMemo(() => {
    let posts = allPosts;
    if (activeCategory) {
      posts = posts.filter((p) => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      posts = posts.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.author.toLowerCase().includes(q)
      );
    }
    return posts;
  }, [allPosts, searchQuery, activeCategory]);

  return (
    <main className="min-h-screen bg-[#0D0B00]">
      <Navbar theme={theme} />

      {/* Hero */}
      <section className="pt-28 sm:pt-32 pb-12 sm:pb-16 px-4 sm:px-6 text-center border-b border-[#2E2800]">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-5">
            <span className="w-6 h-px bg-[#C9A84C]" />
            <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">{theme.pageBlog.heroBadge}</span>
            <span className="w-6 h-px bg-[#C9A84C]" />
          </div>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-light text-[#F5EDD6] mb-4 leading-tight"
            dangerouslySetInnerHTML={{ __html: theme.pageBlog.heroTitle }}
          />
          <p className="text-[#F5EDD6]/50 text-base sm:text-lg leading-relaxed mb-8">
            {theme.pageBlog.heroSubtitle}
          </p>

          {/* Search bar */}
          <div className="relative max-w-lg mx-auto">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F5EDD6]/30"
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài viết, chủ đề, tác giả..."
              className="w-full bg-[#1A1600] border border-[#2E2800] rounded-2xl pl-11 pr-10 py-3.5 text-[#F5EDD6] placeholder-[#F5EDD6]/25 focus:outline-none focus:border-[#C9A84C]/60 text-sm transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#F5EDD6]/30 hover:text-[#F5EDD6]/60 transition-colors text-lg leading-none"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

        {/* Featured Posts — only show when no search/filter active */}
        {!searchQuery && !activeCategory && (
          <section className="mb-12 sm:mb-16">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <span className="w-6 h-px bg-[#C9A84C]" />
              <h2 className="text-xl sm:text-2xl font-light text-[#F5EDD6]">
                Bài viết <span className="text-gold-gradient">nổi bật</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
              {featured.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                  <article className="bg-[#1A1600] border border-[#2E2800] rounded-2xl p-5 sm:p-6 h-full hover:border-[#C9A84C]/40 transition-all hover:-translate-y-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{
                          backgroundColor: CATEGORIES[post.category].color + "20",
                          color: CATEGORIES[post.category].color,
                          border: `1px solid ${CATEGORIES[post.category].color}40`,
                        }}
                      >
                        {post.categoryLabel}
                      </span>
                      <span className="text-[#F5EDD6]/30 text-xs">{post.readTime} phút đọc</span>
                    </div>
                    <h3 className="font-semibold text-[#F5EDD6] text-base sm:text-lg mb-2 group-hover:text-[#C9A84C] transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-[#F5EDD6]/40 text-sm line-clamp-3 mb-4 leading-relaxed">{post.excerpt}</p>
                    <div className="flex items-center justify-between text-xs text-[#F5EDD6]/30">
                      <span>{post.author}</span>
                      <span>{formatDate(post.publishedAt)}</span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Categories Filter + All Posts */}
        <section>
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <span className="w-6 h-px bg-[#C9A84C]" />
              <h2 className="text-xl sm:text-2xl font-light text-[#F5EDD6]">
                {searchQuery
                  ? <><span className="text-gold-gradient">Kết quả</span> tìm kiếm</>
                  : activeCategory
                  ? <span className="text-gold-gradient">{CATEGORIES[activeCategory]?.label}</span>
                  : <>Tất cả <span className="text-gold-gradient">bài viết</span></>
                }
              </h2>
            </div>
            <span className="text-[#F5EDD6]/30 text-sm">{filteredPosts.length} bài viết</span>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 sm:gap-3 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 sm:px-4 py-2 rounded-full text-sm font-semibold cursor-pointer whitespace-nowrap flex-shrink-0 transition-all ${
                !activeCategory
                  ? "bg-gradient-to-r from-[#E2C97E] to-[#9A7A2E] text-[#0D0B00]"
                  : "border border-[#C9A84C]/30 text-[#F5EDD6]/50 hover:border-[#C9A84C] hover:text-[#C9A84C]"
              }`}
            >
              Tất cả
            </button>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(activeCategory === key ? null : key as BlogCategory)}
                className={`px-3 sm:px-4 py-2 rounded-full text-sm cursor-pointer whitespace-nowrap flex-shrink-0 transition-all ${
                  activeCategory === key
                    ? "font-semibold"
                    : "border border-[#C9A84C]/30 text-[#F5EDD6]/50 hover:border-[#C9A84C] hover:text-[#C9A84C]"
                }`}
                style={activeCategory === key ? {
                  backgroundColor: cat.color + "25",
                  color: cat.color,
                  border: `1px solid ${cat.color}60`,
                } : {}}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Posts Grid */}
          {filteredPosts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {filteredPosts.map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
                  <article className="bg-[#1A1600] border border-[#2E2800] rounded-xl p-4 sm:p-5 flex gap-4 hover:border-[#C9A84C]/40 transition-all">
                    <div
                      className="w-1 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CATEGORIES[post.category].color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: CATEGORIES[post.category].color + "15",
                            color: CATEGORIES[post.category].color,
                          }}
                        >
                          {post.categoryLabel}
                        </span>
                        <span className="text-[#F5EDD6]/30 text-xs">{post.readTime} phút</span>
                      </div>
                      <h3 className="font-semibold text-[#F5EDD6] mb-1 group-hover:text-[#C9A84C] transition-colors line-clamp-2 text-sm sm:text-base">
                        {post.title}
                      </h3>
                      <p className="text-[#F5EDD6]/40 text-sm line-clamp-2 mb-3 leading-relaxed">{post.excerpt}</p>
                      <div className="flex items-center justify-between text-xs text-[#F5EDD6]/30">
                        <span className="truncate mr-2">{post.author} · {post.authorRole}</span>
                        <span className="flex-shrink-0">{formatDate(post.publishedAt)}</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">🔍</p>
              <p className="text-[#F5EDD6]/50 text-lg font-light mb-2">Không tìm thấy bài viết</p>
              <p className="text-[#F5EDD6]/30 text-sm mb-6">Thử tìm kiếm với từ khóa khác hoặc xem tất cả bài viết</p>
              <button
                onClick={() => { setSearchQuery(""); setActiveCategory(null); }}
                style={{ borderColor: "#C9A84C", color: "#C9A84C" }}
                className="border px-6 py-2.5 rounded-full text-sm hover:opacity-70 transition-opacity"
              >
                Xem tất cả bài viết
              </button>
            </div>
          )}
        </section>

        {/* Newsletter CTA */}
        <section className="mt-12 sm:mt-16 bg-[#1A1600] border border-[#2E2800] rounded-2xl p-6 sm:p-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#C9A84C]" />
            <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">Newsletter</span>
            <span className="w-6 h-px bg-[#C9A84C]" />
          </div>
          <h3 className="text-xl sm:text-2xl font-light text-[#F5EDD6] mb-2">
            Nhận bài viết <span className="text-gold-gradient">mới nhất</span>
          </h3>
          <p className="text-[#F5EDD6]/40 mb-5 sm:mb-6 text-sm sm:text-base leading-relaxed">
            Đăng ký để nhận tips giấc ngủ và cập nhật sản phẩm mỗi tuần.
          </p>
          <div className="flex flex-col sm:flex-row max-w-md mx-auto gap-3">
            <input
              type="email"
              placeholder="Email của bạn"
              className="flex-1 bg-[#0D0B00] border border-[#2E2800] rounded-full px-4 py-3 text-[#F5EDD6] placeholder-[#F5EDD6]/20 focus:outline-none focus:border-[#C9A84C] text-sm"
            />
            <button className="bg-gradient-to-r from-[#E2C97E] to-[#9A7A2E] text-[#0D0B00] px-6 py-3 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap">
              Đăng ký
            </button>
          </div>
        </section>
      </div>

      <Footer theme={theme} variant="full" />
    </main>
  );
}
