/**
 * zalo-gateway.ts
 * Quản lý kết nối Zalo Personal Account qua zca-js
 * 
 * Kiến trúc:
 * - Singleton ZaloGateway chạy trong Next.js server process
 * - Nhận tin nhắn từ Zalo Web (WebSocket) → lưu DB → broadcast SSE
 * - Gửi tin nhắn (text + ảnh/video) qua zca-js API
 * 
 * Lưu ý: zca-js là unofficial API, chỉ 1 web listener/account tại một thời điểm
 */

import {
  upsertConversation,
  saveMessage,
  incrementUnreadCount,
  getActiveZaloCredentials,
  updateZaloLastConnected,
  saveZaloCredentials,
} from "./zalo-inbox-store";
import { query } from "./db";

// ─── SSE Broadcast ────────────────────────────────────────────────────────────

type SSEListener = (event: string, data: unknown) => void;
const sseListeners = new Map<string, SSEListener>();

export function registerZaloSSEListener(clientId: string, fn: SSEListener): void {
  sseListeners.set(clientId, fn);
}

export function unregisterZaloSSEListener(clientId: string): void {
  sseListeners.delete(clientId);
}

export function broadcastZaloEvent(event: string, data: unknown): void {
  sseListeners.forEach((fn) => {
    try { fn(event, data); } catch { /* ignore */ }
  });
}

// ─── Gateway State ────────────────────────────────────────────────────────────

let isConnected = false;
let connectionStatus: "disconnected" | "connecting" | "connected" | "error" = "disconnected";
let connectedPhone = "";
let zcaApi: any = null;
let connectedName = "";

export function getGatewayStatus() {
  return { isConnected, status: connectionStatus, phone: connectedPhone, name: connectedName };
}

// ─── QR Login ─────────────────────────────────────────────────────────────────

export interface QRLoginCallbacks {
  onQRCode: (image: string, token: string) => void;
  onQRExpired: () => void;
  onScanned: (displayName: string, avatar: string) => void;
  onSuccess: (phone: string, displayName: string) => void;
  onError: (error: string) => void;
}

export async function startQRLogin(callbacks: QRLoginCallbacks): Promise<void> {
  // Ngắt kết nối cũ nếu đang kết nối
  if (isConnected) {
    await disconnectZaloGateway();
  }

  try {
    const { Zalo, LoginQRCallbackEventType } = await import("zca-js");
    const zalo = new Zalo();
    const userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

    // Lưu credentials khi GotLoginInfo callback được gọi
    let savedCredentials: { cookie: any; imei: string; userAgent: string } | null = null;

    const api = await zalo.loginQR(
      { userAgent },
      async (event) => {
        switch (event.type) {
          case LoginQRCallbackEventType.QRCodeGenerated:
            callbacks.onQRCode(event.data.image, event.data.token);
            break;
          case LoginQRCallbackEventType.QRCodeExpired:
            callbacks.onQRExpired();
            event.actions.retry();
            break;
          case LoginQRCallbackEventType.QRCodeScanned:
            callbacks.onScanned(event.data.display_name, event.data.avatar);
            break;
          case LoginQRCallbackEventType.QRCodeDeclined:
            callbacks.onError("Người dùng từ chối đăng nhập. Vui lòng thử lại.");
            break;
          case LoginQRCallbackEventType.GotLoginInfo:
            // Lưu credentials để dùng sau khi loginQR resolve
            savedCredentials = {
              cookie: event.data.cookie,
              imei: event.data.imei,
              userAgent: event.data.userAgent,
            };
            break;
        }
      }
    );

    if (api) {
      // api là API object từ zca-js sau khi đăng nhập thành công
      // Lưu credentials vào DB
      const cookieData = savedCredentials?.cookie || [];
      const cookieStr = JSON.stringify(cookieData);
      const imei = savedCredentials?.imei || `imei_${Date.now()}`;
      // Lấy tên người dùng từ loginInfo
      const loginInfo = (api as any).ctx?.loginInfo;
      const displayName = loginInfo?.display_name || loginInfo?.name || imei;
      const phone = loginInfo?.phone || displayName;

      await saveZaloCredentials({
        phone: displayName,
        imei,
        cookies: cookieStr,
        userAgent,
      });

      // Kết nối gateway với credentials mới (dùng api đã có)
      zcaApi = api;
      isConnected = true;
      connectionStatus = "connected";
      connectedPhone = displayName;
      connectedName = displayName;

      // Setup listener
      try {
        api.listener.on("message", async (msg: any) => {
          await handleIncomingMessage(msg, displayName);
        });
        api.listener.start();
      } catch (e) {
        console.warn("[ZaloGateway] Could not start listener:", e);
      }

      broadcastZaloEvent("status", { status: "connected", phone: displayName });
      callbacks.onSuccess(displayName, displayName);
    } else {
      callbacks.onError("Đăng nhập thất bại. Vui lòng thử lại.");
    }
  } catch (err: any) {
    callbacks.onError(err?.message || "Lỗi không xác định khi đăng nhập QR");
  }
}

