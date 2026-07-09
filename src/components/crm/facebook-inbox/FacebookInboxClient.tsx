"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageCircle, Search, Send, RefreshCw, X,
  ChevronLeft, Image as ImageIcon, Smile,
  CheckCheck, MoreVertical, ExternalLink,
  Facebook, Users, Inbox, AlertCircle, Loader2,
  Clock, Check, Settings, Key, Save, Eye, EyeOff,
} from "lucide-react";

// ─── Design Tokens (Dark Luxury — đồng bộ CRM) ────────────────────────────────
const T = {
  bg: "#0d0b1a",
  sidebar: "#100e1f",
  sidebarBorder: "#1e1b35",
  sidebarHover: "rgba(255,255,255,0.06)",
  sidebarActive: "rgba(99,102,241,0.18)",
  sidebarActiveBorder: "#6366f1",
  chatBg: "#0a0818",
  headerBg: "rgba(13,11,26,0.96)",
  headerBorder: "#1e1b35",
  bubbleSelf: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
  bubbleOther: "#1a1730",
  bubbleOtherText: "#e2e0f0",
  bubbleSelfText: "#ffffff",
  inputBg: "#1a1730",
  inputBorder: "#2d2a4a",
  inputFocus: "#6366f1",
  textPrimary: "#f1eeff",
  textSecondary: "#9b97b8",
  textMuted: "#5c5880",
  accent: "#6366f1",
  accentHover: "#4f46e5",
  fbBlue: "#1877f2",
  badge: "#ef4444",
  gold: "#C9A84C",
  success: "#10b981",
  divider: "#1e1b35",
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface FbPage {
  id: string;
  pageId: string;
  pageName: string;
  category?: string;
  followerCount?: number;
  isActive: boolean;
}

interface FbConversation {
  id: string;
  snippet: string;
  updatedTime: string;
  messageCount: number;
  unreadCount: number;
  canReply: boolean;
  user: {
    id: string;
    name: string;
    email?: string;
    avatarUrl: string | null;
  } | null;
}

interface FbAttachment {
  type: string;
  imageUrl?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  videoUrl?: string;
  videoPreview?: string;
}

interface FbMessage {
  id: string;
  message: string;
  from?: { id: string; name: string };
  isSelf: boolean;
  createdTime: string;
  attachments: FbAttachment[];
  sticker?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút`;
  if (hours < 24) return `${hours} giờ`;
  if (days < 7) return `${days} ngày`;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

function formatFullTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function Avatar({ name, src, size = 40 }: { name: string; src?: string | null; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const initials = name?.split(" ").map(w => w[0]).slice(-2).join("").toUpperCase() || "?";
  if (src && !imgErr) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
        onError={() => setImgErr(true)}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color: "#fff",
    }}>
      {initials}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FacebookInboxClient() {
  // State
  const [pages, setPages] = useState<FbPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<FbConversation[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);
  const [convSearch, setConvSearch] = useState("");
  const [selectedConv, setSelectedConv] = useState<FbConversation | null>(null);
  const [messages, setMessages] = useState<FbMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"pages" | "convs" | "chat">("pages");
  const [pagesLoading, setPagesLoading] = useState(true);
  const [convPaging, setConvPaging] = useState<{ cursors?: { after?: string } } | null>(null);
  const [msgPaging, setMsgPaging] = useState<{ cursors?: { before?: string } } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  // Pancake Settings
  const [showPancakeSettings, setShowPancakeSettings] = useState(false);
  const [pancakeConfig, setPancakeConfig] = useState<{ enabled: boolean; pages: { fbPageId: string; pancakePageId: string; pageAccessToken: string; pageName?: string }[] }>({ enabled: true, pages: [] });
  const [pancakeSaving, setPancakeSaving] = useState(false);
  const [pancakeSaveMsg, setPancakeSaveMsg] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load Pancake config
  useEffect(() => {
    fetch("/api/crm/facebook-inbox/pancake-settings")
      .then(r => r.json())
      .then(d => { if (!d.error) setPancakeConfig(d); })
      .catch(() => {});
  }, []);

  async function savePancakeSettings() {
    setPancakeSaving(true);
    setPancakeSaveMsg(null);
    try {
      const res = await fetch("/api/crm/facebook-inbox/pancake-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pancakeConfig),
      });
      const d = await res.json();
      if (d.error) setPancakeSaveMsg("Lỗi: " + d.error);
      else setPancakeSaveMsg("Đã lưu thành công!");
    } catch { setPancakeSaveMsg("Lỗi kết nối"); }
    finally { setPancakeSaving(false); setTimeout(() => setPancakeSaveMsg(null), 3000); }
  }

  // ─── Load pages ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadPages() {
      setPagesLoading(true);
      try {
        const res = await fetch("/api/crm/facebook-scheduler/pages");
        const data = await res.json();
        const active = (Array.isArray(data) ? data : []).filter((p: FbPage) => p.isActive);
        setPages(active);
        if (active.length > 0) setSelectedPageId(active[0].id);
      } catch {
        setPages([]);
      } finally {
        setPagesLoading(false);
      }
    }
    loadPages();
  }, []);

  // ─── Load conversations ──────────────────────────────────────────────────────
  const loadConversations = useCallback(async (pageId: string, append = false, after = "") => {
    if (!append) setConvLoading(true);
    setConvError(null);
    try {
      let url = `/api/crm/facebook-inbox/conversations?pageId=${pageId}`;
      if (after) url += `&after=${after}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) { setConvError(data.error); return; }
      if (append) {
        setConversations(prev => [...prev, ...data.conversations]);
      } else {
        setConversations(data.conversations || []);
      }
      setConvPaging(data.paging);
    } catch {
      setConvError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setConvLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedPageId) {
      setConversations([]);
      setSelectedConv(null);
      setMessages([]);
      loadConversations(selectedPageId);
    }
  }, [selectedPageId, loadConversations]);

  // ─── Auto refresh conversations ──────────────────────────────────────────────
  useEffect(() => {
    if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    if (autoRefresh && selectedPageId) {
      autoRefreshRef.current = setInterval(() => {
        loadConversations(selectedPageId);
      }, 30000); // 30 giây
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh, selectedPageId, loadConversations]);

  // ─── Load messages ───────────────────────────────────────────────────────────
  const loadMessages = useCallback(async (pageId: string, convId: string, append = false, before = "") => {
    if (!append) setMsgLoading(true);
    setMsgError(null);
    try {
      let url = `/api/crm/facebook-inbox/messages?pageId=${pageId}&conversationId=${convId}`;
      if (before) url += `&before=${before}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.error) { setMsgError(data.error); return; }
      if (append) {
        setMessages(prev => [...(data.messages || []), ...prev]);
      } else {
        setMessages(data.messages || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
      setMsgPaging(data.paging);
    } catch {
      setMsgError("Lỗi tải tin nhắn.");
    } finally {
      setMsgLoading(false);
    }
  }, []);

  const selectConversation = useCallback((conv: FbConversation) => {
    setSelectedConv(conv);
    setMessages([]);
    setMobileView("chat");
    if (selectedPageId) loadMessages(selectedPageId, conv.id);
  }, [selectedPageId, loadMessages]);

  // ─── Send message ────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || !selectedConv || !selectedPageId || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSendError(null);
    setSending(true);

    // Optimistic update
    const tempMsg: FbMessage = {
      id: `temp_${Date.now()}`,
      message: text,
      isSelf: true,
      createdTime: new Date().toISOString(),
      attachments: [],
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const res = await fetch("/api/crm/facebook-inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: selectedPageId,
          recipientId: selectedConv.user?.id,
          message: text,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setSendError(data.error);
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        setInputText(text);
      } else {
        // Reload messages để lấy ID thật
        setTimeout(() => {
          if (selectedPageId && selectedConv) loadMessages(selectedPageId, selectedConv.id);
        }, 1000);
      }
    } catch {
      setSendError("Lỗi gửi tin nhắn.");
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setInputText(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [inputText, selectedConv, selectedPageId, sending, loadMessages]);

  // ─── Filtered conversations ──────────────────────────────────────────────────
  const filteredConvs = conversations.filter(c =>
    !convSearch || c.user?.name?.toLowerCase().includes(convSearch.toLowerCase()) ||
    c.snippet?.toLowerCase().includes(convSearch.toLowerCase())
  );

  const selectedPage = pages.find(p => p.id === selectedPageId);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: "flex", height: "calc(100vh - 80px)", background: T.bg,
      borderRadius: 16, overflow: "hidden",
      border: `1px solid ${T.divider}`,
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>

      {/* ── CỘT 1: FANPAGE SELECTOR ─────────────────────────────────────── */}
      <div style={{
        width: 220, flexShrink: 0, background: T.sidebar,
        borderRight: `1px solid ${T.sidebarBorder}`,
        display: "flex", flexDirection: "column",
        // Mobile: ẩn khi đang xem conv/chat
        ...(mobileView !== "pages" ? { display: "none" } : {}),
      }} className="fb-inbox-pages">
        {/* Header */}
        <div style={{
          padding: "20px 16px 12px",
          borderBottom: `1px solid ${T.sidebarBorder}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: T.fbBlue,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Facebook size={16} color="#fff" />
            </div>
            <span style={{ color: T.textPrimary, fontWeight: 700, fontSize: 15 }}>
              Facebook Inbox
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ color: T.textMuted, fontSize: 11, margin: 0 }}>
              {pages.length} fanpage đang kết nối
            </p>
            <button
              onClick={() => setShowPancakeSettings(true)}
              title="Cấu hình Pancake API"
              style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 2, display: "flex", borderRadius: 4 }}
            >
              <Settings size={13} />
            </button>
          </div>
        </div>

        {/* Pages list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {pagesLoading ? (
            <div style={{ padding: 20, textAlign: "center" }}>
              <Loader2 size={20} color={T.textMuted} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          ) : pages.length === 0 ? (
            <div style={{ padding: "20px 16px", textAlign: "center" }}>
              <Facebook size={32} color={T.textMuted} style={{ marginBottom: 8 }} />
              <p style={{ color: T.textMuted, fontSize: 12, margin: 0 }}>
                Chưa có fanpage nào được kết nối.
              </p>
              <a href="/crm/content" style={{ color: T.accent, fontSize: 12, marginTop: 8, display: "block" }}>
                → Kết nối tại Content Marketing AI
              </a>
            </div>
          ) : (
            pages.map(page => {
              const isActive = page.id === selectedPageId;
              return (
                <button
                  key={page.id}
                  onClick={() => {
                    setSelectedPageId(page.id);
                    setMobileView("convs");
                  }}
                  style={{
                    width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                    padding: "10px 16px",
                    background: isActive ? T.sidebarActive : "transparent",
                    borderLeft: `3px solid ${isActive ? T.sidebarActiveBorder : "transparent"}`,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = T.sidebarHover; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: T.fbBlue,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, fontWeight: 700, color: "#fff",
                    }}>
                      {page.pageName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        color: isActive ? T.textPrimary : T.textSecondary,
                        fontWeight: isActive ? 600 : 400,
                        fontSize: 13,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>
                        {page.pageName}
                      </div>
                      {page.followerCount && (
                        <div style={{ color: T.textMuted, fontSize: 11 }}>
                          {page.followerCount.toLocaleString()} followers
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Auto refresh toggle */}
        <div style={{
          padding: "12px 16px",
          borderTop: `1px solid ${T.sidebarBorder}`,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "none", cursor: "pointer",
              color: autoRefresh ? T.success : T.textMuted,
              fontSize: 11, padding: 0,
            }}
          >
            <RefreshCw size={12} style={{ animation: autoRefresh ? "spin 3s linear infinite" : "none" }} />
            {autoRefresh ? "Tự động làm mới" : "Tắt tự động làm mới"}
          </button>
        </div>
      </div>

      {/* ── CỘT 2: CONVERSATION LIST ─────────────────────────────────────── */}
      <div style={{
        width: 300, flexShrink: 0,
        borderRight: `1px solid ${T.sidebarBorder}`,
        display: "flex", flexDirection: "column",
        background: "#0f0d1e",
        ...(mobileView === "chat" ? { display: "none" } : {}),
        ...(mobileView === "pages" ? { display: "none" } : {}),
      }} className="fb-inbox-convs">
        {/* Header */}
        <div style={{
          padding: "16px 16px 12px",
          borderBottom: `1px solid ${T.sidebarBorder}`,
          background: T.headerBg,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <button
              onClick={() => setMobileView("pages")}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 0, display: "flex" }}
              className="fb-mobile-back"
            >
              <ChevronLeft size={18} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: T.textPrimary, fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {selectedPage?.pageName || "Chọn fanpage"}
              </div>
              <div style={{ color: T.textMuted, fontSize: 11 }}>
                {convLoading ? "Đang tải..." : `${conversations.length} hội thoại`}
              </div>
            </div>
            <button
              onClick={() => selectedPageId && loadConversations(selectedPageId)}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 4, display: "flex", borderRadius: 6 }}
              title="Làm mới"
            >
              <RefreshCw size={14} style={{ animation: convLoading ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={14} color={T.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={convSearch}
              onChange={e => setConvSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "7px 10px 7px 30px",
                background: T.inputBg, border: `1px solid ${T.inputBorder}`,
                borderRadius: 8, color: T.textPrimary, fontSize: 13,
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {convLoading && conversations.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <Loader2 size={24} color={T.textMuted} style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
              <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>Đang tải hội thoại...</p>
            </div>
          ) : convError ? (
            <div style={{ padding: 20, textAlign: "center" }}>
              <AlertCircle size={24} color="#ef4444" style={{ marginBottom: 8 }} />
              <p style={{ color: "#ef4444", fontSize: 13, margin: "0 0 8px" }}>{convError}</p>
              <button
                onClick={() => selectedPageId && loadConversations(selectedPageId)}
                style={{
                  padding: "6px 14px", borderRadius: 8, border: "none",
                  background: T.accent, color: "#fff", fontSize: 12, cursor: "pointer",
                }}
              >
                Thử lại
              </button>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <Inbox size={32} color={T.textMuted} style={{ marginBottom: 8 }} />
              <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>
                {convSearch ? "Không tìm thấy hội thoại" : "Chưa có tin nhắn nào"}
              </p>
            </div>
          ) : (
            <>
              {filteredConvs.map(conv => {
                const isSelected = selectedConv?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    style={{
                      width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                      padding: "12px 14px",
                      background: isSelected ? "rgba(99,102,241,0.15)" : "transparent",
                      borderLeft: `3px solid ${isSelected ? T.accent : "transparent"}`,
                      borderBottom: `1px solid ${T.divider}`,
                      transition: "all 0.12s",
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = T.sidebarHover; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <Avatar name={conv.user?.name || "?"} src={conv.user?.avatarUrl} size={40} />
                        {conv.unreadCount > 0 && (
                          <span style={{
                            position: "absolute", top: -2, right: -2,
                            background: T.badge, color: "#fff",
                            borderRadius: "50%", width: 16, height: 16,
                            fontSize: 10, fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            border: "2px solid #0f0d1e",
                          }}>
                            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                          <span style={{
                            color: conv.unreadCount > 0 ? T.textPrimary : T.textSecondary,
                            fontWeight: conv.unreadCount > 0 ? 600 : 400,
                            fontSize: 13,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                            maxWidth: 140,
                          }}>
                            {conv.user?.name || "Người dùng ẩn danh"}
                          </span>
                          <span style={{ color: T.textMuted, fontSize: 11, flexShrink: 0, marginLeft: 4 }}>
                            {formatTime(conv.updatedTime)}
                          </span>
                        </div>
                        <div style={{
                          color: conv.unreadCount > 0 ? T.textSecondary : T.textMuted,
                          fontSize: 12,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          fontWeight: conv.unreadCount > 0 ? 500 : 400,
                        }}>
                          {conv.snippet || "Đã gửi một tệp đính kèm"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {/* Load more */}
              {convPaging?.cursors?.after && (
                <button
                  onClick={async () => {
                    if (!selectedPageId || loadingMore) return;
                    setLoadingMore(true);
                    await loadConversations(selectedPageId, true, convPaging?.cursors?.after || "");
                    setLoadingMore(false);
                  }}
                  style={{
                    width: "100%", padding: "10px", border: "none",
                    background: "transparent", color: T.accent, fontSize: 12,
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  {loadingMore ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                  Tải thêm
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── CỘT 3: CHAT PANEL ───────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        background: T.chatBg, minWidth: 0,
        ...(mobileView === "pages" || mobileView === "convs" ? { display: "none" } : {}),
      }} className="fb-inbox-chat">
        {!selectedConv ? (
          /* Empty state */
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 16,
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(99,102,241,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <MessageCircle size={36} color={T.accent} />
            </div>
            <div style={{ textAlign: "center" }}>
              <h3 style={{ color: T.textPrimary, margin: "0 0 6px", fontSize: 18, fontWeight: 600 }}>
                Facebook Inbox
              </h3>
              <p style={{ color: T.textMuted, margin: 0, fontSize: 14 }}>
                Chọn một hội thoại để bắt đầu trả lời
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              {pages.map(p => (
                <div key={p.id} style={{
                  padding: "8px 14px", borderRadius: 8,
                  background: "rgba(99,102,241,0.1)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  color: T.textSecondary, fontSize: 12,
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <Facebook size={12} color={T.fbBlue} />
                  {p.pageName}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={{
              padding: "12px 16px",
              background: T.headerBg,
              borderBottom: `1px solid ${T.headerBorder}`,
              display: "flex", alignItems: "center", gap: 10,
              backdropFilter: "blur(8px)",
            }}>
              <button
                onClick={() => setMobileView("convs")}
                style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 0, display: "flex" }}
                className="fb-mobile-back"
              >
                <ChevronLeft size={20} />
              </button>
              <Avatar name={selectedConv.user?.name || "?"} src={selectedConv.user?.avatarUrl} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.textPrimary, fontWeight: 600, fontSize: 14 }}>
                  {selectedConv.user?.name || "Người dùng ẩn danh"}
                </div>
                <div style={{ color: T.textMuted, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  <Facebook size={10} color={T.fbBlue} />
                  {selectedPage?.pageName}
                </div>
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  onClick={() => selectedPageId && loadMessages(selectedPageId, selectedConv.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: T.textMuted, padding: 6, borderRadius: 6,
                    display: "flex", alignItems: "center",
                  }}
                  title="Làm mới tin nhắn"
                >
                  <RefreshCw size={14} style={{ animation: msgLoading ? "spin 1s linear infinite" : "none" }} />
                </button>
                <a
                  href={`https://www.facebook.com/messages/t/${selectedConv.user?.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: T.textMuted, padding: 6, borderRadius: 6,
                    display: "flex", alignItems: "center", textDecoration: "none",
                  }}
                  title="Mở trên Facebook"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {/* Messages area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px" }}>
              {/* Load more older messages */}
              {msgPaging?.cursors?.before && (
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <button
                    onClick={async () => {
                      if (!selectedPageId || loadingMore) return;
                      setLoadingMore(true);
                      await loadMessages(selectedPageId, selectedConv.id, true, msgPaging?.cursors?.before || "");
                      setLoadingMore(false);
                    }}
                    style={{
                      padding: "6px 14px", borderRadius: 20,
                      background: "rgba(99,102,241,0.1)",
                      border: "1px solid rgba(99,102,241,0.2)",
                      color: T.accent, fontSize: 12, cursor: "pointer",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}
                  >
                    {loadingMore ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Clock size={12} />}
                    Tải tin nhắn cũ hơn
                  </button>
                </div>
              )}

              {msgLoading && messages.length === 0 ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <Loader2 size={24} color={T.textMuted} style={{ animation: "spin 1s linear infinite" }} />
                </div>
              ) : msgError ? (
                <div style={{ textAlign: "center", padding: 20 }}>
                  <AlertCircle size={20} color="#ef4444" style={{ marginBottom: 6 }} />
                  <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{msgError}</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const prevMsg = messages[idx - 1];
                  const showDate = !prevMsg || new Date(msg.createdTime).toDateString() !== new Date(prevMsg.createdTime).toDateString();
                  const isTemp = msg.id.startsWith("temp_");

                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div style={{ textAlign: "center", margin: "12px 0" }}>
                          <span style={{
                            background: "rgba(255,255,255,0.06)", color: T.textMuted,
                            fontSize: 11, padding: "3px 10px", borderRadius: 10,
                          }}>
                            {new Date(msg.createdTime).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
                          </span>
                        </div>
                      )}
                      <div style={{
                        display: "flex",
                        justifyContent: msg.isSelf ? "flex-end" : "flex-start",
                        marginBottom: 6,
                        alignItems: "flex-end",
                        gap: 8,
                      }}>
                        {!msg.isSelf && (
                          <Avatar name={selectedConv.user?.name || "?"} src={selectedConv.user?.avatarUrl} size={28} />
                        )}
                        <div style={{ maxWidth: "70%" }}>
                          {/* Attachments */}
                          {msg.attachments.map((att, ai) => (
                            <div key={ai} style={{ marginBottom: 4 }}>
                              {att.imageUrl && (
                                <a href={att.imageUrl} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={att.imageUrl}
                                    alt="ảnh"
                                    style={{ maxWidth: 240, maxHeight: 200, borderRadius: 10, display: "block", objectFit: "cover" }}
                                  />
                                </a>
                              )}
                              {att.videoUrl && (
                                <video src={att.videoUrl} controls style={{ maxWidth: 240, borderRadius: 10 }} />
                              )}
                              {att.fileUrl && !att.imageUrl && !att.videoUrl && (
                                <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" style={{
                                  display: "inline-flex", alignItems: "center", gap: 6,
                                  padding: "8px 12px", borderRadius: 8,
                                  background: msg.isSelf ? "rgba(99,102,241,0.3)" : T.bubbleOther,
                                  color: T.textPrimary, fontSize: 12, textDecoration: "none",
                                }}>
                                  📎 {att.fileName || "Tệp đính kèm"}
                                </a>
                              )}
                            </div>
                          ))}
                          {/* Text bubble */}
                          {msg.message && (
                            <div style={{
                              padding: "9px 13px",
                              borderRadius: msg.isSelf ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                              background: msg.isSelf ? T.bubbleSelf : T.bubbleOther,
                              color: msg.isSelf ? T.bubbleSelfText : T.bubbleOtherText,
                              fontSize: 14,
                              lineHeight: 1.5,
                              wordBreak: "break-word",
                              opacity: isTemp ? 0.7 : 1,
                            }}>
                              {msg.message}
                            </div>
                          )}
                          {/* Sticker */}
                          {msg.sticker && (
                            <img src={msg.sticker} alt="sticker" style={{ width: 80, height: 80 }} />
                          )}
                          {/* Time */}
                          <div style={{
                            fontSize: 10, color: T.textMuted,
                            textAlign: msg.isSelf ? "right" : "left",
                            marginTop: 3,
                            display: "flex", alignItems: "center",
                            justifyContent: msg.isSelf ? "flex-end" : "flex-start",
                            gap: 4,
                          }}>
                            {formatFullTime(msg.createdTime)}
                            {msg.isSelf && (
                              isTemp
                                ? <Clock size={10} color={T.textMuted} />
                                : <CheckCheck size={10} color={T.success} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Send error */}
            {sendError && (
              <div style={{
                margin: "0 16px 8px",
                padding: "8px 12px", borderRadius: 8,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                color: "#ef4444", fontSize: 12,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <AlertCircle size={14} />
                <span style={{ flex: 1 }}>{sendError}</span>
                {sendError && sendError.includes("Pancake") && sendError.includes("Token") && (
                  <button
                    onClick={() => setShowPancakeSettings(true)}
                    style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 4, padding: "2px 8px", color: T.accent, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    Cấu hình ngay
                  </button>
                )}
                <button onClick={() => setSendError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 0, flexShrink: 0 }}>
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Input area — luôn hiển thị, backend tự xử lý thread control */}
            <div style={{
              padding: "12px 16px",
              borderTop: `1px solid ${T.headerBorder}`,
              background: T.headerBg,
            }}>
              <div style={{
                display: "flex", alignItems: "flex-end", gap: 10,
                background: T.inputBg,
                border: `1px solid ${T.inputBorder}`,
                borderRadius: 12, padding: "8px 12px",
                transition: "border-color 0.15s",
              }}>
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
                  rows={1}
                  style={{
                    flex: 1, background: "none", border: "none", outline: "none",
                    color: T.textPrimary, fontSize: 14, resize: "none",
                    lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
                    fontFamily: "inherit",
                  }}
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = Math.min(el.scrollHeight, 120) + "px";
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || sending}
                  style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: inputText.trim() && !sending ? T.accent : "rgba(99,102,241,0.3)",
                    border: "none", cursor: inputText.trim() && !sending ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}
                >
                  {sending
                    ? <Loader2 size={16} color="#fff" style={{ animation: "spin 1s linear infinite" }} />
                    : <Send size={16} color="#fff" />
                  }
                </button>
              </div>
              <div style={{ color: T.textMuted, fontSize: 11, marginTop: 6, textAlign: "right" }}>
                Trả lời qua trang <strong style={{ color: T.textSecondary }}>{selectedPage?.pageName}</strong>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── PANCAKE SETTINGS MODAL ─────────────────────────────────────── */}
      {showPancakeSettings && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }} onClick={() => setShowPancakeSettings(false)}>
          <div style={{
            background: "#12101f", border: `1px solid ${T.sidebarBorder}`,
            borderRadius: 16, padding: 24, width: "100%", maxWidth: 520,
            maxHeight: "80vh", overflowY: "auto",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Key size={18} color={T.accent} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: T.textPrimary, fontWeight: 700, fontSize: 15 }}>Cấu hình Pancake API</div>
                <div style={{ color: T.textMuted, fontSize: 12 }}>Cho phép gửi tin nhắn khi Pancake đang kiểm soát thread</div>
              </div>
              <button onClick={() => setShowPancakeSettings(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, padding: "12px 14px", background: "rgba(255,255,255,0.04)", borderRadius: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: T.textPrimary, fontSize: 13, fontWeight: 600 }}>Bật tích hợp Pancake</div>
                <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>Tự động gửi qua Pancake khi gặp lỗi thread control</div>
              </div>
              <button
                onClick={() => setPancakeConfig(c => ({ ...c, enabled: !c.enabled }))}
                style={{ width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer", background: pancakeConfig.enabled ? T.accent : T.inputBorder, position: "relative", transition: "background 0.2s" }}
              >
                <div style={{ position: "absolute", top: 3, left: pancakeConfig.enabled ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </button>
            </div>
            <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 10, padding: "12px 14px", marginBottom: 20 }}>
              <div style={{ color: T.accent, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Cách lấy thông tin Pancake:</div>
              <ol style={{ color: T.textMuted, fontSize: 12, margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                <li>Đăng nhập <strong style={{ color: T.textSecondary }}>pages.fm</strong> (Pancake)</li>
                <li>Vào <strong style={{ color: T.textSecondary }}>Cài đặt → Tích hợp → API</strong></li>
                <li><strong style={{ color: T.textSecondary }}>Pancake Page ID</strong>: Lấy từ URL trang Pancake hoặc gọi API <code style={{ background: "rgba(255,255,255,0.1)", padding: "1px 4px", borderRadius: 3 }}>GET /api/v1/pages</code></li>
                <li><strong style={{ color: T.textSecondary }}>Page Access Token</strong>: Copy từ mục API trong Cài đặt</li>
              </ol>
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ color: T.textSecondary, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>Token theo từng Fanpage</div>
              {pages.length === 0 ? (
                <p style={{ color: T.textMuted, fontSize: 12 }}>Chưa có fanpage nào được kết nối.</p>
              ) : (
                pages.map(page => {
                  const existing = pancakeConfig.pages.find(p => p.fbPageId === page.pageId);
                  const tokenVal = existing?.pageAccessToken || "";
                  const pancakePageIdVal = existing?.pancakePageId || "";
                  const isVisible = showTokens[page.pageId];
                  const isConfigured = !!(tokenVal && pancakePageIdVal);
                  return (
                    <div key={page.id} style={{ marginBottom: 16, padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: `1px solid ${isConfigured ? "rgba(16,185,129,0.3)" : T.inputBorder}` }}>
                      <div style={{ color: T.textSecondary, fontSize: 12, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 5, background: T.fbBlue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff" }}>
                          {page.pageName.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600 }}>{page.pageName}</span>
                        {isConfigured && <span style={{ color: T.success, fontSize: 10 }}>✓ Đã cấu hình</span>}
                      </div>
                      {/* Pancake Page ID */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ color: T.textMuted, fontSize: 11, marginBottom: 4 }}>Pancake Page ID <span style={{ color: "#ef4444" }}>*</span></div>
                        <input
                          type="text"
                          value={pancakePageIdVal}
                          onChange={e => {
                            const val = e.target.value;
                            setPancakeConfig(c => {
                              const newPages = c.pages.filter(p => p.fbPageId !== page.pageId);
                              newPages.push({ fbPageId: page.pageId, pancakePageId: val, pageAccessToken: tokenVal, pageName: page.pageName });
                              return { ...c, pages: newPages };
                            });
                          }}
                          placeholder="Nhập Pancake Page ID (khác với Facebook Page ID)..."
                          style={{ width: "100%", padding: "8px 10px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, color: T.textPrimary, fontSize: 12, outline: "none", boxSizing: "border-box" }}
                        />
                      </div>
                      {/* Page Access Token */}
                      <div>
                        <div style={{ color: T.textMuted, fontSize: 11, marginBottom: 4 }}>Pancake Page Access Token <span style={{ color: "#ef4444" }}>*</span></div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <input
                            type={isVisible ? "text" : "password"}
                            value={tokenVal}
                            onChange={e => {
                              const val = e.target.value;
                              setPancakeConfig(c => {
                                const newPages = c.pages.filter(p => p.fbPageId !== page.pageId);
                                newPages.push({ fbPageId: page.pageId, pancakePageId: pancakePageIdVal, pageAccessToken: val, pageName: page.pageName });
                                return { ...c, pages: newPages };
                              });
                            }}
                            placeholder="Dán Pancake Page Access Token vào đây..."
                            style={{ flex: 1, padding: "8px 10px", background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, color: T.textPrimary, fontSize: 12, outline: "none", fontFamily: "monospace" }}
                          />
                          <button
                            onClick={() => setShowTokens(t => ({ ...t, [page.pageId]: !t[page.pageId] }))}
                            style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderRadius: 8, padding: "0 10px", cursor: "pointer", color: T.textMuted, display: "flex", alignItems: "center" }}
                          >
                            {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={savePancakeSettings}
                disabled={pancakeSaving}
                style={{ flex: 1, padding: "10px 16px", borderRadius: 10, border: "none", background: T.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: pancakeSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: pancakeSaving ? 0.7 : 1 }}
              >
                {pancakeSaving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={14} />}
                {pancakeSaving ? "Đang lưu..." : "Lưu cấu hình"}
              </button>
              {pancakeSaveMsg && (
                <span style={{ fontSize: 12, color: pancakeSaveMsg.startsWith("Lỗi") ? "#ef4444" : T.success }}>
                  {pancakeSaveMsg}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      {/* CSS animations */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .fb-mobile-back { display: none !important; }
        @media (max-width: 768px) {
          .fb-inbox-pages { display: flex !important; width: 100% !important; }
          .fb-inbox-convs { display: flex !important; width: 100% !important; }
          .fb-inbox-chat { display: flex !important; width: 100% !important; }
          .fb-mobile-back { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
