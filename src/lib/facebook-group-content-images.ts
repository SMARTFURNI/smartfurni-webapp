import "server-only";

import { queryOne } from "./db";
import {
  FACEBOOK_GROUP_CONTENT_IMAGE_VARIANT_COUNT,
  buildFacebookGroupContentImagePrompt,
  getFacebookGroupProductReferenceImages,
  normalizeFacebookGroupContentImageAspect,
} from "./facebook-group-content-image-business";
import {
  decodeImageDataUrl,
  generateBlogImageVariants,
  getImageGenerationErrorMessage,
} from "./openai-blog-images";
import { storeImageOnGitHub } from "./github-media";

type ImageActor = { id: string; name: string; isAdmin?: boolean };

interface ContentImageContext {
  id: string;
  opening: string;
  body: string;
  cta: string;
  source_code: string | null;
  group_name: string | null;
  group_topic: string | null;
  group_region: string | null;
  product: Record<string, unknown> | string | null;
}

export interface FacebookGroupGeneratedImage {
  id: string;
  dataUrl: string;
  createdAt: string;
}

function boundedText(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}

function parseProduct(value: ContentImageContext["product"]): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return value;
}

async function getContentContext(contentId: string) {
  const context = await queryOne<ContentImageContext>(
    `SELECT content.id, content.opening, content.body, content.cta, content.source_code,
            groups.name AS group_name, groups.topic AS group_topic, groups.region AS group_region,
            products.data AS product
     FROM facebook_group_content_drafts content
     LEFT JOIN facebook_groups groups ON groups.id = content.group_id
     LEFT JOIN crm_products products ON products.id = content.product_id
     WHERE content.id = $1 AND content.deleted_at IS NULL`,
    [contentId],
  );
  if (!context) throw new Error("Không tìm thấy bài viết để tạo ảnh.");
  return context;
}

export async function generateFacebookGroupContentImages(
  contentId: string,
  input: Record<string, unknown>,
  _actor: ImageActor,
): Promise<{
  variants: FacebookGroupGeneratedImage[];
  model: string;
  aspectRatio: string;
  usedProductReferences: boolean;
}> {
  const context = await getContentContext(contentId);
  const product = parseProduct(context.product);
  const aspectRatio = normalizeFacebookGroupContentImageAspect(input.aspectRatio);
  const referenceImageUrls = getFacebookGroupProductReferenceImages(product);
  const opening = boundedText(input.opening, 5000) || context.opening;
  const body = boundedText(input.body, 30_000) || context.body;
  const cta = "cta" in input ? boundedText(input.cta, 5000) : context.cta;
  if (!body) throw new Error("Nội dung chính là bắt buộc trước khi tạo ảnh.");

  try {
    const generated = await generateBlogImageVariants({
      prompt: buildFacebookGroupContentImagePrompt({
        opening,
        body,
        cta,
        groupName: context.group_name || "",
        groupTopic: context.group_topic || "",
        groupRegion: context.group_region || "",
        product,
        additionalBrief: boundedText(input.brief, 1500),
        aspectRatio,
      }),
      aspectRatio,
      referenceImageUrls,
      variantCount: FACEBOOK_GROUP_CONTENT_IMAGE_VARIANT_COUNT,
    });
    return {
      variants: generated.variants,
      model: generated.model,
      aspectRatio,
      usedProductReferences: referenceImageUrls.length > 0,
    };
  } catch (error) {
    console.error("[Facebook Group Content Image] generation failed", error);
    throw new Error(getImageGenerationErrorMessage(error));
  }
}

export async function persistFacebookGroupGeneratedImage(
  contentId: string,
  dataUrl: string,
): Promise<{
  url: string;
  storage: string;
  storageId: string;
  size: number;
  width?: number;
  height?: number;
  format: string;
}> {
  const buffer = decodeImageDataUrl(dataUrl);
  const stored = await storeImageOnGitHub({
    buffer,
    originalName: `${contentId}-facebook-group.webp`,
    folder: "content",
    subfolder: "facebook-group-marketing",
    maxWidth: 1600,
    quality: 84,
  });
  return {
    url: stored.url,
    storage: "github",
    storageId: stored.repositoryPath,
    size: stored.size,
    format: "webp",
  };
}
