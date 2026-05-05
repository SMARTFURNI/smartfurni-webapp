import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";

async function checkAuth(): Promise<boolean> {
  const isAdmin = await getAdminSession();
  if (isAdmin) return true;
  const staff = await getStaffSession();
  return !!staff;
}

async function ensureTable() {
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
}

async function ensureLandingPagesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS lp_pages (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(255) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) DEFAULT 'draft',
      custom_domain VARCHAR(255),
      created_at DATE DEFAULT CURRENT_DATE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

// GET: Lấy tất cả content blocks cho một slug hoặc danh sách landing pages
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const slug = searchParams.get("slug");

  // Lấy danh sách tất cả landing pages (admin only)
  if (action === "list-pages") {
    const ok = await checkAuth();
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      await ensureLandingPagesTable();
      const rows = await query<{ slug: string; title: string; description: string; status: string; custom_domain: string; created_at: string }>(
        `SELECT slug, title, description, status, custom_domain, created_at FROM lp_pages ORDER BY created_at DESC`
      );
      return NextResponse.json({ pages: rows || [] });
    } catch (e) {
      console.error("list-pages error:", e);
      return NextResponse.json({ pages: [] });
    }
  }

  // Lấy số lượng leads cho mỗi landing page
  if (action === "lead-counts") {
    try {
      const rows = await query<{ slug: string; count: number }>(
        `SELECT slug, COUNT(*) as count FROM leads GROUP BY slug`
      );
      const counts: Record<string, number> = {};
      for (const row of rows) {
        counts[row.slug] = row.count;
      }
      return NextResponse.json({ counts });
    } catch (e) {
      console.error("lead-counts error:", e);
      return NextResponse.json({ counts: {} });
    }
  }

  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  try {
    await ensureTable();
    const rows = await query<{ block_key: string; content: string }>(
      `SELECT block_key, content FROM lp_content WHERE slug = $1`,
      [slug]
    );
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.block_key] = row.content;
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error("lp-content GET error:", e);
    return NextResponse.json({});
  }
}

// POST: Lưu hoặc cập nhật một content block
export async function POST(req: NextRequest) {
  const ok = await checkAuth();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { slug, blockKey, content, action: bodyAction } = body;
  
  // Xử lý cập nhật custom domain
  if (slug && blockKey === "custom_domain") {
    try {
      await ensureLandingPagesTable();
      await query(
        `UPDATE lp_pages SET custom_domain = $1, updated_at = NOW() WHERE slug = $2`,
        [content, slug]
      );
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("update custom_domain error:", e);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
  }

  // Tạo landing page mới
  if (bodyAction === "create-page") {
    const { title, description, customDomain } = body;
    if (!slug || !title) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    try {
      await ensureLandingPagesTable();
      await query(
        `INSERT INTO lp_pages (slug, title, description, status, custom_domain, created_at, updated_at)
         VALUES ($1, $2, $3, 'draft', $4, CURRENT_DATE, NOW())
         ON CONFLICT (slug) DO NOTHING`,
        [slug, title, description || "", customDomain || `smartfurni.com.vn/lp/${slug}`]
      );
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("create-page error:", e);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
  }

  if (!slug || !blockKey || content === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    await ensureTable();
    await query(
      `INSERT INTO lp_content (slug, block_key, content, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (slug, block_key)
       DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
      [slug, blockKey, content]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("lp-content POST error:", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

// DELETE: Xóa một content block (reset về default)
export async function DELETE(req: NextRequest) {
  const ok = await checkAuth();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const blockKey = searchParams.get("blockKey");
  const action = searchParams.get("action");

  // Xóa landing page
  if (action === "delete-page") {
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    try {
      await ensureLandingPagesTable();
      await query(`DELETE FROM lp_pages WHERE slug = $1`, [slug]);
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("delete-page error:", e);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
  }

  if (!slug || !blockKey) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  try {
    await ensureTable();
    await query(`DELETE FROM lp_content WHERE slug = $1 AND block_key = $2`, [slug, blockKey]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("lp-content DELETE error:", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

// PATCH: Cập nhật status landing page (publish/draft)
export async function PATCH(req: NextRequest) {
  const ok = await checkAuth();
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { slug, status } = body;
  if (!slug || !status) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  try {
    await ensureLandingPagesTable();
    await query(
      `UPDATE lp_pages SET status = $1, updated_at = NOW() WHERE slug = $2`,
      [status, slug]
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH error:", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}
