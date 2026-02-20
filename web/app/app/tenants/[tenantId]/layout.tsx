"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Shield,
  Flag,
  Palette,
  Lock,
  Key,
  FileText,
  ArrowLeft,
  Copy,
  Loader2,
  Pencil,
  MessageSquare,
  Megaphone,
  Receipt,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusPill, PlanBadge } from "@/components/shared";
import type { Tenant } from "@/lib/mock/data";
import { useSessionStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const tabs = [
  { label: "Overview", href: "overview", icon: LayoutDashboard },
  { label: "Edit", href: "edit", icon: Pencil },
  { label: "Users", href: "users", icon: Users },
  { label: "Roles & Permissions", href: "roles-permissions", icon: Shield },
  { label: "Feature Flags", href: "feature-flags", icon: Flag },
  { label: "White-Label", href: "white-label", icon: Palette },
  { label: "Security", href: "security", icon: Lock },
  { label: "API Keys", href: "api-keys", icon: Key },
  { label: "Audit Logs", href: "audit-logs", icon: FileText },
  { label: "Conversations", href: "conversations", icon: MessageSquare },
  { label: "Campaigns", href: "campaigns", icon: Megaphone },
  { label: "Billing", href: "billing", icon: Receipt },
  { label: "Agents", href: "agents", icon: UserCog },
];

export default function TenantDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const accessToken = useSessionStore((s) => s.accessToken);
  const tenantId = params.tenantId as string;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);
  const [tenantError, setTenantError] = useState<string | null>(null);

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";

    async function loadTenant() {
      if (!useApi) {
        setLoadingTenant(false);
        return;
      }
      if (!accessToken) {
        setTenantError("Session expired. Please sign in again.");
        setLoadingTenant(false);
        return;
      }
      try {
        const response = await fetch(`/api/v1/tenants/${tenantId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-tenant-id": tenantId,
          },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.error ?? "Failed to load tenant");
        }
        setTenant(result.data ?? null);
        setTenantError(null);
      } catch {
        setTenant(null);
        setTenantError("Failed to load tenant.");
      } finally {
        setLoadingTenant(false);
      }
    }

    void loadTenant();
  }, [accessToken, tenantId]);

  if (loadingTenant) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">{tenantError ?? "Tenant not found"}</p>
      </div>
    );
  }

  const currentTab = pathname.split("/").pop() ?? "overview";

  return (
    <div className="space-y-6">
      {/* Back + Tenant Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
          onClick={() => router.push("/app/tenants")}
        >
          <ArrowLeft className="h-4 w-4" />
          All Tenants
        </Button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">
              {tenant.name[0]}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-foreground">{tenant.name}</h1>
                <StatusPill status={tenant.status} />
                <PlanBadge plan={tenant.plan} />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tenant.id);
                        toast.success("Tenant ID copied!");
                      }}
                      className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span className="font-mono">{tenant.id}</span>
                      <Copy className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Copy Tenant ID</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <nav className="flex gap-1 min-w-max" aria-label="Tenant navigation">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.href;
            return (
              <button
                key={tab.href}
                onClick={() => router.push(`/app/tenants/${tenantId}/${tab.href}`)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="tenantTab"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-primary"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={currentTab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
