'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, BarChart3, Boxes, CheckCircle2, LayoutDashboard, Loader2, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';

const modules = [
  {
    path: '/crm',
    eyebrow: 'Kinh doanh & khách hàng',
    title: 'SmartFurni CRM',
    description: 'Quản lý khách hàng, cơ hội bán hàng, công việc, kế hoạch và chăm sóc sau bán.',
    icon: UsersRound,
    features: [
      { icon: BarChart3, label: 'Dashboard doanh số' },
      { icon: CheckCircle2, label: 'Kanban & công việc' },
    ],
    action: 'Mở CRM',
  },
  {
    path: '/admin',
    eyebrow: 'Website & vận hành',
    title: 'Quản trị Website',
    description: 'Quản lý sản phẩm, đơn hàng, nội dung, giao diện và toàn bộ cấu hình website.',
    icon: LayoutDashboard,
    features: [
      { icon: Boxes, label: 'Sản phẩm & đơn hàng' },
      { icon: ShieldCheck, label: 'Cài đặt hệ thống' },
    ],
    action: 'Mở trang quản trị',
  },
];

export default function ChooseModulePage() {
  const router = useRouter();
  const [loadingPath, setLoadingPath] = useState<string | null>(null);

  const handleNavigate = (path: string) => {
    setLoadingPath(path);
    router.push(path);
  };

  return (
    <main className="module-hub">
      <div className="module-hub-grid" aria-hidden="true" />
      <div className="module-hub-glow module-hub-glow-one" aria-hidden="true" />
      <div className="module-hub-glow module-hub-glow-two" aria-hidden="true" />

      <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col justify-center px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-7 text-center sm:mb-10">
          <div className="mb-5 flex justify-center">
            <div className="module-brand">
              <img src="/smartfurni-logo.png" alt="SmartFurni" />
            </div>
          </div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#d7b957]/20 bg-[#d7b957]/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#e9d58d]">
            <Sparkles size={13} /> Trung tâm điều hành
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f5edd6] sm:text-4xl">Chọn không gian làm việc</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#f5edd6]/52 sm:text-base">
            Một tài khoản, hai hệ thống đồng bộ dữ liệu và chung ngôn ngữ thiết kế SmartFurni.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {modules.map((module) => {
            const Icon = module.icon;
            const loading = loadingPath === module.path;
            return (
              <button
                key={module.path}
                onClick={() => handleNavigate(module.path)}
                disabled={loadingPath !== null}
                className="module-card group text-left disabled:cursor-wait disabled:opacity-65"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="module-icon"><Icon size={24} /></div>
                  <span className="rounded-full border border-white/8 bg-white/[0.035] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-[#f5edd6]/42">Hệ thống nội bộ</span>
                </div>
                <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.2em] text-[#d7b957]">{module.eyebrow}</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#f5edd6] sm:text-[28px]">{module.title}</h2>
                <p className="mt-2 min-h-[52px] text-sm leading-6 text-[#f5edd6]/55">{module.description}</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {module.features.map(feature => {
                    const FeatureIcon = feature.icon;
                    return (
                      <div key={feature.label} className="module-feature">
                        <FeatureIcon size={14} /><span>{feature.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="module-action">
                  <span>{loading ? 'Đang mở...' : module.action}</span>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
                </div>
              </button>
            );
          })}
        </div>

        <footer className="mt-7 flex flex-col items-center justify-between gap-2 text-center text-[11px] text-[#f5edd6]/32 sm:mt-9 sm:flex-row sm:text-left">
          <span>© 2026 SmartFurni · Trung tâm vận hành</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} /> Khu vực quản trị được bảo vệ</span>
        </footer>
      </section>

    </main>
  );
}
