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

// ─── Friend Request Types ───────────────────────────────────────────────────

export interface FriendRequest {
  fromUid: string;
  toUid: string;
  message: string;
  timestamp: number;
  displayName?: string;
  avatar?: string;
}

// In-memory store for pending friend requests (incoming)
const incomingFriendRequests: Map<string, FriendRequest> = new Map();

export function getIncomingFriendRequests(): FriendRequest[] {
  return Array.from(incomingFriendRequests.values()).sort((a, b) => b.timestamp - a.timestamp);
}

export function clearIncomingFriendRequest(fromUid: string) {
  incomingFriendRequests.delete(fromUid);
}

// ─── Gateway State ────────────────────────────────────────────────────────────

let zaloApi: unknown = null;
let isConnected = false;
let isConnecting = false;
let currentUserId = "";
let currentUserDisplayName = ""; // Tên hiển thị của tài khoản Zalo đang đăng nhập
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

export function getZaloUserDisplayName() {
  return currentUserDisplayName;
}

export function getGatewayStatus() {
  return {
    isConnected: isConnected && zaloApi !== null,
    isConnecting,
    userId: currentUserId || null,
    phone: currentUserId || null,
    displayName: currentUserDisplayName || null,
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

  // Lắng nghe friend events (kết bạn, yêu cầu kết bạn)
  apiObj.listener.on("friend_event", async (event: Record<string, unknown>) => {
    try {
      const eventType = (event.type as number);
      const eventData = event.data as Record<string, unknown>;
      const isSelf = event.isSelf as boolean;

      // FriendEventType.REQUEST = 2
      if (eventType === 2 && !isSelf) {
        // Có người gửi lời mời kết bạn đến mình
        const fromUid = (eventData.fromUid as string) || "";
        const toUid = (eventData.toUid as string) || "";
        const message = (eventData.message as string) || "";
        if (fromUid) {
          const req: FriendRequest = {
            fromUid,
            toUid,
            message,
            timestamp: Date.now(),
          };
          // Thử lấy thông tin user
          try {
            const api2 = zaloApi as { findUser: (phone: string) => Promise<{ display_name?: string; zalo_name?: string; avatar?: string; uid?: string }> };
            // Không có phone, dùng uid để tìm nếu có thể
            req.displayName = fromUid;
          } catch { /* ignore */ }
          incomingFriendRequests.set(fromUid, req);
          broadcastSSE("friend_request", { type: "incoming", request: req });
          console.log(`[ZaloGateway] Incoming friend request from ${fromUid}: ${message}`);
        }
      }
      // FriendEventType.ADD = 0 (đã kết bạn thành công)
      else if (eventType === 0) {
        const friendUid = (eventData as unknown as string) || "";
        broadcastSSE("friend_event", { type: "added", userId: friendUid, isSelf });
        console.log(`[ZaloGateway] Friend added: ${friendUid}`);
      }
      // FriendEventType.REJECT_REQUEST = 4
      else if (eventType === 4) {
        const fromUid = (eventData.fromUid as string) || "";
        const toUid = (eventData.toUid as string) || "";
        broadcastSSE("friend_event", { type: "rejected", fromUid, toUid, isSelf });
        console.log(`[ZaloGateway] Friend request rejected: from=${fromUid} to=${toUid}`);
      }
      // FriendEventType.UNDO_REQUEST = 3
      else if (eventType === 3) {
        const fromUid = (eventData.fromUid as string) || "";
        if (fromUid) incomingFriendRequests.delete(fromUid);
        broadcastSSE("friend_event", { type: "undo_request", fromUid, isSelf });
      }
    } catch (err) {
      console.error("[ZaloGateway] friend_event error:", err);
    }
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

    // Load display name from credentials DB
    try {
      const credRow = await queryOne<{ display_name: string | null; user_id: string | null }>(
        "SELECT display_name, user_id FROM zalo_inbox_credentials LIMIT 1"
      );
      const rawName = credRow?.display_name || "";
      const isNumericName = /^\d{8,}$/.test(rawName.trim());
      if (rawName && !isNumericName) {
        currentUserDisplayName = rawName;
      } else {
        // display_name chưa có hoặc là ID số — thử lấy từ getUserInfo (parse đúng cấu trúc zalo-personal)
        try {
          const apiObj2 = api as { getUserInfo?: (uid: string) => Promise<any> };
          if (currentUserId && apiObj2.getUserInfo) {
            const rawInfo = await apiObj2.getUserInfo(currentUserId);
            // zalo-personal: result.changed_profiles[userId].displayName
            const profiles = rawInfo?.changed_profiles ?? {};
            const info = profiles[currentUserId] ?? Object.values(profiles)[0] as any;
            const displayName = info?.displayName ?? info?.display_name ?? info?.zaloName ?? info?.zalo_name ?? "";
            const avatar = info?.avatar ?? "";
            if (displayName && !/^\d{8,}$/.test(displayName)) {
              currentUserDisplayName = displayName;
              // Cập nhật vào DB
              if (creds) await saveCredentials(creds, currentUserId, displayName, avatar);
            } else {
              currentUserDisplayName = credRow?.user_id || currentUserId;
            }
          } else {
            currentUserDisplayName = credRow?.user_id || currentUserId;
          }
        } catch {
          currentUserDisplayName = credRow?.user_id || currentUserId;
        }
      }
    } catch {
      currentUserDisplayName = currentUserId;
    }

    setupListeners(api);
    broadcastSSE("connected", { userId: currentUserId, displayName: currentUserDisplayName });
    console.log("[ZaloGateway] Connected as", currentUserId, "/", currentUserDisplayName);
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
        // Get user info including display name and avatar
        try {
          const apiObj = api as { getOwnId: () => Promise<string>; getCookie: () => unknown; getUserInfo?: (uid: string) => Promise<any> };
          currentUserId = await apiObj.getOwnId();
          // Try to get display name and avatar (parse đúng cấu trúc zalo-personal)
          if (currentUserId && apiObj.getUserInfo) {
            try {
              const rawInfo = await apiObj.getUserInfo(currentUserId);
              // zalo-personal: result.changed_profiles[userId].displayName
              const profiles = rawInfo?.changed_profiles ?? {};
              const info = profiles[currentUserId] ?? Object.values(profiles)[0] as any;
              const displayName = info?.displayName ?? info?.display_name ?? info?.zaloName ?? info?.zalo_name ?? "";
              const avatar = info?.avatar ?? "";
              if (displayName) currentUserDisplayName = displayName;
              // Update credentials with display name and avatar
              const creds2 = await loadCredentials();
              if (creds2) await saveCredentials(creds2, currentUserId, displayName || currentUserId, avatar);
            } catch { /* ignore */ }
          }
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
    // Lưu tin nhắn gửi đi vào DB (kèm senderName để hiển thị đúng tên)
    await saveMessage({
      msgId,
      fromId: currentUserId,
      toId: params.conversationId,
      content: params.content,
      timestamp: Date.now(),
      isSelf: true,
      attachments: [],
      type: "text",
      senderName: currentUserDisplayName || params.senderName || currentUserId,
    });
    // Upsert conversation — lấy tên thật của khách từ getUserInfo (zalo-personal pattern)
    try {
      let customerName = params.conversationId;
      let customerAvatar = "";
      // Kiểm tra xem conversation đã có tên trong DB chưa
      try {
        const existing = await queryOne<{ display_name: string | null; avatar_url: string | null }>(
          "SELECT display_name, avatar_url FROM zalo_conversations WHERE id=$1",
          [params.conversationId]
        );
        const existingName = existing?.display_name || "";
        const isNumericName = /^\d{8,}$/.test(existingName.trim());
        if (existingName && !isNumericName) {
          customerName = existingName;
          customerAvatar = existing?.avatar_url || "";
        } else {
          // Chưa có tên — gọi getUserInfo để lấy tên thật (parse theo zalo-personal)
          const apiForInfo = zaloApi as { getUserInfo?: (uid: string) => Promise<any> };
          if (apiForInfo.getUserInfo) {
            const rawInfo = await apiForInfo.getUserInfo(params.conversationId);
            const profiles = rawInfo?.changed_profiles ?? {};
            const info = profiles[params.conversationId] ?? Object.values(profiles)[0] as any;
            const name = info?.displayName ?? info?.display_name ?? info?.zaloName ?? info?.zalo_name ?? "";
            const avatar = info?.avatar ?? "";
            if (name && !/^\d{8,}$/.test(name)) {
              customerName = name;
              customerAvatar = avatar;
            }
          }
        }
      } catch { /* ignore */ }
      await upsertConversation({
        id: params.conversationId,
        phone: params.conversationId,
        displayName: customerName,
        avatarUrl: customerAvatar || undefined,
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

// ─── Friend API Functions ─────────────────────────────────────────────────────

/**
 * Tìm user Zalo qua số điện thoại
 */
export async function findZaloUserByPhone(phone: string): Promise<{
  success: boolean;
  user?: { uid: string; displayName: string; avatar: string; zaloName: string };
  error?: string;
}> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) {
    return { success: false, error: "Chưa kết nối Zalo. Vui lòng đăng nhập lại." };
  }
  try {
    const api = zaloApi as {
      findUser: (phone: string) => Promise<{
        uid?: string;
        display_name?: string;
        zalo_name?: string;
        avatar?: string;
      }>;
    };
    const result = await api.findUser(phone);
    if (!result || !result.uid) {
      return { success: false, error: "Không tìm thấy người dùng với số điện thoại này." };
    }
    return {
      success: true,
      user: {
        uid: result.uid,
        displayName: result.display_name || result.zalo_name || result.uid,
        avatar: result.avatar || "",
        zaloName: result.zalo_name || "",
      },
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[ZaloGateway] findZaloUserByPhone error:", error);
    return { success: false, error: error.message || "Lỗi tìm kiếm người dùng" };
  }
}

/**
 * Gửi lời mời kết bạn đến một user
 */
export async function sendZaloFriendRequest(params: {
  userId: string;
  message?: string;
}): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) {
    return { success: false, error: "Chưa kết nối Zalo. Vui lòng đăng nhập lại." };
  }
  try {
    const api = zaloApi as {
      sendFriendRequest: (msg: string, userId: string) => Promise<unknown>;
    };
    const msg = params.message || "Xin chào, tôi muốn kết bạn với bạn!";
    await api.sendFriendRequest(msg, params.userId);
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[ZaloGateway] sendZaloFriendRequest error:", error);
    return { success: false, error: error.message || "Lỗi gửi lời mời kết bạn" };
  }
}

/**
 * Chấp nhận lời mời kết bạn
 */
export async function acceptZaloFriendRequest(friendId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) {
    return { success: false, error: "Chưa kết nối Zalo. Vui lòng đăng nhập lại." };
  }
  try {
    const api = zaloApi as {
      acceptFriendRequest: (friendId: string) => Promise<unknown>;
    };
    await api.acceptFriendRequest(friendId);
    // Xóa khỏi danh sách incoming requests
    clearIncomingFriendRequest(friendId);
    broadcastSSE("friend_event", { type: "accepted", userId: friendId });
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[ZaloGateway] acceptZaloFriendRequest error:", error);
    return { success: false, error: error.message || "Lỗi chấp nhận lời mời kết bạn" };
  }
}

/**
 * Từ chối lời mời kết bạn
 */
export async function rejectZaloFriendRequest(friendId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) {
    return { success: false, error: "Chưa kết nối Zalo. Vui lòng đăng nhập lại." };
  }
  try {
    const api = zaloApi as {
      rejectFriendRequest: (friendId: string) => Promise<unknown>;
    };
    await api.rejectFriendRequest(friendId);
    // Xóa khỏi danh sách incoming requests
    clearIncomingFriendRequest(friendId);
    broadcastSSE("friend_event", { type: "rejected_by_me", userId: friendId });
    return { success: true };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[ZaloGateway] rejectZaloFriendRequest error:", error);
    return { success: false, error: error.message || "Lỗi từ chối lời mời kết bạn" };
  }
}

/**
 * Kiểm tra trạng thái kết bạn với một user
 */
export async function getZaloFriendRequestStatus(friendId: string): Promise<{
  success: boolean;
  status?: {
    isFriend: boolean;
    isRequested: boolean; // mình đã gửi lời mời
    isRequesting: boolean; // họ đã gửi lời mời cho mình
  };
  error?: string;
}> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) {
    return { success: false, error: "Chưa kết nối Zalo. Vui lòng đăng nhập lại." };
  }
  try {
    const api = zaloApi as {
      getFriendRequestStatus: (friendId: string) => Promise<{
        is_friend: number;
        is_requested: number;
        is_requesting: number;
      }>;
    };
    const result = await api.getFriendRequestStatus(friendId);
    return {
      success: true,
      status: {
        isFriend: result.is_friend === 1,
        isRequested: result.is_requested === 1,
        isRequesting: result.is_requesting === 1,
      },
    };
  } catch (err: unknown) {
    const error = err as Error;
    console.error("[ZaloGateway] getZaloFriendRequestStatus error:", error);
    return { success: false, error: error.message || "Lỗi kiểm tra trạng thái kết bạn" };
  }
}

// ─── Friends Extended API ─────────────────────────────────────────────────────

/** Lấy danh sách tất cả bạn bè */
export async function getAllZaloFriends(query?: string): Promise<{
  success: boolean;
  friends?: Array<{ userId: string; displayName: string; zaloName: string; avatar: string; phoneNumber?: string }>;
  error?: string;
}> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getAllFriends: () => Promise<unknown[]> };
    let friends = await api.getAllFriends();
    if (!Array.isArray(friends)) friends = [];
    if (query) {
      const q = query.toLowerCase();
      friends = friends.filter((f: any) =>
        (f.displayName ?? "").toLowerCase().includes(q) ||
        (f.zaloName ?? "").toLowerCase().includes(q) ||
        String(f.userId ?? "").includes(q)
      );
    }
    return {
      success: true,
      friends: (friends as any[]).map((f: any) => ({
        userId: f.userId,
        displayName: f.displayName || f.zaloName || f.userId,
        zaloName: f.zaloName || "",
        avatar: f.avatar || "",
        phoneNumber: f.phoneNumber || "",
      })),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Lấy danh sách lời mời kết bạn đã gửi (đang chờ) */
export async function getZaloSentFriendRequests(): Promise<{
  success: boolean;
  requests?: Array<{ userId: string; displayName: string; avatar: string; requestMessage?: string; sentAt?: number }>;
  error?: string;
}> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getSentFriendRequest: () => Promise<Record<string, any>> };
    const response = await api.getSentFriendRequest();
    const requests = Object.entries(response || {}).map(([uid, info]: [string, any]) => ({
      userId: info.userId || uid,
      displayName: info.displayName || info.zaloName || uid,
      avatar: info.avatar || "",
      requestMessage: info.fReqInfo?.message,
      sentAt: info.fReqInfo?.time,
    }));
    return { success: true, requests };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Thu hồi lời mời kết bạn đã gửi */
