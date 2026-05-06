"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
  time: string;
  options?: string[];
  link?: { label: string; href: string };
}

const BOT_NAME = "SmartFurni AI";
const QUICK_REPLIES = [
  "Xem sản phẩm",
  "Tra cứu đơn hàng",
  "Chính sách bảo hành",
  "Tư vấn chọn giường",
  "Giá và khuyến mãi",
  "Liên hệ nhân viên",
];

const BOT_RESPONSES: Record<string, { text: string; options?: string[]; link?: { label: string; href: string } }> = {
  "xem sản phẩm": {
    text: "SmartFurni hiện có 3 dòng sản phẩm chính:\n• **SmartFurni Basic** — 18.900.000đ\n• **SmartFurni Pro** — 28.900.000đ\n• **SmartFurni Elite** — 45.900.000đ\n\nBạn muốn xem chi tiết dòng nào?",
    options: ["SmartFurni Basic", "SmartFurni Pro", "SmartFurni Elite"],
    link: { label: "Xem tất cả sản phẩm →", href: "/products" },
  },
  "tra cứu đơn hàng": {
    text: "Bạn có thể tra cứu trạng thái đơn hàng và thông tin bảo hành tại trang Warranty Tracker. Chỉ cần nhập mã đơn hàng (dạng SF-2026-XXXX).",
    link: { label: "Tra cứu đơn hàng →", href: "/warranty/track" },
  },
  "chính sách bảo hành": {
    text: "SmartFurni cung cấp bảo hành toàn diện:\n• Basic: 5 năm khung + 3 năm điện tử\n• Pro: 5 năm toàn diện\n• Elite: 7 năm cao cấp + bảo dưỡng 2 lần/năm\n\nXem chi tiết chính sách bảo hành:",
    link: { label: "Chính sách bảo hành →", href: "/warranty" },
  },
  "tư vấn chọn giường": {
    text: "Tôi sẽ giúp bạn chọn giường phù hợp! Hãy thử AI Sleep Advisor — chỉ 5 câu hỏi để nhận gợi ý cá nhân hóa dựa trên thói quen ngủ và tình trạng sức khỏe của bạn.",
    options: ["Bắt đầu tư vấn"],
    link: { label: "Dùng AI Sleep Advisor →", href: "/sleep-advisor" },
  },
  "giá và khuyến mãi": {
    text: "Hiện SmartFurni đang có:\n• Giảm 10% cho đơn hàng đầu tiên\n• Trả góp 0% lãi suất qua MoMo, Kredivo, VPBank\n• Miễn phí giao hàng + lắp đặt toàn quốc\n• Đổi trả 30 ngày không điều kiện",
    options: ["Xem chi tiết khuyến mãi"],
    link: { label: "Mua ngay →", href: "/products" },
  },
  "liên hệ nhân viên": {
    text: "Bạn có thể liên hệ trực tiếp với tư vấn viên SmartFurni qua:",
    options: ["Gọi 1900 1234", "Chat Zalo", "Gửi email"],
  },
  "smartfurni basic": {
    text: "**SmartFurni Basic** — 18.900.000đ\n\nTính năng nổi bật:\n• Điều chỉnh đầu giường 0–70°\n• Điều chỉnh chân giường 0–45°\n• Điều khiển qua app Bluetooth\n• Bảo hành 5 năm\n• Kích thước: Đơn, Đôi, Queen",
    link: { label: "Xem SmartFurni Basic →", href: "/products/smartfurni-basic" },
  },
  "smartfurni pro": {
    text: "**SmartFurni Pro** — 28.900.000đ\n\nTính năng nổi bật:\n• Tất cả tính năng Basic\n• Massage 8 điểm\n• Theo dõi giấc ngủ AI\n• Tích hợp Google Home / Alexa\n• Bảo hành 5 năm toàn diện",
    link: { label: "Xem SmartFurni Pro →", href: "/products/smartfurni-pro" },
  },
  "smartfurni elite": {
    text: "**SmartFurni Elite** — 45.900.000đ\n\nTính năng nổi bật:\n• Tất cả tính năng Pro\n• Apple HomeKit + Siri\n• Massage 16 điểm\n• Sạc không dây tích hợp\n• Bảo hành 7 năm cao cấp",
    link: { label: "Xem SmartFurni Elite →", href: "/products/smartfurni-elite" },
  },
  "bắt đầu tư vấn": {
    text: "Tuyệt vời! Hãy trả lời 5 câu hỏi ngắn để tôi gợi ý giường phù hợp nhất với bạn.",
    link: { label: "Bắt đầu AI Sleep Advisor →", href: "/sleep-advisor" },
  },
  default: {
    text: "Cảm ơn bạn đã liên hệ SmartFurni! Tôi chưa hiểu rõ câu hỏi của bạn. Bạn có thể chọn một trong các chủ đề dưới đây hoặc gọi hotline 1900 1234 để được hỗ trợ trực tiếp.",
    options: ["Xem sản phẩm", "Tra cứu đơn hàng", "Liên hệ nhân viên"],
  },
};

