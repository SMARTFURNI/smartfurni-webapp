'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface AutomationConfig {
  enabled: boolean;
  scheduleTime: string;
  timezone: string;
  emailTemplate: string;
  retryCount: number;
  retryDelay: number;
}

interface AutomationStats {
  totalRuns: number;
  totalLeads: number;
  totalSent: number;
  totalFailed: number;
  successRate: number;
  lastRun: string | null;
}

export default function EmailAutomationSettings() {
  const [config, setConfig] = useState<AutomationConfig>({
    enabled: true,
    scheduleTime: '09:00',
    timezone: 'Asia/Ho_Chi_Minh',
    emailTemplate: 'default',
    retryCount: 3,
    retryDelay: 5000,
  });

  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tiếng Việt translations
  const t = {
    title: 'Cài Đặt Tự Động Hoá Email Hàng Ngày',
    enabled: 'Bật Tự Động Hoá',
    scheduleTime: 'Thời Gian Lên Lịch',
    timezone: 'Múi Giờ',
    emailTemplate: 'Mẫu Email',
    retryCount: 'Số Lần Thử Lại',
    retryDelay: 'Độ Trễ Thử Lại (ms)',
    save: 'Lưu Cài Đặt',
    cancel: 'Hủy',
    loading: 'Đang tải...',
    saving: 'Đang lưu...',
    saveSuccess: 'Cài đặt đã được lưu thành công!',
    saveFailed: 'Lỗi khi lưu cài đặt',
    stats: 'Thống Kê Tự Động Hoá',
    totalRuns: 'Tổng Lần Chạy',
    totalLeads: 'Tổng Lead',
    totalSent: 'Tổng Gửi',
    totalFailed: 'Tổng Thất Bại',
    successRate: 'Tỷ Lệ Thành Công',
    lastRun: 'Lần Chạy Cuối',
    runNow: 'Chạy Ngay Bây Giờ',
    running: 'Đang chạy...',
    runSuccess: 'Chạy tự động hoá thành công!',
    runFailed: 'Lỗi khi chạy tự động hoá',
    never: 'Chưa chạy',
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-agent/email/run-daily');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.data.config);
        setStats(data.data.stats);
      }
    } catch (error) {
      console.error('Lỗi khi tải cấu hình:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/ai-agent/email/run-daily', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: t.saveSuccess });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: t.saveFailed });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t.saveFailed });
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/ai-agent/email/run-daily', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'test'}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: `${t.runSuccess} (${data.data.successful}/${data.data.totalLeads} thành công)`,
        });
        setTimeout(() => {
          setMessage(null);
          fetchConfig();
        }, 3000);
      } else {
        setMessage({ type: 'error', text: t.runFailed });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t.runFailed });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6">
        <div className="text-center text-[#9CA3AF]">{t.loading}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Thông báo */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-[#22C55E] bg-opacity-10 border border-[#22C55E] text-[#22C55E]'
              : 'bg-[#EF4444] bg-opacity-10 border border-[#EF4444] text-[#EF4444]'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Cài Đặt */}
      <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-[#C9A84C]" />
          <h2 className="text-lg font-semibold text-white">{t.title}</h2>
        </div>

        <div className="space-y-4">
          {/* Bật/Tắt */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-white">{t.enabled}</span>
            </label>
            <span className={`px-3 py-1 rounded text-xs font-semibold ${
              config.enabled
                ? 'bg-[#22C55E] text-white'
                : 'bg-[#6B7280] text-white'
            }`}>
              {config.enabled ? 'Bật' : 'Tắt'}
            </span>
          </div>

          {/* Thời Gian Lên Lịch */}
          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">{t.scheduleTime}</label>
            <input
              type="time"
              value={config.scheduleTime}
              onChange={(e) => setConfig({ ...config, scheduleTime: e.target.value })}
              className="w-full px-3 py-2 bg-[#080600] border border-[#2D2500] rounded text-white"
            />
            <p className="text-xs text-[#9CA3AF] mt-1">
              Mỗi ngày lúc {config.scheduleTime} (Múi giờ: {config.timezone})
            </p>
          </div>

          {/* Múi Giờ */}
          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">{t.timezone}</label>
            <select
              value={config.timezone}
              onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
              className="w-full px-3 py-2 bg-[#080600] border border-[#2D2500] rounded text-white"
            >
              <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</option>
              <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
              <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          {/* Mẫu Email */}
          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">{t.emailTemplate}</label>
            <select
              value={config.emailTemplate}
              onChange={(e) => setConfig({ ...config, emailTemplate: e.target.value })}
              className="w-full px-3 py-2 bg-[#080600] border border-[#2D2500] rounded text-white"
            >
              <option value="default">Mẫu Mặc Định</option>
              <option value="welcome">Chào Mừng</option>
              <option value="followup">Follow-up</option>
              <option value="special_offer">Ưu Đãi Đặc Biệt</option>
            </select>
          </div>

          {/* Số Lần Thử Lại */}
          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">{t.retryCount}</label>
            <input
              type="number"
              min="1"
              max="10"
              value={config.retryCount}
              onChange={(e) => setConfig({ ...config, retryCount: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-[#080600] border border-[#2D2500] rounded text-white"
            />
          </div>

          {/* Độ Trễ Thử Lại */}
          <div>
            <label className="block text-sm text-[#9CA3AF] mb-2">{t.retryDelay}</label>
            <input
              type="number"
              min="1000"
              step="1000"
              value={config.retryDelay}
              onChange={(e) => setConfig({ ...config, retryDelay: parseInt(e.target.value) })}
              className="w-full px-3 py-2 bg-[#080600] border border-[#2D2500] rounded text-white"
            />
            <p className="text-xs text-[#9CA3AF] mt-1">Độ trễ giữa các lần thử (mili giây)</p>
          </div>

          {/* Nút Hành Động */}
          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#C9A84C] text-white rounded hover:bg-[#B89A3C] transition disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? t.saving : t.save}
            </button>
            <button
              onClick={handleRunNow}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#3B82F6] text-white rounded hover:bg-[#2563EB] transition disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
              {saving ? t.running : t.runNow}
            </button>
          </div>
        </div>
      </div>

      {/* Thống Kê */}
      {stats && (
        <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">{t.stats}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-[#080600] p-4 rounded">
              <div className="text-xs text-[#9CA3AF] mb-1">{t.totalRuns}</div>
              <div className="text-2xl font-bold text-[#C9A84C]">{stats.totalRuns}</div>
            </div>
            <div className="bg-[#080600] p-4 rounded">
              <div className="text-xs text-[#9CA3AF] mb-1">{t.totalLeads}</div>
              <div className="text-2xl font-bold text-[#3B82F6]">{stats.totalLeads}</div>
            </div>
            <div className="bg-[#080600] p-4 rounded">
              <div className="text-xs text-[#9CA3AF] mb-1">{t.totalSent}</div>
              <div className="text-2xl font-bold text-[#22C55E]">{stats.totalSent}</div>
            </div>
            <div className="bg-[#080600] p-4 rounded">
              <div className="text-xs text-[#9CA3AF] mb-1">{t.totalFailed}</div>
              <div className="text-2xl font-bold text-[#EF4444]">{stats.totalFailed}</div>
            </div>
            <div className="bg-[#080600] p-4 rounded">
              <div className="text-xs text-[#9CA3AF] mb-1">{t.successRate}</div>
              <div className="text-2xl font-bold text-[#F59E0B]">{stats.successRate.toFixed(1)}%</div>
            </div>
            <div className="bg-[#080600] p-4 rounded">
              <div className="text-xs text-[#9CA3AF] mb-1">{t.lastRun}</div>
              <div className="text-sm font-semibold text-white">
                {stats.lastRun ? new Date(stats.lastRun).toLocaleString('vi-VN') : t.never}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
