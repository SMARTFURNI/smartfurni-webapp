"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image as ImageIcon, Loader2, MessageSquareText, Pencil, Plus, Search,
  Send, Sparkles, Trash2, Video, X, Zap,
} from "lucide-react";
import ZaloMediaLibraryPanel, { type MediaAsset } from "./ZaloMediaLibraryPanel";
import styles from "./ZaloQuickMessagesPanel.module.css";

export interface QuickMessageTemplate {
  id: string;
  title: string;
  category: string;
  content: string;
  mediaAssetIds: string[];
  mediaAssets: MediaAsset[];
  usageCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  mode?: "manage" | "picker";
  onClose?: () => void;
  onInsert?: (template: QuickMessageTemplate) => void;
  onSend?: (templateId: string) => Promise<void>;
  sendingTemplateId?: string | null;
  canSendNow?: boolean;
}

type EditorState = {
  id?: string;
  title: string;
  category: string;
  content: string;
  mediaAssetIds: string[];
  mediaAssets: MediaAsset[];
};

const EMPTY_EDITOR: EditorState = {
  title: "",
  category: "Tư vấn",
  content: "",
  mediaAssetIds: [],
  mediaAssets: [],
};

function MediaPreview({ asset }: { asset: MediaAsset }) {
  const thumbnail = `/api/crm/zalo-inbox/media-library/thumbnail?id=${encodeURIComponent(asset.id)}`;
  return (
    <span className={styles.mediaPreview} title={asset.name}>
      <img src={thumbnail} alt={asset.name} loading="lazy" />
      <b>{asset.mediaKind === "video" ? <Video size={12} /> : <ImageIcon size={12} />}</b>
    </span>
  );
}

