import { describe, expect, it } from "vitest";
import { PERMISSION_GROUPS, PERMISSION_LABELS, ROLE_TEMPLATES } from "./crm-roles-store";

describe("CRM role permission catalogue", () => {
  it("exposes a dedicated Admin portal permission without granting it to staff templates", () => {
    expect(PERMISSION_LABELS.admin_portal_access).toContain("Quản trị Website");
    expect(ROLE_TEMPLATES.super_admin.permissions.admin_portal_access).toBe(true);

    for (const [key, template] of Object.entries(ROLE_TEMPLATES)) {
      if (key !== "super_admin") {
        expect(template.permissions.admin_portal_access).toBe(false);
      }
    }
  });

  it("shows every permission exactly once in the role editor", () => {
    const groupedKeys = PERMISSION_GROUPS.flatMap((group) => group.keys);
    expect(new Set(groupedKeys).size).toBe(groupedKeys.length);
    expect(new Set(groupedKeys)).toEqual(new Set(Object.keys(PERMISSION_LABELS)));
  });
});
