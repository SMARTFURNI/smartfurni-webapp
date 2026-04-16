"use client";
/**
 * ItySoftphone — Floating Softphone Widget cho SmartFurni CRM
 * Tích hợp tổng đài ITY qua JsSIP (WebRTC/SIP over WebSocket)
 *
 * Tính năng:
 * - Floating widget nổi góc dưới phải màn hình
 * - Click-to-call: gọi qua ITY click2call API (softphone/IP phone)
 * - Webphone: gọi trực tiếp trên browser qua JsSIP (WebRTC)
 * - Hiển thị trạng thái cuộc gọi (đang gọi, đổ chuông, đàm thoại, kết thúc)
 * - Lưu lịch sử cuộc gọi tự động
 * - Ghi chú nhanh sau cuộc gọi
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Phone, PhoneOff, PhoneCall, PhoneIncoming, PhoneOutgoing,
  Mic, MicOff, Volume2, VolumeX, X, Minimize2, Maximize2,
  ChevronDown, ChevronUp, Settings, Clock, User,
  Loader2, CheckCircle, AlertCircle, Keyboard,
} from "lucide-react";

// ── Theme ─────────────────────────────────────────────────────────────────────
const T = {
  dark: "#0D0B00",
  darkCard: "#1A1600",
  border: "#2A2500",
  gold: "#C9A84C",
  goldLight: "#E8C96A",
  goldBg: "rgba(201,168,76,0.12)",
  text: "#F5EDD6",
  textMuted: "#9A8A6A",
  green: "#22c55e",
  greenBg: "rgba(34,197,94,0.12)",
  red: "#ef4444",
  redBg: "rgba(239,68,68,0.12)",
  blue: "#60a5fa",
  blueBg: "rgba(96,165,250,0.12)",
  shadow: "0 8px 32px rgba(0,0,0,0.6)",
};

// ── Types ─────────────────────────────────────────────────────────────────────
type CallState = "idle" | "connecting" | "ringing" | "active" | "ended" | "error";
type CallMode = "click2call" | "webphone";

interface SoftphoneProps {
  defaultPhone?: string;
  defaultLeadId?: string;
  defaultLeadName?: string;
  onCallStarted?: (callId: string, phone: string) => void;
  onCallEnded?: (callId: string, duration: number) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function cleanPhone(phone: string): string {
  return phone.replace(/\s+/g, "").replace(/^(\+84|84)/, "0");
}

// ── Dialpad Component ─────────────────────────────────────────────────────────
function Dialpad({ onKey }: { onKey: (key: string) => void }) {
  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["*", "0", "#"],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
      {keys.flat().map(k => (
        <button key={k} onClick={() => onKey(k)}
          style={{
            background: T.border, border: "none", borderRadius: 8,
            color: T.text, fontSize: 16, fontWeight: "600",
            padding: "10px 0", cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = T.goldBg)}
          onMouseLeave={e => (e.currentTarget.style.background = T.border)}>
          {k}
        </button>
      ))}
    </div>
  );
}

// ── Main Softphone Widget ─────────────────────────────────────────────────────
export default function ItySoftphone({
  defaultPhone = "",
  defaultLeadId,
  defaultLeadName,
  onCallStarted,
  onCallEnded,
}: SoftphoneProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [callState, setCallState] = useState<CallState>("idle");
  const [callMode, setCallMode] = useState<CallMode>("click2call");
  const [phone, setPhone] = useState(defaultPhone);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [showDialpad, setShowDialpad] = useState(false);
  const [note, setNote] = useState("");
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [config, setConfig] = useState<{
    enabled: boolean;
    click2callEnabled: boolean;
    webphoneEnabled: boolean;
    extension: string;
    sipConfig?: Record<string, unknown>;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const jssipRef = useRef<unknown>(null); // JsSIP UA instance
  const sessionRef = useRef<unknown>(null); // Current SIP session
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  // Load cấu hình ITY
  useEffect(() => {
    fetch("/api/crm/ity/config")
      .then(r => r.json())
      .then(data => setConfig(data))
      .catch(() => setConfig({ enabled: false, click2callEnabled: false, webphoneEnabled: false, extension: "101" }));
  }, []);

  // Cập nhật phone khi defaultPhone thay đổi
  useEffect(() => {
    if (defaultPhone) setPhone(defaultPhone);
  }, [defaultPhone]);

  // Lắng nghe custom event ity:call từ các nút gọi bên ngoài
  useEffect(() => {
    const handleItyCallEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ phone: string; leadId?: string; leadName?: string }>).detail;
      if (!detail?.phone) return;
      setPhone(detail.phone);
      setIsOpen(true);
      setCallMode("webphone");
      // Tự động gọi sau khi set phone (delay nhỏ để state update)
      setTimeout(() => {
        const callBtn = document.getElementById("ity-webphone-call-btn");
        if (callBtn) callBtn.click();
      }, 300);
    };
    window.addEventListener("ity:call", handleItyCallEvent);
    return () => window.removeEventListener("ity:call", handleItyCallEvent);
  }, []);

  // Timer đếm thời gian cuộc gọi
  useEffect(() => {
    if (callState === "active") {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (callState !== "active") setCallDuration(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [callState]);

  // Khởi tạo JsSIP khi webphone mode
  const initJsSIP = useCallback(async () => {
    if (!config?.sipConfig) return;

    try {
      // Dynamic import JsSIP để tránh SSR issues
      const JsSIP = await import("jssip").catch(() => null);
      if (!JsSIP) {
        setErrorMsg("JsSIP chưa được cài đặt. Vui lòng dùng Click-to-Call.");
        return;
      }

      // Lấy SIP password từ API riêng
      const pwRes = await fetch("/api/crm/ity/sip-credentials");
      if (!pwRes.ok) {
        setErrorMsg("Không lấy được thông tin đăng nhập SIP.");
        return;
      }
      const { password, uri, authorizationUser } = await pwRes.json();

      // wsServers có thể là string hoặc array
      const wsUrl = Array.isArray(config.sipConfig.wsServers)
        ? (config.sipConfig.wsServers as string[])[0]
        : config.sipConfig.wsServers as string;
      const socket = new JsSIP.WebSocketInterface(wsUrl);
      const ua = new JsSIP.UA({
        sockets: [socket],
        uri,
        password,
        authorization_user: authorizationUser || uri.split(":")[1]?.split("@")[0],
        display_name: config.sipConfig.displayName as string,
        register: true,
        session_timers: false,
        register_expires: 600,
      });

      ua.on("registered", () => {
        console.log("[ITY Softphone] SIP Registered");
      });

      ua.on("unregistered", () => {
        console.log("[ITY Softphone] SIP Unregistered");
      });

      ua.on("registrationFailed", (e: unknown) => {
        console.error("[ITY Softphone] SIP Registration failed:", e);
        setErrorMsg("Đăng ký SIP thất bại. Vui lòng dùng Click-to-Call.");
      });

      ua.on("newRTCSession", (data: { session: unknown }) => {
        const session = data.session as {
          direction: string;
          remote_identity: { uri: { user: string } };
          on: (event: string, handler: unknown) => void;
          answer: (options: unknown) => void;
          terminate: () => void;
          mute: (options: { audio: boolean }) => void;
          unmute: (options: { audio: boolean }) => void;
          connection: RTCPeerConnection;
        };
        sessionRef.current = session;

        if (session.direction === "incoming") {
          setCallState("ringing");
          const callerPhone = session.remote_identity.uri.user;
          setPhone(callerPhone);
        }

        // Theo spec ITY: thêm X-userfield header để gắn cuộc gọi với lead/đơn hàng
        // Trường này sẽ được trả lại trong {userfield} của call log webhook
        session.on("sending", (sendData: { request: { getHeader: (h: string) => string; setHeader: (h: string, v: string) => void } }) => {
          const request = sendData.request;
          // Gán userfield = leadId hoặc callId để liên kết cuộc gọi với lead trong CRM
          const userfield = defaultLeadId || currentCallId || `crm_${Date.now()}`;
          request.setHeader("X-userfield", userfield);
        });

        session.on("accepted", () => setCallState("active"));
        session.on("ended", () => {
          setCallState("ended");
          onCallEnded?.(currentCallId || "", callDuration);
          setTimeout(() => setCallState("idle"), 3000);
        });
        session.on("failed", () => {
          setCallState("error");
          setErrorMsg("Cuộc gọi thất bại");
          setTimeout(() => setCallState("idle"), 3000);
        });

        // Kết nối audio
        session.on("peerconnection", (e: { peerconnection: RTCPeerConnection }) => {
          const pc = e.peerconnection;
          pc.addEventListener("track", (trackEvent: RTCTrackEvent) => {
            if (remoteAudioRef.current && trackEvent.streams[0]) {
              remoteAudioRef.current.srcObject = trackEvent.streams[0];
            }
          });
        });
      });

      ua.start();
      jssipRef.current = ua;
    } catch (err) {
      console.error("[ITY Softphone] JsSIP init error:", err);
      setErrorMsg("Lỗi khởi tạo webphone. Vui lòng dùng Click-to-Call.");
    }
  }, [config, currentCallId, callDuration, onCallEnded]);

  // Gọi qua Click-to-Call API
  const handleClick2Call = async () => {
    if (!phone.trim()) {
      setErrorMsg("Vui lòng nhập số điện thoại");
      return;
    }

    const cleanedPhone = cleanPhone(phone.trim());
    setCallState("connecting");
    setErrorMsg("");

    try {
      const res = await fetch("/api/crm/ity/click2call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanedPhone,
          leadId: defaultLeadId,
          leadName: defaultLeadName,
          extension: config?.extension,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Lỗi khởi tạo cuộc gọi");
      }

      setCurrentCallId(data.callId);
      setCallState("ringing");
      onCallStarted?.(data.callId, cleanedPhone);

      // Sau 30 giây nếu không có phản hồi, chuyển sang active (giả định)
      setTimeout(() => {
        setCallState(prev => prev === "ringing" ? "active" : prev);
      }, 5000);

    } catch (err) {
      setCallState("error");
      setErrorMsg(err instanceof Error ? err.message : "Lỗi kết nối");
      setTimeout(() => setCallState("idle"), 4000);
    }
  };

  // Gọi qua Webphone (JsSIP)
  const handleWebphoneCall = useCallback(async () => {
    if (!phone.trim()) {
      setErrorMsg("Vui lòng nhập số điện thoại");
      return;
    }
    const cleanedPhone = cleanPhone(phone.trim());
    setCallState("connecting");
    setErrorMsg("");

    try {
      // Khởi tạo JsSIP nếu chưa có
      if (!jssipRef.current) {
        await initJsSIP();
      }

      // Đợi JsSIP đăng ký xong rồi gọi
      const tryCall = (retries = 0) => {
        const ua = jssipRef.current as {
          isRegistered: () => boolean;
          call: (target: string, options: Record<string, unknown>) => unknown;
        } | null;

        if (!ua) {
          setCallState("error");
          setErrorMsg("Không khởi tạo được webphone");
          return;
        }

        if (!ua.isRegistered() && retries < 10) {
          setTimeout(() => tryCall(retries + 1), 500);
          return;
        }

        const domain = process.env.NEXT_PUBLIC_ITY_DOMAIN || config?.domain || "c89866.ity.vn";
        const target = `sip:${cleanedPhone}@${domain}`;
        const callId = `webphone_${Date.now()}`;
        setCurrentCallId(callId);

        try {
          ua.call(target, {
            mediaConstraints: { audio: true, video: false },
            rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
          });
          onCallStarted?.(callId, cleanedPhone);
        } catch (callErr) {
          setCallState("error");
          setErrorMsg(callErr instanceof Error ? callErr.message : "Lỗi gọi");
          setTimeout(() => setCallState("idle"), 4000);
        }
      };

      setTimeout(() => tryCall(), 300);
    } catch (err) {
      setCallState("error");
      setErrorMsg(err instanceof Error ? err.message : "Lỗi kết nối webphone");
      setTimeout(() => setCallState("idle"), 4000);
    }
  }, [phone, config, initJsSIP, onCallStarted, currentCallId]);

  // Kết thúc cuộc gọi
  const handleHangup = async () => {
    // Kết thúc JsSIP session nếu có
    if (sessionRef.current) {
      try {
        (sessionRef.current as { terminate: () => void }).terminate();
      } catch { /* ignore */ }
      sessionRef.current = null;
    }

    const duration = callDuration;
    setCallState("ended");
    onCallEnded?.(currentCallId || "", duration);

    // Lưu ghi chú nếu có
    if (note.trim() && currentCallId) {
      await fetch("/api/crm/call-logs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentCallId, note: note.trim() }),
      }).catch(() => {});
    }

    setTimeout(() => {
      setCallState("idle");
      setNote("");
      setCurrentCallId(null);
    }, 3000);
  };

  // Toggle mute
  const handleMute = () => {
    if (sessionRef.current) {
      const session = sessionRef.current as {
        mute: (o: { audio: boolean }) => void;
        unmute: (o: { audio: boolean }) => void;
      };
      if (isMuted) session.unmute({ audio: true });
      else session.mute({ audio: true });
    }
    setIsMuted(!isMuted);
  };

  // Thêm số vào phone input
  const handleDialpadKey = (key: string) => {
    setPhone(prev => prev + key);
    // Nếu đang trong cuộc gọi, gửi DTMF
    if (callState === "active" && sessionRef.current) {
      try {
        (sessionRef.current as { sendDTMF: (k: string) => void }).sendDTMF(key);
      } catch { /* ignore */ }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const isInCall = callState === "active" || callState === "ringing" || callState === "connecting";

  // Floating button khi đóng
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        title="Mở softphone ITY"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          width: 52, height: 52, borderRadius: "50%",
          background: isInCall ? T.green : T.gold,
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 16px ${isInCall ? "rgba(34,197,94,0.4)" : "rgba(201,168,76,0.4)"}`,
          transition: "all 0.2s",
          animation: isInCall ? "pulse 1.5s infinite" : "none",
        }}>
        <Phone size={22} color={T.dark} />
        {isInCall && (
          <span style={{
            position: "absolute", top: -2, right: -2,
            width: 14, height: 14, borderRadius: "50%",
            background: T.green, border: `2px solid ${T.dark}`,
          }} />
        )}
        <style>{`@keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }`}</style>
      </button>
    );
  }

  return (
    <>
      {/* Remote audio element */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: "none" }} />

      {/* Softphone Widget */}
      <div style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 9999,
        width: 320, borderRadius: 16,
        background: T.darkCard,
        border: `1px solid ${T.border}`,
        boxShadow: T.shadow,
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px",
          background: T.dark,
          borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: T.goldBg, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Phone size={14} color={T.gold} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: "600", color: T.text }}>ITY Softphone</p>
              <p style={{ margin: 0, fontSize: 11, color: T.textMuted }}>
                {config?.extension ? `Máy lẻ: ${config.extension}` : "Chưa cấu hình"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setIsMinimized(!isMinimized)}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 4 }}>
              {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.textMuted, padding: 4 }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <div style={{ padding: 16 }}>
            {/* Mode selector */}
            {!isInCall && callState !== "ended" && (
              <div style={{
                display: "flex", gap: 6, marginBottom: 14,
                background: T.dark, borderRadius: 8, padding: 4,
              }}>
                {(["click2call", "webphone"] as CallMode[]).map(mode => (
                  <button key={mode} onClick={() => setCallMode(mode)}
                    style={{
                      flex: 1, padding: "6px 0", borderRadius: 6, border: "none",
                      fontSize: 11, fontWeight: "600", cursor: "pointer",
                      background: callMode === mode ? T.goldBg : "transparent",
                      color: callMode === mode ? T.gold : T.textMuted,
                      transition: "all 0.15s",
                    }}>
                    {mode === "click2call" ? "📞 Click-to-Call" : "🎧 Webphone"}
                  </button>
                ))}
              </div>
            )}

            {/* Phone input */}
            {callState === "idle" && (
              <>
                <div style={{ position: "relative", marginBottom: 10 }}>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại..."
                    onKeyDown={e => e.key === "Enter" && handleClick2Call()}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: T.dark, border: `1px solid ${T.border}`,
                      borderRadius: 8, padding: "10px 40px 10px 12px",
                      color: T.text, fontSize: 15, fontWeight: "600",
                      outline: "none", letterSpacing: 1,
                    }}
                  />
                  <button onClick={() => setShowDialpad(!showDialpad)}
                    style={{
                      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: showDialpad ? T.gold : T.textMuted,
                    }}>
                    <Keyboard size={16} />
                  </button>
                </div>

                {showDialpad && (
                  <div style={{ marginBottom: 10 }}>
                    <Dialpad onKey={handleDialpadKey} />
                  </div>
                )}

                {defaultLeadName && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    marginBottom: 10, padding: "6px 10px",
                    background: T.dark, borderRadius: 6,
                  }}>
                    <User size={12} color={T.textMuted} />
                    <span style={{ fontSize: 12, color: T.textMuted }}>{defaultLeadName}</span>
                  </div>
                )}

                {errorMsg && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    marginBottom: 10, padding: "8px 10px",
                    background: T.redBg, borderRadius: 6,
                  }}>
                    <AlertCircle size={13} color={T.red} />
                    <span style={{ fontSize: 12, color: T.red }}>{errorMsg}</span>
                  </div>
                )}

                <button
                  id="ity-webphone-call-btn"
                  onClick={callMode === "click2call" ? handleClick2Call : handleWebphoneCall}
                  disabled={!phone.trim()}
                  style={{
                    width: "100%", padding: "11px 0",
                    background: phone.trim() ? T.gold : T.border,
                    border: "none", borderRadius: 10,
                    color: phone.trim() ? T.dark : T.textMuted,
                    fontSize: 14, fontWeight: "700", cursor: phone.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all 0.15s",
                  }}>
                  <Phone size={16} />
                  {callMode === "click2call" ? "Gọi ngay" : "Kết nối Webphone"}
                </button>
              </>
            )}

            {/* Connecting state */}
            {callState === "connecting" && (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <Loader2 size={32} color={T.gold} style={{ animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
                <p style={{ margin: 0, color: T.text, fontWeight: "600" }}>Đang kết nối...</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: T.textMuted }}>{cleanPhone(phone)}</p>
                <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
              </div>
            )}

            {/* Ringing state */}
            {callState === "ringing" && (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: T.goldBg, display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 10px",
                  animation: "ring 1s ease-in-out infinite",
                }}>
                  <PhoneCall size={26} color={T.gold} />
                </div>
                <p style={{ margin: 0, color: T.text, fontWeight: "600", fontSize: 14 }}>Đang đổ chuông...</p>
                <p style={{ margin: "4px 0 12px", fontSize: 13, color: T.textMuted }}>{cleanPhone(phone)}</p>
                {defaultLeadName && <p style={{ margin: "0 0 12px", fontSize: 12, color: T.gold }}>{defaultLeadName}</p>}
                <button onClick={handleHangup}
                  style={{
                    background: T.redBg, border: `1px solid ${T.red}`,
                    borderRadius: 8, padding: "8px 24px",
                    color: T.red, fontSize: 13, fontWeight: "600", cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}>
                  <PhoneOff size={14} /> Hủy
                </button>
                <style>{`@keyframes ring { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }`}</style>
              </div>
            )}

            {/* Active call */}
            {callState === "active" && (
              <div>
                <div style={{ textAlign: "center", marginBottom: 14 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%",
                    background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 8px",
                  }}>
                    <Phone size={22} color={T.green} />
                  </div>
                  <p style={{ margin: 0, color: T.text, fontWeight: "600", fontSize: 14 }}>{cleanPhone(phone)}</p>
                  {defaultLeadName && <p style={{ margin: "2px 0 0", fontSize: 12, color: T.gold }}>{defaultLeadName}</p>}
                  <div style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    marginTop: 6, padding: "3px 10px",
                    background: T.greenBg, borderRadius: 20,
                  }}>
                    <Clock size={11} color={T.green} />
                    <span style={{ fontSize: 13, fontWeight: "700", color: T.green, letterSpacing: 1 }}>
                      {formatTime(callDuration)}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 14 }}>
                  <button onClick={handleMute}
                    title={isMuted ? "Bỏ tắt tiếng" : "Tắt tiếng"}
                    style={{
                      width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
                      background: isMuted ? T.redBg : T.border,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                    {isMuted ? <MicOff size={18} color={T.red} /> : <Mic size={18} color={T.textMuted} />}
                  </button>
                  <button onClick={() => setIsSpeaker(!isSpeaker)}
                    title={isSpeaker ? "Tắt loa" : "Bật loa"}
                    style={{
                      width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
                      background: isSpeaker ? T.goldBg : T.border,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                    {isSpeaker ? <Volume2 size={18} color={T.gold} /> : <VolumeX size={18} color={T.textMuted} />}
                  </button>
                  <button onClick={() => setShowDialpad(!showDialpad)}
                    title="Bàn phím"
                    style={{
                      width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
                      background: showDialpad ? T.goldBg : T.border,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                    <Keyboard size={18} color={showDialpad ? T.gold : T.textMuted} />
                  </button>
                  <button onClick={handleHangup}
                    title="Kết thúc cuộc gọi"
                    style={{
                      width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
                      background: T.redBg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                    <PhoneOff size={18} color={T.red} />
                  </button>
                </div>

                {showDialpad && (
                  <div style={{ marginBottom: 10 }}>
                    <Dialpad onKey={handleDialpadKey} />
                  </div>
                )}

                {/* Quick note */}
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú nhanh..."
                  rows={2}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: T.dark, border: `1px solid ${T.border}`,
                    borderRadius: 8, padding: "8px 10px",
                    color: T.text, fontSize: 12, resize: "none", outline: "none",
                  }}
                />
              </div>
            )}

            {/* Ended state */}
            {callState === "ended" && (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <CheckCircle size={36} color={T.green} style={{ margin: "0 auto 8px" }} />
                <p style={{ margin: 0, color: T.text, fontWeight: "600" }}>Cuộc gọi kết thúc</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: T.textMuted }}>
                  Thời gian: {formatTime(callDuration)}
                </p>
              </div>
            )}

            {/* Error state */}
            {callState === "error" && (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <AlertCircle size={36} color={T.red} style={{ margin: "0 auto 8px" }} />
                <p style={{ margin: 0, color: T.red, fontWeight: "600" }}>Cuộc gọi thất bại</p>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: T.textMuted }}>{errorMsg}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Compact Call Button (dùng trong danh sách leads) ─────────────────────────
export function ItyCallButton({
  phone,
  leadId,
  leadName,
  size = "sm",
  onCallStarted,
}: {
  phone: string;
  leadId?: string;
  leadName?: string;
  size?: "sm" | "md";
  onCallStarted?: () => void;
}) {
  const [calling, setCalling] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);

  const handleCall = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (calling || done) return;
    // Dispatch custom event để ItySoftphone widget nhận và gọi qua Webphone
    window.dispatchEvent(new CustomEvent("ity:call", {
      detail: { phone: cleanPhone(phone), leadId, leadName }
    }));
    setDone(true);
    onCallStarted?.();
    setTimeout(() => setDone(false), 2000);
  };

  const iconSize = size === "sm" ? 12 : 15;
  const btnSize = size === "sm" ? 26 : 32;

  return (
    <button
      onClick={handleCall}
      title={`Gọi ${phone} qua ITY`}
      style={{
        width: btnSize, height: btnSize, borderRadius: "50%",
        border: "none", cursor: calling ? "wait" : "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: done ? T.greenBg : error ? T.redBg : T.goldBg,
        transition: "all 0.15s",
        flexShrink: 0,
      }}>
      {calling ? (
        <Loader2 size={iconSize} color={T.gold} style={{ animation: "spin 1s linear infinite" }} />
      ) : done ? (
        <CheckCircle size={iconSize} color={T.green} />
      ) : error ? (
        <AlertCircle size={iconSize} color={T.red} />
      ) : (
        <Phone size={iconSize} color={T.gold} />
      )}
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </button>
  );
}
