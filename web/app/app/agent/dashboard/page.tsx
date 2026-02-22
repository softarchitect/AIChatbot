"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionStore } from "@/lib/store";

const knownPermissions = [
  "view_conversations",
  "manage_conversations",
  "view_channels",
  "view_ai_config",
  "view_feature_flags",
  "view_audit_logs",
  "view_api_keys",
];

export default function AgentDashboardPage() {
  const currentUser = useSessionStore((s) => s.currentUser);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const currentTenant = useSessionStore((s) => s.currentTenant);

  const allowed = useMemo(
    () => knownPermissions.filter((perm) => hasPermission(perm)),
    [hasPermission]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome {currentUser?.name}. You are scoped to tenant{" "}
          <span className="font-medium text-foreground">{currentTenant?.name ?? "-"}</span>.
        </p>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">My Access Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Role: <span className="font-medium text-foreground">{currentUser?.role ?? "-"}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Enabled permissions:
          </p>
          <div className="flex flex-wrap gap-2">
            {allowed.length === 0 ? (
              <span className="text-sm text-muted-foreground">No permissions assigned.</span>
            ) : (
              allowed.map((perm) => (
                <span
                  key={perm}
                  className="rounded-full border border-border px-2 py-1 text-xs text-foreground"
                >
                  {perm}
                </span>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Personal Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This dashboard is intentionally limited for agent scope in Phase 1. Menu rendering and
            route access are permission-based.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
