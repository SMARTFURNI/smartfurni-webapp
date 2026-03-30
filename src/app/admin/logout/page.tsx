"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Client component: gọi API logout endpoint để xóa session và redirect về login.
 */
export default function AdminLogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const logout = async () => {
      try {
        // Call API endpoint to delete session and redirect
        const response = await fetch("/api/admin/logout", {
          method: "POST",
          credentials: "include",
        });
        
        if (response.ok) {
          // API will handle redirect, but we also redirect just in case
          router.push("/admin/login");
        }
      } catch (error) {
        console.error("Logout error:", error);
        // Fallback: redirect to login
        router.push("/admin/login");
      }
    };

    logout();
  }, [router]);

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: "#f5f5f5",
    }}>
      <div style={{ textAlign: "center" }}>
        <h2>Đang đăng xuất...</h2>
        <p>Vui lòng chờ</p>
      </div>
    </div>
  );
}
