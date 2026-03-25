"use client";
import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Send, Users, Settings, CheckCircle,
  AlertCircle, RefreshCw, Plus, Eye, Clock, Zap, Phone
} from "lucide-react";

interface ZaloConfig {
  oaId: string;
  accessToken: string;
  secretKey: string;
  webhookUrl: string;
  isActive: boolean;
  templates: ZaloTemplate[];
}

interface ZaloTemplate {
  id: string;
  name: string;
  type: "greeting" | "followup" | "quote_sent" | "contract_signed" | "nps" | "reminder";
  content: string;
  isActive: boolean;
}

interface ZaloMessage {
  id: string;
  leadName: string;
  phone: string;
  message: string;
  status: "sent" | "delivered" | "failed" | "pending";
  sentAt: string;
  type: string;
}

const TYPE_LABELS: Record<string, string> = {
  greeting: "Chào hỏi",
  followup: "Follow-up",
  quote_sent: "Đã gửi báo giá",
  contract_signed: "Ký hợp đồng",
  nps: "Khảo sát NPS",
  reminder: "Nhắc lịch hẹn",
};

const DEFAULT_TEMPLATES: ZaloTemplate[] = [
  {
    id: "t1", name: "Chào hỏi khách mới", type: "greeting", isActive: true,
    content: "Xin chào {name}! Cảm ơn bạn đã quan tâm đến sản phẩm SmartFurni. Chúng tôi sẽ liên hệ với bạn trong thời gian sớm nhất. Trân trọng!"
  },
  {
    id: "t2", name: "Gửi báo giá", type: "quote_sent", isActive: true,
    content: "Xin chào {name}! SmartFurni đã gửi báo giá #{quote_id} cho bạn. Tổng giá trị: {total}. Báo giá có hiệu lực trong 30 ngày. Vui lòng liên hệ nếu cần tư vấn thêm."
  },
  {
    id: "t3", name: "Nhắc follow-up", type: "followup", isActive: true,
    content: "Xin chào {name}! SmartFurni muốn hỏi thăm về nhu cầu nội thất của bạn. Bạn có cần chúng tôi hỗ trợ thêm thông tin về sản phẩm không?"
  },
  {
    id: "t4", name: "Xác nhận hợp đồng", type: "contract_signed", isActive: true,
    content: "Xin chào {name}! Hợp đồng #{contract_id} đã được ký thành công. SmartFurni sẽ liên hệ để sắp xếp lịch giao hàng và lắp đặt. Cảm ơn bạn đã tin tưởng!"
  },
  {
    id: "t5", name: "Khảo sát NPS", type: "nps", isActive: true,
    content: "Xin chào {name}! SmartFurni muốn lắng nghe trải nghiệm của bạn. Vui lòng dành 2 phút đánh giá dịch vụ tại: {nps_link}"
  },
  {
    id: "t6", name: "Nhắc lịch hẹn", type: "reminder", isActive: true,
    content: "Xin chào {name}! Nhắc nhở: Bạn có lịch hẹn với SmartFurni vào {date} lúc {time}. Địa điểm: {location}. Vui lòng xác nhận hoặc liên hệ để thay đổi lịch."
  },
];

