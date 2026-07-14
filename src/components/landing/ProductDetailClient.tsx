"use client";
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Product, ProductVariant } from "@/lib/product-store";
import BNPLBadge from "@/components/landing/BNPLBadge";
import type { SiteTheme } from "@/lib/theme-types";
import { useCart } from "@/lib/cart-context";
import Breadcrumb from "@/components/landing/Breadcrumb";
import { ScrollReveal, StaggerReveal } from "./ScrollReveal";
import {
  getDefaultProductLandingDescriptionTemplate,
  hasProductDescriptionTemplate,
} from "@/lib/product-description-template";
import { redirectToLpThankYou } from "@/lib/lp-thank-you";

interface Props {
  product: Product;
  related: Product[];
  theme: SiteTheme;
}

function formatPrice(price: number) {
  if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} tỷ đ`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu đ`;
  return price.toLocaleString("vi-VN") + " đ";
}

function StarRating({ rating, count, color }: { rating: number; count: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <svg key={s} width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 1.5L9.8 5.8L14.5 6.3L11.2 9.3L12.1 14L8 11.7L3.9 14L4.8 9.3L1.5 6.3L6.2 5.8L8 1.5Z"
              fill={s <= Math.round(rating) ? color : "transparent"}
              stroke={s <= Math.round(rating) ? color : `${color}40`}
              strokeWidth="1"
            />
          </svg>
        ))}
      </div>
      <span style={{ color }} className="font-semibold text-sm">{rating.toFixed(1)}</span>
      <span style={{ color: `${color}60` }} className="text-sm">({count} đánh giá)</span>
    </div>
  );
}

const STATUS_MAP = {
  active: { label: "Còn hàng", bg: "success", text: "✓" },
  out_of_stock: { label: "Hết hàng", bg: "error", text: "✗" },
  coming_soon: { label: "Sắp ra mắt", bg: "warning", text: "⏳" },
  discontinued: { label: "Ngừng kinh doanh", bg: "muted", text: "—" },
};

const CATEGORY_MAP = {
  standard: "Standard",
  premium: "Premium",
  elite: "Elite",
  accessory: "Phụ kiện",
};

const PRODUCT_DESCRIPTION_VIDEOS = [
  { key: "video_sub_1_id", label: "Review" },
  { key: "video_sub_2_id", label: "Hướng dẫn" },
  { key: "video_sub_3_id", label: "So sánh" },
  { key: "video_sub_4_id", label: "Lắp đặt" },
] as const;

type ProductDescriptionVideoKey = (typeof PRODUCT_DESCRIPTION_VIDEOS)[number]["key"];
type ProductDescriptionVideoLinks = Record<ProductDescriptionVideoKey, string>;

function emptyProductDescriptionVideoLinks(): ProductDescriptionVideoLinks {
  return {
    video_sub_1_id: "",
    video_sub_2_id: "",
    video_sub_3_id: "",
    video_sub_4_id: "",
  };
}

const PRODUCT_DESCRIPTION_POPUPS = {
  single: {
    badge: "GSF150-STANDARD",
    title: "Khung Giường Công Thái Học Chỉnh Điện GSF150 Single Bed",
    subtitle: "Khung nâng hạ 2 motor, phù hợp nệm phổ biến",
    images: ["/gsf150-wood-frame.jpg", "/gsf150-standalone.jpg", "/gsf150-exploded.jpg", "/gsf150-features-infographic.jpg"],
    bullets: ["Lắp gọn trong lòng giường hiện có", "Nâng đầu 0-70 độ, nâng chân 0-45 độ", "Remote không dây, thao tác đơn giản"],
    sizes: [
      { name: "Lòng giường 0,9m x 2m", price: "9.790.000 đ" },
      { name: "Lòng giường 1m2 x 2m", price: "10.990.000 đ" },
      { name: "Lòng giường 1m4 x 2m", price: "11.990.000 đ" },
      { name: "Lòng giường 1m6 x 2m", price: "12.490.000 đ" },
      { name: "Lòng giường 1m8 x 2m", price: "13.890.000 đ" },
      { name: "Đặt size theo lòng giường", price: "Liên hệ" },
    ],
  },
  double: {
    badge: "GSF150-PLUS",
    title: "Khung Giường Công Thái Học Chỉnh Điện GSF150 Double Bed",
    subtitle: "Khung chắc hơn, tùy chỉnh theo lòng giường",
    images: ["/gsf150-standalone.jpg", "/gsf150-wood-frame.jpg", "/gsf150-exploded.jpg", "/gsf150-features-infographic.jpg"],
    bullets: ["Phù hợp lòng giường lớn và nhu cầu dùng đôi", "Khung chắc, vận hành êm", "Tư vấn kiểm tra nệm trước khi lắp"],
    sizes: [
      { name: "Lòng giường 1m6 x 2m", price: "19.580.000 đ" },
      { name: "Lòng giường 1m8 x 2m", price: "19.580.000 đ" },
      { name: "Đặt size theo lòng giường", price: "Liên hệ" },
    ],
  },
  custom: {
    badge: "SMARTFURNI-CUSTOM",
    title: "Đo Và Tư Vấn Theo Lòng Giường",
    subtitle: "SmartFurni kiểm tra kích thước, loại nệm và phương án lắp",
    images: ["/gsf150-exploded.jpg", "/gsf150-wood-frame.jpg", "/gsf150-standalone.jpg", "/gsf150-features-infographic.jpg"],
    bullets: ["Đo theo kích thước thực tế", "Tư vấn size, nệm và phương án lắp", "Báo giá rõ trước khi đặt"],
    sizes: [
      { name: "Đo và tư vấn theo nhu cầu", price: "Liên hệ" },
      { name: "Đặt size theo lòng giường", price: "Liên hệ" },
    ],
  },
} as const;

type PopupSizeOption = { readonly name: string; readonly price: string };

