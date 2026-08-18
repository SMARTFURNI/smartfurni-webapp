import type { InterestedProduct, Lead } from "./crm-types";

export function normalizeZaloFriendPhone(value: string | null | undefined): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("84") && digits.length >= 11) return `0${digits.slice(2)}`;
  if (digits.startsWith("0")) return digits;
  return digits.length >= 9 ? `0${digits}` : digits;
}

export function cleanZaloFriendshipText(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function getLeadProductLabel(products: InterestedProduct[] | undefined): string {
  const labels: Record<InterestedProduct, string> = {
    sofa_bed: "Sofa giường",
    ergonomic_bed: "Giường công thái học",
    other: "sản phẩm nội thất",
  };
  const unique = [...new Set((products || []).map(product => labels[product]).filter(Boolean))];
  return unique.slice(0, 2).join(" và ");
}

function customerFirstName(name: string) {
  const parts = cleanZaloFriendshipText(name).split(" ");
  return parts.at(-1) || "anh/chị";
}

export function buildZaloFriendRequestMessage(
  lead: Pick<Lead, "name" | "assignedTo" | "interestedProducts">,
  attempt = 1,
  templates?: { initialMessageTemplate?: string; retryMessageTemplate?: string },
) {
  const firstName = customerFirstName(lead.name);
  const advisor = cleanZaloFriendshipText(lead.assignedTo) || "tư vấn viên SmartFurni";
  const product = getLeadProductLabel(lead.interestedProducts) || "sản phẩm nội thất SmartFurni";
  const fallback = attempt > 1
    ? "Chào {first_name}, {staff_name} xin gửi lại lời mời. Mình kết bạn để tiện tư vấn {product} nhé."
    : "Chào {first_name}, tôi là {staff_name}. Mình kết bạn để tiện tư vấn {product} nhé.";
  const template = attempt > 1 ? templates?.retryMessageTemplate : templates?.initialMessageTemplate;
  return cleanZaloFriendshipText(template || fallback)
    .replaceAll("{first_name}", firstName)
    .replaceAll("{staff_name}", advisor)
    .replaceAll("{product}", product)
    .slice(0, 150);
}
