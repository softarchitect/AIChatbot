"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Users, HardDrive, Zap, Activity, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedKpiCard, PlanBadge, TableSkeleton } from "@/components/shared";
import type { AuditLog, Tenant } from "@/lib/mock/data";
import { useSessionStore } from "@/lib/store";
import { motion } from "framer-motion";

export default function TenantOverviewPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const accessToken = useSessionStore((s) => s.accessToken);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantLogs, setTenantLogs] = useState<AuditLog[]>([]);
  const [subscription, setSubscription] = useState<{
    planName: string;
    status: string;
    trialDays: number;
    agentLimit: number;
    activeAgents: number;
    remainingAgents: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";

    async function load() {
      if (!useApi || !accessToken) {
        setLoading(false);
        return;
      }
      try {
        const [tenantRes, logsRes, subRes] = await Promise.all([
          fetch(`/api/v1/tenants/${tenantId}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "x-tenant-id": tenantId,
            },
          }),
          fetch(`/api/v1/tenants/${tenantId}/audit-logs`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "x-tenant-id": tenantId,
            },
          }),
          fetch(`/api/v1/tenants/${tenantId}/subscription`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "x-tenant-id": tenantId,
            },
          }),
        ]);
        const tenantJson = await tenantRes.json().catch(() => ({}));
        const logsJson = await logsRes.json().catch(() => ({}));
        const subJson = await subRes.json().catch(() => ({}));
        if (tenantRes.ok) {
          setTenant(tenantJson.data ?? null);
        }
        if (logsRes.ok) {
          setTenantLogs(logsJson.data ?? []);
        }
        if (subRes.ok) {
          setSubscription(subJson.data ?? null);
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [accessToken, tenantId]);

  if (loading && !tenant) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenant) {
    return <p className="py-12 text-sm text-muted-foreground">Tenant data is unavailable.</p>;
  }

  return (
    <div className="space-y-6">
      {/* Usage KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnimatedKpiCard
          label="Active Users"
          value={tenant.activeUsers}
          icon={Users}
          trend="up"
          trendLabel={`of ${tenant.totalUsers} total`}
          loading={loading}
        />
        <AnimatedKpiCard
          label="Storage Used"
          value={`${(tenant.storageUsedMb / 1024).toFixed(1)} GB`}
          icon={HardDrive}
          trend="neutral"
          trendLabel="of 10 GB limit"
          loading={loading}
        />
        <AnimatedKpiCard
          label="API Calls (month)"
          value={tenant.apiCallsThisMonth.toLocaleString()}
          icon={Zap}
          trend="up"
          trendLabel="18% vs last month"
          loading={loading}
        />
        <AnimatedKpiCard
          label="Uptime"
          value="99.98%"
          icon={Activity}
          trend="up"
          trendLabel="Last 30 days"
          loading={loading}
        />
      </div>

      {/* Plan Summary + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plan Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Plan</span>
              <PlanBadge plan={tenant.plan} />
            </div>
            {subscription ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Plan Status</span>
                  <span className="text-sm font-medium text-foreground capitalize">{subscription.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trial Duration</span>
                  <span className="text-sm font-medium text-foreground">{subscription.trialDays} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Agent Usage</span>
                  <span className="text-sm font-medium text-foreground">
                    {subscription.activeAgents}/{subscription.agentLimit}
                  </span>
                </div>
              </>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Domain</span>
              <span className="text-sm font-medium text-foreground">{tenant.domain}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Language</span>
              <span className="text-sm font-medium text-foreground uppercase">{tenant.language}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Timezone</span>
              <span className="text-sm font-medium text-foreground">{tenant.timezone}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm font-medium text-foreground">
                {new Date(tenant.createdAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={4} cols={2} />
            ) : (
              <div className="space-y-4">
                {tenantLogs.slice(0, 5).map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-foreground">
                        <span className="font-medium">{log.actor}</span>{" "}
                        <span className="text-muted-foreground">
                          {log.action.replace(/[._]/g, " ")}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {tenantLogs.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent activity.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
