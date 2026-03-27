'use client';

import React, { useState } from 'react';
import { MessageCircle, Phone, Mail, Copy, CheckCircle2, ExternalLink, X } from 'lucide-react';
import type { Lead } from '@/lib/crm-types';

interface CustomerContactActionsProps {
  lead: Lead;
  className?: string;
}

export default function CustomerContactActions({
  lead,
  className = '',
}: CustomerContactActionsProps) {
  const [activeMenu, setActiveMenu] = useState<'zalo' | 'call' | 'email' | null>(null);
  const [copied, setCopied] = useState(false);

  const zaloPhone = lead.zaloPhone || lead.phone;
  const normalizedPhone = zaloPhone.replace(/\D/g, '');
  const zaloLink = `https://zalo.me/${normalizedPhone}`;

  // Handle Zalo
  const handleOpenZalo = () => {
    window.open(zaloLink, '_blank');
    setActiveMenu(null);
  };

  const handleCopyZaloPhone = () => {
    navigator.clipboard.writeText(normalizedPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Call
  const handleCall = () => {
    window.location.href = `tel:${lead.phone}`;
    setActiveMenu(null);
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(lead.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Email
  const handleSendEmail = () => {
    window.location.href = `mailto:${lead.email}`;
    setActiveMenu(null);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(lead.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Zalo Button */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'zalo' ? null : 'zalo')}
          disabled={!zaloPhone}
          title={zaloPhone ? 'Kết bạn Zalo' : 'Chưa có số Zalo'}
          className={`
            inline-flex items-center justify-center w-10 h-10 rounded-lg font-medium
            transition-all duration-200 border-2
            ${zaloPhone
              ? 'bg-blue-100 text-blue-600 border-blue-300 hover:bg-blue-200 cursor-pointer'
              : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-50'
            }
          `}
        >
          <MessageCircle className="w-5 h-5" />
        </button>

        {/* Zalo Dropdown */}
        {activeMenu === 'zalo' && zaloPhone && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-600">KẾT BẠN ZALO</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{lead.name}</p>
                <p className="text-sm font-mono text-blue-600 mt-1">{normalizedPhone}</p>
              </div>
              <button
                onClick={() => setActiveMenu(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-2 space-y-1">
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

              <button
                onClick={handleCopyZaloPhone}
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
            </div>
          </div>
        )}
      </div>

      {/* Call Button */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'call' ? null : 'call')}
          disabled={!lead.phone}
          title={lead.phone ? 'Gọi điện' : 'Chưa có số điện thoại'}
          className={`
            inline-flex items-center justify-center w-10 h-10 rounded-lg font-medium
            transition-all duration-200 border-2
            ${lead.phone
              ? 'bg-green-100 text-green-600 border-green-300 hover:bg-green-200 cursor-pointer'
              : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-50'
            }
          `}
        >
          <Phone className="w-5 h-5" />
        </button>

        {/* Call Dropdown */}
        {activeMenu === 'call' && lead.phone && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-600">GỌI ĐIỆN</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{lead.name}</p>
                <p className="text-sm font-mono text-green-600 mt-1">{lead.phone}</p>
              </div>
              <button
                onClick={() => setActiveMenu(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-2 space-y-1">
              <button
                onClick={handleCall}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-green-50 transition-colors text-left"
              >
                <Phone className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Gọi ngay</p>
                  <p className="text-xs text-gray-500">Khởi động ứng dụng gọi</p>
                </div>
              </button>

              <button
                onClick={handleCopyPhone}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-left"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {copied ? 'Đã sao chép' : 'Sao chép số'}
                  </p>
                  <p className="text-xs text-gray-500">Dán vào điện thoại</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Button */}
      <div className="relative">
        <button
          onClick={() => setActiveMenu(activeMenu === 'email' ? null : 'email')}
          disabled={!lead.email}
          title={lead.email ? 'Gửi email' : 'Chưa có email'}
          className={`
            inline-flex items-center justify-center w-10 h-10 rounded-lg font-medium
            transition-all duration-200 border-2
            ${lead.email
              ? 'bg-purple-100 text-purple-600 border-purple-300 hover:bg-purple-200 cursor-pointer'
              : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-50'
            }
          `}
        >
          <Mail className="w-5 h-5" />
        </button>

        {/* Email Dropdown */}
        {activeMenu === 'email' && lead.email && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-600">GỬI EMAIL</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{lead.name}</p>
                <p className="text-sm font-mono text-purple-600 mt-1 break-all">{lead.email}</p>
              </div>
              <button
                onClick={() => setActiveMenu(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-2 space-y-1">
              <button
                onClick={handleSendEmail}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-purple-50 transition-colors text-left"
              >
                <Mail className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Soạn email</p>
                  <p className="text-xs text-gray-500">Mở ứng dụng email</p>
                </div>
              </button>

              <button
                onClick={handleCopyEmail}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-left"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {copied ? 'Đã sao chép' : 'Sao chép email'}
                  </p>
                  <p className="text-xs text-gray-500">Dán vào email</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Backdrop */}
      {activeMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setActiveMenu(null)}
        />
      )}
    </div>
  );
}
