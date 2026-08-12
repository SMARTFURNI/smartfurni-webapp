"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CirclePlay,
  CircleStop,
  GitBranch,
  Grip,
  Link2,
  MousePointer2,
  Plus,
  Sparkles,
  Square,
  Trash2,
  WandSparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessBrainFlowEdge, BusinessBrainFlowStep } from "@/types/business-brain";

type FlowNodeType = NonNullable<BusinessBrainFlowStep["nodeType"]>;
type Tone = BusinessBrainFlowStep["tone"];

type Props = {
  nodes: BusinessBrainFlowStep[];
  edges: BusinessBrainFlowEdge[];
  onNodesChange: (nodes: BusinessBrainFlowStep[]) => void;
  onEdgesChange: (edges: BusinessBrainFlowEdge[]) => void;
};

const CANVAS_WIDTH = 1220;
const CANVAS_HEIGHT = 1100;
const NODE_WIDTH = 210;
const NODE_HEIGHT = 106;
const DECISION_HEIGHT = 144;
const FIELD = "w-full rounded-xl border border-[#d9e2ef] bg-white px-3 py-2.5 text-sm leading-5 text-[#17243a] outline-none transition placeholder:text-[#9aa8bc] focus:border-[#d5aa35] focus:ring-4 focus:ring-[#d6aa35]/10";

const NODE_TYPES: Array<{
  type: FlowNodeType;
  label: string;
  description: string;
  icon: typeof CirclePlay;
  tone: Tone;
}> = [
  { type: "start", label: "Bắt đầu", description: "Nguồn hoặc sự kiện kích hoạt", icon: CirclePlay, tone: "blue" },
  { type: "trigger", label: "Kích hoạt", description: "Lead mới, tin nhắn hoặc đổi trạng thái", icon: CirclePlay, tone: "blue" },
  { type: "data", label: "Dữ liệu", description: "Đọc hoặc chuẩn hóa dữ liệu đầu vào", icon: Square, tone: "blue" },
  { type: "human", label: "Nhân viên", description: "Công việc cần con người thực hiện", icon: Square, tone: "amber" },
  { type: "ai", label: "AI Agent", description: "Phân loại, soạn thảo hoặc phân tích", icon: Sparkles, tone: "violet" },
  { type: "action", label: "Công việc", description: "Đầu việc cần thực hiện", icon: Square, tone: "violet" },
  { type: "decision", label: "Điều kiện", description: "Rẽ thành nhiều nhánh", icon: GitBranch, tone: "amber" },
  { type: "delay", label: "Chờ / SLA", description: "Chờ theo thời gian hoặc hạn xử lý", icon: CircleStop, tone: "amber" },
  { type: "approval", label: "Phê duyệt", description: "Người có quyền xác nhận trước khi chạy", icon: CirclePlay, tone: "rose" },
  { type: "channel", label: "Gửi kênh", description: "Zalo OA, email hoặc thông báo", icon: Link2, tone: "blue" },
  { type: "crm", label: "Cập nhật CRM", description: "Gắn tag, tạo task hoặc đổi giai đoạn", icon: Square, tone: "emerald" },
  { type: "webhook", label: "API / Webhook", description: "Kết nối một hệ thống bên ngoài", icon: Link2, tone: "violet" },
  { type: "end", label: "Kết thúc", description: "Kết quả của quy trình", icon: CircleStop, tone: "emerald" },
];

const TONE_CLASSES: Record<Tone, { node: string; icon: string; line: string }> = {
  blue: { node: "border-blue-300 bg-gradient-to-br from-blue-50 to-white", icon: "bg-blue-600 text-white", line: "#3b82f6" },
  violet: { node: "border-violet-300 bg-gradient-to-br from-violet-50 to-white", icon: "bg-violet-600 text-white", line: "#8b5cf6" },
  emerald: { node: "border-emerald-300 bg-gradient-to-br from-emerald-50 to-white", icon: "bg-emerald-600 text-white", line: "#10b981" },
  amber: { node: "border-amber-300 bg-gradient-to-br from-amber-50 to-white", icon: "bg-amber-500 text-white", line: "#d6a21c" },
  rose: { node: "border-rose-300 bg-gradient-to-br from-rose-50 to-white", icon: "bg-rose-500 text-white", line: "#f43f5e" },
};

