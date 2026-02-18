"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, Download, FileText, X } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { EmptyState, TableSkeleton } from "@/components/shared";
import { auditLogs, type AuditLog } from "@/lib/mock/data";
import { toast } from "sonner";

export default function AuditLogsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const logs = auditLogs.filter((l) => l.tenantId === tenantId);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No audit logs found"
          description="No matching audit log entries for the current filters."
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden sm:table-cell">Target</TableHead>
                <TableHead className="hidden md:table-cell">IP</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
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
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {log.target}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">
                    {log.ip}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Drawer */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Log Details</SheetTitle>
            <SheetDescription>
              Full details for this audit log entry.
            </SheetDescription>
          </SheetHeader>
          {selectedLog && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Actor</p>
                  <p className="font-medium text-foreground">{selectedLog.actor}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{selectedLog.actorEmail}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Action</p>
                  <Badge variant="outline">{selectedLog.action}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Target</p>
                  <p className="font-medium text-foreground">{selectedLog.target}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">IP Address</p>
                  <p className="font-mono text-foreground">{selectedLog.ip}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Timestamp</p>
                  <p className="font-medium text-foreground">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm text-muted-foreground">Details (JSON)</p>
                <pre className="rounded-lg bg-muted/50 p-4 text-xs font-mono text-muted-foreground overflow-x-auto">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
