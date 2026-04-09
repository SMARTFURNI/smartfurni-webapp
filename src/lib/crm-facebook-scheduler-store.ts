/**
 * CRM Facebook Scheduler Store
 * Quản lý lịch đăng bài tự động lên Facebook Fanpage
 */
import { query } from "@/lib/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PostStatus = "draft" | "scheduled" | "published" | "failed" | "cancelled";
export type RepeatType = "none" | "daily" | "weekly" | "custom_days";

export interface FacebookPage {
  id: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  category?: string;
  followerCount?: number;
  isActive: boolean;
  addedAt: string;
}

export interface ScheduledPost {
  id: string;
  title: string;
  content: string;
  imageUrls: string[];       // Danh sách URL ảnh đính kèm
  videoIds?: Record<string, string>; // pageId -> Facebook video_id (đã upload)
  linkUrl?: string;          // Link đính kèm (nếu có)
  pageIds: string[];         // Đăng lên các page nào (ID của FacebookPage)
  scheduledAt: string;       // ISO datetime - thời điểm đăng
  repeatType: RepeatType;    // Lặp lại như thế nào
  repeatDays?: number[];     // Nếu weekly: [0,1,2,3,4,5,6] (0=CN, 1=T2,...)
  repeatEndDate?: string;    // Ngày kết thúc lặp lại
  status: PostStatus;
  publishedAt?: string;      // Thời điểm đã đăng thực tế
  facebookPostIds?: Record<string, string>; // pageId -> FB post ID
  errorMessage?: string;
  createdBy: string;         // staff ID
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  hashtags: string[];
}

export interface PostLog {
  id: string;
  postId: string;
  postTitle: string;
  pageId: string;
  pageName: string;
  action: "published" | "failed" | "cancelled" | "scheduled" | "retry";
  facebookPostId?: string;
  errorMessage?: string;
  executedAt: string;
}

export interface FacebookSchedulerConfig {
  isEnabled: boolean;
  defaultPageIds: string[];
  cronSchedule: string;      // e.g. "0 * * * *" - mỗi giờ
  maxRetries: number;
  retryDelayMinutes: number;
  updatedAt: string;
}

// ─── In-memory store ──────────────────────────────────────────────────────────

let pages: FacebookPage[] = [];
let scheduledPosts: ScheduledPost[] = [];
let postLogs: PostLog[] = [];
let config: FacebookSchedulerConfig = {
  isEnabled: false,
  defaultPageIds: [],
  cronSchedule: "0 * * * *",
  maxRetries: 3,
  retryDelayMinutes: 30,
  updatedAt: new Date().toISOString(),
};

// ─── DB Helpers ───────────────────────────────────────────────────────────────

