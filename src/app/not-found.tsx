import Link from "next/link";

export default function NotFound() {
  return (
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <div style={{
              fontSize: "6rem",
              fontWeight: 800,
              color: "#C9A84C",
              lineHeight: 1,
              marginBottom: "1rem",
            }}>404</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", marginBottom: "0.5rem" }}>
              Trang không tồn tại
            </h1>
            <p style={{ color: "#6b7280", marginBottom: "2rem", lineHeight: 1.6 }}>
              Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
            </p>
            <Link href="/" style={{
              display: "inline-block",
              background: "#C9A84C",
              color: "#fff",
              padding: "0.75rem 2rem",
              borderRadius: "0.75rem",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "0.95rem",
            }}>
              ← Về trang chủ
            </Link>
          </div>
        </div>
  );
}
