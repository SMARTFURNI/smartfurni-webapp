"use client";
import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import {
  MessageCircle, Search, Send, Wifi, WifiOff, User, Phone, ShoppingBag,
  ChevronRight, Settings, RefreshCw, X, Paperclip, FileText, Video,
  Download, ZoomIn, Reply, ChevronLeft, Play,
  Image as ImageIcon, Bell, BellOff, Volume2, VolumeX, Smile,
  ChevronDown, CheckCheck, MoreVertical, Hash, Info,
  File as FileIcon, Users, UserPlus, Bot, ShoppingBag as CatalogIcon, FolderOpen,
} from "lucide-react";
import ZaloFriendsPanel from "./ZaloFriendsPanel";
import ZaloGroupsPanel from "./ZaloGroupsPanel";
import ZaloAutoReplyPanel from "./ZaloAutoReplyPanel";
import ZaloCatalogPanel from "./ZaloCatalogPanel";
import ZaloMediaLibraryPanel from "./ZaloMediaLibraryPanel";
import ZaloLeadLinkModal from "./ZaloLeadLinkModal";
import styles from "./ZaloInboxClient.module.css";
import {
  getPushPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/pwa-notifications";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const T = {
  // Sidebar
  sidebarBg: "#FFFFFF",
  sidebarBorder: "#DBE3EE",
  sidebarHover: "#F1F5F9",
  sidebarActive: "#1D4ED8",
  sidebarActiveBg: "#EFF6FF",
  // Chat
  chatBg: "#F4F7FB",
  chatBgPattern: "radial-gradient(circle at 20% 50%, rgba(59,130,246,0.045) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(154,116,24,0.035) 0%, transparent 50%)",
  headerBg: "rgba(255,255,255,0.97)",
  headerBorder: "#DBE3EE",
  // Bubbles
  bubbleSelf: "linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)",
  bubbleOther: "#FFFFFF",
  bubbleOtherText: "#172033",
  bubbleSelfText: "#FFFFFF",
  // Input
  inputBg: "#FFFFFF",
  inputBorder: "#C8D3E0",
  inputFocus: "#3B82F6",
  // Text
  textPrimary: "#172033",
  textSecondary: "#526173",
  textMuted: "#738196",
  // Accent
  accent: "#3B82F6",
  accentHover: "#2563EB",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  // Unread badge
  badge: "#EF4444",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ZaloAttachment {
  type: string;
  url?: string;
  thumb?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
}
interface ZaloMessage {
  id: string;
  conversationId: string;
  senderId?: string;
  senderName: string;
  content: string;
  contentType?: string;
  isSelf: boolean;
  isRead?: boolean;
  createdAt: string;
  attachments?: ZaloAttachment[];
}
interface LeadInfo {
  id: string;
  name: string;
  phone: string;
  stage: string;
  type: string;
  assignedTo: string | null;
  recent_quotes: Array<{ id: string; name: string; status: string; total_amount: number }> | null;
}
interface ZaloConversation {
  id: string;
  zaloUserId?: string;
  phone: string | null;
  displayName: string;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
  leadId: string | null;
  lead: LeadInfo | null;
}
interface GatewayStatus {
  connected: boolean;
  phone: string | null;
  displayName?: string | null;
  status?: string;
  message?: string;
}
interface ReplyContext {
  messageId: string;
  senderName: string;
  content: string;
  isPhoto: boolean;
}
interface LightboxState {
  images: string[];
  currentIndex: number;
}
interface PendingFile {
  file: File;
  previewUrl: string;
}
interface ZaloProfileDetails {
  userId?: string;
  displayName?: string;
  zaloName?: string;
  avatar?: string;
  phoneNumber?: string;
  gender?: number;
  dob?: string;
}
interface RelatedGroup {
  groupId: string;
  name: string;
  avatar?: string;
  totalMember?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function readVideoMetadata(file: File): Promise<{
  duration?: number;
  width?: number;
  height?: number;
}> {
  if (!file.type.startsWith("video/")) return {};
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise(resolve => {
      const video = document.createElement("video");
      let settled = false;
      const finish = (metadata: { duration?: number; width?: number; height?: number }) => {
        if (settled) return;
        settled = true;
        resolve(metadata);
      };
      video.preload = "metadata";
      video.onloadedmetadata = () => finish({
        duration: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : undefined,
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
      });
      video.onerror = () => finish({});
      video.src = objectUrl;
      window.setTimeout(() => finish({}), 3000);
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function sendAttachmentBinary(conversationId: string, file: File): Promise<Response> {
  const videoMetadata = await readVideoMetadata(file);
  return fetch("/api/crm/zalo-inbox/send-attachment", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-Zalo-Conversation-Id": conversationId,
      "X-Zalo-File-Name": encodeURIComponent(file.name),
      "X-Zalo-File-Size": String(file.size),
      ...(videoMetadata.duration ? { "X-Zalo-Video-Duration": String(videoMetadata.duration) } : {}),
      ...(videoMetadata.width ? { "X-Zalo-Video-Width": String(videoMetadata.width) } : {}),
      ...(videoMetadata.height ? { "X-Zalo-Video-Height": String(videoMetadata.height) } : {}),
    },
    // Gửi thẳng Blob/File, không bọc multipart. Điều này tránh lỗi parser
    // FormData khi video lớn đi qua Next.js/undici trên Railway.
    body: file,
  });
}

function mergeRemoteWithRecentSent(
  remoteMessages: ZaloMessage[],
  previousMessages: ZaloMessage[],
  conversationId: string,
): ZaloMessage[] {
  const previousById = new Map(previousMessages.map(message => [message.id, message]));
  const hydratedRemoteMessages = remoteMessages.map(message => {
    const previous = previousById.get(message.id);
    if (!previous) return message;

    // Bản ghi đầu tiên của attachment được lưu ngay sau khi Zalo xác nhận gửi
    // nên URL bền vững có thể chưa sẵn sàng. Giữ blob preview trên trình duyệt
    // cho tới khi listener/Bucket cập nhật URL thật để ảnh không biến mất.
    const remoteHasUsableAttachment = (message.attachments || [])
      .some(attachment => Boolean(attachment.url || attachment.thumb));
    const previousHasUsableAttachment = (previous.attachments || [])
      .some(attachment => Boolean(attachment.url || attachment.thumb));
    if (!remoteHasUsableAttachment && previousHasUsableAttachment) {
      return { ...message, attachments: previous.attachments };
    }
    return message;
  });
  const remoteIds = new Set(hydratedRemoteMessages.map(message => message.id));
  const now = Date.now();
  // Zalo/DB đôi lúc đồng bộ chậm vài giây. Giữ tin vừa gửi trên màn hình
  // trong lúc chờ bản ghi phía máy chủ xuất hiện để tránh nhấp nháy/mất tin.
  const recentSentMessages = previousMessages.filter(message => {
    if (!message.isSelf || message.conversationId !== conversationId || remoteIds.has(message.id)) return false;
    const createdAt = new Date(message.createdAt).getTime();
    return Number.isFinite(createdAt) && now - createdAt < 60_000;
  });
  return [...hydratedRemoteMessages, ...recentSentMessages]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function withLocalAttachmentPreview(
  message: ZaloMessage | undefined,
  file: File,
  previewUrl: string,
): ZaloMessage | undefined {
  if (!message) return message;
  const type = file.type.startsWith("image/")
    ? "image"
    : file.type.startsWith("video/")
      ? "video"
      : "file";
  const serverAttachment = message.attachments?.[0];
  return {
    ...message,
    contentType: type,
    attachments: [{
      ...serverAttachment,
      type,
      url: previewUrl,
      thumb: type === "file" ? serverAttachment?.thumb : previewUrl,
      fileName: file.name,
      fileSize: file.size,
    }],
  };
}

function releaseLocalPreviewLater(previewUrl: string, refresh: () => void): void {
  // Đủ lâu để listener hoặc tác vụ lưu Bucket hoàn tất; sau đó tải lại URL thật
  // rồi mới giải phóng blob URL khỏi bộ nhớ trình duyệt.
  window.setTimeout(() => {
    refresh();
    window.setTimeout(() => URL.revokeObjectURL(previewUrl), 2_000);
  }, 120_000);
}

function messageListSignature(messages: ZaloMessage[]): string {
  return messages.map(message => [
    message.id,
    message.createdAt,
    message.content,
    message.contentType,
    (message.attachments || []).map(attachment => `${attachment.url}|${attachment.thumb || ""}`).join(","),
  ].join("~")).join("||");
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày`;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}
function getStageLabel(stage: string): string {
  const map: Record<string, string> = {
    new: "Mới", contacted: "Đã liên hệ", qualified: "Tiềm năng",
    proposal: "Báo giá", negotiation: "Đàm phán", won: "Thành công", lost: "Thất bại",
  };
  return map[stage] || stage;
}
function getStageColor(stage: string): string {
  const map: Record<string, string> = {
    new: "#64748B", contacted: "#3B82F6", qualified: "#8B5CF6",
    proposal: "#F59E0B", negotiation: "#EF4444", won: "#10B981", lost: "#475569",
  };
  return map[stage] || "#64748B";
}
function getZaloImageUrl(url: string | undefined): string {
  if (!url) return '';
  // Ảnh đã lưu vào Railway Bucket được phục vụ qua API nội bộ, không được
  // chuyển tiếp qua proxy CDN Zalo. Proxy chỉ dành cho URL từ Zalo.
  if (url.startsWith("/")) return url;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (typeof window !== "undefined") {
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin === window.location.origin) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch { /* URL Zalo không hợp lệ sẽ được xử lý bởi proxy */ }
  }
  return `/api/crm/zalo-inbox/image-proxy?url=${encodeURIComponent(url)}`;
}
function getZaloVideoUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith("/") || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (typeof window !== "undefined") {
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin === window.location.origin) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch { /* URL Zalo không hợp lệ sẽ được xử lý bởi proxy */ }
  }
  return `/api/crm/zalo-inbox/video-proxy?url=${encodeURIComponent(url)}`;
}
function getAvatarColor(name: string): string {
  const colors = [
    "linear-gradient(135deg,#667eea,#764ba2)",
    "linear-gradient(135deg,#f093fb,#f5576c)",
    "linear-gradient(135deg,#4facfe,#00f2fe)",
    "linear-gradient(135deg,#43e97b,#38f9d7)",
    "linear-gradient(135deg,#fa709a,#fee140)",
    "linear-gradient(135deg,#a18cd1,#fbc2eb)",
    "linear-gradient(135deg,#ffecd2,#fcb69f)",
    "linear-gradient(135deg,#a1c4fd,#c2e9fb)",
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ state, onClose }: { state: LightboxState; onClose: () => void }) {
  const [idx, setIdx] = useState(state.currentIndex);
  const proxyUrl = getZaloImageUrl(state.images[idx]);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx(i => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIdx(i => Math.min(state.images.length - 1, i + 1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, state.images.length]);
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      backdropFilter: "blur(8px)",
    }}>
      {/* Controls */}
      <div style={{ position: "absolute", top: 20, right: 20, display: "flex", gap: 8 }}>
        <a href={proxyUrl} download onClick={e => e.stopPropagation()}
          style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", textDecoration: "none", backdropFilter: "blur(4px)" }}
          title="Tải xuống"><Download size={16} /></a>
        <button onClick={onClose}
          style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", backdropFilter: "blur(4px)" }}>
          <X size={16} />
        </button>
      </div>
      {/* Counter */}
      {state.images.length > 1 && (
        <div style={{ position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 13, padding: "6px 14px", borderRadius: 20, backdropFilter: "blur(4px)" }}>
          {idx + 1} / {state.images.length}
        </div>
      )}
      {/* Nav buttons */}
      {idx > 0 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }}
          style={{ position: "absolute", left: 20, width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", backdropFilter: "blur(4px)" }}>
          <ChevronLeft size={22} />
        </button>
      )}
      {idx < state.images.length - 1 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }}
          style={{ position: "absolute", right: 20, width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", backdropFilter: "blur(4px)" }}>
          <ChevronRight size={22} />
        </button>
      )}
      <img src={proxyUrl} alt="Ảnh" onClick={e => e.stopPropagation()}
        style={{ maxWidth: "88vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 12, boxShadow: "0 25px 80px rgba(0,0,0,0.6)" }}
        onError={(e) => { (e.target as HTMLImageElement).src = state.images[idx]; }}
      />
    </div>
  );
}

function InfoDialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 10030, display: "grid", placeItems: "center", padding: 18, background: "rgba(15,23,42,.6)", backdropFilter: "blur(5px)" }}>
      <div onMouseDown={event => event.stopPropagation()} style={{ width: "min(680px,100%)", maxHeight: "min(760px,90dvh)", display: "flex", flexDirection: "column", overflow: "hidden", border: "1px solid #dbe3ee", borderRadius: 18, background: "#fff", boxShadow: "0 28px 80px rgba(15,23,42,.28)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 18px", borderBottom: "1px solid #dbe3ee", background: "linear-gradient(120deg,#fff,#fff9e8)" }}>
          <strong style={{ color: T.textPrimary, fontSize: 15 }}>{title}</strong>
          <button onClick={onClose} aria-label="Đóng" style={{ width: 34, height: 34, display: "grid", placeItems: "center", cursor: "pointer", border: "1px solid #dbe3ee", borderRadius: 10, color: T.textMuted, background: "#fff" }}><X size={17} /></button>
        </div>
        <div style={{ minHeight: 0, overflowY: "auto", padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

// ─── HighlightText ────────────────────────────────────────────────────────────
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background: "#FDE68A", color: "#92400E", borderRadius: 3, padding: "0 2px" }}>{part}</mark>
          : part
      )}
    </>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, avatarUrl, size = 40, online = false }: { name: string; avatarUrl?: string | null; size?: number; online?: boolean }) {
  const initials = (name || "?").split(" ").slice(-2).map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const proxyUrl = avatarUrl ? getZaloImageUrl(avatarUrl) : null;
  const [imgError, setImgError] = useState(false);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: getAvatarColor(name),
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: size * 0.36,
        letterSpacing: "-0.5px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        overflow: "hidden", position: "relative",
      }}>
        {proxyUrl && !imgError ? (
          <img
            src={proxyUrl}
            alt={name}
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {online && (
        <div style={{
          position: "absolute", bottom: 1, right: 1,
          width: size * 0.28, height: size * 0.28,
          borderRadius: "50%", background: T.success,
          border: `2px solid ${T.sidebarBg}`,
        }} />
      )}
    </div>
  );
}

// ─── MsgSearchBar ─────────────────────────────────────────────────────────────
function MsgSearchBar({ query, setQuery, results, current, onPrev, onNext, onClose }: {
  query: string; setQuery: (q: string) => void;
  results: number[]; current: number;
  onPrev: () => void; onNext: () => void; onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div style={{
      padding: "10px 16px", background: T.headerBg, borderBottom: `1px solid ${T.headerBorder}`,
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <Search size={15} color={T.textMuted} />
      <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
        placeholder="Tìm kiếm trong hội thoại..."
        style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: T.textPrimary }}
      />
      {query && (
        <span style={{ fontSize: 12, color: T.textMuted, whiteSpace: "nowrap" }}>
          {results.length > 0 ? `${current + 1}/${results.length}` : "0 kết quả"}
        </span>
      )}
      {results.length > 1 && (
        <>
          <button onClick={onPrev} style={{ background: "none", border: "none", cursor: "pointer", color: T.textSecondary, padding: 4 }}><ChevronLeft size={16} /></button>
          <button onClick={onNext} style={{ background: "none", border: "none", cursor: "pointer", color: T.textSecondary, padding: 4 }}><ChevronRight size={16} /></button>
        </>
      )}
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 4 }}><X size={16} /></button>
    </div>
  );
}

// ─── ReplyBar ─────────────────────────────────────────────────────────────────
function ReplyBar({ reply, onCancel }: { reply: ReplyContext; onCancel: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 16px", background: "rgba(59,130,246,0.08)",
      borderTop: `2px solid ${T.accent}`, borderBottom: `1px solid ${T.headerBorder}`,
    }}>
      <div style={{ width: 3, height: 36, borderRadius: 2, background: T.accent, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.accent, marginBottom: 2 }}>
          Trả lời {reply.senderName}
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {reply.isPhoto ? "🖼️ Hình ảnh" : reply.content.slice(0, 80)}
        </div>
      </div>
      <button onClick={onCancel}
        style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted }}>
        <X size={14} />
      </button>
    </div>
  );
}

// ─── MediaPreviewBar ──────────────────────────────────────────────────────────
function MediaPreviewBar({ files, onRemove, onSend, sending }: {
  files: PendingFile[]; onRemove: (idx: number) => void; onSend: () => void; sending: boolean;
}) {
  return (
    <div style={{
      padding: "10px 16px", background: T.inputBg, borderTop: `1px solid ${T.inputBorder}`,
      display: "flex", alignItems: "center", gap: 8, overflowX: "auto",
    }}>
      {files.map((f, i) => (
        <div key={`${f.file.name}-${f.file.lastModified}-${i}`} style={{ position: "relative", flexShrink: 0 }}>
          {f.file.type.startsWith("video/") ? (
            <video
              src={f.previewUrl}
              muted
              playsInline
              preload="metadata"
              aria-label={`Video ${f.file.name}`}
              style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: `2px solid ${T.accent}`, background: "#0f172a" }}
            />
          ) : (
            <img src={f.previewUrl} alt={f.file.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: `2px solid ${T.accent}` }} />
          )}
          {f.file.type.startsWith("video/") && (
            <span style={{ position: "absolute", left: 5, bottom: 5, padding: "2px 5px", borderRadius: 5, background: "rgba(15,23,42,.72)", color: "#fff", fontSize: 9, fontWeight: 700 }}>
              VIDEO
            </span>
          )}
          <button onClick={() => onRemove(i)}
            style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: T.error, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <X size={10} />
          </button>
        </div>
      ))}
      <button onClick={onSend} disabled={sending}
        style={{ flexShrink: 0, padding: "8px 16px", background: T.accent, color: "#fff", border: "none", borderRadius: 8, cursor: sending ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: sending ? 0.6 : 1 }}>
        {sending ? "Đang gửi..." : `Gửi ${files.length} ảnh/video`}
      </button>
    </div>
  );
}

// ─── ConversationItem ─────────────────────────────────────────────────────────
function ConversationItem({ conv, isSelected, onClick }: {
  conv: ZaloConversation; isSelected: boolean; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const hasUnread = conv.unreadCount > 0;
  return (
    <div onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", alignItems: "center", gap: 11, padding: "10px 14px",
        cursor: "pointer",
        background: isSelected ? T.sidebarActiveBg : hovered ? T.sidebarHover : "transparent",
        borderLeft: isSelected ? `3px solid ${T.accent}` : "3px solid transparent",
        transition: "all 0.15s ease",
      }}>
      <Avatar name={conv.displayName} avatarUrl={conv.avatarUrl} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <span style={{
            fontWeight: hasUnread ? 700 : 500, fontSize: 14,
            color: T.textPrimary,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160,
          }}>{conv.displayName}</span>
          <span style={{ fontSize: 11, color: hasUnread ? T.accent : T.textMuted, flexShrink: 0, fontWeight: hasUnread ? 600 : 400 }}>
            {formatTime(conv.lastMessageAt)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontSize: 12, color: hasUnread ? T.textSecondary : T.textMuted,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 175,
            fontWeight: hasUnread ? 500 : 400,
          }}>
            {conv.lastMessage || "Chưa có tin nhắn"}
          </span>
          {hasUnread && (
            <span style={{
              flexShrink: 0, minWidth: 20, height: 20, borderRadius: 10,
              background: T.badge, color: "#fff", fontSize: 11, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px",
            }}>
              {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function InlineZaloVideo({ attachment }: { attachment: ZaloAttachment }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const primedRef = useRef(false);
  const coverUrl = getZaloImageUrl(attachment.thumb);
  const [showCover, setShowCover] = useState(Boolean(coverUrl));
  const [aspectRatio, setAspectRatio] = useState(
    attachment.width && attachment.height
      ? `${attachment.width} / ${attachment.height}`
      : "16 / 9",
  );

  useEffect(() => {
    primedRef.current = false;
    setShowCover(Boolean(coverUrl));
    setAspectRatio(
      attachment.width && attachment.height
        ? `${attachment.width} / ${attachment.height}`
        : "16 / 9",
    );
  }, [attachment.url, attachment.width, attachment.height, coverUrl]);

  const primeFirstFrame = useCallback((video: HTMLVideoElement) => {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setAspectRatio(`${video.videoWidth} / ${video.videoHeight}`);
    }
    // Không phát tự động. Seek rất nhẹ để Chrome vẽ sẵn khung hình đầu thay
    // vì giữ canvas đen cho tới lần nhấp đầu tiên.
    if (!primedRef.current && video.duration > 0 && video.currentTime === 0) {
      primedRef.current = true;
      try {
        video.currentTime = Math.min(0.05, video.duration / 1000);
      } catch { /* Trình duyệt sẽ tự vẽ frame khi đủ dữ liệu */ }
    }
  }, []);

  const playVideo = useCallback(() => {
    setShowCover(false);
    const playback = videoRef.current?.play();
    playback?.catch(() => undefined);
  }, []);

  return (
    <div style={{
      position: "relative",
      width: "min(300px, 100%)",
      aspectRatio,
      overflow: "hidden",
      borderRadius: 12,
      background: "#000",
    }}>
      <video
        ref={videoRef}
        src={getZaloVideoUrl(attachment.url)}
        controls
        playsInline
        preload="auto"
        onLoadedMetadata={(event) => primeFirstFrame(event.currentTarget)}
        onLoadedData={(event) => primeFirstFrame(event.currentTarget)}
        onPlay={() => setShowCover(false)}
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000" }}
      />
      {showCover && coverUrl && (
        <button
          type="button"
          aria-label={`Phát ${attachment.fileName || "video"}`}
          onClick={playVideo}
          style={{
            position: "absolute", inset: 0, padding: 0, border: 0,
            cursor: "pointer", background: "#000", overflow: "hidden",
          }}
        >
          <img
            src={coverUrl}
            alt={attachment.fileName ? `Ảnh bìa ${attachment.fileName}` : "Ảnh bìa video"}
            onError={() => setShowCover(false)}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <span style={{
            position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
            width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", background: "rgba(15,23,42,0.72)", border: "1px solid rgba(255,255,255,0.65)",
            boxShadow: "0 6px 18px rgba(0,0,0,0.3)", pointerEvents: "none",
          }}>
            <Play size={23} fill="currentColor" style={{ marginLeft: 3 }} />
          </span>
        </button>
      )}
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
function MessageBubble({ message, searchQuery, onOpenLightbox, onReply, convAvatarUrl }: {
  message: ZaloMessage;
  searchQuery: string;
  onOpenLightbox: (images: string[], startIdx: number) => void;
  onReply: (ctx: ReplyContext) => void;
  convAvatarUrl?: string | null;
}) {
  const [hovered, setHovered] = useState(false);
  const isSelf = message.isSelf;
  const timeStr = new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const attachments = message.attachments || [];
  const photoAttachments = attachments.filter(a => a.type === "image" && (a.url || a.thumb));
  const videoAttachments = attachments.filter(a => a.type === "video");
  const fileAttachments = attachments.filter(a => a.type === "others" || a.type === "file");
  const allPhotoUrls = photoAttachments.map(a => a.url || a.thumb || "").filter(Boolean);
  const hasTextContent = !!message.content?.trim();

  // Parse reply quote
  const replyMatch = message.content?.match(/^\[Trả lời (.+?): "(.+?)"\]\n([\s\S]*)/);
  const replyAuthor = replyMatch?.[1];
  const replyContent = replyMatch?.[2];
  const mainContent = replyMatch?.[3] ?? message.content;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: isSelf ? "row-reverse" : "row",
        alignItems: "flex-end", gap: 8, marginBottom: 2,
      }}>
         {/* Avatar (chỉ hiện khi không phải isSelf) */}
      {!isSelf && (
        <div style={{ flexShrink: 0, marginBottom: 4 }}>
          <Avatar name={message.senderName} avatarUrl={convAvatarUrl} size={30} />
        </div>
      )}

      {/* Bubble */}
      <div style={{ maxWidth: "68%", display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start" }}>
        {/* Sender name (chỉ hiện khi không phải isSelf) */}
        {!isSelf && (
          <span style={{ fontSize: 11, color: T.textMuted, marginBottom: 3, paddingLeft: 4, fontWeight: 500 }}>
            {message.senderName}
          </span>
        )}

        {/* Reply quote */}
        {replyAuthor && (
          <div style={{
            padding: "6px 10px", borderRadius: 8, marginBottom: 4,
            background: isSelf ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
            borderLeft: `3px solid ${isSelf ? "rgba(255,255,255,0.5)" : T.accent}`,
            maxWidth: "100%",
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: isSelf ? "rgba(255,255,255,0.8)" : T.accent, marginBottom: 2 }}>{replyAuthor}</div>
            <div style={{ fontSize: 12, color: isSelf ? "rgba(255,255,255,0.6)" : T.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{replyContent}</div>
          </div>
        )}

        {/* Photos */}
        {photoAttachments.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: photoAttachments.length === 1 ? "1fr" : "repeat(2, 1fr)",
            gap: 3, marginBottom: hasTextContent ? 4 : 0,
            borderRadius: 12, overflow: "hidden",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}>
            {photoAttachments.map((att, idx) => {
              const rawUrl = att.url || att.thumb || "";
              const proxyUrl = getZaloImageUrl(rawUrl);
              if (!rawUrl) return (
                <div key={idx} style={{ width: 200, height: 140, background: T.bubbleOther, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted, fontSize: 12 }}>
                  🖼️ Ảnh đã gửi
                </div>
              );
              return (
                <div key={idx} style={{ position: "relative", cursor: "pointer", overflow: "hidden" }}
                  onClick={() => onOpenLightbox(allPhotoUrls, idx)}>
                  <img src={proxyUrl} alt="Ảnh"
                    style={{ width: "100%", height: photoAttachments.length === 1 ? "auto" : 130, maxWidth: photoAttachments.length === 1 ? 280 : "none", objectFit: "cover", display: "block", background: T.bubbleOther }}
                    onError={(e) => { const img = e.target as HTMLImageElement; if (img.src !== rawUrl) img.src = rawUrl; }}
                  />
                  <div style={{
                    position: "absolute", inset: 0, background: "rgba(0,0,0,0)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.3)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0)")}>
                    <ZoomIn size={22} color="#fff" style={{ opacity: 0, transition: "opacity 0.15s" }}
                      onMouseEnter={e => { (e.currentTarget as SVGElement).style.opacity = "1"; }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Videos */}
        {videoAttachments.map((att, idx) => (
          <div key={idx} style={{ marginBottom: hasTextContent ? 4 : 0, borderRadius: 12, overflow: "hidden" }}>
            {att.url
              ? <InlineZaloVideo attachment={att} />
              : <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: isSelf ? "rgba(255,255,255,0.15)" : T.bubbleOther, color: isSelf ? "#fff" : T.bubbleOtherText, fontSize: 13 }}>
                  <Video size={18} /><span>{(att as any).fileName || "Video"}</span>
                </div>
            }
          </div>
        ))}

        {/* Files */}
        {fileAttachments.map((att, idx) => (
          att.url
            ? <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: isSelf ? "rgba(255,255,255,0.15)" : T.bubbleOther, color: isSelf ? "#fff" : T.bubbleOtherText, textDecoration: "none", fontSize: 13, marginBottom: hasTextContent ? 4 : 0, border: `1px solid ${isSelf ? "rgba(255,255,255,0.2)" : T.inputBorder}` }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: isSelf ? "rgba(255,255,255,0.15)" : "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileText size={18} color={isSelf ? "#fff" : T.accent} />
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{(att as any).fileName || "File đính kèm"}</div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>Nhấn để tải xuống</div>
                </div>
              </a>
            : <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 12, background: isSelf ? "rgba(255,255,255,0.15)" : T.bubbleOther, color: isSelf ? "#fff" : T.bubbleOtherText, fontSize: 13, marginBottom: hasTextContent ? 4 : 0 }}>
                <FileText size={18} /><span>{(att as any).fileName || "File đính kèm"}</span>
              </div>
        ))}

        {/* Text bubble */}
        {hasTextContent && (
          <div style={{
            padding: "9px 13px",
            borderRadius: isSelf ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            background: isSelf ? T.bubbleSelf : T.bubbleOther,
            color: isSelf ? T.bubbleSelfText : T.bubbleOtherText,
            fontSize: 14, lineHeight: 1.55,
            boxShadow: isSelf ? "0 2px 12px rgba(37,99,235,0.3)" : "0 1px 4px rgba(0,0,0,0.2)",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {searchQuery ? <HighlightText text={mainContent} query={searchQuery} /> : mainContent}
          </div>
        )}

        {/* Timestamp + status */}
        <div style={{
          fontSize: 10, color: T.textMuted, marginTop: 3,
          display: "flex", alignItems: "center", gap: 4,
          justifyContent: isSelf ? "flex-end" : "flex-start",
          paddingLeft: isSelf ? 0 : 4, paddingRight: isSelf ? 4 : 0,
        }}>
          {timeStr}
          {isSelf && <CheckCheck size={12} color="#60A5FA" aria-label="Đã gửi" />}
        </div>
      </div>

      {/* Reply button */}
      <div style={{
        opacity: hovered ? 1 : 0, transition: "opacity 0.15s",
        display: "flex", alignItems: "center", alignSelf: "center",
      }}>
        <button onClick={() => onReply({ messageId: message.id, senderName: message.senderName, content: message.content || "", isPhoto: photoAttachments.length > 0 })}
          title="Trả lời"
          style={{
            background: T.sidebarHover, border: `1px solid ${T.inputBorder}`, borderRadius: 8,
            width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", color: T.textSecondary,
          }}>
          <Reply size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── LeadInfoPanel ────────────────────────────────────────────────────────────
function LeadInfoPanel({ lead }: { lead: LeadInfo }) {
  return (
    <div style={{
      width: 260, background: T.sidebarBg, borderLeft: `1px solid ${T.sidebarBorder}`,
      display: "flex", flexDirection: "column", overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Thông tin khách hàng
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Avatar name={lead.name} size={42} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.textPrimary }}>{lead.name}</div>
            <div style={{ fontSize: 12, color: T.textMuted }}>{lead.phone}</div>
          </div>
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px",
          borderRadius: 20, background: `${getStageColor(lead.stage)}20`,
          border: `1px solid ${getStageColor(lead.stage)}40`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: getStageColor(lead.stage) }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: getStageColor(lead.stage) }}>
            {getStageLabel(lead.stage)}
          </span>
        </div>
      </div>

      {/* Info rows */}
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { icon: <Phone size={13} />, label: "SĐT", value: lead.phone },
          { icon: <User size={13} />, label: "Loại", value: lead.type },
          { icon: <User size={13} />, label: "Phụ trách", value: lead.assignedTo || "Chưa phân công" },
        ].map(row => (
          <div key={row.label} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, flexShrink: 0 }}>
              {row.icon}
            </div>
            <div>
              <div style={{ fontSize: 10, color: T.textMuted, marginBottom: 1 }}>{row.label}</div>
              <div style={{ fontSize: 13, color: T.textPrimary, fontWeight: 500 }}>{row.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quotes */}
      {lead.recent_quotes && lead.recent_quotes.length > 0 && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Báo giá gần đây
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {lead.recent_quotes.slice(0, 3).map(q => (
              <div key={q.id} style={{ padding: "8px 10px", background: T.sidebarHover, borderRadius: 8, border: `1px solid ${T.sidebarBorder}` }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: T.textPrimary, marginBottom: 3 }}>{q.name}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: T.accent, fontWeight: 600 }}>
                    {q.total_amount?.toLocaleString("vi-VN")}đ
                  </span>
                  <span style={{ fontSize: 10, color: T.textMuted }}>{q.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ padding: "0 16px 16px", marginTop: "auto" }}>
        <a href={`/crm/leads/${lead.id}`}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "9px 14px", background: T.accent, color: "#fff",
            borderRadius: 10, textDecoration: "none", fontSize: 13, fontWeight: 600,
            boxShadow: "0 2px 8px rgba(59,130,246,0.35)",
          }}>
          <ShoppingBag size={14} /> Xem hồ sơ đầy đủ
        </a>
      </div>
    </div>
  );
}

// ─── ZaloSettingsModal ────────────────────────────────────────────────────────
function ZaloSettingsModal({ onClose, onDisconnect }: { onClose: () => void; onDisconnect: () => void }) {
  const [qrData, setQrData] = useState<{ qr: string; status: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; phone: string | null; displayName: string | null } | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/crm/zalo-inbox/status", { credentials: "include" })
      .then(r => r.json()).then(d => setStatus({
        connected: d.connected,
        phone: d.phone,
        displayName: d.displayName || null,
      }))
      .catch(() => { });
  }, []);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const getQR = async () => {
    setLoading(true);
    setQrData(null);
    setSettingsError(null);
    stopPolling();

    try {
      // Trigger QR login non-blocking
      const response = await fetch("/api/crm/zalo-inbox/qr-image", { method: "POST", credentials: "include" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setSettingsError(data.error || (response.status === 403
          ? "Chỉ quản trị viên được phép tạo phiên đăng nhập Zalo."
          : "Không thể khởi tạo mã QR."));
        setLoading(false);
        return;
      }
    } catch {
      setSettingsError("Không thể kết nối máy chủ Zalo Inbox.");
      setLoading(false);
      return;
    }

    // Poll mỗi 1.5s để lấy QR image
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 60) { stopPolling(); setLoading(false); return; } // timeout 90s
      try {
        const res = await fetch("/api/crm/zalo-inbox/qr-image", { credentials: "include" });
        const d = await res.json();
        if (!res.ok) {
          setSettingsError(d.error || "Không thể đọc trạng thái đăng nhập Zalo.");
          setLoading(false);
          stopPolling();
          return;
        }
        if (d.connected) {
          setStatus({ connected: true, phone: d.phone || null, displayName: d.displayName || null });
          setQrData(null);
          setLoading(false);
          stopPolling();
        } else if (d.qrImage) {
          setQrData({ qr: d.qrImage, status: "pending" });
          setLoading(false);
        }
      } catch {
        setSettingsError("Mất kết nối khi chờ xác nhận QR.");
        setLoading(false);
        stopPolling();
      }
    }, 1500);
  };

  useEffect(() => () => stopPolling(), []);

  const disconnect = async () => {
    setSettingsError(null);
    const response = await fetch("/api/crm/zalo-inbox/disconnect", { method: "POST", credentials: "include" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setSettingsError(data.error || "Không thể đăng xuất tài khoản Zalo.");
      return;
    }
    onDisconnect();
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, padding: 16, background: "rgba(15,23,42,0.68)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ boxSizing: "border-box", background: "#FFFFFF", borderRadius: 16, padding: 24, width: "min(380px, 100%)", maxHeight: "90dvh", overflowY: "auto", border: `1px solid ${T.sidebarBorder}`, boxShadow: "0 25px 60px rgba(15,23,42,0.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: T.textPrimary }}>Cài đặt Zalo</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 4 }}><X size={18} /></button>
        </div>

        {status && (
          <div style={{ padding: "12px 14px", borderRadius: 10, background: status.connected ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${status.connected ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: status.connected ? T.success : T.error }} />
            <span style={{ fontSize: 13, color: status.connected ? T.success : T.error, fontWeight: 500 }}>
              {status.connected
                ? `Đã kết nối: ${status.displayName || status.phone || "Zalo"}`
                : "Chưa đăng nhập"}
            </span>
          </div>
        )}

        <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, color: "#7a5b12", background: "#fff9e8", border: "1px solid #f1d889", fontSize: 11, lineHeight: 1.55 }}>
          Kết nối này dùng tài khoản Zalo cá nhân qua thư viện tích hợp, không phải API OA chính thức. Không mở đồng thời Zalo Web trong lúc kết nối để hạn chế mất phiên đăng nhập.
        </div>

        {settingsError && (
          <div role="alert" style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, color: T.error, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.24)", fontSize: 12, lineHeight: 1.5 }}>
            {settingsError}
          </div>
        )}

        {qrData?.qr && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: 16, padding: "8px 0" }}>
            <div style={{ background: "#fff", padding: 12, borderRadius: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.3)", display: "inline-flex" }}>
              <img src={qrData.qr} alt="QR Code" style={{ width: 200, height: 200, display: "block", borderRadius: 4 }} />
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 10, textAlign: "center" }}>Quét bằng Zalo để đăng nhập</div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={getQR} disabled={loading}
            style={{ padding: "10px 16px", background: T.accent, color: "#fff", border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
            {loading ? "Đang tải..." : "Đăng nhập bằng QR"}
          </button>
          {status?.connected && (
            <button onClick={disconnect}
              style={{ padding: "10px 16px", background: "rgba(239,68,68,0.1)", color: T.error, border: `1px solid rgba(239,68,68,0.3)`, borderRadius: 10, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              Đăng xuất Zalo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────────────
export default function ZaloInboxClient() {
  const [mainView, setMainView] = useState<"messages" | "friends" | "groups" | "auto-reply" | "media-library" | "catalog">("messages");
  const [pendingFriendCount, setPendingFriendCount] = useState(0);
  const [conversations, setConversations] = useState<ZaloConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<ZaloConversation | null>(null);
  const [messages, setMessages] = useState<ZaloMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>({ connected: false, phone: null });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [showLeadLink, setShowLeadLink] = useState(false);
  const [convFilter, setConvFilter] = useState<"all" | "unread" | "crm" | "unlinked">("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [showMediaLibraryPicker, setShowMediaLibraryPicker] = useState(false);
  const [sendingLibrary, setSendingLibrary] = useState(false);
  const [replyContext, setReplyContext] = useState<ReplyContext | null>(null);
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState("");
  const [msgSearchResults, setMsgSearchResults] = useState<number[]>([]);
  const [msgSearchCurrent, setMsgSearchCurrent] = useState(0);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Nhóm A
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("zalo_sound") !== "false";
    return true;
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [contextMenu, setContextMenu] = useState<{ convId: string; x: number; y: number } | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [infoActionLoading, setInfoActionLoading] = useState<"profile" | "groups" | "notification" | null>(null);
  const [infoActionError, setInfoActionError] = useState<string | null>(null);
  const [profileDetails, setProfileDetails] = useState<ZaloProfileDetails | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [relatedGroups, setRelatedGroups] = useState<RelatedGroup[]>([]);
  const [showRelatedGroups, setShowRelatedGroups] = useState(false);
  const [showAllConversationMedia, setShowAllConversationMedia] = useState(false);
  const [showAllConversationFiles, setShowAllConversationFiles] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const forceScrollToLatestRef = useRef(false);
  const sendingRef = useRef(false);
  const openedPushConversationRef = useRef<string | null>(null);

  // ─── Load conversations ──────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/zalo-inbox/conversations", { credentials: "include" });
      if (res.status === 401) { setGatewayStatus({ connected: false, phone: null, message: "Phiên đăng nhập hết hạn" }); return; }
      if (res.status === 403) { setGatewayStatus({ connected: false, phone: null, message: "Bạn chưa được cấp quyền truy cập" }); return; }
      if (!res.ok) return;
      const data = await res.json();
      const nextConversations: ZaloConversation[] = data.conversations || [];
      setConversations(nextConversations);
      setSelectedConv(previous => previous
        ? nextConversations.find(conversation => conversation.id === previous.id) || previous
        : previous);
      setGatewayStatus({ connected: data.connected || false, phone: data.phone || null, status: data.status, message: data.error });
    } catch { }
    finally { setLoading(false); }
  }, []);

  // ─── Load messages ───────────────────────────────────────────────────────
  const loadMessages = useCallback(async (convId: string, forceLatest = false) => {
    try {
      const res = await fetch(`/api/crm/zalo-inbox/conversations/${convId}/messages`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const remoteMessages: ZaloMessage[] = data.messages || [];
      if (forceLatest) forceScrollToLatestRef.current = true;
      setMessages(previous => mergeRemoteWithRecentSent(remoteMessages, previous, convId));
      await fetch(`/api/crm/zalo-inbox/conversations/${convId}/read`, { method: "POST", credentials: "include" });
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
    } catch { }
  }, []);

  // A notification click opens the exact conversation instead of leaving the
  // user at the generic Inbox screen.
  useEffect(() => {
    const requestedId = new URLSearchParams(window.location.search).get("conversation");
    if (!requestedId || openedPushConversationRef.current === requestedId) return;
    const requestedConversation = conversations.find(item => item.id === requestedId);
    if (!requestedConversation) return;
    openedPushConversationRef.current = requestedId;
    setSelectedConv(requestedConversation);
    setMessages([]);
    setReplyContext(null);
    setMainView("messages");
    void loadMessages(requestedId, true);
  }, [conversations, loadMessages]);

  const mergeSentMessage = useCallback((message: ZaloMessage | undefined) => {
    if (!message?.id) return;
    forceScrollToLatestRef.current = true;
    setMessages(previous => {
      const exists = previous.some(item => item.id === message.id);
      const next = exists
        ? previous.map(item => item.id === message.id ? message : item)
        : [...previous, message];
      return next.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });
  }, []);

  // ─── Smart Polling ───────────────────────────────────────────────────────
  const lastConvTimestampRef = useRef<string>("");
  const selectedConvRef = useRef<ZaloConversation | null>(null);
  selectedConvRef.current = selectedConv;

  const playNotifSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch { }
  }, [soundEnabled]);

  const sendBrowserNotif = useCallback(async (title: string, body: string, convId: string) => {
    if (!notifEnabled || !document.hidden) return;
    try {
      // The server PWA push already reaches this device. The local polling
      // notification is only a fallback for a legacy permission-only device.
      if ("serviceWorker" in navigator && "PushManager" in window) {
        const registration = await navigator.serviceWorker.ready;
        if (await registration.pushManager.getSubscription()) return;
      }
      const n = new Notification(title, { body, icon: "/favicon.ico", tag: convId });
      n.onclick = () => {
        window.focus();
        window.location.href = `/crm/zalo-inbox?conversation=${encodeURIComponent(convId)}`;
        n.close();
      };
    } catch { }
  }, [notifEnabled]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch("/api/crm/zalo-inbox/conversations", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const convs: ZaloConversation[] = data.conversations || [];
          setGatewayStatus({ connected: data.connected || false, phone: data.phone || null, status: data.status });
          const latestTs = convs[0]?.lastMessageAt || "";
          const hasNew = latestTs && latestTs !== lastConvTimestampRef.current;
          if (hasNew) {
            lastConvTimestampRef.current = latestTs;
            setConversations(convs);
            const newestConv = convs[0];
            const currentConvId = selectedConvRef.current?.id;
            if (newestConv) {
              playNotifSound();
              if (newestConv.id !== currentConvId || document.hidden) {
                sendBrowserNotif(newestConv.displayName || "Tin nhắn Zalo mới", newestConv.lastMessage || "Bạn có tin nhắn mới", newestConv.id);
              }
            }
          } else {
            setConversations(prev => {
              const changed = convs.some((c, i) => c.unreadCount !== prev[i]?.unreadCount || c.lastMessage !== prev[i]?.lastMessage);
              return changed ? convs : prev;
            });
          }
          // Poll messages nếu đang mở hội thoại
          const currentConv = selectedConvRef.current;
          if (currentConv) {
            const msgRes = await fetch(`/api/crm/zalo-inbox/conversations/${currentConv.id}/messages`, { credentials: "include" });
            if (msgRes.ok) {
              const msgData = await msgRes.json();
              const newMsgs: ZaloMessage[] = msgData.messages || [];
              setMessages(prev => {
                const merged = mergeRemoteWithRecentSent(newMsgs, prev, currentConv.id);
                return messageListSignature(merged) !== messageListSignature(prev) ? merged : prev;
              });
            }
          }
        }
      } catch { }
      const interval = document.hidden ? 10000 : 3000;
      timer = setTimeout(poll, interval);
    };
    loadConversations().then(() => { timer = setTimeout(poll, 3000); });
    return () => clearTimeout(timer);
  }, [loadConversations, loadMessages, playNotifSound, sendBrowserNotif]);

  // ─── Friend request count badge ────────────────────────────────────
  useEffect(() => {
    // Initial load
    fetch("/api/crm/zalo-inbox/friend-requests", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.requests) setPendingFriendCount(d.requests.length); })
      .catch(() => {});

    // SSE listener — nhận tất cả events: message, friend_request, friend_event
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const connectSSE = () => {
      try {
        es = new EventSource("/api/crm/zalo-inbox/sse");

        // ✅ Realtime message: cập nhật tin nhắn ngay khi nhận được
        es.addEventListener("message", (e: MessageEvent) => {
          try {
            const p = JSON.parse(e.data);
            // Reload conversations list
            fetch("/api/crm/zalo-inbox/conversations", { credentials: "include" })
              .then(r => r.ok ? r.json() : null)
              .then(d => {
                if (d?.conversations) setConversations(d.conversations);
                if (d?.connected !== undefined) setGatewayStatus({ connected: d.connected, phone: d.phone || null, status: d.status });
              })
              .catch(() => {});
            // Nếu đang mở đúng hội thoại này, reload messages ngay
            const currentConvId = selectedConvRef.current?.id;
            const msgConvId = p.conversationId || p.threadId || p.fromId;
            if (currentConvId && msgConvId && (currentConvId === msgConvId || msgConvId === currentConvId)) {
              fetch(`/api/crm/zalo-inbox/conversations/${currentConvId}/messages`, { credentials: "include" })
                .then(r => r.ok ? r.json() : null)
                .then(d => {
                  if (d?.messages) {
                    setMessages(prev => {
                      const newMsgs: ZaloMessage[] = d.messages;
                      const merged = mergeRemoteWithRecentSent(newMsgs, prev, currentConvId);
                      return messageListSignature(merged) !== messageListSignature(prev) ? merged : prev;
                    });
                  }
                })
                .catch(() => {});
            }
          } catch { }
        });

        // ✅ Friend request badge
        es.addEventListener("friend_request", () => {
          setPendingFriendCount(prev => prev + 1);
        });
        es.addEventListener("friend_event", (e: MessageEvent) => {
          try {
            const p = JSON.parse(e.data);
            if (p.type === "accepted" || p.type === "added") {
              fetch("/api/crm/zalo-inbox/friend-requests", { credentials: "include" })
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (d?.requests) setPendingFriendCount(d.requests.length); })
                .catch(() => {});
            }
          } catch { }
        });

        es.onerror = () => {
          es?.close(); es = null;
          retryTimer = setTimeout(connectSSE, 5000);
        };
      } catch { }
    };
    connectSSE();
    return () => { es?.close(); if (retryTimer) clearTimeout(retryTimer); };
  }, []);

  // ─── Auto scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); return; }
    const distFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (forceScrollToLatestRef.current || distFromBottom < 200) {
      const force = forceScrollToLatestRef.current;
      forceScrollToLatestRef.current = false;
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: force ? "auto" : "smooth", block: "end" });
      });
    }
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const dist = container.scrollHeight - container.scrollTop - container.clientHeight;
      setShowScrollDown(dist > 300);
    };
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, [selectedConv]);

  // ─── Message search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!msgSearchQuery.trim()) { setMsgSearchResults([]); return; }
    const q = msgSearchQuery.toLowerCase();
    const results = messages.reduce<number[]>((acc, msg, idx) => {
      if (msg.content?.toLowerCase().includes(q)) acc.push(idx);
      return acc;
    }, []);
    setMsgSearchResults(results);
    setMsgSearchCurrent(0);
  }, [msgSearchQuery, messages]);

  useEffect(() => {
    if (msgSearchResults.length === 0) return;
    const idx = msgSearchResults[msgSearchCurrent];
    const msgId = messages[idx]?.id;
    if (msgId && msgRefs.current[msgId]) {
      msgRefs.current[msgId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [msgSearchCurrent, msgSearchResults, messages]);

  // ─── Close overlays ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!showEmoji) return;
    const h = (e: MouseEvent) => { if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) setShowEmoji(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showEmoji]);

  useEffect(() => {
    if (!contextMenu) return;
    const h = () => setContextMenu(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [contextMenu]);

  useEffect(() => {
    void getPushPermissionState()
      .then(state => setNotifEnabled(state === "subscribed"))
      .catch(() => setNotifEnabled(false));
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSelectConv = (conv: ZaloConversation) => {
    setSelectedConv(conv);
    setShowInfoPanel(typeof window !== "undefined" && window.innerWidth > 860);
    setMessages([]);
    setReplyContext(null);
    setMsgSearchQuery("");
    setShowMsgSearch(false);
    setInfoActionError(null);
    setProfileDetails(null);
    setRelatedGroups([]);
    loadMessages(conv.id, true);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !selectedConv || sendingRef.current) return;
    const text = inputText.trim();
    const reply = replyContext;
    const conversationId = selectedConv.id;
    sendingRef.current = true;
    setInputText("");
    setReplyContext(null);
    setSending(true);
    // Clear textarea DOM trực tiếp để tránh React batch update không kịp
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "40px";
    }
    try {
      const fullText = reply
        ? `[Trả lời ${reply.senderName}: "${reply.isPhoto ? "🖼️ Hình ảnh" : reply.content.slice(0, 60)}${reply.content.length > 60 ? "..." : ""}"]\n${text}`
        : text;
      const res = await fetch("/api/crm/zalo-inbox/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId, content: fullText }),
      });
      const data = await res.json().catch(() => ({ error: "Phản hồi gửi tin nhắn không hợp lệ" }));
      if (!res.ok) {
        alert(data.error || "Lỗi gửi tin nhắn");
        // Chỉ phục hồi nội dung khi máy chủ xác nhận Zalo chưa nhận lệnh gửi.
        // Không ghi đè nếu nhân viên đã bắt đầu soạn tin tiếp theo.
        if (data.sent !== true) setInputText(current => current.trim() ? current : text);
        if (reply) setReplyContext(reply);
      } else {
        // Hiển thị ngay bản ghi đã được gateway lưu, không chờ vòng polling DB.
        mergeSentMessage(data.message);
        setConversations(previous => previous.map(conversation => conversation.id === conversationId
          ? { ...conversation, lastMessage: fullText, lastMessageAt: data.message?.createdAt || new Date().toISOString() }
          : conversation));
        setTimeout(() => loadMessages(conversationId, true), 800);
      }
    } catch {
      // Kết nối có thể rớt sau khi Zalo đã nhận tin. Giữ ô soạn thảo trống để
      // tránh gửi trùng; vòng đồng bộ sẽ xác nhận tin trong hội thoại.
      alert("Chưa xác minh được phản hồi gửi. Vui lòng kiểm tra hội thoại trước khi gửi lại.");
    }
    finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;
    e.target.value = "";
    const conversationId = selectedConv.id;
    const previewUrl = URL.createObjectURL(file);
    setUploadError(null); setUploadingFile(true);
    try {
      const res = await sendAttachmentBinary(conversationId, file);
      const data = await res.json().catch(() => ({ error: "Phản hồi gửi tài liệu không hợp lệ" }));
      if (!res.ok) {
        URL.revokeObjectURL(previewUrl);
        setUploadError(data.error || "Lỗi gửi file");
      }
      else {
        mergeSentMessage(withLocalAttachmentPreview(data.message, file, previewUrl));
        setTimeout(() => loadMessages(conversationId, true), 800);
        releaseLocalPreviewLater(previewUrl, () => loadMessages(conversationId));
      }
    } catch {
      URL.revokeObjectURL(previewUrl);
      setUploadError("Lỗi kết nối");
    }
    finally { setUploadingFile(false); }
  };

  const handleMultiMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";
    setPendingFiles(prev => [...prev, ...files.map(f => ({ file: f, previewUrl: URL.createObjectURL(f) }))]);
  };

  const handleSendPendingMedia = async () => {
    if (!selectedConv || !pendingFiles.length || uploadingFile) return;
    setUploadingFile(true); setUploadError(null);
    const toSend = [...pendingFiles];
    try {
      for (let index = 0; index < toSend.length; index += 1) {
        const pf = toSend[index];
        const response = await sendAttachmentBinary(selectedConv.id, pf.file);
        const data = await response.json().catch(() => ({ error: "Phản hồi gửi media không hợp lệ" }));
        if (!response.ok) throw new Error(data.error || `Không gửi được ${pf.file.name}`);
        mergeSentMessage(withLocalAttachmentPreview(data.message, pf.file, pf.previewUrl));
        releaseLocalPreviewLater(pf.previewUrl, () => loadMessages(selectedConv.id));
        // Chỉ giữ các tệp chưa gửi để thao tác thử lại không gửi trùng media.
        setPendingFiles(toSend.slice(index + 1));
      }
      const conversationId = selectedConv.id;
      setTimeout(() => loadMessages(conversationId, true), 800);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Lỗi gửi ảnh/video");
    } finally {
      // Blob preview được giải phóng sau khi URL bền vững đã đồng bộ.
      setUploadingFile(false);
    }
  };

  const handleSendLibraryAssets = async (assetIds: string[]) => {
    if (!selectedConv || !assetIds.length || sendingLibrary) return;
    const conversationId = selectedConv.id;
    setSendingLibrary(true);
    setUploadError(null);
    try {
      const response = await fetch("/api/crm/zalo-inbox/media-library/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, assetIds }),
      });
      const data = await response.json().catch(() => ({ error: "Phản hồi gửi thư viện không hợp lệ" }));
      if (!response.ok) throw new Error(data.error || "Không gửi được tài liệu từ thư viện");

      const sentMessages = Array.isArray(data.messages) ? data.messages as ZaloMessage[] : [];
      const failures = Array.isArray(data.failures) ? data.failures as Array<{ name?: string; error?: string }> : [];
      sentMessages.forEach(message => mergeSentMessage(message));
      if (sentMessages.length) {
        const latest = sentMessages[sentMessages.length - 1];
        setConversations(previous => previous.map(conversation => conversation.id === conversationId
          ? { ...conversation, lastMessage: sentMessages.length > 1 ? `[${sentMessages.length} tài liệu]` : latest.content, lastMessageAt: latest.createdAt }
          : conversation));
        if (!failures.length) setShowMediaLibraryPicker(false);
        forceScrollToLatestRef.current = true;
        window.setTimeout(() => loadMessages(conversationId, true), 800);
      }
      if (failures.length) {
        const failedNames = failures.map(failure => failure.name).filter(Boolean).join(", ");
        const reason = failures.find(failure => failure.error)?.error;
        setUploadError(`Đã gửi ${sentMessages.length}/${assetIds.length} tài liệu. Chưa gửi được: ${failedNames || "một số tài liệu"}.${reason ? ` ${reason}` : ""}`);
      }
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Không gửi được tài liệu từ thư viện");
    } finally {
      setSendingLibrary(false);
    }
  };

  const markUnread = useCallback(async (convId: string) => {
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: Math.max(c.unreadCount || 0, 1) } : c));
    try { await fetch(`/api/crm/zalo-inbox/conversations/${convId}/unread`, { method: "POST", credentials: "include" }); } catch { }
  }, []);

  const toggleNotif = useCallback(async () => {
    try {
      if (notifEnabled) {
        await unsubscribeFromPush();
        setNotifEnabled(false);
        return;
      }
      await subscribeToPush();
      setNotifEnabled(true);
    } catch {
      setNotifEnabled(false);
    }
  }, [notifEnabled]);

  const handleInfoNotification = useCallback(async () => {
    setInfoActionLoading("notification");
    setInfoActionError(null);
    try {
      await toggleNotif();
    } catch (error) {
      setInfoActionError(error instanceof Error ? error.message : "Không cập nhật được thông báo");
    } finally {
      setInfoActionLoading(null);
    }
  }, [toggleNotif]);

  const openConversationProfile = useCallback(async () => {
    if (!selectedConv) return;
    setShowProfileDialog(true);
    if (profileDetails) return;
    setInfoActionLoading("profile");
    setInfoActionError(null);
    try {
      const userId = selectedConv.zaloUserId || selectedConv.id;
      const response = await fetch(`/api/crm/zalo-inbox/friends?action=profile&userId=${encodeURIComponent(userId)}`, { credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) throw new Error(data.error || "Không tải được hồ sơ Zalo");
      setProfileDetails(data.user || {});
    } catch (error) {
      setInfoActionError(error instanceof Error ? error.message : "Không tải được hồ sơ Zalo");
    } finally {
      setInfoActionLoading(null);
    }
  }, [profileDetails, selectedConv]);

  const openRelatedGroups = useCallback(async () => {
    if (!selectedConv) return;
    setShowRelatedGroups(true);
    setInfoActionLoading("groups");
    setInfoActionError(null);
    try {
      const userId = selectedConv.zaloUserId || selectedConv.id;
      const response = await fetch(`/api/crm/zalo-inbox/friends?action=related-groups-details&userId=${encodeURIComponent(userId)}`, { credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) throw new Error(data.error || "Không tải được nhóm chung");
      setRelatedGroups(Array.isArray(data.groups) ? data.groups : []);
    } catch (error) {
      setInfoActionError(error instanceof Error ? error.message : "Không tải được nhóm chung");
    } finally {
      setInfoActionLoading(null);
    }
  }, [selectedConv]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => { const next = !prev; localStorage.setItem("zalo_sound", next ? "true" : "false"); return next; });
  }, []);

  const conversationMedia = useMemo(() => messages.flatMap(message =>
    (message.attachments || [])
      .filter(attachment => (attachment.type === "image" || attachment.type === "video") && (attachment.url || attachment.thumb))
      .map(attachment => ({ ...attachment, msgId: message.id, createdAt: message.createdAt })),
  ), [messages]);
  const conversationFiles = useMemo(() => messages.flatMap(message =>
    (message.attachments || [])
      .filter(attachment => (attachment.type === "others" || attachment.type === "file") && attachment.fileName)
      .map(attachment => ({ ...attachment, msgId: message.id, createdAt: message.createdAt })),
  ), [messages]);
  const conversationImageUrls = useMemo(() => conversationMedia
    .filter(item => item.type === "image")
    .map(item => item.url || item.thumb || "")
    .filter(Boolean), [conversationMedia]);

  const filteredConvs = conversations.filter(c => {
    const matchSearch = c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone || "").includes(searchQuery) ||
      c.lead?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter = convFilter === "all"
      || (convFilter === "unread" && c.unreadCount > 0)
      || (convFilter === "crm" && !!c.lead)
      || (convFilter === "unlinked" && !c.lead);
    return matchSearch && matchFilter;
  });

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const workspaceTabs = [
    { id: "messages" as const, label: "Hội thoại", icon: MessageCircle, badge: totalUnread },
    { id: "friends" as const, label: "Danh bạ", icon: UserPlus, badge: pendingFriendCount },
    { id: "groups" as const, label: "Nhóm", icon: Users },
    { id: "auto-reply" as const, label: "Tự động", icon: Bot },
    { id: "media-library" as const, label: "Thư viện", icon: FolderOpen },
    { id: "catalog" as const, label: "Catalogue", icon: CatalogIcon },
  ];

  const workspaceHeader = (
    <div className={styles.workspaceHeader}>
      <div className={styles.hero}>
        <div className={styles.heroIcon}><MessageCircle size={27} /></div>
        <div>
          <div className={styles.eyebrow}>Zalo Personal Workspace</div>
          <h1 className={styles.heroTitle}>Trung tâm hội thoại Zalo</h1>
          <p className={styles.heroDescription}>Hội thoại, hồ sơ CRM, danh bạ, nhóm và tự động hóa được quản lý trên cùng một không gian làm việc.</p>
        </div>
        <div className={styles.heroActions}>
          <div className={styles.statusPill} data-connected={String(gatewayStatus.connected)}>
            {gatewayStatus.connected ? <Wifi size={15} /> : <WifiOff size={15} />}
            <span>{gatewayStatus.connected ? "Đã kết nối" : "Chưa kết nối"}</span>
          </div>
          <button className={styles.secondaryAction} onClick={loadConversations}><RefreshCw size={16} /><span>Làm mới</span></button>
          <button className={styles.primaryAction} onClick={() => setShowSettings(true)}><Settings size={16} /><span>Cài đặt</span></button>
        </div>
      </div>
      <nav className={styles.workspaceNav} aria-label="Chức năng Zalo Inbox">
        {workspaceTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={styles.navButton} data-active={String(mainView === tab.id)} onClick={() => setMainView(tab.id)}>
              <Icon size={16} /><span>{tab.label}</span>
              {!!tab.badge && <span className={styles.navBadge}>{tab.badge > 99 ? "99+" : tab.badge}</span>}
            </button>
          );
        })}
      </nav>
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────────
  const subViewTitles: Record<string, string> = {
    friends: "Quản lý bạn bè",
    groups: "Quản lý nhóm",
    "auto-reply": "Trả lời tự động",
    "media-library": "Thư viện media dùng chung",
    catalog: "Catalog sản phẩm",
  };

  if (mainView !== "messages") {
    return (
      <div className={styles.page}>
        {workspaceHeader}
        <div className={styles.subView} aria-label={subViewTitles[mainView]}>
          {mainView === "friends" && <ZaloFriendsPanel
            onClose={() => setMainView("messages")}
            onOpenChat={async (userId: string, displayName: string) => {
              // Chuyển sang view messages trước
              setMainView("messages");
              // Tìm conversation đã tồn tại trong danh sách
              const existing = conversations.find(c => c.id === userId || c.phone === userId);
              if (existing) {
                handleSelectConv(existing);
              } else {
                // Tạo conversation stub để mở chat ngay lập tức
                const stub: ZaloConversation = {
                  id: userId,
                  zaloUserId: userId,
                  phone: null,
                  displayName,
                  avatarUrl: null,
                  lastMessage: null,
                  lastMessageAt: new Date().toISOString(),
                  unreadCount: 0,
                  leadId: null,
                  lead: null,
                };
                setSelectedConv(stub);
                setMessages([]);
                setReplyContext(null);
                setMsgSearchQuery("");
                setShowMsgSearch(false);
                // Load lịch sử tin nhắn nếu có
                loadMessages(userId, true);
              }
            }}
          />}
          {mainView === "groups" && <ZaloGroupsPanel onClose={() => setMainView("messages")} />}
          {mainView === "auto-reply" && <ZaloAutoReplyPanel onClose={() => setMainView("messages")} />}
          {mainView === "media-library" && <ZaloMediaLibraryPanel mode="manage" />}
          {mainView === "catalog" && <ZaloCatalogPanel onClose={() => setMainView("messages")} />}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {workspaceHeader}
      <div className={styles.inboxFrame} data-has-selection={String(!!selectedConv)}>
      {lightbox && <Lightbox state={lightbox} onClose={() => setLightbox(null)} />}
      {showProfileDialog && selectedConv && (
        <InfoDialog title="Hồ sơ hội thoại" onClose={() => setShowProfileDialog(false)}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 14, border: `1px solid ${T.sidebarBorder}`, borderRadius: 14, background: T.sidebarHover }}>
            <Avatar name={profileDetails?.displayName || selectedConv.displayName} avatarUrl={profileDetails?.avatar || selectedConv.avatarUrl} size={58} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: T.textPrimary, fontSize: 16, fontWeight: 750 }}>{profileDetails?.displayName || selectedConv.displayName}</div>
              <div style={{ marginTop: 3, color: T.textMuted, fontSize: 12 }}>{profileDetails?.zaloName ? `Tên Zalo: ${profileDetails.zaloName}` : "Hồ sơ Zalo cá nhân"}</div>
            </div>
          </div>
          {infoActionLoading === "profile" ? (
            <div style={{ minHeight: 130, display: "grid", placeItems: "center", color: T.textMuted }}><RefreshCw size={20} style={{ animation: "spin .8s linear infinite" }} /></div>
          ) : (
            <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
              {[
                ["Số điện thoại", selectedConv.lead?.phone || selectedConv.phone || profileDetails?.phoneNumber || "Chưa đối soát"],
                ["Zalo UID", profileDetails?.userId || selectedConv.zaloUserId || selectedConv.id],
                ["Giới tính", profileDetails?.gender === 1 ? "Nam" : profileDetails?.gender === 2 ? "Nữ" : "Chưa cung cấp"],
                ["Ngày sinh", profileDetails?.dob || "Chưa cung cấp"],
                ["Liên kết CRM", selectedConv.lead?.name || "Chưa liên kết"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 20, padding: "9px 2px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
                  <span style={{ color: T.textMuted, fontSize: 12 }}>{label}</span><span style={{ maxWidth: "65%", color: T.textPrimary, fontSize: 12, fontWeight: 600, textAlign: "right", overflowWrap: "anywhere" }}>{value}</span>
                </div>
              ))}
            </div>
          )}
          {infoActionError && <div role="alert" style={{ marginTop: 12, padding: 10, borderRadius: 9, color: "#b42318", background: "#fff1f2", fontSize: 12 }}>{infoActionError}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            {selectedConv.lead ? (
              <a href={`/crm/leads/${selectedConv.lead.id}`} target="_blank" rel="noreferrer" style={{ padding: "9px 13px", borderRadius: 10, color: "#fff", background: T.accent, textDecoration: "none", fontSize: 12, fontWeight: 700 }}>Mở hồ sơ CRM</a>
            ) : (
              <button onClick={() => { setShowProfileDialog(false); setShowLeadLink(true); }} style={{ padding: "9px 13px", cursor: "pointer", border: "1px solid #d2a62b", borderRadius: 10, color: "#3d2c08", background: "linear-gradient(135deg,#ffe78c,#d9aa2b)", fontSize: 12, fontWeight: 750 }}>Liên kết hồ sơ CRM</button>
            )}
          </div>
        </InfoDialog>
      )}
      {showRelatedGroups && (
        <InfoDialog title="Nhóm chung trên Zalo" onClose={() => setShowRelatedGroups(false)}>
          {infoActionLoading === "groups" ? (
            <div style={{ minHeight: 180, display: "grid", placeItems: "center", color: T.textMuted }}><RefreshCw size={20} style={{ animation: "spin .8s linear infinite" }} /></div>
          ) : relatedGroups.length === 0 ? (
            <div style={{ padding: "42px 12px", textAlign: "center", color: T.textMuted }}><Users size={32} style={{ marginBottom: 9, opacity: .55 }} /><div style={{ fontSize: 13 }}>Không có nhóm chung hoặc Zalo chưa cung cấp dữ liệu nhóm.</div></div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {relatedGroups.map(group => (
                <button key={group.groupId} onClick={() => { setShowRelatedGroups(false); setMainView("groups"); }} style={{ display: "flex", alignItems: "center", gap: 11, padding: 11, cursor: "pointer", border: `1px solid ${T.sidebarBorder}`, borderRadius: 12, textAlign: "left", background: "#fff" }}>
                  <Avatar name={group.name} avatarUrl={group.avatar} size={42} />
                  <span style={{ minWidth: 0, flex: 1 }}><strong style={{ display: "block", overflow: "hidden", color: T.textPrimary, fontSize: 13, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</strong><small style={{ display: "block", marginTop: 3, color: T.textMuted }}>{group.totalMember ? `${group.totalMember} thành viên` : "Mở quản lý nhóm"}</small></span>
                  <ChevronRight size={16} color={T.textMuted} />
                </button>
              ))}
            </div>
          )}
          {infoActionError && <div role="alert" style={{ marginTop: 12, padding: 10, borderRadius: 9, color: "#b42318", background: "#fff1f2", fontSize: 12 }}>{infoActionError}</div>}
        </InfoDialog>
      )}
      {showAllConversationMedia && (
        <InfoDialog title={`Ảnh/Video (${conversationMedia.length})`} onClose={() => setShowAllConversationMedia(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
            {conversationMedia.map((attachment, index) => attachment.type === "video" ? (
              <video key={`${attachment.msgId}-${index}`} src={getZaloVideoUrl(attachment.url)} poster={getZaloImageUrl(attachment.thumb)} controls playsInline preload="metadata" style={{ width: "100%", aspectRatio: "1", objectFit: "contain", borderRadius: 10, background: "#0f172a" }} />
            ) : (
              <button key={`${attachment.msgId}-${index}`} onClick={() => {
                const imageIndex = conversationImageUrls.indexOf(attachment.url || attachment.thumb || "");
                setLightbox({ images: conversationImageUrls, currentIndex: Math.max(0, imageIndex) });
              }} style={{ padding: 0, aspectRatio: "1", cursor: "pointer", border: `1px solid ${T.sidebarBorder}`, borderRadius: 10, overflow: "hidden", background: T.sidebarHover }}>
                <img src={getZaloImageUrl(attachment.thumb || attachment.url)} alt="Ảnh hội thoại" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
              </button>
            ))}
          </div>
        </InfoDialog>
      )}
      {showAllConversationFiles && (
        <InfoDialog title={`File (${conversationFiles.length})`} onClose={() => setShowAllConversationFiles(false)}>
          <div style={{ display: "grid", gap: 8 }}>
            {conversationFiles.map((attachment, index) => (
              <a key={`${attachment.msgId}-${index}`} href={attachment.url} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 11, padding: 11, border: `1px solid ${T.sidebarBorder}`, borderRadius: 11, color: T.textPrimary, background: "#fff", textDecoration: "none" }}>
                <span style={{ width: 38, height: 38, display: "grid", placeItems: "center", flex: "0 0 auto", borderRadius: 9, color: T.accent, background: T.accent + "18" }}><FileText size={18} /></span>
                <span style={{ minWidth: 0, flex: 1 }}><strong style={{ display: "block", overflow: "hidden", fontSize: 12, textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{attachment.fileName}</strong><small style={{ color: T.textMuted }}>{attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(0)} KB` : "Mở file"}</small></span>
                <Download size={15} color={T.textMuted} />
              </a>
            ))}
          </div>
        </InfoDialog>
      )}
      {showMediaLibraryPicker && (
        <ZaloMediaLibraryPanel
          mode="picker"
          sending={sendingLibrary}
          onClose={() => setShowMediaLibraryPicker(false)}
          onSend={handleSendLibraryAssets}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <div style={{ position: "fixed", top: contextMenu.y, left: contextMenu.x, zIndex: 9999, background: "#FFFFFF", borderRadius: 10, boxShadow: "0 8px 30px rgba(15,23,42,0.14)", border: `1px solid ${T.sidebarBorder}`, minWidth: 180, overflow: "hidden" }}
          onClick={e => e.stopPropagation()}>
          <button onClick={() => { markUnread(contextMenu.convId); setContextMenu(null); }}
            style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontSize: 13, color: T.textPrimary, display: "flex", alignItems: "center", gap: 8 }}
            onMouseEnter={e => (e.currentTarget.style.background = T.sidebarHover)}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}>
            <Bell size={14} color={T.textMuted} /> Đánh dấu chưa đọc
          </button>
        </div>
      )}

      {/* ─── Sidebar ─────────────────────────────────────────────────────── */}
      <div className={styles.conversationSidebar} style={{ width: 320, background: T.sidebarBg, borderRight: `1px solid ${T.sidebarBorder}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Sidebar header - giống Zalo Web */}
        <div style={{ padding: "12px 14px 0", borderBottom: `1px solid ${T.sidebarBorder}` }}>
          {/* Top row: title + icons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className={styles.conversationTitle} style={{ fontWeight: 700, fontSize: 18, color: T.textPrimary }}>Hội thoại</span>
              {totalUnread > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, background: T.badge, color: "#fff", borderRadius: 10, padding: "1px 7px", minWidth: 20, textAlign: "center" }}>{totalUnread}</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              <button onClick={toggleSound} title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
                style={{ width: 32, height: 32, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: soundEnabled ? T.accent : T.textMuted }}>
                {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
              <button onClick={toggleNotif} title={notifEnabled ? "Tắt thông báo" : "Bật thông báo"}
                style={{ width: 32, height: 32, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: notifEnabled ? T.accent : T.textMuted }}>
                {notifEnabled ? <Bell size={15} /> : <BellOff size={15} />}
              </button>
              <button onClick={loadConversations} title="Làm mới"
                style={{ width: 32, height: 32, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted }}>
                <RefreshCw size={15} />
              </button>
              <button onClick={() => setShowSettings(true)} title="Cài đặt Zalo"
                style={{ width: 32, height: 32, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted }}>
                <Settings size={15} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.textMuted, pointerEvents: "none" }} />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm"
              style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 20, border: "none", background: T.sidebarHover, fontSize: 13, outline: "none", color: T.textPrimary, boxSizing: "border-box" }}
            />
          </div>

          {/* Warning */}
          {!loading && gatewayStatus.message && (
            <div style={{ padding: "7px 10px", background: "rgba(245,158,11,0.1)", borderRadius: 8, fontSize: 11, color: T.warning, marginBottom: 8, border: `1px solid rgba(245,158,11,0.2)` }}>
              ⚠️ {gatewayStatus.message}
            </div>
          )}
          {!loading && !gatewayStatus.connected && !gatewayStatus.message?.includes("quyền") && (
            <button onClick={() => setShowSettings(true)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", background: T.accent, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 8, boxShadow: "0 2px 8px rgba(59,130,246,0.3)" }}>
              Đăng nhập Zalo
            </button>
          )}

          {/* Filter tabs: Tất cả / Chưa đọc / Phân loại - giống Zalo Web */}
          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.sidebarBorder}`, marginLeft: -14, marginRight: -14, paddingLeft: 14 }}>
            {(["all", "unread", "crm", "unlinked"] as const).map(tab => (
              <button key={tab} onClick={() => setConvFilter(tab)}
                style={{
                  padding: "8px 14px", background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: convFilter === tab ? 700 : 400,
                  color: convFilter === tab ? T.accent : T.textMuted,
                  borderBottom: convFilter === tab ? `2px solid ${T.accent}` : "2px solid transparent",
                  marginBottom: -1, transition: "all 0.15s",
                }}>
                {tab === "all" ? "Tất cả" : tab === "unread" ? "Chưa đọc" : tab === "crm" ? "Có CRM" : "Chưa gắn"}
                {tab === "unread" && totalUnread > 0 && (
                  <span style={{ marginLeft: 5, fontSize: 10, background: T.badge, color: "#fff", borderRadius: 8, padding: "1px 5px" }}>{totalUnread}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <div className={styles.conversationList} style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${T.sidebarBorder}`, borderTopColor: T.accent, margin: "0 auto 12px", animation: "spin 0.8s linear infinite" }} />
              <div style={{ color: T.textMuted, fontSize: 13 }}>Đang tải...</div>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <MessageCircle size={36} color={T.textMuted} style={{ margin: "0 auto 10px" }} />
              <div style={{ color: T.textMuted, fontSize: 13 }}>
                {conversations.length === 0 ? "Chưa có hội thoại nào" : "Không tìm thấy kết quả"}
              </div>
            </div>
          ) : (
            filteredConvs.map(conv => (
              <div key={conv.id} onContextMenu={e => { e.preventDefault(); setContextMenu({ convId: conv.id, x: e.clientX, y: e.clientY }); }}>
                <ConversationItem conv={conv} isSelected={selectedConv?.id === conv.id} onClick={() => handleSelectConv(conv)} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── Chat area ───────────────────────────────────────────────────── */}
      {selectedConv ? (
        <div className={styles.chatArea} style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: T.chatBg, backgroundImage: T.chatBgPattern }}>
          {/* Chat header */}
          <div style={{
            padding: "12px 20px", background: T.headerBg, borderBottom: `1px solid ${T.headerBorder}`,
            display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
            backdropFilter: "blur(12px)",
          }}>
            <button className={styles.mobileBack} onClick={() => setSelectedConv(null)} aria-label="Quay lại danh sách hội thoại"
              style={{ width: 34, height: 34, alignItems: "center", justifyContent: "center", border: `1px solid ${T.headerBorder}`, borderRadius: 9, background: "#fff", color: T.textSecondary }}>
              <ChevronLeft size={18} />
            </button>
            <Avatar name={selectedConv.displayName} avatarUrl={selectedConv.avatarUrl} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.textPrimary }}>{selectedConv.displayName}</div>
              <div className={!selectedConv.phone ? styles.phoneUnknown : undefined} style={{ fontSize: 12, color: selectedConv.phone ? T.textMuted : undefined }}>{selectedConv.phone || "Chưa đối soát số điện thoại"}</div>
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <button onClick={() => { setShowMsgSearch(s => !s); setMsgSearchQuery(""); }}
                title="Tìm kiếm trong hội thoại"
                style={{ width: 34, height: 34, borderRadius: 8, background: showMsgSearch ? "rgba(59,130,246,0.15)" : "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: showMsgSearch ? T.accent : T.textMuted }}>
                <Search size={17} />
              </button>
              {selectedConv.lead && (
                <a href={`/crm/leads/${selectedConv.lead.id}`}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "rgba(59,130,246,0.1)", borderRadius: 8, textDecoration: "none", color: T.accent, fontSize: 12, fontWeight: 600, border: `1px solid rgba(59,130,246,0.2)` }}>
                  <User size={12} /> Hồ sơ KH
                </a>
              )}
              {!selectedConv.lead && (
                <button onClick={() => setShowLeadLink(true)}
                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", cursor: "pointer", background: "#fff8df", borderRadius: 8, color: "#86630f", fontSize: 12, fontWeight: 700, border: "1px solid #ead076" }}>
                  <UserPlus size={12} /> Gắn CRM
                </button>
              )}
              {/* Toggle info panel - giống Zalo Web */}
              <button onClick={() => setShowInfoPanel(s => !s)}
                title="Thông tin hội thoại"
                style={{ width: 34, height: 34, borderRadius: 8, background: showInfoPanel ? "rgba(59,130,246,0.15)" : "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: showInfoPanel ? T.accent : T.textMuted }}>
                <Info size={17} />
              </button>
            </div>
          </div>

          {/* Search bar */}
          {showMsgSearch && (
            <MsgSearchBar
              query={msgSearchQuery} setQuery={setMsgSearchQuery}
              results={msgSearchResults} current={msgSearchCurrent}
              onPrev={() => setMsgSearchCurrent(i => (i - 1 + msgSearchResults.length) % msgSearchResults.length)}
              onNext={() => setMsgSearchCurrent(i => (i + 1) % msgSearchResults.length)}
              onClose={() => { setShowMsgSearch(false); setMsgSearchQuery(""); }}
            />
          )}

          {/* Messages */}
          <div ref={messagesContainerRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 6 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", marginTop: 60 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                <div style={{ fontWeight: 600, color: T.textSecondary, marginBottom: 6 }}>Chưa có tin nhắn nào</div>
                <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.6 }}>
                  Tin nhắn sẽ xuất hiện ở đây.<br />Nhấn ⚙️ → <strong>Đăng nhập Zalo</strong> để bắt đầu.
                </div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isHighlighted = msgSearchResults.includes(idx) && !!msgSearchQuery;
                const isCurrentResult = msgSearchResults[msgSearchCurrent] === idx && !!msgSearchQuery;
                return (
                  <div key={msg.id} ref={el => { msgRefs.current[msg.id] = el; }}
                    style={{ borderRadius: 12, outline: isCurrentResult ? `2px solid ${T.accent}` : isHighlighted ? `2px solid rgba(59,130,246,0.4)` : "none", outlineOffset: 3 }}>
                    <MessageBubble
                      message={msg} searchQuery={msgSearchQuery}
                      onOpenLightbox={(images, startIdx) => setLightbox({ images, currentIndex: startIdx })}
                      onReply={ctx => setReplyContext(ctx)}
                      convAvatarUrl={selectedConv?.avatarUrl}
                    />
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
            {showScrollDown && (
              <button onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
                style={{ position: "sticky", bottom: 8, alignSelf: "center", background: T.accent, color: "#fff", border: "none", borderRadius: 20, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, boxShadow: "0 4px 16px rgba(59,130,246,0.4)", zIndex: 10 }}>
                <ChevronDown size={14} /> Tin mới nhất
              </button>
            )}
          </div>

          {/* Input area */}
          <div style={{ flexShrink: 0, background: T.headerBg, borderTop: `1px solid ${T.headerBorder}`, backdropFilter: "blur(12px)" }}>
            {replyContext && <ReplyBar reply={replyContext} onCancel={() => setReplyContext(null)} />}
            {pendingFiles.length > 0 && (
              <MediaPreviewBar files={pendingFiles}
                onRemove={idx => { URL.revokeObjectURL(pendingFiles[idx].previewUrl); setPendingFiles(prev => prev.filter((_, i) => i !== idx)); }}
                onSend={handleSendPendingMedia} sending={uploadingFile}
              />
            )}
            {uploadError && (
              <div style={{ padding: "7px 16px", background: "rgba(239,68,68,0.1)", color: T.error, fontSize: 12, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid rgba(239,68,68,0.2)` }}>
                <span>{uploadError}</span>
                <button onClick={() => setUploadError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: T.error }}><X size={13} /></button>
              </div>
            )}
            {uploadingFile && (
              <div style={{ padding: "7px 16px", background: "rgba(59,130,246,0.08)", color: T.accent, fontSize: 12, borderTop: `1px solid rgba(59,130,246,0.15)` }}>
                ⏳ Đang gửi...
              </div>
            )}

            <div style={{ padding: "12px 16px", display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input
                ref={documentInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar"
                style={{ display: "none" }}
                onChange={handleDocumentUpload}
              />
              <input
                ref={mediaInputRef}
                type="file"
                accept="image/*,video/mp4,video/quicktime,video/x-m4v,.mp4,.mov,.m4v"
                multiple
                style={{ display: "none" }}
                onChange={handleMultiMediaSelect}
              />

              {/* Emoji */}
              <div ref={emojiRef} style={{ position: "relative" }}>
                <button onClick={() => setShowEmoji(s => !s)} disabled={!selectedConv} title="Emoji"
                  style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${showEmoji ? T.accent : T.inputBorder}`, background: showEmoji ? "rgba(59,130,246,0.1)" : T.inputBg, color: showEmoji ? T.accent : T.textMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Smile size={16} />
                </button>
                {showEmoji && (
                  <div style={{ position: "absolute", bottom: 44, left: 0, background: "#FFFFFF", borderRadius: 14, boxShadow: "0 8px 30px rgba(15,23,42,0.14)", border: `1px solid ${T.sidebarBorder}`, padding: 10, zIndex: 100, width: 288 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2 }}>
                      {["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","😋","🤫","🤔","😐","😑","😶","🙄","😬","😮","😯","😲","😳","😕","😟","🙁","☹️","😢","😭","😤","😠","😡","🤬","🤯","😈","👍","👎","❤️","💔","👏","🙏","🔥","💯","🎉","🎁","💰","💪","🚀","✅","❌","⚠️","🔔","📞","📱"].map(em => (
                        <button key={em} onClick={() => { setInputText(t => t + em); setShowEmoji(false); textareaRef.current?.focus(); }}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 5, borderRadius: 8, lineHeight: 1 }}
                          onMouseEnter={e => (e.currentTarget.style.background = T.sidebarHover)}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}>
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Image / video */}
              <button onClick={() => mediaInputRef.current?.click()} disabled={uploadingFile || !selectedConv} title="Gửi ảnh/video"
                style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.accent, cursor: uploadingFile ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: uploadingFile ? 0.5 : 1 }}>
                <ImageIcon size={16} />
              </button>

              {/* Shared media library */}
              <button onClick={() => setShowMediaLibraryPicker(true)} disabled={uploadingFile || sendingLibrary || !selectedConv} title="Chọn từ thư viện media"
                style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: "#A77B12", cursor: uploadingFile || sendingLibrary ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: uploadingFile || sendingLibrary ? 0.5 : 1 }}>
                <FolderOpen size={16} />
              </button>

              {/* Document */}
              <button onClick={() => documentInputRef.current?.click()} disabled={uploadingFile || !selectedConv} title="Gửi tài liệu"
                style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.textMuted, cursor: uploadingFile ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: uploadingFile ? 0.5 : 1 }}>
                <Paperclip size={16} />
              </button>

              {/* Textarea */}
              <textarea ref={textareaRef} value={inputText}
                onChange={e => {
                  setInputText(e.target.value);
                  e.target.style.height = "40px";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={replyContext ? `Trả lời ${replyContext.senderName}...` : "Nhập tin nhắn... (Enter để gửi)"}
                rows={1}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 12,
                  border: `1px solid ${T.inputBorder}`, background: T.inputBg,
                  fontSize: 14, outline: "none", resize: "none",
                  fontFamily: "inherit", maxHeight: 120, overflowY: "auto",
                  color: T.textPrimary, lineHeight: 1.5, height: 40,
                  transition: "border-color 0.15s",
                }}
                onFocus={e => (e.target.style.borderColor = T.accent)}
                onBlur={e => (e.target.style.borderColor = T.inputBorder)}
              />

              {/* Send */}
              <button onClick={handleSend} disabled={!inputText.trim() || sending}
                style={{
                  width: 40, height: 40, borderRadius: 12, border: "none",
                  background: inputText.trim() ? T.accent : T.sidebarHover,
                  color: inputText.trim() ? "#fff" : T.textMuted,
                  cursor: inputText.trim() ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  boxShadow: inputText.trim() ? "0 2px 8px rgba(59,130,246,0.35)" : "none",
                  transition: "all 0.15s",
                }}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16, background: T.chatBg, backgroundImage: T.chatBgPattern }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: "linear-gradient(135deg,rgba(59,130,246,0.15),rgba(139,92,246,0.15))", border: `1px solid rgba(59,130,246,0.2)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageCircle size={32} color={T.accent} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: T.textPrimary, marginBottom: 6 }}>Zalo Inbox</div>
            <div style={{ color: T.textMuted, fontSize: 14 }}>Chọn một hội thoại để bắt đầu nhắn tin</div>
          </div>
        </div>
      )}

      {/* Info panel - giống Zalo Web, hiển thị khi showInfoPanel và đã chọn conv */}
      {selectedConv && showInfoPanel && (
        <div className={styles.infoPanel} style={{
          width: 300, background: T.sidebarBg, borderLeft: `1px solid ${T.sidebarBorder}`,
          display: "flex", flexDirection: "column", overflowY: "auto", flexShrink: 0,
        }}>
          {/* Header */}
          <div style={{ padding: "16px", borderBottom: `1px solid ${T.sidebarBorder}`, textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.textPrimary, marginBottom: 16 }}>Thông tin hội thoại</div>
            <Avatar name={selectedConv.displayName} avatarUrl={selectedConv.avatarUrl} size={64} />
            <div style={{ fontWeight: 700, fontSize: 16, color: T.textPrimary, marginTop: 10 }}>{selectedConv.displayName}</div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 3 }}>{selectedConv.phone || "Chưa đối soát SĐT"}</div>
            {/* Action icons */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 14 }}>
              {[
                { icon: notifEnabled ? <BellOff size={16} /> : <Bell size={16} />, label: notifEnabled ? "Tắt TB" : "Bật TB", loading: infoActionLoading === "notification", action: handleInfoNotification },
                { icon: <Users size={16} />, label: "Nhóm chung", loading: infoActionLoading === "groups", action: openRelatedGroups },
                { icon: <ShoppingBag size={16} />, label: "Hồ sơ", loading: infoActionLoading === "profile", action: openConversationProfile },
              ].map(item => (
                <button key={item.label} type="button" onClick={item.action} disabled={item.loading} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 58, padding: 0, cursor: item.loading ? "wait" : "pointer", border: 0, background: "transparent" }}>
                  <span style={{ width: 40, height: 40, borderRadius: "50%", background: T.sidebarHover, display: "flex", alignItems: "center", justifyContent: "center", color: T.textSecondary }}>
                    {item.loading ? <RefreshCw size={16} style={{ animation: "spin .8s linear infinite" }} /> : item.icon}
                  </span>
                  <span style={{ fontSize: 11, color: T.textMuted }}>{item.label}</span>
                </button>
              ))}
            </div>
            {infoActionError && <div role="alert" style={{ marginTop: 12, padding: "8px 10px", borderRadius: 9, color: "#b42318", background: "#fff1f2", fontSize: 11, lineHeight: 1.45 }}>{infoActionError}</div>}
          </div>

          {/* Lead info nếu có */}
          {selectedConv.lead && (
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Khách hàng</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { label: "SĐT", value: selectedConv.lead.phone },
                  { label: "Loại", value: selectedConv.lead.type },
                  { label: "Trạng thái", value: selectedConv.lead.stage },
                  { label: "Phụ trách", value: selectedConv.lead.assignedTo || "Chưa phân công" },
                ].map(row => (
                  <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: T.textMuted }}>{row.label}</span>
                    <span style={{ fontSize: 12, color: T.textPrimary, fontWeight: 500, maxWidth: 160, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.value}</span>
                  </div>
                ))}
              </div>
              {selectedConv.lead.recent_quotes && selectedConv.lead.recent_quotes.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Báo giá gần đây</div>
                  {selectedConv.lead.recent_quotes.slice(0, 3).map(q => (
                    <div key={q.id} style={{ padding: "7px 10px", background: T.sidebarHover, borderRadius: 8, border: `1px solid ${T.sidebarBorder}`, marginBottom: 5 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: T.textPrimary }}>{q.name}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                        <span style={{ fontSize: 11, color: T.accent, fontWeight: 600 }}>{q.total_amount?.toLocaleString("vi-VN")}đ</span>
                        <span style={{ fontSize: 10, color: T.textMuted }}>{q.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <a href={`/crm/leads/${selectedConv.lead.id}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10, padding: "8px", background: T.accent, color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
                <ShoppingBag size={13} /> Xem hồ sơ đầy đủ
              </a>
            </div>
          )}
          {!selectedConv.lead && (
            <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.sidebarBorder}` }}>
              <div style={{ padding: 12, border: "1px solid #eadba9", borderRadius: 12, background: "#fffbec" }}>
                <div style={{ color: T.textPrimary, fontSize: 13, fontWeight: 750 }}>Chưa liên kết khách hàng CRM</div>
                <div style={{ marginTop: 4, color: T.textMuted, fontSize: 12, lineHeight: 1.5 }}>Zalo cá nhân không luôn cung cấp số điện thoại. Hãy đối soát và gắn đúng hồ sơ.</div>
                <button onClick={() => setShowLeadLink(true)} style={{ width: "100%", marginTop: 10, padding: "8px 10px", cursor: "pointer", border: "1px solid #d2a62b", borderRadius: 9, color: "#3d2c08", background: "linear-gradient(135deg,#ffe78c,#d9aa2b)", fontSize: 12, fontWeight: 800 }}>Liên kết hồ sơ CRM</button>
              </div>
            </div>
          )}

          {/* Ảnh/Video và file của hội thoại */}
          <>
                <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.sidebarBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary }}>Ảnh/Video</span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>{conversationMedia.length > 0 ? `${conversationMedia.length} mục` : ""}</span>
                  </div>
                  {conversationMedia.length === 0 ? (
                    <div style={{ fontSize: 12, color: T.textMuted, textAlign: "center", padding: "10px 0" }}>Chưa có ảnh nào</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                      {conversationMedia.slice(0, 9).map((a, i) => (
                        <button key={`${a.msgId}-${i}`} type="button" onClick={() => a.type === "image"
                          ? setLightbox({ images: conversationImageUrls, currentIndex: Math.max(0, conversationImageUrls.indexOf(a.url || a.thumb || "")) })
                          : window.open(a.url || a.thumb, "_blank")}
                          aria-label={a.type === "video" ? "Mở video" : "Mở ảnh"}
                          style={{ display: "block", padding: 0, aspectRatio: "1", cursor: "pointer", border: 0, borderRadius: 6, overflow: "hidden", background: T.sidebarHover, position: "relative" }}>
                          <img src={getZaloImageUrl(a.thumb || (a.type === "image" ? a.url : undefined))} alt={a.type === "video" ? "Ảnh bìa video" : "Ảnh hội thoại"}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          {a.type === "video" && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
                              <div style={{ width: 0, height: 0, borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderLeft: "12px solid white", marginLeft: 2 }} />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {conversationMedia.length > 9 && (
                    <button type="button" onClick={() => setShowAllConversationMedia(true)} style={{ width: "100%", padding: "8px 0 0", cursor: "pointer", border: 0, background: "transparent", fontSize: 12, color: T.accent, textAlign: "center" }}>Xem tất cả {conversationMedia.length} ảnh/video</button>
                  )}
                </div>

                <div style={{ padding: "0 16px 12px", borderTop: `1px solid ${T.sidebarBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 10px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary }}>File</span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>{conversationFiles.length > 0 ? `${conversationFiles.length} mục` : ""}</span>
                  </div>
                  {conversationFiles.length === 0 ? (
                    <div style={{ fontSize: 12, color: T.textMuted, textAlign: "center", padding: "6px 0" }}>Chưa có file nào</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {conversationFiles.slice(0, 5).map((a, i) => (
                        <a key={`${a.msgId}-${i}`} href={a.url} target="_blank" rel="noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: T.sidebarHover, borderRadius: 8, textDecoration: "none", border: `1px solid ${T.sidebarBorder}` }}>
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: T.accent + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Paperclip size={14} color={T.accent} />
                          </div>
                          <div style={{ overflow: "hidden", flex: 1 }}>
                            <div style={{ fontSize: 12, color: T.textPrimary, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.fileName}</div>
                            <div style={{ fontSize: 11, color: T.textMuted }}>{a.fileSize ? `${(a.fileSize / 1024).toFixed(0)} KB` : ""}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                  {conversationFiles.length > 5 && (
                    <button type="button" onClick={() => setShowAllConversationFiles(true)} style={{ width: "100%", padding: "9px 0 0", cursor: "pointer", border: 0, background: "transparent", fontSize: 12, color: T.accent, textAlign: "center" }}>Xem tất cả {conversationFiles.length} file</button>
                  )}
                </div>
              </>
        </div>
      )}

      {/* Settings modal */}
      {showSettings && (
        <ZaloSettingsModal onClose={() => setShowSettings(false)} onDisconnect={() => {
          setGatewayStatus({ connected: false, phone: null });
          setConversations([]);
        }} />
      )}
      {showLeadLink && selectedConv && (
        <ZaloLeadLinkModal
          conversationId={selectedConv.id}
          currentLeadId={selectedConv.lead?.id || selectedConv.leadId}
          onClose={() => setShowLeadLink(false)}
          onLinked={() => loadConversations()}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #c8d3e0; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
      </div>
    </div>
  );
}
