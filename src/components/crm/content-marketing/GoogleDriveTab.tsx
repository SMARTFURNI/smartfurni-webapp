"use client";

import React, { useState, useCallback, useRef } from "react";
import {
  FolderOpen,
  FolderClosed,
  ChevronRight,
  Home,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Image as ImageIcon,
  Film,
  File,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
}

interface UploadedFile {
  id: string;
  name: string;
  webViewLink: string;
  mimeType: string;
  size?: string;
}

interface UploadItem {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  result?: UploadedFile;
  error?: string;
  progress?: number;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="w-4 h-4 text-blue-400" />;
  if (mimeType.startsWith("video/")) return <Film className="w-4 h-4 text-purple-400" />;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text"))
    return <FileText className="w-4 h-4 text-amber-400" />;
  return <File className="w-4 h-4 text-gray-400" />;
}

function formatFileSize(bytes?: string | number): string {
  if (!bytes) return "";
  const n = typeof bytes === "string" ? parseInt(bytes) : bytes;
  if (isNaN(n)) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function GoogleDriveTab() {
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([
    { id: "root", name: "SmartFurni Drive" },
  ]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [foldersError, setFoldersError] = useState<string | null>(null);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFolderId = breadcrumb[breadcrumb.length - 1].id;
  const apiParentId = currentFolderId === "root" ? undefined : currentFolderId;

  const fetchFolders = useCallback(async (folderId?: string) => {
    setLoadingFolders(true);
    setFoldersError(null);
    try {
      const url = folderId
        ? `/api/crm/drive/folders?parentId=${folderId}`
        : `/api/crm/drive/folders`;
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi tải thư mục");
      setFolders(data.folders || []);
    } catch (e: unknown) {
      setFoldersError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingFolders(false);
    }
  }, []);

  // Load folders on mount
  React.useEffect(() => {
    fetchFolders(apiParentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateTo = (folder: DriveFolder) => {
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setFolders([]);
    fetchFolders(folder.id);
  };

  const navigateToBreadcrumb = (index: number) => {
    const newCrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newCrumb);
    const targetId = newCrumb[newCrumb.length - 1].id;
    fetchFolders(targetId === "root" ? undefined : targetId);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newItems: UploadItem[] = Array.from(files).map((f) => ({
      file: f,
      status: "pending",
    }));
    setUploadItems((prev) => [...prev, ...newItems]);
  };

  const uploadAll = async () => {
    const pendingIndices = uploadItems
      .map((item, i) => (item.status === "pending" ? i : -1))
      .filter((i) => i !== -1);

    if (pendingIndices.length === 0) return;

    const folderId = currentFolderId === "root" ? undefined : currentFolderId;

    for (const idx of pendingIndices) {
      setUploadItems((prev) =>
        prev.map((item, i) => (i === idx ? { ...item, status: "uploading" } : item))
      );

      try {
        const formData = new FormData();
        formData.append("file", uploadItems[idx].file);
        if (folderId) formData.append("folderId", folderId);

        const res = await fetch("/api/crm/drive/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload thất bại");

        setUploadItems((prev) =>
          prev.map((item, i) =>
            i === idx ? { ...item, status: "done", result: data.file } : item
          )
        );
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setUploadItems((prev) =>
          prev.map((item, i) =>
            i === idx ? { ...item, status: "error", error: msg } : item
          )
        );
      }
    }
  };

  const removeUploadItem = (idx: number) => {
    setUploadItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const clearCompleted = () => {
    setUploadItems((prev) => prev.filter((item) => item.status !== "done"));
  };

  const pendingCount = uploadItems.filter((i) => i.status === "pending").length;
  const uploadingCount = uploadItems.filter((i) => i.status === "uploading").length;
  const doneCount = uploadItems.filter((i) => i.status === "done").length;

  return (
    <div className="flex flex-col gap-6 p-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
            <FolderOpen className="w-6 h-6" />
            Google Drive Upload
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Chọn thư mục đích rồi upload file trực tiếp lên Google Drive
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Folder Browser */}
        <div className="flex flex-col gap-4">
          <div
            className="rounded-xl border border-amber-500/20 bg-black/30 backdrop-blur-sm overflow-hidden"
            style={{ minHeight: 340 }}
          >
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 px-4 py-3 border-b border-amber-500/10 bg-black/20 flex-wrap">
              {breadcrumb.map((crumb, idx) => (
                <React.Fragment key={crumb.id}>
                  {idx === 0 ? (
                    <button
                      onClick={() => navigateToBreadcrumb(0)}
                      className="flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
                    >
                      <Home className="w-3.5 h-3.5" />
                      {crumb.name}
                    </button>
                  ) : (
                    <button
                      onClick={() => navigateToBreadcrumb(idx)}
                      className={`text-sm transition-colors ${
                        idx === breadcrumb.length - 1
                          ? "text-white font-semibold"
                          : "text-gray-400 hover:text-gray-200"
                      }`}
                    >
                      {crumb.name}
                    </button>
                  )}
                  {idx < breadcrumb.length - 1 && (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                  )}
                </React.Fragment>
              ))}
              <button
                onClick={() => fetchFolders(apiParentId)}
                className="ml-auto text-gray-500 hover:text-amber-400 transition-colors"
                title="Làm mới"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Folder list */}
            <div className="p-3 flex flex-col gap-1 overflow-y-auto" style={{ maxHeight: 320 }}>
              {loadingFolders ? (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Đang tải thư mục...
                </div>
              ) : foldersError ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2 text-red-400">
                  <AlertCircle className="w-6 h-6" />
                  <p className="text-sm text-center">{foldersError}</p>
                  <button
                    onClick={() => fetchFolders(apiParentId)}
                    className="text-xs text-amber-400 hover:underline"
                  >
                    Thử lại
                  </button>
                </div>
              ) : folders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-600 gap-2">
                  <FolderClosed className="w-8 h-8 opacity-40" />
                  <p className="text-sm">Thư mục trống</p>
                </div>
              ) : (
                folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => navigateTo(folder)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all text-left group"
                  >
                    <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0 group-hover:text-amber-300" />
                    <span className="text-sm text-gray-200 group-hover:text-white truncate flex-1">
                      {folder.name}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-amber-400 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Current destination indicator */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">Thư mục đích upload:</p>
              <p className="text-sm font-medium text-amber-300 truncate">
                {breadcrumb.map((c) => c.name).join(" / ")}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Upload Zone */}
        <div className="flex flex-col gap-4">
          {/* Drop zone */}
          <div
            className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer ${
              isDragging
                ? "border-amber-400 bg-amber-500/10"
                : "border-amber-500/30 bg-black/20 hover:border-amber-500/50 hover:bg-amber-500/5"
            }`}
            style={{ minHeight: 160 }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            <div className="flex flex-col items-center justify-center h-full py-10 gap-3 pointer-events-none">
              <div
                className={`p-3 rounded-full transition-colors ${
                  isDragging ? "bg-amber-500/20" : "bg-amber-500/10"
                }`}
              >
                <Upload className={`w-6 h-6 ${isDragging ? "text-amber-300" : "text-amber-400"}`} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-200">
                  {isDragging ? "Thả file vào đây" : "Kéo thả file hoặc click để chọn"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Hỗ trợ tất cả định dạng file
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {/* Upload queue */}
          {uploadItems.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-black/30 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-500/10 bg-black/20">
                <span className="text-xs font-medium text-gray-300">
                  {uploadItems.length} file
                  {pendingCount > 0 && (
                    <span className="text-amber-400 ml-1">({pendingCount} chờ)</span>
                  )}
                  {doneCount > 0 && (
                    <span className="text-green-400 ml-1">({doneCount} xong)</span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {doneCount > 0 && (
                    <button
                      onClick={clearCompleted}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Xóa đã xong
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col divide-y divide-amber-500/5 overflow-y-auto" style={{ maxHeight: 220 }}>
                {uploadItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
                    {getFileIcon(item.file.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-200 truncate">{item.file.name}</p>
                      <p className="text-xs text-gray-600">
                        {formatFileSize(item.file.size)}
                        {item.status === "done" && item.result?.webViewLink && (
                          <a
                            href={item.result.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-amber-400 hover:text-amber-300 inline-flex items-center gap-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Xem <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {item.status === "error" && (
                          <span className="ml-2 text-red-400">{item.error}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {item.status === "pending" && (
                        <span className="text-xs text-gray-500 px-1.5 py-0.5 rounded bg-gray-800">
                          Chờ
                        </span>
                      )}
                      {item.status === "uploading" && (
                        <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                      )}
                      {item.status === "done" && (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      )}
                      {item.status === "error" && (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                      {item.status !== "uploading" && (
                        <button
                          onClick={() => removeUploadItem(idx)}
                          className="text-gray-600 hover:text-gray-300 transition-colors ml-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload button */}
          <button
            onClick={uploadAll}
            disabled={pendingCount === 0 || uploadingCount > 0}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all ${
              pendingCount > 0 && uploadingCount === 0
                ? "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 cursor-pointer"
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }`}
          >
            {uploadingCount > 0 ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang upload {uploadingCount} file...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                {pendingCount > 0
                  ? `Upload ${pendingCount} file lên Drive`
                  : "Chọn file để upload"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
