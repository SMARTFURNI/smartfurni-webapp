"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check, Film, FolderOpen, Image as ImageIcon, Loader2, Plus, Search, Trash2, X,
} from "lucide-react";

export interface AutomationMediaAsset {
  id: string;
  name: string;
  url: string;
  contentType: string;
  mediaKind: "image" | "video" | "file";
  sizeBytes: number;
  createdAt: string;
}

interface Props {
  assetIds: string[];
  onChange: (assetIds: string[]) => void;
  compact?: boolean;
}

let mediaLibraryCache: AutomationMediaAsset[] | null = null;
let mediaLibraryRequest: Promise<AutomationMediaAsset[]> | null = null;

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function MediaThumb({ asset }: { asset: AutomationMediaAsset }) {
  const [failed, setFailed] = useState(false);
  const src = `/api/crm/zalo-inbox/media-library/thumbnail?id=${encodeURIComponent(asset.id)}`;
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-100">
      {!failed ? (
        <img src={src} alt={asset.name} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-400">
          {asset.mediaKind === "video" ? <Film size={28} /> : <ImageIcon size={28} />}
        </div>
      )}
      {asset.mediaKind === "video" && (
        <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-md bg-slate-950/75 px-1.5 py-0.5 text-[9px] font-bold text-white">
          <Film size={9} /> VIDEO
        </span>
      )}
    </div>
  );
}

export default function AutomationMediaField({ assetIds, onChange, compact = false }: Props) {
  const [library, setLibrary] = useState<AutomationMediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "image" | "video">("all");
  const [draftIds, setDraftIds] = useState<string[]>(assetIds);

  const loadLibrary = useCallback(async () => {
    if (mediaLibraryCache) {
      setLibrary(mediaLibraryCache);
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (!mediaLibraryRequest) {
        mediaLibraryRequest = fetch("/api/crm/zalo-inbox/media-library?kind=all&limit=500", {
          credentials: "include",
          cache: "no-store",
        }).then(async response => {
          const payload = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(payload.error || "Không tải được thư viện Media");
          return (payload.assets || []).filter((asset: AutomationMediaAsset) => asset.mediaKind !== "file");
        }).finally(() => { mediaLibraryRequest = null; });
      }
      const assets = await mediaLibraryRequest;
      mediaLibraryCache = assets;
      setLibrary(assets);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không tải được thư viện Media");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open || assetIds.length > 0) void loadLibrary();
  }, [assetIds.length, loadLibrary, open]);
  useEffect(() => { if (!open) setDraftIds(assetIds); }, [assetIds, open]);

  const selectedAssets = useMemo(() => assetIds
    .map(id => library.find(asset => asset.id === id))
    .filter((asset): asset is AutomationMediaAsset => Boolean(asset)), [assetIds, library]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return library.filter(asset => (kind === "all" || asset.mediaKind === kind)
      && (!normalized || asset.name.toLocaleLowerCase("vi").includes(normalized)));
  }, [kind, library, query]);

  const toggle = (id: string) => {
    setDraftIds(current => current.includes(id)
      ? current.filter(item => item !== id)
      : current.length >= 10 ? current : [...current, id]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-semibold text-slate-700">Ảnh & video đính kèm</div>
          {!compact && <div className="mt-0.5 text-[11px] text-slate-500">Dùng trực tiếp từ thư viện chung của Zalo Inbox · tối đa 10 mục</div>}
        </div>
        <button type="button" onClick={() => { setDraftIds(assetIds); setOpen(true); }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-[#0068ff] hover:bg-blue-100">
          <Plus size={13} /> {assetIds.length ? "Chỉnh sửa media" : "Thêm ảnh/video"}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-600">{error}</div>}
      {assetIds.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {selectedAssets.map(asset => (
            <div key={asset.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="aspect-square"><MediaThumb asset={asset} /></div>
              <div className="flex items-center gap-1 px-2 py-1.5">
                <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-slate-700" title={asset.name}>{asset.name}</span>
                <button type="button" onClick={() => onChange(assetIds.filter(id => id !== asset.id))}
                  className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500" aria-label={`Xóa ${asset.name}`}>
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
          {selectedAssets.length < assetIds.length && (
            <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3 text-center text-[10px] text-amber-700">
              Một số media đã bị xoá hoặc nằm ngoài giới hạn tải.
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4" role="dialog" aria-modal="true">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0068ff]"><FolderOpen size={20} /></span>
                <div><h3 className="text-base font-bold text-slate-900">Chọn từ Thư viện Media</h3><p className="text-xs text-slate-500">Kho dùng chung của Zalo Inbox · đã chọn {draftIds.length}/10</p></div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X size={18} /></button>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-slate-100 px-5 py-3">
              <label className="flex min-w-[260px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Search size={15} className="text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm theo tên file..." className="w-full bg-transparent text-sm outline-none" />
              </label>
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {(["all", "image", "video"] as const).map(value => (
                  <button key={value} type="button" onClick={() => setKind(value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${kind === value ? "bg-white text-[#0068ff] shadow-sm" : "text-slate-500"}`}>
                    {value === "all" ? "Tất cả" : value === "image" ? "Ảnh" : "Video"}
                  </button>
                ))}
              </div>
              <a href="/crm/zalo-inbox" target="_blank" className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><FolderOpen size={14} /> Quản lý thư viện</a>
            </div>
            <div className="min-h-[320px] flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex h-64 items-center justify-center gap-2 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" /> Đang tải thư viện...</div>
              ) : filtered.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-slate-400"><ImageIcon size={34} /><p className="mt-2 text-sm">Không có ảnh/video phù hợp</p></div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {filtered.map(asset => {
                    const checked = draftIds.includes(asset.id);
                    return (
                      <button key={asset.id} type="button" onClick={() => toggle(asset.id)} title={asset.name}
                        className={`overflow-hidden rounded-xl border-2 text-left transition ${checked ? "border-[#0068ff] ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300"}`}>
                        <div className="relative aspect-square">
                          <MediaThumb asset={asset} />
                          <span className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border ${checked ? "border-[#0068ff] bg-[#0068ff] text-white" : "border-white bg-white/90 text-transparent"}`}><Check size={13} /></span>
                        </div>
                        <div className="p-2"><div className="truncate text-[11px] font-semibold text-slate-700">{asset.name}</div><div className="mt-0.5 text-[10px] text-slate-400">{formatBytes(asset.sizeBytes)}</div></div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
              <span className="text-xs text-slate-500">Ảnh/video sẽ được gửi cùng nội dung của mẫu.</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Hủy</button>
                <button type="button" onClick={() => { onChange(draftIds); setOpen(false); }} className="rounded-xl bg-[#0068ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0056d6]">Thêm {draftIds.length || "media"} vào mẫu</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
