"use client";
import { useState } from "react";
import Link from "next/link";
import type { SiteTheme } from "@/lib/theme-types";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

interface Props {
  theme: SiteTheme;
}

interface VideoReview {
  id: string;
  name: string;
  role: string;
  city: string;
  product: string;
  rating: number;
  duration: string;
  thumbnail: string;
  title: string;
  summary: string;
  tags: string[];
  likes: number;
  views: string;
  verified: boolean;
  youtubeId?: string;
}

const VIDEO_REVIEWS: VideoReview[] = [
  {
    id: "v1",
    name: "Nguyễn Thị Hương",
    role: "Giám đốc Marketing",
    city: "TP. Hồ Chí Minh",
    product: "SmartFurni Pro",
    rating: 5,
    duration: "4:32",
    thumbnail: "",
    title: "3 tháng dùng SmartFurni Pro — Lưng không còn đau nữa!",
    summary: "Tôi mắc thoái hóa đốt sống cổ từ 5 năm nay. Sau 3 tháng dùng SmartFurni Pro với tính năng Zero Gravity, cơn đau giảm đến 70%. Đây là review thật 100% không được tài trợ.",
    tags: ["Đau lưng", "Zero Gravity", "3 tháng dùng thực tế"],
    likes: 1247,
    views: "28.4K",
    verified: true,
  },
  {
    id: "v2",
    name: "Trần Văn Minh",
    role: "Kỹ sư phần mềm",
    city: "Hà Nội",
    product: "SmartFurni Elite",
    rating: 5,
    duration: "6:15",
    thumbnail: "",
    title: "Unboxing + Setup SmartFurni Elite — Tích hợp HomeKit siêu mượt",
    summary: "Video unboxing chi tiết và hướng dẫn setup tích hợp Apple HomeKit. Tôi đã dùng được 6 tháng và điều khiển giường bằng Siri mỗi ngày. Không có gì phải phàn nàn!",
    tags: ["Unboxing", "HomeKit", "Siri", "Smart Home"],
    likes: 892,
    views: "15.2K",
    verified: true,
  },
  {
    id: "v3",
    name: "Lê Thị Thu",
    role: "Bác sĩ nội khoa",
    city: "Đà Nẵng",
    product: "SmartFurni Basic",
    rating: 5,
    duration: "3:48",
    thumbnail: "",
    title: "Bác sĩ đánh giá SmartFurni — Góc nhìn y tế",
    summary: "Với tư cách bác sĩ, tôi đánh giá SmartFurni từ góc độ y học. Khả năng điều chỉnh góc nằm thực sự có lợi cho người bị thoái hóa cột sống và bệnh trào ngược dạ dày.",
    tags: ["Góc nhìn y tế", "Thoái hóa cột sống", "Bác sĩ đánh giá"],
    likes: 2103,
    views: "41.8K",
    verified: true,
  },
  {
    id: "v4",
    name: "Phạm Đức Anh",
    role: "Doanh nhân",
    city: "TP. Hồ Chí Minh",
    product: "SmartFurni Pro",
    rating: 5,
    duration: "5:20",
    thumbnail: "",
    title: "Mua 3 chiếc cho cả nhà — Bố mẹ 70 tuổi dùng được không?",
    summary: "Tôi mua SmartFurni Pro cho cả gia đình gồm bố mẹ 70 tuổi và 2 con nhỏ. Video này trả lời câu hỏi: người cao tuổi có dùng được không? Giao diện có đơn giản không?",
    tags: ["Người cao tuổi", "Gia đình", "Dễ sử dụng"],
    likes: 1568,
    views: "33.1K",
    verified: true,
  },
  {
    id: "v5",
    name: "Võ Thị Lan",
    role: "Giáo viên",
    city: "Cần Thơ",
    product: "SmartFurni Basic",
    rating: 5,
    duration: "2:55",
    thumbnail: "",
    title: "Dùng thử 30 ngày — Có đáng mua không?",
    summary: "Tôi tận dụng chính sách thử 30 ngày của SmartFurni. Đây là video review sau khi dùng đủ 30 ngày. Spoiler: tôi không trả lại. Giấc ngủ cải thiện rõ rệt từ tuần thứ 2.",
    tags: ["30 ngày thử", "Honest review", "Giáo viên"],
    likes: 743,
    views: "12.6K",
    verified: false,
  },
  {
    id: "v6",
    name: "Hoàng Minh Tuấn",
    role: "Vận động viên",
    city: "Hà Nội",
    product: "SmartFurni Elite",
    rating: 5,
    duration: "7:02",
    thumbnail: "",
    title: "VĐV chuyên nghiệp review SmartFurni Elite — Phục hồi sau tập luyện",
    summary: "Là vận động viên marathon, tôi cần giường có thể hỗ trợ phục hồi cơ bắp sau tập. SmartFurni Elite với tính năng massage và nâng chân giúp giảm đau cơ đáng kể.",
    tags: ["Vận động viên", "Phục hồi cơ", "Massage", "Marathon"],
    likes: 1891,
    views: "37.5K",
    verified: true,
  },
];

