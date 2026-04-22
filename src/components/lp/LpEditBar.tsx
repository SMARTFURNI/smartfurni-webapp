"use client";

interface LpEditBarProps {
  isEditor: boolean;
  editMode: boolean;
  onToggleEditMode: () => void;
  editedCount: number;
}

export function LpEditBar({ isEditor, editMode, onToggleEditMode, editedCount }: LpEditBarProps) {
  if (!isEditor) return null;

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 9999,
      background: editMode ? "rgba(201,168,76,0.95)" : "rgba(13,11,0,0.92)",
      border: editMode ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,0.3)",
      borderRadius: 12, padding: "10px 16px",
      display: "flex", alignItems: "center", gap: 10,
      backdropFilter: "blur(12px)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      transition: "all 0.2s",
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: editMode ? "#0D0B00" : "#C9A84C",
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 12, fontWeight: 600,
        color: editMode ? "#0D0B00" : "#C9A84C",
        fontFamily: "'Inter', sans-serif",
      }}>
        {editMode ? "Chế độ chỉnh sửa" : "Chế độ xem"}
      </span>
      {editedCount > 0 && (
        <span style={{
          background: editMode ? "rgba(13,11,0,0.2)" : "rgba(201,168,76,0.2)",
          color: editMode ? "#0D0B00" : "#C9A84C",
          borderRadius: 20, padding: "1px 8px", fontSize: 11, fontWeight: 700,
        }}>
          {editedCount} thay đổi
        </span>
      )}
      <button
        onClick={onToggleEditMode}
        style={{
          background: editMode ? "#0D0B00" : "#C9A84C",
          color: editMode ? "#C9A84C" : "#0D0B00",
          border: "none", borderRadius: 8,
          padding: "5px 12px", fontSize: 11, fontWeight: 700,
          cursor: "pointer", fontFamily: "'Inter', sans-serif",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
        onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
      >
        {editMode ? "👁 Xem trước" : "✏️ Bật chỉnh sửa"}
      </button>
    </div>
  );
}
