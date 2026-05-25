/**
 * SvgIcon — Bộ icon SVG sang trọng phong cách line art mảnh
 * Màu mặc định: #C9A84C (gold SmartFurni)
 * Dùng thay thế emoji trong toàn bộ website chính
 */
import React from "react";

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_COLOR = "#C9A84C";
const DEFAULT_SIZE = 22;
const DEFAULT_SW = 1.5;

function base(size: number, color: string, sw: number, children: React.ReactNode, className?: string, style?: React.CSSProperties) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {children}
    </svg>
  );
}

// ─── Sản phẩm / Giường ────────────────────────────────────────────────────────
export function IconBed({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M2 9V19" />
    <path d="M22 9V19" />
    <path d="M2 14H22" />
    <path d="M2 9C2 9 5 7 12 7C19 7 22 9 22 9" />
    <path d="M6 14V9" />
    <rect x="6" y="10" width="5" height="4" rx="1" />
    <rect x="13" y="10" width="5" height="4" rx="1" />
  </>, className, style);
}

// ─── Nhà / Showroom ───────────────────────────────────────────────────────────
export function IconHome({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M3 10.5L12 3L21 10.5V21H15V15H9V21H3V10.5Z" />
  </>, className, style);
}

// ─── Khách sạn / Resort ───────────────────────────────────────────────────────
export function IconHotel({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <rect x="2" y="3" width="20" height="18" rx="1" />
    <path d="M2 8H22" />
    <path d="M8 8V21" />
    <rect x="11" y="11" width="3" height="3" rx="0.5" />
    <rect x="16" y="11" width="3" height="3" rx="0.5" />
    <rect x="11" y="16" width="3" height="3" rx="0.5" />
    <rect x="16" y="16" width="3" height="3" rx="0.5" />
  </>, className, style);
}

// ─── Bệnh viện ────────────────────────────────────────────────────────────────
export function IconHospital({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M12 7V17" />
    <path d="M7 12H17" />
  </>, className, style);
}

// ─── Tòa nhà / Văn phòng ─────────────────────────────────────────────────────
export function IconBuilding({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <rect x="3" y="2" width="14" height="20" rx="1" />
    <path d="M17 6H21V22H17" />
    <rect x="6" y="5" width="3" height="3" rx="0.5" />
    <rect x="11" y="5" width="3" height="3" rx="0.5" />
    <rect x="6" y="10" width="3" height="3" rx="0.5" />
    <rect x="11" y="10" width="3" height="3" rx="0.5" />
    <rect x="6" y="15" width="3" height="3" rx="0.5" />
    <rect x="11" y="15" width="3" height="3" rx="0.5" />
  </>, className, style);
}

// ─── Xây dựng / Công trình ────────────────────────────────────────────────────
export function IconConstruction({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M2 20H22" />
    <path d="M6 20V10L12 4L18 10V20" />
    <path d="M9 20V15H15V20" />
    <path d="M12 4V2" />
    <path d="M4 12H2" />
    <path d="M22 12H20" />
  </>, className, style);
}

// ─── Máy bay / Xuất khẩu ─────────────────────────────────────────────────────
export function IconPlane({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M21 16L3 8L7 12L3 16L21 16Z" />
    <path d="M7 12L11 4L13 8" />
    <path d="M13 8L17 6" />
  </>, className, style);
}

// ─── Điều chỉnh góc / Cài đặt ────────────────────────────────────────────────
export function IconAdjust({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M4 6H20" />
    <path d="M4 12H20" />
    <path d="M4 18H20" />
    <circle cx="8" cy="6" r="2" />
    <circle cx="16" cy="12" r="2" />
    <circle cx="10" cy="18" r="2" />
  </>, className, style);
}

// ─── Đèn LED / Ánh sáng ───────────────────────────────────────────────────────
export function IconLight({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M9 21H15" />
    <path d="M10 17H14" />
    <path d="M12 3C8.686 3 6 5.686 6 9C6 11.22 7.21 13.17 9 14.2V17H15V14.2C16.79 13.17 18 11.22 18 9C18 5.686 15.314 3 12 3Z" />
  </>, className, style);
}

// ─── Massage / Sóng ───────────────────────────────────────────────────────────
export function IconWave({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M2 12C2 12 5 8 8 12C11 16 14 8 17 12C20 16 22 12 22 12" />
    <path d="M2 17C2 17 5 13 8 17C11 21 14 13 17 17C20 21 22 17 22 17" />
    <path d="M2 7C2 7 5 3 8 7C11 11 14 3 17 7C20 11 22 7 22 7" />
  </>, className, style);
}

