import type { Role } from "@/lib/mock/data";

const rolePermissionsMap: Record<Role, string[]> = {
  admin: [
    "view_users",
    "edit_users",
    "manage_roles",
    "view_feature_flags",
    "manage_feature_flags",
    "view_audit_logs",
    "export_audit_logs",
    "manage_api_keys",
    "view_api_keys",
    "manage_branding",
    "manage_security",
    "manage_billing",
    "manage_tenants",
    "view_tenants",
  ],
  supervisor: [
    "view_users",
    "edit_users",
    "view_feature_flags",
    "view_audit_logs",
    "view_api_keys",
    "manage_branding",
  ],
  agent: ["view_users", "view_feature_flags", "view_audit_logs", "view_api_keys"],
};

export function hasPermission(role: Role, permission: string): boolean {
  return rolePermissionsMap[role]?.includes(permission) ?? false;
}
