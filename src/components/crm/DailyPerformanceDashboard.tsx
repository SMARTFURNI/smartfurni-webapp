'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Mail, Users, Target, BarChart3 } from 'lucide-react';

interface PerformanceData {
  date: string;
  emailMetrics: {
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalConverted: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  };
  leadMetrics: {
    totalLeads: number;
    hotLeads: number;
    warmLeads: number;
    coldLeads: number;
    averageScore: number;
  };
  trends: {
    emailOpenRateTrend: number;
    conversionRateTrend: number;
    leadScoreTrend: number;
  };
}

export default function DailyPerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch('/api/ai-agent/daily-report');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C9A84C] mx-auto mb-4"></div>
          <p className="text-white">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-white p-8">
        <p>Không thể tải dữ liệu báo cáo</p>
      </div>
    );
  }

  const t = {
    title: 'Báo Cáo Hiệu Suất Hàng Ngày',
    emailMetrics: 'Thống Kê Email',
    leadMetrics: 'Thống Kê Lead',
    trends: 'Xu Hướng',
    totalSent: 'Tổng Gửi',
    openRate: 'Tỷ Lệ Mở',
    clickRate: 'Tỷ Lệ Click',
    conversionRate: 'Tỷ Lệ Chuyển Đổi',
    totalLeads: 'Tổng Lead',
    hotLeads: 'Hot Lead',
    warmLeads: 'Warm Lead',
    coldLeads: 'Cold Lead',
    avgScore: 'Điểm TB',
    refresh: 'Làm Mới',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.title}</h1>
        <button
          onClick={fetchPerformanceData}
          className="px-4 py-2 bg-[#C9A84C] text-white rounded-lg hover:bg-[#B89A3C] transition"
        >
          {t.refresh}
        </button>
      </div>

      {/* Email Metrics */}
      <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-[#C9A84C]" />
          <h2 className="text-xl font-semibold text-white">{t.emailMetrics}</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Sent */}
          <div className="bg-[#080600] rounded p-4">
            <div className="text-sm text-[#9CA3AF] mb-2">{t.totalSent}</div>
            <div className="text-2xl font-bold text-[#C9A84C]">
              {data.emailMetrics.totalSent.toLocaleString('vi-VN')}
            </div>
          </div>

          {/* Open Rate */}
          <div className="bg-[#080600] rounded p-4">
            <div className="text-sm text-[#9CA3AF] mb-2">{t.openRate}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-[#22C55E]">
                {data.emailMetrics.openRate.toFixed(1)}%
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                data.trends.emailOpenRateTrend > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
              }`}>
                {data.trends.emailOpenRateTrend > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(data.trends.emailOpenRateTrend).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Click Rate */}
          <div className="bg-[#080600] rounded p-4">
            <div className="text-sm text-[#9CA3AF] mb-2">{t.clickRate}</div>
            <div className="text-2xl font-bold text-[#3B82F6]">
              {data.emailMetrics.clickRate.toFixed(1)}%
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="bg-[#080600] rounded p-4">
            <div className="text-sm text-[#9CA3AF] mb-2">{t.conversionRate}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-[#F59E0B]">
                {data.emailMetrics.conversionRate.toFixed(1)}%
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                data.trends.conversionRateTrend > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
              }`}>
                {data.trends.conversionRateTrend > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(data.trends.conversionRateTrend).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Metrics */}
      <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#C9A84C]" />
          <h2 className="text-xl font-semibold text-white">{t.leadMetrics}</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Total Leads */}
          <div className="bg-[#080600] rounded p-4">
            <div className="text-sm text-[#9CA3AF] mb-2">{t.totalLeads}</div>
            <div className="text-2xl font-bold text-[#C9A84C]">
              {data.leadMetrics.totalLeads.toLocaleString('vi-VN')}
            </div>
          </div>

          {/* Hot Leads */}
          <div className="bg-[#080600] rounded p-4">
            <div className="text-sm text-[#9CA3AF] mb-2">{t.hotLeads}</div>
            <div className="text-2xl font-bold text-[#EF4444]">
              {data.leadMetrics.hotLeads}
            </div>
            <div className="text-xs text-[#9CA3AF] mt-1">
              {((data.leadMetrics.hotLeads / data.leadMetrics.totalLeads) * 100).toFixed(1)}%
            </div>
          </div>

          {/* Warm Leads */}
          <div className="bg-[#080600] rounded p-4">
            <div className="text-sm text-[#9CA3AF] mb-2">{t.warmLeads}</div>
            <div className="text-2xl font-bold text-[#F59E0B]">
              {data.leadMetrics.warmLeads}
            </div>
            <div className="text-xs text-[#9CA3AF] mt-1">
              {((data.leadMetrics.warmLeads / data.leadMetrics.totalLeads) * 100).toFixed(1)}%
            </div>
          </div>

          {/* Cold Leads */}
          <div className="bg-[#080600] rounded p-4">
            <div className="text-sm text-[#9CA3AF] mb-2">{t.coldLeads}</div>
            <div className="text-2xl font-bold text-[#6B7280]">
              {data.leadMetrics.coldLeads}
            </div>
            <div className="text-xs text-[#9CA3AF] mt-1">
              {((data.leadMetrics.coldLeads / data.leadMetrics.totalLeads) * 100).toFixed(1)}%
            </div>
          </div>

          {/* Average Score */}
          <div className="bg-[#080600] rounded p-4">
            <div className="text-sm text-[#9CA3AF] mb-2">{t.avgScore}</div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-[#22C55E]">
                {data.leadMetrics.averageScore.toFixed(1)}
              </div>
              <div className={`flex items-center gap-1 text-sm ${
                data.trends.leadScoreTrend > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
              }`}>
                {data.trends.leadScoreTrend > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(data.trends.leadScoreTrend).toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#C9A84C]" />
          <h2 className="text-xl font-semibold text-white">Tóm Tắt</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#080600] rounded">
            <p className="text-sm text-[#9CA3AF] mb-2">Doanh Thu Ước Tính</p>
            <p className="text-2xl font-bold text-[#C9A84C]">
              {(data.emailMetrics.totalConverted * 45).toLocaleString('vi-VN')} triệu VNĐ
            </p>
          </div>

          <div className="p-4 bg-[#080600] rounded">
            <p className="text-sm text-[#9CA3AF] mb-2">ROI</p>
            <p className="text-2xl font-bold text-[#22C55E]">
              {((data.emailMetrics.conversionRate / 100) * 1000).toFixed(0)}%
            </p>
          </div>

          <div className="p-4 bg-[#080600] rounded">
            <p className="text-sm text-[#9CA3AF] mb-2">Hiệu Suất Tổng Thể</p>
            <p className="text-2xl font-bold text-[#3B82F6]">
              {((data.emailMetrics.openRate + data.emailMetrics.clickRate + data.emailMetrics.conversionRate) / 3).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
