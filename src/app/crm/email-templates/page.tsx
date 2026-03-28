import { Metadata } from 'next';
import EmailTemplateManager from '@/components/crm/EmailTemplateManager';

export const metadata: Metadata = {
  title: 'Quản Lý Mẫu Email - SmartFurni CRM',
  description: 'Quản lý các mẫu email cho hệ thống tự động hoá',
};

export default function EmailTemplatesPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] p-6">
      <div className="max-w-6xl mx-auto">
        <EmailTemplateManager />
      </div>
    </div>
  );
}
