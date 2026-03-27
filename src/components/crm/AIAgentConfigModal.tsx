'use client';

import React, { useState } from 'react';
import { X, Save, AlertCircle, CheckCircle } from 'lucide-react';

interface AIAgentConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AIAgentConfigModal: React.FC<AIAgentConfigModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'gemini' | 'email' | 'zalo' | 'facebook'>('gemini');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [config, setConfig] = useState({
    gemini: {
      apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
      model: 'gemini-2.5-flash',
    },
    email: {
      provider: 'gmail',
      email: process.env.NEXT_PUBLIC_GMAIL_EMAIL || '',
      appPassword: '',
    },
    zalo: {
      oaId: process.env.NEXT_PUBLIC_ZALO_OA_ID || '',
      accessToken: '',
      secretKey: '',
    },
    facebook: {
      appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '',
      appSecret: '',
      accessToken: '',
      pageId: '',
    },
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      // Validate required fields
      if (!config.gemini.apiKey) {
        setMessage({ type: 'error', text: 'Vui lòng nhập Gemini API Key' });
        setLoading(false);
        return;
      }

      if (!config.email.email || !config.email.appPassword) {
        setMessage({ type: 'error', text: 'Vui lòng nhập Email và App Password' });
        setLoading(false);
        return;
      }

      if (!config.zalo.oaId || !config.zalo.accessToken) {
        setMessage({ type: 'error', text: 'Vui lòng nhập Zalo OA ID và Access Token' });
        setLoading(false);
        return;
      }

      if (!config.facebook.appId || !config.facebook.appSecret) {
        setMessage({ type: 'error', text: 'Vui lòng nhập Facebook App ID và App Secret' });
        setLoading(false);
        return;
      }

      // Call API to save configuration
      const response = await fetch('/api/ai-agent/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Cấu hình đã được lưu thành công! ✅' });
        setTimeout(() => {
          onClose();
          setMessage(null);
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Lỗi khi lưu cấu hình. Vui lòng thử lại.' });
      }
    } catch (error) {
      console.error('Config save error:', error);
      setMessage({ type: 'error', text: 'Lỗi kết nối. Vui lòng kiểm tra kết nối mạng.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">⚙️ Cấu Hình AI Agent</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {['gemini', 'email', 'zalo', 'facebook'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3 px-4 font-medium transition-all ${
                activeTab === tab
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'gemini' && '🤖 Gemini'}
              {tab === 'email' && '📧 Email'}
              {tab === 'zalo' && '💬 Zalo'}
              {tab === 'facebook' && '📱 Facebook'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6">
          {message && (
            <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              {message.text}
            </div>
          )}

          {/* Gemini Config */}
          {activeTab === 'gemini' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                <input
                  type="password"
                  value={config.gemini.apiKey}
                  onChange={(e) => setConfig({
                    ...config,
                    gemini: { ...config.gemini, apiKey: e.target.value }
                  })}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                <select
                  value={config.gemini.model}
                  onChange={(e) => setConfig({
                    ...config,
                    gemini: { ...config.gemini, model: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
              </div>
            </div>
          )}

          {/* Email Config */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Provider</label>
                <select
                  value={config.email.provider}
                  onChange={(e) => setConfig({
                    ...config,
                    email: { ...config.email, provider: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gmail">Gmail</option>
                  <option value="sendgrid">SendGrid</option>
                  <option value="smtp">SMTP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={config.email.email}
                  onChange={(e) => setConfig({
                    ...config,
                    email: { ...config.email, email: e.target.value }
                  })}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">App Password / API Key</label>
                <input
                  type="password"
                  value={config.email.appPassword}
                  onChange={(e) => setConfig({
                    ...config,
                    email: { ...config.email, appPassword: e.target.value }
                  })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Zalo Config */}
          {activeTab === 'zalo' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">OA ID</label>
                <input
                  type="text"
                  value={config.zalo.oaId}
                  onChange={(e) => setConfig({
                    ...config,
                    zalo: { ...config.zalo, oaId: e.target.value }
                  })}
                  placeholder="425759988..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Access Token</label>
                <input
                  type="password"
                  value={config.zalo.accessToken}
                  onChange={(e) => setConfig({
                    ...config,
                    zalo: { ...config.zalo, accessToken: e.target.value }
                  })}
                  placeholder="T_kwDwRn4HXs..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                <input
                  type="password"
                  value={config.zalo.secretKey}
                  onChange={(e) => setConfig({
                    ...config,
                    zalo: { ...config.zalo, secretKey: e.target.value }
                  })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Facebook Config */}
          {activeTab === 'facebook' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">App ID</label>
                <input
                  type="text"
                  value={config.facebook.appId}
                  onChange={(e) => setConfig({
                    ...config,
                    facebook: { ...config.facebook, appId: e.target.value }
                  })}
                  placeholder="908939712046888"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">App Secret</label>
                <input
                  type="password"
                  value={config.facebook.appSecret}
                  onChange={(e) => setConfig({
                    ...config,
                    facebook: { ...config.facebook, appSecret: e.target.value }
                  })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Access Token</label>
                <input
                  type="password"
                  value={config.facebook.accessToken}
                  onChange={(e) => setConfig({
                    ...config,
                    facebook: { ...config.facebook, accessToken: e.target.value }
                  })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Page ID</label>
                <input
                  type="text"
                  value={config.facebook.pageId}
                  onChange={(e) => setConfig({
                    ...config,
                    facebook: { ...config.facebook, pageId: e.target.value }
                  })}
                  placeholder="123456789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-all"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={18} />
            {loading ? 'Đang lưu...' : 'Lưu Cấu Hình'}
          </button>
        </div>
      </div>
    </div>
  );
};
