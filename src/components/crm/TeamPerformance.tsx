'use client';

import React from 'react';
import { Trophy, Award, Star, Flame, Target } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
  leadsCount: number;
  dealsWon: number;
  totalValue: number;
  conversionRate: number;
  streak?: number;
  badges?: string[];
}

interface TeamPerformanceProps {
  teamMembers: TeamMember[];
}

const badges: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  top_performer: {
    icon: <Trophy className="w-4 h-4" />,
    color: 'bg-yellow-100 text-yellow-700',
    label: 'Top Performer',
  },
  high_conversion: {
    icon: <Target className="w-4 h-4" />,
    color: 'bg-green-100 text-green-700',
    label: 'High Conversion',
  },
  hot_streak: {
    icon: <Flame className="w-4 h-4" />,
    color: 'bg-red-100 text-red-700',
    label: 'Hot Streak',
  },
  rising_star: {
    icon: <Star className="w-4 h-4" />,
    color: 'bg-blue-100 text-blue-700',
    label: 'Rising Star',
  },
};

export default function TeamPerformance({ teamMembers }: TeamPerformanceProps) {
  const sortedMembers = [...teamMembers].sort((a, b) => b.totalValue - a.totalValue);

  return (
    <div className="space-y-6">
      {/* Leaderboard */}
      <div className="bg-[rgba(255,255,255,0.07)] rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-6 h-6" />
            Bảng Xếp Hạng Nhân Viên
          </h2>
        </div>

        <div className="divide-y divide-[rgba(255,255,255,0.08)]">
          {sortedMembers.map((member, index) => (
            <div
              key={member.id}
              className={`p-6 hover:bg-[rgba(255,255,255,0.05)] transition-colors ${
                index === 0 ? 'bg-yellow-50' : index === 1 ? 'bg-gray-50' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0
                        ? 'bg-yellow-400 text-white'
                        : index === 1
                        ? 'bg-gray-400 text-white'
                        : index === 2
                        ? 'bg-orange-400 text-white'
                        : 'bg-gray-300 text-white'
                    }`}
                  >
                    {index + 1}
                  </div>
                </div>

                {/* Member Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-gray-900 text-lg">{member.name}</h3>
                    {member.streak && member.streak > 0 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                        <Flame className="w-3 h-3" />
                        {member.streak} ngày
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  {member.badges && member.badges.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {member.badges.map((badge) => {
                        const badgeInfo = badges[badge];
                        return (
                          <div
                            key={badge}
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badgeInfo.color}`}
                            title={badgeInfo.label}
                          >
                            {badgeInfo.icon}
                            {badgeInfo.label}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Leads</p>
                      <p className="font-bold text-gray-900">{member.leadsCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Chốt Được</p>
                      <p className="font-bold text-green-600">{member.dealsWon}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Tỷ Lệ</p>
                      <p className="font-bold text-blue-600">{member.conversionRate}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Tổng Giá Trị</p>
                      <p className="font-bold text-purple-600">
                        {(member.totalValue / 1_000_000).toFixed(1)}M
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="flex-shrink-0 w-24">
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(member.totalValue / sortedMembers[0].totalValue) * 100}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    {Math.round((member.totalValue / sortedMembers[0].totalValue) * 100)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Badges Info */}
      <div className="bg-[rgba(255,255,255,0.07)] rounded-xl border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">🏆 Huy Hiệu Thành Tích</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(badges).map(([key, badge]) => (
            <div key={key} className={`p-4 rounded-lg border-2 ${badge.color}`}>
              <div className="flex items-center gap-2 mb-2">
                {badge.icon}
                <span className="font-semibold">{badge.label}</span>
              </div>
              <p className="text-sm opacity-75">
                {key === 'top_performer' && 'Doanh số cao nhất trong tháng'}
                {key === 'high_conversion' && 'Tỷ lệ chốt đơn trên 30%'}
                {key === 'hot_streak' && 'Liên tiếp chốt đơn 5 ngày'}
                {key === 'rising_star' && 'Tăng trưởng nhanh nhất'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Team Goals */}
      <div className="bg-[rgba(255,255,255,0.07)] rounded-xl border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 Mục Tiêu Nhóm</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Tổng Doanh Số</span>
              <span className="text-sm font-bold text-gray-600">
                {sortedMembers.reduce((sum, m) => sum + m.totalValue, 0) / 1_000_000_000}B / 10B ₫
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (sortedMembers.reduce((sum, m) => sum + m.totalValue, 0) / 10_000_000_000) * 100,
                    100
                  )}%`,
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Tổng Đơn Chốt</span>
              <span className="text-sm font-bold text-gray-600">
                {sortedMembers.reduce((sum, m) => sum + m.dealsWon, 0)} / 50 đơn
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    (sortedMembers.reduce((sum, m) => sum + m.dealsWon, 0) / 50) * 100,
                    100
                  )}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
