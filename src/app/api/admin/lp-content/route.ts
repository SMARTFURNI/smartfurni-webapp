import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, getStaffSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";
import { parseLpFacebookPixelIds } from "@/lib/lp-facebook-pixel";
import {
  buildLpEditToken,
  ensureLpEditPasswordColumns,
  getLandingPageEditPasswordMeta,
  getLpEditCookieName,
  getLpEditMaxAgeSeconds,
  hasLandingPageEditCookie,
  hashLandingPageEditPassword,
  verifyLandingPageEditPassword,
} from "@/lib/lp-edit-auth";

const BUILTIN_LANDING_PAGES = [
  {
    slug: "doi-tac-showroom-nem",
    title: "Đối tác Showroom Nệm",
    description: "Landing page B2B thu hút chủ showroom nệm đăng ký đại lý SmartFurni",
    status: "active",
    customDomain: "smartfurni.com.vn/lp/doi-tac-showroom-nem",
    parentSlug: null as string | null,
  },
  {
    slug: "gsf150",
    title: "SmartFurni GSF150 — Bán Lẻ",
    description: "Landing page bán lẻ khung giường công thái học GSF150 hướng tới khách hàng tiêu dùng cuối",
    status: "active",
    customDomain: "smartfurni.com.vn/lp/gsf150",
    parentSlug: null as string | null,
  },
  {
    slug: "sofa-giuong",
    title: "Sofa Giường SmartFurni",
    description: "Landing page bán lẻ sofa giường SmartFurni 2 dòng Tiêu Chuẩn và Nâng Cao",
    status: "active",
    customDomain: "smartfurni.com.vn/lp/sofa-giuong",
    parentSlug: null as string | null,
  },
  {
    slug: "smf12",
    title: "Sofa Giường SMF12",
    description: "Landing page bán lẻ sofa giường thông minh SMF12",
    status: "active",
    customDomain: "smartfurni.com.vn/lp/smf12",
    parentSlug: null as string | null,
  },
  {
    slug: "thank-you",
    title: "Thank You — Đặt hàng thành công",
    description: "Landing page cảm ơn khách hàng sau khi đặt hàng thành công, dùng để đo chuyển đổi Facebook Pixel và Google Ads/GTM",
    status: "active",
    customDomain: "smartfurni.com.vn/lp/thank-you",
    parentSlug: null as string | null,
  },
];

async function checkAuth(): Promise<boolean> {
  const isAdmin = await getAdminSession();
  if (isAdmin) return true;
  const staff = await getStaffSession();
  return !!staff;
}

async function checkLandingPageEditAuth(slug: string | null | undefined): Promise<boolean> {
  if (!slug) return false;
  try {
    return await hasLandingPageEditCookie(slug);
  } catch {
    return false;
  }
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
      created_at DATE DEFAULT CURRENT_DATE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Migration: thêm các cột cấu hình nếu chưa có
  try {
    await ensureLpEditPasswordColumns();
  } catch {
    // Ignore if column already exists or ALTER not supported
  }
}

async function ensureBuiltinLandingPages() {
  await ensureLandingPagesTable();
  for (const page of BUILTIN_LANDING_PAGES) {
    await query(
      `INSERT INTO lp_pages (slug, title, description, status, custom_domain, parent_slug, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, NOW())
       ON CONFLICT (slug) DO UPDATE SET
         title = COALESCE(NULLIF(lp_pages.title, ''), EXCLUDED.title),
         description = COALESCE(lp_pages.description, EXCLUDED.description),
         status = COALESCE(lp_pages.status, EXCLUDED.status),
         custom_domain = COALESCE(lp_pages.custom_domain, EXCLUDED.custom_domain),
         parent_slug = COALESCE(lp_pages.parent_slug, EXCLUDED.parent_slug)`,
      [page.slug, page.title, page.description, page.status, page.customDomain, page.parentSlug]
    );
  }
}

