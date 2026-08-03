import { getCrmSession } from "@/lib/admin-auth";
import { getRoleById, type RolePermissions } from "@/lib/crm-roles-store";
import { getStaffById } from "@/lib/crm-staff-store";
import type { AiCommandAccess, AiCommandActor } from "./types";

export class AiCommandAccessError extends Error {
  constructor(message: string, public status = 403) {
    super(message);
    this.name = "AiCommandAccessError";
  }
}

export async function getAiCommandAccess(): Promise<AiCommandAccess | null> {
  const session = await getCrmSession();
  if (!session) return null;

  if (session.isAdmin) {
    return {
      actor: { kind: "admin", id: "admin", name: "Quản trị viên" },
      permissions: null,
      canView: true,
      canApprove: true,
    };
  }

  if (!session.staffId) return null;
  const staff = await getStaffById(session.staffId);
  if (!staff) return null;
  const roleId = staff.role || session.staffRole || "";
  const role = roleId ? await getRoleById(roleId) : null;
  const permissions = role?.permissions ?? null;

  return {
    actor: {
      kind: "staff",
      id: session.staffId,
      name: staff.fullName || session.staffId,
      roleId,
    },
    permissions,
    canView: permissions?.ai_command_view === true,
    canApprove: permissions?.ai_command_execute === true,
  };
}

export async function requireAiCommandAccess(requireApproval = false): Promise<AiCommandAccess> {
  const access = await getAiCommandAccess();
  if (!access) throw new AiCommandAccessError("Bạn chưa đăng nhập.", 401);
  if (!access.canView) throw new AiCommandAccessError("Bạn chưa được cấp quyền sử dụng Trợ lý Điều hành AI.");
  if (requireApproval && !access.canApprove) {
    throw new AiCommandAccessError("Bạn chưa được cấp quyền phê duyệt tác vụ AI.");
  }
  return access;
}

export async function assertActorPermission(actor: AiCommandActor, permission: keyof RolePermissions) {
  if (actor.kind === "admin") return;
  const staff = await getStaffById(actor.id);
  if (!staff) throw new AiCommandAccessError("Tài khoản nhân viên không còn hoạt động.", 401);
  const role = await getRoleById(staff.role || actor.roleId || "");
  if (!role?.permissions.ai_command_view || !role.permissions[permission]) {
    throw new AiCommandAccessError(`Bạn không có quyền thực hiện công cụ yêu cầu quyền ${permission}.`);
  }
}

export async function assertActorAnyPermission(
  actor: AiCommandActor,
  permissions: Array<keyof RolePermissions>,
) {
  if (actor.kind === "admin") return;
  const staff = await getStaffById(actor.id);
  if (!staff) throw new AiCommandAccessError("Tài khoản nhân viên không còn hoạt động.", 401);
  const role = await getRoleById(staff.role || actor.roleId || "");
  const isAllowed = role?.permissions.ai_command_view && permissions.some(permission => role.permissions[permission]);
  if (!isAllowed) {
    throw new AiCommandAccessError(`Bạn không có quyền thực hiện công cụ yêu cầu một trong các quyền: ${permissions.join(", ")}.`);
  }
}

export async function getCurrentPermissions(actor: AiCommandActor): Promise<RolePermissions | null> {
  if (actor.kind === "admin") return null;
  const staff = await getStaffById(actor.id);
  const role = staff ? await getRoleById(staff.role || actor.roleId || "") : null;
  return role?.permissions ?? null;
}
