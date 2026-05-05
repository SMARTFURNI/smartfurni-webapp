"use client";
import "./lp-retail.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import type { CrmProduct } from "@/lib/crm-types";
import { EditableHeroImage } from "@/components/lp/EditableHeroImage";
import { LpEditBar } from "@/components/lp/LpEditBar";

const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E2C97E";
const BLACK = "#0A0A08";
const BLACK_SOFT = "#111109";
const BLACK_CARD = "#16140E";
const BLACK_BORDER = "rgba(201,168,76,0.12)";
const WHITE = "#F5F0E8";
const GRAY = "#7A7468";
const GRAY_LIGHT = "#A8A090";
const LP_SLUG = "sofa-giuong";
const FONT_HEADING = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_BODY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const R_SM = 8;
const R_MD = 12;
const R_LG = 16;
const R_FULL = 999;

// ─── LUXURY SVG ICON LIBRARY ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

interface ConfigState {
  productId: string | null;
  size: string | null;
  hoc: "co_hoc" | "khong_hoc" | null;
  tayVin: "co_tay" | "khong_tay" | null;
  matTrang: "vai_canvas" | "da_pu" | "go_mdf" | "go_tu_nhien" | null;
  doDay: "7cm" | "10cm" | null;
  aoNem: "vai_lanh" | "da_pu_nem" | null;
}

type QuizStep = "product" | "size" | "hoc" | "tayVin" | "matTrang" | "doDay" | "aoNem" | "summary";

const PRICE_ADDONS: Record<string, number> = {
  co_hoc: 700000, khong_hoc: 0,
  co_tay: 500000, khong_tay: 0,
  vai_canvas: 0, da_pu: 1200000, go_mdf: 0, go_tu_nhien: 1500000,
  "7cm": 0, "10cm": 800000,
  vai_lanh: 0, da_pu_nem: 600000,
};
const ADDON_LABELS: Record<string, string> = {
  co_hoc: "Có hộc để đồ", khong_hoc: "Không hộc",
  co_tay: "Có tay vịn", khong_tay: "Không tay vịn",
  vai_canvas: "Vải canvas", da_pu: "Da PU cao cấp", go_mdf: "Gỗ MDF chống ẩm", go_tu_nhien: "Gỗ tự nhiên",
  "7cm": "Nệm 7cm", "10cm": "Nệm 10cm",
  vai_lanh: "Áo nệm vải lanh", da_pu_nem: "Áo nệm da PU",
};

// ─── SVG Icon Library (Luxury thin-line, gold stroke) ────────────────────────
const SVG_ICONS: Record<string, React.ReactNode> = {
  // Hero trust badges
  palette: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="8" cy="14" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="9" r="1.5" fill="currentColor" stroke="none"/><circle cx="16" cy="14" r="1.5" fill="currentColor" stroke="none"/><path d="M12 22c-1.5 0-3-1.5-3-3s1.5-2 3-2 3 .5 3 2-1.5 3-3 3z"/></svg>),
  price_tag: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>),
  truck: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v4h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>),
  shield: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>),
  // Pain points
  ruler_cross: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18M3 21L21 3"/><rect x="2" y="7" width="20" height="10" rx="1" opacity="0.3"/></svg>),
  eye_off: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>),
  question_circle: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>),
  wrench: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>),
  // How it works
  sofa: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 9V7a2 2 0 00-2-2H6a2 2 0 00-2 2v2"/><path d="M2 11a2 2 0 012 2v2h16v-2a2 2 0 012-2 2 2 0 01-2-2H4a2 2 0 01-2 2z"/><line x1="6" y1="19" x2="6" y2="21"/><line x1="18" y1="19" x2="18" y2="21"/></svg>),
  sliders: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>),
  calculator: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8" y2="10"/><line x1="12" y1="10" x2="12" y2="10"/><line x1="16" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/><line x1="16" y1="18" x2="16" y2="18"/></svg>),
  phone: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.16a16 16 0 006.93 6.93l1.52-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>),
  // Features
  star_circle: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7l1.5 3.5L17 11l-2.5 2.5.5 3.5L12 15.5 9 17l.5-3.5L7 11l3.5-.5L12 7z"/></svg>),
  factory: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20V9l6-4v4l6-4v4l6-4v15H2z"/><line x1="2" y1="20" x2="22" y2="20"/><rect x="9" y="14" width="2" height="6"/><rect x="13" y="14" width="2" height="6"/></svg>),
  credit_card: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>),
  // Guarantee
  check_circle: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>),
  refresh: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>),
  headphones: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 18v-6a9 9 0 0118 0v6"/><path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/></svg>),
  // Footer contact
  map_pin: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>),
  message_circle: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>),
  mail: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>),
  globe: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>),
  // Quiz options
  box: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>),
  armchair: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 9V6a2 2 0 00-2-2H7a2 2 0 00-2 2v3"/><path d="M3 11v5a2 2 0 002 2h14a2 2 0 002-2v-5a2 2 0 00-4 0v2H7v-2a2 2 0 00-4 0z"/><line x1="5" y1="20" x2="5" y2="22"/><line x1="19" y1="20" x2="19" y2="22"/></svg>),
  sparkles: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75L5 3z"/><path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z"/></svg>),
  leaf: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8C8 10 5.9 16.17 3.82 19.5c-.6.98.27 2.1 1.37 1.73C7.27 20.2 11.5 18 12 12c2 1 4 1.5 6 1-1 2-2.5 3.5-5 4.5 3 0 6-2 7-6s-1-9-3-3z"/></svg>),
  // Mattress
  layers: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>),
  moon: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>),
  // Spec table
  frame: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>),
  zap: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>),
  maximize: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>),
  award: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>),
  ruler: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18v10H3z"/><path d="M7 7v3M11 7v5M15 7v3M19 7v2"/></svg>),
  bed: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4v16M22 4v16M2 8h20M2 16h20"/><path d="M6 8v8M18 8v8"/></svg>),
  wood: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20M2 14h20M7 4v16M12 4v16M17 4v16"/></svg>),
  minus_circle: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>),
};

function SvgIcon({ name, size = 24, color = "currentColor", className = "", style }: { name: string; size?: number; color?: string; className?: string; style?: React.CSSProperties }) {
  const icon = SVG_ICONS[name];
  if (!icon) return <span style={{ fontSize: size * 0.8, lineHeight: 1 }}>{name}</span>;
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, color, flexShrink: 0, ...style }}
    >
      {React.cloneElement(icon as React.ReactElement, { width: size, height: size })}
    </span>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n: number) { return n.toLocaleString("vi-VN") + " ₫"; }
function getBasePrice(p: CrmProduct, size: string | null): number {
  if (!size) return p.basePrice || 0;
  const sp = p.sizePricings?.find((s) => s.size === size);
  return sp ? sp.price : p.basePrice || 0;
}
function calcTotal(p: CrmProduct | null, cfg: ConfigState): number {
  if (!p) return 0;
  const base = getBasePrice(p, cfg.size);
  let add = 0;
  if (cfg.hoc) add += PRICE_ADDONS[cfg.hoc] || 0;
  if (cfg.tayVin) add += PRICE_ADDONS[cfg.tayVin] || 0;
  if (cfg.matTrang) add += PRICE_ADDONS[cfg.matTrang] || 0;
  if (cfg.doDay) add += PRICE_ADDONS[cfg.doDay] || 0;
  if (cfg.aoNem) add += PRICE_ADDONS[cfg.aoNem] || 0;
  return base + add;
}
function getProductImages(p: CrmProduct): string[] {
  return [p.imageUrl, p.imageAngle1, p.imageAngle2, p.imageScene, p.imageSpec].filter(Boolean) as string[];
}


// ─── CountdownDisplay ─────────────────────────────────────────────────────────
const CountdownDisplay = React.memo(function CountdownDisplay() {
  const calcTime = () => {
    const now = new Date();
    const end = new Date(now); end.setHours(23, 59, 59, 0);
    const diff = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
    return { h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60), s: diff % 60 };
  };
  const [t, setT] = useState(calcTime);
  useEffect(() => { const id = setInterval(() => setT(calcTime()), 1000); return () => clearInterval(id); }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 24 }}>
      {[{ val: pad(t.h), label: "GIỜ" }, { val: pad(t.m), label: "PHÚT" }, { val: pad(t.s), label: "GIÂY" }].map((u, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ background: BLACK, border: "1px solid rgba(201,168,76,0.3)", borderRadius: 10, padding: "10px 18px", minWidth: 60 }}>
            <span style={{ color: GOLD, fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 700, fontFamily: FONT_HEADING, lineHeight: 1 }}>{u.val}</span>
          </div>
          <span style={{ color: GRAY, fontSize: 10, letterSpacing: "0.15em", fontFamily: FONT_BODY }}>{u.label}</span>
        </div>
      ))}
    </div>
  );
});

// ─── InlineEdit: component thực sự (không phải hàm bên trong component) ─────
const FONT_SIZES = [
  { label: "Nhỏ", value: "12px" }, { label: "Vừa nhỏ", value: "14px" },
  { label: "Vừa", value: "16px" }, { label: "Lớn", value: "20px" },
  { label: "Rất lớn", value: "24px" }, { label: "Tiêu đề nhỏ", value: "28px" },
  { label: "Tiêu đề", value: "36px" }, { label: "Tiêu đề lớn", value: "48px" },
  { label: "Hero", value: "clamp(32px,5vw,64px)" },
];