export default function ZaloQuickMessagesPanel({
  mode = "manage",
  onClose,
  onInsert,
  onSend,
  sendingTemplateId = null,
  canSendNow = false,
}: Props) {
  const [templates, setTemplates] = useState<QuickMessageTemplate[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      const response = await fetch(`/api/crm/zalo-inbox/quick-messages?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không tải được tin nhắn nhanh");
      setTemplates(data.templates || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được tin nhắn nhanh");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => { void loadTemplates(); }, [loadTemplates]);

  const categories = useMemo(
    () => [...new Set(templates.map(template => template.category).filter(Boolean))],
    [templates],
  );

  const editTemplate = (template: QuickMessageTemplate) => setEditor({
    id: template.id,
    title: template.title,
    category: template.category,
    content: template.content,
    mediaAssetIds: template.mediaAssetIds,
    mediaAssets: template.mediaAssets,
  });

  const saveTemplate = async () => {
    if (!editor || saving) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/crm/zalo-inbox/quick-messages", {
        method: editor.id ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editor.id,
          title: editor.title,
          category: editor.category,
          content: editor.content,
          mediaAssetIds: editor.mediaAssetIds,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không lưu được mẫu tin nhắn");
      setEditor(null);
      await loadTemplates();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không lưu được mẫu tin nhắn");
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (template: QuickMessageTemplate) => {
    if (!window.confirm(`Xóa mẫu “${template.title}”?`)) return;
    setError(null);
    try {
      const response = await fetch(`/api/crm/zalo-inbox/quick-messages?id=${encodeURIComponent(template.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không xóa được mẫu tin nhắn");
      setTemplates(previous => previous.filter(item => item.id !== template.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không xóa được mẫu tin nhắn");
    }
  };

  const removeMedia = (id: string) => {
    if (!editor) return;
    setEditor({
      ...editor,
      mediaAssetIds: editor.mediaAssetIds.filter(assetId => assetId !== id),
      mediaAssets: editor.mediaAssets.filter(asset => asset.id !== id),
    });
  };

  const content = (
    <section className={styles.panel} data-mode={mode}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span><Zap size={22} /></span>
          <div>
            <h2>Tin nhắn nhanh</h2>
            <p>Soạn một lần, gửi lại nội dung cùng ảnh và video trong vài giây.</p>
          </div>
        </div>
        <div className={styles.headerActions}>
          {mode === "manage" && (
            <button className={styles.primaryButton} onClick={() => setEditor({ ...EMPTY_EDITOR })}>
              <Plus size={16} /> Tạo mẫu mới
            </button>
          )}
          {mode === "picker" && <button className={styles.iconButton} onClick={onClose} aria-label="Đóng"><X size={20} /></button>}
        </div>
      </header>

      <div className={styles.toolbar}>
        <label><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm theo tên, nhóm hoặc nội dung..." /></label>
        <span>{templates.length} mẫu</span>
      </div>

      {error && <div className={styles.error}>{error}<button onClick={() => setError(null)}><X size={15} /></button></div>}

      <div className={styles.body}>
        {loading ? (
          <div className={styles.state}><Loader2 className={styles.spin} size={24} /><span>Đang tải mẫu tin nhắn...</span></div>
        ) : templates.length === 0 ? (
          <div className={styles.empty}>
            <span><MessageSquareText size={30} /></span>
            <h3>{query ? "Không tìm thấy mẫu phù hợp" : "Chưa có tin nhắn nhanh"}</h3>
            <p>Tạo mẫu gồm nội dung, ảnh hoặc video để cả đội tư vấn nhanh và nhất quán.</p>
            {mode === "manage" && <button onClick={() => setEditor({ ...EMPTY_EDITOR })}><Plus size={16} /> Tạo mẫu đầu tiên</button>}
          </div>
        ) : (
          <div className={styles.grid}>
            {templates.map(template => (
              <article className={styles.card} key={template.id}>
                <div className={styles.cardTop}>
                  <span className={styles.category}>{template.category}</span>
                  <span className={styles.usage}>Đã dùng {template.usageCount} lần</span>
                </div>
                <h3>{template.title}</h3>
                {template.content && <p>{template.content}</p>}
                {template.mediaAssets.length > 0 && (
                  <div className={styles.mediaRow}>
                    {template.mediaAssets.slice(0, 4).map(asset => <MediaPreview key={asset.id} asset={asset} />)}
                    {template.mediaAssets.length > 4 && <span className={styles.moreMedia}>+{template.mediaAssets.length - 4}</span>}
                  </div>
                )}
                <footer className={styles.cardActions}>
                  {onInsert && <button onClick={() => onInsert(template)}><Sparkles size={14} /> Chèn nội dung</button>}
                  {onSend && <button className={styles.sendButton} disabled={!canSendNow || sendingTemplateId === template.id} title={canSendNow ? "Gửi toàn bộ mẫu" : "Hãy chọn một hội thoại trước"} onClick={() => void onSend(template.id)}>
                    {sendingTemplateId === template.id ? <Loader2 className={styles.spin} size={14} /> : <Send size={14} />} Gửi ngay
                  </button>}
                  {mode === "manage" && <>
                    <button onClick={() => editTemplate(template)}><Pencil size={14} /> Sửa</button>
                    <button className={styles.dangerButton} onClick={() => void deleteTemplate(template)}><Trash2 size={14} /> Xóa</button>
                  </>}
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>

      {editor && (
        <div className={styles.editorOverlay} role="dialog" aria-modal="true" aria-label={editor.id ? "Sửa tin nhắn nhanh" : "Tạo tin nhắn nhanh"}>
          <div className={styles.editor}>
            <header><div><h3>{editor.id ? "Sửa tin nhắn nhanh" : "Tạo tin nhắn nhanh"}</h3><p>Nội dung và media sẽ được gửi theo đúng thứ tự khi nhân viên chọn mẫu.</p></div><button onClick={() => setEditor(null)}><X size={19} /></button></header>
            <div className={styles.editorBody}>
              <div className={styles.twoColumns}>
                <label><span>Tên mẫu *</span><input maxLength={120} value={editor.title} onChange={event => setEditor({ ...editor, title: event.target.value })} placeholder="Ví dụ: Giới thiệu sofa giường" /></label>
                <label><span>Nhóm mẫu</span><input list="quick-message-categories" maxLength={60} value={editor.category} onChange={event => setEditor({ ...editor, category: event.target.value })} placeholder="Tư vấn" /><datalist id="quick-message-categories">{categories.map(category => <option key={category} value={category} />)}</datalist></label>
              </div>
              <label><span>Nội dung tin nhắn</span><textarea rows={7} maxLength={4000} value={editor.content} onChange={event => setEditor({ ...editor, content: event.target.value })} placeholder="Nhập nội dung nhân viên thường gửi cho khách..." /><small>{editor.content.length}/4000 ký tự</small></label>
              <div className={styles.mediaField}>
                <div><span>Ảnh và video đi kèm</span><small>Tối đa 10 tài liệu từ thư viện dùng chung.</small></div>
                <button onClick={() => setShowMediaPicker(true)}><ImageIcon size={15} /> Chọn ảnh/video</button>
              </div>
              {editor.mediaAssets.length > 0 && <div className={styles.selectedMedia}>{editor.mediaAssets.map(asset => <div key={asset.id}><MediaPreview asset={asset} /><button onClick={() => removeMedia(asset.id)} aria-label={`Bỏ ${asset.name}`}><X size={13} /></button><span>{asset.name}</span></div>)}</div>}
            </div>
            <footer><button onClick={() => setEditor(null)}>Hủy</button><button className={styles.primaryButton} disabled={saving || !editor.title.trim() || (!editor.content.trim() && editor.mediaAssetIds.length === 0)} onClick={() => void saveTemplate()}>{saving ? <Loader2 className={styles.spin} size={15} /> : null}{editor.id ? "Lưu thay đổi" : "Lưu mẫu"}</button></footer>
          </div>
        </div>
      )}

      {editor && showMediaPicker && (
        <ZaloMediaLibraryPanel
          mode="picker"
          allowedKinds={["image", "video"]}
          actionLabel="Gắn"
          onClose={() => setShowMediaPicker(false)}
          onSelect={assets => {
            const byId = new Map([...editor.mediaAssets, ...assets].map(asset => [asset.id, asset]));
            const mediaAssets = [...byId.values()].slice(0, 10);
            setEditor({ ...editor, mediaAssets, mediaAssetIds: mediaAssets.map(asset => asset.id) });
            setShowMediaPicker(false);
          }}
        />
      )}
    </section>
  );

  return mode === "picker" ? <div className={styles.overlay} role="dialog" aria-modal="true">{content}</div> : content;
}
