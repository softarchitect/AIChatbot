"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  UserPlus,
  MoreHorizontal,
  Shield,
  Ban,
  KeyRound,
  Search,
  Loader2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusPill, RoleBadge, EmptyState, TableSkeleton } from "@/components/shared";
import { useSessionStore } from "@/lib/store";
import { tenantUsers, type Role } from "@/lib/mock/data";
import { toast } from "sonner";

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  role: z.string(),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function TenantUsersPage() {
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const accessToken = useSessionStore((s) => s.accessToken);
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState(tenantUsers.filter((u) => u.tenantId === tenantId));
  const canEditUsers = hasPermission("edit_users");

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    if (!useApi) {
      const timer = setTimeout(() => setLoading(false), 500);
      return () => clearTimeout(timer);
    }
    if (!accessToken) {
      setUsers([]);
      setLoading(false);
      toast.error("Session expired. Please sign in again.");
      return;
    }
    void (async () => {
      try {
        const response = await fetch(`/api/v1/tenants/${tenantId}/users`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-tenant-id": tenantId,
          },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(result?.data)) {
          throw new Error(result?.error ?? "Failed to load users.");
        }
        setUsers(result.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load users.");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, tenantId]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "agent" },
  });

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const onInvite = async (data: InviteForm) => {
    setSubmitting(true);
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    try {
      if (useApi) {
        if (!accessToken) {
          throw new Error("Session expired. Please sign in again.");
        }
        const response = await fetch(`/api/v1/tenants/${tenantId}/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "x-tenant-id": tenantId,
          },
          body: JSON.stringify({
            name: data.email.split("@")[0] ?? "New User",
            email: data.email,
            role: data.role,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.error ?? "Failed to invite user.");
        }
        const refreshed = await fetch(`/api/v1/tenants/${tenantId}/users`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-tenant-id": tenantId,
          },
        });
        const refreshedJson = await refreshed.json().catch(() => ({}));
        if (refreshed.ok && Array.isArray(refreshedJson?.data)) {
          setUsers(refreshedJson.data);
        }
      } else {
        await new Promise((r) => setTimeout(r, 1000));
      }
      toast.success(`Invitation sent to ${data.email}`);
      setInviteOpen(false);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to invite user.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateUser = async (userId: string, values: { role?: Role; active?: boolean }) => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    try {
      if (useApi) {
        if (!accessToken) {
          throw new Error("Session expired. Please sign in again.");
        }
        const response = await fetch(`/api/v1/tenants/${tenantId}/users/${userId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "x-tenant-id": tenantId,
          },
          body: JSON.stringify(values),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.error ?? "Failed to update user.");
        }
        const refreshed = await fetch(`/api/v1/tenants/${tenantId}/users`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-tenant-id": tenantId,
          },
        });
        const refreshedJson = await refreshed.json().catch(() => ({}));
        if (refreshed.ok && Array.isArray(refreshedJson?.data)) {
          setUsers(refreshedJson.data);
        }
      }
      toast.success("Agent updated successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update user.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Agents</h2>
          <p className="text-sm text-muted-foreground">{users.length} members in this tenant</p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2" disabled={!canEditUsers}>
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-10"
        />
      </div>

      {/* Table */}
      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No agents found"
          description="Create agents to start handling conversations."
          action={
            <Button onClick={() => setInviteOpen(true)} className="gap-2" disabled={!canEditUsers}>
              <UserPlus className="h-4 w-4" />
              Invite User
            </Button>
          }
        />
      ) : (
        <div className="rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Last Active</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user, i) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="group border-b border-border transition-colors hover:bg-muted/50"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {user.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>
                    <StatusPill status={user.status} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {user.lastActive
                      ? new Date(user.lastActive).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={!canEditUsers}
                          onClick={() => void updateUser(user.id, { role: "supervisor" })}
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Promote to Supervisor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!canEditUsers}
                          onClick={() => void updateUser(user.id, { password: "password123" })}
                        >
                          <KeyRound className="mr-2 h-4 w-4" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={!canEditUsers}
                          onClick={() => void updateUser(user.id, { active: false })}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to join this tenant.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onInvite)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@company.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select defaultValue="agent" onValueChange={(v) => setValue("role", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
