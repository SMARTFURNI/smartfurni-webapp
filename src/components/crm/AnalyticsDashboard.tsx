'use client';

import React from 'react';
import { BarChart3, TrendingUp, Users, Target } from 'lucide-react';

interface AnalyticsDashboardProps {
  salesFunnel: {
    new: number;
    interested: number;
    proposal: number;
    negotiation: number;
    won: number;
  };
  conversionBySource: Array<{
    source: string;
    leads: number;
    converted: number;
    rate: number;
  }>;
  averageDealSize: number;
  salesCycleAverage: number;
}

export default function AnalyticsDashboard({
  salesFunnel,
  conversionBySource,
  averageDealSize,
  salesCycleAverage,
}: AnalyticsDashboardProps) {
  const funnelStages = [
    { label: 'Lead Mới', value: salesFunnel.new, color: 'bg-blue-500', width: 100 },
    { label: 'Quan Tâm', value: salesFunnel.interested, color: 'bg-purple-500', width: (salesFunnel.interested / salesFunnel.new) * 100 },
    { label: 'Báo Giá', value: salesFunnel.proposal, color: 'bg-yellow-500', width: (salesFunnel.proposal / salesFunnel.new) * 100 },
    { label: 'Đàm Phán', value: salesFunnel.negotiation, color: 'bg-orange-500', width: (salesFunnel.negotiation / salesFunnel.new) * 100 },
    { label: 'Đã Chốt', value: salesFunnel.won, color: 'bg-green-500', width: (salesFunnel.won / salesFunnel.new) * 100 },
  ];

  return (
    <div className="space-y-6">
      {/* Sales Funnel */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Sales Funnel</h2>

        <div className="space-y-4">
          {funnelStages.map((stage, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{stage.label}</span>
                <span className="text-sm font-semibold text-gray-600">{stage.value} leads</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                <div
                  className={`h-full ${stage.color} transition-all duration-500 flex items-center justify-end pr-3`}
                  style={{ width: `${Math.max(stage.width, 10)}%` }}
                >
                  {stage.width > 15 && (
                    <span className="text-white text-sm font-bold">{Math.round(stage.width)}%</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Funnel Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600">Tổng Lead</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{salesFunnel.new}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Tỷ Lệ Chốt</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {((salesFunnel.won / salesFunnel.new) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Trung Bình Deal</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {(averageDealSize / 1_000_000).toFixed(1)}M
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Chu Kỳ Bán</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{salesCycleAverage} ngày</p>
          </div>
        </div>
      </div>

      {/* Conversion by Source */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">📈 Tỷ Lệ Chốt Theo Nguồn</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Nguồn</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">Leads</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">Chốt Được</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">Tỷ Lệ</th>
              </tr>
            </thead>
            <tbody>
              {conversionBySource.map((source, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-900">{source.source}</td>
                  <td className="py-3 px-4 text-center text-gray-700">{source.leads}</td>
                  <td className="py-3 px-4 text-center text-gray-700">{source.converted}</td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${source.rate}%` }}
                        ></div>
                      </div>
                      <span className="font-semibold text-gray-900 w-12 text-right">{source.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Average Deal Size */}
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Trung Bình Deal</h3>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{(averageDealSize / 1_000_000).toFixed(1)}M</p>
          <p className="text-sm text-gray-600 mt-2">₫ trên mỗi đơn</p>
        </div>

        {/* Sales Cycle */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Chu Kỳ Bán</h3>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{salesCycleAverage}</p>
          <p className="text-sm text-gray-600 mt-2">ngày trung bình</p>
        </div>

        {/* Conversion Rate */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Tỷ Lệ Chốt</h3>
            <div className="p-3 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {((salesFunnel.won / salesFunnel.new) * 100).toFixed(1)}%
          </p>
          <p className="text-sm text-gray-600 mt-2">tổng số leads</p>
        </div>
      </div>
    </div>
  );
}
