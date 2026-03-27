'use client';

import React, { useState } from 'react';
import { MessageCircle, Copy, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';
import type { Lead } from '@/lib/crm-types';

interface ZaloContactButtonProps {
  lead: Lead;
  staffName?: string;
  staffZaloPhone?: string;
  className?: string;
}

export default function ZaloContactButton({
  lead,
  staffName = 'Nhân viên',
  staffZaloPhone,
  className = '',
}: ZaloContactButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (!staffZaloPhone) {
    return (
      <button
        disabled
        title="Nhân viên chưa cấu hình số Zalo"
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

  const zaloLink = `https://zalo.me/${staffZaloPhone}`;
  const zaloMessage = `Xin chào ${lead.name}, tôi là ${staffName} của SmartFurni. Hãy kết bạn để nhận thông tin sản phẩm tốt nhất!`;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(staffZaloPhone);
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
        title={`Kết bạn Zalo với ${staffName}`}
        className={`
          inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 font-medium
          transition-all duration-200 text-sm whitespace-nowrap
          bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-300
          ${className}
        `}
      >
        <MessageCircle className="w-4 h-4" />
        <span>Zalo {staffName}</span>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-600">KẾT BẠN ZALO</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{staffName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{staffZaloPhone}</p>
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
            <p>Khách hàng: <span className="font-medium">{lead.name}</span></p>
            <p>SĐT: <span className="font-medium">{lead.phone}</span></p>
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
