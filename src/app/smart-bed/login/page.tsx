"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BedDouble, Eye, EyeOff, LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import "./smart-bed-login.css";

export default function SmartBedLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "" });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/bed/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, mode }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Không thể đăng nhập.");
      router.replace("/dashboard");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể đăng nhập.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bed-auth-page">
      <div className="bed-auth-page__grid" />
      <section className="bed-auth-intro">
        <Link href="/" className="bed-auth-brand"><span><BedDouble size={28} /></span><b>SMARTFURNI</b></Link>
        <div>
          <span className="bed-auth-kicker">SMART BED CONTROL</span>
          <h1>Giấc ngủ của bạn.<br /><em>Trong một chạm.</em></h1>
          <p>Kết nối và điều khiển Giường Công Thái Học, Nệm Thông Minh SmartFurni trên điện thoại hoặc website.</p>
        </div>
        <div className="bed-auth-trust"><ShieldCheck size={18} /><span>Kết nối được mã hóa · Dữ liệu thiết bị thuộc về bạn</span></div>
      </section>

      <section className="bed-auth-panel">
        <div className="bed-auth-card">
          <div className="bed-auth-card__head">
            <span className="bed-auth-card__icon"><LockKeyhole size={22} /></span>
            <div><h2>{mode === "login" ? "Đăng nhập ứng dụng" : "Tạo tài khoản SmartFurni"}</h2><p>{mode === "login" ? "Tiếp tục điều khiển thiết bị của bạn" : "Đồng bộ thiết bị giữa app và website"}</p></div>
          </div>
          <div className="bed-auth-tabs">
            <button type="button" className={mode === "login" ? "is-active" : ""} onClick={() => { setMode("login"); setError(""); }}>Đăng nhập</button>
            <button type="button" className={mode === "register" ? "is-active" : ""} onClick={() => { setMode("register"); setError(""); }}>Đăng ký</button>
          </div>
          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                <label><span>Họ và tên</span><div><UserRound size={18} /><input required minLength={2} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Nguyễn Văn An" /></div></label>
                <label><span>Số điện thoại</span><div><Phone size={18} /><input inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="09xx xxx xxx" /></div></label>
              </>
            )}
            <label><span>Email</span><div><Mail size={18} /><input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="email@example.com" /></div></label>
            <label><span>Mật khẩu</span><div><LockKeyhole size={18} /><input required minLength={8} type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Tối thiểu 8 ký tự" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
            {error && <p className="bed-auth-error">{error}</p>}
            <button className="bed-auth-submit" type="submit" disabled={submitting}><span>{submitting ? "Đang xử lý..." : mode === "login" ? "Mở bảng điều khiển" : "Tạo tài khoản"}</span><ArrowRight size={19} /></button>
          </form>
          <small>Bằng việc tiếp tục, bạn đồng ý với <Link href="/terms">điều khoản sử dụng</Link> và <Link href="/privacy">chính sách bảo mật</Link> SmartFurni.</small>
        </div>
      </section>
    </main>
  );
}
