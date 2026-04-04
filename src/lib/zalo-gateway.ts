/**
 * Zalo Personal Account Gateway
 * Handles Zalo personal account login via QR code, message sending/receiving,
 * and SSE broadcasting for real-time updates.
 *
 * Uses zca-js library to interact with Zalo Web API.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Zalo, ThreadType, LoginQRCallbackEventType } = require("zca-js");

import { query, queryOne } from "./db";
import { upsertConversation, incrementUnreadCount } from "./zalo-inbox-store";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZaloCredentials {
  cookie: unknown; // tough-cookie JSON array
  imei: string;
  userAgent: string;
}

export interface ZaloConversation {
  userId: string;
  displayName: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  isGroup: boolean;
}

export interface ZaloMessage {
  msgId: string;
  fromId: string;
  toId: string;
  content: string;
  timestamp: number;
  isSelf: boolean;
  attachments: ZaloAttachment[];
  type: "text" | "image" | "video" | "file" | "sticker" | "other";
}

export interface ZaloAttachment {
  type: "image" | "video" | "file";
  url: string;
  thumb?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  fileName?: string;
}

export interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
}

// ─── SSE Event Broadcasting ───────────────────────────────────────────────────

const sseClients: SSEClient[] = [];

export function addSSEClient(client: SSEClient) {
  sseClients.push(client);
}

export function removeSSEClient(clientId: string) {
  const idx = sseClients.findIndex((c) => c.id === clientId);
  if (idx !== -1) sseClients.splice(idx, 1);
}

export function broadcastSSE(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  for (const client of [...sseClients]) {
    try {
      client.controller.enqueue(encoder.encode(payload));
    } catch {
      removeSSEClient(client.id);
    }
  }
}

// ─── Gateway State ────────────────────────────────────────────────────────────

let zaloApi: unknown = null;
let isConnected = false;
let isConnecting = false;
let currentUserId = "";
let qrCallbackFn: ((qrBase64: string) => void) | null = null;
let loginResolve: ((api: unknown) => void) | null = null;
let loginReject: ((err: Error) => void) | null = null;
let currentQRImage: string | null = null; // Lưu QR image mới nhất để client poll

export function getCurrentQRImage(): string | null {
  return currentQRImage;
}

export function resetQRLogin(): void {
  if (!isConnected) {
    isConnecting = false;
    currentQRImage = null;
    loginResolve = null;
    loginReject = null;
  }
}

export function getZaloApi() {
  return zaloApi;
}

export function isZaloConnected() {
  return isConnected && zaloApi !== null;
}

export function getZaloUserId() {
  return currentUserId;
}

export function getGatewayStatus() {
  return {
    isConnected: isConnected && zaloApi !== null,
    isConnecting,
    userId: currentUserId || null,
    phone: currentUserId || null,
    status: isConnected ? "connected" : isConnecting ? "connecting" : "disconnected",
  };
}

// ─── Database Helpers ─────────────────────────────────────────────────────────

async function ensureZaloTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS zalo_inbox_credentials (
      id SERIAL PRIMARY KEY,
      cookie TEXT NOT NULL,
      imei TEXT NOT NULL,
      user_agent TEXT NOT NULL,
      user_id TEXT,
      display_name TEXT,
      avatar TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS zalo_inbox_messages (
      id SERIAL PRIMARY KEY,
      msg_id TEXT UNIQUE NOT NULL,
      thread_id TEXT NOT NULL,
      from_id TEXT NOT NULL,
      to_id TEXT NOT NULL,
      sender_name TEXT,
      content TEXT,
      attachments TEXT DEFAULT '[]',
      msg_type TEXT DEFAULT 'text',
      is_self BOOLEAN DEFAULT FALSE,
      timestamp BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await query(`CREATE INDEX IF NOT EXISTS idx_zalo_msgs_thread ON zalo_inbox_messages(thread_id)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_zalo_msgs_ts ON zalo_inbox_messages(timestamp DESC)`);
  // Migrate: thêm cột sender_name nếu chưa có
  await query(`ALTER TABLE zalo_inbox_messages ADD COLUMN IF NOT EXISTS sender_name TEXT`).catch(() => {});
}

export async function saveCredentials(creds: ZaloCredentials, userId?: string, displayName?: string, avatar?: string) {
  await ensureZaloTables();
  const cookieStr = typeof creds.cookie === "string" ? creds.cookie : JSON.stringify(creds.cookie);

  // Check if credentials exist
  const existing = await queryOne<{ id: number }>("SELECT id FROM zalo_inbox_credentials LIMIT 1");
  if (existing) {
    await query(
      `UPDATE zalo_inbox_credentials SET cookie=$1, imei=$2, user_agent=$3, user_id=$4, display_name=$5, avatar=$6, updated_at=NOW() WHERE id=$7`,
      [cookieStr, creds.imei, creds.userAgent, userId || null, displayName || null, avatar || null, existing.id]
    );
  } else {
    await query(
      `INSERT INTO zalo_inbox_credentials (cookie, imei, user_agent, user_id, display_name, avatar) VALUES ($1, $2, $3, $4, $5, $6)`,
      [cookieStr, creds.imei, creds.userAgent, userId || null, displayName || null, avatar || null]
    );
  }
}

export async function loadCredentials(): Promise<ZaloCredentials | null> {
  try {
    await ensureZaloTables();
    const row = await queryOne<{ cookie: string; imei: string; user_agent: string }>(
      "SELECT cookie, imei, user_agent FROM zalo_inbox_credentials LIMIT 1"
    );
    if (!row) return null;
    let cookie: unknown;
    try {
      cookie = JSON.parse(row.cookie);
    } catch {
      cookie = row.cookie;
    }
    return { cookie, imei: row.imei, userAgent: row.user_agent };
  } catch {
    return null;
  }
}

export async function saveMessage(msg: ZaloMessage & { senderName?: string }) {
  try {
    await ensureZaloTables();
    await query(
      `INSERT INTO zalo_inbox_messages (msg_id, thread_id, from_id, to_id, sender_name, content, attachments, msg_type, is_self, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (msg_id) DO NOTHING`,
      [
        msg.msgId,
        msg.isSelf ? msg.toId : msg.fromId,
        msg.fromId,
        msg.toId,
        msg.senderName || null,
        msg.content || "",
        JSON.stringify(msg.attachments),
        msg.type,
        msg.isSelf,
        msg.timestamp,
      ]
    );
  } catch (err) {
    console.error("[ZaloGateway] saveMessage error:", err);
  }
}

// ─── Message Processing ───────────────────────────────────────────────────────

function parseAttachments(data: Record<string, unknown>): ZaloAttachment[] {
  const attachments: ZaloAttachment[] = [];

  // Handle image attachments
  if (data.params && typeof data.params === "object") {
    const params = data.params as Record<string, unknown>;

    // Single image
    if (params.url && typeof params.url === "string") {
      attachments.push({
        type: "image",
        url: params.url as string,
        thumb: (params.thumb as string) || (params.url as string),
        width: (params.width as number) || 0,
        height: (params.height as number) || 0,
      });
    }

    // Multiple images (album)
    if (Array.isArray(params.media)) {
      for (const item of params.media as Record<string, unknown>[]) {
        if (item.url) {
          attachments.push({
            type: (item.type as string) === "video" ? "video" : "image",
            url: item.url as string,
            thumb: (item.thumb as string) || (item.url as string),
            width: (item.width as number) || 0,
            height: (item.height as number) || 0,
          });
        }
      }
    }

    // Video
    if (params.video && typeof params.video === "object") {
      const video = params.video as Record<string, unknown>;
      if (video.url) {
        attachments.push({
          type: "video",
          url: video.url as string,
          thumb: (video.thumb as string) || "",
          fileSize: (video.fileSize as number) || 0,
        });
      }
    }

    // File
    if (params.fileUrl && typeof params.fileUrl === "string") {
      attachments.push({
        type: "file",
        url: params.fileUrl as string,
        fileName: (params.fileName as string) || "file",
        fileSize: (params.fileSize as number) || 0,
      });
    }
  }

  // Handle content as object (new format)
  if (data.content && typeof data.content === "object") {
    const content = data.content as Record<string, unknown>;
    if (content.href && typeof content.href === "string") {
      const isVideo = (content.type as string) === "video";
      attachments.push({
        type: isVideo ? "video" : "image",
        url: content.href as string,
        thumb: (content.thumb as string) || (content.href as string),
        width: (content.width as number) || 0,
        height: (content.height as number) || 0,
      });
    }
  }

  return attachments;
}

function processIncomingMessage(message: Record<string, unknown>): ZaloMessage | null {
  try {
    const data = message.data as Record<string, unknown>;
    if (!data) return null;

    const isPlainText = typeof data.content === "string";
    const attachments = parseAttachments(data);
    let msgType: ZaloMessage["type"] = "other";

    if (isPlainText && attachments.length === 0) {
      msgType = "text";
    } else if (attachments.some((a) => a.type === "video")) {
      msgType = "video";
    } else if (attachments.some((a) => a.type === "image")) {
      msgType = "image";
    } else if (attachments.some((a) => a.type === "file")) {
      msgType = "file";
    }

    const msgId = (data.msgId as string) || (data.clientId as string) || `${Date.now()}`;
    const fromId = (data.uidFrom as string) || "";
    const toId = (data.idTo as string) || "";
    const isSelf = (message.isSelf as boolean) || false;
    const timestamp = (data.ts as number) || Date.now();
    const content = isPlainText ? (data.content as string) : "";

    return {
      msgId,
      fromId,
      toId,
      content,
      timestamp,
      isSelf,
      attachments,
      type: msgType,
    };
  } catch (err) {
    console.error("[ZaloGateway] processIncomingMessage error:", err);
    return null;
  }
}

// ─── Connection Management ────────────────────────────────────────────────────

function setupListeners(api: unknown) {
  const apiObj = api as {
    listener: {
      on: (event: string, cb: (msg: Record<string, unknown>) => void) => void;
      start: () => void;
    };
    getOwnId: () => Promise<string>;
  };

    apiObj.listener.on("message", async (message: Record<string, unknown>) => {
    const processed = processIncomingMessage(message);
    if (!processed) return;
    // Lấy tên người gửi từ nhiều field có thể có trong message data
    const threadId = processed.isSelf ? processed.toId : processed.fromId;
    const msgData = (message.data || {}) as Record<string, unknown>;
    const senderName = (msgData.dName as string)
      || (msgData.displayName as string)
      || (msgData.fromName as string)
      || (msgData.senderName as string)
      || ((message.data as any)?.params?.fromName as string)
      || "";
    // Lấy avatar URL của người gửi từ các field có thể có
    const senderAvatar = (msgData.avt as string)
      || (msgData.avatar as string)
      || (msgData.avatarUrl as string)
      || ((message.data as any)?.params?.avt as string)
      || ((message.data as any)?.params?.avatar as string)
      || null;
    // Save to DB (zalo_inbox_messages) kèm sender_name
    await saveMessage({ ...processed, senderName: senderName || undefined });
    try {
      // Chỉ cập nhật displayName khi có tên thật (không phải ID số thuần)
      const isNumericId = /^\d{8,}$/.test(senderName);
      const displayNameToSave = (!isNumericId && senderName) ? senderName : threadId;
      await upsertConversation({
        id: threadId,
        phone: threadId,
        displayName: displayNameToSave,
        avatarUrl: senderAvatar,
        lastMessage: processed.content || "[Hình ảnh]",
      });
      if (!processed.isSelf) {
        await incrementUnreadCount(threadId);
      }
    } catch (err) {
      console.error("[ZaloGateway] upsertConversation error:", err);
    }
    // Broadcast via SSE
    broadcastSSE("message", {
      ...processed,
      threadId,
    });
  });

  apiObj.listener.on("close", (reason: unknown) => {
    console.log("[ZaloGateway] Connection closed:", reason);
    isConnected = false;
    zaloApi = null;
    broadcastSSE("disconnected", { reason });

    // Auto-reconnect after 5 seconds
    setTimeout(() => {
      autoReconnect();
    }, 5000);
  });

  apiObj.listener.start();
  console.log("[ZaloGateway] Listener started");
}

async function autoReconnect() {
  if (isConnected || isConnecting) return;
  console.log("[ZaloGateway] Attempting auto-reconnect...");

  const creds = await loadCredentials();
  if (!creds) {
    console.log("[ZaloGateway] No credentials found, skipping auto-reconnect");
    return;
  }

  try {
    await connectWithCredentials(creds);
    console.log("[ZaloGateway] Auto-reconnect successful");
  } catch (err) {
    console.error("[ZaloGateway] Auto-reconnect failed:", err);
    // Retry after 30 seconds
    setTimeout(() => autoReconnect(), 30000);
  }
}

export async function connectWithCredentials(creds: ZaloCredentials): Promise<void> {
  if (isConnecting) throw new Error("Already connecting");
  isConnecting = true;

  try {
    const zalo = new Zalo({
      logging: false,
    });

    const api = await zalo.login({
      cookie: creds.cookie,
      imei: creds.imei,
      userAgent: creds.userAgent,
    });

    zaloApi = api;
    isConnected = true;
    isConnecting = false;

    // Get own user ID
    try {
      const apiObj = api as { getOwnId: () => Promise<string> };
      currentUserId = await apiObj.getOwnId();
    } catch {
      currentUserId = "";
    }

    setupListeners(api);
    broadcastSSE("connected", { userId: currentUserId });
    console.log("[ZaloGateway] Connected as", currentUserId);
  } catch (err) {
    isConnecting = false;
    isConnected = false;
    zaloApi = null;
    throw err;
  }
}

// ─── QR Login ─────────────────────────────────────────────────────────────────

export async function startQRLogin(onQR: (qrBase64: string) => void): Promise<void> {
  // Reset trạng thái nếu đang connecting nhưng chưa connected (cho phép retry)
  if (isConnecting && !isConnected) {
    isConnecting = false;
    currentQRImage = null;
  }
  if (isConnecting) throw new Error("Already connecting");
  isConnecting = true;
  currentQRImage = null;
  qrCallbackFn = onQR;

  return new Promise<void>((resolve, reject) => {
    loginResolve = (api: unknown) => {
      zaloApi = api;
      isConnected = true;
      isConnecting = false;
      setupListeners(api);
      broadcastSSE("connected", { userId: currentUserId });
      resolve();
    };
    loginReject = (err: Error) => {
      isConnecting = false;
      reject(err);
    };

    const zalo = new Zalo({ logging: false });

    zalo
      .loginQR(
        { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0" },
        async (event: { type: number; data: Record<string, unknown> | null }) => {
          if (event.type === LoginQRCallbackEventType.QRCodeGenerated) {
            const qrData = event.data as { image?: string } | null;
            if (qrData?.image) {
              // Lưu QR vào memory để client có thể poll
              const image = qrData.image.startsWith("data:") ? qrData.image : `data:image/png;base64,${qrData.image}`;
              currentQRImage = image;
              onQR(image);
            }
          } else if (event.type === LoginQRCallbackEventType.GotLoginInfo) {
            // Save credentials
            const loginData = event.data as { cookie: unknown; imei: string; userAgent: string } | null;
            if (loginData) {
              const creds: ZaloCredentials = {
                cookie: loginData.cookie,
                imei: loginData.imei,
                userAgent: loginData.userAgent,
              };
              await saveCredentials(creds);
            }
          }
        }
      )
      .then(async (api: unknown) => {
        // Get user info
        try {
          const apiObj = api as { getOwnId: () => Promise<string>; getCookie: () => unknown };
          currentUserId = await apiObj.getOwnId();
        } catch {
          currentUserId = "";
        }

        if (loginResolve) loginResolve(api);
      })
      .catch((err: Error) => {
        if (loginReject) loginReject(err);
      });
  });
}

export async function disconnectZalo() {
  isConnected = false;
  zaloApi = null;
  currentUserId = "";
  broadcastSSE("disconnected", { reason: "manual" });
}

// ─── Initialize on startup ────────────────────────────────────────────────────

export async function initZaloGateway() {
  console.log("[ZaloGateway] Initializing...");
  const creds = await loadCredentials();
  if (creds) {
    console.log("[ZaloGateway] Found saved credentials, attempting auto-connect...");
    try {
      await connectWithCredentials(creds);
    } catch (err) {
      console.error("[ZaloGateway] Auto-connect failed:", err);
    }
  } else {
    console.log("[ZaloGateway] No saved credentials found");
  }
}

// ─── Send Message ─────────────────────────────────────────────────────────────

/**
 * Gửi tin nhắn Zalo cá nhân đến một user (threadId = userId của người nhận)
 * Sau khi gửi thành công, lưu vào zalo_inbox_messages và upsert conversation
 */
