export function formatVnd(value: number): string {
  if (!Number.isFinite(value)) return "0 đ";
  return `${Math.round(value).toLocaleString("vi-VN")} đ`;
}
