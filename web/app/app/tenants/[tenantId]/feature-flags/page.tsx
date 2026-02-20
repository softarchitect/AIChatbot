"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Search, ToggleLeft, ToggleRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { featureFlags, type FeatureFlag } from "@/lib/mock/data";
import { useSessionStore } from "@/lib/store";
import { toast } from "sonner";
import { FeatureFlagToggleRow } from "@/components/feature-flag-toggle-row";

const groupLabels: Record<string, string> = {
  channels: "Channels",
  ai: "AI & Intelligence",
  reporting: "Reporting",
  automation: "Automation",
};

export default function FeatureFlagsPage() {
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const accessToken = useSessionStore((s) => s.accessToken);
  const setTenantFeatureFlags = useSessionStore((s) => s.setTenantFeatureFlags);
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [flags, setFlags] = useState<FeatureFlag[]>(featureFlags);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const canManageFeatureFlags = hasPermission("manage_feature_flags");
  const canViewFeatureFlags = hasPermission("view_feature_flags");

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    async function loadFlags() {
      if (!useApi) {
        setLoading(false);
        return;
      }
      if (!accessToken) {
        toast.error("Session expired. Please sign in again.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/v1/tenants/${tenantId}/feature-flags`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-tenant-id": tenantId,
          },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.error ?? "Failed to load feature flags");
        }
        setFlags(result.data ?? []);
        setTenantFeatureFlags(tenantId, result.data ?? []);
        setLastSavedAt(new Date());
      } catch (error) {
        console.error(error);
        toast.error("Failed to load feature flags.");
      } finally {
        setLoading(false);
      }
    }
    void loadFlags();
  }, [accessToken, setTenantFeatureFlags, tenantId]);

  const filtered = useMemo(() => {
    if (!search) return flags;
    return flags.filter(
      (f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [flags, search]);

  const groups = Array.from(new Set(filtered.map((f) => f.group)));

  const toggleFlag = (id: string) => {
    if (!canManageFeatureFlags) {
      toast.error("Insufficient permissions");
      return;
    }
    const flag = flags.find((f) => f.id === id);
    if (!flag) return;
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    if (!useApi) {
      setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
      setLastSavedAt(new Date());
      toast.success(`${flag.name} ${flag.enabled ? "disabled" : "enabled"}`);
      return;
    }
    if (!accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }
    void (async () => {
      try {
        const response = await fetch(`/api/v1/tenants/${tenantId}/feature-flags`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "x-tenant-id": tenantId,
          },
          body: JSON.stringify({ key: flag.key, enabled: !flag.enabled }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.error ?? "Failed to update flag");
        }
        setFlags(result.data ?? []);
        setTenantFeatureFlags(tenantId, result.data ?? []);
        setLastSavedAt(new Date());
        toast.success(`${flag.name} ${flag.enabled ? "disabled" : "enabled"}`);
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Failed to update flag.");
      }
    })();
  };

  const bulkToggle = async (enable: boolean) => {
    if (!canManageFeatureFlags) {
      toast.error("Insufficient permissions");
      return;
    }
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    if (!useApi) {
      setFlags((prev) => prev.map((f) => ({ ...f, enabled: enable })));
      setLastSavedAt(new Date());
      toast.success(`All flags ${enable ? "enabled" : "disabled"}`);
      return;
    }
    if (!accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }
    try {
      for (const flag of flags) {
        if (flag.enabled === enable) continue;
        const response = await fetch(`/api/v1/tenants/${tenantId}/feature-flags`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "x-tenant-id": tenantId,
          },
          body: JSON.stringify({ key: flag.key, enabled: enable }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result?.error ?? "Failed to bulk update flags");
        }
      }
      const refreshed = await fetch(`/api/v1/tenants/${tenantId}/feature-flags`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-tenant-id": tenantId,
        },
      });
      const refreshedJson = await refreshed.json().catch(() => ({}));
      if (refreshed.ok) {
        setFlags(refreshedJson.data ?? []);
        setTenantFeatureFlags(tenantId, refreshedJson.data ?? []);
        setLastSavedAt(new Date());
      }
      toast.success(`All flags ${enable ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to bulk update flags.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Feature Flags</h2>
          <p className="text-sm text-muted-foreground">
            Toggle features on or off for this tenant.
          </p>
          {lastSavedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Last saved: {lastSavedAt.toLocaleString()}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => bulkToggle(true)} className="gap-2" disabled={!canManageFeatureFlags}>
            <ToggleRight className="h-4 w-4" />
            Enable All
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulkToggle(false)} className="gap-2" disabled={!canManageFeatureFlags}>
            <ToggleLeft className="h-4 w-4" />
            Disable All
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search flags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-10"
        />
      </div>

      {/* Grouped Flags */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading feature flags...</p>
      ) : !canViewFeatureFlags ? (
        <p className="text-sm text-muted-foreground">Insufficient permissions to view feature flags.</p>
      ) : (
        <>
      {groups.map((group) => (
        <Card key={group} className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              {groupLabels[group] ?? group}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {filtered
              .filter((f) => f.group === group)
              .map((flag, i) => (
                <FeatureFlagToggleRow
                  key={flag.id}
                  flag={flag}
                  index={i}
                  disabled={!canManageFeatureFlags}
                  onToggle={toggleFlag}
                />
              ))}
          </CardContent>
        </Card>
      ))}
        </>
      )}
    </div>
  );
}
