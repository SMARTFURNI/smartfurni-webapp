"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import FlipBook from "@/components/catalogue/FlipBook";
import type { CatalogueWithPages, CataloguePage } from "@/lib/catalogue-store";

interface Props {
  catalogue: CatalogueWithPages;
}

type EditingPage = Partial<CataloguePage> & { isNew?: boolean };

const PAGE_TYPES = [
  { value: "cover", label: "Bìa trước", icon: "📕" },
  { value: "content", label: "Nội dung", icon: "📄" },
  { value: "product", label: "Sản phẩm", icon: "📦" },
  { value: "back-cover", label: "Bìa sau", icon: "📗" },
] as const;

const BG_PRESETS = [
  "#0a0800", "#1a1a1a", "#0d1117", "#1a0a00",
  "#0a1a0a", "#0a0a1a", "#1a1a0a", "#ffffff",
  "#f5f0e8", "#e8f0f5", "#C9A84C", "#2d1b00",
];

export default function AdminCatalogueEditorClient({ catalogue: initialCatalogue }: Props) {
  const router = useRouter();
  const [catalogue, setCatalogue] = useState<CatalogueWithPages>(initialCatalogue);
  const [activeTab, setActiveTab] = useState<"pages" | "settings" | "preview">("pages");
  const [editingPage, setEditingPage] = useState<EditingPage | null>(null);
  const [savingPage, setSavingPage] = useState(false);
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState<{
    title: string;
    description: string;
    coverImageUrl: string;
    status: "published" | "draft";
  }>({
    title: catalogue.title,
    description: catalogue.description,
    coverImageUrl: catalogue.coverImageUrl,
    status: catalogue.status,
  });

  // ─── Settings ────────────────────────────────────────────────────────────────

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      await fetch("/api/admin/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-catalogue",
          id: catalogue.id,
          ...settings,
        }),
      });
      setCatalogue(prev => ({ ...prev, ...settings }));
    } finally {
      setSavingSettings(false);
    }
  }

  // ─── Page CRUD ────────────────────────────────────────────────────────────────

  function openNewPage() {
    setEditingPage({
      isNew: true,
      type: "content",
      title: "",
      subtitle: "",
      imageUrl: "",
      bgColor: "#1a1a1a",
      textColor: "#ffffff",
      content: "",
      badge: "",
    });
  }

  function openEditPage(page: CataloguePage) {
    setEditingPage({ ...page, isNew: false });
  }

  async function handleSavePage() {
    if (!editingPage) return;
    setSavingPage(true);
    try {
      if (editingPage.isNew) {
        const res = await fetch("/api/admin/catalogue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add-page",
            catalogueId: catalogue.id,
            ...editingPage,
          }),
        });
        if (res.ok) {
          const newPage = await res.json();
          setCatalogue(prev => ({
            ...prev,
            pages: [...prev.pages, newPage],
            pageCount: prev.pageCount + 1,
          }));
        }
      } else {
        await fetch("/api/admin/catalogue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-page",
            pageId: editingPage.id,
            ...editingPage,
          }),
        });
        setCatalogue(prev => ({
          ...prev,
          pages: prev.pages.map(p => p.id === editingPage.id ? { ...p, ...editingPage } as CataloguePage : p),
        }));
      }
      setEditingPage(null);
    } finally {
      setSavingPage(false);
    }
  }

  async function handleDeletePage(page: CataloguePage) {
    if (!confirm(`Xóa trang "${page.title || `Trang ${page.pageNumber}`}"?`)) return;
    setDeletingPageId(page.id);
    try {
      await fetch("/api/admin/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-page", pageId: page.id }),
      });
      setCatalogue(prev => ({
        ...prev,
        pages: prev.pages
          .filter(p => p.id !== page.id)
          .map((p, i) => ({ ...p, pageNumber: i + 1 })),
        pageCount: prev.pageCount - 1,
      }));
    } finally {
      setDeletingPageId(null);
    }
  }

  async function handleMovePage(page: CataloguePage, dir: "up" | "down") {
    const pages = [...catalogue.pages];
    const idx = pages.findIndex(p => p.id === page.id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === pages.length - 1) return;
    const swapIdx = dir === "up" ? idx - 1 : idx + 1;
    [pages[idx], pages[swapIdx]] = [pages[swapIdx], pages[idx]];
    const reordered = pages.map((p, i) => ({ ...p, pageNumber: i + 1 }));
    setCatalogue(prev => ({ ...prev, pages: reordered }));
    await fetch("/api/admin/catalogue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reorder-pages",
        catalogueId: catalogue.id,
        pageIds: reordered.map(p => p.id),
      }),
    });
  }

  return (
    <div className="min-h-screen bg-[#080600] text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-[#C9A84C]/10 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/catalogue")}
            className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 3L5 8l5 5" strokeLinecap="round"/>
            </svg>
          </button>
          <div>
            <h1 className="text-base font-bold text-white">{catalogue.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                catalogue.status === "published"
                  ? "bg-green-500/15 text-green-400"
                  : "bg-gray-500/15 text-gray-400"
              }`}>
                {catalogue.status === "published" ? "● Đã xuất bản" : "○ Bản nháp"}
              </span>
              <span className="text-[10px] text-gray-600">{catalogue.pageCount} trang</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {catalogue.status === "published" && (
            <a
              href={`/catalogue/${catalogue.id}`}
              target="_blank"
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all"
            >
              ↗ Xem public
            </a>
          )}
          <button
            onClick={openNewPage}
            className="flex items-center gap-1.5 bg-[#C9A84C] text-black font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-[#E2C97E] transition-colors"
          >
            + Thêm trang
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 px-6 flex-shrink-0">
        {(["pages", "settings", "preview"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-[#C9A84C] text-[#C9A84C]"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {tab === "pages" ? "📄 Trang" : tab === "settings" ? "⚙️ Cài đặt" : "👁 Xem trước"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "pages" && (
          <PagesTab
            pages={catalogue.pages}
            onEdit={openEditPage}
            onDelete={handleDeletePage}
            onMove={handleMovePage}
            onAdd={openNewPage}
            deletingPageId={deletingPageId}
          />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            settings={settings}
            onChange={setSettings}
            onSave={handleSaveSettings}
            saving={savingSettings}
          />
        )}
        {activeTab === "preview" && (
          <div className="h-full">
            {catalogue.pages.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-3">📋</div>
                  <p>Thêm trang để xem trước</p>
                </div>
              </div>
            ) : (
              <FlipBook
                pages={catalogue.pages}
                title={catalogue.title}
                className="h-[calc(100vh-120px)]"
              />
            )}
          </div>
        )}
      </div>

      {/* Page Editor Modal */}
      {editingPage && (
        <PageEditorModal
          page={editingPage}
          onChange={setEditingPage}
          onSave={handleSavePage}
          onClose={() => setEditingPage(null)}
          saving={savingPage}
        />
      )}
    </div>
  );
}

// ─── Pages Tab ────────────────────────────────────────────────────────────────

function PagesTab({
  pages,
  onEdit,
  onDelete,
  onMove,
  onAdd,
  deletingPageId,
}: {
  pages: CataloguePage[];
  onEdit: (p: CataloguePage) => void;
  onDelete: (p: CataloguePage) => void;
  onMove: (p: CataloguePage, dir: "up" | "down") => void;
  onAdd: () => void;
  deletingPageId: string | null;
}) {
  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <div className="text-5xl mb-4">📄</div>
        <h2 className="text-lg font-semibold text-white mb-2">Chưa có trang nào</h2>
        <p className="text-gray-500 text-sm mb-6">Thêm trang đầu tiên cho catalogue</p>
        <button
          onClick={onAdd}
          className="bg-[#C9A84C] text-black font-bold px-5 py-2 rounded-lg hover:bg-[#E2C97E] transition-colors"
        >
          + Thêm trang đầu tiên
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {pages.map((page, idx) => (
          <div
            key={page.id}
            className="group relative bg-[#111] border border-white/5 rounded-xl overflow-hidden hover:border-[#C9A84C]/30 transition-all"
          >
            {/* Page preview */}
            <div
              className="relative aspect-[3/4] overflow-hidden"
              style={{ backgroundColor: page.bgColor || "#1a1a1a" }}
            >
              {page.imageUrl && (
                <img
                  src={page.imageUrl}
                  alt={page.title}
                  className="w-full h-full object-cover"
                />
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              {/* Badge */}
              {page.badge && (
                <div className="absolute top-1.5 right-1.5">
                  <span className="bg-[#C9A84C] text-black text-[8px] font-bold px-1.5 py-0.5 rounded">
                    {page.badge}
                  </span>
                </div>
              )}
              {/* Page number */}
              <div className="absolute bottom-1.5 left-1.5 text-[10px] text-white/60 font-mono">
                {page.pageNumber}
              </div>
              {/* Type badge */}
              <div className="absolute top-1.5 left-1.5">
                <span className="text-[8px] bg-black/50 text-white/60 px-1 py-0.5 rounded">
                  {PAGE_TYPES.find(t => t.value === page.type)?.label || page.type}
                </span>
              </div>

              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <button
                  onClick={() => onEdit(page)}
                  className="bg-[#C9A84C] text-black text-[10px] font-bold px-2 py-1 rounded hover:bg-[#E2C97E] transition-colors"
                >
                  Sửa
                </button>
                <button
                  onClick={() => onDelete(page)}
                  disabled={deletingPageId === page.id}
                  className="bg-red-500/80 text-white text-[10px] font-bold px-2 py-1 rounded hover:bg-red-500 transition-colors"
                >
                  Xóa
                </button>
              </div>
            </div>

            {/* Page info */}
            <div className="p-2">
              <p className="text-[11px] font-medium text-white truncate">
                {page.title || `Trang ${page.pageNumber}`}
              </p>
              {page.subtitle && (
                <p className="text-[10px] text-gray-600 truncate">{page.subtitle}</p>
              )}
            </div>

            {/* Reorder arrows */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onMove(page, "up")}
                disabled={idx === 0}
                className="w-5 h-5 bg-black/60 text-white/60 rounded flex items-center justify-center text-[10px] hover:bg-black/80 disabled:opacity-20"
              >
                ↑
              </button>
              <button
                onClick={() => onMove(page, "down")}
                disabled={idx === pages.length - 1}
                className="w-5 h-5 bg-black/60 text-white/60 rounded flex items-center justify-center text-[10px] hover:bg-black/80 disabled:opacity-20"
              >
                ↓
              </button>
            </div>
          </div>
        ))}

        {/* Add page card */}
        <button
          onClick={onAdd}
          className="aspect-[3/4] border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-[#C9A84C]/40 hover:bg-[#C9A84C]/5 transition-all group"
        >
          <span className="text-2xl text-white/20 group-hover:text-[#C9A84C]/40 transition-colors">+</span>
          <span className="text-[11px] text-gray-600 group-hover:text-[#C9A84C]/60">Thêm trang</span>
        </button>
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  settings,
  onChange,
  onSave,
  saving,
}: {
  settings: { title: string; description: string; coverImageUrl: string; status: "published" | "draft" };
  onChange: (s: { title: string; description: string; coverImageUrl: string; status: "published" | "draft" }) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="max-w-xl mx-auto p-6 space-y-5">
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block font-medium">Tên catalogue *</label>
        <input
          type="text"
          value={settings.title}
          onChange={e => onChange({ ...settings, title: e.target.value })}
          className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block font-medium">Mô tả</label>
        <textarea
          value={settings.description}
          onChange={e => onChange({ ...settings, description: e.target.value })}
          rows={3}
          className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/50 resize-none"
        />
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block font-medium">URL ảnh bìa</label>
        <input
          type="url"
          value={settings.coverImageUrl}
          onChange={e => onChange({ ...settings, coverImageUrl: e.target.value })}
          placeholder="https://..."
          className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
        />
        {settings.coverImageUrl && (
          <div className="mt-2 w-24 h-32 rounded overflow-hidden border border-white/10">
            <img src={settings.coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block font-medium">Trạng thái</label>
        <select
          value={settings.status}
          onChange={e => onChange({ ...settings, status: e.target.value as "published" | "draft" })}
          className="w-full bg-[#111] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
        >
          <option value="draft">Bản nháp (chỉ admin thấy)</option>
          <option value="published">Đã xuất bản (khách hàng thấy)</option>
        </select>
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-[#C9A84C] text-black font-bold py-2.5 rounded-lg hover:bg-[#E2C97E] transition-colors disabled:opacity-50"
      >
        {saving ? "Đang lưu..." : "Lưu cài đặt"}
      </button>
    </div>
  );
}

// ─── Page Editor Modal ────────────────────────────────────────────────────────

function PageEditorModal({
  page,
  onChange,
  onSave,
  onClose,
  saving,
}: {
  page: EditingPage;
  onChange: (p: EditingPage) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-[#C9A84C]/20 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5 flex-shrink-0">
          <h2 className="font-bold text-white text-sm">
            {page.isNew ? "Thêm trang mới" : `Chỉnh sửa trang ${page.pageNumber}`}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewOpen(v => !v)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                previewOpen
                  ? "bg-[#C9A84C]/15 text-[#C9A84C] border-[#C9A84C]/30"
                  : "text-gray-400 border-white/10 hover:text-white"
              }`}
            >
              👁 Xem trước
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 2l10 10M12 2L2 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Form */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Type */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block font-medium">Loại trang</label>
              <div className="grid grid-cols-4 gap-1.5">
                {PAGE_TYPES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => onChange({ ...page, type: t.value })}
                    className={`py-2 px-2 rounded-lg text-xs font-medium transition-all border ${
                      page.type === t.value
                        ? "bg-[#C9A84C]/15 text-[#C9A84C] border-[#C9A84C]/30"
                        : "text-gray-500 border-white/5 hover:border-white/15 hover:text-gray-300"
                    }`}
                  >
                    <div>{t.icon}</div>
                    <div className="mt-0.5">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Tiêu đề</label>
                <input
                  type="text"
                  value={page.title || ""}
                  onChange={e => onChange({ ...page, title: e.target.value })}
                  placeholder="Tiêu đề trang"
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Phụ đề</label>
                <input
                  type="text"
                  value={page.subtitle || ""}
                  onChange={e => onChange({ ...page, subtitle: e.target.value })}
                  placeholder="Phụ đề"
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
                />
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">URL ảnh nền</label>
              <input
                type="url"
                value={page.imageUrl || ""}
                onChange={e => onChange({ ...page, imageUrl: e.target.value })}
                placeholder="https://..."
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Màu nền</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {BG_PRESETS.map(c => (
                    <button
                      key={c}
                      onClick={() => onChange({ ...page, bgColor: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        page.bgColor === c ? "border-[#C9A84C] scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={page.bgColor || "#1a1a1a"}
                  onChange={e => onChange({ ...page, bgColor: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer bg-transparent border border-white/10"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Màu chữ</label>
                <div className="flex gap-1.5 mb-2">
                  {["#ffffff", "#000000", "#C9A84C", "#cccccc"].map(c => (
                    <button
                      key={c}
                      onClick={() => onChange({ ...page, textColor: c })}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        page.textColor === c ? "border-[#C9A84C] scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <input
                  type="color"
                  value={page.textColor || "#ffffff"}
                  onChange={e => onChange({ ...page, textColor: e.target.value })}
                  className="w-full h-8 rounded cursor-pointer bg-transparent border border-white/10"
                />
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nội dung</label>
              <textarea
                value={page.content || ""}
                onChange={e => onChange({ ...page, content: e.target.value })}
                placeholder="Nội dung trang (mỗi dòng = 1 đoạn)..."
                rows={4}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/50 resize-none"
              />
            </div>

            {/* Badge */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nhãn góc (badge)</label>
              <input
                type="text"
                value={page.badge || ""}
                onChange={e => onChange({ ...page, badge: e.target.value })}
                placeholder="VD: MỚI, HOT, SALE..."
                maxLength={10}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C9A84C]/50"
              />
            </div>
          </div>

          {/* Mini preview */}
          {previewOpen && (
            <div className="w-48 border-l border-white/5 p-3 flex-shrink-0">
              <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Xem trước</p>
              <div
                className="relative rounded overflow-hidden"
                style={{
                  aspectRatio: "3/4",
                  backgroundColor: page.bgColor || "#1a1a1a",
                  color: page.textColor || "#fff",
                }}
              >
                {page.imageUrl && (
                  <img src={page.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                {(page.title || page.content) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                )}
                {page.badge && (
                  <div className="absolute top-1.5 right-1.5 bg-[#C9A84C] text-black text-[8px] font-bold px-1 py-0.5 rounded">
                    {page.badge}
                  </div>
                )}
                <div className="absolute bottom-2 left-2 right-2">
                  {page.title && (
                    <p className="text-[10px] font-bold leading-tight" style={{ color: page.textColor || "#fff" }}>
                      {page.title}
                    </p>
                  )}
                  {page.subtitle && (
                    <p className="text-[8px] opacity-70 mt-0.5" style={{ color: page.textColor || "#fff" }}>
                      {page.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-3.5 border-t border-white/5 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 border border-white/10 text-gray-400 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm"
          >
            Hủy
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-[#C9A84C] text-black font-bold py-2 rounded-lg hover:bg-[#E2C97E] transition-colors text-sm disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : page.isNew ? "Thêm trang" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
