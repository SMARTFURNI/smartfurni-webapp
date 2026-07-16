import { notFound } from "next/navigation";
import { getPostBySlug, BLOG_POSTS } from "@/lib/blog-data";
import { getTheme } from "@/lib/theme-store";
import BlogPostClient from "@/components/landing/BlogPostClient";
import type { Metadata } from "next";
import { absoluteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Không tìm thấy bài viết", robots: { index: false, follow: false } };
  const url = absoluteUrl(`/blog/${post.slug}`);
  const image = post.coverImage ? absoluteUrl(post.coverImage) : undefined;
  return {
    title: `${post.title} | SmartFurni`,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url,
      type: "article",
      publishedTime: new Date(post.publishedAt).toISOString(),
      authors: [post.author],
      images: image ? [{ url: image, alt: post.title }] : [],
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt, images: image ? [image] : [] },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = BLOG_POSTS
    .filter((p) => p.slug !== post.slug && p.category === post.category)
    .slice(0, 3);

  const theme = getTheme();

  return <BlogPostClient post={post} relatedPosts={relatedPosts} theme={theme} />;
}
