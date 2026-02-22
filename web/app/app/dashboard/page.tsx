"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Building2,
  Shield,
  Clock3,
  Plus,
  UserPlus,
  Key,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedKpiCard, PageTransition } from "@/components/shared";
import { useSessionStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { toast } from "sonner";

const stagger = {
  container: {
    animate: { transition: { staggerChildren: 0.06 } },
  },
  item: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const { currentUser, currentTenant, accessToken } = useSessionStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [trialConfig, setTrialConfig] = useState<{
    maxAgents: number;
    trialDays: number;
    enabledFeatureKeys: string[];
  } | null>(null);
  const [platformStats, setPlatformStats] = useState<{
    totalTenants: number;
    totalActiveAgents: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    trialTenants: number;
  } | null>(null);
  const platformOwnerEmail = (process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAIL ?? "owner@saasphere.io").toLowerCase();
  const isPlatformOwner = currentUser?.email?.toLowerCase() === platformOwnerEmail;
  const isPlatformOperator = isPlatformOwner || Boolean(currentUser?.isPlatformSubAdmin);

  useEffect(() => {
    if (currentUser && !isPlatformOperator && currentTenant?.id) {
      router.replace(`/app/tenants/${currentTenant.id}/overview`);
      return;
    }
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, [currentTenant?.id, currentUser, isPlatformOperator, router]);

  useEffect(() => {
    if (!isPlatformOperator || !accessToken) return;
    void (async () => {
      try {
        const response = await fetch("/api/v1/platform/trial-config", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.data) return;
        setTrialConfig(result.data);
      } catch {
        // keep card fallback values
      }
    })();
  }, [accessToken, isPlatformOperator]);

  useEffect(() => {
    if (!isPlatformOperator || !accessToken) return;
    void (async () => {
      try {
        const response = await fetch("/api/v1/platform/stats", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.data) {
          throw new Error(result?.error ?? "Failed to load dashboard statistics.");
        }
        setPlatformStats(result.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load dashboard statistics.");
      }
    })();
  }, [accessToken, isPlatformOperator]);

  return (
    <PageTransition>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t("dashboard.welcome")}, {currentUser?.name?.split(" ")[0]}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {"Here's what's happening across your platform today."}
          </p>
        </div>

        {/* KPI Cards */}
        <motion.div
          variants={stagger.container}
          initial="initial"
          animate="animate"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <motion.div variants={stagger.item}>
            <AnimatedKpiCard
              label={t("dashboard.active_users")}
              value={(platformStats?.totalActiveAgents ?? 0).toLocaleString()}
              icon={Users}
              trend="up"
              trendLabel="Active agents across platform"
              loading={loading}
            />
          </motion.div>
          <motion.div variants={stagger.item}>
            <AnimatedKpiCard
              label={t("dashboard.total_tenants")}
              value={platformStats?.totalTenants ?? 0}
              icon={Building2}
              trend="up"
              trendLabel="Total registered tenants"
              loading={loading}
            />
          </motion.div>
          <motion.div variants={stagger.item}>
            <AnimatedKpiCard
              label="Active subscriptions"
              value={platformStats?.activeSubscriptions ?? 0}
              icon={Shield}
              trend="neutral"
              trendLabel={`Trials: ${platformStats?.trialTenants ?? 0}`}
              loading={loading}
            />
          </motion.div>
          <motion.div variants={stagger.item}>
            <AnimatedKpiCard
              label="Expired subscriptions"
              value={platformStats?.expiredSubscriptions ?? 0}
              icon={Clock3}
              trend="neutral"
              trendLabel="Require renewal or reactivation"
              loading={loading}
            />
          </motion.div>
        </motion.div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">System Overview</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Dashboard KPIs are now sourced from live platform data. Additional trend charts can be
            enabled as the data warehouse/reporting layer is expanded.
          </CardContent>
        </Card>

        {/* Quick Actions + Activity Feed */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.quick_actions")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  label: t("dashboard.create_tenant"),
                  icon: Plus,
                  href: "/app/tenants/new",
                },
                ...(isPlatformOperator
                  ? [{ label: "Manage Sub-admins", icon: UserPlus, href: "/app/platform/sub-admins" }]
                  : [{ label: t("dashboard.invite_user"), icon: UserPlus, href: `/app/tenants/${currentTenant?.id ?? "t1"}/users` }]),
                {
                  label: t("dashboard.generate_key"),
                  icon: Key,
                  href: `/app/tenants/${currentTenant?.id ?? "t1"}/api-keys`,
                },
              ].map((action) => (
                <motion.div key={action.label} whileHover={{ x: 4 }} transition={{ duration: 0.15 }}>
                  <Button
                    variant="ghost"
                    className="w-full justify-between h-11"
                    onClick={() => router.push(action.href)}
                  >
                    <span className="flex items-center gap-3">
                      <action.icon className="h-4 w-4 text-primary" />
                      {action.label}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="border-border lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.activity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Activity feed is available in each tenant&apos;s audit log and can be aggregated in
                  platform analytics views.
                </p>
              </div>
              {isPlatformOwner && (
                <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                  <Link
                    href="/app/platform/trial-config"
                    className="text-xs font-semibold uppercase tracking-wide text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Trial Config Summary
                  </Link>
                  <p className="mt-2 text-sm text-foreground">
                    Max agents: <span className="font-medium">{trialConfig?.maxAgents ?? 3}</span>
                  </p>
                  <p className="text-sm text-foreground">
                    Trial days: <span className="font-medium">{trialConfig?.trialDays ?? 14}</span>
                  </p>
                  <p className="text-sm text-foreground">
                    Enabled features:{" "}
                    <span className="font-medium">
                      {trialConfig?.enabledFeatureKeys?.length ?? 2}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
