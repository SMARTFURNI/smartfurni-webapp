'use client';

import React from 'react';
import { Phone, Mail, MessageSquare, FileText, CheckCircle2, User } from 'lucide-react';

interface Activity {
  id: string;
  type: 'call' | 'email' | 'message' | 'note' | 'deal_won';
  title: string;
  description: string;
  timestamp: string;
  user: string;
  avatar?: string;
}

interface ActivityFeedTimelineProps {
  activities: Activity[];
}

const activityIcons: Record<string, React.ReactNode> = {
  call: <Phone className="w-5 h-5" />,
  email: <Mail className="w-5 h-5" />,
  message: <MessageSquare className="w-5 h-5" />,
  note: <FileText className="w-5 h-5" />,
  deal_won: <CheckCircle2 className="w-5 h-5" />,
};

const activityColors: Record<string, string> = {
  call: 'bg-green-100 text-green-600',
  email: 'bg-purple-100 text-purple-600',
  message: 'bg-blue-100 text-blue-600',
  note: 'bg-yellow-100 text-yellow-600',
  deal_won: 'bg-emerald-100 text-emerald-600',
};

const getRelativeTime = (timestamp: string) => {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Vừa xong';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
};

export default function ActivityFeedTimeline({
  activities,
}: ActivityFeedTimelineProps) {
  if (activities.length === 0) {
    return (
      <div className="bg-[rgba(255,255,255,0.07)] rounded-xl border border-gray-200 p-12 text-center">
        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Không có tương tác nào được ghi lại</p>
        <p className="text-gray-500 text-sm mt-1">Bắt đầu ghi lại các tương tác với khách hàng</p>
      </div>
    );
  }

  return (
    <div className="bg-[rgba(255,255,255,0.07)] rounded-xl border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Lịch Sử Tương Tác</h2>

      <div className="space-y-6">
        {activities.map((activity, index) => (
          <div key={activity.id} className="flex gap-4">
            {/* Timeline Line */}
            <div className="flex flex-col items-center">
              {/* Icon */}
              <div className={`p-3 rounded-full ${activityColors[activity.type]} transition-all duration-200 hover:scale-110`}>
                {activityIcons[activity.type]}
              </div>

              {/* Line */}
              {index < activities.length - 1 && (
                <div className="w-1 h-12 bg-gradient-to-b from-gray-300 to-gray-200 my-2"></div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <div className="bg-[rgba(255,255,255,0.04)] rounded-lg p-4 hover:bg-[rgba(255,255,255,0.08)] transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap ml-4">
                    {getRelativeTime(activity.timestamp)}
                  </span>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                  {activity.avatar ? (
                    <img
                      src={activity.avatar}
                      alt={activity.user}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-3 h-3 text-blue-600" />
                    </div>
                  )}
                  <span className="text-sm text-gray-700 font-medium">{activity.user}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
