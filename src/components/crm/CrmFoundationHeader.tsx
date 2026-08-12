"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Database, Tags, Users } from "lucide-react";

const STEPS = [
  { id: "pool", label: "1. Tiếp nhận Data Pool", href: "/crm/data-pool", icon: Database },
  { id: "customers", label: "2. Hồ sơ khách hàng", href: "/crm/leads", icon: Users },
  { id: "segments", label: "3. Phân nhóm chăm sóc", href: "/crm/lead-segmentation", icon: Tags },
] as const;

export default function CrmFoundationHeader({ active, title, description, actions }: {
  active: "pool" | "customers" | "segments";
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="m-5 mb-0 overflow-hidden rounded-[24px] border border-[#ead9a6] bg-white shadow-[0_18px_45px_rgba(31,41,55,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[radial-gradient(circle_at_top_right,rgba(240,195,70,0.22),transparent_38%),linear-gradient(135deg,#fffdf7,#ffffff)] px-6 py-5">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#9a7618]">
            <span>SmartFurni Customer Foundation</span>
            <span className="rounded-full border border-[#e7cd7d] bg-[#fff8dd] px-2 py-1 tracking-normal">SF-AUTO-01 · SF-AUTO-02</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#14213d]">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-[#64748b]">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      <div className="flex gap-2 overflow-x-auto border-t border-[#e8eef6] bg-[#f8fbff] px-4 py-3">
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
