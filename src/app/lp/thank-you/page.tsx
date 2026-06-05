import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { buildFacebookPixelThankYouScript, getLpFacebookPixelIds } from "@/lib/lp-facebook-pixel";

export const dynamic = "force-dynamic";

const DEFAULT_SMF12_PU_FB_PIXEL_IDS = ["1018174204502230"];
const STATIC_SLUGS = new Set(["sofa-giuong", "gsf150", "doi-tac-showroom-nem", "smf12"]);

export const metadata: Metadata = {
  title: "Cảm ơn quý khách — SmartFurni",
  description: "SmartFurni đã nhận thông tin của quý khách và sẽ liên hệ tư vấn trong thời gian sớm nhất.",
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
  const content = await getMergedTrackingContent(sourceSlug);

  const fbPixelIds = getLpFacebookPixelIds(
    content,
    sourceSlug === "smf12-pu" ? DEFAULT_SMF12_PU_FB_PIXEL_IDS : []
  );
  const googleAdsId = content["tracking_google_ads_id"] || "";
  const googleAdsLabel = content["tracking_google_ads_label"] || "";
  const gtmId = content["tracking_gtm_id"] || "";
  const sourcePath = sourceSlug ? `/lp/${sourceSlug}` : "/";

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

      <main className="min-h-screen bg-[#f8f5ef] px-4 py-10 text-[#1f2933] sm:px-6 lg:px-8">
        <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
          <div className="w-full overflow-hidden rounded-[32px] border border-[#eadfce] bg-white shadow-[0_24px_80px_rgba(76,58,35,0.16)]">
            <div className="bg-gradient-to-br from-[#fff8eb] via-white to-[#f1e5d0] px-6 py-10 text-center sm:px-10 sm:py-14">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#d6b46a] bg-[#fff8e6] shadow-inner">
                <span className="text-4xl" aria-hidden="true">✓</span>
              </div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-[#b58a2a]">SmartFurni đã nhận thông tin</p>
              <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-tight text-[#172026] sm:text-4xl">
                Cảm ơn quý khách đã gửi yêu cầu tư vấn
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#52616b] sm:text-lg">
                Đội ngũ SmartFurni sẽ kiểm tra thông tin và liên hệ qua Zalo hoặc điện thoại trong thời gian sớm nhất để xác nhận nhu cầu, cấu hình sản phẩm và ưu đãi phù hợp.
              </p>
            </div>

            <div className="grid gap-4 px-6 py-8 sm:grid-cols-3 sm:px-10">
              <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf2] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b58a2a]">Bước 1</p>
                <p className="mt-2 font-semibold text-[#172026]">Xác nhận thông tin</p>
                <p className="mt-2 text-sm leading-6 text-[#66717a]">Tư vấn viên rà soát yêu cầu và số điện thoại quý khách vừa gửi.</p>
              </div>
              <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf2] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b58a2a]">Bước 2</p>
                <p className="mt-2 font-semibold text-[#172026]">Tư vấn cấu hình</p>
                <p className="mt-2 text-sm leading-6 text-[#66717a]">SmartFurni tư vấn kích thước, chất liệu và phương án tối ưu theo không gian.</p>
              </div>
              <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf2] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b58a2a]">Bước 3</p>
                <p className="mt-2 font-semibold text-[#172026]">Chốt ưu đãi</p>
                <p className="mt-2 text-sm leading-6 text-[#66717a]">Quý khách nhận báo giá, thời gian giao hàng và chính sách bảo hành rõ ràng.</p>
              </div>
            </div>

            <div className="border-t border-[#eadfce] bg-[#fbf7f0] px-6 py-6 text-center sm:px-10">
              <p className="text-sm leading-6 text-[#66717a]">
                {sourceSlug ? `Nguồn đăng ký: ${sourceSlug}` : "Trang cảm ơn dùng chung cho các landing page SmartFurni."}
              </p>
              <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href={sourcePath}
                  className="rounded-full border border-[#c7a04a] px-6 py-3 text-sm font-semibold text-[#8a6516] transition hover:bg-[#fff4d8]"
                >
                  Quay lại trang sản phẩm
                </Link>
                <Link
                  href="/"
                  className="rounded-full bg-[#172026] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2c3740]"
                >
                  Về trang chủ SmartFurni
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
