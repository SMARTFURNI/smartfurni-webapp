"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Search, Send, Wifi, WifiOff, User, Phone, ShoppingBag, ChevronRight, Settings, RefreshCw, X } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ZaloAttachment {
  type: string; // 'photo', 'video', 'file', 'zalo_system_message', etc.
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ`;
  return d.toLocaleDateString("vi-VN");
}

function getInitials(name: string): string {
  return name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
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
      // Đánh dấu đã đọc
      await fetch(`/api/crm/zalo-inbox/conversations/${convId}/read`, { method: "POST", credentials: "include" });
      setConversations((prev) =>
        prev.map((c) => c.id === convId ? { ...c, unreadCount: 0 } : c)
      );
    } catch { /* ignore */ }
  }, []);

  // ─── SSE Connection ──────────────────────────────────────────────────────

  useEffect(() => {
    const es = new EventSource("/api/crm/zalo-inbox/sse");
    eventSourceRef.current = es;

    es.addEventListener("new_message", (e) => {
      const data = JSON.parse(e.data);
      const { conversationId, text, senderName, createdAt } = data;

      // Tăng unread count nếu không đang xem conversation này
      if (selectedConv?.id !== conversationId) {
        setConversations((prev) =>
          prev.map((c) => c.id === conversationId
            ? { ...c, unreadCount: c.unreadCount + 1, lastMessage: text, lastMessageAt: createdAt }
            : c
          )
        );
      }

      // Reload conversations để cập nhật danh sách
      loadConversations();
    });

    return () => { es.close(); };
  }, [selectedConv?.id, loadConversations]);

  // ─── Initial load ────────────────────────────────────────────────────────

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ─── Auto scroll ─────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Select conversation ─────────────────────────────────────────────────

  const handleSelectConv = (conv: ZaloConversation) => {
    setSelectedConv(conv);
    setMessages([]);
    loadMessages(conv.id);
  };

  // ─── Send message ────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!inputText.trim() || !selectedConv || sending) return;
    const text = inputText.trim();
    setInputText("");
    setSending(true);

    try {
      const res = await fetch("/api/crm/zalo-inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId: selectedConv.id, content: text }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Lỗi gửi tin nhắn");
        setInputText(text);
      }
    } catch {
      setInputText(text);
    } finally {
      setSending(false);
    }
  };

  // ─── Connect Zalo ────────────────────────────────────────────────────────

  const handleConnect = async () => {
    setShowSettings(true);
  };

  // ─── Filter conversations ────────────────────────────────────────────────

  const filteredConvs = conversations.filter((c) =>
    c.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery) ||
    c.lead?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", height: "100vh", background: "#F0F2F5", fontFamily: "system-ui, sans-serif" }}>
      {/* ── Sidebar: Danh sách hội thoại ── */}
      <div style={{
        width: 340, background: "#fff", borderRight: "1px solid #E5E7EB",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #F3F4F6" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0068FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MessageCircle size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>Zalo Inbox</div>
                <div style={{ fontSize: 11, color: gatewayStatus.connected ? "#10B981" : "#9CA3AF", display: "flex", alignItems: "center", gap: 4 }}>
                  {gatewayStatus.connected ? <Wifi size={10} /> : <WifiOff size={10} />}
                  {gatewayStatus.connected ? `Zalo: ${gatewayStatus.phone || "Đã kết nối"}` : "Chưa đăng nhập Zalo"}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={loadConversations} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#6B7280" }} title="Làm mới">
                <RefreshCw size={16} />
              </button>
              <button onClick={() => setShowSettings(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 6, color: "#6B7280" }} title="Cài đặt">
                <Settings size={16} />
              </button>
            </div>
          </div>

          {/* Thông báo lỗi */}
          {gatewayStatus.message && (
            <div style={{ padding: "6px 10px", background: "#FEF3C7", borderRadius: 6, fontSize: 11, color: "#92400E", marginBottom: 8, border: "1px solid #FDE68A" }}>
              ⚠️ {gatewayStatus.message}
            </div>
          )}
          {/* Connect button nếu chưa kết nối */}
          {!gatewayStatus.connected && !gatewayStatus.message?.includes("quyền") && (
            <button
              onClick={() => setShowSettings(true)}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 8, border: "none",
                background: "#0068FF",
                color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", marginBottom: 8,
              }}
            >
              Đăng nhập Zalo
            </button>
          )}

          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF" }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm hội thoại, tên, SĐT..."
              style={{
                width: "100%", padding: "8px 12px 8px 32px", borderRadius: 20,
                border: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: 13,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "#9CA3AF", fontSize: 13 }}>Đang tải...</div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <MessageCircle size={40} color="#D1D5DB" style={{ margin: "0 auto 12px" }} />
              <div style={{ color: "#9CA3AF", fontSize: 13 }}>
                {conversations.length === 0 ? "Chưa có hội thoại nào" : "Không tìm thấy kết quả"}
              </div>
            </div>
          ) : (
            filteredConvs.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isSelected={selectedConv?.id === conv.id}
                onClick={() => handleSelectConv(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Main: Chat area ── */}
      {selectedConv ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Chat header */}
          <div style={{
            padding: "12px 20px", background: "#fff", borderBottom: "1px solid #E5E7EB",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <Avatar name={selectedConv.displayName} size={40} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>{selectedConv.displayName}</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>{selectedConv.phone}</div>
            </div>
            {selectedConv.lead && (
              <a
                href={`/crm/leads?id=${selectedConv.lead.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  background: "#EFF6FF", borderRadius: 20, textDecoration: "none",
                  color: "#3B82F6", fontSize: 12, fontWeight: 500,
                }}
              >
                <User size={12} />
                Xem hồ sơ KH
                <ChevronRight size={12} />
              </a>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#9CA3AF", fontSize: 13, marginTop: 40, padding: "0 20px" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📬</div>
                <div style={{ fontWeight: 600, color: "#6B7280", marginBottom: 4 }}>Chưa có tin nhắn nào</div>
                <div style={{ fontSize: 12, lineHeight: 1.5 }}>
                  Tin nhắn sẽ xuất hiện ở đây sau khi bạn đăng nhập Zalo.<br/>\n                  Nhấn biểu tượng ⚙️ → <strong>Đăng nhập Zalo</strong> để quét QR.                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "12px 20px", background: "#fff", borderTop: "1px solid #E5E7EB",
            display: "flex", gap: 10, alignItems: "flex-end",
          }}>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Nhập tin nhắn... (Enter để gửi)"
              rows={1}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 20, border: "1px solid #E5E7EB",
                fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit",
                maxHeight: 120, overflowY: "auto",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || sending}
              style={{
                width: 40, height: 40, borderRadius: "50%", border: "none",
                background: inputText.trim() ? "#0068FF" : "#D1D5DB",
                color: "#fff", cursor: inputText.trim() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
          <MessageCircle size={60} color="#D1D5DB" />
          <div style={{ color: "#9CA3AF", fontSize: 15 }}>Chọn một hội thoại để bắt đầu</div>
        </div>
      )}

      {/* ── Right panel: Lead info ── */}
      {selectedConv?.lead && (
        <LeadInfoPanel lead={selectedConv.lead} />
      )}

      {/* ── Settings Modal ── */}
      {showSettings && (
        <ZaloSettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const colors = ["#0068FF", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.35, flexShrink: 0,
    }}>
      {getInitials(name)}
    </div>
  );
}