function formatTime() {
  return new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function renderBotText(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
        {i < text.split("\n").length - 1 && <br />}
      </span>
    );
  });
}

export default function FloatingSupport() {
  const pathname = usePathname();
  if (pathname?.startsWith("/lp/")) return null;
  const [mode, setMode] = useState<"closed" | "menu" | "chat">("closed");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Xin chào! Tôi là trợ lý AI của SmartFurni 👋\n\nTôi có thể giúp bạn tìm hiểu sản phẩm, tra cứu đơn hàng, hoặc tư vấn chọn giường phù hợp. Bạn cần hỗ trợ gì?",
      time: formatTime(),
      options: QUICK_REPLIES.slice(0, 4),
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnread(0);
    }
  }, [messages, mode]);

  const addBotMessage = (key: string) => {
    setTyping(true);
    setTimeout(() => {
      const response = BOT_RESPONSES[key.toLowerCase()] ?? BOT_RESPONSES.default;
      const newMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "bot",
        text: response.text,
        time: formatTime(),
        options: response.options,
        link: response.link,
      };
      setMessages((prev) => [...prev, newMsg]);
      setTyping(false);
      if (mode !== "chat") setUnread((n) => n + 1);
    }, 700 + Math.random() * 400);
  };

  const handleSend = (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: msg,
      time: formatTime(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Find best matching response
    const lower = msg.toLowerCase();
    const matchedKey = Object.keys(BOT_RESPONSES).find((k) => lower.includes(k)) ?? "default";
    addBotMessage(matchedKey);
  };

  const handleOpen = () => {
    setMode("menu");
    setUnread(0);
  };

  return (
    <div className="fixed bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-3 no-print">
      {/* Chat window */}
      {mode === "chat" && (
        <div
          className="w-80 sm:w-96 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ height: "480px", backgroundColor: "#fff", border: "1px solid #e5e7eb" }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)" }}
          >
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-none">{BOT_NAME}</p>
              <p className="text-white/70 text-xs mt-0.5">Thường trả lời ngay</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setMode("menu")}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                onClick={() => setMode("closed")}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ backgroundColor: "#f9fafb" }}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] ${msg.role === "user" ? "" : "space-y-2"}`}>
                  {msg.role === "bot" && (
                    <div className="flex items-end gap-1.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
                        style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)" }}
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                        </svg>
                      </div>
                      <div>
                        <div
                          className="rounded-2xl rounded-bl-sm px-3 py-2.5 text-xs leading-relaxed"
                          style={{ backgroundColor: "#fff", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
                        >
                          {renderBotText(msg.text)}
                        </div>
                        {msg.link && (
                          <Link
                            href={msg.link.href}
                            className="inline-block mt-1.5 text-xs font-medium px-3 py-1.5 rounded-xl transition-opacity hover:opacity-80"
                            style={{ backgroundColor: "#C9A84C15", color: "#8B6914" }}
                          >
                            {msg.link.label}
                          </Link>
                        )}
                        {msg.options && msg.options.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {msg.options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => handleSend(opt)}
                                className="text-xs px-2.5 py-1 rounded-full border transition-all hover:opacity-80"
                                style={{ borderColor: "#C9A84C60", color: "#8B6914", backgroundColor: "#C9A84C08" }}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                        <p className="text-xs mt-1 ml-1" style={{ color: "#9ca3af" }}>{msg.time}</p>
                      </div>
                    </div>
                  )}

                  {msg.role === "user" && (
                    <div>
                      <div
                        className="rounded-2xl rounded-br-sm px-3 py-2.5 text-xs leading-relaxed"
                        style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)", color: "#fff" }}
                      >
                        {msg.text}
                      </div>
                      <p className="text-xs mt-1 text-right mr-1" style={{ color: "#9ca3af" }}>{msg.time}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-end gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                    </svg>
                  </div>
                  <div
                    className="rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1"
                    style={{ backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ backgroundColor: "#C9A84C", animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 flex-shrink-0 border-t"
            style={{ backgroundColor: "#fff", borderColor: "#e5e7eb" }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Nhập tin nhắn..."
              className="flex-1 text-xs px-3 py-2 rounded-xl outline-none border"
              style={{ borderColor: "#e5e7eb", color: "#111827", backgroundColor: "#f9fafb" }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-opacity disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Menu */}
      {mode === "menu" && (
        <div
          className="w-64 rounded-2xl shadow-2xl overflow-hidden"
          style={{ backgroundColor: "#fff", border: "1px solid #e5e7eb" }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)" }}
          >
            <div>
              <p className="text-white text-sm font-semibold">Hỗ trợ SmartFurni</p>
              <p className="text-white/70 text-xs">Chọn kênh liên hệ</p>
            </div>
            <button
              onClick={() => setMode("closed")}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="p-3 space-y-2">
            {/* AI Chat */}
            <button
              onClick={() => setMode("chat")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 transition-colors text-left"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Chat với AI</p>
                <p className="text-xs text-gray-400">Trả lời ngay lập tức</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" className="ml-auto">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {/* Zalo */}
            <a
              href="https://zalo.me/0901234567"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#0068FF]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Chat Zalo</p>
                <p className="text-xs text-gray-400">0901 234 567</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" className="ml-auto">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>

            {/* Hotline */}
            <a
              href="tel:19001234"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-green-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#22C55E]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.18 6.18l1.29-1.29a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Gọi hotline</p>
                <p className="text-xs text-gray-400">1900 1234 (miễn phí)</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" className="ml-auto">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>

            {/* Email */}
            <a
              href="mailto:support@smartfurni.vn"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 transition-colors"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#C9A84C" }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Gửi email</p>
                <p className="text-xs text-gray-400">support@smartfurni.vn</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" className="ml-auto">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </a>
          </div>

          {/* Quick links */}
          <div className="px-3 pb-3">
            <div className="border-t pt-2.5 flex gap-2" style={{ borderColor: "#f3f4f6" }}>
              <Link
                href="/warranty/track"
                className="flex-1 text-center text-xs py-1.5 rounded-lg transition-colors hover:bg-amber-50"
                style={{ color: "#8B6914" }}
              >
                📦 Tra cứu đơn
              </Link>
              <Link
                href="/sleep-advisor"
                className="flex-1 text-center text-xs py-1.5 rounded-lg transition-colors hover:bg-amber-50"
                style={{ color: "#8B6914" }}
              >
                🛏️ Tư vấn giường
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main toggle button */}
      <button
        onClick={mode === "closed" ? handleOpen : () => setMode("closed")}
        style={{ background: "linear-gradient(135deg, #C9A84C, #8B6914)" }}
        className="w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95 relative"
        aria-label="Hỗ trợ khách hàng"
      >
        {mode !== "closed" ? (
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="4" y1="4" x2="18" y2="18" />
            <line x1="18" y1="4" x2="4" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}

        {/* Unread badge */}
        {unread > 0 && mode === "closed" && (
          <span
            className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: "#EF4444" }}
          >
            {unread}
          </span>
        )}
      </button>

      {/* Pulse ring when closed */}
      {mode === "closed" && (
        <span
          className="absolute bottom-0 right-0 w-14 h-14 rounded-full animate-ping opacity-20 pointer-events-none"
          style={{ backgroundColor: "#C9A84C" }}
        />
      )}
    </div>
  );
}
