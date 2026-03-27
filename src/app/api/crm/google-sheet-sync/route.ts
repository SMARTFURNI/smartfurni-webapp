/**
 * POST /api/crm/google-sheet-sync         — Sync tất cả sheets đang bật
 * POST /api/crm/google-sheet-sync?id=xxx  — Sync 1 sheet cụ thể
 * GET  /api/crm/google-sheet-sync         — Lấy trạng thái sync hiện tại
 */
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { syncAllGoogleSheets } from "@/lib/google-sheet-sync";
import { getCrmSettings } from "@/lib/crm-settings-store";

export async function POST(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sheetId = new URL(req.url).searchParams.get("id") || undefined;

  try {
    const result = await syncAllGoogleSheets(sheetId);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[google-sheet-sync] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await getAdminSession(req);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getCrmSettings();
    const cfg = settings.googleSheet;
    return NextResponse.json({
      enabled: cfg.enabled,
      hasServiceAccount: !!cfg.serviceAccountKey,
      totalSynced: cfg.totalSynced,
      sources: cfg.sources.map(s => ({
        id: s.id,
        label: s.label,
        enabled: s.enabled,
        source: s.source,
        color: s.color,
        hasSpreadsheetId: !!s.spreadsheetId,
        lastSyncedAt: s.lastSyncedAt,
        totalSynced: s.totalSynced,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
