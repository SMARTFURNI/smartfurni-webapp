/**
 * session-store.ts
 * Tracks visitor sessions and their page journey with time-on-page data.
 * Uses PostgreSQL for persistence.
 *
 * Tables:
 *   visitor_sessions  - one row per browser session
 *   session_events    - one row per page visit within a session
 */

import { getDb } from "./db";
import type { Pool } from "pg";

function getPool(): Pool | null {
  try { return getDb(); } catch { return null; }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SessionEvent {
  id: string;
  sessionId: string;
  path: string;
  title: string;
  enteredAt: string;   // ISO timestamp
  duration: number;    // seconds spent on this page (0 = still active)
  isActive: boolean;
}

export interface VisitorSession {
  sessionId: string;
  startedAt: string;   // ISO timestamp
  lastSeenAt: string;  // ISO timestamp
  totalDuration: number; // seconds (sum of all page durations)
  pageCount: number;
  device: string;      // Desktop | Mobile | Tablet
  browser: string;
  os: string;
  country: string;
  referrer: string;
  entryPage: string;
  exitPage: string;
  isActive: boolean;   // last seen < 30 min ago
  events: SessionEvent[];
}

export interface SessionListItem {
  sessionId: string;
  startedAt: string;
  lastSeenAt: string;
  totalDuration: number;
  pageCount: number;
  device: string;
  browser: string;
  os: string;
  referrer: string;
  entryPage: string;
  exitPage: string;
  isActive: boolean;
}

export interface SessionsResult {
  sessions: SessionListItem[];
  total: number;
  activeNow: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseUA(ua: string): { device: string; browser: string; os: string } {
  const uaLower = ua.toLowerCase();
  // Device
  let device = "Desktop";
  if (/mobile|android|iphone|ipod/.test(uaLower)) device = "Mobile";
  else if (/tablet|ipad/.test(uaLower)) device = "Tablet";
  // Browser
  let browser = "Other";
  if (uaLower.includes("chrome") && !uaLower.includes("edg")) browser = "Chrome";
  else if (uaLower.includes("firefox")) browser = "Firefox";
  else if (uaLower.includes("safari") && !uaLower.includes("chrome")) browser = "Safari";
  else if (uaLower.includes("edg")) browser = "Edge";
  else if (uaLower.includes("opera") || uaLower.includes("opr")) browser = "Opera";
  // OS
  let os = "Other";
  if (uaLower.includes("windows")) os = "Windows";
  else if (uaLower.includes("mac os") || uaLower.includes("macos")) os = "macOS";
  else if (uaLower.includes("iphone") || uaLower.includes("ipad")) os = "iOS";
  else if (uaLower.includes("android")) os = "Android";
  else if (uaLower.includes("linux")) os = "Linux";
  return { device, browser, os };
}

function cleanReferrer(ref: string): string {
  if (!ref) return "Direct";
  try {
    const u = new URL(ref);
    const host = u.hostname.replace(/^www\./, "");
    if (host.includes("google")) return "Google";
    if (host.includes("facebook") || host.includes("fb.com")) return "Facebook";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("tiktok")) return "TikTok";
    if (host.includes("youtube")) return "YouTube";
    if (host.includes("zalo")) return "Zalo";
    return host;
  } catch {
    return "Direct";
  }
}

// ─── DB Setup ────────────────────────────────────────────────────────────────

export async function ensureSessionTables(): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS visitor_sessions (
        session_id    TEXT PRIMARY KEY,
        started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ua            TEXT DEFAULT '',
        referrer      TEXT DEFAULT '',
        entry_page    TEXT DEFAULT '/',
        exit_page     TEXT DEFAULT '/',
        page_count    INT DEFAULT 0,
        total_duration INT DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_vs_last_seen ON visitor_sessions(last_seen_at DESC);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS session_events (
        id            TEXT PRIMARY KEY,
        session_id    TEXT NOT NULL REFERENCES visitor_sessions(session_id) ON DELETE CASCADE,
        path          TEXT NOT NULL,
        title         TEXT DEFAULT '',
        entered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        duration      INT DEFAULT 0,
        seq           INT DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_se_session ON session_events(session_id, seq);
    `);
  } catch (err) {
    console.error("[session-store] ensureSessionTables error:", (err as Error).message);
  }
}

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * Called when a visitor enters a new page.
 * Creates or updates the session, and inserts a new session_event.
 */
export async function trackSessionPage(params: {
  sessionId: string;
  path: string;
  title: string;
  referrer: string;
  ua: string;
  prevPath?: string;
  prevDuration?: number; // seconds spent on previous page
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const { sessionId, path, title, referrer, ua, prevPath, prevDuration } = params;
  const { device, browser, os } = parseUA(ua);
  const cleanRef = cleanReferrer(referrer);
  try {
    // Upsert session
    await pool.query(
      `INSERT INTO visitor_sessions (session_id, started_at, last_seen_at, ua, referrer, entry_page, exit_page, page_count, total_duration)
       VALUES ($1, NOW(), NOW(), $2, $3, $4, $4, 1, 0)
       ON CONFLICT (session_id) DO UPDATE SET
         last_seen_at = NOW(),
         exit_page = $4,
         page_count = visitor_sessions.page_count + 1
      `,
      [sessionId, ua, cleanRef, path]
    );
    // Update duration of previous page if provided
    if (prevPath && prevDuration && prevDuration > 0) {
      await pool.query(
        `UPDATE session_events
         SET duration = $1
         WHERE session_id = $2 AND path = $3 AND duration = 0
         ORDER BY entered_at DESC
         LIMIT 1`,
        [prevDuration, sessionId, prevPath]
      );
      // Also update total_duration in session
      await pool.query(
        `UPDATE visitor_sessions SET total_duration = total_duration + $1 WHERE session_id = $2`,
        [prevDuration, sessionId]
      );
    }
    // Get next seq number
    const seqRes = await pool.query(
      `SELECT COALESCE(MAX(seq), 0) + 1 as next_seq FROM session_events WHERE session_id = $1`,
      [sessionId]
    );
    const seq = seqRes.rows[0]?.next_seq || 1;
    // Insert new event
    const eventId = `${sessionId}_${seq}_${Date.now()}`;
    await pool.query(
      `INSERT INTO session_events (id, session_id, path, title, entered_at, duration, seq)
       VALUES ($1, $2, $3, $4, NOW(), 0, $5)`,
      [eventId, sessionId, path, title || path, seq]
    );
  } catch (err) {
    console.error("[session-store] trackSessionPage error:", (err as Error).message);
  }
}

/**
 * Called when visitor leaves (beforeunload) to record final page duration.
 */
export async function updatePageDuration(params: {
  sessionId: string;
  path: string;
  duration: number;
}): Promise<void> {
  const pool = getPool();
  if (!pool) return;
  const { sessionId, path, duration } = params;
  if (duration <= 0) return;
  try {
    // Update the most recent event for this path in this session
    await pool.query(
      `UPDATE session_events
       SET duration = $1
       WHERE id = (
         SELECT id FROM session_events
         WHERE session_id = $2 AND path = $3 AND duration = 0
         ORDER BY entered_at DESC
         LIMIT 1
       )`,
      [duration, sessionId, path]
    );
    // Update total_duration
    await pool.query(
      `UPDATE visitor_sessions SET total_duration = total_duration + $1, last_seen_at = NOW()
       WHERE session_id = $2`,
      [duration, sessionId]
    );
  } catch (err) {
    console.error("[session-store] updatePageDuration error:", (err as Error).message);
  }
}

// ─── Read Operations ──────────────────────────────────────────────────────────

export async function getSessions(params: {
  limit?: number;
  offset?: number;
  filter?: "all" | "active" | "today" | "week";
}): Promise<SessionsResult> {
  const pool = getPool();
  const empty: SessionsResult = { sessions: [], total: 0, activeNow: 0 };
  if (!pool) return empty;

  const { limit = 50, offset = 0, filter = "all" } = params;

  let whereClause = "";
  if (filter === "active") {
    whereClause = "WHERE last_seen_at >= NOW() - INTERVAL '30 minutes'";
  } else if (filter === "today") {
    whereClause = "WHERE last_seen_at >= NOW() - INTERVAL '1 day'";
  } else if (filter === "week") {
    whereClause = "WHERE last_seen_at >= NOW() - INTERVAL '7 days'";
  }

  try {
    const [sessionsRes, countRes, activeRes] = await Promise.all([
      pool.query(
        `SELECT session_id, started_at, last_seen_at, ua, referrer, entry_page, exit_page, page_count, total_duration
         FROM visitor_sessions
         ${whereClause}
         ORDER BY last_seen_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*) as total FROM visitor_sessions ${whereClause}`),
      pool.query(
        `SELECT COUNT(*) as active FROM visitor_sessions WHERE last_seen_at >= NOW() - INTERVAL '30 minutes'`
      ),
    ]);

    const now = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessions: SessionListItem[] = sessionsRes.rows.map((r: any) => {
      const { device, browser, os } = parseUA(r.ua || "");
      const lastSeen = new Date(r.last_seen_at).getTime();
      const isActive = now - lastSeen < 30 * 60 * 1000;
      return {
        sessionId: r.session_id,
        startedAt: new Date(r.started_at).toISOString(),
        lastSeenAt: new Date(r.last_seen_at).toISOString(),
        totalDuration: parseInt(r.total_duration) || 0,
        pageCount: parseInt(r.page_count) || 0,
        device,
        browser,
        os,
        referrer: r.referrer || "Direct",
        entryPage: r.entry_page || "/",
        exitPage: r.exit_page || "/",
        isActive,
      };
    });

    return {
      sessions,
      total: parseInt(countRes.rows[0]?.total) || 0,
      activeNow: parseInt(activeRes.rows[0]?.active) || 0,
    };
  } catch (err) {
    console.error("[session-store] getSessions error:", (err as Error).message);
    return empty;
  }
}

export async function getSessionDetail(sessionId: string): Promise<VisitorSession | null> {
  const pool = getPool();
  if (!pool) return null;
  try {
    const [sessionRes, eventsRes] = await Promise.all([
      pool.query(
        `SELECT session_id, started_at, last_seen_at, ua, referrer, entry_page, exit_page, page_count, total_duration
         FROM visitor_sessions WHERE session_id = $1`,
        [sessionId]
      ),
      pool.query(
        `SELECT id, session_id, path, title, entered_at, duration, seq
         FROM session_events WHERE session_id = $1 ORDER BY seq ASC`,
        [sessionId]
      ),
    ]);

    if (!sessionRes.rows[0]) return null;

    const s = sessionRes.rows[0];
    const { device, browser, os } = parseUA(s.ua || "");
    const now = Date.now();
    const lastSeen = new Date(s.last_seen_at).getTime();
    const isActive = now - lastSeen < 30 * 60 * 1000;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events: SessionEvent[] = eventsRes.rows.map((e: any, idx: number) => ({
      id: e.id,
      sessionId: e.session_id,
      path: e.path,
      title: e.title || e.path,
      enteredAt: new Date(e.entered_at).toISOString(),
      duration: parseInt(e.duration) || 0,
      isActive: idx === eventsRes.rows.length - 1 && isActive,
    }));

    return {
      sessionId: s.session_id,
      startedAt: new Date(s.started_at).toISOString(),
      lastSeenAt: new Date(s.last_seen_at).toISOString(),
      totalDuration: parseInt(s.total_duration) || 0,
      pageCount: parseInt(s.page_count) || 0,
      device,
      browser,
      os,
      country: "Việt Nam",
      referrer: s.referrer || "Direct",
      entryPage: s.entry_page || "/",
      exitPage: s.exit_page || "/",
      isActive,
      events,
    };
  } catch (err) {
    console.error("[session-store] getSessionDetail error:", (err as Error).message);
    return null;
  }
}

export async function getActiveSessionCount(): Promise<number> {
  const pool = getPool();
  if (!pool) return 0;
  try {
    const res = await pool.query(
      `SELECT COUNT(*) as active FROM visitor_sessions WHERE last_seen_at >= NOW() - INTERVAL '30 minutes'`
    );
    return parseInt(res.rows[0]?.active) || 0;
  } catch {
    return 0;
  }
}
