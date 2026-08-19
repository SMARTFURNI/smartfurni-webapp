import { NextRequest, NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { query, queryOne } from "@/lib/db";
import {
  DEFAULT_ZALO_SOUND_PREFERENCES,
  clampZaloSoundVolume,
  isZaloRingtoneId,
  type ZaloSoundPreferences,
} from "@/lib/zalo-inbox-ringtones";

export const dynamic = "force-dynamic";

type PreferenceRow = {
  sound_enabled: boolean;
  ringtone_id: string;
  volume: number;
};

async function ensurePreferencesTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_zalo_inbox_preferences (
      actor_id TEXT PRIMARY KEY,
      sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      ringtone_id TEXT NOT NULL DEFAULT 'signature',
      volume SMALLINT NOT NULL DEFAULT 55 CHECK (volume BETWEEN 0 AND 100),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function actorId(session: { isAdmin: boolean; staffId?: string }): string | null {
  if (session.isAdmin) return "admin";
  return session.staffId ? `staff:${session.staffId}` : null;
}

function serialize(row: PreferenceRow | null): ZaloSoundPreferences {
  if (!row) return DEFAULT_ZALO_SOUND_PREFERENCES;
  return {
    soundEnabled: row.sound_enabled !== false,
    ringtoneId: isZaloRingtoneId(row.ringtone_id)
      ? row.ringtone_id
      : DEFAULT_ZALO_SOUND_PREFERENCES.ringtoneId,
    volume: clampZaloSoundVolume(row.volume),
  };
}

export async function GET() {
  try {
    const session = await getCrmSession();
    if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const id = actorId(session);
    if (!id) return NextResponse.json(DEFAULT_ZALO_SOUND_PREFERENCES);
    await ensurePreferencesTable();
    const row = await queryOne<PreferenceRow>(
      `SELECT sound_enabled, ringtone_id, volume
       FROM crm_zalo_inbox_preferences WHERE actor_id = $1`,
      [id],
    );
    return NextResponse.json(serialize(row));
  } catch (error) {
    console.error("[/api/crm/me/zalo-inbox-preferences] GET", error);
    return NextResponse.json(DEFAULT_ZALO_SOUND_PREFERENCES);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getCrmSession();
    if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const id = actorId(session);
    if (!id) return NextResponse.json({ error: "Không tìm thấy tài khoản nhân viên" }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    if (body.ringtoneId !== undefined && !isZaloRingtoneId(body.ringtoneId)) {
      return NextResponse.json({ error: "Mẫu chuông không hợp lệ" }, { status: 400 });
    }

    await ensurePreferencesTable();
    const current = await queryOne<PreferenceRow>(
      `SELECT sound_enabled, ringtone_id, volume
       FROM crm_zalo_inbox_preferences WHERE actor_id = $1`,
      [id],
    );
    const existing = serialize(current);
    const next: ZaloSoundPreferences = {
      soundEnabled: body.soundEnabled === undefined ? existing.soundEnabled : Boolean(body.soundEnabled),
      ringtoneId: isZaloRingtoneId(body.ringtoneId) ? body.ringtoneId : existing.ringtoneId,
      volume: body.volume === undefined ? existing.volume : clampZaloSoundVolume(body.volume),
    };
    await query(
      `INSERT INTO crm_zalo_inbox_preferences (actor_id, sound_enabled, ringtone_id, volume, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (actor_id) DO UPDATE SET
         sound_enabled = EXCLUDED.sound_enabled,
         ringtone_id = EXCLUDED.ringtone_id,
         volume = EXCLUDED.volume,
         updated_at = NOW()`,
      [id, next.soundEnabled, next.ringtoneId, next.volume],
    );
    return NextResponse.json({ success: true, ...next });
  } catch (error) {
    console.error("[/api/crm/me/zalo-inbox-preferences] PATCH", error);
    return NextResponse.json({ error: "Không lưu được cài đặt chuông" }, { status: 500 });
  }
}
