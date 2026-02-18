"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { TenantStatus, PlanType, Role, UserStatus } from "@/lib/mock/data";

// Page transition wrapper
export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Status Pill
const statusColors: Record<TenantStatus | UserStatus, string> = {
  active: "bg-success/15 text-success border-success/20",
  inactive: "bg-muted text-muted-foreground border-border",
  suspended: "bg-destructive/15 text-destructive border-destructive/20",
  invited: "bg-primary/15 text-primary border-primary/20",
};

export function StatusPill({ status }: { status: TenantStatus | UserStatus }) {
  return (
    <Badge variant="outline" className={cn("capitalize text-xs font-medium", statusColors[status])}>
      <span className={cn("me-1.5 h-1.5 w-1.5 rounded-full inline-block", {
        "bg-success": status === "active",
        "bg-muted-foreground": status === "inactive",
        "bg-destructive": status === "suspended",
        "bg-primary": status === "invited",
      })} />
      {status}
    </Badge>
  );
}

// Plan Badge
const planColors: Record<PlanType, string> = {
  free: "bg-muted text-muted-foreground",
  starter: "bg-chart-2/15 text-chart-2",
  professional: "bg-primary/15 text-primary",
  enterprise: "bg-chart-3/15 text-chart-3",
};

export function PlanBadge({ plan }: { plan: PlanType }) {
  return (
    <Badge className={cn("capitalize text-xs font-medium border-0", planColors[plan])}>
      {plan}
    </Badge>
  );
}

// Role Badge
const roleColors: Record<Role, string> = {
  admin: "bg-primary/15 text-primary border-primary/20",
  supervisor: "bg-warning/15 text-warning border-warning/20",
  agent: "bg-muted text-muted-foreground border-border",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge variant="outline" className={cn("capitalize text-xs font-medium", roleColors[role])}>
      {role}
    </Badge>
  );
}

// Animated KPI Card
export function AnimatedKpiCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="mt-3 h-8 w-32" />
        <Skeleton className="mt-2 h-3 w-20" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ y: -2 }}
      className="group rounded-xl border border-border bg-card p-6 transition-shadow hover:shadow-md hover:shadow-foreground/[0.04]"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3">
        <CountUpValue value={value} />
      </div>
      {trendLabel && (
        <p className={cn("mt-1.5 text-xs font-medium", {
          "text-success": trend === "up",
          "text-destructive": trend === "down",
          "text-muted-foreground": trend === "neutral",
        })}>
          {trend === "up" ? "+" : trend === "down" ? "-" : ""}{trendLabel}
        </p>
      )}
    </motion.div>
  );
}

function CountUpValue({ value }: { value: string | number }) {
  return (
    <motion.p
      className="text-2xl font-bold tracking-tight text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {value}
    </motion.p>
  );
}

// Empty State
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <Icon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

// Confirm Dialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  destructive,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Table Skeleton
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
