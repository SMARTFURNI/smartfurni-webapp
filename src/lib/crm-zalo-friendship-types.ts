export type ZaloFriendshipStatus =
  | "waiting_data"
  | "queued"
  | "processing"
  | "waiting_account"
  | "not_found"
  | "pending"
  | "retry_scheduled"
  | "accepted"
  | "rejected"
  | "stopped"
  | "failed";

export interface ZaloFriendshipSummary {
  leadId: string;
  status: ZaloFriendshipStatus;
  accountId?: string;
  accountLabel?: string;
  zaloUid?: string;
  zaloDisplayName?: string;
  zaloAvatar?: string;
  attemptCount: number;
  requestMessage?: string;
  lastSentAt?: string;
  nextActionAt?: string;
  acceptedAt?: string;
  lastCheckedAt?: string;
  lastError?: string;
  autoEnabled: boolean;
  updatedAt: string;
}

export interface ZaloFriendshipSettings {
  enabled: boolean;
  initialDelayMinutes: number;
  retryAfterHours: number;
  resendDelayMinutes: number;
  maxRetries: number;
  dailyCapPerAccount: number;
  sendStartHour: number;
  sendStartMinute: number;
  sendEndHour: number;
  sendEndMinute: number;
  reconciliationMinutes: number;
  initialMessageTemplate: string;
  retryMessageTemplate: string;
}

export const ZALO_FRIENDSHIP_STATUS_LABELS: Record<ZaloFriendshipStatus, string> = {
  waiting_data: "Chờ đủ dữ liệu",
  queued: "Sắp gửi lời mời",
  processing: "Đang xử lý",
  waiting_account: "Chờ kết nối Zalo",
  not_found: "Không tìm thấy Zalo",
  pending: "Đã gửi · Chờ chấp nhận",
  retry_scheduled: "Đã thu hồi · Chờ gửi lại",
  accepted: "Đã kết bạn",
  rejected: "Đã từ chối",
  stopped: "Đã dừng",
  failed: "Gửi lỗi · Sẽ thử lại",
};
