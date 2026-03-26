import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    const rows = await db.query(`
      SELECT 
        id,
        data->>'title' as title,
        data->>'assignedTo' as assigned_to,
        data->>'status' as status,
        data->>'dueDate' as due_date,
        data->>'leadId' as lead_id
      FROM crm_tasks
      ORDER BY created_at DESC
      LIMIT 20
    `);
    return NextResponse.json({ count: rows.rows.length, tasks: rows.rows });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
