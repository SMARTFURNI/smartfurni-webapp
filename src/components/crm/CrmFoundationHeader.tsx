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
    <section className="overflow-hidden rounded-[24px] border border-[#e4d7ac] bg-white shadow-[0_18px_45px_rgba(31,41,55,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[radial-gradient(circle_at_top_right,rgba(240,195,70,0.18),transparent_36%),linear-gradient(135deg,#ffffff,#fffdf7)] px-5 py-5 md:px-7">
        <div className="min-w-0">
          <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#a57b17]">Quản lý khách hàng</div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#14213d] md:text-3xl">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#64748b]">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="flex gap-2 overflow-x-auto border-t border-[#e8eef6] bg-[#f8fafc] px-3 py-2.5 md:px-5">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const selected = step.id === active;
          return (
            <div key={step.id} className="flex shrink-0 items-center gap-2">
              <Link href={step.href} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${selected ? "border-[#d9ad2b] bg-gradient-to-r from-[#fff3bd] to-[#ffe27a] text-[#6f5000] shadow-sm" : "border-[#dbe5f0] bg-white text-[#64748b] hover:border-[#c9a84c] hover:text-[#14213d]"}`}>
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
