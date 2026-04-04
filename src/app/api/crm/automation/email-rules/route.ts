import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { query } from "@/lib/db";

async function initEmailRulesTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_email_automation_rules (
      id TEXT PRIMARY KEY,
      enabled BOOLEAN DEFAULT true,
      name TEXT NOT NULL,
      trigger_stage TEXT NOT NULL,
      subject TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      delay_minutes INTEGER DEFAULT 0,
      from_name TEXT DEFAULT 'SmartFurni',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function GET() {
  try {
    await requireCrmAccess();
    await initEmailRulesTable();
    const rows = await query<Record<string, unknown>>(
      "SELECT * FROM crm_email_automation_rules ORDER BY created_at ASC"
    );
    const rules = rows.map((r) => ({
      id: r.id,
      enabled: r.enabled,
      name: r.name,
      triggerStage: r.trigger_stage,
      subject: r.subject,
      body: r.body,
      delayMinutes: r.delay_minutes,
      fromName: r.from_name,
    }));
    return NextResponse.json(rules);
  } catch (err) {
    console.error("[Email Rules GET]", err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireCrmAccess();
    await initEmailRulesTable();
    const rules = await req.json();
    if (!Array.isArray(rules)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Delete all and re-insert (simple upsert strategy)
    await query("DELETE FROM crm_email_automation_rules");

    for (const rule of rules) {
      await query(
        `INSERT INTO crm_email_automation_rules
          (id, enabled, name, trigger_stage, subject, body, delay_minutes, from_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          rule.id,
          rule.enabled ?? true,
          rule.name ?? "",
          rule.triggerStage ?? "new",
          rule.subject ?? "",
          rule.body ?? "",
          rule.delayMinutes ?? 0,
          rule.fromName ?? "SmartFurni",
        ]
      );
    }

    return NextResponse.json({ success: true, count: rules.length });
  } catch (err) {
    console.error("[Email Rules POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
