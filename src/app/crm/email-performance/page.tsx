import EmailPerformanceDashboard from '@/components/crm/EmailPerformanceDashboard';

export const metadata = {
  title: 'Báo Cáo Hiệu Suất Email | SmartFurni CRM',
  description: 'Xem báo cáo chi tiết về hiệu suất các chiến dịch email',
};

export default function EmailPerformancePage() {
  return (
    <div className="min-h-screen bg-[#080600] p-6">
      <EmailPerformanceDashboard />
    </div>
  );
}
