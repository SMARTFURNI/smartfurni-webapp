export const SITE_URL = "https://www.smartfurni.com.vn";

export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return new URL(path.startsWith("/") ? path : `/${path}`, SITE_URL).toString();
}

