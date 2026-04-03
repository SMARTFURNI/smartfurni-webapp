"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle, Search, Send, Wifi, WifiOff, User, Phone, ShoppingBag,
  ChevronRight, Settings, RefreshCw, X, Paperclip, FileText, Video,
  Download, ZoomIn, Reply, ChevronLeft,
  Image as ImageIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ZaloAttachment {
  type: string;
  url?: string;
  origin_url?: string;
  image_data?: { width: number; height: number };
  data?: Record<string, unknown>;
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
  phone: string;
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
  return d.toLocaleDateString("vi-VN");
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
    new: "#6B7280", contacted: "#3B82F6", qualified: "#8B5CF6",
    proposal: "#F59E0B", negotiation: "#EF4444", won: "#10B981", lost: "#9CA3AF",
  };
  return map[stage] || "#6B7280";
}
function getZaloImageUrl(url: string | undefined): string {
  if (!url) return '';
  return `/api/crm/zalo-inbox/image-proxy?url=${encodeURIComponent(url)}`;
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({ state, onClose }: { state: LightboxState; onClose: () => void }) {
  const [idx, setIdx] = useState(state.currentIndex);
  const proxyUrl = getZaloImageUrl(state.images[idx]);
  const rawUrl = state.images[idx];

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
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <button onClick={onClose} style={{
        position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.15)",
        border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
      }}><X size={20} /></button>
      <a href={proxyUrl} download onClick={e => e.stopPropagation()} style={{
        position: "absolute", top: 16, right: 64, background: "rgba(255,255,255,0.15)",
        border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", textDecoration: "none",
      }} title="Tải xuống"><Download size={18} /></a>
      {idx > 0 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1); }} style={{
          position: "absolute", left: 16, background: "rgba(255,255,255,0.15)",
          border: "none", borderRadius: "50%", width: 44, height: 44, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
        }}><ChevronLeft size={24} /></button>
      )}
      {idx < state.images.length - 1 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1); }} style={{
          position: "absolute", right: 16, background: "rgba(255,255,255,0.15)",
          border: "none", borderRadius: "50%", width: 44, height: 44, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
        }}><ChevronRight size={24} /></button>
      )}
      <img src={proxyUrl} alt="Ảnh" onClick={e => e.stopPropagation()} style={{
        maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain",
        borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      }} onError={(e) => {
        const img = e.target as HTMLImageElement;
        if (img.src !== rawUrl) img.src = rawUrl;
      }} />
      {state.images.length > 1 && (
        <div style={{
          position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 14px",
          borderRadius: 20, fontSize: 13,
        }}>{idx + 1} / {state.images.length}</div>
      )}
    </div>
  );
}

