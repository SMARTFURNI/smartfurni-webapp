"use client";

import { useState, useEffect, useCallback } from "react";
import { Bot, Plus, Trash2, RefreshCw, X, Clock, CheckCircle, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";

interface AutoReply {
  id: number;
  content: string;
  isEnable: boolean;
  startTime?: number;
  endTime?: number;
  scope?: number;
  createdAt?: number;
}

interface ZaloAutoReplyPanelProps {
  onClose?: () => void;
}

export default function ZaloAutoReplyPanel({ onClose }: ZaloAutoReplyPanelProps) {
  const [replies, setReplies] = useState<AutoReply[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadReplies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/zalo-inbox/auto-reply");
      const data = await res.json();
      if (data.success) setReplies(data.replies || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadReplies(); }, [loadReplies]);

  const handleCreate = async () => {
    if (!message.trim()) { showToast("Vui lòng nhập nội dung tin nhắn", "error"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/crm/zalo-inbox/auto-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          message: message.trim(),
          startTime: startTime ? new Date(startTime).getTime() : undefined,
          endTime: endTime ? new Date(endTime).getTime() : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Đã tạo auto-reply!");
        setMessage(""); setStartTime(""); setEndTime("");
        setShowCreate(false);
        loadReplies();
      } else showToast(data.error || "Lỗi tạo auto-reply", "error");
    } finally { setCreating(false); }
  };

  const handleDelete = async (replyId: number) => {
    if (!confirm("Xóa auto-reply này?")) return;
    const res = await fetch("/api/crm/zalo-inbox/auto-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", replyId }),
    });
    const data = await res.json();
    if (data.success) { showToast("Đã xóa auto-reply"); loadReplies(); }
    else showToast(data.error || "Lỗi", "error");
  };

  const formatTime = (ts?: number) => {
    if (!ts || ts === 0) return null;
    return new Date(ts).toLocaleString("vi-VN");
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Bot size={16} className="text-blue-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Trả lời tự động</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg">
            <Plus size={12} /> Thêm
          </button>
          <button onClick={loadReplies} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {onClose && <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"><X size={14} /></button>}
        </div>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-blue-50 dark:bg-blue-900/20 space-y-3">
          <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-300">Tạo auto-reply mới</h3>
          <div>
            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Nội dung tin nhắn tự động</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="Xin chào! Tôi hiện không có mặt. Tôi sẽ phản hồi sớm nhất có thể..." className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Bắt đầu (tùy chọn)</label>
              <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Kết thúc (tùy chọn)</label>
              <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 py-1.5 text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Hủy</button>
            <button onClick={handleCreate} disabled={creating || !message.trim()} className="flex-1 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-1">
              {creating ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
              Tạo
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-gray-400" /></div>
        ) : replies.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <Bot size={32} className="mx-auto mb-2 opacity-40" />
            <p>Chưa có auto-reply nào</p>
            <p className="text-xs mt-1">Nhấn "Thêm" để tạo tin nhắn tự động</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            <div className="px-4 py-2 text-xs text-gray-400">{replies.length} auto-reply</div>
            {replies.map(r => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {r.isEnable ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                        <CheckCircle size={10} /> Đang bật
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                        <X size={10} /> Tắt
                      </span>
                    )}
                  </div>
                  <button onClick={() => handleDelete(r.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
                <p className="text-sm text-gray-800 dark:text-gray-200 mt-2 leading-relaxed">{r.content}</p>
                {(r.startTime || r.endTime) && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-gray-400">
                    <Clock size={11} />
                    {formatTime(r.startTime) && <span>Từ {formatTime(r.startTime)}</span>}
                    {formatTime(r.endTime) && <span>đến {formatTime(r.endTime)}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
          <span>Auto-reply sẽ tự động trả lời khi bạn nhận tin nhắn mới trong thời gian đã cài đặt.</span>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white flex items-center gap-2 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
