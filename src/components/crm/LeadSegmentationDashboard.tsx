'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Users, Plus, Search, Filter, Edit3, Trash2, Eye,
  Tag, ChevronRight, X, Check, Loader2, BarChart3,
  TrendingUp, UserCheck, AlertCircle, RefreshCw,
  ArrowLeft, Building2, Phone, MapPin, Star,
  ChevronDown, Hash,
} from 'lucide-react';
import type { Lead, LeadType, LeadStage } from '@/lib/crm-types';
import { STAGE_LABELS, STAGE_COLORS, TYPE_LABELS, TYPE_COLORS } from '@/lib/crm-types';

// ─── Dark Luxury Theme ────────────────────────────────────────────────────────
const DL = {
  bg: 'linear-gradient(160deg, #0f172a 0%, #1e1a0e 40%, #1a1200 100%)',
  surface: 'rgba(255,255,255,0.05)',
  surfaceHover: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.10)',
  borderGold: 'rgba(245,158,11,0.35)',
  text: '#f5edd6',
  textMuted: '#9ca3af',
  textDim: 'rgba(245,237,214,0.5)',
  gold: '#f59e0b',
  goldDark: '#d97706',
  header: 'rgba(15,23,42,0.95)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.10)',
  inputBg: 'rgba(255,255,255,0.07)',
  inputBorder: 'rgba(255,255,255,0.15)',
  modalBg: 'rgba(20,16,0,0.97)',
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface SegmentCriteria {
  requiredTags?: string[];
  excludeTags?: string[];
  minScore?: number;
  maxScore?: number;
  source?: string[];
  type?: LeadType[];
  stage?: LeadStage[];
}

interface LeadSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  tags: string[];
  leadCount: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

const SEGMENT_COLORS = [
  '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6',
  '#f97316', '#06b6d4', '#ec4899', '#84cc16',
];

