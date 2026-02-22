"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useSessionStore } from "@/lib/store";
import { toast } from "sonner";

type SubAdmin = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  permissions?: string[];
};

const availablePermissions = [
  { key: "view_platform_stats", label: "View platform stats" },
  { key: "manage_sub_admins", label: "Manage sub-admin accounts" },
  { key: "manage_subscription_plans", label: "Manage subscription plans" },
  { key: "manage_trial_config", label: "Manage trial configuration" },
];

export default function PlatformSubAdminsPage() {
  const accessToken = useSessionStore((s) => s.accessToken);
  const currentUser = useSessionStore((s) => s.currentUser);
  const platformOwnerEmail = (process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAIL ?? "owner@saasphere.io").toLowerCase();
  const isPlatformOwner = currentUser?.email?.toLowerCase() === platformOwnerEmail;
  const isPlatformOperator = isPlatformOwner || Boolean(currentUser?.isPlatformSubAdmin);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [items, setItems] = useState<SubAdmin[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const load = async () => {
    if (!accessToken) return;
    try {
      const response = await fetch("/api/v1/platform/sub-admins", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.status === 403) {
        setAccessDenied(true);
        setItems([]);
        return;
      }
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(result?.data)) {
        throw new Error(result?.error ?? "Failed to load sub-admins.");
      }
      setAccessDenied(false);
      setItems(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load sub-admins.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [accessToken]);

  const createSubAdmin = async () => {
    if (!name || !email || !password) {
      toast.error("Name, email and password are required.");
      return;
    }
    if (!accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }
    setCreating(true);
    try {
      const response = await fetch("/api/v1/platform/sub-admins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, email, password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to create sub-admin.");
      }
      toast.success("Sub-admin created.");
      setName("");
      setEmail("");
      setPassword("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create sub-admin.");
    } finally {
      setCreating(false);
    }
  };

  const updateSubAdmin = async (userId: string, values: { active?: boolean; password?: string }) => {
    if (!accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }
    try {
      const response = await fetch("/api/v1/platform/sub-admins", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId, ...values }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to update sub-admin.");
      }
      toast.success("Sub-admin updated.");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update sub-admin.");
    }
  };

  const updatePermissions = async (userId: string, permissions: string[]) => {
    if (!accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }
    try {
      const response = await fetch(`/api/v1/platform/sub-admins/${userId}/permissions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ permissions }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to update permissions.");
      }
      setItems((prev) => prev.map((item) => (item.id === userId ? { ...item, permissions } : item)));
      toast.success("Permissions updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update permissions.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPlatformOperator) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>Platform operators only.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Permission Required</CardTitle>
            <CardDescription>
              Your sub-admin account is missing the `manage_sub_admins` permission.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-4">
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Sub-admin Management</CardTitle>
          <CardDescription>Create and manage platform sub-admin accounts.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Sub-admin name" />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="subadmin@company.com" />
          </div>
          <div className="space-y-1">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars" />
          </div>
          <div className="flex items-end">
            <Button className="w-full gap-2" onClick={createSubAdmin} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle>Existing Sub-admins</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sub-admin accounts yet.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Active</span>
                    <Switch
                      checked={item.active}
                      onCheckedChange={(value) => void updateSubAdmin(item.id, { active: value })}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => void updateSubAdmin(item.id, { password: "password123" })}
                  >
                    <RefreshCcw className="h-3.5 w-3.5" />
                    Reset Password
                  </Button>
                </div>
                <div className="w-full sm:w-auto sm:min-w-[320px]">
                  <div className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-2">
                    {availablePermissions.map((perm) => {
                      const checked = item.permissions?.includes(perm.key) ?? false;
                      return (
                        <label key={perm.key} className="flex items-center gap-2 text-xs text-foreground">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              const current = new Set(item.permissions ?? []);
                              if (value) current.add(perm.key);
                              else current.delete(perm.key);
                              void updatePermissions(item.id, Array.from(current));
                            }}
                          />
                          <span>{perm.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
