'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Plus, Edit, Trash2, Eye, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  subject: string;
  variables: string[];
  isActive: boolean;
}

export default function EmailTemplateManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tiếng Việt translations
  const t = {
    title: 'Quản Lý Mẫu Email',
    newTemplate: 'Mẫu Mới',
    loading: 'Đang tải...',
    noTemplates: 'Không tìm thấy mẫu nào',
    name: 'Tên Mẫu',
    description: 'Mô Tả',
    category: 'Danh Mục',
    subject: 'Chủ Đề',
    variables: 'Biến',
    status: 'Trạng Thái',
    actions: 'Hành Động',
    edit: 'Sửa',
    delete: 'Xóa',
    preview: 'Xem Trước',
    active: 'Hoạt Động',
    inactive: 'Không Hoạt Động',
    confirmDelete: 'Bạn chắc chắn muốn xóa mẫu này?',
    deleteSuccess: 'Mẫu đã được xóa thành công!',
    deleteFailed: 'Lỗi khi xóa mẫu',
    categories: {
      welcome: 'Chào Mừng',
      followup: 'Follow-up',
      special_offer: 'Ưu Đãi Đặc Biệt',
      reminder: 'Nhắc Nhở',
      feedback: 'Phản Hồi',
    },
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-agent/email/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data.templates);
      }
    } catch (error) {
      console.error('Lỗi khi tải mẫu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.confirmDelete)) return;

    try {
      const response = await fetch(`/api/ai-agent/email/templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessage({ type: 'success', text: t.deleteSuccess });
        fetchTemplates();
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: t.deleteFailed });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t.deleteFailed });
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
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-[#C9A84C]" />
          <h1 className="text-2xl font-bold text-white">{t.title}</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-white rounded-lg hover:bg-[#B89A3C] transition">
          <Plus className="w-4 h-4" />
          {t.newTemplate}
        </button>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-8 text-center">
          <p className="text-[#9CA3AF]">{t.noTemplates}</p>
        </div>
      ) : (
        <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#080600] border-b border-[#2D2500]">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">{t.name}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">{t.category}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">{t.subject}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">{t.variables}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">{t.status}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id} className="border-b border-[#2D2500] hover:bg-[#080600] transition">
                    <td className="px-6 py-3 text-sm text-white font-medium">{template.name}</td>
                    <td className="px-6 py-3 text-sm text-[#9CA3AF]">
                      <span className="px-2 py-1 bg-[#2D2500] rounded text-xs">
                        {t.categories[template.category as keyof typeof t.categories] || template.category}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-[#9CA3AF] truncate max-w-xs">{template.subject}</td>
                    <td className="px-6 py-3 text-sm text-[#9CA3AF]">
                      {template.variables.length > 0 ? (
                        <span className="px-2 py-1 bg-[#2D2500] rounded text-xs">{template.variables.length}</span>
                      ) : (
                        <span className="text-[#6B7280]">-</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      {template.isActive ? (
                        <span className="px-2 py-1 bg-[#22C55E] bg-opacity-20 text-[#22C55E] rounded text-xs font-semibold">
                          {t.active}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-[#6B7280] bg-opacity-20 text-[#9CA3AF] rounded text-xs font-semibold">
                          {t.inactive}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedTemplate(template);
                            setShowPreview(true);
                          }}
                          className="p-2 hover:bg-[#2D2500] rounded transition"
                          title={t.preview}
                        >
                          <Eye className="w-4 h-4 text-[#3B82F6]" />
                        </button>
                        <button className="p-2 hover:bg-[#2D2500] rounded transition" title={t.edit}>
                          <Edit className="w-4 h-4 text-[#F59E0B]" />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="p-2 hover:bg-[#2D2500] rounded transition"
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4 text-[#EF4444]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-[#080600] border-b border-[#2D2500] p-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{selectedTemplate.name}</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-[#9CA3AF] hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-[#9CA3AF] uppercase font-semibold">Chủ Đề</label>
                <p className="text-white mt-1">{selectedTemplate.subject}</p>
              </div>
              <div>
                <label className="text-xs text-[#9CA3AF] uppercase font-semibold">Mô Tả</label>
                <p className="text-[#9CA3AF] mt-1">{selectedTemplate.description}</p>
              </div>
              {selectedTemplate.variables.length > 0 && (
                <div>
                  <label className="text-xs text-[#9CA3AF] uppercase font-semibold">Biến Sử Dụng</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTemplate.variables.map((v) => (
                      <span key={v} className="px-2 py-1 bg-[#2D2500] text-[#C9A84C] rounded text-xs">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
