'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, Filter, Calendar, Tag } from 'lucide-react';

interface AdvancedSearchFilterProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: FilterState) => void;
  onQuickFilter: (filter: string) => void;
}

interface FilterState {
  search: string;
  stage?: string;
  type?: string;
  dateRange?: string;
}

export default function AdvancedSearchFilter({
  onSearch,
  onFilterChange,
  onQuickFilter,
}: AdvancedSearchFilterProps) {
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [dynamicLeadTypes, setDynamicLeadTypes] = useState<{ value: string; label: string }[]>([
    { value: 'architect', label: 'Kiến trúc sư' },
    { value: 'investor', label: 'Nhà đầu tư' },
    { value: 'dealer', label: 'Đại lý' },
  ]);
  useEffect(() => {
    fetch('/api/crm/settings/lead-types')
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; label: string }[]) => {
        if (Array.isArray(data) && data.length > 0)
          setDynamicLeadTypes(data.map(lt => ({ value: lt.id, label: lt.label })));
      })
      .catch(() => {});
  }, []);

  const quickFilters = [
    { id: 'today', label: '📅 Hôm nay', icon: '📅' },
    { id: 'this-week', label: '📆 Tuần này', icon: '📆' },
    { id: 'this-month', label: '📊 Tháng này', icon: '📊' },
    { id: 'overdue', label: '⚠️ Quá hạn', icon: '⚠️' },
  ];

  const filterOptions = [
    {
      id: 'stage',
      label: 'Giai Đoạn',
      options: [
        { value: 'new', label: 'Khách hàng mới' },
        { value: 'interested', label: 'Quan tâm' },
        { value: 'proposal', label: 'Đã gửi báo giá' },
        { value: 'negotiation', label: 'Đang đàm phán' },
        { value: 'won', label: 'Đã chốt' },
        { value: 'lost', label: 'Mất khách' },
      ],
    },
    {
      id: 'type',
      label: 'Loại Khách Hàng',
      options: dynamicLeadTypes,
    },
  ];

  const handleSearch = (value: string) => {
    setSearch(value);
    onSearch(value);
  };

  const handleQuickFilter = (filterId: string) => {
    if (activeFilters.includes(filterId)) {
      setActiveFilters(activeFilters.filter(f => f !== filterId));
    } else {
      setActiveFilters([...activeFilters, filterId]);
    }
    onQuickFilter(filterId);
  };

  const handleRemoveFilter = (filterId: string) => {
    setActiveFilters(activeFilters.filter(f => f !== filterId));
  };

  const handleClearAll = () => {
    setSearch('');
    setActiveFilters([]);
    onSearch('');
    onFilterChange({ search: '' });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm tên, công ty, số điện thoại..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:outline-none transition-colors"
          />
          {search && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-[rgba(255,255,255,0.08)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => handleQuickFilter(filter.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              activeFilters.includes(filter.id)
                ? 'bg-blue-500 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filter.label}
          </button>
        ))}

        {/* Filter Panel Toggle */}
        <button
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
            showFilterPanel
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Filter className="w-4 h-4" />
          Bộ lọc
        </button>
      </div>

      {/* Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-600 font-medium">Bộ lọc đang áp dụng:</span>
          {activeFilters.map((filterId) => {
            const filter = quickFilters.find(f => f.id === filterId);
            return (
              <div
                key={filterId}
                className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
              >
                <span>{filter?.label}</span>
                <button
                  onClick={() => handleRemoveFilter(filterId)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          <button
            onClick={handleClearAll}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Xóa tất cả
          </button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="bg-[rgba(255,255,255,0.07)] border-2 border-gray-200 rounded-lg p-6 space-y-6">
          {filterOptions.map((filterGroup) => (
            <div key={filterGroup.id}>
              <h3 className="font-semibold text-gray-900 mb-3">{filterGroup.label}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {filterGroup.options.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Apply Button */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowFilterPanel(false)}
              className="flex-1 px-4 py-2 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              Áp dụng
            </button>
            <button
              onClick={() => {
                setShowFilterPanel(false);
                handleClearAll();
              }}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              Đặt lại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