// ─── Connect via zca-js ───────────────────────────────────────────────────────

export async function connectZaloGateway(): Promise<{ success: boolean; message: string }> {
  if (isConnected) {
    return { success: true, message: `Đã kết nối: ${connectedPhone}` };
  }

  const creds = await getActiveZaloCredentials();
  if (!creds) {
    return { success: false, message: "Chưa có thông tin đăng nhập Zalo. Vui lòng cấu hình trong Cài đặt." };
  }

  connectionStatus = "connecting";
  broadcastZaloEvent("status", { status: "connecting", phone: creds.phone });

  try {
    // Dynamic import zca-js (chỉ chạy server-side)
    const { Zalo } = await import("zca-js");
    const zalo = new Zalo();

    // Parse cookies từ JSON string
    let cookiesObj: Record<string, string> = {};
    try {
      cookiesObj = JSON.parse(creds.cookies);
    } catch {
      return { success: false, message: "Cookies không hợp lệ. Vui lòng cập nhật lại." };
    }

    // Login bằng cookies (không cần QR)
    // zca-js v2: dùng loginCookie(ctx, credentials)
    const ctx = {};
    zcaApi = await zalo.loginCookie(ctx, {
      imei: creds.imei,
      cookie: cookiesObj,
      userAgent: creds.userAgent,
    });

    // Lắng nghe tin nhắn mới
    zcaApi.listener.on("message", async (message: any) => {
      await handleIncomingMessage(message, creds.phone);
    });

    zcaApi.listener.start();

    isConnected = true;
    connectionStatus = "connected";
    connectedPhone = creds.phone;
    connectedName = creds.phone;

    await updateZaloLastConnected(creds.phone);
    broadcastZaloEvent("status", { status: "connected", phone: creds.phone });

    return { success: true, message: `Đã kết nối Zalo: ${creds.phone}` };
  } catch (err: any) {
    isConnected = false;
    connectionStatus = "error";
    broadcastZaloEvent("status", { status: "error", message: err?.message || "Lỗi kết nối" });
    return { success: false, message: `Lỗi kết nối: ${err?.message || "Unknown error"}` };
  }
}

export async function disconnectZaloGateway(): Promise<void> {
  if (zcaApi) {
    try { zcaApi.listener.stop(); } catch { /* ignore */ }
    zcaApi = null;
  }
  isConnected = false;
  connectionStatus = "disconnected";
  connectedPhone = "";
  connectedName = "";
  broadcastZaloEvent("status", { status: "disconnected" });
}

// ─── Handle Incoming Message ──────────────────────────────────────────────────