// ─── Trăng / Giấc ngủ ────────────────────────────────────────────────────────
export function IconMoon({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
  </>, className, style);
}

// ─── Giọng nói / Micro ────────────────────────────────────────────────────────
export function IconMic({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <rect x="9" y="2" width="6" height="11" rx="3" />
    <path d="M5 10C5 13.866 8.134 17 12 17C15.866 17 19 13.866 19 10" />
    <path d="M12 17V21" />
    <path d="M9 21H15" />
  </>, className, style);
}

// ─── Đồng hồ / Hẹn giờ ───────────────────────────────────────────────────────
export function IconClock({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7V12L15 14" />
  </>, className, style);
}

// ─── Điện thoại / App ─────────────────────────────────────────────────────────
export function IconPhone({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <path d="M9 6H15" />
    <circle cx="12" cy="17" r="1" />
  </>, className, style);
}

// ─── Điện thoại gọi ───────────────────────────────────────────────────────────
export function IconPhoneCall({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M22 16.92V19.92C22 20.48 21.55 20.96 20.99 20.99C10.44 21.69 3 14.56 3.01 4.01C3.04 3.45 3.52 3 4.08 3H7.08C7.6 3 8.04 3.37 8.09 3.88C8.34 6.03 9.02 8.05 10.02 9.87C10.24 10.27 10.13 10.77 9.77 11.04L8.33 12.08C9.73 14.97 12.03 17.27 14.92 18.67L15.96 17.23C16.23 16.87 16.73 16.76 17.13 16.98C18.95 17.98 20.97 18.66 23.12 18.91C23.63 18.96 24 19.4 22 16.92Z" />
  </>, className, style);
}

// ─── Email / Thư ──────────────────────────────────────────────────────────────
export function IconMail({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 7L12 13L22 7" />
  </>, className, style);
}

// ─── Địa điểm / Pin ───────────────────────────────────────────────────────────
export function IconMapPin({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M12 2C8.686 2 6 4.686 6 8C6 12.5 12 22 12 22C12 22 18 12.5 18 8C18 4.686 15.314 2 12 2Z" />
    <circle cx="12" cy="8" r="2.5" />
  </>, className, style);
}

// ─── Chat / Zalo ──────────────────────────────────────────────────────────────
export function IconChat({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M21 15C21 15.53 20.79 16.04 20.41 16.41C20.04 16.79 19.53 17 19 17H7L3 21V5C3 4.47 3.21 3.96 3.59 3.59C3.96 3.21 4.47 3 5 3H19C19.53 3 20.04 3.21 20.41 3.59C20.79 3.96 21 4.47 21 5V15Z" />
  </>, className, style);
}

// ─── Website / Globe ──────────────────────────────────────────────────────────
export function IconGlobe({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <circle cx="12" cy="12" r="9" />
    <path d="M2 12H22" />
    <path d="M12 3C9.5 6 8 9 8 12C8 15 9.5 18 12 21C14.5 18 16 15 16 12C16 9 14.5 6 12 3Z" />
  </>, className, style);
}

// ─── Bảo hành / Khiên ────────────────────────────────────────────────────────
export function IconShield({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M12 2L3 6V12C3 16.97 7.02 21.6 12 23C16.98 21.6 21 16.97 21 12V6L12 2Z" />
    <path d="M9 12L11 14L15 10" />
  </>, className, style);
}

// ─── Gói hàng / Đơn hàng ─────────────────────────────────────────────────────
export function IconPackage({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M21 8L12 3L3 8V16L12 21L21 16V8Z" />
    <path d="M3 8L12 13L21 8" />
    <path d="M12 13V21" />
    <path d="M7.5 5.5L16.5 10.5" />
  </>, className, style);
}

// ─── So sánh / Cân bằng ──────────────────────────────────────────────────────
export function IconScale({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M12 3V21" />
    <path d="M3 7L12 3L21 7" />
    <path d="M3 7L6 14H0L3 7Z" />
    <path d="M21 7L24 14H18L21 7Z" />
    <path d="M8 21H16" />
  </>, className, style);
}

// ─── Cấu hình 3D / Palette ────────────────────────────────────────────────────
export function IconPalette({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C13.1 22 14 21.1 14 20V19C14 18.45 14.22 17.95 14.59 17.59C14.96 17.22 15.45 17 16 17H18C20.21 17 22 15.21 22 13C22 7.48 17.52 2 12 2Z" />
    <circle cx="7" cy="12" r="1.5" />
    <circle cx="10" cy="8" r="1.5" />
    <circle cx="14" cy="8" r="1.5" />
    <circle cx="17" cy="12" r="1.5" />
  </>, className, style);
}

