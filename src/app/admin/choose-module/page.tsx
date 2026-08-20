'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, BarChart3, Boxes, CheckCircle2, LayoutDashboard, Loader2, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';

const modules = [
  {
    path: '/crm',
    code: 'CRM',
    eyebrow: 'Bán hàng & chăm sóc',
    title: 'SmartFurni CRM',
    description: 'Quản lý khách hàng, bán hàng, công việc và chăm sóc.',
    icon: UsersRound,
    features: [
      { icon: BarChart3, label: 'Khách hàng & cơ hội' },
      { icon: CheckCircle2, label: 'Công việc & báo cáo' },
    ],
    action: 'Vào CRM',
    tone: 'crm',
  },
  {
    path: '/admin',
    code: 'ADMIN',
    eyebrow: 'Website & vận hành',
    title: 'Quản trị website',
    description: 'Quản lý sản phẩm, đơn hàng, nội dung và cấu hình website.',
    icon: LayoutDashboard,
    features: [
      { icon: Boxes, label: 'Sản phẩm & đơn hàng' },
      { icon: ShieldCheck, label: 'Nội dung & cấu hình' },
    ],
    action: 'Vào quản trị',
    tone: 'admin',
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

      <section className="module-shell">
        <nav className="module-topbar" aria-label="SmartFurni">
          <div className="module-brand">
            <img src="/smartfurni-logo.png" alt="SmartFurni" />
          </div>
          <div className="module-secure">
            <ShieldCheck size={15} />
            <span>Truy cập nội bộ</span>
          </div>
        </nav>

        <header className="module-heading">
          <div className="module-kicker">
            <Sparkles size={14} /> Không gian làm việc
          </div>
          <h1>Bạn muốn vào đâu?</h1>
          <p>Chọn một khu vực để tiếp tục.</p>
        </header>

        <div className="module-card-grid">
          {modules.map((module) => {
            const Icon = module.icon;
            const loading = loadingPath === module.path;
            return (
              <button
                key={module.path}
                onClick={() => handleNavigate(module.path)}
                disabled={loadingPath !== null}
                className={`module-card module-card-${module.tone} group`}
                aria-busy={loading}
              >
                <div className="module-card-top">
                  <div className="module-icon"><Icon size={25} strokeWidth={1.8} /></div>
                  <span className="module-code">{module.code}</span>
                </div>

                <div className="module-card-copy">
                  <p className="module-eyebrow">{module.eyebrow}</p>
                  <h2>{module.title}</h2>
                  <p className="module-description">{module.description}</p>
                </div>

                <div className="module-features">
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
                  {loading ? <Loader2 size={19} className="animate-spin" /> : <ArrowRight size={19} />}
                </div>
              </button>
            );
          })}
        </div>

        <footer className="module-footer">
          <span>SmartFurni · Cổng nội bộ</span>
          <span className="module-footer-security"><ShieldCheck size={13} /> Phiên đăng nhập được bảo vệ</span>
        </footer>
      </section>

    </main>
  );
}
