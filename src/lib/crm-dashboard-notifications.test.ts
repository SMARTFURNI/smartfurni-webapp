import { describe, expect, it } from "vitest";
import {
  dashboardNotificationDismissalKey,
  dashboardNotificationVersion,
} from "./crm-dashboard-notifications";

describe("CRM dashboard notifications", () => {
  it("keeps the same version when record order changes", () => {
    expect(dashboardNotificationVersion(["lead-2", "lead-1"]))
      .toBe(dashboardNotificationVersion(["lead-1", "lead-2"]));
  });

  it("creates a new version when the underlying records change", () => {
    expect(dashboardNotificationVersion(["lead-1"]))
      .not.toBe(dashboardNotificationVersion(["lead-1", "lead-2"]));
  });

  it("scopes dismissal to both notification type and version", () => {
    expect(dashboardNotificationDismissalKey({ id: "overdue", version: "abc" }))
      .toBe("overdue:abc");
  });
});