// ─── AR / Camera ──────────────────────────────────────────────────────────────
export function IconCamera({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M23 19C23 19.53 22.79 20.04 22.41 20.41C22.04 20.79 21.53 21 21 21H3C2.47 21 1.96 20.79 1.59 20.41C1.21 20.04 1 19.53 1 19V8C1 7.47 1.21 6.96 1.59 6.59C1.96 6.21 2.47 6 3 6H7L9 3H15L17 6H21C21.53 6 22.04 6.21 22.41 6.59C22.79 6.96 23 7.47 23 8V19Z" />
    <circle cx="12" cy="13" r="4" />
  </>, className, style);
}

// ─── Room Planner / Bản đồ ────────────────────────────────────────────────────
export function IconFloorPlan({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <rect x="2" y="2" width="20" height="20" rx="1" />
    <path d="M2 9H12" />
    <path d="M12 2V15" />
    <path d="M12 15H22" />
    <path d="M7 9V22" />
    <path d="M17 15V22" />
  </>, className, style);
}

// ─── AI / Robot ───────────────────────────────────────────────────────────────
export function IconAI({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <rect x="4" y="6" width="16" height="12" rx="2" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <path d="M9 6V4" />
    <path d="M15 6V4" />
    <path d="M4 12H2" />
    <path d="M22 12H20" />
    <path d="M9 18V20" />
    <path d="M15 18V20" />
  </>, className, style);
}

// ─── Catalogue / Sách ────────────────────────────────────────────────────────
export function IconBook({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M4 19.5C4 18.12 5.12 17 6.5 17H20" />
    <path d="M6.5 2H20V22H6.5C5.12 22 4 20.88 4 19.5V4.5C4 3.12 5.12 2 6.5 2Z" />
    <path d="M8 7H16" />
    <path d="M8 11H13" />
  </>, className, style);
}

// ─── Video / Play ─────────────────────────────────────────────────────────────
export function IconPlay({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <circle cx="12" cy="12" r="9" />
    <path d="M10 8L16 12L10 16V8Z" />
  </>, className, style);
}

// ─── Blog / Bài viết ──────────────────────────────────────────────────────────
export function IconArticle({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M14 2H6C5.47 2 4.96 2.21 4.59 2.59C4.21 2.96 4 3.47 4 4V20C4 20.53 4.21 21.04 4.59 21.41C4.96 21.79 5.47 22 6 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V8L14 2Z" />
    <path d="M14 2V8H20" />
    <path d="M8 13H16" />
    <path d="M8 17H12" />
  </>, className, style);
}

// ─── Tính năng / Ngôi sao ────────────────────────────────────────────────────
export function IconStar({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
  </>, className, style);
}

// ─── Xưởng / Factory ─────────────────────────────────────────────────────────
export function IconFactory({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M2 20H22" />
    <path d="M2 20V10L8 14V10L14 14V10L20 14V20" />
    <path d="M8 20V16H12V20" />
    <path d="M16 4H20V14" />
    <path d="M16 4L14 10" />
  </>, className, style);
}

// ─── Thép / Vật liệu ─────────────────────────────────────────────────────────
export function IconMaterial({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M12 2L2 7L12 12L22 7L12 2Z" />
    <path d="M2 17L12 22L22 17" />
    <path d="M2 12L12 17L22 12" />
  </>, className, style);
}

// ─── Carbon / Lightning ───────────────────────────────────────────────────────
export function IconLightning({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
  </>, className, style);
}

// ─── Kích thước / Ruler ───────────────────────────────────────────────────────
export function IconRuler({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M3 21L21 3" />
    <path d="M3 21L7 17" />
    <path d="M7 17L9 19" />
    <path d="M9 19L13 15" />
    <path d="M13 15L15 17" />
    <path d="M15 17L19 13" />
    <path d="M19 13L21 15" />
    <path d="M21 15L21 3" />
  </>, className, style);
}

// ─── Checkmark ────────────────────────────────────────────────────────────────
export function IconCheck({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M20 6L9 17L4 12" />
  </>, className, style);
}

// ─── Giỏ hàng ────────────────────────────────────────────────────────────────
export function IconCart({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M6 2L3 6V20C3 20.53 3.21 21.04 3.59 21.41C3.96 21.79 4.47 22 5 22H19C19.53 22 20.04 21.79 20.41 21.41C20.79 21.04 21 20.53 21 20V6L18 2H6Z" />
    <path d="M3 6H21" />
    <path d="M16 10C16 11.06 15.58 12.08 14.83 12.83C14.08 13.58 13.06 14 12 14C10.94 14 9.92 13.58 9.17 12.83C8.42 12.08 8 11.06 8 10" />
  </>, className, style);
}

