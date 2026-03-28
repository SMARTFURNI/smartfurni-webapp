'use client';

import React from 'react';
import { Plus, Pause, Edit2, Trash2 } from 'lucide-react';

export default function EmailScenariosSimple() {
  // Mock dữ liệu
  const scenarios = [
    {
      id: '1',
      name: 'Chuỗi Chào Mừng - Lead Mới',
      description: 'Gửi email chào mừng cho lead mới từ Facebook',
      enabled: true,
      trigger: 'new_lead',
      steps: 3,
      sent: 10,
      openRate: 70,
    },
    {
      id: '2',
      name: 'Hot Lead Follow-up',
      description: 'Follow-up nhanh cho lead có điểm cao (80+)',
      enabled: true,
      trigger: 'lead_score_change',
      steps: 2,
      sent: 5,
      openRate: 80,
    },
    {
      id: '3',
      name: 'Warm Lead Nurture',
      description: 'Nuôi dưỡng lead có điểm trung bình (50-79)',
      enabled: true,
      trigger: 'lead_score_change',
      steps: 3,
      sent: 8,
      openRate: 62.5,
    },
  ];

  const t = {
    title: 'Kịch Bản Email',
    newScenario: 'Kịch Bản Mới',
    sent: 'Đã gửi',
    openRate: 'Tỷ lệ mở',
    trigger: 'Kích hoạt',
    steps: 'Bước',
    pause: 'Tạm dừng',
    edit: 'Sửa',
    delete: 'Xóa',
    active: 'Hoạt động',
    inactive: 'Không hoạt động',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.title}</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-white rounded-lg hover:bg-[#B89A3C] transition">
          <Plus className="w-4 h-4" />
          {t.newScenario}
        </button>
      </div>

      {/* Scenarios Grid */}
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

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-[#080600] rounded">
              <div>
                <div className="text-xs text-[#9CA3AF]">{t.sent}</div>
                <div className="text-lg font-bold text-[#C9A84C]">{scenario.sent}</div>
              </div>
              <div>
                <div className="text-xs text-[#9CA3AF]">{t.openRate}</div>
                <div className="text-lg font-bold text-[#22C55E]">{scenario.openRate}%</div>
              </div>
            </div>

            {/* Trigger & Steps */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="p-3 bg-[#080600] rounded">
                <div className="text-xs text-[#9CA3AF] mb-1">{t.trigger}</div>
                <div className="text-sm text-white capitalize">{scenario.trigger.replace('_', ' ')}</div>
              </div>
              <div className="p-3 bg-[#080600] rounded">
                <div className="text-xs text-[#9CA3AF] mb-1">{t.steps}</div>
                <div className="text-sm text-white">{scenario.steps} bước</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#2D2500] text-white rounded hover:bg-[#3D3500] transition text-sm">
                <Pause className="w-4 h-4" />
                {t.pause}
              </button>
              <button className="flex items-center justify-center gap-1 px-3 py-2 bg-[#2D2500] text-white rounded hover:bg-[#3D3500] transition">
                <Edit2 className="w-4 h-4" />
              </button>
              <button className="flex items-center justify-center gap-1 px-3 py-2 bg-[#2D2500] text-white rounded hover:bg-[#EF4444] transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
