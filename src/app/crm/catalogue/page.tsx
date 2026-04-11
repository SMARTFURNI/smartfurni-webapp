import { requireCrmAccess } from "@/lib/admin-auth";
import { getCrmProducts } from "@/lib/crm-store";
import { query } from "@/lib/db";
import CatalogueClient from "@/components/crm/CatalogueClient";
export const dynamic = "force-dynamic";

const KEY = "catalogueEditorState";

async function loadCatalogueState() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS crm_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    const rows = await query<{ value: unknown }>("SELECT value FROM crm_settings WHERE key = $1", [KEY]);
    if (rows.length > 0 && Array.isArray(rows[0].value) && (rows[0].value as unknown[]).length > 0) {
      return rows[0].value as unknown[];
    }
  } catch {
    // ignore DB errors, fall back to default
  }
  return null;
}

export default async function CataloguePage() {
  await requireCrmAccess();
  const [products, savedSlides] = await Promise.all([
    getCrmProducts(),
    loadCatalogueState(),
  ]);
  return <CatalogueClient products={products} initialSlides={savedSlides} />;
}
