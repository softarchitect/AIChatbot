"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { MessageSquare, Plus, Search } from "lucide-react";
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

type Conversation = {
  id: string;
  teamId?: string | null;
  subject: string;
  channel: "whatsapp" | "webchat" | "sms" | "email";
  status: "open" | "closed" | "pending";
  updatedAt: string;
};

type Team = {
  id: string;
  name: string;
};

export default function ConversationsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;
  const accessToken = useSessionStore((s) => s.accessToken);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canView = hasPermission("view_conversations");
  const canCreate = hasPermission("manage_conversations");

  const [rows, setRows] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [channel, setChannel] = useState<Conversation["channel"]>("webchat");
  const [teamId, setTeamId] = useState<string>("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    async function load() {
      if (!useApi || !accessToken) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/v1/tenants/${tenantId}/conversations`, {
          headers: { Authorization: `Bearer ${accessToken}`, "x-tenant-id": tenantId },
        });
        const result = await response.json().catch(() => ({}));
        if (response.status === 403) {
          setAccessDenied(true);
          return;
        }
        if (!response.ok) throw new Error(result?.error ?? "Failed to load conversations");
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
        toast.error(error instanceof Error ? error.message : "Failed to load conversations.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [accessToken, tenantId]);

  const filtered = useMemo(
    () => rows.filter((r) => r.subject.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );

  const createConversation = async () => {
    if (!subject.trim()) {
      toast.error("Subject is required.");
      return;
    }
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    if (!useApi || !accessToken) {
      toast.error("API mode is not enabled.");
      return;
    }
    setCreating(true);
    try {
      const response = await fetch(`/api/v1/tenants/${tenantId}/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({ subject, channel, status: "open", teamId: teamId || undefined }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.status === 403) {
        toast.error("Cross-tenant access denied.");
        return;
      }
      if (!response.ok) throw new Error(result?.error ?? "Failed to create conversation");
      setRows((prev) => [result.data, ...prev]);
      setSubject("");
      toast.success("Conversation created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create conversation.");
    } finally {
      setCreating(false);
    }
  };

  if (!canView) {
    return <EmptyState icon={MessageSquare} title="Insufficient permissions" description="You cannot view conversations." />;
  }
  if (accessDenied) {
    return <EmptyState icon={MessageSquare} title="Access denied" description="Cross-tenant access denied for conversations." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Subject for new conversation" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Select value={channel} onValueChange={(v) => setChannel(v as Conversation["channel"])}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="webchat">WebChat</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger className="w-full sm:w-44">
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
        <Button onClick={() => void createConversation()} disabled={!canCreate || creating} className="gap-2">
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="ps-10" placeholder="Search conversations..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No conversations yet" description="Create one to verify tenant isolation in UI." />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{teams.find((t) => t.id === row.teamId)?.name ?? "-"}</TableCell>
                  <TableCell className="font-medium">{row.subject}</TableCell>
                  <TableCell className="capitalize">{row.channel}</TableCell>
                  <TableCell className="capitalize">{row.status}</TableCell>
                  <TableCell>{new Date(row.updatedAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
