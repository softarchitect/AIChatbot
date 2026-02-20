"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Search, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, TableSkeleton } from "@/components/shared";
import { useSessionStore } from "@/lib/store";

type Agent = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
};

export default function AgentsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const accessToken = useSessionStore((s) => s.accessToken);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("view_users");

  const [rows, setRows] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    async function load() {
      if (!useApi || !accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/v1/tenants/${tenantId}/agents`, {
          headers: { Authorization: `Bearer ${accessToken}`, "x-tenant-id": tenantId },
        });
        const result = await response.json().catch(() => ({}));
        if (response.status === 403) {
          setAccessDenied(true);
          return;
        }
        if (!response.ok) throw new Error(result?.error ?? "Failed to load agents");
        setRows(result.data ?? []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load agents.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [accessToken, tenantId]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          r.email.toLowerCase().includes(search.toLowerCase())
      ),
    [rows, search]
  );

  if (!canView) {
    return <EmptyState icon={UserCog} title="Insufficient permissions" description="You cannot view agents." />;
  }
  if (accessDenied) {
    return <EmptyState icon={UserCog} title="Access denied" description="Cross-tenant access denied for agents." />;
  }

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="ps-10" placeholder="Search agents..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserCog} title="No agents found" description="This tenant currently has no agent users." />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell className="capitalize">{row.role}</TableCell>
                  <TableCell>{row.active ? "Active" : "Inactive"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
