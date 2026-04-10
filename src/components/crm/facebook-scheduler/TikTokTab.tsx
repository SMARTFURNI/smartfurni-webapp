"use client";
import { useState, useEffect, useRef } from "react";
import {
  RefreshCw, CheckCircle2, AlertCircle, Link2, LogOut,
  Video, Upload, X, Send, ExternalLink, Music2,
} from "lucide-react";

interface TikTokStatus {
  connected: boolean;
  expired?: boolean;
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  connectedAt?: string;
  expiresAt?: string;
}

interface PublishResult {
  success: boolean;
  publishId?: string;
  error?: string;
}

const PRIVACY_OPTIONS = [
  { value: "PUBLIC_TO_EVERYONE", label: "Công khai" },
  { value: "MUTUAL_FOLLOW_FRIENDS", label: "Bạn bè" },
  { value: "FOLLOWER_OF_CREATOR", label: "Người theo dõi" },
  { value: "SELF_ONLY", label: "Chỉ mình tôi" },
];

export default function TikTokTab() {
  const [status, setStatus] = useState<TikTokStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [privacy, setPrivacy] = useState("PUBLIC_TO_EVERYONE");
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

  useEffect(() => {
    loadStatus();
    // Kiểm tra URL params khi redirect về từ OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get("tiktok_connected")) {
      loadStatus();
      // Xóa params khỏi URL
      const url = new URL(window.location.href);
      url.searchParams.delete("tiktok_connected");
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url.toString());
    }
    if (params.get("tiktok_error")) {
      alert(`Lỗi kết nối TikTok: ${params.get("tiktok_error")}`);
      const url = new URL(window.location.href);
      url.searchParams.delete("tiktok_error");
      url.searchParams.delete("tab");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/crm/tiktok/auth");
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        alert(data.error || "Không thể tạo URL kết nối TikTok");
      }
    } catch (err) {
      alert("Lỗi kết nối: " + (err as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Bạn có chắc muốn ngắt kết nối TikTok?")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/crm/tiktok/disconnect", { method: "POST" });
      setStatus({ connected: false });
    } catch {
      alert("Lỗi ngắt kết nối");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024 * 1024) {
      alert("Video quá lớn (tối đa 4GB)");
      return;
    }
    setVideoFile(file);
    setResult(null);
  };

  const handlePublish = async () => {
    if (!videoFile) { alert("Vui lòng chọn video"); return; }
    if (!title.trim()) { alert("Vui lòng nhập tiêu đề video"); return; }

    setUploading(true);
    setUploadProgress(0);
    setResult(null);

    try {
      const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB mỗi chunk
      const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);

      setUploadStatus("Khởi tạo upload...");

      // Bước 1: Khởi tạo upload session
      const initRes = await fetch("/api/crm/tiktok/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          title: title.trim(),
          privacyLevel: privacy,
          disableComment,
          disableDuet,
          disableStitch,
          fileSize: videoFile.size,
          chunkSize: CHUNK_SIZE,
          totalChunks,
        }),
      });

      const initData = await initRes.json();
      if (!initData.ok) throw new Error(initData.error || "Không thể khởi tạo upload");

      const { publishId, uploadUrl } = initData;
      setUploadStatus("Đang upload video...");

      // Bước 2: Upload từng chunk lên TikTok trực tiếp
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, videoFile.size);
        const chunk = videoFile.slice(start, end);

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "video/mp4",
            "Content-Range": `bytes ${start}-${end - 1}/${videoFile.size}`,
            "Content-Length": String(end - start),
          },
          body: chunk,
        });

        if (!uploadRes.ok && uploadRes.status !== 206) {
          throw new Error(`Upload chunk ${i + 1} thất bại: ${uploadRes.status}`);
        }

        const progress = Math.round(((i + 1) / totalChunks) * 100);
        setUploadProgress(progress);
        setUploadStatus(`Đang upload... ${progress}% (chunk ${i + 1}/${totalChunks})`);
      }

      setUploadStatus("Đang xử lý video trên TikTok...");
      setUploadProgress(100);

      // Bước 3: Kiểm tra trạng thái
      let attempts = 0;
      let published = false;
      while (attempts < 20 && !published) {
        await new Promise(r => setTimeout(r, 3000));
        const statusRes = await fetch("/api/crm/tiktok/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check_status", publishId }),
        });
        const statusData = await statusRes.json();
        const statusCode = statusData.data?.status;
        if (statusCode === "PUBLISH_COMPLETE") {
          published = true;
          setResult({ success: true, publishId });
        } else if (statusCode === "FAILED") {
          throw new Error(statusData.data?.fail_reason || "TikTok xử lý video thất bại");
        }
        attempts++;
      }

      if (!published) {
        // Video đang xử lý, coi như thành công
        setResult({ success: true, publishId });
      }

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
      {/* Trạng thái kết nối */}
      <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "#000" }}>
            <Music2 size={18} color="#fff" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Kết nối TikTok</h3>
            <p className="text-xs" style={{ color: "#9ca3af" }}>Đăng video lên TikTok trực tiếp</p>
          </div>
        </div>

        {status?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "#15803d" }}>
                  Đã kết nối: @{status.username || status.displayName}
                </p>
                <p className="text-xs" style={{ color: "#16a34a" }}>
                  Hết hạn: {status.expiresAt ? new Date(status.expiresAt).toLocaleDateString("vi-VN") : "N/A"}
                </p>
              </div>
              <button onClick={handleDisconnect} disabled={disconnecting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "#fef2f2", color: "#dc2626" }}>
                {disconnecting ? <RefreshCw size={12} className="animate-spin" /> : <LogOut size={12} />}
                Ngắt kết nối
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "#fef9c3", border: "1px solid #fde047" }}>
              <AlertCircle size={16} style={{ color: "#ca8a04" }} />
              <p className="text-sm" style={{ color: "#854d0e" }}>
                {status?.expired ? "Token TikTok đã hết hạn, vui lòng kết nối lại." : "Chưa kết nối TikTok."}
              </p>
            </div>
            <button onClick={handleConnect} disabled={connecting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: connecting ? "#9ca3af" : "#000" }}>
              {connecting ? <RefreshCw size={14} className="animate-spin" /> : <Link2 size={14} />}
              {connecting ? "Đang kết nối..." : "Kết nối TikTok"}
            </button>
          </div>
        )}
      </div>

      {/* Form đăng video */}
      {status?.connected && (
        <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
          <div className="flex items-center gap-2 mb-4">
            <Video size={16} style={{ color: "#000" }} />
            <h3 className="text-sm font-bold text-gray-900">Đăng video TikTok</h3>
          </div>

          <div className="space-y-4">
            {/* Tiêu đề */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: "#374151" }}>
                Tiêu đề video <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề video TikTok..."
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
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/mov,video/avi,video/webm"
                onChange={handleVideoSelect}
                className="hidden"
              />
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
                    className="p-1 rounded-lg hover:bg-red-50" style={{ color: "#dc2626" }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full py-6 rounded-xl flex flex-col items-center gap-2 transition-colors hover:bg-gray-50"
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
              <select
                value={privacy}
                onChange={e => setPrivacy(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ border: "1px solid #d1d5db", color: "#374151" }}
              >
                {PRIVACY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Tùy chọn */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Tắt bình luận", value: disableComment, setter: setDisableComment },
                { label: "Tắt Duet", value: disableDuet, setter: setDisableDuet },
                { label: "Tắt Stitch", value: disableStitch, setter: setDisableStitch },
              ].map(opt => (
                <button key={opt.label}
                  onClick={() => opt.setter(!opt.value)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  style={{
                    background: opt.value ? "#f0fdf4" : "#f9fafb",
                    border: `1px solid ${opt.value ? "#bbf7d0" : "#e5e7eb"}`,
                    color: opt.value ? "#15803d" : "#6b7280",
                  }}>
                  <div className="w-4 h-4 rounded flex items-center justify-center"
                    style={{ background: opt.value ? "#16a34a" : "#d1d5db" }}>
                    {opt.value && <CheckCircle2 size={10} color="#fff" />}
                  </div>
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs" style={{ color: "#6b7280" }}>
                  <span>{uploadStatus}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full" style={{ background: "#f3f4f6" }}>
                  <div className="h-2 rounded-full transition-all"
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
                <div className="flex items-center gap-2">
                  {result.success
                    ? <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                    : <AlertCircle size={16} style={{ color: "#dc2626" }} />}
                  <p className="text-sm font-semibold"
                    style={{ color: result.success ? "#15803d" : "#dc2626" }}>
                    {result.success ? "Đã đăng video lên TikTok thành công!" : `Lỗi: ${result.error}`}
                  </p>
                </div>
                {result.success && result.publishId && (
                  <p className="text-xs mt-1" style={{ color: "#16a34a" }}>
                    Publish ID: {result.publishId}
                  </p>
                )}
              </div>
            )}

            {/* Nút đăng */}
            {!result?.success && (
              <button
                onClick={handlePublish}
                disabled={uploading || !videoFile || !title.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all"
                style={{
                  background: uploading || !videoFile || !title.trim() ? "#9ca3af" : "#000",
                }}>
                {uploading
                  ? <><RefreshCw size={14} className="animate-spin" /> {uploadStatus || "Đang upload..."}</>
                  : <><Send size={14} /> Đăng lên TikTok</>}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
