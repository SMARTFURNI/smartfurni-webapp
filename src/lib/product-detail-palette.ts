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
  radial-gradient(circle at 12% 6%, rgba(201, 168, 76, 0.11), transparent 26rem),
  radial-gradient(circle at 88% 22%, rgba(88, 69, 30, 0.18), transparent 34rem),
  linear-gradient(135deg, #111922 0%, #172231 47%, #241F16 100%)
`;

export const PRODUCT_DETAIL_PANEL_BACKGROUND =
  "linear-gradient(125deg, #172231 0%, #1B2228 48%, #302718 100%)";
