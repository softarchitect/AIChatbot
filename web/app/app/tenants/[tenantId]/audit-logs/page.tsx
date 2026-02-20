"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared";
import { DataTable } from "@/components/data-table";
import { AuditLogDetailDrawer } from "@/components/audit-log-detail-drawer";
import { auditLogs as mockAuditLogs, type AuditLog } from "@/lib/mock/data";
import { useSessionStore } from "@/lib/store";
import { toast } from "sonner";

export default function AuditLogsPage() {
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const accessToken = useSessionStore((s) => s.accessToken);
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const canViewAuditLogs = hasPermission("view_audit_logs");
  const canExportAuditLogs = hasPermission("export_audit_logs");

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";

    async function loadLogs() {
      if (!useApi || !accessToken) {
        setLogs(mockAuditLogs.filter((l) => l.tenantId === tenantId));
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/v1/tenants/${tenantId}/audit-logs`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-tenant-id": tenantId,
          },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.error ?? "Failed to load audit logs");
        }
        setLogs(result.data ?? []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load audit logs.");
      } finally {
        setLoading(false);
      }
    }

    void loadLogs();
  }, [accessToken, tenantId]);

  const actions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))),
    [logs]
  );

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const matchSearch =
        l.actor.toLowerCase().includes(search.toLowerCase()) ||
        l.target.toLowerCase().includes(search.toLowerCase()) ||
        l.action.toLowerCase().includes(search.toLowerCase());
      const matchAction = actionFilter === "all" || l.action === actionFilter;
      return matchSearch && matchAction;
    });
  }, [logs, search, actionFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Audit Logs</h2>
          <p className="text-sm text-muted-foreground">
            Track all actions and changes within this tenant.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => toast.success("Export started. Check your downloads.")}
          className="gap-2"
          disabled={!canExportAuditLogs}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions.map((action) => (
              <SelectItem key={action} value={action}>
                {action.replace(/[._]/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!canViewAuditLogs ? (
        <EmptyState
          icon={FileText}
          title="Insufficient permissions"
          description="You do not have access to view audit logs."
        />
      ) : (
        <DataTable
          loading={loading}
          hasRows={filtered.length > 0}
          emptyIcon={FileText}
          emptyTitle="No audit logs found"
          emptyDescription="No matching audit log entries for the current filters."
          columns={
            <>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="hidden sm:table-cell">Target</TableHead>
              <TableHead className="hidden md:table-cell">IP</TableHead>
              <TableHead>Timestamp</TableHead>
            </>
          }
        >
          {filtered.map((log, i) => (
            <motion.tr
              key={log.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="group cursor-pointer border-b border-border transition-colors hover:bg-muted/50"
              onClick={() => setSelectedLog(log)}
            >
              <TableCell>
                <div>
                  <p className="font-medium text-foreground">{log.actor}</p>
                  <p className="text-xs text-muted-foreground">{log.actorEmail}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {log.action.replace(/[._]/g, " ")}
                </Badge>
              </TableCell>
              <TableCell className="hidden text-muted-foreground sm:table-cell">{log.target}</TableCell>
              <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">{log.ip}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</TableCell>
            </motion.tr>
          ))}
        </DataTable>
      )}

      <AuditLogDetailDrawer log={selectedLog} open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)} />
    </div>
  );
}
