'use client';

import { useState } from 'react';
import { X, Send, Smartphone, Monitor } from 'lucide-react';

interface SendTestEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateHtml: string;
  subject: string;
  variables?: Record<string, string>;
}

export default function SendTestEmailModal({
  isOpen,
  onClose,
  templateHtml,
  subject,
  variables = {},
}: SendTestEmailModalProps) {
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      setMessage('❌ Vui lòng nhập email test');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/email-marketing/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail,
          templateHtml,
          subject,
          variables,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage(`✅ Email test đã được gửi đến ${testEmail}`);
        setTestEmail('');
        setTimeout(() => {
          onClose();
          setMessage('');
        }, 2000);
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ Lỗi gửi email test');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
      <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-[#2D2500]">
          <h2 className="text-2xl font-bold text-[#C9A84C]">🧪 Gửi Email Test</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Input */}
          <div>
            <label className="block text-[#C9A84C] font-semibold mb-2">
              Email Test
            </label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Nhập email để nhận email test"
              className="w-full bg-[#080600] border border-[#2D2500] rounded px-4 py-2 text-white placeholder-gray-500"
            />
            <p className="text-gray-400 text-xs mt-2">
              💡 Gửi email test đến địa chỉ của bạn để kiểm tra hiển thị trước khi chạy chiến dịch thật
            </p>
          </div>

          {/* Preview Mode */}
          <div>
            <label className="block text-[#C9A84C] font-semibold mb-2">
              Xem Trước
            </label>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPreviewMode('mobile')}
                className={`flex items-center gap-2 px-4 py-2 rounded font-semibold transition ${
                  previewMode === 'mobile'
                    ? 'bg-[#C9A84C] text-white'
                    : 'bg-[#2D2500] text-gray-400 hover:text-white'
                }`}
              >
                <Smartphone size={18} /> Mobile
              </button>
              <button
                onClick={() => setPreviewMode('desktop')}
                className={`flex items-center gap-2 px-4 py-2 rounded font-semibold transition ${
                  previewMode === 'desktop'
                    ? 'bg-[#C9A84C] text-white'
                    : 'bg-[#2D2500] text-gray-400 hover:text-white'
                }`}
              >
                <Monitor size={18} /> Desktop
              </button>
            </div>

            {/* Preview */}
            <div
              className={`bg-white rounded overflow-hidden border border-[#2D2500] ${
                previewMode === 'mobile' ? 'max-w-sm mx-auto' : ''
              }`}
            >
              <div className="bg-gray-200 px-4 py-2 text-xs text-gray-600">
                <p className="font-semibold">Tiêu đề: {subject}</p>
              </div>
              <div
                className="p-4 text-black text-sm max-h-64 overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: templateHtml }}
              />
            </div>
          </div>

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded text-sm ${
                message.includes('✅')
                  ? 'bg-green-900 text-green-200'
                  : 'bg-red-900 text-red-200'
              }`}
            >
              {message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded font-semibold transition"
            >
              Hủy
            </button>
            <button
              onClick={handleSendTest}
              disabled={loading}
              className="bg-[#C9A84C] hover:bg-[#D4B85F] text-white px-6 py-2 rounded font-semibold flex items-center gap-2 transition disabled:opacity-50"
            >
              <Send size={18} /> {loading ? 'Đang gửi...' : 'Gửi Email Test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
