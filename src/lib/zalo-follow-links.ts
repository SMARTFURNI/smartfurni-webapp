export function normalizeZaloOaId(value: unknown): string {
  return String(value || "").trim().replace(/\s+/g, "");
}

export function buildZaloOaChatUrl(chatUrl: unknown, oaId: unknown): string {
  const configured = String(chatUrl || "").trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.hostname === "zalo.me") {
        const cleanPath = decodeURIComponent(parsed.pathname).replace(/^\/+/, "").trim();
        parsed.pathname = cleanPath ? `/${cleanPath}` : "/";
      }
      return parsed.toString();
    } catch {
      // Fall through to the normalized OA profile URL.
    }
  }
  const normalizedOaId = normalizeZaloOaId(oaId);
  return normalizedOaId ? `https://zalo.me/${encodeURIComponent(normalizedOaId)}` : "";
}

export function isLikelyMobileZaloVisitor(userAgent: unknown, viewportWidth: unknown): boolean {
  const agent = String(userAgent || "");
  const width = Number(viewportWidth || 0);
  return /Android|iPhone|iPad|iPod|Mobile|IEMobile|Opera Mini/i.test(agent)
    || (width > 0 && width < 768);
}

export function isZaloFollowSuccessAction(action: unknown, interactive: boolean): boolean {
  if (!interactive) return true;
  return new Set(["click_followed", "followed", "follow_success"]).has(
    String(action || "").trim().toLowerCase(),
  );
}
