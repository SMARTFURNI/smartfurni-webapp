"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, FlaskConical, Mail, MessageCircle, Play } from "lucide-react";

interface Props {
  channel: "zalo" | "email";
  subject?: string;
  body: string;
  mediaAssetIds?: string[];
}

const SAMPLE_VALUES: Record<string, string> = {
  name: "Anh Minh",
  customer_name: "Anh Minh",
  contact_name: "Anh Minh",
  company: "An Nhiên Hospitality",
  company_name: "An Nhiên Hospitality",
  property_name: "An Nhiên Homestay",
  property_type: "homestay 12 phòng",
  city: "Đà Lạt",
  phone: "0901 234 567",
  email: "minh@annhien.vn",
  stage: "Đang tư vấn",
  assignedTo: "Nguyễn Lan",
  sales_name: "Nguyễn Lan",
  value: "180.000.000 đ",
  quantity: "12",
  available_dimensions: "1,6 × 2,2 m",
  main_priority: "dễ vận hành và vệ sinh",
  required_date: "15/11/2026",
  survey_form_line: "Điền nhanh tại: https://smartfurni.com.vn/khao-sat",
  survey_form_url: "https://smartfurni.com.vn/khao-sat",
  approved_demo_video_url: "[Video đính kèm từ thư viện]",
  project_brief_url: "https://smartfurni.com.vn/project-brief",
  comparison_pack_url: "https://smartfurni.com.vn/so-sanh",
};

function renderSample(template: string) {
  return template.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, key: string) => SAMPLE_VALUES[key] || `[${key}]`);
}

export default function AutomationTemplateTest({ channel, subject = "", body, mediaAssetIds = [] }: Props) {
  const [open, setOpen] = useState(false);
  const renderedBody = useMemo(() => renderSample(body), [body]);
  const renderedSubject = useMemo(() => renderSample(subject), [subject]);

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/60">
      <button type="button" onClick={() => setOpen(value => !value)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><FlaskConical size={14} /></span>
        <span className="min-w-0 flex-1"><strong className="block text-xs text-emerald-900">Test thử mẫu này</strong><span className="block text-[10px] text-emerald-700">Xem nội dung sau khi thay biến và media trước khi gửi thật</span></span>
        {open ? <ChevronUp size={15} className="text-emerald-700" /> : <ChevronDown size={15} className="text-emerald-700" />}
      </button>
      {open && (
        <div className="border-t border-emerald-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
              {channel === "email" ? <Mail size={11} /> : <MessageCircle size={11} />}
              {channel === "email" ? "Bản xem trước Email" : "Bản xem trước Zalo"}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700"><CheckCircle2 size={11} /> Không gửi tới khách hàng</span>
          </div>
          <div className={`rounded-2xl border p-3 ${channel === "zalo" ? "ml-auto max-w-[88%] border-blue-200 bg-blue-50" : "border-slate-200 bg-slate-50"}`}>
            {channel === "email" && renderedSubject && <div className="mb-2 border-b border-slate-200 pb-2 text-xs font-bold text-slate-900">Chủ đề: {renderedSubject}</div>}
            <div className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{renderedBody || "Chưa có nội dung."}</div>
            {mediaAssetIds.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {mediaAssetIds.map(id => (
                  <div key={id} className="relative aspect-square overflow-hidden rounded-lg border border-white bg-slate-100 shadow-sm">
                    <img src={`/api/crm/zalo-inbox/media-library/thumbnail?id=${encodeURIComponent(id)}`} alt="Media kiểm thử" className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 right-1 rounded bg-slate-950/70 px-1 py-0.5 text-[8px] font-bold text-white">MEDIA</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500"><Play size={10} /> Dữ liệu mẫu: Anh Minh · An Nhiên Homestay · 12 sản phẩm</div>
        </div>
      )}
    </div>
  );
}
