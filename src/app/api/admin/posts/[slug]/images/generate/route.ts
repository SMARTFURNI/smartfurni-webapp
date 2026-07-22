import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getPostById, updatePost } from "@/lib/admin-store";
import { initDbOnce } from "@/lib/db-init";
import { dbSaveOneAndWait } from "@/lib/db-store";
import { generateBlogImageVariants } from "@/lib/openai-blog-images";
import type { BlogArticleImage } from "@/lib/blog-data";

interface Params { params: Promise<{ slug: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initDbOnce();
  const { slug } = await params;
  const body = await req.json() as { image?: BlogArticleImage };
  const post = getPostById(slug);
  const requested = body.image;
  if (!post || !requested?.id) return NextResponse.json({ error: "Không tìm thấy brief ảnh" }, { status: 404 });
  const current = (post.articleImages || []).find((image) => image.id === requested.id);
  if (!current) return NextResponse.json({ error: "Brief ảnh không tồn tại" }, { status: 404 });
  const regenerationCount = current.status === "review" || current.status === "approved"
    ? (current.regenerationCount || 0) + 1
    : current.regenerationCount || 0;
  if (regenerationCount > 2) return NextResponse.json({ error: "Ảnh này đã đạt giới hạn 2 lần tạo lại" }, { status: 429 });

  try {
    const generated = await generateBlogImageVariants({
      prompt: requested.prompt || current.prompt,
      aspectRatio: current.aspectRatio,
      referenceImageUrls: current.referenceImageUrls,
    });
    const storedImage: BlogArticleImage = {
      ...current,
      prompt: requested.prompt || current.prompt,
      alt: requested.alt || current.alt,
      caption: requested.caption || current.caption,
      status: "review",
      model: generated.model,
      regenerationCount,
      error: undefined,
      variants: undefined,
    };
    const images = (post.articleImages || []).map((image) => image.id === current.id ? storedImage : image);
    const updated = updatePost(slug, { articleImages: images });
    if (updated) await dbSaveOneAndWait("posts", { ...updated, id: updated.slug });
    return NextResponse.json({ image: { ...storedImage, variants: generated.variants } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tạo ảnh";
    const failed = { ...current, status: "failed" as const, error: message, variants: undefined };
    const images = (post.articleImages || []).map((image) => image.id === current.id ? failed : image);
    const updated = updatePost(slug, { articleImages: images });
    if (updated) await dbSaveOneAndWait("posts", { ...updated, id: updated.slug });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
