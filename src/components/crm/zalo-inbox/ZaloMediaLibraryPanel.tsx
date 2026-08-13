"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check, FileText, Folder, FolderOpen, Image as ImageIcon,
  Loader2, MoreHorizontal, Plus, Search, Send, Trash2, Upload, Video, X,
} from "lucide-react";
import styles from "./ZaloMediaLibraryPanel.module.css";

type MediaKind = "image" | "video" | "file";

interface MediaFolder {
  id: string;
  name: string;
  assetCount: number;
}

interface MediaAsset {
  id: string;
  folderId: string | null;
  name: string;
  url: string;
  contentType: string;
  mediaKind: MediaKind;
  sizeBytes: number;
  usageCount: number;
  createdAt: string;
}

interface Props {
  mode?: "manage" | "picker";
  onClose?: () => void;
  onSend?: (assetIds: string[]) => Promise<void>;
  sending?: boolean;
}

const ACCEPTED_FILES = "image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar";
const LIBRARY_CACHE_TTL = 5 * 60 * 1000;

interface LibraryPayload {
  folders: MediaFolder[];
  assets: MediaAsset[];
  counts: { total: number; unfiled: number };
}

const libraryCache = new Map<string, { payload: LibraryPayload; savedAt: number }>();

function invalidateLibraryCache() {
  libraryCache.clear();
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const level = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** level).toFixed(level ? 1 : 0)} ${units[level]}`;
}

function AssetPreview({ asset }: { asset: MediaAsset }) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const thumbnailUrl = `/api/crm/zalo-inbox/media-library/thumbnail?id=${encodeURIComponent(asset.id)}`;

  if (asset.mediaKind === "image") {
    return (
      <img
        src={thumbnailUrl}
        alt={asset.name}
        loading="lazy"
        decoding="async"
      />
    );
  }
  if (asset.mediaKind === "video") {
    return (
      <div className={styles.videoPreview} data-fallback={String(thumbnailFailed)}>
        {!thumbnailFailed && (
          <img
            src={thumbnailUrl}
            alt={`Ảnh bìa ${asset.name}`}
            loading="lazy"
            decoding="async"
            onError={() => setThumbnailFailed(true)}
          />
        )}
        {thumbnailFailed && (
          <video
            src={asset.url}
            muted
            playsInline
            preload="metadata"
            aria-label={`Ảnh bìa ${asset.name}`}
            onLoadedMetadata={event => {
              const video = event.currentTarget;
              if (Number.isFinite(video.duration) && video.duration > 0.1) video.currentTime = 0.1;
            }}
          />
        )}
        <span className={styles.videoBadge}><Video size={14} /> VIDEO</span>
      </div>
    );
  }
  return (
    <div className={styles.filePreview}>
      <FileText size={34} />
      <span>{asset.name.split(".").pop()?.slice(0, 5).toUpperCase() || "FILE"}</span>
    </div>
  );
}

export default function ZaloMediaLibraryPanel({ mode = "manage", onClose, onSend, sending = false }: Props) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [folders, setFolders] = useState<MediaFolder[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [counts, setCounts] = useState({ total: 0, unfiled: 0 });
  const [folderFilter, setFolderFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState<"all" | MediaKind>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [working, setWorking] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadLibrary = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    const params = new URLSearchParams();
    if (folderFilter !== "all") params.set("folder", folderFilter);
    if (kindFilter !== "all") params.set("kind", kindFilter);
    if (debouncedQuery) params.set("q", debouncedQuery);
    const cacheKey = params.toString();
    const cached = libraryCache.get(cacheKey);
    if (!force && cached && Date.now() - cached.savedAt < LIBRARY_CACHE_TTL) {
      setFolders(cached.payload.folders);
      setAssets(cached.payload.assets);
      setCounts(cached.payload.counts);
      setLoading(false);
      return;
    }

    setLoading(!cached);
    setError(null);
    try {
      const response = await fetch(`/api/crm/zalo-inbox/media-library?${params}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không tải được thư viện");
      const payload: LibraryPayload = {
        folders: data.folders || [],
        assets: data.assets || [],
        counts: data.counts || { total: 0, unfiled: 0 },
      };
      libraryCache.set(cacheKey, { payload, savedAt: Date.now() });
      setFolders(payload.folders);
      setAssets(payload.assets);
      setCounts(payload.counts);
      setSelected(previous => new Set([...previous].filter(id => payload.assets.some(asset => asset.id === id))));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được thư viện");
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, folderFilter, kindFilter]);

  useEffect(() => { void loadLibrary(); }, [loadLibrary]);

  const selectedAssets = useMemo(() => assets.filter(asset => selected.has(asset.id)), [assets, selected]);
  const currentFolderId = folders.some(folder => folder.id === folderFilter) ? folderFilter : null;

  const toggleAsset = (id: string) => {
    setSelected(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        const response = await fetch("/api/crm/zalo-inbox/media-library", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": file.type || "application/octet-stream",
            "X-Media-File-Name": encodeURIComponent(file.name),
            ...(currentFolderId ? { "X-Media-Folder-Id": currentFolderId } : {}),
          },
          body: file,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Không tải được ${file.name}`);
      }
      invalidateLibraryCache();
      await loadLibrary({ force: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được tài liệu");
    } finally {
      setUploading(false);
    }
  };

  const createFolder = async () => {
    const name = window.prompt("Tên thư mục mới");
    if (!name?.trim()) return;
    setWorking(true);
    try {
      const response = await fetch("/api/crm/zalo-inbox/media-library/folders", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Không tạo được thư mục");
      invalidateLibraryCache();
      await loadLibrary({ force: true });
      setFolderFilter(data.folder?.id || "all");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tạo được thư mục");
    } finally { setWorking(false); }
  };

  const renameFolder = async (folder: MediaFolder) => {
    const name = window.prompt("Đổi tên thư mục", folder.name);
    if (!name?.trim() || name.trim() === folder.name) return;
    const response = await fetch("/api/crm/zalo-inbox/media-library/folders", {
      method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: folder.id, name: name.trim() }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error || "Không đổi được tên thư mục");
    else { invalidateLibraryCache(); await loadLibrary({ force: true }); }
  };

  const removeFolder = async (folder: MediaFolder) => {
    if (!window.confirm(`Xóa thư mục “${folder.name}”? Tài liệu sẽ được chuyển về Chưa phân loại.`)) return;
    const response = await fetch(`/api/crm/zalo-inbox/media-library/folders?id=${encodeURIComponent(folder.id)}`, {
      method: "DELETE", credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error || "Không xóa được thư mục");
    else {
      invalidateLibraryCache();
      if (folderFilter === folder.id) setFolderFilter("all");
      else await loadLibrary({ force: true });
    }
  };

  const moveSelected = async (folderId: string) => {
    if (!selectedAssets.length) return;
    setWorking(true);
    try {
      await Promise.all(selectedAssets.map(async asset => {
        const response = await fetch("/api/crm/zalo-inbox/media-library", {
          method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: asset.id, name: asset.name, folderId: folderId || null }),
        });
        if (!response.ok) throw new Error("Không di chuyển được tài liệu");
      }));
      setSelected(new Set());
      invalidateLibraryCache();
      await loadLibrary({ force: true });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không di chuyển được tài liệu"); }
    finally { setWorking(false); }
  };

  const removeSelected = async () => {
    if (!selectedAssets.length || !window.confirm(`Xóa ${selectedAssets.length} tài liệu đã chọn khỏi thư viện?`)) return;
    setWorking(true);
    try {
      for (const asset of selectedAssets) {
        const response = await fetch(`/api/crm/zalo-inbox/media-library?id=${encodeURIComponent(asset.id)}`, {
          method: "DELETE", credentials: "include",
        });
        if (!response.ok) throw new Error(`Không xóa được ${asset.name}`);
      }
      setSelected(new Set());
      invalidateLibraryCache();
      await loadLibrary({ force: true });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không xóa được tài liệu"); }
    finally { setWorking(false); }
  };

  const removeAsset = async (asset: MediaAsset) => {
    const retainedNotice = asset.usageCount > 0
      ? " Tệp gốc vẫn được giữ cho các tin nhắn đã gửi trước đây."
      : "";
    if (!window.confirm(`Xóa “${asset.name}” khỏi thư viện?${retainedNotice}`)) return;
    setDeletingId(asset.id);
    setError(null);
    try {
      const response = await fetch(`/api/crm/zalo-inbox/media-library?id=${encodeURIComponent(asset.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Không xóa được ${asset.name}`);
      invalidateLibraryCache();
      setAssets(previous => previous.filter(item => item.id !== asset.id));
      setFolders(previous => previous.map(folder => folder.id === asset.folderId
        ? { ...folder, assetCount: Math.max(0, folder.assetCount - 1) }
        : folder));
      setCounts(previous => ({
        total: Math.max(0, previous.total - 1),
        unfiled: Math.max(0, previous.unfiled - (asset.folderId ? 0 : 1)),
      }));
      setSelected(previous => {
        const next = new Set(previous);
        next.delete(asset.id);
        return next;
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không xóa được tài liệu");
    } finally {
      setDeletingId(null);
    }
  };

  const content = (
    <section className={styles.panel} data-mode={mode}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <span className={styles.headingIcon}><FolderOpen size={22} /></span>
          <div><h2>Thư viện Media</h2><p>Tải một lần, dùng lại cho mọi cuộc hội thoại.</p></div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.secondaryButton} onClick={createFolder} disabled={working}><Folder size={16} /> Thư mục mới</button>
          <button className={styles.primaryButton} onClick={() => uploadRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className={styles.spin} size={16} /> : <Upload size={16} />} Thêm tài liệu
          </button>
          {mode === "picker" && <button className={styles.closeButton} onClick={onClose} aria-label="Đóng"><X size={20} /></button>}
        </div>
        <input ref={uploadRef} type="file" hidden multiple accept={ACCEPTED_FILES}
          onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ""; void uploadFiles(files); }} />
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Thư mục</div>
          <button className={styles.folderButton} data-active={String(folderFilter === "all")} onClick={() => setFolderFilter("all")}>
            <FolderOpen size={17} /><span>Tất cả tài liệu</span><b>{counts.total}</b>
          </button>
          <button className={styles.folderButton} data-active={String(folderFilter === "unfiled")} onClick={() => setFolderFilter("unfiled")}>
            <Folder size={17} /><span>Chưa phân loại</span><b>{counts.unfiled}</b>
          </button>
          <div className={styles.folderList}>
            {folders.map(folder => (
              <div className={styles.folderRow} key={folder.id} data-active={String(folderFilter === folder.id)}>
                <button onClick={() => setFolderFilter(folder.id)}><Folder size={17} /><span>{folder.name}</span><b>{folder.assetCount}</b></button>
                <details><summary aria-label="Tùy chọn"><MoreHorizontal size={16} /></summary><div>
                  <button onClick={() => void renameFolder(folder)}>Đổi tên</button>
                  <button className={styles.dangerText} onClick={() => void removeFolder(folder)}>Xóa</button>
                </div></details>
              </div>
            ))}
          </div>
        </aside>

        <main className={styles.content}>
          <div className={styles.toolbar}>
            <label className={styles.search}><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm theo tên tài liệu..." /></label>
            <div className={styles.kindTabs}>
              {(["all", "image", "video", "file"] as const).map(kind => (
                <button key={kind} data-active={String(kindFilter === kind)} onClick={() => setKindFilter(kind)}>
                  {kind === "all" ? "Tất cả" : kind === "image" ? "Ảnh" : kind === "video" ? "Video" : "File"}
                </button>
              ))}
            </div>
          </div>

          {selectedAssets.length > 0 && mode === "manage" && (
            <div className={styles.selectionBar}>
              <strong>Đã chọn {selectedAssets.length}</strong>
              <select defaultValue="" onChange={event => {
                if (event.target.value !== "") void moveSelected(event.target.value === "__root__" ? "" : event.target.value);
                event.currentTarget.value = "";
              }}>
                <option value="" disabled>Chuyển tới thư mục...</option><option value="__root__">Chưa phân loại</option>
                {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
              </select>
              <button onClick={() => void removeSelected()}><Trash2 size={15} /> Xóa</button>
              <button onClick={() => setSelected(new Set())}><X size={15} /> Bỏ chọn</button>
            </div>
          )}

          {error && <div className={styles.error}>{error}<button onClick={() => setError(null)}><X size={15} /></button></div>}
          {loading ? <div className={styles.state}><Loader2 className={styles.spin} /><span>Đang tải thư viện...</span></div>
            : assets.length === 0 ? (
              <div className={styles.empty}><span><ImageIcon size={30} /></span><h3>Chưa có tài liệu trong thư mục</h3><p>Tải ảnh, video hoặc file lên một lần để dùng lại khi tư vấn.</p><button onClick={() => uploadRef.current?.click()}><Plus size={16} /> Thêm tài liệu</button></div>
            ) : (
              <div className={styles.grid}>
                {assets.map(asset => (
                  <article key={asset.id} className={styles.assetCard} data-selected={String(selected.has(asset.id))}>
                    <button className={styles.assetSelect} onClick={() => toggleAsset(asset.id)} title={asset.name}>
                      <span className={styles.check}>{selected.has(asset.id) ? <Check size={14} /> : null}</span>
                      <span className={styles.preview}><AssetPreview asset={asset} /></span>
                      <span className={styles.assetName} title={asset.name}>{asset.name}</span>
                      <span className={styles.assetMeta}>{formatBytes(asset.sizeBytes)} · Đã gửi {asset.usageCount} lần</span>
                    </button>
                    <button
                      className={styles.deleteAsset}
                      onClick={() => void removeAsset(asset)}
                      disabled={deletingId === asset.id}
                      title="Xóa khỏi thư viện"
                      aria-label={`Xóa ${asset.name}`}
                    >
                      {deletingId === asset.id ? <Loader2 className={styles.spin} size={14} /> : <Trash2 size={14} />}
                    </button>
                  </article>
                ))}
              </div>
            )}
        </main>
      </div>

      {mode === "picker" && (
        <footer className={styles.footer}>
          <span>{selectedAssets.length ? `Đã chọn ${selectedAssets.length} tài liệu` : "Chọn ảnh, video hoặc file cần gửi"}</span>
          <div><button className={styles.secondaryButton} onClick={onClose}>Hủy</button><button className={styles.sendButton} disabled={!selectedAssets.length || sending} onClick={() => onSend?.([...selected])}>
            {sending ? <Loader2 className={styles.spin} size={16} /> : <Send size={16} />} Gửi {selectedAssets.length || ""}
          </button></div>
        </footer>
      )}
    </section>
  );

  return mode === "picker" ? <div className={styles.overlay} role="dialog" aria-modal="true">{content}</div> : content;
}
