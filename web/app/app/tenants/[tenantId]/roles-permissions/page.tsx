"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { permissions, rolePermissions, type Role } from "@/lib/mock/data";
import { useSessionStore } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const roles: Role[] = ["admin", "supervisor", "agent"];

export default function RolesPermissionsPage() {
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const [matrix, setMatrix] = useState<Record<Role, string[]>>(() => ({ ...rolePermissions }));
  const [hasChanges, setHasChanges] = useState(false);
  const canManageRoles = hasPermission("manage_roles");

  const togglePermission = (role: Role, permKey: string) => {
    if (!canManageRoles) return;
    if (role === "admin") return; // Admin always has all perms
    setMatrix((prev) => {
      const current = prev[role];
      const updated = current.includes(permKey)
        ? current.filter((p) => p !== permKey)
        : [...current, permKey];
      return { ...prev, [role]: updated };
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    toast.success("Permissions saved successfully.");
    setHasChanges(false);
  };

  // Group permissions by group
  const groups = Array.from(new Set(permissions.map((p) => p.group)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground">
            Configure what each role can access and modify.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2"
            >
              <Badge variant="outline" className="gap-1.5 bg-warning/10 text-warning border-warning/20">
                <AlertCircle className="h-3 w-3" />
                Unsaved changes
              </Badge>
            </motion.div>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || !canManageRoles} className="gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {groups.map((group) => (
        <Card key={group} className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{group}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 pe-8 text-start text-xs font-medium text-muted-foreground">
                      Permission
                    </th>
                    {roles.map((role) => (
                      <th
                        key={role}
                        className="pb-3 px-4 text-center text-xs font-medium capitalize text-muted-foreground"
                      >
                        {role}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {permissions
                    .filter((p) => p.group === group)
                    .map((perm) => (
                      <tr key={perm.id} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pe-8 text-sm text-foreground">{perm.label}</td>
                        {roles.map((role) => (
                          <td key={role} className="py-3 px-4 text-center">
                            <Checkbox
                              checked={matrix[role].includes(perm.key)}
                              onCheckedChange={() => togglePermission(role, perm.key)}
                              disabled={role === "admin" || !canManageRoles}
                              className={cn(
                                (role === "admin" || !canManageRoles) && "opacity-50 cursor-not-allowed"
                              )}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