interface InlineEditProps {
  bk: string;
  def: string;
  as?: keyof JSX.IntrinsicElements;
  style?: React.CSSProperties;
  multiline?: boolean;
  editMode: boolean;
  slug: string;
  savedValue?: string;
  onSaved?: (bk: string, val: string) => void;
}
function InlineEdit({ bk, def, as: Tag = "span", style, multiline = false, editMode, slug, savedValue, onSaved }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // editValue lưu cả text và fontSize: "text||fontSize"
  const [editText, setEditText] = useState("");
  const [editFontSize, setEditFontSize] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse savedValue: có thể là "text" hoặc "text||fontSize"
  const parseValue = (raw: string) => {
    const parts = raw.split("||");
    return { text: parts[0] || "", fontSize: parts[1] || "" };
  };
  const { text: displayText, fontSize: savedFontSize } = parseValue(savedValue ?? def);
  const displayValue = displayText || (savedValue ?? def);

  // Merge fontSize vào style
  const mergedStyle: React.CSSProperties = savedFontSize
    ? { ...style, fontSize: savedFontSize }
    : (style ?? {});

  useEffect(() => { if (!editMode) setIsEditing(false); }, [editMode]);

  const openEdit = () => {
    const { text, fontSize } = parseValue(savedValue ?? def);
    setEditText(text || (savedValue ?? def));
    setEditFontSize(fontSize || "");
    setIsEditing(true);
    // Focus sau khi render
    setTimeout(() => {
      (multiline ? textareaRef.current : inputRef.current)?.focus();
    }, 50);
  };

  const buildSaveValue = () => editFontSize ? `${editText}||${editFontSize}` : editText;

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    const saveVal = buildSaveValue();
    try {
      const res = await fetch("/api/admin/lp-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, blockKey: bk, content: saveVal }),
      });
      if (res.ok) { onSaved?.(bk, saveVal); setIsEditing(false); }
      else alert("Lưu thất bại. Vui lòng thử lại.");
    } catch { alert("Lỗi kết nối."); }
    finally { setIsSaving(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setIsEditing(false); return; }
    if (!multiline && e.key === "Enter") { e.preventDefault(); handleSave(); return; }
    if (multiline && e.key === "Enter" && (e.ctrlKey || e.metaKey)) { handleSave(); return; }
  };

  if (!editMode) return <Tag style={mergedStyle}>{displayValue}</Tag>;

  if (isEditing) return (
    <span style={{ display: "inline-block", position: "relative", width: "100%", zIndex: 300 }}>
      {/* Toolbar cỡ chữ */}
      <span style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#A89070", fontFamily: "'Inter',sans-serif" }}>Cỡ chữ:</span>
        <select
          value={editFontSize}
          onChange={e => setEditFontSize(e.target.value)}
          style={{ background: "rgba(13,11,0,0.95)", border: "1px solid rgba(201,168,76,0.4)",
            borderRadius: 6, color: "#F5EDD6", fontSize: 11, padding: "3px 8px",
            fontFamily: "'Inter',sans-serif", cursor: "pointer", outline: "none" }}
        >
          <option value="">— Giữ nguyên —</option>
          {FONT_SIZES.map(s => (
            <option key={s.value} value={s.value}>{s.label} ({s.value})</option>
          ))}
        </select>
        {editFontSize && (
          <span style={{ fontSize: editFontSize.startsWith("clamp") ? 14 : parseInt(editFontSize),
            color: "#C9A84C", fontFamily: "'Playfair Display',serif", lineHeight: 1 }}>
            Aa
          </span>
        )}
      </span>
      {/* Input/Textarea */}
      {multiline ? (
        <textarea ref={textareaRef} value={editText}
          onChange={e => setEditText(e.target.value)} onKeyDown={handleKeyDown} rows={4}
          style={{ width: "100%", boxSizing: "border-box", background: "rgba(13,11,0,0.95)",
            border: "2px solid #C9A84C", borderRadius: 8, padding: "10px 12px",
            color: "#F5EDD6", fontSize: 14, fontFamily: "'Inter',sans-serif",
            lineHeight: 1.5, resize: "vertical", outline: "none" }} />
      ) : (
        <input ref={inputRef} type="text" value={editText}
          onChange={e => setEditText(e.target.value)} onKeyDown={handleKeyDown}
          style={{ width: "100%", boxSizing: "border-box", background: "rgba(13,11,0,0.95)",
            border: "2px solid #C9A84C", borderRadius: 8, padding: "10px 14px",
            color: "#F5EDD6", fontSize: 15, fontFamily: "'Inter',sans-serif", outline: "none" }} />
      )}
      {/* Buttons */}
      <span style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
        <button onClick={handleSave} disabled={isSaving}
          style={{ background: "#C9A84C", color: "#0D0B00", border: "none", borderRadius: 6,
            padding: "6px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            opacity: isSaving ? 0.6 : 1, fontFamily: "'Inter',sans-serif" }}>
          {isSaving ? "Đang lưu..." : "✓ Lưu"}
        </button>
        <button onClick={() => setIsEditing(false)}
          style={{ background: "rgba(255,255,255,0.08)", color: "#A89070",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
            padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
          Hủy
        </button>
        <span style={{ fontSize: 10, color: "#6B6050", fontFamily: "'Inter',sans-serif" }}>
          {multiline ? "Ctrl+Enter lưu" : "Enter lưu"} · Esc hủy
        </span>
      </span>
    </span>
  );

  return (
    <Tag style={{ ...mergedStyle, position: "relative", cursor: "pointer",
        outline: isHovered ? "2px dashed rgba(201,168,76,0.6)" : "2px dashed transparent",
        outlineOffset: 3, borderRadius: 4, transition: "outline 0.15s" }}
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
      onClick={openEdit} title="Click để chỉnh sửa">
      {displayValue}
      {isHovered && (
        <span style={{ position: "absolute", top: -30, left: 0, zIndex: 200, display: "flex", gap: 4 }}
          onClick={e => e.stopPropagation()}>
          <button onClick={e => { e.stopPropagation(); openEdit(); }}
            style={{ background: "#C9A84C", color: "#0D0B00", border: "none", borderRadius: 5,
              padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer",
              whiteSpace: "nowrap", fontFamily: "'Inter',sans-serif" }}>
            ✏️ Sửa
          </button>
        </span>
      )}
    </Tag>
  );
}

type EFn = (p: { bk: string; def: string; as?: keyof JSX.IntrinsicElements; style?: React.CSSProperties; multiline?: boolean }) => React.ReactNode;

function UrgencyBanner({ E }: { E: EFn }) {
  const [stock] = useState(9);
  return (
    <div style={{ background: "linear-gradient(135deg, #1A1000 0%, #0D0800 100%)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 16, padding: "clamp(24px,3vw,40px) clamp(20px,4vw,48px)", maxWidth: 860, margin: "0 auto", textAlign: "center" }}>
      <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", fontFamily: FONT_BODY, marginBottom: 12 }}>
        {E({ bk: "urgency_label", def: "⚡ ƯU ĐÃI CÓ THỜI HẠN", as: "span" })}
      </div>
      <h3 style={{ color: WHITE, fontSize: "clamp(18px,2.5vw,28px)", fontWeight: 600, fontFamily: FONT_HEADING, marginBottom: 8, lineHeight: 1.3 }}>
        {E({ bk: "urgency_title", def: "Giảm 500.000 ₫ Cho Đơn Đặt Hàng Hôm Nay", as: "span" })}
      </h3>
      <p style={{ color: GRAY_LIGHT, fontSize: 13, fontFamily: FONT_BODY, marginBottom: 24 }}>
        {E({ bk: "urgency_subtitle", def: "Ưu đãi kết thúc lúc 23:59 hôm nay — Đặt hàng ngay để không bỏ lỡ", as: "span" })}
      </p>
      <CountdownDisplay />
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 100, padding: "6px 16px" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444", display: "inline-block" }} />
        <span style={{ color: "#FCA5A5", fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY }}>
          {E({ bk: "urgency_stock", def: `Chỉ còn ${stock} sản phẩm giá ưu đãi`, as: "span" })}
        </span>
      </div>
    </div>
  );
}

function StickyCta({ scrollToForm, E }: { scrollToForm: () => void; E: EFn }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!visible) return null;
  return (
    <div className="sticky-cta-bar" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 900, background: "rgba(10,10,8,0.97)", borderTop: "1px solid rgba(201,168,76,0.25)", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, backdropFilter: "blur(12px)" }}>
      <div>
        <div style={{ color: GOLD, fontSize: 16, fontWeight: 700, fontFamily: FONT_HEADING, lineHeight: 1 }}>Từ 2.990.000 ₫</div>
        <div style={{ color: GRAY, fontSize: 11, fontFamily: FONT_BODY, marginTop: 2 }}>Miễn phí giao hàng + lắp đặt</div>
      </div>
      <button onClick={scrollToForm} style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #E2C97E 100%)`, color: BLACK, border: "none", borderRadius: 100, padding: "12px 28px", fontSize: 13, fontWeight: 700, fontFamily: FONT_HEADING, cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
        {E({ bk: "sticky_cta_btn", def: "Thiết Kế & Đặt Hàng →", as: "span" })}
      </button>
    </div>
  );
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    obs.observe(el); return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

function GoldDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 auto 28px", maxWidth: 140 }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${GOLD})` }} />
      <div style={{ width: 5, height: 5, background: GOLD, transform: "rotate(45deg)", borderRadius: 1 }} />
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${GOLD})` }} />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid rgba(201,168,76,0.35)", background: "rgba(201,168,76,0.06)", color: GOLD, fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", padding: "6px 16px", marginBottom: 18, borderRadius: R_FULL, textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, display: "inline-block" }} />
      {children}
    </div>
  );
}

function GoldButton({ children, onClick, style }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, #9A7A2E 100%)`, color: BLACK, border: "none", padding: "15px 32px", fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const, borderRadius: R_MD, boxShadow: hovered ? "0 12px 36px rgba(201,168,76,0.4)" : "0 6px 24px rgba(201,168,76,0.25)", transform: hovered ? "translateY(-2px)" : "translateY(0)", transition: "all 0.25s ease", fontFamily: FONT_BODY, ...style }}>
      {children}
    </button>
  );
}


// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { bkQ: "faq_1_q", defQ: "Sofa giường có chịu được tải trọng bao nhiêu?", bkA: "faq_1_a", defA: "Khung thép mạ kẽm của SmartFurni chịu tải tối đa 300kg. Thiết kế bền vững, kiểm định 50.000 lần mở/gập." },
  { bkQ: "faq_2_q", defQ: "Tôi có thể chọn kích thước theo yêu cầu không?", bkA: "faq_2_a", defA: "Có. SmartFurni cung cấp 4 kích thước chuẩn: 0,9M / 1,2M / 1,5M / 1,8M. Nếu cần kích thước đặc biệt, vui lòng liên hệ để được tư vấn." },
  { bkQ: "faq_3_q", defQ: "Cơ cấu mở gập có bền không?", bkA: "faq_3_a", defA: "Cơ cấu gas-lift cao cấp, kiểm định 50.000 lần mở/gập. Bảo hành cơ cấu 3 năm, đổi mới ngay nếu có lỗi nhà sản xuất." },
  { bkQ: "faq_4_q", defQ: "Nệm có được bán kèm không?", bkA: "faq_4_a", defA: "Có. Bạn có thể chọn nệm mút ép đàn hồi cao 7cm hoặc 10cm khi thiết kế. Nệm được may áo vải lanh hoặc da PU theo yêu cầu." },
  { bkQ: "faq_5_q", defQ: "Thời gian giao hàng bao lâu?", bkA: "faq_5_a", defA: "Đơn hàng tiêu chuẩn: 5–7 ngày làm việc. Đơn hàng tuỳ chỉnh đặc biệt: 10–14 ngày. Miễn phí giao hàng và lắp đặt toàn quốc." },
  { bkQ: "faq_6_q", defQ: "Trả góp có được không?", bkA: "faq_6_a", defA: "Có. SmartFurni hỗ trợ trả góp 0% lãi suất qua các đối tác tài chính. Liên hệ hotline để được tư vấn phương thức phù hợp." },
];

