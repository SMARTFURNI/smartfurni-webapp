export const B2B_POPUP_EVENT = "smartfurni:open-b2b-popup";

export function openB2BPopup() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(B2B_POPUP_EVENT));
}
