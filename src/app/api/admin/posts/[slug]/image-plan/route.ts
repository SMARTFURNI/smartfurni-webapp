import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getPostById, updatePost } from "@/lib/admin-store";
import { initDbOnce } from "@/lib/db-init";
import { dbSaveOneAndWait } from "@/lib/db-store";
import { createArticleImagePlan } from "@/lib/blog-image-agent";
import { getProductBySlug } from "@/lib/product-store";
import type { BlogArticleImage } from "@/lib/blog-data";

interface Params { params: Promise<{ slug: string }> }

async function persist(slug: string, patch: Record<string, unknown>) {
  const updated = updatePost(slug, patch);
  if (!updated) return null;
  await dbSaveOneAndWait("posts", { ...updated, id: updated.slug });
  return updated;
}

export async function GET(_req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initDbOnce();
  const { slug } = await params;
  const post = getPostById(slug);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ images: post.articleImages || [], plan: post.articleImagePlan || null });
}

export async function POST(_req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initDbOnce();
  const { slug } = await params;
  const post = getPostById(slug);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const products = (post.productRecommendation?.productSlugs || [])
    .map(getProductBySlug)
    .filter((product): product is NonNullable<typeof product> => Boolean(product))
    .map((product) => ({
      name: product.name,
      slug: product.slug,
      description: product.description,
      imageUrls: [product.coverImage, ...product.images].filter((url): url is string => Boolean(url)).slice(0, 3),
    }));
  const result = createArticleImagePlan(post, products);
  const updated = await persist(slug, { articleImages: result.images, articleImagePlan: result.plan });
  return NextResponse.json({ images: updated?.articleImages || result.images, plan: updated?.articleImagePlan || result.plan });
}

export async function PUT(req: NextRequest, { params }: Params) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initDbOnce();
  const { slug } = await params;
  const body = await req.json() as { images?: BlogArticleImage[] };
  if (!Array.isArray(body.images)) return NextResponse.json({ error: "Danh sách brief không hợp lệ" }, { status: 400 });
  const cleaned = body.images.map((image, order) => ({
    ...image,
    order,
    prompt: String(image.prompt || "").slice(0, 8000),
    alt: String(image.alt || "").slice(0, 300),
    caption: String(image.caption || "").slice(0, 500),
    variants: undefined,
  }));
  const updated = await persist(slug, { articleImages: cleaned });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ images: updated.articleImages || [] });
}
