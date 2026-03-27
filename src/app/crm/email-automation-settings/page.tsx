import { Metadata } from 'next';
import EmailAutomationSettings from '@/components/crm/EmailAutomationSettings';

export const metadata: Metadata = {
  title: 'Cài Đặt Tự Động Hoá Email - SmartFurni CRM',
  description: 'Quản lý cài đặt tự động hoá email hàng ngày',
};

export default function EmailAutomationSettingsPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] p-6">
      <div className="max-w-2xl mx-auto">
        <EmailAutomationSettings />
      </div>
    </div>
  );
}
