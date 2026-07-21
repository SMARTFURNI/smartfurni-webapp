const BLOG_ATTRIBUTION_KEY = "_sf_blog_cta_attribution";
const BLOG_ATTRIBUTION_TTL_MS = 30 * 60 * 1000;

export interface BlogCtaAttribution {
  postSlug: string;
  ctaEventId: string;
  ctaId: string;
  ctaLabel: string;
  targetPath: string;
  clickedAt: number;
  expiresAt: number;
}

interface ProductClickInput {
  slug: string;
  name: string;
}

function createEventId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = sessionStorage.getItem("_sf_sid");
    if (existing) return existing;
    const sessionId = createEventId();
    sessionStorage.setItem("_sf_sid", sessionId);
    return sessionId;
  } catch {
    return createEventId();
  }
}

function sendAnalytics(path: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon && navigator.sendBeacon(path, new Blob([body], { type: "application/json" }))) {
    return;
  }
  fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function getActiveBlogCtaAttribution(): BlogCtaAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(BLOG_ATTRIBUTION_KEY);
    if (!raw) return null;
    const attribution = JSON.parse(raw) as BlogCtaAttribution;
    if (!attribution.postSlug || !attribution.ctaEventId || attribution.expiresAt <= Date.now()) {
      sessionStorage.removeItem(BLOG_ATTRIBUTION_KEY);
      return null;
    }
    return attribution;
  } catch {
    sessionStorage.removeItem(BLOG_ATTRIBUTION_KEY);
    return null;
  }
}

export function trackBlogCtaClick(input: {
  postSlug: string;
  ctaId: string;
  ctaLabel: string;
  targetPath: string;
}) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const attribution: BlogCtaAttribution = {
    ...input,
    ctaEventId: createEventId(),
    clickedAt: now,
    expiresAt: now + BLOG_ATTRIBUTION_TTL_MS,
  };
  try {
    sessionStorage.setItem(BLOG_ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // Tracking CTA vẫn hoạt động; chỉ bỏ qua phân bổ phiên khi storage bị chặn.
  }
  sendAnalytics("/api/analytics/blog-cta-click", {
    eventId: attribution.ctaEventId,
    postSlug: attribution.postSlug,
    ctaId: attribution.ctaId,
    ctaLabel: attribution.ctaLabel,
    targetPath: attribution.targetPath,
    sessionId: getSessionId(),
  });
}

export function trackDirectBlogProductClick(postSlug: string, product: ProductClickInput) {
  const targetPath = `/products/${product.slug}`;
  sendAnalytics("/api/analytics/blog-product-click", {
    eventId: createEventId(),
    postSlug,
    productSlug: product.slug,
    productName: product.name,
    targetPath,
    sourceType: "direct",
    sessionId: getSessionId(),
  });
}

export function trackAttributedProductClick(product: ProductClickInput): boolean {
  const attribution = getActiveBlogCtaAttribution();
  if (!attribution) return false;
  const targetPath = `/products/${product.slug}`;
  sendAnalytics("/api/analytics/blog-product-click", {
    eventId: createEventId(),
    postSlug: attribution.postSlug,
    productSlug: product.slug,
    productName: product.name,
    targetPath,
    sourceType: "cta_assisted",
    ctaEventId: attribution.ctaEventId,
    ctaId: attribution.ctaId,
    ctaLabel: attribution.ctaLabel,
    sessionId: getSessionId(),
  });
  return true;
}
