import type { Metadata } from "next";
import { query } from "@/lib/db";
import { buildFacebookPixelPageViewScript, getLpFacebookPixelIds } from "@/lib/lp-facebook-pixel";
import LpGsf150Client from "./LpGsf150Client";
import LpEditPasswordGate from "@/components/lp/LpEditPasswordGate";
import { hasLandingPageEditCookie, hasLandingPageEditPassword } from "@/lib/lp-edit-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Khung Giường Công Thái Học SmartFurni GSF150 — Nâng Cấp Giường Cũ Trong 5 Phút",
  description:
    "Biến giường thường thành giường thông minh chỉ trong 5 phút. Chế độ Zero Gravity, chống ngáy, điều khiển không dây. Tương thích 100% mọi loại nệm. Bảo hành motor 5 năm.",
  keywords: [
    "giường công thái học",
    "khung giường điều chỉnh điện",
    "SmartFurni GSF150",
    "giường thông minh",
    "giường zero gravity",
    "nâng cấp giường cũ",
  ],
  openGraph: {
    title: "Khung Giường Công Thái Học SmartFurni GSF150",
    description:
      "Biến giường thường thành giường thông minh chỉ trong 5 phút. Zero Gravity, chống ngáy, điều khiển không dây.",
    type: "website",
    url: "https://smartfurni.com.vn/lp/gsf150",
    images: [{ url: "https://smartfurni.com.vn/gsf150-wood-frame.jpg", width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
};

const LP_SLUG = "gsf150";

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

export default async function LpGsf150Page() {
  const initialContent = await getLpContent();
  const [isEditor, hasEditPassword] = await Promise.all([
    hasLandingPageEditCookie(LP_SLUG),
    hasLandingPageEditPassword(LP_SLUG),
  ]);
  const fbPixelIds = getLpFacebookPixelIds(initialContent);

  return (
    <>
      {fbPixelIds.length > 0 && (
        <script
          dangerouslySetInnerHTML={{
            __html: buildFacebookPixelPageViewScript(fbPixelIds),
          }}
        />
      )}
      <LpEditPasswordGate slug={LP_SLUG} isEditor={isEditor} hasPassword={hasEditPassword} />
      <LpGsf150Client isEditor={isEditor} initialContent={initialContent} />
    </>
  );
}
