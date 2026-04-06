import { NextResponse } from "next/server";
import { getCrmSession } from "@/lib/admin-auth";
import { query } from "@/lib/db";

export async function GET() {
  const session = await getCrmSession();
  if (!session || !session.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  // 1. Check DB connection
  try {
    const r = await query("SELECT NOW() as now");
    results.db_connected = true;
    results.db_time = r.rows[0]?.now;
  } catch (e) {
    results.db_connected = false;
    results.db_error = (e as Error).message;
    return NextResponse.json(results);
  }

  // 2. Check if content_videos table exists
  try {
    const r = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'content_videos'
      ) as exists
    `);
    results.table_exists = r.rows[0]?.exists;
  } catch (e) {
    results.table_check_error = (e as Error).message;
  }

  // 3. Try to create table if not exists
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS content_videos (
        id TEXT PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        topic VARCHAR(500),
        platform VARCHAR(50) NOT NULL DEFAULT 'tiktok',
        status VARCHAR(50) NOT NULL DEFAULT 'idea',
        script TEXT,
        script_generated_by VARCHAR(20),
        ai_prompt TEXT,
        duration_seconds INT,
        hashtags TEXT[],
        notes TEXT,
        thumbnail_url TEXT,
        video_url TEXT,
        published_url TEXT,
        scheduled_at TIMESTAMP,
        published_at TIMESTAMP,
        views_count INT DEFAULT 0,
        likes_count INT DEFAULT 0,
        comments_count INT DEFAULT 0,
        shares_count INT DEFAULT 0,
        created_by VARCHAR(255),
        created_by_name VARCHAR(255),
        assigned_to VARCHAR(255),
        assigned_to_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    results.table_created_ok = true;
  } catch (e) {
    results.table_create_error = (e as Error).message;
  }

  // 4. Count rows
  try {
    const r = await query("SELECT COUNT(*) as count FROM content_videos");
    results.video_count = parseInt(r.rows[0]?.count || "0");
  } catch (e) {
    results.count_error = (e as Error).message;
  }

  // 5. Try insert a test row
  try {
    const { randomUUID } = await import("crypto");
    const testId = randomUUID();
    await query(
      `INSERT INTO content_videos (id, title, platform, status, created_by, created_by_name, hashtags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [testId, "__debug_test__", "tiktok", "idea", "debug", "Debug", []]
    );
    results.insert_ok = true;
    // Clean up
    await query("DELETE FROM content_videos WHERE title = '__debug_test__'");
    results.cleanup_ok = true;
  } catch (e) {
    results.insert_error = (e as Error).message;
  }

  return NextResponse.json(results);
}
