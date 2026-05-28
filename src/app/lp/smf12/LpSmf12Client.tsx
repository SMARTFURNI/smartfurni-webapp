"use client";
import "./lp-retail.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { EditableText } from "@/components/lp/EditableText";
import { LpEditBar } from "@/components/lp/LpEditBar";
import { EditableHeroImage } from "@/components/lp/EditableHeroImage";

// ─── SVG Icon components (sang trọng, không dùng emoji) ──────────────────────
function IconShield({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 2L3 6v6c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V6L12 2z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconRefresh({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M1 4v6h6M23 20v-6h-6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconTruck({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="1" y="3" width="15" height="13" rx="1" stroke={color} strokeWidth="1.5"/><path d="M16 8h4l3 3v5h-7V8z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="5.5" cy="18.5" r="2.5" stroke={color} strokeWidth="1.5"/><circle cx="18.5" cy="18.5" r="2.5" stroke={color} strokeWidth="1.5"/></svg>;
}
function IconPhone({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .82h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconMail({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke={color} strokeWidth="1.5"/><path d="M2 7l10 7 10-7" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function IconPin({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="10" r="3" stroke={color} strokeWidth="1.5"/></svg>;
}
function IconClock({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/><path d="M12 6v6l4 2" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconCheck({ color = "currentColor", size = 20 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconStar({ color = "currentColor", size = 16, filled = true }: { color?: string; size?: number; filled?: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconLock({ color = "currentColor", size = 16 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke={color} strokeWidth="1.5"/><path d="M7 11V7a5 5 0 0110 0v4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function IconLeaf({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M17 8C8 10 5.9 16.17 3.82 19.34L5.71 21C9 17 11 15 17 14M17 8l2-2M17 8c0 0 0 6-4 8" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconDiamond({ color = "currentColor", size = 28 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M2.7 10.3l8.6 8.6a1 1 0 001.4 0l8.6-8.6a1 1 0 000-1.4L16.9 4.4a1 1 0 00-.7-.3H7.8a1 1 0 00-.7.3L2.7 8.9a1 1 0 000 1.4z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconLayers({ color = "currentColor", size = 28 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconTarget({ color = "currentColor", size = 28 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.5"/><circle cx="12" cy="12" r="6" stroke={color} strokeWidth="1.5"/><circle cx="12" cy="12" r="2" stroke={color} strokeWidth="1.5"/></svg>;
}
function IconBox({ color = "currentColor", size = 28 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconAward({ color = "currentColor", size = 28 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="6" stroke={color} strokeWidth="1.5"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconZap({ color = "currentColor", size = 20 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconChat({ color = "currentColor", size = 16 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function IconSofa({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M20 9V7a2 2 0 00-2-2H6a2 2 0 00-2 2v2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><path d="M2 11a2 2 0 012-2h1a2 2 0 012 2v3H2v-3zM17 11a2 2 0 012-2h1a2 2 0 012 2v3h-5v-3z" stroke={color} strokeWidth="1.5"/><path d="M7 14h10v3a1 1 0 01-1 1H8a1 1 0 01-1-1v-3z" stroke={color} strokeWidth="1.5"/><path d="M7 17v2M17 17v2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function IconBed({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M2 4v16M2 8h20v12M2 8c0-2.21 1.79-4 4-4h12c2.21 0 4 1.79 4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 8v4M10 8v4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function IconRuler({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

// ─── Design tokens — tông kem-vàng đồng (light theme) ────────────────────────
const GOLD = "#8B6914";
const GOLD_LIGHT = "#B8922A";
const GOLD_PALE = "#C9A84C";
const BLACK = "#FDFAF5";          // nền chính — kem trắng
const BLACK_SOFT = "#F4F7FA";     // nền section xen kẽ
const BLACK_CARD = "#F0EBE0";     // nền card
const BLACK_BORDER = "rgba(139,105,20,0.15)";
const WHITE = "#1A1200";          // chữ chính — nâu đen ấm
const GRAY = "#4A3F2F";           // chữ phụ
const GRAY_LIGHT = "#7A6A55";     // chữ mờ
const RED_SOFT = "#C0392B";
const LP_SLUG = "smf12";
const FONT_HEADING = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_BRAND = "'Cormorant Garamond', Georgia, serif";
const R_SM = 8;
const R_MD = 12;
const R_LG = 16;
const R_FULL = 999;

interface Props {
  isEditor?: boolean;
  initialContent?: Record<string, string>;
}

// ─── YouTube helpers ─────────────────────────────────────────────────────────
function YoutubeAutoplay({ videoId, title }: { videoId: string; title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting && !started) setStarted(true); }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);
  const src = started
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=1&rel=0&modestbranding=1`
    : `https://www.youtube.com/embed/${videoId}?controls=1&rel=0&modestbranding=1`;
  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#000", borderRadius: R_MD }}>
      <iframe src={src} title={title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }} />
    </div>
  );
}

// ShortsCard: tỉ lệ 9:16, thumbnail tự động từ YouTube, nút play nhỏ gọn
function ShortsCard({ videoId, title, tag, titleNode }: { videoId: string; title: string; tag?: string; titleNode?: React.ReactNode }) {
  const [playing, setPlaying] = useState(false);
  const hasVideo = videoId && videoId !== "_placeholder_";
  const thumbHq = hasVideo ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  const thumbMax = hasVideo ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  return (
    <div style={{ position: "relative", width: "100%", paddingBottom: "177.78%", background: "#111", cursor: playing ? "default" : "pointer", borderRadius: R_LG, overflow: "hidden" }}
      onClick={() => { if (!playing && hasVideo) setPlaying(true); }}>
      {playing ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&rel=0&modestbranding=1&playsinline=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
        />
      ) : (
        <>
          {thumbMax ? (
            <img src={thumbMax} alt={title}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { (e.target as HTMLImageElement).src = thumbHq!; }}
            />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: "#1A1200", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" stroke={GOLD_PALE} strokeWidth="1.5"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill={GOLD_PALE}/></svg>
              <span style={{ color: GRAY_LIGHT, fontSize: 11, fontFamily: FONT_BODY }}>Chưa có video</span>
            </div>
          )}
          {/* Gradient overlay mạnh hơn ở dưới để title nổi bật */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 45%, transparent 70%)" }} />
          {/* Nút play nhỏ gọn */}
          {hasVideo && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.35)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 5l11 7-11 7V5z" fill="#1A1200"/></svg>
              </div>
            </div>
          )}
          {/* Tag badge */}
          {tag && (
            <div style={{ position: "absolute", top: 10, left: 10, background: `rgba(139,105,20,0.88)`, color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: R_FULL, letterSpacing: "0.1em", fontFamily: FONT_BODY }}>
              {tag}
            </div>
          )}
          {/* Title nổi bật ở dưới — có thể chỉnh sửa */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 12px 12px" }}>
            {titleNode ? titleNode : (
              <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT_HEADING, lineHeight: 1.35, textShadow: "0 1px 6px rgba(0,0,0,0.9)", letterSpacing: "-0.01em" }}>{title}</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Legacy wrapper giữ tương thích với reels section
function YoutubeThumbnailPlay({ videoId, title, tag }: { videoId: string; title: string; tag?: string }) {
  return <ShortsCard videoId={videoId} title={title} tag={tag} />;
}

// ─── ImageUploadOverlay (với tính năng dán URL + upload file) ────────────────
function ImageUploadOverlay({ blockKey, currentUrl, onUploaded }: { blockKey: string; currentUrl: string; onUploaded: (key: string, url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlVal, setUrlVal] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("slug", LP_SLUG); fd.append("blockKey", blockKey);
      const res = await fetch("/api/admin/lp-upload-image", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      onUploaded(blockKey, url);
    } catch { alert("Upload thất bại"); } finally { setUploading(false); }
  }

  async function saveUrl(url: string) {
    if (!url.trim()) return;
    await fetch("/api/admin/lp-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: LP_SLUG, blockKey, content: url.trim() }) });
    onUploaded(blockKey, url.trim());
    setShowUrlInput(false); setUrlVal("");
  }

  if (uploading) {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}>
        <div style={{ color: "#fff", fontSize: 13, fontFamily: FONT_BODY }}>Đang upload...</div>
      </div>
    );
  }

  if (showUrlInput) {
    return (
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.92)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, zIndex: 20 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ color: "#F5EDD6", fontSize: 11, fontFamily: FONT_BODY }}>Dán link URL ảnh</div>
        <input autoFocus value={urlVal} onChange={e => setUrlVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") saveUrl(urlVal); if (e.key === "Escape") { setShowUrlInput(false); setUrlVal(""); } }}
          placeholder="https://..." style={{ width: "100%", background: "rgba(245,237,214,0.08)", border: "1.5px solid rgba(201,168,76,0.6)", borderRadius: 6, padding: "6px 10px", color: "#F5EDD6", fontSize: 11, fontFamily: FONT_BODY, outline: "none", boxSizing: "border-box" as const }} />
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => saveUrl(urlVal)} style={{ background: GOLD, color: BLACK, border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT_BODY }}>
            <IconCheck color={BLACK} size={12} /> Lưu
          </button>
          <button onClick={() => { setShowUrlInput(false); setUrlVal(""); }} style={{ background: "rgba(255,255,255,0.1)", color: "#A8A090", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: FONT_BODY }}>Huỷ</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 10 }}
      onClick={e => e.stopPropagation()}>
      <label style={{ background: "rgba(0,0,0,0.75)", border: "1px solid rgba(201,168,76,0.6)", borderRadius: 20, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, backdropFilter: "blur(4px)" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span style={{ color: "#C9A84C", fontSize: 10, fontWeight: 600, fontFamily: FONT_BODY, whiteSpace: "nowrap" as const }}>Upload</span>
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
      </label>
      <button onClick={() => setShowUrlInput(true)} style={{ background: "rgba(0,0,0,0.75)", border: "1px solid rgba(201,168,76,0.6)", borderRadius: 20, padding: "5px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, backdropFilter: "blur(4px)" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span style={{ color: "#C9A84C", fontSize: 10, fontWeight: 600, fontFamily: FONT_BODY, whiteSpace: "nowrap" as const }}>Dán URL</span>
      </button>
    </div>
  );
}


// ─── VideoEditOverlay (chỉnh sửa link YouTube) ───────────────────────────────
function VideoEditOverlay({ blockKey, currentId, onSaved }: { blockKey: string; currentId: string; onSaved: (key: string, id: string) => void }) {
  const [show, setShow] = useState(false);
  const [val, setVal] = useState("");

  function extractYoutubeId(input: string): string {
    const trimmed = input.trim();
    // Nếu là ID thuần (11 ký tự)
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
    // Nếu là URL youtube.com/watch?v=...
    const m1 = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m1) return m1[1];
    // Nếu là URL youtu.be/...
    const m2 = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (m2) return m2[1];
    // Nếu là URL embed
    const m3 = trimmed.match(/embed\/([a-zA-Z0-9_-]{11})/);
    if (m3) return m3[1];
    return trimmed;
  }

  async function saveVideo() {
    if (!val.trim()) return;
    const id = extractYoutubeId(val);
    await fetch("/api/admin/lp-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug: LP_SLUG, blockKey, content: id }) });
    onSaved(blockKey, id);
    setShow(false); setVal("");
  }

  if (show) {
    return (
      <div style={{ width: "100%", background: "rgba(13,11,0,0.95)", border: "1.5px solid rgba(201,168,76,0.5)", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, zIndex: 30 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ color: "#F5EDD6", fontSize: 11, fontFamily: FONT_BODY }}>Dán link YouTube (URL hoặc Video ID)</div>
        <input autoFocus value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") saveVideo(); if (e.key === "Escape") { setShow(false); setVal(""); } }}
          placeholder="https://youtube.com/watch?v=... hoặc Video ID"
          style={{ width: "100%", background: "rgba(245,237,214,0.08)", border: "1.5px solid rgba(201,168,76,0.6)", borderRadius: 6, padding: "6px 10px", color: "#F5EDD6", fontSize: 11, fontFamily: FONT_BODY, outline: "none", boxSizing: "border-box" as const }} />
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={saveVideo} style={{ background: GOLD, color: BLACK, border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT_BODY, display: "flex", alignItems: "center", gap: 4 }}>
            <IconCheck color={BLACK} size={12} /> Lưu
          </button>
          <button onClick={() => { setShow(false); setVal(""); }} style={{ background: "rgba(255,255,255,0.1)", color: "#A8A090", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, cursor: "pointer", fontFamily: FONT_BODY }}>Huỷ</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", display: "flex", justifyContent: "center", paddingTop: 6 }}>
      <button
        style={{ background: "rgba(13,11,0,0.85)", border: "1px solid rgba(201,168,76,0.6)", borderRadius: 20, padding: "5px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, backdropFilter: "blur(4px)", whiteSpace: "nowrap" as const }}
        onClick={e => { e.stopPropagation(); setShow(true); setVal(currentId && currentId !== "_placeholder_" ? currentId : ""); }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M22.54 6.42a2.78 2.78 0 00-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 001.46 6.42 29 29 0 001 12a29 29 0 00.46 5.58A2.78 2.78 0 003.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 001.95-1.95A29 29 0 0023 12a29 29 0 00-.46-5.58z" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <span style={{ color: "#C9A84C", fontSize: 10, fontWeight: 600, fontFamily: FONT_BODY }}>
          {currentId && currentId !== "_placeholder_" ? "Đổi video" : "Thêm video"}
        </span>
      </button>
    </div>
  );
}
// ─── FadeIn ───────────────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid rgba(139,105,20,0.35)`, background: "rgba(139,105,20,0.08)", color: GOLD, fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", padding: "6px 16px", marginBottom: 18, borderRadius: R_FULL, textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, display: "inline-block" }} />
      {children}
    </div>
  );
}

// ─── GoldDivider ─────────────────────────────────────────────────────────────
function GoldDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "20px auto 28px" }}>
      <div style={{ width: 32, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }} />
      <div style={{ width: 32, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
    </div>
  );
}

// ─── GoldButton ──────────────────────────────────────────────────────────────
function GoldButton({ children, onClick, style }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, #5A3E08 100%)`, color: "#FDFAF5", border: "none", padding: "15px 32px", fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const, borderRadius: R_MD, boxShadow: hovered ? `0 12px 36px rgba(139,105,20,0.35)` : `0 6px 24px rgba(139,105,20,0.2)`, transform: hovered ? "translateY(-2px)" : "translateY(0)", transition: "all 0.25s ease", fontFamily: FONT_BODY, ...style }}>
      {children}
    </button>
  );
}

function OutlineButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: "transparent", color: hovered ? GOLD : WHITE, border: `1px solid ${hovered ? GOLD : "rgba(26,18,0,0.3)"}`, padding: "15px 32px", fontWeight: 500, fontSize: 13, cursor: "pointer", letterSpacing: "0.06em", borderRadius: R_MD, transition: "all 0.25s ease", fontFamily: FONT_BODY }}>
      {children}
    </button>
  );
}

// ─── BeforeAfterSlider ───────────────────────────────────────────────────────
function BeforeAfterSlider({ beforeUrl, afterUrl, beforeLabel = "Sofa thường", afterLabel = "SMF12 Da PU" }: { beforeUrl?: string; afterUrl?: string; beforeLabel?: string; afterLabel?: string }) {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const updatePos = (clientX: number) => {
    const el = containerRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    setSliderPos(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };
  return (
    <div ref={containerRef} onMouseDown={() => { dragging.current = true; }} onMouseMove={(e) => { if (dragging.current) updatePos(e.clientX); }} onMouseUp={() => { dragging.current = false; }} onMouseLeave={() => { dragging.current = false; }} onTouchMove={(e) => updatePos(e.touches[0].clientX)}
      style={{ position: "relative", width: "100%", paddingBottom: "56.25%", cursor: "ew-resize", userSelect: "none", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
      {afterUrl ? (
        <img src={afterUrl} alt={afterLabel} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "#F0EBE0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: GOLD, fontSize: 13, fontFamily: FONT_BODY }}>Ảnh SAU (chưa cập nhật)</span>
        </div>
      )}
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
        {beforeUrl ? (
          <img src={beforeUrl} alt={beforeLabel} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#E8E0D0", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: GRAY_LIGHT, fontSize: 13, fontFamily: FONT_BODY }}>Ảnh TRƯỚC (chưa cập nhật)</span>
          </div>
        )}
      </div>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${sliderPos}%`, transform: "translateX(-50%)", width: 2, background: GOLD, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 40, height: 40, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 12px rgba(139,105,20,0.4)` }}>
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none"><path d="M5 7H1M1 7L4 4M1 7L4 10" stroke="#FDFAF5" strokeWidth="1.5" strokeLinecap="round"/><path d="M13 7H17M17 7L14 4M17 7L14 10" stroke="#FDFAF5" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </div>
      </div>
      <div style={{ position: "absolute", top: 12, left: 14, background: "rgba(253,250,245,0.9)", color: GRAY, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: R_FULL, letterSpacing: "0.1em", fontFamily: FONT_BODY, backdropFilter: "blur(4px)" }}>{beforeLabel}</div>
      <div style={{ position: "absolute", top: 12, right: 14, background: `rgba(139,105,20,0.12)`, border: `1px solid rgba(139,105,20,0.4)`, color: GOLD, fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: R_FULL, letterSpacing: "0.1em", fontFamily: FONT_BODY, backdropFilter: "blur(4px)" }}>{afterLabel}</div>
    </div>
  );
}

// ─── Product Detail Section ───────────────────────────────────────────────────
const PRODUCT_DETAILS = [
  {
    key: "detail_img_0",
    label: "Thiết kế sản phẩm",
    desc: "Đường nét tinh tế, da PU nhập khẩu mịn mượt — sang trọng trong mọi không gian sống",
    ratio: "100%",   // 1:1
    isGif: false,
  },
  {
    key: "detail_img_1",
    label: "Thao tác sofa → giường ngủ",
    desc: "Cơ cấu SmartFold 1 thao tác — chỉ kéo nhẹ là chuyển đổi hoàn toàn, không cần dụng cụ",
    ratio: "100%",   // 1:1
    isGif: true,
  },
  {
    key: "detail_img_2",
    label: "Khung thép mạ kẽm chắc chắn",
    desc: "Khung thép mạ kẽm dày 2mm, chịu tải 800kg — bền bỉ trên 10 năm sử dụng",
    ratio: "56.25%", // 16:9
    isGif: false,
  },
  {
    key: "detail_img_3",
    label: "Ngăn chứa đồ ẩn dưới gầm",
    desc: "Thiết kế ngăn chứa ẩn bên dưới gầm sofa — tối ưu không gian lưu trữ mà không lộ liễu",
    ratio: "100%",   // 1:1
    isGif: true,
  },
  {
    key: "detail_img_4",
    label: "Áo nệm Da PU có khoá kéo",
    desc: "Áo nệm da PU cao cấp có khoá kéo — tháo ra thay nệm hoặc thay vỏ áo dễ dàng",
    ratio: "100%",   // 1:1
    isGif: true,
  },
];

function ProductDetailSection({ editMode, content, handleSaved }: { editMode: boolean; content: Record<string, string>; handleSaved: (key: string, val: string) => void }) {
  return (
    <section id="demo" className="lp-section-pad" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <SectionLabel>Chi tiết sản phẩm</SectionLabel>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
              Thông Tin Chi Tiết
            </h2>
            <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING, marginBottom: 8 }}>
              SMF12 — Từng Chi Tiết Đều Được Chăm Chút
            </div>
            <GoldDivider />
          </div>
        </FadeIn>

        {/* Item 1 — Thiết kế sản phẩm (4:3, cột ảnh lớn hơn) */}
        <FadeIn delay={0}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 32, alignItems: "center" }} className="lp-detail-row">
              <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                <div style={{ position: "relative", paddingBottom: "75%", background: BLACK_CARD }}>
                  {content["detail_img_0"] ? (
                    <Image src={content["detail_img_0"]} alt="Thiết kế sản phẩm SMF12" fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 100vw, 50vw" />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                      <IconDiamond color={GOLD_PALE} size={40} />
                      <span style={{ fontSize: 13, fontFamily: FONT_BODY }}>Ảnh thiết kế sản phẩm</span>
                    </div>
                  )}
                  {editMode && <ImageUploadOverlay blockKey="detail_img_0" currentUrl={content["detail_img_0"] || ""} onUploaded={handleSaved} />}
                </div>
              </div>
              <div style={{ padding: "8px 0" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(139,105,20,0.08)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_FULL, padding: "6px 16px", marginBottom: 20 }}>
                  <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", fontFamily: FONT_BODY }}>01 / THIẾT KẾ</span>
                </div>
                <h3 style={{ fontSize: "clamp(20px, 2.5vw, 32px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 16, fontFamily: FONT_HEADING, color: WHITE }}>Thiết Kế Sản Phẩm</h3>
                <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.8, fontFamily: FONT_BODY, marginBottom: 24 }}>Đường nét tinh tế, da PU nhập khẩu mịn mượt — sang trọng trong mọi không gian sống. Màu sắc trung tính dễ phối hợp với mọi phong cách nội thất.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["Da PU nhập khẩu cao cấp, kháng nước", "4 màu sắc: Nâu, Xám, Kem, Đen", "Đường may tỉ mỉ, không bong chỉ"].map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, marginTop: 7, flexShrink: 0 }} />
                      <span style={{ color: GRAY, fontSize: 14, fontFamily: FONT_BODY, lineHeight: 1.6 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Item 2 — Thao tác sofa → giường (1:1 GIF, text bên trái) */}
        <FadeIn delay={80}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }} className="lp-detail-row">
              <div style={{ padding: "8px 0", order: 0 }} className="lp-detail-text-left">
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(139,105,20,0.08)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_FULL, padding: "6px 16px", marginBottom: 20 }}>
                  <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", fontFamily: FONT_BODY }}>02 / THAO TÁC</span>
                </div>
                <h3 style={{ fontSize: "clamp(20px, 2.5vw, 32px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 16, fontFamily: FONT_HEADING, color: WHITE }}>Thao Tác Sofa → Giường Ngủ</h3>
                <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.8, fontFamily: FONT_BODY, marginBottom: 24 }}>Cơ cấu SmartFold 1 thao tác — chỉ kéo nhẹ là chuyển đổi hoàn toàn từ sofa sang giường ngủ. Không cần dụng cụ, không cần tháo lắp.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["Chuyển đổi trong dưới 10 giây", "1 thao tác kéo/đẩy đơn giản", "Phù hợp cả người cao tuổi và trẻ em"].map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, marginTop: 7, flexShrink: 0 }} />
                      <span style={{ color: GRAY, fontSize: 14, fontFamily: FONT_BODY, lineHeight: 1.6 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                <div style={{ position: "relative", paddingBottom: "100%", background: BLACK_CARD }}>
                  {content["detail_img_1"] ? (
                    <img src={content["detail_img_1"]} alt="Thao tác sofa thành giường SMF12" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                      <IconZap color={GOLD_PALE} size={40} />
                      <span style={{ fontSize: 13, fontFamily: FONT_BODY }}>GIF thao tác gập mở</span>
                    </div>
                  )}
                  {editMode && <ImageUploadOverlay blockKey="detail_img_1" currentUrl={content["detail_img_1"] || ""} onUploaded={handleSaved} />}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Item 3 — Khung thép mạ kẽm (16:9, full width) */}
        <FadeIn delay={160}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}`, marginBottom: 24 }}>
              <div style={{ position: "relative", paddingBottom: "56.25%", background: BLACK_CARD }}>
                {content["detail_img_2"] ? (
                  <Image src={content["detail_img_2"]} alt="Khung thép mạ kẽm SMF12" fill style={{ objectFit: "cover" }} sizes="100vw" />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                    <IconBox color={GOLD_PALE} size={48} />
                    <span style={{ fontSize: 13, fontFamily: FONT_BODY }}>Ảnh khung thép mạ kẽm (16:9)</span>
                  </div>
                )}
                {editMode && <ImageUploadOverlay blockKey="detail_img_2" currentUrl={content["detail_img_2"] || ""} onUploaded={handleSaved} />}
                {/* Overlay badge */}
                <div style={{ position: "absolute", bottom: 20, left: 20, background: `rgba(26,18,0,0.75)`, backdropFilter: "blur(8px)", borderRadius: R_MD, padding: "12px 20px", border: `1px solid rgba(139,105,20,0.3)` }}>
                  <div style={{ color: GOLD_PALE, fontSize: 22, fontWeight: 700, fontFamily: FONT_HEADING, lineHeight: 1 }}>800kg</div>
                  <div style={{ color: "rgba(253,250,245,0.75)", fontSize: 11, fontFamily: FONT_BODY, marginTop: 3 }}>Tải trọng chịu đựng</div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="lp-detail-stats">
              {[
                { num: "2mm", label: "Độ dày thép" },
                { num: "Mạ kẽm", label: "Chống gỉ sét" },
                { num: "10 năm", label: "Độ bền khung" },
              ].map((s, i) => (
                <div key={i} style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_MD, padding: "16px", textAlign: "center" }}>
                  <div style={{ color: GOLD, fontSize: 20, fontWeight: 700, fontFamily: FONT_HEADING, marginBottom: 4 }}>{s.num}</div>
                  <div style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: "0 4px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(139,105,20,0.08)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_FULL, padding: "6px 16px", marginBottom: 12 }}>
                <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", fontFamily: FONT_BODY }}>03 / KHUNG THÉP</span>
              </div>
              <h3 style={{ fontSize: "clamp(18px, 2vw, 28px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 10, fontFamily: FONT_HEADING, color: WHITE }}>Khung Thép Mạ Kẽm Chắc Chắn — Chịu Tải 800kg</h3>
              <p style={{ color: GRAY, fontSize: 14, lineHeight: 1.8, fontFamily: FONT_BODY }}>Khung thép mạ kẽm dày 2mm, xử lý chống gỉ sét — đảm bảo độ bền vượt trội. Kết hợp với khung gỗ thông sấy khô đạt độ ẩm &lt;12%, tạo nên bộ khung vững chắc chịu tải 800kg.</p>
            </div>
          </div>
        </FadeIn>

        {/* Item 4 — Ngăn chứa đồ ẩn (1:1 GIF) */}
        <FadeIn delay={240}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }} className="lp-detail-row">
              <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                <div style={{ position: "relative", paddingBottom: "100%", background: BLACK_CARD }}>
                  {content["detail_img_3"] ? (
                    <img src={content["detail_img_3"]} alt="Ngăn chứa đồ ẩn SMF12" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                      <IconBox color={GOLD_PALE} size={40} />
                      <span style={{ fontSize: 13, fontFamily: FONT_BODY }}>GIF ngăn chứa đồ ẩn</span>
                    </div>
                  )}
                  {editMode && <ImageUploadOverlay blockKey="detail_img_3" currentUrl={content["detail_img_3"] || ""} onUploaded={handleSaved} />}
                </div>
              </div>
              <div style={{ padding: "8px 0" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(139,105,20,0.08)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_FULL, padding: "6px 16px", marginBottom: 20 }}>
                  <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", fontFamily: FONT_BODY }}>04 / NGĂN CHỨA</span>
                </div>
                <h3 style={{ fontSize: "clamp(20px, 2.5vw, 32px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 16, fontFamily: FONT_HEADING, color: WHITE }}>Ngăn Chứa Đồ Thiết Kế Ẩn</h3>
                <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.8, fontFamily: FONT_BODY, marginBottom: 24 }}>Thiết kế ngăn chứa ẩn bên dưới gầm sofa — tối ưu không gian lưu trữ mà không lộ liễu. Lý tưởng để chăn, gối, đồ dùng cá nhân.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["Dung tích lớn, chứa được chăn gối", "Mở/đóng dễ dàng bằng 1 thao tác", "Thiết kế ẩn, giữ không gian gọn gàng"].map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, marginTop: 7, flexShrink: 0 }} />
                      <span style={{ color: GRAY, fontSize: 14, fontFamily: FONT_BODY, lineHeight: 1.6 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Item 5 — Áo nệm Da PU có khoá kéo (1:1 GIF, text bên trái) */}
        <FadeIn delay={320}>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }} className="lp-detail-row">
              <div style={{ padding: "8px 0", order: 0 }} className="lp-detail-text-left">
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(139,105,20,0.08)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_FULL, padding: "6px 16px", marginBottom: 20 }}>
                  <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", fontFamily: FONT_BODY }}>05 / ÁO NỆM</span>
                </div>
                <h3 style={{ fontSize: "clamp(20px, 2.5vw, 32px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 16, fontFamily: FONT_HEADING, color: WHITE }}>Áo Nệm Da PU Có Khoá Kéo</h3>
                <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.8, fontFamily: FONT_BODY, marginBottom: 24 }}>Áo nệm da PU cao cấp có khoá kéo toàn thân — tháo ra thay nệm hoặc thay vỏ áo dễ dàng. Giặt sạch, bảo dưỡng tiện lợi.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["Khoá kéo YKK chịu lực, không kẹt", "Tháo/lắp trong vài phút", "Dễ dàng thay vỏ áo khi cần"].map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, marginTop: 7, flexShrink: 0 }} />
                      <span style={{ color: GRAY, fontSize: 14, fontFamily: FONT_BODY, lineHeight: 1.6 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                <div style={{ position: "relative", paddingBottom: "100%", background: BLACK_CARD }}>
                  {content["detail_img_4"] ? (
                    <img src={content["detail_img_4"]} alt="Áo nệm da PU khoá kéo SMF12" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                      <IconAward color={GOLD_PALE} size={40} />
                      <span style={{ fontSize: 13, fontFamily: FONT_BODY }}>GIF áo nệm khoá kéo</span>
                    </div>
                  )}
                  {editMode && <ImageUploadOverlay blockKey="detail_img_4" currentUrl={content["detail_img_4"] || ""} onUploaded={handleSaved} />}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Item 6 — Túi đựng sách, tạp chí, điều khiển 2 bên tay vịn (1:1 GIF) */}
        <FadeIn delay={400}>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }} className="lp-detail-row">
              <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                <div style={{ position: "relative", paddingBottom: "100%", background: BLACK_CARD }}>
                  {content["detail_img_5"] ? (
                    <img src={content["detail_img_5"]} alt="Túi đựng sách tạp chí điều khiển SMF12" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                      <IconBox color={GOLD_PALE} size={40} />
                      <span style={{ fontSize: 13, fontFamily: FONT_BODY }}>GIF túi đựng 2 bên tay vịn</span>
                    </div>
                  )}
                  {editMode && <ImageUploadOverlay blockKey="detail_img_5" currentUrl={content["detail_img_5"] || ""} onUploaded={handleSaved} />}
                </div>
              </div>
              <div style={{ padding: "8px 0" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(139,105,20,0.08)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_FULL, padding: "6px 16px", marginBottom: 20 }}>
                  <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", fontFamily: FONT_BODY }}>06 / TÚI ĐỰNG</span>
                </div>
                <h3 style={{ fontSize: "clamp(20px, 2.5vw, 32px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 16, fontFamily: FONT_HEADING, color: WHITE }}>Túi Đựng Sách &amp; Điều Khiển</h3>
                <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.8, fontFamily: FONT_BODY, marginBottom: 24 }}>Thiết kế túi đựng tiện dụng 2 bên tay vịn — lưu trữ sách, tạp chí, điều khiển TV, điện thoại ngay tầm tay khi ngồi hoặc nằm.</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["2 túi 2 bên, dễ tiếp cận", "Chứa được sách, tạp chí, điều khiển", "Chất liệu đồng bộ với áo nệm da PU"].map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, marginTop: 7, flexShrink: 0 }} />
                      <span style={{ color: GRAY, fontSize: 14, fontFamily: FONT_BODY, lineHeight: 1.6 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { bkQ: "faq_1_q", defQ: "Sofa giường da PU SMF12 có bền không?", bkA: "faq_1_a", defA: "Da PU SMF12 được nhập khẩu từ nhà máy đạt chuẩn ISO, chịu được trên 50.000 lần gập mở mà không bong tróc. Bề mặt kháng nước, kháng bụi bẩn, dễ lau chùi." },
  { bkQ: "faq_2_q", defQ: "Kích thước nào phù hợp với phòng của tôi?", bkA: "faq_2_a", defA: "SMF12 có 4 kích thước: 0,9m (phòng đơn), 1,2m (phòng nhỏ), 1,4m (phòng trung), 1,6m (phòng rộng). Khi gấp làm sofa, chiều sâu chỉ 90cm — rất tiết kiệm không gian." },
  { bkQ: "faq_3_q", defQ: "Cơ cấu gập mở có phức tạp không?", bkA: "faq_3_a", defA: "Cơ cấu SmartFold được thiết kế 1 thao tác — chỉ kéo/đẩy nhẹ là chuyển đổi. Không cần tháo lắp, không cần dụng cụ. Phù hợp cả người cao tuổi và trẻ em." },
  { bkQ: "faq_4_q", defQ: "Đệm ngồi và đệm nằm có thoải mái không?", bkA: "faq_4_a", defA: "Đệm foam D40 dày 12cm, kết hợp lớp memory foam 3cm trên cùng — đảm bảo êm ái khi ngồi và đủ cứng để hỗ trợ cột sống khi nằm ngủ." },
  { bkQ: "faq_5_q", defQ: "Khung gỗ có bị mối mọt không?", bkA: "faq_5_a", defA: "Khung gỗ thông được xử lý chống mối mọt và sấy khô đạt độ ẩm < 12%. Kết hợp với thanh giằng thép mạ kẽm, đảm bảo độ bền trên 10 năm sử dụng bình thường." },
  { bkQ: "faq_6_q", defQ: "Trả góp có được không?", bkA: "faq_6_a", defA: "Có. SmartFurni hỗ trợ trả góp 0% lãi suất qua các đối tác tài chính. Liên hệ hotline để được tư vấn phương thức phù hợp nhất." },
];

type EFn = (props: { bk: string; def: string; as?: "h1"|"h2"|"h3"|"h4"|"h5"|"h6"|"p"|"span"|"div"|"li"; style?: React.CSSProperties; multiline?: boolean }) => React.ReactNode;

function FaqAccordion({ E: EditFn }: { E: EFn }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i} style={{ border: `1px solid ${isOpen ? `rgba(139,105,20,0.4)` : BLACK_BORDER}`, borderRadius: R_MD, overflow: "hidden", transition: "border-color 0.2s", background: isOpen ? `rgba(139,105,20,0.04)` : BLACK }}>
            <button onClick={() => setOpenIndex(isOpen ? null : i)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
              <span style={{ color: WHITE, fontSize: 14, fontWeight: 500, fontFamily: FONT_BODY, lineHeight: 1.5, paddingRight: 16 }}>
                {EditFn({ bk: item.bkQ, def: item.defQ, as: "span" })}
              </span>
              <span style={{ color: GOLD, fontSize: 18, fontWeight: 300, flexShrink: 0, transition: "transform 0.2s", transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
            </button>
            {isOpen && (
              <div style={{ padding: "0 20px 18px", color: GRAY, fontSize: 13, lineHeight: 1.8, fontFamily: FONT_BODY }}>
                {EditFn({ bk: item.bkA, def: item.defA, as: "span", multiline: true })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── UrgencyBanner ────────────────────────────────────────────────────────────
function UrgencyBanner({ E: EditFn }: { E: EFn }) {
  const [timeLeft, setTimeLeft] = useState({ h: 23, m: 47, s: 12 });
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        let { h, m, s } = prev;
        s--; if (s < 0) { s = 59; m--; } if (m < 0) { m = 59; h--; } if (h < 0) { h = 23; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`, padding: "20px 24px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ color: "#FDFAF5", fontWeight: 700, fontSize: 15, fontFamily: FONT_HEADING, marginBottom: 4 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><IconZap color={GOLD} size={18} />{EditFn({ bk: "urgency_title", def: "Ưu đãi tháng này — Tặng bộ ga gối trị giá 890.000₫", as: "span" })}</span>
          </div>
          <div style={{ color: "rgba(253,250,245,0.85)", fontSize: 12, fontFamily: FONT_BODY }}>
            {EditFn({ bk: "urgency_sub", def: "Chỉ còn áp dụng cho 12 đơn hàng tiếp theo", as: "span" })}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "rgba(253,250,245,0.8)", fontSize: 12, fontFamily: FONT_BODY }}>Kết thúc sau:</span>
          {[pad(timeLeft.h), pad(timeLeft.m), pad(timeLeft.s)].map((t, i) => (
            <React.Fragment key={i}>
              <div style={{ background: "rgba(26,18,0,0.2)", color: "#FDFAF5", fontWeight: 700, fontSize: 20, fontFamily: FONT_HEADING, padding: "6px 10px", borderRadius: R_SM, minWidth: 40, textAlign: "center" }}>{t}</div>
              {i < 2 && <span style={{ color: "#FDFAF5", fontWeight: 700, fontSize: 18 }}>:</span>}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── StickyCta ────────────────────────────────────────────────────────────────
function StickyCta({ scrollToForm, E: EditFn }: { scrollToForm: () => void; E: EFn }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const fn = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  if (!show) return null;
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "rgba(253,250,245,0.97)", borderTop: `1px solid ${BLACK_BORDER}`, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, backdropFilter: "blur(8px)" }}>
      <div>
        <div style={{ color: WHITE, fontWeight: 700, fontSize: 15, fontFamily: FONT_HEADING }}>
          {EditFn({ bk: "sticky_price", def: "Từ 8.490.000 ₫", as: "span" })}
        </div>
        <div style={{ color: GRAY_LIGHT, fontSize: 11, fontFamily: FONT_BODY }}>Miễn phí giao hàng + lắp đặt</div>
      </div>
      <GoldButton onClick={scrollToForm} style={{ padding: "12px 24px", fontSize: 12 }}>
        {EditFn({ bk: "sticky_cta", def: "Đặt Hàng Ngay →", as: "span" })}
      </GoldButton>
    </div>
  );
}

// ─── LeadForm ─────────────────────────────────────────────────────────────────
function LeadForm({ submitLabel, selectedSize }: { submitLabel?: string; selectedSize?: string }) {
  const [step, setStep] = useState(1);
  const [quiz, setQuiz] = useState({ roomSize: "", usage: "", budget: "" });
  const [form, setForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [utms, setUtms] = useState<Record<string, string>>({});
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setUtms({ utmSource: p.get("utm_source") || "", utmMedium: p.get("utm_medium") || "", utmCampaign: p.get("utm_campaign") || "", utmContent: p.get("utm_content") || "" });
  }, []);
  const setF = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { setError("Vui lòng điền đầy đủ Họ tên và Số điện thoại (*)"); return; }
    if (!/^(0|\+84)[0-9]{8,10}$/.test(form.phone.replace(/\s/g, ""))) { setError("Số điện thoại không hợp lệ"); return; }
    setLoading(true); setError("");
    try {
      const noteStr = `Kích thước chọn: ${selectedSize || quiz.roomSize} | Mục đích: ${quiz.usage} | Ngân sách: ${quiz.budget} | Địa chỉ: ${form.address} | Ghi chú: ${form.note}`;
      const res = await fetch("/api/lp/submit-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landingPageSlug: LP_SLUG, name: form.name, phone: form.phone, email: "", note: noteStr, ...utms }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Lỗi server"); }
      setSuccess(true);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại"); }
    finally { setLoading(false); }
  }
  const inp: React.CSSProperties = { width: "100%", background: "rgba(139,105,20,0.04)", border: `1px solid rgba(139,105,20,0.2)`, color: WHITE, padding: "13px 16px", fontSize: 14, outline: "none", fontFamily: FONT_BODY, boxSizing: "border-box" as const, transition: "border-color 0.2s", borderRadius: R_MD };
  if (success) return (
    <div style={{ textAlign: "center", padding: "56px 32px", background: BLACK_CARD, border: `1px solid ${GOLD}`, borderRadius: R_LG }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: `rgba(139,105,20,0.1)`, border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h3 style={{ fontSize: 24, fontWeight: 600, color: GOLD, marginBottom: 12, fontFamily: FONT_HEADING }}>Đặt hàng thành công!</h3>
      <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.75, fontFamily: FONT_BODY }}>Cảm ơn bạn đã tin tưởng SmartFurni.<br />Đội ngũ tư vấn sẽ liên hệ qua <strong style={{ color: GOLD }}>Zalo / điện thoại</strong> trong vòng 2 giờ làm việc để xác nhận đơn hàng.</p>
    </div>
  );
  return (
    <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, padding: "clamp(24px,4vw,44px)", borderRadius: R_LG }}>
      {/* Progress */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 16 }}>
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: step >= s ? GOLD : `rgba(139,105,20,0.06)`, border: `1.5px solid ${step >= s ? GOLD : "rgba(139,105,20,0.25)"}`, color: step >= s ? "#FDFAF5" : GRAY, fontSize: 13, fontWeight: 700, fontFamily: FONT_HEADING, transition: "all 0.3s" }}>
                {step > s ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7l4 4 6-6" stroke="#FDFAF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> : s}
              </div>
              {s < 2 && <div style={{ flex: 1, height: 2, background: step > s ? GOLD : `rgba(139,105,20,0.15)`, transition: "background 0.3s" }} />}
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: step === 1 ? GOLD : GRAY, fontSize: 11, fontWeight: 600, fontFamily: FONT_BODY, letterSpacing: "0.06em" }}>BƯỚC 1 — Thông tin nhu cầu</span>
          <span style={{ color: step === 2 ? GOLD : GRAY, fontSize: 11, fontWeight: 600, fontFamily: FONT_BODY, letterSpacing: "0.06em" }}>BƯỚC 2 — Thông tin liên hệ</span>
        </div>
      </div>
      {step === 1 && (
        <div>
          {/* Kích thước phòng */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ color: WHITE, fontSize: 14, fontWeight: 600, marginBottom: 14, fontFamily: FONT_BODY }}>Diện tích phòng của bạn?</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {[{ v: "small", l: "Dưới 15m²", sub: "Phòng nhỏ / studio" }, { v: "medium", l: "15–25m²", sub: "Phòng trung bình" }, { v: "large", l: "25–40m²", sub: "Phòng rộng" }, { v: "xlarge", l: "Trên 40m²", sub: "Phòng lớn / căn hộ" }].map(o => (
                <button key={o.v} onClick={() => setQuiz(q => ({ ...q, roomSize: o.v }))}
                  style={{ padding: "14px 16px", border: `1.5px solid ${quiz.roomSize === o.v ? GOLD : BLACK_BORDER}`, borderRadius: R_MD, background: quiz.roomSize === o.v ? `rgba(139,105,20,0.08)` : BLACK, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                  <div style={{ color: quiz.roomSize === o.v ? GOLD : WHITE, fontWeight: 600, fontSize: 13, fontFamily: FONT_BODY }}>{o.l}</div>
                  <div style={{ color: GRAY_LIGHT, fontSize: 11, fontFamily: FONT_BODY, marginTop: 2 }}>{o.sub}</div>
                </button>
              ))}
            </div>
          </div>
          {/* Mục đích sử dụng */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ color: WHITE, fontSize: 14, fontWeight: 600, marginBottom: 14, fontFamily: FONT_BODY }}>Mục đích sử dụng chính?</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {[{ v: "daily", l: "Ngủ hàng ngày", sub: "Phòng ngủ chính" }, { v: "guest", l: "Phòng khách", sub: "Tiếp khách + ngủ thỉnh thoảng" }, { v: "office", l: "Phòng làm việc", sub: "Nghỉ trưa, thư giãn" }, { v: "rental", l: "Cho thuê", sub: "Căn hộ dịch vụ, homestay" }].map(o => (
                <button key={o.v} onClick={() => setQuiz(q => ({ ...q, usage: o.v }))}
                  style={{ padding: "14px 16px", border: `1.5px solid ${quiz.usage === o.v ? GOLD : BLACK_BORDER}`, borderRadius: R_MD, background: quiz.usage === o.v ? `rgba(139,105,20,0.08)` : BLACK, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                  <div style={{ color: quiz.usage === o.v ? GOLD : WHITE, fontWeight: 600, fontSize: 13, fontFamily: FONT_BODY }}>{o.l}</div>
                  <div style={{ color: GRAY_LIGHT, fontSize: 11, fontFamily: FONT_BODY, marginTop: 2 }}>{o.sub}</div>
                </button>
              ))}
            </div>
          </div>
          <GoldButton onClick={() => setStep(2)} style={{ width: "100%", justifyContent: "center" }}>
            Tiếp theo — Nhận tư vấn →
          </GoldButton>
        </div>
      )}
      {step === 2 && (
        <form onSubmit={handleSubmit}>
          {(quiz.roomSize || selectedSize) && (
            <div style={{ background: `rgba(139,105,20,0.06)`, border: `1px solid rgba(139,105,20,0.2)`, borderRadius: R_MD, padding: "12px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY }}>
                {selectedSize ? `Kích thước đã chọn: ${selectedSize}` : `Phòng ${quiz.roomSize} · ${quiz.usage}`}
              </span>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input style={inp} placeholder="Họ và tên (*)" value={form.name} onChange={setF("name")} required />
            <input style={inp} placeholder="Số điện thoại (*)" value={form.phone} onChange={setF("phone")} required />
            <input style={inp} placeholder="Địa chỉ giao hàng" value={form.address} onChange={setF("address")} />
            <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} placeholder="Ghi chú thêm (màu sắc, yêu cầu đặc biệt...)" value={form.note} onChange={setF("note")} />
          </div>
          {error && <div style={{ color: RED_SOFT, fontSize: 13, marginTop: 12, fontFamily: FONT_BODY }}>{error}</div>}
          <GoldButton style={{ width: "100%", marginTop: 20, justifyContent: "center", fontSize: 14, padding: "16px 24px" }}>
            {loading ? "Đang gửi..." : (submitLabel || "Tư Vấn & Đặt Hàng Ngay →")}
          </GoldButton>
          <p style={{ color: GRAY_LIGHT, fontSize: 11, textAlign: "center", marginTop: 12, fontFamily: FONT_BODY }}>
            
          </p>
        </form>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LpSmf12Client({ isEditor = false, initialContent = {} }: Props) {
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState<Record<string, string>>(initialContent);
  const [editedCount, setEditedCount] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");

  useEffect(() => {
    setScrollY(window.scrollY);
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const scrollToForm = useCallback(() => scrollTo("register-form"), []);

  const handleSaved = useCallback((key: string, val: string) => {
    setContent(prev => ({ ...prev, [key]: val }));
    setEditedCount(c => c + 1);
  }, []);
  const handleDeleted = useCallback((key: string) => {
    setContent(prev => { const n = { ...prev }; delete n[key]; return n; });
    setEditedCount(c => c + 1);
  }, []);

  // EditableText shorthand
  const E: EFn = useCallback(({ bk, def, as, style, multiline }) => (
    <EditableText slug={LP_SLUG} blockKey={bk} defaultValue={def} editMode={editMode} as={as} style={style} multiline={multiline} savedValue={content[bk]} onSaved={handleSaved} onDeleted={handleDeleted} />
  ), [editMode, content, handleSaved, handleDeleted]);

  const navScrolled = scrollY > 60;
  const heroImages = ["hero_bg_0", "hero_bg_1", "hero_bg_2"].map(k => content[k] || "");
  const heroOverlay = parseFloat(content["hero_overlay"] || "0.35");

  // Size options
  const SIZES = [
    { id: "0.9m", label: "0,9m × 2,0m", price: "8.490.000 ₫", sub: "Phòng đơn / studio" },
    { id: "1.2m", label: "1,2m × 2,0m", price: "9.290.000 ₫", sub: "Phòng nhỏ đến trung bình" },
    { id: "1.4m", label: "1,4m × 2,0m", price: "10.490.000 ₫", sub: "Phòng trung bình", badge: "Bán chạy nhất" },
    { id: "1.6m", label: "1,6m × 2,0m", price: "11.890.000 ₫", sub: "Phòng rộng / căn hộ" },
  ];

  return (
    <div style={{ fontFamily: FONT_BODY, background: BLACK, color: WHITE, minHeight: "100vh" }}>
      {/* ── EDIT BAR ── */}
      {isEditor && (
        <LpEditBar isEditor={isEditor} editMode={editMode} onToggleEditMode={() => setEditMode(m => !m)} editedCount={editedCount} slug={LP_SLUG} />
      )}

      {/* ── STICKY NAV ── */}
      <nav style={{
        position: "fixed", top: isEditor ? 48 : 0, left: 0, right: 0, zIndex: 100,
        background: navScrolled ? "rgba(18,14,4,0.97)" : "transparent",
        borderBottom: navScrolled ? `1px solid rgba(139,105,20,0.25)` : "none",
        backdropFilter: navScrolled ? "blur(16px)" : "none",
        WebkitBackdropFilter: navScrolled ? "blur(16px)" : "none",
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "0 24px",
          height: 68,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}>
          {/* Logo */}
          <a href="/lp/smf12" style={{ flexShrink: 0, textDecoration: "none" }}>
            <img src="/smartfurni-logo-transparent.png" alt="SmartFurni"
              style={{ height: 44, objectFit: "contain", filter: "brightness(1.05)" }} />
          </a>

          {/* Menu — desktop, ẩn trên mobile */}
          <div className="lp-nav-menu" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "center" }}>
            {([
              ["product-detail", "Tính năng"],
              ["products", "Sản phẩm"],
              ["benefits", "Lợi ích"],
              ["testimonials", "Đánh giá"],
              ["register-form", "Đặt hàng"],
            ] as [string, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: navScrolled ? "rgba(253,250,245,0.75)" : "rgba(253,250,245,0.85)",
                  fontSize: 13, fontWeight: 500,
                  fontFamily: FONT_BODY, padding: "8px 14px", borderRadius: R_SM,
                  letterSpacing: "0.01em", transition: "color 0.2s, background 0.2s",
                  whiteSpace: "nowrap" as const,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = GOLD;
                  (e.currentTarget as HTMLButtonElement).style.background = `rgba(139,105,20,0.08)`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = navScrolled ? "rgba(253,250,245,0.75)" : "rgba(253,250,245,0.85)";
                  (e.currentTarget as HTMLButtonElement).style.background = "none";
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* CTA button — ẩn trên mobile */}
          <button
            onClick={scrollToForm}
            className="lp-nav-cta"
            style={{
              flexShrink: 0,
              background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
              color: BLACK, border: "none", padding: "9px 20px",
              fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", cursor: "pointer",
              textTransform: "uppercase" as const, borderRadius: R_MD, fontFamily: FONT_BODY,
              transition: "opacity 0.2s, transform 0.15s",
              whiteSpace: "nowrap" as const,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
          >
            ĐẶT HÀNG NGAY
          </button>

          {/* Hamburger — chỉ hiện trên mobile */}
          <button
            className="lp-nav-hamburger"
            onClick={() => setMobileMenuOpen(v => !v)}
            style={{
              background: "none", border: `1px solid rgba(139,105,20,0.35)`,
              borderRadius: R_SM, padding: "8px 10px", cursor: "pointer",
              display: "flex", flexDirection: "column", gap: 5, flexShrink: 0,
            }}
            aria-label="Menu"
          >
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: "block", width: 20, height: 1.5, background: GOLD_LIGHT, borderRadius: 1 }} />
            ))}
          </button>
        </div>
      </nav>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div style={{
          position: "fixed", top: isEditor ? 116 : 68, left: 0, right: 0, zIndex: 99,
          background: "rgba(253,250,245,0.98)", backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${BLACK_BORDER}`,
          padding: "16px 24px 24px",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {([
              ["product-detail", "Tính năng"],
              ["products", "Sản phẩm"],
              ["benefits", "Lợi ích"],
              ["testimonials", "Đánh giá"],
              ["register-form", "Đặt hàng"],
            ] as [string, string][]).map(([id, label]) => (
              <button
                key={id}
                onClick={() => { scrollTo(id); setMobileMenuOpen(false); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: GRAY, fontSize: 15, fontWeight: 500,
                  fontFamily: FONT_BODY, padding: "14px 16px",
                  textAlign: "left" as const, borderRadius: R_SM,
                  letterSpacing: "0.02em",
                }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => { scrollToForm(); setMobileMenuOpen(false); }}
              style={{
                background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
                color: BLACK, border: "none", padding: "14px 20px",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                textTransform: "uppercase" as const, borderRadius: R_MD,
                fontFamily: FONT_BODY, marginTop: 8, letterSpacing: "0.08em",
              }}
            >
              Đặt Hàng Ngay →
            </button>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section id="hero" className="lp-hero-section" style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        {/* Hero background */}
        <div className="lp-hero-bg" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          {heroImages[0] ? (
            <img src={heroImages[0]} alt="SMF12 Hero" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${BLACK_CARD} 0%, ${BLACK_SOFT} 100%)` }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: `rgba(26,18,0,${heroOverlay})` }} />
        </div>
        {/* Edit hero */}
        {isEditor && editMode && (
          <EditableHeroImage slug={LP_SLUG} imageKeys={["hero_bg_0", "hero_bg_1", "hero_bg_2"]} overlayKey="hero_overlay" imageUrls={heroImages} overlayOpacity={heroOverlay} editMode={editMode} onImageSaved={handleSaved} onOverlaySaved={(k, v) => handleSaved(k, String(v))} />
        )}
        {/* Hero content: wrapper flex dọc cho mobile order */}
        <div className="lp-hero-content" style={{ position: "relative", zIndex: 1, width: "100%", display: "flex", flexDirection: "column" }}>
          {/* Phần chữ chính */}
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "120px 24px 32px", width: "100%", boxSizing: "border-box" as const }}>
            <div style={{ maxWidth: 680 }}>
              {/* Badge nhãn hiệu */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <span style={{ display: "inline-block", width: 28, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_PALE})` }} />
                <span style={{ color: GOLD_PALE, fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", fontFamily: FONT_BODY, textTransform: "uppercase" as const }}>
                  {E({ bk: "hero_section_label", def: "Sofa Giường Da PU Cao Cấp", as: "span" })}
                </span>
                <span style={{ display: "inline-block", width: 28, height: 1, background: `linear-gradient(90deg, ${GOLD_PALE}, transparent)` }} />
              </div>

              {/* Tiêu đề chính */}
              <h1 style={{ fontSize: "clamp(34px, 5.5vw, 68px)", fontWeight: 800, lineHeight: 1.05, marginBottom: 6, fontFamily: FONT_HEADING, letterSpacing: "-0.025em", color: "#FFFFFF" }}>
                {E({ bk: "hero_title_1", def: "Sofa Ban Ngày", as: "span", style: { display: "block" } })}
              </h1>
              <h1 style={{ fontSize: "clamp(32px, 5vw, 62px)", fontWeight: 400, lineHeight: 1.1, marginBottom: 24, fontFamily: FONT_BRAND, fontStyle: "italic", color: GOLD_PALE, letterSpacing: "-0.01em" }}>
                {E({ bk: "hero_title_2", def: "Giường ÊM Ban Đêm", as: "span" })}
              </h1>

              {/* Đường kẻ vàng */}
              <div style={{ width: 48, height: 2, background: `linear-gradient(90deg, ${GOLD_LIGHT}, ${GOLD_PALE})`, borderRadius: 2, marginBottom: 24 }} />

              <p style={{ color: "rgba(253,250,245,0.80)", fontSize: "clamp(14px, 1.8vw, 17px)", lineHeight: 1.75, marginBottom: 0, fontFamily: FONT_BODY, maxWidth: 500, fontWeight: 300 }}>
                {E({ bk: "hero_desc", def: "Da PU nhập khẩu cao cấp. Cơ cấu SmartFold 1 thao tác. Đệm foam D40 dày 12cm. Giao hàng và lắp đặt tận nơi toàn quốc.", as: "span", multiline: true })}
              </p>
            </div>
          </div>

          {/* CTA row — desktop: nằm trong flow bình thường; mobile: order 3 (sau ảnh) */}
          <div className="lp-hero-cta-row" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 0", width: "100%", boxSizing: "border-box" as const, display: "flex", gap: 14, flexWrap: "wrap" as const }}>
            <GoldButton onClick={scrollToForm} style={{ fontSize: 13, padding: "15px 32px", letterSpacing: "0.08em" }}>
              {E({ bk: "hero_cta_primary", def: "NHẬN TƯ VẤN & BÁO GIÁ NGAY", as: "span" })}
            </GoldButton>
            <OutlineButton onClick={() => scrollTo("products")}>
              {E({ bk: "hero_cta_secondary", def: "Xem sản phẩm ↓", as: "span" })}
            </OutlineButton>
          </div>

          {/* Trust badges — desktop: nằm trong flow; mobile: order 4 */}
          <div className="lp-hero-badges" style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 72px", width: "100%", boxSizing: "border-box" as const, borderTop: `1px solid rgba(139,105,20,0.25)`, marginTop: 28, display: "flex", gap: 32, flexWrap: "wrap" as const }}>
            {[
              { num: "3 Năm", label: "Bảo hành da" },
              { num: "50.000", label: "Lần gập mở" },
              { num: "D40", label: "Đệm foam cao cấp" },
              { num: "100%", label: "Da PU nhập khẩu" },
            ].map((b, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ color: GOLD_PALE, fontSize: 18, fontWeight: 700, fontFamily: FONT_HEADING, lineHeight: 1, letterSpacing: "-0.01em" }}>{b.num}</div>
                <div style={{ color: "rgba(253,250,245,0.5)", fontSize: 10, fontFamily: FONT_BODY, marginTop: 5, letterSpacing: "0.07em", textTransform: "uppercase" as const }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION ── */}
      <section id="problems" className="lp-section-pad" style={{ background: "#1C1A14", padding: "96px 24px", position: "relative" }}>
        {/* Texture overlay */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(139,105,20,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,105,20,0.04) 0%, transparent 50%)`, pointerEvents: "none" }} />
        <div style={{ maxWidth: 1060, margin: "0 auto", position: "relative" }}>
          {/* Header */}
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <SectionLabel>{E({ bk: "problem_section_label", def: "Thực trạng phòng ngủ Việt", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, lineHeight: 1.1, marginBottom: 10, fontFamily: FONT_HEADING, letterSpacing: "-0.02em", color: "#FFFFFF" }}>
                {E({ bk: "problem_title_1", def: "Bạn Có Đang Lãng Phí", as: "span" })}
              </h2>
              <div style={{ color: GOLD_PALE, fontSize: "clamp(18px, 2.5vw, 30px)", fontWeight: 400, fontFamily: FONT_BRAND, fontStyle: "italic", marginBottom: 16 }}>
                {E({ bk: "problem_title_2", def: "Không Gian Sống Của Mình?", as: "span" })}
              </div>
              <div style={{ width: 48, height: 2, background: `linear-gradient(90deg, ${GOLD_LIGHT}, ${GOLD_PALE})`, borderRadius: 2, margin: "0 auto" }} />
            </div>
          </FadeIn>

          {/* 2 cột: Vấn đề vs Giải pháp */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }} className="lp-problem-grid">

            {/* Cột trái: Vấn đề */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: `${R_LG}px 0 0 ${R_LG}px`, border: `1px solid rgba(255,255,255,0.07)`, borderRight: "none", padding: "36px 32px 36px 32px", display: "flex", flexDirection: "column" }}>
              <FadeIn>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(192,57,43,0.15)", border: "1px solid rgba(192,57,43,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>😰</div>
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: "0.15em", fontFamily: FONT_BODY, textTransform: "uppercase" as const, marginBottom: 2 }}>Vấn đề hiện tại</div>
                    <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, fontWeight: 600, fontFamily: FONT_HEADING }}>Vấn đề thường gặp</div>
                  </div>
                </div>
              </FadeIn>
              {[
                { text: "Phòng nhỏ chật chội, không đủ chỗ cho cả sofa lẫn giường", icon: "✕" },
                { text: "Sofa vải dễ bám bụi, khó vệ sinh, nhanh xuống màu", icon: "✕" },
                { text: "Giường chỉ dùng ban đêm — lãng phí không gian ban ngày", icon: "✕" },
                { text: "Khách đến chơi không có chỗ ngồi thoải mái", icon: "✕" },
              ].map((p, i) => (
                <FadeIn key={i} delay={i * 120}>
                  <div style={{ display: "flex", gap: 14, marginBottom: 18, alignItems: "flex-start", padding: "14px 16px", borderRadius: R_SM, background: "rgba(192,57,43,0.05)", border: "1px solid rgba(192,57,43,0.12)" }}>
                    <span style={{ color: RED_SOFT, fontWeight: 700, flexShrink: 0, fontSize: 13, marginTop: 1, opacity: 0.8 }}>{p.icon}</span>
                    <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 14, lineHeight: 1.65, fontFamily: FONT_BODY }}>{p.text}</span>
                  </div>
                </FadeIn>
              ))}
            </div>

            {/* Cột phải: Giải pháp */}
            <div style={{ background: "rgba(139,105,20,0.07)", borderRadius: `0 ${R_LG}px ${R_LG}px 0`, border: `1px solid rgba(139,105,20,0.25)`, borderLeft: `2px solid rgba(139,105,20,0.5)`, padding: "36px 32px 36px 32px", display: "flex", flexDirection: "column" }}>
              <FadeIn delay={100}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(139,105,20,0.2)", border: `1px solid rgba(139,105,20,0.4)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IconDiamond color={GOLD_PALE} size={18} />
                  </div>
                  <div>
                    <div style={{ color: GOLD, fontSize: 10, letterSpacing: "0.15em", fontFamily: FONT_BODY, textTransform: "uppercase" as const, marginBottom: 2 }}>Giải pháp</div>
                    <div style={{ color: GOLD_PALE, fontSize: 15, fontWeight: 600, fontFamily: FONT_HEADING }}>SMF12 đáp ứng</div>
                  </div>
                </div>
              </FadeIn>
              {[
                { text: "2-in-1: sofa tiếp khách ban ngày + giường ngủ ban đêm", highlight: "2-in-1" },
                { text: "Da PU cao cấp — lau sạch trong 30 giây, kháng nước hoàn toàn", highlight: "30 giây" },
                { text: "Tiết kiệm 40% diện tích so với dùng riêng sofa + giường", highlight: "40%" },
                { text: "Cơ cấu SmartFold 1 thao tác — chuyển đổi trong 10 giây", highlight: "10 giây" },
              ].map((s, i) => (
                <FadeIn key={i} delay={100 + i * 120}>
                  <div style={{ display: "flex", gap: 14, marginBottom: 18, alignItems: "flex-start", padding: "14px 16px", borderRadius: R_SM, background: "rgba(139,105,20,0.08)", border: `1px solid rgba(139,105,20,0.2)` }}>
                    <span style={{ flexShrink: 0, marginTop: 2 }}><IconCheck color={GOLD_PALE} size={15} /></span>
                    <span style={{ color: "rgba(253,250,245,0.8)", fontSize: 14, lineHeight: 1.65, fontFamily: FONT_BODY }}>
                      {(() => { const parts = s.text.split(s.highlight); return parts.map((part, j) => j === parts.length - 1 ? <span key={j}>{part}</span> : <span key={j}>{part}<strong style={{ color: GOLD_PALE, fontWeight: 700 }}>{s.highlight}</strong></span>); })()}
                    </span>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>

          {/* Tagline */}
          <FadeIn delay={300}>
            <div style={{ textAlign: "center", marginTop: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(139,105,20,0.3))" }} />
              <p style={{ color: GRAY_LIGHT, fontSize: 13, fontFamily: FONT_BODY, fontStyle: "italic", margin: 0, whiteSpace: "nowrap" as const }}>
                Cùng một không gian — nhưng trải nghiệm hoàn toàn khác nhau
              </p>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(139,105,20,0.3), transparent)" }} />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PRODUCT IMAGES ── */}
      <section id="showcase" className="lp-section-pad" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>{E({ bk: "showcase_section_label", def: "Hình ảnh sản phẩm", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "showcase_title_1", def: "SMF12 — Thiết Kế Tinh Tế", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING }}>
                {E({ bk: "showcase_title_2", def: "Phù Hợp Mọi Không Gian", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="lp-showcase-grid">
            {[
              { bkImg: "showcase_img_0", badge: "CHẾ ĐỘ SOFA", bkCaption: "showcase_cap_0", defCaption: "Tư thế ngồi thoải mái — tiếp khách, làm việc" },
              { bkImg: "showcase_img_1", badge: "CHẾ ĐỘ GIƯỜNG", bkCaption: "showcase_cap_1", defCaption: "Trải phẳng hoàn toàn — ngủ êm ái như giường thật" },
              { bkImg: "showcase_img_2", badge: "CHI TIẾT DA PU", bkCaption: "showcase_cap_2", defCaption: "Da PU nhập khẩu — mịn mượt, kháng nước, bền màu" },
            ].map((item, i) => {
              const imgSrc = content[item.bkImg] || "";
              return (
                <FadeIn key={i} delay={i * 100}>
                  <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                    <div style={{ position: "relative", paddingBottom: "100%", background: BLACK_CARD }}>
                      {imgSrc ? (
                        <Image src={imgSrc} alt={item.defCaption} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 100vw, 33vw" />
                      ) : (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: GRAY_LIGHT, fontSize: 13, fontFamily: FONT_BODY }}>Chưa có ảnh</div>
                      )}
                      {editMode && <ImageUploadOverlay blockKey={item.bkImg} currentUrl={imgSrc} onUploaded={handleSaved} />}
                      {editMode && imgSrc && (
                        <button onClick={async () => { await fetch(`/api/admin/lp-content?slug=${LP_SLUG}&blockKey=${item.bkImg}`, { method: "DELETE" }); handleDeleted(item.bkImg); }} style={{ position: "absolute", top: 8, right: 8, zIndex: 20, background: "rgba(239,68,68,0.9)", color: "#fff", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>×</button>
                      )}
                    </div>
                    <div style={{ position: "absolute", top: 12, left: 12, background: `rgba(139,105,20,0.9)`, color: "#FDFAF5", fontSize: 9, fontWeight: 700, padding: "4px 10px", borderRadius: R_FULL, letterSpacing: "0.12em", fontFamily: FONT_BODY }}>
                      {item.badge}
                    </div>
                    <div style={{ padding: "16px 16px 20px", background: BLACK_CARD }}>
                      <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.6, fontFamily: FONT_BODY, margin: 0 }}>
                        {E({ bk: item.bkCaption, def: item.defCaption, as: "span", multiline: true })}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── THÔNG SỐ KỸ THUẬT ── */}
      <section id="specs" className="lp-section-pad" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>{E({ bk: "spec_section_label", def: "Thông số kỹ thuật", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "spec_title_1", def: "Thông Số Kỹ Thuật", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING }}>
                {E({ bk: "spec_title_2", def: "SmartFurni SMF12", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }} className="lp-specs-layout">
              {/* Bảng thông số bên trái */}
              <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, overflow: "hidden" }}>
                {[
                  ["Kích thước (sofa)", "0,9m / 1,2m / 1,4m / 1,6m × 0,9m × 0,85m (C)"],
                  ["Kích thước (giường)", "0,9m / 1,2m / 1,4m / 1,6m × 2,0m"],
                  ["Tải trọng tối đa", "250 kg"],
                  ["Chất liệu bọc", "Da PU nhập khẩu — kháng nước, kháng UV"],
                  ["Đệm ngồi/nằm", "Foam D40 dày 12cm + memory foam 3cm"],
                  ["Khung chính", "Gỗ thông xử lý chống mối + thanh giằng thép mạ kẽm"],
                  ["Cơ cấu gập mở", "SmartFold — 1 thao tác, không cần dụng cụ"],
                  ["Số lần gập mở kiểm định", "50.000 lần"],
                  ["Chân sofa", "Gỗ sồi tự nhiên / thép sơn tĩnh điện (tuỳ phiên bản)"],
                  ["Màu sắc", "Đen, Nâu, Xám tro, Be (kem)"],
                  ["Bảo hành da", "3 năm chính hãng"],
                  ["Bảo hành khung", "2 năm"],
                  ["Trọng lượng", "~38 kg (1m4) / ~44 kg (1m6)"],
                  ["Xuất xứ", "Việt Nam — chất liệu nhập khẩu"],
                ].map(([label, value], i) => (
                  <div key={i} style={{ display: "flex", padding: "14px 24px", background: i % 2 === 0 ? BLACK_CARD : BLACK, borderBottom: i < 13 ? `1px solid ${BLACK_BORDER}` : "none" }}>
                    <div style={{ width: "40%", color: GRAY_LIGHT, fontSize: 13, fontFamily: FONT_BODY, flexShrink: 0 }}>{label}</div>
                    <div style={{ color: WHITE, fontSize: 13, fontFamily: FONT_BODY, fontWeight: 500 }}>{value}</div>
                  </div>
                ))}
              </div>
              {/* Ảnh 1:1 bên phải */}
              <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                <div style={{ position: "relative", paddingBottom: "100%", background: BLACK_CARD }}>
                  {content["specs_img"] ? (
                    <Image src={content["specs_img"]} alt="SmartFurni SMF12" fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 100vw, 50vw" />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke={GRAY_LIGHT} strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" stroke={GRAY_LIGHT} strokeWidth="1.5"/><path d="M21 15l-5-5L5 21" stroke={GRAY_LIGHT} strokeWidth="1.5" strokeLinecap="round"/></svg>
                      <span style={{ fontSize: 12, fontFamily: FONT_BODY }}>Ảnh sản phẩm</span>
                    </div>
                  )}
                  {editMode && (
                    <ImageUploadOverlay blockKey="specs_img" currentUrl={content["specs_img"] || ""} onUploaded={handleSaved} />
                  )}
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── BEFORE / AFTER SLIDER ── */}
      <section className="lp-section-pad" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>{E({ bk: "ba_section_label", def: "Kết quả thực tế", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "ba_title_1", def: "Phòng Của Bạn", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING, marginBottom: 8 }}>
                {E({ bk: "ba_title_2", def: "Trước Và Sau SMF12", as: "span" })}
              </div>
              <GoldDivider />
              <p style={{ color: GRAY, fontSize: 14, lineHeight: 1.75, fontFamily: FONT_BODY }}>
                Kéo thanh trượt để xem sự khác biệt — cùng một căn phòng, hoàn toàn khác trải nghiệm
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <BeforeAfterSlider beforeUrl={content["ba_before_img"]} afterUrl={content["ba_after_img"]} beforeLabel="Sofa thường" afterLabel="Với SMF12" />
            {editMode && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                {[{ k: "ba_before_img", label: "Ảnh TRƯỚC" }, { k: "ba_after_img", label: "Ảnh SAU" }].map(({ k, label }) => (
                  <div key={k} style={{ position: "relative", height: 60, background: BLACK_CARD, border: `1px dashed ${GOLD}`, borderRadius: R_MD, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <ImageUploadOverlay blockKey={k} currentUrl={content[k] || ""} onUploaded={handleSaved} />
                    <span style={{ color: GOLD, fontSize: 12, fontFamily: FONT_BODY }}>{label}</span>
                  </div>
                ))}
              </div>
            )}
          </FadeIn>
          <FadeIn delay={200}>
            <p style={{ textAlign: "center", color: GRAY_LIGHT, fontSize: 12, marginTop: 16, fontFamily: FONT_BODY, fontStyle: "italic" }}>
              Ảnh thực tế từ khách hàng — không chỉnh sửa
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── PRODUCT DETAIL ── */}
      <ProductDetailSection editMode={editMode} content={content} handleSaved={handleSaved} />

      {/* ── VIDEO SECTION ── */}
      <section id="video" className="lp-section-pad" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>{E({ bk: "video_section_label", def: "Video thực tế", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "video_title_1", def: "Xem SMF12 Hoạt Động", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING }}>
                {E({ bk: "video_title_2", def: "Thực Tế Từ Khách Hàng", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          {/* 4 Shorts 9:16 hàng ngang — carousel trên mobile */}
          <FadeIn delay={100}>
            <div className="lp-shorts-grid">
              {[
                { bkId: "video_sub_1_id", bkTitle: "video_sub_1_title", defTitle: "Review sau 6 tháng sử dụng", tag: "REVIEW" },
                { bkId: "video_sub_2_id", bkTitle: "video_sub_2_title", defTitle: "Hướng dẫn gấp mở SMF12", tag: "HƯỡNG DẪN" },
                { bkId: "video_sub_3_id", bkTitle: "video_sub_3_title", defTitle: "So sánh SMF12 vs sofa thường", tag: "SO SÁNH" },
                { bkId: "video_sub_4_id", bkTitle: "video_sub_4_title", defTitle: "Unboxing và lắp ráp SMF12", tag: "UNBOXING" },
              ].map((v, i) => (
                <div key={i} className="lp-shorts-item">
                  <ShortsCard
                    videoId={content[v.bkId] || "_placeholder_"}
                    title={content[v.bkTitle] || v.defTitle}
                    tag={v.tag}
                    titleNode={
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                        <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT_HEADING, lineHeight: 1.35, textShadow: "0 1px 6px rgba(0,0,0,0.9)", letterSpacing: "-0.01em", flex: 1 }}>
                          {E({ bk: v.bkTitle, def: v.defTitle, as: "span" })}
                        </div>
                      </div>
                    }
                  />
                  {editMode && (
                    <VideoEditOverlay blockKey={v.bkId} currentId={content[v.bkId] || ""} onSaved={(k, val) => handleSaved(k, val)} />
                  )}
                </div>
              ))}
            </div>
          </FadeIn>
          <FadeIn delay={200}>
            <div style={{ textAlign: "center", marginTop: 32 }}>
              <a href="https://www.youtube.com/@SmartFurni" target="_blank" rel="noopener noreferrer" style={{ color: GOLD, fontSize: 13, fontFamily: FONT_BODY, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                ▶ Xem thêm video trên kênh YouTube SmartFurni →
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PRODUCTS / SIZE SELECTOR ── */}
      <section id="products" className="lp-section-pad" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>{E({ bk: "products_section_label", def: "Dòng sản phẩm", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "products_title_1", def: "Sofa Giường Da PU", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING, marginBottom: 8 }}>
                {E({ bk: "products_title_2", def: "SmartFurni SMF12", as: "span" })}
              </div>
              <GoldDivider />
              <p style={{ color: GRAY, fontSize: 14, lineHeight: 1.75, fontFamily: FONT_BODY }}>
                Da PU nhập khẩu cao cấp, cơ cấu SmartFold bền bỉ — bảo hành 3 năm chính hãng
              </p>
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20 }} className="lp-products-grid">
            {SIZES.map((size, i) => {
              const imgKey = `product_img_${i}`;
              const imgSrc = content[imgKey] || "";
              const isSelected = selectedSize === size.id;
              return (
                <FadeIn key={size.id} delay={i * 80}>
                  <div style={{ background: BLACK_CARD, border: `1.5px solid ${isSelected ? GOLD : BLACK_BORDER}`, borderRadius: R_LG, overflow: "hidden", transition: "border-color 0.2s, box-shadow 0.2s", boxShadow: isSelected ? `0 0 0 3px rgba(139,105,20,0.15)` : "none" }}>
                    <div style={{ position: "relative", paddingBottom: "66%", background: BLACK }}>
                      {imgSrc ? (
                        <Image src={imgSrc} alt={`SMF12 ${size.label}`} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 100vw, 50vw" />
                      ) : (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: GRAY_LIGHT, fontSize: 13, fontFamily: FONT_BODY }}>Ảnh {size.label}</div>
                      )}
                      {editMode && <ImageUploadOverlay blockKey={imgKey} currentUrl={imgSrc} onUploaded={handleSaved} />}
                      {size.badge && (
                        <div style={{ position: "absolute", top: 12, left: 12, background: GOLD, color: "#FDFAF5", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: R_FULL, letterSpacing: "0.1em", fontFamily: FONT_BODY }}>{size.badge}</div>
                      )}
                    </div>
                    <div style={{ padding: "20px 20px 24px" }}>
                      <div style={{ color: GRAY_LIGHT, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 6, fontFamily: FONT_BODY }}>SMF12-{size.id.replace(".", "").toUpperCase()}</div>
                      <h3 style={{ color: WHITE, fontSize: 16, fontWeight: 600, marginBottom: 6, fontFamily: FONT_HEADING }}>
                        Sofa Giường SMF12 — {size.label}
                      </h3>
                      <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.6, marginBottom: 16, fontFamily: FONT_BODY }}>
                        {size.sub}. Da PU kháng nước, cơ cấu SmartFold, đệm foam D40 dày 12cm.
                      </p>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                        <div style={{ color: GOLD, fontWeight: 700, fontSize: 18, fontFamily: FONT_HEADING }}>Từ {size.price}</div>
                        <GoldButton onClick={() => { setSelectedSize(size.id); scrollToForm(); }} style={{ padding: "10px 20px", fontSize: 12 }}>
                          Đặt hàng ngay →
                        </GoldButton>
                      </div>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section className="lp-section-pad" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>{E({ bk: "compare_section_label", def: "Tại sao chọn SMF12?", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "compare_title_1", def: "SMF12 Tiết Kiệm Hơn", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING, marginBottom: 8 }}>
                {E({ bk: "compare_title_2", def: "Mua Riêng Sofa + Giường Đến 60%", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_BODY }}>
                <thead>
                  <tr style={{ background: BLACK_CARD }}>
                    <th style={{ padding: "16px 20px", textAlign: "left", color: GRAY_LIGHT, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", borderBottom: `1px solid ${BLACK_BORDER}` }}>TIÊU CHÍ</th>
                    <th style={{ padding: "16px 20px", textAlign: "center", color: GOLD, fontSize: 13, fontWeight: 700, borderBottom: `1px solid ${BLACK_BORDER}` }}>SmartFurni SMF12</th>
                    <th style={{ padding: "16px 20px", textAlign: "center", color: GRAY, fontSize: 12, fontWeight: 600, borderBottom: `1px solid ${BLACK_BORDER}` }}>Sofa + Giường riêng</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Chi phí", "8.490.000 ₫", "15–30 triệu ₫"],
                    ["Diện tích chiếm dụng", "✓ Tiết kiệm 40%", "✗ Cần 2 vị trí riêng"],
                    ["Vệ sinh", "✓ Lau sạch 30 giây", "✗ Sofa vải khó vệ sinh"],
                    ["Chuyển đổi tư thế", "✓ 1 thao tác, 10 giây", "✗ Không thể"],
                    ["Bảo hành da", "✓ 3 năm chính hãng", "6–12 tháng"],
                    ["Đệm ngủ", "✓ Foam D40 dày 12cm", "Thường mỏng hơn"],
                    ["Phù hợp phòng nhỏ", "✓ Từ 0,9m", "✗ Cần diện tích lớn"],
                  ].map(([criteria, smf12, other], i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? BLACK : BLACK_CARD, borderBottom: `1px solid ${BLACK_BORDER}` }}>
                      <td style={{ padding: "14px 20px", color: GRAY, fontSize: 13 }}>{criteria}</td>
                      <td style={{ padding: "14px 20px", textAlign: "center", color: smf12.startsWith("✓") ? GOLD : WHITE, fontSize: 13, fontWeight: smf12.startsWith("✓") ? 600 : 400 }}>{smf12}</td>
                      <td style={{ padding: "14px 20px", textAlign: "center", color: other.startsWith("✗") ? RED_SOFT : GRAY, fontSize: 13 }}>{other}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: GRAY_LIGHT, fontSize: 11, marginTop: 12, fontFamily: FONT_BODY, fontStyle: "italic" }}>* Giá sofa + giường tham khảo thị trường 2024–2025</p>
          </FadeIn>
        </div>
      </section>



      {/* ── HÌNH ẢNH THỰC TẾSẢN PHẨM ── */}
      <section id="benefits" className="lp-section-pad" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>{E({ bk: "gallery_section_label", def: "Hình ảnh thực tế", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "gallery_title_1", def: "Hình Ảnh Thực Tế", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING }}>
                {E({ bk: "gallery_title_2", def: "Sản Phẩm SMF12 Tại Nhà Khách Hàng", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          {/* Grid 3 cột, 2 hàng, ảnh 1:1 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="lp-gallery-grid">
            {["gallery_img_0","gallery_img_1","gallery_img_2","gallery_img_3","gallery_img_4","gallery_img_5"].map((bk, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                  <div style={{ position: "relative", paddingBottom: "100%", background: BLACK_CARD }}>
                    {content[bk] ? (
                      <Image src={content[bk]} alt={`Ảnh thực tế SMF12 ${i + 1}`} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 50vw, 33vw" />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke={GRAY_LIGHT} strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" stroke={GRAY_LIGHT} strokeWidth="1.5"/><path d="M21 15l-5-5L5 21" stroke={GRAY_LIGHT} strokeWidth="1.5" strokeLinecap="round"/></svg>
                        <span style={{ fontSize: 11, fontFamily: FONT_BODY }}>Chưa có ảnh</span>
                      </div>
                    )}
                    {editMode && (
                      <ImageUploadOverlay blockKey={bk} currentUrl={content[bk] || ""} onUploaded={(k, url) => handleSaved(k, url)} />
                    )}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="lp-section-pad" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>{E({ bk: "howitworks_section_label", def: "Quy trình đặt hàng", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "howitworks_title_1", def: "Nhận SMF12 Tại Nhà", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING }}>
                {E({ bk: "howitworks_title_2", def: "Chỉ Trong 4 Bước Đơn Giản", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }} className="lp-steps-grid">
            {[
              { step: 1, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, bkTitle: "step_1_title", defTitle: "Chọn kích thước phù hợp", bkDesc: "step_1_desc", defDesc: "Chọn size 0,9m – 1,6m phù hợp với phòng của bạn. Đội tư vấn hỗ trợ đo đạc miễn phí." },
              { step: 2, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, bkTitle: "step_2_title", defTitle: "Xác nhận đơn qua Zalo/điện thoại", bkDesc: "step_2_desc", defDesc: "Tư vấn viên liên hệ trong 2 giờ làm việc để xác nhận đơn hàng và thông tin giao hàng." },
              { step: 3, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, bkTitle: "step_3_title", defTitle: "Giao hàng toàn quốc 3–7 ngày", bkDesc: "step_3_desc", defDesc: "Đóng gói cẩn thận, giao hàng tận nơi. Kiểm tra hàng trước khi nhận — không ưng không lấy." },
              { step: 4, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, bkTitle: "step_4_title", defTitle: "Lắp đặt miễn phí, tận hưởng ngay", bkDesc: "step_4_desc", defDesc: "Kỹ thuật viên lắp đặt tại nhà, hướng dẫn sử dụng. Bắt đầu tận hưởng sofa giường SMF12 ngay hôm đó." },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ position: "relative", width: 60, height: 60, margin: "0 auto 16px" }}>
                    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" style={{ position: "absolute", inset: 0 }}>
                      <circle cx="30" cy="30" r="28" stroke={GOLD} strokeWidth="0.75" opacity="0.3"/>
                      <circle cx="30" cy="30" r="22" stroke={GOLD} strokeWidth="1.25" opacity="0.65"/>
                    </svg>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.icon}</div>
                  </div>
                  <div style={{ color: GOLD, fontSize: 9, fontWeight: 700, letterSpacing: "0.25em", marginBottom: 8, fontFamily: FONT_BODY, opacity: 0.65 }}>BƯỚC {s.step}</div>
                  <div style={{ color: WHITE, fontSize: 14, fontWeight: 600, marginBottom: 8, fontFamily: FONT_HEADING }}>
                    {E({ bk: s.bkTitle, def: s.defTitle, as: "span" })}
                  </div>
                  <p style={{ color: GRAY, fontSize: 12, lineHeight: 1.7, fontFamily: FONT_BODY, margin: 0 }}>
                    {E({ bk: s.bkDesc, def: s.defDesc, as: "span", multiline: true })}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={300}>
            <div style={{ textAlign: "center", marginTop: 52 }}>
              <GoldButton onClick={scrollToForm} style={{ fontSize: 14, padding: "16px 40px" }}>
                {E({ bk: "cta_bottom_gold", def: "Đặt Hàng Ngay — Giao Hàng Toàn Quốc", as: "span" })}
              </GoldButton>
            </div>
          </FadeIn>
        </div>
      </section>



      {/* ── TRUST / SOCIAL PROOF ── */}
      <section id="testimonials" className="lp-section-pad" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>{E({ bk: "trust_section_label", def: "Chứng nhận & Đánh giá", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "trust_title_1", def: "Được Tin Tưởng Bởi", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING }}>
                {E({ bk: "trust_title_2", def: "Hàng Nghìn Gia Đình Việt Nam", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          {/* Social proof numbers */}
          <FadeIn>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 52 }} className="lp-stats-grid">
              {[
                { num: "3.200+", label: "Sản phẩm đã bán" },
                { num: "4.8/5", label: "Đánh giá trung bình" },
                { num: "98%", label: "Khách hàng hài lòng" },
                { num: "3 năm", label: "Bảo hành chính hãng" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center", padding: "24px 16px", background: BLACK_CARD, borderRadius: R_MD, border: `1px solid ${BLACK_BORDER}` }}>
                  <div style={{ color: GOLD, fontSize: 28, fontWeight: 700, fontFamily: FONT_HEADING, marginBottom: 6 }}>{s.num}</div>
                  <div style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY }}>{s.label}</div>
                </div>
              ))}
            </div>
          </FadeIn>
          {/* Reviews */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="lp-reviews-grid">
            {[
              { bkName: "review_1_name", defName: "Chị Nguyễn Thị Lan", bkLoc: "review_1_loc", defLoc: "TP. Hồ Chí Minh", bkText: "review_1_text", defText: "Mua cho phòng trọ 15m², tiết kiệm không gian cực kỳ. Da PU lau sạch trong 30 giây, có con nhỏ mà không lo bẩn. Cơ cấu gập mở mượt mà, dùng 8 tháng vẫn như mới.", stars: 5 },
              { bkName: "review_2_name", defName: "Anh Trần Văn Minh", bkLoc: "review_2_loc", defLoc: "Hà Nội", bkText: "review_2_text", defText: "Ban đầu nghi ngờ về chất lượng da PU, nhưng sau 1 năm sử dụng thì thực sự ấn tượng. Không bong tróc, không phai màu. Giao hàng đúng hẹn, lắp đặt chuyên nghiệp.", stars: 5 },
              { bkName: "review_3_name", defName: "Chị Phạm Thị Hương", bkLoc: "review_3_loc", defLoc: "Đà Nẵng", bkText: "review_3_text", defText: "Phòng khách nhỏ mà cần chỗ cho khách ngủ lại. SMF12 giải quyết hoàn hảo — ban ngày là sofa đẹp, tối khách nằm ngủ thoải mái. Đệm dày, êm hơn mong đợi.", stars: 5 },
              { bkName: "review_4_name", defName: "Anh Lê Hoàng Nam", bkLoc: "review_4_loc", defLoc: "Bình Dương", bkText: "review_4_text", defText: "Mua cho phòng làm việc tại nhà. Trưa nằm nghỉ, tối tiếp khách. Màu nâu rất sang, hợp với nội thất gỗ. Sẽ mua thêm 1 cái nữa cho phòng ngủ phụ.", stars: 5 },
              { bkName: "review_5_name", defName: "Chị Võ Thị Mai", bkLoc: "review_5_loc", defLoc: "Cần Thơ", bkText: "review_5_text", defText: "Giá hợp lý so với chất lượng. Khung gỗ chắc, da PU mịn. Gấp mở 1 tay dễ dàng dù tôi là phụ nữ. Bảo hành 3 năm yên tâm hơn nhiều so với hàng khác.", stars: 5 },
              { bkName: "review_6_name", defName: "Anh Nguyễn Đức Thành", bkLoc: "review_6_loc", defLoc: "Hải Phòng", bkText: "review_6_text", defText: "Đặt hàng online, nhân viên tư vấn nhiệt tình. Giao hàng đúng hẹn, đóng gói cẩn thận. Lắp đặt xong trong 30 phút. Chất lượng vượt kỳ vọng ở tầm giá này.", stars: 5 },
            ].map((r, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "24px 20px" }}>
                  <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
                    {Array(r.stars).fill(0).map((_, si) => <IconStar key={si} color={GOLD} size={14} filled={true} />)}
                  </div>
                  <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.7, fontFamily: FONT_BODY, marginBottom: 16 }}>
                    "{E({ bk: r.bkText, def: r.defText, as: "span", multiline: true })}"
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: `rgba(139,105,20,0.15)`, border: `1px solid rgba(139,105,20,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, fontWeight: 700, fontSize: 14, fontFamily: FONT_HEADING, flexShrink: 0 }}>
                      {E({ bk: r.bkName, def: r.defName, as: "span" })?.toString().charAt(0)}
                    </div>
                    <div>
                      <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY }}>
                        {E({ bk: r.bkName, def: r.defName, as: "span" })}
                      </div>
                      <div style={{ color: GRAY_LIGHT, fontSize: 11, fontFamily: FONT_BODY }}>
                        {E({ bk: r.bkLoc, def: r.defLoc, as: "span" })}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── GUARANTEE ── */}
      <section className="lp-section-pad" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>{E({ bk: "guarantee_section_label", def: "Cam kết SmartFurni", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "guarantee_title_1", def: "Mua Hàng Không Lo Rủi Ro —", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING }}>
                {E({ bk: "guarantee_title_2", def: "SmartFurni Cam Kết 100%", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="lp-guarantee-grid">
            {[
              { icon: <IconShield color={GOLD} size={36} />, bkTitle: "guarantee_1_title", defTitle: "Bảo hành 3 năm da PU", bkDesc: "guarantee_1_desc", defDesc: "Da bong tróc, phai màu, rách do lỗi sản xuất — SmartFurni thay mới hoàn toàn miễn phí trong 3 năm đầu." },
              { icon: <IconRefresh color={GOLD} size={36} />, bkTitle: "guarantee_2_title", defTitle: "Đổi trả trong 7 ngày", bkDesc: "guarantee_2_desc", defDesc: "Nhận hàng không ưng ý về chất lượng? Liên hệ trong 7 ngày — SmartFurni thu hồi và hoàn tiền 100%." },
              { icon: <IconTruck color={GOLD} size={36} />, bkTitle: "guarantee_3_title", defTitle: "Giao hàng đúng hẹn", bkDesc: "guarantee_3_desc", defDesc: "Cam kết giao hàng trong 3–7 ngày làm việc. Trễ hẹn — SmartFurni tặng thêm bộ ga gối trị giá 890.000₫." },
            ].map((g, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "28px 24px", textAlign: "center" }}>
                  <div style={{ marginBottom: 16 }}>{g.icon}</div>
                  <h3 style={{ color: GOLD, fontSize: 15, fontWeight: 600, marginBottom: 12, fontFamily: FONT_HEADING }}>
                    {E({ bk: g.bkTitle, def: g.defTitle, as: "span" })}
                  </h3>
                  <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.7, fontFamily: FONT_BODY, margin: 0 }}>
                    {E({ bk: g.bkDesc, def: g.defDesc, as: "span", multiline: true })}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── URGENCY BANNER ── */}
      <UrgencyBanner E={E} />

      {/* ── FAQ ── */}
      <section id="faq" className="lp-section-pad" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>{E({ bk: "faq_section_label", def: "Câu hỏi thường gặp", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "faq_title_1", def: "Giải Đáp Mọi Thắc Mắc", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING }}>
                {E({ bk: "faq_title_2", def: "Về Sofa Giường SMF12", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <FaqAccordion E={E} />
          </FadeIn>
          <FadeIn delay={200}>
            <div style={{ textAlign: "center", marginTop: 36, padding: "24px", background: BLACK_CARD, borderRadius: R_LG, border: `1px solid ${BLACK_BORDER}` }}>
              <p style={{ color: GRAY, fontSize: 14, fontFamily: FONT_BODY, marginBottom: 16 }}>
                Còn câu hỏi khác? Đội tư vấn SmartFurni sẵn sàng hỗ trợ bạn
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="tel:0123456789" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GOLD, color: "#FDFAF5", padding: "10px 20px", borderRadius: R_MD, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, textDecoration: "none" }}><IconPhone color="#FDFAF5" size={14} />Gọi ngay
                  
                </a>
                <a href="https://zalo.me/0123456789" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: GOLD, border: `1px solid ${GOLD}`, padding: "10px 20px", borderRadius: R_MD, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, textDecoration: "none" }}><IconChat color={GOLD} size={14} />Chat Zalo
                  
                </a>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── REGISTER FORM ── */}
      <section id="register-form" className="lp-section-pad" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>{E({ bk: "form_section_label", def: "Đặt hàng ngay hôm nay", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "form_title_1", def: "Nhận Tư Vấn Miễn Phí", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING }}>
                {E({ bk: "form_title_2", def: "Báo Giá Tức Thì Trong 2 Giờ", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 40, alignItems: "start" }} className="lp-form-grid">
            {/* Left side — benefits */}
            <FadeIn>
              <div>
                <div style={{ marginBottom: 32 }}>
                  <div style={{ color: WHITE, fontSize: 16, fontWeight: 600, fontFamily: FONT_HEADING, marginBottom: 20 }}>Khi đặt hàng hôm nay, bạn nhận được:</div>
                  {[
                    { icon: <IconCheck color={GOLD} size={16} />, text: "Tư vấn kích thước phù hợp miễn phí" },
                    { icon: <IconCheck color={GOLD} size={16} />, text: "Báo giá chính xác theo nhu cầu" },
                    { icon: <IconCheck color={GOLD} size={16} />, text: "Giao hàng + lắp đặt miễn phí toàn quốc" },
                    { icon: <IconCheck color={GOLD} size={16} />, text: "Tặng bộ ga gối trị giá 890.000₫" },
                    { icon: <IconCheck color={GOLD} size={16} />, text: "Bảo hành 3 năm da PU chính hãng" },
                    { icon: <IconCheck color={GOLD} size={16} />, text: "Hỗ trợ kỹ thuật tận nơi suốt thời gian bảo hành" },
                  ].map((b, i) => (
                    <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
                      <span style={{ color: GOLD, fontWeight: 700, flexShrink: 0 }}>{b.icon}</span>
                      <span style={{ color: GRAY, fontSize: 14, lineHeight: 1.6, fontFamily: FONT_BODY }}>{b.text}</span>
                    </div>
                  ))}
                </div>
                {/* Price range */}
                <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "24px 20px" }}>
                  <div style={{ color: GRAY_LIGHT, fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 12, fontFamily: FONT_BODY }}>BẢNG GIÁ SMF12</div>
                  {SIZES.map((s, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < SIZES.length - 1 ? `1px solid ${BLACK_BORDER}` : "none" }}>
                      <span style={{ color: GRAY, fontSize: 13, fontFamily: FONT_BODY }}>{s.label}</span>
                      <span style={{ color: GOLD, fontWeight: 700, fontSize: 14, fontFamily: FONT_HEADING }}>{s.price}</span>
                    </div>
                  ))}
                  <p style={{ color: GRAY_LIGHT, fontSize: 11, marginTop: 12, fontFamily: FONT_BODY, fontStyle: "italic" }}>
                    * Đã bao gồm VAT, giao hàng và lắp đặt
                  </p>
                </div>
              </div>
            </FadeIn>
            {/* Right side — form */}
            <FadeIn delay={150}>
              <LeadForm submitLabel="Đặt Hàng & Nhận Tư Vấn Ngay →" selectedSize={selectedSize} />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="lp-section-pad" style={{ background: `linear-gradient(135deg, ${BLACK_CARD} 0%, #EDE4D0 100%)`, padding: "80px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <FadeIn>
            <SectionLabel>{E({ bk: "cta_final_label", def: "Ưu đãi có giới hạn", as: "span" })}</SectionLabel>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 48px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
              {E({ bk: "cta_final_title_1", def: "Đừng Để Không Gian Sống", as: "span" })}
            </h2>
            <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 32px)", fontWeight: 300, fontFamily: FONT_HEADING, marginBottom: 24 }}>
              {E({ bk: "cta_final_title_2", def: "Bị Lãng Phí Thêm Một Ngày Nào Nữa", as: "span" })}
            </div>
            <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.75, fontFamily: FONT_BODY, marginBottom: 36 }}>
              {E({ bk: "cta_final_desc", def: "Hàng nghìn gia đình Việt Nam đã chọn SmartFurni SMF12 để tối ưu không gian sống. Đặt hàng hôm nay — nhận tư vấn trong 2 giờ, giao hàng trong 7 ngày.", as: "span", multiline: true })}
            </p>
            <GoldButton onClick={scrollToForm} style={{ fontSize: 15, padding: "18px 48px" }}>
              {E({ bk: "cta_final_btn", def: "Đặt Hàng Ngay — Miễn Phí Giao Hàng →", as: "span" })}
            </GoldButton>
            <p style={{ color: GRAY_LIGHT, fontSize: 12, marginTop: 16, fontFamily: FONT_BODY }}>
              
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: BLACK_CARD, borderTop: `1px solid ${BLACK_BORDER}`, padding: "48px 24px 32px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 40 }} className="lp-footer-grid">
            {/* Brand */}
            <div>
              <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" style={{ height: 40, objectFit: "contain", marginBottom: 16 }} />
              <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.7, fontFamily: FONT_BODY, marginBottom: 20, maxWidth: 280 }}>
                SmartFurni — Nội thất thông minh Việt Nam. Chuyên cung cấp sofa giường đa năng chất lượng cao, phù hợp với không gian sống hiện đại.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                {["Facebook", "Zalo", "YouTube", "TikTok"].map(s => (
                  <div key={s} style={{ width: 32, height: 32, borderRadius: "50%", background: `rgba(139,105,20,0.1)`, border: `1px solid rgba(139,105,20,0.2)`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <span style={{ color: GOLD, fontSize: 9, fontWeight: 700, fontFamily: FONT_BODY }}>{s.charAt(0)}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Sản phẩm */}
            <div>
              <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, fontFamily: FONT_HEADING, marginBottom: 16, letterSpacing: "0.05em" }}>SẢN PHẨM</div>
              {["Sofa Giường SMF12", "Sofa Giường GSF150", "Sofa Giường Da Thật", "Xem tất cả"].map(l => (
                <div key={l} style={{ color: GRAY, fontSize: 13, fontFamily: FONT_BODY, marginBottom: 10, cursor: "pointer" }}>{l}</div>
              ))}
            </div>
            {/* Hỗ trợ */}
            <div>
              <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, fontFamily: FONT_HEADING, marginBottom: 16, letterSpacing: "0.05em" }}>HỖ TRỢ</div>
              {["Chính sách bảo hành", "Hướng dẫn sử dụng", "Chính sách đổi trả", "Câu hỏi thường gặp"].map(l => (
                <div key={l} style={{ color: GRAY, fontSize: 13, fontFamily: FONT_BODY, marginBottom: 10, cursor: "pointer" }}>{l}</div>
              ))}
            </div>
            {/* Liên hệ */}
            <div>
              <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, fontFamily: FONT_HEADING, marginBottom: 16, letterSpacing: "0.05em" }}>LIÊN HỆ</div>
              {[
                { icon: <IconPhone color={GOLD} size={14} />, text: "0123 456 789" },
                { icon: <IconMail color={GOLD} size={14} />, text: "info@smartfurni.vn" },
                { icon: <IconPin color={GOLD} size={14} />, text: "TP. Hồ Chí Minh" },
                { icon: <IconClock color={GOLD} size={14} />, text: "8:00 – 21:00 mỗi ngày" },
              ].map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}>{c.icon}</span>
                  <span style={{ color: GRAY, fontSize: 13, fontFamily: FONT_BODY }}>{c.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${BLACK_BORDER}`, paddingTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <p style={{ color: GRAY_LIGHT, fontSize: 12, fontFamily: FONT_BODY, margin: 0 }}>
              © 2025 SmartFurni. Tất cả quyền được bảo lưu.
            </p>
            <div style={{ display: "flex", gap: 20 }}>
              {["Chính sách bảo mật", "Điều khoản sử dụng"].map(l => (
                <span key={l} style={{ color: GRAY_LIGHT, fontSize: 12, fontFamily: FONT_BODY, cursor: "pointer" }}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── STICKY CTA ── */}
      <StickyCta scrollToForm={scrollToForm} E={E} />

      {/* ── FLOATING ZALO + CALL BUTTONS ── */}
      <div style={{ position: "fixed", bottom: 80, right: 18, zIndex: 850, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
        {/* Nút Gọi điện */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="lp-wave-ring" style={{ background: "rgba(34,197,94,0.25)" }} />
          <span className="lp-wave-ring lp-wave-ring-2" style={{ background: "rgba(34,197,94,0.15)" }} />
          <a href="tel:0918326552" title="Gọi điện tư vấn"
            style={{ position: "relative", zIndex: 2, width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#22c55e,#16a34a)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(34,197,94,0.45)", textDecoration: "none", transition: "transform 0.2s" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.1)"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </a>
        </div>

        {/* Nút Zalo */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="lp-wave-ring" style={{ background: "rgba(0,104,255,0.25)" }} />
          <span className="lp-wave-ring lp-wave-ring-2" style={{ background: "rgba(0,104,255,0.15)" }} />
          <a href="https://zalo.me/0918326552" target="_blank" rel="noopener noreferrer" title="Chat Zalo"
            style={{ position: "relative", zIndex: 2, width: 46, height: 46, borderRadius: "50%", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "transform 0.2s" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.1)"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"}>
            <svg width="46" height="46" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M22.782 0.166016H27.199C33.2653 0.166016 36.8103 1.05701 39.9572 2.74421C43.1041 4.4314 45.5875 6.89585 47.2557 10.0428C48.9429 13.1897 49.8339 16.7347 49.8339 22.801V27.1991C49.8339 33.2654 48.9429 36.8104 47.2557 39.9573C45.5685 43.1042 43.1041 45.5877 39.9572 47.2559C36.8103 48.9431 33.2653 49.8341 27.199 49.8341H22.8009C16.7346 49.8341 13.1896 48.9431 10.0427 47.2559C6.89583 45.5687 4.41243 43.1042 2.7442 39.9573C1.057 36.8104 0.166016 33.2654 0.166016 27.1991V22.801C0.166016 16.7347 1.057 13.1897 2.7442 10.0428C4.43139 6.89585 6.89583 4.41245 10.0427 2.74421C13.1707 1.05701 16.7346 0.166016 22.782 0.166016Z" fill="#0068FF"/>
              <path opacity="0.12" fillRule="evenodd" clipRule="evenodd" d="M49.8336 26.4736V27.1994C49.8336 33.2657 48.9427 36.8107 47.2555 39.9576C45.5683 43.1045 43.1038 45.5879 39.9569 47.2562C36.81 48.9434 33.265 49.8344 27.1987 49.8344H22.8007C17.8369 49.8344 14.5612 49.2378 11.8104 48.0966L7.27539 43.4267L49.8336 26.4736Z" fill="#001A33"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M7.779 43.5892C10.1019 43.846 13.0061 43.1836 15.0682 42.1825C24.0225 47.1318 38.0197 46.8954 46.4923 41.4732C46.8209 40.9803 47.1279 40.4677 47.4128 39.9363C49.1062 36.7779 50.0004 33.22 50.0004 27.1316V22.7175C50.0004 16.629 49.1062 13.0711 47.4128 9.91273C45.7385 6.75436 43.2461 4.28093 40.0877 2.58758C36.9293 0.894239 33.3714 0 27.283 0H22.8499C17.6644 0 14.2982 0.652754 11.4699 1.89893C11.3153 2.03737 11.1636 2.17818 11.0151 2.32135C2.71734 10.3203 2.08658 27.6593 9.12279 37.0782C9.13064 37.0921 9.13933 37.1061 9.14889 37.1203C10.2334 38.7185 9.18694 41.5154 7.55068 43.1516C7.28431 43.399 7.37944 43.5512 7.779 43.5892Z" fill="white"/>
              <path d="M20.5632 17H10.8382V19.0853H17.5869L10.9329 27.3317C10.7244 27.635 10.5728 27.9194 10.5728 28.5639V29.0947H19.748C20.203 29.0947 20.5822 28.7156 20.5822 28.2606V27.1421H13.4922L19.748 19.2938C19.8428 19.1801 20.0134 18.9716 20.0893 18.8768L20.1272 18.8199C20.4874 18.2891 20.5632 17.8341 20.5632 17.2844V17Z" fill="#0068FF"/>
              <path d="M32.9416 29.0947H34.3255V17H32.2402V28.3933C32.2402 28.7725 32.5435 29.0947 32.9416 29.0947Z" fill="#0068FF"/>
              <path d="M25.814 19.6924C23.1979 19.6924 21.0747 21.8156 21.0747 24.4317C21.0747 27.0478 23.1979 29.171 25.814 29.171C28.4301 29.171 30.5533 27.0478 30.5533 24.4317C30.5723 21.8156 28.4491 19.6924 25.814 19.6924ZM25.814 27.2184C24.2785 27.2184 23.0273 25.9672 23.0273 24.4317C23.0273 22.8962 24.2785 21.645 25.814 21.645C27.3495 21.645 28.6007 22.8962 28.6007 24.4317C28.6007 25.9672 27.3685 27.2184 25.814 27.2184Z" fill="#0068FF"/>
              <path d="M40.4867 19.6162C37.8516 19.6162 35.7095 21.7584 35.7095 24.3934C35.7095 27.0285 37.8516 29.1707 40.4867 29.1707C43.1217 29.1707 45.2639 27.0285 45.2639 24.3934C45.2639 21.7584 43.1217 19.6162 40.4867 19.6162ZM40.4867 27.2181C38.9322 27.2181 37.681 25.9669 37.681 24.4124C37.681 22.8579 38.9322 21.6067 40.4867 21.6067C42.0412 21.6067 43.2924 22.8579 43.2924 24.4124C43.2924 25.9669 42.0412 27.2181 40.4867 27.2181Z" fill="#0068FF"/>
              <path d="M29.4562 29.0944H30.5747V19.957H28.6221V28.2793C28.6221 28.7153 29.0012 29.0944 29.4562 29.0944Z" fill="#0068FF"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
