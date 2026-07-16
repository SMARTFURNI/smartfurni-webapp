import type { Metadata } from "next";
import { getTheme } from "@/lib/theme-store";
import { BLOG_POSTS, getFeaturedPosts } from "@/lib/blog-data";
import BlogClient from "@/components/landing/BlogClient";
import { absoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog & Tin Tức | SmartFurni",
  description: "Tips giấc ngủ, hướng dẫn sử dụng giường thông minh SmartFurni và cập nhật sản phẩm mới nhất.",
  alternates: { canonical: absoluteUrl("/blog") },
  openGraph: {
    title: "Blog & Tin Tức | SmartFurni",
    description: "Tips giấc ngủ, hướng dẫn sử dụng và cập nhật sản phẩm SmartFurni.",
    type: "website",
    url: absoluteUrl("/blog"),
  },
};

export default function BlogPage() {
  const theme = getTheme();
  const featured = getFeaturedPosts();
  const allPosts = BLOG_POSTS;

  return <BlogClient theme={theme} featured={featured} allPosts={allPosts} />;
}