// ─── Thông tin / Info ─────────────────────────────────────────────────────────
export function IconInfo({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8V8.01" />
    <path d="M12 11V16" />
  </>, className, style);
}

// ─── Đối tác / Handshake ─────────────────────────────────────────────────────
export function IconHandshake({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M2 12L7 7H11L14 10H17L22 12" />
    <path d="M2 12L7 17H11L14 14H17L22 12" />
    <path d="M11 7L14 10" />
    <path d="M11 17L14 14" />
  </>, className, style);
}

// ─── Xuất khẩu / Export ───────────────────────────────────────────────────────
export function IconExport({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M21 15V19C21 19.53 20.79 20.04 20.41 20.41C20.04 20.79 19.53 21 19 21H5C4.47 21 3.96 20.79 3.59 20.41C3.21 20.04 3 19.53 3 19V15" />
    <path d="M17 8L12 3L7 8" />
    <path d="M12 3V15" />
  </>, className, style);
}

// ─── Sofa / Ghế ─────────────────────────────────────────────────────────────
export function IconSofa({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M3 10C3 8.9 3.9 8 5 8H19C20.1 8 21 8.9 21 10V14H3V10Z" />
    <path d="M1 12C1 10.9 1.9 10 3 10V16H1V12Z" />
    <path d="M23 12C23 10.9 22.1 10 21 10V16H23V12Z" />
    <path d="M5 14V18" />
    <path d="M19 14V18" />
    <path d="M5 18H19" />
  </>, className, style);
}

// ─── File text / Tài liệu ────────────────────────────────────────────────────
export function IconFileText({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M14 2H6C5.47 2 4.96 2.21 4.59 2.59C4.21 2.96 4 3.47 4 4V20C4 20.53 4.21 21.04 4.59 21.41C4.96 21.79 5.47 22 6 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V8L14 2Z" />
    <path d="M14 2V8H20" />
    <path d="M8 13H16" />
    <path d="M8 17H12" />
    <path d="M10 9H8" />
  </>, className, style);
}

// ─── Tiền mặt / Cash ─────────────────────────────────────────────────────────
export function IconCash({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="3" />
    <path d="M6 12H6.01" />
    <path d="M18 12H18.01" />
  </>, className, style);
}

// ─── Ngân hàng / Bank ────────────────────────────────────────────────────────
export function IconBank({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M2 20H22" />
    <path d="M2 10H22" />
    <path d="M12 2L2 10H22L12 2Z" />
    <path d="M6 10V20" />
    <path d="M10 10V20" />
    <path d="M14 10V20" />
    <path d="M18 10V20" />
  </>, className, style);
}

// ─── Smartphone ───────────────────────────────────────────────────────────────
export function IconSmartphone({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <path d="M9 6H15" />
    <circle cx="12" cy="17" r="1" />
  </>, className, style);
}

// ─── Thẻ tín dụng / Credit card ──────────────────────────────────────────────
export function IconCreditCard({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10H22" />
    <path d="M6 15H8" />
    <path d="M11 15H13" />
  </>, className, style);
}

// ─── Lịch / Calendar ─────────────────────────────────────────────────────────
export function IconCalendar({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M3 9H21" />
    <path d="M8 2V5" />
    <path d="M16 2V5" />
    <path d="M7 14H9" />
    <path d="M11 14H13" />
    <path d="M15 14H17" />
  </>, className, style);
}

// ─── Xe tải / Giao hàng ──────────────────────────────────────────────────────
export function IconTruck({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M1 3H16V17H1V3Z" />
    <path d="M16 8H20L23 12V17H16V8Z" />
    <circle cx="5.5" cy="17.5" r="2.5" />
    <circle cx="18.5" cy="17.5" r="2.5" />
  </>, className, style);
}

// ─── Công cụ / Tool ───────────────────────────────────────────────────────────
export function IconTool({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </>, className, style);
}

// ─── Tag / Nhãn giá ───────────────────────────────────────────────────────────
export function IconTag({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M20.59 13.41L13.42 20.58C13.04 20.96 12.53 21.17 12 21.17C11.47 21.17 10.96 20.96 10.59 20.58L2 12V2H12L20.59 10.59C21.37 11.37 21.37 12.63 20.59 13.41Z" />
    <circle cx="7" cy="7" r="1.5" />
  </>, className, style);
}

