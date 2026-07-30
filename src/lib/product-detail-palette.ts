import type { ThemeColors } from "@/lib/theme-types";

/**
 * Bảng màu riêng của trang chi tiết sản phẩm, kế thừa trực tiếp từ khối
 * “Khám phá thêm” trên trang bài viết.
 */
export const PRODUCT_DETAIL_PALETTE: ThemeColors = {
  primary: "#C9A84C",
  secondary: "#9A7425",
  accent: "#E8C56B",
  background: "#111922",
  surface: "#1D2225",
  text: "#F5EDD6",
  textMuted: "#B9B09F",
  border: "#58451E",
  success: "#75C99A",
  warning: "#E6BF55",
  error: "#F28B82",
};

export const PRODUCT_DETAIL_PAGE_BACKGROUND = `
  radial-gradient(circle at 10% 5%, rgba(201, 168, 76, 0.12), transparent 25rem),
  radial-gradient(circle at 90% 24%, rgba(126, 90, 0, 0.13), transparent 36rem),
  linear-gradient(135deg, #161718 0%, #211D17 52%, #2A2115 100%)
`;

export const PRODUCT_DETAIL_PAGE_BASE = "#171613";

export const PRODUCT_DETAIL_PANEL_BACKGROUND =
  "linear-gradient(125deg, #172231 0%, #1B2228 48%, #302718 100%)";

export const PRODUCT_DETAIL_OUTER_BORDER = "rgba(201, 168, 76, 0.34)";
