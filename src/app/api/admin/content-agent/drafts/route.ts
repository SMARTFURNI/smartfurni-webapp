import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin-auth";
import { initDbOnce } from "@/lib/db-init";
import { createPost } from "@/lib/admin-store";
import { dbSaveOneAndWait } from "@/lib/db-store";
import { categoryLabel, evaluateArticle, generateArticleDraft } from "@/lib/content-agent-engine";
import { getContentPlan, updateContentPlanItem } from "@/lib/content-agent-store";
import { getAllProducts } from "@/lib/product-store";
import { getProductFamilyBySlug, getProductsByFamily } from "@/lib/product-families";

const requestSchema = z.object({ planId: z.string().min(1), itemId: z.string().min(1) });

function draftSlug(title: string, itemId: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 52);
  return `${base}-${itemId.slice(-4)}`;
}

function productSlugsForFamily(familySlug: string): string[] {
  const family = getProductFamilyBySlug(familySlug);
  if (!family) return [];
  return getProductsByFamily(getAllProducts(), family.key)
    .filter((product) => product.status === "active")
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.rating - a.rating)
    .slice(0, 3)
    .map((product) => product.slug);
}

export async function POST(req: NextRequest) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await initDbOnce();
  try {
    const { planId, itemId } = requestSchema.parse(await req.json());
    const plan = getContentPlan(planId);
    const item = plan?.items.find((entry) => entry.id === itemId);
    if (!plan || !item) return NextResponse.json({ error: "Không tìm thấy brief" }, { status: 404 });
    if (item.status !== "approved") {
      return NextResponse.json({ error: "Brief phải được duyệt trước khi AI viết bài" }, { status: 409 });
    }

    const article = await generateArticleDraft(plan, item);
    const qa = evaluateArticle(article, item);
    const readTime = Math.max(3, Math.ceil(article.content.trim().split(/\s+/).length / 220));
    const post = createPost({
      slug: draftSlug(article.title, item.id),
      title: article.title,
      excerpt: article.excerpt,
      content: article.content,
      category: article.category,
      categoryLabel: categoryLabel(article.category),
      author: "Đội ngũ Nội dung SmartFurni",
      authorRole: "Bản nháp có hỗ trợ AI — chờ biên tập",
      publishedAt: new Date().toISOString(),
      readTime,
      tags: article.tags,
      featured: false,
      status: "draft",
      funnelStage: item.funnelStage,
      seoClusterRole: item.clusterRole,
      pillarKeyword: plan.pillarKeyword || item.primaryKeyword,
      primaryKeyword: article.primaryKeyword,
      secondaryKeywords: article.secondaryKeywords,
      searchIntent: item.searchIntent,
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      internalLinks: article.internalLinks,
      sources: article.sources,
      reviewerRequired: article.reviewerRequired,
      claimReviewStatus: "pending",
      aiGenerated: true,
      contentPlanId: plan.id,
      contentPlanItemId: item.id,
      productRecommendation: {
        familySlug: plan.productFamilySlug,
        title: article.productBlock.title,
        description: article.productBlock.description,
        productSlugs: productSlugsForFamily(plan.productFamilySlug),
        ctaLabel: article.productBlock.ctaLabel,
        ctaHref: `/products/${plan.productFamilySlug}`,
      },
      articleCta: {
        ...article.articleCta,
        primaryHref: `/products/${plan.productFamilySlug}`,
        secondaryHref: "/contact",
      },
    });

    // createPost updates the in-memory store immediately; wait for PostgreSQL as
    // well so the API never reports success before the draft is durable.
    await dbSaveOneAndWait("posts", { ...post, id: post.slug });
    await updateContentPlanItem(plan.id, item.id, { status: "drafted", postSlug: post.slug, qa });
    return NextResponse.json({ success: true, post, qa }, { status: 201 });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? error.issues.map((issue) => issue.message).join(", ")
      : (error as Error).message;
    return NextResponse.json({ error: message || "Không thể tạo bản nháp" }, { status: 400 });
  }
}
