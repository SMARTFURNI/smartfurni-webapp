'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Play, Pause, Eye, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface EmailScenario {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: string;
    conditions?: Record<string, any>;
  };
  steps: Array<{
    id: string;
    templateId: string;
    delayDays: number;
    delayHours?: number;
  }>;
  enabled: boolean;
  stats?: {
    totalSent: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  };
}

export default function EmailScenarioBuilderAdvanced() {
  const [scenarios, setScenarios] = useState<EmailScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<EmailScenario | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tiếng Việt translations
  const t = {
    title: 'Kịch Bản Tự Động Hoá Email',
    newScenario: 'Kịch Bản Mới',
    loading: 'Đang tải...',
    noScenarios: 'Không tìm thấy kịch bản nào',
    name: 'Tên Kịch Bản',
    description: 'Mô Tả',
    trigger: 'Kích Hoạt',
    steps: 'Bước Email',
    status: 'Trạng Thái',
    actions: 'Hành Động',
    edit: 'Sửa',
    delete: 'Xóa',
    preview: 'Xem',
    execute: 'Chạy',
    pause: 'Tạm Dừng',
    activate: 'Kích Hoạt',
    active: 'Hoạt Động',
    inactive: 'Không Hoạt Động',
    sent: 'Đã Gửi',
    openRate: 'Tỷ Lệ Mở',
    clickRate: 'Tỷ Lệ Click',
    conversionRate: 'Tỷ Lệ Chuyển Đổi',
    confirmDelete: 'Bạn chắc chắn muốn xóa kịch bản này?',
    deleteSuccess: 'Kịch bản đã được xóa thành công!',
    deleteFailed: 'Lỗi khi xóa kịch bản',
    triggerTypes: {
      new_lead: 'Lead Mới',
      lead_score_change: 'Điểm Lead Thay Đổi',
      stage_change: 'Giai Đoạn Thay Đổi',
      manual: 'Thủ Công',
    },
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-agent/email/scenarios');
      if (response.ok) {
        const data = await response.json();
        setScenarios(data.data.scenarios);
      }
    } catch (error) {
      console.error('Lỗi khi tải kịch bản:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;

    try {
      const response = await fetch(`/api/ai-agent/email/scenarios/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: t.deleteSuccess });
        fetchScenarios();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: t.deleteFailed });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t.deleteFailed });
    }
  };

  const handleToggle = async (scenario: EmailScenario) => {
    try {
      const response = await fetch(`/api/ai-agent/email/scenarios/${scenario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...scenario, enabled: !scenario.enabled }),
      });

      if (response.ok) {
        fetchScenarios();
      }
    } catch (error) {
      console.error('Lỗi:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6">
        <div className="text-center text-[#9CA3AF]">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Thông báo */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-[#22C55E] bg-opacity-10 border border-[#22C55E] text-[#22C55E]'
              : 'bg-[#EF4444] bg-opacity-10 border border-[#EF4444] text-[#EF4444]'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.title}</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-white rounded-lg hover:bg-[#B89A3C] transition">
          <Plus className="w-4 h-4" />
          {t.newScenario}
        </button>
      </div>

      {/* Scenarios Grid */}
      {scenarios.length === 0 ? (
        <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-8 text-center">
          <p className="text-[#9CA3AF]">{t.noScenarios}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4 hover:border-[#C9A84C] transition">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{scenario.name}</h3>
                  <p className="text-sm text-[#9CA3AF] mt-1">{scenario.description}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  scenario.enabled
                    ? 'bg-[#22C55E] text-white'
                    : 'bg-[#6B7280] text-white'
                }`}>
                  {scenario.enabled ? t.active : t.inactive}
                </div>
              </div>

              {/* Trigger */}
              <div className="mb-3 p-2 bg-[#080600] rounded">
                <div className="text-xs text-[#9CA3AF] mb-1">{t.trigger}</div>
                <div className="text-sm text-white">
                  {t.triggerTypes[scenario.trigger.type as keyof typeof t.triggerTypes] || scenario.trigger.type}
                </div>
              </div>

              {/* Steps */}
              <div className="mb-3 p-2 bg-[#080600] rounded">
                <div className="text-xs text-[#9CA3AF] mb-1">{t.steps}</div>
                <div className="text-sm text-white">{scenario.steps.length} bước</div>
              </div>

              {/* Stats */}
              {scenario.stats && (
                <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-[#080600] rounded">
                  <div>
                    <div className="text-xs text-[#9CA3AF]">{t.sent}</div>
                    <div className="text-sm font-bold text-[#C9A84C]">{scenario.stats.totalSent}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#9CA3AF]">{t.openRate}</div>
                    <div className="text-sm font-bold text-[#22C55E]">{scenario.stats.openRate.toFixed(1)}%</div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggle(scenario)}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-[#2D2500] text-white rounded hover:bg-[#3D3500] transition text-sm"
                >
                  {scenario.enabled ? (
                    <>
                      <Pause className="w-3 h-3" />
                      {t.pause}
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      {t.activate}
                    </>
                  )}
                </button>
                <button className="p-2 hover:bg-[#2D2500] rounded transition">
                  <Edit className="w-4 h-4 text-[#F59E0B]" />
                </button>
                <button
                  onClick={() => handleDelete(scenario.id)}
                  className="p-2 hover:bg-[#2D2500] rounded transition"
                >
                  <Trash2 className="w-4 h-4 text-[#EF4444]" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
