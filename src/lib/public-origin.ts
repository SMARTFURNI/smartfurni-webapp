const SMARTFURNI_PUBLIC_ORIGIN = "https://www.smartfurni.com.vn";

function normalizedPublicOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getPublicRequestOrigin(request: Request): string {
  for (const configured of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.FRONTEND_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ]) {
    const origin = normalizedPublicOrigin(configured);
    if (origin) return origin;
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedOrigin = normalizedPublicOrigin(forwardedHost);
  if (forwardedOrigin) {
    const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    return `${protocol === "http" ? "http" : "https"}://${new URL(forwardedOrigin).host}`;
  }

  const requestOrigin = normalizedPublicOrigin(new URL(request.url).origin);
  if (requestOrigin) return requestOrigin;

  return SMARTFURNI_PUBLIC_ORIGIN;
}
