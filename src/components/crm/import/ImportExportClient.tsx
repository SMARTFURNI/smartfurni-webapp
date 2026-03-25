"use client";

import { useState, useRef } from "react";
import {
  Upload, Download, FileText, CheckCircle2, AlertTriangle,
  RefreshCw, Table, MessageSquare, Save, Eye, EyeOff,
  Zap, Phone, Globe, Key,
} from "lucide-react";

// ─── Import/Export Tab ────────────────────────────────────────────────────────

function ImportExportTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const CSV_TEMPLATE = `Tên khách hàng,Điện thoại,Email,Loại khách hàng,Giai đoạn,Tỉnh/Thành phố,Quận/Huyện,Địa chỉ,Nguồn,Giá trị dự kiến,Ghi chú
Nguyễn Văn A,0901234567,a@email.com,Kiến trúc sư,Khách hàng mới,TP. Hồ Chí Minh,Quận 1,123 Nguyễn Huệ,Facebook Ads,150000000,Quan tâm sofa giường
Trần Thị B,0912345678,b@email.com,Chủ đầu tư CHDV,Đã gửi Profile,Hà Nội,Quận Hoàn Kiếm,456 Hàng Bài,KTS giới thiệu,500000000,Dự án 20 phòng`;

  const downloadTemplate = () => {
    const blob = new Blob(["\uFEFF" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "smartfurni_crm_template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) { alert("Vui lòng chọn file .csv"); return; }
    setSelectedFile(file);
    setImportResult(null);
  };

  const doImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    const res = await fetch("/api/crm/import", { method: "POST", body: formData });
    const data = await res.json();
    setImportResult(data);
    setImporting(false);
    setSelectedFile(null);
  };

  const exportLeads = (format: "csv" | "excel") => {
    window.open(`/api/crm/import?format=${format}&type=leads`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Import section */}
      <div className="p-5 rounded-2xl space-y-4"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Nhập dữ liệu từ CSV</h3>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              Nhập hàng loạt khách hàng từ file Excel/CSV
            </p>
          </div>
          <button onClick={downloadTemplate}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)" }}>
            <Download size={12} /> Tải template
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileRef.current?.click()}
          className="cursor-pointer rounded-xl p-8 text-center transition-all"
          style={{
            border: `2px dashed ${dragOver ? "rgba(201,168,76,0.5)" : "rgba(255,255,255,0.1)"}`,
            background: dragOver ? "rgba(201,168,76,0.05)" : "rgba(255,255,255,0.02)",
          }}>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.1)" }}>
                <FileText size={18} style={{ color: "#22c55e" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-white">{selectedFile.name}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
          ) : (
            <>
              <Upload size={28} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.2)" }} />
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                Kéo thả file CSV vào đây hoặc <span style={{ color: "#C9A84C" }}>click để chọn</span>
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                Hỗ trợ: .csv (UTF-8 với BOM)
              </p>
            </>
          )}
        </div>

        {selectedFile && (
          <button onClick={doImport} disabled={importing}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)", color: "#000" }}>
            {importing ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
            {importing ? "Đang nhập..." : "Bắt đầu nhập dữ liệu"}
          </button>
        )}

        {importResult && (
          <div className="p-4 rounded-xl space-y-2"
            style={{ background: importResult.errors.length === 0 ? "rgba(34,197,94,0.05)" : "rgba(251,191,36,0.05)", border: `1px solid ${importResult.errors.length === 0 ? "rgba(34,197,94,0.2)" : "rgba(251,191,36,0.2)"}` }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} style={{ color: "#22c55e" }} />
              <span className="text-sm font-semibold" style={{ color: "#22c55e" }}>
                Nhập thành công {importResult.success} khách hàng
              </span>
            </div>
            {importResult.errors.length > 0 && (
              <div className="space-y-1 mt-2">
                <p className="text-xs font-semibold" style={{ color: "#fbbf24" }}>
                  <AlertTriangle size={11} className="inline mr-1" />
                  {importResult.errors.length} dòng có lỗi:
                </p>
                {importResult.errors.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-xs pl-3" style={{ color: "rgba(255,255,255,0.4)" }}>• {e}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Export section */}
      <div className="p-5 rounded-2xl space-y-4"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div>
          <h3 className="text-sm font-bold text-white">Xuất dữ liệu</h3>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            Tải xuống toàn bộ dữ liệu CRM để backup hoặc phân tích
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Khách hàng (CSV)", icon: Table, format: "csv" as const, desc: "Toàn bộ leads + thông tin" },
            { label: "Khách hàng (Excel)", icon: FileText, format: "excel" as const, desc: "Định dạng .xlsx" },
          ].map(item => (
            <button key={item.format} onClick={() => exportLeads(item.format)}
              className="p-4 rounded-xl text-left transition-all hover:bg-white/5 group"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 mb-2">
                <item.icon size={16} style={{ color: "#C9A84C" }} />
                <span className="text-sm font-semibold text-white">{item.label}</span>
              </div>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{item.desc}</p>
              <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: "#C9A84C" }}>
                <Download size={11} /> Tải xuống
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* CSV format guide */}
      <div className="p-4 rounded-xl"
        style={{ background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.12)" }}>
        <h4 className="text-xs font-semibold mb-2" style={{ color: "#60a5fa" }}>Hướng dẫn định dạng CSV</h4>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          <div><strong style={{ color: "rgba(255,255,255,0.6)" }}>Loại KH:</strong> Kiến trúc sư | Chủ đầu tư CHDV | Đại lý</div>
          <div><strong style={{ color: "rgba(255,255,255,0.6)" }}>Giai đoạn:</strong> Khách hàng mới | Đã gửi Profile | Đã khảo sát | Đã báo giá | Thương thảo | Đã chốt | Thất bại</div>
          <div><strong style={{ color: "rgba(255,255,255,0.6)" }}>Nguồn:</strong> Facebook Ads | Google Ads | KTS giới thiệu | Zalo | Triển lãm</div>
          <div><strong style={{ color: "rgba(255,255,255,0.6)" }}>Giá trị:</strong> Số nguyên (VND), không có dấu phẩy</div>
        </div>
      </div>
    </div>
  );
}

// ─── Zalo OA Tab ──────────────────────────────────────────────────────────────

function ZaloOATab() {
  const [config, setConfig] = useState({
    enabled: false,
    oaId: "",
    accessToken: "",
    refreshToken: "",
    appId: "",
    appSecret: "",
    webhookUrl: "",
    autoReply: true,
    autoReplyMessage: "Xin chào! Cảm ơn bạn đã liên hệ SmartFurni. Chúng tôi sẽ phản hồi trong vòng 30 phút.",
    sendQuoteNotification: true,
    sendAppointmentReminder: true,
    reminderHoursBefore: 2,
  });
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch("/api/crm/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "zalo", data: config }),
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">Tích hợp Zalo Official Account</h3>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            Gửi tin nhắn chăm sóc KH qua Zalo OA
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle2 size={12} /> Đã lưu
            </span>
          )}
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #C9A84C, #E2C97E)", color: "#000" }}>
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Lưu cài đặt
          </button>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: config.enabled ? "rgba(0,147,255,0.1)" : "rgba(255,255,255,0.04)" }}>
            <MessageSquare size={18} style={{ color: config.enabled ? "#0093FF" : "rgba(255,255,255,0.2)" }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Kích hoạt Zalo OA</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              {config.enabled ? "Đang hoạt động" : "Chưa kích hoạt"}
            </p>
          </div>
        </div>
        <button onClick={() => setConfig(c => ({ ...c, enabled: !c.enabled }))}
          className="relative w-11 h-6 rounded-full transition-all"
          style={{ background: config.enabled ? "#0093FF" : "rgba(255,255,255,0.1)" }}>
          <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
            style={{ left: config.enabled ? "calc(100% - 22px)" : "2px" }} />
        </button>
      </div>

      {/* Credentials */}
      <div className="p-5 rounded-2xl space-y-4"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
          Thông tin xác thực
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: "oaId", label: "OA ID", placeholder: "123456789", icon: Globe },
            { key: "appId", label: "App ID", placeholder: "Từ Zalo Developers", icon: Key },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>{f.label}</label>
              <div className="relative">
                <f.icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.2)" }} />
                <input value={config[f.key as keyof typeof config] as string}
                  onChange={e => setConfig(c => ({ ...c, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full pl-8 pr-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              </div>
            </div>
          ))}
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>App Secret</label>
            <div className="relative">
              <input value={config.appSecret} type={showSecret ? "text" : "password"}
                onChange={e => setConfig(c => ({ ...c, appSecret: e.target.value }))}
                placeholder="••••••••••••••••"
                className="w-full pl-3 pr-9 py-2 rounded-lg text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              <button onClick={() => setShowSecret(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "rgba(255,255,255,0.3)" }}>
                {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Access Token</label>
            <div className="relative">
              <input value={config.accessToken} type={showToken ? "text" : "password"}
                onChange={e => setConfig(c => ({ ...c, accessToken: e.target.value }))}
                placeholder="••••••••••••••••"
                className="w-full pl-3 pr-9 py-2 rounded-lg text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
              <button onClick={() => setShowToken(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "rgba(255,255,255,0.3)" }}>
                {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Auto features */}
      <div className="p-5 rounded-2xl space-y-4"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
        <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>
          Tính năng tự động
        </h4>
        {[
          { key: "autoReply", label: "Tự động trả lời tin nhắn đến", desc: "Gửi tin nhắn chào khi KH nhắn lần đầu" },
          { key: "sendQuoteNotification", label: "Thông báo khi gửi báo giá", desc: "Gửi Zalo khi tạo báo giá cho KH" },
          { key: "sendAppointmentReminder", label: "Nhắc lịch hẹn qua Zalo", desc: "Nhắc KH trước giờ hẹn" },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">{item.label}</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{item.desc}</p>
            </div>
            <button onClick={() => setConfig(c => ({ ...c, [item.key]: !c[item.key as keyof typeof c] }))}
              className="relative w-10 h-5 rounded-full transition-all flex-shrink-0"
              style={{ background: config[item.key as keyof typeof config] ? "#C9A84C" : "rgba(255,255,255,0.1)" }}>
              <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                style={{ left: config[item.key as keyof typeof config] ? "calc(100% - 18px)" : "2px" }} />
            </button>
          </div>
        ))}

        {config.autoReply && (
          <div>
            <label className="block text-xs mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Nội dung tin nhắn tự động</label>
            <textarea value={config.autoReplyMessage}
              onChange={e => setConfig(c => ({ ...c, autoReplyMessage: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          </div>
        )}
      </div>

      {/* Guide */}
      <div className="p-4 rounded-xl"
        style={{ background: "rgba(0,147,255,0.04)", border: "1px solid rgba(0,147,255,0.12)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Zap size={13} style={{ color: "#0093FF" }} />
          <span className="text-xs font-semibold" style={{ color: "#0093FF" }}>Hướng dẫn lấy credentials</span>
        </div>
        <ol className="text-xs space-y-1 pl-4 list-decimal" style={{ color: "rgba(255,255,255,0.4)" }}>
          <li>Đăng ký tài khoản tại <strong style={{ color: "#0093FF" }}>developers.zalo.me</strong></li>
          <li>Tạo ứng dụng mới → chọn loại <strong style={{ color: "rgba(255,255,255,0.6)" }}>Official Account</strong></li>
          <li>Vào mục <strong style={{ color: "rgba(255,255,255,0.6)" }}>Cài đặt → Thông tin ứng dụng</strong> để lấy App ID và App Secret</li>
          <li>Lấy Access Token tại <strong style={{ color: "rgba(255,255,255,0.6)" }}>Công cụ → Tạo Access Token</strong></li>
          <li>Cấu hình Webhook URL: <code className="text-[10px] px-1 rounded" style={{ background: "rgba(255,255,255,0.08)", color: "#C9A84C" }}>/api/crm/webhook/zalo</code></li>
        </ol>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type TabId = "import" | "zalo";

export default function ImportExportClient() {
  const [tab, setTab] = useState<TabId>("import");

  return (
    <div className="space-y-5" style={{ color: "#fff" }}>
      <div>
        <h1 className="text-lg font-bold text-white">Dữ liệu & Tích hợp</h1>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
          Import/Export dữ liệu và kết nối kênh bên thứ 3
        </p>
      </div>

      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {[
          { id: "import" as TabId, label: "Import / Export CSV", icon: Table },
          { id: "zalo" as TabId, label: "Zalo Official Account", icon: MessageSquare },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? "rgba(201,168,76,0.12)" : "transparent",
              color: tab === t.id ? "#C9A84C" : "rgba(255,255,255,0.4)",
            }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "import" && <ImportExportTab />}
      {tab === "zalo" && <ZaloOATab />}
    </div>
  );
}