function nodeHeight(node: BusinessBrainFlowStep) {
  return node.nodeType === "decision" ? DECISION_HEIGHT : NODE_HEIGHT;
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultNode(type: FlowNodeType, x: number, y: number, index: number): BusinessBrainFlowStep {
  const definition = NODE_TYPES.find(item => item.type === type) || NODE_TYPES[1];
  const titles: Record<FlowNodeType, string> = {
    start: "Nguồn bắt đầu",
    trigger: "Sự kiện kích hoạt",
    data: "Đọc dữ liệu đầu vào",
    human: "Nhân viên xử lý",
    ai: "AI Agent thực hiện",
    action: `Công việc ${index + 1}`,
    decision: "Điều kiện phân nhánh?",
    delay: "Chờ theo SLA",
    approval: "Phê duyệt hành động",
    channel: "Gửi qua kênh",
    crm: "Cập nhật CRM",
    webhook: "Gọi API / Webhook",
    end: "Hoàn tất quy trình",
  };
  return {
    id: makeId("node"),
    title: titles[type],
    description: definition.description,
    owner: "",
    channel: "CRM",
    tone: definition.tone,
    nodeType: type,
    x: Math.max(20, Math.min(CANVAS_WIDTH - NODE_WIDTH - 20, x)),
    y: Math.max(20, Math.min(CANVAS_HEIGHT - nodeHeight({ nodeType: type } as BusinessBrainFlowStep) - 20, y)),
  };
}

function autoLayout(nodes: BusinessBrainFlowStep[], edges: BusinessBrainFlowEdge[]) {
  if (!nodes.length) return nodes;
  const nodeIds = new Set(nodes.map(node => node.id));
  const incoming = new Map(nodes.map(node => [node.id, 0]));
  const outgoing = new Map(nodes.map(node => [node.id, [] as string[]]));
  edges.forEach(edge => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return;
    incoming.set(edge.target, (incoming.get(edge.target) || 0) + 1);
    outgoing.get(edge.source)?.push(edge.target);
  });

  const queue = nodes.filter(node => (incoming.get(node.id) || 0) === 0).map(node => node.id);
  if (!queue.length) queue.push(nodes[0].id);
  const levels = new Map<string, number>(queue.map(id => [id, 0]));
  const indegree = new Map(incoming);
  while (queue.length) {
    const id = queue.shift()!;
    const currentLevel = levels.get(id) || 0;
    (outgoing.get(id) || []).forEach(target => {
      levels.set(target, Math.max(levels.get(target) || 0, currentLevel + 1));
      indegree.set(target, (indegree.get(target) || 1) - 1);
      if (indegree.get(target) === 0) queue.push(target);
    });
  }
  nodes.forEach((node, index) => {
    if (!levels.has(node.id)) levels.set(node.id, index + 1);
  });

  const groups = new Map<number, BusinessBrainFlowStep[]>();
  nodes.forEach(node => {
    const level = levels.get(node.id) || 0;
    groups.set(level, [...(groups.get(level) || []), node]);
  });
  return nodes.map(node => {
    const level = levels.get(node.id) || 0;
    const siblings = groups.get(level) || [node];
    const index = siblings.findIndex(item => item.id === node.id);
    const gap = Math.min(280, (CANVAS_WIDTH - 120) / Math.max(1, siblings.length));
    const rowWidth = gap * (siblings.length - 1);
    return {
      ...node,
      x: Math.round(CANVAS_WIDTH / 2 - NODE_WIDTH / 2 - rowWidth / 2 + index * gap),
      y: Math.round(45 + level * 168),
    };
  });
}

