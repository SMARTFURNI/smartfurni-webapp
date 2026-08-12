"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle, Search, Send, Wifi, WifiOff, User, Phone, ShoppingBag,
  ChevronRight, Settings, RefreshCw, X, Paperclip, FileText, Video,
  Download, ZoomIn, Reply, ChevronLeft,
  Image as ImageIcon, Bell, BellOff, Volume2, VolumeX, Smile,
  ChevronDown, CheckCheck, MoreVertical, Hash, Info,
  File as FileIcon, Users, UserPlus, Bot, ShoppingBag as CatalogIcon,
} from "lucide-react";
import ZaloFriendsPanel from "./ZaloFriendsPanel";
import ZaloGroupsPanel from "./ZaloGroupsPanel";
import ZaloAutoReplyPanel from "./ZaloAutoReplyPanel";
import ZaloCatalogPanel from "./ZaloCatalogPanel";
import ZaloLeadLinkModal from "./ZaloLeadLinkModal";
import styles from "./ZaloInboxClient.module.css";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function mergeRemoteWithRecentSent(
  remoteMessages: ZaloMessage[],
  previousMessages: ZaloMessage[],
  conversationId: string,
): ZaloMessage[] {
  const remoteIds = new Set(remoteMessages.map(message => message.id));
  const now = Date.now();
  // Zalo/DB đôi lúc đồng bộ chậm vài giây. Giữ tin vừa gửi trên màn hình
  // trong lúc chờ bản ghi phía máy chủ xuất hiện để tránh nhấp nháy/mất tin.
  const recentSentMessages = previousMessages.filter(message => {
    if (!message.isSelf || message.conversationId !== conversationId || remoteIds.has(message.id)) return false;
    const createdAt = new Date(message.createdAt).getTime();
    return Number.isFinite(createdAt) && now - createdAt < 60_000;
  });
  return [...remoteMessages, ...recentSentMessages]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
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

// ─── ImagePreviewBar ──────────────────────────────────────────────────────────
function ImagePreviewBar({ files, onRemove, onSend, sending }: {
  files: PendingFile[]; onRemove: (idx: number) => void; onSend: () => void; sending: boolean;
}) {
  return (
    <div style={{
      padding: "10px 16px", background: T.inputBg, borderTop: `1px solid ${T.inputBorder}`,
      display: "flex", alignItems: "center", gap: 8, overflowX: "auto",
    }}>
      {files.map((f, i) => (
        <div key={i} style={{ position: "relative", flexShrink: 0 }}>
          <img src={f.previewUrl} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: `2px solid ${T.accent}` }} />
          <button onClick={() => onRemove(i)}
            style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: T.error, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <X size={10} />
          </button>
        </div>
      ))}
      <button onClick={onSend} disabled={sending}
        style={{ flexShrink: 0, padding: "8px 16px", background: T.accent, color: "#fff", border: "none", borderRadius: 8, cursor: sending ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600, opacity: sending ? 0.6 : 1 }}>
        {sending ? "Đang gửi..." : `Gửi ${files.length} ảnh`}
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
              ? <video src={att.url} controls style={{ maxWidth: 300, width: "100%", display: "block", background: "#000" }} />
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
  const [mainView, setMainView] = useState<"messages" | "friends" | "groups" | "auto-reply" | "catalog">("messages");
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  const loadMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/crm/zalo-inbox/conversations/${convId}/messages`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const remoteMessages: ZaloMessage[] = data.messages || [];
      setMessages(previous => mergeRemoteWithRecentSent(remoteMessages, previous, convId));
      await fetch(`/api/crm/zalo-inbox/conversations/${convId}/read`, { method: "POST", credentials: "include" });
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: 0 } : c));
    } catch { }
  }, []);

  const mergeSentMessage = useCallback((message: ZaloMessage | undefined) => {
    if (!message?.id) return;
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

  const sendBrowserNotif = useCallback((title: string, body: string, convId: string) => {
    if (!notifEnabled || !document.hidden) return;
    try {
      const n = new Notification(title, { body, icon: "/favicon.ico", tag: convId });
      n.onclick = () => { window.focus(); n.close(); };
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
                if (newMsgs.length !== prev.length || newMsgs[newMsgs.length - 1]?.id !== prev[prev.length - 1]?.id) {
                  return mergeRemoteWithRecentSent(newMsgs, prev, currentConv.id);
                }
                return prev;
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
                      if (newMsgs.length !== prev.length || newMsgs[newMsgs.length - 1]?.id !== prev[prev.length - 1]?.id) {
                        return mergeRemoteWithRecentSent(newMsgs, prev, currentConvId);
                      }
                      return prev;
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
    if (distFromBottom < 200) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    if (typeof Notification !== "undefined" && Notification.permission === "granted") setNotifEnabled(true);
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSelectConv = (conv: ZaloConversation) => {
    setSelectedConv(conv);
    setShowInfoPanel(typeof window !== "undefined" && window.innerWidth > 860);
    setMessages([]);
    setReplyContext(null);
    setMsgSearchQuery("");
    setShowMsgSearch(false);
    loadMessages(conv.id);
  };

  const handleSend = async () => {
    if (!inputText.trim() || !selectedConv || sending) return;
    const text = inputText.trim();
    const reply = replyContext;
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
        body: JSON.stringify({ conversationId: selectedConv.id, content: fullText }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Lỗi gửi tin nhắn");
        setInputText(text);
      } else {
        // Hiển thị ngay bản ghi đã được gateway lưu, không chờ vòng polling DB.
        mergeSentMessage(data.message);
        setConversations(previous => previous.map(conversation => conversation.id === selectedConv.id
          ? { ...conversation, lastMessage: fullText, lastMessageAt: data.message?.createdAt || new Date().toISOString() }
          : conversation));
        setTimeout(() => loadMessages(selectedConv.id), 800);
      }
    } catch { setInputText(text); }
    finally { setSending(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;
    e.target.value = "";
    setUploadError(null); setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file); formData.append("conversationId", selectedConv.id);
      const res = await fetch("/api/crm/zalo-inbox/send-attachment", { method: "POST", credentials: "include", body: formData });
      const data = await res.json();
      if (!res.ok) setUploadError(data.error || "Lỗi gửi file");
      else {
        mergeSentMessage(data.message);
        setTimeout(() => loadMessages(selectedConv.id), 800);
      }
    } catch { setUploadError("Lỗi kết nối"); }
    finally { setUploadingFile(false); }
  };

  const handleMultiImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";
    setPendingFiles(prev => [...prev, ...files.map(f => ({ file: f, previewUrl: URL.createObjectURL(f) }))]);
  };

  const handleSendPendingImages = async () => {
    if (!selectedConv || !pendingFiles.length || uploadingFile) return;
    setUploadingFile(true); setUploadError(null);
    const toSend = [...pendingFiles];
    let sentAll = false;
    try {
      for (const pf of toSend) {
        const fd = new FormData();
        fd.append("file", pf.file); fd.append("conversationId", selectedConv.id);
        const response = await fetch("/api/crm/zalo-inbox/send-attachment", { method: "POST", credentials: "include", body: fd });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Không gửi được ${pf.file.name}`);
        mergeSentMessage(data.message);
      }
      setPendingFiles([]);
      sentAll = true;
      setTimeout(() => loadMessages(selectedConv.id), 800);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Lỗi gửi ảnh");
    } finally {
      if (sentAll) {
        toSend.forEach(file => URL.revokeObjectURL(file.previewUrl));
      }
      setUploadingFile(false);
    }
  };

  const markUnread = useCallback(async (convId: string) => {
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, unreadCount: Math.max(c.unreadCount || 0, 1) } : c));
    try { await fetch(`/api/crm/zalo-inbox/conversations/${convId}/unread`, { method: "POST", credentials: "include" }); } catch { }
  }, []);

  const toggleNotif = useCallback(async () => {
    if (notifEnabled) { setNotifEnabled(false); return; }
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifEnabled(perm === "granted");
  }, [notifEnabled]);

  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => { const next = !prev; localStorage.setItem("zalo_sound", next ? "true" : "false"); return next; });
  }, []);

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
                loadMessages(userId);
              }
            }}
          />}
          {mainView === "groups" && <ZaloGroupsPanel onClose={() => setMainView("messages")} />}
          {mainView === "auto-reply" && <ZaloAutoReplyPanel onClose={() => setMainView("messages")} />}
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
              <ImagePreviewBar files={pendingFiles}
                onRemove={idx => { URL.revokeObjectURL(pendingFiles[idx].previewUrl); setPendingFiles(prev => prev.filter((_, i) => i !== idx)); }}
                onSend={handleSendPendingImages} sending={uploadingFile}
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
              <input ref={fileInputRef} type="file" accept="video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar" style={{ display: "none" }} onChange={handleFileUpload} />
              <input ref={multiFileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleMultiImageSelect} />

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

              {/* Image */}
              <button onClick={() => multiFileInputRef.current?.click()} disabled={uploadingFile || !selectedConv} title="Gửi ảnh"
                style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${T.inputBorder}`, background: T.inputBg, color: T.accent, cursor: uploadingFile ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: uploadingFile ? 0.5 : 1 }}>
                <ImageIcon size={16} />
              </button>

              {/* File */}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile || !selectedConv} title="Gửi file, video"
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
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
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
                { icon: <Bell size={16} />, label: "Tắt TB" },
                { icon: <Users size={16} />, label: "Nhóm chung" },
                { icon: <ShoppingBag size={16} />, label: "Hồ sơ" },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }}
                  onClick={item.label === "Hồ sơ" && selectedConv.lead ? () => window.open(`/crm/leads/${selectedConv.lead!.id}`, "_blank") : undefined}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.sidebarHover, display: "flex", alignItems: "center", justifyContent: "center", color: T.textSecondary }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: 11, color: T.textMuted }}>{item.label}</span>
                </div>
              ))}
            </div>
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

          {/* Ảnh/Video section - lọc từ messages */}
          {(() => {
            const mediaAttachments = messages.flatMap(m =>
              (m.attachments || []).filter(a => (a.type === "image" || a.type === "video") && (a.url || a.thumb))
                .map(a => ({ ...a, msgId: m.id, createdAt: m.createdAt }))
            );
            const fileAttachments = messages.flatMap(m =>
              (m.attachments || []).filter(a => (a.type === "others" || a.type === "file") && a.fileName)
                .map(a => ({ ...a, msgId: m.id, createdAt: m.createdAt }))
            );
            return (
              <>
                <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.sidebarBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary }}>Ảnh/Video</span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>{mediaAttachments.length > 0 ? `${mediaAttachments.length} mục` : ""}</span>
                  </div>
                  {mediaAttachments.length === 0 ? (
                    <div style={{ fontSize: 12, color: T.textMuted, textAlign: "center", padding: "10px 0" }}>Chưa có ảnh nào</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
                      {mediaAttachments.slice(0, 9).map((a, i) => (
                        <a key={`${a.msgId}-${i}`} href={a.url || a.thumb} target="_blank" rel="noreferrer"
                          style={{ display: "block", aspectRatio: "1", borderRadius: 6, overflow: "hidden", background: T.sidebarHover, position: "relative" }}>
                          <img src={a.thumb || a.url} alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          {a.type === "video" && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.35)" }}>
                              <div style={{ width: 0, height: 0, borderTop: "7px solid transparent", borderBottom: "7px solid transparent", borderLeft: "12px solid white", marginLeft: 2 }} />
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                  {mediaAttachments.length > 9 && (
                    <div style={{ fontSize: 12, color: T.accent, textAlign: "center", marginTop: 8, cursor: "pointer" }}>Xem tất cả {mediaAttachments.length} ảnh/video</div>
                  )}
                </div>

                <div style={{ padding: "0 16px 12px", borderTop: `1px solid ${T.sidebarBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0 10px" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.textSecondary }}>File</span>
                    <span style={{ fontSize: 11, color: T.textMuted }}>{fileAttachments.length > 0 ? `${fileAttachments.length} mục` : ""}</span>
                  </div>
                  {fileAttachments.length === 0 ? (
                    <div style={{ fontSize: 12, color: T.textMuted, textAlign: "center", padding: "6px 0" }}>Chưa có file nào</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {fileAttachments.slice(0, 5).map((a, i) => (
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
                </div>
              </>
            );
          })()}
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
