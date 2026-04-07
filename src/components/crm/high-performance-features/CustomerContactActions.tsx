'use client';

import React, { useState } from 'react';
import { MessageCircle, Phone, Mail, Copy, CheckCircle2, ExternalLink, X, UserPlus } from 'lucide-react';
import type { Lead } from '@/lib/crm-types';
import ZaloPersonalAddFriendModal from '@/components/crm/ZaloPersonalAddFriendModal';

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
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

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

  const buttonBaseClass = `
    inline-flex items-center justify-center w-10 h-10 rounded-lg font-medium
    transition-all duration-300 border-2 relative
    hover:shadow-lg hover:scale-110
  `;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Zalo Button */}
      <div className="relative group">
        <button
          onClick={() => setActiveMenu(activeMenu === 'zalo' ? null : 'zalo')}
          onMouseEnter={() => setHoveredButton('zalo')}
          onMouseLeave={() => setHoveredButton(null)}
          disabled={!zaloPhone}
          className={`
            ${buttonBaseClass}
            ${zaloPhone
              ? 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 border-blue-300 hover:from-blue-200 hover:to-blue-100 hover:border-blue-400 cursor-pointer shadow-sm'
              : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-50'
            }
          `}
        >
          <MessageCircle className="w-5 h-5" />
          {hoveredButton === 'zalo' && zaloPhone && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Kết bạn Zalo
            </div>
          )}
        </button>

        {/* Zalo Dropdown */}
        {activeMenu === 'zalo' && zaloPhone && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-[rgba(255,255,255,0.07)] border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-100 flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">💬 Kết Bạn Zalo</p>
                <p className="text-sm font-bold text-gray-900 mt-2">{lead.name}</p>
                <p className="text-sm font-mono text-blue-600 mt-1 font-semibold">{normalizedPhone}</p>
              </div>
              <button
                onClick={() => setActiveMenu(null)}
                className="p-1 hover:bg-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-2 space-y-1">
              <button
                onClick={handleOpenZalo}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition-all duration-200 text-left group/item"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover/item:bg-blue-200 transition-colors">
                  <ExternalLink className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Mở Zalo</p>
                  <p className="text-xs text-gray-500">Kết bạn trực tiếp</p>
                </div>
                <span className="text-lg">→</span>
              </button>

              <button
                onClick={handleCopyZaloPhone}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-green-50 transition-all duration-200 text-left group/item"
              >
                <div className="p-2 bg-green-100 rounded-lg group-hover/item:bg-green-200 transition-colors">
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {copied ? '\u2713 Đã sao chép' : 'Sao chép số'}
                  </p>
                  <p className="text-xs text-gray-500">Dán vào Zalo</p>
                </div>
              </button>

              {/* Kết bạn Zalo Personal */}
              <div className="px-2 pt-1 pb-1">
                <div className="border-t border-gray-100 mb-1" />
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Zalo Personal</p>
              </div>
              <button
                onClick={() => { setActiveMenu(null); setShowAddFriendModal(true); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition-all duration-200 text-left group/item"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover/item:bg-blue-200 transition-colors">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Gửi lời mời kết bạn</p>
                  <p className="text-xs text-gray-500">Tự động qua Zalo cá nhân</p>
                </div>
                <span className="text-lg">→</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Call Button */}
      <div className="relative group">
        <button
          onClick={() => setActiveMenu(activeMenu === 'call' ? null : 'call')}
          onMouseEnter={() => setHoveredButton('call')}
          onMouseLeave={() => setHoveredButton(null)}
          disabled={!lead.phone}
          className={`
            ${buttonBaseClass}
            ${lead.phone
              ? 'bg-gradient-to-br from-green-100 to-green-50 text-green-600 border-green-300 hover:from-green-200 hover:to-green-100 hover:border-green-400 cursor-pointer shadow-sm'
              : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-50'
            }
          `}
        >
          <Phone className="w-5 h-5" />
          {hoveredButton === 'call' && lead.phone && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Gọi điện
            </div>
          )}
        </button>

        {/* Call Dropdown */}
        {activeMenu === 'call' && lead.phone && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-[rgba(255,255,255,0.07)] border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-green-50 to-green-100 flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">☎️ Gọi Điện</p>
                <p className="text-sm font-bold text-gray-900 mt-2">{lead.name}</p>
                <p className="text-sm font-mono text-green-600 mt-1 font-semibold">{lead.phone}</p>
              </div>
              <button
                onClick={() => setActiveMenu(null)}
                className="p-1 hover:bg-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-2 space-y-1">
              <button
                onClick={handleCall}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-green-50 transition-all duration-200 text-left group/item"
              >
                <div className="p-2 bg-green-100 rounded-lg group-hover/item:bg-green-200 transition-colors">
                  <Phone className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Gọi ngay</p>
                  <p className="text-xs text-gray-500">Khởi động ứng dụng gọi</p>
                </div>
                <span className="text-lg">→</span>
              </button>

              <button
                onClick={handleCopyPhone}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition-all duration-200 text-left group/item"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover/item:bg-blue-200 transition-colors">
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {copied ? '✓ Đã sao chép' : 'Sao chép số'}
                  </p>
                  <p className="text-xs text-gray-500">Dán vào điện thoại</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Email Button */}
      <div className="relative group">
        <button
          onClick={() => setActiveMenu(activeMenu === 'email' ? null : 'email')}
          onMouseEnter={() => setHoveredButton('email')}
          onMouseLeave={() => setHoveredButton(null)}
          disabled={!lead.email}
          className={`
            ${buttonBaseClass}
            ${lead.email
              ? 'bg-gradient-to-br from-purple-100 to-purple-50 text-purple-600 border-purple-300 hover:from-purple-200 hover:to-purple-100 hover:border-purple-400 cursor-pointer shadow-sm'
              : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed opacity-50'
            }
          `}
        >
          <Mail className="w-5 h-5" />
          {hoveredButton === 'email' && lead.email && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              Gửi email
            </div>
          )}
        </button>

        {/* Email Dropdown */}
        {activeMenu === 'email' && lead.email && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-[rgba(255,255,255,0.07)] border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
            <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-purple-100 flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">✉️ Gửi Email</p>
                <p className="text-sm font-bold text-gray-900 mt-2">{lead.name}</p>
                <p className="text-sm font-mono text-purple-600 mt-1 font-semibold break-all">{lead.email}</p>
              </div>
              <button
                onClick={() => setActiveMenu(null)}
                className="p-1 hover:bg-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div className="p-2 space-y-1">
              <button
                onClick={handleSendEmail}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-purple-50 transition-all duration-200 text-left group/item"
              >
                <div className="p-2 bg-purple-100 rounded-lg group-hover/item:bg-purple-200 transition-colors">
                  <Mail className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Soạn email</p>
                  <p className="text-xs text-gray-500">Mở ứng dụng email</p>
                </div>
                <span className="text-lg">→</span>
              </button>

              <button
                onClick={handleCopyEmail}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-blue-50 transition-all duration-200 text-left group/item"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover/item:bg-blue-200 transition-colors">
                  {copied ? (
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-blue-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">
                    {copied ? '✓ Đã sao chép' : 'Sao chép email'}
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

      {/* Zalo Personal Add Friend Modal */}
      {showAddFriendModal && (
        <ZaloPersonalAddFriendModal
          leadName={lead.name}
          leadPhone={zaloPhone}
          onClose={() => setShowAddFriendModal(false)}
        />
      )}
    </div>
  );
}
