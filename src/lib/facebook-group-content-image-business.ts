export type FacebookGroupContentImageAspect = "4:3" | "3:2" | "16:9";
export const FACEBOOK_GROUP_CONTENT_IMAGE_VARIANT_COUNT = 1 as const;

export interface FacebookGroupContentImagePromptInput {
  opening: string;
  body: string;
  cta?: string;
  groupName?: string;
  groupTopic?: string;
  groupRegion?: string;
  product: Record<string, unknown>;
  additionalBrief?: string;
  aspectRatio?: FacebookGroupContentImageAspect;
}

const PRODUCT_IMAGE_FIELDS = ["imageUrl", "imageSpec", "imageAngle1", "imageAngle2", "imageScene"];

export function normalizeFacebookGroupContentImageAspect(
  value: unknown,
): FacebookGroupContentImageAspect {
  return value === "3:2" || value === "16:9" ? value : "4:3";
}

export function getFacebookGroupProductReferenceImages(product: Record<string, unknown>): string[] {
  return PRODUCT_IMAGE_FIELDS
    .map(field => String(product[field] || "").trim())
    .filter((url, index, urls) => Boolean(url) && urls.indexOf(url) === index)
    .slice(0, 3);
}

function compact(value: unknown, max: number) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function buildFacebookGroupContentImagePrompt(
  input: FacebookGroupContentImagePromptInput,
): string {
  const aspectRatio = normalizeFacebookGroupContentImageAspect(input.aspectRatio);
  const product = {
    name: compact(input.product.name, 300),
    sku: compact(input.product.sku, 120),
    category: compact(input.product.category, 120),
    description: compact(input.product.description, 2500),
    specs: input.product.specs && typeof input.product.specs === "object"
      ? input.product.specs
      : {},
  };

  return `Create one polished, photorealistic editorial image for a Vietnamese Facebook Group post.

Purpose and audience:
- Group: ${compact(input.groupName, 300) || "Facebook community"}
- Topic: ${compact(input.groupTopic, 200) || "home and living"}
- Region: ${compact(input.groupRegion, 200) || "Vietnam"}
- Post opening: ${compact(input.opening, 1200)}
- Post body: ${compact(input.body, 6000)}
- CTA context: ${compact(input.cta, 1000) || "none"}

Authoritative CRM product data:
${JSON.stringify(product)}

Creative direction:
- Aspect ratio: ${aspectRatio}.
- Show a believable Vietnamese home or apartment setting that supports the article's main idea.
- If product reference images are attached, preserve the recognizable product geometry, materials, colors and proportions.
- Keep the scene natural, useful and community-oriented rather than looking like a hard-sell advertisement.
- Do not invent product functions, accessories, specifications or certifications.
- Do not add text, captions, prices, phone numbers, logos, watermarks, badges, UI elements or Facebook branding inside the image.
- Do not depict unsafe product use or misleading before/after claims.
- Additional direction from the editor: ${compact(input.additionalBrief, 1500) || "none"}.

Return only the image.`;
}
