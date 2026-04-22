import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET: Lấy tất cả content blocks cho một slug
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  try {
    await ensureTable();
    const rows = await db.execute(
      `SELECT block_key, content FROM lp_content WHERE slug = ?`,
      [slug]
    );
    const result: Record<string, string> = {};
    const data = (rows as { rows?: Array<{ block_key: string; content: string }> }).rows ?? (rows as Array<{ block_key: string; content: string }>);
    for (const row of data) {
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
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { slug, blockKey, content } = body;
  if (!slug || !blockKey || content === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    await ensureTable();
    await db.execute(
      `INSERT INTO lp_content (slug, block_key, content, updated_at)
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE content = VALUES(content), updated_at = NOW()`,
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
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const blockKey = searchParams.get("blockKey");
  if (!slug || !blockKey) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  try {
    await ensureTable();
    await db.execute(`DELETE FROM lp_content WHERE slug = ? AND block_key = ?`, [slug, blockKey]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("lp-content DELETE error:", e);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
}

async function ensureTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS lp_content (
      id INT AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(255) NOT NULL,
      block_key VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_slug_block (slug, block_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}
