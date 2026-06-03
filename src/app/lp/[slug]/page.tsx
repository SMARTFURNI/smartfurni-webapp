import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { getCrmProducts } from "@/lib/crm-store";
import type { CrmProduct } from "@/lib/crm-types";
import { buildFacebookPixelPageViewScript, getLpFacebookPixelIds } from "@/lib/lp-facebook-pixel";
import LpSofaGiuongClient from "../sofa-giuong/LpSofaGiuongClient";
import LpSmf12Client from "../smf12/LpSmf12Client";

export const dynamic = "force-dynamic";

// Các slug tĩnh đã có route riêng — không xử lý ở đây
const STATIC_SLUGS = new Set(["sofa-giuong", "gsf150", "doi-tac-showroom-nem", "smf12"]);
const DEFAULT_SMF12_PU_FB_PIXEL_IDS = ["1018174204502230"];

// Hỗ trợ tất cả LP variants được tạo trong DB (không giới hạn pattern)

function inferParentSlug(slug: string): string {
  if (slug === "smf12" || slug.startsWith("smf12-")) return "smf12";
  if (slug === "gsf150" || slug.startsWith("gsf150-")) return "gsf150";
  if (slug === "doi-tac-showroom-nem" || slug.startsWith("doi-tac-showroom-nem-")) return "doi-tac-showroom-nem";
  return "sofa-giuong";
}

async function getLpPageInfo(slug: string): Promise<{ title: string; description: string; parentSlug: string | null } | null> {
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
    const rows = await query<{ title: string; description: string; status: string; parent_slug: string | null }>(
      `SELECT title, description, status, parent_slug FROM lp_pages WHERE slug = $1`,
      [slug]
    );
    if (!rows.length) return null;
    const row = rows[0];
    if (row.status === "draft") return null;
    return { title: row.title, description: row.description, parentSlug: row.parent_slug };
  } catch (e) {
    console.error("getLpPageInfo error:", e);
    return null;
  }
}

async function getLpContent(slug: string): Promise<Record<string, string>> {
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
    for (const row of rows) {
      result[row.block_key] = row.content;
    }
    return result;
  } catch (e) {
    console.error("getLpContent error:", e);
    return {};
  }
}

async function getParentLpContent(parentSlug: string): Promise<Record<string, string>> {
  return getLpContent(parentSlug);
}

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (STATIC_SLUGS.has(slug)) return {};
  const pageInfo = await getLpPageInfo(slug);
  if (!pageInfo) return {};
  return {
    title: `${pageInfo.title} — SmartFurni`,
    description: pageInfo.description || "Tự thiết kế sofa giường cá nhân hoá. Khung thép mạ kẽm, từ 2.990.000 ₫.",
    robots: { index: false, follow: false }, // Không index các bản clone
  };
}

export default async function LpVariantPage({ params }: Props) {
  const { slug } = await params;

  // Nếu là slug tĩnh đã có route riêng → không xử lý
  if (STATIC_SLUGS.has(slug)) {
    notFound();
  }

  // Lấy thông tin page từ DB
  const pageInfo = await getLpPageInfo(slug);
  if (!pageInfo) {
    notFound();
  }

  // Lấy nội dung riêng của bản này (override)
  const variantContent = await getLpContent(slug);

  // Lấy nội dung từ bản gốc (fallback)
  const parentSlug = pageInfo.parentSlug || inferParentSlug(slug);
  const parentContent = await getParentLpContent(parentSlug);

  // Merge: nội dung variant override lên parent
  const mergedContent: Record<string, string> = { ...parentContent, ...variantContent };

  // Lấy sản phẩm
  const allProducts = await getCrmProducts(true).catch(() => [] as CrmProduct[]);
  const sofaProducts = allProducts.filter(
    (p) => p.category === "sofa_bed" || p.name.toLowerCase().includes("sofa")
  );

  // Kiểm tra quyền chỉnh sửa
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

  // Tracking IDs (ưu tiên variant, fallback parent)
  const fbPixelIds = getLpFacebookPixelIds(mergedContent, slug === "smf12-pu" ? DEFAULT_SMF12_PU_FB_PIXEL_IDS : []);
  const googleAdsId = mergedContent["tracking_google_ads_id"] || "";
  const googleAdsLabel = mergedContent["tracking_google_ads_label"] || "";
  const gtmId = mergedContent["tracking_gtm_id"] || "";

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
      {parentSlug === "smf12" ? (
        <LpSmf12Client
          isEditor={isEditor}
          initialContent={mergedContent}
          lpSlug={slug}
        />
      ) : (
        <LpSofaGiuongClient
          isEditor={isEditor}
          initialContent={mergedContent}
          sofaProducts={sofaProducts}
          lpSlug={slug}
          colorTheme={
            (mergedContent["color_theme"] as "dark" | "light") ||
            (slug === "sofa-giuong-02" ? "light" : "dark")
          }
        />
      )}
    </>
  );
}
