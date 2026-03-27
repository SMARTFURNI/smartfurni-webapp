"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CATEGORIES, formatDate, type BlogPost } from "@/lib/blog-data";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import type { SiteTheme } from "@/lib/theme-types";

interface Props {
  post: BlogPost;
  relatedPosts: BlogPost[];
  theme: SiteTheme;
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
    <div className="mt-10 pt-6 border-t border-[#C9A84C]/10">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-[#F5EDD6]/40 font-medium tracking-wider uppercase">Chia sẻ bài viết</span>
        {shareLinks.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2E2800] text-[#F5EDD6]/50 hover:border-[#C9A84C]/40 hover:text-[#C9A84C] transition-all text-xs"
          >
            <span style={{ color: s.color }}>{s.icon}</span>
            {s.label}
          </a>
        ))}
        <button
          onClick={copyLink}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#2E2800] text-[#F5EDD6]/50 hover:border-[#C9A84C]/40 hover:text-[#C9A84C] transition-all text-xs"
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

export default function BlogPostClient({ post, relatedPosts, theme }: Props) {
  const categoryColor = CATEGORIES[post.category].color;

  return (
    <main className="min-h-screen bg-[#0D0B00] text-white">
      <ReadingProgressBar />
      <Navbar theme={theme} />

      {/* Breadcrumb */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-24">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8 flex-wrap">
          <Link href="/" className="hover:text-[#C9A84C] transition-colors">Trang chủ</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-[#C9A84C] transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-gray-400 truncate">{post.title}</span>
        </div>

        {/* Article Header */}
        <article>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span
              className="text-sm px-3 py-1 rounded-full font-medium"
              style={{
                backgroundColor: categoryColor + "20",
                color: categoryColor,
                border: `1px solid ${categoryColor}40`,
              }}
            >
              {post.categoryLabel}
            </span>
            <span className="text-gray-500 text-sm">{post.readTime} phút đọc</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-light text-[#F5EDD6] leading-tight mb-6">
            {post.title}
          </h1>

          <p className="text-[#F5EDD6]/50 text-lg leading-relaxed mb-8 border-l-4 pl-4" style={{ borderColor: categoryColor }}>
            {post.excerpt}
          </p>

          {/* Author & Date */}
          <div className="flex items-center gap-4 py-6 border-y border-[#C9A84C]/10 mb-10">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-black flex-shrink-0" style={{ backgroundColor: categoryColor }}>
              {post.author.charAt(post.author.indexOf(" ") + 1) || post.author.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-[#F5EDD6]">{post.author}</div>
              <div className="text-[#F5EDD6]/40 text-sm">{post.authorRole} · {formatDate(post.publishedAt)}</div>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-invert max-w-none">
            {post.content.split("\n\n").map((block, i) => {
              if (block.startsWith("## ")) {
                return (
                  <h2 key={i} className="text-2xl font-light text-gold-gradient mt-10 mb-4">
                    {block.replace("## ", "")}
                  </h2>
                );
              }
              if (block.startsWith("### ")) {
                return (
                  <h3 key={i} className="text-xl font-semibold text-[#F5EDD6] mt-8 mb-3">
                    {block.replace("### ", "")}
                  </h3>
                );
              }
              if (block.startsWith("| ")) {
                const rows = block.split("\n").filter((r) => r.trim() && !r.match(/^\|[-| :]+\|$/));
                return (
                  <div key={i} className="overflow-x-auto my-6">
                    <table className="w-full border-collapse text-sm">
                      {rows.map((row, ri) => {
                        const cells = row.split("|").filter((c) => c.trim() !== "");
                        return (
                          <tr key={ri} className={ri === 0 ? "bg-[#C9A84C]/10" : ""}>
                            {cells.map((cell, ci) => (
                              <td key={ci} className="border border-[#C9A84C]/20 px-4 py-2 text-gray-300">
                                {cell.trim()}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </table>
                  </div>
                );
              }
              if (block.startsWith("- ")) {
                const items = block.split("\n").filter((l) => l.startsWith("- "));
                return (
                  <ul key={i} className="my-4 space-y-2">
                    {items.map((item, ii) => {
                      const text = item.replace(/^- (\[.\] )?/, "");
                      const isDone = item.includes("[x]");
                      const isTodo = item.includes("[ ]");
                      return (
                        <li key={ii} className={`flex items-start gap-2 ${isDone ? "text-green-400" : isTodo ? "text-gray-400" : "text-gray-300"}`}>
                          <span className="mt-1 flex-shrink-0">{isDone ? "✅" : isTodo ? "⬜" : "•"}</span>
                          <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                        </li>
                      );
                    })}
                  </ul>
                );
              }
              return (
                <p key={i} className="text-[#F5EDD6]/60 leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{
                    __html: block
                      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                      .replace(/\*(.+?)\*/g, '<em class="text-[#C9A84C]">$1</em>')
                  }}
                />
              );
            })}
          </div>

          {/* Tags */}
          <div className="mt-10 pt-6 border-t border-[#C9A84C]/10">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="bg-[#1A1600] border border-[#2E2800] text-[#F5EDD6]/40 px-3 py-1 rounded-full text-sm hover:border-[#C9A84C]/40 hover:text-[#C9A84C] transition-colors cursor-pointer">
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Share buttons */}
          <ShareButtons title={post.title} slug={post.slug} />
        </article>

        {/* CTA */}
        <div className="mt-12 bg-[#1A1600] border border-[#2E2800] rounded-2xl p-6 sm:p-8 text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-6 h-px bg-[#C9A84C]" />
            <span className="text-xs text-[#C9A84C] font-medium tracking-wider uppercase">Trải nghiệm</span>
            <span className="w-6 h-px bg-[#C9A84C]" />
          </div>
          <h3 className="text-xl font-light text-[#F5EDD6] mb-2">Trải nghiệm <span className="text-gold-gradient">SmartFurni</span></h3>
          <p className="text-[#F5EDD6]/40 mb-4 text-sm leading-relaxed">Áp dụng những kiến thức trên với giường thông minh SmartFurni.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link href="/products" className="bg-[#C9A84C] text-black px-6 py-2 rounded-full font-semibold text-sm hover:bg-[#E8C56B] transition-colors">
              Xem sản phẩm
            </Link>
            <Link href="/contact" className="border border-[#C9A84C]/40 text-[#C9A84C] px-6 py-2 rounded-full text-sm hover:border-[#C9A84C] transition-colors">
              Liên hệ tư vấn
            </Link>
          </div>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="mt-12 mb-16">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-6 h-px bg-[#C9A84C]" />
              <h2 className="text-xl font-light text-[#F5EDD6]">Bài viết <span className="text-gold-gradient">liên quan</span></h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {relatedPosts.map((related) => (
                <Link key={related.slug} href={`/blog/${related.slug}`} className="group">
                  <article className="bg-[#1A1600] border border-[#2E2800] rounded-xl p-4 hover:border-[#C9A84C]/40 transition-all">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full mb-2 inline-block"
                      style={{ backgroundColor: CATEGORIES[related.category].color + "15", color: CATEGORIES[related.category].color }}
                    >
                      {related.categoryLabel}
                    </span>
                    <h3 className="font-semibold text-[#F5EDD6] text-sm group-hover:text-[#C9A84C] transition-colors line-clamp-2 mb-1">
                      {related.title}
                    </h3>
                    <p className="text-[#F5EDD6]/30 text-xs">{related.readTime} phút · {formatDate(related.publishedAt)}</p>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
      <Footer theme={theme} variant="minimal" />
    </main>
  );
}
