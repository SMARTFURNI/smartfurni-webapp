const TRACKABLE_LINK_PATTERN = /https?:\/\/[^\s]+|(?<![\w@.-])(?:www\.)?smartfurni\.com\.vn(?:\/[^\s]*)?/gi;

function splitTrailingPunctuation(raw: string): { value: string; trailing: string } {
  const trailing = raw.match(/[\]),.;!?]+$/)?.[0] || "";
  return {
    value: trailing ? raw.slice(0, -trailing.length) : raw,
    trailing,
  };
}

function normalizeDestination(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function isTrackingRedirect(value: string, clickBaseUrl: string): boolean {
  if (value.startsWith(clickBaseUrl)) return true;
  try {
    const url = new URL(value);
    return url.pathname === "/api/crm/automation/reports/email-click";
  } catch {
    return false;
  }
}

export function rewriteTrackedLinks(body: string, clickBaseUrl: string): string {
  if (!body || !clickBaseUrl) return body;
  return body.replace(TRACKABLE_LINK_PATTERN, raw => {
    const { value, trailing } = splitTrailingPunctuation(raw);
    const destination = normalizeDestination(value);
    if (isTrackingRedirect(destination, clickBaseUrl)) return raw;
    return `${clickBaseUrl}${encodeURIComponent(destination)}${trailing}`;
  });
}

export function hasTrackableLinks(body: string): boolean {
  if (!body) return false;
  TRACKABLE_LINK_PATTERN.lastIndex = 0;
  return TRACKABLE_LINK_PATTERN.test(body);
}