async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS fb_scheduler_pages (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS fb_scheduler_posts (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      scheduled_at TIMESTAMPTZ,
      status TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS fb_scheduler_logs (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS fb_scheduler_config (
      id TEXT PRIMARY KEY DEFAULT 'singleton',
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function loadFacebookSchedulerFromDb() {
  try {
    await ensureTables();

    const pageRows = await query<{ data: FacebookPage }>("SELECT data FROM fb_scheduler_pages ORDER BY (data->>'addedAt') DESC");
    pages = pageRows.map(r => r.data);

    const postRows = await query<{ data: ScheduledPost }>("SELECT data FROM fb_scheduler_posts ORDER BY (data->>'scheduledAt') DESC");
    scheduledPosts = postRows.map(r => r.data);

    const logRows = await query<{ data: PostLog }>("SELECT data FROM fb_scheduler_logs ORDER BY (data->>'executedAt') DESC LIMIT 500");
    postLogs = logRows.map(r => r.data);

    const cfgRow = await query<{ data: FacebookSchedulerConfig }>("SELECT data FROM fb_scheduler_config WHERE id = 'singleton'");
    if (cfgRow.length > 0) config = cfgRow[0].data;

    console.log(`[fb-scheduler] Loaded: ${pages.length} pages, ${scheduledPosts.length} posts`);
  } catch (err) {
    console.error("[fb-scheduler] Load error:", (err as Error).message);
  }
}

// ─── Pages CRUD ───────────────────────────────────────────────────────────────

export function getPages(): FacebookPage[] {
  return pages;
}

export async function addPage(page: Omit<FacebookPage, "id" | "addedAt">): Promise<FacebookPage> {
  const newPage: FacebookPage = {
    ...page,
    id: `fbpage_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    addedAt: new Date().toISOString(),
  };
  pages.push(newPage);
  await query(
    "INSERT INTO fb_scheduler_pages (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()",
    [newPage.id, JSON.stringify(newPage)]
  );
  return newPage;
}

export async function updatePage(id: string, updates: Partial<FacebookPage>): Promise<FacebookPage | null> {
  const idx = pages.findIndex(p => p.id === id);
  if (idx === -1) return null;
  pages[idx] = { ...pages[idx], ...updates };
  await query(
    "UPDATE fb_scheduler_pages SET data = $2, updated_at = NOW() WHERE id = $1",
    [id, JSON.stringify(pages[idx])]
  );
  return pages[idx];
}

export async function deletePage(id: string): Promise<boolean> {
  const idx = pages.findIndex(p => p.id === id);
  if (idx === -1) return false;
  pages.splice(idx, 1);
  await query("DELETE FROM fb_scheduler_pages WHERE id = $1", [id]);
  return true;
}

// ─── Posts CRUD ───────────────────────────────────────────────────────────────

export function getScheduledPosts(filter?: { status?: PostStatus; pageId?: string }): ScheduledPost[] {
  let result = [...scheduledPosts];
  if (filter?.status) result = result.filter(p => p.status === filter.status);
  if (filter?.pageId) result = result.filter(p => p.pageIds.includes(filter.pageId!));
  return result.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
}

export async function createPost(post: Omit<ScheduledPost, "id" | "createdAt" | "updatedAt">): Promise<ScheduledPost> {
  const newPost: ScheduledPost = {
    ...post,
    id: `fbpost_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  scheduledPosts.unshift(newPost);
  await query(
    "INSERT INTO fb_scheduler_posts (id, data, scheduled_at, status) VALUES ($1, $2, $3, $4)",
    [newPost.id, JSON.stringify(newPost), newPost.scheduledAt, newPost.status]
  );
  return newPost;
}

export async function updatePost(id: string, updates: Partial<ScheduledPost>): Promise<ScheduledPost | null> {
  const idx = scheduledPosts.findIndex(p => p.id === id);
  if (idx === -1) return null;
  scheduledPosts[idx] = { ...scheduledPosts[idx], ...updates, updatedAt: new Date().toISOString() };
  await query(
    "UPDATE fb_scheduler_posts SET data = $2, scheduled_at = $3, status = $4, updated_at = NOW() WHERE id = $1",
    [id, JSON.stringify(scheduledPosts[idx]), scheduledPosts[idx].scheduledAt, scheduledPosts[idx].status]
  );
  return scheduledPosts[idx];
}

export async function deletePost(id: string): Promise<boolean> {
  const idx = scheduledPosts.findIndex(p => p.id === id);
  if (idx === -1) return false;
  scheduledPosts.splice(idx, 1);
  await query("DELETE FROM fb_scheduler_posts WHERE id = $1", [id]);
  return true;
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

export function getPostLogs(postId?: string): PostLog[] {
  if (postId) return postLogs.filter(l => l.postId === postId);
  return postLogs.slice(0, 200);
}

export async function addPostLog(log: Omit<PostLog, "id">): Promise<PostLog> {
  const newLog: PostLog = {
    ...log,
    id: `fblog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  };
  postLogs.unshift(newLog);
  if (postLogs.length > 500) postLogs = postLogs.slice(0, 500);
  await query(
    "INSERT INTO fb_scheduler_logs (id, data, executed_at) VALUES ($1, $2, $3)",
    [newLog.id, JSON.stringify(newLog), newLog.executedAt]
  );
  return newLog;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export function getSchedulerConfig(): FacebookSchedulerConfig {
  return config;
}

export async function updateSchedulerConfig(updates: Partial<FacebookSchedulerConfig>): Promise<FacebookSchedulerConfig> {
  config = { ...config, ...updates, updatedAt: new Date().toISOString() };
  await query(
    "INSERT INTO fb_scheduler_config (id, data) VALUES ('singleton', $1) ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()",
    [JSON.stringify(config)]
  );
  return config;
}

// ─── Scheduler Engine ─────────────────────────────────────────────────────────

/**
 * Lấy danh sách bài cần đăng ngay bây giờ (quá hạn hoặc đúng giờ)
 */
export function getPostsDueNow(): ScheduledPost[] {
  const now = new Date();
  return scheduledPosts.filter(post => {
    if (post.status !== "scheduled") return false;
    const scheduledTime = new Date(post.scheduledAt);
    return scheduledTime <= now;
  });
}

/**
 * Đăng bài lên Facebook qua Graph API
 */
export async function publishToFacebook(
  post: ScheduledPost,
  page: FacebookPage
): Promise<{ success: boolean; postId?: string; error?: string }> {
  try {
    const body: Record<string, string> = {
      message: buildPostMessage(post),
      access_token: page.pageAccessToken,
    };

    // Nếu có link URL
    if (post.linkUrl) {
      body.link = post.linkUrl;
    }

    // Case 0: Có video đã upload → publish video lên feed
    const videoId = post.videoIds?.[page.pageId] || post.videoIds?.[page.id];
    if (videoId) {
      // Publish video đã upload (set published = true)
      const videoPublishRes = await fetch(`https://graph.facebook.com/v19.0/${videoId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          published: true,
          description: buildPostMessage(post),
          access_token: page.pageAccessToken,
        }),
      });
      const videoPublishData = await videoPublishRes.json();
      if (videoPublishData.error) {
        // Fallback: thử post lên /feed với video_id
        const feedRes = await fetch(`https://graph.facebook.com/v19.0/${page.pageId}/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: buildPostMessage(post),
            object_attachment: videoId,
            access_token: page.pageAccessToken,
          }),
        });
        const feedData = await feedRes.json();
        if (feedData.error) {
          return { success: false, error: `Video publish failed: ${feedData.error?.message || videoPublishData.error?.message}` };
        }
        return { success: true, postId: feedData.id };
      }
      return { success: true, postId: videoPublishData.id || videoId };
    }

    // Case 1: Không có ảnh → dùng /feed thông thường
    if (post.imageUrls.length === 0) {
      const response = await fetch(`https://graph.facebook.com/v19.0/${page.pageId}/feed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        return { success: false, error: data.error?.message || `HTTP ${response.status}` };
      }
      return { success: true, postId: data.id };
    }

    // Case 2: 1 ảnh → dùng /photos với message + published:true
    if (post.imageUrls.length === 1) {
      const photoBody = {
        url: post.imageUrls[0],
        message: buildPostMessage(post),
        published: true,
        access_token: page.pageAccessToken,
      };
      if (post.linkUrl) (photoBody as Record<string, unknown>).link = post.linkUrl;
      const response = await fetch(`https://graph.facebook.com/v19.0/${page.pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(photoBody),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        return { success: false, error: data.error?.message || `HTTP ${response.status}` };
      }
      return { success: true, postId: data.post_id || data.id };
    }

    // Case 3: Nhiều ảnh → upload từng ảnh unpublished, rồi post feed với attached_media
    const photoIds: string[] = [];
    for (const imgUrl of post.imageUrls) {
      const photoRes = await fetch(`https://graph.facebook.com/v19.0/${page.pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: imgUrl,
          published: false,
          access_token: page.pageAccessToken,
        }),
      });
      const photoData = await photoRes.json();
      if (photoData.error || !photoData.id) {
        return { success: false, error: `Photo upload failed: ${photoData.error?.message || "unknown"}` };
      }
      photoIds.push(photoData.id);
    }
    const feedBody: Record<string, unknown> = {
      message: buildPostMessage(post),
      attached_media: photoIds.map(id => ({ media_fbid: id })),
      access_token: page.pageAccessToken,
    };
    if (post.linkUrl) feedBody.link = post.linkUrl;
    const feedResponse = await fetch(`https://graph.facebook.com/v19.0/${page.pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feedBody),
    });
    const feedData = await feedResponse.json();
    if (!feedResponse.ok || feedData.error) {
      return { success: false, error: feedData.error?.message || `HTTP ${feedResponse.status}` };
    }
    return { success: true, postId: feedData.id };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

function buildPostMessage(post: ScheduledPost): string {
  let message = post.content;
  if (post.hashtags.length > 0) {
    message += "\n\n" + post.hashtags.map(h => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  }
  return message;
}

/**
 * Tạo bài lặp lại tiếp theo sau khi đã đăng
 */
export async function scheduleNextRepeat(post: ScheduledPost): Promise<void> {
  if (post.repeatType === "none") return;

  const currentDate = new Date(post.scheduledAt);
  let nextDate: Date | null = null;

  if (post.repeatType === "daily") {
    nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
  } else if (post.repeatType === "weekly") {
    nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 7);
  } else if (post.repeatType === "custom_days" && post.repeatDays && post.repeatDays.length > 0) {
    // Tìm ngày tiếp theo trong tuần phù hợp
    const sortedDays = [...post.repeatDays].sort((a, b) => a - b);
    const currentDay = currentDate.getDay();
    const nextDay = sortedDays.find(d => d > currentDay) ?? sortedDays[0];
    nextDate = new Date(currentDate);
    const daysToAdd = nextDay > currentDay
      ? nextDay - currentDay
      : 7 - currentDay + nextDay;
    nextDate.setDate(nextDate.getDate() + daysToAdd);
  }

  if (!nextDate) return;

  // Kiểm tra ngày kết thúc
  if (post.repeatEndDate && nextDate > new Date(post.repeatEndDate)) return;

  // Tạo bài mới cho lần lặp tiếp theo
  await createPost({
    title: post.title,
    content: post.content,
    imageUrls: post.imageUrls,
    videoIds: post.videoIds,
    linkUrl: post.linkUrl,
    pageIds: post.pageIds,
    scheduledAt: nextDate.toISOString(),
    repeatType: post.repeatType,
    repeatDays: post.repeatDays,
    repeatEndDate: post.repeatEndDate,
    status: "scheduled",
    createdBy: post.createdBy,
    createdByName: post.createdByName,
    tags: post.tags,
    hashtags: post.hashtags,
  });
}