export function createCustomerCareFlowTemplate(): { nodes: BusinessBrainFlowStep[]; edges: BusinessBrainFlowEdge[] } {
  const nodes: BusinessBrainFlowStep[] = [
    { id: "ads", title: "Quảng cáo", description: "Facebook · Google · TikTok", owner: "Marketing", channel: "Ads", tone: "blue", nodeType: "start", x: 505, y: 35 },
    { id: "pool", title: "Data Pool", description: "Tên · SĐT · Email · Nguồn quảng cáo", owner: "CRM", channel: "Data Pool", tone: "violet", nodeType: "action", x: 505, y: 195 },
    { id: "verify", title: "Nhân viên gọi xác nhận", description: "Xác minh nhu cầu và thời điểm mua", owner: "Sale", channel: "Hotline", tone: "amber", nodeType: "action", x: 505, y: 355 },
    { id: "product", title: "Khách quan tâm sản phẩm nào?", description: "Chọn đúng nhánh tư vấn", owner: "Sale", channel: "CRM Tag", tone: "amber", nodeType: "decision", x: 505, y: 505 },
    { id: "sofa", title: "Sofa giường", description: "Tư vấn mẫu, kích thước và công năng", owner: "Sale bán lẻ", channel: "Zalo OA", tone: "blue", nodeType: "action", x: 250, y: 690 },
    { id: "ergo", title: "Giường công thái học", description: "Tư vấn giải pháp và thông số", owner: "Sale dự án", channel: "Zalo OA", tone: "emerald", nodeType: "action", x: 760, y: 690 },
  ];
  const edges: BusinessBrainFlowEdge[] = [
    { id: "edge-ads-pool", source: "ads", target: "pool" },
    { id: "edge-pool-verify", source: "pool", target: "verify" },
    { id: "edge-verify-product", source: "verify", target: "product" },
    { id: "edge-product-sofa", source: "product", target: "sofa", label: "Sofa giường" },
    { id: "edge-product-ergo", source: "product", target: "ergo", label: "Giường công thái học" },
  ];
  return { nodes, edges };
}

