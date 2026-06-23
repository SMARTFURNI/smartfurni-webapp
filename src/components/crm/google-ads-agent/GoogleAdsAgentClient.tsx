"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, Gauge, Link2, Megaphone, Package, Rocket, Sparkles, TrendingUp, XCircle } from "lucide-react";
import type { AdCampaignDraft, AdPerformanceDaily, CampaignInput, GoogleAdsProduct } from "@/lib/google-ads-agent/types";

type Tab = "products" | "create" | "approval" | "connect" | "report" | "optimize";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "products", label: "Sản phẩm", icon: Package },
  { id: "create", label: "Tạo chiến dịch", icon: Sparkles },
  { id: "approval", label: "Duyệt quảng cáo", icon: CheckCircle2 },
  { id: "connect", label: "Kết nối Google Ads", icon: Link2 },
  { id: "report", label: "Báo cáo ngày", icon: Gauge },
  { id: "optimize", label: "Đề xuất tối ưu", icon: TrendingUp },
];

const defaultInput: CampaignInput = {
  productLine: "sofa_giuong",
  productSku: "SMF23",
  objective: "messages",
  location: "HCM",
  dailyBudget: 350000,
  targetCpa: 180000,
};

export default function GoogleAdsAgentClient() {
  const [tab, setTab] = useState<Tab>("create");
  const [products, setProducts] = useState<GoogleAdsProduct[]>([]);
  const [drafts, setDrafts] = useState<AdCampaignDraft[]>([]);
  const [performance, setPerformance] = useState<AdPerformanceDaily[]>([]);
  const [optimizations, setOptimizations] = useState<{ title: string; action: string; severity: string }[]>([]);
  const [connectInfo, setConnectInfo] = useState<{ authUrl?: string; envReady?: boolean; accounts?: unknown[] }>({});
  const [input, setInput] = useState<CampaignInput>(defaultInput);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const currentProduct = useMemo(() => products.find((p) => p.sku === input.productSku), [products, input.productSku]);

  useEffect(() => {
    refreshAll();
  }, []);

  async function refreshAll() {
    const [productsRes, draftsRes, perfRes, optRes, connectRes] = await Promise.all([
      fetch("/api/google-ads-agent/products"),
      fetch("/api/google-ads-agent/drafts"),
      fetch("/api/google-ads-agent/performance"),
      fetch("/api/google-ads-agent/optimizations"),
      fetch("/api/google-ads-agent/connect"),
    ]);
    if (productsRes.ok) setProducts(await productsRes.json());
    if (draftsRes.ok) setDrafts(await draftsRes.json());
    if (perfRes.ok) setPerformance(await perfRes.json());
    if (optRes.ok) setOptimizations(await optRes.json());
    if (connectRes.ok) setConnectInfo(await connectRes.json());
  }

  async function createDraft() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/google-ads-agent/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không tạo được draft");
      setDrafts((prev) => [data, ...prev]);
      setTab("approval");
      setMessage("Đã tạo nháp quảng cáo. Vui lòng kiểm tra trước khi duyệt.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function approveDraft(id: string, rejected = false) {
    const res = await fetch(`/api/google-ads-agent/drafts/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rejected ? { status: "rejected", reason: "Không phù hợp chiến dịch hiện tại" } : { status: "human_approved" }),
    });
    const data = await res.json();
    if (res.ok) {
      setDrafts((prev) => prev.map((draft) => (draft.id === id ? data : draft)));
      setMessage(rejected ? "Đã từ chối draft." : "Đã duyệt draft. Có thể bấm đăng paused campaign.");
    } else setMessage(data.error || "Không cập nhật được draft");
  }

  async function pushDraft(id: string) {
    const res = await fetch(`/api/google-ads-agent/drafts/${id}/push`, { method: "POST" });
    const data = await res.json();
    setMessage(res.ok ? data.result.message : data.error);
  }

  return (
    <div className="min-h-screen p-5 text-white" style={{ background: "linear-gradient(135deg,#0d0b1a,#1b1304)" }}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-amber-300"><Bot size={20} /> AI Google Ads Agent</div>
          <h1 className="text-2xl font-bold">Tạo, duyệt và tối ưu quảng cáo SmartFurni</h1>
          <p className="text-sm text-white/60">MVP ưu tiên tạo nháp AI, kiểm tra chính sách và duyệt thủ công trước khi đăng.</p>
        </div>
        <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
          Không tự đăng hoặc tự tăng ngân sách nếu chưa được duyệt
        </div>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${tab === item.id ? "bg-amber-400 text-black" : "bg-white/8 text-white/75"}`}>
              <Icon size={16} /> {item.label}
            </button>
          );
        })}
      </div>

      {message && <div className="mb-4 rounded-lg border border-amber-300/20 bg-black/30 px-4 py-3 text-sm text-amber-100">{message}</div>}

      {tab === "products" && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <Panel key={product.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-amber-300">{product.sku}</div>
                  <h3 className="font-semibold">{product.name}</h3>
                </div>
                <span className="rounded-full bg-emerald-400/15 px-2 py-1 text-xs text-emerald-200">{product.status}</span>
              </div>
              <p className="mt-2 text-sm text-white/65">{product.usp.join(" • ")}</p>
              <div className="mt-3 text-sm text-white/60">{product.size}</div>
              <a className="mt-3 block truncate text-sm text-amber-300" href={product.landingPageUrl} target="_blank">{product.landingPageUrl}</a>
            </Panel>
          ))}
        </div>
      )}

      {tab === "create" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Panel>
            <div className="grid gap-4 md:grid-cols-2">
              <Select label="Dòng sản phẩm" value={input.productLine} onChange={(v) => setInput({ ...input, productLine: v as CampaignInput["productLine"] })} options={[
                ["sofa_giuong", "Sofa giường"], ["giuong_cong_thai_hoc", "Giường công thái học"], ["giuong_y_te", "Giường y tế"], ["ban_si_dai_ly", "Bán sỉ đại lý"],
              ]} />
              <Select label="Sản phẩm" value={input.productSku} onChange={(v) => setInput({ ...input, productSku: v })} options={products.map((p) => [p.sku, `${p.sku} - ${p.name}`])} />
              <Select label="Mục tiêu" value={input.objective} onChange={(v) => setInput({ ...input, objective: v as CampaignInput["objective"] })} options={[
                ["messages", "Tin nhắn"], ["calls", "Gọi điện"], ["purchase", "Mua hàng"], ["showroom", "Kéo khách showroom"], ["dealer", "Đại lý"],
              ]} />
              <Select label="Khu vực" value={input.location} onChange={(v) => setInput({ ...input, location: v as CampaignInput["location"] })} options={[
                ["HCM", "HCM"], ["Ha Noi", "Hà Nội"], ["Binh Duong", "Bình Dương"], ["Dong Nai", "Đồng Nai"], ["Long An", "Long An"], ["Toan quoc", "Toàn quốc"],
              ]} />
              <NumberInput label="Ngân sách/ngày" value={input.dailyBudget} onChange={(v) => setInput({ ...input, dailyBudget: v })} />
              <NumberInput label="CPA mục tiêu" value={input.targetCpa} onChange={(v) => setInput({ ...input, targetCpa: v })} />
            </div>
            <button disabled={loading} onClick={createDraft} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black disabled:opacity-60">
              <Megaphone size={16} /> {loading ? "Đang tạo..." : "AI tạo nháp quảng cáo"}
            </button>
          </Panel>
          <Panel>
            <h3 className="font-semibold text-amber-200">Landing page phù hợp</h3>
            <p className="mt-2 text-sm text-white/65">{currentProduct?.name}</p>
            <p className="mt-2 break-words text-sm text-amber-300">{currentProduct?.landingPageUrl}</p>
            <div className="mt-4 text-xs text-white/50">Nếu sản phẩm thiếu landing page, API sẽ báo lỗi và không lưu nháp.</div>
          </Panel>
        </div>
      )}

      {tab === "approval" && (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <Panel key={draft.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-amber-300">{draft.product.sku} • {draft.status}</div>
                  <h3 className="text-lg font-semibold">{draft.output.campaignName}</h3>
                  <p className="text-sm text-white/60">{draft.output.strategyReason}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => approveDraft(draft.id)} className="rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-black"><CheckCircle2 size={15} className="inline" /> Duyệt</button>
                  <button onClick={() => approveDraft(draft.id, true)} className="rounded-lg bg-red-400 px-3 py-2 text-sm font-semibold text-black"><XCircle size={15} className="inline" /> Từ chối</button>
                  <button onClick={() => pushDraft(draft.id)} className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-black"><Rocket size={15} className="inline" /> Đăng</button>
                </div>
              </div>
              {draft.validationErrors.length > 0 && <div className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-200">{draft.validationErrors.join(" • ")}</div>}
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                <MiniList title="Headlines" items={draft.output.headlines} />
                <MiniList title="Descriptions" items={draft.output.descriptions} />
                <MiniList title="Keywords" items={draft.output.keywords.slice(0, 18).map((k) => `${k.keyword} (${k.matchType})`)} />
              </div>
            </Panel>
          ))}
        </div>
      )}

      {tab === "connect" && (
        <Panel>
          <h3 className="text-lg font-semibold">Kết nối Google Ads</h3>
          <p className="mt-2 text-sm text-white/65">Cấu hình ENV rồi mở OAuth URL để lấy quyền Google Ads. Refresh token được mã hóa trước khi lưu.</p>
          <div className="mt-4 text-sm">ENV OAuth: {connectInfo.envReady ? "Đã sẵn sàng" : "Chưa đủ GOOGLE_ADS_CLIENT_ID/SECRET"}</div>
          {connectInfo.authUrl && <a href={connectInfo.authUrl} className="mt-4 inline-block rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black" target="_blank">Mở màn hình kết nối</a>}
          <div className="mt-4 text-sm text-white/60">Tài khoản đã lưu: {connectInfo.accounts?.length ?? 0}</div>
        </Panel>
      )}

      {tab === "report" && (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-white/50"><tr><th>Ngày</th><th>Campaign</th><th>Click</th><th>Cost</th><th>Conv.</th><th>CPA</th><th>ROAS</th></tr></thead>
              <tbody>{performance.map((row) => <tr key={row.id} className="border-t border-white/10"><td>{row.date}</td><td>{row.campaignName}</td><td>{row.clicks}</td><td>{row.cost.toLocaleString("vi-VN")}</td><td>{row.conversions}</td><td>{row.cpa.toLocaleString("vi-VN")}</td><td>{row.roas}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
      )}

      {tab === "optimize" && (
        <div className="grid gap-3 md:grid-cols-2">
          {optimizations.map((item, idx) => (
            <Panel key={`${item.title}-${idx}`}>
              <div className="text-xs uppercase text-amber-300">{item.severity}</div>
              <h3 className="mt-1 font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-white/65">{item.action}</p>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-white/10 bg-white/[0.06] p-4 shadow-xl">{children}</div>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-white/60">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white">
        {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-white/60">{label}</span>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white" />
    </label>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-black/25 p-3">
      <div className="mb-2 text-sm font-semibold text-amber-200">{title}</div>
      <div className="space-y-1 text-xs text-white/65">{items.map((item) => <div key={item}>{item}</div>)}</div>
    </div>
  );
}