export async function undoZaloFriendRequest(userId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { undoFriendRequest: (userId: string) => Promise<unknown> };
    await api.undoFriendRequest(userId);
    broadcastSSE("friend_event", { type: "undo_sent", userId });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Hủy kết bạn */
export async function removeZaloFriend(userId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { removeFriend: (userId: string) => Promise<unknown> };
    await api.removeFriend(userId);
    broadcastSSE("friend_event", { type: "unfriended", userId });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Đặt biệt danh cho bạn bè */
export async function setZaloFriendNickname(userId: string, nickname: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { changeFriendAlias: (alias: string, userId: string) => Promise<unknown> };
    await api.changeFriendAlias(nickname, userId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Xóa biệt danh bạn bè */
export async function removeZaloFriendNickname(userId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { removeFriendAlias: (userId: string) => Promise<unknown> };
    await api.removeFriendAlias(userId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Lấy danh sách bạn bè đang online */
export async function getZaloOnlineFriends(): Promise<{
  success: boolean;
  friends?: Array<{ userId: string; status: string }>;
  error?: string;
}> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getFriendOnlines: () => Promise<{ onlines?: Array<{ userId: string; status: string }> }> };
    const response = await api.getFriendOnlines();
    return { success: true, friends: response?.onlines ?? [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Lấy gợi ý kết bạn */
export async function getZaloFriendRecommendations(): Promise<{
  success: boolean;
  recommendations?: Array<{ userId: string; displayName: string; avatar: string; source?: string }>;
  error?: string;
}> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getFriendRecommendations: () => Promise<{ recommItems?: any[] }> };
    const result = await api.getFriendRecommendations();
    return {
      success: true,
      recommendations: (result?.recommItems ?? []).map((item: any) => ({
        userId: item.userId,
        displayName: item.displayName || item.dName || item.userId,
        avatar: item.avatar || "",
        source: item.source,
      })),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Lấy danh sách biệt danh bạn bè */
export async function getZaloAliasList(): Promise<{
  success: boolean;
  aliases?: Array<{ userId: string; alias: string }>;
  error?: string;
}> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getAliasList: () => Promise<{ items?: any[] }> };
    const result = await api.getAliasList();
    return { success: true, aliases: (result?.items ?? []).map((a: any) => ({ userId: a.userId, alias: a.alias })) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Lấy thông tin tài khoản của mình */
export async function getZaloMyProfile(): Promise<{
  success: boolean;
  profile?: { userId: string; displayName: string; zaloName: string; avatar: string; phoneNumber?: string; gender?: number; dob?: string };
  error?: string;
}> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getOwnId: () => string; fetchAccountInfo?: () => Promise<any> };
    const ownId = api.getOwnId();
    let raw: any = null;
    try { raw = await api.fetchAccountInfo?.(); } catch { /* ignore */ }
    const info = raw?.profile ?? raw;
    return {
      success: true,
      profile: {
        userId: info?.userId ?? ownId ?? "",
        displayName: info?.displayName ?? "",
        zaloName: info?.zaloName ?? "",
        avatar: info?.avatar ?? "",
        phoneNumber: info?.phoneNumber,
        gender: info?.gender,
        dob: info?.sdob,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Groups API ───────────────────────────────────────────────────────────────

/** Lấy danh sách tất cả nhóm */
export async function getAllZaloGroups(queryStr?: string): Promise<{
  success: boolean;
  groups?: Array<{ groupId: string; name: string; desc?: string; totalMember?: number; avatar?: string; adminIds?: string[] }>;
  error?: string;
}> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as {
      getAllGroups: () => Promise<{ gridVerMap?: Record<string, unknown> }>;
      getGroupInfo: (ids: string[]) => Promise<{ gridInfoMap?: Record<string, any> }>;
    };
    const groupsResp = await api.getAllGroups();
    const groupIds = Object.keys(groupsResp?.gridVerMap ?? {});
    if (groupIds.length === 0) return { success: true, groups: [] };
    const infoResp = await api.getGroupInfo(groupIds);
    let groups = Object.entries(infoResp?.gridInfoMap ?? {}).map(([id, info]: [string, any]) => ({
      groupId: id,
      name: info.name || id,
      desc: info.desc,
      totalMember: info.totalMember,
      maxMember: info.maxMember,
      creatorId: info.creatorId,
      adminIds: info.adminIds || [],
      avatar: info.avt || "",
    }));
    if (queryStr) {
      const q = queryStr.toLowerCase();
      groups = groups.filter(g => (g.name ?? "").toLowerCase().includes(q) || g.groupId.includes(q));
    }
    return { success: true, groups };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Lấy thông tin chi tiết một nhóm */
export async function getZaloGroupInfo(groupId: string): Promise<{
  success: boolean;
  group?: any;
  error?: string;
}> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getGroupInfo: (id: string | string[]) => Promise<{ gridInfoMap?: Record<string, any> }> };
    const infoResp = await api.getGroupInfo(groupId);
    const info = infoResp?.gridInfoMap?.[groupId];
    if (!info) return { success: false, error: "Không tìm thấy nhóm" };
    return { success: true, group: { groupId, name: info.name, desc: info.desc, totalMember: info.totalMember, maxMember: info.maxMember, creatorId: info.creatorId, adminIds: info.adminIds, avatar: info.avt, createdTime: info.createdTime } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Tạo nhóm mới */
export async function createZaloGroup(params: { name?: string; memberIds: string[] }): Promise<{
  success: boolean;
  groupId?: string;
  error?: string;
}> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { createGroup: (opts: { name?: string; members: string[] }) => Promise<{ groupId?: string }> };
    const result = await api.createGroup({ name: params.name, members: params.memberIds });
    return { success: true, groupId: result?.groupId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Thêm thành viên vào nhóm */
export async function addZaloUserToGroup(userId: string, groupId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { addUserToGroup: (memberId: string, groupId: string) => Promise<{ errorMembers?: string[] }> };
    const result = await api.addUserToGroup(userId, groupId);
    if (result?.errorMembers?.length) return { success: false, error: `Không thể thêm: ${result.errorMembers.join(", ")}` };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Xóa thành viên khỏi nhóm */
export async function removeZaloUserFromGroup(userId: string, groupId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { removeUserFromGroup: (memberId: string, groupId: string) => Promise<unknown> };
    await api.removeUserFromGroup(userId, groupId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Rời nhóm */
export async function leaveZaloGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { leaveGroup: (groupId: string) => Promise<unknown> };
    await api.leaveGroup(groupId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Đổi tên nhóm */
export async function changeZaloGroupName(groupId: string, name: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { changeGroupName: (name: string, groupId: string) => Promise<unknown> };
    await api.changeGroupName(name, groupId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Lấy link tham gia nhóm */
export async function getZaloGroupLink(groupId: string): Promise<{ success: boolean; link?: string; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getGroupLink: (groupId: string) => Promise<{ link?: string }> };
    const result = await api.getGroupLink(groupId);
    return { success: true, link: result?.link };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Bật link tham gia nhóm */
export async function enableZaloGroupLink(groupId: string): Promise<{ success: boolean; link?: string; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { enableGroupLink: (groupId: string) => Promise<{ link?: string }> };
    const result = await api.enableGroupLink(groupId);
    return { success: true, link: result?.link };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Tham gia nhóm qua link */
export async function joinZaloGroupByLink(link: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { joinGroupLink: (link: string) => Promise<unknown> };
    await api.joinGroupLink(link);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Lấy danh sách lời mời vào nhóm */
export async function getZaloGroupInvites(): Promise<{ success: boolean; invites?: any; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getGroupInviteBoxList: () => Promise<any> };
    const result = await api.getGroupInviteBoxList();
    return { success: true, invites: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Chấp nhận lời mời vào nhóm */
export async function joinZaloGroupInvite(groupId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { joinGroupInviteBox: (groupId: string) => Promise<unknown> };
    await api.joinGroupInviteBox(groupId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Lấy danh sách thành viên bị block trong nhóm */
export async function getZaloGroupBlockedMembers(groupId: string): Promise<{
  success: boolean;
  members?: Array<{ userId: string; displayName: string; avatar: string }>;
  error?: string;
}> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getGroupBlockedMember: (opts: object, groupId: string) => Promise<{ blocked_members?: any[] }> };
    const result = await api.getGroupBlockedMember({}, groupId);
    return {
      success: true,
      members: (result?.blocked_members ?? []).map((m: any) => ({
        userId: m.id,
        displayName: m.dName || m.zaloName || m.id,
        avatar: m.avatar || "",
      })),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Block thành viên trong nhóm (Zalo-level) */
export async function blockZaloGroupMember(userId: string, groupId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { addGroupBlockedMember: (memberId: string, groupId: string) => Promise<unknown> };
    await api.addGroupBlockedMember(userId, groupId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Unblock thành viên trong nhóm */
export async function unblockZaloGroupMember(userId: string, groupId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { removeGroupBlockedMember: (memberId: string, groupId: string) => Promise<unknown> };
    await api.removeGroupBlockedMember(userId, groupId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Mời user vào nhiều nhóm */
export async function inviteZaloUserToGroups(userId: string, groupIds: string[]): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { inviteUserToGroups: (userId: string, groupIds: string[]) => Promise<unknown> };
    await api.inviteUserToGroups(userId, groupIds);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Đổi chủ nhóm */
export async function changeZaloGroupOwner(userId: string, groupId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { changeGroupOwner: (memberId: string, groupId: string) => Promise<unknown> };
    await api.changeGroupOwner(userId, groupId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Giải tán nhóm */
export async function disperseZaloGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { disperseGroup: (groupId: string) => Promise<unknown> };
    await api.disperseGroup(groupId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Lấy nhóm chung với một user */
export async function getZaloRelatedFriendGroups(userId: string): Promise<{ success: boolean; groupIds?: string[]; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getRelatedFriendGroup: (userId: string) => Promise<{ groupRelateds?: Record<string, string[]> }> };
    const result = await api.getRelatedFriendGroup(userId);
    return { success: true, groupIds: result?.groupRelateds?.[userId] ?? [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Message Extended API ─────────────────────────────────────────────────────

/** Thu hồi tin nhắn */
export async function recallZaloMessage(params: {
  msgId: string;
  cliMsgId: string;
  threadId: string;
  isGroup?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const { ThreadType } = require("zca-js");
    const api = zaloApi as { undo: (msg: { msgId: string; cliMsgId: string }, threadId: string, type: number) => Promise<unknown> };
    const type = params.isGroup ? ThreadType.Group : ThreadType.User;
    await api.undo({ msgId: params.msgId, cliMsgId: params.cliMsgId }, params.threadId, type);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Thêm reaction vào tin nhắn */
export async function addZaloReaction(params: {
  threadId: string;
  msgId: string;
  cliMsgId: string;
  icon: string;
  isGroup?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const { ThreadType, Reactions } = require("zca-js");
    const iconMap: Record<string, string> = {
      heart: Reactions.HEART, like: Reactions.LIKE, haha: Reactions.HAHA,
      wow: Reactions.WOW, cry: Reactions.CRY, angry: Reactions.ANGRY,
      kiss: Reactions.KISS, sad: Reactions.SAD, dislike: Reactions.DISLIKE,
      love: Reactions.LOVE, ok: Reactions.OK, pray: Reactions.PRAY,
    };
    const reactionIcon = iconMap[params.icon.toLowerCase()] ?? params.icon;
    const api = zaloApi as { addReaction: (icon: string, opts: { data: { msgId: string; cliMsgId: string }; threadId: string; type: number }) => Promise<unknown> };
    const type = params.isGroup ? ThreadType.Group : ThreadType.User;
    await api.addReaction(reactionIcon, { data: { msgId: params.msgId, cliMsgId: params.cliMsgId }, threadId: params.threadId, type });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Chuyển tiếp tin nhắn */
export async function forwardZaloMessage(params: {
  message: string;
  threadIds: string[];
  isGroup?: boolean;
}): Promise<{ success: boolean; successCount?: number; failCount?: number; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const { ThreadType } = require("zca-js");
    const api = zaloApi as { forwardMessage: (msg: { message: string }, threadIds: string[], type: number) => Promise<{ success?: string[]; fail?: string[] }> };
    const type = params.isGroup ? ThreadType.Group : ThreadType.User;
    const result = await api.forwardMessage({ message: params.message }, params.threadIds, type);
    return { success: true, successCount: result?.success?.length ?? 0, failCount: result?.fail?.length ?? 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Gửi tin nhắn có định dạng (styled) */
export async function sendZaloStyledMessage(params: {
  threadId: string;
  message: string;
  isGroup?: boolean;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const { ThreadType } = require("zca-js");
    const api = zaloApi as { sendMessage: (msg: { msg: string }, threadId: string, type: number) => Promise<{ message?: { msgId?: string } }> };
    const type = params.isGroup ? ThreadType.Group : ThreadType.User;
    const result = await api.sendMessage({ msg: params.message }, params.threadId, type);
    return { success: true, messageId: result?.message?.msgId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Gửi sticker */
export async function sendZaloSticker(params: {
  threadId: string;
  stickerId: number;
  stickerCateId: number;
  isGroup?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const { ThreadType } = require("zca-js");
    const api = zaloApi as { sendSticker: (sticker: { id: number; cateId: number; type: number }, threadId: string, type: number) => Promise<unknown> };
    const type = params.isGroup ? ThreadType.Group : ThreadType.User;
    await api.sendSticker({ id: params.stickerId, cateId: params.stickerCateId, type: 0 }, params.threadId, type);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Tìm kiếm sticker */
export async function searchZaloStickers(keyword: string): Promise<{
  success: boolean;
  stickers?: Array<{ id: number; cateId: number; text: string; stickerUrl: string }>;
  error?: string;
}> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as {
      getStickers: (keyword: string) => Promise<number[]>;
      getStickersDetail: (ids: number[]) => Promise<any[]>;
    };
    const stickerIds = await api.getStickers(keyword);
    if (!stickerIds?.length) return { success: true, stickers: [] };
    const details = await api.getStickersDetail(stickerIds.slice(0, 20));
    return {
      success: true,
      stickers: (Array.isArray(details) ? details : []).map((s: any) => ({
        id: s.id, cateId: s.cateId, text: s.text, stickerUrl: s.stickerUrl,
      })),
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Gửi typing event */
export async function sendZaloTypingEvent(threadId: string, isGroup?: boolean): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const { ThreadType } = require("zca-js");
    const api = zaloApi as { sendTypingEvent: (threadId: string, type: number) => Promise<unknown> };
    await api.sendTypingEvent(threadId, isGroup ? ThreadType.Group : ThreadType.User);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Auto-Reply API ───────────────────────────────────────────────────────────

/** Lấy danh sách auto-reply */
export async function getZaloAutoReplies(): Promise<{ success: boolean; replies?: any[]; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getAutoReplyList: () => Promise<{ items?: any[] }> };
    const result = await api.getAutoReplyList();
    return { success: true, replies: result?.items ?? [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Tạo auto-reply */
export async function createZaloAutoReply(params: {
  message: string;
  startTime?: number;
  endTime?: number;
}): Promise<{ success: boolean; item?: any; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as {
      createAutoReply: (opts: { content: string; isEnable: boolean; startTime: number; endTime: number; scope: number }) => Promise<{ item?: any }>;
    };
    const result = await api.createAutoReply({
      content: params.message,
      isEnable: true,
      startTime: params.startTime ?? 0,
      endTime: params.endTime ?? 0,
      scope: 0,
    });
    return { success: true, item: result?.item };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Xóa auto-reply */
export async function deleteZaloAutoReply(replyId: number): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { deleteAutoReply: (replyId: number) => Promise<unknown> };
    await api.deleteAutoReply(replyId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Catalog & Products API ───────────────────────────────────────────────────

/** Lấy danh sách catalog */
export async function getZaloCatalogs(): Promise<{ success: boolean; catalogs?: any[]; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getCatalogList: () => Promise<{ items?: any[]; has_more?: number }> };
    const result = await api.getCatalogList();
    return { success: true, catalogs: result?.items ?? [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Tạo catalog */
export async function createZaloCatalog(title: string): Promise<{ success: boolean; catalog?: any; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { createCatalog: (title: string) => Promise<{ item?: any }> };
    const result = await api.createCatalog(title);
    return { success: true, catalog: result?.item };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Cập nhật catalog */
export async function updateZaloCatalog(catalogId: string, title: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { updateCatalog: (opts: { catalogId: string; catalogName: string }) => Promise<unknown> };
    await api.updateCatalog({ catalogId, catalogName: title });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Xóa catalog */
export async function deleteZaloCatalog(catalogId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { deleteCatalog: (catalogId: string) => Promise<unknown> };
    await api.deleteCatalog(catalogId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Lấy danh sách sản phẩm trong catalog */
export async function getZaloProducts(catalogId: string): Promise<{ success: boolean; products?: any[]; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getProductCatalogList: (opts: { catalogId: string }) => Promise<{ items?: any[] }> };
    const result = await api.getProductCatalogList({ catalogId });
    return { success: true, products: result?.items ?? [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Tạo sản phẩm trong catalog */
export async function createZaloProduct(params: {
  catalogId: string;
  title: string;
  price: number;
  description?: string;
}): Promise<{ success: boolean; product?: any; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { createProductCatalog: (opts: { catalogId: string; productName: string; price: number; description: string }) => Promise<{ item?: any }> };
    const result = await api.createProductCatalog({ catalogId: params.catalogId, productName: params.title, price: params.price, description: params.description || "" });
    return { success: true, product: result?.item };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Cập nhật sản phẩm */
export async function updateZaloProduct(params: {
  catalogId: string;
  productId: string;
  title: string;
  price: number;
  description?: string;
}): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { updateProductCatalog: (opts: any) => Promise<unknown> };
    await api.updateProductCatalog({ catalogId: params.catalogId, productId: params.productId, productName: params.title, price: params.price, description: params.description || "", createTime: Date.now() });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Xóa sản phẩm */
export async function deleteZaloProduct(catalogId: string, productId: string): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { deleteProductCatalog: (opts: { catalogId: string; productIds: string }) => Promise<unknown> };
    await api.deleteProductCatalog({ catalogId, productIds: productId });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Reminders API ────────────────────────────────────────────────────────────

/** Lấy danh sách reminder trong hội thoại */
export async function getZaloReminders(threadId: string, isGroup?: boolean): Promise<{ success: boolean; reminders?: any[]; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const { ThreadType } = require("zca-js");
    const api = zaloApi as { getListReminder: (opts: object, threadId: string, type: number) => Promise<any[]> };
    const result = await api.getListReminder({}, threadId, isGroup ? ThreadType.Group : ThreadType.User);
    return { success: true, reminders: Array.isArray(result) ? result : [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Tạo reminder */
export async function createZaloReminder(params: {
  threadId: string;
  title: string;
  emoji?: string;
  startTime?: number;
  repeat?: string;
  isGroup?: boolean;
}): Promise<{ success: boolean; reminder?: any; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const { ThreadType } = require("zca-js");
    const api = zaloApi as { createReminder: (opts: any, threadId: string, type: number) => Promise<any> };
    const result = await api.createReminder({ title: params.title, emoji: params.emoji, startTime: params.startTime, repeat: params.repeat }, params.threadId, params.isGroup ? ThreadType.Group : ThreadType.User);
    return { success: true, reminder: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Xóa reminder */
export async function removeZaloReminder(reminderId: string, threadId: string, isGroup?: boolean): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const { ThreadType } = require("zca-js");
    const api = zaloApi as { removeReminder: (reminderId: string, threadId: string, type: number) => Promise<unknown> };
    await api.removeReminder(reminderId, threadId, isGroup ? ThreadType.Group : ThreadType.User);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Labels API ───────────────────────────────────────────────────────────────

/** Lấy danh sách nhãn (labels) */
export async function getZaloLabels(): Promise<{ success: boolean; labels?: any[]; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getLabels: () => Promise<{ labelData?: any[] }> };
    const result = await api.getLabels();
    return { success: true, labels: result?.labelData ?? [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Polls API ────────────────────────────────────────────────────────────────

/** Tạo bình chọn trong nhóm */
export async function createZaloPoll(params: {
  groupId: string;
  title: string;
  options: string[];
}): Promise<{ success: boolean; poll?: any; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { createPoll: (opts: { question: string; options: string[] }, groupId: string) => Promise<any> };
    const result = await api.createPoll({ question: params.title, options: params.options }, params.groupId);
    return { success: true, poll: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Vote bình chọn */
export async function voteZaloPoll(pollId: number, optionId: number): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { votePoll: (pollId: number, optionId: number) => Promise<unknown> };
    await api.votePoll(pollId, optionId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Khóa bình chọn */
export async function lockZaloPoll(pollId: number): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { lockPoll: (pollId: number) => Promise<unknown> };
    await api.lockPoll(pollId);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Settings API ─────────────────────────────────────────────────────────────

/** Lấy cài đặt tài khoản */
export async function getZaloSettings(): Promise<{ success: boolean; settings?: any; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getSettings: () => Promise<any> };
    const result = await api.getSettings();
    return { success: true, settings: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Cập nhật cài đặt tài khoản */
export async function updateZaloSetting(settingKey: string, settingValue: unknown): Promise<{ success: boolean; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { updateSettings: (key: string, value: unknown) => Promise<unknown> };
    await api.updateSettings(settingKey, settingValue);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Notes API ────────────────────────────────────────────────────────────────

/** Tạo ghi chú trong nhóm */
export async function createZaloNote(groupId: string, title: string, pinAct?: number): Promise<{ success: boolean; note?: any; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { createNote: (opts: { title: string; pinAct?: number }, groupId: string) => Promise<any> };
    const result = await api.createNote({ title, pinAct }, groupId);
    return { success: true, note: result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Lấy danh sách board trong nhóm */
export async function getZaloBoards(groupId: string): Promise<{ success: boolean; boards?: any[]; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getListBoard: (opts: object, groupId: string) => Promise<{ items?: any[] }> };
    const result = await api.getListBoard({}, groupId);
    return { success: true, boards: result?.items ?? [] };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── User Info API ────────────────────────────────────────────────────────────

/** Lấy thông tin chi tiết một user - parse đúng cấu trúc zalo-personal */
export async function getZaloUserInfo(userId: string): Promise<{ success: boolean; user?: any; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const api = zaloApi as { getUserInfo: (userId: string) => Promise<any> };
    const result = await api.getUserInfo(userId);
    // Parse theo cấu trúc zalo-personal: result.changed_profiles[userId]
    const profiles = result?.changed_profiles ?? {};
    const info = profiles[userId] ?? Object.values(profiles)[0] as any;
    if (!info) return { success: true, user: result };
    const parsed = {
      userId,
      displayName: info.displayName ?? info.display_name ?? "",
      zaloName: info.zaloName ?? info.zalo_name ?? "",
      avatar: info.avatar ?? "",
      gender: info.gender,
      dob: info.dob,
      _raw: result,
    };
    return { success: true, user: parsed };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/** Gửi tin nhắn đến người lạ (chưa kết bạn) */
export async function sendZaloMessageToStranger(params: {
  userId: string;
  message: string;
  qna?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  await ensureZaloConnected();
  if (!isConnected || !zaloApi) return { success: false, error: "Chưa kết nối Zalo." };
  try {
    const { ThreadType } = require("zca-js");
    const api = zaloApi as { sendMessageToStranger: (opts: { msg: string; qna?: string }, userId: string, type: number) => Promise<{ message?: { msgId?: string } }> };
    const result = await api.sendMessageToStranger({ msg: params.message, qna: params.qna }, params.userId, ThreadType.User);
    return { success: true, messageId: result?.message?.msgId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
