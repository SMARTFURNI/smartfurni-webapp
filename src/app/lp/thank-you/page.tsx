import type { Metadata } from "next";
import { query } from "@/lib/db";
import { buildFacebookPixelThankYouScript, getLpFacebookPixelIds } from "@/lib/lp-facebook-pixel";
import ThankYouClient from "./ThankYouClient";
import LpEditPasswordGate from "@/components/lp/LpEditPasswordGate";
import { hasLandingPageEditCookie, hasLandingPageEditPassword } from "@/lib/lp-edit-auth";

export const dynamic = "force-dynamic";

const DEFAULT_SMF12_PU_FB_PIXEL_IDS = ["1018174204502230"];
const STATIC_SLUGS = new Set(["sofa-giuong", "gsf150", "doi-tac-showroom-nem", "smf12"]);
const THANK_YOU_SLUG = "thank-you";
const THANK_YOU_BASE_SLUG = "smf12";

export const metadata: Metadata = {
  title: "Cảm ơn Quý Khách đã đặt hàng thành công — SmartFurni",
  description: "SmartFurni đã nhận đơn hàng của Quý Khách và sẽ liên hệ xác nhận trong thời gian sớm nhất.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Props = {
  searchParams?: SearchParams;
};

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 255);
}

function inferParentSlug(slug: string): string {
  if (slug === "smf12" || slug.startsWith("smf12-")) return "smf12";
  if (slug === "gsf150" || slug.startsWith("gsf150-")) return "gsf150";
  if (slug === "doi-tac-showroom-nem" || slug.startsWith("doi-tac-showroom-nem-")) return "doi-tac-showroom-nem";
  return "sofa-giuong";
}

async function getLpContent(slug: string): Promise<Record<string, string>> {
  if (!slug) return {};

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS lp_content (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) NOT NULL,
        block_key VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (slug, block_key)
      )
    `);

    const rows = await query<{ block_key: string; content: string }>(
      `SELECT block_key, content FROM lp_content WHERE slug = $1`,
      [slug]
    );

    const result: Record<string, string> = {};
    for (const row of rows) result[row.block_key] = row.content;
    return result;
  } catch (error) {
    console.error("thank-you getLpContent error:", error);
    return {};
  }
}

async function getParentSlugFromDb(slug: string): Promise<string | null> {
  if (!slug || STATIC_SLUGS.has(slug)) return null;

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS lp_pages (
        id SERIAL PRIMARY KEY,
        slug VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT DEFAULT '',
        status VARCHAR(50) DEFAULT 'draft',
        custom_domain VARCHAR(255),
        parent_slug VARCHAR(255) DEFAULT NULL,
        created_at DATE DEFAULT CURRENT_DATE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`ALTER TABLE lp_pages ADD COLUMN IF NOT EXISTS parent_slug VARCHAR(255) DEFAULT NULL`);

    const rows = await query<{ parent_slug: string | null }>(
      `SELECT parent_slug FROM lp_pages WHERE slug = $1`,
      [slug]
    );
    return rows[0]?.parent_slug || null;
  } catch (error) {
    console.error("thank-you getParentSlugFromDb error:", error);
    return null;
  }
}

async function getMergedTrackingContent(sourceSlug: string): Promise<Record<string, string>> {
  if (!sourceSlug) return {};

  const parentSlug = (await getParentSlugFromDb(sourceSlug)) || inferParentSlug(sourceSlug);
  const parentContent = parentSlug && parentSlug !== sourceSlug ? await getLpContent(parentSlug) : {};
  const sourceContent = await getLpContent(sourceSlug);
  return { ...parentContent, ...sourceContent };
}

async function getThankYouDisplayContent(): Promise<Record<string, string>> {
  const baseContent = await getLpContent(THANK_YOU_BASE_SLUG);
  const thankYouContent = await getLpContent(THANK_YOU_SLUG);
  return { ...baseContent, ...thankYouContent };
}

function buildGoogleAdsScripts(googleAdsId: string, googleAdsLabel: string): string {
  const safeGoogleAdsId = JSON.stringify(googleAdsId);
  const safeGoogleAdsLabel = JSON.stringify(googleAdsLabel);

  return `
window.dataLayer=window.dataLayer||[];
function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());
gtag('config',${safeGoogleAdsId});
window.__GOOGLE_ADS_ID=${safeGoogleAdsId};
window.__GOOGLE_ADS_LABEL=${safeGoogleAdsLabel};
${googleAdsLabel ? `gtag('event','conversion',{send_to:${JSON.stringify(`${googleAdsId}/${googleAdsLabel}`)},value:1.0,currency:'VND'});` : ""}
`;
}

function buildGoogleTagManagerScript(gtmId: string): string {
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer',${JSON.stringify(gtmId)});`;
}

export default async function ThankYouPage({ searchParams }: Props) {
  const params = searchParams ? await searchParams : {};
  const sourceSlug = normalizeSlug(firstParam(params.source || params.slug || params.lp));
  const trackingContent = await getMergedTrackingContent(sourceSlug);
  const displayContent = await getThankYouDisplayContent();
  const [isEditor, hasEditPassword] = await Promise.all([
    hasLandingPageEditCookie(THANK_YOU_SLUG),
    hasLandingPageEditPassword(THANK_YOU_SLUG),
  ]);

  const fbPixelIds = getLpFacebookPixelIds(
    trackingContent,
    sourceSlug === "smf12-pu" ? DEFAULT_SMF12_PU_FB_PIXEL_IDS : []
  );
  const googleAdsId = trackingContent["tracking_google_ads_id"] || "";
  const googleAdsLabel = trackingContent["tracking_google_ads_label"] || "";
  const gtmId = trackingContent["tracking_gtm_id"] || "";
  const sourcePath = sourceSlug ? `/lp/${sourceSlug}` : "/lp/smf12";

  return (
    <>
      {fbPixelIds.length > 0 && (
        <script
          dangerouslySetInnerHTML={{
            __html: buildFacebookPixelThankYouScript(fbPixelIds),
          }}
        />
      )}

      {gtmId && (
        <script
          dangerouslySetInnerHTML={{
            __html: buildGoogleTagManagerScript(gtmId),
          }}
        />
      )}

      {googleAdsId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: buildGoogleAdsScripts(googleAdsId, googleAdsLabel),
            }}
          />
        </>
      )}

      {gtmId && (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
      )}

      <LpEditPasswordGate slug={THANK_YOU_SLUG} isEditor={isEditor} hasPassword={hasEditPassword} />
      <ThankYouClient
        isEditor={isEditor}
        initialContent={displayContent}
        sourceSlug={sourceSlug}
        sourcePath={sourcePath}
      />
    </>
  );
}
