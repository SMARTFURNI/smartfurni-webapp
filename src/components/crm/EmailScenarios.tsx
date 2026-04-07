'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Play, Pause } from 'lucide-react';

interface EmailScenario {
  id: string;
  name: string;
  description: string;
  trigger: string;
  status: 'active' | 'paused' | 'draft';
  createdAt: string;
}

export default function EmailScenarios() {
  const [scenarios, setScenarios] = useState<EmailScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', trigger: '' });

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/email-marketing/scenarios');
      const data = await res.json();
      if (data.success) {
        setScenarios(data.data || []);
      }
    } catch (error) {
      console.error('Lỗi tải scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScenario = async () => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên scenario');
      return;
    }

    try {
      const res = await fetch('/api/email-marketing/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setScenarios([data.data, ...scenarios]);
        setFormData({ name: '', description: '', trigger: '' });
        setShowForm(false);
      }
    } catch (error) {
      console.error('Lỗi tạo scenario:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-600',
      paused: 'bg-yellow-600',
      draft: 'bg-gray-600',
    };
    return colors[status] || 'bg-gray-600';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Đang chạy',
      paused: 'Tạm dừng',
      draft: 'Bản nháp',
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-[#080600] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#C9A84C] mb-2">🎯 Email Scenarios</h1>
            <p className="text-gray-400">Quản lý các kịch bản email tự động hoá</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#C9A84C] hover:bg-[#D4B85F] text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2"
          >
            <Plus size={20} /> Scenario Mới
          </button>
        </div>

        {/* New Scenario Form */}
        {showForm && (
          <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-[#C9A84C] mb-4">Tạo Scenario Mới</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Tên scenario"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#080600] border border-[#2D2500] rounded px-4 py-2 text-white placeholder-gray-500"
              />
              <textarea
                placeholder="Mô tả scenario"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-[#080600] border border-[#2D2500] rounded px-4 py-2 text-white placeholder-gray-500 h-24"
              />
              <select
                value={formData.trigger}
                onChange={(e) => setFormData({ ...formData, trigger: e.target.value })}
                className="w-full bg-[#080600] border border-[#2D2500] rounded px-4 py-2 text-white"
              >
                <option value="">Chọn trigger</option>
                <option value="new_lead">Lead Mới</option>
                <option value="form_submit">Form Submit</option>
                <option value="email_open">Email Được Mở</option>
                <option value="email_click">Email Được Click</option>
              </select>
              <div className="flex gap-4">
                <button
                  onClick={handleCreateScenario}
                  className="bg-[#C9A84C] hover:bg-[#D4B85F] text-white px-6 py-2 rounded font-semibold transition"
                >
                  Tạo Scenario
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-semibold transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scenarios List */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Đang tải...</div>
        ) : scenarios.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>Chưa có scenario nào. Hãy tạo scenario đầu tiên!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6 hover:border-[#C9A84C] transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-white">{scenario.name}</h3>
                      <span className={`${getStatusColor(scenario.status)} text-white text-xs px-3 py-1 rounded-full`}>
                        {getStatusLabel(scenario.status)}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm mb-2">{scenario.description}</p>
                    <p className="text-gray-500 text-xs">Trigger: {scenario.trigger}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="bg-[#2D2500] hover:bg-[#3D3500] text-white p-2 rounded transition">
                      <Play size={18} />
                    </button>
                    <button className="bg-[#2D2500] hover:bg-[#3D3500] text-white p-2 rounded transition">
                      <Edit2 size={18} />
                    </button>
                    <button className="bg-[#2D2500] hover:bg-[#3D3500] text-white p-2 rounded transition">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
