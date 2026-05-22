"use client";
import React, { useState, useEffect } from "react";

const GOLD = "#C9A84C";
const BLACK = "#0D0B00";
const FONT = "'Inter', sans-serif";

interface LpEditBarProps {
  isEditor: boolean;
  editMode: boolean;
  onToggleEditMode: () => void;
  editedCount: number;
  slug?: string;
  initialTracking?: {
    fbPixelId?: string;
    googleAdsId?: string;
    googleAdsLabel?: string;
    gtmId?: string;
  };
}

export function LpEditBar({
  isEditor,
  editMode,
  onToggleEditMode,
  editedCount,
  slug = "sofa-giuong",
  initialTracking = {},
}: LpEditBarProps) {
  const [showTracking, setShowTracking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [fbPixelId, setFbPixelId] = useState(initialTracking.fbPixelId || "");
  const [googleAdsId, setGoogleAdsId] = useState(initialTracking.googleAdsId || "");
  const [googleAdsLabel, setGoogleAdsLabel] = useState(initialTracking.googleAdsLabel || "");
  const [gtmId, setGtmId] = useState(initialTracking.gtmId || "");

  // Load từ DB khi mount
  useEffect(() => {
    if (!isEditor) return;
    fetch(`/api/admin/lp-content?slug=${slug}&action=get-tracking`)
      .then(r => r.json())
      .then(d => {
        if (d.fbPixelId !== undefined) setFbPixelId(d.fbPixelId || "");
        if (d.googleAdsId !== undefined) setGoogleAdsId(d.googleAdsId || "");
        if (d.googleAdsLabel !== undefined) setGoogleAdsLabel(d.googleAdsLabel || "");
        if (d.gtmId !== undefined) setGtmId(d.gtmId || "");
      })
      .catch(() => {});
  }, [isEditor, slug]);

  if (!isEditor) return null;

  async function saveTracking() {
    setSaving(true);
    try {
      await Promise.all([
        fetch("/api/admin/lp-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, blockKey: "tracking_fb_pixel_id", content: fbPixelId }) }),
        fetch("/api/admin/lp-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, blockKey: "tracking_google_ads_id", content: googleAdsId }) }),
        fetch("/api/admin/lp-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, blockKey: "tracking_google_ads_label", content: googleAdsLabel }) }),
        fetch("/api/admin/lp-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, blockKey: "tracking_gtm_id", content: gtmId }) }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      alert("Lỗi khi lưu. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  const inp: React.CSSProperties = {
    background: "rgba(245,237,214,0.06)",
    border: "1px solid rgba(201,168,76,0.3)",
    borderRadius: 7,
    padding: "8px 12px",
    color: "#F5EDD6",
    fontSize: 13,
    fontFamily: FONT,
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  const label: React.CSSProperties = {
    display: "block",
    color: "#9BA1A6",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 5,
    fontFamily: FONT,
  };

  return (
    <>
      {/* Tracking Panel */}
      {showTracking && editMode && (
        <div style={{
          position: "fixed", bottom: 90, right: 24, zIndex: 9998,
          background: "rgba(13,11,0,0.97)",
          border: "1px solid rgba(201,168,76,0.3)",
          borderRadius: 14,
          padding: "20px 20px 16px",
          width: 320,
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          backdropFilter: "blur(16px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT }}>⚙️ Cài đặt Tracking</span>
            <button onClick={() => setShowTracking(false)} style={{ background: "none", border: "none", color: "#687076", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
          </div>

          {/* Facebook Pixel */}
          <div style={{ marginBottom: 12 }}>
            <label style={label}>Facebook Pixel ID</label>
            <input
              value={fbPixelId}
              onChange={e => setFbPixelId(e.target.value)}
              placeholder="Ví dụ: 1234567890123456"
              style={inp}
              onFocus={e => { e.target.style.borderColor = GOLD; }}
              onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.3)"; }}
            />
            <p style={{ color: "#687076", fontSize: 10, marginTop: 3, fontFamily: FONT }}>Tự động fire PageView + Lead khi khách đặt hàng</p>
          </div>

          {/* Google Ads */}
          <div style={{ marginBottom: 12 }}>
            <label style={label}>Google Ads Conversion ID</label>
            <input
              value={googleAdsId}
              onChange={e => setGoogleAdsId(e.target.value)}
              placeholder="Ví dụ: AW-123456789"
              style={inp}
              onFocus={e => { e.target.style.borderColor = GOLD; }}
              onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.3)"; }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={label}>Google Ads Conversion Label</label>
            <input
              value={googleAdsLabel}
              onChange={e => setGoogleAdsLabel(e.target.value)}
              placeholder="Ví dụ: AbCdEfGhIjKlMnOp"
              style={inp}
              onFocus={e => { e.target.style.borderColor = GOLD; }}
              onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.3)"; }}
            />
            <p style={{ color: "#687076", fontSize: 10, marginTop: 3, fontFamily: FONT }}>Tự động fire khi khách đặt hàng thành công</p>
          </div>

          {/* GTM */}
          <div style={{ marginBottom: 16 }}>
            <label style={label}>Google Tag Manager ID</label>
            <input
              value={gtmId}
              onChange={e => setGtmId(e.target.value)}
              placeholder="Ví dụ: GTM-XXXXXXX"
              style={inp}
              onFocus={e => { e.target.style.borderColor = GOLD; }}
              onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.3)"; }}
            />
            <p style={{ color: "#687076", fontSize: 10, marginTop: 3, fontFamily: FONT }}>Dùng GTM thay thế hoặc kết hợp với Pixel/Ads</p>
          </div>

          <button
            onClick={saveTracking}
            disabled={saving}
            style={{
              width: "100%",
              background: saved ? "#22C55E" : `linear-gradient(135deg, #D4A843 0%, ${GOLD} 50%, #9A7A2E 100%)`,
              color: BLACK,
              border: "none",
              borderRadius: 8,
              padding: "10px",
              fontSize: 12,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              fontFamily: FONT,
              transition: "all 0.2s",
            }}
          >
            {saving ? "Đang lưu…" : saved ? "✓ Đã lưu!" : "Lưu cài đặt tracking"}
          </button>
        </div>
      )}

      {/* Edit Bar */}
      <div style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
        background: editMode ? "rgba(201,168,76,0.95)" : "rgba(13,11,0,0.92)",
        border: editMode ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,0.3)",
        borderRadius: 12, padding: "10px 16px",
        display: "flex", alignItems: "center", gap: 10,
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        transition: "all 0.2s",
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: editMode ? BLACK : GOLD,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 12, fontWeight: 600,
          color: editMode ? BLACK : GOLD,
          fontFamily: FONT,
        }}>
          {editMode ? "Chế độ chỉnh sửa" : "Chế độ xem"}
        </span>
        {editedCount > 0 && (
          <span style={{
            background: editMode ? "rgba(13,11,0,0.2)" : "rgba(201,168,76,0.2)",
            color: editMode ? BLACK : GOLD,
            borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700,
          }}>
            {editedCount} thay đổi
          </span>
        )}
        {/* Tracking button - chỉ hiện khi editMode */}
        {editMode && (
          <button
            onClick={() => setShowTracking(v => !v)}
            title="Cài đặt tracking pixel"
            style={{
              background: showTracking ? "rgba(13,11,0,0.3)" : "rgba(13,11,0,0.15)",
              color: BLACK,
              border: "none",
              borderRadius: 7,
              padding: "5px 9px",
              fontSize: 14,
              cursor: "pointer",
              transition: "opacity 0.15s",
            }}
          >
            ⚙️
          </button>
        )}
        <button
          onClick={onToggleEditMode}
          style={{
            background: editMode ? BLACK : GOLD,
            color: editMode ? GOLD : BLACK,
            border: "none", borderRadius: 8,
            padding: "5px 12px", fontSize: 11, fontWeight: 700,
            cursor: "pointer", fontFamily: FONT,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          {editMode ? "👁 Xem trước" : "✏️ Bật chỉnh sửa"}
        </button>
      </div>
    </>
  );
}