function FaqAccordion({ E: EditFn }: { E: EFn }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <FadeIn key={i} delay={i * 60}>
            <div style={{ background: isOpen ? BLACK_CARD : BLACK_SOFT, border: `1px solid ${isOpen ? "rgba(201,168,76,0.45)" : BLACK_BORDER}`, borderRadius: R_LG, overflow: "hidden", transition: "border-color 0.25s, background 0.25s" }}>
              <button onClick={() => setOpenIndex(isOpen ? null : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "22px 24px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const }}>
                <span style={{ color: isOpen ? GOLD : WHITE, fontSize: "clamp(14px,1.8vw,16px)", fontWeight: 500, lineHeight: 1.5, fontFamily: FONT_HEADING, transition: "color 0.25s" }}>
                  {EditFn({ bk: item.bkQ, def: item.defQ, as: "span" })}
                </span>
                <span style={{ color: GOLD, fontSize: 20, flexShrink: 0, transform: isOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.3s", lineHeight: 1 }}>+</span>
              </button>
              <div style={{ maxHeight: isOpen ? 400 : 0, overflow: "hidden", transition: "max-height 0.4s ease" }}>
                <div style={{ padding: "0 24px 24px", borderTop: `1px solid ${BLACK_BORDER}`, paddingTop: 18 }}>
                  <p style={{ color: GRAY_LIGHT, fontSize: 14, lineHeight: 1.85, fontFamily: FONT_BODY, margin: 0 }}>
                    {EditFn({ bk: item.bkA, def: item.defA, as: "span", multiline: true })}
                  </p>
                </div>
              </div>
            </div>
          </FadeIn>
        );
      })}
    </div>
  );
}

// ─── Lead Form ────────────────────────────────────────────────────────────────
function LeadForm({ submitLabel, prefilledConfig }: { submitLabel?: string; prefilledConfig?: string }) {
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
      const noteStr = `${prefilledConfig ? "[Cấu hình: " + prefilledConfig + "] " : ""}Địa chỉ: ${form.address} | Ghi chú: ${form.note}`;
      const res = await fetch("/api/lp/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ landingPageSlug: LP_SLUG, name: form.name, phone: form.phone, email: "", note: noteStr, ...utms }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Lỗi server"); }
      setSuccess(true);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại"); }
    finally { setLoading(false); }
  }

  const inp: React.CSSProperties = { width: "100%", background: "rgba(245,237,214,0.04)", border: "1px solid rgba(201,168,76,0.2)", color: WHITE, padding: "13px 16px", fontSize: 14, outline: "none", fontFamily: FONT_BODY, boxSizing: "border-box" as const, transition: "border-color 0.2s, box-shadow 0.2s", borderRadius: R_MD };

  if (success) return (
    <div style={{ textAlign: "center", padding: "56px 32px", background: BLACK_CARD, border: `1px solid ${GOLD}`, borderRadius: R_LG }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: `2px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#C9A84C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h3 style={{ fontSize: 24, fontWeight: 600, color: GOLD, marginBottom: 12, fontFamily: FONT_HEADING }}>Đặt hàng thành công!</h3>
      <p style={{ color: GRAY_LIGHT, fontSize: 15, lineHeight: 1.75, fontFamily: FONT_BODY }}>Cảm ơn bạn đã tin tưởng SmartFurni.<br />Đội ngũ tư vấn sẽ liên hệ qua <strong style={{ color: GOLD }}>Zalo / điện thoại</strong> trong vòng 2 giờ làm việc.</p>
    </div>
  );

  return (
    <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, padding: "clamp(24px,4vw,44px)", borderRadius: R_LG }}>
      {prefilledConfig && (
        <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: R_MD }}>
          <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", fontFamily: FONT_BODY, marginBottom: 4 }}>✓ CẤU HÌNH ĐÃ CHỌN:</div>
          <div style={{ color: GRAY_LIGHT, fontSize: 12, fontFamily: FONT_BODY }}>{prefilledConfig}</div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 16 }}>
        {[{ k: "name", label: "Họ và tên *", ph: "Nguyễn Văn A" }, { k: "phone", label: "Số điện thoại (Zalo) *", ph: "0912 345 678" }].map(f => (
          <div key={f.k}>
            <label style={{ display: "block", color: GRAY_LIGHT, fontSize: 11, fontWeight: 600, marginBottom: 7, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>{f.label}</label>
            <input type="text" placeholder={f.ph} value={form[f.k as keyof typeof form]} onChange={setF(f.k)} style={inp}
              onFocus={e => { e.target.style.borderColor = GOLD; e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)"; }}
              onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.2)"; e.target.style.boxShadow = "none"; }} />
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", color: GRAY_LIGHT, fontSize: 11, fontWeight: 600, marginBottom: 7, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>Địa chỉ giao hàng</label>
        <input type="text" placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố" value={form.address} onChange={setF("address")} style={inp}
          onFocus={e => { e.target.style.borderColor = GOLD; e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.2)"; e.target.style.boxShadow = "none"; }} />
      </div>
      <div style={{ marginBottom: 26 }}>
        <label style={{ display: "block", color: GRAY_LIGHT, fontSize: 11, fontWeight: 600, marginBottom: 7, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY }}>Yêu cầu thêm (tuỳ chọn)</label>
        <textarea placeholder="Màu sắc, chất liệu đặc biệt, thời gian giao hàng…" rows={3} value={form.note} onChange={setF("note")} style={{ ...inp, resize: "vertical" }}
          onFocus={e => { e.target.style.borderColor = GOLD; e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(201,168,76,0.2)"; e.target.style.boxShadow = "none"; }} />
      </div>
      {error && <div style={{ color: "#FF6B6B", fontSize: 13, marginBottom: 16, padding: "12px 16px", background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", borderRadius: R_SM, fontFamily: FONT_BODY }}>{error}</div>}
      <button type="submit" onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: "17px", background: loading ? "#333" : `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 50%, #9A7A2E 100%)`, color: BLACK, border: "none", fontWeight: 700, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const, boxShadow: loading ? "none" : "0 8px 28px rgba(201,168,76,0.3)", borderRadius: R_MD, fontFamily: FONT_BODY, transition: "all 0.25s ease" }}>
        {loading ? "Đang gửi…" : (submitLabel || "Tư Vấn & Đặt Hàng Ngay →")}
      </button>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#687076" strokeWidth="1.5" strokeLinejoin="round"/></svg>
        <p style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY, margin: 0 }}>Thông tin được bảo mật tuyệt đối. Không spam.</p>
      </div>
    </div>
  );
}


// ─── Quiz Funnel Modal ────────────────────────────────────────────────────────
const QUIZ_STEPS: QuizStep[] = ["product", "size", "hoc", "tayVin", "matTrang", "doDay", "aoNem", "summary"];
const STEP_LABELS: Record<QuizStep, string> = {
  product: "Chọn mẫu", size: "Kích thước", hoc: "Hộc đồ", tayVin: "Tay vịn",
  matTrang: "Mặt trang trí", doDay: "Độ dày nệm", aoNem: "Áo nệm", summary: "Xác nhận",
};

function QuizOption({ icon, label, desc, price, selected, badge, onClick }: {
  icon: string; label: string; desc: string; price: number; selected: boolean; badge?: string; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{ background: selected ? "rgba(201,168,76,0.12)" : "rgba(245,237,214,0.03)", border: `1.5px solid ${selected ? GOLD : "rgba(201,168,76,0.18)"}`, borderRadius: R_MD, padding: "16px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, textAlign: "left" as const, transition: "all 0.2s", width: "100%" }}>
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: R_SM, background: selected ? "rgba(201,168,76,0.15)" : "rgba(201,168,76,0.06)", border: `1px solid ${selected ? "rgba(201,168,76,0.4)" : "rgba(201,168,76,0.12)"}`, transition: "all 0.2s" }}>
        <SvgIcon name={icon} size={20} color={selected ? GOLD : "rgba(201,168,76,0.6)"} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ color: WHITE, fontSize: 14, fontWeight: 600, fontFamily: FONT_BODY }}>{label}</span>
          {badge && <span style={{ background: selected ? GOLD : "rgba(201,168,76,0.15)", color: selected ? BLACK : GOLD, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 100, fontFamily: FONT_BODY }}>{badge}</span>}
        </div>
        <div style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY }}>{desc}</div>
      </div>
      <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
        {price > 0 ? <div style={{ color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY }}>+{fmt(price)}</div> : <div style={{ color: "#4ADE80", fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY }}>Miễn phí</div>}
      </div>
      {selected && <div style={{ width: 22, height: 22, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ color: BLACK, fontSize: 12, fontWeight: 700 }}>✓</span></div>}
    </button>
  );
}

