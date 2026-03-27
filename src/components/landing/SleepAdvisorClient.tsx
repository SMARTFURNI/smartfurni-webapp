"use client";
import { useState } from "react";
import Link from "next/link";
import type { SiteTheme } from "@/lib/theme-types";

interface Props {
  theme: SiteTheme;
}

interface Question {
  id: string;
  text: string;
  options: { label: string; value: string; icon: string }[];
}

interface Answer {
  questionId: string;
  value: string;
}

interface Recommendation {
  productSlug: string;
  productName: string;
  price: number;
  matchScore: number;
  reasons: string[];
  configSuggestion: string;
}

const QUESTIONS: Question[] = [
  {
    id: "sleep_position",
    text: "Bạn thường ngủ ở tư thế nào?",
    options: [
      { label: "Nằm ngửa", value: "back", icon: "🛌" },
      { label: "Nằm nghiêng", value: "side", icon: "↩️" },
      { label: "Nằm sấp", value: "stomach", icon: "⬇️" },
      { label: "Thay đổi liên tục", value: "mixed", icon: "🔄" },
    ],
  },
  {
    id: "health_concern",
    text: "Bạn có vấn đề sức khỏe nào liên quan đến giấc ngủ không?",
    options: [
      { label: "Đau lưng / cột sống", value: "back_pain", icon: "🦴" },
      { label: "Ngủ ngáy / khó thở", value: "snoring", icon: "😴" },
      { label: "Mất ngủ / khó vào giấc", value: "insomnia", icon: "🌙" },
      { label: "Không có vấn đề gì", value: "none", icon: "✅" },
    ],
  },
  {
    id: "partner",
    text: "Bạn ngủ cùng ai?",
    options: [
      { label: "Ngủ một mình", value: "solo", icon: "👤" },
      { label: "Ngủ cùng bạn đời", value: "partner", icon: "👫" },
      { label: "Đôi khi có trẻ nhỏ", value: "kids", icon: "👨‍👩‍👧" },
      { label: "Thay đổi", value: "varies", icon: "🔀" },
    ],
  },
  {
    id: "tech_level",
    text: "Bạn muốn mức độ công nghệ như thế nào?",
    options: [
      { label: "Đơn giản, dễ dùng", value: "basic", icon: "🎛️" },
      { label: "Có tính năng massage", value: "massage", icon: "💆" },
      { label: "Kết nối app & Smart Home", value: "smart", icon: "📱" },
      { label: "AI tự động tối ưu giấc ngủ", value: "ai", icon: "🤖" },
    ],
  },
  {
    id: "budget",
    text: "Ngân sách của bạn là bao nhiêu?",
    options: [
      { label: "Dưới 30 triệu", value: "low", icon: "💰" },
      { label: "30 – 50 triệu", value: "mid", icon: "💰💰" },
      { label: "50 – 70 triệu", value: "high", icon: "💰💰💰" },
      { label: "Trên 70 triệu", value: "premium", icon: "👑" },
    ],
  },
];

