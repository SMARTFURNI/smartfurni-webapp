/**
 * CRM Content Marketing Store
 * Quản lý video content: kịch bản AI, kế hoạch sản xuất, lịch đăng bài
 */
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ContentPlatform = "tiktok" | "facebook" | "youtube" | "all";
export type ContentStatus =
  | "idea"
  | "scripted"
  | "recording"
  | "editing"
  | "published"
  | "cancelled";

export interface ContentVideo {
  id: string;
  title: string;
  topic?: string;
  platform: ContentPlatform;
  status: ContentStatus;
  script?: string;
  scriptGeneratedBy?: "ai" | "manual";
  aiPrompt?: string;
  durationSeconds?: number;
  hashtags: string[];
  notes?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  publishedUrl?: string;
  scheduledAt?: string;
  publishedAt?: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentAIGeneration {
  id: string;
  videoId?: string;
  platform: ContentPlatform;
  topic: string;
  productName?: string;
  targetAudience?: string;
  tone?: string;
  durationSeconds?: number;
  additionalNotes?: string;
  promptUsed: string;
  generatedScript: string;
  modelUsed: string;
  tokensUsed?: number;
  generationTimeMs?: number;
  wasSaved: boolean;
  createdBy: string;
  createdAt: string;
}

export interface ContentScriptTemplate {
  id: string;
  name: string;
  platform: ContentPlatform;
  category?: string;
  templateText: string;
  variables: string[];
  usageCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── In-memory store ──────────────────────────────────────────────────────────
let videos: ContentVideo[] = [];
let aiGenerations: ContentAIGeneration[] = [];
let scriptTemplates: ContentScriptTemplate[] = [];

// ─── DB Row Mappers ───────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapVideoRow(row: any): ContentVideo {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    platform: row.platform as ContentPlatform,
    status: row.status as ContentStatus,
    script: row.script,
    scriptGeneratedBy: row.script_generated_by,
    aiPrompt: row.ai_prompt,
    durationSeconds: row.duration_seconds,
    hashtags: row.hashtags || [],
    notes: row.notes,
    thumbnailUrl: row.thumbnail_url,
    videoUrl: row.video_url,
    publishedUrl: row.published_url,
    scheduledAt: row.scheduled_at?.toISOString(),
    publishedAt: row.published_at?.toISOString(),
    viewsCount: row.views_count || 0,
    likesCount: row.likes_count || 0,
    commentsCount: row.comments_count || 0,
    sharesCount: row.shares_count || 0,
    createdBy: row.created_by || "",
    createdByName: row.created_by_name || "",
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to_name,
    createdAt: row.created_at?.toISOString() || new Date().toISOString(),
    updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAIGenRow(row: any): ContentAIGeneration {
  return {
    id: row.id,
    videoId: row.video_id,
    platform: row.platform as ContentPlatform,
    topic: row.topic,
    productName: row.product_name,
    targetAudience: row.target_audience,
    tone: row.tone,
    durationSeconds: row.duration_seconds,
    additionalNotes: row.additional_notes,
    promptUsed: row.prompt_used,
    generatedScript: row.generated_script,
    modelUsed: row.model_used || "gemini-2.5-flash",
    tokensUsed: row.tokens_used,
    generationTimeMs: row.generation_time_ms,
    wasSaved: row.was_saved || false,
    createdBy: row.created_by || "",
    createdAt: row.created_at?.toISOString() || new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTemplateRow(row: any): ContentScriptTemplate {
  return {
    id: row.id,
    name: row.name,
    platform: row.platform as ContentPlatform,
    category: row.category,
    templateText: row.template_text,
    variables: row.variables || [],
    usageCount: row.usage_count || 0,
    createdBy: row.created_by || "",
    createdAt: row.created_at?.toISOString() || new Date().toISOString(),
    updatedAt: row.updated_at?.toISOString() || new Date().toISOString(),
  };
}

// ─── Load from DB ─────────────────────────────────────────────────────────────
export async function loadContentMarketingFromDb(): Promise<void> {
  try {
    // Ensure tables exist
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

    await query(`
      CREATE TABLE IF NOT EXISTS content_ai_generations (
        id TEXT PRIMARY KEY,
        video_id TEXT REFERENCES content_videos(id) ON DELETE SET NULL,
        platform VARCHAR(50) NOT NULL,
        topic VARCHAR(500) NOT NULL,
        product_name VARCHAR(500),
        target_audience VARCHAR(500),
        tone VARCHAR(100),
        duration_seconds INT,
        additional_notes TEXT,
        prompt_used TEXT NOT NULL,
        generated_script TEXT NOT NULL,
        model_used VARCHAR(100) DEFAULT 'gemini-2.5-flash',
        tokens_used INT,
        generation_time_ms INT,
        was_saved BOOLEAN DEFAULT FALSE,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS content_script_templates (
        id TEXT PRIMARY KEY,
        name VARCHAR(500) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        category VARCHAR(100),
        template_text TEXT NOT NULL,
        variables TEXT[],
        usage_count INT DEFAULT 0,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [videoRows, genRows, templateRows] = await Promise.all([
      query("SELECT * FROM content_videos ORDER BY created_at DESC LIMIT 500"),
      query("SELECT * FROM content_ai_generations ORDER BY created_at DESC LIMIT 200"),
      query("SELECT * FROM content_script_templates ORDER BY usage_count DESC, created_at DESC"),
    ]);

    videos = (videoRows || []).map(mapVideoRow);
    aiGenerations = (genRows || []).map(mapAIGenRow);
    scriptTemplates = (templateRows || []).map(mapTemplateRow);

    console.log(`[content-store] Loaded ${videos.length} videos, ${aiGenerations.length} AI gens, ${scriptTemplates.length} templates`);
  } catch (err) {
    console.error("[content-store] Load error:", (err as Error).message);
  }
}

// ─── Getters ──────────────────────────────────────────────────────────────────
export function getContentVideos(filters?: {
  status?: ContentStatus;
  platform?: ContentPlatform;
}): ContentVideo[] {
  let result = [...videos];
  if (filters?.status) result = result.filter(v => v.status === filters.status);
  if (filters?.platform && filters.platform !== "all") {
    result = result.filter(v => v.platform === filters.platform || v.platform === "all");
  }
  return result;
}

export function getContentVideoById(id: string): ContentVideo | undefined {
  return videos.find(v => v.id === id);
}

export function getAIGenerations(limit = 50): ContentAIGeneration[] {
  return aiGenerations.slice(0, limit);
}

export function getScriptTemplates(platform?: ContentPlatform): ContentScriptTemplate[] {
  if (!platform || platform === "all") return scriptTemplates;
  return scriptTemplates.filter(t => t.platform === platform || t.platform === "all" as ContentPlatform);
}

export function getCalendarVideos(startDate: string, endDate: string): ContentVideo[] {
  return videos.filter(v => {
    if (!v.scheduledAt) return false;
    return v.scheduledAt >= startDate && v.scheduledAt <= endDate;
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
export async function createContentVideo(data: {
  title: string;
  topic?: string;
  platform: ContentPlatform;
  script?: string;
  scriptGeneratedBy?: "ai" | "manual";
  aiPrompt?: string;
  durationSeconds?: number;
  hashtags?: string[];
  notes?: string;
  scheduledAt?: string;
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  assignedToName?: string;
}): Promise<ContentVideo> {
  const newId = randomUUID();
  const rows = await query(
    `INSERT INTO content_videos
      (id, title, topic, platform, status, script, script_generated_by, ai_prompt,
       duration_seconds, hashtags, notes, scheduled_at, created_by, created_by_name,
       assigned_to, assigned_to_name)
     VALUES ($1,$2,$3,$4,'idea',$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      newId, data.title, data.topic || null, data.platform,
      data.script || null, data.scriptGeneratedBy || null, data.aiPrompt || null,
      data.durationSeconds || null, data.hashtags || [], data.notes || null,
      data.scheduledAt ? new Date(data.scheduledAt) : null,
      data.createdBy, data.createdByName,
      data.assignedTo || null, data.assignedToName || null,
    ]
  );
  const video = mapVideoRow(rows[0]);
  videos.unshift(video);
  return video;
}

export async function updateContentVideo(
  id: string,
  updates: Partial<Omit<ContentVideo, "id" | "createdAt" | "createdBy" | "createdByName">>
): Promise<ContentVideo | null> {
  const video = videos.find(v => v.id === id);
  if (!video) return null;

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const fieldMap: Record<string, string> = {
    title: "title", topic: "topic", platform: "platform", status: "status",
    script: "script", scriptGeneratedBy: "script_generated_by", aiPrompt: "ai_prompt",
    durationSeconds: "duration_seconds", hashtags: "hashtags", notes: "notes",
    thumbnailUrl: "thumbnail_url", videoUrl: "video_url", publishedUrl: "published_url",
    scheduledAt: "scheduled_at", publishedAt: "published_at",
    viewsCount: "views_count", likesCount: "likes_count",
    commentsCount: "comments_count", sharesCount: "shares_count",
    assignedTo: "assigned_to", assignedToName: "assigned_to_name",
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (key in updates) {
      fields.push(`${col} = $${idx++}`);
      const val = updates[key as keyof typeof updates];
      if ((key === "scheduledAt" || key === "publishedAt") && val) {
        values.push(new Date(val as string));
      } else {
        values.push(val ?? null);
      }
    }
  }

  if (fields.length === 0) return video;

  fields.push(`updated_at = $${idx++}`);
  values.push(new Date());
  values.push(id);

  const rows = await query(
    `UPDATE content_videos SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (!rows[0]) return null;
  const updated = mapVideoRow(rows[0]);
  const i = videos.findIndex(v => v.id === id);
  if (i >= 0) videos[i] = updated;
  return updated;
}

export async function deleteContentVideo(id: string): Promise<boolean> {
  await query("DELETE FROM content_videos WHERE id = $1", [id]);
  const i = videos.findIndex(v => v.id === id);
  if (i >= 0) videos.splice(i, 1);
  return true;
}

export async function saveAIGeneration(data: {
  videoId?: string;
  platform: ContentPlatform;
  topic: string;
  productName?: string;
  targetAudience?: string;
  tone?: string;
  durationSeconds?: number;
  additionalNotes?: string;
  promptUsed: string;
  generatedScript: string;
  modelUsed?: string;
  tokensUsed?: number;
  generationTimeMs?: number;
  createdBy: string;
}): Promise<ContentAIGeneration> {
  const genId = randomUUID();
  const rows = await query(
    `INSERT INTO content_ai_generations
      (id, video_id, platform, topic, product_name, target_audience, tone,
       duration_seconds, additional_notes, prompt_used, generated_script,
       model_used, tokens_used, generation_time_ms, was_saved, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,FALSE,$15)
     RETURNING *`,
    [
      genId, data.videoId || null, data.platform, data.topic,
      data.productName || null, data.targetAudience || null, data.tone || null,
      data.durationSeconds || null, data.additionalNotes || null,
      data.promptUsed, data.generatedScript,
      data.modelUsed || "gemini-1.5-flash",
      data.tokensUsed || null, data.generationTimeMs || null,
      data.createdBy,
    ]
  );
  const gen = mapAIGenRow(rows[0]);
  aiGenerations.unshift(gen);
  return gen;
}