export default function ZaloOAClient() {
  const [config, setConfig] = useState<ZaloConfig>({
    oaId: "", accessToken: "", secretKey: "", webhookUrl: "",
    isActive: false, templates: DEFAULT_TEMPLATES,
  });
  const [messages, setMessages] = useState<ZaloMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "templates" | "messages" | "settings">("overview");
  const [saving, setSaving] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendForm, setSendForm] = useState({ phone: "", leadName: "", templateId: "t1" });
  const [editingTemplate, setEditingTemplate] = useState<ZaloTemplate | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/zalo");
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
        if (data.messages) setMessages(data.messages);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSaveConfig() {
    setSaving(true);
    try {
      await fetch("/api/crm/zalo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
    } finally { setSaving(false); }
  }

  async function handleSendMessage() {
    setSaving(true);
    try {
      await fetch("/api/crm/zalo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sendForm),
      });
      setShowSendModal(false);
      load();
    } finally { setSaving(false); }
  }

  const stats = {
    total: messages.length,
    sent: messages.filter(m => m.status === "sent" || m.status === "delivered").length,
    failed: messages.filter(m => m.status === "failed").length,
    pending: messages.filter(m => m.status === "pending").length,
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <MessageSquare size={20} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Zalo OA</h1>
              <p className="text-sm text-gray-500">Chăm sóc khách hàng qua Zalo Official Account</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border ${config.isActive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-gray-500/10 border-gray-500/20 text-gray-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${config.isActive ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
              {config.isActive ? "Đang hoạt động" : "Chưa kết nối"}
            </div>
            <button onClick={() => setShowSendModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-gray-900 text-sm font-medium hover:bg-blue-600 transition-colors">
              <Send size={14} /> Gửi tin nhắn
            </button>
          </div>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {[
            { id: "overview", label: "Tổng quan", icon: <Zap size={13} /> },
            { id: "templates", label: "Mẫu tin nhắn", icon: <MessageSquare size={13} /> },
            { id: "messages", label: "Lịch sử gửi", icon: <Clock size={13} /> },
            { id: "settings", label: "Cài đặt", icon: <Settings size={13} /> },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all ${tab === t.id ? "bg-blue-500 text-gray-900 font-medium" : "text-gray-500 hover:text-gray-900"}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Overview */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "Tổng tin nhắn", value: stats.total, color: "text-gray-900", bg: "bg-gray-50" },
                { label: "Đã gửi thành công", value: stats.sent, color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/10" },
                { label: "Thất bại", value: stats.failed, color: "text-red-400", bg: "bg-red-500/5 border-red-500/10" },
                { label: "Đang chờ", value: stats.pending, color: "text-yellow-400", bg: "bg-yellow-500/5 border-yellow-500/10" },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-4 border border-gray-200 ${s.bg}`}>
                  <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Gửi nhanh theo sự kiện</h3>
              <div className="grid grid-cols-2 gap-3">
                {DEFAULT_TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSendForm(p => ({ ...p, templateId: t.id })); setShowSendModal(true); }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 hover:border-blue-500/30 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <Send size={14} className="text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm text-gray-900 font-medium">{t.name}</div>
                      <div className="text-xs text-gray-500">{TYPE_LABELS[t.type]}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Setup guide */}
            {!config.isActive && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-blue-400 mb-3">Hướng dẫn kết nối Zalo OA</h3>
                <ol className="space-y-2 text-sm text-gray-500">
                  <li className="flex gap-2"><span className="text-blue-400 font-bold">1.</span> Đăng nhập <a href="https://oa.zalo.me" target="_blank" className="text-blue-400 underline">oa.zalo.me</a> và tạo Official Account</li>
                  <li className="flex gap-2"><span className="text-blue-400 font-bold">2.</span> Vào Cài đặt → API → Tạo ứng dụng → Lấy OA ID và Access Token</li>
                  <li className="flex gap-2"><span className="text-blue-400 font-bold">3.</span> Điền thông tin vào tab Cài đặt bên dưới</li>
                  <li className="flex gap-2"><span className="text-blue-400 font-bold">4.</span> Cấu hình Webhook URL để nhận tin nhắn từ khách</li>
                </ol>
                <button onClick={() => setTab("settings")} className="mt-4 px-4 py-2 rounded-lg bg-blue-500 text-gray-900 text-sm font-medium hover:bg-blue-600 transition-colors">
                  Cài đặt ngay
                </button>
              </div>
            )}
          </div>
        )}

        {/* Templates */}
        {tab === "templates" && (
          <div className="space-y-3">
            {config.templates.map(t => (
              <div key={t.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">{t.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">{TYPE_LABELS[t.type]}</span>
                      {!t.isActive && <span className="px-2 py-0.5 rounded-full text-xs bg-gray-500/10 text-gray-500 border border-gray-500/20">Tắt</span>}
                    </div>
                    <p className="text-sm text-gray-500 leading-relaxed">{t.content}</p>
                    <p className="text-xs text-gray-600 mt-2">Biến: {"{name}"}, {"{phone}"}, {"{quote_id}"}, {"{contract_id}"}, {"{nps_link}"}, {"{date}"}, {"{time}"}</p>
                  </div>
                  <button onClick={() => setEditingTemplate(t)} className="p-2 rounded-lg bg-white text-gray-500 hover:text-gray-900 transition-colors flex-shrink-0">
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Messages history */}
        {tab === "messages" && (
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <MessageSquare size={32} className="mb-3 opacity-30" />
                <p className="text-sm">Chưa có tin nhắn nào được gửi</p>
              </div>
            ) : messages.map(m => (
              <div key={m.id} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Phone size={14} className="text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{m.leadName}</div>
                      <div className="text-xs text-gray-500">{m.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${
                      m.status === "delivered" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      m.status === "sent" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                      m.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    }`}>
                      {m.status === "delivered" ? "Đã nhận" : m.status === "sent" ? "Đã gửi" : m.status === "failed" ? "Thất bại" : "Đang gửi"}
                    </span>
                    <span className="text-xs text-gray-600">{new Date(m.sentAt).toLocaleDateString("vi-VN")}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-3 pl-11">{m.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Settings */}
        {tab === "settings" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-base font-medium text-gray-900 mb-4">Cấu hình Zalo OA</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-900">Kích hoạt Zalo OA</div>
                    <div className="text-xs text-gray-500">Bật để gửi tin nhắn tự động qua Zalo</div>
                  </div>
                  <button
                    onClick={() => setConfig(c => ({ ...c, isActive: !c.isActive }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${config.isActive ? "bg-blue-500" : "bg-gray-100"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${config.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
                {[
                  { key: "oaId", label: "OA ID", placeholder: "Zalo Official Account ID" },
                  { key: "accessToken", label: "Access Token", placeholder: "Token từ Zalo Developer" },
                  { key: "secretKey", label: "Secret Key", placeholder: "Secret key để verify webhook" },
                  { key: "webhookUrl", label: "Webhook URL", placeholder: "https://your-domain.com/api/crm/zalo" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs text-gray-500 mb-1.5">{f.label}</label>
                    <input
                      type={f.key.includes("Token") || f.key.includes("Key") ? "password" : "text"}
                      value={(config as unknown as Record<string, string>)[f.key]}
                      onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                ))}
              </div>
              <button onClick={handleSaveConfig} disabled={saving}
                className="mt-4 px-4 py-2 rounded-lg bg-blue-500 text-gray-900 text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
                {saving ? "Đang lưu..." : "Lưu cấu hình"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Send Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Gửi tin nhắn Zalo</h2>
              <button onClick={() => setShowSendModal(false)} className="text-gray-500 hover:text-gray-900">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Mẫu tin nhắn</label>
                <select value={sendForm.templateId} onChange={e => setSendForm(p => ({ ...p, templateId: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500/50">
                  {config.templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              {[
                { key: "leadName", label: "Tên khách hàng *", placeholder: "Nguyễn Văn A" },
                { key: "phone", label: "Số điện thoại Zalo *", placeholder: "0901234567" },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 mb-1.5">{f.label}</label>
                  <input value={(sendForm as Record<string, string>)[f.key]}
                    onChange={e => setSendForm(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              ))}
              {sendForm.templateId && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Nội dung mẫu:</p>
                  <p className="text-sm text-gray-600">{config.templates.find(t => t.id === sendForm.templateId)?.content}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setShowSendModal(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:text-gray-900 transition-colors">Hủy</button>
              <button onClick={handleSendMessage} disabled={saving || !sendForm.phone || !sendForm.leadName}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-gray-900 text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50">
                <Send size={14} /> {saving ? "Đang gửi..." : "Gửi tin nhắn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit template modal */}
      {editingTemplate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Chỉnh sửa mẫu tin nhắn</h2>
              <button onClick={() => setEditingTemplate(null)} className="text-gray-500 hover:text-gray-900">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tên mẫu</label>
                <input value={editingTemplate.name}
                  onChange={e => setEditingTemplate(t => t ? { ...t, name: e.target.value } : t)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Nội dung</label>
                <textarea value={editingTemplate.content}
                  onChange={e => setEditingTemplate(t => t ? { ...t, content: e.target.value } : t)}
                  rows={5}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500/50 resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:text-gray-900 transition-colors">Hủy</button>
              <button onClick={() => {
                setConfig(c => ({ ...c, templates: c.templates.map(t => t.id === editingTemplate.id ? editingTemplate : t) }));
                setEditingTemplate(null);
              }} className="px-4 py-2 rounded-lg bg-blue-500 text-gray-900 text-sm font-medium hover:bg-blue-600 transition-colors">
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
