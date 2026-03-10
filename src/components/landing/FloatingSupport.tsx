"use client";
import { useState } from "react";

export default function FloatingSupport() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-3">
      {/* Expanded options */}
      {open && (
        <div className="flex flex-col gap-2 mb-1">
          {/* Zalo */}
          <a
            href="https://zalo.me/0901234567"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-[#0068FF] text-white px-4 py-2.5 rounded-2xl shadow-lg hover:opacity-90 transition-opacity text-sm font-medium whitespace-nowrap"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
            Chat Zalo
          </a>

          {/* Hotline */}
          <a
            href="tel:19001234"
            className="flex items-center gap-2.5 bg-[#22C55E] text-white px-4 py-2.5 rounded-2xl shadow-lg hover:opacity-90 transition-opacity text-sm font-medium whitespace-nowrap"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.29-1.29a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
            1900 1234
          </a>

          {/* Email */}
          <a
            href="mailto:support@smartfurni.vn"
            className="flex items-center gap-2.5 text-white px-4 py-2.5 rounded-2xl shadow-lg hover:opacity-90 transition-opacity text-sm font-medium whitespace-nowrap"
            style={{ backgroundColor: "#C9A84C" }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            Gửi email
          </a>
        </div>
      )}

      {/* Main toggle button */}
      <button
        onClick={() => setOpen(!open)}
        style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)" }}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95"
        aria-label="Hỗ trợ khách hàng"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4" y1="4" x2="18" y2="18"/>
            <line x1="18" y1="4" x2="4" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        )}
      </button>

      {/* Pulse ring when closed */}
      {!open && (
        <span
          className="absolute bottom-0 right-0 w-14 h-14 rounded-full animate-ping opacity-20 pointer-events-none"
          style={{ backgroundColor: "#C9A84C" }}
        />
      )}
    </div>
  );
}
