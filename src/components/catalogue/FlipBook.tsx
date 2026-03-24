"use client";

/**
 * FlipBook.tsx
 * Hiệu ứng lật trang sách 3D thuần CSS + React.
 * Hỗ trợ: click để lật, phím ← →, swipe mobile, thumbnail navigation.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import type { CataloguePage } from "@/lib/catalogue-store";

interface FlipBookProps {
  pages: CataloguePage[];
  title: string;
  onClose?: () => void;
  className?: string;
}

// Mỗi "spread" = 2 trang (trái + phải), như cuốn sách mở
// Trang 0 = bìa trước (chỉ hiện bên phải)
// Trang cuối = bìa sau (chỉ hiện bên trái)

export default function FlipBook({ pages, title, onClose, className = "" }: FlipBookProps) {
  const [currentSpread, setCurrentSpread] = useState(0); // 0 = bìa trước
  const [flipping, setFlipping] = useState(false);
  const [flipDir, setFlipDir] = useState<"next" | "prev">("next");
  const [showThumbs, setShowThumbs] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const touchStartX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tổng số spread: bìa trước + nội dung theo cặp + bìa sau
  // spread 0 = chỉ bìa trước (right)
  // spread 1..n = cặp trang
  // spread cuối = chỉ bìa sau (left)
  const totalSpreads = Math.ceil((pages.length - 1) / 2) + 1;
  const maxSpread = totalSpreads - 1;

  // Lấy trang trái và phải cho spread hiện tại
  function getPagesForSpread(spread: number): { left: CataloguePage | null; right: CataloguePage | null } {
    if (spread === 0) {
      return { left: null, right: pages[0] || null };
    }
    const leftIdx = spread * 2 - 1;
    const rightIdx = spread * 2;
    return {
      left: pages[leftIdx] || null,
      right: pages[rightIdx] || null,
    };
  }

  const goNext = useCallback(() => {
    if (flipping || currentSpread >= maxSpread) return;
    setFlipDir("next");
    setFlipping(true);
    setTimeout(() => {
      setCurrentSpread(s => s + 1);
      setFlipping(false);
    }, 600);
  }, [flipping, currentSpread, maxSpread]);

  const goPrev = useCallback(() => {
    if (flipping || currentSpread <= 0) return;
    setFlipDir("prev");
    setFlipping(true);
    setTimeout(() => {
      setCurrentSpread(s => s - 1);
      setFlipping(false);
    }, 600);
  }, [flipping, currentSpread]);

  const goToSpread = useCallback((spread: number) => {
    if (flipping || spread === currentSpread) return;
    setFlipDir(spread > currentSpread ? "next" : "prev");
    setFlipping(true);
    setTimeout(() => {
      setCurrentSpread(spread);
      setFlipping(false);
      setShowThumbs(false);
    }, 600);
  }, [flipping, currentSpread]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  // Touch/swipe support
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  }

  // Fullscreen
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const { left, right } = getPagesForSpread(currentSpread);
  const { left: prevLeft, right: prevRight } = currentSpread > 0
    ? getPagesForSpread(currentSpread - 1)
    : { left: null, right: null };
  const { left: nextLeft, right: nextRight } = currentSpread < maxSpread
    ? getPagesForSpread(currentSpread + 1)
    : { left: null, right: null };

  const isFirstSpread = currentSpread === 0;
  const isLastSpread = currentSpread === maxSpread;

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center bg-[#0d0d0d] select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="w-full flex items-center justify-between px-4 py-2 bg-[#111] border-b border-white/5 z-20">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10"
              title="Đóng"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l10 10M13 3L3 13"/>
              </svg>
            </button>
          )}
          <span className="text-sm font-semibold text-white truncate max-w-[200px]">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {currentSpread === 0
              ? "Bìa"
              : currentSpread === maxSpread
              ? "Bìa sau"
              : `Trang ${currentSpread * 2 - 1}–${Math.min(currentSpread * 2, pages.length - 1)}`
            } / {pages.length}
          </span>
          <button
            onClick={() => setShowThumbs(v => !v)}
            className={`p-1.5 rounded-lg transition-colors text-xs ${showThumbs ? "bg-[#C9A84C]/20 text-[#C9A84C]" : "text-gray-500 hover:text-white hover:bg-white/10"}`}
            title="Xem tất cả trang"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="6" height="6" rx="1"/>
              <rect x="9" y="1" width="6" height="6" rx="1"/>
              <rect x="1" y="9" width="6" height="6" rx="1"/>
              <rect x="9" y="9" width="6" height="6" rx="1"/>
            </svg>
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
          >
            {isFullscreen ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 1H1v5M10 1h5v5M6 15H1v-5M10 15h5v-5"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 6V1h5M15 6V1h-5M1 10v5h5M15 10v5h-5"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Thumbnail panel */}
      {showThumbs && (
        <div className="absolute top-[44px] right-0 w-64 h-[calc(100%-44px)] bg-[#111] border-l border-white/5 z-30 overflow-y-auto">
          <div className="p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3 font-medium">Tất cả trang</p>
            <div className="space-y-2">
              {pages.map((page, idx) => {
                const spread = idx === 0 ? 0 : Math.ceil(idx / 2);
                const isActive = spread === currentSpread;
                return (
                  <button
                    key={page.id}
                    onClick={() => goToSpread(spread)}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-all ${
                      isActive ? "bg-[#C9A84C]/15 border border-[#C9A84C]/30" : "hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <div
                      className="w-10 h-14 rounded flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: page.bgColor || "#1a1a1a" }}
                    >
                      {page.imageUrl ? (
                        <img src={page.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-[8px] text-white/30">{idx + 1}</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-medium truncate ${isActive ? "text-[#C9A84C]" : "text-gray-300"}`}>
                        {page.title || `Trang ${idx + 1}`}
                      </p>
                      <p className="text-[10px] text-gray-600 truncate">{page.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Book container */}
      <div className="flex-1 flex items-center justify-center w-full px-4 py-6 overflow-hidden">
        <div className="relative flex items-center gap-4">
          {/* Prev button */}
          <button
            onClick={goPrev}
            disabled={isFirstSpread || flipping}
            className={`z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isFirstSpread || flipping
                ? "opacity-20 cursor-not-allowed"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4L6 9l5 5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Book */}
          <div
            className="relative"
            style={{
              perspective: "2000px",
              perspectiveOrigin: "50% 50%",
            }}
          >
            {/* Book shadow */}
            <div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 rounded-full blur-xl opacity-40"
              style={{ width: "80%", height: "20px", background: "radial-gradient(ellipse, #000 0%, transparent 70%)" }}
            />

            {/* Book spread */}
            <div
              className="relative flex"
              style={{
                width: "min(700px, 90vw)",
                height: "min(500px, 65vw)",
              }}
            >
              {/* Left page */}
              <div
                className={`relative flex-1 overflow-hidden rounded-l-sm ${
                  isFirstSpread ? "opacity-0" : ""
                }`}
                style={{
                  boxShadow: "inset -2px 0 8px rgba(0,0,0,0.4), -4px 0 20px rgba(0,0,0,0.3)",
                  background: left?.bgColor || "#1a1a1a",
                }}
              >
                <PageContent page={left} side="left" />
                {/* Page spine shadow */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/30 to-transparent pointer-events-none" />
              </div>

              {/* Spine */}
              <div
                className="w-[3px] flex-shrink-0 z-10"
                style={{
                  background: "linear-gradient(to right, #000 0%, #333 40%, #000 100%)",
                  boxShadow: "0 0 8px rgba(0,0,0,0.8)",
                }}
              />

              {/* Right page */}
              <div
                className={`relative flex-1 overflow-hidden rounded-r-sm ${
                  isLastSpread && !right ? "opacity-0" : ""
                }`}
                style={{
                  boxShadow: "inset 2px 0 8px rgba(0,0,0,0.4), 4px 0 20px rgba(0,0,0,0.3)",
                  background: right?.bgColor || "#1a1a1a",
                }}
              >
                <PageContent page={right} side="right" />
                {/* Page spine shadow */}
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-black/30 to-transparent pointer-events-none" />
                {/* Page curl hint */}
                {!isLastSpread && (
                  <div
                    className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none"
                    style={{
                      background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.3) 50%)",
                    }}
                  />
                )}
              </div>

              {/* Flip animation overlay */}
              {flipping && (
                <div
                  className="absolute inset-0 z-20 pointer-events-none"
                  style={{
                    animation: `flipPage${flipDir === "next" ? "Next" : "Prev"} 0.6s ease-in-out`,
                  }}
                >
                  <style>{`
                    @keyframes flipPageNext {
                      0% { transform: rotateY(0deg); opacity: 1; }
                      50% { transform: rotateY(-90deg); opacity: 0.5; }
                      100% { transform: rotateY(-180deg); opacity: 0; }
                    }
                    @keyframes flipPagePrev {
                      0% { transform: rotateY(0deg); opacity: 1; }
                      50% { transform: rotateY(90deg); opacity: 0.5; }
                      100% { transform: rotateY(180deg); opacity: 0; }
                    }
                  `}</style>
                  <div
                    className={`absolute ${flipDir === "next" ? "right-0 w-1/2" : "left-0 w-1/2"} h-full`}
                    style={{
                      background: flipDir === "next"
                        ? (nextLeft?.bgColor || "#1a1a1a")
                        : (prevRight?.bgColor || "#1a1a1a"),
                      transformOrigin: flipDir === "next" ? "left center" : "right center",
                      backfaceVisibility: "hidden",
                    }}
                  />
                </div>
              )}

              {/* Click zones */}
              {!isFirstSpread && (
                <div
                  className="absolute left-0 top-0 w-1/2 h-full cursor-pointer z-10 opacity-0 hover:opacity-100 transition-opacity"
                  onClick={goPrev}
                >
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 rounded-full p-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                      <path d="M10 3L5 8l5 5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
              )}
              {!isLastSpread && (
                <div
                  className="absolute right-0 top-0 w-1/2 h-full cursor-pointer z-10 opacity-0 hover:opacity-100 transition-opacity"
                  onClick={goNext}
                >
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 rounded-full p-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
                      <path d="M6 3l5 5-5 5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Next button */}
          <button
            onClick={goNext}
            disabled={isLastSpread || flipping}
            className={`z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isLastSpread || flipping
                ? "opacity-20 cursor-not-allowed"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 4l5 5-5 5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom: page dots */}
      <div className="flex items-center gap-1.5 pb-4">
        {Array.from({ length: totalSpreads }).map((_, i) => (
          <button
            key={i}
            onClick={() => goToSpread(i)}
            className={`rounded-full transition-all ${
              i === currentSpread
                ? "w-5 h-1.5 bg-[#C9A84C]"
                : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
            }`}
          />
        ))}
      </div>

      {/* Keyboard hint */}
      <div className="pb-2 text-[10px] text-gray-700 flex items-center gap-3">
        <span>← → để lật trang</span>
        <span>·</span>
        <span>Vuốt để lật trên mobile</span>
        <span>·</span>
        <span>Click vào trang để lật</span>
      </div>

      {/* Suppress unused vars */}
      {void prevLeft}
      {void prevRight}
      {void nextRight}
    </div>
  );
}

// ─── Page Content Renderer ────────────────────────────────────────────────────

function PageContent({ page, side }: { page: CataloguePage | null; side: "left" | "right" }) {
  if (!page) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#111]">
        <div className="text-center opacity-20">
          <div className="text-4xl mb-2">📖</div>
        </div>
      </div>
    );
  }

  const isCover = page.type === "cover";
  const isBackCover = page.type === "back-cover";

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: page.bgColor || "#1a1a1a", color: page.textColor || "#fff" }}
    >
      {/* Background image */}
      {page.imageUrl && (
        <div className="absolute inset-0">
          <img
            src={page.imageUrl}
            alt={page.title}
            className="w-full h-full object-cover"
          />
          {/* Overlay for text readability */}
          {(page.title || page.content) && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          )}
        </div>
      )}

      {/* Badge */}
      {page.badge && (
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-[#C9A84C] text-black text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">
            {page.badge}
          </span>
        </div>
      )}

      {/* Content */}
      {isCover ? (
        <CoverContent page={page} />
      ) : isBackCover ? (
        <BackCoverContent page={page} />
      ) : (
        <ContentPage page={page} side={side} />
      )}

      {/* Page number */}
      <div className={`absolute bottom-2 ${side === "left" ? "left-3" : "right-3"} text-[10px] opacity-40`}
        style={{ color: page.textColor || "#fff" }}
      >
        {page.pageNumber}
      </div>
    </div>
  );
}

function CoverContent({ page }: { page: CataloguePage }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end p-6 pb-8">
      {!page.imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <span className="text-8xl">📋</span>
        </div>
      )}
      <div className="text-center z-10">
        {page.title && (
          <h1
            className="text-2xl font-black uppercase tracking-widest mb-2 leading-tight"
            style={{ color: page.textColor || "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}
          >
            {page.title}
          </h1>
        )}
        {page.subtitle && (
          <p
            className="text-sm opacity-80 tracking-wide"
            style={{ color: page.textColor || "#fff" }}
          >
            {page.subtitle}
          </p>
        )}
        <div className="mt-4 w-12 h-0.5 mx-auto bg-[#C9A84C]" />
      </div>
    </div>
  );
}

function BackCoverContent({ page }: { page: CataloguePage }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
      {!page.imageUrl && (
        <div className="absolute inset-0 flex items-center justify-center opacity-5">
          <span className="text-8xl">📋</span>
        </div>
      )}
      <div className="text-center z-10">
        <div className="w-12 h-0.5 mx-auto bg-[#C9A84C] mb-4" />
        {page.title && (
          <h2 className="text-lg font-bold mb-2" style={{ color: page.textColor || "#fff" }}>
            {page.title}
          </h2>
        )}
        {page.content && (
          <p className="text-xs opacity-70 leading-relaxed max-w-[160px] mx-auto" style={{ color: page.textColor || "#fff" }}>
            {page.content}
          </p>
        )}
      </div>
    </div>
  );
}

function ContentPage({ page, side }: { page: CataloguePage; side: "left" | "right" }) {
  void side;
  return (
    <div className="absolute inset-0 flex flex-col p-5">
      {/* Header */}
      {(page.title || page.subtitle) && (
        <div className="mb-3 flex-shrink-0">
          {page.title && (
            <h2
              className="text-base font-bold leading-tight mb-0.5"
              style={{ color: page.textColor || "#fff" }}
            >
              {page.title}
            </h2>
          )}
          {page.subtitle && (
            <p className="text-xs opacity-60" style={{ color: page.textColor || "#fff" }}>
              {page.subtitle}
            </p>
          )}
          <div className="mt-2 w-8 h-px bg-[#C9A84C]" />
        </div>
      )}

      {/* Content text */}
      {page.content && !page.imageUrl && (
        <div
          className="flex-1 text-xs leading-relaxed opacity-80 overflow-hidden"
          style={{ color: page.textColor || "#fff" }}
        >
          {page.content.split("\n").map((line, i) => (
            <p key={i} className={line === "" ? "h-3" : "mb-1.5"}>{line}</p>
          ))}
        </div>
      )}

      {/* Image fills remaining space */}
      {page.imageUrl && (
        <div className="flex-1 rounded overflow-hidden min-h-0">
          {/* image is already set as background */}
        </div>
      )}

      {/* Content overlay on image */}
      {page.imageUrl && page.content && (
        <div className="flex-shrink-0 mt-auto pt-2">
          <p
            className="text-xs leading-relaxed opacity-90"
            style={{ color: page.textColor || "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
          >
            {page.content}
          </p>
        </div>
      )}
    </div>
  );
}
