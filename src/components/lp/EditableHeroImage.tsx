"use client";
import { useState } from "react";

interface EditableHeroImageProps {
  slug: string;
  /** Mảng blockKey cho từng ảnh slide, e.g. ["hero_bg_0","hero_bg_1","hero_bg_2","hero_bg_3"] */
  imageKeys: string[];
  /** blockKey cho overlay opacity, e.g. "hero_overlay" */
  overlayKey: string;
  /** Mảng URL ảnh hiện tại (đã lưu hoặc default) */
  imageUrls: string[];
  /** Opacity overlay hiện tại 0-1 */
  overlayOpacity: number;
  editMode: boolean;
  onImageSaved?: (key: string, url: string) => void;
  onOverlaySaved?: (key: string, opacity: number) => void;
}

const GOLD = "#C9A84C";
const BLACK_DEEP = "rgba(13,11,0,0.97)";

export function EditableHeroImage({
  slug, imageKeys, overlayKey,
  imageUrls, overlayOpacity,
  editMode,
  onImageSaved, onOverlaySaved,
}: EditableHeroImageProps) {
  const [showPanel, setShowPanel] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [urlInputs, setUrlInputs] = useState<string[]>(imageUrls);
  const [opacityInput, setOpacityInput] = useState(Math.round(overlayOpacity * 100));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  if (!editMode) return null;

  const openPanel = () => {
    setUrlInputs([...imageUrls]);
    setOpacityInput(Math.round(overlayOpacity * 100));
    setActiveSlide(0);
    setMsg("");
    setShowPanel(true);
  };

  const saveBlock = async (key: string, value: string) => {
    const res = await fetch("/api/admin/lp-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, blockKey: key, content: value }),
    });
    return res.ok;
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const results = await Promise.all([
        ...imageKeys.map((key, i) => urlInputs[i] ? saveBlock(key, urlInputs[i]) : Promise.resolve(true)),
        saveBlock(overlayKey, String(opacityInput / 100)),
      ]);
      if (results.every(Boolean)) {
        imageKeys.forEach((key, i) => {
          if (urlInputs[i]) onImageSaved?.(key, urlInputs[i]);
        });
        onOverlaySaved?.(overlayKey, opacityInput / 100);
        setMsg("✓ Đã lưu tất cả thay đổi!");
        setTimeout(() => { setMsg(""); setShowPanel(false); }, 1400);
      } else {
        setMsg("❌ Một số thay đổi lưu thất bại. Thử lại.");
      }
    } catch {
      setMsg("❌ Lỗi kết nối.");
    } finally {
      setSaving(false);
    }
  };

  const currentPreviewUrl = urlInputs[activeSlide] || imageUrls[activeSlide] || "";

  return (
    <>
      {/* Nút mở panel — góc trên phải hero */}
      <button
        onClick={openPanel}
        title="Chỉnh ảnh nền & độ mờ"
        style={{
          position: "absolute", top: 80, right: 20, zIndex: 500,
          background: GOLD, color: "#0D0B00",
          border: "none", borderRadius: 8,
          padding: "7px 14px", fontSize: 11, fontWeight: 700,
          cursor: "pointer", fontFamily: "'Inter', sans-serif",
          display: "flex", alignItems: "center", gap: 6,
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        🖼 Chỉnh ảnh nền
      </button>

      {/* Panel chỉnh sửa */}
      {showPanel && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowPanel(false); }}
        >
          <div style={{
            background: BLACK_DEEP, border: `1px solid rgba(201,168,76,0.35)`,
            borderRadius: 18, padding: 28, width: "min(580px, 96vw)",
            maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 32px 100px rgba(0,0,0,0.8)",
          }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ color: GOLD, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "'Inter', sans-serif" }}>
                🖼 Chỉnh ảnh nền & độ mờ hero
              </h3>
              <button onClick={() => setShowPanel(false)}
                style={{ background: "none", border: "none", color: "#A89070", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>
                ✕
              </button>
            </div>

            {/* Slide tabs */}
            <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
              {imageKeys.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  style={{
                    background: activeSlide === i ? GOLD : "rgba(201,168,76,0.08)",
                    color: activeSlide === i ? "#0D0B00" : "#A89070",
                    border: `1px solid ${activeSlide === i ? GOLD : "rgba(201,168,76,0.2)"}`,
                    borderRadius: 8, padding: "5px 14px", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'Inter', sans-serif",
                    transition: "all 0.15s",
                  }}
                >
                  Ảnh {i + 1}
                </button>
              ))}
            </div>

            {/* Preview */}
            <div style={{
              width: "100%", height: 170, borderRadius: 10, overflow: "hidden",
              marginBottom: 20, position: "relative", background: "#0A0A08",
              border: "1px solid rgba(201,168,76,0.15)",
            }}>
              {currentPreviewUrl ? (
                <img
                  src={currentPreviewUrl}
                  alt={`Preview ảnh ${activeSlide + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#4A4030", fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
                  Chưa có ảnh — nhập URL bên dưới
                </div>
              )}
              <div style={{
                position: "absolute", inset: 0,
                background: `rgba(10,10,8,${opacityInput / 100})`,
                transition: "background 0.1s",
              }} />
              <div style={{
                position: "absolute", bottom: 8, left: 10, right: 10,
                display: "flex", justifyContent: "space-between",
                color: "white", fontSize: 10, fontFamily: "'Inter', sans-serif",
                textShadow: "0 1px 4px rgba(0,0,0,0.9)",
              }}>
                <span>Ảnh {activeSlide + 1}/{imageKeys.length}</span>
                <span>Overlay: {opacityInput}%</span>
              </div>
            </div>

            {/* URL input cho slide đang chọn */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", color: "#D4C4A0", fontSize: 11, fontWeight: 600, marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'Inter', sans-serif" }}>
                URL ảnh {activeSlide + 1}
              </label>
              <input
                type="text"
                value={urlInputs[activeSlide] || ""}
                onChange={e => {
                  const next = [...urlInputs];
                  next[activeSlide] = e.target.value;
                  setUrlInputs(next);
                }}
                placeholder="https://... hoặc /images/sofa-hero.jpg"
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(201,168,76,0.25)",
                  borderRadius: 8, padding: "10px 12px",
                  color: "#F5EDD6", fontSize: 13, fontFamily: "'Inter', sans-serif",
                  outline: "none", transition: "border-color 0.15s",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = GOLD)}
                onBlur={e => (e.currentTarget.style.borderColor = "rgba(201,168,76,0.25)")}
              />
              <p style={{ color: "#5A5040", fontSize: 11, marginTop: 5, fontFamily: "'Inter', sans-serif" }}>
                Dán URL ảnh từ Cloudinary, Google Drive (direct link), hoặc đường dẫn trong dự án.
              </p>
            </div>

            {/* Slider độ mờ — áp dụng cho tất cả slides */}
            <div style={{ marginBottom: 24, padding: "16px 18px", background: "rgba(201,168,76,0.04)", borderRadius: 10, border: "1px solid rgba(201,168,76,0.12)" }}>
              <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#D4C4A0", fontSize: 11, fontWeight: 600, marginBottom: 12, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'Inter', sans-serif" }}>
                <span>Độ mờ overlay (lớp tối phủ lên ảnh)</span>
                <span style={{ color: GOLD, fontSize: 16, fontWeight: 700, minWidth: 40, textAlign: "right" }}>{opacityInput}%</span>
              </label>
              <input
                type="range"
                min={0} max={90} step={5}
                value={opacityInput}
                onChange={e => setOpacityInput(Number(e.target.value))}
                style={{ width: "100%", accentColor: GOLD, cursor: "pointer", height: 6, borderRadius: 3 }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", color: "#5A5040", fontSize: 10, fontFamily: "'Inter', sans-serif", marginTop: 6 }}>
                <span>0% — Ảnh rõ nhất</span>
                <span style={{ color: "#8A7A60" }}>Áp dụng cho tất cả slides</span>
                <span>90% — Tối nhất</span>
              </div>
            </div>

            {/* Quick presets */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ color: "#6B5E45", fontSize: 11, fontFamily: "'Inter', sans-serif", marginBottom: 8 }}>Gợi ý nhanh:</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[
                  { label: "Sáng (30%)", val: 30 },
                  { label: "Vừa (50%)", val: 50 },
                  { label: "Tối (65%)", val: 65 },
                  { label: "Rất tối (80%)", val: 80 },
                ].map(p => (
                  <button
                    key={p.val}
                    onClick={() => setOpacityInput(p.val)}
                    style={{
                      background: opacityInput === p.val ? "rgba(201,168,76,0.2)" : "rgba(255,255,255,0.04)",
                      color: opacityInput === p.val ? GOLD : "#7A7060",
                      border: `1px solid ${opacityInput === p.val ? "rgba(201,168,76,0.4)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 6, padding: "4px 12px", fontSize: 11, cursor: "pointer",
                      fontFamily: "'Inter', sans-serif", transition: "all 0.15s",
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  flex: 1,
                  background: `linear-gradient(135deg, #E8D08C 0%, ${GOLD} 60%, #9A7A2E 100%)`,
                  color: "#0D0B00", border: "none", borderRadius: 8,
                  padding: "12px 20px", fontSize: 13, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "'Inter', sans-serif",
                  opacity: saving ? 0.7 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {saving ? "Đang lưu..." : "✓ Lưu tất cả thay đổi"}
              </button>
              <button
                onClick={() => setShowPanel(false)}
                style={{
                  background: "rgba(255,255,255,0.05)", color: "#A89070",
                  border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
                  padding: "12px 18px", fontSize: 13, cursor: "pointer",
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Hủy
              </button>
            </div>

            {msg && (
              <p style={{
                color: msg.startsWith("✓") ? "#4ADE80" : "#F87171",
                fontSize: 12, marginTop: 12, textAlign: "center",
                fontFamily: "'Inter', sans-serif",
              }}>
                {msg}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
