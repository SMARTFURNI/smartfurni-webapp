"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Plus, Search, RefreshCw, X, Settings, Link, UserPlus,
  UserMinus, Crown, Shield, LogOut, Trash2, ChevronRight,
  Copy, ExternalLink, AlertCircle, Hash
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Group {
  groupId: string;
  name: string;
  desc?: string;
  totalMember?: number;
  maxMember?: number;
  creatorId?: string;
  adminIds?: string[];
  avatar?: string;
}

interface GroupInvite {
  groupId: string;
  name?: string;
  inviterId?: string;
}

// ─── Avatar Helper ────────────────────────────────────────────────────────────

function GroupAvatar({ name, avatar, size = 40 }: { name: string; avatar?: string; size?: number }) {
  const initials = (name || "?").substring(0, 2).toUpperCase();
  const colors = ["bg-indigo-500", "bg-teal-500", "bg-orange-500", "bg-pink-500", "bg-cyan-500"];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (avatar) {
    return <img src={avatar} alt={name} className="rounded-xl object-cover flex-shrink-0" style={{ width: size, height: size }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  }
  return (
    <div className={`${color} rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0`} style={{ width: size, height: size, fontSize: size * 0.3 }}>
      {initials}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ZaloGroupsPanelProps {
  onClose?: () => void;
  onOpenGroupChat?: (groupId: string, name: string) => void;
}

export default function ZaloGroupsPanel({ onClose, onOpenGroupChat }: ZaloGroupsPanelProps) {
  const [tab, setTab] = useState<"list" | "invites" | "create" | "join">("list");
  const [groups, setGroups] = useState<Group[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupLink, setGroupLink] = useState<string | null>(null);

  // Create group state
  const [createName, setCreateName] = useState("");
  const [createMemberIds, setCreateMemberIds] = useState("");

  // Join by link state
  const [joinLink, setJoinLink] = useState("");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadGroups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/zalo-inbox/groups?action=list${searchQuery ? `&query=${encodeURIComponent(searchQuery)}` : ""}`);
      const data = await res.json();
      if (data.success) setGroups(data.groups || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [searchQuery]);

  const loadInvites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/zalo-inbox/groups?action=invites");
      const data = await res.json();
      if (data.success) setInvites(data.invites || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "list") loadGroups();
    else if (tab === "invites") loadInvites();
  }, [tab, loadGroups, loadInvites]);

  useEffect(() => {
    if (tab === "list") {
      const t = setTimeout(loadGroups, 300);
      return () => clearTimeout(t);
    }
  }, [searchQuery, tab, loadGroups]);

  const handleGetLink = async (groupId: string) => {
    const res = await fetch(`/api/crm/zalo-inbox/groups?action=link&groupId=${groupId}`);
    const data = await res.json();
    if (data.success && data.link) setGroupLink(data.link);
    else {
      // Try enabling link
      const res2 = await fetch("/api/crm/zalo-inbox/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "enable-link", groupId }) });
      const data2 = await res2.json();
      if (data2.success && data2.link) setGroupLink(data2.link);
      else showToast(data2.error || "Lỗi lấy link nhóm", "error");
    }
  };

  const handleCreateGroup = async () => {
    const memberIds = createMemberIds.split(",").map(s => s.trim()).filter(Boolean);
    if (memberIds.length < 2) { showToast("Cần ít nhất 2 thành viên", "error"); return; }
    const res = await fetch("/api/crm/zalo-inbox/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name: createName.trim() || undefined, memberIds }) });
    const data = await res.json();
    if (data.success) { showToast("Đã tạo nhóm thành công!"); setCreateName(""); setCreateMemberIds(""); setTab("list"); loadGroups(); }
    else showToast(data.error || "Lỗi tạo nhóm", "error");
  };

  const handleJoinByLink = async () => {
    if (!joinLink.trim()) return;
    const res = await fetch("/api/crm/zalo-inbox/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join-link", link: joinLink.trim() }) });
    const data = await res.json();
    if (data.success) { showToast("Đã tham gia nhóm!"); setJoinLink(""); setTab("list"); loadGroups(); }
    else showToast(data.error || "Lỗi tham gia nhóm", "error");
  };

  const handleAcceptInvite = async (groupId: string) => {
    const res = await fetch("/api/crm/zalo-inbox/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "join-invite", groupId }) });
    const data = await res.json();
    if (data.success) { showToast("Đã tham gia nhóm!"); loadInvites(); loadGroups(); }
    else showToast(data.error || "Lỗi", "error");
  };

  const handleLeaveGroup = async (groupId: string, name: string) => {
    if (!confirm(`Rời khỏi nhóm "${name}"?`)) return;
    const res = await fetch("/api/crm/zalo-inbox/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "leave", groupId }) });
    const data = await res.json();
    if (data.success) { showToast("Đã rời nhóm"); setSelectedGroup(null); loadGroups(); }
    else showToast(data.error || "Lỗi", "error");
  };

  const tabs = [
    { key: "list" as const, label: "Nhóm của tôi", icon: <Users size={13} /> },
    { key: "invites" as const, label: "Lời mời", icon: <UserPlus size={13} />, badge: invites.length },
    { key: "create" as const, label: "Tạo nhóm", icon: <Plus size={13} /> },
    { key: "join" as const, label: "Tham gia", icon: <Link size={13} /> },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Quản lý nhóm</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => tab === "list" ? loadGroups() : loadInvites()} className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.08)] dark:hover:bg-gray-800 text-gray-500">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {onClose && <button onClick={onClose} className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.08)] dark:hover:bg-gray-800 text-gray-500"><X size={14} /></button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
            {t.icon} {t.label}
            {t.badge ? <span className="bg-red-500 text-white text-[10px] rounded-full px-1 min-w-[16px] text-center">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* Groups List */}
        {tab === "list" && (
          <div>
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm kiếm nhóm..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-[rgba(255,255,255,0.04)] dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-gray-400" /></div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Users size={32} className="mx-auto mb-2 opacity-40" />
                {searchQuery ? "Không tìm thấy nhóm" : "Chưa có nhóm nào"}
              </div>
            ) : (
              <div className="divide-y divide-[rgba(255,255,255,0.06)] dark:divide-gray-800">
                <div className="px-4 py-2 text-xs text-gray-400">{groups.length} nhóm</div>
                {groups.map(g => (
                  <div key={g.groupId} className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.05)] dark:hover:bg-gray-800 group cursor-pointer" onClick={() => setSelectedGroup(selectedGroup?.groupId === g.groupId ? null : g)}>
                    <GroupAvatar name={g.name} avatar={g.avatar} size={40} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{g.name}</div>
                      <div className="text-xs text-gray-400">{g.totalMember || 0} thành viên{g.maxMember ? ` / ${g.maxMember}` : ""}</div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {onOpenGroupChat && (
                        <button onClick={e => { e.stopPropagation(); onOpenGroupChat(g.groupId, g.name); }} className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-500" title="Mở chat nhóm">
                          <ChevronRight size={14} />
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); handleGetLink(g.groupId); }} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400" title="Lấy link nhóm">
                        <Link size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {/* Group detail panel */}
                {selectedGroup && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800 px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{selectedGroup.name}</span>
                      <button onClick={() => setSelectedGroup(null)} className="text-blue-400 hover:text-blue-600"><X size={12} /></button>
                    </div>
                    {selectedGroup.desc && <p className="text-xs text-blue-600 dark:text-blue-400">{selectedGroup.desc}</p>}
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleGetLink(selectedGroup.groupId)} className="flex items-center gap-1 px-2 py-1 text-xs bg-[rgba(255,255,255,0.07)] dark:bg-gray-800 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50">
                        <Link size={11} /> Lấy link
                      </button>
                      <button onClick={() => handleLeaveGroup(selectedGroup.groupId, selectedGroup.name)} className="flex items-center gap-1 px-2 py-1 text-xs bg-[rgba(255,255,255,0.07)] dark:bg-gray-800 border border-red-200 dark:border-red-700 text-red-500 rounded-lg hover:bg-red-50">
                        <LogOut size={11} /> Rời nhóm
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Invites */}
        {tab === "invites" && (
          <div>
            {loading ? (
              <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-gray-400" /></div>
            ) : invites.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <UserPlus size={32} className="mx-auto mb-2 opacity-40" />
                Không có lời mời vào nhóm
              </div>
            ) : (
              <div className="divide-y divide-[rgba(255,255,255,0.06)] dark:divide-gray-800">
                {invites.map((inv, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                      <Users size={18} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 dark:text-white">{inv.name || `Nhóm ${inv.groupId}`}</div>
                      {inv.inviterId && <div className="text-xs text-gray-400">Được mời bởi {inv.inviterId}</div>}
                    </div>
                    <button onClick={() => handleAcceptInvite(inv.groupId)} className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg">
                      Tham gia
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Group */}
        {tab === "create" && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tên nhóm (tùy chọn)</label>
              <input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Nhập tên nhóm..." className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Thành viên (ID Zalo, cách nhau bởi dấu phẩy)</label>
              <textarea value={createMemberIds} onChange={e => setCreateMemberIds(e.target.value)} rows={3} placeholder="userId1, userId2, userId3..." className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
              <p className="text-xs text-gray-400 mt-1">Cần ít nhất 2 thành viên</p>
            </div>
            <button onClick={handleCreateGroup} className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2">
              <Plus size={14} /> Tạo nhóm
            </button>
          </div>
        )}

        {/* Join by Link */}
        {tab === "join" && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Link tham gia nhóm</label>
              <input value={joinLink} onChange={e => setJoinLink(e.target.value)} onKeyDown={e => e.key === "Enter" && handleJoinByLink()} placeholder="Dán link nhóm vào đây..." className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <button onClick={handleJoinByLink} disabled={!joinLink.trim()} className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2">
              <ExternalLink size={14} /> Tham gia nhóm
            </button>
          </div>
        )}
      </div>

      {/* Group Link Modal */}
      {groupLink && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 w-80 shadow-xl">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Link tham gia nhóm</h3>
            <div className="flex gap-2">
              <input readOnly value={groupLink} className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-[rgba(255,255,255,0.04)] dark:bg-gray-800 text-gray-900 dark:text-white" />
              <button onClick={() => { navigator.clipboard.writeText(groupLink); showToast("Đã sao chép link!"); setGroupLink(null); }} className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg">
                <Copy size={14} />
              </button>
            </div>
            <button onClick={() => setGroupLink(null)} className="w-full mt-3 py-2 text-sm text-gray-500 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-[rgba(255,255,255,0.05)] dark:hover:bg-gray-800">Đóng</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white flex items-center gap-2 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <Users size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
