import type { Metadata } from "next";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import LpSofaGiuongClient from "./LpSofaGiuongClient";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sofa Giường SmartFurni — Ngủ Ngon, Sống Đẹp Mỗi Ngày",
  description:
    "Sofa giường SmartFurni khung thép mạ kẽm bền vững. Tuỳ chọn kiểu dáng, chất liệu theo sở thích. Từ 4.490.000 ₫ — Giao hàng & lắp đặt miễn phí toàn quốc.",
  keywords: [
    "sofa giường",
    "sofa giường SmartFurni",
    "sofa giường thông minh",
    "sofa giường khung thép",
    "sofa giường có hộc",
    "sofa giường da PU",
  ],
  openGraph: {
    title: "Sofa Giường SmartFurni — Ngủ Ngon, Sống Đẹp Mỗi Ngày",
    description: "Sofa giường khung thép mạ kẽm, tuỳ chọn chất liệu. Từ 4.490.000 ₫.",
    url: "https://smartfurni.com.vn/lp/sofa-giuong",
    siteName: "SmartFurni",
    locale: "vi_VN",
    type: "website",
  },
  robots: { index: true, follow: true },
};

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
  const initialContent = await getLpContent();
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
  return <LpSofaGiuongClient isEditor={isEditor} initialContent={initialContent} />;
}