async function handleIncomingMessage(message: any, myPhone: string): Promise<void> {
  try {
    const isSelf = message.isSelf === true;
    const threadId = message.threadId as string;
    const msgData = message.data;
    const msgId = msgData?.msgId as string || `msg_${Date.now()}`;
    const senderId = msgData?.uidFrom as string || threadId;
    const senderName = msgData?.dName as string || "Người dùng";
    const msgType = msgData?.msgType as string || "webchat";

    // Parse content dựa theo msgType
    let content = "";
    let contentType: "text" | "image" | "sticker" | "file" | "link" = "text";
    let attachmentsJson: string | null = null;

    if (typeof msgData?.content === "string") {
      // Text message
      content = msgData.content;
      contentType = "text";
    } else if (typeof msgData?.content === "object" && msgData.content !== null) {
      // Non-text message (ảnh, video, sticker, file, ...)
      const contentObj = msgData.content as Record<string, any>;
      
      if (msgType === "chat.photo" || contentObj.hdUrl || contentObj.normalUrl || contentObj.thumbUrl) {
        // Ảnh
        contentType = "image";
        const imageUrl = contentObj.hdUrl || contentObj.normalUrl || contentObj.thumbUrl || "";
        const thumbUrl = contentObj.thumbUrl || contentObj.normalUrl || "";
        content = "[Hình ảnh]";
        attachmentsJson = JSON.stringify([{
          type: "photo",
          url: imageUrl,
          origin_url: contentObj.hdUrl || contentObj.normalUrl || imageUrl,
          thumb_url: thumbUrl,
          width: contentObj.width,
          height: contentObj.height,
        }]);
      } else if (msgType === "chat.video.msg" || contentObj.fileUrl?.includes("video") || contentObj.fileName?.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
        // Video
        contentType = "file";
        content = "[Video]";
        attachmentsJson = JSON.stringify([{
          type: "video",
          url: contentObj.fileUrl || contentObj.url || "",
          file_name: contentObj.fileName || "video",
          file_size: contentObj.fileSize || contentObj.totalSize,
        }]);
      } else if (msgType === "chat.sticker") {
        // Sticker
        contentType = "sticker";
        content = "[Sticker]";
        attachmentsJson = JSON.stringify([{
          type: "sticker",
          url: contentObj.hdUrl || contentObj.thumbUrl || contentObj.url || "",
        }]);
      } else if (msgType === "share.file" || contentObj.fileUrl) {
        // File
        contentType = "file";
        content = `[File: ${contentObj.fileName || "file"}]`;
        attachmentsJson = JSON.stringify([{
          type: "file",
          url: contentObj.fileUrl || contentObj.url || "",
          file_name: contentObj.fileName || "file",
          file_size: contentObj.fileSize || contentObj.totalSize,
        }]);
      } else if (msgType === "chat.gif") {
        // GIF
        contentType = "image";
        content = "[GIF]";
        attachmentsJson = JSON.stringify([{
          type: "photo",
          url: contentObj.url || contentObj.hdUrl || "",
          origin_url: contentObj.url || contentObj.hdUrl || "",
          thumb_url: contentObj.thumbUrl || "",
        }]);
      } else if (msgType === "chat.voice") {
        // Voice message
        contentType = "file";
        content = "[Tin nhắn thoại]";
        attachmentsJson = JSON.stringify([{
          type: "voice",
          url: contentObj.fileUrl || contentObj.url || "",
          duration: contentObj.duration,
        }]);
      } else if (contentObj.href || contentObj.title) {
        // Link/card
        contentType = "link";
        content = contentObj.title || contentObj.href || "[Link]";
        attachmentsJson = JSON.stringify([{
          type: "link",
          url: contentObj.href || "",
          title: contentObj.title || "",
          thumb: contentObj.thumb || "",
        }]);
      } else {
        // Unknown object content
        content = "[Tin nhắn đặc biệt]";
        contentType = "text";
      }
    } else {
      content = "[Tin nhắn đặc biệt]";
      contentType = "text";
    }

    // Tìm số điện thoại từ threadId (Zalo personal dùng userId = phone)
    const phone = isSelf ? threadId : senderId;
    const displayName = isSelf ? senderName : senderName;

    // Tìm lead trong CRM theo số điện thoại
    const leadId = await findLeadByPhone(phone);

    // Upsert conversation
    await upsertConversation({
      id: threadId,
      phone,
      displayName: displayName,
      lastMessage: content,
      leadId,
    });

    // Lưu tin nhắn
    await saveMessage({
      id: msgId,
      conversationId: threadId,
      senderId,
      senderName,
      content,
      contentType,
      attachments: attachmentsJson,
      isSelf,
    });

    // Tăng unread nếu tin nhắn từ khách (không phải mình gửi)
    if (!isSelf) {
      await incrementUnreadCount(threadId);
    }

    // Broadcast SSE cho tất cả nhân viên đang xem inbox
    broadcastZaloEvent("new_message", {
      conversationId: threadId,
      message: {
        id: msgId,
        conversationId: threadId,
        senderId,
        senderName,
        content,
        contentType,
        attachments: attachmentsJson ? JSON.parse(attachmentsJson) : null,
        isSelf,
        createdAt: new Date().toISOString(),
      },
      leadId,
    });
  } catch (err) {
    console.error("[ZaloGateway] Error handling message:", err);
  }
}

// ─── Send Text Message ────────────────────────────────────────────────────────

