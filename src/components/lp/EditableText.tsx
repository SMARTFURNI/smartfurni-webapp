"use client";
import { useState, useRef, useEffect } from "react";

interface EditableTextProps {
  slug: string;
  blockKey: string;
  defaultValue: string;
  editMode: boolean;
  as?: "h1"|"h2"|"h3"|"h4"|"h5"|"h6"|"p"|"span"|"div"|"li";
  style?: React.CSSProperties;
  multiline?: boolean;
  savedValue?: string;
  onSaved?: (blockKey: string, newValue: string) => void;
  onDeleted?: (blockKey: string) => void;
}

export function EditableText({
  slug, blockKey, defaultValue, editMode,
  as: Tag = "span", style, multiline = false,
  savedValue, onSaved, onDeleted,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const displayValue = savedValue ?? defaultValue;

  useEffect(() => { if (isEditing && inputRef.current) { inputRef.current.focus(); } }, [isEditing]);
  useEffect(() => { if (!editMode) setIsEditing(false); }, [editMode]);

  const handleEdit = () => { setEditValue(displayValue); setIsEditing(true); };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/lp-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, blockKey, content: editValue }),
      });
      if (res.ok) { onSaved?.(blockKey, editValue); setIsEditing(false); }
      else alert("Lưu thất bại. Vui lòng thử lại.");
    } catch { alert("Lỗi kết nối."); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Xóa nội dung và reset về mặc định?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/lp-content?slug=${encodeURIComponent(slug)}&blockKey=${encodeURIComponent(blockKey)}`, { method: "DELETE" });
      if (res.ok) { onDeleted?.(blockKey); setIsEditing(false); }
      else alert("Xóa thất bại.");
    } catch { alert("Lỗi kết nối."); }
    finally { setIsDeleting(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { setIsEditing(false); return; }
    if (!multiline && e.key === "Enter") { e.preventDefault(); handleSave(); return; }
    if (multiline && e.key === "Enter" && (e.ctrlKey || e.metaKey)) { handleSave(); return; }
  };

  if (!editMode) return <Tag style={style}>{displayValue}</Tag>;

  if (isEditing) {
    return (
      <span style={{ display: "inline-block", position: "relative", width: "100%" }}>
        {multiline ? (
          <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} value={editValue}
            onChange={e => setEditValue(e.target.value)} onKeyDown={handleKeyDown} rows={4}
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(13,11,0,0.95)",
              border: "2px solid #C9A84C", borderRadius: 8, padding: "10px 12px",
              color: "#F5EDD6", fontSize: "inherit", fontFamily: "inherit",
              lineHeight: "inherit", resize: "vertical", outline: "none" }} />
        ) : (
          <input ref={inputRef as React.RefObject<HTMLInputElement>} type="text" value={editValue}
            onChange={e => setEditValue(e.target.value)} onKeyDown={handleKeyDown}
            style={{ width: "100%", boxSizing: "border-box", background: "rgba(13,11,0,0.95)",
              border: "2px solid #C9A84C", borderRadius: 8, padding: "8px 12px",
              color: "#F5EDD6", fontSize: "inherit", fontFamily: "inherit", outline: "none" }} />
        )}
        <span style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button onClick={handleSave} disabled={isSaving}
            style={{ background: "#C9A84C", color: "#0D0B00", border: "none", borderRadius: 6,
              padding: "5px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: isSaving ? 0.6 : 1 }}>
            {isSaving ? "Đang lưu..." : "✓ Lưu"}
          </button>
          <button onClick={() => setIsEditing(false)}
            style={{ background: "rgba(255,255,255,0.08)", color: "#A89070",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6,
              padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
            Hủy
          </button>
          {savedValue && (
            <button onClick={handleDelete} disabled={isDeleting}
              style={{ background: "rgba(239,68,68,0.15)", color: "#F87171",
                border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6,
                padding: "5px 12px", fontSize: 12, cursor: "pointer", marginLeft: "auto" }}>
              {isDeleting ? "..." : "🗑 Xóa"}
            </button>
          )}
        </span>
        <span style={{ display: "block", fontSize: 10, color: "#A89070", marginTop: 4 }}>
          {multiline ? "Ctrl+Enter để lưu · Esc để hủy" : "Enter để lưu · Esc để hủy"}
        </span>
      </span>
    );
  }

  return (
    <Tag style={{ ...style, position: "relative", cursor: "pointer",
        outline: isHovered ? "2px dashed rgba(201,168,76,0.6)" : "2px dashed transparent",
        outlineOffset: 3, borderRadius: 4, transition: "outline 0.15s" }}
      onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}
      onClick={handleEdit} title="Click để chỉnh sửa">
      {displayValue}
      {isHovered && (
        <span style={{ position: "absolute", top: -28, right: 0, zIndex: 200, display: "flex", gap: 4 }}
          onClick={e => e.stopPropagation()}>
          <button onClick={handleEdit}
            style={{ background: "#C9A84C", color: "#0D0B00", border: "none", borderRadius: 5,
              padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            ✏️ Sửa
          </button>
          {savedValue && (
            <button onClick={handleDelete}
              style={{ background: "rgba(239,68,68,0.2)", color: "#F87171",
                border: "1px solid rgba(239,68,68,0.4)", borderRadius: 5,
                padding: "3px 8px", fontSize: 11, cursor: "pointer" }}>
              🗑
            </button>
          )}
        </span>
      )}
    </Tag>
  );
}
