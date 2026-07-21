import { notFound } from "next/navigation";
import { BLOG_POSTS } from "@/lib/blog-data";
import { getAllPosts, getPostById } from "@/lib/admin-store";
import { initDbOnce } from "@/lib/db-init";
import { getTheme } from "@/lib/theme-store";
import BlogPostClient from "@/components/landing/BlogPostClient";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";
import JsonLd from "@/components/seo/JsonLd";
import { articleSchema, breadcrumbSchema } from "@/lib/seo-schema";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  await initDbOnce();
  const post = getPostById(slug);
  if (!post) return { title: "Không tìm thấy bài viết", robots: { index: false, follow: false } };
  const url = absoluteUrl(`/blog/${post.slug}`);
  const image = post.coverImage ? absoluteUrl(post.coverImage) : undefined;
  const title = post.metaTitle?.trim() || post.title;
  const description = post.metaDescription?.trim() || post.excerpt;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: new Date(post.publishedAt).toISOString(),
      authors: [post.author],
      images: image ? [{ url: image, alt: post.title }] : [],
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : [] },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  await initDbOnce();
  const post = getPostById(slug);
  if (!post || (post.status && post.status !== "published")) notFound();

  const relatedPosts = getAllPosts()
    .filter((p) => (!p.status || p.status === "published") && p.slug !== post.slug && p.category === post.category)
    .slice(0, 3);

  const theme = getTheme();

  return (
    <>
      <JsonLd data={articleSchema(post)} />
      <JsonLd data={breadcrumbSchema([
        { name: "Trang chủ", path: "/" },
        { name: "Blog", path: "/blog" },
        { name: post.title, path: `/blog/${post.slug}` },
      ])} />
      <BlogPostClient post={post} relatedPosts={relatedPosts} theme={theme} />
    </>
  );
}
