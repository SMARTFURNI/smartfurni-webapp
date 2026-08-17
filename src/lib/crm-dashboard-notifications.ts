export interface DashboardNotificationIdentity {
  id: string;
  version: string;
}

/**
 * Tạo phiên bản ổn định cho một thông báo tổng hợp. Cùng một tập bản ghi sẽ
 * giữ nguyên phiên bản; khi danh sách nguồn thay đổi, thông báo được xem là mới.
 */
export function dashboardNotificationVersion(parts: Array<string | number>): string {
  const source = parts.map(String).sort().join("|");
  let hash = 2166136261;

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function dashboardNotificationDismissalKey(
  notification: DashboardNotificationIdentity,
): string {
  return `${notification.id}:${notification.version}`;
}
