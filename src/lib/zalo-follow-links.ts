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
