// Route group layout for CRM auth pages (login, etc.)
// This layout does NOT apply CRM authentication, allowing unauthenticated access.
export default function CrmAuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
