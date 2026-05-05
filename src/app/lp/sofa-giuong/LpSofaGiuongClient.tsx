"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import type { CrmProduct } from "@/lib/crm-types";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  isEditor: boolean;
  initialContent: Record<string, string>;
  sofaProducts?: CrmProduct[];
}

interface ConfigState {
  productId: string | null;
  size: string | null;
  hoc: "co_hoc" | "khong_hoc" | null;
  tayVin: "co_tay" | "khong_tay" | null;
  matTrang: "vai_canvas" | "da_pu" | "go_mdf" | "go_tu_nhien" | null;
  doDay: "7cm" | "10cm" | null;
  aoNem: "vai_lanh" | "da_pu_nem" | null;
}

type QuizStep = "product" | "size" | "hoc" | "tayVin" | "matTrang" | "doDay" | "aoNem" | "summary";

// ─── Price add-ons ────────────────────────────────────────────────────────────
const PRICE_ADDONS: Record<string, number> = {
  co_hoc: 700000,
  khong_hoc: 0,
  co_tay: 500000,
  khong_tay: 0,
  vai_canvas: 0,
  da_pu: 1200000,
  go_mdf: 0,
  go_tu_nhien: 1500000,
  "7cm": 0,
  "10cm": 800000,
  vai_lanh: 0,
  da_pu_nem: 600000,
};

const ADDON_LABELS: Record<string, string> = {
  co_hoc: "Có hộc để đồ",
  khong_hoc: "Không hộc",
  co_tay: "Có tay vịn",
  khong_tay: "Không tay vịn",
  vai_canvas: "Vải canvas",
  da_pu: "Da PU cao cấp",
  go_mdf: "Gỗ MDF chống ẩm",
  go_tu_nhien: "Gỗ tự nhiên",
  "7cm": "Nệm 7cm",
  "10cm": "Nệm 10cm",
  vai_lanh: "Áo nệm vải lanh",
  da_pu_nem: "Áo nệm da PU",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString("vi-VN") + " ₫";
}

function getBasePrice(product: CrmProduct, size: string | null): number {
  if (!size) return product.basePrice || 0;
  const sp = product.sizePricings?.find((s) => s.size === size);
  return sp ? sp.price : product.basePrice || 0;
}

function calcTotal(product: CrmProduct | null, cfg: ConfigState): number {
  if (!product) return 0;
  const base = getBasePrice(product, cfg.size);
  let addons = 0;
  if (cfg.hoc) addons += PRICE_ADDONS[cfg.hoc] || 0;
  if (cfg.tayVin) addons += PRICE_ADDONS[cfg.tayVin] || 0;
  if (cfg.matTrang) addons += PRICE_ADDONS[cfg.matTrang] || 0;
  if (cfg.doDay) addons += PRICE_ADDONS[cfg.doDay] || 0;
  if (cfg.aoNem) addons += PRICE_ADDONS[cfg.aoNem] || 0;
  return base + addons;
}

