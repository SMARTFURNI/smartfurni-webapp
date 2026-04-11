/**
 * Server-side helper to load/save catalogue editor state from DB.
 * Kept separate so page.tsx can import without pulling in React client code.
 */
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadCatalogueState(): Promise<any[] | null> {
  try {
    await ensureTable();
    const rows = await query<{ value: unknown }>(
      "SELECT value FROM crm_settings WHERE key = $1",
      [KEY]
    );
    if (rows.length > 0 && Array.isArray(rows[0].value) && (rows[0].value as unknown[]).length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return rows[0].value as any[];
    }
  } catch {
    // ignore, fall back to default
  }
  return null;
}
