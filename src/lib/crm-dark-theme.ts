/**
 * CRM Dark Luxury Theme
 * Shared design tokens used across all CRM pages.
 * Inspired by Content Marketing AI dark glass morphism style.
 */

export const CRM_DARK = {
  // Page backgrounds
  pageBg: "linear-gradient(135deg, #0f172a 0%, #1e1a0e 50%, #1a1200 100%)",
  pageBgAlt: "linear-gradient(160deg, #0f172a 0%, #0c1220 40%, #1a1200 100%)",

  // Card / panel surfaces
  cardBg: "rgba(255,255,255,0.06)",
  cardBgHover: "rgba(255,255,255,0.09)",
  cardBorder: "1px solid rgba(255,255,255,0.10)",
  cardBorderAmber: "1px solid rgba(245,158,11,0.25)",
  cardShadow: "0 4px 24px rgba(0,0,0,0.35)",
  cardShadowLg: "0 8px 40px rgba(0,0,0,0.5)",

  // Glass panels (elevated)
  glassBg: "rgba(255,255,255,0.08)",
  glassBorder: "1px solid rgba(255,255,255,0.12)",
  glassBackdrop: "blur(20px)",

  // Header / section headers
  headerBg: "rgba(245,158,11,0.08)",
  headerBorder: "1px solid rgba(255,255,255,0.08)",

  // Inputs
  inputBg: "rgba(255,255,255,0.07)",
  inputBorder: "1px solid rgba(255,255,255,0.12)",
  inputBorderFocus: "1px solid rgba(245,158,11,0.5)",
  inputText: "#f5edd6",
  inputPlaceholder: "rgba(245,237,214,0.35)",

  // Text colors
  textPrimary: "#f5edd6",
  textSecondary: "rgba(245,237,214,0.65)",
  textMuted: "rgba(245,237,214,0.40)",
  textAmber: "#f59e0b",
  textAmberLight: "#fbbf24",

  // Accent / brand
  amber: "#f59e0b",
  amberDark: "#d97706",
  amberDeep: "#b45309",
  amberGlow: "rgba(245,158,11,0.15)",
  amberGlowStrong: "rgba(245,158,11,0.25)",

  // Gradient buttons
  btnPrimary: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
  btnPrimaryHover: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)",
  btnPrimaryText: "#0f172a",
  btnPrimaryShadow: "0 4px 20px rgba(245,158,11,0.35)",

  // Status colors (adapted for dark bg)
  successBg: "rgba(34,197,94,0.15)",
  successBorder: "rgba(34,197,94,0.3)",
  successText: "#4ade80",
  warningBg: "rgba(245,158,11,0.15)",
  warningBorder: "rgba(245,158,11,0.3)",
  warningText: "#fbbf24",
  errorBg: "rgba(239,68,68,0.15)",
  errorBorder: "rgba(239,68,68,0.3)",
  errorText: "#f87171",
  infoBg: "rgba(59,130,246,0.15)",
  infoBorder: "rgba(59,130,246,0.3)",
  infoText: "#93c5fd",

  // Table
  tableHeaderBg: "rgba(255,255,255,0.04)",
  tableRowHover: "rgba(245,158,11,0.06)",
  tableRowBorder: "rgba(255,255,255,0.06)",

  // Modal
  modalOverlay: "rgba(0,0,0,0.75)",
  modalOverlayBlur: "blur(8px)",
  modalBg: "linear-gradient(145deg, #1a1200, #0f0d00)",
  modalBorder: "1px solid rgba(245,158,11,0.25)",
  modalShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(245,158,11,0.1)",

  // Badge
  badgeAmber: { bg: "rgba(245,158,11,0.2)", text: "#fbbf24", border: "rgba(245,158,11,0.3)" },
  badgeGreen: { bg: "rgba(34,197,94,0.2)", text: "#4ade80", border: "rgba(34,197,94,0.3)" },
  badgeBlue: { bg: "rgba(59,130,246,0.2)", text: "#93c5fd", border: "rgba(59,130,246,0.3)" },
  badgeRose: { bg: "rgba(244,63,94,0.2)", text: "#fb7185", border: "rgba(244,63,94,0.3)" },
  badgeSlate: { bg: "rgba(100,116,139,0.2)", text: "#94a3b8", border: "rgba(100,116,139,0.3)" },
} as const;

/** Inline style helpers */
export const crmCard = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: CRM_DARK.cardBg,
  border: CRM_DARK.cardBorder,
  backdropFilter: CRM_DARK.glassBackdrop,
  borderRadius: 20,
  ...extra,
});

export const crmInput = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: CRM_DARK.inputBg,
  border: CRM_DARK.inputBorder,
  color: CRM_DARK.inputText,
  borderRadius: 10,
  ...extra,
});

export const crmBtn = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: CRM_DARK.btnPrimary,
  color: CRM_DARK.btnPrimaryText,
  boxShadow: CRM_DARK.btnPrimaryShadow,
  border: "none",
  borderRadius: 12,
  fontWeight: 700,
  cursor: "pointer",
  ...extra,
});
