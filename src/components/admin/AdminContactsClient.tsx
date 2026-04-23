"use client";
import { useState } from "react";
import type { ContactMessage } from "@/lib/admin-store";

export default function AdminContactsClient({ initialContacts }: { initialContacts: ContactMessage[] }) {
  const [contacts, setContacts] = useState(initialContacts);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const filtered = contacts.filter((c) => {
    if (filter === "unread") return !c.read;
    if (filter === "read") return c.read;
    return true;
  });

  const unreadCount = contacts.filter((c) => !c.read).length;
  const [exporting, setExporting] = useState(false);

  async function handleExportCSV() {
    setExporting(true);
    try {
      const filterParam = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/admin/contacts/export${filterParam}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `smartfurni-contacts-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Lỗi khi export. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  }

  async function handleMarkRead(id: string) {
    await fetch(`/api/admin/contacts?id=${id}&action=read`, { method: "PATCH" });
    setContacts((prev) => prev.map((c) => c.id === id ? { ...c, read: true } : c));
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, read: true } : null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Xóa tin nhắn này?")) return;
    await fetch(`/api/admin/contacts?id=${id}`, { method: "DELETE" });
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function handleSelect(contact: ContactMessage) {
    setSelected(contact);
    if (!contact.read) handleMarkRead(contact.id);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Tin Nhắn Liên Hệ</h1>
          <p className="text-[rgba(245,237,214,0.55)] text-sm mt-1">
            {contacts.length} tin nhắn
            {unreadCount > 0 && <span className="text-blue-400 ml-2">· {unreadCount} chưa đọc</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="text-sm px-4 py-2 rounded-xl border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {exporting ? (
              <><span className="w-3 h-3 border border-green-400/40 border-t-green-400 rounded-full animate-spin" /> Đang xuất...</>
            ) : (
              <>📥 Export CSV{filter !== "all" ? ` (${filter === "unread" ? "chưa đọc" : "đã đọc"})` : ""}</>
            )}
          </button>
          {(["all", "unread", "read"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm px-4 py-2 rounded-xl transition-colors ${
                filter === f
                  ? "bg-[#C9A84C]/15 text-[#C9A84C] border border-[rgba(255,200,100,0.22)]"
                  : "text-[rgba(245,237,214,0.55)] hover:text-white border border-transparent"
              }`}
            >
              {f === "all" ? "Tất cả" : f === "unread" ? "Chưa đọc" : "Đã đọc"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-4 h-[calc(100vh-12rem)]">
        {/* Contact List */}
        <div className="lg:col-span-2 bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto divide-y divide-[#C9A84C]/5">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-[rgba(245,237,214,0.45)] text-sm">Không có tin nhắn</div>
            ) : (
              filtered.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleSelect(contact)}
                  className={`w-full text-left p-4 hover:bg-white/3 transition-colors ${
                    selected?.id === contact.id ? "bg-[#C9A84C]/8 border-l-2 border-[#C9A84C]" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${contact.read ? "bg-gray-700" : "bg-blue-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium truncate ${contact.read ? "text-[rgba(245,237,214,0.70)]" : "text-white"}`}>
                          {contact.name}
                        </p>
                        <span className="text-xs text-[rgba(245,237,214,0.35)] flex-shrink-0 ml-2">
                          {new Date(contact.createdAt).toLocaleDateString("vi-VN", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${contact.read ? "text-[rgba(245,237,214,0.45)]" : "text-[rgba(245,237,214,0.70)]"}`}>
                        {contact.subject}
                      </p>
                      <p className="text-xs text-[rgba(245,237,214,0.35)] truncate mt-0.5">{contact.message}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Contact Detail */}
        <div className="lg:col-span-3 bg-[#1a1200] border border-[rgba(255,200,100,0.14)] rounded-2xl overflow-hidden flex flex-col">
          {selected ? (
            <>
              <div className="p-6 border-b border-[rgba(255,200,100,0.14)]">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{selected.subject}</h2>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C] font-bold text-sm">
                        {selected.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-white">{selected.name}</p>
                        <p className="text-xs text-[rgba(245,237,214,0.55)]">{selected.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!selected.read && (
                      <button
                        onClick={() => handleMarkRead(selected.id)}
                        className="text-xs text-blue-400 hover:text-blue-300 border border-blue-400/30 px-3 py-1.5 rounded-xl transition-colors"
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(selected.id)}
                      className="text-xs text-red-400/60 hover:text-red-400 border border-red-400/20 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                <div className="bg-[#1a1200] rounded-xl p-5 mb-4">
                  <p className="text-gray-300 leading-relaxed text-sm whitespace-pre-wrap">{selected.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selected.phone && (
                    <div className="bg-[#1a1200] rounded-xl p-4">
                      <p className="text-xs text-[rgba(245,237,214,0.45)] mb-1">Số điện thoại</p>
                      <p className="text-white">{selected.phone}</p>
                    </div>
                  )}
                  <div className="bg-[#1a1200] rounded-xl p-4">
                    <p className="text-xs text-[rgba(245,237,214,0.45)] mb-1">Email</p>
                    <a href={`mailto:${selected.email}`} className="text-[#C9A84C] hover:underline text-sm">
                      {selected.email}
                    </a>
                  </div>
                  <div className="bg-[#1a1200] rounded-xl p-4">
                    <p className="text-xs text-[rgba(245,237,214,0.45)] mb-1">Thời gian gửi</p>
                    <p className="text-white text-sm">
                      {new Date(selected.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <div className="bg-[#1a1200] rounded-xl p-4">
                    <p className="text-xs text-[rgba(245,237,214,0.45)] mb-1">Trạng thái</p>
                    <span className={`text-sm ${selected.read ? "text-green-400" : "text-blue-400"}`}>
                      {selected.read ? "✓ Đã đọc" : "● Chưa đọc"}
                    </span>
                  </div>
                </div>

                {/* Reply button */}
                <div className="mt-4">
                  <a
                    href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                    className="inline-flex items-center gap-2 bg-[#C9A84C]/10 border border-[rgba(255,200,100,0.22)] text-[#C9A84C] px-4 py-2.5 rounded-xl text-sm hover:bg-[#C9A84C]/20 transition-colors"
                  >
                    <span>✉️</span> Trả lời qua Email
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-[rgba(245,237,214,0.45)] text-sm">Chọn một tin nhắn để xem chi tiết</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