export async function sendZaloMessage(params: {
  conversationId: string;
  content: string;
  senderName?: string;
  senderId?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Tự động kết nối lại nếu server vừa restart
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) {
    return { success: false, error: "Chưa kết nối Zalo. Vui lòng đăng nhập lại." };
  }
  try {
    const api = zaloApi as {
      sendMessage: (msg: { msg: string }, threadId: string, type: number) => Promise<{ msgId?: string }>;
    };
    // ThreadType.USER = 0 (tin nhắn cá nhân)
    const result = await api.sendMessage(
      { msg: params.content },
      params.conversationId,
      ThreadType?.USER ?? 0
    );
    const msgId = result?.msgId || `sent_${Date.now()}`;
    // Lưu tin nhắn gửi đi vào DB
    await saveMessage({
      msgId,
      fromId: currentUserId,
      toId: params.conversationId,
      content: params.content,
      timestamp: Date.now(),
      isSelf: true,
      attachments: [],
      type: "text",
    });
    // Upsert conversation
    try {
      await upsertConversation({
        id: params.conversationId,
        phone: params.conversationId,
        displayName: params.conversationId,
        lastMessage: params.content,
      });
    } catch { /* ignore */ }
    return { success: true, messageId: msgId };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[ZaloGateway] sendZaloMessage error:", error);
    return { success: false, error: error.message || "Lỗi gửi tin nhắn" };
  }
}

