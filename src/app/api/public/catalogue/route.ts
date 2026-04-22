import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCrmProducts } from "@/lib/crm-store";

export const dynamic = "force-dynamic";

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
  try {
    await ensureTable();
    const [rows, products] = await Promise.all([
      query<{ value: unknown; updated_at: string }>(
        "SELECT value, updated_at FROM crm_settings WHERE key = $1",
        [KEY]
      ),
      getCrmProducts(true), // only active products
    ]);

    if (rows.length === 0 || !Array.isArray(rows[0].value)) {
      return NextResponse.json({ slides: [], products, updatedAt: null });
    }

    return NextResponse.json({
      slides: rows[0].value,
      products,
      updatedAt: rows[0].updated_at,
    });
  } catch (err) {
    console.error("[api/public/catalogue] GET error:", err);
    return NextResponse.json({ slides: [], products: [], updatedAt: null });
  }
}
