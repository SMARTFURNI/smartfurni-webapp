"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  UserPlus, Search, Check, X, Phone, RefreshCw,
  UserCheck, UserX, Clock, Send, ChevronRight,
  Bell,
} from "lucide-react";

// ─── Design Tokens ─────────────────────────────────────────────────────────────
const T = {
  sidebarBg: "#111827",
  sidebarBorder: "#1F2937",
  sidebarHover: "#1F2937",
  sidebarActiveBg: "#1E3A5F",
  chatBg: "#0F172A",
  headerBg: "rgba(15,23,42,0.95)",
  headerBorder: "#1E293B",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  accent: "#3B82F6",
  accentHover: "#2563EB",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  badge: "#EF4444",
};

// ─── Types ─────────────────────────────────────────────────────────────────────
interface FriendRequest {
  fromUid: string;
  toUid: string;
  message: string;
  timestamp: number;
  displayName?: string;
  avatar?: string;
}

interface FoundUser {
  uid: string;
  displayName: string;
  avatar: string;
  zaloName: string;
}

interface FriendStatus {
  isFriend: boolean;
  isRequested: boolean;
  isRequesting: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getAvatarColor(name: string): string {
  const colors = [
    "linear-gradient(135deg,#667eea,#764ba2)",
    "linear-gradient(135deg,#f093fb,#f5576c)",
    "linear-gradient(135deg,#4facfe,#00f2fe)",
    "linear-gradient(135deg,#43e97b,#38f9d7)",
    "linear-gradient(135deg,#fa709a,#fee140)",
    "linear-gradient(135deg,#a18cd1,#fbc2eb)",
  ];
  return colors[(name || "?").charCodeAt(0) % colors.length];
}

function formatTimeAgo(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return `${Math.floor(diffHours / 24)} ngày trước`;
}

// ─── Avatar Component ──────────────────────────────────────────────────────────
function AvatarCircle({ name, avatarUrl, size = 44 }: { name: string; avatarUrl?: string; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name || "?").split(" ").slice(-2).map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: getAvatarColor(name),
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.36,
      overflow: "hidden", flexShrink: 0,
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    }}>
      {avatarUrl && !imgError ? (
        <img src={avatarUrl} alt={name} onError={() => setImgError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

// ─── Notification Toast ────────────────────────────────────────────────────────
function FriendNotifToast({ request, onAccept, onReject, onDismiss }: {
  request: FriendRequest;
  onAccept: () => void;
  onReject: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: "#1E293B", border: `1px solid ${T.sidebarBorder}`,
      borderRadius: 14, padding: "14px 16px", minWidth: 300, maxWidth: 360,
      boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
      animation: "slideInRight 0.3s ease",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{ position: "relative" }}>
          <AvatarCircle name={request.displayName || request.fromUid} size={44} />
          <div style={{
            position: "absolute", bottom: -2, right: -2,
            width: 18, height: 18, borderRadius: "50%",
            background: T.accent, border: `2px solid #1E293B`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <UserPlus size={9} color="#fff" />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 2 }}>
            Lời mời kết bạn
          </div>
          <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 2 }}>
            <strong>{request.displayName || request.fromUid}</strong> muốn kết bạn với bạn
          </div>
          {request.message && (
            <div style={{ fontSize: 11, color: T.textMuted, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              &ldquo;{request.message}&rdquo;
            </div>
          )}
        </div>
        <button onClick={onDismiss}
          style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 2, flexShrink: 0 }}>
          <X size={14} />
        </button>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onAccept}
          style={{ flex: 1, padding: "7px 0", borderRadius: 8, background: T.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <Check size={13} /> Chấp nhận
        </button>
        <button onClick={onReject}
          style={{ flex: 1, padding: "7px 0", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: T.error, border: `1px solid rgba(239,68,68,0.2)`, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <X size={13} /> Từ chối
        </button>
      </div>
    </div>
  );
}

// ─── Main ZaloFriendPanel ──────────────────────────────────────────────────────
export default function ZaloFriendPanel() {
  const [activeTab, setActiveTab] = useState<"incoming" | "search">("incoming");
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [searchPhone, setSearchPhone] = useState("");
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [foundUserStatus, setFoundUserStatus] = useState<FriendStatus | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestMessage, setRequestMessage] = useState("Xin chào, tôi là nhân viên SmartFurni. Tôi muốn kết bạn để hỗ trợ bạn tốt hơn!");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ uid: string; success: boolean; message: string } | null>(null);
  const [toastRequest, setToastRequest] = useState<FriendRequest | null>(null);
  const lastRequestCountRef = useRef(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Load incoming requests ──────────────────────────────────────────────
  const loadIncomingRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/crm/zalo-inbox/friend-requests", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const requests: FriendRequest[] = data.requests || [];
      // Hiển thị toast khi có yêu cầu mới
      if (requests.length > lastRequestCountRef.current && lastRequestCountRef.current > 0) {
        const newest = requests[0];
        if (newest) setToastRequest(newest);
      }
      lastRequestCountRef.current = requests.length;
      setIncomingRequests(requests);
    } catch { /* ignore */ }
  }, []);

  // ─── SSE listener for realtime friend notifications ─────────────────────
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      try {
        es = new EventSource("/api/crm/zalo-inbox/sse");
        es.addEventListener("friend_request", (e: MessageEvent) => {
          try {
            const payload = JSON.parse(e.data);
            if (payload.type === "incoming" && payload.request) {
              const req: FriendRequest = payload.request;
              setIncomingRequests(prev => {
                const exists = prev.some(r => r.fromUid === req.fromUid);
                if (exists) return prev;
                return [req, ...prev];
              });
              setToastRequest(req);
              lastRequestCountRef.current += 1;
            }
          } catch { /* ignore */ }
        });
        es.addEventListener("friend_event", (e: MessageEvent) => {
          try {
            const payload = JSON.parse(e.data);
            // Khi bạn bè được thêm thành công → reload
            if (payload.type === "added" || payload.type === "accepted") {
              loadIncomingRequests();
            }
          } catch { /* ignore */ }
        });
        es.onerror = () => {
          es?.close();
          es = null;
          // Retry sau 5s
          retryTimer = setTimeout(connect, 5000);
        };
      } catch { /* ignore */ }
    };

    connect();
    return () => {
      es?.close();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [loadIncomingRequests]);

  // ─── Polling (fallback, mỗi 15s thay vì 5s vì đã có SSE) ────────────────
  useEffect(() => {
    loadIncomingRequests();
    const poll = async () => {
      await loadIncomingRequests();
      pollTimerRef.current = setTimeout(poll, 15000);
    };
    pollTimerRef.current = setTimeout(poll, 15000);
    return () => { if (pollTimerRef.current) clearTimeout(pollTimerRef.current); };
  }, [loadIncomingRequests]);

  // ─── Search user by phone ─────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchPhone.trim()) return;
    setSearching(true);
    setSearchError(null);
    setFoundUser(null);
    setFoundUserStatus(null);
    setActionResult(null);
    try {
      const res = await fetch(`/api/crm/zalo-inbox/find-user?phone=${encodeURIComponent(searchPhone.trim())}`, { credentials: "include" });
      const data = await res.json();
      if (!data.success) {
        setSearchError(data.error || "Không tìm thấy người dùng");
        return;
      }
      setFoundUser(data.user);
      // Kiểm tra trạng thái kết bạn
      const statusRes = await fetch("/api/crm/zalo-inbox/friend-action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "status", userId: data.user.uid }),
      });
      const statusData = await statusRes.json();
      if (statusData.success) setFoundUserStatus(statusData.status);
    } catch {
      setSearchError("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setSearching(false);
    }
  };

  // ─── Send friend request ──────────────────────────────────────────────────
  const handleSendRequest = async () => {
    if (!foundUser || sendingRequest) return;
    setSendingRequest(true);
    setActionResult(null);
    try {
      const res = await fetch("/api/crm/zalo-inbox/friend-action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "send", userId: foundUser.uid, message: requestMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setActionResult({ uid: foundUser.uid, success: true, message: "Đã gửi lời mời kết bạn thành công!" });
        setFoundUserStatus(prev => prev ? { ...prev, isRequested: true } : { isFriend: false, isRequested: true, isRequesting: false });
      } else {
        setActionResult({ uid: foundUser.uid, success: false, message: data.error || "Lỗi gửi lời mời" });
      }
    } catch {
      setActionResult({ uid: foundUser?.uid || "", success: false, message: "Lỗi kết nối" });
    } finally {
      setSendingRequest(false);
    }
  };

  // ─── Accept/Reject friend request ────────────────────────────────────────
  const handleAccept = async (uid: string) => {
    setActionLoading(uid);
    try {
      const res = await fetch("/api/crm/zalo-inbox/friend-action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "accept", userId: uid }),
      });
      const data = await res.json();
      if (data.success) {
        setIncomingRequests(prev => prev.filter(r => r.fromUid !== uid));
        lastRequestCountRef.current = Math.max(0, lastRequestCountRef.current - 1);
      }
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  const handleReject = async (uid: string) => {
    setActionLoading(uid + "_reject");
    try {
      const res = await fetch("/api/crm/zalo-inbox/friend-action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "reject", userId: uid }),
      });
      const data = await res.json();
      if (data.success) {
        setIncomingRequests(prev => prev.filter(r => r.fromUid !== uid));
        lastRequestCountRef.current = Math.max(0, lastRequestCountRef.current - 1);
      }
    } catch { /* ignore */ }
    finally { setActionLoading(null); }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", background: T.chatBg, fontFamily: "'Inter', system-ui, -apple-system, sans-serif", overflow: "hidden" }}>
      {/* Toast notification */}
      {toastRequest && (
        <FriendNotifToast
          request={toastRequest}
          onAccept={() => { handleAccept(toastRequest.fromUid); setToastRequest(null); }}
          onReject={() => { handleReject(toastRequest.fromUid); setToastRequest(null); }}
          onDismiss={() => setToastRequest(null)}
        />
      )}

      {/* ─── Left panel: tabs + list ──────────────────────────────────────── */}
      <div style={{ width: 320, background: T.sidebarBg, borderRight: `1px solid ${T.sidebarBorder}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        {/* Header */}
        <div style={{ padding: "14px 16px 0", borderBottom: `1px solid ${T.sidebarBorder}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 18, color: T.textPrimary }}>Kết bạn</span>
              {incomingRequests.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, background: T.badge, color: "#fff", borderRadius: 10, padding: "1px 7px", minWidth: 20, textAlign: "center" }}>
                  {incomingRequests.length}
                </span>
              )}
            </div>
            <button onClick={loadIncomingRequests} title="Làm mới"
              style={{ width: 32, height: 32, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textMuted }}>
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 0, marginLeft: -16, marginRight: -16, paddingLeft: 16 }}>
            {([
              { key: "incoming", label: "Lời mời đến", icon: <Bell size={13} /> },
              { key: "search", label: "Tìm & kết bạn", icon: <UserPlus size={13} /> },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "8px 14px", background: "none", border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 400,
                  color: activeTab === tab.key ? T.accent : T.textMuted,
                  borderBottom: activeTab === tab.key ? `2px solid ${T.accent}` : "2px solid transparent",
                  marginBottom: -1, transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 5,
                }}>
                {tab.icon}
                {tab.label}
                {tab.key === "incoming" && incomingRequests.length > 0 && (
                  <span style={{ fontSize: 10, background: T.badge, color: "#fff", borderRadius: 8, padding: "1px 5px" }}>
                    {incomingRequests.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {activeTab === "incoming" ? (
            /* ─── Incoming requests list ─── */
            incomingRequests.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <UserCheck size={40} color={T.textMuted} style={{ margin: "0 auto 12px" }} />
                <div style={{ color: T.textSecondary, fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Không có lời mời nào</div>
                <div style={{ color: T.textMuted, fontSize: 12, lineHeight: 1.6 }}>
                  Khi có người gửi lời mời kết bạn,<br />bạn sẽ thấy ở đây.
                </div>
              </div>
            ) : (
              <div>
                <div style={{ padding: "10px 16px 4px", fontSize: 11, color: T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {incomingRequests.length} lời mời kết bạn
                </div>
                {incomingRequests.map(req => (
                  <IncomingRequestItem
                    key={req.fromUid}
                    request={req}
                    actionLoading={actionLoading}
                    onAccept={() => handleAccept(req.fromUid)}
                    onReject={() => handleReject(req.fromUid)}
                  />
                ))}
              </div>
            )
          ) : (
            /* ─── Search tab ─── */
            <div style={{ padding: "16px 16px 0" }}>
              {/* Phone search input */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6, fontWeight: 500 }}>Số điện thoại</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ position: "relative", flex: 1 }}>
                    <Phone size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.textMuted, pointerEvents: "none" }} />
                    <input
                      value={searchPhone}
                      onChange={e => setSearchPhone(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSearch()}
                      placeholder="0912 345 678"
                      style={{
                        width: "100%", padding: "9px 12px 9px 32px",
                        borderRadius: 10, border: `1px solid ${T.sidebarBorder}`,
                        background: T.sidebarHover, fontSize: 13, outline: "none",
                        color: T.textPrimary, boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <button onClick={handleSearch} disabled={searching || !searchPhone.trim()}
                    style={{
                      padding: "9px 14px", borderRadius: 10, background: T.accent, color: "#fff",
                      border: "none", cursor: searching || !searchPhone.trim() ? "not-allowed" : "pointer",
                      fontSize: 13, fontWeight: 600, opacity: searching || !searchPhone.trim() ? 0.6 : 1,
                      display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                    }}>
                    {searching ? (
                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                    ) : (
                      <Search size={14} />
                    )}
                    Tìm
                  </button>
                </div>
              </div>

              {/* Error */}
              {searchError && (
                <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: `1px solid rgba(239,68,68,0.2)`, fontSize: 12, color: T.error, marginBottom: 12 }}>
                  {searchError}
                </div>
              )}

              {/* Found user */}
              {foundUser && (
                <FoundUserCard
                  user={foundUser}
                  status={foundUserStatus}
                  requestMessage={requestMessage}
                  setRequestMessage={setRequestMessage}
                  onSendRequest={handleSendRequest}
                  sending={sendingRequest}
                  actionResult={actionResult}
                  onAccept={() => handleAccept(foundUser.uid)}
                  onReject={() => handleReject(foundUser.uid)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Right area: empty state ──────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(59,130,246,0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
          <UserPlus size={32} color={T.accent} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.textSecondary }}>Tính năng kết bạn</div>
        <div style={{ fontSize: 13, color: T.textMuted, textAlign: "center", lineHeight: 1.7, maxWidth: 320 }}>
          Tìm kiếm khách hàng qua số điện thoại và gửi lời mời kết bạn Zalo.<br />
          Quản lý các lời mời đến và đã gửi ngay tại đây.
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>
    </div>
  );
}

// ─── IncomingRequestItem ───────────────────────────────────────────────────────
function IncomingRequestItem({ request, actionLoading, onAccept, onReject }: {
  request: FriendRequest;
  actionLoading: string | null;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isAccepting = actionLoading === request.fromUid;
  const isRejecting = actionLoading === request.fromUid + "_reject";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "12px 16px",
        background: hovered ? T.sidebarHover : "transparent",
        transition: "background 0.15s",
        borderBottom: `1px solid ${T.sidebarBorder}`,
      }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
        <div style={{ position: "relative" }}>
          <AvatarCircle name={request.displayName || request.fromUid} size={46} />
          <div style={{
            position: "absolute", bottom: -2, right: -2,
            width: 18, height: 18, borderRadius: "50%",
            background: T.accent, border: `2px solid ${T.sidebarBg}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <UserPlus size={9} color="#fff" />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: T.textPrimary, marginBottom: 2 }}>
            {request.displayName || request.fromUid}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
            <Clock size={10} />
            {formatTimeAgo(request.timestamp)}
          </div>
          {request.message && (
            <div style={{
              fontSize: 12, color: T.textSecondary,
              background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "5px 8px",
              borderLeft: `2px solid ${T.accent}`,
              fontStyle: "italic",
              overflow: "hidden", textOverflow: "ellipsis",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>
              &ldquo;{request.message}&rdquo;
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onAccept} disabled={isAccepting || isRejecting}
          style={{
            flex: 1, padding: "7px 0", borderRadius: 8,
            background: T.accent, color: "#fff", border: "none",
            cursor: isAccepting || isRejecting ? "not-allowed" : "pointer",
            fontSize: 12, fontWeight: 600, opacity: isAccepting || isRejecting ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}>
          {isAccepting ? (
            <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
          ) : (
            <Check size={13} />
          )}
          Chấp nhận
        </button>
        <button onClick={onReject} disabled={isAccepting || isRejecting}
          style={{
            flex: 1, padding: "7px 0", borderRadius: 8,
            background: "rgba(239,68,68,0.1)", color: T.error,
            border: `1px solid rgba(239,68,68,0.2)`,
            cursor: isAccepting || isRejecting ? "not-allowed" : "pointer",
            fontSize: 12, fontWeight: 600, opacity: isAccepting || isRejecting ? 0.7 : 1,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          }}>
          {isRejecting ? (
            <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(239,68,68,0.3)", borderTopColor: T.error, animation: "spin 0.8s linear infinite" }} />
          ) : (
            <UserX size={13} />
          )}
          Từ chối
        </button>
      </div>
    </div>
  );
}

// ─── FoundUserCard ─────────────────────────────────────────────────────────────
function FoundUserCard({ user, status, requestMessage, setRequestMessage, onSendRequest, sending, actionResult, onAccept, onReject }: {
  user: FoundUser;
  status: FriendStatus | null;
  requestMessage: string;
  setRequestMessage: (v: string) => void;
  onSendRequest: () => void;
  sending: boolean;
  actionResult: { uid: string; success: boolean; message: string } | null;
  onAccept?: () => void;
  onReject?: () => void;
}) {
  const isFriend = status?.isFriend;
  const isRequested = status?.isRequested; // mình đã gửi lời mời
  const isRequesting = status?.isRequesting; // họ đã gửi lời mời cho mình

  return (
    <div style={{
      borderRadius: 12, border: `1px solid ${T.sidebarBorder}`,
      background: "rgba(255,255,255,0.03)", overflow: "hidden",
    }}>
      {/* User info */}
      <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 12 }}>
        <AvatarCircle name={user.displayName} avatarUrl={user.avatar} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: T.textPrimary, marginBottom: 3 }}>{user.displayName}</div>
          {user.zaloName && user.zaloName !== user.displayName && (
            <div style={{ fontSize: 12, color: T.textMuted }}>@{user.zaloName}</div>
          )}
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>ID: {user.uid}</div>
        </div>
        {/* Status badge */}
        {isFriend && (
          <div style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(16,185,129,0.1)", border: `1px solid rgba(16,185,129,0.3)`, fontSize: 11, color: T.success, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <UserCheck size={11} /> Bạn bè
          </div>
        )}
        {isRequested && !isFriend && (
          <div style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(59,130,246,0.1)", border: `1px solid rgba(59,130,246,0.3)`, fontSize: 11, color: T.accent, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={11} /> Đã gửi
          </div>
        )}
        {isRequesting && !isFriend && (
          <div style={{ padding: "4px 10px", borderRadius: 20, background: "rgba(245,158,11,0.1)", border: `1px solid rgba(245,158,11,0.3)`, fontSize: 11, color: T.warning, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <Bell size={11} /> Đang chờ
          </div>
        )}
      </div>

      {/* Action result */}
      {actionResult && (
        <div style={{
          margin: "0 16px 12px",
          padding: "8px 12px", borderRadius: 8,
          background: actionResult.success ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
          border: `1px solid ${actionResult.success ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          fontSize: 12, color: actionResult.success ? T.success : T.error,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {actionResult.success ? <Check size={13} /> : <X size={13} />}
          {actionResult.message}
        </div>
      )}

      {/* Send request form */}
      {!isFriend && !isRequested && (
        <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${T.sidebarBorder}` }}>
          <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6, marginTop: 12, fontWeight: 500 }}>
            Lời nhắn kết bạn
          </div>
          <textarea
            value={requestMessage}
            onChange={e => setRequestMessage(e.target.value)}
            rows={3}
            placeholder="Nhập lời nhắn khi gửi lời mời..."
            style={{
              width: "100%", padding: "9px 12px",
              borderRadius: 10, border: `1px solid ${T.sidebarBorder}`,
              background: T.sidebarHover, fontSize: 12, outline: "none",
              color: T.textPrimary, resize: "none", boxSizing: "border-box",
              lineHeight: 1.5, fontFamily: "inherit",
            }}
          />
          <button onClick={onSendRequest} disabled={sending}
            style={{
              width: "100%", marginTop: 8, padding: "10px 0",
              borderRadius: 10, background: T.accent, color: "#fff",
              border: "none", cursor: sending ? "not-allowed" : "pointer",
              fontSize: 13, fontWeight: 600, opacity: sending ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
            {sending ? (
              <>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
                Đang gửi...
              </>
            ) : (
              <>
                <Send size={14} />
                Gửi lời mời kết bạn
              </>
            )}
          </button>
        </div>
      )}

      {/* Already friends */}
      {isFriend && (
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.sidebarBorder}`, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: T.textMuted }}>
            Bạn và người này đã là bạn bè trên Zalo.
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, marginTop: 4 }}>
            Bạn có thể nhắn tin trực tiếp trong mục Tin nhắn.
          </div>
        </div>
      )}

      {/* Request already sent */}
      {isRequested && !isFriend && (
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.sidebarBorder}`, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: T.textMuted }}>
            Lời mời kết bạn đã được gửi. Đang chờ đối phương chấp nhận.
          </div>
        </div>
      )}

      {/* They sent you a request */}
      {isRequesting && !isFriend && (
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.sidebarBorder}`, textAlign: "center" }}>
          <div style={{ fontSize: 12, color: T.warning, marginBottom: 8 }}>
            Người này đã gửi lời mời kết bạn cho bạn!
          </div>
          <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onAccept}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: T.accent, color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <Check size={13} /> Chấp nhận
            </button>
            <button onClick={onReject}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, background: "rgba(239,68,68,0.1)", color: T.error, border: `1px solid rgba(239,68,68,0.2)`, cursor: "pointer", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <X size={13} /> Từ chối
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
