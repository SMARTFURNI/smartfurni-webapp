import type { Metadata } from "next";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { getCrmProducts } from "@/lib/crm-store";
import type { CrmProduct } from "@/lib/crm-types";
import { buildFacebookPixelPageViewScript, getLpFacebookPixelIds } from "@/lib/lp-facebook-pixel";
import LpSofaGiuongClient from "./LpSofaGiuongClient";
export const dynamic = "force-dynamic";

const DEFAULT_META_TITLE = "Thiết Kế Sofa Giường Theo Ý Bạn — SmartFurni";
const DEFAULT_META_DESCRIPTION = "Tự thiết kế sofa giường cá nhân hoá: chọn mẫu, kích thước, hộc, tay vịn, chất liệu, nệm. Khung thép mạ kẽm bền vững. Từ 2.990.000 ₫ — Giao hàng & lắp đặt miễn phí toàn quốc.";
const DEFAULT_META_KEYWORDS = [
  "sofa giường",
  "sofa giường SmartFurni",
  "sofa giường thông minh",
  "sofa giường khung thép",
  "sofa giường có hộc",
  "sofa giường da PU",
  "thiết kế sofa giường",
  "sofa giường cá nhân hoá",
];
const DEFAULT_OG_DESCRIPTION = "Tự thiết kế sofa giường cá nhân hoá. Khung thép mạ kẽm, từ 2.990.000 ₫.";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getLpContent();
  const title = content["meta_title"] || DEFAULT_META_TITLE;
  const description = content["meta_description"] || DEFAULT_META_DESCRIPTION;
  const keywords = (content["meta_keywords"] || "")
    .split(",")
    .map((kw) => kw.trim())
    .filter(Boolean);

  return {
    title,
    description,
    keywords: keywords.length ? keywords : DEFAULT_META_KEYWORDS,
    openGraph: {
      title: content["meta_og_title"] || title,
      description: content["meta_og_description"] || content["meta_description"] || DEFAULT_OG_DESCRIPTION,
      url: "https://smartfurni.com.vn/lp/sofa-giuong",
      siteName: content["meta_site_name"] || "SmartFurni",
      locale: "vi_VN",
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

const LP_SLUG = "sofa-giuong";

async function getLpContent(): Promise<Record<string, string>> {
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
      [LP_SLUG]
    );
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.block_key] = row.content;
    }
    return result;
  } catch (e) {
    console.error("getLpContent error:", e);
    return {};
  }
}

export default async function LpSofaGiuongPage() {
  const [initialContent, allProducts] = await Promise.all([
    getLpContent(),
    getCrmProducts(true).catch(() => [] as CrmProduct[]),
  ]);
  const sofaProducts = allProducts.filter(
    (p) => p.category === "sofa_bed" || p.name.toLowerCase().includes("sofa")
  );
  let isEditor = false;
  try {
    const isAdmin = await getAdminSession();
    if (isAdmin) {
      isEditor = true;
    } else {
      const staff = await getStaffSession();
      isEditor = !!staff;
    }
  } catch {
    isEditor = false;
  }

  // Tracking IDs from DB
  const fbPixelIds = getLpFacebookPixelIds(initialContent);
  const googleAdsId = initialContent["tracking_google_ads_id"] || "";
  const googleAdsLabel = initialContent["tracking_google_ads_label"] || "";
  const gtmId = initialContent["tracking_gtm_id"] || "";

  return (
    <>
      {/* Facebook Pixel */}
      {fbPixelIds.length > 0 && (
        <script
          dangerouslySetInnerHTML={{
            __html: buildFacebookPixelPageViewScript(fbPixelIds),
          }}
        />
      )}
      {/* Google Tag Manager */}
      {gtmId && (
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
          }}
        />
      )}
      {/* Google Ads */}
      {googleAdsId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${googleAdsId}');window.__GOOGLE_ADS_ID='${googleAdsId}';window.__GOOGLE_ADS_LABEL='${googleAdsLabel}';`,
            }}
          />
        </>
      )}
      <LpSofaGiuongClient
        isEditor={isEditor}
        initialContent={initialContent}
        sofaProducts={sofaProducts}
      />
    </>
  );
}
