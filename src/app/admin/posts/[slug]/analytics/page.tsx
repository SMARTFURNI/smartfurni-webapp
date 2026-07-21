import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart3, Eye, ExternalLink, MousePointerClick, TrendingUp } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { getPostById } from "@/lib/admin-store";
import { getSidebarStats } from "@/lib/sidebar-stats";
import { initDbOnce } from "@/lib/db-init";
import { getBlogPostAnalyticsDetail, initAnalyticsTables } from "@/lib/analytics-store";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

export const metadata = { title: "Thống kê bài viết" };

function formatNumber(value: number) {
  return value.toLocaleString("vi-VN");
}

export default async function PostAnalyticsPage({ params }: { params: Promise<{ slug: string }> }) {
  await requireAdmin();
  await initDbOnce();
  await initAnalyticsTables();
  const { slug } = await params;
  const post = getPostById(slug);
  if (!post) notFound();

  const [report, sidebarStats] = await Promise.all([
    getBlogPostAnalyticsDetail(slug),
    Promise.resolve(getSidebarStats()),
  ]);
  const maxDaily = Math.max(1, ...report.daily.map((row) => Math.max(row.views, row.productClicks)));

  const cards = [
    { label: "Tổng lượt xem", value: report.totalViews, note: "Từ khi bài viết được theo dõi", icon: Eye, color: "text-[#E6BF55]" },
    { label: "Hôm nay", value: report.todayViews, note: `${report.todayProductClicks} click sản phẩm`, icon: BarChart3, color: "text-sky-400" },
    { label: "Tuần này", value: report.weekViews, note: `${report.weekProductClicks} click sản phẩm`, icon: TrendingUp, color: "text-violet-400" },
    { label: "Tháng này", value: report.monthViews, note: `${report.monthProductClicks} click sản phẩm`, icon: BarChart3, color: "text-emerald-400" },
    { label: "Tổng click sản phẩm", value: report.totalProductClicks, note: `CTR ${report.clickThroughRate.toLocaleString("vi-VN")}%`, icon: MousePointerClick, color: "text-amber-400" },
  ];

  return (
    <div className="flex min-h-screen bg-[#130e00]">
      <AdminSidebar stats={sidebarStats} />
      <main className="min-w-0 flex-1 overflow-auto p-4 md:p-8">
        <AdminHeader title="Thống kê bài viết" subtitle="Lượt xem và hiệu quả điều hướng sang sản phẩm" />

        <div className="mb-5 flex flex-col justify-between gap-4 rounded-2xl border border-white/[.08] bg-[linear-gradient(135deg,#182230_0%,#292216_100%)] p-5 md:flex-row md:items-center">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#E6BF55]">Báo cáo theo link bài viết</p>
            <h1 className="mt-2 line-clamp-2 text-xl font-bold text-white md:text-2xl">{post.title}</h1>
            <p className="mt-2 break-all text-xs text-[rgba(245,237,214,.48)]">/blog/{post.slug}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/admin/posts" className="rounded-xl border border-white/[.1] px-4 py-2 text-sm text-[rgba(245,237,214,.72)] hover:bg-white/[.05]">
              ← Danh sách
            </Link>
            <Link href={`/blog/${post.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl bg-[#C9A84C] px-4 py-2 text-sm font-semibold text-[#131005] hover:bg-[#E2C97E]">
              Mở bài viết <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          {cards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-white/[.08] bg-[#171B23] p-4 md:p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-[rgba(245,237,214,.52)]">{card.label}</p>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="mt-3 text-2xl font-bold text-white md:text-3xl">{formatNumber(card.value)}</p>
              <p className="mt-1 text-[11px] text-[rgba(245,237,214,.38)]">{card.note}</p>
            </div>
          ))}
        </section>

        <section className="mt-5 rounded-2xl border border-white/[.08] bg-[#171B23] p-4 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Lượt xem và click trong 30 ngày</h2>
              <p className="mt-1 text-xs text-[rgba(245,237,214,.42)]">Mỗi cột thể hiện số liệu của một ngày theo múi giờ Việt Nam.</p>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-[rgba(245,237,214,.58)]">
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-[#C9A84C]" /> Lượt xem</span>
              <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-sm bg-sky-400" /> Click sản phẩm</span>
            </div>
          </div>
          <div className="mt-6 overflow-x-auto pb-2">
            <div className="flex h-56 min-w-[760px] items-end gap-2 border-b border-white/[.08] px-1">
              {report.daily.map((row, index) => (
                <div key={row.date} className="group flex h-full min-w-4 flex-1 flex-col justify-end" title={`${row.date}: ${row.views} lượt xem, ${row.productClicks} click`}>
                  <div className="flex h-[185px] items-end justify-center gap-0.5">
                    <div className="w-[42%] rounded-t bg-[#C9A84C] transition-opacity group-hover:opacity-80" style={{ height: `${Math.max(row.views > 0 ? 4 : 0, (row.views / maxDaily) * 100)}%` }} />
                    <div className="w-[42%] rounded-t bg-sky-400 transition-opacity group-hover:opacity-80" style={{ height: `${Math.max(row.productClicks > 0 ? 4 : 0, (row.productClicks / maxDaily) * 100)}%` }} />
                  </div>
                  <span className="mt-2 -rotate-45 whitespace-nowrap text-[9px] text-[rgba(245,237,214,.32)]">
                    {index % 3 === 0 || index === report.daily.length - 1 ? row.label : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[.08] bg-[#171B23]">
          <div className="border-b border-white/[.08] px-5 py-4 md:px-6">
            <h2 className="text-lg font-bold text-white">Sản phẩm được click từ bài viết</h2>
            <p className="mt-1 text-xs text-[rgba(245,237,214,.42)]">Thống kê từng link sản phẩm và lần click gần nhất.</p>
          </div>
          {report.products.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <MousePointerClick className="mx-auto h-8 w-8 text-[rgba(245,237,214,.22)]" />
              <p className="mt-3 text-sm text-[rgba(245,237,214,.48)]">Chưa có lượt click sản phẩm từ bài viết này.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-white/[.08] text-left text-[10px] uppercase tracking-[.12em] text-[rgba(245,237,214,.42)]">
                    <th className="px-5 py-3 font-medium md:px-6">Sản phẩm</th>
                    <th className="px-4 py-3 font-medium">Link đích</th>
                    <th className="px-4 py-3 text-right font-medium">Lượt click</th>
                    <th className="px-5 py-3 text-right font-medium md:px-6">Click gần nhất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.05]">
                  {report.products.map((product) => (
                    <tr key={product.productSlug} className="hover:bg-white/[.025]">
                      <td className="px-5 py-4 md:px-6">
                        <p className="text-sm font-semibold text-white">{product.productName}</p>
                        <p className="mt-1 text-[11px] text-[rgba(245,237,214,.35)]">{product.productSlug}</p>
                      </td>
                      <td className="px-4 py-4">
                        <Link href={product.targetPath} target="_blank" className="inline-flex items-center gap-1 break-all text-xs text-sky-300/75 hover:text-sky-300">
                          {product.targetPath} <ExternalLink className="h-3 w-3 shrink-0" />
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-right text-base font-bold text-[#E6BF55]">{formatNumber(product.clicks)}</td>
                      <td className="px-5 py-4 text-right text-xs text-[rgba(245,237,214,.52)] md:px-6">
                        {product.lastClickedAt ? new Date(product.lastClickedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
