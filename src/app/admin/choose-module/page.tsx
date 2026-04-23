'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ChooseModulePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleNavigate = (path: string) => {
    setIsLoading(true);
    router.push(path);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#1a1200" }}>
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/smartfurni-logo.png"
              alt="SmartFurni"
              style={{ height: 72, objectFit: "contain" }}
            />
          </div>
          <p className="text-slate-400 text-lg">Chọn module quản lý</p>
        </div>

        {/* Module Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* CRM Module */}
          <button
            onClick={() => handleNavigate('/crm')}
            disabled={isLoading}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-left transition-all duration-300 hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 opacity-0 group-hover:opacity-20 transition-opacity" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500 rounded-lg mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">CRM</h2>
              <p className="text-blue-100 mb-4">Quản lý khách hàng, deal, kế hoạch 12 tuần và email marketing</p>
              <div className="flex items-center text-blue-200 group-hover:text-white transition-colors">
                <span className="text-sm font-semibold">Truy cập CRM</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>

          {/* Website Admin Module */}
          <button
            onClick={() => handleNavigate('/admin')}
            disabled={isLoading}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 p-8 text-left transition-all duration-300 hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity" />
            <div className="relative">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500 rounded-lg mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Quản Trị Website</h2>
              <p className="text-purple-100 mb-4">Quản lý nội dung, cài đặt hệ thống và quản trị trang web</p>
              <div className="flex items-center text-purple-200 group-hover:text-white transition-colors">
                <span className="text-sm font-semibold">Truy cập Quản Trị</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-400 text-sm">
          <p>© 2026 SmartFurni — Giường Điều Khiển Thông Minh</p>
        </div>
      </div>
    </div>
  );
}
