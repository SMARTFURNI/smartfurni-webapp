"use client";

import { useEffect } from "react";
import Link from "next/link";
import FlipBook from "./FlipBook";
import type { CatalogueWithPages } from "@/lib/catalogue-store";

interface Props {
  catalogue: CatalogueWithPages;
}

export default function CatalogueViewClient({ catalogue }: Props) {
  // Track view
  useEffect(() => {
    fetch(`/api/catalogue?id=${catalogue.id}&view=1`).catch(() => {});
  }, [catalogue.id]);

  if (catalogue.pages.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0800] flex flex-col items-center justify-center text-center px-4">
        <div className="text-6xl mb-4">📋</div>
        <h1 className="text-2xl font-bold text-white mb-2">{catalogue.title}</h1>
        <p className="text-gray-500 mb-6">Catalogue này chưa có trang nào.</p>
        <Link href="/catalogue" className="text-[#C9A84C] hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0800] flex flex-col">
      {/* Breadcrumb */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2 text-xs text-gray-500">
        <Link href="/" className="hover:text-white transition-colors">Trang chủ</Link>
        <span>/</span>
        <Link href="/catalogue" className="hover:text-white transition-colors">Catalogue</Link>
        <span>/</span>
        <span className="text-gray-300 truncate max-w-[200px]">{catalogue.title}</span>
      </div>

      {/* FlipBook — full height */}
      <div className="flex-1">
        <FlipBook
          pages={catalogue.pages}
          title={catalogue.title}
          className="h-[calc(100vh-80px)]"
        />
      </div>

      {/* Footer info */}
      <div className="border-t border-white/5 px-4 py-3 flex items-center justify-between text-xs text-gray-600">
        <span>{catalogue.description}</span>
        <div className="flex items-center gap-4">
          <span>{catalogue.pageCount} trang</span>
          <Link
            href="/contact"
            className="text-[#C9A84C] hover:text-[#E2C97E] transition-colors font-medium"
          >
            Liên hệ đặt hàng →
          </Link>
        </div>
      </div>
    </div>
  );
}
