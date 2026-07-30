import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { storeImageAsset } from "@/lib/media-assets";

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

async function externalizeDataImages(value: unknown, path = "catalogue"): Promise<unknown> {
  if (Array.isArray(value)) {
    return Promise.all(value.map((item, index) => externalizeDataImages(item, `${path}-${index + 1}`)));
  }
  if (!value || typeof value !== "object") return value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof child === "string"
      && key.toLowerCase().endsWith("dataurl")
      && child.startsWith("data:image/")
    ) {
      const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(child);
      if (!match) throw new Error(`Ảnh base64 không hợp lệ tại ${path}.${key}`);
      const buffer = Buffer.from(match[1], "base64");
      if (buffer.length > 12 * 1024 * 1024) {
        throw new Error(`Ảnh tại ${path}.${key} vượt quá 12MB`);
      }
      const stored = await storeImageAsset({
        buffer,
        originalName: `${path}-${key}.jpg`,
        folder: "catalogues",
        subfolder: "editor",
        maxWidth: 1800,
        quality: 84,
        entityType: "catalogue",
        entityId: "editor",
      });
      output[key] = stored.url;
    } else {
      output[key] = await externalizeDataImages(child, `${path}.${key}`);
    }
  }
  return output;
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
    const normalizedSlides = await externalizeDataImages(slides);
    await query(
      `INSERT INTO crm_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = NOW()`,
      [KEY, JSON.stringify(normalizedSlides)]
    );
    return NextResponse.json({ ok: true, slides: normalizedSlides });
  } catch (err) {
    console.error("[catalogue-state] POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
