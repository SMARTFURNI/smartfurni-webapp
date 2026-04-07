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
      data.modelUsed || "gemini-2.0-flash",
      data.tokensUsed || null, data.generationTimeMs || null,
      data.createdBy,
    ]
  );
  const gen = mapAIGenRow(rows[0]);
  aiGenerations.unshift(gen);
  return gen;
}

// ─── Content Settings ─────────────────────────────────────────────────────────
export interface ContentSettings {
  id: string;
  // AI Model
  aiProvider: "gemini" | "openai" | "claude";
  aiModel: string;
  aiTemperature: number;
  aiMaxTokens: number;
  // Prompt template
  promptTemplate: string;
  promptSystemContext: string;
  // Brand context
  brandName: string;
  brandDescription: string;
  brandUsp: string;
  brandProducts: string;
  brandTone: string;
  // Platform defaults
  defaultPlatform: string;
  defaultTone: string;
  defaultDuration: number;
  // Workflow
  autoSaveToKanban: boolean;
  requireApproval: boolean;
  maxGenerationsPerDay: number;
  updatedBy: string;
  updatedAt: string;
}

export const DEFAULT_PROMPT_TEMPLATE = `Bạn là chuyên gia sáng tạo nội dung video cho thương hiệu {{brandName}}.
Hãy viết kịch bản video hoàn chỉnh cho nền tảng {{platform}}.

**Thông tin video:**
- Chủ đề: {{topic}}
{{#productName}}- Sản phẩm: {{productName}}{{/productName}}
- Thời lượng: {{duration}}
- Giọng điệu: {{tone}}
{{#targetAudience}}- Đối tượng mục tiêu: {{targetAudience}}{{/targetAudience}}
{{#additionalNotes}}- Ghi chú thêm: {{additionalNotes}}{{/additionalNotes}}

**Yêu cầu kịch bản:**
1. Viết bằng tiếng Việt, tự nhiên và cuốn hút
2. Bao gồm: Hook mở đầu → Nội dung chính → Call-to-Action
3. Ghi rõ [CẢNH], [VOICEOVER], [TEXT ON SCREEN], [NHẠC NỀN] khi cần
4. Phù hợp với đặc thù của nền tảng
5. Kết thúc bằng hashtag gợi ý (5-10 hashtag tiếng Việt và tiếng Anh)
6. Thêm ghi chú sản xuất (góc quay, ánh sáng, props cần thiết)

Hãy viết kịch bản chi tiết, sáng tạo và có thể thực hiện ngay:`;

export const DEFAULT_SYSTEM_CONTEXT = `Thương hiệu nội thất công thái học cao cấp tại Việt Nam.
Sản phẩm: giường điều chỉnh điện, bàn làm việc ergonomic, ghế văn phòng.
USP: Chăm sóc sức khỏe cột sống, nâng cao chất lượng giấc ngủ và hiệu suất làm việc.
Giá trị: Chất lượng Đức/Nhật, phù hợp với người Việt.
Khách hàng B2B: chủ đầu tư BĐS, khách sạn/resort, bệnh viện/y tế, văn phòng/co-working, showroom/đại lý.`;

let contentSettings: ContentSettings | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSettingsRow(row: any): ContentSettings {
  return {
    id: row.id || "default",
    aiProvider: row.ai_provider || "gemini",
    aiModel: row.ai_model || "gemini-2.5-flash-preview-04-17",
    aiTemperature: Number(row.ai_temperature) || 0.7,
    aiMaxTokens: Number(row.ai_max_tokens) || 8192,
    promptTemplate: row.prompt_template || DEFAULT_PROMPT_TEMPLATE,
    promptSystemContext: row.prompt_system_context || DEFAULT_SYSTEM_CONTEXT,
    brandName: row.brand_name || "SmartFurni",
    brandDescription: row.brand_description || "",
    brandUsp: row.brand_usp || "",
    brandProducts: row.brand_products || "",
    brandTone: row.brand_tone || "",
    defaultPlatform: row.default_platform || "tiktok",
    defaultTone: row.default_tone || "professional",
    defaultDuration: Number(row.default_duration) || 30,
    autoSaveToKanban: Boolean(row.auto_save_to_kanban),
    requireApproval: Boolean(row.require_approval),
    maxGenerationsPerDay: Number(row.max_generations_per_day) || 50,
    updatedBy: row.updated_by || "",
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  };
}

export function getContentSettings(): ContentSettings | null {
  return contentSettings;
}

export async function loadContentSettings(): Promise<ContentSettings> {
  await query(`
    CREATE TABLE IF NOT EXISTS content_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      ai_provider VARCHAR(50) DEFAULT 'gemini',
      ai_model VARCHAR(100) DEFAULT 'gemini-2.5-flash-preview-04-17',
      ai_temperature DECIMAL(3,2) DEFAULT 0.7,
      ai_max_tokens INT DEFAULT 8192,
      prompt_template TEXT,
      prompt_system_context TEXT,
      brand_name VARCHAR(255) DEFAULT 'SmartFurni',
      brand_description TEXT,
      brand_usp TEXT,
      brand_products TEXT,
      brand_tone TEXT,
      default_platform VARCHAR(50) DEFAULT 'tiktok',
      default_tone VARCHAR(50) DEFAULT 'professional',
      default_duration INT DEFAULT 30,
      auto_save_to_kanban BOOLEAN DEFAULT FALSE,
      require_approval BOOLEAN DEFAULT FALSE,
      max_generations_per_day INT DEFAULT 50,
      updated_by VARCHAR(255),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Insert default row if not exists
  await query(
    `INSERT INTO content_settings (id, prompt_template, prompt_system_context)
     VALUES ('default', $1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [DEFAULT_PROMPT_TEMPLATE, DEFAULT_SYSTEM_CONTEXT]
  );
  const rows = await query<Record<string, unknown>>("SELECT * FROM content_settings WHERE id = 'default'");
  const settings = rows[0] ? mapSettingsRow(rows[0]) : mapSettingsRow({ id: "default" });
  contentSettings = settings;
  return settings;
}

export async function updateContentSettings(
  updates: Partial<Omit<ContentSettings, "id" | "updatedAt">>,
): Promise<ContentSettings> {
  const fieldMap: Record<string, string> = {
    aiProvider: "ai_provider",
    aiModel: "ai_model",
    aiTemperature: "ai_temperature",
    aiMaxTokens: "ai_max_tokens",
    promptTemplate: "prompt_template",
    promptSystemContext: "prompt_system_context",
    brandName: "brand_name",
    brandDescription: "brand_description",
    brandUsp: "brand_usp",
    brandProducts: "brand_products",
    brandTone: "brand_tone",
    defaultPlatform: "default_platform",
    defaultTone: "default_tone",
    defaultDuration: "default_duration",
    autoSaveToKanban: "auto_save_to_kanban",
    requireApproval: "require_approval",
    maxGenerationsPerDay: "max_generations_per_day",
    updatedBy: "updated_by",
  };
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  for (const [key, dbCol] of Object.entries(fieldMap)) {
    if (key in updates) {
      fields.push(`${dbCol} = $${idx}`);
      values.push((updates as Record<string, unknown>)[key]);
      idx++;
    }
  }
  if (fields.length === 0) return loadContentSettings();
  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push("default");
  await query(
    `UPDATE content_settings SET ${fields.join(", ")} WHERE id = $${idx}`,
    values
  );
  return loadContentSettings();
}
