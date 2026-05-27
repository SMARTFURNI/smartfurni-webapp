import type { Metadata } from "next";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import LpSmf12Client from "./LpSmf12Client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sofa Giường Da PU SMF12 — Sang Trọng, Bền Bỉ, Giao Hàng Toàn Quốc | SmartFurni",
  description:
    "Sofa giường da PU SMF12 cao cấp: khung thép mạ kẽm, da PU nhập khẩu, cơ cấu gập mở 50.000 lần. Kích thước 1,2M – 1,8M. Bảo hành 3 năm. Giao hàng & lắp đặt miễn phí toàn quốc.",
  keywords: [
    "sofa giường da PU",
    "SMF12",
    "sofa giường SmartFurni",
    "sofa giường cao cấp",
    "sofa giường da PU nhập khẩu",
    "sofa bed da PU",
    "sofa giường phòng ngủ",
  ],
  openGraph: {
    title: "Sofa Giường Da PU SMF12 — SmartFurni",
    description:
      "Sofa giường da PU SMF12 cao cấp: khung thép mạ kẽm, da PU nhập khẩu, cơ cấu gập mở 50.000 lần. Bảo hành 3 năm.",
    type: "website",
    url: "https://smartfurni.com.vn/lp/smf12",
    images: [{ url: "https://smartfurni.com.vn/og-smf12.jpg", width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
};

const LP_SLUG = "smf12";

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

export default async function LpSmf12Page() {
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
  return <LpSmf12Client isEditor={isEditor} initialContent={initialContent} />;
}
