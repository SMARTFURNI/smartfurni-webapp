import "server-only";

import { randomUUID } from "crypto";
import { query, queryOne } from "@/lib/db";

export type AutomationConfigScope = "rules" | "sla" | "auto_assign" | "contact_policy" | "b2b_sofa" | "b2c_ergonomic" | "b2c_sofa";
export type AutomationVersionStatus = "draft" | "published" | "archived";

export interface AutomationConfigVersion {
  id: string;
  scope: AutomationConfigScope;
  version: number;
  status: AutomationVersionStatus;
  note: string;
  actorId: string;
  actorName: string;
  createdAt: string;
}

async function ensureGovernanceSchema(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_automation_config_versions (
      id TEXT PRIMARY KEY,
      scope TEXT NOT NULL,
      version INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'published',
      snapshot JSONB NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      actor_id TEXT NOT NULL DEFAULT 'system',
      actor_name TEXT NOT NULL DEFAULT 'System',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(scope,version)
    );
    CREATE INDEX IF NOT EXISTS idx_crm_automation_versions_scope
      ON crm_automation_config_versions(scope,created_at DESC);
  `);
}

export async function saveAutomationConfigVersion(input: {
  scope: AutomationConfigScope;
  snapshot: unknown;
  status?: AutomationVersionStatus;
  note?: string;
  actorId?: string;
  actorName?: string;
}): Promise<AutomationConfigVersion> {
  await ensureGovernanceSchema();
  const row = await queryOne<Record<string, unknown>>(
    `WITH next_version AS (
       SELECT COALESCE(MAX(version),0)+1 AS value FROM crm_automation_config_versions WHERE scope=$1
     )
     INSERT INTO crm_automation_config_versions
       (id,scope,version,status,snapshot,note,actor_id,actor_name)
     SELECT $2,$1,value,$3,$4::jsonb,$5,$6,$7 FROM next_version RETURNING *`,
    [input.scope, randomUUID(), input.status || "published", JSON.stringify(input.snapshot), input.note || "", input.actorId || "system", input.actorName || "System"],
  );
  if (!row) throw new Error("Không lưu được phiên bản automation.");
  return mapVersion(row);
}

export async function listAutomationConfigVersions(scope?: AutomationConfigScope, limit = 50): Promise<AutomationConfigVersion[]> {
  await ensureGovernanceSchema();
  const rows = await query<Record<string, unknown>>(
    `SELECT id,scope,version,status,note,actor_id,actor_name,created_at
     FROM crm_automation_config_versions
     WHERE ($1::text IS NULL OR scope=$1) ORDER BY created_at DESC LIMIT $2`,
    [scope || null, Math.max(1, Math.min(limit, 200))],
  );
  return rows.map(mapVersion);
}

export async function getAutomationConfigVersion(id: string): Promise<{ version: AutomationConfigVersion; snapshot: unknown } | null> {
  await ensureGovernanceSchema();
  const row = await queryOne<Record<string, unknown>>(`SELECT * FROM crm_automation_config_versions WHERE id=$1`, [id]);
  return row ? { version: mapVersion(row), snapshot: row.snapshot } : null;
}

function mapVersion(row: Record<string, unknown>): AutomationConfigVersion {
  return {
    id: String(row.id), scope: row.scope as AutomationConfigScope, version: Number(row.version),
    status: row.status as AutomationVersionStatus, note: String(row.note || ""),
    actorId: String(row.actor_id || "system"), actorName: String(row.actor_name || "System"),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}
