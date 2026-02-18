"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Ban,
  Trash2,
  Building2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PageTransition,
  StatusPill,
  PlanBadge,
  EmptyState,
  ConfirmDialog,
  TableSkeleton,
} from "@/components/shared";
import { useSessionStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";
import { tenants, type Tenant } from "@/lib/mock/data";
import { toast } from "sonner";

export default function TenantsPage() {
  const router = useRouter();
  const { locale, hasPermission } = useSessionStore();
  const { t } = useTranslation(locale);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 5;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    return tenants.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.domain.toLowerCase().includes(search.toLowerCase());
      const matchPlan = planFilter === "all" || t.plan === planFilter;
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchPlan && matchStatus;
    });
  }, [search, planFilter, statusFilter]);

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const handleDelete = () => {
    if (deleteTarget) {
      toast.success(`Tenant "${deleteTarget.name}" deleted successfully.`);
      setDeleteTarget(null);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {t("tenants.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage all tenants on your platform
            </p>
          </div>
          {hasPermission("manage_tenants") && (
            <Button onClick={() => router.push("/app/tenants/new")} className="gap-2">
              <Plus className="h-4 w-4" />
              {t("tenants.create")}
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("tenants.search")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="ps-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <Filter className="mr-2 h-3.5 w-3.5" />
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={t("tenants.empty")}
            description={t("tenants.empty_desc")}
            action={
              hasPermission("manage_tenants") ? (
                <Button onClick={() => router.push("/app/tenants/new")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {t("tenants.create")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Domain</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Users</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((tenant, i) => (
                  <motion.tr
                    key={tenant.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    className="group cursor-pointer border-b border-border transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/app/tenants/${tenant.id}/overview`)}
                  >
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {tenant.domain}
                    </TableCell>
                    <TableCell>
                      <PlanBadge plan={tenant.plan} />
                    </TableCell>
                    <TableCell>
                      <StatusPill status={tenant.status} />
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {tenant.activeUsers}/{tenant.totalUsers}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/app/tenants/${tenant.id}/overview`); }}>
                            <Eye className="mr-2 h-4 w-4" />
                            {t("common.view")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/app/tenants/${tenant.id}/overview`); }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.success(`Tenant "${tenant.name}" disabled.`); }}>
                            <Ban className="mr-2 h-4 w-4" />
                            {t("common.disable")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={(e) => { e.stopPropagation(); setDeleteTarget(tenant); }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} of{" "}
                  {filtered.length}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Tenant"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone and will remove all associated data.`}
        confirmLabel="Delete Tenant"
        onConfirm={handleDelete}
        destructive
      />
    </PageTransition>
  );
}
