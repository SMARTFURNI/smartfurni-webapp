'use client';

import React, { useState, useEffect } from 'react';
import { TrendingUp, Mail, ExternalLink, Target, DollarSign, Download, RefreshCw } from 'lucide-react';

interface PerformanceData {
  campaignName: string;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  totalRevenue: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  roi: number;
}

export default function EmailPerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '2026-04-01',
    endDate: '2026-04-07',
  });

  // Tiếng Việt translations
  const t = {
    title: 'Báo Cáo Hiệu Suất Email',
    loading: 'Đang tải...',
    refresh: 'Làm Mới',
    download: 'Tải Xuống',
    campaign: 'Chiến Dịch',
    totalSent: 'Tổng Gửi',
    totalOpened: 'Tổng Mở',
    totalClicked: 'Tổng Click',
    totalConverted: 'Tổng Chuyển Đổi',
    totalRevenue: 'Tổng Doanh Thu',
    openRate: 'Tỷ Lệ Mở',
    clickRate: 'Tỷ Lệ Click',
    conversionRate: 'Tỷ Lệ Chuyển Đổi',
    roi: 'ROI',
    startDate: 'Ngày Bắt Đầu',
    endDate: 'Ngày Kết Thúc',
    generate: 'Tạo Báo Cáo',
  };

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/ai-agent/email/performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      if (response.ok) {
        const result = await response.json();
        if (result.data.campaigns && result.data.campaigns.length > 0) {
          setData(result.data.campaigns[0]);
        }
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(
        `/api/ai-agent/email/performance?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&format=${format}`
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `email-performance-report.${format}`;
      a.click();
    } catch (error) {
      console.error('Lỗi khi tải báo cáo:', error);
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6">
        <div className="text-center text-[#9CA3AF]">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.title}</h1>
        <div className="flex gap-2">
          <button
            onClick={fetchPerformanceData}
            className="flex items-center gap-2 px-4 py-2 bg-[#2D2500] text-white rounded-lg hover:bg-[#3D3500] transition"
          >
            <RefreshCw className="w-4 h-4" />
            {t.refresh}
          </button>
          <button
            onClick={() => downloadReport('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-white rounded-lg hover:bg-[#B89A3C] transition"
          >
            <Download className="w-4 h-4" />
            {t.download}
          </button>
        </div>
      </div>

      {/* Date Range */}
      <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4 flex gap-4">
        <div>
          <label className="text-xs text-[#9CA3AF] uppercase font-semibold">{t.startDate}</label>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="mt-1 px-3 py-2 bg-[#080600] border border-[#2D2500] text-white rounded"
          />
        </div>
        <div>
          <label className="text-xs text-[#9CA3AF] uppercase font-semibold">{t.endDate}</label>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="mt-1 px-3 py-2 bg-[#080600] border border-[#2D2500] text-white rounded"
          />
        </div>
        <button
          onClick={fetchPerformanceData}
          className="mt-6 px-4 py-2 bg-[#C9A84C] text-white rounded hover:bg-[#B89A3C] transition"
        >
          {t.generate}
        </button>
      </div>

      {data && (
        <>
          {/* Campaign Name */}
          <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white">{data.campaignName}</h2>
          </div>

          {/* Main Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Sent */}
            <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase font-semibold">{t.totalSent}</p>
                  <p className="text-2xl font-bold text-white mt-2">{data.totalSent.toLocaleString('vi-VN')}</p>
                </div>
                <Mail className="w-8 h-8 text-[#C9A84C]" />
              </div>
            </div>

            {/* Total Opened */}
            <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase font-semibold">{t.totalOpened}</p>
                  <p className="text-2xl font-bold text-[#22C55E] mt-2">{data.totalOpened.toLocaleString('vi-VN')}</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">{data.openRate.toFixed(1)}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#22C55E]" />
              </div>
            </div>

            {/* Total Clicked */}
            <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase font-semibold">{t.totalClicked}</p>
                  <p className="text-2xl font-bold text-[#3B82F6] mt-2">{data.totalClicked.toLocaleString('vi-VN')}</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">{data.clickRate.toFixed(1)}%</p>
                </div>
                <ExternalLink className="w-8 h-8 text-[#3B82F6]" />
              </div>
            </div>

            {/* Total Converted */}
            <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase font-semibold">{t.totalConverted}</p>
                  <p className="text-2xl font-bold text-[#F59E0B] mt-2">{data.totalConverted.toLocaleString('vi-VN')}</p>
                  <p className="text-xs text-[#9CA3AF] mt-1">{data.conversionRate.toFixed(1)}%</p>
                </div>
                <Target className="w-8 h-8 text-[#F59E0B]" />
              </div>
            </div>
          </div>

          {/* Revenue & ROI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Total Revenue */}
            <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase font-semibold">{t.totalRevenue}</p>
                  <p className="text-2xl font-bold text-[#22C55E] mt-2">
                    {(data.totalRevenue / 1000000000).toFixed(2)} Tỷ VNĐ
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-[#22C55E]" />
              </div>
            </div>

            {/* ROI */}
            <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#9CA3AF] uppercase font-semibold">{t.roi}</p>
                  <p className="text-2xl font-bold text-[#22C55E] mt-2">{data.roi.toLocaleString('vi-VN')}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-[#22C55E]" />
              </div>
            </div>
          </div>

          {/* Performance Metrics Table */}
          <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#080600] border-b border-[#2D2500]">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">Chỉ Số</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">Giá Trị</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">Mục Tiêu</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#2D2500] hover:bg-[#080600] transition">
                    <td className="px-6 py-3 text-sm text-white">{t.openRate}</td>
                    <td className="px-6 py-3 text-sm font-bold text-[#22C55E]">{data.openRate.toFixed(1)}%</td>
                    <td className="px-6 py-3 text-sm text-[#9CA3AF]">50%+</td>
                    <td className="px-6 py-3 text-sm">
                      <span className="px-2 py-1 bg-[#22C55E] bg-opacity-20 text-[#22C55E] rounded text-xs font-semibold">
                        ✓ Tốt
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-[#2D2500] hover:bg-[#080600] transition">
                    <td className="px-6 py-3 text-sm text-white">{t.clickRate}</td>
                    <td className="px-6 py-3 text-sm font-bold text-[#3B82F6]">{data.clickRate.toFixed(1)}%</td>
                    <td className="px-6 py-3 text-sm text-[#9CA3AF]">30%+</td>
                    <td className="px-6 py-3 text-sm">
                      <span className="px-2 py-1 bg-[#22C55E] bg-opacity-20 text-[#22C55E] rounded text-xs font-semibold">
                        ✓ Tốt
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-[#2D2500] hover:bg-[#080600] transition">
                    <td className="px-6 py-3 text-sm text-white">{t.conversionRate}</td>
                    <td className="px-6 py-3 text-sm font-bold text-[#F59E0B]">{data.conversionRate.toFixed(1)}%</td>
                    <td className="px-6 py-3 text-sm text-[#9CA3AF]">5%+</td>
                    <td className="px-6 py-3 text-sm">
                      <span className="px-2 py-1 bg-[#22C55E] bg-opacity-20 text-[#22C55E] rounded text-xs font-semibold">
                        ✓ Tốt
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-[#080600] transition">
                    <td className="px-6 py-3 text-sm text-white">{t.roi}</td>
                    <td className="px-6 py-3 text-sm font-bold text-[#22C55E]">{data.roi.toLocaleString('vi-VN')}%</td>
                    <td className="px-6 py-3 text-sm text-[#9CA3AF]">100%+</td>
                    <td className="px-6 py-3 text-sm">
                      <span className="px-2 py-1 bg-[#22C55E] bg-opacity-20 text-[#22C55E] rounded text-xs font-semibold">
                        ✓ Xuất Sắc
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
