'use client';

import { useState, useRef, useEffect } from 'react';
import { Trash2, Plus, Copy } from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action_send_email' | 'delay' | 'condition' | 'action';
  label: string;
  config: any;
  x: number;
  y: number;
}

interface WorkflowConnection {
  from: string;
  to: string;
  label?: string;
}

export default function WorkflowBuilder() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: 'trigger-1',
      type: 'trigger',
      label: 'Kích Hoạt: Lead Mới',
      config: { triggerType: 'new_lead' },
      x: 100,
      y: 100,
    },
  ]);
  const [connections, setConnections] = useState<WorkflowConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Vẽ canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#080600';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#2D2500';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Draw connections
    ctx.strokeStyle = '#C9A84C';
    ctx.lineWidth = 2;
    connections.forEach((conn) => {
      const fromNode = nodes.find((n) => n.id === conn.from);
      const toNode = nodes.find((n) => n.id === conn.to);
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.x + 100, fromNode.y + 50);
        ctx.lineTo(toNode.x, toNode.y + 50);
        ctx.stroke();

        // Draw arrow
        const angle = Math.atan2(toNode.y + 50 - (fromNode.y + 50), toNode.x - (fromNode.x + 100));
        ctx.fillStyle = '#C9A84C';
        ctx.beginPath();
        ctx.moveTo(toNode.x, toNode.y + 50);
        ctx.lineTo(toNode.x - 10 * Math.cos(angle - Math.PI / 6), toNode.y + 50 - 10 * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toNode.x - 10 * Math.cos(angle + Math.PI / 6), toNode.y + 50 - 10 * Math.sin(angle + Math.PI / 6));
        ctx.fill();
      }
    });
  }, [nodes, connections]);

  const getNodeColor = (type: string) => {
    const colors: Record<string, string> = {
      trigger: '#22C55E',
      action_send_email: '#3B82F6',
      delay: '#F59E0B',
      condition: '#8B5CF6',
      action: '#EC4899',
    };
    return colors[type] || '#6B7280';
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on a node
    for (const node of nodes) {
      if (x >= node.x && x <= node.x + 200 && y >= node.y && y <= node.y + 100) {
        setSelectedNode(node.id);
        setDraggingNode(node.id);
        setDragOffset({ x: x - node.x, y: y - node.y });
        return;
      }
    }

    // Right-click for context menu
    if (e.button === 2) {
      setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggingNode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

    setNodes(nodes.map((n) => (n.id === draggingNode ? { ...n, x, y } : n)));
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
  };

  const addNode = (type: string) => {
    const newNode: WorkflowNode = {
      id: `${type}-${Date.now()}`,
      type: type as any,
      label: getNodeLabel(type),
      config: {},
      x: Math.random() * 400 + 100,
      y: Math.random() * 300 + 100,
    };
    setNodes([...nodes, newNode]);
    setShowNodeMenu(false);
  };

  const getNodeLabel = (type: string) => {
    const labels: Record<string, string> = {
      trigger: 'Kích Hoạt',
      action_send_email: 'Gửi Email',
      delay: 'Chờ',
      condition: 'Điều Kiện',
      action: 'Hành Động',
    };
    return labels[type] || type;
  };

  const deleteNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
    setConnections(connections.filter((c) => c.from !== id && c.to !== id));
    setSelectedNode(null);
  };

  const duplicateNode = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const newNode = { ...node, id: `${node.type}-${Date.now()}`, x: node.x + 50, y: node.y + 50 };
    setNodes([...nodes, newNode]);
  };

  return (
    <div className="w-full h-screen bg-[#080600] flex flex-col">
      {/* Toolbar */}
      <div className="bg-[#1A1500] border-b border-[#2D2500] p-4 flex gap-2">
        <button
          onClick={() => setShowNodeMenu(!showNodeMenu)}
          className="bg-[#C9A84C] hover:bg-[#D4B85F] text-white px-4 py-2 rounded font-semibold flex items-center gap-2 transition"
        >
          <Plus size={20} /> Thêm Bước
        </button>

        {showNodeMenu && (
          <div className="absolute top-16 left-4 bg-[#1A1500] border border-[#2D2500] rounded shadow-lg z-10">
            <button
              onClick={() => addNode('trigger')}
              className="block w-full text-left px-4 py-2 hover:bg-[#2D2500] text-white"
            >
              🎯 Kích Hoạt
            </button>
            <button
              onClick={() => addNode('action_send_email')}
              className="block w-full text-left px-4 py-2 hover:bg-[#2D2500] text-white"
            >
              📧 Gửi Email
            </button>
            <button
              onClick={() => addNode('delay')}
              className="block w-full text-left px-4 py-2 hover:bg-[#2D2500] text-white"
            >
              ⏱️ Chờ
            </button>
            <button
              onClick={() => addNode('condition')}
              className="block w-full text-left px-4 py-2 hover:bg-[#2D2500] text-white"
            >
              ❓ Điều Kiện
            </button>
          </div>
        )}

        <div className="ml-auto text-gray-400 text-sm">
          {nodes.length} bước • {connections.length} kết nối
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          width={1400}
          height={700}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          className="absolute inset-0 cursor-move"
        />

        {/* Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            onClick={() => setSelectedNode(node.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              setSelectedNode(node.id);
              setContextMenu({ x: e.clientX - (containerRef.current?.getBoundingClientRect().left || 0), y: e.clientY - (containerRef.current?.getBoundingClientRect().top || 0) });
            }}
            style={{
              position: 'absolute',
              left: `${node.x}px`,
              top: `${node.y}px`,
              width: '200px',
              zIndex: selectedNode === node.id ? 10 : 1,
            }}
            className={`bg-[#1A1500] border-2 rounded-lg p-4 cursor-pointer transition ${
              selectedNode === node.id ? 'border-[#C9A84C] shadow-lg shadow-[#C9A84C]' : 'border-[#2D2500]'
            }`}
          >
            <div className={`text-xs font-bold px-2 py-1 rounded mb-2 text-white w-fit`} style={{ backgroundColor: getNodeColor(node.type) }}>
              {node.type}
            </div>
            <p className="text-white font-semibold text-sm">{node.label}</p>
            <p className="text-gray-400 text-xs mt-2">ID: {node.id.slice(0, 8)}</p>
          </div>
        ))}

        {/* Context Menu */}
        {contextMenu && selectedNode && (
          <div
            style={{
              position: 'absolute',
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
              zIndex: 20,
            }}
            className="bg-[#1A1500] border border-[#2D2500] rounded shadow-lg"
          >
            <button
              onClick={() => {
                duplicateNode(selectedNode);
                setContextMenu(null);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-[#2D2500] text-white flex items-center gap-2"
            >
              <Copy size={16} /> Sao Chép
            </button>
            <button
              onClick={() => {
                deleteNode(selectedNode);
                setContextMenu(null);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-[#2D2500] text-red-400 flex items-center gap-2"
            >
              <Trash2 size={16} /> Xóa
            </button>
          </div>
        )}
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <div className="bg-[#1A1500] border-t border-[#2D2500] p-4 max-h-48 overflow-y-auto">
          <h3 className="text-[#C9A84C] font-bold mb-2">Thuộc Tính Bước</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>ID: {selectedNode}</p>
            <p>Loại: {nodes.find((n) => n.id === selectedNode)?.type}</p>
            <button
              onClick={() => deleteNode(selectedNode)}
              className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold transition"
            >
              Xóa Bước
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
