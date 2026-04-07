'use client';

import React, { useState } from 'react';
import { MessageCircle, Copy, CheckCircle2, ExternalLink } from 'lucide-react';
import type { Lead } from '@/lib/crm-types';

interface ZaloContactButtonProps {
  lead: Lead;
  className?: string;
}

export default function ZaloContactButton({
  lead,
  className = '',
}: ZaloContactButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Sử dụng số Zalo của khách hàng
  const zaloPhone = lead.zaloPhone || lead.phone;

  if (!zaloPhone) {
    return (
      <button
        disabled
        title="Khách hàng chưa có số Zalo"
        className={`
          inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 font-medium
          transition-all duration-200 text-sm whitespace-nowrap
          bg-gray-100 text-gray-400 border-gray-300
          disabled:opacity-50 disabled:cursor-not-allowed
          ${className}
        `}
      >
        <MessageCircle className="w-4 h-4" />
        <span>Chưa có Zalo</span>
      </button>
    );
  }

  // Chuẩn hóa số điện thoại Zalo
  const normalizedPhone = zaloPhone.replace(/\D/g, '');
  const zaloLink = `https://zalo.me/${normalizedPhone}`;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(normalizedPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenZalo = () => {
    window.open(zaloLink, '_blank');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        title={`Kết bạn Zalo với ${lead.name}`}
        className={`
          inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 font-medium
          transition-all duration-200 text-sm whitespace-nowrap
          bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300
          ${className}
        `}
      >
        <MessageCircle className="w-4 h-4" />
        <span>Kết Bạn Zalo</span>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-600">KẾT BẠN ZALO</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{lead.name}</p>
            {lead.company && (
              <p className="text-xs text-gray-500 mt-0.5">{lead.company}</p>
            )}
            <p className="text-sm font-mono text-blue-600 mt-1">{normalizedPhone}</p>
          </div>

          {/* Actions */}
          <div className="p-2 space-y-1">
            {/* Open Zalo */}
            <button
              onClick={handleOpenZalo}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-left"
            >
              <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-gray-900">Mở Zalo</p>
                <p className="text-xs text-gray-500">Kết bạn trực tiếp</p>
              </div>
            </button>

            {/* Copy Phone */}
            <button
              onClick={handleCopyPhone}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-50 transition-colors text-left"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-green-600 flex-shrink-0" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {copied ? 'Đã sao chép' : 'Sao chép số'}
                </p>
                <p className="text-xs text-gray-500">Dán vào Zalo</p>
              </div>
            </button>

            {/* Info */}
            <div className="px-3 py-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 Click "Mở Zalo" để kết bạn trực tiếp hoặc sao chép số để tìm kiếm thủ công
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-600">
            <p>Loại: <span className="font-medium">{lead.type}</span></p>
            <p>Giai đoạn: <span className="font-medium">{lead.stage}</span></p>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