export async function sendZaloMessage(params: {
  conversationId: string;
  content: string;
  senderName: string;
  senderId: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!zcaApi || !isConnected) {
    return { success: false, error: "Zalo chưa được kết nối. Vui lòng kết nối trong Cài đặt." };
  }

  try {
    const { ThreadType } = await import("zca-js");
    await zcaApi.sendMessage(
      { msg: params.content },
      params.conversationId,
      ThreadType.User
    );

    const msgId = `sent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Lưu tin nhắn đã gửi vào DB
    await saveMessage({
      id: msgId,
      conversationId: params.conversationId,
      senderId: params.senderId,
      senderName: params.senderName,
      content: params.content,
      contentType: "text",
      isSelf: true,
    });

    // Cập nhật last message của conversation
    await upsertConversation({
      id: params.conversationId,
      phone: params.conversationId,
      displayName: "",
      lastMessage: params.content,
    });

    // Broadcast tin nhắn đã gửi
    broadcastZaloEvent("new_message", {
      conversationId: params.conversationId,
      message: {
        id: msgId,
        conversationId: params.conversationId,
        senderId: params.senderId,
        senderName: params.senderName,
        content: params.content,
        contentType: "text",
        isSelf: true,
        createdAt: new Date().toISOString(),
      },
    });

    return { success: true, messageId: msgId };
  } catch (err: any) {
    return { success: false, error: err?.message || "Lỗi gửi tin nhắn" };
  }
}

// ─── Send Image/File ──────────────────────────────────────────────────────────

export async function sendZaloAttachment(params: {
  conversationId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  senderName: string;
  senderId: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!zcaApi || !isConnected) {
    return { success: false, error: "Zalo chưa được kết nối. Vui lòng kết nối trong Cài đặt." };
  }

  try {
    const { ThreadType } = await import("zca-js");
    
    // Xác định loại file
    const isImage = params.mimeType.startsWith("image/");
    const isVideo = params.mimeType.startsWith("video/");
    
    let width: number | undefined;
    let height: number | undefined;
    
    // Lấy metadata ảnh nếu là image
    if (isImage) {
      try {
        const sharp = (await import("sharp")).default;
        const metadata = await sharp(params.fileBuffer).metadata();
        width = metadata.width;
        height = metadata.height;
      } catch {
        // Nếu không lấy được metadata, dùng giá trị mặc định
        width = 800;
        height = 600;
      }
    }

    // Tạo AttachmentSource
    const attachmentSource = {
      data: params.fileBuffer,
      filename: params.fileName as `${string}.${string}`,
      metadata: {
        totalSize: params.fileBuffer.length,
        width,
        height,
      },
    };

    // Gửi qua zca-js
    await zcaApi.sendMessage(
      { msg: "", attachments: attachmentSource },
      params.conversationId,
      ThreadType.User
    );

    const msgId = `sent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const content = isImage ? "[Hình ảnh]" : isVideo ? "[Video]" : `[File: ${params.fileName}]`;
    const contentType = isImage ? "image" : "file";

    // Lưu vào DB
    await saveMessage({
      id: msgId,
      conversationId: params.conversationId,
      senderId: params.senderId,
      senderName: params.senderName,
      content,
      contentType,
      isSelf: true,
    });

    await upsertConversation({
      id: params.conversationId,
      phone: params.conversationId,
      displayName: "",
      lastMessage: content,
    });

    broadcastZaloEvent("new_message", {
      conversationId: params.conversationId,
      message: {
        id: msgId,
        conversationId: params.conversationId,
        senderId: params.senderId,
        senderName: params.senderName,
        content,
        contentType,
        isSelf: true,
        createdAt: new Date().toISOString(),
      },
    });

    return { success: true, messageId: msgId };
  } catch (err: any) {
    console.error("[ZaloGateway] sendZaloAttachment error:", err);
    return { success: false, error: err?.message || "Lỗi gửi file" };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findLeadByPhone(phone: string): Promise<string | null> {
  try {
    // Chuẩn hóa số điện thoại
    const normalized = phone.replace(/^\+84/, "0").replace(/\D/g, "");
    const res = await query(
      `SELECT id FROM crm_leads WHERE REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = $1 LIMIT 1`,
      [normalized]
    );
    return res.rows[0]?.id || null;
  } catch {
    return null;
  }
}

// ─── Auto-Reconnect on Server Start ──────────────────────────────────────────
// Khi Railway deploy lại, process restart → zcaApi = null → cần tự kết nối lại
// Dùng flag để chỉ chạy 1 lần dù nhiều request cùng lúc

let autoReconnectDone = false;
let autoReconnectPromise: Promise<void> | null = null;

export async function ensureZaloConnected(): Promise<void> {
  if (isConnected || autoReconnectDone) return;
  if (autoReconnectPromise) return autoReconnectPromise;

  autoReconnectPromise = (async () => {
    autoReconnectDone = true;
    try {
      const result = await connectZaloGateway();
      if (!result.success) {
        console.warn("[ZaloGateway] Auto-reconnect failed:", result.message);
        // Cho phép thử lại lần sau nếu thất bại
        autoReconnectDone = false;
      } else {
        console.log("[ZaloGateway] Auto-reconnect success:", result.message);
      }
    } catch (err) {
      console.error("[ZaloGateway] Auto-reconnect error:", err);
      autoReconnectDone = false;
    } finally {
      autoReconnectPromise = null;
    }
  })();

  return autoReconnectPromise;
}
