'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Play, Pause, BarChart3, Eye } from 'lucide-react';
import type { EmailScenario } from '@/lib/email-scenario-store';

interface ScenarioWithStats extends EmailScenario {
  stats?: {
    totalLeads: number;
    totalSent: number;
    totalOpened: number;
    openRate: number;
  };
}

export default function EmailScenarioBuilder() {
  const [scenarios, setScenarios] = useState<ScenarioWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioWithStats | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);

  useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const response = await fetch('/api/ai-agent/email/scenarios');
      if (response.ok) {
        const data = await response.json();
        setScenarios(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleScenario = async (scenario: ScenarioWithStats) => {
    try {
      const response = await fetch(`/api/ai-agent/email/scenarios/${scenario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !scenario.enabled }),
      });

      if (response.ok) {
        setScenarios(
          scenarios.map((s) =>
            s.id === scenario.id ? { ...s, enabled: !s.enabled } : s
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle scenario:', error);
    }
  };

  const handleDeleteScenario = async (id: string) => {
    if (!confirm('Bạn chắc chắn muốn xóa kịch bản này?')) return;

    try {
      const response = await fetch(`/api/ai-agent/email/scenarios/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setScenarios(scenarios.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete scenario:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Email Scenarios</h1>
        <button
          onClick={() => {
            setSelectedScenario(null);
            setShowBuilder(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-white rounded-lg hover:bg-[#B89A3C] transition"
        >
          <Plus className="w-4 h-4" />
          New Scenario
        </button>
      </div>

      {/* Scenario List */}
      {loading ? (
        <div className="text-center py-8 text-[#9CA3AF]">Loading scenarios...</div>
      ) : scenarios.length === 0 ? (
        <div className="text-center py-8 text-[#9CA3AF]">No scenarios found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-4 hover:border-[#C9A84C] transition"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{scenario.name}</h3>
                  <p className="text-sm text-[#9CA3AF] mt-1">{scenario.description}</p>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-semibold ${
                  scenario.enabled
                    ? 'bg-[#22C55E] text-white'
                    : 'bg-[#6B7280] text-white'
                }`}>
                  {scenario.enabled ? 'Active' : 'Inactive'}
                </div>
              </div>

              {/* Stats */}
              {scenario.stats && (
                <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-[#080600] rounded">
                  <div>
                    <div className="text-xs text-[#9CA3AF]">Sent</div>
                    <div className="text-lg font-bold text-[#C9A84C]">{scenario.stats.totalSent}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[#9CA3AF]">Open Rate</div>
                    <div className="text-lg font-bold text-[#22C55E]">{scenario.stats.openRate.toFixed(1)}%</div>
                  </div>
                </div>
              )}

              {/* Trigger Info */}
              <div className="mb-4 p-3 bg-[#080600] rounded">
                <div className="text-xs text-[#9CA3AF] mb-1">Trigger</div>
                <div className="text-sm text-white capitalize">{scenario.trigger.type.replace('_', ' ')}</div>
              </div>

              {/* Steps */}
              <div className="mb-4 p-3 bg-[#080600] rounded">
                <div className="text-xs text-[#9CA3AF] mb-2">Steps</div>
                <div className="space-y-1">
                  {scenario.steps.map((step, idx) => (
                    <div key={step.id} className="text-sm text-white">
                      <span className="text-[#C9A84C]">Day {step.delayDays}:</span> Email {idx + 1}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleScenario(scenario)}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#2D2500] text-white rounded hover:bg-[#3D3500] transition text-sm"
                >
                  {scenario.enabled ? (
                    <>
                      <Pause className="w-4 h-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedScenario(scenario);
                    setShowBuilder(true);
                  }}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-[#2D2500] text-white rounded hover:bg-[#3D3500] transition"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteScenario(scenario.id)}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-[#2D2500] text-white rounded hover:bg-[#EF4444] transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedScenario(scenario)}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-[#2D2500] text-white rounded hover:bg-[#3D3500] transition"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scenario Builder Modal */}
      {showBuilder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1A1500] border border-[#2D2500] rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">
              {selectedScenario ? 'Edit Scenario' : 'Create New Scenario'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[#9CA3AF] mb-2">Scenario Name</label>
                <input
                  type="text"
                  placeholder="e.g., Welcome Series - New Lead"
                  defaultValue={selectedScenario?.name || ''}
                  className="w-full px-3 py-2 bg-[#080600] border border-[#2D2500] rounded text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-[#9CA3AF] mb-2">Description</label>
                <textarea
                  placeholder="Describe this scenario..."
                  defaultValue={selectedScenario?.description || ''}
                  className="w-full px-3 py-2 bg-[#080600] border border-[#2D2500] rounded text-white"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm text-[#9CA3AF] mb-2">Trigger Type</label>
                <select className="w-full px-3 py-2 bg-[#080600] border border-[#2D2500] rounded text-white">
                  <option>new_lead</option>
                  <option>lead_score_change</option>
                  <option>stage_change</option>
                  <option>manual</option>
                </select>
              </div>

              <div className="bg-[#080600] p-4 rounded">
                <h3 className="text-sm font-semibold text-white mb-3">Email Steps</h3>
                {selectedScenario?.steps.map((step, idx) => (
                  <div key={step.id} className="mb-3 p-3 bg-[#1A1500] rounded border border-[#2D2500]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">Step {idx + 1}</span>
                      <span className="text-xs text-[#9CA3AF]">Day {step.delayDays}</span>
                    </div>
                    <p className="text-xs text-[#9CA3AF]">Template: {step.templateId}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowBuilder(false)}
                  className="flex-1 px-4 py-2 bg-[#C9A84C] text-white rounded hover:bg-[#B89A3C] transition"
                >
                  Save Scenario
                </button>
                <button
                  onClick={() => setShowBuilder(false)}
                  className="flex-1 px-4 py-2 bg-[#2D2500] text-white rounded hover:bg-[#3D3500] transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
