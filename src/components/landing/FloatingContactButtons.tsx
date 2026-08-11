"use client";

import { usePathname } from "next/navigation";

const CONTACT_PHONE_HREF = "tel:0918326552";
const CONTACT_ZALO_HREF = "https://zalo.me/0918326552";
const HIDDEN_ROUTE_PREFIXES = ["/lp/", "/admin", "/crm", "/dashboard", "/smart-bed", "/zalo-group/", "/zalo/quan-tam/"];

function ZaloLogo() {
  return (
    <svg width="46" height="46" viewBox="0 0 50 50" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M22.782.166h4.417c6.066 0 9.611.891 12.758 2.578 3.147 1.687 5.63 4.152 7.299 7.299 1.687 3.147 2.578 6.692 2.578 12.758v4.398c0 6.066-.891 9.611-2.578 12.758-1.687 3.147-4.152 5.631-7.299 7.299-3.147 1.687-6.692 2.578-12.758 2.578h-4.398c-6.066 0-9.611-.891-12.758-2.578-3.147-1.687-5.63-4.152-7.299-7.299C1.057 36.81.166 33.265.166 27.199v-4.398c0-6.066.891-9.611 2.578-12.758 1.687-3.147 4.152-5.612 7.299-7.299C13.171 1.057 16.735.166 22.782.166Z"
        fill="#0068FF"
      />
      <path
        d="M20.563 17h-9.725v2.085h6.749l-6.654 8.247c-.209.303-.36.587-.36 1.232v.531h9.175c.455 0 .834-.38.834-.835v-1.118h-7.09l6.256-7.848c.095-.114.265-.322.341-.417l.038-.057c.36-.531.436-.986.436-1.536V17Zm12.379 12.095h1.384V17H32.24v11.393c0 .38.304.702.702.702ZM25.814 19.692a4.739 4.739 0 1 0 0 9.479 4.739 4.739 0 0 0 0-9.479Zm0 7.526a2.787 2.787 0 1 1 0-5.573 2.787 2.787 0 0 1 0 5.573Zm14.673-7.602a4.777 4.777 0 1 0 0 9.555 4.777 4.777 0 0 0 0-9.555Zm0 7.602a2.806 2.806 0 1 1 0-5.611 2.806 2.806 0 0 1 0 5.611Zm-11.031 1.876h1.119v-9.137h-1.953v8.322c0 .436.379.815.834.815Z"
        fill="white"
      />
    </svg>
  );
}

export default function FloatingContactButtons() {
  const pathname = usePathname();
  const isHidden = HIDDEN_ROUTE_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  if (isHidden) return null;

  return (
    <div className="no-print fixed bottom-[calc(168px+env(safe-area-inset-bottom,0px))] right-[18px] z-50 flex flex-col items-center gap-3.5">
      <div className="relative grid h-[46px] w-[46px] place-items-center">
        <span className="absolute inset-0 rounded-full bg-green-500/25 motion-safe:animate-ping" />
        <span className="absolute inset-0 rounded-full bg-green-500/15 motion-safe:animate-ping [animation-delay:700ms]" />
        <a
          href={CONTACT_PHONE_HREF}
          aria-label="Gọi điện tư vấn SmartFurni"
          title="Gọi điện tư vấn"
          className="relative z-10 grid h-[46px] w-[46px] place-items-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-[0_4px_16px_rgba(34,197,94,.48)] transition-transform hover:scale-110 active:scale-95"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.8a16 16 0 0 0 6.29 6.29l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z" />
          </svg>
        </a>
      </div>

      <div className="relative grid h-[46px] w-[46px] place-items-center">
        <span className="absolute inset-0 rounded-full bg-[#0068FF]/25 motion-safe:animate-ping" />
        <span className="absolute inset-0 rounded-full bg-[#0068FF]/15 motion-safe:animate-ping [animation-delay:700ms]" />
        <a
          href={CONTACT_ZALO_HREF}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat Zalo với SmartFurni"
          title="Chat Zalo"
          className="relative z-10 h-[46px] w-[46px] rounded-full shadow-[0_4px_16px_rgba(0,104,255,.4)] transition-transform hover:scale-110 active:scale-95"
        >
          <ZaloLogo />
        </a>
      </div>
    </div>
  );
}