// ─── Auto-Reconnect on Server Start ──────────────────────────────────────────
// Khi Railway deploy lại, process restart → zaloApi = null → cần tự kết nối lại
// Dùng flag để chỉ chạy 1 lần dù nhiều request cùng lúc

let autoReconnectDone = false;
let autoReconnectPromise: Promise<void> | null = null;

/**
 * Tự động kết nối lại Zalo nếu server vừa restart (Railway deploy).
 * Gọi từ SSE route và conversations route — chỉ chạy 1 lần per process.
 */
export async function ensureZaloConnected(): Promise<void> {
  if (isConnected || autoReconnectDone) return;
  if (autoReconnectPromise) return autoReconnectPromise;

  autoReconnectPromise = (async () => {
    autoReconnectDone = true;
    try {
      await initZaloGateway();
      if (isConnected) {
        console.log("[ZaloGateway] ensureZaloConnected: auto-reconnect success");
      } else {
        console.warn("[ZaloGateway] ensureZaloConnected: no saved credentials or connect failed");
        // Cho phép thử lại lần sau nếu thất bại
        autoReconnectDone = false;
      }
    } catch (err) {
      console.error("[ZaloGateway] ensureZaloConnected error:", err);
      autoReconnectDone = false;
    } finally {
      autoReconnectPromise = null;
    }
  })();

  return autoReconnectPromise;
}

