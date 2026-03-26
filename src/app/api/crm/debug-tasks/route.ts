import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { initCrmSchema } from "@/lib/crm-store";

// Temporary debug endpoint
export async function GET() {
  try {
    await initCrmSchema();
    const rows = await query<{ id: string; lead_id: string; due_date: string; done: boolean; data: unknown }>(
      `SELECT id, lead_id, due_date, done, data FROM crm_tasks ORDER BY due_date ASC LIMIT 20`
    );
    return NextResponse.json({
      count: rows.length,
      tasks: rows,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
