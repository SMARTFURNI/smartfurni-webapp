'use client';

import { useState, useEffect } from 'react';
import type { LeadSegment } from '@/services/lead-segmentation-service';

export default function LeadSegmentationDashboard() {
  const [segments, setSegments] = useState<LeadSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    criteria: { requiredTags: [] },
    tags: [] as string[],
  });

  useEffect(() => {
    loadSegments();
  }, []);

  const loadSegments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/email-marketing/segments');
      const data = await res.json();
      if (data.success) {
        setSegments(data.data);
      }
    } catch (error) {
      console.error('Lỗi tải segments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSegment = async () => {
    if (!formData.name.trim()) {
      alert('Vui lòng nhập tên segment');
      return;
    }

    try {
      const res = await fetch('/api/email-marketing/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setSegments([data.data, ...segments]);
        setFormData({ name: '', description: '', criteria: { requiredTags: [] }, tags: [] as string[] });
        setShowNewForm(false);
      }
    } catch (error) {
      console.error('Lỗi tạo segment:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#080600] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#C9A84C] mb-2">👥 Phân Loại Lead</h1>
            <p className="text-gray-400">Tạo và quản lý các nhóm lead theo tags và điểm số</p>
          </div>
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="bg-[#C9A84C] hover:bg-[#D4B85F] text-white px-6 py-3 rounded-lg font-semibold transition"
          >
            ➕ Segment Mới
          </button>
        </div>

        {/* New Segment Form */}
        {showNewForm && (
          <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-[#C9A84C] mb-4">Tạo Segment Mới</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Tên segment"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#080600] border border-[#2D2500] rounded px-4 py-2 text-white placeholder-gray-500"
              />
              <textarea
                placeholder="Mô tả segment"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-[#080600] border border-[#2D2500] rounded px-4 py-2 text-white placeholder-gray-500 h-20"
              />
              <div>
                <label className="text-gray-400 text-sm mb-2 block">Tags (cách nhau bằng dấu phẩy)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Chủ đầu tư, B2B, High Value"
                  value={formData.tags.join(', ')}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value.split(',').map((t) => t.trim()) })}
                  className="w-full bg-[#080600] border border-[#2D2500] rounded px-4 py-2 text-white placeholder-gray-500"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleCreateSegment}
                  className="bg-[#C9A84C] hover:bg-[#D4B85F] text-white px-6 py-2 rounded font-semibold transition"
                >
                  Tạo Segment
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

        {/* Segments Grid */}
        {loading ? (
          <div className="text-center text-gray-400 py-12">Đang tải...</div>
        ) : segments.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p>Chưa có segment nào. Hãy tạo segment đầu tiên!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {segments.map((segment) => (
              <div key={segment.id} className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6 hover:border-[#C9A84C] transition">
                <h3 className="text-lg font-bold text-white mb-2">{segment.name}</h3>
                <p className="text-gray-400 text-sm mb-4">{segment.description}</p>

                {/* Tags */}
                <div className="mb-4 flex flex-wrap gap-2">
                  {segment.tags.map((tag) => (
                    <span key={tag} className="bg-[#2D2500] text-[#C9A84C] text-xs px-2 py-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Criteria */}
                <div className="bg-[#080600] rounded p-3 mb-4 text-xs text-gray-400">
                  {segment.criteria.requiredTags && segment.criteria.requiredTags.length > 0 && (
                    <p>🏷️ Tags: {segment.criteria.requiredTags.join(', ')}</p>
                  )}
                  {segment.criteria.minScore !== undefined && (
                    <p>📊 Min Score: {segment.criteria.minScore}</p>
                  )}
                  {segment.criteria.maxScore !== undefined && (
                    <p>📊 Max Score: {segment.criteria.maxScore}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button className="flex-1 bg-[#C9A84C] hover:bg-[#D4B85F] text-white px-4 py-2 rounded text-sm font-semibold transition">
                    ✏️ Chỉnh Sửa
                  </button>
                  <button className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm font-semibold transition">
                    👁️ Xem Lead
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
