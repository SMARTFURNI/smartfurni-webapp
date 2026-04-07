"use client";

import { useState, useEffect, useCallback } from "react";
import { ShoppingBag, Plus, Trash2, RefreshCw, X, Edit2, Package, ChevronRight, ChevronLeft, AlertCircle, CheckCircle, DollarSign } from "lucide-react";

interface Catalog {
  id: string;
  title: string;
  totalProduct?: number;
  createdAt?: number;
}

interface Product {
  id: string;
  catalogId: string;
  productName: string;
  price: number;
  description?: string;
  imageUrl?: string;
  createdAt?: number;
}

interface ZaloCatalogPanelProps {
  onClose?: () => void;
}

export default function ZaloCatalogPanel({ onClose }: ZaloCatalogPanelProps) {
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Catalog form
  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const [catalogTitle, setCatalogTitle] = useState("");
  const [editCatalog, setEditCatalog] = useState<Catalog | null>(null);

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCatalogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/zalo-inbox/catalogs");
      const data = await res.json();
      if (data.success) setCatalogs(data.catalogs || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const loadProducts = useCallback(async (catalogId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/zalo-inbox/catalogs?catalogId=${catalogId}`);
      const data = await res.json();
      if (data.success) setProducts(data.products || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCatalogs(); }, [loadCatalogs]);

  useEffect(() => {
    if (selectedCatalog) loadProducts(selectedCatalog.id);
  }, [selectedCatalog, loadProducts]);

  const handleSaveCatalog = async () => {
    if (!catalogTitle.trim()) { showToast("Vui lòng nhập tên catalog", "error"); return; }
    setSaving(true);
    try {
      const action = editCatalog ? "update-catalog" : "create-catalog";
      const body: any = { action, title: catalogTitle.trim() };
      if (editCatalog) body.catalogId = editCatalog.id;
      const res = await fetch("/api/crm/zalo-inbox/catalogs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        showToast(editCatalog ? "Đã cập nhật catalog" : "Đã tạo catalog!");
        setCatalogTitle(""); setEditCatalog(null); setShowCatalogForm(false);
        loadCatalogs();
      } else showToast(data.error || "Lỗi", "error");
    } finally { setSaving(false); }
  };

  const handleDeleteCatalog = async (catalogId: string) => {
    if (!confirm("Xóa catalog này? Tất cả sản phẩm trong catalog sẽ bị xóa.")) return;
    const res = await fetch("/api/crm/zalo-inbox/catalogs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-catalog", catalogId }) });
    const data = await res.json();
    if (data.success) { showToast("Đã xóa catalog"); if (selectedCatalog?.id === catalogId) setSelectedCatalog(null); loadCatalogs(); }
    else showToast(data.error || "Lỗi", "error");
  };

  const handleSaveProduct = async () => {
    if (!productName.trim() || !productPrice) { showToast("Vui lòng nhập tên và giá sản phẩm", "error"); return; }
    if (!selectedCatalog) return;
    setSaving(true);
    try {
      const action = editProduct ? "update-product" : "create-product";
      const body: any = { action, catalogId: selectedCatalog.id, title: productName.trim(), price: parseFloat(productPrice), description: productDesc.trim() };
      if (editProduct) body.productId = editProduct.id;
      const res = await fetch("/api/crm/zalo-inbox/catalogs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.success) {
        showToast(editProduct ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm!");
        setProductName(""); setProductPrice(""); setProductDesc(""); setEditProduct(null); setShowProductForm(false);
        loadProducts(selectedCatalog.id);
      } else showToast(data.error || "Lỗi", "error");
    } finally { setSaving(false); }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!selectedCatalog || !confirm("Xóa sản phẩm này?")) return;
    const res = await fetch("/api/crm/zalo-inbox/catalogs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete-product", catalogId: selectedCatalog.id, productId }) });
    const data = await res.json();
    if (data.success) { showToast("Đã xóa sản phẩm"); loadProducts(selectedCatalog.id); }
    else showToast(data.error || "Lỗi", "error");
  };

  const formatPrice = (price: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {selectedCatalog && (
            <button onClick={() => { setSelectedCatalog(null); setShowProductForm(false); }} className="p-1 rounded hover:bg-[rgba(255,255,255,0.08)] dark:hover:bg-gray-800 text-gray-500">
              <ChevronLeft size={16} />
            </button>
          )}
          <ShoppingBag size={16} className="text-blue-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
            {selectedCatalog ? selectedCatalog.title : "Catalog sản phẩm"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            if (selectedCatalog) { setShowProductForm(!showProductForm); setEditProduct(null); setProductName(""); setProductPrice(""); setProductDesc(""); }
            else { setShowCatalogForm(!showCatalogForm); setEditCatalog(null); setCatalogTitle(""); }
          }} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg">
            <Plus size={12} /> {selectedCatalog ? "Thêm SP" : "Thêm"}
          </button>
          <button onClick={() => selectedCatalog ? loadProducts(selectedCatalog.id) : loadCatalogs()} className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.08)] dark:hover:bg-gray-800 text-gray-500">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {onClose && <button onClick={onClose} className="p-1.5 rounded hover:bg-[rgba(255,255,255,0.08)] dark:hover:bg-gray-800 text-gray-500"><X size={14} /></button>}
        </div>
      </div>

      {/* Catalog Form */}
      {showCatalogForm && !selectedCatalog && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-blue-50 dark:bg-blue-900/20 space-y-3">
          <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-300">{editCatalog ? "Sửa catalog" : "Tạo catalog mới"}</h3>
          <input value={catalogTitle} onChange={e => setCatalogTitle(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSaveCatalog()} placeholder="Tên catalog..." className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <div className="flex gap-2">
            <button onClick={() => { setShowCatalogForm(false); setEditCatalog(null); setCatalogTitle(""); }} className="flex-1 py-1.5 text-xs text-gray-600 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-[rgba(255,255,255,0.05)] dark:hover:bg-gray-800">Hủy</button>
            <button onClick={handleSaveCatalog} disabled={saving || !catalogTitle.trim()} className="flex-1 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-1">
              {saving ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
              {editCatalog ? "Lưu" : "Tạo"}
            </button>
          </div>
        </div>
      )}

      {/* Product Form */}
      {showProductForm && selectedCatalog && (
        <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-blue-50 dark:bg-blue-900/20 space-y-3">
          <h3 className="text-xs font-semibold text-blue-700 dark:text-blue-300">{editProduct ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h3>
          <input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Tên sản phẩm..." className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={productPrice} onChange={e => setProductPrice(e.target.value)} type="number" min="0" placeholder="Giá (VNĐ)..." className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)} rows={2} placeholder="Mô tả sản phẩm (tùy chọn)..." className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
          <div className="flex gap-2">
            <button onClick={() => { setShowProductForm(false); setEditProduct(null); setProductName(""); setProductPrice(""); setProductDesc(""); }} className="flex-1 py-1.5 text-xs text-gray-600 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-[rgba(255,255,255,0.05)] dark:hover:bg-gray-800">Hủy</button>
            <button onClick={handleSaveProduct} disabled={saving || !productName.trim() || !productPrice} className="flex-1 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-1">
              {saving ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
              {editProduct ? "Lưu" : "Thêm"}
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8"><RefreshCw size={20} className="animate-spin text-gray-400" /></div>
        ) : !selectedCatalog ? (
          // Catalog list
          catalogs.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <ShoppingBag size={32} className="mx-auto mb-2 opacity-40" />
              <p>Chưa có catalog nào</p>
              <p className="text-xs mt-1">Nhấn "Thêm" để tạo catalog sản phẩm</p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.06)] dark:divide-gray-800">
              <div className="px-4 py-2 text-xs text-gray-400">{catalogs.length} catalog</div>
              {catalogs.map(cat => (
                <div key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.05)] dark:hover:bg-gray-800 group cursor-pointer" onClick={() => setSelectedCatalog(cat)}>
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                    <ShoppingBag size={18} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{cat.title}</div>
                    <div className="text-xs text-gray-400">{cat.totalProduct || 0} sản phẩm</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={e => { e.stopPropagation(); setEditCatalog(cat); setCatalogTitle(cat.title); setShowCatalogForm(true); }} className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleDeleteCatalog(cat.id); }} className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400">
                      <Trash2 size={13} />
                    </button>
                    <ChevronRight size={14} className="text-[rgba(245,237,214,0.35)]" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Product list
          products.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <Package size={32} className="mx-auto mb-2 opacity-40" />
              <p>Chưa có sản phẩm nào</p>
              <p className="text-xs mt-1">Nhấn "Thêm SP" để thêm sản phẩm</p>
            </div>
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.06)] dark:divide-gray-800">
              <div className="px-4 py-2 text-xs text-gray-400">{products.length} sản phẩm</div>
              {products.map(p => (
                <div key={p.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[rgba(255,255,255,0.05)] dark:hover:bg-gray-800 group">
                  <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
                    {p.imageUrl ? <img src={p.imageUrl} alt={p.productName} className="w-10 h-10 rounded-xl object-cover" /> : <Package size={18} className="text-green-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{p.productName}</div>
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">{formatPrice(p.price)}</div>
                    {p.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{p.description}</div>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditProduct(p); setProductName(p.productName); setProductPrice(String(p.price)); setProductDesc(p.description || ""); setShowProductForm(true); }} className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => handleDeleteProduct(p.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white flex items-center gap-2 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
