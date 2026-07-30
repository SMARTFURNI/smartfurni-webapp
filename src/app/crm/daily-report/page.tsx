'use client';

import DailyPerformanceDashboard from '@/components/crm/DailyPerformanceDashboard';

export default function DailyReportPage() {
  return (
    <div className="crm-daily-report min-h-full p-6">
      <div className="max-w-7xl mx-auto">
        <DailyPerformanceDashboard />
      </div>
    </div>
  );
}
