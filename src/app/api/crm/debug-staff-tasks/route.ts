import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = await getDb();
    
    // Lấy tất cả staff
    const staffRows = await db.query(`
      SELECT id, data->>'fullName' as full_name, data->>'username' as username, data->>'role' as role
      FROM crm_staff
      ORDER BY created_at ASC
    `);
    
    // Lấy tất cả tasks với assignedTo
    const taskRows = await db.query(`
      SELECT 
        id,
        data->>'title' as title,
        data->>'assignedTo' as assigned_to,
        data->>'status' as status,
        data->>'done' as done,
        data->>'dueDate' as due_date
      FROM crm_tasks
      ORDER BY created_at DESC
      LIMIT 30
    `);
    
    return NextResponse.json({ 
      staff: staffRows.rows, 
      tasks: taskRows.rows,
      taskCount: taskRows.rows.length
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