async function ensureLandingPageRowForSlug(slug: string) {
  await ensureLandingPagesTable();
  const builtin = BUILTIN_LANDING_PAGES.find((page) => page.slug === slug);
  await query(
    `INSERT INTO lp_pages (slug, title, description, status, custom_domain, parent_slug, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, NOW())
     ON CONFLICT (slug) DO NOTHING`,
    [
      slug,
      builtin?.title || slug,
      builtin?.description || "",
      builtin?.status || "active",
      builtin?.customDomain || `smartfurni.com.vn/lp/${slug}`,
      builtin?.parentSlug || null,
    ]
  );
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
      await ensureBuiltinLandingPages();
      const rows = await query<{ slug: string; title: string; description: string; status: string; custom_domain: string; parent_slug: string | null; created_at: string; has_edit_password: boolean }>(
        `SELECT slug, title, description, status, custom_domain, parent_slug, created_at,
                (edit_password_hash IS NOT NULL AND edit_password_hash <> '') AS has_edit_password
         FROM lp_pages ORDER BY created_at DESC`
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

  // Lấy lượt truy cập cho các LP slugs (dùng analytics_events table)
  if (action === "lp-views") {
    const ok = await checkAuth();
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const range = searchParams.get("range") || "month";
    let startDate: Date;
    const now = new Date();
    switch (range) {
      case "day": startDate = new Date(now); startDate.setHours(0,0,0,0); break;
      case "week": startDate = new Date(now); startDate.setDate(now.getDate()-6); startDate.setHours(0,0,0,0); break;
      case "year": startDate = new Date(now); startDate.setFullYear(now.getFullYear()-1); startDate.setHours(0,0,0,0); break;
      default: startDate = new Date(now); startDate.setDate(now.getDate()-29); startDate.setHours(0,0,0,0);
    }
    try {
      const rows = await query<{ path: string; views: string; uniques: string }>(
        `SELECT path,
                COUNT(*) as views,
                COUNT(DISTINCT COALESCE(ip_hash, session_id, ua)) as uniques
         FROM analytics_events
         WHERE path LIKE '/lp/%' AND created_at >= $1
         GROUP BY path ORDER BY views DESC`,
        [startDate]
      );
      const viewsBySlug: Record<string, { views: number; uniques: number }> = {};
      for (const row of (rows || [])) {
        // path = /lp/sofa-giuong-1 → slug = sofa-giuong-1
        const slug = row.path.replace(/^\/lp\//, "").split("?")[0].split("#")[0];
        viewsBySlug[slug] = { views: parseInt(row.views), uniques: parseInt(row.uniques) };
      }
      return NextResponse.json({ viewsBySlug });
    } catch (e) {
      console.error("lp-views error:", e);
      return NextResponse.json({ viewsBySlug: {} });
    }
  }

  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  // Kiểm tra trạng thái mật khẩu chỉnh sửa landing page
  if (action === "edit-password-status") {
    try {
      const meta = await getLandingPageEditPasswordMeta(slug);
      const unlocked = await checkLandingPageEditAuth(slug);
      return NextResponse.json({
        hasPassword: !!(meta.passwordHash && meta.passwordSalt),
        unlocked,
      });
    } catch (e) {
      console.error("edit-password-status error:", e);
      return NextResponse.json({ hasPassword: false, unlocked: false });
    }
  }

  // Lấy tracking settings cho landing page
  if (action === "get-tracking") {
    const ok = await checkLandingPageEditAuth(slug);
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      await ensureTable();
      const rows = await query<{ block_key: string; content: string }>(
        `SELECT block_key, content FROM lp_content WHERE slug = $1 AND block_key LIKE 'tracking_%'`,
        [slug]
      );
      const result: Record<string, string> = {};
      for (const row of rows) result[row.block_key] = row.content;
      const fbPixelIds = parseLpFacebookPixelIds(result["tracking_fb_pixel_ids"] || result["tracking_fb_pixel_id"] || "");
      return NextResponse.json({
        fbPixelIds: fbPixelIds.join("\n"),
        fbPixelId: fbPixelIds[0] || "",
        googleAdsId: result["tracking_google_ads_id"] || "",
        googleAdsLabel: result["tracking_google_ads_label"] || "",
        gtmId: result["tracking_gtm_id"] || "",
        orderNotifyEmail: result["tracking_order_notify_email"] || "",
        orderGoogleSheetUrl: result["tracking_order_google_sheet_url"] || "",
        contactHotline: result["tracking_contact_hotline"] || "",
        contactZalo: result["tracking_contact_zalo"] || "",
      });
    } catch (e) {
      console.error("get-tracking error:", e);
      return NextResponse.json({
        fbPixelIds: "",
        fbPixelId: "",
        googleAdsId: "",
        googleAdsLabel: "",
        gtmId: "",
        orderNotifyEmail: "",
        orderGoogleSheetUrl: "",
        contactHotline: "",
        contactZalo: "",
      });
    }
  }

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
  const body = await req.json();
  const { slug, blockKey, content, action: bodyAction } = body;

  // Xác thực mật khẩu chỉnh sửa riêng của landing page
  if (bodyAction === "verify-edit-password") {
    const { password } = body;
    const result = await verifyLandingPageEditPassword(slug, password);
    if (!result.ok || !result.token) {
      return NextResponse.json({ error: "Sai mật khẩu quản trị landing page" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(getLpEditCookieName(slug), result.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getLpEditMaxAgeSeconds(),
    });
    return res;
  }

  // Đăng xuất phiên chỉnh sửa landing page: xóa cookie httpOnly ở phía server
  if (bodyAction === "logout-edit") {
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(getLpEditCookieName(slug), "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return res;
  }

  // Cài/cập nhật/xóa mật khẩu chỉnh sửa riêng cho landing page (admin/staff only)
  if (bodyAction === "set-edit-password") {
    const ok = await checkAuth();
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const password = String(body.password || "");
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

    try {
      await ensureLandingPageRowForSlug(slug);
      if (!password) {
        await query(
          `UPDATE lp_pages SET edit_password_hash = NULL, edit_password_salt = NULL, updated_at = NOW() WHERE slug = $1`,
          [slug]
        );
        return NextResponse.json({ ok: true, hasPassword: false });
      }

      if (password.length < 6) {
        return NextResponse.json({ error: "Mật khẩu cần tối thiểu 6 ký tự" }, { status: 400 });
      }

      const { passwordHash, passwordSalt } = hashLandingPageEditPassword(password);
      await query(
        `UPDATE lp_pages SET edit_password_hash = $1, edit_password_salt = $2, updated_at = NOW() WHERE slug = $3`,
        [passwordHash, passwordSalt, slug]
      );
      return NextResponse.json({ ok: true, hasPassword: true, token: buildLpEditToken(slug, passwordHash) });
    } catch (e) {
      console.error("set-edit-password error:", e);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
  }

  const adminOnlyActions = new Set(["create-page", "clone-content"]);
  const ok = adminOnlyActions.has(bodyAction) || (slug && blockKey === "custom_domain")
    ? await checkAuth()
    : await checkLandingPageEditAuth(slug);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
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
    const { title, description, customDomain, parentSlug } = body;
    if (!slug || !title) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    try {
      await ensureLandingPagesTable();
      await query(
        `INSERT INTO lp_pages (slug, title, description, status, custom_domain, parent_slug, created_at, updated_at)
         VALUES ($1, $2, $3, 'draft', $4, $5, CURRENT_DATE, NOW())
         ON CONFLICT (slug) DO NOTHING`,
        [slug, title, description || "", customDomain || `smartfurni.com.vn/lp/${slug}`, parentSlug || null]
      );
      return NextResponse.json({ ok: true });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error("create-page error:", errMsg);
      return NextResponse.json({ error: "DB error", detail: errMsg }, { status: 500 });
    }
  }

  // Clone toàn bộ nội dung từ slug nguồn sang slug đích
  if (bodyAction === "clone-content") {
    const { sourceSlug, targetSlug } = body;
    if (!sourceSlug || !targetSlug) return NextResponse.json({ error: "Missing sourceSlug or targetSlug" }, { status: 400 });
    try {
      await ensureTable();
      // Copy tất cả content blocks từ source sang target (bỏ qua tracking blocks)
      await query(
        `INSERT INTO lp_content (slug, block_key, content, updated_at)
         SELECT $2, block_key, content, NOW()
         FROM lp_content
         WHERE slug = $1 AND block_key NOT LIKE 'tracking_%'
         ON CONFLICT (slug, block_key)
         DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()`,
        [sourceSlug, targetSlug]
      );
      return NextResponse.json({ ok: true });
    } catch (e) {
      console.error("clone-content error:", e);
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
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const blockKey = searchParams.get("blockKey");
  const action = searchParams.get("action");

  const ok = action === "delete-page" ? await checkAuth() : await checkLandingPageEditAuth(slug);
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
