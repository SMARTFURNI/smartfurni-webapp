import type { Lead } from "./crm-types";
import { cleanZaloFriendshipText, getLeadProductLabel } from "./crm-zalo-friendship-message";

const MAX_ZALO_ALIAS_LENGTH = 80;

/**
 * Zalo Personal không có trường ghi chú riêng cho từng người bạn. Bản rút gọn
 * được đưa vào tên gợi nhớ (chỉ phía tài khoản doanh nghiệp nhìn thấy), còn ghi
 * chú đầy đủ tiếp tục nằm trong hồ sơ CRM và bảng thông tin của Zalo Inbox.
 */
export function buildZaloCrmAlias(
  lead: Pick<Lead, "name" | "company" | "notes" | "interestedProducts">,
): string {
  const name = cleanZaloFriendshipText(lead.name) || "Khách SmartFurni";
  const business = cleanZaloFriendshipText(lead.company);
  const product = getLeadProductLabel(lead.interestedProducts);
  const note = cleanZaloFriendshipText(lead.notes);
  const details = [business, product, note].filter(Boolean).join(" · ");
  if (!details) return name.slice(0, MAX_ZALO_ALIAS_LENGTH);
  const prefix = `${name} · `;
  if (prefix.length >= MAX_ZALO_ALIAS_LENGTH) return name.slice(0, MAX_ZALO_ALIAS_LENGTH);
  return `${prefix}${details.slice(0, MAX_ZALO_ALIAS_LENGTH - prefix.length)}`.trim();
}
