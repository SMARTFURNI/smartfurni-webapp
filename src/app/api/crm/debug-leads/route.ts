import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Temporary debug endpoint
export async function GET() {
  try {
    const rows = await query<{ id: string; data: { name: string; assignedTo: string } }>(
      `SELECT id, data FROM crm_leads ORDER BY created_at DESC LIMIT 20`
    );
    return NextResponse.json({
      count: rows.length,
      leads: rows.map(r => ({
        id: r.id,
        name: typeof r.data === 'string' ? JSON.parse(r.data).name : r.data.name,
        assignedTo: typeof r.data === 'string' ? JSON.parse(r.data).assignedTo : r.data.assignedTo,
      })),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
