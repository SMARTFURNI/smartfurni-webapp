import { Metadata } from 'next';
import EmailScenariosSimple from '@/components/crm/EmailScenariosSimple';

export const metadata: Metadata = {
  title: 'Kịch Bản Email - SmartFurni CRM',
  description: 'Quản lý kịch bản tự động hoá email',
};

export default function EmailScenariosPage() {
  return (
    <div className="min-h-screen bg-[#080600] p-6">
      <div className="max-w-7xl mx-auto">
        <EmailScenariosSimple />
      </div>
    </div>
  );
}
