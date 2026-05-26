// Custom _error page to override Next.js default _error.js
// The default _error.js imports Html from next/document which causes
// "Html should not be imported outside of pages/_document" error during build
import type { NextPageContext } from "next";

interface ErrorProps {
  statusCode?: number;
}

function Error({ statusCode }: ErrorProps) {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "4rem", fontWeight: 800, color: "#C9A84C" }}>
          {statusCode || "Error"}
        </h1>
        <p style={{ color: "#6b7280" }}>
          {statusCode === 404 ? "Trang không tồn tại" : "Đã xảy ra lỗi"}
        </p>
        <a href="/" style={{ color: "#C9A84C" }}>Về trang chủ</a>
      </div>
    </div>
  );
}

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? (err as { statusCode?: number }).statusCode : 404;
  return { statusCode };
};

export default Error;
