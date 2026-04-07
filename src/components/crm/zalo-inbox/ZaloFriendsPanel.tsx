"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, UserPlus, UserMinus, UserCheck, Search, RefreshCw,
  Phone, Clock, X, Check, Undo2, Tag, ChevronRight, Wifi,
  Star, AlertCircle, MessageCircle
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Friend {
  userId: string;
  displayName: string;
  zaloName: string;
  avatar: string;
  phoneNumber?: string;
}

interface FriendRequest {
  userId: string;
  displayName: string;
  avatar: string;
  requestMessage?: string;
  sentAt?: number;
}

interface SentRequest {
  userId: string;
  displayName: string;
  avatar: string;
  requestMessage?: string;
  sentAt?: number;
}

interface Recommendation {
  userId: string;
  displayName: string;
  avatar: string;
  source?: string;
}

type TabType = "friends" | "incoming" | "sent" | "recommend" | "add";

// ─── Avatar Helper ────────────────────────────────────────────────────────────

function AvatarCircle({ name, avatar, size = 40 }: { name: string; avatar?: string; size?: number }) {
  const initials = (name || "?").charAt(0).toUpperCase();
  const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (avatar) {
    return <img src={avatar} alt={name} className="rounded-full object-cover flex-shrink-0" style={{ width: size, height: size }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  }
  return (
    <div className={`${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ZaloFriendsPanelProps {
  onClose?: () => void;
  onOpenChat?: (userId: string, displayName: string) => void;
}

export default function ZaloFriendsPanel({ onClose, onOpenChat }: ZaloFriendsPanelProps) {
  const [tab, setTab] = useState<TabType>("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Add friend state
  const [phoneInput, setPhoneInput] = useState("");
  const [foundUser, setFoundUser] = useState<{ uid: string; displayName: string; avatar: string; zaloName: string } | null>(null);
  const [friendMsg, setFriendMsg] = useState("Xin chào! Tôi muốn kết bạn với bạn.");
  const [searchingPhone, setSearchingPhone] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);

  // Nickname state
  const [nicknameModal, setNicknameModal] = useState<{ userId: string; name: string } | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadFriends = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/zalo-inbox/friends?action=list${searchQuery ? `&query=${encodeURIComponent(searchQuery)}` : ""}`);
      const data = await res.json();
      if (data.success) setFriends(data.friends || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [searchQuery]);

  const loadIncoming = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/zalo-inbox/friend-requests");
      const data = await res.json();
      if (data.success) setIncomingRequests(data.requests || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const loadSent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/zalo-inbox/friends?action=sent-requests");
      const data = await res.json();
      if (data.success) setSentRequests(data.requests || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/zalo-inbox/friends?action=recommendations");
      const data = await res.json();
      if (data.success) setRecommendations(data.recommendations || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "friends") loadFriends();
    else if (tab === "incoming") loadIncoming();
    else if (tab === "sent") loadSent();
    else if (tab === "recommend") loadRecommendations();
  }, [tab, loadFriends, loadIncoming, loadSent, loadRecommendations]);

  useEffect(() => {
    if (tab === "friends") {
      const t = setTimeout(loadFriends, 300);
      return () => clearTimeout(t);
    }
  }, [searchQuery, tab, loadFriends]);

  // SSE for realtime friend events
  useEffect(() => {
    const es = new EventSource("/api/crm/zalo-inbox/sse");
    es.addEventListener("friend_event", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "request") {
          showToast(`${data.displayName || "Ai đó"} muốn kết bạn với bạn!`);
          if (tab === "incoming") loadIncoming();
        } else if (data.type === "accepted") {
          showToast(`${data.displayName || "Ai đó"} đã chấp nhận lời mời kết bạn!`);
          if (tab === "friends") loadFriends();
          if (tab === "sent") loadSent();
        }
      } catch { /* ignore */ }
    });
    return () => es.close();
  }, [tab, loadIncoming, loadFriends, loadSent]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleAccept = async (userId: string) => {
    const res = await fetch("/api/crm/zalo-inbox/friend-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept", userId }) });
    const data = await res.json();
    if (data.success) { showToast("Đã chấp nhận lời mời kết bạn"); loadIncoming(); }
    else showToast(data.error || "Lỗi", "error");
  };

  const handleReject = async (userId: string) => {
    const res = await fetch("/api/crm/zalo-inbox/friend-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject", userId }) });
    const data = await res.json();
    if (data.success) { showToast("Đã từ chối lời mời"); loadIncoming(); }
    else showToast(data.error || "Lỗi", "error");
  };

  const handleUndoRequest = async (userId: string) => {
    const res = await fetch("/api/crm/zalo-inbox/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "undo-request", userId }) });
    const data = await res.json();
    if (data.success) { showToast("Đã thu hồi lời mời"); loadSent(); }
    else showToast(data.error || "Lỗi", "error");
  };

  const handleUnfriend = async (userId: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn hủy kết bạn với ${name}?`)) return;
    const res = await fetch("/api/crm/zalo-inbox/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "unfriend", userId }) });
    const data = await res.json();
    if (data.success) { showToast("Đã hủy kết bạn"); loadFriends(); }
    else showToast(data.error || "Lỗi", "error");
  };

  const handleSetNickname = async () => {
    if (!nicknameModal || !nicknameInput.trim()) return;
    const res = await fetch("/api/crm/zalo-inbox/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "set-nickname", userId: nicknameModal.userId, nickname: nicknameInput.trim() }) });
    const data = await res.json();
    if (data.success) { showToast("Đã đặt biệt danh"); setNicknameModal(null); loadFriends(); }
    else showToast(data.error || "Lỗi", "error");
  };

  const handleSendFriendRequest = async () => {
    if (!foundUser) return;
    setSendingRequest(true);
    try {
      const res = await fetch("/api/crm/zalo-inbox/friend-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", userId: foundUser.uid, message: friendMsg }) });
      const data = await res.json();
      if (data.success) { showToast("Đã gửi lời mời kết bạn!"); setFoundUser(null); setPhoneInput(""); }
      else showToast(data.error || "Lỗi gửi lời mời", "error");
    } finally { setSendingRequest(false); }
  };

  const handleSearchPhone = async () => {
    if (!phoneInput.trim()) return;
    setSearchingPhone(true);
    setFoundUser(null);
    try {
      const res = await fetch(`/api/crm/zalo-inbox/find-user?phone=${encodeURIComponent(phoneInput.trim())}`);
      const data = await res.json();
      if (data.success && data.user) setFoundUser(data.user);
      else showToast(data.error || "Không tìm thấy người dùng", "error");
    } finally { setSearchingPhone(false); }
  };

  // ── Tab Buttons ───────────────────────────────────────────────────────────────

  const tabs: { key: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "friends", label: "Bạn bè", icon: <Users size={14} /> },
    { key: "incoming", label: "Lời mời", icon: <UserPlus size={14} />, badge: incomingRequests.length },
    { key: "sent", label: "Đã gửi", icon: <Clock size={14} /> },
    { key: "recommend", label: "Gợi ý", icon: <Star size={14} /> },
    { key: "add", label: "Kết bạn", icon: <Phone size={14} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Quản lý bạn bè</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { if (tab === "friends") loadFriends(); else if (tab === "incoming") loadIncoming(); else if (tab === "sent") loadSent(); else if (tab === "recommend") loadRecommendations(); }} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500" title="Làm mới">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
            {t.icon}
            {t.label}
            {t.badge ? <span className="bg-red-500 text-white text-[10px] rounded-full px-1 min-w-[16px] text-center">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* Friends List */}
        {tab === "friends" && (
          <div>
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm kiếm bạn bè..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-gray-400" /></div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Users size={32} className="mx-auto mb-2 opacity-40" />
                {searchQuery ? "Không tìm thấy bạn bè" : "Chưa có bạn bè"}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <div className="px-4 py-2 text-xs text-gray-400">{friends.length} bạn bè</div>
                {friends.map(f => (
                  <div key={f.userId} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 group">
                    <div
                      onClick={() => onOpenChat && onOpenChat(f.userId, f.displayName)}
                      style={{ cursor: onOpenChat ? "pointer" : "default" }}
                    >
                      <AvatarCircle name={f.displayName} avatar={f.avatar} size={38} />
                    </div>
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => onOpenChat && onOpenChat(f.userId, f.displayName)}
                      style={{ cursor: onOpenChat ? "pointer" : "default" }}
                    >
                      <div className="font-medium text-sm text-gray-900 dark:text-white truncate hover:text-blue-500 transition-colors">{f.displayName}</div>
                      {f.zaloName && f.zaloName !== f.displayName && <div className="text-xs text-gray-400 truncate">@{f.zaloName}</div>}
                      {f.phoneNumber && <div className="text-xs text-gray-400">{f.phoneNumber}</div>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onOpenChat && (
                        <button onClick={() => onOpenChat(f.userId, f.displayName)} className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-500" title="Nhắn tin">
                          <MessageCircle size={14} />
                        </button>
                      )}
                      <button onClick={() => { setNicknameModal({ userId: f.userId, name: f.displayName }); setNicknameInput(""); }} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400" title="Đặt biệt danh">
                        <Tag size={14} />
                      </button>
                      <button onClick={() => handleUnfriend(f.userId, f.displayName)} className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-400" title="Hủy kết bạn">
                        <UserMinus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Incoming Requests */}
        {tab === "incoming" && (
          <div>
            {loading ? (
              <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-gray-400" /></div>
            ) : incomingRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <UserPlus size={32} className="mx-auto mb-2 opacity-40" />
                Không có lời mời kết bạn
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <div className="px-4 py-2 text-xs text-gray-400">{incomingRequests.length} lời mời đang chờ</div>
                {incomingRequests.map(req => (
                  <div key={req.userId} className="flex items-start gap-3 px-4 py-3">
                    <AvatarCircle name={req.displayName} avatar={req.avatar} size={42} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{req.displayName}</div>
                      {req.requestMessage && <div className="text-xs text-gray-500 mt-0.5 italic">"{req.requestMessage}"</div>}
                      {req.sentAt && <div className="text-xs text-gray-400 mt-0.5">{new Date(req.sentAt).toLocaleDateString("vi-VN")}</div>}
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleAccept(req.userId)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg font-medium">
                          <Check size={12} /> Chấp nhận
                        </button>
                        <button onClick={() => handleReject(req.userId)} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-lg font-medium">
                          <X size={12} /> Từ chối
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sent Requests */}
        {tab === "sent" && (
          <div>
            {loading ? (
              <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-gray-400" /></div>
            ) : sentRequests.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Clock size={32} className="mx-auto mb-2 opacity-40" />
                Chưa có lời mời nào đang chờ
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <div className="px-4 py-2 text-xs text-gray-400">{sentRequests.length} lời mời đang chờ phản hồi</div>
                {sentRequests.map(req => (
                  <div key={req.userId} className="flex items-center gap-3 px-4 py-3">
                    <AvatarCircle name={req.displayName} avatar={req.avatar} size={38} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{req.displayName}</div>
                      {req.sentAt && <div className="text-xs text-gray-400">Gửi lúc {new Date(req.sentAt).toLocaleDateString("vi-VN")}</div>}
                    </div>
                    <button onClick={() => handleUndoRequest(req.userId)} className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Undo2 size={12} /> Thu hồi
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recommendations */}
        {tab === "recommend" && (
          <div>
            {loading ? (
              <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-gray-400" /></div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Star size={32} className="mx-auto mb-2 opacity-40" />
                Không có gợi ý kết bạn
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                <div className="px-4 py-2 text-xs text-gray-400">Gợi ý từ Zalo</div>
                {recommendations.map(rec => (
                  <div key={rec.userId} className="flex items-center gap-3 px-4 py-3">
                    <AvatarCircle name={rec.displayName} avatar={rec.avatar} size={38} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{rec.displayName}</div>
                      {rec.source && <div className="text-xs text-gray-400">{rec.source}</div>}
                    </div>
                    <button onClick={async () => {
                      const res = await fetch("/api/crm/zalo-inbox/friend-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send", userId: rec.userId, message: "Xin chào! Tôi muốn kết bạn với bạn." }) });
                      const data = await res.json();
                      if (data.success) { showToast("Đã gửi lời mời!"); loadRecommendations(); }
                      else showToast(data.error || "Lỗi", "error");
                    }} className="flex items-center gap-1 px-2 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                      <UserPlus size={12} /> Kết bạn
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add Friend by Phone */}
        {tab === "add" && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Số điện thoại</label>
              <div className="flex gap-2">
                <input value={phoneInput} onChange={e => setPhoneInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSearchPhone()} placeholder="Nhập số điện thoại..." className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <button onClick={handleSearchPhone} disabled={searchingPhone || !phoneInput.trim()} className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm rounded-lg flex items-center gap-1">
                  {searchingPhone ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  Tìm
                </button>
              </div>
            </div>

            {foundUser && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <AvatarCircle name={foundUser.displayName} avatar={foundUser.avatar} size={48} />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{foundUser.displayName}</div>
                    {foundUser.zaloName && <div className="text-xs text-gray-400">@{foundUser.zaloName}</div>}
                    <div className="text-xs text-gray-400">ID: {foundUser.uid}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Lời nhắn</label>
                  <textarea value={friendMsg} onChange={e => setFriendMsg(e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
                </div>
                <button onClick={handleSendFriendRequest} disabled={sendingRequest} className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2">
                  {sendingRequest ? <RefreshCw size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  Gửi lời mời kết bạn
                </button>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>Nhập số điện thoại đã đăng ký Zalo để tìm kiếm và gửi lời mời kết bạn.</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nickname Modal */}
      {nicknameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 w-80 shadow-xl">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Đặt biệt danh</h3>
            <p className="text-xs text-gray-500 mb-3">Cho {nicknameModal.name}</p>
            <input value={nicknameInput} onChange={e => setNicknameInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSetNickname()} placeholder="Nhập biệt danh..." autoFocus className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 mb-3" />
            <div className="flex gap-2">
              <button onClick={() => setNicknameModal(null)} className="flex-1 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Hủy</button>
              <button onClick={handleSetNickname} className="flex-1 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white flex items-center gap-2 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <UserCheck size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