function QuizFunnelModal({ products, initialProductId, onClose, onComplete }: {
  products: CrmProduct[];
  initialProductId?: string | null;
  onClose: () => void;
  onComplete: (cfg: ConfigState, product: CrmProduct, total: number) => void;
}) {
  const [step, setStep] = useState<QuizStep>(initialProductId ? "size" : "product");
  const [cfg, setCfg] = useState<ConfigState>({ productId: initialProductId || null, size: null, hoc: null, tayVin: null, matTrang: null, doDay: null, aoNem: null });
  const [imgIdx, setImgIdx] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const selectedProduct = products.find(p => p.id === cfg.productId) || null;
  const images = selectedProduct ? getProductImages(selectedProduct) : [];
  const total = calcTotal(selectedProduct, cfg);

  const stepIdx = QUIZ_STEPS.indexOf(step);
  const progress = ((stepIdx + 1) / QUIZ_STEPS.length) * 100;

  function goNext(nextStep?: QuizStep) {
    setIsAnimating(true);
    setTimeout(() => {
      if (nextStep) setStep(nextStep);
      else {
        const next = QUIZ_STEPS[stepIdx + 1];
        if (next) setStep(next);
      }
      setIsAnimating(false);
    }, 150);
  }

  function goPrev() {
    setIsAnimating(true);
    setTimeout(() => {
      const prev = QUIZ_STEPS[stepIdx - 1];
      if (prev) setStep(prev);
      setIsAnimating(false);
    }, 150);
  }

  function selectAndAdvance<K extends keyof ConfigState>(key: K, val: ConfigState[K]) {
    setCfg(c => ({ ...c, [key]: val }));
    setTimeout(() => goNext(), 200);
  }

  function renderStep() {
    if (step === "product") {
      return (
        <div>
          <h3 style={{ color: GOLD, fontSize: 17, fontWeight: 700, marginBottom: 6, fontFamily: FONT_BODY }}>Chọn mẫu sofa giường</h3>
          <p style={{ color: GRAY, fontSize: 13, marginBottom: 20, fontFamily: FONT_BODY }}>Mỗi mẫu đều có thể tuỳ chỉnh hoàn toàn theo sở thích</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {products.map(p => {
              const minPrice = p.sizePricings?.length ? Math.min(...p.sizePricings.map(s => s.price)) : p.basePrice;
              const isSelected = cfg.productId === p.id;
              return (
                <button key={p.id} onClick={() => { setCfg(c => ({ ...c, productId: p.id })); setImgIdx(0); setTimeout(() => goNext(), 200); }}
                  style={{ background: isSelected ? "rgba(201,168,76,0.12)" : "rgba(245,237,214,0.03)", border: `1.5px solid ${isSelected ? GOLD : "rgba(201,168,76,0.18)"}`, borderRadius: R_MD, overflow: "hidden", cursor: "pointer", textAlign: "left" as const, transition: "all 0.2s", padding: 0 }}>
                  <div style={{ position: "relative", paddingTop: "65%", overflow: "hidden" }}>
                    {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                    <div style={{ position: "absolute", top: 8, left: 8, background: GOLD, color: BLACK, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, fontFamily: FONT_BODY }}>{p.sku}</div>
                    {isSelected && <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: BLACK, fontSize: 12, fontWeight: 700 }}>✓</span></div>}
                  </div>
                  <div style={{ padding: "12px" }}>
                    <div style={{ color: WHITE, fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY, marginBottom: 4, lineHeight: 1.4 }}>{p.name.replace(/^Chia sẻ\s+/, "").substring(0, 50)}</div>
                    <div style={{ color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY }}>Từ {fmt(minPrice || 0)}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (step === "size" && selectedProduct) {
      const sizes = selectedProduct.sizePricings?.length ? selectedProduct.sizePricings : [
        { size: "0,9M", price: (selectedProduct.basePrice || 0) },
        { size: "1,2M", price: (selectedProduct.basePrice || 0) + 500000 },
        { size: "1,5M", price: (selectedProduct.basePrice || 0) + 1000000 },
        { size: "1,8M", price: (selectedProduct.basePrice || 0) + 1500000 },
      ];
      return (
        <div>
          <h3 style={{ color: GOLD, fontSize: 17, fontWeight: 700, marginBottom: 6, fontFamily: FONT_BODY }}>Chọn kích thước khung</h3>
          <p style={{ color: GRAY, fontSize: 13, marginBottom: 20, fontFamily: FONT_BODY }}>Kích thước khung sofa giường (chiều rộng)</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sizes.map(s => (
              <QuizOption key={s.size} icon="ruler" label={s.size} desc={s.size === "0,9M" ? "Phù hợp phòng nhỏ, 1 người" : s.size === "1,2M" ? "Tiêu chuẩn, 1–2 người" : s.size === "1,5M" ? "Rộng rãi, 2 người thoải mái" : "Cỡ lớn, không gian sang trọng"} price={s.price} selected={cfg.size === s.size} onClick={() => selectAndAdvance("size", s.size)} />
            ))}
          </div>
        </div>
      );
    }

    if (step === "hoc") {
      return (
        <div>
          <h3 style={{ color: GOLD, fontSize: 17, fontWeight: 700, marginBottom: 6, fontFamily: FONT_BODY }}>Hộc để đồ</h3>
          <p style={{ color: GRAY, fontSize: 13, marginBottom: 20, fontFamily: FONT_BODY }}>Tối ưu không gian lưu trữ trong phòng ngủ</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <QuizOption icon="box" label="Có hộc để đồ" desc="Ngăn chứa lớn bên dưới, cơ cấu gas-lift êm ái, chứa chăn gối gọn gàng" price={700000} badge="Phổ biến nhất" selected={cfg.hoc === "co_hoc"} onClick={() => selectAndAdvance("hoc", "co_hoc")} />
            <QuizOption icon="minus_circle" label="Không hộc" desc="Thiết kế gọn nhẹ hơn, phù hợp phòng đã có tủ lưu trữ" price={0} selected={cfg.hoc === "khong_hoc"} onClick={() => selectAndAdvance("hoc", "khong_hoc")} />
          </div>
        </div>
      );
    }

    if (step === "tayVin") {
      return (
        <div>
          <h3 style={{ color: GOLD, fontSize: 17, fontWeight: 700, marginBottom: 6, fontFamily: FONT_BODY }}>Tay vịn</h3>
          <p style={{ color: GRAY, fontSize: 13, marginBottom: 20, fontFamily: FONT_BODY }}>Tay vịn tăng tính thẩm mỹ và tiện nghi khi ngồi</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <QuizOption icon="sofa" label="Có tay vịn" desc="Thiết kế sang trọng, bọc vải/da theo chất liệu mặt trang trí đã chọn" price={500000} badge="Khuyên dùng" selected={cfg.tayVin === "co_tay"} onClick={() => selectAndAdvance("tayVin", "co_tay")} />
            <QuizOption icon="minus_circle" label="Không tay vịn" desc="Thiết kế tối giản, tiết kiệm không gian hai bên" price={0} selected={cfg.tayVin === "khong_tay"} onClick={() => selectAndAdvance("tayVin", "khong_tay")} />
          </div>
        </div>
      );
    }

    if (step === "matTrang") {
      return (
        <div>
          <h3 style={{ color: GOLD, fontSize: 17, fontWeight: 700, marginBottom: 6, fontFamily: FONT_BODY }}>Kiểu ốp mặt trang trí</h3>
          <p style={{ color: GRAY, fontSize: 13, marginBottom: 20, fontFamily: FONT_BODY }}>Chất liệu bọc phần đầu giường và tay vịn (nếu có)</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <QuizOption icon="layers" label="Vải canvas" desc="Thoáng mát, dễ vệ sinh, nhiều màu sắc đa dạng" price={0} selected={cfg.matTrang === "vai_canvas"} onClick={() => selectAndAdvance("matTrang", "vai_canvas")} />
            <QuizOption icon="star_circle" label="Da PU cao cấp" desc="Sang trọng, dễ lau chùi, chống thấm nước tốt" price={1200000} badge="Cao cấp" selected={cfg.matTrang === "da_pu"} onClick={() => selectAndAdvance("matTrang", "da_pu")} />
            <QuizOption icon="wood" label="Gỗ MDF chống ẩm" desc="Hiện đại, bền bỉ, dễ phối hợp nội thất" price={0} selected={cfg.matTrang === "go_mdf"} onClick={() => selectAndAdvance("matTrang", "go_mdf")} />
            <QuizOption icon="leaf" label="Gỗ tự nhiên" desc="Sang trọng tự nhiên, vân gỗ độc đáo, bền theo thời gian" price={1500000} badge="Premium" selected={cfg.matTrang === "go_tu_nhien"} onClick={() => selectAndAdvance("matTrang", "go_tu_nhien")} />
          </div>
        </div>
      );
    }

    if (step === "doDay") {
      return (
        <div>
          <h3 style={{ color: GOLD, fontSize: 17, fontWeight: 700, marginBottom: 6, fontFamily: FONT_BODY }}>Độ dày nệm</h3>
          <p style={{ color: GRAY, fontSize: 13, marginBottom: 20, fontFamily: FONT_BODY }}>Nệm mút ép đàn hồi cao, hỗ trợ cột sống tối ưu</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <QuizOption icon="layers" label="Nệm 7cm" desc="Êm ái, phù hợp người thích nệm vừa phải, tiết kiệm không gian" price={0} selected={cfg.doDay === "7cm"} onClick={() => selectAndAdvance("doDay", "7cm")} />
            <QuizOption icon="bed" label="Nệm 10cm" desc="Dày hơn, êm hơn, hỗ trợ cột sống tốt hơn — lý tưởng cho người đau lưng" price={800000} badge="Bán chạy" selected={cfg.doDay === "10cm"} onClick={() => selectAndAdvance("doDay", "10cm")} />
          </div>
        </div>
      );
    }

    if (step === "aoNem") {
      return (
        <div>
          <h3 style={{ color: GOLD, fontSize: 17, fontWeight: 700, marginBottom: 6, fontFamily: FONT_BODY }}>Áo nệm</h3>
          <p style={{ color: GRAY, fontSize: 13, marginBottom: 20, fontFamily: FONT_BODY }}>Lớp bọc ngoài nệm, có thể tháo ra giặt dễ dàng</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <QuizOption icon="leaf" label="Áo nệm vải lanh" desc="Thoáng mát, thấm hút tốt, phù hợp khí hậu nhiệt đới Việt Nam" price={0} selected={cfg.aoNem === "vai_lanh"} onClick={() => selectAndAdvance("aoNem", "vai_lanh")} />
            <QuizOption icon="star_circle" label="Áo nệm da PU" desc="Chống thấm, dễ lau chùi, sang trọng — phù hợp gia đình có trẻ nhỏ" price={600000} badge="Tiện lợi" selected={cfg.aoNem === "da_pu_nem"} onClick={() => selectAndAdvance("aoNem", "da_pu_nem")} />
          </div>
        </div>
      );
    }

    if (step === "summary" && selectedProduct) {
      const summaryItems = [
        { label: "Mẫu sản phẩm", value: `${selectedProduct.sku} — ${selectedProduct.name.replace(/^Chia sẻ\s+/, "").substring(0, 40)}` },
        { label: "Kích thước", value: cfg.size || "—" },
        { label: "Hộc để đồ", value: cfg.hoc ? ADDON_LABELS[cfg.hoc] : "—" },
        { label: "Tay vịn", value: cfg.tayVin ? ADDON_LABELS[cfg.tayVin] : "—" },
        { label: "Mặt trang trí", value: cfg.matTrang ? ADDON_LABELS[cfg.matTrang] : "—" },
        { label: "Độ dày nệm", value: cfg.doDay ? ADDON_LABELS[cfg.doDay] : "—" },
        { label: "Áo nệm", value: cfg.aoNem ? ADDON_LABELS[cfg.aoNem] : "—" },
      ];
      return (
        <div>
          <h3 style={{ color: GOLD, fontSize: 17, fontWeight: 700, marginBottom: 6, fontFamily: FONT_BODY }}>Cấu hình của bạn</h3>
          <p style={{ color: GRAY, fontSize: 13, marginBottom: 20, fontFamily: FONT_BODY }}>Xem lại và xác nhận để nhận tư vấn chính xác nhất</p>
          <div style={{ background: "rgba(245,237,214,0.03)", border: `1px solid ${BLACK_BORDER}`, borderRadius: R_MD, overflow: "hidden", marginBottom: 20 }}>
            {summaryItems.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: i < summaryItems.length - 1 ? `1px solid ${BLACK_BORDER}` : "none", gap: 12 }}>
                <span style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY }}>{item.label}</span>
                <span style={{ color: WHITE, fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY, textAlign: "right" as const }}>{item.value}</span>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: R_MD, padding: "16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: GRAY, fontSize: 11, fontFamily: FONT_BODY, marginBottom: 4 }}>Tổng giá tham khảo</div>
              <div style={{ color: GOLD, fontSize: 26, fontWeight: 800, fontFamily: FONT_HEADING }}>{fmt(total)}</div>
              <div style={{ color: GRAY, fontSize: 11, fontFamily: FONT_BODY, marginTop: 4 }}>Miễn phí giao hàng + lắp đặt toàn quốc</div>
            </div>
          </div>
          <GoldButton onClick={() => onComplete(cfg, selectedProduct, total)} style={{ width: "100%", borderRadius: R_MD, fontSize: 14, padding: "16px" }}>
            Xác Nhận & Đặt Hàng →
          </GoldButton>
          <div style={{ textAlign: "center", marginTop: 12, color: GRAY, fontSize: 12, fontFamily: FONT_BODY }}>Nhân viên sẽ liên hệ xác nhận trong vòng 30 phút</div>
        </div>
      );
    }
    return null;
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: BLACK_SOFT, border: `1px solid ${BLACK_BORDER}`, borderRadius: 20, width: "100%", maxWidth: 860, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${BLACK_BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", fontFamily: FONT_BODY, marginBottom: 4 }}>
              THIẾT KẾ CÁ NHÂN HOÁ — BƯỚC {stepIdx + 1}/{QUIZ_STEPS.length}
            </div>
            <div style={{ color: WHITE, fontSize: 17, fontWeight: 700, fontFamily: FONT_HEADING }}>{STEP_LABELS[step]}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${BLACK_BORDER}`, color: GRAY, borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        {/* Progress bar */}
        <div style={{ height: 3, background: BLACK_CARD, flexShrink: 0 }}>
          <div style={{ height: "100%", background: `linear-gradient(90deg, ${GOLD}, ${GOLD_LIGHT})`, width: `${progress}%`, transition: "width 0.4s ease" }} />
        </div>
        {/* Step pills */}
        <div style={{ display: "flex", gap: 6, padding: "10px 24px", overflowX: "auto", flexShrink: 0, borderBottom: `1px solid ${BLACK_BORDER}` }}>
          {QUIZ_STEPS.filter(s => s !== "summary").map((s, i) => {
            const done = i < stepIdx;
            const active = s === step;
            return (
              <div key={s} style={{ padding: "4px 12px", borderRadius: 100, fontSize: 10, fontWeight: 600, fontFamily: FONT_BODY, whiteSpace: "nowrap" as const, background: active ? GOLD : done ? "rgba(201,168,76,0.15)" : "transparent", color: active ? BLACK : done ? GOLD : GRAY, border: `1px solid ${active ? GOLD : done ? "rgba(201,168,76,0.4)" : BLACK_BORDER}`, transition: "all 0.2s" }}>
                {done ? "✓ " : ""}{STEP_LABELS[s]}
              </div>
            );
          })}
        </div>
        {/* Main content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
          {/* Left: Product image + price */}
          {selectedProduct && images.length > 0 && (
            <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${BLACK_BORDER}`, display: "flex", flexDirection: "column", background: BLACK_CARD }}>
              <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                <img src={images[imgIdx % images.length]} alt={selectedProduct.name} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.3s" }} />
                {images.length > 1 && (
                  <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
                    {images.map((_, i) => (
                      <button key={i} onClick={() => setImgIdx(i)} style={{ width: i === imgIdx % images.length ? 18 : 7, height: 7, borderRadius: 4, background: i === imgIdx % images.length ? GOLD : "rgba(255,255,255,0.4)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.2s" }} />
                    ))}
                  </div>
                )}
              </div>
              <div style={{ padding: "14px", borderTop: `1px solid ${BLACK_BORDER}` }}>
                <div style={{ color: GRAY, fontSize: 10, fontFamily: FONT_BODY, marginBottom: 4 }}>Giá tham khảo</div>
                <div style={{ color: GOLD, fontSize: 20, fontWeight: 800, fontFamily: FONT_HEADING }}>{total > 0 ? fmt(total) : "—"}</div>
                <div style={{ color: GRAY, fontSize: 10, fontFamily: FONT_BODY, marginTop: 4 }}>Miễn phí giao + lắp đặt</div>
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 3 }}>
                  {cfg.size && <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 4, height: 4, borderRadius: "50%", background: GOLD, flexShrink: 0 }} /><span style={{ color: GRAY, fontSize: 10, fontFamily: FONT_BODY }}>{cfg.size}</span></div>}
                  {cfg.hoc && <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 4, height: 4, borderRadius: "50%", background: GOLD, flexShrink: 0 }} /><span style={{ color: GRAY, fontSize: 10, fontFamily: FONT_BODY }}>{ADDON_LABELS[cfg.hoc]}</span></div>}
                  {cfg.tayVin && <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 4, height: 4, borderRadius: "50%", background: GOLD, flexShrink: 0 }} /><span style={{ color: GRAY, fontSize: 10, fontFamily: FONT_BODY }}>{ADDON_LABELS[cfg.tayVin]}</span></div>}
                  {cfg.matTrang && <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 4, height: 4, borderRadius: "50%", background: GOLD, flexShrink: 0 }} /><span style={{ color: GRAY, fontSize: 10, fontFamily: FONT_BODY }}>{ADDON_LABELS[cfg.matTrang]}</span></div>}
                  {cfg.doDay && <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 4, height: 4, borderRadius: "50%", background: GOLD, flexShrink: 0 }} /><span style={{ color: GRAY, fontSize: 10, fontFamily: FONT_BODY }}>{ADDON_LABELS[cfg.doDay]}</span></div>}
                  {cfg.aoNem && <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 4, height: 4, borderRadius: "50%", background: GOLD, flexShrink: 0 }} /><span style={{ color: GRAY, fontSize: 10, fontFamily: FONT_BODY }}>{ADDON_LABELS[cfg.aoNem]}</span></div>}
                </div>
              </div>
            </div>
          )}
          {/* Right: Step content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px", opacity: isAnimating ? 0 : 1, transform: isAnimating ? "translateX(12px)" : "translateX(0)", transition: "opacity 0.15s, transform 0.15s" }}>
            {renderStep()}
          </div>
        </div>
        {/* Footer nav */}
        {step !== "product" && step !== "summary" && (
          <div style={{ padding: "14px 24px", borderTop: `1px solid ${BLACK_BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <button onClick={goPrev} style={{ background: "transparent", border: `1px solid ${BLACK_BORDER}`, color: GRAY, borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13 }}>← Quay lại</button>
            <div style={{ color: GRAY, fontSize: 11, fontFamily: FONT_BODY }}>Chọn một tuỳ chọn để tiếp tục</div>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── Main Component ───────────────────────────────────────────────────────────
export default function LpSofaGiuongClient({ isEditor = false, initialContent = {}, sofaProducts = [] }: Props) {
  const [content, setContent] = useState<Record<string, string>>(initialContent);
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizProductId, setQuizProductId] = useState<string | null>(null);
  const [orderConfig, setOrderConfig] = useState<string | null>(null);
  const [heroImgIdx, setHeroImgIdx] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  const handleSaved = useCallback((bk: string, val: string) => {
    setContent(c => ({ ...c, [bk]: val }));
  }, []);

  // Shorthand để render InlineEdit với props chung
  const E = useCallback((p: { bk: string; def: string; as?: keyof JSX.IntrinsicElements; style?: React.CSSProperties; multiline?: boolean }) => (
    <InlineEdit
      bk={p.bk} def={p.def} as={p.as} style={p.style} multiline={p.multiline}
      editMode={editMode} slug={LP_SLUG}
      savedValue={content[p.bk]}
      onSaved={handleSaved}
    />
  ), [editMode, content, handleSaved]);

  useEffect(() => {
    setScrollY(window.scrollY);
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const NAV_ITEMS = [
    { label: "Mẫu sản phẩm", id: "product-gallery" },
    { label: "Cách thiết kế", id: "how-it-works" },
    { label: "Điểm mạnh", id: "features" },
    { label: "Đánh giá", id: "testimonials" },
    { label: "Đặt hàng", id: "order-form" },
  ];

  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Hero image rotation — ưu tiên ảnh custom đã lưu, fallback sang ảnh CRM
  const defaultHeroImages = sofaProducts.slice(0, 4).map(p => p.imageUrl).filter(Boolean) as string[];
  const heroImages = [
    content["hero_bg_0"] || defaultHeroImages[0],
    content["hero_bg_1"] || defaultHeroImages[1],
    content["hero_bg_2"] || defaultHeroImages[2],
    content["hero_bg_3"] || defaultHeroImages[3],
  ].filter(Boolean) as string[];
  const heroOverlayOpacity = content["hero_overlay"] ? parseFloat(content["hero_overlay"]) : 0.65;
  useEffect(() => {
    if (heroImages.length <= 1) return;
    const id = setInterval(() => setHeroImgIdx(i => (i + 1) % heroImages.length), 4000);
    return () => clearInterval(id);
  }, [heroImages.length]);

  function openQuiz(productId?: string) {
    setQuizProductId(productId || null);
    setQuizOpen(true);
  }

  function handleQuizComplete(cfg: ConfigState, product: CrmProduct, total: number) {
    const parts = [
      `Mẫu: ${product.sku}`,
      cfg.size ? `Kích thước: ${cfg.size}` : null,
      cfg.hoc ? ADDON_LABELS[cfg.hoc] : null,
      cfg.tayVin ? ADDON_LABELS[cfg.tayVin] : null,
      cfg.matTrang ? ADDON_LABELS[cfg.matTrang] : null,
      cfg.doDay ? ADDON_LABELS[cfg.doDay] : null,
      cfg.aoNem ? ADDON_LABELS[cfg.aoNem] : null,
      `Tổng: ${fmt(total)}`,
    ].filter(Boolean);
    setOrderConfig(parts.join(" | "));
    setQuizOpen(false);
    setTimeout(() => scrollToForm(), 300);
  }

  const SECTION_PAD = "clamp(60px,8vw,100px) clamp(20px,5vw,80px)";

  const editedCount = Object.keys(content).filter(k => !k.startsWith("hero_")).length;

  return (
    <div style={{ background: BLACK, color: WHITE, fontFamily: FONT_BODY, overflowX: "hidden" }}>
      {/* ── EDIT BAR (admin only) ── */}
      <LpEditBar isEditor={isEditor} editMode={editMode} onToggleEditMode={() => setEditMode(m => !m)} editedCount={editedCount} />
      {/* ── STICKY NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrollY > 60 ? "rgba(13,11,0,0.96)" : "transparent",
        borderBottom: scrollY > 60 ? `1px solid ${BLACK_BORDER}` : "none",
        backdropFilter: scrollY > 60 ? "blur(16px)" : "none",
        WebkitBackdropFilter: scrollY > 60 ? "blur(16px)" : "none",
        transition: "background 0.3s ease, border-color 0.3s ease",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "0 24px",
          height: 68,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        }}>
          {/* Logo */}
          <a href="/lp/sofa-giuong" style={{ flexShrink: 0, textDecoration: "none" }}>
            <img
              src="/smartfurni-logo-transparent.png"
              alt="SmartFurni"
              style={{ height: 44, objectFit: "contain", filter: "brightness(1.05)" }}
            />
          </a>

          {/* Main menu — ẩn trên mobile */}
          <div className="lp-nav-menu" style={{ display: "flex", alignItems: "center", gap: 2, flex: 1, justifyContent: "center" }}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(212,196,160,0.7)", fontSize: 13, fontWeight: 500,
                  fontFamily: FONT_BODY, padding: "8px 14px", borderRadius: R_SM,
                  letterSpacing: "0.01em", transition: "color 0.2s, background 0.2s",
                  whiteSpace: "nowrap" as const,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = GOLD;
                  (e.currentTarget as HTMLButtonElement).style.background = "rgba(201,168,76,0.08)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(212,196,160,0.7)";
                  (e.currentTarget as HTMLButtonElement).style.background = "none";
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
          {/* CTA */}
          <button onClick={() => openQuiz()} className="lp-nav-cta" style={{
            flexShrink: 0,
            background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
            color: BLACK, border: "none", padding: "9px 20px",
            fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", cursor: "pointer",
            textTransform: "uppercase" as const, borderRadius: R_MD, fontFamily: FONT_BODY,
            transition: "opacity 0.2s, transform 0.15s",
            whiteSpace: "nowrap" as const,
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}>
            THIẾT KẾ NGAY
          </button>
          {/* Hamburger */}
          <button
            className="lp-nav-hamburger"
            onClick={() => setMobileMenuOpen(v => !v)}
            style={{
              background: "none", border: `1px solid rgba(201,168,76,0.35)`,
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

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div style={{
          position: "fixed", top: 68, left: 0, right: 0, zIndex: 99,
          background: "rgba(13,11,0,0.98)", backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${BLACK_BORDER}`,
          padding: "16px 24px 24px",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => { scrollTo(item.id); setMobileMenuOpen(false); }}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: GRAY_LIGHT, fontSize: 15, fontWeight: 500,
                  fontFamily: FONT_BODY, padding: "14px 16px",
                  textAlign: "left" as const, borderRadius: R_SM,
                  letterSpacing: "0.02em",
                }}
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={() => { openQuiz(); setMobileMenuOpen(false); }}
              style={{
                background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 100%)`,
                color: BLACK, border: "none", padding: "14px 20px",
                fontWeight: 700, fontSize: 13, cursor: "pointer",
                textTransform: "uppercase" as const, borderRadius: R_MD,
                fontFamily: FONT_BODY, marginTop: 8, letterSpacing: "0.08em",
              }}
            >
              Thiết Kế Ngay →
            </button>
          </div>
        </div>
      )}

      {/* ── HERO ── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", paddingTop: 64, overflow: "hidden" }}>
        {/* Background image */}
        {heroImages.length > 0 && (
          <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
            {heroImages.map((img, i) => (
              <div key={i} style={{ position: "absolute", inset: 0, backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center", opacity: i === heroImgIdx ? 1 : 0, transition: "opacity 1.2s ease" }} />
            ))}
            <div style={{ position: "absolute", inset: 0, background: `rgba(10,10,8,${heroOverlayOpacity})`, transition: "background 0.3s" }} />
          </div>
        )}
        {!heroImages.length && (
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0A0A08 0%, #1A1200 100%)" }} />
        )}
        {/* Edit hero images button — chỉ hiện khi isEditor */}
        <EditableHeroImage
          slug={LP_SLUG}
          imageKeys={["hero_bg_0", "hero_bg_1", "hero_bg_2", "hero_bg_3"]}
          overlayKey="hero_overlay"
          imageUrls={[
            content["hero_bg_0"] || defaultHeroImages[0] || "",
            content["hero_bg_1"] || defaultHeroImages[1] || "",
            content["hero_bg_2"] || defaultHeroImages[2] || "",
            content["hero_bg_3"] || defaultHeroImages[3] || "",
          ]}
          overlayOpacity={heroOverlayOpacity}
          editMode={isEditor}
          onImageSaved={(key, url) => setContent(c => ({ ...c, [key]: url }))}
          onOverlaySaved={(key, opacity) => setContent(c => ({ ...c, [key]: String(opacity) }))}
        />

        {/* Dot navigation */}
        {heroImages.length > 1 && (
          <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8, zIndex: 10 }}>
            {heroImages.map((_, i) => (
              <button key={i} onClick={() => setHeroImgIdx(i)} style={{ width: i === heroImgIdx ? 24 : 8, height: 8, borderRadius: 4, background: i === heroImgIdx ? GOLD : "rgba(255,255,255,0.3)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.3s" }} />
            ))}
          </div>
        )}

        <div style={{ position: "relative", zIndex: 5, maxWidth: 1200, margin: "0 auto", padding: "clamp(60px,8vw,100px) clamp(20px,5vw,80px)", width: "100%" }}>
          <FadeIn>
            <SectionLabel>Sofa Giường Cá Nhân Hoá</SectionLabel>
            <h1 style={{ fontSize: "clamp(32px,5.5vw,68px)", fontWeight: 800, lineHeight: 1.1, marginBottom: 20, fontFamily: FONT_HEADING, letterSpacing: "-0.02em", maxWidth: 700 }}>
              {E({ bk: "hero_title_1", def: "Thiết Kế Sofa Giường", as: "span" })}{" "}
              <span style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {E({ bk: "hero_title_2", def: "Theo Sở Thích Riêng", as: "span" })}
              </span>
            </h1>
            <p style={{ fontSize: "clamp(15px,1.8vw,18px)", color: GRAY_LIGHT, lineHeight: 1.75, marginBottom: 36, maxWidth: 560, fontFamily: FONT_BODY }}>
              {E({ bk: "hero_desc", def: "Chọn mẫu, kích thước, chất liệu, màu sắc — mọi chi tiết đều do bạn quyết định. Nhận báo giá tức thì và giao hàng tận nơi.", as: "span" })}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 48 }}>
              <GoldButton onClick={() => openQuiz()} style={{ fontSize: 14, padding: "16px 36px" }}>
                Bắt Đầu Thiết Kế →
              </GoldButton>
              <button onClick={scrollToForm} style={{ background: "transparent", color: WHITE, border: "1px solid rgba(245,237,214,0.3)", borderRadius: R_MD, padding: "16px 32px", fontSize: 13, cursor: "pointer", fontFamily: FONT_BODY, transition: "all 0.25s" }}>
                Xem Bảng Giá
              </button>
            </div>
            {/* Trust badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
              {[
                { icon: "palette", text: "7 bước tuỳ chỉnh" },
                { icon: "price_tag", text: "Giá nhảy realtime" },
                { icon: "truck", text: "Miễn phí giao + lắp" },
                { icon: "shield", text: "Bảo hành 3 năm" },
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SvgIcon name={b.icon} size={18} color={GOLD} />
                  <span style={{ color: GRAY_LIGHT, fontSize: 13, fontFamily: FONT_BODY }}>{b.text}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PROBLEM / PAIN POINTS ── */}
      <section style={{ padding: SECTION_PAD, background: BLACK_SOFT }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <SectionLabel>Vấn Đề Thường Gặp</SectionLabel>
            <h2 style={{ fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING, lineHeight: 1.25 }}>
              {E({ bk: "problem_title", def: "Mua Sofa Giường Xong Lại Hối Hận?", as: "span" })}
            </h2>
            <GoldDivider />
            <p style={{ color: GRAY_LIGHT, fontSize: 15, lineHeight: 1.8, maxWidth: 640, margin: "0 auto 48px", fontFamily: FONT_BODY }}>
              {E({ bk: "problem_desc", def: "Hầu hết người mua sofa giường đều gặp phải những vấn đề này — và SmartFurni được tạo ra để giải quyết triệt để.", as: "span" })}
            </p>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              { icon: "ruler_cross", title: "Kích thước không vừa", desc: "Mua về mới phát hiện không khớp phòng ngủ, quá to hoặc quá nhỏ" },
              { icon: "eye_off", title: "Chất liệu không ưng", desc: "Màu sắc, chất liệu bọc không đúng như hình — khác xa thực tế" },
              { icon: "question_circle", title: "Giá không minh bạch", desc: "Không biết từng tuỳ chọn giá bao nhiêu, dễ bị thổi giá" },
              { icon: "wrench", title: "Lắp đặt phức tạp", desc: "Hướng dẫn không rõ ràng, tự lắp mất cả ngày, dễ hỏng" },
            ].map((p, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "28px 24px", textAlign: "left" }}>
                  <div style={{ marginBottom: 14 }}><SvgIcon name={p.icon} size={32} color="rgba(201,168,76,0.7)" /></div>
                  <h3 style={{ color: WHITE, fontSize: 15, fontWeight: 600, marginBottom: 8, fontFamily: FONT_HEADING }}>{p.title}</h3>
                  <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.7, fontFamily: FONT_BODY, margin: 0 }}>{p.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCT GALLERY ── */}
      <section style={{ padding: SECTION_PAD, background: BLACK }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>Bộ Sưu Tập</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING, lineHeight: 1.25 }}>
                {E({ bk: "gallery_title", def: "Chọn Mẫu Yêu Thích", as: "span" })}
              </h2>
              <GoldDivider />
              <p style={{ color: GRAY_LIGHT, fontSize: 15, lineHeight: 1.8, maxWidth: 560, margin: "0 auto", fontFamily: FONT_BODY }}>
                {E({ bk: "gallery_desc", def: "Mỗi mẫu đều có thể tuỳ chỉnh hoàn toàn — kích thước, chất liệu, màu sắc theo ý bạn", as: "span" })}
              </p>
            </div>
          </FadeIn>
          {sofaProducts.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
              {sofaProducts.map((p, i) => {
                const minPrice = p.sizePricings?.length ? Math.min(...p.sizePricings.map(s => s.price)) : p.basePrice;
                const priceCount = p.sizePricings?.length || 1;
                const badges = ["Bán chạy nhất ★", "Double cao cấp", "Sản phẩm", "Premium", "Mới", "Hot"];
                const badge = badges[i % badges.length];
                const badgeColor = i === 1 ? GOLD : "rgba(201,168,76,0.18)";
                const badgeTextColor = i === 1 ? BLACK : GOLD;
                return (
                  <FadeIn key={p.id} delay={i * 60}>
                    <div
                      style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, overflow: "hidden", cursor: "pointer", transition: "border-color 0.25s, transform 0.25s", position: "relative", display: "flex", flexDirection: "column" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(201,168,76,0.45)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = BLACK_BORDER; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
                      onClick={() => openQuiz(p.id)}
                    >
                      {/* Badge góc trên phải */}
                      <div style={{ position: "absolute", top: 14, right: 14, zIndex: 2, background: badgeColor, color: badgeTextColor, fontSize: 10, fontWeight: 700, padding: "4px 12px", borderRadius: 100, fontFamily: FONT_BODY, border: i === 1 ? "none" : "1px solid rgba(201,168,76,0.35)", backdropFilter: "blur(4px)" }}>{badge}</div>
                      {/* Ảnh tỉ lệ 1:1 */}
                      <div style={{ position: "relative", paddingTop: "100%", overflow: "hidden", background: "#0D0800", flexShrink: 0 }}>
                        {p.imageUrl
                          ? <img src={p.imageUrl} alt={p.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s" }}
                              onMouseEnter={e => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1.05)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLImageElement).style.transform = "scale(1)"; }}
                            />
                          : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><SvgIcon name="sofa" size={48} color={GRAY} /></div>
                        }
                        {/* Hover overlay */}
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)", opacity: 0, transition: "opacity 0.25s", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 20 }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = "0"; }}
                        >
                          <div style={{ background: GOLD, color: BLACK, padding: "10px 28px", borderRadius: 100, fontSize: 12, fontWeight: 700, fontFamily: FONT_BODY }}>Thiết Kế Ngay →</div>
                        </div>
                      </div>
                      {/* Info */}
                      <div style={{ padding: "20px 20px 22px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", fontFamily: FONT_BODY, opacity: 0.8 }}>{p.sku}</div>
                        <h3 style={{ color: WHITE, fontSize: 15, fontWeight: 600, fontFamily: FONT_HEADING, lineHeight: 1.4, margin: 0 }}>{p.name.replace(/^Chia sẻ\s+/, "")}</h3>
                        {p.description && <p style={{ color: GRAY, fontSize: 12, lineHeight: 1.6, fontFamily: FONT_BODY, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{p.description}</p>}
                        <div style={{ marginTop: "auto", paddingTop: 12, borderTop: `1px solid ${BLACK_BORDER}`, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ color: GRAY, fontSize: 10, fontFamily: FONT_BODY, marginBottom: 2 }}>Giá bán lẻ từ</div>
                            <div style={{ color: GOLD, fontSize: 18, fontWeight: 700, fontFamily: FONT_HEADING, lineHeight: 1 }}>{fmt(minPrice || 0)} <span style={{ color: GRAY, fontSize: 11, fontWeight: 400 }}>/ size</span></div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ color: GRAY, fontSize: 10, fontFamily: FONT_BODY }}>{priceCount} mức giá</div>
                            <div style={{ color: GRAY, fontSize: 10, fontFamily: FONT_BODY }}>theo kích thước</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ color: GRAY, fontSize: 14, fontFamily: FONT_BODY }}>Đang tải danh sách sản phẩm…</div>
            </div>
          )}
          <FadeIn delay={200}>
            <div style={{ textAlign: "center", marginTop: 40 }}>
              <GoldButton onClick={() => openQuiz()} style={{ fontSize: 14, padding: "16px 40px" }}>
                Thiết Kế Sofa Giường Của Bạn →
              </GoldButton>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: SECTION_PAD, background: BLACK_SOFT }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <SectionLabel>Quy Trình</SectionLabel>
            <h2 style={{ fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING, lineHeight: 1.25 }}>
              {E({ bk: "how_title", def: "Thiết Kế Trong 3 Phút", as: "span" })}
            </h2>
            <GoldDivider />
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, marginTop: 16 }}>
            {[
              { step: "01", icon: "sofa", title: "Chọn mẫu", desc: "Duyệt qua bộ sưu tập và chọn mẫu sofa giường yêu thích" },
              { step: "02", icon: "sliders", title: "Tuỳ chỉnh", desc: "Chọn kích thước, hộc, tay vịn, chất liệu, nệm theo sở thích" },
              { step: "03", icon: "calculator", title: "Xem giá ngay", desc: "Giá tổng cập nhật realtime theo từng lựa chọn của bạn" },
              { step: "04", icon: "phone", title: "Nhận tư vấn", desc: "Điền thông tin, nhân viên liên hệ xác nhận trong 30 phút" },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{ textAlign: "center", padding: "28px 20px" }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <SvgIcon name={s.icon} size={24} color={GOLD} />
                  </div>
                  <div style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.15em", fontFamily: FONT_BODY, marginBottom: 8 }}>{s.step}</div>
                  <h3 style={{ color: WHITE, fontSize: 15, fontWeight: 600, marginBottom: 8, fontFamily: FONT_HEADING }}>{s.title}</h3>
                  <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.7, fontFamily: FONT_BODY, margin: 0 }}>{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={200}>
            <div style={{ marginTop: 40 }}>
              <GoldButton onClick={() => openQuiz()} style={{ fontSize: 14, padding: "16px 40px" }}>
                Bắt Đầu Thiết Kế Ngay →
              </GoldButton>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FEATURES / BENEFITS ── */}
      <section style={{ padding: SECTION_PAD, background: BLACK }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>Điểm Mạnh</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING, lineHeight: 1.25 }}>
                {E({ bk: "features_title", def: "Vì Sao Chọn SmartFurni?", as: "span" })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24 }}>
            {[
              { icon: "star_circle", title: "Cá nhân hoá 100%", desc: "7 bước tuỳ chỉnh — kích thước, hộc, tay vịn, chất liệu, nệm, áo nệm. Mỗi chiếc sofa giường là duy nhất." },
              { icon: "price_tag", title: "Giá minh bạch", desc: "Giá tổng nhảy realtime khi bạn chọn từng tuỳ chọn. Không ẩn phí, không bất ngờ khi thanh toán." },
              { icon: "factory", title: "Sản xuất tại Việt Nam", desc: "Khung thép mạ kẽm, cơ cấu gas-lift nhập khẩu, chất liệu bọc đạt chuẩn xuất khẩu." },
              { icon: "truck", title: "Miễn phí giao + lắp đặt", desc: "Giao hàng toàn quốc, đội kỹ thuật lắp đặt tận nơi. Chỉ cần mở cửa đón hàng." },
              { icon: "shield", title: "Bảo hành 3 năm", desc: "Bảo hành toàn diện khung, cơ cấu và chất liệu bọc. Đổi mới ngay nếu có lỗi nhà sản xuất." },
              { icon: "credit_card", title: "Trả góp 0% lãi suất", desc: "Hỗ trợ trả góp qua các đối tác tài chính. Sở hữu sofa giường mơ ước ngay hôm nay." },
            ].map((f, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "28px 24px", transition: "border-color 0.25s" }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(201,168,76,0.35)"}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = BLACK_BORDER}>
                  <div style={{ marginBottom: 14 }}><SvgIcon name={f.icon} size={32} color={GOLD} /></div>
                  <h3 style={{ color: WHITE, fontSize: 15, fontWeight: 600, marginBottom: 8, fontFamily: FONT_HEADING }}>{f.title}</h3>
                  <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.7, fontFamily: FONT_BODY, margin: 0 }}>{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPEC TABLE ── */}
      <section style={{ padding: SECTION_PAD, background: BLACK_SOFT }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>Thông Số Kỹ Thuật</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING, lineHeight: 1.25 }}>
                {E({ bk: "spec_title", def: "Chất Lượng Được Kiểm Chứng", as: "span" })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, overflow: "hidden" }}>
            {[
              { label: "Khung", value: "Thép mạ kẽm 1.5mm, chịu tải 300kg" },
              { label: "Cơ cấu mở gập", value: "Gas-lift nhập khẩu, 50.000 lần kiểm định" },
              { label: "Kích thước", value: "0,9M / 1,2M / 1,5M / 1,8M (theo yêu cầu)" },
              { label: "Chất liệu bọc", value: "Vải canvas / Da PU / Gỗ MDF / Gỗ tự nhiên" },
              { label: "Nệm", value: "Mút ép đàn hồi cao 7cm hoặc 10cm" },
              { label: "Áo nệm", value: "Vải lanh hoặc da PU, tháo giặt được" },
              { label: "Bảo hành", value: "3 năm toàn diện (khung + cơ cấu + chất liệu)" },
              { label: "Xuất xứ", value: "Sản xuất tại Việt Nam, linh kiện nhập khẩu" },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", borderBottom: i < 7 ? `1px solid ${BLACK_BORDER}` : "none" }}>
                <div style={{ width: "40%", padding: "16px 20px", background: "rgba(201,168,76,0.04)", borderRight: `1px solid ${BLACK_BORDER}` }}>
                  <span style={{ color: GOLD, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY }}>{row.label}</span>
                </div>
                <div style={{ flex: 1, padding: "16px 20px" }}>
                  <span style={{ color: GRAY_LIGHT, fontSize: 13, fontFamily: FONT_BODY }}>{row.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: SECTION_PAD, background: BLACK }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <SectionLabel>Khách Hàng Nói Gì</SectionLabel>
            <h2 style={{ fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING, lineHeight: 1.25 }}>
              {E({ bk: "testimonials_title", def: "Hơn 500 Gia Đình Tin Tưởng", as: "span" })}
            </h2>
            <GoldDivider />
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginTop: 16 }}>
            {[
              { name: "Chị Minh Trang", location: "Hà Nội", rating: 5, text: "Thiết kế online rất thú vị, chọn từng chi tiết một và thấy giá ngay. Sofa về đúng như mong đợi, chất liệu da PU rất đẹp và bền." },
              { name: "Anh Hoàng Nam", location: "TP.HCM", rating: 5, text: "Phòng ngủ nhỏ nên chọn size 1,2M không hộc. Nhân viên tư vấn rất nhiệt tình, giao hàng đúng hẹn và lắp đặt chuyên nghiệp." },
              { name: "Chị Thu Hà", location: "Đà Nẵng", rating: 5, text: "Ban đầu lo không biết chọn gì nhưng quiz funnel hướng dẫn từng bước rất rõ ràng. Kết quả ra chiếc sofa giường đúng ý 100%." },
            ].map((t, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{ background: BLACK_CARD, border: `1px solid ${BLACK_BORDER}`, borderRadius: R_LG, padding: "28px 24px", textAlign: "left" }}>
                  <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                    {Array.from({ length: t.rating }).map((_, j) => <span key={j} style={{ color: GOLD, fontSize: 14 }}>★</span>)}
                  </div>
                  <p style={{ color: GRAY_LIGHT, fontSize: 14, lineHeight: 1.8, fontFamily: FONT_BODY, marginBottom: 20, fontStyle: "italic" }}>"{t.text}"</p>
                  <div>
                    <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY }}>{t.name}</div>
                    <div style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY }}>{t.location}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── URGENCY BANNER ── */}
      <section style={{ padding: SECTION_PAD, background: BLACK_SOFT }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <UrgencyBanner E={E} />
          </FadeIn>
        </div>
      </section>

      {/* ── LEAD FORM ── */}
      <section ref={formRef} id="order-form" style={{ padding: SECTION_PAD, background: BLACK }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <SectionLabel>Đặt Hàng</SectionLabel>
            <h2 style={{ fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING, lineHeight: 1.25 }}>
              {E({ bk: "form_title", def: "Nhận Tư Vấn & Báo Giá Miễn Phí", as: "span" })}
            </h2>
            <GoldDivider />
            <p style={{ color: GRAY_LIGHT, fontSize: 15, lineHeight: 1.8, marginBottom: 36, fontFamily: FONT_BODY }}>
              {E({ bk: "form_desc", def: "Điền thông tin để nhận tư vấn chi tiết và báo giá chính xác nhất cho cấu hình bạn đã chọn", as: "span" })}
            </p>
            {!orderConfig && (
              <div style={{ marginBottom: 24 }}>
                <button onClick={() => openQuiz()} style={{ background: "rgba(201,168,76,0.08)", border: "1px dashed rgba(201,168,76,0.4)", color: GOLD, borderRadius: R_MD, padding: "14px 28px", fontSize: 13, cursor: "pointer", fontFamily: FONT_BODY, fontWeight: 600 }}>
                  🎨 Thiết kế cấu hình trước →
                </button>
              </div>
            )}
          </FadeIn>
          <FadeIn delay={100}>
            <LeadForm submitLabel="Đặt Hàng Ngay →" prefilledConfig={orderConfig || undefined} />
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: SECTION_PAD, background: BLACK_SOFT }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <SectionLabel>Câu Hỏi Thường Gặp</SectionLabel>
              <h2 style={{ fontSize: "clamp(24px,3.5vw,42px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING, lineHeight: 1.25 }}>
                {E({ bk: "faq_title", def: "Giải Đáp Thắc Mắc", as: "span" })}
              </h2>
              <GoldDivider />
            </div>
          </FadeIn>
          <FaqAccordion E={E} />
        </div>
      </section>

      {/* ── GUARANTEE ── */}
      <section style={{ padding: SECTION_PAD, background: BLACK }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ background: "linear-gradient(135deg, #1A1000 0%, #0D0800 100%)", border: "1px solid rgba(201,168,76,0.35)", borderRadius: 20, padding: "clamp(36px,5vw,60px)", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 20 }}>🛡️</div>
              <h2 style={{ color: GOLD, fontSize: "clamp(22px,3vw,32px)", fontWeight: 700, marginBottom: 16, fontFamily: FONT_HEADING }}>
                {E({ bk: "guarantee_title", def: "Cam Kết SmartFurni", as: "span" })}
              </h2>
              <GoldDivider />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24, marginTop: 24 }}>
                {[
                  { icon: "check_circle", title: "Đúng như thiết kế", desc: "Sản phẩm giao đúng cấu hình đã chọn, không sai lệch" },
                  { icon: "refresh", title: "Đổi trả 30 ngày", desc: "Không hài lòng, đổi trả miễn phí trong 30 ngày đầu" },
                  { icon: "shield", title: "Bảo hành 3 năm", desc: "Bảo hành toàn diện, sửa chữa tận nơi không tính phí" },
                  { icon: "headphones", title: "Hỗ trợ 24/7", desc: "Đội ngũ kỹ thuật hỗ trợ qua Zalo bất cứ lúc nào" },
                ].map((g, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ marginBottom: 10, display: "flex", justifyContent: "center" }}><SvgIcon name={g.icon} size={32} color={GOLD} /></div>
                    <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, fontFamily: FONT_BODY, marginBottom: 6 }}>{g.title}</div>
                    <div style={{ color: GRAY, fontSize: 12, fontFamily: FONT_BODY, lineHeight: 1.6 }}>{g.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#060500", borderTop: `1px solid ${BLACK_BORDER}`, paddingTop: 64 }}>
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
              <p style={{ color: GRAY, fontSize: 13, lineHeight: 1.85, fontFamily: FONT_BODY, marginBottom: 24, maxWidth: 280 }}>
                Tiên phong trong lĩnh vực nội thất cá nhân hoá tại Việt Nam. Sofa giường thiết kế theo ý bạn — sản xuất tại Việt Nam.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                {[
                  { label: "Facebook", icon: "f", href: "https://facebook.com/smartfurni" },
                  { label: "YouTube", icon: "▶", href: "https://youtube.com/@smartfurni" },
                  { label: "Zalo", icon: "Z", href: "https://zalo.me/0918326552" },
                ].map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" title={s.label}
                    style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(201,168,76,0.08)", border: `1px solid rgba(201,168,76,0.25)`, display: "flex", alignItems: "center", justifyContent: "center", color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT_BODY, textDecoration: "none", transition: "background 0.2s, border-color 0.2s" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(201,168,76,0.18)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = GOLD; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(201,168,76,0.08)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(201,168,76,0.25)"; }}
                  >{s.icon}</a>
                ))}
              </div>
            </div>
            {/* Cột 2: Showroom */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 3, height: 16, background: GOLD, borderRadius: 2 }} />
                <h4 style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, margin: 0 }}>Showroom</h4>
              </div>
              {[
                { icon: "map_pin", label: "TP. HCM", val: "74 Nguyễn Thị Nhung, KĐT Vạn Phúc City, TP. Thủ Đức" },
                { icon: "map_pin", label: "Hà Nội", val: "B46-29, KĐT Geleximco B, Lê Trọng Tấn, Q. Hà Đông" },
                { icon: "factory", label: "Xưởng SX", val: "202 Nguyễn Thị Sáng, X. Đông Thạnh, H. Hóc Môn" },
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "flex-start" }}>
                  <SvgIcon name={a.icon} size={16} color={GOLD} style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ color: GOLD_LIGHT, fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, marginBottom: 2 }}>{a.label}</div>
                    <div style={{ color: GRAY, fontSize: 12, lineHeight: 1.65, fontFamily: FONT_BODY }}>{a.val}</div>
                  </div>
                </div>
              ))}
            </div>
            {/* Cột 3: Liên hệ */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 3, height: 16, background: GOLD, borderRadius: 2 }} />
                <h4 style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, margin: 0 }}>Liên hệ</h4>
              </div>
              {[
                { icon: "phone", label: "Hotline", val: "028.7122.0818", href: "tel:02871220818" },
                { icon: "message_circle", label: "Zalo tư vấn", val: "0918.326.552", href: "https://zalo.me/0918326552" },
                { icon: "mail", label: "Email", val: "info@smartfurni.vn", href: "mailto:info@smartfurni.vn" },
                { icon: "globe", label: "Website", val: "smartfurni.vn", href: "https://smartfurni.vn" },
              ].map((c, i) => (
                <a key={i} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
                  style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start", textDecoration: "none" }}>
                  <SvgIcon name={c.icon} size={16} color={GOLD} style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ color: GRAY, fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, marginBottom: 1 }}>{c.label}</div>
                    <div style={{ color: GOLD_LIGHT, fontSize: 13, fontFamily: FONT_BODY, fontWeight: 700 }}>{c.val}</div>
                  </div>
                </a>
              ))}
            </div>
            {/* Cột 4: Đặt hàng */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                <div style={{ width: 3, height: 16, background: GOLD, borderRadius: 2 }} />
                <h4 style={{ color: GOLD, fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase" as const, fontFamily: FONT_BODY, margin: 0 }}>Đặt hàng ngay</h4>
              </div>
              <p style={{ color: GRAY, fontSize: 12, lineHeight: 1.75, fontFamily: FONT_BODY, marginBottom: 20 }}>
                Nhận tư vấn miễn phí &amp; xác nhận đơn hàng trong vòng 2 giờ làm việc.
              </p>
              <button
                onClick={scrollToForm}
                style={{ display: "block", width: "100%", textAlign: "center", background: `linear-gradient(135deg, ${GOLD_LIGHT} 0%, ${GOLD} 60%, #9A7A2E 100%)`, color: BLACK, fontWeight: 700, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" as const, padding: "13px 20px", borderRadius: R_MD, border: "none", cursor: "pointer", fontFamily: FONT_BODY, boxShadow: "0 6px 24px rgba(201,168,76,0.25)", marginBottom: 12 }}
              >
                Đặt hàng ngay →
              </button>
              <a href="https://zalo.me/0918326552" target="_blank" rel="noopener noreferrer"
                style={{ display: "block", textAlign: "center", background: "transparent", color: GRAY_LIGHT, fontWeight: 500, fontSize: 11, letterSpacing: "0.06em", padding: "12px 20px", borderRadius: R_MD, textDecoration: "none", fontFamily: FONT_BODY, border: `1px solid rgba(212,196,160,0.2)` }}>
                💬 Chat Zalo ngay
              </a>
            </div>
          </div>
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${BLACK_BORDER} 20%, ${BLACK_BORDER} 80%, transparent)`, marginBottom: 24 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as const, gap: 12, paddingBottom: 28 }}>
            <p style={{ color: "#3A3020", fontSize: 11, fontFamily: FONT_BODY, margin: 0 }}>
              © 2025 Công ty Cổ phần SmartFurni. Tất cả quyền được bảo lưu.
            </p>
            <div style={{ display: "flex", gap: 20 }}>
              {[
                { label: "Chính sách bảo mật", href: "/privacy" },
                { label: "Điều khoản sử dụng", href: "/terms" },
                { label: "Chính sách bảo hành", href: "/bao-hanh" },
              ].map((l) => (
                <a key={l.label} href={l.href} style={{ color: "#3A3020", fontSize: 11, fontFamily: FONT_BODY, textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.color = GRAY)}
                  onMouseLeave={e => (e.currentTarget.style.color = "#3A3020")}
                >{l.label}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>

      {/* ── QUIZ FUNNEL MODAL ── */}
      {quizOpen && (
        <QuizFunnelModal
          products={sofaProducts}
          initialProductId={quizProductId}
          onClose={() => setQuizOpen(false)}
          onComplete={handleQuizComplete}
        />
      )}

      {/* ── STICKY CTA ── */}
      <StickyCta scrollToForm={scrollToForm} E={E} />

      {/* ── ZALO FLOAT ── */}
      <a href="https://zalo.me/0918326552" target="_blank" rel="noopener noreferrer"
        style={{ position: "fixed", bottom: 80, right: 20, zIndex: 850, width: 52, height: 52, borderRadius: "50%", background: "#0068FF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 20px rgba(0,104,255,0.4)", textDecoration: "none", transition: "transform 0.2s" }}
        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1.1)"}
        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.transform = "scale(1)"}>
        <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="24" fill="#0068FF"/>
          <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">Z</text>
        </svg>
      </a>
    </div>
  );
}
