import { Suspense } from "react";
import GoogleSheetClient from "./GoogleSheetClient";

export const metadata = { title: "Google Sheet Sync | SmartFurni CRM" };

export default function GoogleSheetPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Đang tải...</div>}>
      <GoogleSheetClient />
    </Suspense>
  );
}