function getRecommendations(answers: Answer[]): Recommendation[] {
  const get = (id: string) => answers.find((a) => a.questionId === id)?.value ?? "";

  const sleepPos = get("sleep_position");
  const health = get("health_concern");
  const tech = get("tech_level");
  const budget = get("budget");
  const partner = get("partner");

  const recs: Recommendation[] = [];

  // SmartFurni Elite
  let eliteScore = 0;
  const eliteReasons: string[] = [];
  if (health === "snoring") { eliteScore += 30; eliteReasons.push("AI tự động điều chỉnh góc đầu giường khi phát hiện ngáy"); }
  if (health === "back_pain") { eliteScore += 25; eliteReasons.push("Cảm biến sinh trắc học tối ưu hóa tư thế cột sống"); }
  if (tech === "ai") { eliteScore += 30; eliteReasons.push("AI Sleep Intelligence theo dõi giấc ngủ suốt đêm"); }
  if (budget === "premium" || budget === "high") { eliteScore += 20; eliteReasons.push("Phù hợp ngân sách cao cấp"); }
  if (partner === "partner") { eliteScore += 15; eliteReasons.push("Chế độ dual-zone cho 2 người với nhu cầu khác nhau"); }
  if (sleepPos === "back") { eliteScore += 10; eliteReasons.push("Tư thế nằm ngửa được tối ưu với góc đầu giường 15-30°"); }
  if (eliteScore > 0) {
    recs.push({
      productSlug: "smartfurni-elite",
      productName: "SmartFurni Elite",
      price: 65000000,
      matchScore: Math.min(eliteScore, 98),
      reasons: eliteReasons.slice(0, 3),
      configSuggestion: health === "snoring" ? "Đặt góc đầu giường 15° và bật chế độ Anti-Snore" :
        health === "back_pain" ? "Chọn chế độ Zero Gravity để giảm áp lực cột sống" :
        "Bật AI Sleep Mode để tự động tối ưu tư thế",
    });
  }

  // SmartFurni Pro
  let proScore = 0;
  const proReasons: string[] = [];
  if (tech === "massage") { proScore += 30; proReasons.push("Hệ thống massage 8 điểm giúp thư giãn trước khi ngủ"); }
  if (tech === "smart") { proScore += 25; proReasons.push("Kết nối Apple HomeKit, Google Home, Amazon Alexa"); }
  if (budget === "mid" || budget === "high") { proScore += 20; proReasons.push("Phù hợp ngân sách 30–70 triệu"); }
  if (health === "insomnia") { proScore += 20; proReasons.push("Loa tích hợp phát tiếng ồn trắng giúp dễ vào giấc"); }
  if (partner === "partner") { proScore += 15; proReasons.push("Đèn LED RGB tạo không gian lãng mạn, sạc không dây 2 bên"); }
  if (sleepPos === "side") { proScore += 10; proReasons.push("Điều chỉnh góc chân giường giảm áp lực hông khi nằm nghiêng"); }
  if (proScore > 0) {
    recs.push({
      productSlug: "smartfurni-pro",
      productName: "SmartFurni Pro",
      price: 45000000,
      matchScore: Math.min(proScore, 95),
      reasons: proReasons.slice(0, 3),
      configSuggestion: tech === "massage" ? "Bật massage lưng 10 phút trước khi ngủ, cường độ nhẹ" :
        health === "insomnia" ? "Cài đặt tiếng mưa nhẹ qua loa tích hợp, tắt đèn LED sau 30 phút" :
        "Kết nối Google Home để điều khiển bằng giọng nói",
    });
  }

  // SmartFurni Basic
  let basicScore = 0;
  const basicReasons: string[] = [];
  if (tech === "basic") { basicScore += 35; basicReasons.push("Điều khiển đơn giản qua remote, không cần cài app"); }
  if (budget === "low") { basicScore += 30; basicReasons.push("Giá tốt nhất trong dòng SmartFurni, dưới 25 triệu"); }
  if (health === "none") { basicScore += 20; basicReasons.push("Không cần tính năng y tế chuyên sâu"); }
  if (sleepPos === "back" || sleepPos === "mixed") { basicScore += 15; basicReasons.push("Điều chỉnh đầu/chân giường đủ cho nhu cầu cơ bản"); }
  if (basicScore > 0) {
    recs.push({
      productSlug: "smartfurni-basic",
      productName: "SmartFurni Basic",
      price: 23000000,
      matchScore: Math.min(basicScore, 90),
      reasons: basicReasons.slice(0, 3),
      configSuggestion: "Cài sẵn 3 tư thế: Đọc sách (30°), Xem TV (45°), Ngủ (0°)",
    });
  }

  // Sort by score
  return recs.sort((a, b) => b.matchScore - a.matchScore);
}

