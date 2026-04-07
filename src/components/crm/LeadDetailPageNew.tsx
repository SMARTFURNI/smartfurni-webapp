'use client';

import React, { useState } from 'react';
import { Phone, Mail, MapPin, Building2, User, Calendar, DollarSign, Tag, FileText, Clock, MessageSquare } from 'lucide-react';
import type { Lead } from '@/lib/crm-types';
import CustomerContactActions from './high-performance-features/CustomerContactActions';

interface LeadDetailPageNewProps {
  lead: Lead;
}

type TabType = 'overview' | 'activities' | 'documents' | 'notes';

export default function LeadDetailPageNew({ lead }: LeadDetailPageNewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs = [
    { id: 'overview', label: '📋 Tổng Quan', icon: '📋' },
    { id: 'activities', label: '📞 Tương Tác', icon: '📞' },
    { id: 'documents', label: '📄 Tài Liệu', icon: '📄' },
    { id: 'notes', label: '📝 Ghi Chú', icon: '📝' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
              {lead.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{lead.name}</h1>
              <p className="text-lg text-gray-600 mt-1">{lead.company}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                  {lead.type}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  {lead.stage}
                </span>
              </div>
            </div>
          </div>

          {/* Contact Actions */}
          <CustomerContactActions lead={lead} />
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Phone */}
        <div className="bg-transparent rounded-lg border border-[rgba(255,255,255,0.12)] p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Điện Thoại</p>
              <p className="text-sm font-semibold text-gray-900">{lead.phone}</p>
            </div>
          </div>
        </div>

        {/* Email */}
        <div className="bg-transparent rounded-lg border border-[rgba(255,255,255,0.12)] p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Mail className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Email</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{lead.email}</p>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-transparent rounded-lg border border-[rgba(255,255,255,0.12)] p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Khu Vực</p>
              <p className="text-sm font-semibold text-gray-900">{lead.district}</p>
            </div>
          </div>
        </div>

        {/* Value */}
        <div className="bg-transparent rounded-lg border border-[rgba(255,255,255,0.12)] p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-600 font-medium">Giá Trị</p>
              <p className="text-sm font-semibold text-gray-900">{(lead.expectedValue / 1_000_000).toFixed(1)}M</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-transparent rounded-xl border border-[rgba(255,255,255,0.12)] overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b border-[rgba(255,255,255,0.12)] bg-transparent">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 px-6 py-4 font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Loại Khách Hàng</label>
                    <p className="text-gray-900 mt-1">{lead.type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Giai Đoạn</label>
                    <p className="text-gray-900 mt-1">{lead.stage}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Nguồn</label>
                    <p className="text-gray-900 mt-1">{lead.source}</p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Giá Trị Dự Kiến</label>
                    <p className="text-gray-900 mt-1">{(lead.expectedValue / 1_000_000).toFixed(1)}M ₫</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Số Dự Án</label>
                    <p className="text-gray-900 mt-1">{lead.unitCount}</p>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600">Liên Hệ Cuối</label>
                    <p className="text-gray-900 mt-1">{new Date(lead.lastContactAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {lead.notes && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Ghi Chú</h3>
                  <p className="text-[rgba(245,237,214,0.85)]">{lead.notes}</p>
                </div>
              )}

              {/* Tags */}
              {lead.tags && lead.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Thẻ</h3>
                  <div className="flex flex-wrap gap-2">
                    {lead.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="space-y-4">
              <p className="text-[rgba(245,237,214,0.65)]">Không có tương tác nào được ghi lại.</p>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Thêm Tương Tác
              </button>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4">
              <p className="text-[rgba(245,237,214,0.65)]">Không có tài liệu nào được tải lên.</p>
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Tải Lên Tài Liệu
              </button>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-4">
              <textarea
                placeholder="Thêm ghi chú cho khách hàng này..."
                className="w-full px-4 py-3 rounded-lg border border-[rgba(255,255,255,0.12)] focus:border-blue-500 focus:outline-none"
                rows={4}
              />
              <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                Lưu Ghi Chú
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
