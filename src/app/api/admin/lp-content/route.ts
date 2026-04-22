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

// GET: Lấy tất cả content blocks cho một slug (public — không cần auth)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
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
  const { slug, blockKey, content } = body;
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
