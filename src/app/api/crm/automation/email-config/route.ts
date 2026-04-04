import { NextRequest, NextResponse } from "next/server";
import { requireCrmAccess } from "@/lib/admin-auth";
import { query } from "@/lib/db";

async function initEmailConfigTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_email_smtp_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      host TEXT DEFAULT '',
      port INTEGER DEFAULT 587,
      smtp_user TEXT DEFAULT '',
      smtp_pass TEXT DEFAULT '',
      from_name TEXT DEFAULT 'SmartFurni',
      from_email TEXT DEFAULT '',
      secure BOOLEAN DEFAULT false,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  // Ensure default row exists
  await query(`
    INSERT INTO crm_email_smtp_config (id) VALUES ('default')
    ON CONFLICT (id) DO NOTHING
  `);
}

export async function GET() {
  try {
    await requireCrmAccess();
    await initEmailConfigTable();
    const rows = await query<Record<string, unknown>>(
      "SELECT * FROM crm_email_smtp_config WHERE id='default'"
    );
    const r = rows[0];
    if (!r) return NextResponse.json({ host: "" });

    return NextResponse.json({
      host: r.host ?? "",
      port: r.port ?? 587,
      user: r.smtp_user ?? "",
      // Don't expose password — just indicate if set
      pass: r.smtp_pass ? "••••••••" : "",
      fromName: r.from_name ?? "SmartFurni",
      fromEmail: r.from_email ?? "",
      secure: r.secure ?? false,
    });
  } catch (err) {
    console.error("[Email Config GET]", err);
    return NextResponse.json({ host: "" });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireCrmAccess();
    await initEmailConfigTable();
    const body = await req.json();

    // Only update password if a new one is provided (not masked)
    const isNewPass = body.pass && body.pass !== "••••••••";

    if (isNewPass) {
      await query(
        `UPDATE crm_email_smtp_config SET
          host=$1, port=$2, smtp_user=$3, from_name=$4, from_email=$5, secure=$6,
          smtp_pass=$7, updated_at=NOW()
         WHERE id='default'`,
        [body.host, body.port, body.user, body.fromName, body.fromEmail, body.secure, body.pass]
      );
    } else {
      await query(
        `UPDATE crm_email_smtp_config SET
          host=$1, port=$2, smtp_user=$3, from_name=$4, from_email=$5, secure=$6,
          updated_at=NOW()
         WHERE id='default'`,
        [body.host, body.port, body.user, body.fromName, body.fromEmail, body.secure]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Email Config POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
