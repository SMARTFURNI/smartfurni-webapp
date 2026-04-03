'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Edit2, Users, Check, X, Save, Loader } from 'lucide-react';
import type { TwelveWeekPlan } from '@/lib/twelve-week-plan-store';

export default function PlansManagementPage() {
  const [plans, setPlans] = useState<TwelveWeekPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [defaultPlanId, setDefaultPlanId] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string }>>([]);
  const [showStaffModal, setShowStaffModal] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());

  // Load plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch('/api/crm/twelve-week-plan?all=1', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setPlans(data);
          const defaultPlan = data.find((p: TwelveWeekPlan) => p.defaultForDashboard);
          setDefaultPlanId(defaultPlan?.id || null);
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
      } finally {
        setLoading(false);
      }
    };

    const fetchStaff = async () => {
      try {
        const res = await fetch('/api/crm/staff', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setStaffList(data);
        }
      } catch (err) {
        console.error('Failed to fetch staff:', err);
      }
    };

    fetchPlans();
    fetchStaff();
  }, []);

  // Open staff modal
  const handleOpenStaffModal = (planId: string, currentStaffIds: string[] = []) => {
    setShowStaffModal(planId);
    setSelectedStaff(new Set(currentStaffIds));
  };

  // Save staff assignment
  const handleSaveStaffAssignment = async (planId: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/crm/twelve-week-plan', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          action: 'assign_staff',
          assignedStaffIds: Array.from(selectedStaff),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setPlans(plans.map(p => (p.id === planId ? updated : p)));
        setShowStaffModal(null);
      }
    } catch (err) {
      console.error('Failed to save staff assignment:', err);
    } finally {
      setSaving(false);
    }
  };

  // Update plan title
  const handleUpdateTitle = async (planId: string, newTitle: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/crm/twelve-week-plan', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          action: 'update_title',
          title: newTitle,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setPlans(plans.map(p => (p.id === planId ? updated : p)));
        setEditingId(null);
      }
    } catch (err) {
      console.error('Failed to update title:', err);
    } finally {
      setSaving(false);
    }
  };

  // Set default plan
  const handleSetDefault = async (planId: string) => {
    setSaving(true);
    try {
      const res = await fetch('/api/crm/twelve-week-plan', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          action: 'set_default',
          defaultForDashboard: true,
        }),
      });

      if (res.ok) {
        // Update all plans to remove default flag except the selected one
        setPlans(plans.map(p => ({
          ...p,
          defaultForDashboard: p.id === planId,
        })));
        setDefaultPlanId(planId);
      }
    } catch (err) {
      console.error('Failed to set default plan:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Quản Lý Kế Hoạch 12 Tuần</h1>
          </div>
          <p className="text-gray-600">Quản lý, đổi tên, gán nhân viên, và chọn kế hoạch hiển thị trên dashboard</p>
        </div>

        {/* Plans List */}
        <div className="space-y-4">
          {plans.map(plan => (
            <div
              key={plan.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: Plan Info */}
                <div className="flex-1">
                  {editingId === plan.id ? (
                    <div className="flex gap-2 mb-4">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Tên kế hoạch"
                      />
                      <button
                        onClick={() => handleUpdateTitle(plan.id, editTitle)}
                        disabled={saving}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Lưu
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 mb-4">
                      <h2 className="text-xl font-semibold text-gray-900">{plan.title}</h2>
                      <button
                        onClick={() => {
                          setEditingId(plan.id);
                          setEditTitle(plan.title);
                        }}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Plan Details */}
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Ngày bắt đầu:</span> {new Date(plan.startDate).toLocaleDateString('vi-VN')}
                    </p>
                    <p>
                      <span className="font-medium">Ngày kết thúc:</span> {new Date(plan.endDate).toLocaleDateString('vi-VN')}
                    </p>
                    <p>
                      <span className="font-medium">Mục tiêu:</span> {plan.goals.length} mục tiêu
                    </p>
                    <p>
                      <span className="font-medium">Công việc:</span> {plan.tasks.length} công việc
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-col gap-3">
                  {/* Default Plan Selection */}
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id={`default-${plan.id}`}
                      name="default-plan"
                      checked={defaultPlanId === plan.id}
                      onChange={() => handleSetDefault(plan.id)}
                      disabled={saving}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <label
                      htmlFor={`default-${plan.id}`}
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Hiển thị mặc định
                    </label>
                  </div>

                  {/* Status Badge */}
                  {defaultPlanId === plan.id && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
                      <Check className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Được chọn</span>
                    </div>
                  )}

                  {/* Active Status */}
                  {plan.isActive && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-sm font-medium text-blue-700">Đang hoạt động</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Assigned Staff */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Nhân viên được gán</span>
                  </div>
                  <button
                    onClick={() => handleOpenStaffModal(plan.id, plan.assignedStaffIds || [])}
                    className="px-3 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    Chỉnh sửa
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {plan.assignedStaffIds && plan.assignedStaffIds.length > 0 ? (
                    plan.assignedStaffIds.map(staffId => {
                      const staff = staffList.find(s => s.id === staffId);
                      return (
                        <span
                          key={staffId}
                          className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-sm font-medium"
                        >
                          {staff?.name || staffId}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-sm text-gray-500 italic">Tất cả nhân viên có thể xem</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>💡 Mẹo:</strong> Chọn radio button "Hiển thị mặc định" để chọn kế hoạch nào sẽ hiển thị trên dashboard.
            Kế hoạch được chọn sẽ là kế hoạch đầu tiên mà nhân viên thấy khi vào CRM.
          </p>
        </div>
      </div>

      {/* Staff Assignment Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">Gán Nhân Viên Vào Kế Hoạch</h3>
              <p className="text-sm text-gray-600 mt-1">Chọn nhân viên có quyền xem kế hoạch này</p>
            </div>

            <div className="p-6 space-y-3">
              {staffList.length > 0 ? (
                staffList.map(staff => (
                  <label key={staff.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedStaff.has(staff.id)}
                      onChange={e => {
                        const newSelected = new Set(selectedStaff);
                        if (e.target.checked) {
                          newSelected.add(staff.id);
                        } else {
                          newSelected.delete(staff.id);
                        }
                        setSelectedStaff(newSelected);
                      }}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">{staff.name}</span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">Không có nhân viên nào</p>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowStaffModal(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Hủy
              </button>
              <button
                onClick={() => handleSaveStaffAssignment(showStaffModal)}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
              >
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