export function BusinessFlowBuilder({ nodes, edges, onNodesChange, onEdgesChange }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?.id || "");
  const [selectedEdgeId, setSelectedEdgeId] = useState("");
  const [connectFrom, setConnectFrom] = useState("");
  const dragState = useRef<{ id: string; pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);

  const selectedNode = nodes.find(node => node.id === selectedNodeId) || null;
  const selectedEdge = edges.find(edge => edge.id === selectedEdgeId) || null;
  const nodeMap = useMemo(() => new Map(nodes.map(node => [node.id, node])), [nodes]);

  useEffect(() => {
    if (selectedNodeId && !nodes.some(node => node.id === selectedNodeId)) setSelectedNodeId(nodes[0]?.id || "");
    if (selectedEdgeId && !edges.some(edge => edge.id === selectedEdgeId)) setSelectedEdgeId("");
    if (!selectedNodeId && !selectedEdgeId && nodes.length) setSelectedNodeId(nodes[0].id);
  }, [edges, nodes, selectedEdgeId, selectedNodeId]);

  const addNode = (type: FlowNodeType, x = CANVAS_WIDTH / 2 - NODE_WIDTH / 2, y = 90 + nodes.length * 30) => {
    const node = defaultNode(type, x, y, nodes.length);
    onNodesChange([...nodes, node]);
    setSelectedNodeId(node.id);
    setSelectedEdgeId("");
  };

  const updateNode = (id: string, patch: Partial<BusinessBrainFlowStep>) => {
    onNodesChange(nodes.map(node => node.id === id ? { ...node, ...patch } : node));
  };

  const removeNode = (id: string) => {
    onNodesChange(nodes.filter(node => node.id !== id));
    onEdgesChange(edges.filter(edge => edge.source !== id && edge.target !== id));
    setSelectedNodeId("");
    setConnectFrom(current => current === id ? "" : current);
  };

  const connectTo = (target: string) => {
    if (!connectFrom || connectFrom === target) return;
    if (!edges.some(edge => edge.source === connectFrom && edge.target === target)) {
      const edge: BusinessBrainFlowEdge = { id: makeId("edge"), source: connectFrom, target, label: "" };
      onEdgesChange([...edges, edge]);
      setSelectedEdgeId(edge.id);
    }
    setConnectFrom("");
  };

  const handleNodePointerDown = (event: React.PointerEvent<HTMLDivElement>, node: BusinessBrainFlowStep) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, input, textarea, select")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      id: node.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: node.x || 0,
      originY: node.y || 0,
    };
    setSelectedNodeId(node.id);
    setSelectedEdgeId("");
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const node = nodeMap.get(drag.id);
    if (!node) return;
    const x = Math.max(10, Math.min(CANVAS_WIDTH - NODE_WIDTH - 10, drag.originX + event.clientX - drag.startX));
    const y = Math.max(10, Math.min(CANVAS_HEIGHT - nodeHeight(node) - 10, drag.originY + event.clientY - drag.startY));
    updateNode(drag.id, { x: Math.round(x), y: Math.round(y) });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragState.current?.pointerId === event.pointerId) dragState.current = null;
  };

  const useTemplate = () => {
    if (nodes.length && !window.confirm("Thay sơ đồ hiện tại bằng mẫu chăm sóc khách hàng?")) return;
    const template = createCustomerCareFlowTemplate();
    onNodesChange(template.nodes);
    onEdgesChange(template.edges);
    setSelectedNodeId("ads");
    setSelectedEdgeId("");
    setConnectFrom("");
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-[#dce4ee] bg-white">
      <div className="flex flex-col gap-3 border-b border-[#e4eaf1] bg-[#fbfcfe] p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {NODE_TYPES.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.type}
                draggable
                onDragStart={event => event.dataTransfer.setData("application/x-smartfurni-flow", item.type)}
                onClick={() => addNode(item.type)}
                className="group flex items-center gap-2 rounded-xl border border-[#dce4ee] bg-white px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#d6b452]"
              >
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", TONE_CLASSES[item.tone].icon)}><Icon size={16} /></span>
                <span><b className="block text-xs text-[#263750]">{item.label}</b><span className="hidden text-[10px] text-[#8794a6] sm:block">Kéo vào khung</span></span>
                <Grip className="text-[#b3becc] group-hover:text-[#a97b16]" size={14} />
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={useTemplate} className="inline-flex items-center gap-2 rounded-xl border border-[#e5c765] bg-[#fff9e7] px-3 py-2 text-xs font-bold text-[#86620d] hover:bg-[#fff3c7]"><Sparkles size={14} /> Mẫu CSKH</button>
          <button disabled={!nodes.length} onClick={() => onNodesChange(autoLayout(nodes, edges))} className="inline-flex items-center gap-2 rounded-xl border border-[#dce4ee] bg-white px-3 py-2 text-xs font-bold text-[#53647b] hover:bg-[#f4f7fb] disabled:opacity-40"><WandSparkles size={14} /> Căn chỉnh tự động</button>
        </div>
      </div>

      {connectFrom && (
        <div className="flex items-center justify-between border-b border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-700">
          <span className="flex items-center gap-2"><Link2 size={15} /><b>Đang nối từ “{nodeMap.get(connectFrom)?.title}”.</b> Chọn khối đích.</span>
          <button onClick={() => setConnectFrom("")} className="rounded-lg p-1 hover:bg-blue-100"><X size={16} /></button>
        </div>
      )}

      <div className="grid xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="overflow-auto bg-[#f7f9fc]">
          <div
            className="relative touch-none overflow-hidden bg-[radial-gradient(circle,#cbd5e1_1px,transparent_1px)] [background-size:22px_22px]"
            style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onDragOver={event => event.preventDefault()}
            onDrop={event => {
              event.preventDefault();
              const type = event.dataTransfer.getData("application/x-smartfurni-flow") as FlowNodeType;
              if (!NODE_TYPES.some(item => item.type === type)) return;
              const rect = event.currentTarget.getBoundingClientRect();
              addNode(type, event.clientX - rect.left - NODE_WIDTH / 2, event.clientY - rect.top - NODE_HEIGHT / 2);
            }}
          >
            <svg className="absolute inset-0 h-full w-full overflow-visible" aria-label="Các đường nối quy trình">
              <defs>
                <marker id="flow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#718096" />
                </marker>
              </defs>
              {edges.map(edge => {
                const source = nodeMap.get(edge.source);
                const target = nodeMap.get(edge.target);
                if (!source || !target) return null;
                const x1 = (source.x || 0) + NODE_WIDTH / 2;
                const y1 = (source.y || 0) + nodeHeight(source);
                const x2 = (target.x || 0) + NODE_WIDTH / 2;
                const y2 = target.y || 0;
                const curve = Math.max(45, Math.abs(y2 - y1) / 2);
                const path = `M ${x1} ${y1} C ${x1} ${y1 + curve}, ${x2} ${y2 - curve}, ${x2} ${y2}`;
                const selected = selectedEdgeId === edge.id;
                return (
                  <g key={edge.id}>
                    <path d={path} fill="none" stroke="transparent" strokeWidth="18" className="cursor-pointer" onClick={() => { setSelectedEdgeId(edge.id); setSelectedNodeId(""); }} />
                    <path d={path} fill="none" stroke={selected ? "#d6a21c" : "#718096"} strokeWidth={selected ? 3 : 2} markerEnd="url(#flow-arrow)" pointerEvents="none" />
                    {edge.label && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} textAnchor="middle" className="fill-[#40516a] text-[12px] font-bold" stroke="white" strokeWidth="5" paintOrder="stroke">{edge.label}</text>}
                  </g>
                );
              })}
            </svg>

            {nodes.map((node, index) => {
              const type = node.nodeType || "action";
              const typeDefinition = NODE_TYPES.find(item => item.type === type) || NODE_TYPES[1];
              const Icon = typeDefinition.icon;
              const isSelected = selectedNodeId === node.id;
              const isConnectSource = connectFrom === node.id;
              return (
                <div
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Khối ${node.title}`}
                  className={cn(
                    "absolute cursor-grab select-none border bg-white shadow-[0_10px_30px_rgba(31,52,82,0.12)] transition-shadow active:cursor-grabbing",
                    type === "decision" ? "border-0 bg-transparent shadow-none" : type === "start" || type === "end" ? "rounded-[32px]" : "rounded-2xl",
                    type !== "decision" && TONE_CLASSES[node.tone].node,
                    isSelected && "ring-4 ring-[#e2b73d]/25",
                    isConnectSource && "ring-4 ring-blue-400/30",
                  )}
                  style={{ left: node.x || 0, top: node.y || 0, width: NODE_WIDTH, height: nodeHeight(node) }}
                  onPointerDown={event => handleNodePointerDown(event, node)}
                  onClick={() => {
                    if (connectFrom) connectTo(node.id);
                    else { setSelectedNodeId(node.id); setSelectedEdgeId(""); }
                  }}
                >
                  {type === "decision" && <span className={cn("absolute inset-0 border [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)] shadow-[0_10px_30px_rgba(31,52,82,0.12)]", TONE_CLASSES[node.tone].node)} />}
                  <div className={cn("relative z-10 flex h-full items-center gap-3 px-4", type === "decision" && "px-7 text-center")}>
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm", TONE_CLASSES[node.tone].icon, type === "decision" && "hidden")}><Icon size={17} /></span>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8996a8]">{typeDefinition.label}</span>
                      <h4 className="line-clamp-2 text-[14px] font-bold leading-5 text-[#1d2c44]">{node.title}</h4>
                      {type !== "decision" && <p className="mt-0.5 line-clamp-1 text-[11px] text-[#718097]">{node.owner || node.channel || "Chưa phân công"}</p>}
                    </div>
                    <span className="absolute right-2 top-2 rounded-full bg-white/80 px-1.5 text-[9px] font-bold text-[#8190a4]">{index + 1}</span>
                  </div>
                  <button
                    type="button"
                    title="Nối khối này"
                    onClick={event => { event.stopPropagation(); setConnectFrom(node.id); setSelectedNodeId(node.id); setSelectedEdgeId(""); }}
                    className={cn("absolute bottom-[-12px] left-1/2 z-20 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white bg-[#31445f] text-white shadow-lg hover:bg-blue-600", isConnectSource && "bg-blue-600")}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              );
            })}

            {!nodes.length && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-[#c6d1df] bg-white text-[#8e9caf]"><MousePointer2 size={28} /></div>
                <h3 className="mt-4 text-base font-bold text-[#34455f]">Kéo một khối vào vùng làm việc</h3>
                <p className="mt-1 max-w-sm text-sm leading-6 text-[#7b899c]">Hoặc chọn “Mẫu CSKH” để tạo sẵn luồng giống biểu đồ mẫu.</p>
              </div>
            )}
          </div>
        </div>

        <aside className="border-t border-[#e2e8f0] bg-white p-4 xl:border-l xl:border-t-0">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a77913]">Thuộc tính khối</p><h3 className="mt-1 text-base font-bold text-[#1d2c44]">{selectedNode.title}</h3></div>
                <button onClick={() => removeNode(selectedNode.id)} className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-500 hover:bg-red-100" title="Xóa khối"><Trash2 size={15} /></button>
              </div>
              <label className="block text-xs font-bold text-[#596a81]">Loại khối<select className={cn(FIELD, "mt-1.5")} value={selectedNode.nodeType || "action"} onChange={event => updateNode(selectedNode.id, { nodeType: event.target.value as FlowNodeType })}>{NODE_TYPES.map(item => <option key={item.type} value={item.type}>{item.label}</option>)}</select></label>
              <label className="block text-xs font-bold text-[#596a81]">Tên khối<input className={cn(FIELD, "mt-1.5 font-semibold")} value={selectedNode.title} onChange={event => updateNode(selectedNode.id, { title: event.target.value })} /></label>
              <label className="block text-xs font-bold text-[#596a81]">Mô tả<textarea className={cn(FIELD, "mt-1.5 min-h-20 resize-y")} value={selectedNode.description} onChange={event => updateNode(selectedNode.id, { description: event.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3"><label className="block text-xs font-bold text-[#596a81]">Phụ trách<input className={cn(FIELD, "mt-1.5")} value={selectedNode.owner} onChange={event => updateNode(selectedNode.id, { owner: event.target.value })} /></label><label className="block text-xs font-bold text-[#596a81]">Kênh<input className={cn(FIELD, "mt-1.5")} value={selectedNode.channel} onChange={event => updateNode(selectedNode.id, { channel: event.target.value })} /></label></div>
              <label className="block text-xs font-bold text-[#596a81]">Màu nhận diện<select className={cn(FIELD, "mt-1.5")} value={selectedNode.tone} onChange={event => updateNode(selectedNode.id, { tone: event.target.value as Tone })}><option value="blue">Xanh dương</option><option value="violet">Tím</option><option value="amber">Vàng</option><option value="emerald">Xanh lá</option><option value="rose">Đỏ hồng</option></select></label>
              <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                <p className="text-xs font-bold text-[#596a81]">Cấu hình thực thi</p>
                <label className="mt-2 block text-[11px] font-semibold text-[#718097]">Hành động / công cụ<input className={cn(FIELD, "mt-1")} value={selectedNode.config?.action || ""} onChange={event => updateNode(selectedNode.id, { config: { ...selectedNode.config, action: event.target.value } })} placeholder="Ví dụ: create_task, send_zalo" /></label>
                <div className="mt-2 grid grid-cols-2 gap-2"><label className="block text-[11px] font-semibold text-[#718097]">Timeout (phút)<input type="number" min="0" className={cn(FIELD, "mt-1")} value={selectedNode.config?.timeoutMinutes || 0} onChange={event => updateNode(selectedNode.id, { config: { ...selectedNode.config, timeoutMinutes: Number(event.target.value) } })} /></label><label className="block text-[11px] font-semibold text-[#718097]">Thử lại<input type="number" min="0" className={cn(FIELD, "mt-1")} value={selectedNode.config?.retryCount || 0} onChange={event => updateNode(selectedNode.id, { config: { ...selectedNode.config, retryCount: Number(event.target.value) } })} /></label></div>
                <label className="mt-2 block text-[11px] font-semibold text-[#718097]">Khi có lỗi<input className={cn(FIELD, "mt-1")} value={selectedNode.config?.errorHandling || ""} onChange={event => updateNode(selectedNode.id, { config: { ...selectedNode.config, errorHandling: event.target.value } })} placeholder="Tạo task cho quản lý" /></label>
              </div>
              <button onClick={() => setConnectFrom(selectedNode.id)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f3cf68] to-[#d7a51e] px-4 py-2.5 text-sm font-bold text-[#2e250c]"><Link2 size={15} /> Nối sang khối khác</button>
              <div className="border-t border-[#edf0f4] pt-4">
                <p className="text-xs font-bold text-[#596a81]">Nhánh đi ra ({edges.filter(edge => edge.source === selectedNode.id).length})</p>
                <div className="mt-2 space-y-2">{edges.filter(edge => edge.source === selectedNode.id).map(edge => <button key={edge.id} onClick={() => { setSelectedEdgeId(edge.id); setSelectedNodeId(""); }} className="flex w-full items-center justify-between rounded-xl border border-[#e1e7ef] bg-[#f9fbfd] px-3 py-2 text-left text-xs font-semibold text-[#506177]"><span className="truncate">{edge.label || "Không nhãn"}</span><span className="truncate text-[#9a7215]">→ {nodeMap.get(edge.target)?.title}</span></button>)}</div>
              </div>
            </div>
          ) : selectedEdge ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a77913]">Đường nối</p><h3 className="mt-1 text-base font-bold text-[#1d2c44]">{nodeMap.get(selectedEdge.source)?.title} → {nodeMap.get(selectedEdge.target)?.title}</h3></div><button onClick={() => { onEdgesChange(edges.filter(edge => edge.id !== selectedEdge.id)); setSelectedEdgeId(""); }} className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-500"><Trash2 size={15} /></button></div>
              <label className="block text-xs font-bold text-[#596a81]">Nhãn nhánh<input className={cn(FIELD, "mt-1.5")} value={selectedEdge.label || ""} onChange={event => onEdgesChange(edges.map(edge => edge.id === selectedEdge.id ? { ...edge, label: event.target.value } : edge))} placeholder="Ví dụ: Sofa giường, Có, Không..." /></label>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-700"><b>Nhãn nhánh</b> giúp nhân viên hiểu điều kiện nào dẫn tới bước tiếp theo.</div>
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center text-center"><MousePointer2 className="text-[#aab6c6]" size={30} /><h3 className="mt-3 text-sm font-bold text-[#40516a]">Chọn một khối hoặc đường nối</h3><p className="mt-1 text-xs leading-5 text-[#8492a5]">Thuộc tính chỉnh sửa sẽ hiện tại đây.</p></div>
          )}
        </aside>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#e5eaf1] bg-[#fbfcfe] px-4 py-3 text-xs text-[#75849a]">
        <span><b>{nodes.length}</b> khối · <b>{edges.length}</b> đường nối</span>
        <span>Kéo khối để di chuyển · Bấm dấu <b>+</b> để tạo nhánh · Bấm đường nối để đặt nhãn</span>
      </div>
    </div>
  );
}