// ─── Check circle ────────────────────────────────────────────────────────────
export function IconCheckCircle({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9 12L11 14L15 10" />
  </>, className, style);
}

// ─── Tech / UI icons ────────────────────────────────────────────────────────────
export function IconCpu({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <path d="M9 1V4" /><path d="M15 1V4" />
    <path d="M9 20V23" /><path d="M15 20V23" />
    <path d="M1 9H4" /><path d="M1 15H4" />
    <path d="M20 9H23" /><path d="M20 15H23" />
  </>, className, style);
}

export function IconLock({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    <circle cx="12" cy="16" r="1" fill={color} />
  </>, className, style);
}

export function IconRefresh({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
    <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
  </>, className, style);
}

export function IconUser({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>, className, style);
}

export function IconHeart({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </>, className, style);
}

export function IconDiamond({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <path d="M2.7 10.3L12 21L21.3 10.3L16 3H8L2.7 10.3Z" />
    <path d="M8 3L5 10.3H19L16 3" />
    <path d="M5 10.3L12 21L19 10.3" />
  </>, className, style);
}

export function IconSettings({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>, className, style);
}

export function IconZap({ size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps) {
  return base(size, color, strokeWidth, <>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </>, className, style);
}

// ─── Map lookup ───────────────────────────────────────────────────────────────
/** Trả về component icon theo tên key */
export function SvgIcon({ name, size = DEFAULT_SIZE, color = DEFAULT_COLOR, strokeWidth = DEFAULT_SW, className, style }: IconProps & { name: string }) {
  const props = { size, color, strokeWidth, className, style };
  switch (name) {
    case "bed": return <IconBed {...props} />;
    case "home": return <IconHome {...props} />;
    case "hotel": return <IconHotel {...props} />;
    case "hospital": return <IconHospital {...props} />;
    case "building": return <IconBuilding {...props} />;
    case "construction": return <IconConstruction {...props} />;
    case "plane": return <IconPlane {...props} />;
    case "adjust": return <IconAdjust {...props} />;
    case "light": return <IconLight {...props} />;
    case "wave": return <IconWave {...props} />;
    case "moon": return <IconMoon {...props} />;
    case "mic": return <IconMic {...props} />;
    case "clock": return <IconClock {...props} />;
    case "phone": return <IconPhone {...props} />;
    case "phone-call": return <IconPhoneCall {...props} />;
    case "mail": return <IconMail {...props} />;
    case "map-pin": return <IconMapPin {...props} />;
    case "chat": return <IconChat {...props} />;
    case "globe": return <IconGlobe {...props} />;
    case "shield": return <IconShield {...props} />;
    case "package": return <IconPackage {...props} />;
    case "scale": return <IconScale {...props} />;
    case "palette": return <IconPalette {...props} />;
    case "camera": return <IconCamera {...props} />;
    case "floor-plan": return <IconFloorPlan {...props} />;
    case "ai": return <IconAI {...props} />;
    case "book": return <IconBook {...props} />;
    case "play": return <IconPlay {...props} />;
    case "article": return <IconArticle {...props} />;
    case "star": return <IconStar {...props} />;
    case "factory": return <IconFactory {...props} />;
    case "material": return <IconMaterial {...props} />;
    case "lightning": return <IconLightning {...props} />;
    case "ruler": return <IconRuler {...props} />;
    case "check": return <IconCheck {...props} />;
    case "cart": return <IconCart {...props} />;
    case "info": return <IconInfo {...props} />;
    case "handshake": return <IconHandshake {...props} />;
    case "export": return <IconExport {...props} />;
    case "sofa": return <IconSofa {...props} />;
    case "file-text": return <IconFileText {...props} />;
    case "cash": return <IconCash {...props} />;
    case "bank": return <IconBank {...props} />;
    case "smartphone": return <IconSmartphone {...props} />;
    case "credit-card": return <IconCreditCard {...props} />;
    case "calendar": return <IconCalendar {...props} />;
    case "truck": return <IconTruck {...props} />;
    case "tool": return <IconTool {...props} />;
    case "tag": return <IconTag {...props} />;
    case "check-circle": return <IconCheckCircle {...props} />;
    case "cpu": return <IconCpu {...props} />;
    case "lock": return <IconLock {...props} />;
    case "refresh": return <IconRefresh {...props} />;
    case "user": return <IconUser {...props} />;
    case "heart": return <IconHeart {...props} />;
    case "diamond": return <IconDiamond {...props} />;
    case "settings": return <IconSettings {...props} />;
    case "zap": return <IconZap {...props} />;
    default: return <IconStar {...props} />;
  }
}
