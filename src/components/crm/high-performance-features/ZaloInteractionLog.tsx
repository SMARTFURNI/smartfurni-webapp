'use client';

import React, { useState } from 'react';
import { MessageCircle, Plus, X, Clock, User } from 'lucide-react';
import type { Lead } from '@/lib/crm-types';

interface ZaloInteraction {
  id: string;
  type: 'sent' | 'received' | 'note';
  message: string;
  createdAt: string;
  createdBy: string;
}

interface ZaloInteractionLogProps {
  lead: Lead;
  staffName?: string;
  interactions?: ZaloInteraction[];
  onAddInteraction?: (message: string) => void;
  className?: string;
}

export default function ZaloInteractionLog({
  lead,
  staffName = 'Nhân viên',
  interactions = [],
  onAddInteraction,
  className = '',
}: ZaloInteractionLogProps) {
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddInteraction?.(message);
      setMessage('');
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins}m trước`;
    if (diffHours < 24) return `${diffHours}h trước`;
    if (diffDays < 7) return `${diffDays}d trước`;
    return date.toLocaleDateString('vi-VN');
  };

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'sent':
        return '📤';
      case 'received':
        return '📥';
      case 'note':
        return '📝';
      default:
        return '💬';
    }
  };

  const getInteractionLabel = (type: string) => {
    switch (type) {
      case 'sent':
        return 'Gửi';
      case 'received':
        return 'Nhận';
      case 'note':
        return 'Ghi chú';
      default:
        return 'Tương tác';
    }
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Lịch Sử Zalo</h3>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
            {interactions.length}
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="Thêm tương tác"
        >
          {showForm ? (
            <X className="w-4 h-4 text-gray-600" />
          ) : (
            <Plus className="w-4 h-4 text-blue-600" />
          )}
        </button>
      </div>

      {/* Add Interaction Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ghi lại tương tác Zalo với khách hàng..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={!message.trim() || isSubmitting}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu Tương Tác'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

      {/* Interactions List */}
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {interactions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Chưa có tương tác Zalo nào</p>
          </div>
        ) : (
          interactions.map((interaction) => (
            <div key={interaction.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className="text-lg flex-shrink-0 mt-0.5">
                  {getInteractionIcon(interaction.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {getInteractionLabel(interaction.type)}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(interaction.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-900 break-words">{interaction.message}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <User className="w-3 h-3" />
                    {interaction.createdBy}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-blue-50 text-xs text-blue-700 border-t border-gray-100">
        <p>💡 Ghi lại tất cả tương tác Zalo để theo dõi tiến độ chăm sóc khách hàng</p>
      </div>
    </div>
  );
}