function ConversationItem({
  conv, isSelected, onClick,
}: {
  conv: ZaloConversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
        cursor: "pointer", background: isSelected ? "#EFF6FF" : "transparent",
        borderLeft: isSelected ? "3px solid #0068FF" : "3px solid transparent",
        transition: "background 0.15s",
      }}
    >
      <div style={{ position: "relative" }}>
        <Avatar name={conv.displayName} size={44} />
        {conv.unreadCount > 0 && (
          <div style={{
            position: "absolute", top: -2, right: -2, width: 18, height: 18,
            borderRadius: "50%", background: "#EF4444", color: "#fff",
            fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{
            fontWeight: conv.unreadCount > 0 ? 700 : 500,
            fontSize: 14, color: "#111827",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160,
          }}>
            {conv.displayName}
          </div>
          <div style={{ fontSize: 11, color: "#9CA3AF", flexShrink: 0 }}>
            {formatTime(conv.lastMessageAt)}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {conv.lastMessage || "Bắt đầu hội thoại"}
        </div>
        {conv.lead && (
          <div style={{ fontSize: 11, color: "#3B82F6", marginTop: 2 }}>
            KH: {conv.lead.name}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ZaloMessage }) {
  const isSelf = message.isSelf;
  const attachments = message.attachments || [];

  // Ẩn system messages (zalo_system_message)
  const isSystemMsg = attachments.some(a => a.type === 'zalo_system_message');

  // Lấy tất cả ảnh từ attachments
  const photoAttachments = attachments.filter(a => a.type === 'photo' && (a.url || a.origin_url));

  // Kiểm tra content có phải HTML rỗng không (<div></div>, <div/>, etc.)
  const isEmptyHtml = /^\s*(<div>\s*<\/div>|<div\s*\/>|<br\s*\/?>|\s*)\s*$/.test(message.content || '');
  const hasTextContent = message.content && !isEmptyHtml;

  // Nếu không có nội dung gì cả thì ẩn
  if (isSystemMsg && !hasTextContent && photoAttachments.length === 0) return null;

  const timeStr = new Date(message.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{ display: "flex", justifyContent: isSelf ? "flex-end" : "flex-start", gap: 8, marginBottom: 2 }}>
      {!isSelf && <Avatar name={message.senderName} size={28} />}
      <div style={{ maxWidth: "70%" }}>
        {!isSelf && (
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 2, paddingLeft: 4 }}>
            {message.senderName}
          </div>
        )}

        {/* Hiển thị hình ảnh */}
        {photoAttachments.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: photoAttachments.length === 1 ? "1fr" : "repeat(2, 1fr)",
            gap: 2, marginBottom: hasTextContent ? 4 : 0,
          }}>
            {photoAttachments.map((att, idx) => (
              <a key={idx} href={att.origin_url || att.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={att.url || att.origin_url}
                  alt="Ảnh"
                  style={{
                    width: "100%", maxWidth: 240,
                    height: photoAttachments.length === 1 ? "auto" : 120,
                    objectFit: "cover",
                    borderRadius: 8,
                    display: "block",
                    cursor: "pointer",
                  }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </a>
            ))}
          </div>
        )}

        {/* Hiển thị text content */}
        {hasTextContent && (
          <div style={{
            padding: "8px 12px",
            borderRadius: isSelf ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
            background: isSelf ? "#0068FF" : "#fff",
            color: isSelf ? "#fff" : "#111827",
            fontSize: 14, lineHeight: 1.5,
            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {message.content}
          </div>
        )}

        {/* System message đơn giản */}
        {isSystemMsg && hasTextContent && (
          <div style={{ fontSize: 11, color: "#9CA3AF", textAlign: "center", fontStyle: "italic", padding: "2px 4px" }}>
            {message.content}
          </div>
        )}

        <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2, textAlign: isSelf ? "right" : "left", paddingLeft: 4 }}>
          {timeStr}
        </div>
      </div>
    </div>
  );
}

