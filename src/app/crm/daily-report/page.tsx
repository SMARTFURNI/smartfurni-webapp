'use client';

import DailyPerformanceDashboard from '@/components/crm/DailyPerformanceDashboard';

export default function DailyReportPage() {
  return (
    <div className="min-h-screen bg-[#080600] p-6">
      <div className="max-w-7xl mx-auto">
        <DailyPerformanceDashboard />
      </div>
    </div>
  );
}
