"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Building2,
  Shield,
  CreditCard,
  Plus,
  UserPlus,
  Key,
  ArrowUpRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedKpiCard, PageTransition } from "@/components/shared";
import { useSessionStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { tenants, auditLogs, usageTrend, activeUsersTrend } from "@/lib/mock/data";

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
  const platformOwnerEmail = (process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAIL ?? "owner@saasphere.io").toLowerCase();
  const isPlatformOwner = currentUser?.email?.toLowerCase() === platformOwnerEmail;

  useEffect(() => {
    if (currentUser && !isPlatformOwner && currentTenant?.id) {
      router.replace(`/app/tenants/${currentTenant.id}/overview`);
      return;
    }
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, [currentTenant?.id, currentUser, isPlatformOwner, router]);

  useEffect(() => {
    if (!isPlatformOwner || !accessToken) return;
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
  }, [accessToken, isPlatformOwner]);

  const activeTenants = tenants.filter((t) => t.status === "active").length;
  const totalUsers = tenants.reduce((sum, t) => sum + t.activeUsers, 0);

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
              value={totalUsers.toLocaleString()}
              icon={Users}
              trend="up"
              trendLabel="12% from last month"
              loading={loading}
            />
          </motion.div>
          <motion.div variants={stagger.item}>
            <AnimatedKpiCard
              label={t("dashboard.total_tenants")}
              value={activeTenants}
              icon={Building2}
              trend="up"
              trendLabel="2 new this month"
              loading={loading}
            />
          </motion.div>
          <motion.div variants={stagger.item}>
            <AnimatedKpiCard
              label={t("dashboard.current_plan")}
              value="Enterprise"
              icon={CreditCard}
              trend="neutral"
              trendLabel="Renews Mar 2026"
              loading={loading}
            />
          </motion.div>
          <motion.div variants={stagger.item}>
            <AnimatedKpiCard
              label={t("dashboard.security_score")}
              value="92/100"
              icon={Shield}
              trend="up"
              trendLabel="5 pts improvement"
              loading={loading}
            />
          </motion.div>
        </motion.div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Usage Trend */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.usage_trend")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[240px] animate-pulse rounded-lg bg-muted" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={usageTrend}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.55 0.12 240)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="oklch(0.55 0.12 240)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.005 240 / 0.5)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "oklch(0.55 0.015 240)" }} stroke="oklch(0.90 0.005 240)" />
                    <YAxis tick={{ fontSize: 12, fill: "oklch(0.55 0.015 240)" }} stroke="oklch(0.90 0.005 240)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.995 0.001 80)",
                        border: "1px solid oklch(0.925 0.005 240)",
                        borderRadius: "8px",
                        color: "oklch(0.28 0.015 260)",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px oklch(0.28 0.015 260 / 0.08)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="oklch(0.55 0.12 240)"
                      strokeWidth={2}
                      fill="url(#colorUsers)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Active Users This Week */}
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("dashboard.active_users_chart")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[240px] animate-pulse rounded-lg bg-muted" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={activeUsersTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.90 0.005 240 / 0.5)" />
                    <XAxis dataKey="day" tick={{ fontSize: 12, fill: "oklch(0.55 0.015 240)" }} stroke="oklch(0.90 0.005 240)" />
                    <YAxis tick={{ fontSize: 12, fill: "oklch(0.55 0.015 240)" }} stroke="oklch(0.90 0.005 240)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.995 0.001 80)",
                        border: "1px solid oklch(0.925 0.005 240)",
                        borderRadius: "8px",
                        color: "oklch(0.28 0.015 260)",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px oklch(0.28 0.015 260 / 0.08)",
                      }}
                    />
                    <Bar
                      dataKey="active"
                      fill="oklch(0.62 0.1 175)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

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
                {
                  label: t("dashboard.invite_user"),
                  icon: UserPlus,
                  href: `/app/tenants/${currentTenant?.id ?? "t1"}/users`,
                },
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
                {auditLogs.slice(0, 6).map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.2 }}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-foreground">
                        <span className="font-medium">{log.actor}</span>{" "}
                        <span className="text-muted-foreground">
                          {log.action.replace(/[._]/g, " ")}
                        </span>{" "}
                        <span className="font-medium">{log.target}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
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
