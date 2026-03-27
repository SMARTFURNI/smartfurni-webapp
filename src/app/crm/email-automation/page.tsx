import { Metadata } from 'next';
import EmailAutomationDashboard from '@/components/crm/EmailAutomationDashboard';

export const metadata: Metadata = {
  title: 'Email Automation - SmartFurni CRM',
  description: 'Manage automated email campaigns for leads',
};

export default function EmailAutomationPage() {
  return (
    <div className="min-h-screen bg-[#080600] text-white p-6">
      <div className="max-w-7xl mx-auto">
        <EmailAutomationDashboard />
      </div>
    </div>
  );
}
