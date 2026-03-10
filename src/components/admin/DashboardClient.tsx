"use client";
import { useState } from "react";
import Link from "next/link";
import type { DashboardStats } from "@/lib/admin-store";

// ─── Mini Sparkline Chart (SVG) ─────────────────────────────────────────────
function Sparkline({
  data,
  color = "#C9A84C",
  height = 40,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const width = 120;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const pathD = `M ${pts.join(" L ")}`;
  const areaD = `M ${pts[0]} L ${pts.join(" L ")} L ${width},${height} L 0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#sg-${color.replace("#", "")})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (v / max) * (height - 4) - 2;
        return <circle key={i} cx={x} cy={y} r="2" fill={color} />;
      })}
    </svg>
  );
}

// ─── Donut Chart (SVG) ───────────────────────────────────────────────────────
function DonutChart({
  segments,
  size = 120,
}: {
  segments: { label: string; count: number; color: string }[];
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.count, 0);
  if (total === 0) return <div className="text-gray-600 text-sm">Không có dữ liệu</div>;
  const r = 40;
  const cx = size / 2;
  const cy = size / 2;
  let cumAngle = -Math.PI / 2;
  const arcs = segments.map((seg) => {
    const angle = (seg.count / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { ...seg, x1, y1, x2, y2, large, angle };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) =>
        arc.angle > 0.01 ? (
          <path
            key={i}
            d={`M ${cx} ${cy} L ${arc.x1} ${arc.y1} A ${r} ${r} 0 ${arc.large} 1 ${arc.x2} ${arc.y2} Z`}
            fill={arc.color}
            opacity="0.85"
          />
        ) : null
      )}
      <circle cx={cx} cy={cy} r={r * 0.55} fill="#0D0B00" />
      <text x={cx} y={cy - 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
        {total}
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#6B7280" fontSize="8">
        tổng
      </text>
    </svg>
  );
}

// ─── Bar Chart (SVG) ─────────────────────────────────────────────────────────
function BarChart({
  data,
  height = 100,
}: {
  data: { label: string; count: number; color: string }[];
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const barW = 28;
  const gap = 12;
  const totalW = data.length * (barW + gap) - gap;
  return (
    <svg width={totalW} height={height + 24} viewBox={`0 0 ${totalW} ${height + 24}`} className="overflow-visible">
      {data.map((d, i) => {
        const bh = Math.max((d.count / max) * height, 2);
        const x = i * (barW + gap);
        const y = height - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx="4" fill={d.color} opacity="0.8" />
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
              {d.count}
            </text>
            <text x={x + barW / 2} y={height + 14} textAnchor="middle" fill="#6B7280" fontSize="8">
              {d.label.split(" ").slice(-1)[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Contact Line Chart ───────────────────────────────────────────────────────
function ContactLineChart({
  data,
}: {
  data: { label: string; count: number; unread: number }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 320;
  const h = 80;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.count / max) * (h - 8) - 4;
    return { x, y, ...d };
  });
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaD = `${pathD} L ${w} ${h} L 0 ${h} Z`;
  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${w} ${h + 20}`} className="overflow-visible">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#lineGrad)" />
        <path d={pathD} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3" fill="#3B82F6" />
            {p.count > 0 && (
              <text x={p.x} y={p.y - 6} textAnchor="middle" fill="white" fontSize="9">
                {p.count}
              </text>
            )}
            <text x={p.x} y={h + 14} textAnchor="middle" fill="#4B5563" fontSize="8">
              {p.label.split(",")[0]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Activity Icon ────────────────────────────────────────────────────────────
function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { icon: string; bg: string }> = {
    post_created: { icon: "✏️", bg: "bg-[#C9A84C]/15" },
    post_updated: { icon: "🔄", bg: "bg-blue-500/10" },
    post_deleted: { icon: "🗑️", bg: "bg-red-500/10" },
    contact_received: { icon: "💬", bg: "bg-blue-500/10" },
    image_uploaded: { icon: "🖼️", bg: "bg-purple-500/10" },
    post_scheduled: { icon: "🕐", bg: "bg-indigo-500/10" },
  };
  const cfg = map[type] || { icon: "•", bg: "bg-gray-500/10" };
  return (
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${cfg.bg}`}>
      {cfg.icon}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────
export default function DashboardClient({ data }: { data: DashboardStats }) {
  const { stats, postsByStatus, postsByCategory, contactsByDay, contactsBySubject, featureUsage, recentActivity, topPosts } = data;
  const [refreshing, setRefreshing] = useState(false);
  const [liveData, setLiveData] = useState(data);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) setLiveData(await res.json());
    } finally {
      setRefreshing(false);
    }
  }

  const d = liveData;
  const contactTrend = d.contactsByDay.map((x) => x.count);
  const totalContactsThisWeek = contactTrend.reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Tổng Quan Hiệu Suất</h1>
          <p className="text-gray-500 text-sm mt-1">
            {new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white border border-gray-700 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
        >
          <span className={refreshing ? "animate-spin" : ""}>↻</span>
          {refreshing ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Posts */}
        <Link href="/admin/posts" className="group">
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5 hover:border-[#C9A84C]/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-600 uppercase tracking-wider">Bài viết</span>
              <span className="text-xs text-[#C9A84C]/50 group-hover:text-[#C9A84C] transition-colors">→</span>
            </div>
            <div className="text-3xl font-bold text-[#C9A84C] mb-1">{d.stats.totalPosts}</div>
            <div className="flex gap-2 text-xs">
              <span className="text-green-400">{d.stats.publishedPosts} đăng</span>
              <span className="text-gray-600">·</span>
              <span className="text-gray-500">{d.stats.draftPosts} nháp</span>
              {d.stats.scheduledPosts > 0 && (
                <><span className="text-gray-600">·</span><span className="text-blue-400">{d.stats.scheduledPosts} lịch</span></>
              )}
            </div>
          </div>
        </Link>

        {/* Contacts */}
        <Link href="/admin/contacts" className="group">
          <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5 hover:border-blue-500/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-600 uppercase tracking-wider">Liên hệ</span>
              {d.stats.unreadContacts > 0 && (
                <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded-full">
                  {d.stats.unreadContacts} mới
                </span>
              )}
            </div>
            <div className="text-3xl font-bold text-blue-400 mb-1">{d.stats.totalContacts}</div>
            <div className="text-xs text-gray-500">{totalContactsThisWeek} tin nhắn tuần này</div>
          </div>
        </Link>

        {/* Cover Image Adoption */}
        <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-600 uppercase tracking-wider">Ảnh bìa</span>
            <span className="text-xs text-purple-400">{d.featureUsage.coverImageAdoption}%</span>
          </div>
          <div className="text-3xl font-bold text-purple-400 mb-1">{d.stats.postsWithCoverImage}</div>
          <div className="text-xs text-gray-500">/ {d.stats.totalPosts} bài có ảnh bìa</div>
          <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${d.featureUsage.coverImageAdoption}%` }}
            />
          </div>
        </div>

        {/* Avg Read Time */}
        <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-600 uppercase tracking-wider">Thời gian đọc TB</span>
            <span className="text-xs text-orange-400">phút</span>
          </div>
          <div className="text-3xl font-bold text-orange-400 mb-1">{d.featureUsage.avgReadTime}</div>
          <div className="text-xs text-gray-500">{d.stats.featuredPosts} bài nổi bật ⭐</div>
        </div>
      </div>

      {/* ── Row 2: Charts ── */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Contact trend (line chart) */}
        <div className="lg:col-span-2 bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Liên hệ 7 ngày qua</h3>
              <p className="text-xs text-gray-600 mt-0.5">Số tin nhắn nhận được mỗi ngày</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Tổng</span>
            </div>
          </div>
          <ContactLineChart data={d.contactsByDay} />
          <div className="mt-4 grid grid-cols-7 gap-1">
            {d.contactsByDay.map((day, i) => (
              <div key={i} className="text-center">
                <div className={`text-xs font-medium ${day.count > 0 ? "text-blue-400" : "text-gray-700"}`}>
                  {day.count}
                </div>
                <div className="text-xs text-gray-700 truncate">{day.label.split(",")[0]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Posts by status (donut) */}
        <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Trạng thái bài viết</h3>
          <div className="flex flex-col items-center gap-4">
            <DonutChart segments={d.postsByStatus} size={120} />
            <div className="w-full space-y-2">
              {d.postsByStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-gray-400">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">{s.count}</span>
                    <span className="text-xs text-gray-600">
                      ({d.stats.totalPosts > 0 ? Math.round((s.count / d.stats.totalPosts) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Category bars + Subject breakdown ── */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Posts by category */}
        <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Bài viết theo chủ đề</h3>
          <div className="flex items-end gap-4">
            <BarChart data={d.postsByCategory} height={80} />
          </div>
          <div className="mt-4 space-y-2">
            {d.postsByCategory.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs text-gray-400">{cat.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(cat.count / d.stats.totalPosts) * 100}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-white w-4 text-right">{cat.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact subjects */}
        <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Chủ đề liên hệ phổ biến</h3>
          <div className="space-y-3">
            {d.contactsBySubject.map((s, i) => {
              const colors = ["#C9A84C", "#3B82F6", "#22C55E", "#F472B6", "#F59E0B"];
              const color = colors[i % colors.length];
              return (
                <div key={s.subject}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400 truncate flex-1">{s.subject}</span>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-xs font-semibold text-white">{s.count}</span>
                      <span className="text-xs text-gray-600">{s.percentage}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${s.percentage}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Row 4: Feature health + Activity feed ── */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {/* Feature Health Cards */}
        <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Hiệu suất tính năng</h3>
          <div className="space-y-4">
            {/* Upload ảnh */}
            <div className="p-3 bg-[#0D0B00] rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🖼️</span>
                  <span className="text-xs text-gray-300">Upload ảnh bìa</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  d.featureUsage.coverImageAdoption >= 50
                    ? "bg-green-500/10 text-green-400"
                    : "bg-yellow-500/10 text-yellow-400"
                }`}>
                  {d.featureUsage.coverImageAdoption}%
                </span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${d.featureUsage.coverImageAdoption}%` }} />
              </div>
              <p className="text-xs text-gray-600 mt-1.5">{d.stats.postsWithCoverImage}/{d.stats.totalPosts} bài đã có ảnh</p>
            </div>

            {/* Lên lịch */}
            <div className="p-3 bg-[#0D0B00] rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">🕐</span>
                  <span className="text-xs text-gray-300">Lên lịch đăng bài</span>
                </div>
                <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">
                  {d.featureUsage.scheduledPostsCount} bài
                </span>
              </div>
              <p className="text-xs text-gray-600">Đang chờ xuất bản tự động</p>
            </div>

            {/* Bản nháp */}
            <div className="p-3 bg-[#0D0B00] rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">📝</span>
                  <span className="text-xs text-gray-300">Bản nháp</span>
                </div>
                <span className="text-xs bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded-full">
                  {d.featureUsage.draftPostsCount} bài
                </span>
              </div>
              <p className="text-xs text-gray-600">Chưa xuất bản</p>
            </div>

            {/* Email */}
            <div className="p-3 bg-[#0D0B00] rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">📧</span>
                  <span className="text-xs text-gray-300">Email thông báo</span>
                </div>
                <Link href="/admin/settings" className="text-xs text-[#C9A84C]/70 hover:text-[#C9A84C]">Cài đặt →</Link>
              </div>
              <p className="text-xs text-gray-600">Cấu hình SMTP trong Cài đặt</p>
            </div>

            {/* Export */}
            <div className="p-3 bg-[#0D0B00] rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">📥</span>
                  <span className="text-xs text-gray-300">Export CSV</span>
                </div>
                <Link href="/admin/contacts" className="text-xs text-green-400/70 hover:text-green-400">Export →</Link>
              </div>
              <p className="text-xs text-gray-600">{d.stats.totalContacts} liên hệ có thể xuất</p>
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Hoạt động gần đây</h3>
            <span className="text-xs text-gray-600">{d.recentActivity.length} sự kiện</span>
          </div>
          <div className="space-y-3">
            {d.recentActivity.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-6">Chưa có hoạt động nào</p>
            ) : (
              d.recentActivity.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <ActivityIcon type={log.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300">{log.description}</p>
                    {log.meta && (
                      <p className="text-xs text-gray-600 truncate mt-0.5">"{log.meta}"</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-700 flex-shrink-0 mt-0.5">{timeAgo(log.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Row 5: Top Posts + Quick Actions ── */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Posts */}
        <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Bài viết nổi bật</h3>
            <Link href="/admin/posts/new" className="text-xs bg-[#C9A84C] text-[#0D0B00] px-3 py-1 rounded-full font-semibold hover:bg-[#E2C97E] transition-colors">
              + Thêm mới
            </Link>
          </div>
          <div className="space-y-3">
            {d.topPosts.map((post, i) => {
              const statusColors: Record<string, string> = {
                published: "text-green-400",
                draft: "text-gray-500",
                scheduled: "text-blue-400",
              };
              return (
                <Link key={post.slug} href={`/admin/posts/${post.slug}/edit`} className="flex items-center gap-3 group">
                  <div className="w-6 h-6 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center text-xs text-[#C9A84C] font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 group-hover:text-white truncate transition-colors">
                      {post.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-600">{post.category}</span>
                      <span className="text-gray-700">·</span>
                      <span className={`text-xs ${statusColors[post.status] || "text-gray-500"}`}>
                        {post.status === "published" ? "Đã đăng" : post.status === "draft" ? "Nháp" : "Lên lịch"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs font-semibold text-[#C9A84C]">{post.readTime}'</div>
                    <div className="text-xs text-gray-700">đọc</div>
                  </div>
                </Link>
              );
            })}
          </div>
          <Link href="/admin/posts" className="block text-center text-xs text-[#C9A84C]/60 hover:text-[#C9A84C] mt-4 transition-colors">
            Xem tất cả bài viết →
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#1A1500] border border-[#C9A84C]/10 rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Thao tác nhanh</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/posts/new" className="flex flex-col items-center gap-2 bg-[#C9A84C]/8 border border-[#C9A84C]/15 text-[#C9A84C] p-4 rounded-xl text-sm hover:bg-[#C9A84C]/15 transition-colors text-center">
              <span className="text-2xl">✏️</span>
              <span className="text-xs font-medium">Viết bài mới</span>
            </Link>
            <Link href="/admin/contacts" className="flex flex-col items-center gap-2 bg-blue-500/8 border border-blue-500/15 text-blue-400 p-4 rounded-xl text-sm hover:bg-blue-500/15 transition-colors text-center">
              <span className="text-2xl">💬</span>
              <div>
                <div className="text-xs font-medium">Xem liên hệ</div>
                {d.stats.unreadContacts > 0 && (
                  <div className="text-xs text-red-400">{d.stats.unreadContacts} chưa đọc</div>
                )}
              </div>
            </Link>
            <Link href="/admin/contacts" className="flex flex-col items-center gap-2 bg-green-500/8 border border-green-500/15 text-green-400 p-4 rounded-xl text-sm hover:bg-green-500/15 transition-colors text-center">
              <span className="text-2xl">📥</span>
              <span className="text-xs font-medium">Export CSV</span>
            </Link>
            <Link href="/admin/settings" className="flex flex-col items-center gap-2 bg-white/5 border border-white/10 text-gray-400 p-4 rounded-xl text-sm hover:bg-white/10 transition-colors text-center">
              <span className="text-2xl">⚙️</span>
              <span className="text-xs font-medium">Cài đặt</span>
            </Link>
            <Link href="/blog" target="_blank" className="flex flex-col items-center gap-2 bg-white/5 border border-white/10 text-gray-400 p-4 rounded-xl text-sm hover:bg-white/10 transition-colors text-center">
              <span className="text-2xl">🌐</span>
              <span className="text-xs font-medium">Xem Blog</span>
            </Link>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex flex-col items-center gap-2 bg-white/5 border border-white/10 text-gray-400 p-4 rounded-xl text-sm hover:bg-white/10 transition-colors text-center disabled:opacity-50"
            >
              <span className={`text-2xl ${refreshing ? "animate-spin" : ""}`}>↻</span>
              <span className="text-xs font-medium">Làm mới</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
