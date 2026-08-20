'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, LayoutDashboard, Loader2, ShieldCheck, UsersRound } from 'lucide-react';

const modules = [
  {
    path: '/crm',
    order: '01',
    code: 'CRM',
    eyebrow: 'Bán hàng & chăm sóc',
    title: 'SmartFurni CRM',
    description: 'Khách hàng · Công việc · Báo cáo',
    icon: UsersRound,
    action: 'Vào CRM',
    tone: 'crm',
  },
  {
    path: '/admin',
    order: '02',
    code: 'ADMIN',
    eyebrow: 'Website & vận hành',
    title: 'Quản trị website',
    description: 'Sản phẩm · Nội dung · Cấu hình',
    icon: LayoutDashboard,
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
      <div className="module-hub-wave" aria-hidden="true" />

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
          <div className="module-kicker">Chọn không gian</div>
          <h1>Bạn muốn làm việc ở đâu?</h1>
          <span className="module-heading-accent" aria-hidden="true" />
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
                  <span className="module-order">{module.order}</span>
                  <span className="module-code">{module.code}</span>
                </div>

                <div className="module-icon"><Icon size={31} strokeWidth={1.55} /></div>

                <div className="module-card-copy">
                  <p className="module-eyebrow">{module.eyebrow}</p>
                  <h2>{module.title}</h2>
                  <p className="module-description">{module.description}</p>
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
