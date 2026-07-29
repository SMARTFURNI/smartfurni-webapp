"use client";

import { usePathname } from "next/navigation";

const REFRESHED_ROUTE_PREFIXES = [
  "/crm/tasks",
  "/crm/notifications",
  "/crm/nps",
  "/crm/email",
  "/crm/email-builder",
  "/crm/email-campaigns",
  "/crm/email-performance",
  "/crm/email-templates",
  "/crm/email-automation",
  "/crm/email-automation-settings",
  "/crm/email-scenarios",
  "/crm/workflow-builder",
  "/crm/data-pool",
  "/crm/kanban",
  "/crm/calendar",
  "/crm/reports",
  "/crm/daily-report",
  "/crm/staff",
  "/crm/quotes",
  "/crm/automation",
  "/crm/plans-management",
  "/crm/facebook-inbox",
  "/crm/settings",
  "/crm/roles",
  "/crm/permissions",
  "/crm/audit",
  "/crm/import-export",
  "/crm/integrations",
];

function isRefreshedRoute(pathname: string) {
  return REFRESHED_ROUTE_PREFIXES.some(
    route => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function routeKey(pathname: string) {
  return pathname
    .replace(/^\/crm\/?/, "")
    .split("/")
    .filter(Boolean)
    .slice(0, 2)
    .join("-") || "dashboard";
}

export default function CrmAdminThemeBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/crm";
  const refreshed = isRefreshedRoute(pathname);

  return (
    <div
      className={refreshed ? "crm-admin-refresh" : "crm-theme-preserved"}
      data-crm-route={routeKey(pathname)}
    >
      {children}
    </div>
  );
}
