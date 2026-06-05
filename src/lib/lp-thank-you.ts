const TRACKING_QUERY_KEYS = new Set([
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "ttclid",
  "msclkid",
]);

export function buildLpThankYouUrl(sourceSlug: string, extraParams: Record<string, string | number | null | undefined> = {}): string {
  const params = new URLSearchParams();
  const normalizedSource = sourceSlug.trim();

  if (normalizedSource) params.set("source", normalizedSource);

  if (typeof window !== "undefined") {
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.forEach((value, key) => {
      if (key.startsWith("utm_") || TRACKING_QUERY_KEYS.has(key)) {
        params.set(key, value);
      }
    });
  }

  Object.entries(extraParams).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    params.set(key, String(value));
  });

  const query = params.toString();
  return `/lp/thank-you${query ? `?${query}` : ""}`;
}

export function redirectToLpThankYou(sourceSlug: string, extraParams: Record<string, string | number | null | undefined> = {}): void {
  if (typeof window === "undefined") return;
  window.location.assign(buildLpThankYouUrl(sourceSlug, extraParams));
}
