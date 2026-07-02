"use client";
import "./lp-retail.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { EditableText } from "@/components/lp/EditableText";
import { LpEditBar } from "@/components/lp/LpEditBar";
import { redirectToLpThankYou } from "@/lib/lp-thank-you";
import { EditableHeroImage } from "@/components/lp/EditableHeroImage";

function optimizeCldUrl(url: string | undefined, width = 900): string {
  const rawUrl = url?.trim() || "";
  if (!rawUrl || !rawUrl.includes("res.cloudinary.com") || !rawUrl.includes("/image/upload/")) return rawUrl;

  const [prefix, uploadPath] = rawUrl.split("/image/upload/");
  if (!prefix || !uploadPath) return rawUrl;

  const segments = uploadPath.split("/");
  const firstSegment = segments[0] || "";
  const isVersionSegment = /^v\d+$/.test(firstSegment);
  const isTransformationSegment = !isVersionSegment && (
    firstSegment.includes(",") || /^(f|q|w|h|c|dpr|fl|e|g|x|y|r|a|b|co|ar|bo|l|o|t|u|z)_/.test(firstSegment)
  );
  const assetPath = isTransformationSegment ? segments.slice(1).join("/") : uploadPath;

  return `${prefix}/image/upload/f_auto,q_auto:good,w_${width},c_limit/${assetPath}`;
}

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
function IconBed({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M2 4v16M2 8h20v12M2 8c0-2.21 1.79-4 4-4h12c2.21 0 4 1.79 4 4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 8v4M10 8v4" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>;
}
function IconRuler({ color = "currentColor", size = 24 }: { color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

const FOOTER_SVG_ICONS: Record<string, React.ReactElement<React.SVGProps<SVGSVGElement>>> = {
  map_pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  factory: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20V9l6-4v4l6-4v4l6-4v15H2z"/><line x1="2" y1="20" x2="22" y2="20"/><rect x="9" y="14" width="2" height="6"/><rect x="13" y="14" width="2" height="6"/></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.16a16 16 0 006.93 6.93l1.52-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  message_circle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  mail: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  globe: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>,
};

function FooterSvgIcon({ name, size = 24, color = "currentColor", style }: { name: string; size?: number; color?: string; style?: React.CSSProperties }) {
  const icon = FOOTER_SVG_ICONS[name];
  if (!icon) return <span style={{ fontSize: size * 0.8, lineHeight: 1 }}>{name}</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, color, flexShrink: 0, ...style }}>
      {React.cloneElement(icon, { width: size, height: size })}
    </span>
  );
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
const LP_SLUG = "gsf150";
const FONT_HEADING = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_BRAND = "'Cormorant Garamond', Georgia, serif";
const STICKY_PRICE_TEXT = "Từ 29.900.000 ₫";
const LEGACY_STICKY_PRICE_TEXTS = new Set(["Từ 8.490.000 ₫", "Từ 8.490.000 đ"]);
const DEFAULT_CONTACT_PHONE_NUMBER = "0918326552";
const DEFAULT_GSF150_IMAGES: Record<string, string> = {
  hero_bg_0: "/gsf150-wood-frame.jpg",
  hero_bg_1: "/gsf150-standalone.jpg",
  hero_bg_2: "/gsf150-exploded.jpg",
  showcase_img_0: "/gsf150-wood-frame.jpg",
  showcase_img_1: "/gsf150-standalone.jpg",
  showcase_img_2: "/gsf150-exploded.jpg",
  problem_full_img: "/gsf150-wood-frame.jpg",
  features_full_img: "/gsf150-features-infographic.png",
  specs_img: "/gsf150-exploded.jpg",
  ba_after_img: "/gsf150-wood-frame.jpg",
  detail_img_0: "/gsf150-wood-frame.jpg",
  detail_img_1: "/gsf150-standalone.jpg",
  detail_img_2: "/gsf150-exploded.jpg",
  detail_img_3: "/gsf150-wood-frame.jpg",
  detail_img_4: "/gsf150-standalone.jpg",
  detail_img_5: "/gsf150-exploded.jpg",
  product_img_0: "/gsf150-wood-frame.jpg",
  product_img_1: "/gsf150-standalone.jpg",
  product_img_2: "/gsf150-exploded.jpg",
  gallery_img_0: "/gsf150-wood-frame.jpg",
  gallery_img_1: "/gsf150-standalone.jpg",
  gallery_img_2: "/gsf150-exploded.jpg",
  popup_img_0_0: "/gsf150-wood-frame.jpg",
  popup_img_0_1: "/gsf150-standalone.jpg",
  popup_img_0_2: "/gsf150-exploded.jpg",
  popup_img_1_0: "/gsf150-standalone.jpg",
  popup_img_1_1: "/gsf150-wood-frame.jpg",
  popup_img_1_2: "/gsf150-exploded.jpg",
  popup_img_2_0: "/gsf150-exploded.jpg",
  popup_img_2_1: "/gsf150-wood-frame.jpg",
  popup_img_2_2: "/gsf150-standalone.jpg",
};

function defaultImage(blockKey: string) {
  return DEFAULT_GSF150_IMAGES[blockKey] || "";
}

function normalizePhoneNumber(value: string) {
  return (value || "").replace(/[^0-9+]/g, "");
}

function formatPhoneDisplay(value: string) {
  const digits = normalizePhoneNumber(value);
  if (!digits) return "0918.326.552";
  if (/^0\d{9}$/.test(digits)) return `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`;
  return value || digits;
}
const R_SM = 8;
const R_MD = 12;
const R_LG = 16;
const R_FULL = 999;

interface Props {
  isEditor?: boolean;
  initialContent?: Record<string, string>;
  lpSlug?: string;
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
function ShortsCard({ videoId, title, tag, autoplayOnVisible = false }: { videoId: string; title: string; tag?: string; autoplayOnVisible?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const hasVideo = videoId && videoId !== "_placeholder_";
  const thumbHq = hasVideo ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  const thumbMax = hasVideo ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;

  useEffect(() => {
    if (!autoplayOnVisible || !hasVideo || playing) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setPlaying(true);
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [autoplayOnVisible, hasVideo, playing]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", paddingBottom: "177.78%", background: "#111", cursor: playing ? "default" : "pointer", borderRadius: R_LG, overflow: "hidden" }}
      onClick={() => { if (!playing && hasVideo) setPlaying(true); }}>
      {playing ? (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1`}
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
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.18) 45%, transparent 70%)" }} />
          {hasVideo && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.35)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M8 5l11 7-11 7V5z" fill="#1A1200"/></svg>
              </div>
            </div>
          )}
          {tag && (
            <div style={{ position: "absolute", top: 10, left: 10, background: `rgba(139,105,20,0.88)`, color: "#fff", fontSize: 9, fontWeight: 700, padding: "3px 9px", borderRadius: R_FULL, letterSpacing: "0.1em", fontFamily: FONT_BODY }}>
              {tag}
            </div>
          )}
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
function ImageUploadOverlay({ slug, blockKey, currentUrl, onUploaded }: { slug: string; blockKey: string; currentUrl: string; onUploaded: (key: string, url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlVal, setUrlVal] = useState("");

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("slug", slug); fd.append("blockKey", blockKey);
      const res = await fetch("/api/admin/lp-upload-image", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      onUploaded(blockKey, url);
    } catch { alert("Upload thất bại"); } finally { setUploading(false); }
  }

  async function saveUrl(url: string) {
    if (!url.trim()) return;
    await fetch("/api/admin/lp-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, blockKey, content: url.trim() }) });
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
function VideoEditOverlay({ slug, blockKey, currentId, onSaved }: { slug: string; blockKey: string; currentId: string; onSaved: (key: string, id: string) => void }) {
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
    await fetch("/api/admin/lp-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, blockKey, content: id }) });
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
function BeforeAfterSlider({ beforeUrl, afterUrl, beforeLabel = "Giường thường", afterLabel = "Lắp GSF150" }: { beforeUrl?: string; afterUrl?: string; beforeLabel?: string; afterLabel?: string }) {
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
        <img src={optimizeCldUrl(afterUrl, 1200)} alt={afterLabel} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
      ) : (
        <div style={{ position: "absolute", inset: 0, background: "#F0EBE0", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: GOLD, fontSize: 13, fontFamily: FONT_BODY }}>Ảnh SAU (chưa cập nhật)</span>
        </div>
      )}
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
        {beforeUrl ? (
          <img src={optimizeCldUrl(beforeUrl, 1200)} alt={beforeLabel} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
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
    label: "Khung nâng hạ độc lập",
    desc: "Kết cấu khung nâng hạ gọn, đặt lọt trong lòng giường cũ để nâng cấp trải nghiệm mà vẫn giữ nội thất quen thuộc",
    ratio: "100%",   // 1:1
    isGif: false,
  },
  {
    key: "detail_img_1",
    label: "Nâng đầu/chân bằng remote",
    desc: "Điều chỉnh tư thế nâng đầu, nâng chân và thư giãn bằng remote không dây",
    ratio: "100%",   // 1:1
    isGif: true,
  },
  {
    key: "detail_img_2",
    label: "Khung thép gia cường",
    desc: "Khung thép sơn tĩnh điện, gia cường chịu lực và vận hành ổn định trong lòng giường hiện có",
    ratio: "56.25%", // 16:9
    isGif: false,
  },
  {
    key: "detail_img_3",
    label: "Đặt gọn trong giường cũ",
    desc: "Khung thép đặt gọn bên trong giường hiện có, hạn chế thay đổi bố cục phòng ngủ",
    ratio: "100%",   // 1:1
    isGif: true,
  },
  {
    key: "detail_img_4",
    label: "Nệm hiện có vẫn dùng được",
    desc: "Đội kỹ thuật kiểm tra kích thước, độ dày và độ linh hoạt của nệm trước khi lắp đặt",
    ratio: "100%",   // 1:1
    isGif: true,
  },
];

function ProductDetailSection({ lpSlug, editMode, content, handleSaved, E: EditFn }: { lpSlug: string; editMode: boolean; content: Record<string, string>; handleSaved: (key: string, val: string) => void; E: EFn }) {
  return (
    <section id="demo" className="lp-section-pad" style={{ background: BLACK_SOFT, padding: "80px 24px" }}>
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <SectionLabel>{EditFn({ bk: "detail_section_label", def: "Chi tiết sản phẩm", as: "span" })}</SectionLabel>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
              {EditFn({ bk: "detail_title_1", def: "Thông Tin Chi Tiết", as: "span" })}
            </h2>
            <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING, marginBottom: 8 }}>
              {EditFn({ bk: "detail_title_2", def: "GSF150 — Từng Chi Tiết Đều Được Chăm Chút", as: "span" })}
            </div>
            <GoldDivider />
          </div>
        </FadeIn>

        {/* Item 1 — Khung nâng hạ độc lập (4:3, cột ảnh lớn hơn) */}
        <FadeIn delay={0}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 32, alignItems: "center" }} className="lp-detail-row">
              <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                <div style={{ position: "relative", paddingBottom: "75%", background: BLACK_CARD }}>
                  {content["detail_img_0"] || defaultImage("detail_img_0") ? (
                    <Image src={optimizeCldUrl(content["detail_img_0"] || defaultImage("detail_img_0"), 1000)} alt="Khung nâng hạ độc lập GSF150" fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 100vw, 50vw" />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                      <IconDiamond color={GOLD_PALE} size={40} />
                      <span style={{ fontSize: 13, fontFamily: FONT_BODY }}>Ảnh thiết kế sản phẩm</span>
                    </div>
                  )}
                  {editMode && <ImageUploadOverlay slug={lpSlug} blockKey="detail_img_0" currentUrl={content["detail_img_0"] || ""} onUploaded={handleSaved} />}
                </div>
              </div>
              <div style={{ padding: "8px 0" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(139,105,20,0.08)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_FULL, padding: "6px 16px", marginBottom: 20 }}>
                  <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", fontFamily: FONT_BODY }}>{EditFn({ bk: "detail_1_badge", def: "01 / THIẾT KẾ", as: "span" })}</span>
                </div>
                <h3 style={{ fontSize: "clamp(20px, 2.5vw, 32px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 16, fontFamily: FONT_HEADING, color: WHITE }}>{EditFn({ bk: "detail_1_title", def: "Thiết Kế Sản Phẩm", as: "span" })}</h3>
                <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.8, fontFamily: FONT_BODY, marginBottom: 24 }}>{EditFn({ bk: "detail_1_desc", def: "Kết cấu khung nâng hạ gọn, đặt lọt trong lòng giường cũ để nâng cấp trải nghiệm mà vẫn giữ nội thất quen thuộc. Màu sắc trung tính dễ phối hợp với mọi phong cách nội thất.", as: "span", multiline: true })}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { bk: "detail_1_bullet_1", def: "Khung thép sơn tĩnh điện, gọn và chắc" },
                    { bk: "detail_1_bullet_2", def: "Tùy chỉnh theo kích thước lòng giường" },
                    { bk: "detail_1_bullet_3", def: "Tư vấn kiểm tra nệm trước khi lắp" },
                  ].map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, marginTop: 7, flexShrink: 0 }} />
                      <span style={{ color: GRAY, fontSize: 14, fontFamily: FONT_BODY, lineHeight: 1.6 }}>{EditFn({ bk: t.bk, def: t.def, as: "span" })}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Item 2 — Nâng hạ bằng remote */}
        <FadeIn delay={80}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }} className="lp-detail-row">
              <div style={{ padding: "8px 0", order: 0 }} className="lp-detail-text-left">
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(139,105,20,0.08)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_FULL, padding: "6px 16px", marginBottom: 20 }}>
                  <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", fontFamily: FONT_BODY }}>{EditFn({ bk: "detail_2_badge", def: "02 / THAO TÁC", as: "span" })}</span>
                </div>
                <h3 style={{ fontSize: "clamp(20px, 2.5vw, 32px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 16, fontFamily: FONT_HEADING, color: WHITE }}>{EditFn({ bk: "detail_2_title", def: "Nâng Hạ Bằng Remote", as: "span" })}</h3>
                <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.8, fontFamily: FONT_BODY, marginBottom: 24 }}>{EditFn({ bk: "detail_2_desc", def: "Điều chỉnh nâng đầu, nâng chân theo nhu cầu đọc sách, xem phim hoặc nghỉ ngơi. Thao tác bằng remote, không cần thay toàn bộ giường.", as: "span", multiline: true })}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { bk: "detail_2_bullet_1", def: "Nâng đầu và nâng chân linh hoạt" },
                    { bk: "detail_2_bullet_2", def: "Remote không dây, thao tác dễ dùng" },
                    { bk: "detail_2_bullet_3", def: "Phù hợp nhu cầu nghỉ ngơi của gia đình" },
                  ].map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, marginTop: 7, flexShrink: 0 }} />
                      <span style={{ color: GRAY, fontSize: 14, fontFamily: FONT_BODY, lineHeight: 1.6 }}>{EditFn({ bk: t.bk, def: t.def, as: "span" })}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                <div style={{ position: "relative", paddingBottom: "100%", background: BLACK_CARD }}>
                  {content["detail_img_1"] || defaultImage("detail_img_1") ? (
                    <img src={optimizeCldUrl(content["detail_img_1"] || defaultImage("detail_img_1"), 900)} alt="Remote nâng hạ GSF150" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                      <IconZap color={GOLD_PALE} size={40} />
                      <span style={{ fontSize: 13, fontFamily: FONT_BODY }}>Ảnh/GIF thao tác remote</span>
                    </div>
                  )}
                  {editMode && <ImageUploadOverlay slug={lpSlug} blockKey="detail_img_1" currentUrl={content["detail_img_1"] || ""} onUploaded={handleSaved} />}
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
                {content["detail_img_2"] || defaultImage("detail_img_2") ? (
                  <Image src={optimizeCldUrl(content["detail_img_2"] || defaultImage("detail_img_2"), 1200)} alt="Cấu tạo khung nâng hạ GSF150" fill style={{ objectFit: "cover" }} sizes="100vw" />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                    <IconBox color={GOLD_PALE} size={48} />
                    <span style={{ fontSize: 13, fontFamily: FONT_BODY }}>Ảnh khung thép mạ kẽm (16:9)</span>
                  </div>
                )}
                {editMode && <ImageUploadOverlay slug={lpSlug} blockKey="detail_img_2" currentUrl={content["detail_img_2"] || ""} onUploaded={handleSaved} />}
                {/* Overlay badge */}
                <div style={{ position: "absolute", bottom: 20, left: 20, background: `rgba(26,18,0,0.75)`, backdropFilter: "blur(8px)", borderRadius: R_MD, padding: "12px 20px", border: `1px solid rgba(139,105,20,0.3)` }}>
                  <div style={{ color: GOLD_PALE, fontSize: 22, fontWeight: 700, fontFamily: FONT_HEADING, lineHeight: 1 }}>{EditFn({ bk: "detail_3_overlay_num", def: "300kg", as: "span" })}</div>
                  <div style={{ color: "rgba(253,250,245,0.75)", fontSize: 11, fontFamily: FONT_BODY, marginTop: 3 }}>{EditFn({ bk: "detail_3_overlay_label", def: "Tải trọng khuyến nghị", as: "span" })}</div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }} className="lp-detail-stats">
              {[
                { bkNum: "detail_3_stat_1_num", defNum: "Thép", bkLabel: "detail_3_stat_1_label", defLabel: "Khung gia cường" },
                { bkNum: "detail_3_stat_2_num", defNum: "Sơn tĩnh điện", bkLabel: "detail_3_stat_2_label", defLabel: "Bề mặt khung" },
                { bkNum: "detail_3_stat_3_num", defNum: "5 năm", bkLabel: "detail_3_stat_3_label", defLabel: "Bảo hành motor" },
              ].map((s, i) => (
                <div key={i} style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_MD, padding: "16px", textAlign: "center" }}>
                  <div style={{ color: GOLD, fontSize: 20, fontWeight: 700, fontFamily: FONT_HEADING, marginBottom: 4 }}>{EditFn({ bk: s.bkNum, def: s.defNum, as: "span" })}</div>
                  <div style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY }}>{EditFn({ bk: s.bkLabel, def: s.defLabel, as: "span" })}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: "0 4px" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(139,105,20,0.08)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_FULL, padding: "6px 16px", marginBottom: 12 }}>
                <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", fontFamily: FONT_BODY }}>{EditFn({ bk: "detail_3_badge", def: "03 / KHUNG THÉP", as: "span" })}</span>
              </div>
              <h3 style={{ fontSize: "clamp(18px, 2vw, 28px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 10, fontFamily: FONT_HEADING, color: WHITE }}>{EditFn({ bk: "detail_3_title", def: "Khung Thép Gia Cường — Đặt Gọn Trong Giường Cũ", as: "span" })}</h3>
              <p style={{ color: GRAY, fontSize: 14, lineHeight: 1.8, fontFamily: FONT_BODY }}>{EditFn({ bk: "detail_3_desc", def: "Kết cấu khung thép sơn tĩnh điện được gia cường để vận hành ổn định. Sản phẩm đặt trong lòng giường hiện có, giúp nâng cấp công năng mà vẫn giữ phong cách nội thất cũ.", as: "span", multiline: true })}</p>
            </div>
          </div>
        </FadeIn>

        {/* Item 4 — Ngăn chứa đồ ẩn (1:1 GIF) */}
        <FadeIn delay={240}>
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }} className="lp-detail-row">
              <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                <div style={{ position: "relative", paddingBottom: "100%", background: BLACK_CARD }}>
                  {content["detail_img_3"] || defaultImage("detail_img_3") ? (
                    <img src={optimizeCldUrl(content["detail_img_3"] || defaultImage("detail_img_3"), 900)} alt="Lắp GSF150 trong giường cũ" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                      <IconBox color={GOLD_PALE} size={40} />
                      <span style={{ fontSize: 13, fontFamily: FONT_BODY }}>GIF ngăn chứa đồ ẩn</span>
                    </div>
                  )}
                  {editMode && <ImageUploadOverlay slug={lpSlug} blockKey="detail_img_3" currentUrl={content["detail_img_3"] || ""} onUploaded={handleSaved} />}
                </div>
              </div>
              <div style={{ padding: "8px 0" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(139,105,20,0.08)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_FULL, padding: "6px 16px", marginBottom: 20 }}>
                  <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", fontFamily: FONT_BODY }}>{EditFn({ bk: "detail_4_badge", def: "04 / LẮP ĐẶT", as: "span" })}</span>
                </div>
                <h3 style={{ fontSize: "clamp(20px, 2.5vw, 32px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 16, fontFamily: FONT_HEADING, color: WHITE }}>{EditFn({ bk: "detail_4_title", def: "Đặt Gọn Trong Khung Giường", as: "span" })}</h3>
                <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.8, fontFamily: FONT_BODY, marginBottom: 24 }}>{EditFn({ bk: "detail_4_desc", def: "Đội kỹ thuật đo lòng giường, kiểm tra nệm và lắp khung nâng hạ gọn bên trong. Bạn không cần thay đổi toàn bộ bộ giường đang dùng.", as: "span", multiline: true })}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { bk: "detail_4_bullet_1", def: "Đo đạc trước khi sản xuất/lắp đặt" },
                    { bk: "detail_4_bullet_2", def: "Hạn chế thay đổi bố cục phòng ngủ" },
                    { bk: "detail_4_bullet_3", def: "Giao lắp tận nơi, hướng dẫn sử dụng" },
                  ].map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, marginTop: 7, flexShrink: 0 }} />
                      <span style={{ color: GRAY, fontSize: 14, fontFamily: FONT_BODY, lineHeight: 1.6 }}>{EditFn({ bk: t.bk, def: t.def, as: "span" })}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Item 5 — Nệm hiện có vẫn dùng được (1:1 GIF, text bên trái) */}
        <FadeIn delay={320}>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }} className="lp-detail-row">
              <div style={{ padding: "8px 0", order: 0 }} className="lp-detail-text-left">
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(139,105,20,0.08)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_FULL, padding: "6px 16px", marginBottom: 20 }}>
                  <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", fontFamily: FONT_BODY }}>{EditFn({ bk: "detail_5_badge", def: "05 / NỆM HIỆN CÓ", as: "span" })}</span>
                </div>
                <h3 style={{ fontSize: "clamp(20px, 2.5vw, 32px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 16, fontFamily: FONT_HEADING, color: WHITE }}>{EditFn({ bk: "detail_5_title", def: "Tương Thích Nhiều Loại Nệm", as: "span" })}</h3>
                <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.8, fontFamily: FONT_BODY, marginBottom: 24 }}>{EditFn({ bk: "detail_5_desc", def: "Phù hợp nhiều loại nệm phổ biến; đội kỹ thuật sẽ kiểm tra kích thước và độ đàn hồi trước khi lắp. Giặt sạch, bảo dưỡng tiện lợi.", as: "span", multiline: true })}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { bk: "detail_5_bullet_1", def: "Kiểm tra độ dày và độ linh hoạt của nệm" },
                    { bk: "detail_5_bullet_2", def: "Tư vấn phương án nếu nệm chưa phù hợp" },
                    { bk: "detail_5_bullet_3", def: "Hỗ trợ chọn kích thước theo lòng giường" },
                  ].map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, marginTop: 7, flexShrink: 0 }} />
                      <span style={{ color: GRAY, fontSize: 14, fontFamily: FONT_BODY, lineHeight: 1.6 }}>{EditFn({ bk: t.bk, def: t.def, as: "span" })}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                <div style={{ position: "relative", paddingBottom: "100%", background: BLACK_CARD }}>
                  {content["detail_img_4"] || defaultImage("detail_img_4") ? (
                    <img src={optimizeCldUrl(content["detail_img_4"] || defaultImage("detail_img_4"), 900)} alt="Nệm phù hợp với GSF150" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                      <IconAward color={GOLD_PALE} size={40} />
                      <span style={{ fontSize: 13, fontFamily: FONT_BODY }}>Ảnh nệm phù hợp</span>
                    </div>
                  )}
                  {editMode && <ImageUploadOverlay slug={lpSlug} blockKey="detail_img_4" currentUrl={content["detail_img_4"] || ""} onUploaded={handleSaved} />}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Item 6 — Remote điều khiển không dây */}
        <FadeIn delay={400}>
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, alignItems: "center" }} className="lp-detail-row">
              <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                <div style={{ position: "relative", paddingBottom: "100%", background: BLACK_CARD }}>
                  {content["detail_img_5"] || defaultImage("detail_img_5") ? (
                    <img src={optimizeCldUrl(content["detail_img_5"] || defaultImage("detail_img_5"), 900)} alt="Remote điều khiển GSF150" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                      <IconBox color={GOLD_PALE} size={40} />
                      <span style={{ fontSize: 13, fontFamily: FONT_BODY }}>Ảnh remote điều khiển</span>
                    </div>
                  )}
                  {editMode && <ImageUploadOverlay slug={lpSlug} blockKey="detail_img_5" currentUrl={content["detail_img_5"] || ""} onUploaded={handleSaved} />}
                </div>
              </div>
              <div style={{ padding: "8px 0" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: `rgba(139,105,20,0.08)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_FULL, padding: "6px 16px", marginBottom: 20 }}>
                  <span style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", fontFamily: FONT_BODY }}>{EditFn({ bk: "detail_6_badge", def: "06 / REMOTE", as: "span" })}</span>
                </div>
                <h3 style={{ fontSize: "clamp(20px, 2.5vw, 32px)", fontWeight: 300, lineHeight: 1.2, marginBottom: 16, fontFamily: FONT_HEADING, color: WHITE }}>{EditFn({ bk: "detail_6_title", def: "Remote Điều Khiển Không Dây", as: "span" })}</h3>
                <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.8, fontFamily: FONT_BODY, marginBottom: 24 }}>{EditFn({ bk: "detail_6_desc", def: "Điều chỉnh tư thế ngay trên giường, thuận tiện cho đọc sách, xem phim, nghỉ ngơi hoặc chăm sóc người thân.", as: "span", multiline: true })}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { bk: "detail_6_bullet_1", def: "Các nút thao tác rõ ràng, dễ nhớ" },
                    { bk: "detail_6_bullet_2", def: "Điều chỉnh tư thế ngay trên giường" },
                    { bk: "detail_6_bullet_3", def: "Phù hợp đọc sách, xem phim, nghỉ ngơi" },
                  ].map((t, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, marginTop: 7, flexShrink: 0 }} />
                      <span style={{ color: GRAY, fontSize: 14, fontFamily: FONT_BODY, lineHeight: 1.6 }}>{EditFn({ bk: t.bk, def: t.def, as: "span" })}</span>
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
  { bkQ: "faq_1_q", defQ: "GSF150 có cần bỏ giường cũ không?", bkA: "faq_1_a", defA: "Không nhất thiết. GSF150 được thiết kế để đặt gọn trong lòng khung giường hiện có sau khi đội kỹ thuật đo đạc và kiểm tra thực tế." },
  { bkQ: "faq_2_q", defQ: "Nệm hiện tại có dùng được không?", bkA: "faq_2_a", defA: "Nhiều loại nệm phổ biến có thể dùng được, nhưng cần kiểm tra độ dày, độ đàn hồi và kích thước trước khi lắp để vận hành ổn định." },
  { bkQ: "faq_3_q", defQ: "Lắp đặt GSF150 mất bao lâu?", bkA: "faq_3_a", defA: "Sau khi đo đạc và chuẩn bị đúng kích thước, kỹ thuật viên sẽ giao lắp tận nơi và hướng dẫn sử dụng remote trực tiếp cho gia đình." },
  { bkQ: "faq_4_q", defQ: "Có phù hợp cho người lớn tuổi không?", bkA: "faq_4_a", defA: "Remote thao tác đơn giản, hỗ trợ thay đổi tư thế nghỉ ngơi thuận tiện hơn. Sản phẩm không phải thiết bị điều trị y tế và không cam kết chữa bệnh." },
  { bkQ: "faq_5_q", defQ: "Motor bảo hành thế nào?", bkA: "faq_5_a", defA: "Motor được bảo hành 5 năm theo chính sách SmartFurni. Khi cần hỗ trợ, đội kỹ thuật sẽ kiểm tra và hướng dẫn xử lý." },
  { bkQ: "faq_6_q", defQ: "Có đặt size theo yêu cầu không?", bkA: "faq_6_a", defA: "Có. SmartFurni nhận tư vấn, đo đạc và đặt kích thước theo lòng giường hoặc nhu cầu sử dụng thực tế." },
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
function StickyCta({ openOrderPopup, E: EditFn }: { openOrderPopup: () => void; E: EFn }) {
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
          {EditFn({ bk: "sticky_price", def: STICKY_PRICE_TEXT, as: "span" })}
        </div>
        <div style={{ color: GRAY_LIGHT, fontSize: 11, fontFamily: FONT_BODY }}>
          {EditFn({ bk: "sticky_sub", def: "Miễn phí giao hàng + lắp đặt", as: "span" })}
        </div>
      </div>
      <GoldButton onClick={openOrderPopup} style={{ padding: "12px 24px", fontSize: 12 }}>
        {EditFn({ bk: "sticky_cta", def: "Đặt Hàng Ngay →", as: "span" })}
      </GoldButton>
    </div>
  );
}

// ─── LeadForm ─────────────────────────────────────────────────────────────────
function LeadForm({ lpSlug, E: EditFn, content, submitLabelKey = "form_submit", submitLabelDefault = "Tư Vấn & Đặt Hàng Ngay →", selectedSize }: { lpSlug: string; E: EFn; content: Record<string, string>; submitLabelKey?: string; submitLabelDefault?: string; selectedSize?: string }) {
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
  const getText = (key: string, def: string) => content[key] || def;
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { setError(getText("form_error_required", "Vui lòng điền đầy đủ Họ tên và Số điện thoại (*)")); return; }
    const normalizedPhone = normalizePhoneNumber(form.phone);
    if (!/^(0\d{9}|\+84\d{9})$/.test(normalizedPhone)) { setError(getText("form_error_phone", "Số điện thoại không hợp lệ")); return; }
    setLoading(true); setError("");
    try {
      const noteStr = `${getText("form_payload_size_prefix", "Kích thước chọn")}: ${selectedSize || quiz.roomSize} | ${getText("form_payload_usage_prefix", "Mục đích")}: ${quiz.usage} | ${getText("form_payload_budget_prefix", "Ngân sách")}: ${quiz.budget} | ${getText("form_payload_address_prefix", "Địa chỉ")}: ${form.address} | ${getText("form_payload_note_prefix", "Ghi chú")}: ${form.note}`;
      const res = await fetch("/api/lp/submit-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landingPageSlug: lpSlug, name: form.name, phone: normalizedPhone, email: "", note: noteStr, ...utms }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || getText("form_error_server", "Lỗi server")); }
      redirectToLpThankYou(lpSlug);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : getText("form_error_unknown", "Có lỗi xảy ra, vui lòng thử lại")); }
    finally { setLoading(false); }
  }
  const inp: React.CSSProperties = { width: "100%", background: "rgba(139,105,20,0.04)", border: `1px solid rgba(139,105,20,0.2)`, color: WHITE, padding: "13px 16px", fontSize: 14, outline: "none", fontFamily: FONT_BODY, boxSizing: "border-box" as const, transition: "border-color 0.2s", borderRadius: R_MD };
  if (success) return (
    <div style={{ textAlign: "center", padding: "56px 32px", background: BLACK_CARD, border: `1px solid ${GOLD}`, borderRadius: R_LG }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: `rgba(139,105,20,0.1)`, border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h3 style={{ fontSize: 24, fontWeight: 600, color: GOLD, marginBottom: 12, fontFamily: FONT_HEADING }}>{EditFn({ bk: "form_success_title", def: "Đặt hàng thành công!", as: "span" })}</h3>
      <p style={{ color: GRAY, fontSize: 15, lineHeight: 1.75, fontFamily: FONT_BODY }}>{EditFn({ bk: "form_success_desc", def: "Cảm ơn bạn đã tin tưởng SmartFurni. Đội ngũ tư vấn sẽ liên hệ qua Zalo / điện thoại trong vòng 2 giờ làm việc để xác nhận đơn hàng.", as: "span", multiline: true })}</p>
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
          <span style={{ color: step === 1 ? GOLD : GRAY, fontSize: 11, fontWeight: 600, fontFamily: FONT_BODY, letterSpacing: "0.06em" }}>{EditFn({ bk: "form_step_1_label", def: "BƯỚC 1 — Thông tin nhu cầu", as: "span" })}</span>
          <span style={{ color: step === 2 ? GOLD : GRAY, fontSize: 11, fontWeight: 600, fontFamily: FONT_BODY, letterSpacing: "0.06em" }}>{EditFn({ bk: "form_step_2_label", def: "BƯỚC 2 — Thông tin liên hệ", as: "span" })}</span>
        </div>
      </div>
      {step === 1 && (
        <div>
          {/* Kích thước phòng */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ color: WHITE, fontSize: 14, fontWeight: 600, marginBottom: 14, fontFamily: FONT_BODY }}>{EditFn({ bk: "form_room_question", def: "Diện tích phòng của bạn?", as: "span" })}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {[
                { v: "small", labelKey: "form_room_0_label", l: "Dưới 15m²", subKey: "form_room_0_sub", sub: "Phòng nhỏ / studio" },
                { v: "medium", labelKey: "form_room_1_label", l: "15–25m²", subKey: "form_room_1_sub", sub: "Phòng trung bình" },
                { v: "large", labelKey: "form_room_2_label", l: "25–40m²", subKey: "form_room_2_sub", sub: "Phòng rộng" },
                { v: "xlarge", labelKey: "form_room_3_label", l: "Trên 40m²", subKey: "form_room_3_sub", sub: "Phòng lớn / căn hộ" },
              ].map(o => (
                <button key={o.v} onClick={() => setQuiz(q => ({ ...q, roomSize: o.v }))}
                  style={{ padding: "14px 16px", border: `1.5px solid ${quiz.roomSize === o.v ? GOLD : BLACK_BORDER}`, borderRadius: R_MD, background: quiz.roomSize === o.v ? `rgba(139,105,20,0.08)` : BLACK, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                  <div style={{ color: quiz.roomSize === o.v ? GOLD : WHITE, fontWeight: 600, fontSize: 13, fontFamily: FONT_BODY }}>{EditFn({ bk: o.labelKey, def: o.l, as: "span" })}</div>
                  <div style={{ color: GRAY_LIGHT, fontSize: 11, fontFamily: FONT_BODY, marginTop: 2 }}>{EditFn({ bk: o.subKey, def: o.sub, as: "span" })}</div>
                </button>
              ))}
            </div>
          </div>
          {/* Mục đích sử dụng */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ color: WHITE, fontSize: 14, fontWeight: 600, marginBottom: 14, fontFamily: FONT_BODY }}>{EditFn({ bk: "form_usage_question", def: "Mục đích sử dụng chính?", as: "span" })}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {[
                { v: "daily", labelKey: "form_usage_0_label", l: "Ngủ hàng ngày", subKey: "form_usage_0_sub", sub: "Phòng ngủ chính" },
                { v: "guest", labelKey: "form_usage_1_label", l: "Phòng khách", subKey: "form_usage_1_sub", sub: "Tiếp khách + ngủ thỉnh thoảng" },
                { v: "office", labelKey: "form_usage_2_label", l: "Phòng làm việc", subKey: "form_usage_2_sub", sub: "Nghỉ trưa, thư giãn" },
                { v: "rental", labelKey: "form_usage_3_label", l: "Cho thuê", subKey: "form_usage_3_sub", sub: "Căn hộ dịch vụ, homestay" },
              ].map(o => (
                <button key={o.v} onClick={() => setQuiz(q => ({ ...q, usage: o.v }))}
                  style={{ padding: "14px 16px", border: `1.5px solid ${quiz.usage === o.v ? GOLD : BLACK_BORDER}`, borderRadius: R_MD, background: quiz.usage === o.v ? `rgba(139,105,20,0.08)` : BLACK, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
                  <div style={{ color: quiz.usage === o.v ? GOLD : WHITE, fontWeight: 600, fontSize: 13, fontFamily: FONT_BODY }}>{o.l}</div>
                  <div style={{ color: GRAY_LIGHT, fontSize: 11, fontFamily: FONT_BODY, marginTop: 2 }}>{o.sub}</div>
                </button>
              ))}
            </div>
          </div>
          <GoldButton onClick={() => setStep(2)} style={{ width: "100%", justifyContent: "center" }}>
            {EditFn({ bk: "form_next_btn", def: "Tiếp theo — Nhận tư vấn →", as: "span" })}
          </GoldButton>
        </div>
      )}
      {step === 2 && (
        <form onSubmit={handleSubmit}>
          {(quiz.roomSize || selectedSize) && (
            <div style={{ background: `rgba(139,105,20,0.06)`, border: `1px solid rgba(139,105,20,0.2)`, borderRadius: R_MD, padding: "12px 16px", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY }}>
                {selectedSize ? `${getText("form_selected_size_prefix", "Kích thước đã chọn")}: ${selectedSize}` : `${getText("form_room_summary_prefix", "Phòng")} ${quiz.roomSize} · ${quiz.usage}`}
              </span>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input style={inp} placeholder={getText("form_name_placeholder", "Họ và tên (*)")} value={form.name} onChange={setF("name")} required />
            <input style={inp} placeholder={getText("form_phone_placeholder", "Số điện thoại (*)")} value={form.phone} onChange={setF("phone")} required />
            <input style={inp} placeholder={getText("form_address_placeholder", "Địa chỉ giao hàng")} value={form.address} onChange={setF("address")} />
            <textarea style={{ ...inp, minHeight: 80, resize: "vertical" }} placeholder={getText("form_note_placeholder", "Ghi chú thêm (màu sắc, yêu cầu đặc biệt...)")} value={form.note} onChange={setF("note")} />
          </div>
          {error && <div style={{ color: RED_SOFT, fontSize: 13, marginTop: 12, fontFamily: FONT_BODY }}>{error}</div>}
          <GoldButton style={{ width: "100%", marginTop: 20, justifyContent: "center", fontSize: 14, padding: "16px 24px" }}>
            {loading ? getText("form_loading", "Đang gửi...") : EditFn({ bk: submitLabelKey, def: submitLabelDefault, as: "span" })}
          </GoldButton>
          <p style={{ color: GRAY_LIGHT, fontSize: 11, textAlign: "center", marginTop: 12, fontFamily: FONT_BODY }}>
          </p>
        </form>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LpGsf150Client({ isEditor = false, initialContent = {}, lpSlug = LP_SLUG }: Props) {
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [content, setContent] = useState<Record<string, string>>(() => {
    const next = { ...initialContent };
    if (LEGACY_STICKY_PRICE_TEXTS.has(next.sticky_price?.trim() || "")) {
      next.sticky_price = STICKY_PRICE_TEXT;
    }
    return next;
  });
  const [editedCount, setEditedCount] = useState(0);
  const [selectedSize, setSelectedSize] = useState("");
  const [productPopup, setProductPopup] = useState<{ productIdx: number; sizeId: string; colorId: string; imgIdx: number; step: "detail" | "form" } | null>(null);
  const popupSwipeStartRef = useRef<{ x: number; y: number } | null>(null);

  // Typewriter effect for hero titles
  const TITLE_1 = content["hero_title_1"] || "Giường Cũ Giữ Lại";
  const TITLE_2 = content["hero_title_2"] || "Nâng Hạ Thông Minh";
  const [twText1, setTwText1] = useState("");
  const [twText2, setTwText2] = useState("");
  const [twDone1, setTwDone1] = useState(false);
  const [twDone2, setTwDone2] = useState(false);
  const [showCursor1, setShowCursor1] = useState(true);
  const [showCursor2, setShowCursor2] = useState(false);
  useEffect(() => {
    setTwText1(""); setTwText2(""); setTwDone1(false); setTwDone2(false);
    setShowCursor1(true); setShowCursor2(false);
    let i = 0;
    const speed = 55;
    const t1 = setInterval(() => {
      i++;
      setTwText1(TITLE_1.slice(0, i));
      if (i >= TITLE_1.length) {
        clearInterval(t1);
        setTwDone1(true);
        setShowCursor1(false);
        setShowCursor2(true);
        let j = 0;
        const t2 = setInterval(() => {
          j++;
          setTwText2(TITLE_2.slice(0, j));
          if (j >= TITLE_2.length) {
            clearInterval(t2);
            setTwDone2(true);
            // blink cursor for 2s then hide
            setTimeout(() => setShowCursor2(false), 2000);
          }
        }, speed);
      }
    }, speed);
    return () => clearInterval(t1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [popupForm, setPopupForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupSuccess, setPopupSuccess] = useState(false);
  const [popupError, setPopupError] = useState("");
  const [inlineOrderSizeId, setInlineOrderSizeId] = useState("1m2");
  const [inlineOrderColorId, setInlineOrderColorId] = useState("black");
  const [inlineOrderForm, setInlineOrderForm] = useState({ name: "", phone: "", address: "", note: "" });
  const [inlineOrderLoading, setInlineOrderLoading] = useState(false);
  const [inlineOrderSuccess, setInlineOrderSuccess] = useState(false);
  const [inlineOrderError, setInlineOrderError] = useState("");

  useEffect(() => {
    setScrollY(window.scrollY);
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const scrollToForm = useCallback(() => scrollTo("register-form"), []);
  const openGsf150OrderPopup = useCallback(() => {
    setPopupSuccess(false);
    setPopupError("");
    setPopupForm({ name: "", phone: "", address: "", note: "" });
    setProductPopup({ productIdx: 0, sizeId: "1m2", colorId: "black", imgIdx: 0, step: "detail" });
  }, []);

  const goToPopupImage = useCallback((direction: -1 | 1) => {
    setProductPopup(prev => {
      if (!prev) return null;
      const nextImgIdx = prev.imgIdx + direction;
      if (nextImgIdx < 0 || nextImgIdx > 5) return prev;
      return { ...prev, imgIdx: nextImgIdx };
    });
  }, []);

  const handlePopupSwipeStart = useCallback((touch: React.Touch) => {
    popupSwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handlePopupSwipeEnd = useCallback((touch: React.Touch) => {
    const start = popupSwipeStartRef.current;
    popupSwipeStartRef.current = null;
    if (!start) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < 45 || absX < absY * 1.2) return;
    goToPopupImage(deltaX < 0 ? 1 : -1);
  }, [goToPopupImage]);

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
    <EditableText slug={lpSlug} blockKey={bk} defaultValue={def} editMode={editMode} as={as} style={style} multiline={multiline} savedValue={content[bk]} onSaved={handleSaved} onDeleted={handleDeleted} />
  ), [editMode, content, handleSaved, handleDeleted]);

  const contactPhoneNumber = normalizePhoneNumber(content["tracking_contact_hotline"] || DEFAULT_CONTACT_PHONE_NUMBER) || DEFAULT_CONTACT_PHONE_NUMBER;
  const contactZaloNumber = normalizePhoneNumber(content["tracking_contact_zalo"] || contactPhoneNumber) || contactPhoneNumber;
  const contactPhoneHref = `tel:${contactPhoneNumber}`;
  const contactZaloHref = `https://zalo.me/${contactZaloNumber}`;
  const contactPhoneDisplay = formatPhoneDisplay(content["tracking_contact_hotline"] || contactPhoneNumber);
  const contactZaloDisplay = formatPhoneDisplay(content["tracking_contact_zalo"] || contactZaloNumber);

  const navScrolled = scrollY > 60;
  const heroSourceImages = ["hero_bg_0", "hero_bg_1", "hero_bg_2"].map(k => content[k] || defaultImage(k));
  const heroImages = heroSourceImages.map(url => optimizeCldUrl(url, 1600));
  const heroOverlay = parseFloat(content["hero_overlay"] || "0.35");

  // Product cards (3 cards)
  const PRODUCTS = [
    { id: "gsf150-standard", name: "GSF150 Standard", price: "Từ 29.900.000 ₫", badge: "Phổ biến", sub: "Khung nâng hạ 2 motor, phù hợp nệm phổ biến" },
    { id: "gsf150-plus", name: "GSF150 Plus", price: "Từ 34.900.000 ₫", badge: "Nâng cấp", sub: "Khung chắc hơn, tùy chỉnh theo lòng giường" },
    { id: "gsf150-custom", name: "GSF150 Custom", price: "Liên hệ", badge: "Đặt size", sub: "Đo đạc và sản xuất theo kích thước giường hiện có" },
  ];
  // Size options shared across products; prices are stored separately per product + size.
  const POPUP_SIZES = [
    { id: "1m2", label: "Lòng giường 1m2 × 2m" },
    { id: "1m4", label: "Lòng giường 1m4 × 2m" },
    { id: "1m6", label: "Lòng giường 1m6 × 2m" },
    { id: "custom", label: "Đặt size theo lòng giường" },
  ];
  const POPUP_DEFAULT_PRICES = [
    ["29.900.000 ₫", "32.900.000 ₫", "34.900.000 ₫", "Liên hệ"],
    ["34.900.000 ₫", "37.900.000 ₫", "39.900.000 ₫", "Liên hệ"],
    ["Liên hệ", "Liên hệ", "Liên hệ", "Theo báo giá"],
  ];
  const getPopupPriceKey = (productIdx: number, sizeIdx: number) => `popup_price_${productIdx}_${sizeIdx}`;
  const getPopupDefaultPrice = (productIdx: number, sizeIdx: number) => POPUP_DEFAULT_PRICES[productIdx]?.[sizeIdx] || POPUP_DEFAULT_PRICES[0]?.[sizeIdx] || "";
  const POPUP_COLORS = [
    { id: "black", label: "Khung đen tiêu chuẩn" },
    { id: "gray", label: "Khung xám theo yêu cầu" },
    { id: "custom", label: "Tư vấn màu theo nội thất" },
  ];
  const inlineOrderProductName = content["product_name_0"] || "Khung Giường Nâng Hạ GSF150";
  const inlineOrderSizeIndex = Math.max(0, POPUP_SIZES.findIndex(s => s.id === inlineOrderSizeId));
  const inlineOrderSizeObj = POPUP_SIZES[inlineOrderSizeIndex];
  const inlineOrderPriceKey = getPopupPriceKey(0, inlineOrderSizeIndex);
  const inlineOrderPrice = content[inlineOrderPriceKey] || getPopupDefaultPrice(0, inlineOrderSizeIndex);
  const inlineOrderColorObj = POPUP_COLORS.find(c => c.id === inlineOrderColorId) || POPUP_COLORS[0];
  const getEditableDisplayValue = (blockKey: string, defaultValue: string) => (
    Object.prototype.hasOwnProperty.call(content, blockKey) ? (content[blockKey] ?? "") : defaultValue
  );
  const SPEC_ROWS = [
    { bkLabel: "spec_row_1_label", defLabel: "Kích thước phổ biến", bkValue: "spec_row_1_value", defValue: "1m2 / 1m4 / 1m6 × 2m, nhận đặt theo lòng giường" },
    { bkLabel: "spec_row_2_label", defLabel: "Góc nâng đầu", bkValue: "spec_row_2_value", defValue: "0–70°, điều chỉnh bằng remote" },
    { bkLabel: "spec_row_3_label", defLabel: "Góc nâng chân", bkValue: "spec_row_3_value", defValue: "0–45°" },
    { bkLabel: "spec_row_4_label", defLabel: "Khung chính", bkValue: "spec_row_4_value", defValue: "Thép sơn tĩnh điện, gia cường chịu lực" },
    { bkLabel: "spec_row_5_label", defLabel: "Motor", bkValue: "spec_row_5_value", defValue: "2 motor nâng hạ vận hành êm" },
    { bkLabel: "spec_row_6_label", defLabel: "Remote", bkValue: "spec_row_6_value", defValue: "Remote không dây, thao tác đơn giản" },
    { bkLabel: "spec_row_7_label", defLabel: "Nệm phù hợp", bkValue: "spec_row_7_value", defValue: "Cao su, foam, lò xo túi linh hoạt; kiểm tra trước khi lắp" },
    { bkLabel: "spec_row_8_label", defLabel: "Lắp đặt", bkValue: "spec_row_8_value", defValue: "Đặt trong lòng giường hiện có, không cần đổi toàn bộ giường" },
    { bkLabel: "spec_row_9_label", defLabel: "Bảo hành motor", bkValue: "spec_row_9_value", defValue: "5 năm" },
    { bkLabel: "spec_row_10_label", defLabel: "Giao lắp", bkValue: "spec_row_10_value", defValue: "Tận nơi theo khu vực hỗ trợ" },
    { bkLabel: "spec_row_11_label", defLabel: "Đặt size", bkValue: "spec_row_11_value", defValue: "Nhận đặt theo kích thước thực tế" },
    { bkLabel: "spec_row_12_label", defLabel: "Xuất xứ", bkValue: "spec_row_12_value", defValue: "Sản xuất/lắp ráp bởi SmartFurni Việt Nam" },
  ].filter(row => {
    const label = getEditableDisplayValue(row.bkLabel, row.defLabel).trim();
    const value = getEditableDisplayValue(row.bkValue, row.defValue).trim();
    return label.length > 0 || value.length > 0;
  });

  async function handleInlineOrderSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inlineOrderForm.name.trim() || !inlineOrderForm.phone.trim()) { setInlineOrderError("Vui lòng điền Họ tên và Số điện thoại (*)"); return; }
    const normalizedPhone = normalizePhoneNumber(inlineOrderForm.phone);
    if (!/^(0\d{9}|\+84\d{9})$/.test(normalizedPhone)) { setInlineOrderError("Số điện thoại không hợp lệ"); return; }
    setInlineOrderLoading(true); setInlineOrderError("");
    try {
      const noteStr = `Nguồn: Form đặt hàng tại section chính | Sản phẩm: ${inlineOrderProductName} | Kích thước: ${inlineOrderSizeObj.label} | Màu sắc: ${inlineOrderColorObj.label} | Giá: ${inlineOrderPrice} | Địa chỉ: ${inlineOrderForm.address} | Ghi chú: ${inlineOrderForm.note}`;
      const res = await fetch("/api/lp/submit-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landingPageSlug: lpSlug, name: inlineOrderForm.name, phone: normalizedPhone, email: "", note: noteStr }) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Lỗi server"); }
      redirectToLpThankYou(lpSlug);
    } catch (err: unknown) { setInlineOrderError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại"); }
    finally { setInlineOrderLoading(false); }
  }
  // SIZES kept for legacy compatibility
  const SIZES = [
    { id: "1m2", label: "1m2 × 2m", price: "29.900.000 ₫", sub: "Giường đơn rộng" },
    { id: "1m4", label: "1m4 × 2m", price: "32.900.000 ₫", sub: "Phòng nhỏ đến trung bình" },
    { id: "1m6", label: "1m6 × 2m", price: "34.900.000 ₫", sub: "Phòng ngủ gia đình", badge: "Phổ biến" },
    { id: "custom", label: "Theo lòng giường", price: "Liên hệ", sub: "Đặt theo kích thước thực tế" },
  ];

  return (
    <div style={{ fontFamily: FONT_BODY, background: BLACK, color: WHITE, minHeight: "100vh" }}>
      {/* ── EDIT BAR ── */}
      {isEditor && (
        <LpEditBar isEditor={isEditor} editMode={editMode} onToggleEditMode={() => setEditMode(m => !m)} editedCount={editedCount} slug={lpSlug} />
      )}

      {/* ── STICKY NAV ── */}
      <nav style={{
        position: "fixed", top: navScrolled ? 0 : (isEditor ? 48 : 0), left: 0, right: 0, zIndex: 100,
        background: navScrolled ? "rgba(18,14,4,0.97)" : "transparent",
        borderBottom: navScrolled ? `1px solid rgba(139,105,20,0.25)` : "none",
        backdropFilter: navScrolled ? "blur(16px)" : "none",
        WebkitBackdropFilter: navScrolled ? "blur(16px)" : "none",
        transition: "top 0.25s ease, background 0.3s ease, border-color 0.3s ease",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "0 24px",
          height: 68,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}>
          {/* Logo */}
          <a href={`/lp/${lpSlug}`} style={{ flexShrink: 0, textDecoration: "none" }}>
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
                onClick={() => id === "register-form" ? openGsf150OrderPopup() : scrollTo(id)}
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
            onClick={openGsf150OrderPopup}
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
                onClick={() => { if (id === "register-form") openGsf150OrderPopup(); else scrollTo(id); setMobileMenuOpen(false); }}
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
              onClick={() => { openGsf150OrderPopup(); setMobileMenuOpen(false); }}
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
      <section id="hero" className="lp-hero-section" style={{ position: "relative", overflow: "hidden" }}>
        {/* Hero background: 4:3 ratio wrapper */}
        <div className="lp-hero-bg" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          {heroImages[0] ? (
            <img src={heroImages[0]} alt="GSF150 Hero" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", background: "#0d0b06" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${BLACK_CARD} 0%, ${BLACK_SOFT} 100%)` }} />
          )}
          <div style={{ position: "absolute", inset: 0, background: `rgba(26,18,0,${heroOverlay})` }} />
        </div>
        {/* Edit hero */}
        {isEditor && editMode && (
          <EditableHeroImage slug={lpSlug} imageKeys={["hero_bg_0", "hero_bg_1", "hero_bg_2"]} overlayKey="hero_overlay" imageUrls={heroSourceImages} overlayOpacity={heroOverlay} editMode={editMode} onImageSaved={handleSaved} onOverlaySaved={(k, v) => handleSaved(k, String(v))} />
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
                  {E({ bk: "hero_section_label", def: "Khung Giường Nâng Hạ Điện", as: "span" })}
                </span>
                <span style={{ display: "inline-block", width: 28, height: 1, background: `linear-gradient(90deg, ${GOLD_PALE}, transparent)` }} />
              </div>

              {/* Tiêu đề chính — Typewriter effect */}
              <h1 style={{ fontSize: "clamp(34px, 5.5vw, 68px)", fontWeight: 400, lineHeight: 1.05, marginBottom: 6, fontFamily: FONT_BRAND, fontStyle: "italic", letterSpacing: "-0.01em", color: "#FFFFFF", minHeight: "1.1em" }}>
                {editMode
                  ? E({ bk: "hero_title_1", def: "Giường Cũ Giữ Lại", as: "span", style: { display: "block" } })
                  : <span>{twText1}{showCursor1 && <span style={{ borderRight: "3px solid #FFFFFF", marginLeft: 2, animation: "tw-blink 0.7s step-end infinite" }}>&nbsp;</span>}</span>
                }
              </h1>
              <h1 style={{ fontSize: "clamp(32px, 5vw, 62px)", fontWeight: 400, lineHeight: 1.1, marginBottom: 24, fontFamily: FONT_BRAND, fontStyle: "italic", color: GOLD_PALE, letterSpacing: "-0.01em", minHeight: "1.1em" }}>
                {editMode
                  ? E({ bk: "hero_title_2", def: "Nâng Hạ Thông Minh", as: "span" })
                  : <span>{twDone1 ? twText2 : ""}{showCursor2 && <span style={{ borderRight: `3px solid ${GOLD_PALE}`, marginLeft: 2, animation: "tw-blink 0.7s step-end infinite" }}>&nbsp;</span>}</span>
                }
              </h1>

              {/* Đường kẻ vàng */}
              <div style={{ width: 48, height: 2, background: `linear-gradient(90deg, ${GOLD_LIGHT}, ${GOLD_PALE})`, borderRadius: 2, marginBottom: 24 }} />

              <p style={{ color: "rgba(253,250,245,0.80)", fontSize: "clamp(14px, 1.8vw, 17px)", lineHeight: 1.75, marginBottom: 0, fontFamily: FONT_BODY, maxWidth: 500, fontWeight: 300 }}>
                {E({ bk: "hero_desc", def: "Đặt gọn trong khung giường hiện có, nâng đầu/chân bằng remote, hỗ trợ tư thế đọc sách, xem phim và nghỉ ngơi thoải mái hơn. Giao lắp tận nơi.", as: "span", multiline: true })}
              </p>
            </div>
          </div>

          {/* CTA row — desktop: nằm trong flow bình thường; mobile: order 3 (sau ảnh) */}
          <div className="lp-hero-cta-row" style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 0", width: "100%", boxSizing: "border-box" as const, display: "flex", gap: 14, flexWrap: "wrap" as const, justifyContent: "flex-start" }}>
            <GoldButton onClick={scrollToForm} style={{ fontSize: 13, padding: "12px 24px", letterSpacing: "0.08em" }}>
              {E({ bk: "hero_cta_primary", def: "NHẬN TƯ VẤN", as: "span" })}
            </GoldButton>
            <OutlineButton onClick={() => scrollTo("products")}>
              {E({ bk: "hero_cta_secondary", def: "Xem sản phẩm ↓", as: "span" })}
            </OutlineButton>
          </div>

          {/* Trust badges — desktop: nằm trong flow; mobile: order 4 */}
          <div className="lp-hero-badges" style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 72px", width: "100%", boxSizing: "border-box" as const, borderTop: `1px solid rgba(139,105,20,0.25)`, marginTop: 28, display: "flex", gap: 32, flexWrap: "wrap" as const }}>
            {[
              { numKey: "hero_badge_0_num", num: "5 Năm", labelKey: "hero_badge_0_label", label: "Bảo hành motor" },
              { numKey: "hero_badge_1_num", num: "Lắp Gọn", labelKey: "hero_badge_1_label", label: "Trong giường cũ" },
              { numKey: "hero_badge_2_num", num: "0–70°", labelKey: "hero_badge_2_label", label: "Nâng đầu linh hoạt" },
              { numKey: "hero_badge_3_num", num: "Nhiều", labelKey: "hero_badge_3_label", label: "Loại nệm phù hợp" },
            ].map((b, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ color: GOLD_PALE, fontSize: 18, fontWeight: 700, fontFamily: FONT_HEADING, lineHeight: 1, letterSpacing: "-0.01em" }}>
                  {E({ bk: b.numKey, def: b.num, as: "span" })}
                </div>
                <div style={{ color: "rgba(253,250,245,0.5)", fontSize: 10, fontFamily: FONT_BODY, marginTop: 5, letterSpacing: "0.07em", textTransform: "uppercase" as const }}>
                  {E({ bk: b.labelKey, def: b.label, as: "span" })}
                </div>
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
                {E({ bk: "problem_title_1", def: "Giường Cũ Đang Thiếu", as: "span" })}
              </h2>
              <div style={{ color: GOLD_PALE, fontSize: "clamp(18px, 2.5vw, 30px)", fontWeight: 400, fontFamily: FONT_BRAND, fontStyle: "italic", marginBottom: 16 }}>
                {E({ bk: "problem_title_2", def: "Một Trải Nghiệm Nghỉ Ngơi Tốt Hơn?", as: "span" })}
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
                { text: "Giường cố định chỉ nằm phẳng, khó đọc sách hoặc xem phim thoải mái", icon: "✕" },
                { text: "Muốn đổi sang giường nâng hạ nhưng không muốn bỏ khung giường đang dùng", icon: "✕" },
                { text: "Nệm hiện có vẫn còn tốt, chưa muốn mua trọn bộ giường mới", icon: "✕" },
                { text: "Cần tư thế nâng đầu/chân linh hoạt cho nghỉ ngơi hằng ngày", icon: "✕" },
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
                    <div style={{ color: GOLD_PALE, fontSize: 15, fontWeight: 600, fontFamily: FONT_HEADING }}>GSF150 đáp ứng</div>
                  </div>
                </div>
              </FadeIn>
              <FadeIn delay={160}>
                <div className="lp-solution-visual-card">
                  <Image
                    src={optimizeCldUrl(content["problem_full_img"] || defaultImage("problem_full_img"), 1200)}
                    alt="So sánh giường thường và giường công thái học chỉnh điện SmartFurni GSF150"
                    fill
                    style={{ objectFit: "contain", objectPosition: "center", background: "#11100C" }}
                    sizes="(max-width: 768px) 100vw, 520px"
                  />
                  {editMode && <ImageUploadOverlay slug={lpSlug} blockKey="problem_full_img" currentUrl={content["problem_full_img"] || defaultImage("problem_full_img")} onUploaded={handleSaved} />}
                </div>
              </FadeIn>
              {[
                { text: "Đặt vào trong khung giường hiện có, giữ lại phong cách phòng ngủ", highlight: "2-in-1" },
                { text: "Nâng đầu và chân bằng remote, thao tác nhẹ và dễ dùng", highlight: "30 giây" },
                { text: "Tận dụng nệm sẵn có nếu kích thước và độ đàn hồi phù hợp", highlight: "40%" },
                { text: "Hỗ trợ tư thế Zero Gravity, đọc sách, xem TV và thư giãn", highlight: "10 giây" },
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

      {/* ── BENEFITS FULL-SCREEN INFOGRAPHIC ── */}
      <section id="benefits" className="lp-fullscreen-image-section lp-fullscreen-contain-section lp-benefits-visual-section" style={{ background: "#11100C" }}>
        <FadeIn>
          <div className="lp-benefits-visual-header">
            <SectionLabel>{E({ bk: "benefits_visual_label", def: "Lợi ích mang lại", as: "span" })}</SectionLabel>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 52px)", fontWeight: 700, lineHeight: 1.08, margin: "0 0 12px", fontFamily: FONT_HEADING, letterSpacing: "-0.02em", color: "#FFFFFF" }}>
              {E({ bk: "benefits_visual_title_1", def: "Một chiếc giường", as: "span" })}
              <span style={{ display: "block", color: GOLD_PALE }}>
                {E({ bk: "benefits_visual_title_2", def: "cho nhiều tư thế nghỉ ngơi", as: "span" })}
              </span>
            </h2>
            <p style={{ color: "rgba(253,250,245,0.68)", fontSize: 15, lineHeight: 1.8, fontFamily: FONT_BODY, margin: "0 auto", maxWidth: 680 }}>
              {E({ bk: "benefits_visual_desc", def: "Từ chống ngáy, đọc sách, xem phim đến giấc ngủ sâu, GSF150 giúp bạn thay đổi tư thế nhẹ nhàng bằng remote mà vẫn giữ được không gian phòng ngủ quen thuộc.", as: "span", multiline: true })}
            </p>
          </div>
        </FadeIn>
        <div className="lp-fullscreen-image-frame">
          <Image
            src={optimizeCldUrl(content["features_full_img"] || defaultImage("features_full_img"), 1800)}
            alt="Các tư thế và tính năng chính của giường nâng hạ SmartFurni GSF150"
            fill
            style={{ objectFit: "contain", objectPosition: "center", background: "#11100C" }}
            sizes="100vw"
          />
          {editMode && <ImageUploadOverlay slug={lpSlug} blockKey="features_full_img" currentUrl={content["features_full_img"] || defaultImage("features_full_img")} onUploaded={handleSaved} />}
        </div>
      </section>

      {/* ── PRODUCT IMAGES ── */}
      <section id="showcase" className="lp-section-pad" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>{E({ bk: "showcase_section_label", def: "Hình ảnh sản phẩm", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "showcase_title_1", def: "GSF150 — Thiết Kế Tinh Tế", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING }}>
                {E({ bk: "showcase_title_2", def: "Phù Hợp Mọi Không Gian", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="lp-showcase-grid">
            {[
              { bkImg: "showcase_img_0", badge: "LẮP TRONG GIƯỜNG", bkCaption: "showcase_cap_0", defCaption: "Đặt gọn trong khung giường hiện có, giữ phong cách phòng ngủ quen thuộc" },
              { bkImg: "showcase_img_1", badge: "KHUNG ĐỘC LẬP", bkCaption: "showcase_cap_1", defCaption: "Khung nâng hạ độc lập, điều chỉnh tư thế bằng remote" },
              { bkImg: "showcase_img_2", badge: "CẤU TẠO MOTOR", bkCaption: "showcase_cap_2", defCaption: "Hệ motor và khung thép được bố trí gọn để vận hành ổn định" },
            ].map((item, i) => {
              const imgSrc = content[item.bkImg] || defaultImage(item.bkImg);
              return (
                <FadeIn key={i} delay={i * 100}>
                  <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}` }}>
                    <div style={{ position: "relative", paddingBottom: "100%", background: BLACK_CARD }}>
                      {imgSrc ? (
                        <Image src={optimizeCldUrl(imgSrc, 700)} alt={item.defCaption} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 100vw, 33vw" />
                      ) : (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: GRAY_LIGHT, fontSize: 13, fontFamily: FONT_BODY }}>Chưa có ảnh</div>
                      )}
                      {editMode && <ImageUploadOverlay slug={lpSlug} blockKey={item.bkImg} currentUrl={imgSrc} onUploaded={handleSaved} />}
                      {editMode && imgSrc && (
                        <button onClick={async () => { await fetch(`/api/admin/lp-content?slug=${lpSlug}&blockKey=${item.bkImg}`, { method: "DELETE" }); handleDeleted(item.bkImg); }} style={{ position: "absolute", top: 8, right: 8, zIndex: 20, background: "rgba(239,68,68,0.9)", color: "#fff", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>×</button>
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
                {E({ bk: "spec_title_2", def: "SmartFurni GSF150", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 24, alignItems: "stretch" }} className="lp-specs-layout">
              {/* Bảng thông số bên trái */}
              <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, overflow: "hidden", alignSelf: "center" }}>
                {SPEC_ROWS.map((row, i) => (
                  <div key={`${row.bkLabel}-${row.bkValue}`} style={{ display: "flex", alignItems: "center", gap: 18, padding: "11px 20px", minHeight: 44, background: i % 2 === 0 ? BLACK_CARD : BLACK, borderBottom: i < SPEC_ROWS.length - 1 ? `1px solid ${BLACK_BORDER}` : "none" }}>
                    <div style={{ width: "38%", color: GRAY_LIGHT, fontSize: 13, lineHeight: 1.45, fontFamily: FONT_BODY, flexShrink: 0 }}>{E({ bk: row.bkLabel, def: row.defLabel, as: "span" })}</div>
                    <div style={{ color: WHITE, fontSize: 13, lineHeight: 1.45, fontFamily: FONT_BODY, fontWeight: 500, flex: 1 }}>{E({ bk: row.bkValue, def: row.defValue, as: "span", multiline: true })}</div>
                  </div>
                ))}
              </div>
              {/* Ảnh 1:1 bên phải */}
              <div style={{ position: "relative", borderRadius: R_LG, overflow: "hidden", border: `1px solid ${BLACK_BORDER}`, alignSelf: "center" }}>
                <div style={{ position: "relative", paddingBottom: "100%", background: BLACK_CARD }}>
                  {content["specs_img"] || defaultImage("specs_img") ? (
                    <Image src={optimizeCldUrl(content["specs_img"] || defaultImage("specs_img"), 900)} alt="SmartFurni GSF150" fill style={{ objectFit: "contain", background: WHITE }} sizes="(max-width: 768px) 100vw, 50vw" />
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke={GRAY_LIGHT} strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" stroke={GRAY_LIGHT} strokeWidth="1.5"/><path d="M21 15l-5-5L5 21" stroke={GRAY_LIGHT} strokeWidth="1.5" strokeLinecap="round"/></svg>
                      <span style={{ fontSize: 12, fontFamily: FONT_BODY }}>Ảnh sản phẩm</span>
                    </div>
                  )}
                  {editMode && (
                    <ImageUploadOverlay slug={lpSlug} blockKey="specs_img" currentUrl={content["specs_img"] || ""} onUploaded={handleSaved} />
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
                {E({ bk: "ba_title_2", def: "Trước Và Sau GSF150", as: "span" })}
              </div>
              <GoldDivider />
              <p style={{ color: GRAY, fontSize: 14, lineHeight: 1.75, fontFamily: FONT_BODY }}>
                Kéo thanh trượt để xem sự khác biệt — cùng một căn phòng, hoàn toàn khác trải nghiệm
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <BeforeAfterSlider beforeUrl={content["ba_before_img"]} afterUrl={content["ba_after_img"] || defaultImage("ba_after_img")} beforeLabel="Giường thường" afterLabel="Lắp GSF150" />
            {editMode && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                {[{ k: "ba_before_img", label: "Ảnh TRƯỚC" }, { k: "ba_after_img", label: "Ảnh SAU" }].map(({ k, label }) => (
                  <div key={k} style={{ position: "relative", height: 60, background: BLACK_CARD, border: `1px dashed ${GOLD}`, borderRadius: R_MD, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <ImageUploadOverlay slug={lpSlug} blockKey={k} currentUrl={content[k] || ""} onUploaded={handleSaved} />
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
      <ProductDetailSection lpSlug={lpSlug} editMode={editMode} content={content} handleSaved={handleSaved} E={E} />

      {/* ── VIDEO SECTION ── */}
      <section id="video" className="lp-section-pad" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>{E({ bk: "video_section_label", def: "Video thực tế", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "video_title_1", def: "Xem GSF150 Hoạt Động", as: "span" })}
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
                { bkId: "video_sub_2_id", bkTitle: "video_sub_2_title", defTitle: "Hướng dẫn sử dụng remote GSF150", tag: "HƯỚNG DẪN" },
                { bkId: "video_sub_3_id", bkTitle: "video_sub_3_title", defTitle: "Trước và sau khi lắp GSF150", tag: "SO SÁNH" },
                { bkId: "video_sub_4_id", bkTitle: "video_sub_4_title", defTitle: "Lắp đặt thực tế GSF150", tag: "LẮP ĐẶT" },
              ].map((v, i) => (
                <div key={i} className="lp-shorts-item">
                  <ShortsCard
                    videoId={content[v.bkId] || "_placeholder_"}
                    title={content[v.bkTitle] || v.defTitle}
                    tag={v.tag}
                    autoplayOnVisible={i === 0}
                  />
                  {editMode && (
                    <VideoEditOverlay slug={lpSlug} blockKey={v.bkId} currentId={content[v.bkId] || ""} onSaved={(k, val) => handleSaved(k, val)} />
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
                {E({ bk: "products_title_1", def: "Các Phiên Bản Khung Giường Nâng Hạ GSF150", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING, marginBottom: 8 }}>
                {E({ bk: "products_title_2", def: "Chọn kích thước phù hợp với nệm và khung giường hiện có", as: "span" })}
              </div>
              <GoldDivider />
              <p style={{ color: GRAY, fontSize: 14, lineHeight: 1.75, fontFamily: FONT_BODY }}>
                Đo đạc theo lòng giường, tư vấn nệm phù hợp và bảo hành motor 5 năm chính hãng
              </p>
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="lp-products-grid">
            {PRODUCTS.map((product, pi) => {
              const imgKey = `product_img_${pi}`;
              const imgSrc = content[imgKey] || defaultImage(imgKey);
              const nameKey = `product_name_${pi}`;
              const priceKey = `product_price_${pi}`;
              const displayName = content[nameKey] || product.name;
              const displayPrice = content[priceKey] || product.price;
              return (
                <FadeIn key={product.id} delay={pi * 80}>
                  <div
                    onClick={() => !editMode && setProductPopup({ productIdx: pi, sizeId: "1m2", colorId: "black", imgIdx: 0, step: "detail" })}
                    style={{ background: BLACK_CARD, border: `1.5px solid ${BLACK_BORDER}`, borderRadius: R_LG, overflow: "hidden", cursor: editMode ? "default" : "pointer", transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s" }}
                    onMouseEnter={e => { if (!editMode) { (e.currentTarget as HTMLDivElement).style.borderColor = GOLD; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; } }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = BLACK_BORDER; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
                  >
                    <div style={{ position: "relative", paddingBottom: "100%", background: BLACK }}>
                      {imgSrc ? (
                        <Image src={optimizeCldUrl(imgSrc, 700)} alt={displayName} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 100vw, 33vw" />
                      ) : (
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke={GRAY_LIGHT} strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" stroke={GRAY_LIGHT} strokeWidth="1.5"/><path d="M21 15l-5-5L5 21" stroke={GRAY_LIGHT} strokeWidth="1.5" strokeLinecap="round"/></svg>
                          <span style={{ fontSize: 12, fontFamily: FONT_BODY }}>Ảnh sản phẩm</span>
                        </div>
                      )}
                      {editMode && <ImageUploadOverlay slug={lpSlug} blockKey={imgKey} currentUrl={imgSrc} onUploaded={handleSaved} />}
                      {product.badge && (
                        <div style={{ position: "absolute", top: 12, left: 12, background: GOLD, color: "#FDFAF5", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: R_FULL, letterSpacing: "0.1em", fontFamily: FONT_BODY }}>{product.badge}</div>
                      )}
                      {!editMode && (
                        <div style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(139,105,20,0.9)", color: "#FDFAF5", fontSize: 11, fontWeight: 600, padding: "6px 12px", borderRadius: R_FULL, fontFamily: FONT_BODY }}>Xem chi tiết →</div>
                      )}
                    </div>
                    <div style={{ padding: "20px 20px 24px" }}>
                      <div style={{ color: GRAY_LIGHT, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 6, fontFamily: FONT_BODY }}>{product.id.toUpperCase()}</div>
                      <h3 style={{ color: WHITE, fontSize: 16, fontWeight: 600, marginBottom: 4, fontFamily: FONT_HEADING }}>
                        {editMode ? (
                          <EditableText slug={lpSlug} blockKey={nameKey} defaultValue={product.name} editMode={editMode} as="span" savedValue={content[nameKey]} onSaved={handleSaved} onDeleted={handleDeleted} />
                        ) : displayName}
                      </h3>
                      <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.6, marginBottom: 12, fontFamily: FONT_BODY }}>{product.sub}</p>
                      <div style={{ color: GOLD, fontWeight: 700, fontSize: 18, fontFamily: FONT_HEADING }}>
                        {editMode ? (
                          <EditableText slug={lpSlug} blockKey={priceKey} defaultValue={product.price} editMode={editMode} as="span" savedValue={content[priceKey]} onSaved={handleSaved} onDeleted={handleDeleted} />
                        ) : displayPrice}
                      </div>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PRODUCT POPUP ── */}
      {productPopup !== null && (() => {
        const pp = productPopup;
        const product = PRODUCTS[pp.productIdx];
        const displayName = content[`product_name_${pp.productIdx}`] || product.name;
        // 6 images per product
        const popupImgs = Array.from({ length: 6 }, (_, i) => content[`popup_img_${pp.productIdx}_${i}`] || defaultImage(`popup_img_${pp.productIdx}_${i}`));
        const selectedSizeIndex = Math.max(0, POPUP_SIZES.findIndex(s => s.id === pp.sizeId));
        const selectedSizeObj = POPUP_SIZES[selectedSizeIndex];
        const selectedPriceKey = getPopupPriceKey(pp.productIdx, selectedSizeIndex);
        const sizePrice = content[selectedPriceKey] || getPopupDefaultPrice(pp.productIdx, selectedSizeIndex);
        const selectedColorObj = POPUP_COLORS.find(c => c.id === pp.colorId) || POPUP_COLORS[0];

        async function handlePopupSubmit(e: React.FormEvent) {
          e.preventDefault();
          if (!popupForm.name.trim() || !popupForm.phone.trim()) { setPopupError("Vui lòng điền Họ tên và Số điện thoại (*)"); return; }
          const normalizedPhone = normalizePhoneNumber(popupForm.phone);
          if (!/^(0\d{9}|\+84\d{9})$/.test(normalizedPhone)) { setPopupError("Số điện thoại không hợp lệ"); return; }
          setPopupLoading(true); setPopupError("");
          try {
            const noteStr = `Sản phẩm: ${displayName} | Kích thước: ${selectedSizeObj.label} | Màu sắc: ${selectedColorObj.label} | Giá: ${sizePrice} | Địa chỉ: ${popupForm.address} | Ghi chú: ${popupForm.note}`;
            const res = await fetch("/api/lp/submit-lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ landingPageSlug: lpSlug, name: popupForm.name, phone: normalizedPhone, email: "", note: noteStr }) });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Lỗi server"); }
            redirectToLpThankYou(lpSlug);
          } catch (err: unknown) { setPopupError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại"); }
          finally { setPopupLoading(false); }
        }

        return (
          <div
            style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
            onClick={e => { if (e.target === e.currentTarget) { setProductPopup(null); setPopupSuccess(false); setPopupError(""); setPopupForm({ name: "", phone: "", address: "", note: "" }); } }}
          >
            <div style={{ background: BLACK_CARD, borderRadius: R_LG, width: "100%", maxWidth: 860, maxHeight: "90vh", overflowY: "auto", position: "relative", border: `1px solid ${BLACK_BORDER}` }}>
              {/* Close button */}
              <button
                onClick={() => { setProductPopup(null); setPopupSuccess(false); setPopupError(""); setPopupForm({ name: "", phone: "", address: "", note: "" }); }}
                style={{ position: "absolute", top: 16, right: 16, zIndex: 10, background: "rgba(0,0,0,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: WHITE }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke={WHITE} strokeWidth="2" strokeLinecap="round"/></svg>
              </button>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 500 }} className="lp-popup-grid">
                {/* LEFT: Image swiper */}
                <div style={{ background: BLACK, borderRadius: `${R_LG}px 0 0 ${R_LG}px`, overflow: "hidden", position: "relative" }} className="lp-popup-left">
                  {/* Main image */}
                  <div
                    style={{ position: "relative", paddingBottom: "100%", background: BLACK, touchAction: "pan-y", userSelect: "none" }}
                    onTouchStart={e => handlePopupSwipeStart(e.changedTouches[0])}
                    onTouchEnd={e => handlePopupSwipeEnd(e.changedTouches[0])}
                  >
                    {popupImgs[pp.imgIdx] ? (
                      <Image src={optimizeCldUrl(popupImgs[pp.imgIdx], 900)} alt={displayName} fill style={{ objectFit: "cover" }} sizes="50vw" />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke={GRAY_LIGHT} strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" stroke={GRAY_LIGHT} strokeWidth="1.5"/><path d="M21 15l-5-5L5 21" stroke={GRAY_LIGHT} strokeWidth="1.5" strokeLinecap="round"/></svg>
                        <span style={{ fontSize: 13, fontFamily: FONT_BODY }}>Ảnh {pp.imgIdx + 1}</span>
                      </div>
                    )}
                    {editMode && <ImageUploadOverlay slug={lpSlug} blockKey={`popup_img_${pp.productIdx}_${pp.imgIdx}`} currentUrl={popupImgs[pp.imgIdx]} onUploaded={handleSaved} />}
                    {/* Prev/Next arrows */}
                    {pp.imgIdx > 0 && (
                      <button onClick={() => goToPopupImage(-1)}
                        style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                    )}
                    {pp.imgIdx < 5 && (
                      <button onClick={() => goToPopupImage(1)}
                        style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                    )}
                  </div>
                  {/* Thumbnail strip */}
                  <div style={{ display: "flex", gap: 6, padding: "10px 12px", background: BLACK, overflowX: "auto" }}>
                    {popupImgs.map((imgUrl, ti) => (
                      <div key={ti}
                        onClick={() => setProductPopup(prev => prev ? { ...prev, imgIdx: ti } : null)}
                        style={{ flexShrink: 0, width: 52, height: 52, borderRadius: R_SM, overflow: "hidden", border: `2px solid ${pp.imgIdx === ti ? GOLD : "transparent"}`, cursor: "pointer", background: BLACK_CARD, position: "relative" }}
                      >
                        {imgUrl ? (
                          <Image src={optimizeCldUrl(imgUrl, 160)} alt={`${displayName} ${ti + 1}`} fill style={{ objectFit: "cover" }} sizes="52px" />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: GRAY_LIGHT, fontSize: 10, fontFamily: FONT_BODY }}>{ti + 1}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT: Info + Sizes + CTA / Form */}
                <div style={{ padding: "32px 28px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>
                  {pp.step === "detail" ? (
                    <>
                      <div>
                        <div style={{ color: GRAY_LIGHT, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 6, fontFamily: FONT_BODY }}>{product.id.toUpperCase()}</div>
                        <h2 style={{ color: WHITE, fontSize: 22, fontWeight: 700, marginBottom: 6, fontFamily: FONT_HEADING }}>
                          {editMode ? (
                            <EditableText slug={lpSlug} blockKey={`product_name_${pp.productIdx}`} defaultValue={product.name} editMode={editMode} as="span" savedValue={content[`product_name_${pp.productIdx}`]} onSaved={handleSaved} onDeleted={handleDeleted} />
                          ) : displayName}
                        </h2>
                        <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.6, fontFamily: FONT_BODY }}>{product.sub}</p>
                      </div>

                      {/* Size options */}
                      <div>
                        <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, marginBottom: 12, fontFamily: FONT_BODY }}>Chọn kích thước:</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {POPUP_SIZES.map((sz, sizeIdx) => {
                            const szPriceKey = getPopupPriceKey(pp.productIdx, sizeIdx);
                            const szDefaultPrice = getPopupDefaultPrice(pp.productIdx, sizeIdx);
                            const szPrice = content[szPriceKey] || szDefaultPrice;
                            const isActive = pp.sizeId === sz.id;
                            return (
                              <div key={sz.id}
                                onClick={() => setProductPopup(prev => prev ? { ...prev, sizeId: sz.id } : null)}
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", border: `1.5px solid ${isActive ? GOLD : BLACK_BORDER}`, borderRadius: R_MD, background: isActive ? `rgba(139,105,20,0.06)` : BLACK, cursor: "pointer", transition: "all 0.15s" }}
                              >
                                <span style={{ color: isActive ? GOLD : WHITE, fontSize: 13, fontWeight: isActive ? 600 : 400, fontFamily: FONT_BODY }}>{sz.label}</span>
                                <span style={{ color: GOLD, fontSize: 14, fontWeight: 700, fontFamily: FONT_HEADING }}>
                                  {editMode ? (
                                    <EditableText slug={lpSlug} blockKey={szPriceKey} defaultValue={szDefaultPrice} editMode={editMode} as="span" savedValue={content[szPriceKey]} onSaved={handleSaved} onDeleted={handleDeleted} />
                                  ) : szPrice}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Color options */}
                      <div>
                        <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, marginBottom: 12, fontFamily: FONT_BODY }}>Chọn màu sắc:</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {POPUP_COLORS.map(color => {
                            const isActive = pp.colorId === color.id;
                            return (
                              <div key={color.id}
                                onClick={() => setProductPopup(prev => prev ? { ...prev, colorId: color.id } : null)}
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", border: `1.5px solid ${isActive ? GOLD : BLACK_BORDER}`, borderRadius: R_MD, background: isActive ? `rgba(139,105,20,0.06)` : BLACK, cursor: "pointer", transition: "all 0.15s" }}
                              >
                                <span style={{ color: isActive ? GOLD : WHITE, fontSize: 13, fontWeight: isActive ? 600 : 400, fontFamily: FONT_BODY }}>{color.label}</span>
                                {isActive && <IconCheck color={GOLD} size={16} />}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Selected price summary */}
                      <div style={{ background: `rgba(139,105,20,0.06)`, border: `1px solid rgba(139,105,20,0.2)`, borderRadius: R_MD, padding: "14px 16px" }}>
                        <div style={{ color: GRAY_LIGHT, fontSize: 11, fontFamily: FONT_BODY, marginBottom: 4 }}>Lựa chọn đã chọn</div>
                        <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY }}>{selectedSizeObj.label}</div>
                        <div style={{ color: GRAY, fontSize: 12, fontWeight: 500, fontFamily: FONT_BODY, marginTop: 2 }}>{selectedColorObj.label}</div>
                        <div style={{ color: GOLD, fontSize: 20, fontWeight: 700, fontFamily: FONT_HEADING, marginTop: 4 }}>{sizePrice}</div>
                      </div>

                      <GoldButton
                        onClick={() => setProductPopup(prev => prev ? { ...prev, step: "form" } : null)}
                        style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "16px 24px" }}
                      >
                        Đặt mua ngay →
                      </GoldButton>
                      <p style={{ color: GRAY_LIGHT, fontSize: 11, textAlign: "center", fontFamily: FONT_BODY }}>
                        Giao lắp tận nơi • Bảo hành motor 5 năm
                      </p>
                    </>
                  ) : popupSuccess ? (
                    <div style={{ textAlign: "center", padding: "40px 16px" }}>
                      <div style={{ width: 72, height: 72, borderRadius: "50%", background: `rgba(139,105,20,0.1)`, border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      <h3 style={{ fontSize: 22, fontWeight: 600, color: GOLD, marginBottom: 12, fontFamily: FONT_HEADING }}>Đặt hàng thành công!</h3>
                      <p style={{ color: GRAY, fontSize: 14, lineHeight: 1.75, fontFamily: FONT_BODY }}>Cảm ơn bạn đã tin tưởng SmartFurni.<br />Đội ngũ tư vấn sẽ liên hệ qua <strong style={{ color: GOLD }}>Zalo / điện thoại</strong> trong vòng 2 giờ làm việc.</p>
                    </div>
                  ) : (
                    <>
                      {/* Back button */}
                      <button
                        onClick={() => setProductPopup(prev => prev ? { ...prev, step: "detail" } : null)}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: GOLD, cursor: "pointer", fontSize: 13, fontFamily: FONT_BODY, padding: 0 }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke={GOLD} strokeWidth="2" strokeLinecap="round"/></svg>
                        Quay lại chọn kích thước
                      </button>

                      {/* Order summary */}
                      <div style={{ background: `rgba(139,105,20,0.06)`, border: `1px solid rgba(139,105,20,0.2)`, borderRadius: R_MD, padding: "12px 16px" }}>
                        <div style={{ color: GRAY_LIGHT, fontSize: 11, fontFamily: FONT_BODY, marginBottom: 4 }}>Sản phẩm đã chọn</div>
                        <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY }}>{displayName} — {selectedSizeObj.label}</div>
                        <div style={{ color: GRAY, fontSize: 12, fontWeight: 500, fontFamily: FONT_BODY, marginTop: 2 }}>{selectedColorObj.label}</div>
                        <div style={{ color: GOLD, fontSize: 18, fontWeight: 700, fontFamily: FONT_HEADING, marginTop: 2 }}>{sizePrice}</div>
                      </div>

                      {/* Form */}
                      <form onSubmit={handlePopupSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ color: WHITE, fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY }}>Thông tin nhận hàng</div>
                        {([
                          { key: "name", placeholder: "Họ và tên (*)", type: "text" },
                          { key: "phone", placeholder: "Số điện thoại (*)", type: "tel" },
                          { key: "address", placeholder: "Địa chỉ giao hàng", type: "text" },
                        ] as { key: keyof typeof popupForm; placeholder: string; type: string }[]).map(f => (
                          <input
                            key={f.key}
                            type={f.type}
                            placeholder={f.placeholder}
                            value={popupForm[f.key]}
                            onChange={e => setPopupForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                            style={{ width: "100%", background: "rgba(139,105,20,0.04)", border: `1px solid rgba(139,105,20,0.2)`, color: WHITE, padding: "13px 16px", fontSize: 14, outline: "none", fontFamily: FONT_BODY, boxSizing: "border-box", borderRadius: R_MD }}
                          />
                        ))}
                        <textarea
                          placeholder="Ghi chú thêm (màu sắc, yêu cầu đặc biệt...)"
                          value={popupForm.note}
                          onChange={e => setPopupForm(prev => ({ ...prev, note: e.target.value }))}
                          style={{ width: "100%", background: "rgba(139,105,20,0.04)", border: `1px solid rgba(139,105,20,0.2)`, color: WHITE, padding: "13px 16px", fontSize: 14, outline: "none", fontFamily: FONT_BODY, boxSizing: "border-box", borderRadius: R_MD, minHeight: 72, resize: "vertical" }}
                        />
                        {popupError && <div style={{ color: RED_SOFT, fontSize: 13, fontFamily: FONT_BODY }}>{popupError}</div>}
                        <GoldButton style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "16px 24px" }}>
                          {popupLoading ? "Đang gửi..." : "Xác nhận Đặt Hàng →"}
                        </GoldButton>
                        <p style={{ color: GRAY_LIGHT, fontSize: 11, textAlign: "center", fontFamily: FONT_BODY }}>Giao lắp tận nơi • Bảo hành motor 5 năm chính hãng</p>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── COMPARISON TABLE ── */}
      <section className="lp-section-pad" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <SectionLabel>{E({ bk: "compare_section_label", def: "Tại sao chọn GSF150?", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "compare_title_1", def: "GSF150 Tiết Kiệm Hơn", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING, marginBottom: 8 }}>
                {E({ bk: "compare_title_2", def: "Nâng Cấp Giường Cũ Tiết Kiệm Hơn", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT_BODY }}>
                <thead>
                  <tr style={{ background: BLACK_CARD }}>
                    <th style={{ padding: "16px 20px", textAlign: "left", color: GRAY_LIGHT, fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", borderBottom: `1px solid ${BLACK_BORDER}` }}>{E({ bk: "compare_header_criteria", def: "TIÊU CHÍ", as: "span" })}</th>
                    <th style={{ padding: "16px 20px", textAlign: "center", color: GOLD, fontSize: 13, fontWeight: 700, borderBottom: `1px solid ${BLACK_BORDER}` }}>{E({ bk: "compare_header_gsf150", def: "SmartFurni GSF150", as: "span" })}</th>
                    <th style={{ padding: "16px 20px", textAlign: "center", color: GRAY, fontSize: 12, fontWeight: 600, borderBottom: `1px solid ${BLACK_BORDER}` }}>{E({ bk: "compare_header_other", def: "Mua trọn bộ giường mới", as: "span" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { bkCriteria: "compare_row_1_criteria", defCriteria: "Chi phí", bkGsf150: "compare_row_1_gsf150", defGsf150: "Từ 29.900.000 ₫", bkOther: "compare_row_1_other", defOther: "Mua trọn bộ giường mới" },
                    { bkCriteria: "compare_row_2_criteria", defCriteria: "Giữ giường cũ", bkGsf150: "compare_row_2_gsf150", defGsf150: "✓ Tận dụng khung giường hiện có", bkOther: "compare_row_2_other", defOther: "✗ Thường phải thay cả bộ" },
                    { bkCriteria: "compare_row_3_criteria", defCriteria: "Nệm đang dùng", bkGsf150: "compare_row_3_gsf150", defGsf150: "✓ Có thể dùng nếu phù hợp", bkOther: "compare_row_3_other", defOther: "Có thể phải đổi nệm" },
                    { bkCriteria: "compare_row_4_criteria", defCriteria: "Tư thế nghỉ ngơi", bkGsf150: "compare_row_4_gsf150", defGsf150: "✓ Nâng đầu/chân bằng remote", bkOther: "compare_row_4_other", defOther: "Cố định hoặc ít tùy chọn" },
                    { bkCriteria: "compare_row_5_criteria", defCriteria: "Bảo hành motor", bkGsf150: "compare_row_5_gsf150", defGsf150: "✓ 5 năm", bkOther: "compare_row_5_other", defOther: "Tùy nơi bán" },
                    { bkCriteria: "compare_row_6_criteria", defCriteria: "Lắp đặt", bkGsf150: "compare_row_6_gsf150", defGsf150: "✓ Gọn trong lòng giường", bkOther: "compare_row_6_other", defOther: "Cồng kềnh hơn" },
                    { bkCriteria: "compare_row_7_criteria", defCriteria: "Đặt size", bkGsf150: "compare_row_7_gsf150", defGsf150: "✓ Nhận theo yêu cầu", bkOther: "compare_row_7_other", defOther: "Ít linh hoạt hơn" },
                  ].map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? BLACK : BLACK_CARD, borderBottom: `1px solid ${BLACK_BORDER}` }}>
                      <td style={{ padding: "14px 20px", color: GRAY, fontSize: 13 }}>{E({ bk: row.bkCriteria, def: row.defCriteria, as: "span" })}</td>
                      <td style={{ padding: "14px 20px", textAlign: "center", color: row.defGsf150.startsWith("✓") ? GOLD : WHITE, fontSize: 13, fontWeight: row.defGsf150.startsWith("✓") ? 600 : 400 }}>{E({ bk: row.bkGsf150, def: row.defGsf150, as: "span" })}</td>
                      <td style={{ padding: "14px 20px", textAlign: "center", color: row.defOther.startsWith("✗") ? RED_SOFT : GRAY, fontSize: 13 }}>{E({ bk: row.bkOther, def: row.defOther, as: "span" })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ color: GRAY_LIGHT, fontSize: 11, marginTop: 12, fontFamily: FONT_BODY, fontStyle: "italic" }}>{E({ bk: "compare_note", def: "* Giá và phương án lắp đặt phụ thuộc kích thước thực tế, loại nệm và hiện trạng giường.", as: "span" })}</p>
          </FadeIn>
        </div>
      </section>



      {/* ── HÌNH ẢNH THỰC TẾSẢN PHẨM ── */}
      <section id="gallery" className="lp-section-pad" style={{ background: BLACK, padding: "80px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>{E({ bk: "gallery_section_label", def: "Hình ảnh thực tế", as: "span" })}</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px, 3.5vw, 44px)", fontWeight: 300, lineHeight: 1.15, marginBottom: 8, fontFamily: FONT_HEADING, letterSpacing: "-0.01em", color: WHITE }}>
                {E({ bk: "gallery_title_1", def: "Hình Ảnh Thực Tế", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING }}>
                {E({ bk: "gallery_title_2", def: "Sản Phẩm GSF150 Tại Nhà Khách Hàng", as: "span" })}
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
                    {content[bk] || defaultImage(bk) ? (
                      <Image src={optimizeCldUrl(content[bk] || defaultImage(bk), 700)} alt={`Ảnh thực tế GSF150 ${i + 1}`} fill style={{ objectFit: "cover" }} sizes="(max-width: 768px) 50vw, 33vw" />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8, color: GRAY_LIGHT }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke={GRAY_LIGHT} strokeWidth="1.5"/><circle cx="8.5" cy="8.5" r="1.5" stroke={GRAY_LIGHT} strokeWidth="1.5"/><path d="M21 15l-5-5L5 21" stroke={GRAY_LIGHT} strokeWidth="1.5" strokeLinecap="round"/></svg>
                        <span style={{ fontSize: 11, fontFamily: FONT_BODY }}>Chưa có ảnh</span>
                      </div>
                    )}
                    {editMode && (
                      <ImageUploadOverlay slug={lpSlug} blockKey={bk} currentUrl={content[bk] || ""} onUploaded={(k, url) => handleSaved(k, url)} />
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
                {E({ bk: "howitworks_title_1", def: "Nhận GSF150 Tại Nhà", as: "span" })}
              </h2>
              <div style={{ color: GOLD, fontSize: "clamp(18px, 2.5vw, 28px)", fontWeight: 300, fontFamily: FONT_HEADING }}>
                {E({ bk: "howitworks_title_2", def: "Chỉ Trong 4 Bước Đơn Giản", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }} className="lp-steps-grid">
            {[
              { step: 1, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, bkTitle: "step_1_title", defTitle: "Đo kích thước lòng giường", bkDesc: "step_1_desc", defDesc: "Gửi kích thước giường/nệm hoặc đặt lịch để đội tư vấn kiểm tra trước khi chốt cấu hình." },
              { step: 2, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, bkTitle: "step_2_title", defTitle: "Xác nhận đơn qua Zalo/điện thoại", bkDesc: "step_2_desc", defDesc: "Tư vấn viên liên hệ trong 2 giờ làm việc để xác nhận đơn hàng và thông tin giao hàng." },
              { step: 3, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, bkTitle: "step_3_title", defTitle: "Sản xuất và giao lắp", bkDesc: "step_3_desc", defDesc: "Sản phẩm được chuẩn bị theo cấu hình đã chốt, đóng gói cẩn thận và giao đến nhà." },
              { step: 4, icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>, bkTitle: "step_4_title", defTitle: "Hướng dẫn sử dụng remote", bkDesc: "step_4_desc", defDesc: "Kỹ thuật viên lắp đặt tại nhà, kiểm tra vận hành và hướng dẫn gia đình sử dụng GSF150." },
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
                  <div style={{ color: GOLD, fontSize: 9, fontWeight: 700, letterSpacing: "0.25em", marginBottom: 8, fontFamily: FONT_BODY, opacity: 0.65 }}>{E({ bk: `step_${s.step}_label`, def: `BƯỚC ${s.step}`, as: "span" })}</div>
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
              <GoldButton onClick={openGsf150OrderPopup} style={{ fontSize: 14, padding: "16px 40px" }}>
                {E({ bk: "cta_bottom_gold", def: "Nhận Tư Vấn Lắp GSF150", as: "span" })}
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
                { bkNum: "trust_stat_1_num", defNum: "3.200+", bkLabel: "trust_stat_1_label", defLabel: "Sản phẩm đã bán" },
                { bkNum: "trust_stat_2_num", defNum: "4.8/5", bkLabel: "trust_stat_2_label", defLabel: "Đánh giá trung bình" },
                { bkNum: "trust_stat_3_num", defNum: "98%", bkLabel: "trust_stat_3_label", defLabel: "Khách hàng hài lòng" },
                { bkNum: "trust_stat_4_num", defNum: "5 năm", bkLabel: "trust_stat_4_label", defLabel: "Bảo hành motor" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center", padding: "24px 16px", background: BLACK_CARD, borderRadius: R_MD, border: `1px solid ${BLACK_BORDER}` }}>
                  <div style={{ color: GOLD, fontSize: 28, fontWeight: 700, fontFamily: FONT_HEADING, marginBottom: 6 }}>{E({ bk: s.bkNum, def: s.defNum, as: "span" })}</div>
                  <div style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY }}>{E({ bk: s.bkLabel, def: s.defLabel, as: "span" })}</div>
                </div>
              ))}
            </div>
          </FadeIn>
          {/* Reviews */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="lp-reviews-grid">
            {[
              { bkName: "review_1_name", defName: "Chị Nguyễn Thị Lan", bkLoc: "review_1_loc", defLoc: "TP. Hồ Chí Minh", bkText: "review_1_text", defText: "Nhà đang có sẵn giường gỗ nên không muốn thay cả bộ. GSF150 đặt gọn bên trong, dùng remote nâng đầu khi đọc sách rất tiện.", stars: 5 },
              { bkName: "review_2_name", defName: "Anh Trần Văn Minh", bkLoc: "review_2_loc", defLoc: "Hà Nội", bkText: "review_2_text", defText: "Đội kỹ thuật đo đạc trước rồi mới chốt cấu hình nên lắp vừa khung giường cũ. Motor chạy êm, thao tác đơn giản.", stars: 5 },
              { bkName: "review_3_name", defName: "Chị Phạm Thị Hương", bkLoc: "review_3_loc", defLoc: "Đà Nẵng", bkText: "review_3_text", defText: "Ba mẹ tôi dễ dùng remote hơn tôi nghĩ. Khi xem TV hoặc nghỉ ngơi có thể chỉnh tư thế nhẹ nhàng, không phải kê thêm nhiều gối.", stars: 5 },
              { bkName: "review_4_name", defName: "Anh Lê Hoàng Nam", bkLoc: "review_4_loc", defLoc: "Bình Dương", bkText: "review_4_text", defText: "Tôi thích nhất là vẫn giữ được bộ giường đang dùng. Nhìn phòng không bị thay đổi nhiều nhưng công năng tốt hơn hẳn.", stars: 5 },
              { bkName: "review_5_name", defName: "Chị Võ Thị Mai", bkLoc: "review_5_loc", defLoc: "Cần Thơ", bkText: "review_5_text", defText: "Tư vấn kỹ phần nệm hiện có trước khi lắp. Giao hàng đúng hẹn, hướng dẫn sử dụng rõ ràng và có bảo hành motor 5 năm.", stars: 5 },
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
                {E({ bk: "guarantee_title_2", def: "SmartFurni Cam Kết Rõ Ràng", as: "span" })}
              </div>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="lp-guarantee-grid">
            {[
              { icon: <IconShield color={GOLD} size={36} />, bkTitle: "guarantee_1_title", defTitle: "Bảo hành motor 5 năm", bkDesc: "guarantee_1_desc", defDesc: "Motor GSF150 được bảo hành theo chính sách SmartFurni, có đội kỹ thuật hỗ trợ khi cần kiểm tra vận hành." },
              { icon: <IconRefresh color={GOLD} size={36} />, bkTitle: "guarantee_2_title", defTitle: "Tư vấn trước khi lắp", bkDesc: "guarantee_2_desc", defDesc: "Kiểm tra kích thước giường, loại nệm và nhu cầu sử dụng trước khi chốt cấu hình để hạn chế sai lệch." },
              { icon: <IconTruck color={GOLD} size={36} />, bkTitle: "guarantee_3_title", defTitle: "Giao lắp tận nơi", bkDesc: "guarantee_3_desc", defDesc: "Đội kỹ thuật giao lắp theo lịch hẹn, kiểm tra hoạt động và hướng dẫn sử dụng remote tại nhà." },
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
                {E({ bk: "faq_title_2", def: "Về Khung Giường Nâng Hạ GSF150", as: "span" })}
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
                {E({ bk: "faq_help_text", def: "Còn câu hỏi khác? Đội tư vấn SmartFurni sẵn sàng hỗ trợ bạn", as: "span" })}
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <a href={contactPhoneHref} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: GOLD, color: "#FDFAF5", padding: "10px 20px", borderRadius: R_MD, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, textDecoration: "none" }}><IconPhone color="#FDFAF5" size={14} />{E({ bk: "faq_call_btn", def: "Gọi ngay", as: "span" })}
                </a>
                <a href={contactZaloHref} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: GOLD, border: `1px solid ${GOLD}`, padding: "10px 20px", borderRadius: R_MD, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, textDecoration: "none" }}><IconChat color={GOLD} size={14} />{E({ bk: "faq_zalo_btn", def: "Chat Zalo", as: "span" })}
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
          <FadeIn>
            <div style={{ background: `rgba(139,105,20,0.05)`, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "20px 24px", marginBottom: 28 }}>
              <div style={{ color: WHITE, fontSize: 16, fontWeight: 600, fontFamily: FONT_HEADING, marginBottom: 16 }}>{E({ bk: "form_benefits_title", def: "Khi đặt hàng hôm nay, bạn nhận được:", as: "span" })}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px 24px" }} className="lp-benefits-grid">
                {[
                  { icon: <IconCheck color={GOLD} size={16} />, key: "form_benefit_0", text: "Tư vấn kích thước phù hợp miễn phí" },
                  { icon: <IconCheck color={GOLD} size={16} />, key: "form_benefit_1", text: "Báo giá chính xác theo nhu cầu" },
                  { icon: <IconCheck color={GOLD} size={16} />, key: "form_benefit_2", text: "Giao hàng + lắp đặt theo khu vực hỗ trợ" },
                  { icon: <IconCheck color={GOLD} size={16} />, key: "form_benefit_3", text: "Kiểm tra nệm và lòng giường trước khi lắp" },
                  { icon: <IconCheck color={GOLD} size={16} />, key: "form_benefit_4", text: "Bảo hành motor 5 năm chính hãng" },
                  { icon: <IconCheck color={GOLD} size={16} />, key: "form_benefit_5", text: "Hỗ trợ kỹ thuật tận nơi suốt thời gian bảo hành" },
                ].map((b, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: GOLD, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{b.icon}</span>
                    <span style={{ color: GRAY, fontSize: 13, lineHeight: 1.55, fontFamily: FONT_BODY }}>{E({ bk: b.key, def: b.text, as: "span" })}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 28, alignItems: "start" }} className="lp-form-grid">
            {/* Left side — quick order form */}
            <FadeIn>
              <form onSubmit={handleInlineOrderSubmit} style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "24px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <div style={{ color: GRAY_LIGHT, fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", marginBottom: 6, fontFamily: FONT_BODY }}>{E({ bk: "inline_order_label", def: "ĐẶT HÀNG NHANH GSF150", as: "span" })}</div>
                    <div style={{ color: WHITE, fontSize: 18, fontWeight: 700, fontFamily: FONT_HEADING }}>{E({ bk: "inline_order_title", def: "Chọn kích thước khung nâng hạ", as: "span" })}</div>
                  </div>

                  <div>
                    <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, marginBottom: 10, fontFamily: FONT_BODY }}>Chọn kích thước:</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {POPUP_SIZES.map((sz, sizeIdx) => {
                        const szPriceKey = getPopupPriceKey(0, sizeIdx);
                        const szPrice = content[szPriceKey] || getPopupDefaultPrice(0, sizeIdx);
                        const isActive = inlineOrderSizeId === sz.id;
                        return (
                          <button key={sz.id} type="button"
                            onClick={() => setInlineOrderSizeId(sz.id)}
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: `1.5px solid ${isActive ? GOLD : BLACK_BORDER}`, borderRadius: R_MD, background: isActive ? `rgba(139,105,20,0.06)` : BLACK, cursor: "pointer", transition: "all 0.15s", textAlign: "left" }}
                          >
                            <span style={{ color: isActive ? GOLD : WHITE, fontSize: 13, fontWeight: isActive ? 600 : 400, fontFamily: FONT_BODY }}>{sz.label}</span>
                            <span style={{ color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT_HEADING }}>{szPrice}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, marginBottom: 10, fontFamily: FONT_BODY }}>Chọn màu sắc:</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {POPUP_COLORS.map(color => {
                        const isActive = inlineOrderColorId === color.id;
                        return (
                          <button key={color.id} type="button"
                            onClick={() => setInlineOrderColorId(color.id)}
                            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: `1.5px solid ${isActive ? GOLD : BLACK_BORDER}`, borderRadius: R_MD, background: isActive ? `rgba(139,105,20,0.06)` : BLACK, cursor: "pointer", transition: "all 0.15s", textAlign: "left" }}
                          >
                            <span style={{ color: isActive ? GOLD : WHITE, fontSize: 13, fontWeight: isActive ? 600 : 400, fontFamily: FONT_BODY }}>{color.label}</span>
                            {isActive && <IconCheck color={GOLD} size={16} />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ background: `rgba(139,105,20,0.06)`, border: `1px solid rgba(139,105,20,0.2)`, borderRadius: R_MD, padding: "12px 14px" }}>
                    <div style={{ color: GRAY_LIGHT, fontSize: 11, fontFamily: FONT_BODY, marginBottom: 4 }}>Lựa chọn đã chọn</div>
                    <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY }}>{inlineOrderSizeObj.label}</div>
                    <div style={{ color: GRAY, fontSize: 12, fontWeight: 500, fontFamily: FONT_BODY, marginTop: 2 }}>{inlineOrderColorObj.label}</div>
                    <div style={{ color: GOLD, fontSize: 18, fontWeight: 700, fontFamily: FONT_HEADING, marginTop: 4 }}>{inlineOrderPrice}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {([
                      { key: "name", placeholder: "Họ và tên (*)", type: "text" },
                      { key: "phone", placeholder: "Số điện thoại (*)", type: "tel" },
                      { key: "address", placeholder: "Địa chỉ giao hàng", type: "text" },
                    ] as { key: keyof typeof inlineOrderForm; placeholder: string; type: string }[]).map(f => (
                      <input key={f.key}
                        type={f.type}
                        placeholder={f.placeholder}
                        value={inlineOrderForm[f.key]}
                        onChange={e => setInlineOrderForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                        style={{ width: "100%", background: "rgba(139,105,20,0.04)", border: `1px solid rgba(139,105,20,0.2)`, color: WHITE, padding: "13px 14px", fontSize: 14, outline: "none", fontFamily: FONT_BODY, boxSizing: "border-box", borderRadius: R_MD }}
                      />
                    ))}
                    <textarea
                      placeholder="Ghi chú thêm"
                      value={inlineOrderForm.note}
                      onChange={e => setInlineOrderForm(prev => ({ ...prev, note: e.target.value }))}
                      style={{ width: "100%", background: "rgba(139,105,20,0.04)", border: `1px solid rgba(139,105,20,0.2)`, color: WHITE, padding: "13px 14px", fontSize: 14, outline: "none", fontFamily: FONT_BODY, boxSizing: "border-box", borderRadius: R_MD, minHeight: 72, resize: "vertical" }}
                    />
                  </div>

                  {inlineOrderError && <div style={{ color: RED_SOFT, fontSize: 13, fontFamily: FONT_BODY }}>{inlineOrderError}</div>}
                  {inlineOrderSuccess && <div style={{ color: GOLD, fontSize: 13, fontFamily: FONT_BODY, lineHeight: 1.6 }}>Đặt hàng thành công! Đội ngũ tư vấn sẽ liên hệ qua Zalo / điện thoại trong vòng 2 giờ làm việc.</div>}
                  <GoldButton style={{ width: "100%", justifyContent: "center", fontSize: 14, padding: "16px 24px" }}>
                    {inlineOrderLoading ? "Đang gửi..." : "Xác nhận Đặt Hàng →"}
                  </GoldButton>
              </form>
            </FadeIn>
            {/* Right side — form */}
            <FadeIn delay={150}>
              <LeadForm lpSlug={lpSlug} E={E} content={content} submitLabelKey="form_submit_register" submitLabelDefault="Đặt Hàng & Nhận Tư Vấn Ngay →" selectedSize={selectedSize} />
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
              {E({ bk: "cta_final_desc", def: "Nâng cấp giường đang dùng thành giường điều chỉnh điện gọn gàng hơn. Để lại thông tin, SmartFurni sẽ tư vấn kích thước, nệm phù hợp và lịch lắp đặt.", as: "span", multiline: true })}
            </p>
            <GoldButton onClick={openGsf150OrderPopup} style={{ fontSize: 15, padding: "18px 48px" }}>
              {E({ bk: "cta_final_btn", def: "Nhận Tư Vấn Lắp GSF150 →", as: "span" })}
            </GoldButton>
            <p style={{ color: GRAY_LIGHT, fontSize: 12, marginTop: 16, fontFamily: FONT_BODY }}>
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#0D0B08", borderTop: "1px solid rgba(201,168,76,0.12)", paddingTop: 64 }}>
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent 0%, ${GOLD} 30%, ${GOLD} 70%, transparent 100%)`, opacity: 0.5 }} />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "56px 32px 0" }}>
          <div
            className="lp-footer-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1.6fr 1.2fr 1.2fr 1fr",
              gap: "48px 40px",
              marginBottom: 52,
            }}>
            {/* Cột 1: Logo + giới thiệu + social */}
            <div>
              <div style={{ marginBottom: 20 }}>
                <img src="/smartfurni-logo-transparent.png" alt="SmartFurni" loading="lazy" style={{ height: 48, objectFit: "contain", filter: "brightness(1.05)" }} />
              </div>
              <p style={{ color: "#B7A98E", fontSize: 13, lineHeight: 1.85, fontFamily: FONT_BODY, marginBottom: 24, maxWidth: 280 }}>
                {E({ bk: "footer_brand_desc", def: "Giải pháp giường điều chỉnh điện và khung nâng hạ thông minh, sản xuất và lắp đặt bởi SmartFurni tại Việt Nam.", as: "span", multiline: true })}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { label: "Facebook", icon: "f", href: "https://facebook.com/smartfurni" },
                  { label: "YouTube", icon: "▶", href: "https://youtube.com/@smartfurni" },
                  { label: "Zalo", icon: "Z", href: contactZaloHref },
                ].map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" title={s.label}
                    style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: GOLD_PALE, fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY, textDecoration: "none", transition: "background 0.2s, border-color 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(201,168,76,0.18)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = GOLD_PALE; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(201,168,76,0.08)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(201,168,76,0.25)"; }}
                  >{s.icon}</a>
                ))}
              </div>
            </div>
            {/* Cột 2: Showroom */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 3, height: 16, background: GOLD_PALE, borderRadius: 2 }} />
                <h4 style={{ color: GOLD_PALE, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, margin: 0 }}>{E({ bk: "footer_showroom_title", def: "Showroom", as: "span" })}</h4>
              </div>
              {[
                { icon: "map_pin", labelKey: "footer_showroom_1_label", label: "TP. HCM", valKey: "footer_showroom_1_value", val: "74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức" },
                { icon: "map_pin", labelKey: "footer_showroom_2_label", label: "Hà Nội", valKey: "footer_showroom_2_value", val: "B46-29, KĐT Geleximco B, Lê Trọng Tấn, Q. Hà Đông" },
                { icon: "factory", labelKey: "footer_showroom_3_label", label: "Xưởng SX", valKey: "footer_showroom_3_value", val: "202 Nguyễn Thị Sáng, X. Đông Thạnh, H. Hóc Môn" },
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
                  <FooterSvgIcon name={a.icon} size={16} color={GOLD_PALE} style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ color: "#E4C56F", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, marginBottom: 2 }}>{E({ bk: a.labelKey, def: a.label, as: "span" })}</div>
                    <div style={{ color: "#B7A98E", fontSize: 12, lineHeight: 1.65, fontFamily: FONT_BODY }}>{E({ bk: a.valKey, def: a.val, as: "span", multiline: true })}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Cột 3: Liên hệ */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 3, height: 16, background: GOLD_PALE, borderRadius: 2 }} />
                <h4 style={{ color: GOLD_PALE, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, margin: 0 }}>{E({ bk: "footer_contact_title", def: "Liên hệ", as: "span" })}</h4>
              </div>
              {[
                { icon: "phone", labelKey: "footer_contact_1_label", label: "Hotline", valKey: "footer_contact_1_value", val: contactPhoneDisplay, href: contactPhoneHref },
                { icon: "message_circle", labelKey: "footer_contact_2_label", label: "Zalo tư vấn", valKey: "footer_contact_2_value", val: contactZaloDisplay, href: contactZaloHref },
                { icon: "mail", labelKey: "footer_contact_3_label", label: "Email", valKey: "footer_contact_3_value", val: "info@smartfurni.vn", href: "mailto:info@smartfurni.vn" },
                { icon: "globe", labelKey: "footer_contact_4_label", label: "Website", valKey: "footer_contact_4_value", val: "smartfurni.vn", href: "https://smartfurni.vn" },
              ].map((c, i) => (
                <a key={i} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start", textDecoration: "none" }}>
                  <FooterSvgIcon name={c.icon} size={16} color={GOLD_PALE} style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ color: "#B7A98E", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, marginBottom: 1 }}>{E({ bk: c.labelKey, def: c.label, as: "span" })}</div>
                    <div style={{ color: "#E4C56F", fontSize: 13, fontFamily: FONT_BODY, fontWeight: 700 }}>{E({ bk: c.valKey, def: c.val, as: "span" })}</div>
                  </div>
                </a>
              ))}
            </div>
            {/* Cột 4: Đặt hàng */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 3, height: 16, background: GOLD_PALE, borderRadius: 2 }} />
                <h4 style={{ color: GOLD_PALE, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, margin: 0 }}>{E({ bk: "footer_order_title", def: "Đặt hàng ngay", as: "span" })}</h4>
              </div>
              <p style={{ color: "#B7A98E", fontSize: 12, lineHeight: 1.75, fontFamily: FONT_BODY, marginBottom: 20 }}>
                {E({ bk: "footer_order_desc", def: "Nhận tư vấn miễn phí & xác nhận đơn hàng trong vòng 2 giờ làm việc.", as: "span", multiline: true })}
              </p>
              <button
                onClick={openGsf150OrderPopup}
                style={{ display: "block", width: "100%", textAlign: "center", background: `linear-gradient(135deg, ${GOLD_PALE} 0%, ${GOLD} 100%)`, color: "#0D0B08", fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "13px 20px", borderRadius: R_MD, border: "none", cursor: "pointer", fontFamily: FONT_BODY, boxShadow: "0 6px 24px rgba(201,168,76,0.25)", marginBottom: 12 }}
              >
                {E({ bk: "footer_order_cta", def: "Đặt hàng ngay →", as: "span" })}
              </button>
              <a href={contactZaloHref} target="_blank" rel="noopener noreferrer"
                style={{ display: "block", textAlign: "center", background: "transparent", color: "#D9CBAE", fontWeight: 500, fontSize: 11, letterSpacing: "0.06em", padding: "12px 20px", borderRadius: R_MD, textDecoration: "none", fontFamily: FONT_BODY, border: "1px solid rgba(212,196,160,0.2)" }}>
                {E({ bk: "footer_zalo_cta", def: "💬 Chat Zalo ngay", as: "span" })}
              </a>
            </div>
          </div>
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.12) 20%, rgba(201,168,76,0.12) 80%, transparent)", marginBottom: 24 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 12, paddingBottom: 28 }}>
            <p style={{ color: "#3A3020", fontSize: 11, fontFamily: FONT_BODY, margin: 0 }}>
              {E({ bk: "footer_copyright", def: "© 2025 Công ty Cổ phần SmartFurni. Tất cả quyền được bảo lưu.", as: "span" })}
            </p>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { labelKey: "footer_policy_privacy", label: "Chính sách bảo mật", href: "/privacy" },
                { labelKey: "footer_policy_terms", label: "Điều khoản sử dụng", href: "/terms" },
                { labelKey: "footer_policy_warranty", label: "Chính sách bảo hành", href: "/bao-hanh" },
              ].map((l) => (
                <a key={l.label} href={l.href} style={{ color: "#3A3020", fontSize: 11, fontFamily: FONT_BODY, textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#B7A98E")}
                  onMouseLeave={e => (e.currentTarget.style.color = "#3A3020")}
                >{E({ bk: l.labelKey, def: l.label, as: "span" })}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── STICKY CTA ── */}
      <StickyCta openOrderPopup={openGsf150OrderPopup} E={E} />

      {/* ── FLOATING ZALO + CALL BUTTONS ── */}
      <div style={{ position: "fixed", bottom: "calc(168px + env(safe-area-inset-bottom, 0px))", right: 18, zIndex: 850, display: "flex", flexDirection: "column", gap: 14, alignItems: "center" }}>
        {/* Nút Gọi điện */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="lp-wave-ring" style={{ background: "rgba(34,197,94,0.25)" }} />
          <span className="lp-wave-ring lp-wave-ring-2" style={{ background: "rgba(34,197,94,0.15)" }} />
          <a href={contactPhoneHref} title="Gọi điện tư vấn"
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
          <a href={contactZaloHref} target="_blank" rel="noopener noreferrer" title="Chat Zalo"
            style={{ position: "relative", zIndex: 2, width: 46, height: 46, borderRadius: "50%", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "transform 0.2s" }}
            onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.1)"}
            onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"}>
            <svg width="46" height="46" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M22.782 0.166016H27.199C33.2653 0.166016 36.8103 1.05701 39.9572 2.74421C43.1041 4.4314 45.5875 6.89585 47.2557 10.0428C48.9429 13.1897 49.8339 16.7347 49.8339 22.801V27.1991C49.8339 33.2654 48.9429 36.8104 47.2557 39.9573C45.5685 43.1042 43.1041 45.5877 39.9572 47.2559C36.8103 48.9431 33.2653 49.8341 27.199 49.8341H22.8009C16.7346 49.8341 13.1896 48.9431 10.0427 47.2559C6.89583 45.5687 4.41243 43.1042 2.7442 39.9573C1.057 36.8104 0.166016 33.2654 0.166016 27.1991V22.801C0.166016 16.7347 1.057 13.1897 2.7442 10.0428C4.43139 6.89585 6.89583 4.41245 10.0427 2.74421C13.1707 1.05701 16.7346 0.166016 22.782 0.166016Z" fill="#0068FF"/>
              <path opacity="0.12" fillRule="evenodd" clipRule="evenodd" d="M49.8336 26.4736V27.1994C49.8336 33.2657 48.9427 36.8107 47.2555 39.9576C45.5683 43.1045 43.1038 45.5879 39.9569 47.2562C36.81 48.9434 33.265 49.8344 27.1987 49.8344H22.8007C17.8369 49.8344 14.5612 49.2378 11.8104 48.0966L7.27539 43.4267L49.8336 26.4736Z" fill="#001A33"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M7.779 43.5892C10.1019 43.846 13.0061 43.1836 15.0682 42.1825C24.0225 47.1318 38.0197 46.8954 46.4923 41.4732C46.8209 40.9803 47.1279 40.4677 47.4128 39.9363C49.1062 36.7779 Lắp Gọn4 33.22 Lắp Gọn4 27.1316V22.7175CLắp Gọn4 16.629 49.1062 13.0711 47.4128 9.91273C45.7385 6.75436 43.2461 4.28093 40.0877 2.58758C36.9293 0.894239 33.3714 0 27.283 0H22.8499C17.6644 0 14.2982 0.652754 11.4699 1.89893C11.3153 2.03737 11.1636 2.17818 11.0151 2.32135C2.71734 10.3203 2.08658 27.6593 9.12279 37.0782C9.13064 37.0921 9.13933 37.1061 9.14889 37.1203C10.2334 38.7185 9.18694 41.5154 7.55068 43.1516C7.28431 43.399 7.37944 43.5512 7.779 43.5892Z" fill="white"/>
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