// ─── Image Preview Bar ────────────────────────────────────────────────────────
function ImagePreviewBar({ files, onRemove, onSend, sending }: {
  files: PendingFile[];
  onRemove: (idx: number) => void;
  onSend: () => void;
  sending: boolean;
}) {
  return (
    <div style={{
      padding: "10px 16px", background: "#F0F9FF", borderTop: "1px solid #BAE6FD",
      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
    }}>
      {files.map((f, idx) => (
        <div key={idx} style={{ position: "relative" }}>
          <img src={f.previewUrl} alt={f.file.name} style={{
            width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "2px solid #0068FF",
          }} />
          <button onClick={() => onRemove(idx)} style={{
            position: "absolute", top: -6, right: -6, width: 18, height: 18,
            borderRadius: "50%", background: "#EF4444", border: "none",
            color: "#fff", fontSize: 10, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}><X size={10} /></button>
        </div>
      ))}
      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#0369A1" }}>{files.length} ảnh</span>
        <button onClick={onSend} disabled={sending} style={{
          padding: "6px 16px", borderRadius: 20, border: "none",
          background: sending ? "#93C5FD" : "#0068FF", color: "#fff",
          fontSize: 13, fontWeight: 600, cursor: sending ? "not-allowed" : "pointer",
        }}>{sending ? "Đang gửi..." : "Gửi tất cả"}</button>
      </div>
    </div>
  );
}

// ─── Reply Bar ────────────────────────────────────────────────────────────────
function ReplyBar({ reply, onCancel }: { reply: ReplyContext; onCancel: () => void }) {
  return (
    <div style={{
      padding: "8px 16px", background: "#F0F9FF", borderTop: "1px solid #BAE6FD",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <div style={{ width: 3, height: 36, background: "#0068FF", borderRadius: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#0068FF", marginBottom: 2 }}>
          Trả lời {reply.senderName}
        </div>
        <div style={{ fontSize: 12, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {reply.isPhoto ? "🖼️ Hình ảnh" : reply.content}
        </div>
      </div>
      <button onClick={onCancel} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 4 }}>
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Message Search Bar ───────────────────────────────────────────────────────
function MessageSearchBar({ query, onChange, resultCount, currentResult, onPrev, onNext, onClose }: {
  query: string;
  onChange: (q: string) => void;
  resultCount: number;
  currentResult: number;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  return (
    <div style={{
      padding: "8px 16px", background: "#fff", borderBottom: "1px solid #E5E7EB",
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <Search size={14} style={{ color: "#9CA3AF", flexShrink: 0 }} />
      <input ref={inputRef} value={query} onChange={e => onChange(e.target.value)}
        placeholder="Tìm kiếm trong hội thoại..."
        style={{ flex: 1, border: "none", outline: "none", fontSize: 13, background: "transparent", color: "#111827" }}
      />
      {query && (
        <span style={{ fontSize: 12, color: "#6B7280", whiteSpace: "nowrap" }}>
          {resultCount > 0 ? `${currentResult + 1}/${resultCount}` : "Không tìm thấy"}
        </span>
      )}
      <button onClick={onPrev} disabled={resultCount === 0} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 2 }}>
        <ChevronLeft size={16} />
      </button>
      <button onClick={onNext} disabled={resultCount === 0} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 2 }}>
        <ChevronRight size={16} />
      </button>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280", padding: 2 }}>
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Highlight Text ───────────────────────────────────────────────────────────
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background: "#FEF08A", borderRadius: 2, padding: "0 1px" }}>{part}</mark>
          : part
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ZaloInboxClient() {
  const [conversations, setConversations] = useState<ZaloConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<ZaloConversation | null>(null);
  const [messages, setMessages] = useState<ZaloMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>({ connected: false, phone: null });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Tính năng mới
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [replyContext, setReplyContext] = useState<ReplyContext | null>(null);
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState("");
  const [msgSearchResults, setMsgSearchResults] = useState<number[]>([]);
  const [msgSearchCurrent, setMsgSearchCurrent] = useState(0);
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // ─── Load conversations ──────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/zalo-inbox/conversations", { credentials: "include" });
      if (res.status === 401) {
        setGatewayStatus({ connected: false, phone: null, message: "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại" });
        return;
      }
      if (res.status === 403) {
        setGatewayStatus({ connected: false, phone: null, message: "Bạn chưa được cấp quyền truy cập Zalo Inbox" });
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
      setGatewayStatus({ connected: data.connected || false, phone: data.phone || null, status: data.status, message: data.error });
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  // ─── Load messages ───────────────────────────────────────────────────────
  const loadMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/crm/zalo-inbox/conversations/${convId}/messages`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
      await fetch(`/api/crm/zalo-inbox/conversations/${convId}/read`, { method: "POST", credentials: "include" });
      setConversations((prev) => prev.map((c) => c.id === convId ? { ...c, unreadCount: 0 } : c));
    } catch { /* ignore */ }
  }, []);

  // ─── Smart Polling (3s khi active, 10s khi tab ẩn) ──────────────────────────────────────
  const lastConvTimestampRef = useRef<string>("");
  const lastMsgTimestampRef = useRef<string>("");
  const selectedConvRef = useRef<ZaloConversation | null>(null);
  selectedConvRef.current = selectedConv;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      // Poll conversations để phát hiện tin mới
      try {
        const res = await fetch("/api/crm/zalo-inbox/conversations", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const convs: ZaloConversation[] = data.conversations || [];
          setGatewayStatus({ connected: data.connected || false, phone: data.phone || null, status: data.status });

          // Kiểm tra có tin nhắn mới không (so sánh lastMessageAt của conversation đầu tiên)
          const latestTs = convs[0]?.lastMessageAt || "";
          const hasNewConvMsg = latestTs && latestTs !== lastConvTimestampRef.current;
          if (hasNewConvMsg) {
            lastConvTimestampRef.current = latestTs;
            setConversations(convs);
          } else {
            // Cập nhật silent (unread count, etc.) không trigger re-render nếu không có thay đổi
            setConversations((prev) => {
              const changed = convs.some((c, i) =>
                c.unreadCount !== prev[i]?.unreadCount ||
                c.lastMessage !== prev[i]?.lastMessage
              );
              return changed ? convs : prev;
            });
          }

          // Nếu đang mở hội thoại, kiểm tra có tin nhắn mới không
          const currentConv = selectedConvRef.current;
          if (currentConv) {
            const convData = convs.find((c) => c.id === currentConv.id);
            const convLatestTs = convData?.lastMessageAt || "";
            if (convLatestTs && convLatestTs !== lastMsgTimestampRef.current) {
              lastMsgTimestampRef.current = convLatestTs;
              loadMessages(currentConv.id);
            }
          }
        }
      } catch { /* ignore network errors */ }

      // Poll nhanh hơn khi tab đang active
      const interval = document.hidden ? 10000 : 3000;
      timer = setTimeout(poll, interval);
    };

    // Bắt đầu poll ngay
    loadConversations().then(() => {
      timer = setTimeout(poll, 3000);
    });

    return () => clearTimeout(timer);
  }, [loadConversations, loadMessages]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ─── Message search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!msgSearchQuery.trim()) { setMsgSearchResults([]); setMsgSearchCurrent(0); return; }
    const q = msgSearchQuery.toLowerCase();
    const results: number[] = [];
    messages.forEach((msg, idx) => { if (msg.content?.toLowerCase().includes(q)) results.push(idx); });
    setMsgSearchResults(results);
    setMsgSearchCurrent(0);
  }, [msgSearchQuery, messages]);

  useEffect(() => {
    if (msgSearchResults.length === 0) return;
    const msgId = messages[msgSearchResults[msgSearchCurrent]]?.id;
    if (msgId && msgRefs.current[msgId]) {
      msgRefs.current[msgId]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [msgSearchCurrent, msgSearchResults, messages]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSelectConv = (conv: ZaloConversation) => {
    setSelectedConv(conv);
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
    try {
      const fullText = reply
        ? `[Trả lời ${reply.senderName}: "${reply.isPhoto ? "🖼️ Hình ảnh" : reply.content.slice(0, 60)}${reply.content.length > 60 ? "..." : ""}"]\n${text}`
        : text;
      const res = await fetch("/api/crm/zalo-inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId: selectedConv.id, content: fullText }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Lỗi gửi tin nhắn");
        setInputText(text);
      } else {
        if (selectedConv) loadMessages(selectedConv.id);
      }
    } catch { setInputText(text); }
    finally { setSending(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;
    e.target.value = "";
    setUploadError(null);
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("conversationId", selectedConv.id);
      const res = await fetch("/api/crm/zalo-inbox/send-attachment", { method: "POST", credentials: "include", body: formData });
      const data = await res.json();
      if (!res.ok) setUploadError(data.error || "Lỗi gửi file");
      else setTimeout(() => loadMessages(selectedConv.id), 1000);
    } catch { setUploadError("Lỗi kết nối khi gửi file"); }
    finally { setUploadingFile(false); }
  };

  const handleMultiImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    e.target.value = "";
    const newPending: PendingFile[] = files.map(file => ({ file, previewUrl: URL.createObjectURL(file) }));
    setPendingFiles(prev => [...prev, ...newPending]);
  };

  const handleSendPendingImages = async () => {
    if (!selectedConv || pendingFiles.length === 0 || uploadingFile) return;
    setUploadingFile(true);
    setUploadError(null);
    const filesToSend = [...pendingFiles];
    setPendingFiles([]);
    filesToSend.forEach(f => URL.revokeObjectURL(f.previewUrl));
    try {
      for (const pf of filesToSend) {
        const formData = new FormData();
        formData.append("file", pf.file);
        formData.append("conversationId", selectedConv.id);
        await fetch("/api/crm/zalo-inbox/send-attachment", { method: "POST", credentials: "include", body: formData });
      }
      setTimeout(() => loadMessages(selectedConv.id), 1000);
    } catch { setUploadError("Lỗi gửi ảnh"); }
    finally { setUploadingFile(false); }
  };

  const filteredConvs = conversations.filter((c) =>
    c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.lead?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", background: "#F0F2F5", fontFamily: "system-ui, sans-serif" }}>
      {lightbox && <Lightbox state={lightbox} onClose={() => setLightbox(null)} />}

      {/* Sidebar */}
      <div style={{ width: 340, background: "#fff", borderRight: "1px solid #E5E7EB", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0068FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageCircle size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Zalo Inbox</div>
                <div style={{ fontSize: 11, color: gatewayStatus.connected ? "#10B981" : "#9CA3AF", display: "flex", alignItems: "center", gap: 4 }}>
                  {loading ? (
                    <span style={{ color: "#9CA3AF" }}>Đang kết nối...</span>
                  ) : gatewayStatus.connected ? (
                    <><Wifi size={10} /> {`Zalo: ${gatewayStatus.phone || "Đã kết nối"}`}</>
                  ) : (
                    <><WifiOff size={10} /> Chưa đăng nhập Zalo</>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={loadConversations} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#6B7280" }} title="Làm mới"><RefreshCw size={16} /></button>
              <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#6B7280" }} title="Cài đặt"><Settings size={16} /></button>
            </div>
          </div>
          {!loading && gatewayStatus.message && (
            <div style={{ padding: "6px 10px", background: "#FEF3C7", borderRadius: 6, fontSize: 11, color: "#92400E", marginBottom: 8, border: "1px solid #FDE68A" }}>
              ⚠️ {gatewayStatus.message}
            </div>
          )}
          {!loading && !gatewayStatus.connected && !gatewayStatus.message?.includes("quyền") && (
            <button onClick={() => setShowSettings(true)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", background: "#0068FF", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 8 }}>
              Đăng nhập Zalo
            </button>
          )}
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm hội thoại, tên, SĐT..."
              style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 20, border: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Đang tải...</div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <MessageCircle size={40} color="#D1D5DB" style={{ margin: "0 auto 12px" }} />
              <div style={{ color: "#9CA3AF", fontSize: 13 }}>{conversations.length === 0 ? "Chưa có hội thoại nào" : "Không tìm thấy kết quả"}</div>
            </div>
          ) : (
            filteredConvs.map((conv) => (
              <ConversationItem key={conv.id} conv={conv} isSelected={selectedConv?.id === conv.id} onClick={() => handleSelectConv(conv)} />
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {selectedConv ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {/* Header */}
          <div style={{ padding: "12px 20px", background: "#fff", borderBottom: "1px solid #E5E7EB", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <Avatar name={selectedConv.displayName} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>{selectedConv.displayName}</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>{selectedConv.phone}</div>
            </div>
            <button onClick={() => { setShowMsgSearch(s => !s); setMsgSearchQuery(""); }} title="Tìm kiếm trong hội thoại"
              style={{ background: showMsgSearch ? "#EFF6FF" : "none", border: showMsgSearch ? "1px solid #BFDBFE" : "none", cursor: "pointer", padding: 7, borderRadius: 8, color: showMsgSearch ? "#0068FF" : "#6B7280" }}>
              <Search size={16} />
            </button>
            {selectedConv.lead && (
              <a href={`/crm/leads?id=${selectedConv.lead.id}`} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#EFF6FF", borderRadius: 20, textDecoration: "none", color: "#3B82F6", fontSize: 12, fontWeight: 500 }}>
                <User size={12} />Xem hồ sơ KH<ChevronRight size={12} />
              </a>
            )}
          </div>

          {/* Message search bar */}
          {showMsgSearch && (
            <MessageSearchBar
              query={msgSearchQuery} onChange={setMsgSearchQuery}
              resultCount={msgSearchResults.length} currentResult={msgSearchCurrent}
              onPrev={() => setMsgSearchCurrent(i => (i - 1 + msgSearchResults.length) % msgSearchResults.length)}
              onNext={() => setMsgSearchCurrent(i => (i + 1) % msgSearchResults.length)}
              onClose={() => { setShowMsgSearch(false); setMsgSearchQuery(""); }}
            />
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, marginTop: 40, padding: "0 20px" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📬</div>
                <div style={{ fontWeight: 600, color: "#6B7280", marginBottom: 4 }}>Chưa có tin nhắn nào</div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>Tin nhắn sẽ xuất hiện ở đây sau khi bạn đăng nhập Zalo.<br />Nhấn biểu tượng ⚙️ → <strong>Đăng nhập Zalo</strong> để quét QR.</div>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isHighlighted = msgSearchResults.includes(idx) && !!msgSearchQuery;
                const isCurrentResult = msgSearchResults[msgSearchCurrent] === idx && !!msgSearchQuery;
                return (
                  <div key={msg.id} ref={el => { msgRefs.current[msg.id] = el; }} style={{
                    borderRadius: 8,
                    outline: isCurrentResult ? "2px solid #0068FF" : isHighlighted ? "2px solid #93C5FD" : "none",
                    outlineOffset: 2,
                  }}>
                    <MessageBubble
                      message={msg}
                      searchQuery={msgSearchQuery}
                      onOpenLightbox={(images, startIdx) => setLightbox({ images, currentIndex: startIdx })}
                      onReply={(ctx) => setReplyContext(ctx)}
                    />
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div style={{ flexShrink: 0, background: "#fff", borderTop: "1px solid #E5E7EB" }}>
            {replyContext && <ReplyBar reply={replyContext} onCancel={() => setReplyContext(null)} />}
            {pendingFiles.length > 0 && (
              <ImagePreviewBar
                files={pendingFiles}
                onRemove={(idx) => { URL.revokeObjectURL(pendingFiles[idx].previewUrl); setPendingFiles(prev => prev.filter((_, i) => i !== idx)); }}
                onSend={handleSendPendingImages}
                sending={uploadingFile}
              />
            )}
            {uploadError && (
              <div style={{ padding: "6px 20px", background: "#FEF2F2", color: "#EF4444", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{uploadError}</span>
                <button onClick={() => setUploadError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444" }}><X size={14} /></button>
              </div>
            )}
            {uploadingFile && (
              <div style={{ padding: "6px 20px", background: "#EFF6FF", color: "#3B82F6", fontSize: 13 }}>⏳ Đang gửi...</div>
            )}
            <div style={{ padding: "12px 20px", display: "flex", gap: 8, alignItems: "flex-end" }}>
              <input ref={fileInputRef} type="file" accept="video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar" style={{ display: "none" }} onChange={handleFileUpload} />
              <input ref={multiFileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleMultiImageSelect} />
              <button onClick={() => multiFileInputRef.current?.click()} disabled={uploadingFile || !selectedConv} title="Gửi ảnh (có thể chọn nhiều)"
                style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #E5E7EB", background: "#F9FAFB", color: "#0068FF", cursor: uploadingFile ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: uploadingFile ? 0.5 : 1 }}>
                <ImageIcon size={16} />
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile || !selectedConv} title="Gửi video, file"
                style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid #E5E7EB", background: "#F9FAFB", color: "#6B7280", cursor: uploadingFile ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: uploadingFile ? 0.5 : 1 }}>
                <Paperclip size={16} />
              </button>
              <textarea value={inputText} onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={replyContext ? `Trả lời ${replyContext.senderName}...` : "Nhập tin nhắn... (Enter để gửi)"}
                rows={1}
                style={{ flex: 1, padding: "10px 14px", borderRadius: 20, border: "1px solid #E5E7EB", fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit", maxHeight: 120, overflowY: "auto" }}
              />
              <button onClick={handleSend} disabled={!inputText.trim() || sending}
                style={{ width: 40, height: 40, borderRadius: "50%", border: "none", background: inputText.trim() ? "#0068FF" : "#D1D5DB", color: "#fff", cursor: inputText.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
          <MessageCircle size={60} color="#D1D5DB" />
          <div style={{ color: "#9CA3AF", fontSize: 15 }}>Chọn một hội thoại để bắt đầu</div>
        </div>
      )}

      {selectedConv?.lead && <LeadInfoPanel lead={selectedConv.lead} />}
      {showSettings && (
        <ZaloSettingsModal onClose={() => setShowSettings(false)} onDisconnect={() => {
          setGatewayStatus({ connected: false, phone: null, status: "disconnected" });
          setConversations([]);
        }} />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const colors = ["#0068FF", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>
      {name.split(" ").slice(-2).map(w => w[0]).join("").toUpperCase()}
    </div>
  );
}

function ConversationItem({ conv, isSelected, onClick }: { conv: ZaloConversation; isSelected: boolean; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", background: isSelected ? "#EFF6FF" : "transparent", borderLeft: isSelected ? "3px solid #0068FF" : "3px solid transparent", transition: "background 0.15s" }}>
      <div style={{ position: "relative" }}>
        <Avatar name={conv.displayName} size={44} />
        {conv.unreadCount > 0 && (
          <div style={{ position: "absolute", top: -2, right: -2, width: 18, height: 18, borderRadius: "50%", background: "#EF4444", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontWeight: conv.unreadCount > 0 ? 700 : 500, fontSize: 14, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
            {conv.displayName}
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF", flexShrink: 0 }}>{formatTime(conv.lastMessageAt)}</div>
        </div>
        <div style={{ fontSize: 12, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {conv.lastMessage || "Bắt đầu hội thoại"}
        </div>
        {conv.lead && <div style={{ fontSize: 11, color: "#3B82F6", marginTop: 2 }}>KH: {conv.lead.name}</div>}
      </div>
    </div>
  );
}

function MessageBubble({ message, searchQuery, onOpenLightbox, onReply }: {
  message: ZaloMessage;
  searchQuery?: string;
  onOpenLightbox: (images: string[], startIdx: number) => void;
  onReply: (ctx: ReplyContext) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isSelf = message.isSelf;
  const attachments = message.attachments || [];
  const isSystemMsg = attachments.some(a => a.type === 'zalo_system_message');
  const photoAttachments = attachments.filter(a => a.type === 'photo' || a.type === 'image');
  const videoAttachments = attachments.filter(a => a.type === 'video');
  const fileAttachments = attachments.filter(a => a.type === 'file');
  const isEmptyHtml = /^\s*(<div>\s*<\/div>|<div\s*\/>|<br\s*\/?>|\s*)\s*$/.test(message.content || '');
  const hasTextContent = message.content && !isEmptyHtml && message.content !== '[Hình ảnh]';
  const allPhotoUrls = photoAttachments.map(a => a.origin_url || a.url || '').filter(Boolean);
  const timeStr = new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  if (isSystemMsg && !hasTextContent && photoAttachments.length === 0 && videoAttachments.length === 0 && fileAttachments.length === 0) return null;

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", justifyContent: isSelf ? "flex-end" : "flex-start", gap: 8, marginBottom: 2, alignItems: "flex-end" }}>
      {!isSelf && <Avatar name={message.senderName} size={28} />}
      <div style={{ maxWidth: "70%", position: "relative" }}>
        {!isSelf && <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 2, paddingLeft: 4 }}>{message.senderName}</div>}

        {/* Photos */}
        {photoAttachments.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: photoAttachments.length === 1 ? "1fr" : "repeat(2, 1fr)", gap: 2, marginBottom: hasTextContent ? 4 : 0 }}>
            {photoAttachments.map((att, idx) => {
              const rawUrl = att.origin_url || att.url || '';
              const proxyUrl = rawUrl ? getZaloImageUrl(att.url || att.origin_url) : '';
              if (!rawUrl) {
                return (
                  <div key={idx} style={{ width: "100%", maxWidth: 240, height: 120, borderRadius: 8, background: isSelf ? "#005CE6" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", color: isSelf ? "rgba(255,255,255,0.7)" : "#9ca3af", fontSize: 12 }}>
                    🖼️ Ảnh đã gửi
                  </div>
                );
              }
              return (
                <div key={idx} style={{ position: "relative", cursor: "pointer" }} onClick={() => onOpenLightbox(allPhotoUrls, idx)}>
                  <img src={proxyUrl} alt="Ảnh" style={{ width: "100%", maxWidth: 240, height: photoAttachments.length === 1 ? "auto" : 120, objectFit: "cover", borderRadius: 8, display: "block", background: "#f3f4f6" }}
                    onError={(e) => { const img = e.target as HTMLImageElement; if (img.src !== rawUrl) img.src = rawUrl; else img.style.display = 'none'; }}
                  />
                  <div style={{ position: "absolute", inset: 0, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0)", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.25)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0)")}>
                    <ZoomIn size={20} color="#fff" style={{ opacity: 0.8 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Videos */}
        {videoAttachments.map((att, idx) => (
          <div key={idx} style={{ marginBottom: hasTextContent ? 4 : 0 }}>
            {att.url
              ? <video src={att.url} controls style={{ maxWidth: 280, width: "100%", borderRadius: 8, display: "block", background: "#000" }} />
              : <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: isSelf ? "#0068FF" : "#F3F4F6", color: isSelf ? "#fff" : "#374151", fontSize: 13 }}><Video size={18} /><span>{(att as any).fileName || "Video"}</span></div>
            }
          </div>
        ))}

        {/* Files */}
        {fileAttachments.map((att, idx) => (
          att.url
            ? <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: isSelf ? "#0068FF" : "#F3F4F6", color: isSelf ? "#fff" : "#374151", textDecoration: "none", fontSize: 13, marginBottom: hasTextContent ? 4 : 0 }}>
                <FileText size={18} /><span style={{ wordBreak: "break-all" }}>{(att as any).fileName || "File đính kèm"}</span>
              </a>
            : <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: isSelf ? "#0068FF" : "#F3F4F6", color: isSelf ? "#fff" : "#374151", fontSize: 13, marginBottom: hasTextContent ? 4 : 0 }}>
                <FileText size={18} /><span style={{ wordBreak: "break-all" }}>{(att as any).fileName || "File đính kèm"}</span>
              </div>
        ))}

        {/* Text */}
        {hasTextContent && (
          <div style={{ padding: "8px 12px", borderRadius: isSelf ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isSelf ? "#0068FF" : "#fff", color: isSelf ? "#fff" : "#111827", fontSize: 14, lineHeight: 1.5, boxShadow: "0 1px 2px rgba(0,0,0,0.08)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {searchQuery ? <HighlightText text={message.content} query={searchQuery} /> : message.content}
          </div>
        )}

        <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2, textAlign: isSelf ? "right" : "left", paddingLeft: 4 }}>{timeStr}</div>
      </div>

      {/* Reply button */}
      {hovered && (
        <button onClick={() => onReply({ messageId: message.id, senderName: message.senderName, content: message.content || "", isPhoto: photoAttachments.length > 0 })} title="Trả lời"
          style={{ background: "#F3F4F6", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B7280", flexShrink: 0, alignSelf: "center" }}>
          <Reply size={14} />
        </button>
      )}
    </div>
  );
}

function LeadInfoPanel({ lead }: { lead: LeadInfo }) {
  return (
    <div style={{ width: 280, background: "#fff", borderLeft: "1px solid #E5E7EB", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ padding: "16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 12 }}>Thông tin khách hàng</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Avatar name={lead.name} size={44} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{lead.name}</div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>{lead.phone}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <InfoRow icon={<User size={13} />} label="Giai đoạn">
            <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: getStageColor(lead.stage) + "20", color: getStageColor(lead.stage) }}>{getStageLabel(lead.stage)}</span>
          </InfoRow>
          <InfoRow icon={<Phone size={13} />} label="Loại KH"><span style={{ fontSize: 12, color: "#374151" }}>{lead.type || "—"}</span></InfoRow>
          {lead.assignedTo && <InfoRow icon={<User size={13} />} label="Phụ trách"><span style={{ fontSize: 12, color: "#374151" }}>{lead.assignedTo}</span></InfoRow>}
        </div>
        <a href={`/crm/leads?id=${lead.id}`} style={{ display: "block", marginTop: 12, padding: "8px", textAlign: "center", background: "#EFF6FF", borderRadius: 8, color: "#3B82F6", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
          Xem hồ sơ đầy đủ →
        </a>
      </div>
      {lead.recent_quotes && lead.recent_quotes.length > 0 && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "#374151", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <ShoppingBag size={13} />Báo giá gần đây
          </div>
          {lead.recent_quotes.map((q) => (
            <div key={q.id} style={{ padding: "8px 10px", background: "#F9FAFB", borderRadius: 8, marginBottom: 6, border: "1px solid #F3F4F6" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{q.name || `Báo giá #${q.id.slice(-6)}`}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "#6B7280" }}>{q.status}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#C9A84C" }}>{q.total_amount ? q.total_amount.toLocaleString("vi-VN") + "đ" : "—"}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ color: "#9CA3AF" }}>{icon}</span>
      <span style={{ fontSize: 12, color: "#6B7280", minWidth: 70 }}>{label}:</span>
      {children}
    </div>
  );
}

function ZaloSettingsModal({ onClose, onDisconnect }: { onClose: () => void; onDisconnect?: () => void }) {
  const [tab, setTab] = useState<"login" | "access">("login");
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<"idle" | "loading" | "scanning" | "success" | "error">("idle");
  const [loginMessage, setLoginMessage] = useState("");
  const [currentCreds, setCurrentCreds] = useState<any>(null);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [accessList, setAccessList] = useState<any[]>([]);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch("/api/crm/zalo-inbox/credentials", { credentials: "include" })
      .then(r => r.json()).then(data => { if (data && data.phone) setCurrentCreds(data); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "access") {
      setLoadingAccess(true);
      Promise.all([
        fetch("/api/crm/staff", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/crm/zalo-inbox/access", { credentials: "include" }).then((r) => r.json()),
      ]).then(([staffData, accessData]) => {
        setStaffList(Array.isArray(staffData) ? staffData : (staffData?.staff || []));
        setAccessList(accessData?.accessList || []);
      }).finally(() => setLoadingAccess(false));
    }
  }, [tab]);

  useEffect(() => { return () => { eventSourceRef.current?.close(); }; }, []);

  const handleStartQR = () => {
    setLoginStatus("loading"); setQrImage(null); setLoginMessage("Đang tạo mã QR...");
    eventSourceRef.current?.close();
    const es = new EventSource("/api/crm/zalo-inbox/qr-login");
    eventSourceRef.current = es;
    es.addEventListener("qr", (e) => {
      const data = JSON.parse(e.data);
      const imgData = data.image?.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
      setQrImage(imgData); setLoginStatus("scanning"); setLoginMessage("Mở Zalo trên điện thoại → Quét mã QR này");
    });
    es.addEventListener("scanned", () => { setLoginMessage("✅ Đã quét! Đang xác nhận đăng nhập..."); });
    es.addEventListener("success", (e) => {
      const data = JSON.parse(e.data);
      setLoginStatus("success"); setQrImage(null);
      setLoginMessage(`✅ Đăng nhập thành công! Zalo: ${data.phone || "Đã kết nối"}`);
      setCurrentCreds({ phone: data.phone, hasCredentials: true }); es.close();
      setTimeout(() => window.location.reload(), 2000);
    });
    es.addEventListener("error", (e) => {
      try { const data = JSON.parse((e as any).data || "{}"); setLoginMessage("❌ " + (data.message || "Lỗi đăng nhập")); }
      catch { setLoginMessage("❌ Lỗi kết nối"); }
      setLoginStatus("error"); setQrImage(null); es.close();
    });
    es.onerror = () => { if (loginStatus !== "success") { setLoginStatus("error"); setLoginMessage("❌ Mất kết nối. Vui lòng thử lại."); } es.close(); };
  };

  const handleDisconnect = async () => {
    if (!confirm("Bạn có chắc muốn đăng xuất Zalo?")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/crm/zalo-inbox/credentials", { method: "DELETE", credentials: "include" });
      setCurrentCreds(null); setLoginStatus("idle"); setLoginMessage(""); setQrImage(null); onDisconnect?.();
    } finally { setDisconnecting(false); }
  };

  const handleGrantAccess = async (staffId: string) => {
    await fetch("/api/crm/zalo-inbox/access", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ staffId }) });
    const res = await fetch("/api/crm/zalo-inbox/access", { credentials: "include" });
    const data = await res.json(); setAccessList(data?.accessList || []);
  };
  const handleRevokeAccess = async (staffId: string) => {
    await fetch(`/api/crm/zalo-inbox/access?staffId=${staffId}`, { method: "DELETE", credentials: "include" });
    setAccessList((prev) => prev.filter((a) => a.staffId !== staffId));
  };
  const hasAccess = (staffId: string) => accessList.some((a) => a.staffId === staffId);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Cài đặt Zalo Inbox</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}><X size={20} /></button>
        </div>
        <div style={{ display: "flex", borderBottom: "1px solid #F3F4F6" }}>
          {(["login", "access"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "10px", border: "none", cursor: "pointer", background: tab === t ? "#EFF6FF" : "transparent", color: tab === t ? "#0068FF" : "#6B7280", fontWeight: tab === t ? 600 : 400, fontSize: 13, borderBottom: tab === t ? "2px solid #0068FF" : "2px solid transparent" }}>
              {t === "login" ? "Đăng nhập Zalo" : "Phân quyền truy cập"}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {tab === "login" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              {currentCreds?.phone && (
                <div style={{ width: "100%", padding: "12px 16px", background: "#F0FDF4", borderRadius: 10, border: "1px solid #BBF7D0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#065F46" }}>✅ Đang kết nối</div>
                    <div style={{ fontSize: 12, color: "#047857" }}>Zalo: {currentCreds.phone}</div>
                  </div>
                  <button onClick={handleDisconnect} disabled={disconnecting} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    {disconnecting ? "Đang đăng xuất..." : "Đăng xuất"}
                  </button>
                </div>
              )}
              {qrImage ? (
                <div style={{ textAlign: "center" }}>
                  <img src={qrImage} alt="QR Code" style={{ width: 220, height: 220, borderRadius: 12, border: "3px solid #0068FF" }} />
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>Mở Zalo → Quét mã QR</div>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 36 }}>📱</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 6 }}>{currentCreds?.phone ? "Đăng nhập lại Zalo" : "Đăng nhập Zalo cá nhân"}</div>
                  <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, marginBottom: 16 }}>Nhấn nút bên dưới để tạo mã QR.<br />Mở Zalo trên điện thoại và quét mã để đăng nhập.</div>
                </div>
              )}
              {loginMessage && (
                <div style={{ width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 13, background: loginStatus === "success" ? "#D1FAE5" : loginStatus === "error" ? "#FEE2E2" : "#EFF6FF", color: loginStatus === "success" ? "#065F46" : loginStatus === "error" ? "#991B1B" : "#1E40AF", border: `1px solid ${loginStatus === "success" ? "#6EE7B7" : loginStatus === "error" ? "#FCA5A5" : "#BFDBFE"}`, textAlign: "center" }}>
                  {loginMessage}
                </div>
              )}
              {loginStatus !== "scanning" && loginStatus !== "success" && (
                <button onClick={handleStartQR} disabled={loginStatus === "loading"} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: loginStatus === "loading" ? "#93C5FD" : "#0068FF", color: "#fff", fontWeight: 700, fontSize: 14, cursor: loginStatus === "loading" ? "not-allowed" : "pointer", width: "100%" }}>
                  {loginStatus === "loading" ? "⏳ Đang tạo mã QR..." : "📱 Tạo mã QR đăng nhập"}
                </button>
              )}
              {loginStatus === "scanning" && (
                <button onClick={() => { eventSourceRef.current?.close(); setLoginStatus("idle"); setQrImage(null); setLoginMessage(""); }} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid #E5E7EB", background: "#F9FAFB", color: "#374151", fontSize: 13, cursor: "pointer" }}>
                  Hủy
                </button>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>Chọn nhân viên được phép truy cập Zalo Shared Inbox. Admin luôn có quyền truy cập.</div>
              {loadingAccess ? (
                <div style={{ textAlign: "center", color: "#9CA3AF", padding: 20 }}>Đang tải...</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {staffList.map((staff) => (
                    <div key={staff.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: 8, border: "1px solid #E5E7EB", background: hasAccess(staff.id) ? "#F0FDF4" : "#fff" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={staff.full_name || staff.fullName} size={32} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{staff.full_name || staff.fullName}</div>
                          <div style={{ fontSize: 11, color: "#6B7280" }}>{staff.email} · {staff.role}</div>
                        </div>
                      </div>
                      <button onClick={() => hasAccess(staff.id) ? handleRevokeAccess(staff.id) : handleGrantAccess(staff.id)} style={{ padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer", background: hasAccess(staff.id) ? "#FEE2E2" : "#DBEAFE", color: hasAccess(staff.id) ? "#991B1B" : "#1D4ED8", fontSize: 12, fontWeight: 600 }}>
                        {hasAccess(staff.id) ? "Thu hồi" : "Cấp quyền"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
