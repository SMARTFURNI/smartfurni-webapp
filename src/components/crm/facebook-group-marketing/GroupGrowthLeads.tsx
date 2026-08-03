"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BadgeDollarSign, ExternalLink, Filter, Loader2,
  MessageSquare, RefreshCw, ShoppingCart, Users,
} from "lucide-react";

type Row = Record<string, unknown>;

async function api(path: string) {
  const response = await fetch(`/api/crm/facebook-group-marketing/${path}`, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Không thể tải khách hàng từ Group.");
  return result;
}

function money(value: unknown) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}

export default function GroupGrowthLeads() {
  const [rows, setRows] = useState<Row[]>([]);
  const [groups, setGroups] = useState<Row[]>([]);
  const [groupId, setGroupId] = useState("");
  const [stage, setStage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const query = new URLSearchParams({ limit: "100" });
      if (groupId) query.set("groupId", groupId);
      if (stage) query.set("stage", stage);
      const [leads, options] = await Promise.all([
        api(`growth-leads?${query.toString()}`),
        api("options"),
      ]);
      setRows(leads);
      setGroups(options.groups || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tải khách hàng từ Group.");
    } finally {
      setLoading(false);
    }
  }, [groupId, stage]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    leads: rows.length,
    messenger: rows.filter(row => row.firstMessengerAt).length,
    quotes: rows.filter(row => row.quoteId).length,
    orders: rows.filter(row => row.orderId).length,
    revenue: rows.reduce((sum, row) => sum + Number(row.revenue || 0), 0),
  }), [rows]);

  const cards = [
    { label: "Lead từ Group", value: stats.leads, icon: Users },
    { label: "Đã vào Messenger", value: stats.messenger, icon: MessageSquare },
    { label: "Đã có báo giá", value: stats.quotes, icon: BadgeDollarSign },
    { label: "Đã có đơn hàng", value: stats.orders, icon: ShoppingCart },
  ];

  return (
    <div className="fbg-leads space-y-5">
      {error && <div className="flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">
        <AlertTriangle size={17} /> {error}
      </div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => <article key={label}
          className="rounded-2xl border border-amber-200/10 bg-[#111722]/90 p-4">
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-amber-300/15 bg-amber-300/10 text-amber-300">
              <Icon size={19} />
            </span>
            <b className="text-2xl text-white">{value}</b>
          </div>
          <p className="mt-3 text-xs text-slate-500">{label}</p>
        </article>)}
      </section>

      <section className="rounded-2xl border border-amber-200/10 bg-[#111722]/90 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="grid flex-1 gap-1.5 text-xs text-slate-400">
            Group
            <select value={groupId} onChange={event => setGroupId(event.target.value)}
              className="min-h-11 rounded-xl border border-amber-200/10 bg-[#0b1019] px-3 text-sm text-slate-200">
              <option value="">Tất cả Group</option>
              {groups.map(group => <option key={String(group.id)} value={String(group.id)}>{String(group.name)}</option>)}
            </select>
          </label>
          <label className="grid flex-1 gap-1.5 text-xs text-slate-400">
            Giai đoạn CRM
            <select value={stage} onChange={event => setStage(event.target.value)}
              className="min-h-11 rounded-xl border border-amber-200/10 bg-[#0b1019] px-3 text-sm text-slate-200">
              <option value="">Tất cả giai đoạn</option>
              <option value="new">Mới</option>
              <option value="contacted">Đã liên hệ</option>
              <option value="qualified">Đủ điều kiện</option>
              <option value="proposal">Đã báo giá</option>
              <option value="won">Thành công</option>
              <option value="lost">Thất bại</option>
            </select>
          </label>
          <button onClick={() => void load()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-300">
            <Filter size={15} /> Lọc
          </button>
          <button onClick={() => void load()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-300">
            <RefreshCw size={15} /> Làm mới
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-amber-200/10 bg-[#111722]/90">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/10 p-4">
          <div>
            <h2 className="font-black text-white">Khách hàng có nguồn Facebook Group</h2>
            <p className="mt-1 text-xs text-slate-500">Nguồn được nối xuyên suốt từ bài đăng đến báo giá và đơn hàng.</p>
          </div>
          <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/10 px-3 py-2 text-sm font-black text-emerald-200">
            Doanh thu: {money(stats.revenue)}
          </div>
        </div>
        {loading ? <div className="grid min-h-64 place-items-center"><Loader2 className="animate-spin text-amber-300" /></div>
          : rows.length ? <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="border-b border-white/8 bg-white/[.025] text-[10px] uppercase tracking-[.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3">Mã nguồn</th>
                  <th className="px-4 py-3">Messenger</th>
                  <th className="px-4 py-3">Giai đoạn</th>
                  <th className="px-4 py-3">Báo giá</th>
                  <th className="px-4 py-3">Đơn hàng</th>
                  <th className="px-4 py-3">Doanh thu</th>
                  <th className="px-4 py-3">Mở</th>
                </tr>
              </thead>
              <tbody>{rows.map(row => <tr key={String(row.id)}
                className="border-b border-white/[.055] text-slate-300 hover:bg-white/[.02]">
                <td className="px-4 py-3">
                  <b className="block text-white">{String(row.leadName || "Khách chưa đặt tên")}</b>
                  <small className="text-slate-500">{String(row.phone || "Chưa có số điện thoại")}</small>
                </td>
                <td className="max-w-[230px] truncate px-4 py-3">{String(row.groupName || "—")}</td>
                <td className="px-4 py-3 font-mono text-xs text-amber-200">{String(row.sourceCode || "—")}</td>
                <td className="px-4 py-3">{formatDate(row.firstMessengerAt)}</td>
                <td className="px-4 py-3">{String(row.stage || "new")}</td>
                <td className="px-4 py-3">{row.quoteId ? "Có" : "—"}</td>
                <td className="px-4 py-3">{row.orderId ? "Có" : "—"}</td>
                <td className="px-4 py-3 font-bold text-emerald-200">{money(row.revenue)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/crm/leads/${row.leadId}`} title="Mở khách hàng CRM"
                      className="grid h-9 w-9 place-items-center rounded-lg border border-white/10">
                      <Users size={15} />
                    </Link>
                    {Boolean(row.postUrl) && <a href={String(row.postUrl)} target="_blank" rel="noreferrer"
                      title="Mở bài đăng Facebook"
                      className="grid h-9 w-9 place-items-center rounded-lg border border-white/10">
                      <ExternalLink size={15} />
                    </a>}
                  </div>
                </td>
              </tr>)}</tbody>
            </table>
          </div> : <div className="grid min-h-64 place-items-center text-center text-sm text-slate-500">
            <div><Users className="mx-auto text-slate-600" /><p className="mt-3">Chưa có lead nào khớp nguồn Facebook Group.</p></div>
          </div>}
      </section>
    </div>
  );
}
