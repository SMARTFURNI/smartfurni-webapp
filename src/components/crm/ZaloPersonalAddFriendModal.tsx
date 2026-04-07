"use client";

import React, { useState, useEffect } from "react";
import { X, UserPlus, CheckCircle2, AlertCircle, Loader2, MessageCircle, Phone } from "lucide-react";

interface ZaloPersonalAddFriendModalProps {
  leadName: string;
  leadPhone: string;
  onClose: () => void;
}

type Step = "confirm" | "loading" | "success" | "error";

export default function ZaloPersonalAddFriendModal({
  leadName,
  leadPhone,
  onClose,
}: ZaloPersonalAddFriendModalProps) {
  const [step, setStep] = useState<Step>("confirm");
  const [errorMsg, setErrorMsg] = useState("");
  const [foundUser, setFoundUser] = useState<{ displayName: string; avatar?: string } | null>(null);
  const [customMessage, setCustomMessage] = useState(
    `Xin chào ${leadName}! Tôi là nhân viên SmartFurni, muốn kết nối với bạn qua Zalo.`
  );

  // Đóng khi nhấn Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSend = async () => {
    setStep("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/crm/zalo-inbox/send-friend-by-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: leadPhone, leadName, message: customMessage }),
      });
      const data = await res.json();
      if (data.success) {
        setFoundUser(data.user || null);
        setStep("success");
      } else {
        setErrorMsg(data.error || "Gửi lời mời thất bại");
        setStep("error");
      }
    } catch {
      setErrorMsg("Lỗi kết nối, vui lòng thử lại");
      setStep("error");
    }
  };

  const normalizedPhone = leadPhone.replace(/\s+/g, "").replace(/^\+84/, "0").replace(/^84/, "0");

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        style={{ animation: "fadeInScale 0.2s ease-out" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <UserPlus size={16} className="text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Kết bạn Zalo Personal</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Gửi qua tài khoản Zalo cá nhân</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-800 text-gray-400 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {/* Thông tin khách hàng */}
          <div className="flex items-center gap-3 p-3 bg-[rgba(255,255,255,0.04)] dark:bg-gray-800 rounded-xl mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
              {leadName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{leadName}</p>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Phone size={11} />
                <span>{normalizedPhone}</span>
              </div>
            </div>
          </div>

          {/* Step: Confirm */}
          {step === "confirm" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Lời nhắn kết bạn
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Nhập lời nhắn kết bạn..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-[rgba(255,255,255,0.06)] dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSend}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors shadow-sm"
                >
                  <UserPlus size={15} />
                  Gửi lời mời kết bạn
                </button>
              </div>
            </div>
          )}

          {/* Step: Loading */}
          {step === "loading" && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <Loader2 size={28} className="text-blue-500 animate-spin" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Đang gửi lời mời...</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tìm kiếm và gửi qua Zalo Personal</p>
              </div>
              <div className="w-full space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  </div>
                  Tìm kiếm tài khoản Zalo từ số {normalizedPhone}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <div className="w-4 h-4 rounded-full bg-[rgba(255,255,255,0.06)] dark:bg-gray-800 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                  </div>
                  Gửi lời mời kết bạn
                </div>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === "success" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 dark:text-white">Đã gửi lời mời kết bạn!</p>
                {foundUser && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Tài khoản Zalo: <span className="font-medium text-gray-700 dark:text-gray-300">{foundUser.displayName}</span>
                  </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  Lời mời đã được gửi qua Zalo Personal
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-xl transition-colors"
                >
                  Xong
                </button>
              </div>
            </div>
          )}

          {/* Step: Error */}
          {step === "error" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 dark:text-white">Gửi thất bại</p>
                <p className="text-sm text-red-500 dark:text-red-400 mt-1 px-2">{errorMsg}</p>
                {errorMsg.includes("chưa được kết nối") && (
                  <a
                    href="/crm/zalo-inbox"
                    className="inline-flex items-center gap-1 text-xs text-blue-500 hover:underline mt-2"
                  >
                    <MessageCircle size={12} />
                    Đến Zalo Inbox để đăng nhập
                  </a>
                )}
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-[rgba(255,255,255,0.06)] dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={() => setStep("confirm")}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors"
                >
                  Thử lại
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
