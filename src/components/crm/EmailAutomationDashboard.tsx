'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Send, Settings, BarChart3, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface EmailStats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalConverted: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  lastRunTime: string;
  nextRunTime: string;
}

interface EmailLog {
  id: string;
  leadName: string;
  email: string;
  subject: string;
  sentAt: string;
  status: 'success' | 'failed' | 'pending';
  messageId?: string;
  error?: string;
}

export default function EmailAutomationDashboard() {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [cronEnabled, setCronEnabled] = useState(false);
  const [cronTime, setCronTime] = useState('09:00');
  const [showSettings, setShowSettings] = useState(false);
  // Tiếng Việt translations
  const t = {
    title: 'Tự Động Hoá Email',
    settings: 'Cài Đặt',
    totalSent: 'Tổng Gửi',
    openRate: 'Tỷ Lệ Mở',
    clickRate: 'Tỷ Lệ Click',
    conversionRate: 'Tỷ Lệ Chuyển Đổi',
    sendNow: 'Gửi Email Ngay',
    viewLogs: 'Xem Nhật Ký',
    cronSettings: 'Cài Đặt Cron Job',
    enableDaily: 'Bật Tự Động Hoá Email Hàng Ngày',
    scheduleTime: 'Thời Gian Lên Lịch (HH:MM)',
    saveSettings: 'Lưu Cài Đặt',
    cancel: 'Hủy',
    sending: 'Đang Gửi...',
    sendSuccess: 'Gửi Email Thành Công!',
    sendFailed: 'Gửi Email Thất Bại',
    error: 'Lỗi:',
    recentLogs: 'Nhật Ký Email Gần Đây',
    leadName: 'Tên Lead',
    email: 'Email',
    subject: 'Chủ Đề',
    status: 'Trạng Thái',
    sentAt: 'Gửi Lúc',
    success: 'Thành Công',
    failed: 'Thất Bại',
    pending: 'Chờ Xử Lý',
    howItWorks: 'Cách Hoạt Động',
    feature1: 'Tự động gửi email chào hàng cho lead mới hàng ngày',
    feature2: 'Mẫu tùy chỉnh dựa trên thông tin lead',
    feature3: 'Theo dõi tỷ lệ mở, click và chuyển đổi',
    feature4: 'Tích hợp Gmail SMTP để gửi đáng tin cậy',
    feature5: 'Nhật ký chi tiết để khắc phục sự cố',
  };

  // Fetch email statistics
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/ai-agent/email/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch email stats:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/ai-agent/email/logs');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch email logs:', error);
    }
  };

  const handleSendNow = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-agent/email/send-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test'}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        alert(`✅ Email sent successfully!\nSuccessful: ${data.data.successful}\nFailed: ${data.data.failed}`);
        fetchStats();
        fetchLogs();
      } else {
        alert('❌ Failed to send emails');
      }
    } catch (error) {
      alert('❌ Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCronSettings = async () => {
    try {
      const response = await fetch('/api/ai-agent/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailAutomation: {
            enabled: cronEnabled,
            scheduleTime: cronTime,
          },
        }),
      });

      if (response.ok) {
        alert('✅ Cron settings saved successfully!');
        setShowSettings(false);
      } else {
        alert('❌ Failed to save settings');
      }
    } catch (error) {
      alert('❌ Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="w-8 h-8 text-[#C9A84C]" />
          <h1 className="text-2xl font-bold text-white">{t.title}</h1>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-white rounded-lg hover:bg-[#B89A3C] transition"
        >
          <Settings className="w-4 h-4" />
          {t.settings}
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">{t.cronSettings}</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cronEnabled}
                  onChange={(e) => setCronEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-white">{t.enableDaily}</span>
              </label>
            </div>

            {cronEnabled && (
              <div>
                <label className="block text-sm text-[#9CA3AF] mb-2">{t.scheduleTime}</label>
                <input
                  type="time"
                  value={cronTime}
                  onChange={(e) => setCronTime(e.target.value)}
                  className="w-full px-3 py-2 bg-[#080600] border border-[#2D2500] rounded text-white"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSaveCronSettings}
                className="px-4 py-2 bg-[#C9A84C] text-white rounded hover:bg-[#B89A3C] transition"
              >
                {t.saveSettings}
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 bg-[#2D2500] text-white rounded hover:bg-[#3D3500] transition"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4">
            <div className="text-[#9CA3AF] text-sm mb-1">{t.totalSent}</div>
            <div className="text-2xl font-bold text-[#C9A84C]">{stats.totalSent}</div>
          </div>

          <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4">
            <div className="text-[#9CA3AF] text-sm mb-1">{t.openRate}</div>
            <div className="text-2xl font-bold text-[#22C55E]">{stats.openRate.toFixed(1)}%</div>
          </div>

          <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4">
            <div className="text-[#9CA3AF] text-sm mb-1">{t.clickRate}</div>
            <div className="text-2xl font-bold text-[#3B82F6]">{stats.clickRate.toFixed(1)}%</div>
          </div>

          <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4">
            <div className="text-[#9CA3AF] text-sm mb-1">{t.conversionRate}</div>
            <div className="text-2xl font-bold text-[#F59E0B]">{stats.conversionRate.toFixed(1)}%</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleSendNow}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-[#C9A84C] text-white rounded-lg hover:bg-[#B89A3C] transition disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {loading ? t.sending : t.sendNow}
        </button>

        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-6 py-3 bg-[#2D2500] text-white rounded-lg hover:bg-[#3D3500] transition"
        >
          <BarChart3 className="w-4 h-4" />
          {t.viewLogs}
        </button>
      </div>

      {/* Email Logs */}
      {logs.length > 0 && (
        <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2D2500]">
            <h2 className="text-lg font-semibold text-white">{t.recentLogs}</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#080600] border-b border-[#2D2500]">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">{t.leadName}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">{t.email}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">{t.subject}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">{t.status}</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#9CA3AF]">{t.sentAt}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#2D2500] hover:bg-[#080600]">
                    <td className="px-6 py-3 text-sm text-white">{log.leadName}</td>
                    <td className="px-6 py-3 text-sm text-[#9CA3AF]">{log.email}</td>
                    <td className="px-6 py-3 text-sm text-[#9CA3AF] truncate">{log.subject}</td>
                    <td className="px-6 py-3 text-sm">
                      {log.status === 'success' ? (
                        <span className="flex items-center gap-1 text-[#22C55E]">
                          <CheckCircle className="w-4 h-4" />
                          {t.success}
                        </span>
                      ) : log.status === 'failed' ? (
                        <span className="flex items-center gap-1 text-[#EF4444]">
                          <AlertCircle className="w-4 h-4" />
                          {t.failed}
                        </span>
                      ) : (
                        <span className="text-[#F59E0B]">{t.pending}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm text-[#9CA3AF]">{new Date(log.sentAt).toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4">
        <h3 className="font-semibold text-white mb-2">ℹ️ {t.howItWorks}</h3>
        <ul className="text-sm text-[#9CA3AF] space-y-1">
          <li>✓ {t.feature1}</li>
          <li>✓ {t.feature2}</li>
          <li>✓ {t.feature3}</li>
          <li>✓ {t.feature4}</li>
          <li>✓ {t.feature5}</li>
        </ul>
      </div>
    </div>
  );
}
