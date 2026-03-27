import { Metadata } from 'next';
import EmailScenarioBuilder from '@/components/crm/EmailScenarioBuilder';

export const metadata: Metadata = {
  title: 'Email Scenarios - SmartFurni CRM',
  description: 'Manage email automation scenarios',
};

export default function EmailScenariosPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] p-6">
      <div className="max-w-7xl mx-auto">
        <EmailScenarioBuilder />
      </div>
    </div>
  );
}
