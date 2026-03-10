import { notFound } from "next/navigation";
import { getPostBySlug, BLOG_POSTS } from "@/lib/blog-data";
import { getTheme } from "@/lib/theme-store";
import BlogPostClient from "@/components/landing/BlogPostClient";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
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