const DEFAULT_SEGMENTS: LeadSegment[] = [
  {
    id: 'segment-investor',
    name: 'Chủ Đầu Tư',
    description: 'Khách hàng là chủ đầu tư dự án',
    criteria: { type: ['investor'] },
    tags: ['Chủ đầu tư', 'B2B', 'High Value'],
    leadCount: 0,
    color: '#f59e0b',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'segment-architect',
    name: 'Kiến Trúc Sư',
    description: 'Khách hàng là kiến trúc sư, thiết kế',
    criteria: { type: ['architect'] },
    tags: ['Kiến trúc sư', 'B2B', 'Professional'],
    leadCount: 0,
    color: '#3b82f6',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'segment-dealer',
    name: 'Đại Lý',
    description: 'Khách hàng là đại lý, nhà phân phối',
    criteria: { type: ['dealer'] },
    tags: ['Đại lý', 'B2B', 'Reseller'],
    leadCount: 0,
    color: '#22c55e',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function matchesSegment(lead: Lead, criteria: SegmentCriteria): boolean {
  if (criteria.type && criteria.type.length > 0) {
    if (!criteria.type.includes(lead.type)) return false;
  }
  if (criteria.stage && criteria.stage.length > 0) {
    if (!criteria.stage.includes(lead.stage)) return false;
  }
  if (criteria.requiredTags && criteria.requiredTags.length > 0) {
    const hasTag = criteria.requiredTags.some(t => (lead.tags || []).includes(t));
    if (!hasTag) return false;
  }
  if (criteria.excludeTags && criteria.excludeTags.length > 0) {
    const hasExcluded = criteria.excludeTags.some(t => (lead.tags || []).includes(t));
    if (hasExcluded) return false;
  }
  if (criteria.source && criteria.source.length > 0) {
    if (!criteria.source.includes(lead.source)) return false;
  }
  return true;
}

// ─── Empty Form ───────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  description: '',
  color: SEGMENT_COLORS[0],
  tags: '',
  requiredTags: '',
  excludeTags: '',
  type: [] as LeadType[],
  stage: [] as LeadStage[],
  source: '',
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function LeadSegmentationDashboard() {
  const [segments, setSegments] = useState<LeadSegment[]>([]);
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingSegment, setEditingSegment] = useState<LeadSegment | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // View leads modal
  const [viewSegment, setViewSegment] = useState<LeadSegment | null>(null);
  const [viewLeads, setViewLeads] = useState<Lead[]>([]);
  const [viewSearch, setViewSearch] = useState('');

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [leadsRes] = await Promise.all([
        fetch('/api/crm/leads?limit=2000'),
      ]);
      const leadsData = await leadsRes.json();
      const leads: Lead[] = Array.isArray(leadsData) ? leadsData : [];
      setAllLeads(leads);

      // Compute leadCount for each segment
      const segs = DEFAULT_SEGMENTS.map(seg => ({
        ...seg,
        leadCount: leads.filter(l => matchesSegment(l, seg.criteria)).length,
      }));
      setSegments(segs);
    } catch (e) {
      console.error('Lỗi tải dữ liệu:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Open form for create
  const openCreate = () => {
    setEditingSegment(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  // Open form for edit
  const openEdit = (seg: LeadSegment) => {
    setEditingSegment(seg);
    setForm({
      name: seg.name,
      description: seg.description,
      color: seg.color ?? SEGMENT_COLORS[0],
      tags: seg.tags.join(', '),
      requiredTags: (seg.criteria.requiredTags ?? []).join(', '),
      excludeTags: (seg.criteria.excludeTags ?? []).join(', '),
      type: seg.criteria.type ?? [],
      stage: seg.criteria.stage ?? [],
      source: (seg.criteria.source ?? []).join(', '),
    });
    setShowForm(true);
  };

  // Save segment (create or edit)
  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const criteria: SegmentCriteria = {};
      if (form.type.length > 0) criteria.type = form.type;
      if (form.stage.length > 0) criteria.stage = form.stage;
      const reqTags = form.requiredTags.split(',').map(t => t.trim()).filter(Boolean);
      if (reqTags.length > 0) criteria.requiredTags = reqTags;
      const excTags = form.excludeTags.split(',').map(t => t.trim()).filter(Boolean);
      if (excTags.length > 0) criteria.excludeTags = excTags;
      const sources = form.source.split(',').map(t => t.trim()).filter(Boolean);
      if (sources.length > 0) criteria.source = sources;

      const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
      const newSeg: LeadSegment = {
        id: editingSegment?.id ?? `segment-${Date.now()}`,
        name: form.name.trim(),
        description: form.description.trim(),
        criteria,
        tags,
        color: form.color,
        leadCount: 0,
        createdAt: editingSegment?.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newSeg.leadCount = allLeads.filter(l => matchesSegment(l, criteria)).length;

      if (editingSegment) {
        setSegments(prev => prev.map(s => s.id === editingSegment.id ? newSeg : s));
      } else {
        setSegments(prev => [newSeg, ...prev]);
      }
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  // Delete segment
  const handleDelete = (id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
    setDeleteId(null);
  };

  // View leads in segment
  const handleViewLeads = (seg: LeadSegment) => {
    const matched = allLeads.filter(l => matchesSegment(l, seg.criteria));
    setViewLeads(matched);
    setViewSegment(seg);
    setViewSearch('');
  };

  // Toggle type filter in form
  const toggleType = (t: LeadType) => {
    setForm(f => ({
      ...f,
      type: f.type.includes(t) ? f.type.filter(x => x !== t) : [...f.type, t],
    }));
  };

  // Toggle stage filter in form
  const toggleStage = (s: LeadStage) => {
    setForm(f => ({
      ...f,
      stage: f.stage.includes(s) ? f.stage.filter(x => x !== s) : [...f.stage, s],
    }));
  };

  const filteredSegments = segments.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalLeads = allLeads.length;
  const totalSegmented = segments.reduce((sum, s) => sum + s.leadCount, 0);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Tổng khách hàng', value: totalLeads, icon: Users, color: '#f59e0b' },
    { label: 'Tổng phân loại', value: segments.length, icon: Tag, color: '#3b82f6' },
    { label: 'Đã phân loại', value: totalSegmented, icon: UserCheck, color: '#22c55e' },
    { label: 'Chưa phân loại', value: Math.max(0, totalLeads - totalSegmented), icon: AlertCircle, color: '#f97316' },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: DL.bg, minHeight: '100vh' }}>
      {/* Header */}
      <div className="px-6 py-4 backdrop-blur-sm sticky top-0 z-30"
        style={{ background: DL.header, borderBottom: `1px solid ${DL.border}` }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" style={{ color: DL.gold }}>Phân loại Lead</h1>
            <p className="text-xs mt-0.5" style={{ color: DL.textMuted }}>
              Quản lý và phân nhóm khách hàng theo tiêu chí
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all"
              style={{ background: DL.surface, border: `1px solid ${DL.border}`, color: DL.textMuted }}>
              <RefreshCw size={13} />
              <span>Làm mới</span>
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: DL.gold, color: '#000' }}>
              <Plus size={14} />
              <span>Tạo phân loại</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className="rounded-xl p-4"
              style={{ background: DL.card, border: `1px solid ${DL.cardBorder}` }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${stat.color}18`, border: `1px solid ${stat.color}30` }}>
                  <stat.icon size={16} style={{ color: stat.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold" style={{ color: stat.color }}>
                    {loading ? '—' : stat.value}
                  </p>
                  <p className="text-xs" style={{ color: DL.textMuted }}>{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DL.textMuted }} />
          <input
            type="text"
            placeholder="Tìm kiếm phân loại..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: DL.inputBg, border: `1px solid ${DL.inputBorder}`, color: DL.text }}
          />
        </div>

        {/* Segments Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin" style={{ color: DL.gold }} />
          </div>
        ) : filteredSegments.length === 0 ? (
          <div className="text-center py-20">
            <Tag size={40} className="mx-auto mb-3 opacity-20" style={{ color: DL.textMuted }} />
            <p style={{ color: DL.textMuted }}>Chưa có phân loại nào</p>
            <button onClick={openCreate}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: DL.gold, color: '#000' }}>
              Tạo phân loại đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSegments.map(seg => {
              const color = seg.color ?? DL.gold;
              const percent = totalLeads > 0 ? Math.round((seg.leadCount / totalLeads) * 100) : 0;
              return (
                <div key={seg.id} className="rounded-xl p-5 flex flex-col gap-4 transition-all group"
                  style={{ background: DL.card, border: `1px solid ${DL.cardBorder}` }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}50`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = DL.cardBorder)}>
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}18`, border: `1px solid ${color}35` }}>
                        <Users size={16} style={{ color }} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm" style={{ color: DL.text }}>{seg.name}</h3>
                        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: DL.textMuted }}>{seg.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(seg)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ color: DL.textMuted }}
                        onMouseEnter={e => { e.currentTarget.style.background = DL.surface; e.currentTarget.style.color = DL.gold; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = DL.textMuted; }}>
                        <Edit3 size={12} />
                      </button>
                      <button onClick={() => setDeleteId(seg.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ color: DL.textMuted }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)'; e.currentTarget.style.color = '#f87171'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = DL.textMuted; }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Lead count */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-3xl font-bold" style={{ color }}>{seg.leadCount}</span>
                      <span className="text-xs ml-1.5" style={{ color: DL.textMuted }}>khách hàng</span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                      {percent}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${percent}%`, background: color }} />
                  </div>

                  {/* Tags */}
                  {seg.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {seg.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${color}12`, color, border: `1px solid ${color}25` }}>
                          {tag}
                        </span>
                      ))}
                      {seg.tags.length > 4 && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: DL.surface, color: DL.textMuted }}>
                          +{seg.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Criteria summary */}
                  <div className="text-xs space-y-1 rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${DL.border}` }}>
                    {seg.criteria.type && seg.criteria.type.length > 0 && (
                      <p style={{ color: DL.textMuted }}>
                        <span style={{ color: DL.textDim }}>Loại: </span>
                        {seg.criteria.type.map(t => TYPE_LABELS[t]).join(', ')}
                      </p>
                    )}
                    {seg.criteria.stage && seg.criteria.stage.length > 0 && (
                      <p style={{ color: DL.textMuted }}>
                        <span style={{ color: DL.textDim }}>Giai đoạn: </span>
                        {seg.criteria.stage.map(s => STAGE_LABELS[s]).join(', ')}
                      </p>
                    )}
                    {seg.criteria.requiredTags && seg.criteria.requiredTags.length > 0 && (
                      <p style={{ color: DL.textMuted }}>
                        <span style={{ color: DL.textDim }}>Tags: </span>
                        {seg.criteria.requiredTags.join(', ')}
                      </p>
                    )}
                    {seg.criteria.source && seg.criteria.source.length > 0 && (
                      <p style={{ color: DL.textMuted }}>
                        <span style={{ color: DL.textDim }}>Nguồn: </span>
                        {seg.criteria.source.join(', ')}
                      </p>
                    )}
                  </div>

                  {/* View leads button */}
                  <button onClick={() => handleViewLeads(seg)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${color}25`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${color}15`; }}>
                    <Eye size={14} />
                    Xem {seg.leadCount} khách hàng
                    <ChevronRight size={14} />
                  </button>
                </div>
              );
            })}

            {/* Add new card */}
            <button onClick={openCreate}
              className="rounded-xl p-5 flex flex-col items-center justify-center gap-3 transition-all border-dashed"
              style={{ background: 'rgba(255,255,255,0.02)', border: `2px dashed ${DL.border}`, minHeight: '280px' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${DL.gold}50`; e.currentTarget.style.background = 'rgba(245,158,11,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = DL.border; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `${DL.gold}15`, border: `1px solid ${DL.gold}30` }}>
                <Plus size={20} style={{ color: DL.gold }} />
              </div>
              <p className="text-sm font-medium" style={{ color: DL.textMuted }}>Tạo phân loại mới</p>
            </button>
          </div>
        )}
      </div>

      {/* ── Create/Edit Modal ─────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{ background: DL.modalBg, border: `1px solid ${DL.borderGold}`, maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: `1px solid ${DL.border}` }}>
              <h2 className="text-base font-bold" style={{ color: DL.gold }}>
                {editingSegment ? 'Chỉnh sửa phân loại' : 'Tạo phân loại mới'}
              </h2>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ color: DL.textMuted }}
                onMouseEnter={e => { e.currentTarget.style.background = DL.surface; e.currentTarget.style.color = DL.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = DL.textMuted; }}>
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Name */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: DL.textMuted }}>
                  Tên phân loại <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Khách VIP, Chủ đầu tư..."
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: DL.inputBg, border: `1px solid ${DL.inputBorder}`, color: DL.text }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: DL.textMuted }}>Mô tả</label>
                <textarea
                  placeholder="Mô tả ngắn về phân loại này..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ background: DL.inputBg, border: `1px solid ${DL.inputBorder}`, color: DL.text }}
                />
              </div>

              {/* Color */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: DL.textMuted }}>Màu sắc</label>
                <div className="flex gap-2 flex-wrap">
                  {SEGMENT_COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-8 h-8 rounded-lg transition-all flex items-center justify-center"
                      style={{
                        background: c,
                        border: form.color === c ? `2px solid white` : '2px solid transparent',
                        transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                      }}>
                      {form.color === c && <Check size={12} color="white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter: Type */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: DL.textMuted }}>
                  Lọc theo loại khách hàng
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(['investor', 'architect', 'dealer'] as LeadType[]).map(t => (
                    <button key={t} onClick={() => toggleType(t)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: form.type.includes(t) ? `${TYPE_COLORS[t]}20` : DL.surface,
                        border: `1px solid ${form.type.includes(t) ? TYPE_COLORS[t] : DL.border}`,
                        color: form.type.includes(t) ? TYPE_COLORS[t] : DL.textMuted,
                      }}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter: Stage */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: DL.textMuted }}>
                  Lọc theo giai đoạn
                </label>
                <div className="flex gap-2 flex-wrap">
                  {(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'] as LeadStage[]).map(s => (
                    <button key={s} onClick={() => toggleStage(s)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: form.stage.includes(s) ? `${STAGE_COLORS[s]}20` : DL.surface,
                        border: `1px solid ${form.stage.includes(s) ? STAGE_COLORS[s] : DL.border}`,
                        color: form.stage.includes(s) ? STAGE_COLORS[s] : DL.textMuted,
                      }}>
                      {STAGE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: DL.textMuted }}>
                  Tags bắt buộc (cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: VIP, B2B, High Value"
                  value={form.requiredTags}
                  onChange={e => setForm(f => ({ ...f, requiredTags: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: DL.inputBg, border: `1px solid ${DL.inputBorder}`, color: DL.text }}
                />
              </div>

              {/* Display tags */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: DL.textMuted }}>
                  Tags hiển thị (cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chủ đầu tư, B2B, High Value"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: DL.inputBg, border: `1px solid ${DL.inputBorder}`, color: DL.text }}
                />
              </div>

              {/* Source */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: DL.textMuted }}>
                  Nguồn (cách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Facebook Ads, Zalo, Referral"
                  value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: DL.inputBg, border: `1px solid ${DL.inputBorder}`, color: DL.text }}
                />
              </div>

              {/* Preview count */}
              {allLeads.length > 0 && (
                <div className="rounded-xl p-3 flex items-center gap-2"
                  style={{ background: `${form.color}10`, border: `1px solid ${form.color}25` }}>
                  <BarChart3 size={14} style={{ color: form.color }} />
                  <span className="text-sm" style={{ color: DL.textMuted }}>
                    Ước tính: <span className="font-bold" style={{ color: form.color }}>
                      {allLeads.filter(l => matchesSegment(l, {
                        type: form.type.length > 0 ? form.type : undefined,
                        stage: form.stage.length > 0 ? form.stage : undefined,
                        requiredTags: form.requiredTags.split(',').map(t => t.trim()).filter(Boolean),
                        source: form.source.split(',').map(t => t.trim()).filter(Boolean),
                      })).length}
                    </span> khách hàng phù hợp
                  </span>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4" style={{ borderTop: `1px solid ${DL.border}` }}>
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: DL.surface, border: `1px solid ${DL.border}`, color: DL.textMuted }}>
                Hủy
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                style={{
                  background: form.name.trim() ? DL.gold : 'rgba(245,158,11,0.3)',
                  color: form.name.trim() ? '#000' : DL.textMuted,
                  cursor: form.name.trim() ? 'pointer' : 'not-allowed',
                }}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editingSegment ? 'Lưu thay đổi' : 'Tạo phân loại'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Leads Modal ──────────────────────────────────────────────────── */}
      {viewSegment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-3xl rounded-2xl overflow-hidden flex flex-col"
            style={{ background: DL.modalBg, border: `1px solid ${DL.borderGold}`, maxHeight: '85vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
              style={{ borderBottom: `1px solid ${DL.border}` }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: `${viewSegment.color ?? DL.gold}18`, border: `1px solid ${viewSegment.color ?? DL.gold}35` }}>
                  <Users size={16} style={{ color: viewSegment.color ?? DL.gold }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: DL.text }}>{viewSegment.name}</h2>
                  <p className="text-xs" style={{ color: DL.textMuted }}>{viewLeads.length} khách hàng</p>
                </div>
              </div>
              <button onClick={() => setViewSegment(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ color: DL.textMuted, background: DL.surface }}>
                <X size={16} />
              </button>
            </div>

            {/* Search */}
            <div className="px-6 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${DL.border}` }}>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: DL.textMuted }} />
                <input
                  type="text"
                  placeholder="Tìm kiếm trong phân loại..."
                  value={viewSearch}
                  onChange={e => setViewSearch(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 rounded-lg text-sm outline-none"
                  style={{ background: DL.inputBg, border: `1px solid ${DL.inputBorder}`, color: DL.text }}
                />
              </div>
            </div>

            {/* Lead list */}
            <div className="overflow-y-auto flex-1">
              {viewLeads.length === 0 ? (
                <div className="text-center py-12">
                  <Users size={32} className="mx-auto mb-3 opacity-20" style={{ color: DL.textMuted }} />
                  <p style={{ color: DL.textMuted }}>Không có khách hàng nào trong phân loại này</p>
                </div>
              ) : (
                <div>
                  {viewLeads
                    .filter(l =>
                      !viewSearch ||
                      l.name.toLowerCase().includes(viewSearch.toLowerCase()) ||
                      (l.phone ?? '').includes(viewSearch) ||
                      (l.company ?? '').toLowerCase().includes(viewSearch.toLowerCase())
                    )
                    .map(lead => (
                      <Link key={lead.id} href={`/crm/leads/${lead.id}`}
                        className="flex items-center gap-4 px-6 py-3.5 transition-all"
                        style={{ borderBottom: `1px solid ${DL.border}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = DL.surface)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                          style={{ background: `${TYPE_COLORS[lead.type]}20`, color: TYPE_COLORS[lead.type] }}>
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm" style={{ color: DL.text }}>{lead.name}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded"
                              style={{ background: `${TYPE_COLORS[lead.type]}15`, color: TYPE_COLORS[lead.type] }}>
                              {TYPE_LABELS[lead.type]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {lead.phone && (
                              <span className="text-xs flex items-center gap-1" style={{ color: DL.textMuted }}>
                                <Phone size={10} /> {lead.phone}
                              </span>
                            )}
                            {lead.company && (
                              <span className="text-xs flex items-center gap-1" style={{ color: DL.textMuted }}>
                                <Building2 size={10} /> {lead.company}
                              </span>
                            )}
                            {lead.district && (
                              <span className="text-xs flex items-center gap-1" style={{ color: DL.textMuted }}>
                                <MapPin size={10} /> {lead.district}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Stage */}
                        <div className="flex-shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: `${STAGE_COLORS[lead.stage]}15`, color: STAGE_COLORS[lead.stage], border: `1px solid ${STAGE_COLORS[lead.stage]}30` }}>
                            {STAGE_LABELS[lead.stage]}
                          </span>
                        </div>
                        <ChevronRight size={14} style={{ color: DL.textDim, flexShrink: 0 }} />
                      </Link>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ────────────────────────────────────────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: DL.modalBg, border: `1px solid rgba(248,113,113,0.3)` }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)' }}>
                <Trash2 size={18} style={{ color: '#f87171' }} />
              </div>
              <div>
                <h3 className="font-bold" style={{ color: DL.text }}>Xóa phân loại?</h3>
                <p className="text-xs mt-0.5" style={{ color: DL.textMuted }}>Hành động này không thể hoàn tác</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: DL.surface, border: `1px solid ${DL.border}`, color: DL.textMuted }}>
                Hủy
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171' }}>
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
