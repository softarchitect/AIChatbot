"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Megaphone, Plus, Search } from "lucide-react";
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

type Campaign = {
  id: string;
  teamId?: string | null;
  name: string;
  channel: "whatsapp" | "webchat" | "sms" | "email";
  status: "draft" | "active" | "paused" | "completed";
  budget: number;
  startDate: string;
  endDate: string;
};

type Team = {
  id: string;
  name: string;
};

export default function CampaignsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const accessToken = useSessionStore((s) => s.accessToken);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("view_analytics");
  const canCreate = hasPermission("manage_workflows");

  const [rows, setRows] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<Campaign["channel"]>("email");
  const [teamId, setTeamId] = useState<string>("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [budget, setBudget] = useState("100");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    async function load() {
      if (!useApi || !accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/v1/tenants/${tenantId}/campaigns`, {
          headers: { Authorization: `Bearer ${accessToken}`, "x-tenant-id": tenantId },
        });
        const result = await response.json().catch(() => ({}));
        if (response.status === 403) {
          setAccessDenied(true);
          return;
        }
        if (!response.ok) throw new Error(result?.error ?? "Failed to load campaigns");
        setRows(result.data ?? []);

        const teamsResponse = await fetch(`/api/v1/tenants/${tenantId}/teams`, {
          headers: { Authorization: `Bearer ${accessToken}`, "x-tenant-id": tenantId },
        });
        const teamsResult = await teamsResponse.json().catch(() => ({}));
        if (teamsResponse.ok) {
          const teamRows = (teamsResult.data ?? []) as Team[];
          setTeams(teamRows);
          if (teamRows.length > 0) {
            setTeamId(teamRows[0].id);
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load campaigns.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [accessToken, tenantId]);

  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const createCampaign = async () => {
    if (!name.trim()) return toast.error("Campaign name is required.");
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    if (!useApi || !accessToken) return toast.error("API mode is not enabled.");
    setCreating(true);
    try {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
      const response = await fetch(`/api/v1/tenants/${tenantId}/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          name,
          channel,
          status: "draft",
          budget: Number(budget || "0"),
          startDate,
          endDate,
          teamId: teamId || undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 403) {
        toast.error("Cross-tenant access denied.");
        return;
      }
      if (!response.ok) throw new Error(result?.error ?? "Failed to create campaign");
      setRows((prev) => [result.data, ...prev]);
      setName("");
      toast.success("Campaign created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create campaign.");
    } finally {
      setCreating(false);
    }
  };

  if (!canView) {
    return <EmptyState icon={Megaphone} title="Insufficient permissions" description="You cannot view campaigns." />;
  }
  if (accessDenied) {
    return <EmptyState icon={Megaphone} title="Access denied" description="Cross-tenant access denied for campaigns." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="New campaign name" value={name} onChange={(e) => setName(e.target.value)} />
        <Select value={channel} onValueChange={(v) => setChannel(v as Campaign["channel"])}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="webchat">WebChat</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
          </SelectContent>
        </Select>
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input className="w-full sm:w-28" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
        <Button onClick={() => void createCampaign()} disabled={!canCreate || creating} className="gap-2">
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="ps-10" placeholder="Search campaigns..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns yet" description="Create one to test tenant-scoped campaign APIs." />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Period</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{teams.find((t) => t.id === row.teamId)?.name ?? "-"}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="capitalize">{row.channel}</TableCell>
                  <TableCell className="capitalize">{row.status}</TableCell>
                  <TableCell>${Number(row.budget).toFixed(2)}</TableCell>
                  <TableCell>
                    {new Date(row.startDate).toLocaleDateString()} - {new Date(row.endDate).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
