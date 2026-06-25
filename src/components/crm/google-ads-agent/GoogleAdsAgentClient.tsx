"use client";

import { useEffect, useMemo, useState, type ElementType, type ReactNode } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Edit3,
  Gauge,
  Link2,
  Megaphone,
  Package,
  RefreshCcw,
  Rocket,
  Save,
  Settings,
  Sparkles,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import type {
  AdCampaignDraft,
  AdPerformanceDaily,
  AIAdDraftOutput,
  CampaignInput,
  GoogleAdsProduct,
  KeywordDraft,
} from "@/lib/google-ads-agent/types";

type Tab = "products" | "create" | "approval" | "connect" | "report" | "optimize";

const tabs: { id: Tab; label: string; icon: ElementType }[] = [
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

const surface = "rgba(255,255,255,0.06)";
const surfaceStrong = "rgba(255,255,255,0.09)";
const border = "rgba(255,255,255,0.12)";
const gold = "#f59e0b";
const goldDeep = "#d97706";
const text = "#f5edd6";
const muted = "rgba(245,237,214,0.58)";

export default function GoogleAdsAgentClient() {
  const [tab, setTab] = useState<Tab>("create");
  const [products, setProducts] = useState<GoogleAdsProduct[]>([]);
  const [drafts, setDrafts] = useState<AdCampaignDraft[]>([]);
  const [performance, setPerformance] = useState<AdPerformanceDaily[]>([]);
  const [optimizations, setOptimizations] = useState<{ title: string; action: string; severity: string }[]>([]);
  const [connectInfo, setConnectInfo] = useState<{ authUrl?: string; envReady?: boolean; accounts?: unknown[] }>({});
  const [input, setInput] = useState<CampaignInput>(defaultInput);
  const [productEdits, setProductEdits] = useState<Record<string, GoogleAdsProduct>>({});
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [draftEdits, setDraftEdits] = useState<Record<string, AIAdDraftOutput>>({});
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const currentProduct = useMemo(() => products.find((p) => p.sku === input.productSku), [products, input.productSku]);
  const pendingDrafts = drafts.filter((draft) => draft.status !== "pushed_to_google");

  useEffect(() => {
    refreshAll();
  }, []);

  async function refreshAll() {
    try {
      const [productsRes, draftsRes, perfRes, optRes, connectRes] = await Promise.all([
        fetch("/api/google-ads-agent/products"),
        fetch("/api/google-ads-agent/drafts"),
        fetch("/api/google-ads-agent/performance"),
        fetch("/api/google-ads-agent/optimizations"),
        fetch("/api/google-ads-agent/connect"),
      ]);
      if (productsRes.ok) {
        const nextProducts = (await productsRes.json()) as GoogleAdsProduct[];
        setProducts(nextProducts);
        if (nextProducts.length && !nextProducts.some((product) => product.sku === input.productSku)) {
          setInput((prev) => ({ ...prev, productSku: nextProducts[0].sku }));
        }
      }
      if (draftsRes.ok) setDrafts(await draftsRes.json());
      if (perfRes.ok) setPerformance(await perfRes.json());
      if (optRes.ok) setOptimizations(await optRes.json());
      if (connectRes.ok) setConnectInfo(await connectRes.json());
    } catch (error) {
      setMessage(`Không tải được dữ liệu Google Ads Agent: ${(error as Error).message}`);
    }
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
      if (!res.ok) throw new Error(data.error || "Không tạo được nháp quảng cáo");
      setDrafts((prev) => [data, ...prev]);
      setTab("approval");
      setMessage("Đã tạo nháp quảng cáo. Bạn có thể chỉnh lại câu chữ trước khi duyệt.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function saveProduct(product: GoogleAdsProduct) {
    setSavingId(product.id);
    setMessage("");
    try {
      const res = await fetch("/api/google-ads-agent/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không lưu được sản phẩm");
      setProducts((prev) => prev.map((item) => (item.id === data.id ? data : item)));
      setEditingProductId(null);
      setMessage("Đã lưu thông tin sản phẩm quảng cáo.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function saveDraftEdit(draft: AdCampaignDraft) {
    const output = draftEdits[draft.id];
    if (!output) return;
    setSavingId(draft.id);
    setMessage("");
    try {
      const res = await fetch(`/api/google-ads-agent/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ output }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Không lưu được bản nháp");
      setDrafts((prev) => prev.map((item) => (item.id === draft.id ? data : item)));
      setEditingDraftId(null);
      setMessage(data.validationErrors?.length ? "Đã lưu, nhưng cần xử lý các cảnh báo trước khi duyệt." : "Đã lưu nội dung nháp quảng cáo.");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setSavingId(null);
    }
  }

  async function approveDraft(id: string, rejected = false) {
    setSavingId(id);
    setMessage("");
    const res = await fetch(`/api/google-ads-agent/drafts/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rejected ? { status: "rejected", reason: "Không phù hợp chiến dịch hiện tại" } : { status: "human_approved" }),
    });
    const data = await res.json();
    if (res.ok) {
      setDrafts((prev) => prev.map((draft) => (draft.id === id ? data : draft)));
      setMessage(rejected ? "Đã từ chối bản nháp." : "Đã duyệt bản nháp. Có thể đăng chiến dịch ở trạng thái tạm dừng.");
    } else {
      setMessage(data.error || "Không cập nhật được bản nháp");
    }
    setSavingId(null);
  }

  async function pushDraft(id: string) {
    setSavingId(id);
    setMessage("");
    const res = await fetch(`/api/google-ads-agent/drafts/${id}/push`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      if (data.draft) setDrafts((prev) => prev.map((draft) => (draft.id === id ? data.draft : draft)));
      setMessage(data.result.message);
    } else {
      setMessage(data.error || "Không đăng được chiến dịch");
    }
    setSavingId(null);
  }

  return (
    <div
      className="min-h-screen px-7 py-7"
      style={{
        color: text,
        background:
          "radial-gradient(circle at top left, rgba(245,158,11,0.18), transparent 30%), radial-gradient(circle at bottom right, rgba(217,119,6,0.16), transparent 28%), linear-gradient(135deg,#0b1020 0%,#12100b 42%,#1a1200 100%)",
      }}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg"
            style={{ background: `linear-gradient(135deg, ${gold}, ${goldDeep})`, boxShadow: "0 16px 34px rgba(245,158,11,0.25)" }}
          >
            <Bot size={28} color="#fff7db" />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2 text-sm font-semibold" style={{ color: "#facc15" }}>
              <Sparkles size={16} /> AI Google Ads Agent
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Tạo, duyệt và tối ưu quảng cáo SmartFurni</h1>
            <p className="mt-1 text-sm" style={{ color: muted }}>
              Tạo nháp bằng AI, chỉnh sửa nội dung, kiểm tra chính sách và duyệt thủ công trước khi đăng.
            </p>
          </div>
        </div>
        <button
          onClick={refreshAll}
          className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:scale-[1.01]"
          style={{ background: surface, border: `1px solid ${border}`, color: text }}
        >
          <RefreshCcw size={16} /> Tải lại dữ liệu
        </button>
      </div>

      <div className="mb-6 grid gap-2 rounded-3xl p-2 md:grid-cols-3 xl:grid-cols-6" style={{ background: surface, border: `1px solid ${border}` }}>
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition"
              style={{
                background: active ? `linear-gradient(135deg, ${gold}, ${goldDeep})` : "transparent",
                color: active ? "#111827" : muted,
                boxShadow: active ? "0 10px 28px rgba(245,158,11,0.28)" : "none",
              }}
            >
              <Icon size={17} /> {item.label}
            </button>
          );
        })}
      </div>

      {message && (
        <div className="mb-5 rounded-2xl px-4 py-3 text-sm" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.28)", color: "#fde68a" }}>
          {message}
        </div>
      )}

      {tab === "products" && (
        <SectionShell title="Danh sách sản phẩm quảng cáo" subtitle="Chỉnh tên, USP, nhóm khách hàng và landing page để AI tạo đúng nội dung.">
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {products.map((product) => {
              const editing = editingProductId === product.id;
              const draft = productEdits[product.id] ?? product;
              return (
                <Panel key={product.id} className="min-h-[260px]">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "#facc15" }}>{product.sku}</div>
                      <h3 className="mt-1 text-xl font-bold">{product.name}</h3>
                    </div>
                    <StatusPill tone={product.status === "active" ? "green" : "gray"}>{product.status === "active" ? "Đang chạy" : "Tạm dừng"}</StatusPill>
                  </div>

                  {editing ? (
                    <div className="space-y-3">
                      <TextInput label="Tên sản phẩm" value={draft.name} onChange={(value) => setProductEdits((prev) => ({ ...prev, [product.id]: { ...draft, name: value } }))} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <NumberInput label="Giá" value={draft.price} onChange={(value) => setProductEdits((prev) => ({ ...prev, [product.id]: { ...draft, price: value } }))} />
                        <Select label="Trạng thái" value={draft.status} onChange={(value) => setProductEdits((prev) => ({ ...prev, [product.id]: { ...draft, status: value as GoogleAdsProduct["status"] } }))} options={[["active", "Đang chạy"], ["paused", "Tạm dừng"]]} />
                      </div>
                      <TextInput label="Kích thước" value={draft.size} onChange={(value) => setProductEdits((prev) => ({ ...prev, [product.id]: { ...draft, size: value } }))} />
                      <TextInput label="Chất liệu" value={draft.material} onChange={(value) => setProductEdits((prev) => ({ ...prev, [product.id]: { ...draft, material: value } }))} />
                      <TextareaInput label="USP, mỗi dòng một ý" value={listToText(draft.usp)} onChange={(value) => setProductEdits((prev) => ({ ...prev, [product.id]: { ...draft, usp: textToList(value) } }))} />
                      <TextareaInput label="Đối tượng khách hàng, mỗi dòng một nhóm" value={listToText(draft.targetCustomers)} onChange={(value) => setProductEdits((prev) => ({ ...prev, [product.id]: { ...draft, targetCustomers: textToList(value) } }))} />
                      <TextInput label="Landing page URL" value={draft.landingPageUrl} onChange={(value) => setProductEdits((prev) => ({ ...prev, [product.id]: { ...draft, landingPageUrl: value } }))} />
                      <div className="flex gap-2 pt-2">
                        <PrimaryButton onClick={() => saveProduct(draft)} disabled={savingId === product.id}><Save size={16} /> Lưu sản phẩm</PrimaryButton>
                        <GhostButton onClick={() => setEditingProductId(null)}><X size={16} /> Hủy</GhostButton>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm leading-6" style={{ color: muted }}>{product.usp.join(" • ")}</p>
                      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                        <InfoRow label="Giá" value={formatMoney(product.price)} />
                        <InfoRow label="Kích thước" value={product.size} />
                        <InfoRow label="Chất liệu" value={product.material} />
                        <InfoRow label="Khách hàng" value={product.targetCustomers.join(", ")} />
                      </div>
                      <a className="mt-4 block truncate text-sm font-medium" style={{ color: "#facc15" }} href={product.landingPageUrl} target="_blank">
                        {product.landingPageUrl}
                      </a>
                      <GhostButton className="mt-5" onClick={() => {
                        setProductEdits((prev) => ({ ...prev, [product.id]: product }));
                        setEditingProductId(product.id);
                      }}>
                        <Edit3 size={16} /> Chỉnh sửa nội dung
                      </GhostButton>
                    </div>
                  )}
                </Panel>
              );
            })}
          </div>
        </SectionShell>
      )}

      {tab === "create" && (
        <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
          <SectionShell title="Tạo chiến dịch mới" subtitle="Chọn sản phẩm, mục tiêu, khu vực và ngân sách để AI tạo bản nháp quảng cáo.">
            <Panel>
              <div className="grid gap-4 md:grid-cols-2">
                <Select label="Dòng sản phẩm" value={input.productLine} onChange={(value) => setInput({ ...input, productLine: value as CampaignInput["productLine"] })} options={[
                  ["sofa_giuong", "Sofa giường"],
                  ["giuong_cong_thai_hoc", "Giường công thái học"],
                  ["giuong_y_te", "Giường y tế"],
                  ["ban_si_dai_ly", "Bán sỉ đại lý"],
                ]} />
                <Select label="Sản phẩm" value={input.productSku} onChange={(value) => setInput({ ...input, productSku: value })} options={products.map((product) => [product.sku, `${product.sku} - ${product.name}`])} />
                <Select label="Mục tiêu" value={input.objective} onChange={(value) => setInput({ ...input, objective: value as CampaignInput["objective"] })} options={[
                  ["messages", "Tin nhắn"],
                  ["calls", "Gọi điện"],
                  ["purchase", "Mua hàng"],
                  ["showroom", "Kéo khách showroom"],
                  ["dealer", "Tìm đại lý"],
                ]} />
                <Select label="Khu vực" value={input.location} onChange={(value) => setInput({ ...input, location: value as CampaignInput["location"] })} options={[
                  ["HCM", "HCM"],
                  ["Ha Noi", "Hà Nội"],
                  ["Binh Duong", "Bình Dương"],
                  ["Dong Nai", "Đồng Nai"],
                  ["Long An", "Long An"],
                  ["Toan quoc", "Toàn quốc"],
                ]} />
                <NumberInput label="Ngân sách/ngày" value={input.dailyBudget} onChange={(value) => setInput({ ...input, dailyBudget: value })} />
                <NumberInput label="CPA mục tiêu" value={input.targetCpa} onChange={(value) => setInput({ ...input, targetCpa: value })} />
              </div>
              <PrimaryButton className="mt-5" onClick={createDraft} disabled={loading || !currentProduct}>
                <Megaphone size={17} /> {loading ? "Đang tạo nháp..." : "AI tạo nháp quảng cáo"}
              </PrimaryButton>
            </Panel>
          </SectionShell>

          <Panel>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "rgba(245,158,11,0.16)", color: "#facc15" }}>
              <Link2 size={22} />
            </div>
            <h3 className="text-xl font-bold">Landing page phù hợp</h3>
            <p className="mt-2 text-sm" style={{ color: muted }}>{currentProduct?.name ?? "Chưa chọn sản phẩm"}</p>
            <p className="mt-3 break-words text-sm font-semibold" style={{ color: "#facc15" }}>{currentProduct?.landingPageUrl}</p>
            <div className="mt-5 rounded-2xl p-4 text-sm" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.16)", color: muted }}>
              Nếu sản phẩm thiếu landing page, hệ thống sẽ báo lỗi và không lưu nháp để tránh chạy quảng cáo sai trang.
            </div>
          </Panel>
        </div>
      )}

      {tab === "approval" && (
        <SectionShell title="Duyệt quảng cáo trước khi đăng" subtitle="Có thể chỉnh trực tiếp headline, mô tả, từ khóa, sitelink và lý do chiến lược trước khi bấm duyệt.">
          <div className="space-y-4">
            {pendingDrafts.length === 0 && <EmptyState title="Chưa có bản nháp cần duyệt" description="Hãy tạo chiến dịch mới để AI sinh nội dung quảng cáo." />}
            {pendingDrafts.map((draft) => {
              const editing = editingDraftId === draft.id;
              const output = draftEdits[draft.id] ?? draft.output;
              return (
                <Panel key={draft.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <StatusPill tone={draft.status === "human_approved" ? "green" : draft.status === "rejected" ? "red" : "amber"}>{statusLabel(draft.status)}</StatusPill>
                        <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: "#facc15" }}>{draft.product.sku}</span>
                      </div>
                      <h3 className="text-xl font-bold">{draft.output.campaignName}</h3>
                      <p className="mt-1 max-w-4xl text-sm leading-6" style={{ color: muted }}>{draft.output.strategyReason}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <GhostButton onClick={() => {
                        setDraftEdits((prev) => ({ ...prev, [draft.id]: draft.output }));
                        setEditingDraftId(draft.id);
                      }}>
                        <Edit3 size={16} /> Sửa nội dung
                      </GhostButton>
                      <PrimaryButton onClick={() => approveDraft(draft.id)} disabled={savingId === draft.id || draft.validationErrors.length > 0}>
                        <CheckCircle2 size={16} /> Duyệt
                      </PrimaryButton>
                      <DangerButton onClick={() => approveDraft(draft.id, true)} disabled={savingId === draft.id}>
                        <XCircle size={16} /> Từ chối
                      </DangerButton>
                      <PrimaryButton onClick={() => pushDraft(draft.id)} disabled={savingId === draft.id || draft.status !== "human_approved"}>
                        <Rocket size={16} /> Đăng paused
                      </PrimaryButton>
                    </div>
                  </div>

                  {draft.validationErrors.length > 0 && (
                    <div className="mt-4 rounded-2xl p-4 text-sm" style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.24)", color: "#fecaca" }}>
                      {draft.validationErrors.join(" • ")}
                    </div>
                  )}

                  {editing ? (
                    <div className="mt-5 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <TextInput label="Tên campaign" value={output.campaignName} onChange={(value) => setDraftOutput(draft.id, { ...output, campaignName: value })} />
                        <TextInput label="Tên ad group" value={output.adGroupName} onChange={(value) => setDraftOutput(draft.id, { ...output, adGroupName: value })} />
                      </div>
                      <TextareaInput label="Headlines - mỗi dòng một headline, tối đa 30 ký tự" rows={8} value={listToText(output.headlines)} onChange={(value) => setDraftOutput(draft.id, { ...output, headlines: textToList(value).slice(0, 15) })} />
                      <TextareaInput label="Descriptions - mỗi dòng một mô tả, tối đa 90 ký tự" rows={5} value={listToText(output.descriptions)} onChange={(value) => setDraftOutput(draft.id, { ...output, descriptions: textToList(value).slice(0, 4) })} />
                      <div className="grid gap-4 lg:grid-cols-2">
                        <TextareaInput label="Keywords - mỗi dòng một từ khóa" rows={9} value={keywordsToText(output.keywords)} onChange={(value) => setDraftOutput(draft.id, { ...output, keywords: parseKeywords(value, false).slice(0, 50) })} />
                        <TextareaInput label="Negative keywords - mỗi dòng một từ khóa phủ định" rows={9} value={keywordsToText(output.negativeKeywords)} onChange={(value) => setDraftOutput(draft.id, { ...output, negativeKeywords: parseKeywords(value, true).slice(0, 15) })} />
                      </div>
                      <TextareaInput label="Callouts - mỗi dòng một callout" rows={5} value={listToText(output.callouts)} onChange={(value) => setDraftOutput(draft.id, { ...output, callouts: textToList(value).slice(0, 10) })} />
                      <TextareaInput label="Lý do chiến lược" rows={4} value={output.strategyReason} onChange={(value) => setDraftOutput(draft.id, { ...output, strategyReason: value })} />
                      <div className="flex flex-wrap gap-2">
                        <PrimaryButton onClick={() => saveDraftEdit(draft)} disabled={savingId === draft.id}><Save size={16} /> Lưu bản nháp</PrimaryButton>
                        <GhostButton onClick={() => setEditingDraftId(null)}><X size={16} /> Hủy chỉnh sửa</GhostButton>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 xl:grid-cols-3">
                      <MiniList title="Headlines" items={draft.output.headlines} checker={(item) => `${item.length}/30`} />
                      <MiniList title="Descriptions" items={draft.output.descriptions} checker={(item) => `${item.length}/90`} />
                      <MiniList title="Keywords" items={draft.output.keywords.slice(0, 18).map((keyword) => `${keyword.keyword} (${keyword.matchType})`)} />
                    </div>
                  )}
                </Panel>
              );
            })}
          </div>
        </SectionShell>
      )}

      {tab === "connect" && (
        <SectionShell title="Kết nối Google Ads" subtitle="Lưu customer ID và OAuth để giai đoạn sau có thể đọc báo cáo, tạo campaign ở trạng thái tạm dừng.">
          <Panel>
            <div className="grid gap-4 lg:grid-cols-3">
              <InfoCard title="Trạng thái OAuth" value={connectInfo.envReady ? "Đã sẵn sàng" : "Chưa đủ ENV"} icon={Settings} />
              <InfoCard title="Tài khoản đã lưu" value={`${connectInfo.accounts?.length ?? 0} tài khoản`} icon={Link2} />
              <InfoCard title="Quy tắc an toàn" value="Không tự tăng ngân sách" icon={CircleDollarSign} />
            </div>
            <div className="mt-5 text-sm leading-6" style={{ color: muted }}>
              Token Google Ads không được hard-code. Hệ thống chỉ đăng khi bạn bấm duyệt và chiến dịch được tạo ở trạng thái tạm dừng.
            </div>
            {connectInfo.authUrl && (
              <PrimaryButton className="mt-5" onClick={() => window.open(connectInfo.authUrl, "_blank")}>
                <Link2 size={16} /> Mở màn hình kết nối Google
              </PrimaryButton>
            )}
          </Panel>
        </SectionShell>
      )}

      {tab === "report" && (
        <SectionShell title="Báo cáo hiệu quả theo ngày" subtitle="Theo dõi chi phí, click, chuyển đổi, CPA và ROAS để AI đề xuất tối ưu.">
          <Panel>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[840px] text-left text-sm">
                <thead style={{ color: muted }}>
                  <tr>
                    <th className="pb-3">Ngày</th>
                    <th className="pb-3">Campaign</th>
                    <th className="pb-3">Ad group</th>
                    <th className="pb-3">Click</th>
                    <th className="pb-3">Chi phí</th>
                    <th className="pb-3">Chuyển đổi</th>
                    <th className="pb-3">CPA</th>
                    <th className="pb-3">ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((row) => (
                    <tr key={row.id} style={{ borderTop: `1px solid ${border}` }}>
                      <td className="py-3">{row.date}</td>
                      <td className="py-3 font-semibold">{row.campaignName}</td>
                      <td className="py-3" style={{ color: muted }}>{row.adGroupName}</td>
                      <td className="py-3">{row.clicks}</td>
                      <td className="py-3">{formatMoney(row.cost)}</td>
                      <td className="py-3">{row.conversions}</td>
                      <td className="py-3">{formatMoney(row.cpa)}</td>
                      <td className="py-3">{row.roas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </SectionShell>
      )}

      {tab === "optimize" && (
        <SectionShell title="AI đề xuất tối ưu" subtitle="Gợi ý những việc nên làm tiếp theo, nhưng không tự thay đổi ngân sách hoặc đăng quảng cáo.">
          <div className="grid gap-4 md:grid-cols-2">
            {optimizations.map((item, index) => (
              <Panel key={`${item.title}-${index}`}>
                <StatusPill tone={item.severity === "high" ? "red" : item.severity === "medium" ? "amber" : "green"}>{severityLabel(item.severity)}</StatusPill>
                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6" style={{ color: muted }}>{item.action}</p>
              </Panel>
            ))}
            {optimizations.length === 0 && <EmptyState title="Chưa có đề xuất tối ưu" description="Khi có dữ liệu hiệu quả, AI sẽ gợi ý từ khóa phủ định, mẫu quảng cáo cần viết lại và campaign có CPA cao." />}
          </div>
        </SectionShell>
      )}
    </div>
  );

  function setDraftOutput(id: string, output: AIAdDraftOutput) {
    setDraftEdits((prev) => ({ ...prev, [id]: output }));
  }
}

function SectionShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="mt-1 text-sm" style={{ color: muted }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl p-5 shadow-2xl ${className}`} style={{ background: surface, border: `1px solid ${border}` }}>
      {children}
    </div>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <FormLabel>{label}</FormLabel>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl px-4 py-3 text-sm outline-none" style={inputStyle} />
    </label>
  );
}

function TextareaInput({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label className="block">
      <FormLabel>{label}</FormLabel>
      <textarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} className="w-full resize-y rounded-2xl px-4 py-3 text-sm outline-none" style={inputStyle} />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <FormLabel>{label}</FormLabel>
      <div className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded-2xl px-4 py-3 pr-10 text-sm outline-none" style={inputStyle}>
          {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" size={16} style={{ color: muted }} />
      </div>
    </label>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <FormLabel>{label}</FormLabel>
      <input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full rounded-2xl px-4 py-3 text-sm outline-none" style={inputStyle} />
    </label>
  );
}

function FormLabel({ children }: { children: ReactNode }) {
  return <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(245,237,214,0.44)" }}>{children}</span>;
}

const inputStyle = {
  background: "rgba(0,0,0,0.24)",
  border: `1px solid ${border}`,
  color: text,
};

function PrimaryButton({ children, onClick, disabled, className = "" }: { children: ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{ background: `linear-gradient(135deg, ${gold}, ${goldDeep})`, color: "#111827", boxShadow: "0 12px 28px rgba(245,158,11,0.22)" }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, disabled, className = "" }: { children: ReactNode; onClick: () => void; disabled?: boolean; className?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{ background: surfaceStrong, border: `1px solid ${border}`, color: text }}
    >
      {children}
    </button>
  );
}

function DangerButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: "rgba(248,113,113,0.16)", border: "1px solid rgba(248,113,113,0.25)", color: "#fecaca" }}
    >
      {children}
    </button>
  );
}

function StatusPill({ children, tone }: { children: ReactNode; tone: "green" | "amber" | "red" | "gray" }) {
  const tones = {
    green: ["rgba(34,197,94,0.18)", "#86efac", "rgba(34,197,94,0.28)"],
    amber: ["rgba(245,158,11,0.16)", "#fde68a", "rgba(245,158,11,0.28)"],
    red: ["rgba(248,113,113,0.16)", "#fecaca", "rgba(248,113,113,0.28)"],
    gray: ["rgba(255,255,255,0.08)", muted, border],
  } as const;
  return (
    <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold" style={{ background: tones[tone][0], color: tones[tone][1], border: `1px solid ${tones[tone][2]}` }}>
      {children}
    </span>
  );
}

function MiniList({ title, items, checker }: { title: string; items: string[]; checker?: (item: string) => string }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.18)", border: `1px solid ${border}` }}>
      <div className="mb-3 text-sm font-bold" style={{ color: "#fde68a" }}>{title}</div>
      <div className="space-y-2 text-sm">
        {items.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-start justify-between gap-3 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", color: muted }}>
            <span>{item}</span>
            {checker && <span className="shrink-0 text-xs" style={{ color: item.length > (title === "Headlines" ? 30 : 90) ? "#fecaca" : "#86efac" }}>{checker(item)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: "rgba(245,237,214,0.38)" }}>{label}</div>
      <div className="mt-1 leading-5" style={{ color: text }}>{value}</div>
    </div>
  );
}

function InfoCard({ title, value, icon: Icon }: { title: string; value: string; icon: ElementType }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: "rgba(0,0,0,0.18)", border: `1px solid ${border}` }}>
      <Icon size={20} style={{ color: "#facc15" }} />
      <div className="mt-3 text-sm" style={{ color: muted }}>{title}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Panel>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-2 text-sm" style={{ color: muted }}>{description}</p>
    </Panel>
  );
}

function listToText(items: string[]) {
  return items.join("\n");
}

function textToList(textValue: string) {
  return textValue.split("\n").map((item) => item.trim()).filter(Boolean);
}

function keywordsToText(items: KeywordDraft[]) {
  return items.map((item) => item.keyword).join("\n");
}

function parseKeywords(textValue: string, negative: boolean): KeywordDraft[] {
  return textToList(textValue).map((keyword, index) => ({
    keyword,
    matchType: index % 2 === 0 ? "phrase" : "exact",
    intent: negative ? "low" : index < 12 ? "high" : "medium",
    negative,
  }));
}

function formatMoney(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")}đ`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    ai_created: "AI tạo nháp",
    human_approved: "Đã duyệt",
    pushed_to_google: "Đã đăng",
    rejected: "Từ chối",
  };
  return labels[status] ?? status;
}

function severityLabel(severity: string) {
  const labels: Record<string, string> = {
    high: "Ưu tiên cao",
    medium: "Cần theo dõi",
    low: "Cơ hội tăng trưởng",
  };
  return labels[severity] ?? severity;
}
