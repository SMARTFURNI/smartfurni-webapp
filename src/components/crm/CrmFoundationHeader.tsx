"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Database, Tags, Users } from "lucide-react";

const STEPS = [
  { id: "pool", label: "Data Pool", href: "/crm/data-pool", icon: Database },
  { id: "customers", label: "Khách hàng", href: "/crm/leads", icon: Users },
  { id: "segments", label: "Phân nhóm", href: "/crm/lead-segmentation", icon: Tags },
] as const;

export default function CrmFoundationHeader({ active, title, description, actions }: {
  active: "pool" | "customers" | "segments";
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[20px] border border-[#e4d7ac] bg-white shadow-[0_12px_34px_rgba(31,41,55,0.07)]">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[radial-gradient(circle_at_top_right,rgba(240,195,70,0.18),transparent_34%),linear-gradient(135deg,#ffffff,#fffdf7)] px-4 py-3 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ead384] bg-gradient-to-br from-[#fff8d8] via-[#f8e6a1] to-[#e2bb43] text-[#765400] shadow-[0_7px_16px_rgba(185,135,32,0.18)] sm:flex">
            <Users size={18} />
          </div>
          <div className="min-w-0">
            <div className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#a57b17]">Quản lý khách hàng</div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <h1 className="text-xl font-bold tracking-[-0.02em] text-[#14213d] md:text-[22px]">{title}</h1>
              <p className="max-w-3xl truncate text-xs text-[#64748b] md:text-[13px]">{description}</p>
            </div>
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="flex gap-1.5 overflow-x-auto border-t border-[#e8eef6] bg-gradient-to-r from-[#f8fafc] via-white to-[#fffaf0] px-3 py-1.5 md:px-4">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const selected = step.id === active;
          return (
            <div key={step.id} className="flex shrink-0 items-center gap-2">
              <Link href={step.href} className={`flex items-center gap-1.5 rounded-[10px] border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${selected ? "border-[#d9ad2b] bg-gradient-to-r from-[#fff6cf] via-[#f8df81] to-[#e8bd3f] text-[#5f4300] shadow-[0_5px_12px_rgba(185,135,32,0.18)]" : "border-[#dbe5f0] bg-gradient-to-br from-white to-[#f5f8fc] text-[#64748b] hover:-translate-y-0.5 hover:border-[#c9a84c] hover:text-[#14213d] hover:shadow-sm"}`}>
                {selected ? <CheckCircle2 size={15} /> : <Icon size={15} />}
                {step.label}
              </Link>
              {index < STEPS.length - 1 && <ArrowRight size={14} className="text-[#b7c3d2]" />}
            </div>
          );
        })}
      </div>
    </section>
  );
}
