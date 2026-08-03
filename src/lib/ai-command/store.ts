import { randomUUID } from "crypto";
import { query, queryOne } from "@/lib/db";
import type {
  AiApprovalRequest,
  AiApprovalStatus,
  AiChatMessage,
  AiChatThread,
  AiCommandActor,
  AiCommandSnapshot,
  AiCommandSurface,
  AiRiskLevel,
  AiRunRecord,
  AiRunStatus,
} from "./types";

let initialized = false;

export async function initAiCommandSchema() {
  if (initialized) return;
  await query(`
    CREATE TABLE IF NOT EXISTS ai_chat_threads (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      owner_kind TEXT NOT NULL,
      surface TEXT NOT NULL DEFAULT 'crm',
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES ai_chat_threads(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS ai_runs (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES ai_chat_threads(id) ON DELETE CASCADE,
      actor_id TEXT NOT NULL,
      actor_kind TEXT NOT NULL,
      model TEXT NOT NULL,
      status TEXT NOT NULL,
      input TEXT NOT NULL,
      output TEXT,
      error TEXT,
      state_json TEXT,
      usage JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS ai_tool_calls (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES ai_runs(id) ON DELETE CASCADE,
      thread_id TEXT NOT NULL REFERENCES ai_chat_threads(id) ON DELETE CASCADE,
      tool_name TEXT NOT NULL,
      risk_level TEXT NOT NULL,
      arguments JSONB DEFAULT '{}'::jsonb,
      result JSONB DEFAULT '{}'::jsonb,
      status TEXT NOT NULL,
      error TEXT,
      duration_ms INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS ai_approval_requests (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES ai_runs(id) ON DELETE CASCADE,
      thread_id TEXT NOT NULL REFERENCES ai_chat_threads(id) ON DELETE CASCADE,
      tool_name TEXT NOT NULL,
      tool_call_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      arguments JSONB DEFAULT '{}'::jsonb,
      risk_level TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at TIMESTAMPTZ NOT NULL,
      decided_by TEXT,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_ai_threads_owner ON ai_chat_threads(owner_id, updated_at DESC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ai_messages_thread ON ai_chat_messages(thread_id, created_at ASC)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ai_runs_thread ON ai_runs(thread_id, created_at DESC)`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_runs_one_active ON ai_runs(thread_id) WHERE status IN ('running', 'awaiting_approval')`);
  await query(`CREATE INDEX IF NOT EXISTS idx_ai_approvals_thread ON ai_approval_requests(thread_id, created_at DESC)`);
  initialized = true;
}

function iso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return String(value || "");
}

function mapThread(row: Record<string, unknown>): AiChatThread {
  return {
    id: String(row.id), ownerId: String(row.owner_id), ownerKind: row.owner_kind as AiChatThread["ownerKind"],
    surface: row.surface as AiCommandSurface, title: String(row.title), status: row.status as AiChatThread["status"],
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  };
}

function mapMessage(row: Record<string, unknown>): AiChatMessage {
  return {
    id: String(row.id), threadId: String(row.thread_id), role: row.role as AiChatMessage["role"],
    content: String(row.content), metadata: (row.metadata || {}) as Record<string, unknown>, createdAt: iso(row.created_at),
  };
}

function mapRun(row: Record<string, unknown>): AiRunRecord {
  return {
    id: String(row.id), threadId: String(row.thread_id), actorId: String(row.actor_id),
    actorKind: row.actor_kind as AiRunRecord["actorKind"], model: String(row.model), status: row.status as AiRunStatus,
    input: String(row.input), output: row.output ? String(row.output) : undefined,
    error: row.error ? String(row.error) : undefined, usage: (row.usage || {}) as Record<string, unknown>,
    createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  };
}

function mapApproval(row: Record<string, unknown>): AiApprovalRequest {
  return {
    id: String(row.id), runId: String(row.run_id), threadId: String(row.thread_id),
    toolName: String(row.tool_name), toolCallId: String(row.tool_call_id), title: String(row.title),
    description: String(row.description), arguments: (row.arguments || {}) as Record<string, unknown>,
    riskLevel: row.risk_level as AiRiskLevel, status: row.status as AiApprovalStatus,
    expiresAt: iso(row.expires_at), decidedAt: row.decided_at ? iso(row.decided_at) : undefined,
    createdAt: iso(row.created_at),
  };
}

export async function createThread(actor: AiCommandActor, surface: AiCommandSurface, title: string) {
  await initAiCommandSchema();
  const id = randomUUID();
  const safeTitle = title.trim().replace(/\s+/g, " ").slice(0, 80) || "Cuộc hội thoại mới";
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO ai_chat_threads (id, owner_id, owner_kind, surface, title)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [id, actor.id, actor.kind, surface, safeTitle],
  );
  return mapThread(row!);
}

export async function listThreads(actor: AiCommandActor) {
  await initAiCommandSchema();
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM ai_chat_threads WHERE owner_id = $1 AND owner_kind = $2 AND status = 'active'
     ORDER BY updated_at DESC LIMIT 50`, [actor.id, actor.kind],
  );
  return rows.map(mapThread);
}

export async function getOwnedThread(threadId: string, actor: AiCommandActor) {
  await initAiCommandSchema();
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM ai_chat_threads WHERE id = $1 AND owner_id = $2 AND owner_kind = $3`,
    [threadId, actor.id, actor.kind],
  );
  return row ? mapThread(row) : null;
}

export async function touchThread(threadId: string) {
  await query(`UPDATE ai_chat_threads SET updated_at = NOW() WHERE id = $1`, [threadId]);
}

export async function addMessage(threadId: string, role: AiChatMessage["role"], content: string, metadata: Record<string, unknown> = {}) {
  await initAiCommandSchema();
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO ai_chat_messages (id, thread_id, role, content, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *`,
    [randomUUID(), threadId, role, content, JSON.stringify(metadata)],
  );
  await touchThread(threadId);
  return mapMessage(row!);
}