// ─── Send Attachment ──────────────────────────────────────────────────────────
/**
 * Gửi ảnh/file/video qua Zalo cá nhân
 * @param conversationId - threadId của người nhận
 * @param fileBuffer - Buffer của file cần gửi
 * @param fileName - Tên file (bao gồm extension, ví dụ: "photo.jpg", "document.pdf")
 * @param mimeType - MIME type của file
 */
export async function sendZaloAttachment(params: {
  conversationId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
}): Promise<{ success: boolean; error?: string }> {
  // Tự động kết nối lại nếu server vừa restart
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) {
    return { success: false, error: "Zalo chưa được kết nối. Vui lòng đăng nhập lại." };
  }
  try {
    const { ThreadType } = await import("zca-js");
    // Cast sang type có uploadAttachment và sendMessage
    const api = zaloApi as {
      uploadAttachment: (sources: unknown[], threadId: string, type: unknown) => Promise<unknown[]>;
      sendMessage: (msg: unknown, threadId: string, type: unknown) => Promise<unknown>;
    };

    const attachmentSource = {
      data: params.fileBuffer,
      filename: params.fileName as `${string}.${string}`,
      metadata: {
        totalSize: params.fileSize,
        width: params.width,
        height: params.height,
      },
    };

    // Upload attachment trước
    const uploadResults = await api.uploadAttachment(
      [attachmentSource],
      params.conversationId,
      ThreadType?.User ?? 0
    );

    if (!uploadResults || uploadResults.length === 0) {
      return { success: false, error: "Upload attachment thất bại" };
    }

    // Lấy URL từ kết quả upload (zca-js trả về URL CDN ngay sau khi upload)
    const uploadResult = uploadResults[0] as {
      normalUrl?: string;
      hdUrl?: string;
      thumbUrl?: string;
      fileUrl?: string;
      fileType?: string;
    };
    let attachUrl = "";
    let attachThumb = "";
    if (uploadResult.fileType === "image") {
      attachUrl = uploadResult.hdUrl || uploadResult.normalUrl || "";
      attachThumb = uploadResult.thumbUrl || uploadResult.normalUrl || "";
    } else if (uploadResult.fileType === "video" || uploadResult.fileType === "others") {
      attachUrl = uploadResult.fileUrl || "";
    }
    console.log(`[ZaloGateway] Upload result fileType=${uploadResult.fileType} url=${attachUrl}`);

    // Gửi message với attachment đã upload
    await api.sendMessage(
      {
        msg: "",
        attachments: attachmentSource,
      },
      params.conversationId,
      ThreadType?.User ?? 0
    );

    // Xác định type dựa trên mimeType
    let attachType: "image" | "video" | "file" = "file";
    if (params.mimeType.startsWith("image/")) attachType = "image";
    else if (params.mimeType.startsWith("video/")) attachType = "video";

    const msgId = `sent_att_${Date.now()}`;
    // Lưu tin nhắn gửi đi vào DB với URL thực từ Zalo CDN
    await saveMessage({
      msgId,
      fromId: currentUserId,
      toId: params.conversationId,
      content: "",
      timestamp: Date.now(),
      isSelf: true,
      attachments: [{
        type: attachType,
        url: attachUrl,
        thumb: attachThumb || attachUrl,
        fileName: params.fileName,
        fileSize: params.fileSize,
      }],
      type: attachType,
    });
    // Upsert conversation để cập nhật lastMessage
    const lastMsgLabel = attachType === "image" ? "[Hình ảnh]" : attachType === "video" ? "[Video]" : `[File: ${params.fileName}]`;
    try {
      await upsertConversation({
        id: params.conversationId,
        phone: params.conversationId,
        displayName: params.conversationId,
        lastMessage: lastMsgLabel,
      });
    } catch { /* ignore */ }

    console.log(`[ZaloGateway] Sent attachment to ${params.conversationId}`);
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[ZaloGateway] sendZaloAttachment error:", error);
    return { success: false, error: error.message || "Lỗi gửi attachment" };
  }
}
