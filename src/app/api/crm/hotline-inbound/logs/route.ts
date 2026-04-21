/**
 * GET /api/crm/hotline-inbound/logs
 * Lấy danh sách cuộc gọi đến từ hotline inbound
 */
import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

async function ensureSchema() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS crm_hotline_inbound_calls (
        id TEXT PRIMARY KEY,
        call_id TEXT UNIQUE,
        hotline_number TEXT,
        caller_number TEXT NOT NULL,
        extension TEXT,
        duration INTEGER DEFAULT 0,
        billsec INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'missed',
        recording_url TEXT,
        userfield TEXT,
        direction TEXT DEFAULT 'inbound',
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        raw_payload JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch { /* already exists */ }
}

export async function GET(req: NextRequest) {
  const session = await getCrmSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await ensureSchema();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 200), 500);
  const offset = Number(searchParams.get("offset") ?? 0);
  const status = searchParams.get("status");
  const hotline = searchParams.get("hotline");
  const search = searchParams.get("search");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (status) {
    conditions.push(`status = $${idx++}`);
    params.push(status);
  }
  if (hotline) {
    conditions.push(`hotline_number = $${idx++}`);
    params.push(hotline);
  }
  if (search) {
    conditions.push(`(caller_number ILIKE $${idx} OR hotline_number ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (dateFrom) {
    conditions.push(`started_at >= $${idx++}`);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`started_at < $${idx++}`);
    // Add 1 day to include the end date
    const end = new Date(dateTo);
    end.setDate(end.getDate() + 1);
    params.push(end.toISOString().slice(0, 10));
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const rows = await query<{
      id: string;
      call_id: string;
      hotline_number: string;
      caller_number: string;
      extension: string;
      duration: number;
      billsec: number;
      status: string;
      recording_url: string | null;
      userfield: string | null;
      direction: string;
      started_at: string;
      created_at: string;
    }>(
      `SELECT id, call_id, hotline_number, caller_number, extension, duration, billsec,
              status, recording_url, userfield, direction, started_at, created_at
       FROM crm_hotline_inbound_calls
       ${where}
       ORDER BY started_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    // Stats
    const statsRows = await query<{
      total: string;
      answered: string;
      missed: string;
      total_duration: string;
    }>(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'answered') as answered,
        COUNT(*) FILTER (WHERE status = 'missed') as missed,
        COALESCE(SUM(billsec), 0) as total_duration
       FROM crm_hotline_inbound_calls ${where}`,
      params
    );

    // Distinct hotlines for filter dropdown
    const hotlineRows = await query<{ hotline_number: string }>(
      `SELECT DISTINCT hotline_number FROM crm_hotline_inbound_calls WHERE hotline_number IS NOT NULL AND hotline_number != '' ORDER BY hotline_number`
    );

    const stats = statsRows[0] || { total: "0", answered: "0", missed: "0", total_duration: "0" };

    return NextResponse.json({
      calls: rows,
      stats: {
        total: Number(stats.total),
        answered: Number(stats.answered),
        missed: Number(stats.missed),
        totalDuration: Number(stats.total_duration),
      },
      hotlines: hotlineRows.map(r => r.hotline_number).filter(Boolean),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[hotline-inbound logs] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
