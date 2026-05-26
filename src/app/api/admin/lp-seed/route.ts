import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

const LP_VARIANTS = [
  {
    slug: "sofa-giuong-1",
    title: "Sofa Giường SmartFurni — Bản 1",
    description: "Bản landing page dành cho nhân viên 1 chạy quảng cáo",
    parentSlug: "sofa-giuong",
  },
  {
    slug: "sofa-giuong-2",
    title: "Sofa Giường SmartFurni — Bản 2",
    description: "Bản landing page dành cho nhân viên 2 chạy quảng cáo",
    parentSlug: "sofa-giuong",
  },
  {
    slug: "sofa-giuong-3",
    title: "Sofa Giường SmartFurni — Bản 3",
    description: "Bản landing page dành cho nhân viên 3 chạy quảng cáo",
    parentSlug: "sofa-giuong",
  },
];

export async function POST() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { slug: string; status: string }[] = [];

  try {
    // Đảm bảo bảng lp_pages tồn tại với cột parent_slug
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

    for (const variant of LP_VARIANTS) {
      try {
        await query(
          `INSERT INTO lp_pages (slug, title, description, status, custom_domain, parent_slug, created_at, updated_at)
           VALUES ($1, $2, $3, 'active', $4, $5, CURRENT_DATE, NOW())
           ON CONFLICT (slug) DO UPDATE SET
             title = EXCLUDED.title,
             description = EXCLUDED.description,
             status = 'active',
             parent_slug = EXCLUDED.parent_slug,
             updated_at = NOW()`,
          [
            variant.slug,
            variant.title,
            variant.description,
            `smartfurni.com.vn/lp/${variant.slug}`,
            variant.parentSlug,
          ]
        );
        results.push({ slug: variant.slug, status: "seeded" });
      } catch (e) {
        results.push({ slug: variant.slug, status: `error: ${e instanceof Error ? e.message : String(e)}` });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
