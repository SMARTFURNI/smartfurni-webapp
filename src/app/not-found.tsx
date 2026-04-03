import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      fontFamily: "system-ui, sans-serif",
      background: "#f9fafb",
    }}>
      <div style={{ textAlign: "center", maxWidth: "400px" }}>
        <div style={{
          fontSize: "6rem",
          fontWeight: 800,
          color: "#C9A84C",
          lineHeight: 1,
          marginBottom: "1rem",
        }}>
          404
        </div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, color: "#1f2937", marginBottom: "0.5rem" }}>
          Trang không tồn tại
        </h1>
        <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
        </p>
        <Link href="/" style={{
          display: "inline-block",
          padding: "0.75rem 1.5rem",
          background: "#C9A84C",
          color: "#fff",
          borderRadius: "0.5rem",
          textDecoration: "none",
          fontWeight: 600,
        }}>
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
