import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";

const KEY = "catalogueEditorState";

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function GET() {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureTable();
    const rows = await query("SELECT value FROM crm_settings WHERE key = $1", [KEY]);
    if (rows.length === 0) return NextResponse.json({ slides: null });
    return NextResponse.json({ slides: rows[0].value });
  } catch (err) {
    console.error("[catalogue-state] GET error:", err);
    return NextResponse.json({ slides: null });
  }
}

export async function POST(req: NextRequest) {
  if (!await getCrmSession()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await ensureTable();
    const body = await req.json();
    const { slides } = body as { slides: unknown };
    if (!slides) return NextResponse.json({ error: "slides required" }, { status: 400 });
    await query(
      `INSERT INTO crm_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
      [KEY, JSON.stringify(slides)]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[catalogue-state] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