function formatPrice(price: number) {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} triệu đ`;
  return price.toLocaleString("vi-VN") + " đ";
}

export default function SleepAdvisorClient({ theme }: Props) {
  const { colors } = theme;
  const primary = colors.primary ?? "#C9A84C";
  const bg = colors.background ?? "#0a0800";
  const surface = colors.surface ?? "#1a1500";
  const text = colors.text ?? "#F5EDD6";
  const muted = colors.textMuted ?? "#9A8A6A";
  const border = colors.border ?? "#2a2000";

  const [currentStep, setCurrentStep] = useState<"intro" | "quiz" | "result">("intro");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const handleStart = () => {
    setCurrentStep("quiz");
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedOption(null);
  };

  const handleSelectOption = (value: string) => {
    setSelectedOption(value);
  };

  const handleNext = () => {
    if (!selectedOption) return;
    const newAnswers = [...answers, { questionId: QUESTIONS[currentQuestion].id, value: selectedOption }];
    setAnswers(newAnswers);
    setSelectedOption(null);

    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Compute recommendations
      const recs = getRecommendations(newAnswers);
      setRecommendations(recs);
      setCurrentStep("result");
    }
  };

  const handleRestart = () => {
    setCurrentStep("intro");
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedOption(null);
    setRecommendations([]);
  };

  const progress = currentStep === "quiz" ? ((currentQuestion) / QUESTIONS.length) * 100 : 0;

  return (
    <div style={{ background: bg, color: text, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: surface, borderBottom: `1px solid ${border}` }} className="px-6 py-4">
        <div style={{ maxWidth: 800, margin: "0 auto" }} className="flex items-center gap-3">
          <Link href="/" style={{ color: muted }} className="text-sm hover:opacity-80 transition-opacity">
            ← Trang chủ
          </Link>
          <span style={{ color: border }}>/</span>
          <span style={{ color: primary }} className="text-sm font-medium">AI Sleep Advisor</span>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto" }} className="px-6 py-12">

        {/* INTRO SCREEN */}
        {currentStep === "intro" && (
          <div className="text-center">
            <div className="text-6xl mb-6">🤖</div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: primary }}>
              AI Sleep Advisor
            </h1>
            <p className="text-lg mb-3" style={{ color: text }}>
              Tìm giường SmartFurni phù hợp nhất với bạn
            </p>
            <p className="mb-10 max-w-lg mx-auto" style={{ color: muted }}>
              Trả lời 5 câu hỏi ngắn về thói quen ngủ và nhu cầu sức khỏe. AI của chúng tôi sẽ phân tích và đề xuất sản phẩm tối ưu nhất — miễn phí, không cần tài khoản.
            </p>

            {/* Features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              {[
                { icon: "⚡", title: "Nhanh chóng", desc: "Chỉ 2 phút để hoàn thành" },
                { icon: "🎯", title: "Chính xác", desc: "Dựa trên dữ liệu y tế giấc ngủ" },
                { icon: "🔒", title: "Riêng tư", desc: "Không lưu thông tin cá nhân" },
              ].map((f) => (
                <div key={f.title} style={{ background: surface, border: `1px solid ${border}` }} className="rounded-xl p-5">
                  <div className="text-3xl mb-2">{f.icon}</div>
                  <div className="font-semibold mb-1" style={{ color: text }}>{f.title}</div>
                  <div className="text-sm" style={{ color: muted }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <button
              onClick={handleStart}
              style={{ background: primary, color: bg }}
              className="px-10 py-4 rounded-full font-bold text-lg hover:opacity-90 transition-opacity"
            >
              Bắt đầu tư vấn →
            </button>
          </div>
        )}

        {/* QUIZ SCREEN */}
        {currentStep === "quiz" && (
          <div>
            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex justify-between text-sm mb-2" style={{ color: muted }}>
                <span>Câu {currentQuestion + 1} / {QUESTIONS.length}</span>
                <span>{Math.round(progress)}% hoàn thành</span>
              </div>
              <div style={{ background: border }} className="h-2 rounded-full overflow-hidden">
                <div
                  style={{ background: primary, width: `${progress}%` }}
                  className="h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>

            {/* Question */}
            <div style={{ background: surface, border: `1px solid ${border}` }} className="rounded-2xl p-8 mb-6">
              <h2 className="text-xl md:text-2xl font-bold mb-8" style={{ color: text }}>
                {QUESTIONS[currentQuestion].text}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {QUESTIONS[currentQuestion].options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelectOption(opt.value)}
                    style={{
                      background: selectedOption === opt.value ? `${primary}20` : "transparent",
                      border: `2px solid ${selectedOption === opt.value ? primary : border}`,
                      color: text,
                    }}
                    className="flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:opacity-90"
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span className="font-medium">{opt.label}</span>
                    {selectedOption === opt.value && (
                      <span className="ml-auto" style={{ color: primary }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={() => {
                  if (currentQuestion > 0) {
                    setCurrentQuestion(currentQuestion - 1);
                    setSelectedOption(answers[currentQuestion - 1]?.value ?? null);
                    setAnswers(answers.slice(0, currentQuestion - 1));
                  } else {
                    handleRestart();
                  }
                }}
                style={{ color: muted, border: `1px solid ${border}` }}
                className="px-6 py-3 rounded-full text-sm hover:opacity-80 transition-opacity"
              >
                ← Quay lại
              </button>
              <button
                onClick={handleNext}
                disabled={!selectedOption}
                style={{
                  background: selectedOption ? primary : border,
                  color: selectedOption ? bg : muted,
                  cursor: selectedOption ? "pointer" : "not-allowed",
                }}
                className="px-8 py-3 rounded-full font-semibold transition-all"
              >
                {currentQuestion < QUESTIONS.length - 1 ? "Tiếp theo →" : "Xem kết quả 🎯"}
              </button>
            </div>
          </div>
        )}

        {/* RESULT SCREEN */}
        {currentStep === "result" && (
          <div>
            <div className="text-center mb-10">
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: primary }}>
                Kết quả tư vấn của bạn
              </h2>
              <p style={{ color: muted }}>
                Dựa trên {QUESTIONS.length} câu trả lời, AI đề xuất {recommendations.length} sản phẩm phù hợp
              </p>
            </div>

            {/* Recommendations */}
            <div className="space-y-6 mb-10">
              {recommendations.map((rec, idx) => (
                <div
                  key={rec.productSlug}
                  style={{
                    background: surface,
                    border: `2px solid ${idx === 0 ? primary : border}`,
                  }}
                  className="rounded-2xl p-6 relative"
                >
                  {idx === 0 && (
                    <div
                      style={{ background: primary, color: bg }}
                      className="absolute -top-3 left-6 px-3 py-1 rounded-full text-xs font-bold"
                    >
                      ⭐ Phù hợp nhất
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Score circle */}
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div
                        style={{ border: `3px solid ${primary}`, color: primary }}
                        className="w-20 h-20 rounded-full flex flex-col items-center justify-center"
                      >
                        <span className="text-2xl font-bold">{rec.matchScore}%</span>
                        <span className="text-xs">phù hợp</span>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
                        <h3 className="text-xl font-bold" style={{ color: text }}>{rec.productName}</h3>
                        <span className="text-lg font-semibold" style={{ color: primary }}>
                          {formatPrice(rec.price)}
                        </span>
                      </div>

                      {/* Reasons */}
                      <div className="space-y-1 mb-4">
                        {rec.reasons.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm" style={{ color: muted }}>
                            <span style={{ color: primary }} className="mt-0.5">✓</span>
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>

                      {/* Config suggestion */}
                      <div
                        style={{ background: `${primary}15`, border: `1px solid ${primary}30` }}
                        className="rounded-lg p-3 mb-4"
                      >
                        <div className="text-xs font-semibold mb-1" style={{ color: primary }}>
                          💡 Gợi ý cấu hình cho bạn
                        </div>
                        <div className="text-sm" style={{ color: text }}>{rec.configSuggestion}</div>
                      </div>

                      {/* CTA buttons */}
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/products/${rec.productSlug}`}
                          style={{ background: primary, color: bg }}
                          className="px-5 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 transition-opacity"
                        >
                          Xem sản phẩm →
                        </Link>
                        <Link
                          href={`/products/configure/${rec.productSlug}`}
                          style={{ border: `1px solid ${primary}`, color: primary }}
                          className="px-5 py-2.5 rounded-full font-semibold text-sm hover:opacity-80 transition-opacity"
                        >
                          ⚙️ Cấu hình 3D
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Restart */}
            <div className="text-center">
              <button
                onClick={handleRestart}
                style={{ border: `1px solid ${border}`, color: muted }}
                className="px-6 py-3 rounded-full text-sm hover:opacity-80 transition-opacity"
              >
                🔄 Làm lại từ đầu
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
