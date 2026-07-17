import type { Metadata } from "next";
import { getTheme } from "@/lib/theme-store";
import { getAllPosts } from "@/lib/admin-store";
import { initDbOnce } from "@/lib/db-init";
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

export default async function BlogPage() {
  await initDbOnce();
  const theme = getTheme();
  const allPosts = getAllPosts().filter((post) => post.status === "published" || !post.status);
  const featured = allPosts.filter((post) => post.featured).slice(0, 3);

  return <BlogClient theme={theme} featured={featured} allPosts={allPosts} />;
}
