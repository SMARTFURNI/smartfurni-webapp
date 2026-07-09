import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { getPancakeConfig, savePancakeConfig } from "@/lib/pancake-integration";

export const dynamic = "force-dynamic";

/**
 * GET /api/crm/facebook-inbox/pancake-settings
 * Lấy cấu hình Pancake integration hiện tại
 */
export async function GET() {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const config = await getPancakeConfig();
    return NextResponse.json(config);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/crm/facebook-inbox/pancake-settings
 * Lưu cấu hình Pancake integration
 * Body: { enabled: boolean, pages: PancakePageConfig[] }
 */
export async function POST(request: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { enabled, pages } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled phải là boolean" }, { status: 400 });
    }
    if (!Array.isArray(pages)) {
      return NextResponse.json({ error: "pages phải là array" }, { status: 400 });
    }

    // Validate từng page config
    for (const p of pages) {
      if (!p.fbPageId || typeof p.fbPageId !== "string") {
        return NextResponse.json({ error: "Mỗi page cần có fbPageId" }, { status: 400 });
      }
      if (!p.pageAccessToken || typeof p.pageAccessToken !== "string") {
        return NextResponse.json({ error: `Page ${p.fbPageId} cần có pageAccessToken` }, { status: 400 });
      }
    }

    await savePancakeConfig({
      enabled,
      pages: pages.map(p => ({
        fbPageId: p.fbPageId,
        pageAccessToken: p.pageAccessToken,
        pageName: p.pageName || "",
        updatedAt: new Date().toISOString(),
      })),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
