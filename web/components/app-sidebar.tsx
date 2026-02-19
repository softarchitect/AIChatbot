"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  User,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  badge?: string;
  locked?: boolean;
}

export function AppSidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, hasPermission, hasFeatureEnabled, currentTenant } = useSessionStore();
  const { t } = useTranslation();

  const tenantId = currentTenant?.id ?? "t1";
  const channelsEnabled = hasFeatureEnabled("whatsapp_channel") || hasFeatureEnabled("sms_channel") || hasFeatureEnabled("email_channel");

  const navItems: NavItem[] = [
    { label: t("nav.dashboard"), href: "/app/dashboard", icon: LayoutDashboard },
    { label: t("nav.tenants"), href: "/app/tenants", icon: Building2, permission: "view_tenants" },
    { label: t("nav.channels"), href: "/app/channels", icon: MessageSquare, locked: !channelsEnabled, badge: channelsEnabled ? undefined : "Locked" },
    { label: t("nav.profile"), href: "/app/profile", icon: User },
  ];

  const tenantNavItems: NavItem[] = [
    { label: t("tenant.overview"), href: `/app/tenants/${tenantId}/overview`, icon: LayoutDashboard },
    { label: t("tenant.users"), href: `/app/tenants/${tenantId}/users`, icon: User, permission: "view_users" },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="fixed inset-y-0 start-0 z-40 flex flex-col border-e border-border bg-sidebar"
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            S
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden whitespace-nowrap font-semibold text-foreground"
              >
                {t("app.name")}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const disabled = item.permission && !hasPermission(item.permission);
              const locked = item.locked;

              const content = (
                <Link
                  key={item.href}
                  href={locked ? "#" : item.href}
                  aria-disabled={disabled || locked ? true : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    (disabled || locked) && "pointer-events-none opacity-50",
                    sidebarCollapsed && "justify-center px-0"
                  )}
                >
                  {isActive(item.href) && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute inset-0 rounded-lg bg-primary/10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <item.icon className="relative h-5 w-5 shrink-0" />
                  <AnimatePresence>
                    {!sidebarCollapsed && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {!sidebarCollapsed && locked && (
                    <Lock className="relative ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {!sidebarCollapsed && item.badge && (
                    <Badge variant="secondary" className="relative ml-auto text-[10px] px-1.5 py-0">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );

              if (sidebarCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{content}</TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-2">
                      {item.label}
                      {locked && <Lock className="h-3 w-3" />}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return content;
            })}
          </div>

          {/* Tenant-specific nav when on tenant detail pages */}
          {pathname.includes(`/app/tenants/${tenantId}/`) && (
            <>
              <div className="my-4 h-px bg-border" />
              {!sidebarCollapsed && (
                <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tenant
                </p>
              )}
              <div className="space-y-1">
                {tenantNavItems.map((item) => {
                  const disabled = item.permission && !hasPermission(item.permission);
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          aria-disabled={disabled ? true : undefined}
                          className={cn(
                            "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                            isActive(item.href)
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                            disabled && "pointer-events-none opacity-50",
                            sidebarCollapsed && "justify-center px-0"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      </TooltipTrigger>
                      {(sidebarCollapsed || disabled) && (
                        <TooltipContent side="right">
                          {disabled ? "Insufficient permissions" : item.label}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        {/* Collapse Button */}
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="w-full justify-center"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
