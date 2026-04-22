import type { Metadata } from "next";
import { getCrmProducts } from "@/lib/crm-store";
import type { CrmProduct } from "@/lib/crm-types";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import LpShowroomNemClient from "./LpShowroomNemClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hợp tác B2B Showroom Nệm | SmartFurni — Giường Công Thái Học Điều Chỉnh Điện",
  description:
    "Trở thành đối tác phân phối độc quyền Giường Công Thái Học Điều Chỉnh Điện SmartFurni. Biên lợi nhuận cao, hỗ trợ trưng bày, đào tạo bán hàng. Đăng ký ngay.",
  keywords: [
    "đối tác showroom nệm",
    "giường công thái học điều chỉnh điện",
    "hợp tác B2B SmartFurni",
    "phân phối giường thông minh",
    "kinh doanh nội thất thông minh",
  ],
  openGraph: {
    title: "Hợp tác B2B Showroom Nệm | SmartFurni",
    description:
      "Mở rộng danh mục sản phẩm với Giường Công Thái Học Điều Chỉnh Điện SmartFurni. Biên lợi nhuận cao, hỗ trợ trưng bày toàn diện.",
    type: "website",
    url: "https://smartfurni-webapp-production.up.railway.app/lp/doi-tac-showroom-nem",
    images: [{ url: "https://smartfurni-webapp-production.up.railway.app/og-b2b.jpg", width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
};

const LP_SLUG = "doi-tac-showroom-nem";

async function getLpContent(): Promise<Record<string, string>> {
  try {
    // Ensure table exists
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

export default async function LpShowroomNemPage() {
  // Load products
  const allProducts = await getCrmProducts(true);
  const ergonomicBeds = allProducts.filter(
    (p: CrmProduct) => p.category === "ergonomic_bed" && p.isActive
  );

  // Load saved content from DB (persists across deploys)
  const initialContent = await getLpContent();

  // Check if current user is editor (admin or CRM staff)
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

  return (
    <LpShowroomNemClient
      products={ergonomicBeds}
      isEditor={isEditor}
      initialContent={initialContent}
    />
  );
}
