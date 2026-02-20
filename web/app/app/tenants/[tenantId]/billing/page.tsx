"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Plus, Receipt, Search } from "lucide-react";
import { toast } from "sonner";
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
import { EmptyState, TableSkeleton } from "@/components/shared";
import { useSessionStore } from "@/lib/store";

type BillingRecord = {
  id: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  currency: string;
  status: "due" | "paid" | "overdue";
  dueAt: string;
};

export default function BillingPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const accessToken = useSessionStore((s) => s.accessToken);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canManageBilling = hasPermission("manage_billing");

  const [rows, setRows] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("199");
  const [status, setStatus] = useState<BillingRecord["status"]>("due");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    async function load() {
      if (!useApi || !accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/v1/tenants/${tenantId}/billing`, {
          headers: { Authorization: `Bearer ${accessToken}`, "x-tenant-id": tenantId },
        });
        const result = await response.json().catch(() => ({}));
        if (response.status === 403) {
          setAccessDenied(true);
          return;
        }
        if (!response.ok) throw new Error(result?.error ?? "Failed to load billing records");
        setRows(result.data ?? []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load billing records.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [accessToken, tenantId]);

  const filtered = useMemo(
    () => rows.filter((r) => r.id.toLowerCase().includes(search.toLowerCase()) || r.status.includes(search.toLowerCase())),
    [rows, search]
  );

  const createRecord = async () => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    if (!useApi || !accessToken) return toast.error("API mode is not enabled.");
    setCreating(true);
    try {
      const start = new Date();
      start.setDate(1);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      const due = new Date(end);
      due.setDate(due.getDate() + 7);
      const response = await fetch(`/api/v1/tenants/${tenantId}/billing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          periodStart: start.toISOString(),
          periodEnd: end.toISOString(),
          amount: Number(amount || "0"),
          currency: "USD",
          status,
          dueAt: due.toISOString(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 403) {
        toast.error("Cross-tenant access denied.");
        return;
      }
      if (!response.ok) throw new Error(result?.error ?? "Failed to create billing record");
      setRows((prev) => [result.data, ...prev]);
      toast.success("Billing record created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create billing record.");
    } finally {
      setCreating(false);
    }
  };

  if (!canManageBilling) {
    return <EmptyState icon={Receipt} title="Insufficient permissions" description="You cannot view billing records." />;
  }
  if (accessDenied) {
    return <EmptyState icon={Receipt} title="Access denied" description="Cross-tenant access denied for billing records." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input className="w-full sm:w-40" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Select value={status} onValueChange={(v) => setStatus(v as BillingRecord["status"])}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="due">Due</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => void createRecord()} disabled={creating} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Record
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="ps-10" placeholder="Search billing..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No billing records yet" description="Add one to test billing isolation from UI." />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.id}</TableCell>
                  <TableCell>
                    {new Date(row.periodStart).toLocaleDateString()} - {new Date(row.periodEnd).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{row.currency} {Number(row.amount).toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{row.status}</TableCell>
                  <TableCell>{new Date(row.dueAt).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
