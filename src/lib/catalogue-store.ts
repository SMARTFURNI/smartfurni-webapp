/**
 * catalogue-store.ts
 * Quản lý Catalogue B2B: danh sách catalogue và các trang bên trong.
 * Sử dụng PostgreSQL để lưu trữ.
 *
 * Tables:
 *   catalogues       - danh sách catalogue (title, description, cover, status)
 *   catalogue_pages  - các trang trong catalogue (image, content, order)
 */

import { getDb } from "./db";
import type { Pool } from "pg";

function getPool(): Pool | null {
  try { return getDb(); } catch { return null; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type CataloguePageType = "cover" | "content" | "product" | "back-cover";

export interface CataloguePage {
  id: string;
  catalogueId: string;
  pageNumber: number;       // 1-based
  type: CataloguePageType;
  title: string;            // tiêu đề trang (optional)
  subtitle: string;         // phụ đề
  imageUrl: string;         // ảnh nền trang
  bgColor: string;          // màu nền nếu không có ảnh
  textColor: string;        // màu chữ
  content: string;          // nội dung HTML/text
  productIds: string[];     // liên kết sản phẩm (optional)
  badge: string;            // nhãn góc (VD: "MỚI", "HOT")
  createdAt: string;
  updatedAt: string;
}

export interface Catalogue {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  status: "published" | "draft";
  pageCount: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogueWithPages extends Catalogue {
  pages: CataloguePage[];
}

// ─── DB Setup ─────────────────────────────────────────────────────────────────

export async function ensureCatalogueTables(): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalogues (
        id            TEXT PRIMARY KEY,
        title         TEXT NOT NULL DEFAULT 'Catalogue',
        description   TEXT DEFAULT '',
        cover_image   TEXT DEFAULT '',
        status        TEXT DEFAULT 'draft',
        view_count    INT DEFAULT 0,
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_cat_status ON catalogues(status, updated_at DESC);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS catalogue_pages (
        id            TEXT PRIMARY KEY,
        catalogue_id  TEXT NOT NULL REFERENCES catalogues(id) ON DELETE CASCADE,
        page_number   INT NOT NULL DEFAULT 1,
        type          TEXT DEFAULT 'content',
        title         TEXT DEFAULT '',
        subtitle      TEXT DEFAULT '',
        image_url     TEXT DEFAULT '',
        bg_color      TEXT DEFAULT '#1a1a1a',
        text_color    TEXT DEFAULT '#ffffff',
        content       TEXT DEFAULT '',
        product_ids   JSONB DEFAULT '[]',
        badge         TEXT DEFAULT '',
        created_at    TIMESTAMPTZ DEFAULT NOW(),
        updated_at    TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_cp_catalogue ON catalogue_pages(catalogue_id, page_number ASC);
    `);
  } catch (err) {
    console.error("[catalogue-store] ensureCatalogueTables error:", (err as Error).message);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCatalogue(r: any): Catalogue {
  return {
    id: r.id,
    title: r.title || "Catalogue",
    description: r.description || "",
    coverImageUrl: r.cover_image || "",
    status: r.status || "draft",
    pageCount: parseInt(r.page_count) || 0,
    viewCount: parseInt(r.view_count) || 0,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPage(r: any): CataloguePage {
  return {
    id: r.id,
    catalogueId: r.catalogue_id,
    pageNumber: parseInt(r.page_number) || 1,
    type: r.type || "content",
    title: r.title || "",
    subtitle: r.subtitle || "",
    imageUrl: r.image_url || "",
    bgColor: r.bg_color || "#1a1a1a",
    textColor: r.text_color || "#ffffff",
    content: r.content || "",
    productIds: Array.isArray(r.product_ids) ? r.product_ids : [],
    badge: r.badge || "",
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Catalogue CRUD ───────────────────────────────────────────────────────────

export async function getCatalogues(onlyPublished = false): Promise<Catalogue[]> {
  const pool = getPool();
  if (!pool) return [];
  await ensureCatalogueTables();
  try {
    const where = onlyPublished ? "WHERE c.status = 'published'" : "";
    const res = await pool.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM catalogue_pages cp WHERE cp.catalogue_id = c.id) as page_count
      FROM catalogues c
      ${where}
      ORDER BY c.updated_at DESC
    `);
    return res.rows.map(rowToCatalogue);
  } catch (err) {
    console.error("[catalogue-store] getCatalogues error:", (err as Error).message);
    return [];
  }
}

export async function getCatalogueById(id: string): Promise<CatalogueWithPages | null> {
  const pool = getPool();
  if (!pool) return null;
  await ensureCatalogueTables();
  try {
    const [catRes, pagesRes] = await Promise.all([
      pool.query(
        `SELECT c.*,
          (SELECT COUNT(*) FROM catalogue_pages cp WHERE cp.catalogue_id = c.id) as page_count
         FROM catalogues c WHERE c.id = $1`,
        [id]
      ),
      pool.query(
        `SELECT * FROM catalogue_pages WHERE catalogue_id = $1 ORDER BY page_number ASC`,
        [id]
      ),
    ]);
    if (!catRes.rows[0]) return null;
    return {
      ...rowToCatalogue(catRes.rows[0]),
      pages: pagesRes.rows.map(rowToPage),
    };
  } catch (err) {
    console.error("[catalogue-store] getCatalogueById error:", (err as Error).message);
    return null;
  }
}

export async function createCatalogue(data: {
  title: string;
  description?: string;
  coverImageUrl?: string;
  status?: "published" | "draft";
}): Promise<Catalogue> {
  const pool = getPool();
  if (!pool) throw new Error("No database connection");
  await ensureCatalogueTables();
  const id = genId("cat");
  await pool.query(
    `INSERT INTO catalogues (id, title, description, cover_image, status)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, data.title, data.description || "", data.coverImageUrl || "", data.status || "draft"]
  );
  const res = await pool.query(
    `SELECT c.*, 0 as page_count FROM catalogues c WHERE c.id = $1`,
    [id]
  );
  return rowToCatalogue(res.rows[0]);
}

export async function updateCatalogue(
  id: string,
  data: Partial<{
    title: string;
    description: string;
    coverImageUrl: string;
    status: "published" | "draft";
  }>
): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
  if (data.description !== undefined) { fields.push(`description = $${idx++}`); values.push(data.description); }
  if (data.coverImageUrl !== undefined) { fields.push(`cover_image = $${idx++}`); values.push(data.coverImageUrl); }
  if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
  if (fields.length === 0) return;
  fields.push(`updated_at = NOW()`);
  values.push(id);
  await pool.query(`UPDATE catalogues SET ${fields.join(", ")} WHERE id = $${idx}`, values);
}

export async function deleteCatalogue(id: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  await pool.query(`DELETE FROM catalogues WHERE id = $1`, [id]);
}

export async function incrementCatalogueViews(id: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(`UPDATE catalogues SET view_count = view_count + 1 WHERE id = $1`, [id]);
  } catch { /* silent */ }
}

// ─── Page CRUD ────────────────────────────────────────────────────────────────

export async function addCataloguePage(
  catalogueId: string,
  data: Partial<CataloguePage>
): Promise<CataloguePage> {
  const pool = getPool();
  if (!pool) throw new Error("No database connection");
  await ensureCatalogueTables();

  // Get next page number
  const seqRes = await pool.query(
    `SELECT COALESCE(MAX(page_number), 0) + 1 as next_num FROM catalogue_pages WHERE catalogue_id = $1`,
    [catalogueId]
  );
  const pageNumber = data.pageNumber || seqRes.rows[0]?.next_num || 1;
  const id = genId("pg");

  await pool.query(
    `INSERT INTO catalogue_pages
      (id, catalogue_id, page_number, type, title, subtitle, image_url, bg_color, text_color, content, product_ids, badge)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      id, catalogueId, pageNumber,
      data.type || "content",
      data.title || "",
      data.subtitle || "",
      data.imageUrl || "",
      data.bgColor || "#1a1a1a",
      data.textColor || "#ffffff",
      data.content || "",
      JSON.stringify(data.productIds || []),
      data.badge || "",
    ]
  );

  // Update catalogue updated_at
  await pool.query(`UPDATE catalogues SET updated_at = NOW() WHERE id = $1`, [catalogueId]);

  const res = await pool.query(`SELECT * FROM catalogue_pages WHERE id = $1`, [id]);
  return rowToPage(res.rows[0]);
}

export async function updateCataloguePage(
  pageId: string,
  data: Partial<CataloguePage>
): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (data.pageNumber !== undefined) { fields.push(`page_number = $${idx++}`); values.push(data.pageNumber); }
  if (data.type !== undefined) { fields.push(`type = $${idx++}`); values.push(data.type); }
  if (data.title !== undefined) { fields.push(`title = $${idx++}`); values.push(data.title); }
  if (data.subtitle !== undefined) { fields.push(`subtitle = $${idx++}`); values.push(data.subtitle); }
  if (data.imageUrl !== undefined) { fields.push(`image_url = $${idx++}`); values.push(data.imageUrl); }
  if (data.bgColor !== undefined) { fields.push(`bg_color = $${idx++}`); values.push(data.bgColor); }
  if (data.textColor !== undefined) { fields.push(`text_color = $${idx++}`); values.push(data.textColor); }
  if (data.content !== undefined) { fields.push(`content = $${idx++}`); values.push(data.content); }
  if (data.productIds !== undefined) { fields.push(`product_ids = $${idx++}`); values.push(JSON.stringify(data.productIds)); }
  if (data.badge !== undefined) { fields.push(`badge = $${idx++}`); values.push(data.badge); }
  if (fields.length === 0) return;
  fields.push(`updated_at = NOW()`);
  values.push(pageId);
  await pool.query(`UPDATE catalogue_pages SET ${fields.join(", ")} WHERE id = $${idx}`, values);
}

export async function deleteCataloguePage(pageId: string): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  // Get catalogue_id before delete to renumber
  const res = await pool.query(`SELECT catalogue_id, page_number FROM catalogue_pages WHERE id = $1`, [pageId]);
  if (!res.rows[0]) return;
  const { catalogue_id, page_number } = res.rows[0];
  await pool.query(`DELETE FROM catalogue_pages WHERE id = $1`, [pageId]);
  // Renumber remaining pages
  await pool.query(
    `UPDATE catalogue_pages SET page_number = page_number - 1
     WHERE catalogue_id = $1 AND page_number > $2`,
    [catalogue_id, page_number]
  );
  await pool.query(`UPDATE catalogues SET updated_at = NOW() WHERE id = $1`, [catalogue_id]);
}

export async function reorderCataloguePages(
  catalogueId: string,
  pageIds: string[] // ordered list of page IDs
): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  for (let i = 0; i < pageIds.length; i++) {
    await pool.query(
      `UPDATE catalogue_pages SET page_number = $1 WHERE id = $2 AND catalogue_id = $3`,
      [i + 1, pageIds[i], catalogueId]
    );
  }
  await pool.query(`UPDATE catalogues SET updated_at = NOW() WHERE id = $1`, [catalogueId]);
}