export async function listMessages(threadId: string, limit = 100) {
  await initAiCommandSchema();
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM (
       SELECT * FROM ai_chat_messages WHERE thread_id = $1 ORDER BY created_at DESC LIMIT $2
     ) recent ORDER BY created_at ASC`, [threadId, limit],
  );
  return rows.map(mapMessage);
}

export async function createRun(params: { threadId: string; actor: AiCommandActor; model: string; input: string }) {
  await initAiCommandSchema();
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO ai_runs (id, thread_id, actor_id, actor_kind, model, status, input)
     VALUES ($1, $2, $3, $4, $5, 'running', $6) RETURNING *`,
    [randomUUID(), params.threadId, params.actor.id, params.actor.kind, params.model, params.input],
  );
  return mapRun(row!);
}

export async function hasActiveRun(threadId: string) {
  await initAiCommandSchema();
  const row = await queryOne<{ active: boolean }>(
    `SELECT EXISTS(
       SELECT 1 FROM ai_runs WHERE thread_id = $1 AND status IN ('running', 'awaiting_approval')
     ) AS active`, [threadId],
  );
  return row?.active === true;
}

export async function updateRun(runId: string, updates: {
  status: AiRunStatus; output?: string | null; error?: string | null; stateJson?: string | null; usage?: Record<string, unknown>;
}) {
  const row = await queryOne<Record<string, unknown>>(
    `UPDATE ai_runs SET status = $2, output = COALESCE($3, output), error = $4,
       state_json = $5, usage = COALESCE($6::jsonb, usage), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [runId, updates.status, updates.output ?? null, updates.error ?? null, updates.stateJson ?? null,
      updates.usage ? JSON.stringify(updates.usage) : null],
  );
  return row ? mapRun(row) : null;
}

export async function getRunWithState(runId: string) {
  await initAiCommandSchema();
  return queryOne<Record<string, unknown>>(`SELECT * FROM ai_runs WHERE id = $1`, [runId]);
}

export async function listRuns(threadId: string) {
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM ai_runs WHERE thread_id = $1 ORDER BY created_at DESC LIMIT 30`, [threadId],
  );
  return rows.map(mapRun);
}

export async function createApproval(params: {
  runId: string; threadId: string; toolName: string; toolCallId: string; title: string;
  description: string; arguments: Record<string, unknown>; riskLevel: AiRiskLevel;
}) {
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO ai_approval_requests
       (id, run_id, thread_id, tool_name, tool_call_id, title, description, arguments, risk_level, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) RETURNING *`,
    [randomUUID(), params.runId, params.threadId, params.toolName, params.toolCallId, params.title,
      params.description, JSON.stringify(params.arguments), params.riskLevel, expiresAt],
  );
  return mapApproval(row!);
}

export async function getApproval(approvalId: string) {
  const row = await queryOne<Record<string, unknown>>(`SELECT * FROM ai_approval_requests WHERE id = $1`, [approvalId]);
  return row ? mapApproval(row) : null;
}

export async function decideApproval(approvalId: string, status: "approved" | "rejected" | "expired", decidedBy: string) {
  const row = await queryOne<Record<string, unknown>>(
    `UPDATE ai_approval_requests SET status = $2, decided_by = $3, decided_at = NOW()
     WHERE id = $1 AND status = 'pending' RETURNING *`, [approvalId, status, decidedBy],
  );
  return row ? mapApproval(row) : null;
}

export async function listApprovals(threadId: string) {
  await query(
    `UPDATE ai_approval_requests SET status = 'expired', decided_at = NOW()
     WHERE thread_id = $1 AND status = 'pending' AND expires_at < NOW()`, [threadId],
  );
  await query(
    `UPDATE ai_runs r SET status = 'cancelled', error = 'Yêu cầu phê duyệt đã hết hạn.', updated_at = NOW()
     WHERE r.thread_id = $1 AND r.status = 'awaiting_approval'
       AND NOT EXISTS (SELECT 1 FROM ai_approval_requests a WHERE a.run_id = r.id AND a.status = 'pending')`,
    [threadId],
  );
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM ai_approval_requests WHERE thread_id = $1 ORDER BY created_at DESC LIMIT 50`, [threadId],
  );
  return rows.map(mapApproval);
}

export async function startToolCall(params: {
  runId: string; threadId: string; toolName: string; riskLevel: AiRiskLevel; arguments: Record<string, unknown>;
}) {
  const id = randomUUID();
  await query(
    `INSERT INTO ai_tool_calls (id, run_id, thread_id, tool_name, risk_level, arguments, status)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,'running')`,
    [id, params.runId, params.threadId, params.toolName, params.riskLevel, JSON.stringify(params.arguments)],
  );
  return { id, startedAt: Date.now() };
}

export async function finishToolCall(id: string, startedAt: number, result: Record<string, unknown>, error?: string) {
  await query(
    `UPDATE ai_tool_calls SET result = $2::jsonb, status = $3, error = $4, duration_ms = $5, updated_at = NOW()
     WHERE id = $1`, [id, JSON.stringify(result), error ? "failed" : "completed", error || null, Date.now() - startedAt],
  );
}

export async function getSnapshot(threadId: string, actor: AiCommandActor): Promise<AiCommandSnapshot | null> {
  const thread = await getOwnedThread(threadId, actor);
  if (!thread) return null;
  const [messages, runs, approvals] = await Promise.all([
    listMessages(threadId), listRuns(threadId), listApprovals(threadId),
  ]);
  return { thread, messages, runs, approvals };
}
