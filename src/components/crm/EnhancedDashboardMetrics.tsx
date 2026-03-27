'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Users, DollarSign, Target, AlertCircle } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient: string;
  backgroundColor: string;
  iconBgColor: string;
}

function MetricCard({
  title,
  value,
  unit,
  icon,
  trend,
  gradient,
  backgroundColor,
  iconBgColor,
}: MetricCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-gray-200 p-6 transition-all duration-300 hover:shadow-lg hover:border-gray-300 ${backgroundColor}`}>
      {/* Gradient Background */}
      <div className={`absolute inset-0 ${gradient} opacity-5`}></div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-gray-900">{value}</h3>
              {unit && <span className="text-sm text-gray-500">{unit}</span>}
            </div>
          </div>

          {/* Icon */}
          <div className={`p-3 rounded-lg ${iconBgColor}`}>
            <div className={`w-6 h-6 ${gradient} bg-clip-text text-transparent`}>
              {icon}
            </div>
          </div>
        </div>

        {/* Trend */}
        {trend && (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
              trend.isPositive
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-semibold">
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </span>
            </div>
            <span className="text-xs text-gray-500">vs tháng trước</span>
          </div>
        )}
      </div>

      {/* Mini Chart Background */}
      <div className="absolute bottom-0 right-0 w-24 h-16 opacity-10">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <polyline
            points="0,40 20,30 40,35 60,20 80,25 100,10"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}

interface EnhancedDashboardMetricsProps {
  totalCustomers: number;
  totalValue: number;
  conversionRate: number;
  overdueLead: number;
  customersTrend?: number;
  valueTrend?: number;
  conversionTrend?: number;
}

export default function EnhancedDashboardMetrics({
  totalCustomers,
  totalValue,
  conversionRate,
  overdueLead,
  customersTrend = 12,
  valueTrend = 8,
  conversionTrend = -3,
}: EnhancedDashboardMetricsProps) {
  const formatVND = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    return `${value}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Customers */}
      <MetricCard
        title="Tổng Khách Hàng"
        value={totalCustomers}
        unit="leads"
        icon={<Users className="w-6 h-6" />}
        trend={{
          value: customersTrend,
          isPositive: customersTrend >= 0,
        }}
        gradient="bg-gradient-to-br from-blue-500 to-cyan-500"
        backgroundColor="bg-gradient-to-br from-blue-50 to-cyan-50"
        iconBgColor="bg-blue-100"
      />

      {/* Total Value */}
      <MetricCard
        title="Tổng Giá Trị"
        value={formatVND(totalValue)}
        unit="₫"
        icon={<DollarSign className="w-6 h-6" />}
        trend={{
          value: valueTrend,
          isPositive: valueTrend >= 0,
        }}
        gradient="bg-gradient-to-br from-green-500 to-emerald-500"
        backgroundColor="bg-gradient-to-br from-green-50 to-emerald-50"
        iconBgColor="bg-green-100"
      />

      {/* Conversion Rate */}
      <MetricCard
        title="Tỷ Lệ Chốt Đơn"
        value={conversionRate}
        unit="%"
        icon={<Target className="w-6 h-6" />}
        trend={{
          value: conversionTrend,
          isPositive: conversionTrend >= 0,
        }}
        gradient="bg-gradient-to-br from-purple-500 to-pink-500"
        backgroundColor="bg-gradient-to-br from-purple-50 to-pink-50"
        iconBgColor="bg-purple-100"
      />

      {/* Overdue Leads */}
      <MetricCard
        title="Cần Liên Hệ Ngay"
        value={overdueLead}
        unit="leads"
        icon={<AlertCircle className="w-6 h-6" />}
        gradient="bg-gradient-to-br from-red-500 to-orange-500"
        backgroundColor="bg-gradient-to-br from-red-50 to-orange-50"
        iconBgColor="bg-red-100"
      />
    </div>
  );
}