function LeadInfoPanel({ lead }: { lead: LeadInfo }) {
  return (
    <div style={{
      width: 280, background: "#fff", borderLeft: "1px solid #E5E7EB",
      display: "flex", flexDirection: "column", overflowY: "auto",
    }}>
      <div style={{ padding: "16px", borderBottom: "1px solid #F3F4F6" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 12 }}>
          Thông tin khách hàng
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Avatar name={lead.name} size={44} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{lead.name}</div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>{lead.phone}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <InfoRow icon={<User size={13} />} label="Giai đoạn">
            <span style={{
              padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
              background: getStageColor(lead.stage) + "20", color: getStageColor(lead.stage),
            }}>
              {getStageLabel(lead.stage)}
            </span>
          </InfoRow>
          <InfoRow icon={<Phone size={13} />} label="Loại KH">
            <span style={{ fontSize: 12, color: "#374151" }}>{lead.type || "—"}</span>
          </InfoRow>
          {lead.assignedTo && (
            <InfoRow icon={<User size={13} />} label="Phụ trách">
              <span style={{ fontSize: 12, color: "#374151" }}>{lead.assignedTo}</span>
            </InfoRow>
          )}
        </div>

        <a
          href={`/crm/leads?id=${lead.id}`}
          style={{
            display: "block", marginTop: 12, padding: "8px", textAlign: "center",
            background: "#EFF6FF", borderRadius: 8, color: "#3B82F6",
            fontSize: 12, fontWeight: 600, textDecoration: "none",
          }}
        >
          Xem hồ sơ đầy đủ →
        </a>
      </div>

      {/* Báo giá gần đây */}
      {lead.recent_quotes && lead.recent_quotes.length > 0 && (
        <div style={{ padding: "12px 16px" }}>
          <div style={{ fontWeight: 600, fontSize: 12, color: "#374151", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <ShoppingBag size={13} />
            Báo giá gần đây
          </div>
          {lead.recent_quotes.map((q) => (
            <div key={q.id} style={{
              padding: "8px 10px", background: "#F9FAFB", borderRadius: 8, marginBottom: 6,
              border: "1px solid #F3F4F6",
            }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#111827" }}>{q.name || `Báo giá #${q.id.slice(-6)}`}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "#6B7280" }}>{q.status}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#C9A84C" }}>
                  {q.total_amount ? q.total_amount.toLocaleString("vi-VN") + "đ" : "—"}
                </span>
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

//// ─── Settings Modal ──────────────────────────────────────────────────

function ZaloSettingsModal({ onClose }: { onClose: () => void }) {
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
    // Load existing credentials
    fetch("/api/crm/zalo-inbox/credentials", { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (data && data.phone) setCurrentCreds(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "access") {
      setLoadingAccess(true);
      Promise.all([
        fetch("/api/crm/staff", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/crm/zalo-inbox/access", { credentials: "include" }).then((r) => r.json()),
      ]).then(([staffData, accessData]) => {
        setStaffList(staffData?.staff || []);
        setAccessList(accessData?.accessList || []);
      }).finally(() => setLoadingAccess(false));
    }
  }, [tab]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => { eventSourceRef.current?.close(); };
  }, []);

  const handleStartQR = () => {
    setLoginStatus("loading");
    setQrImage(null);
    setLoginMessage("Đang tạo mã QR...");

    // Close existing SSE
    eventSourceRef.current?.close();

    // Open SSE stream for QR login
    const es = new EventSource("/api/crm/zalo-inbox/qr-login");
    eventSourceRef.current = es;

    es.addEventListener("qr", (e) => {
      const data = JSON.parse(e.data);
      // Thêm prefix data URI nếu chưa có
      const imgData = data.image?.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
      setQrImage(imgData);
      setLoginStatus("scanning");
      setLoginMessage("Mở Zalo trên điện thoại → Quét mã QR này");
    });

    es.addEventListener("scanned", () => {
      setLoginMessage("✅ Đã quét! Đang xác nhận đăng nhập...");
    });

    es.addEventListener("success", (e) => {
      const data = JSON.parse(e.data);
      setLoginStatus("success");
      setQrImage(null);
      setLoginMessage(`✅ Đăng nhập thành công! Zalo: ${data.phone || "Đã kết nối"}`);
      setCurrentCreds({ phone: data.phone, hasCredentials: true });
      es.close();
      // Reload page sau 2s
      setTimeout(() => window.location.reload(), 2000);
    });

    es.addEventListener("error", (e) => {
      try {
        const data = JSON.parse((e as any).data || "{}");
        setLoginMessage("❌ " + (data.message || "Lỗi đăng nhập"));
      } catch {
        setLoginMessage("❌ Lỗi kết nối");
      }
      setLoginStatus("error");
      setQrImage(null);
      es.close();
    });

    es.onerror = () => {
      if (loginStatus !== "success") {
        setLoginStatus("error");
        setLoginMessage("❌ Mất kết nối. Vui lòng thử lại.");
      }
      es.close();
    };
  };

  const handleDisconnect = async () => {
    if (!confirm("Bạn có chắc muốn đăng xuất Zalo?")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/crm/zalo-inbox/credentials", { method: "DELETE", credentials: "include" });
      setCurrentCreds(null);
      setLoginStatus("idle");
      setLoginMessage("");
      setQrImage(null);
    } finally { setDisconnecting(false); }
  };

  const handleGrantAccess = async (staffId: string) => {
    await fetch("/api/crm/zalo-inbox/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ staffId }),
    });
    const res = await fetch("/api/crm/zalo-inbox/access", { credentials: "include" });
    const data = await res.json();
    setAccessList(data?.accessList || []);
  };

  const handleRevokeAccess = async (staffId: string) => {
    await fetch(`/api/crm/zalo-inbox/access?staffId=${staffId}`, { method: "DELETE", credentials: "include" });
    setAccessList((prev) => prev.filter((a) => a.staffId !== staffId));
  };

  const hasAccess = (staffId: string) => accessList.some((a) => a.staffId === staffId);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: 480, maxHeight: "85vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        {/* Modal header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #F3F4F6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Cài đặt Zalo Inbox</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7280" }}>
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #F3F4F6" }}>
          {(["login", "access"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "10px", border: "none", background: "none",
                fontWeight: tab === t ? 600 : 400, fontSize: 13,
                color: tab === t ? "#0068FF" : "#6B7280",
                borderBottom: tab === t ? "2px solid #0068FF" : "2px solid transparent",
                cursor: "pointer",
              }}
            >
              {t === "login" ? "Đăng nhập Zalo" : "Phân quyền nhân viên"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {tab === "login" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
              {/* Current status */}
              {currentCreds?.phone && (
                <div style={{
                  width: "100%", padding: "12px 16px", background: "#D1FAE5", borderRadius: 10,
                  border: "1px solid #6EE7B7", display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#065F46" }}>✅ Đã đăng nhập</div>
                    <div style={{ fontSize: 12, color: "#047857", marginTop: 2 }}>Zalo: {currentCreds.phone}</div>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    style={{
                      padding: "6px 12px", borderRadius: 6, border: "1px solid #FCA5A5",
                      background: "#FEE2E2", color: "#991B1B", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    {disconnecting ? "Đang xử lý..." : "Đăng xuất"}
                  </button>
                </div>
              )}

              {/* QR Code area */}
              {qrImage ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 12 }}>
                    📱 Mở Zalo → Quét mã QR bên dưới
                  </div>
                  <img
                    src={qrImage}
                    alt="Zalo QR Code"
                    style={{ width: 240, height: 240, borderRadius: 12, border: "2px solid #E5E7EB" }}
                  />
                  <div style={{ fontSize: 12, color: "#6B7280", marginTop: 8 }}>Mã QR có hiệu lực trong 3 phút</div>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: "50%", background: "#EFF6FF",
                    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px",
                    fontSize: 36,
                  }}>📱</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#111827", marginBottom: 6 }}>
                    {currentCreds?.phone ? "Đăng nhập lại Zalo" : "Đăng nhập Zalo cá nhân"}
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.6, marginBottom: 16 }}>
                    Nhấn nút bên dưới để tạo mã QR.<br />
                    Mở Zalo trên điện thoại và quét mã để đăng nhập.
                  </div>
                </div>
              )}

              {/* Status message */}
              {loginMessage && (
                <div style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 13,
                  background: loginStatus === "success" ? "#D1FAE5" : loginStatus === "error" ? "#FEE2E2" : "#EFF6FF",
                  color: loginStatus === "success" ? "#065F46" : loginStatus === "error" ? "#991B1B" : "#1E40AF",
                  border: `1px solid ${loginStatus === "success" ? "#6EE7B7" : loginStatus === "error" ? "#FCA5A5" : "#BFDBFE"}`,
                  textAlign: "center",
                }}>
                  {loginMessage}
                </div>
              )}

              {/* Action button */}
              {loginStatus !== "scanning" && loginStatus !== "success" && (
                <button
                  onClick={handleStartQR}
                  disabled={loginStatus === "loading"}
                  style={{
                    padding: "12px 32px", borderRadius: 10, border: "none",
                    background: loginStatus === "loading" ? "#93C5FD" : "#0068FF",
                    color: "#fff", fontWeight: 700, fontSize: 14,
                    cursor: loginStatus === "loading" ? "not-allowed" : "pointer",
                    width: "100%",
                  }}
                >
                  {loginStatus === "loading" ? "⏳ Đang tạo mã QR..." : "📱 Tạo mã QR đăng nhập"}
                </button>
              )}

              {loginStatus === "scanning" && (
                <button
                  onClick={() => { eventSourceRef.current?.close(); setLoginStatus("idle"); setQrImage(null); setLoginMessage(""); }}
                  style={{
                    padding: "8px 20px", borderRadius: 8, border: "1px solid #E5E7EB",
                    background: "#F9FAFB", color: "#374151", fontSize: 13, cursor: "pointer",
                  }}
                >
                  Hủy
                </button>
              )}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 13, color: "#6B7280", marginBottom: 16 }}>
                Chọn nhân viên được phép truy cập Zalo Shared Inbox. Admin luôn có quyền truy cập.
              </div>
              {loadingAccess ? (
                <div style={{ textAlign: "center", color: "#9CA3AF", padding: 20 }}>Đang tải...</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {staffList.map((staff) => (
                    <div key={staff.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "10px 12px", borderRadius: 8, border: "1px solid #E5E7EB",
                      background: hasAccess(staff.id) ? "#F0FDF4" : "#fff",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={staff.full_name || staff.fullName} size={32} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{staff.full_name || staff.fullName}</div>
                          <div style={{ fontSize: 11, color: "#6B7280" }}>{staff.email} · {staff.role}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => hasAccess(staff.id) ? handleRevokeAccess(staff.id) : handleGrantAccess(staff.id)}
                        style={{
                          padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                          background: hasAccess(staff.id) ? "#FEE2E2" : "#DBEAFE",
                          color: hasAccess(staff.id) ? "#991B1B" : "#1D4ED8",
                          fontSize: 12, fontWeight: 600,
                        }}
                      >
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
