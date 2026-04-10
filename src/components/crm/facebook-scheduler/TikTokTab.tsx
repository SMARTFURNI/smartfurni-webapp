"use client";
import { useState, useEffect, useRef } from "react";
import {
  RefreshCw, CheckCircle2, AlertCircle, LogOut,
  Video, Upload, X, Send, Key, Eye, EyeOff, Info,
  Music2,
} from "lucide-react";

interface TikTokStatus {
  connected: boolean;
  method?: string;
  note?: string;
  savedAt?: string;
  sessionIdHint?: string;
}

interface PublishResult {
  success: boolean;
  shareId?: string;
  error?: string;
}

const PRIVACY_OPTIONS = [
  { value: "0", label: "Công khai" },
  { value: "1", label: "Bạn bè" },
  { value: "2", label: "Chỉ mình tôi" },
];

export default function TikTokTab() {
  const [status, setStatus] = useState<TikTokStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Form nhập session
  const [sessionId, setSessionId] = useState("");
  const [msToken, setMsToken] = useState("");
  const [note, setNote] = useState("");
  const [showSessionId, setShowSessionId] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Form đăng video
  const [title, setTitle] = useState("");
  const [privacy, setPrivacy] = useState("0");
  const [disableComment, setDisableComment] = useState(false);
  const [disableDuet, setDisableDuet] = useState(false);
  const [disableStitch, setDisableStitch] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [result, setResult] = useState<PublishResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/tiktok/status");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleSaveSession = async () => {
    if (!sessionId.trim()) { alert("Vui lòng nhập Session ID"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/crm/tiktok/save-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, msToken, note }),
      });
      const data = await res.json();
      if (data.ok) {
        setSessionId("");
        setMsToken("");
        setNote("");
        await loadStatus();
      } else {
        alert(data.error || "Lỗi lưu session");
      }
    } catch (err) {
      alert("Lỗi: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Bạn có chắc muốn ngắt kết nối TikTok?")) return;
    await fetch("/api/crm/tiktok/disconnect", { method: "POST" });
    setStatus({ connected: false });
    setResult(null);
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024 * 1024) { alert("Video quá lớn (tối đa 4GB)"); return; }
    setVideoFile(file);
    setResult(null);
  };

  const handlePublish = async () => {
    if (!videoFile) { alert("Vui lòng chọn video"); return; }
    if (!title.trim()) { alert("Vui lòng nhập caption/tiêu đề"); return; }

    setUploading(true);
    setUploadProgress(0);
    setResult(null);

    try {
      // Bước 1: Khởi tạo upload session qua server (dùng session cookie)
      setUploadStatus("Đang khởi tạo upload...");
      const initRes = await fetch("/api/crm/tiktok/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init_upload", fileSize: videoFile.size }),
      });
      const initData = await initRes.json();

      if (!initData.ok) {
        throw new Error(initData.error || "Không thể khởi tạo upload. Kiểm tra lại Session ID.");
      }

      const { uploadId, uploadUrl } = initData;

      if (!uploadUrl) {
        throw new Error("TikTok không trả về upload URL. Session ID có thể đã hết hạn.");
      }

      // Bước 2: Upload video trực tiếp lên TikTok theo chunks
      const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
      const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, videoFile.size);
        const chunk = videoFile.slice(start, end);

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "video/mp4",
            "Content-Range": `bytes ${start}-${end - 1}/${videoFile.size}`,
          },
          body: chunk,
        });

        if (!uploadRes.ok && uploadRes.status !== 206) {
          throw new Error(`Upload chunk ${i + 1} thất bại (HTTP ${uploadRes.status})`);
        }

        const pct = Math.round(((i + 1) / totalChunks) * 100);
        setUploadProgress(pct);
        setUploadStatus(`Đang upload... ${pct}% (${i + 1}/${totalChunks} phần)`);
      }

      // Bước 3: Xác nhận đăng bài
      setUploadStatus("Đang xác nhận đăng bài...");
      const publishRes = await fetch("/api/crm/tiktok/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm_publish",
          uploadId,
          title: title.trim(),
          privacyLevel: parseInt(privacy),
          disableComment,
          disableDuet,
          disableStitch,
        }),
      });
      const publishData = await publishRes.json();

      if (!publishData.ok) {
        throw new Error(publishData.error || "Đăng bài thất bại");
      }

      setResult({ success: true, shareId: publishData.shareId });

    } catch (err) {
      setResult({ success: false, error: (err as Error).message });
    } finally {
      setUploading(false);
      setUploadStatus("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={20} className="animate-spin" style={{ color: "#9ca3af" }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Card kết nối TikTok ── */}
      <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#000" }}>
            <Music2 size={18} color="#fff" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Kết nối TikTok</h3>
            <p className="text-xs" style={{ color: "#9ca3af" }}>Dùng Session Cookie — không cần Developer App</p>
          </div>
        </div>

        {status?.connected ? (
          /* ── Đã kết nối ── */
          <div className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "#15803d" }}>
                Đã kết nối TikTok ✓
              </p>
              <p className="text-xs" style={{ color: "#16a34a" }}>
                Session: {status.sessionIdHint}
                {status.note ? ` · ${status.note}` : ""}
                {status.savedAt ? ` · Lưu lúc ${new Date(status.savedAt).toLocaleDateString("vi-VN")}` : ""}
              </p>
            </div>
            <button onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0"
              style={{ background: "#fef2f2", color: "#dc2626" }}>
              <LogOut size={12} /> Ngắt kết nối
            </button>
          </div>
        ) : (
          /* ── Chưa kết nối: form nhập session ── */
          <div className="space-y-4">
            <div className="p-3 rounded-xl flex items-start gap-2"
              style={{ background: "#fef9c3", border: "1px solid #fde047" }}>
              <AlertCircle size={15} style={{ color: "#ca8a04", marginTop: 1, flexShrink: 0 }} />
              <p className="text-xs" style={{ color: "#854d0e" }}>
                Nhập <strong>sessionid</strong> cookie từ trình duyệt đang đăng nhập TikTok. Admin nhập một lần, nhân viên dùng CRM đăng bài bình thường.
              </p>
            </div>

            {/* Toggle hướng dẫn */}
            <button onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-1.5 text-xs font-medium"
              style={{ color: "#2563eb" }}>
              <Info size={13} />
              {showGuide ? "Ẩn hướng dẫn" : "📋 Hướng dẫn lấy Session ID từ Chrome/Edge"}
            </button>

            {showGuide && (
              <div className="p-4 rounded-xl space-y-3 text-xs" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <p className="font-bold" style={{ color: "#1e293b" }}>Cách lấy sessionid từ Chrome hoặc Edge:</p>
                <ol className="space-y-2 list-decimal list-inside" style={{ color: "#475569" }}>
                  <li>Mở <strong>tiktok.com</strong> trên trình duyệt (đã đăng nhập sẵn)</li>
                  <li>Nhấn <strong>F12</strong> để mở DevTools</li>
                  <li>Chọn tab <strong>Application</strong> (Chrome) hoặc <strong>Storage</strong> (Edge)</li>
                  <li>Bên trái: <strong>Cookies → https://www.tiktok.com</strong></li>
                  <li>Tìm dòng có tên <strong style={{ color: "#dc2626" }}>sessionid</strong></li>
                  <li>Copy cột <strong>Value</strong> và dán vào ô bên dưới</li>
                </ol>
                <div className="p-2 rounded-lg font-mono text-xs" style={{ background: "#1e293b", color: "#94a3b8" }}>
                  sessionid = <span style={{ color: "#4ade80" }}>abc123def456xyz789...</span>
                </div>
                <p style={{ color: "#94a3b8" }}>
                  ⚠️ Cookie có hiệu lực khoảng 30–60 ngày. Khi hết hạn cần cập nhật lại.
                </p>
              </div>
            )}

            {/* Input sessionid */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                Session ID <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <div className="relative">
                <input
                  type={showSessionId ? "text" : "password"}
                  value={sessionId}
                  onChange={e => setSessionId(e.target.value)}
                  placeholder="Dán sessionid cookie vào đây..."
                  className="w-full px-3 py-2.5 pr-10 rounded-xl text-sm outline-none font-mono"
                  style={{ border: "1px solid #d1d5db", color: "#374151" }}
                />
                <button type="button" onClick={() => setShowSessionId(!showSessionId)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#9ca3af" }}>
                  {showSessionId ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* msToken (tuỳ chọn) */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#374151" }}>
                msToken <span className="font-normal" style={{ color: "#9ca3af" }}>(tuỳ chọn)</span>
              </label>
              <input
                type="password"
                value={msToken}
                onChange={e => setMsToken(e.target.value)}
                placeholder="Cookie msToken (nếu có, lấy tương tự sessionid)..."
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-mono"
                style={{ border: "1px solid #d1d5db", color: "#374151" }}
              />
            </div>

            {/* Ghi chú */}
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#374151" }}>
                Ghi chú <span className="font-normal" style={{ color: "#9ca3af" }}>(tuỳ chọn)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="VD: Tài khoản TikTok SmartFurni chính..."
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: "1px solid #d1d5db", color: "#374151" }}
              />
            </div>

            <button onClick={handleSaveSession} disabled={saving || !sessionId.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: saving || !sessionId.trim() ? "#9ca3af" : "#000" }}>
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Key size={14} />}
              {saving ? "Đang lưu..." : "Lưu kết nối TikTok"}
            </button>
          </div>
        )}
      </div>

      {/* ── Card đăng video ── */}
      {status?.connected && (
        <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
          <div className="flex items-center gap-2 mb-4">
            <Video size={16} style={{ color: "#000" }} />
            <h3 className="text-sm font-bold text-gray-900">Đăng video lên TikTok</h3>
          </div>

          <div className="space-y-4">
            {/* Caption */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                Caption / Tiêu đề <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Nhập caption cho video TikTok... #hashtag #smartfurni"
                rows={3}
                maxLength={2200}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                style={{ border: "1px solid #d1d5db", color: "#374151" }}
              />
              <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>{title.length}/2200</p>
            </div>

            {/* Chọn video */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                Video <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input ref={fileInputRef} type="file"
                accept="video/mp4,video/mov,video/avi,video/webm,video/quicktime"
                onChange={handleVideoSelect} className="hidden" />
              {videoFile ? (
                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "#15803d" }}>{videoFile.name}</p>
                    <p className="text-xs" style={{ color: "#16a34a" }}>
                      {(videoFile.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <button onClick={() => { setVideoFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className="p-1 rounded-lg" style={{ color: "#dc2626" }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-50 transition-colors"
                  style={{ border: "2px dashed #d1d5db" }}>
                  <Upload size={20} style={{ color: "#9ca3af" }} />
                  <p className="text-sm" style={{ color: "#6b7280" }}>Nhấn để chọn video</p>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>MP4, MOV, AVI, WebM · Tối đa 4GB</p>
                </button>
              )}
            </div>

            {/* Quyền riêng tư */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                Quyền riêng tư
              </label>
              <select value={privacy} onChange={e => setPrivacy(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: "1px solid #d1d5db", color: "#374151" }}>
                {PRIVACY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Tùy chọn */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Tắt bình luận", value: disableComment, setter: setDisableComment },
                { label: "Tắt Duet", value: disableDuet, setter: setDisableDuet },
                { label: "Tắt Stitch", value: disableStitch, setter: setDisableStitch },
              ].map(opt => (
                <button key={opt.label} onClick={() => opt.setter(!opt.value)}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors"
                  style={{
                    background: opt.value ? "#f0fdf4" : "#f9fafb",
                    border: `1px solid ${opt.value ? "#bbf7d0" : "#e5e7eb"}`,
                    color: opt.value ? "#15803d" : "#6b7280",
                  }}>
                  <div className="w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: opt.value ? "#16a34a" : "#d1d5db" }}>
                    {opt.value && <CheckCircle2 size={9} color="#fff" />}
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Progress bar */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs" style={{ color: "#6b7280" }}>
                  <span>{uploadStatus}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: "#f3f4f6" }}>
                  <div className="h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%`, background: "#000" }} />
                </div>
              </div>
            )}

            {/* Kết quả */}
            {result && (
              <div className="p-3 rounded-xl"
                style={{
                  background: result.success ? "#f0fdf4" : "#fef2f2",
                  border: `1px solid ${result.success ? "#bbf7d0" : "#fecaca"}`,
                }}>
                <div className="flex items-start gap-2">
                  {result.success
                    ? <CheckCircle2 size={16} style={{ color: "#16a34a", marginTop: 1 }} />
                    : <AlertCircle size={16} style={{ color: "#dc2626", marginTop: 1 }} />}
                  <div>
                    <p className="text-sm font-semibold"
                      style={{ color: result.success ? "#15803d" : "#dc2626" }}>
                      {result.success ? "Đã đăng video lên TikTok thành công! 🎉" : `Lỗi: ${result.error}`}
                    </p>
                    {result.success && (
                      <p className="text-xs mt-1" style={{ color: "#16a34a" }}>
                        Video đang được TikTok xử lý và sẽ xuất hiện trên trang của bạn sau vài phút.
                      </p>
                    )}
                    {!result.success && (
                      <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
                        Nếu lỗi liên quan đến session, hãy ngắt kết nối và nhập lại Session ID mới.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Nút đăng */}
            {!result?.success && (
              <button onClick={handlePublish}
                disabled={uploading || !videoFile || !title.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{
                  background: uploading || !videoFile || !title.trim() ? "#9ca3af" : "#000",
                }}>
                {uploading
                  ? <><RefreshCw size={14} className="animate-spin" /> {uploadStatus || "Đang xử lý..."}</>
                  : <><Send size={14} /> Đăng lên TikTok</>}
              </button>
            )}

            {result?.success && (
              <button
                onClick={() => {
                  setResult(null);
                  setVideoFile(null);
                  setTitle("");
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "#f3f4f6", color: "#374151" }}>
                Đăng video khác
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