function getYoutubeVideoId(raw?: string | null) {
  const value = (raw || "").trim();
  if (!value || value === "_placeholder_") return "";
  if (/^[a-zA-Z0-9_-]{6,32}$/.test(value)) return value;

  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0] || "";
    if (url.pathname.includes("/embed/")) return url.pathname.split("/embed/")[1]?.split(/[/?#]/)[0] || "";
    if (url.pathname.includes("/shorts/")) return url.pathname.split("/shorts/")[1]?.split(/[/?#]/)[0] || "";
    return url.searchParams.get("v") || "";
  } catch {
    return "";
  }
}

function getRenderedProductDescriptionHtml(html: string) {
  return html.replace(/<[^>]+>/g, (tag) => {
    const classMatch = tag.match(/\bclass\s*=\s*(["'])([^"']*)\1/i);
    if (!classMatch || !classMatch[2]?.split(/\s+/).includes("sf-desc-video-card")) {
      return tag;
    }

    const videoMatch = tag.match(/\bdata-video-id\s*=\s*(["'])([^"']*)\1/i);
    const videoId = getYoutubeVideoId(videoMatch?.[2]);
    if (!videoId) return tag;

    const readyClasses = classMatch[2].split(/\s+/).filter(Boolean);
    if (!readyClasses.includes("is-ready")) readyClasses.push("is-ready");

    let renderedTag = tag.replace(classMatch[0], `class=${classMatch[1]}${readyClasses.join(" ")}${classMatch[1]}`);
    const thumbnailStyle = `--sf-video-thumbnail:url(https://img.youtube.com/vi/${videoId}/maxresdefault.jpg)`;
    const styleMatch = renderedTag.match(/\bstyle\s*=\s*(["'])([^"']*)\1/i);

    if (styleMatch) {
      const separator = styleMatch[2]?.trim().endsWith(";") ? "" : ";";
      renderedTag = renderedTag.replace(
        styleMatch[0],
        `style=${styleMatch[1]}${styleMatch[2]}${separator}${thumbnailStyle}${styleMatch[1]}`,
      );
    } else {
      renderedTag = renderedTag.replace(/\s*>$/, ` style="${thumbnailStyle}">`);
    }

    return renderedTag;
  });
}

function playProductDescriptionVideo(card: HTMLElement) {
  if (card.classList.contains("is-playing")) return true;

  const videoId = getYoutubeVideoId(
    card.getAttribute("data-video-id") || card.getAttribute("data-resolved-video-id"),
  );
  if (!videoId) return false;

  const title = card.dataset.videoTitle || "Video thực tế GSF150";
  const iframe = document.createElement("iframe");
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1`;
  iframe.title = title;
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.loading = "lazy";

  card.classList.add("is-ready", "is-playing");
  card.dataset.resolvedVideoId = videoId;
  card.replaceChildren(iframe);
  return true;
}

function ProductLandingDescription({
  product,
  colors,
  onAction,
}: {
  product: Product;
  colors: SiteTheme["colors"];
  onAction: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  const descriptionRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const initialHtml = useMemo(() => {
    const savedHtml = product.detailedDescription?.trim();
    return savedHtml && hasProductDescriptionTemplate(savedHtml)
      ? savedHtml
      : getDefaultProductLandingDescriptionTemplate(product);
  }, [product]);
  const [descriptionHtml, setDescriptionHtml] = useState(initialHtml);
  const [editBaselineHtml, setEditBaselineHtml] = useState(initialHtml);
  const [canEdit, setCanEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [selectedImageElement, setSelectedImageElement] = useState<HTMLImageElement | null>(null);
  const [selectedImageSrc, setSelectedImageSrc] = useState("");
  const [imageLink, setImageLink] = useState("");
  const [videoLinks, setVideoLinks] = useState<ProductDescriptionVideoLinks>(emptyProductDescriptionVideoLinks);
  const renderedDescriptionHtml = useMemo(
    () => getRenderedProductDescriptionHtml(descriptionHtml),
    [descriptionHtml],
  );
  const descriptionStyle = {
    color: colors.text,
    "--sf-desc-primary": colors.primary,
    "--sf-desc-secondary": colors.secondary,
    "--sf-desc-bg": colors.background,
    "--sf-desc-surface": colors.surface,
    "--sf-desc-text": colors.text,
    "--sf-desc-border": colors.border,
  } as CSSProperties;

  useEffect(() => {
    setDescriptionHtml(initialHtml);
    setEditBaselineHtml(initialHtml);
    setIsEditing(false);
    setIsUploadingImage(false);
    setEditMessage("");
    setSelectedImageElement(null);
    setSelectedImageSrc("");
    setImageLink("");
    setVideoLinks(emptyProductDescriptionVideoLinks());
  }, [initialHtml]);

  useEffect(() => {
    const controller = new AbortController();

    async function checkAdminAccess() {
      try {
        const res = await fetch(`/api/admin/products-mgmt/${product.id}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setCanEdit(res.ok);
        }
      } catch {
        if (!controller.signal.aborted) {
          setCanEdit(false);
        }
      }
    }

    void checkAdminAccess();

    return () => controller.abort();
  }, [product.id]);

  useEffect(() => {
    if (isEditing) return;

    const root = descriptionRef.current;
    if (!root) return;

    const cards = Array.from(root.querySelectorAll<HTMLElement>(".sf-desc-video-card[data-lp-video-key]"));
    if (cards.length === 0) return;

    let cancelled = false;
    function hydrateCard(card: HTMLElement, rawVideo: string) {
      if (cancelled || card.classList.contains("is-playing")) return;

      const title = card.dataset.videoTitle || "Video thực tế GSF150";
      const videoId = getYoutubeVideoId(rawVideo);
      const thumb = card.querySelector<HTMLElement>(".sf-desc-video-thumb");

      if (!thumb || !videoId) {
        card.classList.remove("is-ready");
        card.removeAttribute("data-resolved-video-id");
        return;
      }

      card.classList.add("is-ready");
      card.dataset.resolvedVideoId = videoId;
      card.setAttribute("aria-label", `Xem video ${title}`);

      const image = document.createElement("img");
      image.src = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      image.alt = title;
      image.loading = "lazy";
      image.decoding = "async";
      image.onerror = () => {
        image.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      };
      thumb.replaceChildren(image);
    }

    const landingFallbackCards: HTMLElement[] = [];
    for (const card of cards) {
      if (card.hasAttribute("data-video-id")) {
        hydrateCard(card, card.dataset.videoId || "");
      } else {
        landingFallbackCards.push(card);
      }
    }

    async function hydrateLandingFallbackVideos() {
      if (landingFallbackCards.length === 0) return;

      try {
        const res = await fetch("/api/admin/lp-content?slug=gsf150", { cache: "no-store" });
        const lpContent = res.ok ? await res.json() as Record<string, string> : {};
        if (cancelled) return;

        for (const card of landingFallbackCards) {
          const videoKey = card.dataset.lpVideoKey || "";
          hydrateCard(card, lpContent[videoKey] || "");
        }
      } catch {
        // Chỉ các ô đang kế thừa landing giữ trạng thái "Chưa có video" khi API lỗi.
        // Video đã lưu riêng theo sản phẩm vẫn được dựng ngay phía trên.
      }
    }

    void hydrateLandingFallbackVideos();
    const firstVideo = cards.find((card) => card.dataset.lpVideoKey === "video_sub_1_id");
    let hasAutoplayed = false;
    let animationFrame = 0;
    let visibilityTimer = 0;

    const stopWatching = () => {
      window.removeEventListener("scroll", scheduleVisibilityCheck);
      window.removeEventListener("resize", scheduleVisibilityCheck);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      if (visibilityTimer) window.clearInterval(visibilityTimer);
    };

    const checkVisibility = () => {
      animationFrame = 0;
      if (!firstVideo || hasAutoplayed || document.visibilityState !== "visible") return;

      const rect = firstVideo.getBoundingClientRect();
      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
      );
      const visibleRatio = rect.height > 0 ? visibleHeight / rect.height : 0;
      if (visibleRatio < 0.55) return;

      if (playProductDescriptionVideo(firstVideo)) {
        hasAutoplayed = true;
        stopWatching();
      }
    };

    function scheduleVisibilityCheck() {
      if (animationFrame || hasAutoplayed) return;
      animationFrame = window.requestAnimationFrame(checkVisibility);
    }

    if (firstVideo) {
      window.addEventListener("scroll", scheduleVisibilityCheck, { passive: true });
      window.addEventListener("resize", scheduleVisibilityCheck);
      visibilityTimer = window.setInterval(checkVisibility, 250);
      scheduleVisibilityCheck();
    }

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, [canEdit, descriptionHtml, isEditing]);

  function handleDescriptionClick(event: MouseEvent<HTMLDivElement>) {
    const card = (event.target as HTMLElement).closest<HTMLElement>(".sf-desc-video-card");
    if (card && event.currentTarget.contains(card)) {
      event.preventDefault();
      event.stopPropagation();
      playProductDescriptionVideo(card);
      return;
    }

    onAction(event);
  }

  function handleDescriptionKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;

    const card = (event.target as HTMLElement).closest<HTMLElement>(".sf-desc-video-card");
    if (!card || !event.currentTarget.contains(card)) return;

    event.preventDefault();
    event.stopPropagation();
    playProductDescriptionVideo(card);
  }

  function clearSelectedImage() {
    editorRef.current
      ?.querySelectorAll(".sf-description-selected-image")
      .forEach((image) => image.classList.remove("sf-description-selected-image"));
    setSelectedImageElement(null);
    setSelectedImageSrc("");
    setImageLink("");
  }

  function cleanDescriptionHtml(html: string) {
    if (typeof document === "undefined") return html;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    wrapper
      .querySelectorAll(".sf-description-selected-image")
      .forEach((image) => image.classList.remove("sf-description-selected-image"));
    return wrapper.innerHTML;
  }

  function handleEditorClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;

    event.preventDefault();
    event.stopPropagation();

    editorRef.current
      ?.querySelectorAll(".sf-description-selected-image")
      .forEach((image) => image.classList.remove("sf-description-selected-image"));

    target.classList.add("sf-description-selected-image");
    const src = target.getAttribute("src") || target.currentSrc || target.src || "";
    setSelectedImageElement(target);
    setSelectedImageSrc(src);
    setImageLink(src);
    setEditMessage("Đã chọn ảnh. Bạn có thể tải ảnh mới từ máy tính hoặc dán link để thay.");
  }

  function replaceSelectedImage(nextUrl: string) {
    const cleanUrl = nextUrl.trim();
    if (!cleanUrl) {
      setEditMessage("Bạn cần nhập link ảnh hoặc chọn file ảnh.");
      return;
    }

    const image =
      selectedImageElement?.isConnected
        ? selectedImageElement
        : editorRef.current?.querySelector<HTMLImageElement>("img.sf-description-selected-image");

    if (!image) {
      setEditMessage("Bạn hãy bấm chọn ảnh trong mô tả trước.");
      return;
    }

    image.src = cleanUrl;
    image.setAttribute("src", cleanUrl);
    image.removeAttribute("srcset");
    image.removeAttribute("data-src");
    image.removeAttribute("data-nimg");
    image.removeAttribute("sizes");
    image.loading = "lazy";
    image.decoding = "async";

    setSelectedImageElement(image);
    setSelectedImageSrc(cleanUrl);
    setImageLink(cleanUrl);
    setDescriptionHtml(editorRef.current?.innerHTML || descriptionHtml);
    setEditMessage("Đã thay ảnh. Bấm Lưu thay đổi để cập nhật lên website.");
  }

  async function handleUploadDescriptionImage(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setEditMessage("Bạn hãy chọn đúng file ảnh.");
      return;
    }
    if (!selectedImageElement && !editorRef.current?.querySelector("img.sf-description-selected-image")) {
      setEditMessage("Bạn hãy bấm chọn ảnh cần thay trong mô tả trước.");
      return;
    }

    setIsUploadingImage(true);
    setEditMessage("Đang tải ảnh lên...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string };

      if (!res.ok || typeof data.url !== "string") {
        throw new Error("upload_failed");
      }

      replaceSelectedImage(data.url);
    } catch {
      setEditMessage("Không tải được ảnh. Bạn thử lại hoặc dán link ảnh trực tiếp.");
    } finally {
      setIsUploadingImage(false);
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = "";
      }
    }
  }

  function handleApplyImageLink() {
    replaceSelectedImage(imageLink);
  }

  function handleStartEdit() {
    const nextVideoLinks = emptyProductDescriptionVideoLinks();
    const renderedCards = descriptionRef.current?.querySelectorAll<HTMLElement>(
      ".sf-desc-video-card[data-lp-video-key]",
    );

    renderedCards?.forEach((card) => {
      const key = card.dataset.lpVideoKey as ProductDescriptionVideoKey | undefined;
      if (!key || !(key in nextVideoLinks)) return;

      const productValue = card.getAttribute("data-video-id");
      nextVideoLinks[key] = productValue === "_placeholder_"
        ? ""
        : productValue || card.dataset.resolvedVideoId || "";
    });

    setEditBaselineHtml(descriptionHtml);
    setVideoLinks(nextVideoLinks);
    setIsEditing(true);
    setEditMessage("Đang chỉnh sửa trực tiếp. Bạn có thể thay ảnh và các link video YouTube bên dưới.");
  }

  function handleCancelEdit() {
    if (editorRef.current) {
      editorRef.current.innerHTML = editBaselineHtml;
    }
    setDescriptionHtml(editBaselineHtml);
    clearSelectedImage();
    setVideoLinks(emptyProductDescriptionVideoLinks());
    setIsUploadingImage(false);
    setIsEditing(false);
    setEditMessage("");
  }

  async function handleSaveDescription() {
    const rawHtml = editorRef.current?.innerHTML.trim() || "";
    const normalizedVideoIds = emptyProductDescriptionVideoLinks();

    for (const video of PRODUCT_DESCRIPTION_VIDEOS) {
      const rawValue = videoLinks[video.key].trim();
      const videoId = rawValue ? getYoutubeVideoId(rawValue) : "";
      if (rawValue && !videoId) {
        setEditMessage(`Link video ${video.label} không hợp lệ. Hãy dán link YouTube hoặc Video ID.`);
        return;
      }
      normalizedVideoIds[video.key] = videoId;
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = cleanDescriptionHtml(rawHtml);
    wrapper.querySelectorAll<HTMLElement>(".sf-desc-video-card[data-lp-video-key]").forEach((card) => {
      const key = card.dataset.lpVideoKey as ProductDescriptionVideoKey | undefined;
      if (!key || !(key in normalizedVideoIds)) return;

      const videoId = normalizedVideoIds[key];
      card.dataset.videoId = videoId || "_placeholder_";
      card.removeAttribute("data-resolved-video-id");
      card.classList.remove("is-ready", "is-playing");

      const thumb = card.querySelector<HTMLElement>(".sf-desc-video-thumb");
      if (thumb) {
        const empty = document.createElement("span");
        empty.className = "sf-desc-video-empty";
        empty.textContent = "Chưa có video";
        thumb.replaceChildren(empty);
      }
    });
    const nextHtml = wrapper.innerHTML;
    if (!nextHtml) {
      setEditMessage("Mô tả không được để trống.");
      return;
    }

    setIsSaving(true);
    setEditMessage("Đang lưu...");

    try {
      const res = await fetch(`/api/admin/products-mgmt/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ detailedDescription: nextHtml }),
      });

      if (!res.ok) {
        throw new Error("save_failed");
      }

      setDescriptionHtml(nextHtml);
      setEditBaselineHtml(nextHtml);
      clearSelectedImage();
      setIsEditing(false);
      setEditMessage("Đã lưu mô tả sản phẩm.");
    } catch {
      setEditMessage("Không lưu được mô tả. Bạn kiểm tra lại quyền admin rồi thử lại.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="sf-product-description-editor-shell" style={descriptionStyle}>
      {canEdit ? (
        <div className="sf-product-description-adminbar">
          <div>
            <div className="sf-product-description-adminbar__label">Chỉnh sửa mô tả sản phẩm</div>
            <div className="sf-product-description-adminbar__hint">
              Chỉ hiện khi đang đăng nhập admin. Nội dung lưu vào sản phẩm hiện tại.
            </div>
          </div>
          <div className="sf-product-description-adminbar__actions">
            {editMessage ? <span className="sf-product-description-adminbar__message">{editMessage}</span> : null}
            {isEditing ? (
              <>
                <button type="button" onClick={handleSaveDescription} disabled={isSaving || isUploadingImage}>
                  {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
                <button type="button" className="secondary" onClick={handleCancelEdit} disabled={isSaving || isUploadingImage}>
                  Hủy
                </button>
              </>
            ) : (
              <button type="button" onClick={handleStartEdit}>
                Bật chỉnh sửa
              </button>
            )}
          </div>
        </div>
      ) : null}

      {isEditing ? (
        <div className="sf-product-description-edit-tools">
          <div className="sf-product-description-image-tools">
            <input
              ref={imageFileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(event) => void handleUploadDescriptionImage(event.target.files?.[0])}
            />
            <div className="sf-product-description-image-tools__preview">
              {selectedImageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedImageSrc} alt="Ảnh mô tả đang chọn" />
              ) : (
                <span>Bấm chọn một ảnh trong mô tả</span>
              )}
            </div>
            <div className="sf-product-description-image-tools__body">
              <div className="sf-product-description-image-tools__title">Thay ảnh mô tả</div>
              <div className="sf-product-description-image-tools__hint">
                Bấm vào ảnh trong phần mô tả, rồi tải ảnh từ máy tính hoặc dán link ảnh giống landing GSF150.
              </div>
              <div className="sf-product-description-image-tools__controls">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => imageFileInputRef.current?.click()}
                  disabled={isUploadingImage || !selectedImageSrc}
                >
                  {isUploadingImage ? "Đang tải..." : "Upload ảnh"}
                </button>
                <input
                  type="url"
                  value={imageLink}
                  onChange={(event) => setImageLink(event.target.value)}
                  placeholder="Dán link ảnh..."
                  disabled={!selectedImageSrc || isUploadingImage}
                />
                <button type="button" onClick={handleApplyImageLink} disabled={!selectedImageSrc || isUploadingImage}>
                  Thay bằng link
                </button>
              </div>
            </div>
          </div>

          <div className="sf-product-description-video-tools">
            <div className="sf-product-description-image-tools__title">Chỉnh video mô tả</div>
            <div className="sf-product-description-image-tools__hint">
              Dán link YouTube hoặc Video ID. Để trống nếu muốn ẩn video tại ô tương ứng.
            </div>
            <div className="sf-product-description-video-tools__grid">
              {PRODUCT_DESCRIPTION_VIDEOS.map((video) => (
                <label key={video.key}>
                  <span>{video.label}</span>
                  <input
                    type="text"
                    inputMode="url"
                    value={videoLinks[video.key]}
                    onChange={(event) => setVideoLinks((current) => ({
                      ...current,
                      [video.key]: event.target.value,
                    }))}
                    placeholder="Link YouTube hoặc Video ID"
                    disabled={isSaving}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {isEditing ? (
        <div
          ref={editorRef}
          style={descriptionStyle}
          className="prose-custom max-w-none sf-product-description-inline-edit"
          contentEditable
          suppressContentEditableWarning
          onClick={handleEditorClick}
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
      ) : (
        <div
          ref={descriptionRef}
          style={descriptionStyle}
          className="prose-custom max-w-none"
          onClick={handleDescriptionClick}
          onKeyDown={handleDescriptionKeyDown}
          dangerouslySetInnerHTML={{ __html: renderedDescriptionHtml }}
        />
      )}
    </div>
  );
}

function ProductDescriptionPopup({
  popupId,
  product,
  colors,
  onClose,
}: {
  popupId: string | null;
  product: Product;
  colors: SiteTheme["colors"];
  onClose: () => void;
}) {
  const planKey =
    popupId && popupId in PRODUCT_DESCRIPTION_POPUPS
      ? (popupId as keyof typeof PRODUCT_DESCRIPTION_POPUPS)
      : "single";
  const plan = PRODUCT_DESCRIPTION_POPUPS[planKey];
  const [selectedSize, setSelectedSize] = useState<PopupSizeOption>(plan.sizes[0]!);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSelectedSize(plan.sizes[0]!);
    setSelectedImageIndex(0);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerNote("");
    setFormError("");
    setIsSubmitting(false);
  }, [popupId, plan]);

  if (!popupId) return null;

  const popupImages = Array.from(
    new Set(
      [
        product.coverImage,
        ...(product.images || []),
        ...plan.images,
      ].filter(Boolean) as string[]
    )
  ).slice(0, 6);
  const selectedImage = popupImages[selectedImageIndex] || plan.images[0] || "/gsf150-wood-frame.jpg";
  const normalizePhone = (value: string) => value.replace(/[^\d+]/g, "").replace(/^\+?84/, "0");

  const handlePopupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const normalizedPhone = normalizePhone(customerPhone);
    if (!customerName.trim() || normalizedPhone.replace(/\D/g, "").length < 9) {
      setFormError("Vui lòng nhập tên và số điện thoại hợp lệ để SmartFurni liên hệ.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    const noteLines = [
      "Nguồn: popup mô tả sản phẩm website chính",
      `Sản phẩm website: ${product.name} (${product.slug})`,
      `Gói quan tâm: ${plan.title}`,
      `Kích thước: ${selectedSize.name}`,
      `Giá hiển thị: ${selectedSize.price}`,
      customerNote.trim() ? `Ghi chú khách: ${customerNote.trim()}` : "",
    ].filter(Boolean);

    try {
      const response = await fetch("/api/lp/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          landingPageSlug: "gsf150",
          name: customerName.trim(),
          phone: normalizedPhone,
          email: "",
          note: noteLines.join("\n"),
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || "Chưa gửi được thông tin đặt hàng.");
      }

      redirectToLpThankYou("gsf150", {
        product: product.slug,
        popup: planKey,
        size: selectedSize.name,
      });
    } catch (error) {
      setIsSubmitting(false);
      setFormError(error instanceof Error ? error.message : "Có lỗi khi gửi thông tin. Vui lòng thử lại.");
    }
  };

  return (
    <div className="sf-product-popup-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6" onClick={onClose}>
      <div
        style={{ backgroundColor: "#F4EBDD", borderColor: colors.primary }}
        className="sf-product-popup-modal relative w-full max-w-5xl overflow-hidden rounded-3xl border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/10 text-2xl text-[#2D2417] hover:bg-black/15"
        >
          ×
        </button>
        <div className="sf-product-popup-grid grid max-h-[90vh] overflow-y-auto lg:grid-cols-[1.02fr_0.98fr]">
          <div className="sf-product-popup-media bg-[#FFF8EE]">
            <img
              src={selectedImage}
              alt={plan.title}
              className="sf-product-popup-main-image h-[300px] w-full object-cover sm:h-[420px] lg:h-[560px]"
            />
            {popupImages.length > 0 && (
              <div className="sf-product-popup-thumbs flex gap-3 p-4">
                {popupImages.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setSelectedImageIndex(idx)}
                    className="h-14 w-14 overflow-hidden rounded-xl border bg-white transition hover:opacity-80"
                    style={{ borderColor: idx === selectedImageIndex ? colors.primary : "rgba(201,168,76,0.35)" }}
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="sf-product-popup-content bg-[#F3ECDE] p-6 text-[#2A2116] sm:p-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-[#9A7A2E]">{plan.badge}</p>
            <h3 className="text-2xl font-bold leading-tight sm:text-3xl">{plan.title}</h3>
            <p className="mt-3 text-sm text-[#6E604C]">{plan.subtitle}</p>
            <div className="mt-5 grid gap-2">
              {plan.bullets.map((bullet) => (
                <div key={bullet} className="flex items-start gap-2 rounded-xl border border-[#C9A84C]/20 bg-white/45 px-3 py-2 text-sm text-[#4D422F]">
                  <span className="font-bold text-[#9A7A2E]">✓</span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
            <div className="mt-7">
              <p className="mb-3 text-sm font-semibold">Chọn kích thước:</p>
              <div className="sf-product-popup-size-list space-y-3">
                {plan.sizes.map((size) => {
                  const active = selectedSize.name === size.name;
                  return (
                    <button
                      key={size.name}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className="flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-semibold transition"
                      style={{
                        borderColor: active ? colors.primary : "rgba(154,122,46,0.18)",
                        backgroundColor: active ? "rgba(201,168,76,0.13)" : "rgba(255,255,255,0.62)",
                        color: active ? "#8A6500" : "#2A2116",
                      }}
                    >
                      <span>{size.name}</span>
                      <span>{size.price}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-[#C9A84C]/25 bg-[#E8DDC8] p-4">
              <p className="text-xs text-[#8A7B62]">Lựa chọn đã chọn</p>
              <p className="mt-1 font-bold">{selectedSize.name}</p>
              <p className="mt-2 text-3xl font-bold text-[#9A7A2E]">{selectedSize.price}</p>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-semibold text-[#7C6A4F]">
              <div className="rounded-xl bg-white/45 px-2 py-2">Giao lắp tận nơi</div>
              <div className="rounded-xl bg-white/45 px-2 py-2">Bảo hành 5 năm</div>
              <div className="rounded-xl bg-white/45 px-2 py-2">Tư vấn size</div>
            </div>
            <form onSubmit={handlePopupSubmit} className="mt-6 space-y-3">
              <div className="sf-product-popup-form grid gap-3 sm:grid-cols-2">
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Họ và tên (*)"
                  className="rounded-xl border border-[#C9A84C]/25 bg-white/65 px-4 py-3 text-sm text-[#2A2116] outline-none placeholder:text-[#8A7B62] focus:border-[#C9A84C]"
                />
                <input
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="Số điện thoại (*)"
                  inputMode="tel"
                  className="rounded-xl border border-[#C9A84C]/25 bg-white/65 px-4 py-3 text-sm text-[#2A2116] outline-none placeholder:text-[#8A7B62] focus:border-[#C9A84C]"
                />
              </div>
              <textarea
                value={customerNote}
                onChange={(event) => setCustomerNote(event.target.value)}
                placeholder="Ghi chú thêm: kích thước lòng giường, khu vực giao lắp..."
                rows={3}
                className="w-full rounded-xl border border-[#C9A84C]/25 bg-white/65 px-4 py-3 text-sm text-[#2A2116] outline-none placeholder:text-[#8A7B62] focus:border-[#C9A84C]"
              />
              {formError && <p className="text-sm font-semibold text-[#B42318]">{formError}</p>}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#C9A84C] to-[#7E5A00] px-6 py-4 text-sm font-bold uppercase tracking-[0.14em] text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Đang gửi..." : "Đặt mua ngay →"}
              </button>
            </form>
            <p className="mt-5 text-center text-xs text-[#8A7B62]">Giao lắp tận nơi · Bảo hành motor 5 năm</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailClient({ product, related, theme }: Props) {
  const { colors, layout } = theme;
  const router = useRouter();
  const { addItem, totalItems } = useCart();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(product.variants[0]);
  const [activeTab, setActiveTab] = useState<"description" | "features" | "specs" | "reviews">("description");
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [descriptionPopupId, setDescriptionPopupId] = useState<string | null>(null);

  // Image gallery state
  const allImages = product.images && product.images.length > 0
    ? product.images
    : product.coverImage ? [product.coverImage] : [];
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  const activeImage = allImages[activeImageIdx] || null;

  function openLightbox(idx: number) {
    setLightboxIdx(idx);
    setLightboxOpen(true);
  }
  function closeLightbox() { setLightboxOpen(false); }
  function lightboxPrev() { setLightboxIdx((i) => (i - 1 + allImages.length) % allImages.length); }
  function lightboxNext() { setLightboxIdx((i) => (i + 1) % allImages.length); }

  const discount =
    product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const statusCfg = STATUS_MAP[product.status];
  const isAvailable = product.status === "active" && selectedVariant.stock > 0;
  const isComingSoon = product.status === "coming_soon";
  const handleAddToCart = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      sku: selectedVariant.sku,
      price: product.price,
      originalPrice: product.originalPrice,
      coverImage: product.coverImage,
      quantity,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  const handleBuyNow = () => {
    addItem({
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      variantId: selectedVariant.id,
      variantName: selectedVariant.name,
      sku: selectedVariant.sku,
      price: product.price,
      originalPrice: product.originalPrice,
      coverImage: product.coverImage,
      quantity,
    });
    router.push("/checkout");
  };

  const handleDescriptionAction = (event: MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest("[data-product-popup]") as HTMLElement | null;
    if (!target) return;

    event.preventDefault();
    setDescriptionPopupId(target.dataset.productPopup || "single");
  };

  // Tabs: show the landing-style description editor surface for every product.
  const tabs = [
    { key: "description" as const, label: "Mô tả sản phẩm" },
    { key: "features" as const, label: "Tính năng" },
    { key: "specs" as const, label: "Thông số kỹ thuật" },
    { key: "reviews" as const, label: `Đánh giá (${product.reviewCount})` },
  ];

  // Sticky CTA: show after scrolling past hero section
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowSticky(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
    {/* Sticky CTA bar — mobile only */}
    <div
      style={{
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        transform: showSticky ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.3s ease",
      }}
      className="fixed bottom-0 left-0 right-0 z-40 border-t px-4 py-3 flex items-center gap-3 sm:hidden"
    >
      <div className="flex-1 min-w-0">
        <p style={{ color: colors.text }} className="text-sm font-semibold truncate">{product.name}</p>
        <p style={{ color: colors.primary }} className="text-sm font-bold">{formatPrice(product.price)}</p>
      </div>
      <button
        onClick={handleAddToCart}
        disabled={!isAvailable}
        style={{
          borderColor: colors.primary,
          color: colors.primary,
          opacity: isAvailable ? 1 : 0.4,
        }}
        className="px-4 py-2.5 rounded-xl border text-xs font-semibold whitespace-nowrap flex-shrink-0"
      >
        + Giỏ hàng
      </button>
      <button
        onClick={handleBuyNow}
        disabled={!isAvailable}
        style={{
          background: isAvailable ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` : colors.border,
          color: isAvailable ? colors.background : `${colors.text}40`,
        }}
        className="px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap flex-shrink-0"
      >
        Mua ngay
      </button>
    </div>
    <div style={{ maxWidth: layout.maxWidth, paddingTop: (theme.navbar.height ?? 64) + 32 }} className="mx-auto px-4 sm:px-6 pb-8 sm:pb-10">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Breadcrumb items={[
          { label: "Trang chủ", href: "/" },
          { label: "Sản phẩm", href: "/products" },
          { label: product.name },
        ]} />
      </div>

      {/* Main product section */}
      <ScrollReveal variant="fadeUp" delay={0}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 mb-12 sm:mb-16">
        {/* Left: Image Gallery */}
        <div>
          {/* Main image */}
          <div
            className="rounded-2xl overflow-hidden flex items-center justify-center w-full cursor-zoom-in relative"
            style={{
              background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})`,
              border: `1px solid ${colors.border}`,
              aspectRatio: '1/1',
            }}
            onClick={() => activeImage && openLightbox(activeImageIdx)}
          >
            {activeImage ? (
              <img
                src={activeImage}
                alt={`${product.name} - ảnh ${activeImageIdx + 1}`}
                className="w-full h-full object-cover transition-opacity duration-300"
              />
            ) : (
              <svg viewBox="0 0 300 200" width="260" height="173" fill="none">
                <rect x="30" y="100" width="240" height="75" rx="8"
                  fill={`${colors.primary}12`} stroke={`${colors.primary}35`} strokeWidth="2" />
                <rect x="38" y="80" width="224" height="82" rx="10"
                  fill={`${colors.primary}18`} stroke={`${colors.primary}45`} strokeWidth="2" />
                <rect x="45" y="65" width="70" height="35" rx="14"
                  fill={`${colors.primary}28`} stroke={`${colors.primary}55`} strokeWidth="1.5" />
                <rect x="125" y="65" width="70" height="35" rx="14"
                  fill={`${colors.primary}28`} stroke={`${colors.primary}55`} strokeWidth="1.5" />
                <rect x="22" y="40" width="28" height="90" rx="6"
                  fill={`${colors.primary}22`} stroke={`${colors.primary}45`} strokeWidth="2" />
                <rect x="22" y="128" width="256" height="5" rx="2.5"
                  fill={colors.primary} opacity="0.7" />
                <rect x="38" y="172" width="14" height="22" rx="4"
                  fill={`${colors.primary}28`} stroke={`${colors.primary}40`} strokeWidth="1.5" />
                <rect x="248" y="172" width="14" height="22" rx="4"
                  fill={`${colors.primary}28`} stroke={`${colors.primary}40`} strokeWidth="1.5" />
                <circle cx="232" cy="95" r="14"
                  fill={`${colors.primary}18`} stroke={`${colors.primary}45`} strokeWidth="1.5" />
                <path d="M227 95 L231 99 L237 90"
                  stroke={colors.primary} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
                <ellipse cx="150" cy="195" rx="100" ry="8"
                  fill={colors.primary} opacity="0.08" />
              </svg>
            )}
            {/* Zoom hint */}
            {activeImage && (
              <div className="absolute bottom-3 right-3 bg-black/50 rounded-lg px-2 py-1 text-white text-xs pointer-events-none">
                🔍 Click để phóng to
              </div>
            )}
            {/* Image counter */}
            {allImages.length > 1 && (
              <div className="absolute top-3 right-3 bg-black/50 rounded-full px-2.5 py-1 text-white text-xs pointer-events-none">
                {activeImageIdx + 1}/{allImages.length}
              </div>
            )}
          </div>

          {/* Thumbnail strip */}
          {allImages.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className="flex-shrink-0 rounded-xl overflow-hidden transition-all duration-200"
                  style={{
                    width: 72,
                    height: 72,
                    border: idx === activeImageIdx
                      ? `2px solid ${colors.primary}`
                      : `2px solid ${colors.border}`,
                    opacity: idx === activeImageIdx ? 1 : 0.6,
                  }}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Lightbox */}
          {lightboxOpen && allImages.length > 0 && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
              onClick={closeLightbox}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={closeLightbox}
                className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl font-light w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              >
                ×
              </button>

              {/* Prev button */}
              {allImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10 text-xl"
                >
                  ‹
                </button>
              )}

              {/* Main lightbox image */}
              <div
                className="max-w-5xl max-h-[90vh] mx-16 flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  src={allImages[lightboxIdx]}
                  alt={`${product.name} - ảnh ${lightboxIdx + 1}`}
                  className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                />
              </div>

              {/* Next button */}
              {allImages.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10 text-xl"
                >
                  ›
                </button>
              )}

              {/* Thumbnail strip in lightbox */}
              {allImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setLightboxIdx(idx); }}
                      className="rounded-lg overflow-hidden transition-all"
                      style={{
                        width: 56,
                        height: 42,
                        border: idx === lightboxIdx ? `2px solid ${colors.primary}` : "2px solid rgba(255,255,255,0.2)",
                        opacity: idx === lightboxIdx ? 1 : 0.5,
                      }}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Counter */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
                {lightboxIdx + 1} / {allImages.length}
              </div>
            </div>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span
              style={{ backgroundColor: `${colors.primary}15`, color: colors.primary, borderColor: `${colors.primary}30` }}
              className="text-xs px-3 py-1 rounded-full border font-medium"
            >
              {CATEGORY_MAP[product.category]}
            </span>
            {product.isFeatured && (
              <span
                style={{ backgroundColor: `${colors.warning}15`, color: colors.warning, borderColor: `${colors.warning}30` }}
                className="text-xs px-3 py-1 rounded-full border font-medium"
              >
                ⭐ Nổi bật
              </span>
            )}
            {discount > 0 && (
              <span
                style={{ backgroundColor: `${colors.error}15`, color: colors.error, borderColor: `${colors.error}30` }}
                className="text-xs px-3 py-1 rounded-full border font-medium"
              >
                Giảm {discount}%
              </span>
            )}
            <span
              style={{
                backgroundColor: product.status === "active" ? `${colors.success}15` : product.status === "coming_soon" ? `${colors.warning}15` : `${colors.error}15`,
                color: product.status === "active" ? colors.success : product.status === "coming_soon" ? colors.warning : colors.error,
                borderColor: product.status === "active" ? `${colors.success}30` : product.status === "coming_soon" ? `${colors.warning}30` : `${colors.error}30`,
              }}
              className="text-xs px-3 py-1 rounded-full border font-medium"
            >
              {statusCfg.text} {statusCfg.label}
            </span>
          </div>
        </div>

        {/* Right: Info */}
        <div className="flex flex-col gap-5">
          {/* Name */}
          <div>
            <h1 className="text-3xl font-light text-[#F5EDD6] leading-tight mb-2">
              {product.name}
            </h1>
            {product.reviewCount > 0 && (
              <StarRating rating={product.rating} count={product.reviewCount} color={colors.primary} />
            )}
          </div>

          {/* Price */}
          <div
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
            className="rounded-xl p-4 border"
          >
            <div className="flex items-baseline gap-3">
              <span style={{ color: colors.primary }} className="text-3xl font-bold">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <span style={{ color: `${colors.text}40` }} className="text-lg line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            {discount > 0 && (
              <p style={{ color: colors.success }} className="text-sm mt-1">
                Tiết kiệm {formatPrice(product.originalPrice - product.price)}
              </p>
            )}
            {/* Urgency: delivery estimate */}
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: `${colors.border}50` }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 7h9M7 4l3 3-3 3" stroke={colors.success} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 3h1.5a.5.5 0 01.5.5v7a.5.5 0 01-.5.5H11" stroke={colors.success} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span style={{ color: colors.success }} className="text-xs font-medium">
                Đặt hôm nay — giao trong 3–5 ngày làm việc
              </span>
            </div>
          </div>

          {/* Urgency: stock + viewers */}
          {product.status === "active" && selectedVariant.stock > 0 && selectedVariant.stock <= 10 && (
            <div
              style={{ backgroundColor: `${colors.warning}10`, borderColor: `${colors.warning}25` }}
              className="rounded-xl px-4 py-3 border flex items-center gap-3"
            >
              <div
                style={{ backgroundColor: `${colors.warning}20`, color: colors.warning }}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm"
              >
                !
              </div>
              <div>
                <p style={{ color: colors.warning }} className="text-xs font-semibold">
                  Chỉ còn {selectedVariant.stock} sản phẩm
                </p>
                <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${colors.warning}20`, width: 120 }}>
                  <div
                    style={{ width: `${Math.min((selectedVariant.stock / 20) * 100, 100)}%`, backgroundColor: colors.warning }}
                    className="h-full rounded-full"
                  />
                </div>
              </div>
              <p style={{ color: `${colors.text}40` }} className="text-xs ml-auto">
                {Math.floor(Math.random() * 8) + 3} người đang xem
              </p>
            </div>
          )}

          {/* Short Description */}
          <p className="text-sm text-[#F5EDD6]/50 leading-relaxed">
            {product.description}
          </p>

          {/* Variants */}
          {product.variants.length > 0 && (
            <div>
              <p style={{ color: `${colors.text}70` }} className="text-sm font-medium mb-2">
                Màu sắc / Loại: <span style={{ color: colors.text }}>{selectedVariant.name}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const isSelected = v.id === selectedVariant.id;
                  const outOfStock = v.stock === 0 && product.status !== "coming_soon";
                  return (
                    <button
                      key={v.id}
                      onClick={() => !outOfStock && setSelectedVariant(v)}
                      disabled={outOfStock}
                      style={
                        isSelected
                          ? {
                              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                              color: colors.background,
                              borderColor: "transparent",
                            }
                          : outOfStock
                          ? { backgroundColor: "transparent", color: `${colors.text}30`, borderColor: `${colors.border}`, cursor: "not-allowed" }
                          : { backgroundColor: "transparent", color: colors.text, borderColor: colors.border }
                      }
                      className="px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 relative"
                    >
                      {v.name}
                      {outOfStock && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span style={{ color: `${colors.text}30` }} className="text-xs">Hết</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedVariant && (
                <p style={{ color: `${colors.text}50` }} className="text-xs mt-2">
                  SKU: {selectedVariant.sku} · Còn {selectedVariant.stock} sản phẩm
                </p>
              )}
            </div>
          )}

          {/* Quantity + CTA */}
          <div className="flex items-center gap-3">
            {/* Quantity */}
            <div
              style={{ borderColor: colors.border, backgroundColor: colors.surface }}
              className="flex items-center rounded-xl border overflow-hidden"
            >
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                style={{ color: colors.text }}
                className="w-10 h-10 flex items-center justify-center text-lg hover:opacity-70 transition-opacity"
              >
                −
              </button>
              <span style={{ color: colors.text, borderColor: colors.border }} className="w-10 text-center text-sm font-medium border-x">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                style={{ color: colors.text }}
                className="w-10 h-10 flex items-center justify-center text-lg hover:opacity-70 transition-opacity"
              >
                +
              </button>
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              disabled={!isAvailable && !isComingSoon}
              style={
                isAvailable || isComingSoon
                  ? {
                      background: addedToCart
                        ? `linear-gradient(135deg, ${colors.success}, ${colors.success})`
                        : `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                      color: colors.background,
                    }
                  : { backgroundColor: colors.border, color: `${colors.text}40`, cursor: "not-allowed" }
              }
              className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-300"
            >
              {addedToCart
                ? "✓ Đã thêm vào giỏ"
                : isAvailable
                ? "Thêm vào giỏ hàng"
                : isComingSoon
                ? "Đặt trước ngay"
                : "Hết hàng"}
            </button>
          </div>

          {/* Buy Now button */}
          {(isAvailable || isComingSoon) && (
            <button
              onClick={handleBuyNow}
              style={{ borderColor: colors.primary, color: colors.primary }}
              className="w-full py-3 rounded-xl text-sm font-semibold border text-center hover:opacity-80 transition-opacity"
            >
              Mua ngay →
            </button>
          )}

          {/* Feature CTAs row */}
          {product.category !== "accessory" && (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/products/configure/${product.slug}`}
                style={{ backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30`, color: colors.primary }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border hover:opacity-80 transition-opacity"
              >
                ⚙️ Cấu hình 3D
              </Link>
              <Link
                href="/ar-try"
                style={{ backgroundColor: `${colors.secondary}12`, borderColor: `${colors.secondary}30`, color: colors.secondary }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border hover:opacity-80 transition-opacity"
              >
                📷 AR Thử tại nhà
              </Link>
            </div>
          )}

          {/* BNPL Badge */}
          {product.category !== "accessory" && (
            <BNPLBadge
              price={product.price}
              primary={colors.primary}
              bg={colors.background}
              text={colors.text}
              border={colors.border}
              surface={colors.surface}
            />
          )}

          {/* Contact CTA */}
          <Link
            href="/contact"
            style={{ color: `${colors.text}60`, borderColor: colors.border }}
            className="w-full py-3 rounded-xl text-sm border text-center hover:opacity-80 transition-opacity"
          >
            Liên hệ tư vấn
          </Link>

          {/* Stats row */}
          <div
            style={{ borderColor: colors.border }}
            className="grid grid-cols-3 border rounded-xl overflow-hidden"
          >
            {[
              { label: "Đã bán", value: product.totalSold.toLocaleString() },
              { label: "Lượt xem", value: product.viewCount.toLocaleString() },
              { label: "Đánh giá", value: product.reviewCount > 0 ? `${product.rating.toFixed(1)}★` : "—" },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  borderRightColor: colors.border,
                  backgroundColor: colors.surface,
                }}
                className={`py-3 text-center ${i < 2 ? "border-r" : ""}`}
              >
                <p style={{ color: colors.primary }} className="text-base font-bold">{s.value}</p>
                <p style={{ color: `${colors.text}50` }} className="text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Cart notification */}
          {addedToCart && (
            <div
              style={{ backgroundColor: `${colors.success}15`, borderColor: `${colors.success}30`, color: colors.success }}
              className="rounded-xl border p-3 text-sm flex items-center justify-between"
            >
              <span>✓ Đã thêm vào giỏ hàng!</span>
              <Link href="/cart" style={{ color: colors.primary }} className="font-semibold hover:opacity-80">
                Xem giỏ hàng →
              </Link>
            </div>
          )}
        </div>
      </div>
      </ScrollReveal>
      {/* Tabs: Mô tả / Tính năng / Thông số / Đánh giá */}
      <div className="mb-16">
        {/* Tab headers */}
        <div
          style={{ borderColor: colors.border }}
          className="flex border-b mb-8 overflow-x-auto"
        >
          {tabs.map(({ key, label }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={
                  isActive
                    ? { color: colors.primary, borderBottomColor: colors.primary }
                    : { color: `${colors.text}50`, borderBottomColor: "transparent" }
                }
                className="px-6 py-3 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap"
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Tab: Mô tả sản phẩm */}
        {activeTab === "description" && (
          <ProductLandingDescription product={product} colors={colors} onAction={handleDescriptionAction} />
        )}

        {/* Tab: Tính năng */}
        {activeTab === "features" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {product.features.map((f, i) => (
              <div
                key={i}
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                className="flex items-start gap-3 p-4 rounded-xl border"
              >
                <div
                  style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold mt-0.5"
                >
                  ✓
                </div>
                <p style={{ color: colors.text }} className="text-sm leading-relaxed">{f}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Thông số kỹ thuật */}
        {activeTab === "specs" && (
          <div
            style={{ borderColor: colors.border }}
            className="rounded-xl border overflow-hidden"
          >
            {Object.entries(product.specs).map(([key, value], i) => (
              <div
                key={i}
                style={{
                  backgroundColor: i % 2 === 0 ? colors.surface : colors.background,
                  borderBottomColor: colors.border,
                }}
                className="flex border-b last:border-b-0"
              >
                <div
                  style={{ color: `${colors.text}70`, borderRightColor: colors.border, backgroundColor: `${colors.primary}08` }}
                  className="w-48 px-5 py-3.5 text-sm font-medium border-r flex-shrink-0"
                >
                  {key}
                </div>
                <div style={{ color: colors.text }} className="px-5 py-3.5 text-sm flex-1">
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Đánh giá */}
        {activeTab === "reviews" && (
          <div>
            {product.reviews.length === 0 ? (
              <div
                style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                className="rounded-xl border p-10 text-center"
              >
                <p style={{ color: `${colors.text}40` }} className="text-sm">
                  Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Summary */}
                <div
                  style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                  className="rounded-xl border p-6 flex items-center gap-8"
                >
                  <div className="text-center">
                    <p style={{ color: colors.primary }} className="text-5xl font-bold">{product.rating.toFixed(1)}</p>
                    <StarRating rating={product.rating} count={product.reviewCount} color={colors.primary} />
                  </div>
                  <div className="flex-1">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = product.reviews.filter((r) => r.rating === star).length;
                      const pct = product.reviews.length > 0 ? (count / product.reviews.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2 mb-1">
                          <span style={{ color: `${colors.text}60` }} className="text-xs w-4">{star}★</span>
                          <div style={{ backgroundColor: colors.border }} className="flex-1 h-2 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${pct}%`, backgroundColor: colors.primary }}
                              className="h-full rounded-full transition-all"
                            />
                          </div>
                          <span style={{ color: `${colors.text}50` }} className="text-xs w-4">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Review cards */}
                {product.reviews.map((r) => (
                  <div
                    key={r.id}
                    style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                    className="rounded-xl border p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: colors.background }}
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                        >
                          {r.userName.charAt(0)}
                        </div>
                        <div>
                          <p style={{ color: colors.text }} className="text-sm font-semibold">{r.userName}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <svg key={s} width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path
                                    d="M6 1L7.35 4.22L10.9 4.64L8.45 6.97L9.09 10.5L6 8.77L2.91 10.5L3.55 6.97L1.1 4.64L4.65 4.22L6 1Z"
                                    fill={s <= r.rating ? colors.primary : "transparent"}
                                    stroke={s <= r.rating ? colors.primary : `${colors.primary}30`}
                                    strokeWidth="0.8"
                                  />
                                </svg>
                              ))}
                            </div>
                            {r.verified && (
                              <span style={{ color: colors.success }} className="text-xs">✓ Đã mua</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span style={{ color: `${colors.text}40` }} className="text-xs">
                        {new Date(r.date).toLocaleDateString("vi-VN")}
                      </span>
                    </div>
                    <p style={{ color: `${colors.text}80` }} className="text-sm leading-relaxed">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div>
          <ScrollReveal variant="fadeUp" delay={0}>
          <div className="flex items-center gap-3 mb-6">
            <span className="w-6 h-px bg-[#C9A84C]" />
            <h2 className="text-xl sm:text-2xl font-light text-[#F5EDD6]">
              Sản phẩm <span className="text-gold-gradient">liên quan</span>
            </h2>
          </div>
          </ScrollReveal>
          <StaggerReveal baseDelay={0} step={80} variant="fadeUp" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((p) => {
              const disc = p.originalPrice > p.price
                ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100)
                : 0;
              return (
                <Link
                  key={p.id}
                  href={`/products/${p.slug}`}
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  }}
                  className="rounded-xl border overflow-hidden hover:border-primary transition-all duration-200 hover:-translate-y-1 block"
                >
                  <div
                    style={{ background: `linear-gradient(135deg, ${colors.background}, ${colors.surface})`, aspectRatio: '1/1' }}
                    className="flex items-center justify-center overflow-hidden"
                  >
                    {p.coverImage ? (
                      <img src={p.coverImage} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <svg viewBox="0 0 160 100" width="120" height="75" fill="none">
                        <rect x="15" y="50" width="130" height="40" rx="5"
                          fill={`${colors.primary}12`} stroke={`${colors.primary}35`} strokeWidth="1.5" />
                        <rect x="20" y="40" width="120" height="45" rx="6"
                          fill={`${colors.primary}18`} stroke={`${colors.primary}40`} strokeWidth="1.5" />
                        <rect x="25" y="33" width="38" height="20" rx="8"
                          fill={`${colors.primary}25`} stroke={`${colors.primary}45`} strokeWidth="1" />
                        <rect x="10" y="22" width="15" height="50" rx="3"
                          fill={`${colors.primary}20`} stroke={`${colors.primary}40`} strokeWidth="1.5" />
                        <rect x="10" y="68" width="140" height="3" rx="1.5"
                          fill={colors.primary} opacity="0.6" />
                      </svg>
                    )}
                  </div>
                  <div className="p-4">
                    <p style={{ color: colors.text }} className="text-sm font-semibold line-clamp-1 mb-1">{p.name}</p>
                    <div className="flex items-center gap-2">
                      <span style={{ color: colors.primary }} className="text-sm font-bold">{formatPrice(p.price)}</span>
                      {disc > 0 && (
                        <span style={{ backgroundColor: `${colors.error}15`, color: colors.error }} className="text-xs px-1.5 py-0.5 rounded-full">
                          -{disc}%
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </StaggerReveal>
        </div>
      )}
    </div>
    <ProductDescriptionPopup
      popupId={descriptionPopupId}
      product={product}
      colors={colors}
      onClose={() => setDescriptionPopupId(null)}
    />
    </>
  );
}
