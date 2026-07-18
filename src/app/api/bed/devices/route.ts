import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { ensureSmartBedAccountTables, getSmartBedSession } from "@/lib/smart-bed-auth";

export async function GET() {
  const user = await getSmartBedSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  await ensureSmartBedAccountTables();
  const devices = await query(
    `SELECT id, hardware_id AS "hardwareId", name, profile_id AS "profileId", transport, firmware,
            last_seen_at AS "lastSeenAt", created_at AS "createdAt"
     FROM smart_bed_devices WHERE user_id = $1 ORDER BY last_seen_at DESC`,
    [user.id],
  );
  return NextResponse.json({ devices });
}

export async function POST(request: NextRequest) {
  const user = await getSmartBedSession();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  await ensureSmartBedAccountTables();
  const body = await request.json() as { hardwareId?: string; name?: string; profileId?: string; transport?: string; firmware?: string };
  if (!body.hardwareId || !body.name || !body.profileId || !body.transport) {
    return NextResponse.json({ error: "Thiếu thông tin thiết bị" }, { status: 400 });
  }
  const id = `sbd_${randomUUID()}`;
  const rows = await query<{ id: string }>(
    `INSERT INTO smart_bed_devices (id, user_id, hardware_id, name, profile_id, transport, firmware)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, hardware_id) DO UPDATE SET
       name = EXCLUDED.name, profile_id = EXCLUDED.profile_id, transport = EXCLUDED.transport,
       firmware = EXCLUDED.firmware, last_seen_at = NOW()
     RETURNING id`,
    [id, user.id, body.hardwareId.slice(0, 200), body.name.slice(0, 120), body.profileId.slice(0, 80), body.transport.slice(0, 30), (body.firmware || "").slice(0, 60)],
  );
  return NextResponse.json({ success: true, id: rows[0]?.id });
}