const FILTER_TAGS = ["Tất cả", "Đau lưng", "Smart Home", "Unboxing", "Người cao tuổi", "Honest review", "Vận động viên", "Y tế"];

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} width={size} height={size} viewBox="0 0 24 24" fill={s <= rating ? "#F59E0B" : "#E5E7EB"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function VideoCard({ video, colors, onClick }: { video: VideoReview; colors: SiteTheme["colors"]; onClick: () => void }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likes);

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!liked) {
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  };

  // Generate a deterministic gradient thumbnail based on id
  const gradients: Record<string, string> = {
    v1: "from-amber-900 to-amber-700",
    v2: "from-blue-900 to-blue-700",
    v3: "from-emerald-900 to-emerald-700",
    v4: "from-purple-900 to-purple-700",
    v5: "from-rose-900 to-rose-700",
    v6: "from-cyan-900 to-cyan-700",
  };

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-2xl overflow-hidden border transition-all duration-200 hover:shadow-xl hover:-translate-y-1"
      style={{ backgroundColor: colors.surface, borderColor: `${colors.border}60` }}
    >
      {/* Thumbnail */}
      <div className={`relative aspect-video bg-gradient-to-br ${gradients[video.id] ?? "from-gray-900 to-gray-700"} flex items-center justify-center overflow-hidden`}>
        {/* Play button */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-200"
          style={{ backgroundColor: `${colors.primary}e0` }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>

        {/* Duration badge */}
        <span
          className="absolute bottom-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-md"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", color: "#fff" }}
        >
          {video.duration}
        </span>

        {/* Verified badge */}
        {video.verified && (
          <span
            className="absolute top-2 left-2 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${colors.success}20`, color: colors.success, border: `1px solid ${colors.success}40` }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Đã xác minh mua hàng
          </span>
        )}

        {/* Views */}
        <span
          className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-md"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", color: "#fff" }}
        >
          {video.views} lượt xem
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="text-sm font-semibold mb-2 line-clamp-2 leading-snug" style={{ color: colors.text }}>
          {video.title}
        </h3>

        {/* Author */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
          >
            {video.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: colors.text }}>{video.name}</p>
            <p className="text-xs truncate" style={{ color: `${colors.text}60` }}>{video.role} · {video.city}</p>
          </div>
          <div className="ml-auto flex-shrink-0">
            <StarRating rating={video.rating} size={11} />
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {video.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${colors.primary}12`, color: `${colors.primary}cc` }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: `${colors.text}50` }}>
            Sản phẩm: <span style={{ color: colors.primary }}>{video.product}</span>
          </span>
          <button
            onClick={handleLike}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: liked ? colors.error : `${colors.text}50` }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {likeCount.toLocaleString()}
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoModal({ video, colors, onClose }: { video: VideoReview; colors: SiteTheme["colors"]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: colors.surface }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", color: "#fff" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Video placeholder */}
        <div className="aspect-video bg-black flex items-center justify-center relative">
          <div className="text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl"
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary ?? colors.primary})` }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <p className="text-white/70 text-sm">Video review từ khách hàng thực tế</p>
            <p className="text-white/40 text-xs mt-1">Tính năng phát video sẽ được tích hợp trong bản cập nhật tiếp theo</p>
          </div>
        </div>

        {/* Info */}
        <div className="p-5">
          <h2 className="text-base font-bold mb-2" style={{ color: colors.text }}>{video.title}</h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: `${colors.text}80` }}>{video.summary}</p>

          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
              style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
            >
              {video.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: colors.text }}>{video.name}</p>
              <p className="text-xs" style={{ color: `${colors.text}60` }}>{video.role} · {video.city}</p>
            </div>
            <div className="ml-auto">
              <StarRating rating={video.rating} size={14} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {video.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 rounded-full"
                style={{ backgroundColor: `${colors.primary}15`, color: `${colors.primary}cc` }}
              >
                #{tag}
              </span>
            ))}
          </div>

          <div className="flex gap-3">
            <Link
              href={`/products/${video.product.toLowerCase().replace(/\s+/g, "-")}`}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-center transition-opacity hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary ?? colors.primary})`, color: colors.background }}
            >
              Xem sản phẩm này
            </Link>
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-medium border transition-opacity hover:opacity-80"
              style={{ borderColor: colors.border, color: colors.text }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VideoReviewsClient({ theme }: Props) {
  const { colors } = theme;
  const [activeFilter, setActiveFilter] = useState("Tất cả");
  const [selectedVideo, setSelectedVideo] = useState<VideoReview | null>(null);
  const [sortBy, setSortBy] = useState<"views" | "likes" | "recent">("views");

  const filteredVideos = VIDEO_REVIEWS.filter((v) => {
    if (activeFilter === "Tất cả") return true;
    return v.tags.some((t) => t.toLowerCase().includes(activeFilter.toLowerCase()));
  }).sort((a, b) => {
    if (sortBy === "views") return parseFloat(b.views) - parseFloat(a.views);
    if (sortBy === "likes") return b.likes - a.likes;
    return 0;
  });

  const totalViews = VIDEO_REVIEWS.reduce((sum, v) => sum + parseFloat(v.views), 0);
  const totalLikes = VIDEO_REVIEWS.reduce((sum, v) => sum + v.likes, 0);

  return (
    <>
      <Navbar theme={theme} />
      <main className="min-h-screen pt-16" style={{ backgroundColor: colors.background }}>
        {/* Hero */}
        <section
          className="py-16 px-4"
          style={{ background: `linear-gradient(160deg, ${colors.background} 0%, ${colors.surface} 100%)` }}
        >
          <div className="max-w-5xl mx-auto text-center">
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}
            >
              Video Reviews thực tế
            </span>
            <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: colors.text }}>
              Khách hàng nói gì về SmartFurni?
            </h1>
            <p className="text-base mb-8 max-w-2xl mx-auto" style={{ color: `${colors.text}70` }}>
              Tất cả video đều từ khách hàng thực tế — không kịch bản, không tài trợ. Xem trải nghiệm thật trước khi quyết định.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
              {[
                { label: "Video reviews", value: `${VIDEO_REVIEWS.length}+` },
                { label: "Lượt xem", value: `${totalViews.toFixed(0)}K+` },
                { label: "Lượt thích", value: `${(totalLikes / 1000).toFixed(1)}K+` },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl p-3 border"
                  style={{ backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` }}
                >
                  <div className="text-xl font-bold" style={{ color: colors.primary }}>{s.value}</div>
                  <div className="text-xs" style={{ color: `${colors.text}60` }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Filters & Sort */}
        <section className="px-4 py-6 sticky top-16 z-30 border-b" style={{ backgroundColor: `${colors.background}f5`, backdropFilter: "blur(12px)", borderColor: `${colors.border}50` }}>
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            {/* Tag filters */}
            <div className="flex flex-wrap gap-2">
              {FILTER_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setActiveFilter(tag)}
                  className="text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-150"
                  style={
                    activeFilter === tag
                      ? { backgroundColor: colors.primary, color: colors.background }
                      : { backgroundColor: `${colors.surface}`, color: `${colors.text}80`, border: `1px solid ${colors.border}` }
                  }
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-xs px-3 py-1.5 rounded-lg border outline-none"
              style={{ backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }}
            >
              <option value="views">Nhiều xem nhất</option>
              <option value="likes">Nhiều thích nhất</option>
              <option value="recent">Mới nhất</option>
            </select>
          </div>
        </section>

        {/* Video grid */}
        <section className="px-4 py-8">
          <div className="max-w-5xl mx-auto">
            {filteredVideos.length === 0 ? (
              <div className="text-center py-16" style={{ color: `${colors.text}50` }}>
                Không có video nào phù hợp với bộ lọc này.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    colors={colors}
                    onClick={() => setSelectedVideo(video)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA — Submit your review */}
        <section className="px-4 py-12">
          <div className="max-w-2xl mx-auto text-center">
            <div
              className="rounded-2xl p-8 border"
              style={{ backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}20` }}
            >
              <div className="text-3xl mb-3">🎬</div>
              <h2 className="text-xl font-bold mb-2" style={{ color: colors.text }}>
                Bạn đã dùng SmartFurni?
              </h2>
              <p className="text-sm mb-5" style={{ color: `${colors.text}70` }}>
                Chia sẻ video review của bạn và nhận <strong style={{ color: colors.primary }}>voucher 500.000đ</strong> cho lần mua tiếp theo.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="mailto:ugc@smartfurni.vn?subject=Gửi video review SmartFurni"
                  className="px-6 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary ?? colors.primary})`, color: colors.background }}
                >
                  Gửi video review
                </a>
                <Link
                  href="/products"
                  className="px-6 py-3 rounded-xl text-sm font-medium border transition-opacity hover:opacity-80"
                  style={{ borderColor: colors.border, color: colors.text }}
                >
                  Xem sản phẩm
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Video modal */}
      {selectedVideo && (
        <VideoModal
          video={selectedVideo}
          colors={colors}
          onClose={() => setSelectedVideo(null)}
        />
      )}

      <Footer theme={theme} />
    </>
  );
}
