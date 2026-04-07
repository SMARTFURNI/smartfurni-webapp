'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Lead } from '@/lib/crm-types';

interface CalendarViewProps {
  leads: Lead[];
}

export default function CalendarView({ leads }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getLeadsForDate = (date: Date) => {
    return leads.filter(lead => {
      const leadDate = new Date(lead.lastContactAt);
      return (
        leadDate.getFullYear() === date.getFullYear() &&
        leadDate.getMonth() === date.getMonth() &&
        leadDate.getDate() === date.getDate()
      );
    });
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
  }

  const stageColors: Record<string, string> = {
    'new': 'bg-blue-100 text-blue-700',
    'interested': 'bg-purple-100 text-purple-700',
    'proposal': 'bg-yellow-100 text-yellow-700',
    'negotiation': 'bg-orange-100 text-orange-700',
    'won': 'bg-green-100 text-green-700',
    'lost': 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{monthName}</h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
          <div key={day} className="text-center font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dayLeads = getLeadsForDate(date);
          const isToday = new Date().toDateString() === date.toDateString();

          return (
            <div
              key={date.toISOString()}
              className={`aspect-square rounded-lg border-2 p-2 transition-all duration-200 hover:shadow-lg ${
                isToday
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-white border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                {date.getDate()}
              </div>

              {/* Leads for this day */}
              <div className="space-y-1">
                {dayLeads.slice(0, 2).map((lead, i) => (
                  <div
                    key={i}
                    className={`text-xs px-1.5 py-0.5 rounded truncate font-medium ${
                      stageColors[lead.stage] || 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {lead.name.split(' ')[0]}
                  </div>
                ))}
                {dayLeads.length > 2 && (
                  <div className="text-xs text-gray-500 px-1.5 font-medium">
                    +{dayLeads.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Chú Thích Giai Đoạn</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(stageColors).map(([stage, color]) => (
            <div key={stage} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${color}`}></div>
              <span className="text-sm text-gray-700 capitalize">{stage}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
