export const MAX_LP_FACEBOOK_PIXEL_IDS = 5;

export function parseLpFacebookPixelIds(value: string | null | undefined): string[] {
  if (!value) return [];

  const ids = value
    .split(/[\s,;]+/)
    .map((id) => id.trim())
    .filter(Boolean);

  return Array.from(new Set(ids)).slice(0, MAX_LP_FACEBOOK_PIXEL_IDS);
}

export function getLpFacebookPixelIds(
  content: Record<string, string>,
  fallbackIds: string[] = []
): string[] {
  const configuredIds = parseLpFacebookPixelIds(
    content["tracking_fb_pixel_ids"] || content["tracking_fb_pixel_id"] || ""
  );

  if (configuredIds.length) return configuredIds;
  return Array.from(new Set(fallbackIds.map((id) => id.trim()).filter(Boolean))).slice(0, MAX_LP_FACEBOOK_PIXEL_IDS);
}

function buildFacebookPixelBootstrapScript(pixelIds: string[]): string {
  const ids = Array.from(new Set(pixelIds.map((id) => id.trim()).filter(Boolean))).slice(0, MAX_LP_FACEBOOK_PIXEL_IDS);
  const serializedIds = JSON.stringify(ids);

  return `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
var __lpFacebookPixelIds=${serializedIds};
__lpFacebookPixelIds.forEach(function(pixelId){fbq('init', pixelId);});
window.__FB_PIXEL_IDS=__lpFacebookPixelIds;
window.__FB_PIXEL_ID=__lpFacebookPixelIds[0] || '';
`;
}

export function buildFacebookPixelPageViewScript(pixelIds: string[]): string {
  return `${buildFacebookPixelBootstrapScript(pixelIds)}
fbq('track','PageView');
`;
}

export function buildFacebookPixelThankYouScript(pixelIds: string[]): string {
  return `${buildFacebookPixelBootstrapScript(pixelIds)}
fbq('track','PageView');
fbq('track','Lead');
`;
}
