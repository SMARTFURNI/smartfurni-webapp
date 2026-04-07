'use client';

import { useState, useEffect } from 'react';
import type { EmailCampaign } from '@/lib/email-marketing-store';

export default function EmailCampaignDashboard() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', targetSegments: [] });

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/email-marketing/campaigns');
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.data);
      }
    } catch (error) {
      console.error('Lỗi tải chiến dịch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên chiến dịch');
      return;
    }

    try {
      const res = await fetch('/api/email-marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns([data.data, ...campaigns]);
        setFormData({ name: '', description: '', targetSegments: [] });
        setShowNewForm(false);
      }
    } catch (error) {
      console.error('Lỗi tạo chiến dịch:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-600',
      active: 'bg-green-600',
      paused: 'bg-yellow-600',
      completed: 'bg-blue-600',
    };
    return colors[status] || 'bg-gray-600';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: 'Bản nháp',
      active: 'Đang chạy',
      paused: 'Tạm dừng',
      completed: 'Hoàn thành',
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen bg-[#080600] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#C9A84C] mb-2">📧 Quản Lý Chiến Dịch Email</h1>
            <p className="text-[rgba(245,237,214,0.35)]">Tạo và quản lý các chiến dịch email marketing tự động hoá</p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="bg-[#C9A84C] hover:bg-[#D4B85F] text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            ➕ Chiến Dịch Mới
          </button>
        </div>

        {/* New Campaign Form */}
        {showNewForm && (
          <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-[#C9A84C] mb-4">Tạo Chiến Dịch Mới</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Tên chiến dịch"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#080600] border border-[#2D2500] rounded px-4 py-2 text-white placeholder-gray-500"
              />
              <textarea
                placeholder="Mô tả chiến dịch"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-[#080600] border border-[#2D2500] rounded px-4 py-2 text-white placeholder-gray-500 h-24"
              />
              <div className="flex gap-4">
                <button
                  onClick={handleCreateCampaign}
                  className="bg-[#C9A84C] hover:bg-[#D4B85F] text-white px-6 py-2 rounded font-semibold transition"
                >
                  Tạo Chiến Dịch
                </button>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-semibold transition"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Campaigns Grid */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Đang tải...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>Chưa có chiến dịch nào. Hãy tạo chiến dịch đầu tiên!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6 hover:border-[#C9A84C] transition">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-white flex-1">{campaign.name}</h3>
                  <span className={`${getStatusColor(campaign.status)} text-white text-xs px-3 py-1 rounded-full`}>
                    {getStatusLabel(campaign.status)}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-4">{campaign.description}</p>
                <div className="mb-4">
                  <p className="text-xs text-gray-500">Nhóm mục tiêu: {campaign.targetSegments.length}</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex-1 bg-[#C9A84C] hover:bg-[#D4B85F] text-white px-4 py-2 rounded text-sm font-semibold transition">
                    ✏️ Chỉnh Sửa
                  </button>
                  <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-semibold transition">
                    📊 Xem Chi Tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
