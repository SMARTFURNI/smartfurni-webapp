"use client";
import { useState, useEffect } from "react";
import { Star, CheckCircle, AlertCircle } from "lucide-react";

interface SurveyData {
  id: string;
  leadName: string;
  surveyTitle: string;
  surveyIntro: string;
  thankYouMessage: string;
  status: string;
}

const SCORE_LABELS: Record<number, string> = {
  0: "Rất không hài lòng", 1: "Không hài lòng", 2: "Khá không hài lòng",
  3: "Không hài lòng lắm", 4: "Hơi không hài lòng", 5: "Bình thường",
  6: "Khá ổn", 7: "Hài lòng", 8: "Khá hài lòng",
  9: "Rất hài lòng", 10: "Cực kỳ hài lòng",
};

export default function NpsSurveyPublic({ surveyId }: { surveyId: string }) {
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/crm/nps/${surveyId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { setSurvey(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [surveyId]);

  async function handleSubmit() {
    if (score === null) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/crm/nps/${surveyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, feedback, wouldRecommend }),
      });
      if (res.ok) setSubmitted(true);
      else setError("Có lỗi xảy ra. Vui lòng thử lại.");
    } catch {
      setError("Không thể kết nối. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080806] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!survey || survey.status === "expired") {
    return (
      <div className="min-h-screen bg-[#080806] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
          <h1 className="text-xl font-semibold text-white mb-2">Khảo sát không tồn tại</h1>
          <p className="text-gray-500 text-sm">Link khảo sát này đã hết hạn hoặc không hợp lệ.</p>
        </div>
      </div>
    );
  }

  if (submitted || survey.status === "completed") {
    return (
      <div className="min-h-screen bg-[#080806] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-emerald-400" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Cảm ơn bạn!</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            {survey.thankYouMessage || "Phản hồi của bạn đã được ghi nhận. Chúng tôi sẽ không ngừng cải thiện để phục vụ bạn tốt hơn."}
          </p>
          <div className="mt-8 pt-6 border-t border-[#1a1f2e]">
            <p className="text-xs text-gray-600">SmartFurni — Nội thất thông minh</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080806] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#C9A84C] flex items-center justify-center">
              <Star size={16} className="text-black fill-black" />
            </div>
            <span className="text-[#C9A84C] font-semibold text-sm tracking-wide">SmartFurni</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {survey.surveyTitle || "Đánh giá trải nghiệm của bạn"}
          </h1>
          <p className="text-gray-400 text-sm">
            Xin chào <span className="text-white font-medium">{survey.leadName}</span>,{" "}
            {survey.surveyIntro || "chúng tôi rất muốn biết trải nghiệm của bạn với SmartFurni."}
          </p>
        </div>

        <div className="bg-[#0f1117] border border-[#1a1f2e] rounded-2xl p-6 space-y-8">
          {/* NPS Score */}
          <div>
            <p className="text-sm font-medium text-white mb-1">
              Bạn có khả năng giới thiệu SmartFurni cho bạn bè/đối tác không?
            </p>
            <p className="text-xs text-gray-500 mb-4">0 = Chắc chắn không, 10 = Chắc chắn có</p>
            <div className="grid grid-cols-11 gap-1">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setScore(i)}
                  className={`aspect-square rounded-lg text-sm font-bold transition-all ${
                    score === i
                      ? i >= 9 ? "bg-emerald-500 text-white scale-110"
                        : i >= 7 ? "bg-yellow-500 text-black scale-110"
                        : "bg-red-500 text-white scale-110"
                      : i >= 9 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                        : i >= 7 ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            {score !== null && (
              <p className="text-center text-sm mt-3 font-medium" style={{
                color: score >= 9 ? "#10b981" : score >= 7 ? "#f59e0b" : "#ef4444"
              }}>
                {SCORE_LABELS[score]}
              </p>
            )}
          </div>

          {/* Would recommend */}
          <div>
            <p className="text-sm font-medium text-white mb-3">
              Bạn có sẵn sàng giới thiệu SmartFurni cho người khác không?
            </p>
            <div className="flex gap-3">
              {[
                { val: true, label: "Có, tôi sẽ giới thiệu", color: "emerald" },
                { val: false, label: "Chưa chắc", color: "red" },
              ].map(opt => (
                <button
                  key={String(opt.val)}
                  onClick={() => setWouldRecommend(opt.val)}
                  className={`flex-1 py-3 rounded-xl text-sm font-medium border transition-all ${
                    wouldRecommend === opt.val
                      ? opt.color === "emerald"
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                        : "bg-red-500/20 border-red-500/50 text-red-400"
                      : "bg-[#1a1f2e] border-[#252b3b] text-gray-400 hover:border-gray-500"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Chia sẻ thêm về trải nghiệm của bạn <span className="text-gray-500 font-normal">(tùy chọn)</span>
            </label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Điều gì bạn thích nhất? Điều gì có thể cải thiện hơn?"
              rows={4}
              className="w-full bg-[#1a1f2e] border border-[#252b3b] rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C]/50 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={score === null || submitting}
            className="w-full py-4 rounded-xl bg-[#C9A84C] text-black font-semibold text-base hover:bg-[#d4b55a] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? "Đang gửi..." : "Gửi đánh giá"}
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Phản hồi của bạn giúp SmartFurni cải thiện chất lượng dịch vụ
        </p>
      </div>
    </div>
  );
}
