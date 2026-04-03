'use client';

import { useState } from 'react';
import { Bold, Italic, Underline, Image, Link2, Code } from 'lucide-react';

interface EmailTemplate {
  name: string;
  subject: string;
  bodyHtml: string;
  variables: string[];
}

export default function EmailBuilder() {
  const [template, setTemplate] = useState<EmailTemplate>({
    name: '',
    subject: '',
    bodyHtml: '<p>Xin chào {{name}},</p><p>Cảm ơn bạn đã quan tâm đến SmartFurni.</p>',
    variables: ['name', 'company'],
  });

  const [preview, setPreview] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState('');

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('email-body') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent =
        template.bodyHtml.substring(0, start) + `{{${variable}}}` + template.bodyHtml.substring(end);
      setTemplate({ ...template, bodyHtml: newContent });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  const applyFormatting = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const handleSaveTemplate = async () => {
    if (!template.name || !template.subject) {
      alert('Vui lòng nhập tên và tiêu đề email');
      return;
    }

    try {
      const res = await fetch('/api/email-marketing/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
      const data = await res.json();
      if (data.success) {
        alert('Lưu mẫu email thành công!');
        setTemplate({ name: '', subject: '', bodyHtml: '', variables: [] });
      }
    } catch (error) {
      console.error('Lỗi lưu mẫu email:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#080600] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#C9A84C] mb-2">✉️ Trình Soạn Thảo Email</h1>
          <p className="text-gray-400">Tạo mẫu email chuyên nghiệp với cá nhân hoá</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left Panel - Editor */}
          <div className="col-span-2 space-y-6">
            {/* Template Name */}
            <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6">
              <label className="block text-[#C9A84C] font-semibold mb-2">Tên Mẫu Email</label>
              <input
                type="text"
                value={template.name}
                onChange={(e) => setTemplate({ ...template, name: e.target.value })}
                placeholder="Ví dụ: Email Chào Mừng"
                className="w-full bg-[#080600] border border-[#2D2500] rounded px-4 py-2 text-white placeholder-gray-500"
              />
            </div>

            {/* Subject Line */}
            <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6">
              <label className="block text-[#C9A84C] font-semibold mb-2">Tiêu Đề Email</label>
              <input
                type="text"
                value={template.subject}
                onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                placeholder="Ví dụ: Giải Pháp Giường Điều Khiển Thông Minh Cho {{company}}"
                className="w-full bg-[#080600] border border-[#2D2500] rounded px-4 py-2 text-white placeholder-gray-500"
              />
              <p className="text-gray-400 text-xs mt-2">Hỗ trợ biến: {"{{name}}"}, {"{{company}}"}</p>
            </div>

            {/* Editor Toolbar */}
            <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4">
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => applyFormatting('bold')}
                  className="bg-[#2D2500] hover:bg-[#3D3500] text-white p-2 rounded flex items-center gap-2 transition"
                  title="Đậm"
                >
                  <Bold size={18} />
                </button>
                <button
                  onClick={() => applyFormatting('italic')}
                  className="bg-[#2D2500] hover:bg-[#3D3500] text-white p-2 rounded flex items-center gap-2 transition"
                  title="Nghiêng"
                >
                  <Italic size={18} />
                </button>
                <button
                  onClick={() => applyFormatting('underline')}
                  className="bg-[#2D2500] hover:bg-[#3D3500] text-white p-2 rounded flex items-center gap-2 transition"
                  title="Gạch chân"
                >
                  <Underline size={18} />
                </button>
                <div className="border-l border-[#2D2500] mx-2"></div>
                <button
                  onClick={() => applyFormatting('createLink', prompt('Nhập URL:') || '')}
                  className="bg-[#2D2500] hover:bg-[#3D3500] text-white p-2 rounded flex items-center gap-2 transition"
                  title="Liên kết"
                >
                  <Link2 size={18} />
                </button>
                <button
                  onClick={() => applyFormatting('insertImage', prompt('Nhập URL hình ảnh:') || '')}
                  className="bg-[#2D2500] hover:bg-[#3D3500] text-white p-2 rounded flex items-center gap-2 transition"
                  title="Chèn hình ảnh"
                >
                  <Image size={18} />
                </button>
              </div>

              {/* Email Body */}
              <textarea
                id="email-body"
                value={template.bodyHtml}
                onChange={(e) => setTemplate({ ...template, bodyHtml: e.target.value })}
                className="w-full bg-[#080600] border border-[#2D2500] rounded px-4 py-3 text-white placeholder-gray-500 h-64 font-mono text-sm"
                placeholder="Nhập nội dung email..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleSaveTemplate}
                className="flex-1 bg-[#C9A84C] hover:bg-[#D4B85F] text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                💾 Lưu Mẫu Email
              </button>
              <button
                onClick={() => setPreview(!preview)}
                className="flex-1 bg-[#2D2500] hover:bg-[#3D3500] text-white px-6 py-3 rounded-lg font-semibold transition"
              >
                👁️ {preview ? 'Ẩn' : 'Xem'} Preview
              </button>
            </div>
          </div>

          {/* Right Panel - Variables & Preview */}
          <div className="space-y-6">
            {/* Variables */}
            <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6">
              <h3 className="text-[#C9A84C] font-bold mb-4">📝 Biến Cá Nhân Hoá</h3>
              <div className="space-y-2">
                {template.variables.map((variable) => (
                  <button
                    key={variable}
                    onClick={() => insertVariable(variable)}
                    className="w-full bg-[#2D2500] hover:bg-[#3D3500] text-white px-3 py-2 rounded text-sm transition text-left"
                  >
                    {`{{${variable}}}`}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Thêm biến mới"
                value={selectedVariable}
                onChange={(e) => setSelectedVariable(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && selectedVariable) {
                    setTemplate({
                      ...template,
                      variables: [...template.variables, selectedVariable],
                    });
                    setSelectedVariable('');
                  }
                }}
                className="w-full bg-[#080600] border border-[#2D2500] rounded px-3 py-2 text-white placeholder-gray-500 text-sm mt-3"
              />
            </div>

            {/* Preview */}
            {preview && (
              <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6">
                <h3 className="text-[#C9A84C] font-bold mb-4">👁️ Preview</h3>
                <div className="bg-white rounded p-4 text-black text-sm max-h-96 overflow-y-auto">
                  <p className="font-bold mb-2">Tiêu đề: {template.subject}</p>
                  <div className="border-t pt-4">
                    {template.bodyHtml ? (
                      <div dangerouslySetInnerHTML={{ __html: template.bodyHtml }} />
                    ) : (
                      <p className="text-gray-500">Chưa có nội dung</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Template Info */}
            <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6">
              <h3 className="text-[#C9A84C] font-bold mb-4">ℹ️ Thông Tin</h3>
              <div className="text-sm text-gray-400 space-y-2">
                <p>Tên: {template.name || '(Chưa nhập)'}</p>
                <p>Biến: {template.variables.length}</p>
                <p>Độ dài: {template.bodyHtml.length} ký tự</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