function getProductImages(product: CrmProduct): string[] {
  const imgs: string[] = [];
  if (product.imageUrl) imgs.push(product.imageUrl);
  if (product.imageAngle1) imgs.push(product.imageAngle1);
  if (product.imageAngle2) imgs.push(product.imageAngle2);
  if (product.imageScene) imgs.push(product.imageScene);
  if (product.imageSpec) imgs.push(product.imageSpec);
  return imgs.filter(Boolean);
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const GOLD = "#C9A84C";
const GOLD2 = "#E2C97E";
const BG = "#080600";
const SURFACE = "#111008";
const SURFACE2 = "#1A1500";
const TEXT = "#F5EDD6";
const MUTED = "#9CA3AF";
const BORDER = "rgba(201,168,76,0.2)";
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// ─── QUIZ STEPS CONFIG ────────────────────────────────────────────────────────
const STEPS: QuizStep[] = ["product", "size", "hoc", "tayVin", "matTrang", "doDay", "aoNem", "summary"];
const STEP_LABELS: Record<QuizStep, string> = {
  product: "Chọn mẫu",
  size: "Kích thước",
  hoc: "Hộc để đồ",
  tayVin: "Tay vịn",
  matTrang: "Mặt trang trí",
  doDay: "Độ dày nệm",
  aoNem: "Áo nệm",
  summary: "Xác nhận",
};

// ─── Editable block ───────────────────────────────────────────────────────────
function E({
  bk, def, as: Tag = "span", style, isEditor, content, onSave,
}: {
  bk: string; def: string; as?: keyof JSX.IntrinsicElements;
  style?: React.CSSProperties;
  isEditor: boolean; content: Record<string, string>;
  onSave: (key: string, val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(content[bk] ?? def);
  useEffect(() => { setVal(content[bk] ?? def); }, [content, bk, def]);
  if (!isEditor) return <Tag style={style}>{content[bk] ?? def}</Tag>;
  if (editing) {
    return (
      <Tag style={{ ...style, position: "relative", display: "inline-block" }}>
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          style={{ background: "#1a1a00", color: GOLD, border: `1px solid ${GOLD}`, borderRadius: 4, padding: "4px 8px", minWidth: 200, fontFamily: FONT, fontSize: "inherit" }}
          rows={3}
        />
        <button onClick={() => { onSave(bk, val); setEditing(false); }} style={{ marginLeft: 8, background: GOLD, color: BG, border: "none", borderRadius: 4, padding: "4px 12px", cursor: "pointer", fontSize: 12 }}>Lưu</button>
        <button onClick={() => setEditing(false)} style={{ marginLeft: 4, background: "transparent", color: MUTED, border: `1px solid ${MUTED}`, borderRadius: 4, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}>Huỷ</button>
      </Tag>
    );
  }
  return (
    <Tag
      style={{ ...style, cursor: "pointer", outline: `1px dashed ${GOLD}`, outlineOffset: 2 }}
      onClick={() => setEditing(true)}
      title="Click để chỉnh sửa"
    >
      {content[bk] ?? def}
    </Tag>
  );
}

// ─── OptionStep ───────────────────────────────────────────────────────────────
function OptionStep({
  title, subtitle, options, selected, onSelect,
}: {
  title: string;
  subtitle: string;
  options: { key: string; label: string; desc: string; price: number; icon: string; badge?: string }[];
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <div>
      <h3 style={{ color: GOLD, fontSize: 18, fontWeight: 700, marginBottom: 6, fontFamily: FONT }}>{title}</h3>
      <p style={{ color: MUTED, fontSize: 13, marginBottom: 20, fontFamily: FONT }}>{subtitle}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {options.map((opt) => {
          const isSelected = selected === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onSelect(opt.key)}
              style={{
                background: isSelected ? "rgba(201,168,76,0.15)" : SURFACE2,
                border: `2px solid ${isSelected ? GOLD : BORDER}`,
                borderRadius: 12,
                padding: "16px 18px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 14,
                textAlign: "left",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 28, flexShrink: 0 }}>{opt.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ color: TEXT, fontSize: 15, fontWeight: 600, fontFamily: FONT }}>{opt.label}</span>
                  {opt.badge && (
                    <span style={{ background: isSelected ? GOLD : "rgba(201,168,76,0.2)", color: isSelected ? BG : GOLD, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100, fontFamily: FONT }}>
                      {opt.badge}
                    </span>
                  )}
                </div>
                <div style={{ color: MUTED, fontSize: 12, fontFamily: FONT }}>{opt.desc}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {opt.price > 0 ? (
                  <div style={{ color: GOLD, fontSize: 14, fontWeight: 700, fontFamily: FONT }}>+{fmt(opt.price)}</div>
                ) : (
                  <div style={{ color: "#4ADE80", fontSize: 13, fontWeight: 600, fontFamily: FONT }}>Miễn phí</div>
                )}
              </div>
              {isSelected && (
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: GOLD, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ color: BG, fontSize: 14, fontWeight: 700 }}>✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tag component ────────────────────────────────────────────────────────────
function ChoiceTag({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, flexShrink: 0 }} />
      <span style={{ color: MUTED, fontSize: 11, fontFamily: FONT }}>{label}</span>
    </div>
  );
}

// ─── SpecTag ─────────────────────────────────────────────────────────────────
function SpecTag({ label }: { label: string }) {
  return (
    <span style={{ background: "rgba(201,168,76,0.1)", color: GOLD, fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, fontFamily: FONT, border: `1px solid rgba(201,168,76,0.2)` }}>
      {label}
    </span>
  );
}

// ─── SummaryStep ─────────────────────────────────────────────────────────────
function SummaryStep({
  product, cfg, total, onComplete,
}: {
  product: CrmProduct | null;
  cfg: ConfigState;
  total: number;
  onComplete: () => void;
}) {
  if (!product) return null;
  const items = [
    { label: "Mẫu sản phẩm", value: `${product.sku}` },
    { label: "Kích thước", value: cfg.size || "—" },
    { label: "Hộc để đồ", value: cfg.hoc ? ADDON_LABELS[cfg.hoc] : "—" },
    { label: "Tay vịn", value: cfg.tayVin ? ADDON_LABELS[cfg.tayVin] : "—" },
    { label: "Mặt trang trí", value: cfg.matTrang ? ADDON_LABELS[cfg.matTrang] : "—" },
    { label: "Độ dày nệm", value: cfg.doDay ? ADDON_LABELS[cfg.doDay] : "—" },
    { label: "Áo nệm", value: cfg.aoNem ? ADDON_LABELS[cfg.aoNem] : "—" },
  ];
  return (
    <div>
      <h3 style={{ color: GOLD, fontSize: 18, fontWeight: 700, marginBottom: 6, fontFamily: FONT }}>
        Cấu hình của bạn
      </h3>
      <p style={{ color: MUTED, fontSize: 13, marginBottom: 20, fontFamily: FONT }}>
        Xem lại và xác nhận để nhận tư vấn chính xác nhất
      </p>
      <div style={{ background: SURFACE2, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: i < items.length - 1 ? `1px solid ${BORDER}` : "none",
            }}
          >
            <span style={{ color: MUTED, fontSize: 13, fontFamily: FONT }}>{item.label}</span>
            <span style={{ color: TEXT, fontSize: 13, fontWeight: 600, fontFamily: FONT, textAlign: "right", maxWidth: "60%" }}>{item.value}</span>
          </div>
        ))}
      </div>
      <div style={{ background: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ color: MUTED, fontSize: 12, fontFamily: FONT, marginBottom: 4 }}>Tổng giá tham khảo</div>
          <div style={{ color: GOLD, fontSize: 28, fontWeight: 800, fontFamily: FONT }}>{fmt(total)}</div>
          <div style={{ color: MUTED, fontSize: 11, fontFamily: FONT, marginTop: 4 }}>Đã bao gồm giao hàng + lắp đặt miễn phí</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#4ADE80", fontSize: 12, fontWeight: 600, fontFamily: FONT }}>✓ Bảo hành 3 năm</div>
          <div style={{ color: "#4ADE80", fontSize: 12, fontWeight: 600, fontFamily: FONT, marginTop: 4 }}>✓ Đổi trả 30 ngày</div>
        </div>
      </div>
      <button
        onClick={onComplete}
        style={{
          width: "100%",
          background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`,
          color: BG,
          border: "none",
          borderRadius: 12,
          padding: "16px",
          fontSize: 16,
          fontWeight: 700,
          fontFamily: FONT,
          cursor: "pointer",
          letterSpacing: "0.05em",
        }}
      >
        ĐẶT HÀNG THEO CẤU HÌNH NÀY →
      </button>
      <div style={{ textAlign: "center", marginTop: 12, color: MUTED, fontSize: 12, fontFamily: FONT }}>
        🔒 Thông tin được bảo mật — Nhân viên tư vấn sẽ liên hệ trong 30 phút
      </div>
    </div>
  );
}

// ─── Quiz Funnel Popup ────────────────────────────────────────────────────────
function QuizFunnel({
  products, onClose, onComplete,
}: {
  products: CrmProduct[];
  onClose: () => void;
  onComplete: (cfg: ConfigState, product: CrmProduct) => void;
}) {
  const [step, setStep] = useState<QuizStep>("product");
  const [cfg, setCfg] = useState<ConfigState>({
    productId: null, size: null, hoc: null, tayVin: null,
    matTrang: null, doDay: null, aoNem: null,
  });
  const [imgIdx, setImgIdx] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const selectedProduct = products.find((p) => p.id === cfg.productId) || null;
  const images = selectedProduct ? getProductImages(selectedProduct) : [];
  const total = calcTotal(selectedProduct, cfg);
  const stepIdx = STEPS.indexOf(step);
  const progress = Math.round((stepIdx / (STEPS.length - 1)) * 100);

  const goNext = useCallback((nextStep: QuizStep) => {
    setIsAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setIsAnimating(false);
    }, 180);
  }, []);

  const goPrev = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setStep(STEPS[idx - 1]);
        setIsAnimating(false);
      }, 180);
    }
  }, [step]);

  function renderStep() {
    switch (step) {
      case "product":
        return (
          <div>
            <h3 style={{ color: GOLD, fontSize: 18, fontWeight: 700, marginBottom: 6, fontFamily: FONT }}>Chọn mẫu sofa giường</h3>
            <p style={{ color: MUTED, fontSize: 13, marginBottom: 20, fontFamily: FONT }}>Mỗi mẫu có thể tuỳ chỉnh thêm ở các bước tiếp theo</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {products.map((p) => {
                const minPrice = p.sizePricings?.length ? Math.min(...p.sizePricings.map((s) => s.price)) : p.basePrice;
                const isSelected = cfg.productId === p.id;
                return (
                  <button key={p.id} onClick={() => { setCfg((c) => ({ ...c, productId: p.id, size: null })); setImgIdx(0); goNext("size"); }}
                    style={{ background: isSelected ? "rgba(201,168,76,0.15)" : SURFACE2, border: `2px solid ${isSelected ? GOLD : BORDER}`, borderRadius: 12, padding: 0, cursor: "pointer", overflow: "hidden", textAlign: "left", transition: "all 0.2s" }}>
                    <div style={{ position: "relative", paddingTop: "65%", overflow: "hidden" }}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <div style={{ position: "absolute", inset: 0, background: SURFACE2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ color: MUTED, fontSize: 12 }}>Chưa có ảnh</span>
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ color: TEXT, fontSize: 13, fontWeight: 600, fontFamily: FONT, marginBottom: 4 }}>{p.sku}</div>
                      <div style={{ color: MUTED, fontSize: 11, fontFamily: FONT, marginBottom: 6, lineHeight: 1.4 }}>
                        {p.name.replace(/^Chia sẻ\s+/, "").substring(0, 55)}
                      </div>
                      <div style={{ color: GOLD, fontSize: 13, fontWeight: 700, fontFamily: FONT }}>Từ {fmt(minPrice || 0)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "size": {
        const sp = selectedProduct?.sizePricings || [];
        return (
          <div>
            <h3 style={{ color: GOLD, fontSize: 18, fontWeight: 700, marginBottom: 6, fontFamily: FONT }}>Chọn kích thước khung</h3>
            <p style={{ color: MUTED, fontSize: 13, marginBottom: 20, fontFamily: FONT }}>Kích thước ảnh hưởng đến giá cơ bản của sản phẩm</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sp.map((s) => {
                const isSelected = cfg.size === s.size;
                const sizeDesc = s.size.includes("0,9") ? "Phù hợp phòng nhỏ" : s.size.includes("1M2") ? "Tiêu chuẩn 1 người" : s.size.includes("1M5") ? "Rộng rãi, thoải mái" : "Đôi — tiện nghi tối đa";
                return (
                  <button key={s.size} onClick={() => { setCfg((c) => ({ ...c, size: s.size })); goNext("hoc"); }}
                    style={{ background: isSelected ? "rgba(201,168,76,0.15)" : SURFACE2, border: `2px solid ${isSelected ? GOLD : BORDER}`, borderRadius: 10, padding: "14px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.2s" }}>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ color: TEXT, fontSize: 15, fontWeight: 600, fontFamily: FONT }}>{s.size}</div>
                      <div style={{ color: MUTED, fontSize: 12, fontFamily: FONT, marginTop: 2 }}>{sizeDesc}</div>
                    </div>
                    <div style={{ color: GOLD, fontSize: 16, fontWeight: 700, fontFamily: FONT }}>{fmt(s.price)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      case "hoc":
        return (
          <OptionStep title="Hộc để đồ" subtitle="Hộc chứa chăn gối giúp tối ưu không gian phòng ngủ"
            options={[
              { key: "co_hoc", label: "Có hộc để đồ", desc: "Chứa chăn gối, tiết kiệm không gian", price: PRICE_ADDONS.co_hoc, icon: "📦", badge: "Phổ biến" },
              { key: "khong_hoc", label: "Không hộc", desc: "Thiết kế tối giản, dễ di chuyển", price: 0, icon: "✨" },
            ]}
            selected={cfg.hoc}
            onSelect={(v) => { setCfg((c) => ({ ...c, hoc: v as ConfigState["hoc"] })); goNext("tayVin"); }}
          />
        );

      case "tayVin":
        return (
          <OptionStep title="Tay vịn" subtitle="Tay vịn tăng thêm sự tiện nghi và sang trọng"
            options={[
              { key: "co_tay", label: "Có tay vịn", desc: "Tiện nghi, tựa lưng thoải mái", price: PRICE_ADDONS.co_tay, icon: "🛋️", badge: "Sang trọng" },
              { key: "khong_tay", label: "Không tay vịn", desc: "Gọn gàng, tiết kiệm diện tích", price: 0, icon: "📐" },
            ]}
            selected={cfg.tayVin}
            onSelect={(v) => { setCfg((c) => ({ ...c, tayVin: v as ConfigState["tayVin"] })); goNext("matTrang"); }}
          />
        );

      case "matTrang":
        return (
          <OptionStep title="Kiểu ốp mặt trang trí" subtitle="Chất liệu ốp quyết định vẻ ngoài và độ bền của sofa"
            options={[
              { key: "vai_canvas", label: "Vải canvas", desc: "Thoáng khí, bền, dễ vệ sinh", price: 0, icon: "🧵", badge: "Tiêu chuẩn" },
              { key: "da_pu", label: "Da PU cao cấp", desc: "Sang trọng, lau chùi dễ dàng", price: PRICE_ADDONS.da_pu, icon: "✨", badge: "Cao cấp" },
              { key: "go_mdf", label: "Gỗ MDF chống ẩm", desc: "Hiện đại, bền với môi trường ẩm", price: 0, icon: "🪵" },
              { key: "go_tu_nhien", label: "Gỗ tự nhiên", desc: "Vân gỗ đẹp, cao cấp, tự nhiên", price: PRICE_ADDONS.go_tu_nhien, icon: "🌿", badge: "Premium" },
            ]}
            selected={cfg.matTrang}
            onSelect={(v) => { setCfg((c) => ({ ...c, matTrang: v as ConfigState["matTrang"] })); goNext("doDay"); }}
          />
        );

      case "doDay":
        return (
          <OptionStep title="Độ dày nệm" subtitle="Nệm dày hơn mang lại giấc ngủ êm ái và hỗ trợ cột sống tốt hơn"
            options={[
              { key: "7cm", label: "Nệm 7cm", desc: "Đàn hồi tốt, phù hợp mọi vóc dáng", price: 0, icon: "💤", badge: "Tiêu chuẩn" },
              { key: "10cm", label: "Nệm 10cm", desc: "Êm ái vượt trội, hỗ trợ cột sống", price: PRICE_ADDONS["10cm"], icon: "🌙", badge: "Nâng cao" },
            ]}
            selected={cfg.doDay}
            onSelect={(v) => { setCfg((c) => ({ ...c, doDay: v as ConfigState["doDay"] })); goNext("aoNem"); }}
          />
        );

      case "aoNem":
        return (
          <OptionStep title="Áo nệm" subtitle="Áo nệm bảo vệ nệm và tăng thêm vẻ thẩm mỹ"
            options={[
              { key: "vai_lanh", label: "Áo nệm vải lanh", desc: "Thoáng mát, thấm hút tốt, dễ giặt", price: 0, icon: "🌾", badge: "Tiêu chuẩn" },
              { key: "da_pu_nem", label: "Áo nệm da PU", desc: "Sang trọng, lau chùi dễ, chống thấm", price: PRICE_ADDONS.da_pu_nem, icon: "💎", badge: "Cao cấp" },
            ]}
            selected={cfg.aoNem}
            onSelect={(v) => { setCfg((c) => ({ ...c, aoNem: v as ConfigState["aoNem"] })); goNext("summary"); }}
          />
        );

      case "summary":
        return (
          <SummaryStep product={selectedProduct} cfg={cfg} total={total}
            onComplete={() => selectedProduct && onComplete(cfg, selectedProduct)}
          />
        );

      default:
        return null;
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, width: "100%", maxWidth: 900, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", fontFamily: FONT, marginBottom: 4 }}>
              THIẾT KẾ CÁ NHÂN HOÁ — BƯỚC {stepIdx + 1}/{STEPS.length}
            </div>
            <div style={{ color: TEXT, fontSize: 18, fontWeight: 700, fontFamily: FONT }}>{STEP_LABELS[step]}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: SURFACE2, flexShrink: 0 }}>
          <div style={{ height: "100%", background: `linear-gradient(90deg, ${GOLD}, ${GOLD2})`, width: `${progress}%`, transition: "width 0.4s ease" }} />
        </div>

        {/* Step pills */}
        <div style={{ display: "flex", gap: 6, padding: "12px 24px", overflowX: "auto", flexShrink: 0, borderBottom: `1px solid ${BORDER}` }}>
          {STEPS.filter((s) => s !== "summary").map((s, i) => {
            const done = i < stepIdx;
            const active = s === step;
            return (
              <div key={s} style={{ padding: "4px 12px", borderRadius: 100, fontSize: 11, fontWeight: 600, fontFamily: FONT, whiteSpace: "nowrap", background: active ? GOLD : done ? "rgba(201,168,76,0.2)" : "transparent", color: active ? BG : done ? GOLD : MUTED, border: `1px solid ${active ? GOLD : done ? "rgba(201,168,76,0.4)" : BORDER}`, transition: "all 0.2s" }}>
                {done ? "✓ " : ""}{STEP_LABELS[s]}
              </div>
            );
          })}
        </div>

        {/* Main content */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>
          {/* Left: Product image panel */}
          {selectedProduct && images.length > 0 && (
            <div style={{ width: 260, flexShrink: 0, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", background: SURFACE2 }}>
              <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                <img key={imgIdx} src={images[imgIdx % images.length]} alt={selectedProduct.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.3s" }} />
                {images.length > 1 && (
                  <div style={{ position: "absolute", bottom: 10, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6 }}>
                    {images.map((_, i) => (
                      <button key={i} onClick={() => setImgIdx(i)}
                        style={{ width: i === imgIdx % images.length ? 20 : 8, height: 8, borderRadius: 4, background: i === imgIdx % images.length ? GOLD : "rgba(255,255,255,0.4)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.2s" }} />
                    ))}
                  </div>
                )}
              </div>
              {/* Price display */}
              <div style={{ padding: "16px", borderTop: `1px solid ${BORDER}` }}>
                <div style={{ color: MUTED, fontSize: 11, fontFamily: FONT, marginBottom: 4 }}>Giá tham khảo</div>
                <div style={{ color: GOLD, fontSize: 22, fontWeight: 800, fontFamily: FONT }}>{total > 0 ? fmt(total) : "—"}</div>
                <div style={{ color: MUTED, fontSize: 11, fontFamily: FONT, marginTop: 4 }}>Miễn phí giao hàng + lắp đặt</div>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                  {cfg.size && <ChoiceTag label={cfg.size} />}
                  {cfg.hoc && <ChoiceTag label={ADDON_LABELS[cfg.hoc]} />}
                  {cfg.tayVin && <ChoiceTag label={ADDON_LABELS[cfg.tayVin]} />}
                  {cfg.matTrang && <ChoiceTag label={ADDON_LABELS[cfg.matTrang]} />}
                  {cfg.doDay && <ChoiceTag label={ADDON_LABELS[cfg.doDay]} />}
                  {cfg.aoNem && <ChoiceTag label={ADDON_LABELS[cfg.aoNem]} />}
                </div>
              </div>
            </div>
          )}

          {/* Right: Step content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "24px", opacity: isAnimating ? 0 : 1, transform: isAnimating ? "translateX(16px)" : "translateX(0)", transition: "opacity 0.18s, transform 0.18s" }}>
            {renderStep()}
          </div>
        </div>

        {/* Footer nav */}
        {step !== "product" && step !== "summary" && (
          <div style={{ padding: "16px 24px", borderTop: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <button onClick={goPrev} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontFamily: FONT, fontSize: 14 }}>← Quay lại</button>
            <div style={{ color: MUTED, fontSize: 12, fontFamily: FONT }}>Chọn một tuỳ chọn để tiếp tục</div>
          </div>
        )}
        {step === "product" && (
          <div style={{ padding: "12px 24px", borderTop: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <div style={{ color: MUTED, fontSize: 12, fontFamily: FONT, textAlign: "center" }}>Click vào mẫu để bắt đầu thiết kế cá nhân hoá</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Order Form Modal ─────────────────────────────────────────────────────────
function OrderModal({
  product, cfg, total, onClose,
}: {
  product: CrmProduct;
  cfg: ConfigState;
  total: number;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ name: "", phone: "", note: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setSubmitting(true);
    try {
      const configSummary = [
        `Mẫu: ${product.sku}`,
        `Kích thước: ${cfg.size}`,
        `Hộc: ${cfg.hoc ? ADDON_LABELS[cfg.hoc] : "—"}`,
        `Tay vịn: ${cfg.tayVin ? ADDON_LABELS[cfg.tayVin] : "—"}`,
        `Mặt trang trí: ${cfg.matTrang ? ADDON_LABELS[cfg.matTrang] : "—"}`,
        `Nệm: ${cfg.doDay ? ADDON_LABELS[cfg.doDay] : "—"}`,
        `Áo nệm: ${cfg.aoNem ? ADDON_LABELS[cfg.aoNem] : "—"}`,
        `Tổng: ${fmt(total)}`,
      ].join(" | ");
      await fetch("/api/lp/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.name,
          phone: form.phone,
          message: `[Cấu hình cá nhân hoá] ${configSummary}${form.note ? " | Ghi chú: " + form.note : ""}`,
          landingPage: "sofa-giuong",
          utmSource: "quiz_funnel",
          utmCampaign: "b2c-sofa-giuong",
        }),
      });
      setDone(true);
    } catch {
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, width: "100%", maxWidth: 480, padding: "32px", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h3 style={{ color: GOLD, fontSize: 22, fontWeight: 700, fontFamily: FONT, marginBottom: 8 }}>Đặt hàng thành công!</h3>
            <p style={{ color: MUTED, fontSize: 14, fontFamily: FONT, marginBottom: 24 }}>Nhân viên SmartFurni sẽ liên hệ với bạn trong vòng 30 phút để xác nhận đơn hàng.</p>
            <button onClick={onClose} style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, color: BG, border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: "pointer" }}>Đóng</button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h3 style={{ color: GOLD, fontSize: 20, fontWeight: 700, fontFamily: FONT, marginBottom: 4 }}>Xác nhận đặt hàng</h3>
                <div style={{ color: MUTED, fontSize: 13, fontFamily: FONT }}>Tổng: <span style={{ color: GOLD, fontWeight: 700 }}>{fmt(total)}</span></div>
              </div>
              <button onClick={onClose} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ color: MUTED, fontSize: 12, fontFamily: FONT, display: "block", marginBottom: 6 }}>Họ và tên *</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nguyễn Văn A" required
                  style={{ width: "100%", background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", color: TEXT, fontFamily: FONT, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ color: MUTED, fontSize: 12, fontFamily: FONT, display: "block", marginBottom: 6 }}>Số điện thoại *</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0912 345 678" required
                  style={{ width: "100%", background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", color: TEXT, fontFamily: FONT, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ color: MUTED, fontSize: 12, fontFamily: FONT, display: "block", marginBottom: 6 }}>Ghi chú thêm (tuỳ chọn)</label>
                <textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Màu sắc mong muốn, địa chỉ giao hàng..." rows={3}
                  style={{ width: "100%", background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", color: TEXT, fontFamily: FONT, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <button type="submit" disabled={submitting}
                style={{ width: "100%", background: submitting ? MUTED : `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, color: BG, border: "none", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: submitting ? "not-allowed" : "pointer" }}>
                {submitting ? "Đang gửi..." : "XÁC NHẬN ĐẶT HÀNG →"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LpSofaGiuongClient({ isEditor, initialContent, sofaProducts = [] }: Props) {
  const [content, setContent] = useState<Record<string, string>>(initialContent);
  const [showQuiz, setShowQuiz] = useState(false);
  const [finalCfg, setFinalCfg] = useState<ConfigState | null>(null);
  const [finalProduct, setFinalProduct] = useState<CrmProduct | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", note: "" });
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadDone, setLeadDone] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-rotate hero image
  useEffect(() => {
    if (sofaProducts.length < 2) return;
    const id = setInterval(() => setActiveImg((i) => (i + 1) % Math.min(sofaProducts.length, 4)), 3500);
    return () => clearInterval(id);
  }, [sofaProducts.length]);

  async function saveBlock(key: string, val: string) {
    setContent((c) => ({ ...c, [key]: val }));
    await fetch("/api/admin/lp-content", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "sofa-giuong", blockKey: key, content: val }),
    });
  }

  function handleQuizComplete(cfg: ConfigState, product: CrmProduct) {
    setFinalCfg(cfg);
    setFinalProduct(product);
    setShowQuiz(false);
    setShowOrderModal(true);
  }

  async function handleLeadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!leadForm.name || !leadForm.phone) return;
    setLeadSubmitting(true);
    try {
      await fetch("/api/lp/submit-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: leadForm.name,
          phone: leadForm.phone,
          message: leadForm.note,
          landingPage: "sofa-giuong",
          utmSource: "lp_form",
          utmCampaign: "b2c-sofa-giuong",
        }),
      });
      setLeadDone(true);
    } catch {
      setLeadDone(true);
    } finally {
      setLeadSubmitting(false);
    }
  }

  const EB = useCallback((props: { bk: string; def: string; as?: keyof JSX.IntrinsicElements; style?: React.CSSProperties }) => (
    <E {...props} isEditor={isEditor} content={content} onSave={saveBlock} />
  ), [isEditor, content]);

  const featuredProducts = sofaProducts.slice(0, 4);

  return (
    <div style={{ background: BG, color: TEXT, fontFamily: FONT, overflowX: "hidden" }}>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, transition: "all 0.3s ease", background: navScrolled ? "rgba(8,6,0,0.95)" : "transparent", backdropFilter: navScrolled ? "blur(12px)" : "none", borderBottom: navScrolled ? `1px solid ${BORDER}` : "none" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="https://smartfurni.com.vn" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${GOLD2}, ${GOLD})`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke={BG} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="9,22 9,12 15,12 15,22" stroke={BG} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ color: TEXT, fontWeight: 700, fontSize: 16, letterSpacing: "0.05em" }}>SMARTFURNI</span>
          </a>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            {[["#products", "Mẫu sản phẩm"], ["#features", "Tính năng"], ["#configurator", "Thiết kế"], ["#order", "Đặt hàng"]].map(([href, label]) => (
              <a key={href} href={href} style={{ color: MUTED, fontSize: 13, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = GOLD)} onMouseLeave={(e) => (e.currentTarget.style.color = MUTED)}>
                {label}
              </a>
            ))}
            <button onClick={() => setShowQuiz(true)} style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, color: BG, border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em" }}>
              THIẾT KẾ NGAY
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0A0800 0%, #080600 50%, #0D0A00 100%)" }} />
        <div style={{ position: "absolute", top: "20%", right: "5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "120px 24px 80px", position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(201,168,76,0.1)", border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 100, padding: "6px 14px", marginBottom: 24 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD }} />
              <span style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", fontFamily: FONT }}>
                THIẾT KẾ CÁ NHÂN HOÁ — SOFA GIƯỜNG SMARTFURNI
              </span>
            </div>

            <h1 style={{ fontSize: "clamp(32px, 4vw, 54px)", fontWeight: 800, lineHeight: 1.15, marginBottom: 20, color: TEXT }}>
              <EB bk="hero_title1" def="Sofa Giường" />
              <br />
              <span style={{ color: GOLD }}>
                <EB bk="hero_title2" def="Theo Đúng Ý Bạn" />
              </span>
            </h1>

            <p style={{ color: MUTED, fontSize: "clamp(14px, 1.5vw, 17px)", lineHeight: 1.7, marginBottom: 32, maxWidth: 480 }}>
              <EB bk="hero_desc" def="Chọn mẫu, thiết kế từng chi tiết — kích thước, hộc, tay vịn, chất liệu, nệm. Khung thép mạ kẽm bền vững, giao hàng & lắp đặt miễn phí toàn quốc." />
            </p>

            <div style={{ display: "flex", gap: 32, marginBottom: 36 }}>
              {[{ val: `${sofaProducts.length || 6}+`, label: "Mẫu sofa giường" }, { val: "3 năm", label: "Bảo hành khung" }, { val: "Miễn phí", label: "Giao + lắp đặt" }].map((s, i) => (
                <div key={i}>
                  <div style={{ color: GOLD, fontSize: 22, fontWeight: 800, fontFamily: FONT }}>{s.val}</div>
                  <div style={{ color: MUTED, fontSize: 11, fontFamily: FONT, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={() => setShowQuiz(true)} style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, color: BG, border: "none", borderRadius: 10, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em", boxShadow: `0 4px 20px rgba(201,168,76,0.3)` }}>
                THIẾT KẾ NGAY →
              </button>
              <a href="#products" style={{ background: "transparent", color: TEXT, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 24px", fontSize: 14, fontWeight: 600, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                Xem mẫu sản phẩm ↓
              </a>
            </div>
          </div>

          {/* Hero image */}
          <div style={{ position: "relative" }}>
            {featuredProducts.length > 0 && (
              <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", aspectRatio: "4/3", background: SURFACE2 }}>
                <img src={featuredProducts[activeImg % featuredProducts.length]?.imageUrl || ""} alt="Sofa giường SmartFurni"
                  style={{ width: "100%", height: "100%", objectFit: "cover", transition: "opacity 0.5s" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)" }} />
                <div style={{ position: "absolute", bottom: 16, left: 16, right: 16 }}>
                  <div style={{ color: TEXT, fontSize: 14, fontWeight: 600, fontFamily: FONT, marginBottom: 8 }}>
                    {featuredProducts[activeImg % featuredProducts.length]?.sku}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {featuredProducts.map((_, i) => (
                      <button key={i} onClick={() => setActiveImg(i)}
                        style={{ width: i === activeImg % featuredProducts.length ? 24 : 8, height: 8, borderRadius: 4, background: i === activeImg % featuredProducts.length ? GOLD : "rgba(255,255,255,0.4)", border: "none", cursor: "pointer", padding: 0, transition: "all 0.2s" }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div style={{ position: "absolute", top: -12, right: -12, background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, borderRadius: 12, padding: "10px 16px", textAlign: "center", boxShadow: "0 8px 24px rgba(201,168,76,0.3)" }}>
              <div style={{ color: BG, fontSize: 18, fontWeight: 800, fontFamily: FONT }}>Từ</div>
              <div style={{ color: BG, fontSize: 13, fontWeight: 700, fontFamily: FONT }}>2.990.000 ₫</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT GALLERY ──────────────────────────────────────────────────── */}
      <section id="products" style={{ padding: "80px 24px", background: SURFACE }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", fontFamily: FONT, marginBottom: 12 }}>DANH MỤC SẢN PHẨM</div>
            <h2 style={{ color: TEXT, fontSize: "clamp(24px, 3vw, 38px)", fontWeight: 700, fontFamily: FONT, marginBottom: 12 }}>
              <EB bk="products_title" def="Chọn Mẫu Sofa Giường" />
            </h2>
            <p style={{ color: MUTED, fontSize: 15, fontFamily: FONT, maxWidth: 500, margin: "0 auto" }}>
              <EB bk="products_subtitle" def="Mỗi mẫu đều có thể tuỳ chỉnh hoàn toàn theo sở thích cá nhân của bạn" />
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {sofaProducts.map((p) => {
              const minPrice = p.sizePricings?.length ? Math.min(...p.sizePricings.map((s) => s.price)) : p.basePrice;
              return (
                <div key={p.id}
                  style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = `0 12px 40px rgba(201,168,76,0.15)`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                  onClick={() => setShowQuiz(true)}>
                  <div style={{ position: "relative", paddingTop: "70%", overflow: "hidden" }}>
                    {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 60%)" }} />
                    <div style={{ position: "absolute", top: 12, left: 12, background: GOLD, color: BG, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100, fontFamily: FONT }}>{p.sku}</div>
                  </div>
                  <div style={{ padding: "16px" }}>
                    <h3 style={{ color: TEXT, fontSize: 14, fontWeight: 600, fontFamily: FONT, marginBottom: 6, lineHeight: 1.4 }}>
                      {p.name.replace(/^Chia sẻ\s+/, "").substring(0, 70)}
                    </h3>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      {p.specs["Chất liệu vải"] && <SpecTag label={p.specs["Chất liệu vải"].substring(0, 20)} />}
                      {p.specs["Chất liệu gỗ"] && <SpecTag label={p.specs["Chất liệu gỗ"].substring(0, 20)} />}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ color: MUTED, fontSize: 11, fontFamily: FONT }}>Từ</div>
                        <div style={{ color: GOLD, fontSize: 18, fontWeight: 800, fontFamily: FONT }}>{fmt(minPrice || 0)}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setShowQuiz(true); }}
                        style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, color: BG, border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                        Thiết kế →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CONFIGURATOR CTA ─────────────────────────────────────────────────── */}
      <section id="configurator" style={{ padding: "80px 24px", background: BG }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ background: "linear-gradient(135deg, #1A1000 0%, #0D0800 100%)", border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 24, padding: "clamp(32px, 5vw, 60px)", textAlign: "center" }}>
            <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", fontFamily: FONT, marginBottom: 16 }}>QUIZ FUNNEL CONFIGURATOR</div>
            <h2 style={{ color: TEXT, fontSize: "clamp(24px, 3vw, 40px)", fontWeight: 700, fontFamily: FONT, marginBottom: 16, lineHeight: 1.3 }}>
              <EB bk="config_title" def="Thiết Kế Sofa Giường Theo Đúng Ý Bạn" />
            </h2>
            <p style={{ color: MUTED, fontSize: "clamp(14px, 1.5vw, 16px)", fontFamily: FONT, marginBottom: 32, maxWidth: 600, margin: "0 auto 32px" }}>
              <EB bk="config_desc" def="Chỉ 7 bước đơn giản — chọn mẫu, kích thước, hộc, tay vịn, chất liệu ốp, độ dày nệm, áo nệm. Giá nhảy realtime theo từng lựa chọn." />
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", marginBottom: 36 }}>
              {["Chọn mẫu", "Kích thước", "Hộc đồ", "Tay vịn", "Chất liệu", "Nệm", "Áo nệm"].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `rgba(201,168,76,0.15)`, border: `1px solid rgba(201,168,76,0.4)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>{i + 1}</span>
                  </div>
                  <span style={{ color: MUTED, fontSize: 12, fontFamily: FONT }}>{s}</span>
                  {i < 6 && <span style={{ color: BORDER, fontSize: 16 }}>→</span>}
                </div>
              ))}
            </div>
            <button onClick={() => setShowQuiz(true)} style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, color: BG, border: "none", borderRadius: 12, padding: "16px 40px", fontSize: 16, fontWeight: 700, cursor: "pointer", letterSpacing: "0.05em", boxShadow: `0 8px 32px rgba(201,168,76,0.3)` }}>
              BẮT ĐẦU THIẾT KẾ NGAY →
            </button>
            <div style={{ color: MUTED, fontSize: 12, fontFamily: FONT, marginTop: 12 }}>Miễn phí tư vấn — Nhân viên liên hệ trong 30 phút</div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "80px 24px", background: SURFACE }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", fontFamily: FONT, marginBottom: 12 }}>TẠI SAO CHỌN SMARTFURNI</div>
            <h2 style={{ color: TEXT, fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 700, fontFamily: FONT }}>
              <EB bk="features_title" def="Chất Lượng Vượt Trội, Giá Trị Xứng Đáng" />
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
            {[
              { icon: "🏗️", title: "Khung Thép Mạ Kẽm", desc: "Chống gỉ sét, chịu tải 800kg, bền vững theo thời gian" },
              { icon: "🎨", title: "Tuỳ Chỉnh Hoàn Toàn", desc: "7 bước cá nhân hoá — từ mẫu đến từng chi tiết nhỏ nhất" },
              { icon: "💤", title: "Nệm Đàn Hồi Cao", desc: "Mút ép đàn hồi cao 7–10cm, hỗ trợ cột sống, ngủ ngon sâu giấc" },
              { icon: "📦", title: "Hộc Chứa Đồ Thông Minh", desc: "Tối ưu không gian phòng ngủ, chứa chăn gối gọn gàng" },
              { icon: "🛡️", title: "Bảo Hành 3 Năm", desc: "Bảo hành toàn bộ khung và cơ cấu, hỗ trợ kỹ thuật 24/7" },
              { icon: "🚚", title: "Giao Hàng Toàn Quốc", desc: "Miễn phí giao hàng và lắp đặt tại nhà trên toàn quốc" },
            ].map((f, i) => (
              <div key={i} style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ color: TEXT, fontSize: 15, fontWeight: 700, fontFamily: FONT, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: MUTED, fontSize: 13, fontFamily: FONT, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ORDER FORM ───────────────────────────────────────────────────────── */}
      <section id="order" style={{ padding: "80px 24px", background: BG }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", fontFamily: FONT, marginBottom: 12 }}>ĐẶT HÀNG NGAY</div>
            <h2 style={{ color: TEXT, fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 700, fontFamily: FONT, marginBottom: 12 }}>
              <EB bk="order_title" def="Nhận Tư Vấn Miễn Phí" />
            </h2>
            <p style={{ color: MUTED, fontSize: 14, fontFamily: FONT }}>
              <EB bk="order_subtitle" def="Để lại thông tin — nhân viên SmartFurni sẽ liên hệ trong 30 phút" />
            </p>
          </div>

          {leadDone ? (
            <div style={{ textAlign: "center", padding: "40px", background: SURFACE, borderRadius: 20, border: `1px solid ${BORDER}` }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h3 style={{ color: GOLD, fontSize: 20, fontWeight: 700, fontFamily: FONT, marginBottom: 8 }}>Cảm ơn bạn!</h3>
              <p style={{ color: MUTED, fontSize: 14, fontFamily: FONT }}>Nhân viên SmartFurni sẽ liên hệ với bạn trong vòng 30 phút.</p>
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "32px" }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: MUTED, fontSize: 12, fontFamily: FONT, display: "block", marginBottom: 6 }}>Họ và tên *</label>
                <input type="text" value={leadForm.name} onChange={(e) => setLeadForm((f) => ({ ...f, name: e.target.value }))} placeholder="Nguyễn Văn A" required
                  style={{ width: "100%", background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 16px", color: TEXT, fontFamily: FONT, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: MUTED, fontSize: 12, fontFamily: FONT, display: "block", marginBottom: 6 }}>Số điện thoại *</label>
                <input type="tel" value={leadForm.phone} onChange={(e) => setLeadForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0912 345 678" required
                  style={{ width: "100%", background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 16px", color: TEXT, fontFamily: FONT, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ color: MUTED, fontSize: 12, fontFamily: FONT, display: "block", marginBottom: 6 }}>Ghi chú (tuỳ chọn)</label>
                <textarea value={leadForm.note} onChange={(e) => setLeadForm((f) => ({ ...f, note: e.target.value }))} placeholder="Mẫu quan tâm, kích thước cần, màu sắc..." rows={3}
                  style={{ width: "100%", background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 16px", color: TEXT, fontFamily: FONT, fontSize: 14, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <button type="submit" disabled={leadSubmitting}
                style={{ width: "100%", background: leadSubmitting ? MUTED : `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, color: BG, border: "none", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 700, fontFamily: FONT, cursor: leadSubmitting ? "not-allowed" : "pointer", letterSpacing: "0.05em" }}>
                {leadSubmitting ? "Đang gửi..." : "NHẬN TƯ VẤN MIỄN PHÍ →"}
              </button>
              <div style={{ textAlign: "center", marginTop: 12, color: MUTED, fontSize: 12, fontFamily: FONT }}>🔒 Thông tin được bảo mật tuyệt đối</div>
            </form>
          )}

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <div style={{ color: MUTED, fontSize: 13, fontFamily: FONT, marginBottom: 12 }}>— hoặc —</div>
            <button onClick={() => setShowQuiz(true)} style={{ background: "transparent", color: GOLD, border: `1px solid rgba(201,168,76,0.4)`, borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
              Thiết kế cá nhân hoá trước →
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#050400", borderTop: `1px solid ${BORDER}`, padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ color: TEXT, fontWeight: 700, fontSize: 16, fontFamily: FONT, marginBottom: 8 }}>SMARTFURNI</div>
            <div style={{ color: MUTED, fontSize: 13, fontFamily: FONT, lineHeight: 1.6 }}>Sofa giường cá nhân hoá<br />Khung thép mạ kẽm bền vững</div>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <a href="tel:02871220818" style={{ color: MUTED, fontSize: 13, textDecoration: "none", fontFamily: FONT }}>📞 028.7122.0818</a>
            <a href="https://zalo.me/0918326552" style={{ color: MUTED, fontSize: 13, textDecoration: "none", fontFamily: FONT }}>💬 Zalo 0918.326.552</a>
            <a href="mailto:info@smartfurni.vn" style={{ color: MUTED, fontSize: 13, textDecoration: "none", fontFamily: FONT }}>✉️ info@smartfurni.vn</a>
          </div>
        </div>
        <div style={{ maxWidth: 1100, margin: "24px auto 0", borderTop: `1px solid ${BORDER}`, paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ color: MUTED, fontSize: 12, fontFamily: FONT }}>© 2026 SmartFurni. All rights reserved.</div>
          <div style={{ display: "flex", gap: 16 }}>
            {["Chính sách bảo mật", "Điều khoản sử dụng", "Chính sách bảo hành"].map((t) => (
              <a key={t} href="#" style={{ color: MUTED, fontSize: 12, textDecoration: "none", fontFamily: FONT }}>{t}</a>
            ))}
          </div>
        </div>
      </footer>

      {/* ── STICKY CTA ──────────────────────────────────────────────────────── */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 200, display: "flex", flexDirection: "column", gap: 10 }}>
        <a href="https://zalo.me/0918326552" target="_blank" rel="noopener noreferrer"
          style={{ width: 48, height: 48, borderRadius: "50%", background: "#0068FF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,104,255,0.4)", textDecoration: "none" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </a>
        <button onClick={() => setShowQuiz(true)} style={{ background: `linear-gradient(135deg, ${GOLD}, ${GOLD2})`, color: BG, border: "none", borderRadius: 12, padding: "10px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap", boxShadow: `0 4px 16px rgba(201,168,76,0.4)` }}>
          THIẾT KẾ NGAY
        </button>
      </div>

      {/* ── QUIZ MODAL ──────────────────────────────────────────────────────── */}
      {showQuiz && (
        <QuizFunnel products={sofaProducts} onClose={() => setShowQuiz(false)} onComplete={handleQuizComplete} />
      )}

      {/* ── ORDER MODAL ─────────────────────────────────────────────────────── */}
      {showOrderModal && finalProduct && finalCfg && (
        <OrderModal product={finalProduct} cfg={finalCfg} total={calcTotal(finalProduct, finalCfg)} onClose={() => setShowOrderModal(false)} />
      )}
    </div>
  );
}
